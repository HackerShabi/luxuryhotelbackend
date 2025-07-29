const express = require('express')
// Force deployment refresh
const {
  getRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom,
  getFeaturedRooms,
  getRoomAvailability
} = require('../controllers/roomController')
const { protect, authorize, checkPermission } = require('../middleware/auth')
const {
  validateRoom,
  validateRoomQuery,
  validateObjectId,
  handleValidationErrors
} = require('../middleware/validation')
const { asyncHandler } = require('../middleware/errorHandler')

const router = express.Router()

// Public routes
router.get(
  '/',
  validateRoomQuery,
  handleValidationErrors,
  asyncHandler(getRooms)
)

router.get(
  '/featured',
  asyncHandler(getFeaturedRooms)
)

router.get(
  '/:id',
  validateObjectId,
  handleValidationErrors,
  asyncHandler(getRoom)
)

router.get(
  '/:id/availability',
  validateObjectId,
  handleValidationErrors,
  asyncHandler(getRoomAvailability)
)

// Protected routes - Admin only
router.post(
  '/',
  protect,
  authorize('admin', 'super_admin'),
  checkPermission('manage_rooms'),
  validateRoom,
  handleValidationErrors,
  asyncHandler(createRoom)
)

router.put(
  '/:id',
  protect,
  authorize('admin', 'super_admin'),
  checkPermission('manage_rooms'),
  validateObjectId,
  validateRoom,
  handleValidationErrors,
  asyncHandler(updateRoom)
)

router.delete(
  '/:id',
  protect,
  authorize('admin', 'super_admin'),
  checkPermission('manage_rooms'),
  validateObjectId,
  handleValidationErrors,
  asyncHandler(deleteRoom)
)

module.exports = router