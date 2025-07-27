const express = require('express');
const { body, param, query } = require('express-validator');
const { formController } = require('../controllers');

const router = express.Router();

// Validation rules
const createFormValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be no more than 1000 characters'),
  body('fields')
    .isArray()
    .withMessage('Fields must be an array'),
  body('fields.*.id')
    .notEmpty()
    .withMessage('Field ID is required'),
  body('fields.*.type')
    .isIn(['text', 'email', 'textarea', 'select', 'radio', 'checkbox', 'file'])
    .withMessage('Invalid field type'),
  body('fields.*.label')
    .trim()
    .notEmpty()
    .withMessage('Field label is required'),
  body('fields.*.required')
    .isBoolean()
    .withMessage('Required must be a boolean'),
  body('settings.thankYouMessage')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Thank you message must be no more than 500 characters'),
  body('settings.submissionLimit')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Submission limit must be a non-negative integer')
];

const updateFormValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid form ID'),
  ...createFormValidation
];

const formIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid form ID')
];

const queryValidation = [
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
    .isIn(['draft', 'published'])
    .withMessage('Status must be either draft or published'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters')
];

// Routes

// GET /api/forms - Get all forms (public access)
router.get('/', 
  queryValidation,
  formController.getForms
);

// POST /api/forms - Create a new form (public access)
router.post('/', 
  createFormValidation,
  formController.createForm
);

// GET /api/forms/:id - Get a specific form (with optional authentication)
router.get('/:id', 
  formIdValidation,
  formController.getForm
);

// PUT /api/forms/:id - Update a form (with optional authentication)
router.put('/:id', 
  updateFormValidation,
  formController.updateForm
);

// DELETE /api/forms/:id - Delete a form (with optional authentication)
router.delete('/:id', 
  formIdValidation,
  formController.deleteForm
);

// POST /api/forms/:id/publish - Publish a form (with optional authentication)
router.post('/:id/publish', 
  formIdValidation,
  formController.publishForm
);

// POST /api/forms/:id/unpublish - Unpublish a form (with optional authentication)
router.post('/:id/unpublish', 
  formIdValidation,
  formController.unpublishForm
);

// POST /api/forms/:id/duplicate - Duplicate a form (with optional authentication)
router.post('/:id/duplicate', 
  formIdValidation,
  formController.duplicateForm
);

// GET /api/forms/:id/stats - Get form statistics (with optional authentication)
router.get('/:id/stats', 
  formIdValidation,
  formController.getFormStats
);

module.exports = router;