const { body, query, param } = require('express-validator')

// Room validation
const validateRoom = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Room name must be between 2 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('type')
    .isIn(['single', 'double', 'suite', 'deluxe', 'presidential'])
    .withMessage('Invalid room type'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('maxOccupancy')
    .isInt({ min: 1, max: 10 })
    .withMessage('Max occupancy must be between 1 and 10'),
  body('size')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Size must be a positive number'),
  body('bedType')
    .optional()
    .isIn(['single', 'double', 'queen', 'king', 'twin', 'sofa_bed'])
    .withMessage('Invalid bed type'),
  body('amenities')
    .optional()
    .isArray()
    .withMessage('Amenities must be an array'),
  body('amenities.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each amenity must be between 1 and 50 characters'),
  body('features')
    .optional()
    .isArray()
    .withMessage('Features must be an array'),
  body('isAvailable')
    .optional()
    .isBoolean()
    .withMessage('Availability must be a boolean'),
  body('floor')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Floor must be between 1 and 50'),
  body('wing')
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Wing must be between 1 and 20 characters'),
  body('view')
    .optional()
    .isIn(['city', 'ocean', 'garden', 'pool', 'mountain', 'courtyard'])
    .withMessage('Invalid view type')
]

// Booking validation
const validateBooking = [
  body('room')
    .isMongoId()
    .withMessage('Invalid room ID'),
  body('guestInfo.firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('guestInfo.lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('guestInfo.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('guestInfo.phone')
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('guestInfo.address.street')
    .optional()
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Street address must be between 5 and 100 characters'),
  body('guestInfo.address.city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters'),
  body('guestInfo.address.country')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Country must be between 2 and 50 characters'),
  body('guestInfo.address.zipCode')
    .optional()
    .trim()
    .isLength({ min: 3, max: 10 })
    .withMessage('Zip code must be between 3 and 10 characters'),
  body('checkInDate')
    .isISO8601()
    .toDate()
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error('Check-in date cannot be in the past')
      }
      return true
    })
    .withMessage('Please provide a valid check-in date'),
  body('checkOutDate')
    .isISO8601()
    .toDate()
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.checkInDate)) {
        throw new Error('Check-out date must be after check-in date')
      }
      return true
    })
    .withMessage('Please provide a valid check-out date'),
  body('numberOfGuests')
    .isInt({ min: 1, max: 10 })
    .withMessage('Number of guests must be between 1 and 10'),
  body('guestInfo.specialRequests')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Special requests cannot exceed 500 characters'),
  body('paymentInfo.method')
    .isIn(['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash'])
    .withMessage('Invalid payment method'),
  body('paymentInfo.cardNumber')
    .optional()
    .isCreditCard()
    .withMessage('Please provide a valid card number'),
  body('paymentInfo.expiryMonth')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('Expiry month must be between 1 and 12'),
  body('paymentInfo.expiryYear')
    .optional()
    .isInt({ min: new Date().getFullYear(), max: new Date().getFullYear() + 20 })
    .withMessage('Invalid expiry year'),
  body('paymentInfo.cvv')
    .optional()
    .isLength({ min: 3, max: 4 })
    .isNumeric()
    .withMessage('CVV must be 3 or 4 digits'),
  body('paymentInfo.cardHolderName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Card holder name must be between 2 and 100 characters')
]

// Contact validation
const validateContact = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('inquiryType')
    .isIn(['general', 'booking', 'complaint', 'compliment', 'suggestion', 'support'])
    .withMessage('Invalid inquiry type'),
  body('subject')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Subject must be between 5 and 200 characters'),
  body('message')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Message must be between 10 and 2000 characters'),
  body('preferredContactMethod')
    .optional()
    .isIn(['email', 'phone', 'either'])
    .withMessage('Invalid preferred contact method'),
  body('preferredContactTime')
    .optional()
    .isIn(['morning', 'afternoon', 'evening', 'anytime'])
    .withMessage('Invalid preferred contact time')
]

// Admin login validation
const validateAdminLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('adminKey')
    .notEmpty()
    .withMessage('Admin key is required')
]

// Admin user creation validation
const validateAdminUser = [
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
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters and contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
  body('role')
    .optional()
    .isIn(['admin', 'super_admin', 'manager'])
    .withMessage('Invalid role'),
  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array')
]

// Password change validation
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must be at least 8 characters and contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password')
      }
      return true
    })
]

// Newsletter subscription validation
const validateNewsletter = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
]

// Query parameter validation
const validateRoomQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('type')
    .optional()
    .isIn(['single', 'double', 'suite', 'deluxe', 'presidential'])
    .withMessage('Invalid room type'),
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be a positive number'),
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be a positive number'),
  query('maxOccupancy')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Max occupancy must be between 1 and 10'),
  query('checkIn')
    .optional()
    .isISO8601()
    .withMessage('Check-in date must be in ISO format'),
  query('checkOut')
    .optional()
    .isISO8601()
    .withMessage('Check-out date must be in ISO format'),
  query('sortBy')
    .optional()
    .isIn(['price', 'rating', 'name', 'type'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
]

// Booking query validation
const validateBookingQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'])
    .withMessage('Invalid booking status'),
  query('paymentStatus')
    .optional()
    .isIn(['pending', 'completed', 'failed', 'refunded'])
    .withMessage('Invalid payment status'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be in ISO format'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be in ISO format')
]

// MongoDB ObjectId validation
const validateObjectId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format')
]

module.exports = {
  validateRoom,
  validateBooking,
  validateContact,
  validateAdminLogin,
  validateAdminUser,
  validatePasswordChange,
  validateNewsletter,
  validateRoomQuery,
  validateBookingQuery,
  validateObjectId
}