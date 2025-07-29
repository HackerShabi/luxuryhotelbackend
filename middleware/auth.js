const jwt = require('jsonwebtoken')
const User = require('../models/User')

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  try {
    let token

    // Check for token in header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1]
    }

    // Make sure token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      })
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      // Get user from token
      const user = await User.findById(decoded.id).select('-password')

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'No user found with this token'
        })
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User account is deactivated'
        })
      }

      // Check if user is locked
      if (user.isLocked) {
        return res.status(423).json({
          success: false,
          message: 'User account is temporarily locked'
        })
      }

      req.user = user
      next()
    } catch (error) {
      console.error('Token verification error:', error)
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      })
    }
  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    })
  }
}

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      })
    }

    next()
  }
}

// Check specific permissions
const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      })
    }

    // Super admin has all permissions
    if (req.user.role === 'super_admin') {
      return next()
    }

    // Check if user has the required permission
    if (!req.user.permissions || !req.user.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: `Permission '${permission}' required to access this route`
      })
    }

    next()
  }
}

// Rate limiting for login attempts
const loginRateLimit = async (req, res, next) => {
  try {
    const { email } = req.body

    if (!email) {
      return next()
    }

    const user = await User.findOne({ email })

    if (user && user.isLocked) {
      const lockTime = user.lockUntil - Date.now()
      const minutes = Math.ceil(lockTime / (1000 * 60))
      
      return res.status(423).json({
        success: false,
        message: `Account is locked. Try again in ${minutes} minutes.`
      })
    }

    next()
  } catch (error) {
    console.error('Login rate limit error:', error)
    next()
  }
}

// Optional auth - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    let token

    // Check for token in header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1]
    }

    if (token) {
      try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        // Get user from token
        const user = await User.findById(decoded.id).select('-password')

        if (user && user.isActive && !user.isLocked) {
          req.user = user
        }
      } catch (error) {
        // Token invalid, but continue without user
        console.log('Optional auth token invalid:', error.message)
      }
    }

    next()
  } catch (error) {
    console.error('Optional auth middleware error:', error)
    next()
  }
}

// Admin key verification for simple admin access
const verifyAdminKey = (req, res, next) => {
  try {
    const { key } = req.query
    const { adminKey } = req.body
    
    const providedKey = key || adminKey
    
    if (!providedKey) {
      return res.status(401).json({
        success: false,
        message: 'Admin key required'
      })
    }

    if (providedKey !== process.env.ADMIN_KEY) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin key'
      })
    }

    next()
  } catch (error) {
    console.error('Admin key verification error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error in admin key verification'
    })
  }
}

module.exports = {
  protect,
  authorize,
  checkPermission,
  loginRateLimit,
  optionalAuth,
  verifyAdminKey
}