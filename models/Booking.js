const mongoose = require('mongoose')

const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    unique: true,
    required: true
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: [true, 'Room reference is required']
  },
  guestInfo: {
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
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
    },
    address: {
      street: {
        type: String,
        required: [true, 'Street address is required']
      },
      city: {
        type: String,
        required: [true, 'City is required']
      },
      state: {
        type: String,
        required: [true, 'State is required']
      },
      zipCode: {
        type: String,
        required: [true, 'Zip code is required']
      },
      country: {
        type: String,
        required: [true, 'Country is required'],
        default: 'United States'
      }
    },
    specialRequests: {
      type: String,
      maxlength: [500, 'Special requests cannot exceed 500 characters']
    }
  },
  checkInDate: {
    type: Date,
    required: [true, 'Check-in date is required'],
    validate: {
      validator: function(value) {
        return value >= new Date().setHours(0, 0, 0, 0)
      },
      message: 'Check-in date cannot be in the past'
    }
  },
  checkOutDate: {
    type: Date,
    required: [true, 'Check-out date is required'],
    validate: {
      validator: function(value) {
        return value > this.checkInDate
      },
      message: 'Check-out date must be after check-in date'
    }
  },
  numberOfGuests: {
    type: Number,
    required: [true, 'Number of guests is required'],
    min: [1, 'Number of guests must be at least 1'],
    max: [10, 'Number of guests cannot exceed 10']
  },
  numberOfNights: {
    type: Number,
    required: true
  },
  pricing: {
    pricePerNight: {
      type: Number,
      required: [true, 'Price per night is required'],
      min: [0, 'Price cannot be negative']
    },
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: [0, 'Subtotal cannot be negative']
    },
    taxes: {
      type: Number,
      required: [true, 'Taxes amount is required'],
      min: [0, 'Taxes cannot be negative']
    },
    fees: {
      type: Number,
      default: 0,
      min: [0, 'Fees cannot be negative']
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative']
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
    }
  },
  paymentInfo: {
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash']
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
      default: 'pending'
    },
    transactionId: {
      type: String,
      sparse: true
    },
    paymentDate: {
      type: Date
    },
    cardLastFour: {
      type: String,
      match: [/^\d{4}$/, 'Card last four digits must be 4 numbers']
    }
  },
  bookingStatus: {
    type: String,
    required: true,
    enum: ['confirmed', 'pending', 'cancelled', 'checked_in', 'checked_out', 'no_show'],
    default: 'pending'
  },
  confirmationNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  source: {
    type: String,
    enum: ['website', 'phone', 'email', 'walk_in', 'third_party'],
    default: 'website'
  },
  cancellation: {
    isCancelled: {
      type: Boolean,
      default: false
    },
    cancelledAt: {
      type: Date
    },
    cancellationReason: {
      type: String,
      maxlength: [500, 'Cancellation reason cannot exceed 500 characters']
    },
    refundAmount: {
      type: Number,
      min: [0, 'Refund amount cannot be negative']
    }
  },
  checkInTime: {
    type: Date
  },
  checkOutTime: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Virtual for full guest name
bookingSchema.virtual('guestFullName').get(function() {
  return `${this.guestInfo.firstName} ${this.guestInfo.lastName}`
})

// Virtual for booking duration in days
bookingSchema.virtual('duration').get(function() {
  return Math.ceil((this.checkOutDate - this.checkInDate) / (1000 * 60 * 60 * 24))
})

// Pre-save middleware to generate booking ID and confirmation number
bookingSchema.pre('save', function(next) {
  if (!this.bookingId) {
    this.bookingId = 'BK' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase()
  }
  
  if (!this.confirmationNumber && this.bookingStatus === 'confirmed') {
    this.confirmationNumber = 'CONF' + Date.now() + Math.random().toString(36).substr(2, 6).toUpperCase()
  }
  
  // Calculate number of nights
  this.numberOfNights = Math.ceil((this.checkOutDate - this.checkInDate) / (1000 * 60 * 60 * 24))
  
  next()
})

// Indexes for better query performance
bookingSchema.index({ bookingId: 1 })
bookingSchema.index({ confirmationNumber: 1 })
bookingSchema.index({ 'guestInfo.email': 1 })
bookingSchema.index({ checkInDate: 1, checkOutDate: 1 })
bookingSchema.index({ bookingStatus: 1 })
bookingSchema.index({ 'paymentInfo.paymentStatus': 1 })
bookingSchema.index({ room: 1 })
bookingSchema.index({ createdAt: -1 })

module.exports = mongoose.model('Booking', bookingSchema)