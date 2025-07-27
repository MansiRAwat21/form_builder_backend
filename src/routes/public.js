const express = require('express');
const { param } = require('express-validator');
const { formController } = require('../controllers');

const router = express.Router();

// Validation rules
const formIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid form ID')
];

// Routes

// GET /api/public/forms/:id - Get a published form for public access
router.get('/forms/:id', 
  formIdValidation,
  formController.getPublicForm
);

module.exports = router;