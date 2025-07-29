const mongoose = require('mongoose')

// Standard API response formatter
const sendResponse = (res, statusCode, success, message, data = null, meta = null) => {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString(),
    ...(data && { data }),
    ...(meta && { meta })
  }
  
  return res.status(statusCode).json(response)
}

// Success response helper
const sendSuccess = (res, message = 'Success', data = null, statusCode = 200, meta = null) => {
  return sendResponse(res, statusCode, true, message, data, meta)
}

// Error response helper
const sendError = (res, message = 'Internal Server Error', statusCode = 500, errors = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
    ...(errors && { errors })
  }
  
  return res.status(statusCode).json(response)
}

// Pagination helper
const getPagination = (page = 1, limit = 10, maxLimit = 100) => {
  const pageNum = Math.max(1, parseInt(page))
  const limitNum = Math.min(maxLimit, Math.max(1, parseInt(limit)))
  const skip = (pageNum - 1) * limitNum
  
  return {
    page: pageNum,
    limit: limitNum,
    skip
  }
}

// Pagination metadata calculator
const getPaginationMeta = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit)
  const hasNextPage = page < totalPages
  const hasPrevPage = page > 1
  
  return {
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: hasPrevPage ? page - 1 : null
    }
  }
}

// Query builder for filtering and sorting
const buildQuery = (queryParams, allowedFilters = [], allowedSortFields = []) => {
  const query = {}
  const sort = {}
  
  // Build filter query
  allowedFilters.forEach(field => {
    if (queryParams[field] !== undefined) {
      if (field.includes('Date') && queryParams[field]) {
        // Handle date range queries
        const dateValue = new Date(queryParams[field])
        if (!isNaN(dateValue.getTime())) {
          query[field] = dateValue
        }
      } else if (field.includes('Price') || field.includes('Amount')) {
        // Handle price range queries
        const value = parseFloat(queryParams[field])
        if (!isNaN(value)) {
          query[field] = value
        }
      } else if (Array.isArray(queryParams[field])) {
        // Handle array filters
        query[field] = { $in: queryParams[field] }
      } else if (typeof queryParams[field] === 'string') {
        // Handle string filters with regex for partial matches
        if (field.includes('name') || field.includes('title') || field.includes('description')) {
          query[field] = { $regex: queryParams[field], $options: 'i' }
        } else {
          query[field] = queryParams[field]
        }
      } else {
        query[field] = queryParams[field]
      }
    }
  })
  
  // Handle date range filters
  if (queryParams.startDate && queryParams.endDate) {
    const startDate = new Date(queryParams.startDate)
    const endDate = new Date(queryParams.endDate)
    
    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
      query.createdAt = {
        $gte: startDate,
        $lte: endDate
      }
    }
  }
  
  // Handle price range filters
  if (queryParams.minPrice || queryParams.maxPrice) {
    const priceQuery = {}
    if (queryParams.minPrice) {
      const minPrice = parseFloat(queryParams.minPrice)
      if (!isNaN(minPrice)) {
        priceQuery.$gte = minPrice
      }
    }
    if (queryParams.maxPrice) {
      const maxPrice = parseFloat(queryParams.maxPrice)
      if (!isNaN(maxPrice)) {
        priceQuery.$lte = maxPrice
      }
    }
    if (Object.keys(priceQuery).length > 0) {
      query['pricing.basePrice'] = priceQuery
    }
  }
  
  // Build sort query
  if (queryParams.sortBy && allowedSortFields.includes(queryParams.sortBy)) {
    const sortOrder = queryParams.sortOrder === 'desc' ? -1 : 1
    sort[queryParams.sortBy] = sortOrder
  } else {
    // Default sort
    sort.createdAt = -1
  }
  
  return { query, sort }
}

// Validate ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id)
}

// Generate unique identifier
const generateUniqueId = (prefix = '', length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = prefix
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Generate booking confirmation number
const generateConfirmationNumber = () => {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  
  return `LH${year}${month}${day}${random}`
}

// Calculate date difference in days
const calculateDaysDifference = (startDate, endDate) => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end - start)
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

// Format currency
const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount)
}

// Sanitize user input
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input
  
  return input
    .trim()
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
}

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validate phone number format
const isValidPhone = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{7,15}$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
}

// Generate random password
const generateRandomPassword = (length = 12) => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return password
}

// Calculate booking pricing
const calculateBookingPricing = (basePrice, numberOfNights, taxRate = 0.1, serviceFeesRate = 0.05) => {
  const subtotal = basePrice * numberOfNights
  const taxes = subtotal * taxRate
  const fees = subtotal * serviceFeesRate
  const totalAmount = subtotal + taxes + fees
  
  return {
    pricePerNight: basePrice,
    subtotal: Math.round(subtotal * 100) / 100,
    taxes: Math.round(taxes * 100) / 100,
    fees: Math.round(fees * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    currency: 'USD'
  }
}

// Check room availability
const checkRoomAvailability = async (roomId, checkInDate, checkOutDate, excludeBookingId = null) => {
  const Booking = require('../models/Booking')
  
  const query = {
    room: roomId,
    bookingStatus: { $in: ['confirmed', 'checked-in'] },
    $or: [
      {
        checkInDate: { $lt: new Date(checkOutDate) },
        checkOutDate: { $gt: new Date(checkInDate) }
      }
    ]
  }
  
  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId }
  }
  
  const conflictingBookings = await Booking.find(query)
  return conflictingBookings.length === 0
}

// Rate limiting helper
const createRateLimitKey = (ip, endpoint) => {
  return `rate_limit:${ip}:${endpoint}`
}

// Log API request
const logAPIRequest = (req, res, next) => {
  const start = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - start
    console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms - ${req.ip}`)
  })
  
  next()
}

// Extract user info from request
const extractUserInfo = (req) => {
  return {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent') || 'Unknown',
    referer: req.get('Referer') || null,
    timestamp: new Date()
  }
}

// Validate date range
const validateDateRange = (startDate, endDate, minDays = 1, maxDays = 365) => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const now = new Date()
  
  // Check if dates are valid
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, message: 'Invalid date format' }
  }
  
  // Check if start date is in the future
  if (start < now) {
    return { valid: false, message: 'Check-in date must be in the future' }
  }
  
  // Check if end date is after start date
  if (end <= start) {
    return { valid: false, message: 'Check-out date must be after check-in date' }
  }
  
  // Check minimum and maximum stay duration
  const days = calculateDaysDifference(start, end)
  if (days < minDays) {
    return { valid: false, message: `Minimum stay is ${minDays} day(s)` }
  }
  if (days > maxDays) {
    return { valid: false, message: `Maximum stay is ${maxDays} days` }
  }
  
  return { valid: true, days }
}

// Convert string to slug
const createSlug = (text) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Deep merge objects
const deepMerge = (target, source) => {
  const output = Object.assign({}, target)
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target))
          Object.assign(output, { [key]: source[key] })
        else
          output[key] = deepMerge(target[key], source[key])
      } else {
        Object.assign(output, { [key]: source[key] })
      }
    })
  }
  return output
}

// Check if value is object
const isObject = (item) => {
  return item && typeof item === 'object' && !Array.isArray(item)
}

// Retry async operation
const retryAsync = async (fn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)))
    }
  }
}

module.exports = {
  sendResponse,
  sendSuccess,
  sendError,
  getPagination,
  getPaginationMeta,
  buildQuery,
  isValidObjectId,
  generateUniqueId,
  generateConfirmationNumber,
  calculateDaysDifference,
  formatCurrency,
  sanitizeInput,
  isValidEmail,
  isValidPhone,
  generateRandomPassword,
  calculateBookingPricing,
  checkRoomAvailability,
  createRateLimitKey,
  logAPIRequest,
  extractUserInfo,
  validateDateRange,
  createSlug,
  deepMerge,
  retryAsync
}