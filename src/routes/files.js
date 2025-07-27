const express = require('express');
const { body, param, query } = require('express-validator');
const { fileController } = require('../controllers');
const auth = require('../middleware/auth');
const upload = require('../middleware/fileUpload');

const router = express.Router();

// Validation rules
const uploadValidation = [
  body('fieldId')
    .notEmpty()
    .withMessage('fieldId is required')
];

const filenameValidation = [
  param('filename')
    .matches(/^[a-zA-Z0-9._-]+$/)
    .withMessage('Invalid filename format')
];

const queryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

// Routes

// POST /api/upload - Upload a file (public endpoint for form submissions)
router.post('/upload', 
  upload.single('file'),
  uploadValidation,
  fileController.uploadFile
);

// GET /api/files/:filename - Serve uploaded files (public endpoint)
router.get('/files/:filename', 
  filenameValidation,
  fileController.serveFile
);

// GET /api/files/:filename/info - Get file information (with optional authentication)
router.get('/files/:filename/info', 
  filenameValidation,
  auth.optional, // Optional authentication
  fileController.getFileInfo
);

// DELETE /api/files/:filename - Delete a file (with optional authentication)
router.delete('/files/:filename', 
  filenameValidation,
  auth.optional, // Optional authentication
  fileController.deleteFile
);

// GET /api/files - List all uploaded files (with optional authentication)
router.get('/files', 
  queryValidation,
  auth.optional, // Optional authentication
  fileController.listFiles
);

// POST /api/files/cleanup - Clean up orphaned files (with optional authentication)
router.post('/files/cleanup', 
  auth.optional, // Optional authentication
  fileController.cleanupFiles
);

module.exports = router;