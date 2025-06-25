/**
 * This script creates an admin user for testing purposes
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Admin credentials
const adminCredentials = {
  email: 'kuldeept.cse22@sbjit.edu.in',
  password: '123456789',
  username: 'admin',
  firstName: 'Admin',
  lastName: 'User',
  department: 'Administration',
  position: 'Administrator'
};

// Create admin user
async function createAdminUser() {
  try {
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: adminCredentials.email });
    
    if (existingAdmin) {
      console.log('Admin user already exists. Updating password...');
      
      // Update password
      existingAdmin.password = await bcrypt.hash(adminCredentials.password, 10);
      await existingAdmin.save();
      
      console.log('Admin password updated successfully!');
    } else {
      // Hash password
      const hashedPassword = await bcrypt.hash(adminCredentials.password, 10);
      
      // Create new admin
      const newAdmin = new Admin({
        ...adminCredentials,
        password: hashedPassword
      });
      
      await newAdmin.save();
      console.log('Admin user created successfully!');
    }
    
    console.log('\nLogin Credentials:');
    console.log('------------------');
    console.log(`Email: ${adminCredentials.email}`);
    console.log(`Password: ${adminCredentials.password}`);
    console.log('------------------');
    
    // Disconnect from MongoDB
    mongoose.disconnect();
  } catch (error) {
    console.error('Error creating admin user:', error);
    mongoose.disconnect();
    process.exit(1);
  }
}

// Run the function
createAdminUser();