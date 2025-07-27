const express = require('express');
const { body } = require('express-validator');
const { userController } = require('../controllers');
const auth = require('../middleware/auth');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    })
];

// Routes

// POST /api/users/register - Register a new user
router.post('/register', 
  registerValidation,
  userController.register
);

// POST /api/users/login - Login user
router.post('/login', 
  loginValidation,
  userController.login
);

// GET /api/users/profile - Get current user profile (requires authentication)
router.get('/profile', 
  auth.required,
  userController.getProfile
);

// PUT /api/users/profile - Update user profile (requires authentication)
router.put('/profile', 
  updateProfileValidation,
  auth.required,
  userController.updateProfile
);

// POST /api/users/change-password - Change password (requires authentication)
router.post('/change-password', 
  changePasswordValidation,
  auth.required,
  userController.changePassword
);

// DELETE /api/users/account - Delete user account (requires authentication)
router.delete('/account', 
  auth.required,
  userController.deleteAccount
);

// GET /api/users/dashboard - Get user dashboard statistics (requires authentication)
router.get('/dashboard', 
  auth.required,
  userController.getDashboard
);

module.exports = router;