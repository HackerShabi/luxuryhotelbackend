const mongoose = require('mongoose')

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Room name is required'],
    trim: true,
    maxlength: [100, 'Room name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Room description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  type: {
    type: String,
    required: [true, 'Room type is required'],
    enum: ['single', 'double', 'suite', 'deluxe', 'presidential'],
    lowercase: true
  },
  pricePerNight: {
    type: Number,
    required: [true, 'Price per night is required'],
    min: [0, 'Price cannot be negative']
  },
  maxOccupancy: {
    type: Number,
    required: [true, 'Maximum occupancy is required'],
    min: [1, 'Maximum occupancy must be at least 1'],
    max: [10, 'Maximum occupancy cannot exceed 10']
  },
  size: {
    type: Number,
    required: [true, 'Room size is required'],
    min: [10, 'Room size must be at least 10 sqft']
  },
  bedType: {
    type: String,
    required: [true, 'Bed type is required'],
    enum: ['single', 'double', 'queen', 'king', 'twin']
  },
  amenities: [{
    type: String,
    trim: true
  }],
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      default: 'Room image'
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  isAvailable: {
    type: Boolean,
    default: true
  },
  rating: {
    type: Number,
    default: 4.5,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  reviewCount: {
    type: Number,
    default: 0,
    min: [0, 'Review count cannot be negative']
  },
  features: [{
    name: String,
    icon: String,
    description: String
  }],
  policies: {
    checkIn: {
      type: String,
      default: '3:00 PM'
    },
    checkOut: {
      type: String,
      default: '11:00 AM'
    },
    cancellation: {
      type: String,
      default: 'Free cancellation up to 24 hours before check-in'
    },
    smoking: {
      type: Boolean,
      default: false
    },
    pets: {
      type: Boolean,
      default: false
    }
  },
  location: {
    floor: {
      type: Number,
      min: [1, 'Floor must be at least 1']
    },
    wing: {
      type: String,
      enum: ['north', 'south', 'east', 'west', 'central']
    },
    view: {
      type: String,
      enum: ['city', 'ocean', 'garden', 'pool', 'mountain', 'courtyard']
    }
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Virtual for primary image
roomSchema.virtual('primaryImage').get(function() {
  const primary = this.images.find(img => img.isPrimary)
  return primary ? primary.url : (this.images[0] ? this.images[0].url : null)
})

// Index for better query performance
roomSchema.index({ type: 1, pricePerNight: 1 })
roomSchema.index({ isAvailable: 1 })
roomSchema.index({ isFeatured: 1 })
roomSchema.index({ isPopular: 1 })

// Pre-save middleware
roomSchema.pre('save', function(next) {
  // Ensure only one primary image
  const primaryImages = this.images.filter(img => img.isPrimary)
  if (primaryImages.length > 1) {
    this.images.forEach((img, index) => {
      img.isPrimary = index === 0
    })
  } else if (primaryImages.length === 0 && this.images.length > 0) {
    this.images[0].isPrimary = true
  }
  next()
})

module.exports = mongoose.model('Room', roomSchema)