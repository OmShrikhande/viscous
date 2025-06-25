const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  mobile: { 
    type: String, 
    required: true 
  },
  address: { 
    type: String, 
    required: true 
  },
  joiningDate: { 
    type: Date, 
    required: true 
  },
  is_active: { 
    type: Boolean, 
    default: true 
  },
  department: { 
    type: String, 
    required: true 
  },
  adhar: { 
    type: String, 
    required: true 
  },
  pan: { 
    type: String, 
    required: true 
  },
  password: { 
    type: String, 
    required: true, 
    minlength: 6 
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  },
  updated_at: { 
    type: Date, 
    default: Date.now 
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },
});

module.exports = mongoose.model('User', UserSchema);