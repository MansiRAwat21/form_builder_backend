const express = require('express');
const formsRouter = require('./forms');
const submissionsRouter = require('./submissions');
const filesRouter = require('./files');
const usersRouter = require('./users');
const publicRouter = require('./public');

const router = express.Router();

// API Routes
router.use('/forms', formsRouter);
router.use('/', submissionsRouter); // submissions routes include /forms/:id/submit
router.use('/', filesRouter); // files routes include /upload and /files
router.use('/users', usersRouter);
router.use('/public', publicRouter);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Form Builder API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Form Builder API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      forms: '/api/forms',
      submissions: '/api/forms/:id/submit',
      files: '/api/upload',
      users: '/api/users',
      public: '/api/public'
    }
  });
});

module.exports = router;