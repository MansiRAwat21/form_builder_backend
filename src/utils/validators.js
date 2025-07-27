const { body, param, query } = require('express-validator');
const { FIELD_TYPES, FORM_STATUS, USER_ROLES } = require('../config/constants');

// Common validation rules
const mongoIdValidation = (field = 'id') => [
  param(field)
    .isMongoId()
    .withMessage(`Invalid ${field} format`)
];

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

const searchValidation = [
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters')
];

// Form validation rules
const formFieldValidation = [
  body('fields.*.id')
    .notEmpty()
    .withMessage('Field ID is required')
    .matches(/^[a-zA-Z][a-zA-Z0-9_]*$/)
    .withMessage('Field ID must start with a letter and contain only letters, numbers, and underscores'),
  body('fields.*.type')
    .isIn(Object.values(FIELD_TYPES))
    .withMessage(`Field type must be one of: ${Object.values(FIELD_TYPES).join(', ')}`),
  body('fields.*.label')
    .trim()
    .notEmpty()
    .withMessage('Field label is required')
    .isLength({ max: 100 })
    .withMessage('Field label must be no more than 100 characters'),
  body('fields.*.required')
    .isBoolean()
    .withMessage('Required must be a boolean'),
  body('fields.*.placeholder')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Placeholder must be no more than 200 characters'),
  body('fields.*.options')
    .optional()
    .isArray()
    .withMessage('Options must be an array'),
  body('fields.*.options.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Each option must be between 1 and 100 characters')
];

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
  ...formFieldValidation,
  body('settings.thankYouMessage')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Thank you message must be no more than 500 characters'),
  body('settings.submissionLimit')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Submission limit must be a non-negative integer'),
  body('settings.allowAnonymous')
    .optional()
    .isBoolean()
    .withMessage('Allow anonymous must be a boolean'),
  body('settings.notificationEmail')
    .optional()
    .isEmail()
    .withMessage('Notification email must be a valid email address')
];

const updateFormValidation = [
  ...mongoIdValidation(),
  ...createFormValidation
];

// Submission validation rules
const submitFormValidation = [
  ...mongoIdValidation(),
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

// User validation rules
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
    .isLength({ max: 255 })
    .withMessage('Email must be no more than 255 characters'),
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('role')
    .optional()
    .isIn(Object.values(USER_ROLES))
    .withMessage(`Role must be one of: ${Object.values(USER_ROLES).join(', ')}`)
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
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
    .isLength({ max: 255 })
    .withMessage('Email must be no more than 255 characters')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6, max: 128 })
    .withMessage('New password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    })
];

// File validation rules
const fileUploadValidation = [
  body('fieldId')
    .notEmpty()
    .withMessage('fieldId is required')
    .matches(/^[a-zA-Z][a-zA-Z0-9_]*$/)
    .withMessage('fieldId must be a valid field identifier')
];

// Custom validation functions
const validateFieldData = (formFields, submissionData) => {
  const errors = [];
  
  formFields.forEach(field => {
    const value = submissionData[field.id];
    
    // Check required fields
    if (field.required && (!value || value === '')) {
      errors.push({
        field: field.id,
        message: `${field.label} is required`
      });
      return;
    }
    
    // Skip validation for empty optional fields
    if (!value && value !== 0) return;
    
    // Type-specific validation
    switch (field.type) {
      case FIELD_TYPES.EMAIL:
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors.push({
            field: field.id,
            message: `${field.label} must be a valid email address`
          });
        }
        break;
        
      case FIELD_TYPES.SELECT:
      case FIELD_TYPES.RADIO:
        if (field.options && !field.options.includes(value)) {
          errors.push({
            field: field.id,
            message: `${field.label} contains an invalid option`
          });
        }
        break;
        
      case FIELD_TYPES.CHECKBOX:
        if (Array.isArray(value)) {
          const invalidOptions = value.filter(v => !field.options.includes(v));
          if (invalidOptions.length > 0) {
            errors.push({
              field: field.id,
              message: `${field.label} contains invalid options: ${invalidOptions.join(', ')}`
            });
          }
        }
        break;
    }
    
    // Check field validation rules
    if (field.validation) {
      const { minLength, maxLength, pattern } = field.validation;
      
      if (typeof value === 'string') {
        if (minLength && value.length < minLength) {
          errors.push({
            field: field.id,
            message: `${field.label} must be at least ${minLength} characters long`
          });
        }
        if (maxLength && value.length > maxLength) {
          errors.push({
            field: field.id,
            message: `${field.label} must be no more than ${maxLength} characters long`
          });
        }
        if (pattern && !new RegExp(pattern).test(value)) {
          errors.push({
            field: field.id,
            message: `${field.label} format is invalid`
          });
        }
      }
    }
  });
  
  return errors;
};

const validateFormStatus = (status) => {
  return Object.values(FORM_STATUS).includes(status);
};

const validateUserRole = (role) => {
  return Object.values(USER_ROLES).includes(role);
};

const validateFieldType = (type) => {
  return Object.values(FIELD_TYPES).includes(type);
};

// Sanitization helpers
const sanitizeHtml = (text) => {
  if (typeof text !== 'string') return text;
  
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
};

const sanitizeFilename = (filename) => {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
};

module.exports = {
  // Validation rules
  mongoIdValidation,
  paginationValidation,
  searchValidation,
  createFormValidation,
  updateFormValidation,
  submitFormValidation,
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
  fileUploadValidation,
  
  // Custom validation functions
  validateFieldData,
  validateFormStatus,
  validateUserRole,
  validateFieldType,
  
  // Sanitization helpers
  sanitizeHtml,
  sanitizeFilename
};