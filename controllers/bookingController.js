const Booking = require('../models/Booking')
const Room = require('../models/Room')
const { validationResult } = require('express-validator')
const crypto = require('crypto')

// @desc    Get all bookings with filtering and pagination
// @route   GET /api/bookings
// @access  Private (Admin)
const getBookings = async (req, res) => {
  try {
    const {
      status,
      paymentStatus,
      checkInDate,
      checkOutDate,
      guestEmail,
      roomType,
      page = 1,
      limit = 20,
      sort = '-createdAt'
    } = req.query

    // Build filter object
    const filter = {}

    if (status) {
      filter.bookingStatus = status
    }

    if (paymentStatus) {
      filter['paymentInfo.status'] = paymentStatus
    }

    if (guestEmail) {
      filter['guestInfo.email'] = { $regex: guestEmail, $options: 'i' }
    }

    if (checkInDate) {
      filter.checkInDate = { $gte: new Date(checkInDate) }
    }

    if (checkOutDate) {
      filter.checkOutDate = { $lte: new Date(checkOutDate) }
    }

    // Pagination
    const pageNum = parseInt(page, 10)
    const limitNum = parseInt(limit, 10)
    const skip = (pageNum - 1) * limitNum

    // Execute query with room population
    let query = Booking.find(filter)
      .populate('room', 'name type pricePerNight images')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)

    // Filter by room type if specified
    if (roomType) {
      query = query.populate({
        path: 'room',
        match: { type: roomType },
        select: 'name type pricePerNight images'
      })
    }

    const bookings = await query.lean()

    // Filter out bookings where room didn't match the type filter
    const filteredBookings = roomType 
      ? bookings.filter(booking => booking.room)
      : bookings

    // Get total count
    const total = await Booking.countDocuments(filter)

    res.status(200).json({
      success: true,
      count: filteredBookings.length,
      total,
      pagination: {
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      },
      data: filteredBookings
    })
  } catch (error) {
    console.error('Get bookings error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error while fetching bookings'
    })
  }
}

// @desc    Get single booking by ID
// @route   GET /api/bookings/:id
// @access  Private (Admin) or Public (with confirmation number)
const getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('room', 'name type pricePerNight images amenities')

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      })
    }

    res.status(200).json({
      success: true,
      data: booking
    })
  } catch (error) {
    console.error('Get booking error:', error)
    
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      })
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while fetching booking'
    })
  }
}

// @desc    Get booking by confirmation number
// @route   GET /api/bookings/confirmation/:confirmationNumber
// @access  Public
const getBookingByConfirmation = async (req, res) => {
  try {
    const booking = await Booking.findOne({ 
      confirmationNumber: req.params.confirmationNumber 
    }).populate('room', 'name type pricePerNight images amenities')

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found with this confirmation number'
      })
    }

    res.status(200).json({
      success: true,
      data: booking
    })
  } catch (error) {
    console.error('Get booking by confirmation error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error while fetching booking'
    })
  }
}

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Public
const createBooking = async (req, res) => {
  try {
    console.log('createBooking called with body:', JSON.stringify(req.body, null, 2));
    // Check for validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      })
    }

    const {
      room,
      checkInDate,
      checkOutDate,
      numberOfGuests,
      guestInfo,
      paymentInfo,
      specialRequests
    } = req.body

    // Find the room in database
    console.log('Looking for room with ID:', room);
    const roomData = await Room.findById(room);
    
    if (!roomData) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    console.log('Room found:', roomData.name);

    if (!roomData.isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Room is not available'
      })
    }

    // Check if room is available for the requested dates
    const checkIn = new Date(checkInDate)
    const checkOut = new Date(checkOutDate)
    
    if (checkIn >= checkOut) {
      return res.status(400).json({
        success: false,
        message: 'Check-out date must be after check-in date'
      })
    }

    if (checkIn < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Check-in date cannot be in the past'
      })
    }

    // Check for conflicting bookings
    const conflictingBookings = await Booking.find({
      room: room,
      $or: [
        {
          checkInDate: { $lt: checkOut },
          checkOutDate: { $gt: checkIn }
        }
      ],
      bookingStatus: { $in: ['confirmed', 'checked_in'] }
    })

    if (conflictingBookings.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Room is not available for the selected dates'
      })
    }

    // Check occupancy
    const maxOccupancy = roomData.availability?.maxOccupancy || roomData.maxOccupancy || 2;
    if (numberOfGuests > maxOccupancy) {
      return res.status(400).json({
        success: false,
        message: `Room can accommodate maximum ${maxOccupancy} guests`
      })
    }

    // Calculate pricing
    const numberOfNights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24))
    console.log('roomData found:', !!roomData)
    console.log('roomData structure:', JSON.stringify(roomData, null, 2))
    
    // Get price from either pricePerNight or pricing.basePrice
    const pricePerNight = roomData.pricePerNight || roomData.pricing?.basePrice || 100
    console.log('Using pricePerNight:', pricePerNight)
    
    const subtotal = pricePerNight * numberOfNights
    const taxRate = 0.12 // 12% tax
    const serviceFee = 25 // Fixed service fee
    const taxes = subtotal * taxRate
    const totalAmount = subtotal + taxes + serviceFee

    // Generate booking ID
    const bookingId = 'BK' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase()

    // Create booking object
    const bookingData = {
      bookingId,
      room: room,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numberOfGuests,
      numberOfNights,
      guestInfo: {
        firstName: guestInfo.firstName,
        lastName: guestInfo.lastName,
        email: guestInfo.email,
        phone: guestInfo.phone,
        address: {
          street: guestInfo.address?.street || '',
          city: guestInfo.address?.city || '',
          state: guestInfo.address?.state || '',
          zipCode: guestInfo.address?.zipCode || '',
          country: guestInfo.address?.country || ''
        },
        specialRequests: specialRequests || ''
      },
      pricing: {
        pricePerNight: pricePerNight,
        subtotal,
        taxes,
        serviceFee,
        totalAmount,
        currency: 'USD'
      },
      paymentInfo: {
        method: paymentInfo.method || 'credit_card',
        status: 'pending',
        cardLastFour: paymentInfo.cardNumber ? paymentInfo.cardNumber.slice(-4) : ''
      },
      bookingStatus: 'pending',
      source: 'website'
    }

    // Create booking in database
    const booking = new Booking(bookingData);
    await booking.save();
    
    // Populate room data
    await booking.populate('room', 'name type pricePerNight images amenities');

    // Emit real-time event to admin dashboard
    const io = req.app.get('io');
    if (io) {
      io.to('admin-room').emit('new-booking', {
        booking: booking,
        message: 'New booking created',
        timestamp: new Date()
      });
    }

    console.log('Booking created successfully');

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: booking
    })
  } catch (error) {
    console.error('Create booking error:', error)
    
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
      message: 'Server error while creating booking'
    })
  }
}

// @desc    Update booking status
// @route   PUT /api/bookings/:id/status
// @access  Private (Admin)
const updateBookingStatus = async (req, res) => {
  try {
    const { status, notes } = req.body
    
    const validStatuses = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show']
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking status'
      })
    }

    const booking = await Booking.findById(req.params.id)
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      })
    }

    // Update booking status
    booking.bookingStatus = status
    
    if (notes) {
      booking.notes = notes
    }

    // Set check-in/out times
    if (status === 'checked_in' && !booking.checkInTime) {
      booking.checkInTime = new Date()
    }
    
    if (status === 'checked_out' && !booking.checkOutTime) {
      booking.checkOutTime = new Date()
    }

    await booking.save()
    await booking.populate('room', 'name type pricePerNight')

    // Emit real-time event for booking status update
    const io = req.app.get('io')
    if (io) {
      io.to('admin-room').emit('booking-updated', {
        booking: booking,
        message: `Booking ${booking.bookingId} status updated to ${status}`
      })
    }

    res.status(200).json({
      success: true,
      message: 'Booking status updated successfully',
      data: booking
    })
  } catch (error) {
    console.error('Update booking status error:', error)
    
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      })
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while updating booking status'
    })
  }
}

// @desc    Update payment status
// @route   PUT /api/bookings/:id/payment
// @access  Private (Admin) or Payment Gateway
const updatePaymentStatus = async (req, res) => {
  try {
    const { status, transactionId, paymentDate } = req.body
    
    const validStatuses = ['pending', 'processing', 'completed', 'failed', 'refunded']
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status'
      })
    }

    const booking = await Booking.findById(req.params.id)
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      })
    }

    // Update payment info
    booking.paymentInfo.status = status
    
    if (transactionId) {
      booking.paymentInfo.transactionId = transactionId
    }
    
    if (paymentDate) {
      booking.paymentInfo.paymentDate = new Date(paymentDate)
    } else if (status === 'completed') {
      booking.paymentInfo.paymentDate = new Date()
    }

    // Auto-confirm booking if payment is completed
    if (status === 'completed' && booking.bookingStatus === 'pending') {
      booking.bookingStatus = 'confirmed'
    }

    await booking.save()
    await booking.populate('room', 'name type pricePerNight')

    res.status(200).json({
      success: true,
      message: 'Payment status updated successfully',
      data: booking
    })
  } catch (error) {
    console.error('Update payment status error:', error)
    
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      })
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while updating payment status'
    })
  }
}

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Public (with confirmation number) or Private (Admin)
const cancelBooking = async (req, res) => {
  try {
    const { reason, refundAmount } = req.body
    
    const booking = await Booking.findById(req.params.id)
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      })
    }

    if (booking.bookingStatus === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled'
      })
    }

    if (booking.bookingStatus === 'checked_out') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel completed booking'
      })
    }

    // Update booking
    booking.bookingStatus = 'cancelled'
    booking.cancellation = {
      cancelledAt: new Date(),
      reason: reason || 'Cancelled by guest',
      refundAmount: refundAmount || 0,
      refundStatus: refundAmount > 0 ? 'pending' : 'not_applicable'
    }

    await booking.save()
    await booking.populate('room', 'name type pricePerNight')

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: booking
    })
  } catch (error) {
    console.error('Cancel booking error:', error)
    
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      })
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while cancelling booking'
    })
  }
}

// @desc    Get booking statistics
// @route   GET /api/bookings/stats
// @access  Private (Admin)
const getBookingStats = async (req, res) => {
  try {
    const { period = '30' } = req.query
    const days = parseInt(period, 10)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get various statistics
    const [totalBookings, confirmedBookings, cancelledBookings, revenue, upcomingCheckIns] = await Promise.all([
      Booking.countDocuments({ createdAt: { $gte: startDate } }),
      Booking.countDocuments({ 
        createdAt: { $gte: startDate },
        bookingStatus: 'confirmed'
      }),
      Booking.countDocuments({ 
        createdAt: { $gte: startDate },
        bookingStatus: 'cancelled'
      }),
      Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            'paymentInfo.status': 'completed'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$pricing.totalAmount' }
          }
        }
      ]),
      Booking.countDocuments({
        checkInDate: {
          $gte: new Date(),
          $lte: new Date(Date.now() + 24 * 60 * 60 * 1000) // Next 24 hours
        },
        bookingStatus: 'confirmed'
      })
    ])

    const totalRevenue = revenue.length > 0 ? revenue[0].total : 0
    const cancellationRate = totalBookings > 0 ? (cancelledBookings / totalBookings * 100).toFixed(2) : 0

    res.status(200).json({
      success: true,
      data: {
        period: `${days} days`,
        totalBookings,
        confirmedBookings,
        cancelledBookings,
        cancellationRate: parseFloat(cancellationRate),
        totalRevenue,
        upcomingCheckIns
      }
    })
  } catch (error) {
    console.error('Get booking stats error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error while fetching booking statistics'
    })
  }
}

module.exports = {
  getBookings,
  getBooking,
  getBookingByConfirmation,
  createBooking,
  updateBookingStatus,
  updatePaymentStatus,
  cancelBooking,
  getBookingStats
}