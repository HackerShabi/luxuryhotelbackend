const mongoose = require('mongoose')

const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    unique: true
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room'
  },
  guestInfo: {
    firstName: {
      type: String,
      trim: true
    },
    lastName: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      lowercase: true
    },
    phone: {
      type: String
    },
    address: {
      street: {
        type: String
      },
      city: {
        type: String
      },
      state: {
        type: String
      },
      zipCode: {
        type: String
      },
      country: {
        type: String,
        default: 'United States'
      }
    },
    specialRequests: {
      type: String
    }
  },
  checkInDate: {
    type: Date
  },
  checkOutDate: {
    type: Date
  },
  numberOfGuests: {
    type: Number
  },
  numberOfNights: {
    type: Number
  },
  pricing: {
    pricePerNight: {
      type: Number
    },
    subtotal: {
      type: Number
    },
    taxes: {
      type: Number
    },
    fees: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  paymentInfo: {
    paymentMethod: {
      type: String
    },
    paymentStatus: {
      type: String,
      default: 'pending'
    },
    transactionId: {
      type: String
    },
    paymentDate: {
      type: Date
    },
    cardLastFour: {
      type: String
    }
  },
  bookingStatus: {
    type: String,
    default: 'pending'
  },
  confirmationNumber: {
    type: String
  },
  notes: {
    type: String
  },
  source: {
    type: String,
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
      type: String
    },
    refundAmount: {
      type: Number
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