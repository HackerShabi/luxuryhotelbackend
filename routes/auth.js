const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const User = require('../models/User')
const { protect, loginRateLimit } = require('../middleware/auth')
const {
  validateNewsletter
} = require('../middleware/validation')
const { asyncHandler, AppError, sendSuccessResponse, handleValidationErrors } = require('../middleware/errorHandler')
const { body, param } = require('express-validator')
const nodemailer = require('nodemailer')

const router = express.Router()

// Configure nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

// Helper function to send email
const sendEmail = async (options) => {
  try {
    await transporter.sendMail({
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
      to: options.email,
      subject: options.subject,
      html: options.html
    })
  } catch (error) {
    console.error('Email sending failed:', error)
    throw new AppError('Email could not be sent', 500)
  }
}

// Register user
router.post(
  '/register',
  [
    body('firstName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('First name must be between 2 and 50 characters'),
    body('lastName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Last name must be between 2 and 50 characters'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    body('phone')
      .optional()
      .isMobilePhone()
      .withMessage('Please provide a valid phone number')
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { firstName, lastName, email, password, phone } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      throw new AppError('User already exists with this email', 400)
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      phone,
      role: 'guest'
    })

    // Generate JWT token
    const token = user.getSignedJwtToken()

    // Send welcome email
    const welcomeEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Luxury Hotel!</h2>
        <p>Dear ${firstName},</p>
        <p>Thank you for registering with us. We're excited to have you as part of our community.</p>
        <p>You can now:</p>
        <ul>
          <li>Browse and book our luxury rooms</li>
          <li>Access exclusive member offers</li>
          <li>Manage your bookings online</li>
          <li>Enjoy personalized service</li>
        </ul>
        <p>If you have any questions, feel free to contact our support team.</p>
        <p>Best regards,<br>The Luxury Hotel Team</p>
      </div>
    `

    try {
      await sendEmail({
        email: user.email,
        subject: 'Welcome to Luxury Hotel',
        html: welcomeEmailHtml
      })
    } catch (error) {
      console.error('Welcome email failed:', error)
    }

    sendSuccessResponse(res, 201, 'User registered successfully', {
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    })
  })
)

// Login user
router.post(
  '/login',
  loginRateLimit,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body

    // Find user and include password
    const user = await User.findByCredentials(email, password)

    if (!user) {
      throw new AppError('Invalid credentials', 401)
    }

    // Check if account is locked
    if (user.isLocked) {
      throw new AppError('Account temporarily locked due to too many failed login attempts', 423)
    }

    // Verify password
    const isPasswordValid = await user.matchPassword(password)
    if (!isPasswordValid) {
      await user.incLoginAttempts()
      throw new AppError('Invalid credentials', 401)
    }

    // Reset login attempts and update last login
    user.loginAttempts = 0
    user.lockUntil = undefined
    user.lastLogin = new Date()
    await user.save()

    // Generate JWT token
    const token = user.getSignedJwtToken()

    sendSuccessResponse(res, 200, 'Login successful', {
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    })
  })
)

// Get current user
router.get(
  '/me',
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select('-password')
    
    sendSuccessResponse(res, 200, 'User profile retrieved', user)
  })
)

// Update user profile
router.put(
  '/me',
  protect,
  [
    body('firstName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('First name must be between 2 and 50 characters'),
    body('lastName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Last name must be between 2 and 50 characters'),
    body('phone')
      .optional()
      .isMobilePhone()
      .withMessage('Please provide a valid phone number'),
    body('preferences')
      .optional()
      .isObject()
      .withMessage('Preferences must be an object')
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const allowedFields = ['firstName', 'lastName', 'phone', 'preferences', 'profile']
    const updates = {}
    
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key]
      }
    })

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password')

    sendSuccessResponse(res, 200, 'Profile updated successfully', user)
  })
)

// Change password
router.put(
  '/change-password',
  protect,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body

    // Get user with password
    const user = await User.findById(req.user.id).select('+password')

    // Verify current password
    const isCurrentPasswordValid = await user.matchPassword(currentPassword)
    if (!isCurrentPasswordValid) {
      throw new AppError('Current password is incorrect', 400)
    }

    // Update password
    user.password = newPassword
    await user.save()

    sendSuccessResponse(res, 200, 'Password changed successfully')
  })
)

// Forgot password
router.post(
  '/forgot-password',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email')
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { email } = req.body

    const user = await User.findOne({ email })
    if (!user) {
      throw new AppError('No user found with this email', 404)
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex')
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000 // 10 minutes
    await user.save()

    // Send reset email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
    const resetEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Dear ${user.firstName},</p>
        <p>You have requested to reset your password. Click the button below to reset it:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        </div>
        <p>This link will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>The Luxury Hotel Team</p>
      </div>
    `

    await sendEmail({
      email: user.email,
      subject: 'Password Reset Request',
      html: resetEmailHtml
    })

    sendSuccessResponse(res, 200, 'Password reset email sent')
  })
)

// Reset password
router.post(
  '/reset-password/:token',
  [
    param('token')
      .isLength({ min: 64, max: 64 })
      .withMessage('Invalid reset token'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { token } = req.params
    const { password } = req.body

    // Hash token and find user
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    })

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400)
    }

    // Update password and clear reset token
    user.password = password
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined
    await user.save()

    sendSuccessResponse(res, 200, 'Password reset successful')
  })
)

// Newsletter subscription
router.post(
  '/newsletter',
  validateNewsletter,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { email, firstName, lastName } = req.body

    // Check if already subscribed
    const existingUser = await User.findOne({ email })
    if (existingUser && existingUser.preferences?.newsletter) {
      throw new AppError('Email already subscribed to newsletter', 400)
    }

    if (existingUser) {
      // Update existing user
      existingUser.preferences = {
        ...existingUser.preferences,
        newsletter: true,
        newsletterSubscribedAt: new Date()
      }
      await existingUser.save()
    } else {
      // Create new user for newsletter
      await User.create({
        firstName: firstName || 'Newsletter',
        lastName: lastName || 'Subscriber',
        email,
        role: 'guest',
        preferences: {
          newsletter: true,
          newsletterSubscribedAt: new Date()
        }
      })
    }

    // Send welcome newsletter email
    const welcomeEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Our Newsletter!</h2>
        <p>Thank you for subscribing to the Luxury Hotel newsletter.</p>
        <p>You'll now receive:</p>
        <ul>
          <li>Exclusive deals and offers</li>
          <li>Early access to new services</li>
          <li>Special event invitations</li>
          <li>Travel tips and recommendations</li>
        </ul>
        <p>Stay tuned for amazing content!</p>
        <p>Best regards,<br>The Luxury Hotel Team</p>
      </div>
    `

    try {
      await sendEmail({
        email,
        subject: 'Welcome to Our Newsletter',
        html: welcomeEmailHtml
      })
    } catch (error) {
      console.error('Newsletter welcome email failed:', error)
    }

    sendSuccessResponse(res, 200, 'Successfully subscribed to newsletter')
  })
)

// Logout (client-side token removal)
router.post('/logout', (req, res) => {
  sendSuccessResponse(res, 200, 'Logged out successfully')
})

module.exports = router