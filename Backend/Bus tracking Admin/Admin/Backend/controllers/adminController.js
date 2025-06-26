
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');

exports.registerAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      console.error("MongoDB not connected - Cannot register without database connection");
      return res.status(500).json({ message: 'Database connection error. Please try again later.' });
    }
    
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new Admin({ 
      email: email.toLowerCase().trim(), 
      password: hashedPassword,
      username: email.split('@')[0], // Set default username from email
      loginHistory: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await newAdmin.save();
    console.log("New admin registered:", email);
    res.status(201).json({ message: 'Admin registered successfully' });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: err.message });
  }
};

// No mock admins - using real database only

exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    console.log("Login attempt:", normalizedEmail);

    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      console.error("MongoDB not connected - Cannot login without database connection");
      return res.status(500).json({ 
        success: false, 
        message: 'Database connection error. Please try again later.' 
      });
    }
    
    // Find admin in database
    const admin = await Admin.findOne({ email: normalizedEmail });
    console.log("Admin found in DB:", admin ? admin.email : "none");
    
    if (!admin) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid credentials (email not found)' 
      });
    }
    
    const isMatch = await bcrypt.compare(password, admin.password);
    console.log("Password match result:", isMatch);
    
    if (!isMatch) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid credentials (wrong password)' 
      });
    }
    
    // Update login history and last login
    const loginEntry = {
      loginTime: new Date(),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    };
    
    admin.loginHistory.push(loginEntry);
    admin.lastLogin = new Date();
    
    // Keep only last 10 login records
    if (admin.loginHistory.length > 10) {
      admin.loginHistory = admin.loginHistory.slice(-10);
    }
    
    try {
      await admin.save();
    } catch (saveErr) {
      console.error("Error saving login history:", saveErr);
      // Continue with login even if saving history fails
    }
    
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-for-development';
    const token = jwt.sign({ id: admin._id }, JWT_SECRET, { expiresIn: '7d' });
    
    return res.json({
      success: true,
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        username: admin.username || admin.email.split('@')[0]
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message,
      message: 'Server error. Please try again later.'
    });
  }
};
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });

    console.log("Reset request:", { email, otp, newPassword });
    console.log("Admin from DB:", admin);

    if (!admin) {
      console.log("Admin not found for email:", email);
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    if (admin.otp !== otp) {
      console.log("OTP does not match. Provided:", otp, "Expected:", admin.otp);
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    if (admin.otpExpires < Date.now()) {
      console.log("OTP expired at:", admin.otpExpires, "Current time:", Date.now());
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    admin.password = await bcrypt.hash(newPassword, 10);
    admin.otp = undefined;
    admin.otpExpires = undefined;
    await admin.save();

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const admin = await Admin.findOne({ email: normalizedEmail });
    if (!admin) return res.status(400).json({ message: 'Email not found' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    admin.otp = otp;
    admin.otpExpires = otpExpires;
    await admin.save();

    // Send email with hardcoded credentials
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'kdkuldeeptiwari26@gmail.com',           // ✅ Your full Gmail address
        pass: 'rnuo mvur mpkh ohog'     // ✅ Your app password (not normal Gmail password)
      }
    });

    await transporter.sendMail({
      from: `"Kudeep Projects" <kdkuldeeptiwari26@gmail.com>`,
      to: admin.email,
      subject: "Your OTP for Password Reset",
      text: `Your OTP is: ${otp}`
    });

    res.json({ message: 'OTP sent to email' });
  } catch (err) {
    console.error('❌ Error in sendOTP:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get admin profile
exports.getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select('-password -otp -otpExpires');
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    
    res.json({ 
      success: true, 
      admin: admin 
    });
  } catch (err) {
    console.error('Error fetching admin profile:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update admin profile
exports.updateAdminProfile = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const updateData = { ...req.body };
    
    // Remove fields that shouldn't be updated through this endpoint
    delete updateData.password;
    delete updateData.email;
    delete updateData.otp;
    delete updateData.otpExpires;
    delete updateData.loginHistory;
    delete updateData.createdAt;
    
    const admin = await Admin.findByIdAndUpdate(
      adminId, 
      updateData, 
      { new: true, runValidators: true }
    ).select('-password -otp -otpExpires');
    
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      admin: admin 
    });
  } catch (err) {
    console.error('Error updating admin profile:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update admin password
exports.updateAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.admin.id;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password and new password are required' 
      });
    }
    
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    
    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }
    
    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    admin.password = hashedNewPassword;
    await admin.save();
    
    res.json({ 
      success: true, 
      message: 'Password updated successfully' 
    });
  } catch (err) {
    console.error('Error updating password:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Record logout time
exports.recordLogout = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const admin = await Admin.findById(adminId);
    
    if (admin && admin.loginHistory.length > 0) {
      // Update the most recent login entry with logout time
      const lastLoginIndex = admin.loginHistory.length - 1;
      if (!admin.loginHistory[lastLoginIndex].logoutTime) {
        admin.loginHistory[lastLoginIndex].logoutTime = new Date();
        await admin.save();
      }
    }
    
    res.json({ success: true, message: 'Logout recorded successfully' });
  } catch (err) {
    console.error('Error recording logout:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
