const express = require('express')
const {
  getBookings,
  getBooking,
  getBookingByConfirmation,
  createBooking,
  updateBookingStatus,
  updatePaymentStatus,
  cancelBooking,
  getBookingStats
} = require('../controllers/bookingController')
const { protect, authorize, checkPermission, optionalAuth } = require('../middleware/auth')
const {
  validateBooking,
  validateBookingQuery,
  validateObjectId
} = require('../middleware/validation')
const { asyncHandler, handleValidationErrors } = require('../middleware/errorHandler')
const { body, param } = require('express-validator')

const router = express.Router()

// Public routes
router.post(
  '/',
  validateBooking,
  handleValidationErrors,
  asyncHandler(createBooking)
)

router.get(
  '/confirmation/:confirmationNumber',
  [
    param('confirmationNumber')
      .isLength({ min: 6, max: 20 })
      .withMessage('Invalid confirmation number format')
  ],
  handleValidationErrors,
  asyncHandler(getBookingByConfirmation)
)

// Protected routes - Admin access
router.get(
  '/',
  protect,
  authorize('admin', 'super_admin', 'manager'),
  validateBookingQuery,
  handleValidationErrors,
  asyncHandler(getBookings)
)

router.get(
  '/stats',
  protect,
  authorize('admin', 'super_admin', 'manager'),
  checkPermission('view_analytics'),
  asyncHandler(getBookingStats)
)

router.get(
  '/:id',
  protect,
  authorize('admin', 'super_admin', 'manager'),
  validateObjectId,
  handleValidationErrors,
  asyncHandler(getBooking)
)

router.patch(
  '/:id/status',
  protect,
  authorize('admin', 'super_admin', 'manager'),
  checkPermission('manage_bookings'),
  [
    ...validateObjectId,
    body('status')
      .isIn(['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'])
      .withMessage('Invalid booking status'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters')
  ],
  handleValidationErrors,
  asyncHandler(updateBookingStatus)
)

router.patch(
  '/:id/payment',
  protect,
  authorize('admin', 'super_admin', 'manager'),
  checkPermission('manage_payments'),
  [
    ...validateObjectId,
    body('paymentStatus')
      .isIn(['pending', 'completed', 'failed', 'refunded'])
      .withMessage('Invalid payment status'),
    body('transactionId')
      .optional()
      .trim()
      .isLength({ min: 5, max: 100 })
      .withMessage('Transaction ID must be between 5 and 100 characters'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters')
  ],
  handleValidationErrors,
  asyncHandler(updatePaymentStatus)
)

router.patch(
  '/:id/cancel',
  protect,
  authorize('admin', 'super_admin', 'manager'),
  checkPermission('manage_bookings'),
  [
    ...validateObjectId,
    body('reason')
      .trim()
      .isLength({ min: 5, max: 500 })
      .withMessage('Cancellation reason must be between 5 and 500 characters'),
    body('refundAmount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Refund amount must be a positive number'),
    body('refundMethod')
      .optional()
      .isIn(['original_payment', 'bank_transfer', 'cash', 'credit'])
      .withMessage('Invalid refund method'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters')
  ],
  handleValidationErrors,
  asyncHandler(cancelBooking)
)

module.exports = router