const Room = require('../models/Room')
const Booking = require('../models/Booking')
const { validationResult } = require('express-validator')

// @desc    Get all rooms with filtering, sorting, and pagination
// @route   GET /api/rooms
// @access  Public
const getRooms = async (req, res) => {
  try {
    const {
      type,
      minPrice,
      maxPrice,
      maxOccupancy,
      amenities,
      isAvailable,
      isFeatured,
      isPopular,
      checkIn,
      checkOut,
      page = 1,
      limit = 12,
      sort = '-createdAt'
    } = req.query

    // Build filter object
    const filter = {}

    if (type) {
      filter.type = type
    }

    if (minPrice || maxPrice) {
      filter.pricePerNight = {}
      if (minPrice) filter.pricePerNight.$gte = Number(minPrice)
      if (maxPrice) filter.pricePerNight.$lte = Number(maxPrice)
    }

    if (maxOccupancy) {
      filter.maxOccupancy = { $gte: Number(maxOccupancy) }
    }

    if (amenities) {
      const amenitiesArray = amenities.split(',').map(a => a.trim())
      filter.amenities = { $in: amenitiesArray }
    }

    if (isAvailable !== undefined) {
      filter.isAvailable = isAvailable === 'true'
    }

    if (isFeatured !== undefined) {
      filter.isFeatured = isFeatured === 'true'
    }

    if (isPopular !== undefined) {
      filter.isPopular = isPopular === 'true'
    }

    // Check availability for specific dates
    if (checkIn && checkOut) {
      const checkInDate = new Date(checkIn)
      const checkOutDate = new Date(checkOut)
      
      // Find rooms that are not booked during the requested period
      const bookedRoomIds = await Booking.distinct('room', {
        $or: [
          {
            checkInDate: { $lt: checkOutDate },
            checkOutDate: { $gt: checkInDate }
          }
        ],
        bookingStatus: { $in: ['confirmed', 'checked_in'] }
      })
      
      filter._id = { $nin: bookedRoomIds }
    }

    // Pagination
    const pageNum = parseInt(page, 10)
    const limitNum = parseInt(limit, 10)
    const skip = (pageNum - 1) * limitNum

    // Execute query
    const rooms = await Room.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean()

    // Get total count for pagination
    const total = await Room.countDocuments(filter)

    res.status(200).json({
      success: true,
      count: rooms.length,
      total,
      pagination: {
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      },
      data: rooms
    })
  } catch (error) {
    console.error('Get rooms error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error while fetching rooms'
    })
  }
}

// @desc    Get single room by ID
// @route   GET /api/rooms/:id
// @access  Public
const getRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      })
    }

    res.status(200).json({
      success: true,
      data: room
    })
  } catch (error) {
    console.error('Get room error:', error)
    
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      })
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while fetching room'
    })
  }
}

// @desc    Create new room
// @route   POST /api/rooms
// @access  Private (Admin)
const createRoom = async (req, res) => {
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

    const room = await Room.create(req.body)

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: room
    })
  } catch (error) {
    console.error('Create room error:', error)
    
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
      message: 'Server error while creating room'
    })
  }
}

// @desc    Update room
// @route   PUT /api/rooms/:id
// @access  Private (Admin)
const updateRoom = async (req, res) => {
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

    const room = await Room.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    )

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      })
    }

    res.status(200).json({
      success: true,
      message: 'Room updated successfully',
      data: room
    })
  } catch (error) {
    console.error('Update room error:', error)
    
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      })
    }
    
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
      message: 'Server error while updating room'
    })
  }
}

// @desc    Delete room
// @route   DELETE /api/rooms/:id
// @access  Private (Admin)
const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      })
    }

    // Check if room has active bookings
    const activeBookings = await Booking.countDocuments({
      room: req.params.id,
      bookingStatus: { $in: ['confirmed', 'checked_in'] },
      checkOutDate: { $gte: new Date() }
    })

    if (activeBookings > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete room with active bookings'
      })
    }

    await Room.findByIdAndDelete(req.params.id)

    res.status(200).json({
      success: true,
      message: 'Room deleted successfully'
    })
  } catch (error) {
    console.error('Delete room error:', error)
    
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      })
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while deleting room'
    })
  }
}

// @desc    Get featured rooms
// @route   GET /api/rooms/featured
// @access  Public
const getFeaturedRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ isFeatured: true, isAvailable: true })
      .sort('-rating')
      .limit(4)
      .lean()

    res.status(200).json({
      success: true,
      count: rooms.length,
      data: rooms
    })
  } catch (error) {
    console.error('Get featured rooms error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error while fetching featured rooms'
    })
  }
}

// @desc    Get room availability
// @route   GET /api/rooms/:id/availability
// @access  Public
const getRoomAvailability = async (req, res) => {
  try {
    const { checkIn, checkOut } = req.query
    
    if (!checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        message: 'Check-in and check-out dates are required'
      })
    }

    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)
    
    if (checkInDate >= checkOutDate) {
      return res.status(400).json({
        success: false,
        message: 'Check-out date must be after check-in date'
      })
    }

    const room = await Room.findById(req.params.id)
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      })
    }

    // Check for conflicting bookings
    const conflictingBookings = await Booking.find({
      room: req.params.id,
      $or: [
        {
          checkInDate: { $lt: checkOutDate },
          checkOutDate: { $gt: checkInDate }
        }
      ],
      bookingStatus: { $in: ['confirmed', 'checked_in'] }
    })

    const isAvailable = conflictingBookings.length === 0 && room.isAvailable

    res.status(200).json({
      success: true,
      data: {
        roomId: room._id,
        isAvailable,
        checkInDate,
        checkOutDate,
        conflictingBookings: conflictingBookings.length
      }
    })
  } catch (error) {
    console.error('Get room availability error:', error)
    
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      })
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while checking availability'
    })
  }
}

module.exports = {
  getRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom,
  getFeaturedRooms,
  getRoomAvailability
}