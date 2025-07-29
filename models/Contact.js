const mongoose = require('mongoose')

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
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
  inquiryType: {
    type: String,
    required: [true, 'Inquiry type is required'],
    enum: [
      'general_inquiry',
      'booking_assistance',
      'room_information',
      'services_amenities',
      'event_planning',
      'complaint',
      'feedback',
      'partnership',
      'media_press',
      'other'
    ],
    default: 'general_inquiry'
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  preferredContactMethod: {
    type: String,
    enum: ['email', 'phone', 'either'],
    default: 'email'
  },
  preferredContactTime: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'anytime'],
    default: 'anytime'
  },
  status: {
    type: String,
    enum: ['new', 'in_progress', 'resolved', 'closed'],
    default: 'new'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  readBy: {
    type: String // Admin user who read the message
  },
  response: {
    message: {
      type: String,
      maxlength: [2000, 'Response message cannot exceed 2000 characters']
    },
    respondedAt: {
      type: Date
    },
    respondedBy: {
      type: String // Admin user who responded
    }
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  source: {
    type: String,
    enum: ['website_contact_form', 'homepage_quick_contact', 'phone', 'email', 'chat'],
    default: 'website_contact_form'
  },
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: {
    type: Date
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Virtual for inquiry type display name
contactSchema.virtual('inquiryTypeDisplay').get(function() {
  const typeMap = {
    'general_inquiry': 'General Inquiry',
    'booking_assistance': 'Booking Assistance',
    'room_information': 'Room Information',
    'services_amenities': 'Services & Amenities',
    'event_planning': 'Event Planning',
    'complaint': 'Complaint',
    'feedback': 'Feedback',
    'partnership': 'Partnership',
    'media_press': 'Media & Press',
    'other': 'Other'
  }
  return typeMap[this.inquiryType] || this.inquiryType
})

// Virtual for response time (if responded)
contactSchema.virtual('responseTime').get(function() {
  if (this.response.respondedAt) {
    const diffMs = this.response.respondedAt - this.createdAt
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''}`
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''}`
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`
    }
  }
  return null
})

// Pre-save middleware
contactSchema.pre('save', function(next) {
  // Set readAt timestamp when isRead is set to true
  if (this.isModified('isRead') && this.isRead && !this.readAt) {
    this.readAt = new Date()
  }
  
  // Set respondedAt timestamp when response is added
  if (this.isModified('response.message') && this.response.message && !this.response.respondedAt) {
    this.response.respondedAt = new Date()
  }
  
  next()
})

// Indexes for better query performance
contactSchema.index({ email: 1 })
contactSchema.index({ inquiryType: 1 })
contactSchema.index({ status: 1 })
contactSchema.index({ priority: 1 })
contactSchema.index({ isRead: 1 })
contactSchema.index({ createdAt: -1 })
contactSchema.index({ followUpRequired: 1, followUpDate: 1 })

// Static methods
contactSchema.statics.getUnreadCount = function() {
  return this.countDocuments({ isRead: false })
}

contactSchema.statics.getPendingCount = function() {
  return this.countDocuments({ status: { $in: ['new', 'in_progress'] } })
}

contactSchema.statics.getByPriority = function(priority) {
  return this.find({ priority }).sort({ createdAt: -1 })
}

module.exports = mongoose.model('Contact', contactSchema)