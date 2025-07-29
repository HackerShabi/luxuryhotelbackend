const { validationResult } = require('express-validator')

// Handle validation errors from express-validator
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }))
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages
    })
  }
  
  next()
}

// Global error handler
const errorHandler = (err, req, res, next) => {
  let error = { ...err }
  error.message = err.message

  // Log error
  console.error('Error:', err)

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found'
    error = {
      message,
      statusCode: 404
    }
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0]
    const value = err.keyValue[field]
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists`
    error = {
      message,
      statusCode: 400
    }
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ')
    error = {
      message,
      statusCode: 400
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token'
    error = {
      message,
      statusCode: 401
    }
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired'
    error = {
      message,
      statusCode: 401
    }
  }

  // Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File too large'
    error = {
      message,
      statusCode: 400
    }
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    const message = 'Too many files'
    error = {
      message,
      statusCode: 400
    }
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Unexpected file field'
    error = {
      message,
      statusCode: 400
    }
  }

  // Payment errors (Stripe)
  if (err.type === 'StripeCardError') {
    const message = err.message || 'Payment failed'
    error = {
      message,
      statusCode: 400
    }
  }

  if (err.type === 'StripeInvalidRequestError') {
    const message = 'Invalid payment request'
    error = {
      message,
      statusCode: 400
    }
  }

  // Rate limiting errors
  if (err.status === 429) {
    const message = 'Too many requests, please try again later'
    error = {
      message,
      statusCode: 429
    }
  }

  // Database connection errors
  if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
    const message = 'Database connection error'
    error = {
      message,
      statusCode: 503
    }
  }

  // Email sending errors
  if (err.code === 'EAUTH' || err.code === 'ECONNECTION') {
    const message = 'Email service unavailable'
    error = {
      message,
      statusCode: 503
    }
  }

  // File system errors
  if (err.code === 'ENOENT') {
    const message = 'File not found'
    error = {
      message,
      statusCode: 404
    }
  }

  if (err.code === 'EACCES') {
    const message = 'Permission denied'
    error = {
      message,
      statusCode: 403
    }
  }

  // Default error response
  const statusCode = error.statusCode || err.statusCode || 500
  const message = error.message || 'Server Error'

  // Don't leak error details in production
  const response = {
    success: false,
    message
  }

  // Add error details in development
  if (process.env.NODE_ENV === 'development') {
    response.error = err
    response.stack = err.stack
  }

  // Add request info for debugging
  if (process.env.NODE_ENV === 'development') {
    response.request = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    }
  }

  res.status(statusCode).json(response)
}

// Handle 404 errors
const notFound = (req, res, next) => {
  const error = new Error(`Not found - ${req.originalUrl}`)
  res.status(404)
  next(error)
}

// Async error handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

// Custom error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message)
    this.statusCode = statusCode
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error'
    this.isOperational = true

    Error.captureStackTrace(this, this.constructor)
  }
}

// Error response helper
const sendErrorResponse = (res, statusCode, message, errors = null) => {
  const response = {
    success: false,
    message
  }

  if (errors) {
    response.errors = errors
  }

  return res.status(statusCode).json(response)
}

// Success response helper
const sendSuccessResponse = (res, statusCode = 200, message, data = null, meta = null) => {
  const response = {
    success: true,
    message
  }

  if (data !== null) {
    response.data = data
  }

  if (meta) {
    response.meta = meta
  }

  return res.status(statusCode).json(response)
}

// Validation error formatter
const formatValidationErrors = (errors) => {
  return errors.array().map(error => ({
    field: error.path || error.param,
    message: error.msg,
    value: error.value,
    location: error.location
  }))
}

// Database error handler
const handleDatabaseError = (error) => {
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message,
      value: err.value
    }))
    return new AppError('Validation failed', 400, errors)
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0]
    const value = error.keyValue[field]
    return new AppError(`${field} '${value}' already exists`, 400)
  }

  if (error.name === 'CastError') {
    return new AppError('Invalid ID format', 400)
  }

  return new AppError('Database error', 500)
}

// Rate limit error handler
const handleRateLimitError = (req, res) => {
  return sendErrorResponse(
    res,
    429,
    'Too many requests from this IP, please try again later'
  )
}

module.exports = {
  errorHandler,
  notFound,
  asyncHandler,
  AppError,
  sendErrorResponse,
  sendSuccessResponse,
  handleValidationErrors,
  formatValidationErrors,
  handleDatabaseError,
  handleRateLimitError
}