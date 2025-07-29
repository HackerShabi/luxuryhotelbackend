const express = require('express')
const {
  getContacts,
  getContact,
  createContact,
  updateContactStatus,
  addContactResponse,
  deleteContact,
  getContactStats
} = require('../controllers/contactController')
const { protect, authorize, checkPermission } = require('../middleware/auth')
const {
  validateContact,
  validateObjectId
} = require('../middleware/validation')
const { asyncHandler, handleValidationErrors } = require('../middleware/errorHandler')
const { body, query, param } = require('express-validator')

const router = express.Router()

// Public routes
router.post(
  '/',
  validateContact,
  handleValidationErrors,
  asyncHandler(createContact)
)

// Protected routes - Admin access
router.get(
  '/',
  protect,
  authorize('admin', 'super_admin', 'manager'),
  [
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
      .isIn(['new', 'in_progress', 'resolved', 'closed'])
      .withMessage('Invalid status'),
    query('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Invalid priority'),
    query('inquiryType')
      .optional()
      .isIn(['general', 'booking', 'complaint', 'compliment', 'suggestion', 'support'])
      .withMessage('Invalid inquiry type'),
    query('isRead')
      .optional()
      .isBoolean()
      .withMessage('isRead must be a boolean'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be in ISO format'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be in ISO format'),
    query('sortBy')
      .optional()
      .isIn(['createdAt', 'priority', 'status', 'name'])
      .withMessage('Invalid sort field'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc')
  ],
  handleValidationErrors,
  asyncHandler(getContacts)
)

router.get(
  '/stats',
  protect,
  authorize('admin', 'super_admin', 'manager'),
  checkPermission('view_analytics'),
  asyncHandler(getContactStats)
)

router.get(
  '/:id',
  protect,
  authorize('admin', 'super_admin', 'manager'),
  validateObjectId,
  handleValidationErrors,
  asyncHandler(getContact)
)

router.patch(
  '/:id/status',
  protect,
  authorize('admin', 'super_admin', 'manager'),
  checkPermission('manage_contacts'),
  [
    ...validateObjectId,
    body('status')
      .isIn(['new', 'in_progress', 'resolved', 'closed'])
      .withMessage('Invalid status'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Invalid priority'),
    body('assignedTo')
      .optional()
      .isMongoId()
      .withMessage('Invalid assigned user ID'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    body('tags.*')
      .optional()
      .trim()
      .isLength({ min: 1, max: 30 })
      .withMessage('Each tag must be between 1 and 30 characters'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Notes cannot exceed 1000 characters')
  ],
  handleValidationErrors,
  asyncHandler(updateContactStatus)
)

router.post(
  '/:id/response',
  protect,
  authorize('admin', 'super_admin', 'manager'),
  checkPermission('manage_contacts'),
  [
    ...validateObjectId,
    body('message')
      .trim()
      .isLength({ min: 10, max: 2000 })
      .withMessage('Response message must be between 10 and 2000 characters'),
    body('responseMethod')
      .isIn(['email', 'phone', 'in_person'])
      .withMessage('Invalid response method'),
    body('isPublic')
      .optional()
      .isBoolean()
      .withMessage('isPublic must be a boolean'),
    body('followUpRequired')
      .optional()
      .isBoolean()
      .withMessage('followUpRequired must be a boolean'),
    body('followUpDate')
      .optional()
      .isISO8601()
      .withMessage('Follow-up date must be in ISO format'),
    body('attachments')
      .optional()
      .isArray()
      .withMessage('Attachments must be an array')
  ],
  handleValidationErrors,
  asyncHandler(addContactResponse)
)

router.delete(
  '/:id',
  protect,
  authorize('admin', 'super_admin'),
  checkPermission('delete_contacts'),
  validateObjectId,
  handleValidationErrors,
  asyncHandler(deleteContact)
)

// Bulk operations
router.patch(
  '/bulk/status',
  protect,
  authorize('admin', 'super_admin', 'manager'),
  checkPermission('manage_contacts'),
  [
    body('contactIds')
      .isArray({ min: 1 })
      .withMessage('Contact IDs must be a non-empty array'),
    body('contactIds.*')
      .isMongoId()
      .withMessage('Each contact ID must be valid'),
    body('status')
      .isIn(['new', 'in_progress', 'resolved', 'closed'])
      .withMessage('Invalid status'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters')
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { contactIds, status, notes } = req.body
    const Contact = require('../models/Contact')
    
    const updateData = {
      status,
      updatedAt: new Date()
    }
    
    if (notes) {
      updateData.notes = notes
    }
    
    const result = await Contact.updateMany(
      { _id: { $in: contactIds } },
      updateData
    )
    
    res.json({
      success: true,
      message: `Updated ${result.modifiedCount} contacts`,
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount
      }
    })
  })
)

router.delete(
  '/bulk/delete',
  protect,
  authorize('admin', 'super_admin'),
  checkPermission('delete_contacts'),
  [
    body('contactIds')
      .isArray({ min: 1 })
      .withMessage('Contact IDs must be a non-empty array'),
    body('contactIds.*')
      .isMongoId()
      .withMessage('Each contact ID must be valid')
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { contactIds } = req.body
    const Contact = require('../models/Contact')
    
    const result = await Contact.deleteMany({
      _id: { $in: contactIds }
    })
    
    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} contacts`,
      data: {
        deletedCount: result.deletedCount
      }
    })
  })
)

module.exports = router