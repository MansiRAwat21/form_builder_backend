const express = require('express');
const { body, param, query } = require('express-validator');
const { submissionController } = require('../controllers');

const router = express.Router();

// Validation rules
const submitFormValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid form ID'),
  body('data')
    .isObject()
    .withMessage('Data must be an object'),
  body('files')
    .optional()
    .isArray()
    .withMessage('Files must be an array'),
  body('files.*.fieldId')
    .optional()
    .notEmpty()
    .withMessage('File fieldId is required'),
  body('files.*.originalName')
    .optional()
    .notEmpty()
    .withMessage('File originalName is required'),
  body('files.*.fileName')
    .optional()
    .notEmpty()
    .withMessage('File fileName is required'),
  body('files.*.filePath')
    .optional()
    .notEmpty()
    .withMessage('File filePath is required'),
  body('files.*.fileSize')
    .optional()
    .isInt({ min: 0 })
    .withMessage('File size must be a non-negative integer'),
  body('files.*.mimeType')
    .optional()
    .notEmpty()
    .withMessage('File mimeType is required')
];

const formIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid form ID')
];

const submissionIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid submission ID')
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
  query('sortBy')
    .optional()
    .isIn(['submittedAt', 'createdAt'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters')
];

// Routes

// POST /api/forms/:id/submit - Submit form data (public endpoint)
router.post('/forms/:id/submit', 
  submitFormValidation,
  submissionController.submitForm
);

// GET /api/forms/:id/submissions - Get form submissions (with optional authentication)
router.get('/forms/:id/submissions', 
  formIdValidation,
  queryValidation,
  submissionController.getSubmissions
);

// GET /api/submissions/:id - Get a specific submission (with optional authentication)
router.get('/submissions/:id', 
  submissionIdValidation,
  submissionController.getSubmission
);

// DELETE /api/submissions/:id - Delete a submission (with optional authentication)
router.delete('/submissions/:id', 
  submissionIdValidation,
  submissionController.deleteSubmission
);

// GET /api/forms/:id/export - Export form submissions as CSV (with optional authentication)
router.get('/forms/:id/export', 
  formIdValidation,
  submissionController.exportSubmissions
);

// GET /api/forms/:id/submissions/stats - Get submission statistics (with optional authentication)
router.get('/forms/:id/submissions/stats', 
  formIdValidation,
  submissionController.getSubmissionStats
);

module.exports = router;