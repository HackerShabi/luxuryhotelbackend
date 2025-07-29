const Contact = require('../models/Contact')
const { validationResult } = require('express-validator')
const nodemailer = require('nodemailer')

// Configure nodemailer transporter
const transporter = nodemailer.createTransporter({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

// @desc    Get all contacts with filtering and pagination
// @route   GET /api/contacts
// @access  Private (Admin)
const getContacts = async (req, res) => {
  try {
    const {
      status,
      priority,
      inquiryType,
      isRead,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
      sort = '-createdAt'
    } = req.query

    // Build filter object
    const filter = {}

    if (status) {
      filter.status = status
    }

    if (priority) {
      filter.priority = priority
    }

    if (inquiryType) {
      filter.inquiryType = inquiryType
    }

    if (isRead !== undefined) {
      filter.isRead = isRead === 'true'
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {}
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom)
      if (dateTo) filter.createdAt.$lte = new Date(dateTo)
    }

    // Pagination
    const pageNum = parseInt(page, 10)
    const limitNum = parseInt(limit, 10)
    const skip = (pageNum - 1) * limitNum

    // Execute query
    const contacts = await Contact.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean()

    // Get total count for pagination
    const total = await Contact.countDocuments(filter)

    res.status(200).json({
      success: true,
      count: contacts.length,
      total,
      pagination: {
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      },
      data: contacts
    })
  } catch (error) {
    console.error('Get contacts error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error while fetching contacts'
    })
  }
}

// @desc    Get single contact by ID
// @route   GET /api/contacts/:id
// @access  Private (Admin)
const getContact = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id)

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      })
    }

    // Mark as read when viewed
    if (!contact.isRead) {
      contact.isRead = true
      contact.readAt = new Date()
      await contact.save()
    }

    res.status(200).json({
      success: true,
      data: contact
    })
  } catch (error) {
    console.error('Get contact error:', error)
    
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      })
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while fetching contact'
    })
  }
}

// @desc    Create new contact submission
// @route   POST /api/contacts
// @access  Public
const createContact = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      })
    }

    const {
      name,
      email,
      phone,
      inquiryType,
      subject,
      message,
      preferredContactMethod,
      preferredContactTime
    } = req.body

    // Get client IP and user agent
    const ipAddress = req.ip || req.connection.remoteAddress
    const userAgent = req.get('User-Agent')

    // Determine priority based on inquiry type
    let priority = 'medium'
    if (inquiryType === 'complaint' || inquiryType === 'emergency') {
      priority = 'high'
    } else if (inquiryType === 'general' || inquiryType === 'feedback') {
      priority = 'low'
    }

    // Create contact submission
    const contactData = {
      name,
      email,
      phone,
      inquiryType,
      subject,
      message,
      preferredContactMethod: preferredContactMethod || 'email',
      preferredContactTime: preferredContactTime || 'anytime',
      priority,
      ipAddress,
      userAgent,
      source: 'website'
    }

    const contact = await Contact.create(contactData)

    // Send confirmation email to customer
    try {
      await sendConfirmationEmail(contact)
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError)
      // Don't fail the request if email fails
    }

    // Send notification email to admin
    try {
      await sendAdminNotification(contact)
    } catch (emailError) {
      console.error('Failed to send admin notification:', emailError)
      // Don't fail the request if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Contact submission received successfully. We will get back to you soon.',
      data: {
        id: contact._id,
        submittedAt: contact.createdAt
      }
    })
  } catch (error) {
    console.error('Create contact error:', error)
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }))
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      })
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while submitting contact form'
    })
  }
}

// @desc    Update contact status
// @route   PUT /api/contacts/:id/status
// @access  Private (Admin)
const updateContactStatus = async (req, res) => {
  try {
    const { status, notes } = req.body
    
    const validStatuses = ['pending', 'in_progress', 'resolved', 'closed']
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      })
    }

    const contact = await Contact.findById(req.params.id)
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      })
    }

    // Update contact
    contact.status = status
    
    if (notes) {
      contact.notes = notes
    }

    // Set resolved/closed timestamps
    if (status === 'resolved' && !contact.resolvedAt) {
      contact.resolvedAt = new Date()
    }
    
    if (status === 'closed' && !contact.closedAt) {
      contact.closedAt = new Date()
    }

    await contact.save()

    res.status(200).json({
      success: true,
      message: 'Contact status updated successfully',
      data: contact
    })
  } catch (error) {
    console.error('Update contact status error:', error)
    
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      })
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while updating contact status'
    })
  }
}

// @desc    Add response to contact
// @route   POST /api/contacts/:id/response
// @access  Private (Admin)
const addContactResponse = async (req, res) => {
  try {
    const { responseMessage, respondedBy } = req.body
    
    if (!responseMessage) {
      return res.status(400).json({
        success: false,
        message: 'Response message is required'
      })
    }

    const contact = await Contact.findById(req.params.id)
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      })
    }

    // Add response
    contact.response = {
      message: responseMessage,
      respondedBy: respondedBy || 'Admin',
      respondedAt: new Date()
    }

    // Update status if still pending
    if (contact.status === 'pending') {
      contact.status = 'in_progress'
    }

    await contact.save()

    // Send response email to customer
    try {
      await sendResponseEmail(contact)
    } catch (emailError) {
      console.error('Failed to send response email:', emailError)
      // Don't fail the request if email fails
    }

    res.status(200).json({
      success: true,
      message: 'Response added successfully',
      data: contact
    })
  } catch (error) {
    console.error('Add contact response error:', error)
    
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      })
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while adding response'
    })
  }
}

// @desc    Delete contact
// @route   DELETE /api/contacts/:id
// @access  Private (Admin)
const deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id)

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      })
    }

    await Contact.findByIdAndDelete(req.params.id)

    res.status(200).json({
      success: true,
      message: 'Contact deleted successfully'
    })
  } catch (error) {
    console.error('Delete contact error:', error)
    
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      })
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while deleting contact'
    })
  }
}

// @desc    Get contact statistics
// @route   GET /api/contacts/stats
// @access  Private (Admin)
const getContactStats = async (req, res) => {
  try {
    const [unreadCount, pendingCount, priorityStats, inquiryTypeStats] = await Promise.all([
      Contact.getUnreadCount(),
      Contact.getPendingCount(),
      Contact.getContactsByPriority(),
      Contact.aggregate([
        {
          $group: {
            _id: '$inquiryType',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ])
    ])

    res.status(200).json({
      success: true,
      data: {
        unreadCount,
        pendingCount,
        priorityStats,
        inquiryTypeStats
      }
    })
  } catch (error) {
    console.error('Get contact stats error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error while fetching contact statistics'
    })
  }
}

// Helper function to send confirmation email
const sendConfirmationEmail = async (contact) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: contact.email,
    subject: 'Thank you for contacting us - Luxury Hotel',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Thank you for contacting us!</h2>
        <p>Dear ${contact.name},</p>
        <p>We have received your inquiry and will get back to you within 24 hours.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Your Inquiry Details:</h3>
          <p><strong>Subject:</strong> ${contact.subject}</p>
          <p><strong>Inquiry Type:</strong> ${contact.inquiryType}</p>
          <p><strong>Message:</strong> ${contact.message}</p>
          <p><strong>Submitted:</strong> ${contact.createdAt.toLocaleString()}</p>
        </div>
        
        <p>If you have any urgent matters, please call us at +1 (555) 123-4567.</p>
        
        <p>Best regards,<br>Luxury Hotel Team</p>
      </div>
    `
  }

  await transporter.sendMail(mailOptions)
}

// Helper function to send admin notification
const sendAdminNotification = async (contact) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: process.env.ADMIN_EMAIL,
    subject: `New Contact Submission - ${contact.inquiryType} (${contact.priority} priority)`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">New Contact Submission</h2>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Contact Details:</h3>
          <p><strong>Name:</strong> ${contact.name}</p>
          <p><strong>Email:</strong> ${contact.email}</p>
          <p><strong>Phone:</strong> ${contact.phone || 'Not provided'}</p>
          <p><strong>Subject:</strong> ${contact.subject}</p>
          <p><strong>Inquiry Type:</strong> ${contact.inquiryType}</p>
          <p><strong>Priority:</strong> ${contact.priority}</p>
          <p><strong>Preferred Contact:</strong> ${contact.preferredContactMethod}</p>
          <p><strong>Message:</strong> ${contact.message}</p>
          <p><strong>Submitted:</strong> ${contact.createdAt.toLocaleString()}</p>
        </div>
        
        <p>Please respond to this inquiry as soon as possible.</p>
      </div>
    `
  }

  await transporter.sendMail(mailOptions)
}

// Helper function to send response email
const sendResponseEmail = async (contact) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: contact.email,
    subject: `Re: ${contact.subject} - Luxury Hotel`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Response to your inquiry</h2>
        <p>Dear ${contact.name},</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Our Response:</h3>
          <p>${contact.response.message}</p>
          <p><em>Responded by: ${contact.response.respondedBy}</em></p>
          <p><em>Date: ${contact.response.respondedAt.toLocaleString()}</em></p>
        </div>
        
        <p>If you have any further questions, please don't hesitate to contact us.</p>
        
        <p>Best regards,<br>Luxury Hotel Team</p>
      </div>
    `
  }

  await transporter.sendMail(mailOptions)
}

module.exports = {
  getContacts,
  getContact,
  createContact,
  updateContactStatus,
  addContactResponse,
  deleteContact,
  getContactStats
}