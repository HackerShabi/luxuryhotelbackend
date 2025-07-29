const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'staff'],
    default: 'admin'
  },
  phone: {
    type: String,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
  },
  avatar: {
    url: {
      type: String,
      default: 'https://via.placeholder.com/150x150?text=Admin'
    },
    alt: {
      type: String,
      default: 'Admin Avatar'
    }
  },
  permissions: [{
    type: String,
    enum: [
      'manage_rooms',
      'manage_bookings',
      'manage_contacts',
      'view_analytics',
      'manage_users',
      'manage_settings',
      'manage_content',
      'view_reports'
    ]
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  passwordResetToken: {
    type: String
  },
  passwordResetExpires: {
    type: Date
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      }
    }
  },
  profile: {
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters']
    },
    department: {
      type: String,
      enum: ['management', 'front_desk', 'housekeeping', 'maintenance', 'food_service', 'security', 'it'],
      default: 'management'
    },
    position: {
      type: String,
      maxlength: [100, 'Position cannot exceed 100 characters']
    },
    hireDate: {
      type: Date
    },
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`
})

// Virtual for account locked status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now())
})

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next()
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Pre-save middleware to set default permissions based on role
userSchema.pre('save', function(next) {
  if (this.isModified('role') && this.permissions.length === 0) {
    switch (this.role) {
      case 'admin':
        this.permissions = [
          'manage_rooms',
          'manage_bookings',
          'manage_contacts',
          'view_analytics',
          'manage_users',
          'manage_settings',
          'manage_content',
          'view_reports'
        ]
        break
      case 'manager':
        this.permissions = [
          'manage_rooms',
          'manage_bookings',
          'manage_contacts',
          'view_analytics',
          'view_reports'
        ]
        break
      case 'staff':
        this.permissions = [
          'manage_bookings',
          'manage_contacts'
        ]
        break
    }
  }
  next()
})

// Instance method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password)
  } catch (error) {
    throw error
  }
}

// Instance method to generate JWT token
userSchema.methods.generateAuthToken = function() {
  const payload = {
    id: this._id,
    email: this.email,
    role: this.role,
    permissions: this.permissions
  }
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  })
}

// Instance method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    })
  }
  
  const updates = { $inc: { loginAttempts: 1 } }
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 } // 2 hours
  }
  
  return this.updateOne(updates)
}

// Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
    $set: { lastLogin: new Date() }
  })
}

// Static method to find by credentials
userSchema.statics.findByCredentials = async function(email, password) {
  const user = await this.findOne({ email, isActive: true }).select('+password')
  
  if (!user) {
    throw new Error('Invalid login credentials')
  }
  
  if (user.isLocked) {
    throw new Error('Account is temporarily locked due to too many failed login attempts')
  }
  
  const isMatch = await user.comparePassword(password)
  
  if (!isMatch) {
    await user.incLoginAttempts()
    throw new Error('Invalid login credentials')
  }
  
  // Reset login attempts on successful login
  await user.resetLoginAttempts()
  
  return user
}

// Indexes for better query performance
userSchema.index({ email: 1 })
userSchema.index({ role: 1 })
userSchema.index({ isActive: 1 })
userSchema.index({ lastLogin: -1 })

module.exports = mongoose.model('User', userSchema)