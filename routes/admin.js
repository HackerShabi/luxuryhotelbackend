const express = require('express')
const User = require('../models/User')
const {
  adminLogin,
  getDashboardStats,
  getRevenueAnalytics,
  getBookingAnalytics,
  createAdminUser,
  updateAdminProfile,
  changeAdminPassword
} = require('../controllers/adminController')
const { protect, authorize, checkPermission, verifyAdminKey } = require('../middleware/auth')
const {
  validateAdminLogin,
  validateAdminUser,
  validatePasswordChange
} = require('../middleware/validation')
const { asyncHandler, handleValidationErrors } = require('../middleware/errorHandler')
const { body, query } = require('express-validator')

const router = express.Router()

// Public admin login
router.post(
  '/login',
  validateAdminLogin,
  handleValidationErrors,
  asyncHandler(adminLogin)
)

// Admin key verification (simple access)
router.post(
  '/verify-key',
  [
    body('adminKey')
      .notEmpty()
      .withMessage('Admin key is required')
  ],
  handleValidationErrors,
  verifyAdminKey,
  (req, res) => {
    res.json({
      success: true,
      message: 'Admin key verified successfully',
      data: {
        accessLevel: 'admin',
        permissions: ['view_dashboard', 'manage_rooms', 'manage_bookings', 'manage_contacts']
      }
    })
  }
)

// Protected admin routes
router.get(
  '/dashboard/stats',
  protect,
  authorize('admin', 'super_admin', 'manager'),
  asyncHandler(getDashboardStats)
)

// Admin stats endpoint
router.get(
  '/stats',
  protect,
  authorize('admin', 'super_admin', 'manager'),
  asyncHandler(getDashboardStats)
)

// Admin rooms endpoint
router.get(
  '/rooms',
  protect,
  authorize('admin', 'super_admin', 'manager'),
  asyncHandler(async (req, res) => {
    const Room = require('../models/Room')
    const rooms = await Room.find().sort({ createdAt: -1 })
    res.json({
      success: true,
      data: rooms
    })
  })
)

// Admin bookings endpoint
router.get(
  '/bookings',
  protect,
  authorize('admin', 'super_admin', 'manager'),
  asyncHandler(async (req, res) => {
    const Booking = require('../models/Booking')
    const bookings = await Booking.find()
      .populate('room', 'name type price')
      .populate('user', 'firstName lastName email phone')
      .sort({ createdAt: -1 })
    res.json({
      success: true,
      data: bookings
    })
  })
)

// Update booking status
router.patch(
  '/bookings/:id',
  protect,
  authorize('admin', 'super_admin', 'manager'),
  asyncHandler(async (req, res) => {
    const Booking = require('../models/Booking')
    const { status } = req.body
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('room', 'name type price').populate('user', 'firstName lastName email phone')
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      })
    }
    
    res.json({
      success: true,
      data: booking
    })
  })
)

// Admin contacts endpoint
router.get(
  '/contacts',
  protect,
  authorize('admin', 'super_admin', 'manager'),
  asyncHandler(async (req, res) => {
    const Contact = require('../models/Contact')
    const contacts = await Contact.find().sort({ createdAt: -1 })
    res.json({
      success: true,
      data: contacts
    })
  })
)

// Mark contact as read
router.patch(
  '/contacts/:id/read',
  protect,
  authorize('admin', 'super_admin', 'manager'),
  asyncHandler(async (req, res) => {
    const Contact = require('../models/Contact')
    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    )
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      })
    }
    
    res.json({
      success: true,
      data: contact
    })
  })
)

router.get(
  '/analytics/revenue',
  protect,
  authorize('admin', 'super_admin', 'manager'),
  checkPermission('view_analytics'),
  [
    query('period')
      .optional()
      .isIn(['daily', 'weekly', 'monthly', 'yearly'])
      .withMessage('Invalid period. Must be daily, weekly, monthly, or yearly'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be in ISO format'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be in ISO format'),
    query('roomType')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Room type cannot be empty')
  ],
  handleValidationErrors,
  asyncHandler(getRevenueAnalytics)
)

router.get(
  '/analytics/bookings',
  protect,
  authorize('admin', 'super_admin', 'manager'),
  checkPermission('view_analytics'),
  [
    query('period')
      .optional()
      .isIn(['daily', 'weekly', 'monthly', 'yearly'])
      .withMessage('Invalid period'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be in ISO format'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be in ISO format')
  ],
  handleValidationErrors,
  asyncHandler(getBookingAnalytics)
)

// User management (Super Admin only)
router.post(
  '/users',
  protect,
  authorize('super_admin'),
  checkPermission('manage_users'),
  validateAdminUser,
  handleValidationErrors,
  asyncHandler(createAdminUser)
)

router.get(
  '/users',
  protect,
  authorize('super_admin'),
  checkPermission('view_users'),
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('role')
      .optional()
      .isIn(['admin', 'manager', 'staff'])
      .withMessage('Invalid role'),
    query('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    query('search')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Search term cannot be empty')
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 10,
      role,
      isActive,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query

    // Build filter
    const filter = { role: { $in: ['admin', 'manager', 'staff'] } }
    
    if (role) filter.role = role
    if (typeof isActive === 'boolean') filter.isActive = isActive
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }

    // Calculate pagination
    const skip = (page - 1) * limit
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 }

    // Execute query
    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password -passwordResetToken')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(filter)
    ])

    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: users,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    })
  })
)

// Profile management
router.get(
  '/profile',
  protect,
  authorize('admin', 'super_admin', 'manager'),
  asyncHandler(async (req, res) => {
    const user = await req.user.select('-password -passwordResetToken')
    
    res.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: user
    })
  })
)

router.put(
  '/profile',
  protect,
  authorize('admin', 'super_admin', 'manager'),
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
      .withMessage('Preferences must be an object'),
    body('profile')
      .optional()
      .isObject()
      .withMessage('Profile must be an object')
  ],
  handleValidationErrors,
  asyncHandler(updateAdminProfile)
)

router.put(
  '/change-password',
  protect,
  authorize('admin', 'super_admin', 'manager'),
  validatePasswordChange,
  handleValidationErrors,
  asyncHandler(changeAdminPassword)
)

// System settings (Super Admin only)
router.get(
  '/settings',
  protect,
  authorize('super_admin'),
  asyncHandler(async (req, res) => {
    // Return system settings (mock data for now)
    const settings = {
      siteName: 'Luxury Hotel',
      currency: 'USD',
      timezone: 'UTC',
      emailNotifications: true,
      maintenanceMode: false,
      bookingSettings: {
        maxAdvanceBookingDays: 365,
        minAdvanceBookingHours: 2,
        cancellationPolicy: '24_hours',
        autoConfirmBookings: true
      },
      paymentSettings: {
        acceptedMethods: ['credit_card', 'debit_card', 'paypal'],
        currency: 'USD',
        taxRate: 0.1,
        serviceFeeRate: 0.05
      }
    }

    res.json({
      success: true,
      message: 'Settings retrieved successfully',
      data: settings
    })
  })
)

router.put(
  '/settings',
  protect,
  authorize('super_admin'),
  [
    body('siteName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Site name must be between 1 and 100 characters'),
    body('currency')
      .optional()
      .isIn(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'])
      .withMessage('Invalid currency'),
    body('timezone')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Timezone cannot be empty'),
    body('emailNotifications')
      .optional()
      .isBoolean()
      .withMessage('Email notifications must be a boolean'),
    body('maintenanceMode')
      .optional()
      .isBoolean()
      .withMessage('Maintenance mode must be a boolean')
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    // Update system settings (mock implementation)
    const updatedSettings = req.body
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: updatedSettings
    })
  })
)

module.exports = router