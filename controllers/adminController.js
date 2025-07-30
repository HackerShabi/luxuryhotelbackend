const express = require('express')
const Room = require('../models/Room')
const Booking = require('../models/Booking')
const Contact = require('../models/Contact')
const User = require('../models/User')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { validationResult } = require('express-validator')

// @desc    Admin login
// @route   POST /api/admin/login
// @access  Public
const adminLogin = async (req, res) => {
  try {
    const { password } = req.body

    // Simple password check
    if (password !== 'admin123') {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      })
    }

    // Generate JWT token for admin access
    const token = jwt.sign(
      { 
        id: 'admin',
        role: 'admin'
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    )

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: 'admin',
          role: 'admin',
          permissions: ['all']
        }
      }
    })
  } catch (error) {
    console.error('Admin login error:', error)
    
    if (error.message === 'Account locked') {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to too many failed login attempts'
      })
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    })
  }
}

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private (Admin)
const getDashboardStats = async (req, res) => {
  try {
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const startOfYear = new Date(today.getFullYear(), 0, 1)

    // Get basic counts
    const [totalRooms, totalBookings, totalContacts, activeBookings] = await Promise.all([
      Room.countDocuments(),
      Booking.countDocuments(),
      Contact.countDocuments(),
      Booking.countDocuments({ 
        bookingStatus: { $in: ['confirmed', 'checked_in'] },
        checkOutDate: { $gte: today }
      })
    ])

    // Get today's statistics
    const [todayBookings, todayContacts, todayRevenue] = await Promise.all([
      Booking.countDocuments({ createdAt: { $gte: startOfDay } }),
      Contact.countDocuments({ createdAt: { $gte: startOfDay } }),
      Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfDay },
            paymentInfo: { status: 'completed' }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$pricing.totalAmount' }
          }
        }
      ])
    ])

    // Get monthly statistics
    const [monthlyBookings, monthlyRevenue] = await Promise.all([
      Booking.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfMonth },
            paymentInfo: { status: 'completed' }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$pricing.totalAmount' }
          }
        }
      ])
    ])

    // Get yearly revenue
    const yearlyRevenue = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfYear },
          paymentInfo: { status: 'completed' }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$pricing.totalAmount' }
        }
      }
    ])

    // Get recent bookings
    const recentBookings = await Booking.find()
      .populate('room', 'name type images')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()

    // Get pending contacts
    const pendingContacts = await Contact.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()

    // Get room occupancy
    const roomOccupancy = await Room.aggregate([
      {
        $lookup: {
          from: 'bookings',
          localField: '_id',
          foreignField: 'room',
          as: 'bookings'
        }
      },
      {
        $addFields: {
          isOccupied: {
            $anyElementTrue: {
              $map: {
                input: '$bookings',
                as: 'booking',
                in: {
                  $and: [
                    { $lte: ['$$booking.checkInDate', today] },
                    { $gte: ['$$booking.checkOutDate', today] },
                    { $in: ['$$booking.bookingStatus', ['confirmed', 'checked_in']] }
                  ]
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          totalRooms: { $sum: 1 },
          occupiedRooms: {
            $sum: {
              $cond: ['$isOccupied', 1, 0]
            }
          }
        }
      }
    ])

    const occupancyData = roomOccupancy[0] || { totalRooms: 0, occupiedRooms: 0 }
    const occupancyRate = occupancyData.totalRooms > 0 
      ? ((occupancyData.occupiedRooms / occupancyData.totalRooms) * 100).toFixed(1)
      : 0

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalRooms,
          totalBookings,
          totalContacts,
          activeBookings,
          occupancyRate: parseFloat(occupancyRate)
        },
        today: {
          bookings: todayBookings,
          contacts: todayContacts,
          revenue: todayRevenue[0]?.total || 0
        },
        monthly: {
          bookings: monthlyBookings,
          revenue: monthlyRevenue[0]?.total || 0
        },
        yearly: {
          revenue: yearlyRevenue[0]?.total || 0
        },
        recentBookings,
        pendingContacts,
        roomOccupancy: {
          total: occupancyData.totalRooms,
          occupied: occupancyData.occupiedRooms,
          available: occupancyData.totalRooms - occupancyData.occupiedRooms,
          rate: parseFloat(occupancyRate)
        }
      }
    })
  } catch (error) {
    console.error('Get dashboard stats error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard statistics'
    })
  }
}

// @desc    Get revenue analytics
// @route   GET /api/admin/analytics/revenue
// @access  Private (Admin)
const getRevenueAnalytics = async (req, res) => {
  try {
    const { period = 'monthly', year = new Date().getFullYear() } = req.query
    
    let groupBy, dateFormat
    
    if (period === 'daily') {
      groupBy = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' }
      }
      dateFormat = '%Y-%m-%d'
    } else if (period === 'weekly') {
      groupBy = {
        year: { $year: '$createdAt' },
        week: { $week: '$createdAt' }
      }
      dateFormat = '%Y-W%U'
    } else {
      groupBy = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' }
      }
      dateFormat = '%Y-%m'
    }

    const revenueData = await Booking.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(year, 0, 1),
            $lt: new Date(parseInt(year) + 1, 0, 1)
          },
          'paymentInfo.status': 'completed'
        }
      },
      {
        $group: {
          _id: groupBy,
          revenue: { $sum: '$pricing.totalAmount' },
          bookings: { $sum: 1 },
          averageBookingValue: { $avg: '$pricing.totalAmount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 }
      }
    ])

    res.status(200).json({
      success: true,
      data: {
        period,
        year: parseInt(year),
        analytics: revenueData
      }
    })
  } catch (error) {
    console.error('Get revenue analytics error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error while fetching revenue analytics'
    })
  }
}

// @desc    Get booking analytics
// @route   GET /api/admin/analytics/bookings
// @access  Private (Admin)
const getBookingAnalytics = async (req, res) => {
  try {
    // Booking status distribution
    const statusDistribution = await Booking.aggregate([
      {
        $group: {
          _id: '$bookingStatus',
          count: { $sum: 1 }
        }
      }
    ])

    // Room type popularity
    const roomTypePopularity = await Booking.aggregate([
      {
        $lookup: {
          from: 'rooms',
          localField: 'room',
          foreignField: '_id',
          as: 'roomData'
        }
      },
      {
        $unwind: '$roomData'
      },
      {
        $group: {
          _id: '$roomData.type',
          bookings: { $sum: 1 },
          revenue: { $sum: '$pricing.totalAmount' }
        }
      },
      {
        $sort: { bookings: -1 }
      }
    ])

    // Average stay duration
    const avgStayDuration = await Booking.aggregate([
      {
        $group: {
          _id: null,
          averageDuration: { $avg: '$numberOfNights' }
        }
      }
    ])

    // Guest demographics (by number of guests)
    const guestDemographics = await Booking.aggregate([
      {
        $group: {
          _id: '$numberOfGuests',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ])

    res.status(200).json({
      success: true,
      data: {
        statusDistribution,
        roomTypePopularity,
        averageStayDuration: avgStayDuration[0]?.averageDuration || 0,
        guestDemographics
      }
    })
  } catch (error) {
    console.error('Get booking analytics error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error while fetching booking analytics'
    })
  }
}

// @desc    Create admin user
// @route   POST /api/admin/users
// @access  Public
const createAdminUser = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      })
    }

    const { firstName, lastName, email, password, role = 'admin' } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      })
    }

    // Create new admin user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role,
      isEmailVerified: true // Auto-verify admin users
    })

    // Generate JWT token
    const token = user.getSignedJwtToken()

    // Remove password from response
    user.password = undefined

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        permissions: user.permissions
      }
    })
  } catch (error) {
    console.error('Create admin user error:', error)
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      })
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while creating admin user'
    })
  }
}

// @desc    Update admin profile
// @route   PUT /api/admin/profile
// @access  Private (Admin)
const updateAdminProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, preferences } = req.body
    
    const user = await User.findById(req.user.id)
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Update fields
    if (firstName) user.firstName = firstName
    if (lastName) user.lastName = lastName
    if (phone) user.phone = phone
    if (preferences) user.preferences = { ...user.preferences, ...preferences }

    await user.save()

    // Remove password from response
    const userResponse = user.toObject()
    delete userResponse.password

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: userResponse
    })
  } catch (error) {
    console.error('Update admin profile error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
    })
  }
}

// @desc    Change admin password
// @route   PUT /api/admin/password
// @access  Private (Admin)
const changeAdminPassword = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      })
    }

    const { currentPassword, newPassword } = req.body
    
    const user = await User.findById(req.user.id)
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword)
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      })
    }

    // Update password
    user.password = newPassword
    await user.save()

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    })
  } catch (error) {
    console.error('Change admin password error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error while changing password'
    })
  }
}

module.exports = {
  adminLogin,
  getDashboardStats,
  getRevenueAnalytics,
  getBookingAnalytics,
  createAdminUser,
  updateAdminProfile,
  changeAdminPassword
}