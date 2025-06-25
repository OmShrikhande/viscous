const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');
const mongoose = require('mongoose');

// Mock admin users for development/demo (same as in adminController.js)
const mockAdmins = [
  {
    id: "admin-1",
    email: "admin@example.com",
    username: "admin",
    role: "admin"
  },
  {
    id: "kuldeep-user-id",
    email: "kuldeept.cse22@sbjit.edu.in",
    username: "kuldeep",
    role: "admin"
  },
  {
    id: "demo-user-id",
    email: "demo@example.com",
    username: "demo",
    role: "admin"
  }
];

exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check if token exists in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Not authorized to access this route' 
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("token", token);
      console.log("decoded", decoded);
      console.log("decoded id", decoded.id);

      // Check the role from the token
      const role = decoded.role || 'admin'; // Default to admin for backward compatibility
      
      // Check if this is a mock user ID
      const mockAdmin = mockAdmins.find(admin => admin.id === decoded.id);
      
      if (mockAdmin) {
        console.log("Found mock admin in auth middleware:", mockAdmin.email);
        req.user = mockAdmin;
        req.userRole = mockAdmin.role || 'admin';
        req.admin = mockAdmin; // For backward compatibility
        return next();
      }
      
      // If not a mock user and MongoDB is connected, try database
      if (mongoose.connection.readyState === 1) {
        if (role === 'admin') {
          // Get admin from token
          req.user = await Admin.findById(decoded.id);
          if (!req.user) {
            return res.status(401).json({ 
              success: false, 
              message: 'Admin not found with this ID' 
            });
          }
          req.userRole = 'admin';
          
          // For backward compatibility
          req.admin = req.user;
        } else if (role === 'user') {
          // Get user from token
          req.user = await User.findById(decoded.id);
          if (!req.user) {
            return res.status(401).json({ 
              success: false, 
              message: 'User not found with this ID' 
            });
          }
          req.userRole = 'user';
        } else {
          return res.status(401).json({ 
            success: false, 
            message: 'Invalid role in token' 
          });
        }
      } else {
        // If MongoDB is not connected and it's not a mock user, use a default mock admin
        console.log("MongoDB not connected, using default mock admin");
        req.user = mockAdmins[0];
        req.userRole = 'admin';
        req.admin = mockAdmins[0];
      }

      next();
    } catch (err) {
      console.error("Token verification error:", err);
      return res.status(401).json({ 
        success: false, 
        message: 'Not authorized to access this route' 
      });
    }
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// Middleware to authorize based on roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({
        success: false,
        message: `Role ${req.userRole} is not authorized to access this route`
      });
    }
    next();
  };
};