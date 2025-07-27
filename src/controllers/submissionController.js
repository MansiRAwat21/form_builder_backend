const { Form, Submission } = require('../models');
const { validationResult } = require('express-validator');
const { parse } = require('json2csv');
const mongoose = require('mongoose');

class SubmissionController {
  // Submit form data
  async submitForm(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }
      
      const { id: formId } = req.params;
      const { data, files = [] } = req.body;
      
      // Check if form exists and is published
      const form = await Form.findOne({ 
        _id: formId, 
        status: 'published' 
      });
      
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form not found or not published'
        });
      }
      
      // Check submission limit
      if (form.settings.submissionLimit > 0 && 
          form.submissionCount >= form.settings.submissionLimit) {
        return res.status(400).json({
          success: false,
          message: 'Submission limit reached for this form'
        });
      }
      
      // Validate required fields
      const missingFields = [];
      form.fields.forEach(field => {
        if (field.required && (!data[field.id] || data[field.id] === '')) {
          missingFields.push(field.label);
        }
      });
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Required fields are missing',
          missingFields
        });
      }
      
      // Validate field data types and constraints
      const validationErrors = [];
      form.fields.forEach(field => {
        const value = data[field.id];
        if (!value && value !== 0) return; // Skip empty optional fields
        
        switch (field.type) {
          case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
              validationErrors.push(`${field.label} must be a valid email address`);
            }
            break;
            
          case 'select':
          case 'radio':
            if (field.options && !field.options.includes(value)) {
              validationErrors.push(`${field.label} contains an invalid option`);
            }
            break;
            
          case 'checkbox':
            if (Array.isArray(value)) {
              const invalidOptions = value.filter(v => !field.options.includes(v));
              if (invalidOptions.length > 0) {
                validationErrors.push(`${field.label} contains invalid options: ${invalidOptions.join(', ')}`);
              }
            }
            break;
        }
        
        // Check field validation rules
        if (field.validation) {
          const { minLength, maxLength, pattern } = field.validation;
          
          if (typeof value === 'string') {
            if (minLength && value.length < minLength) {
              validationErrors.push(`${field.label} must be at least ${minLength} characters long`);
            }
            if (maxLength && value.length > maxLength) {
              validationErrors.push(`${field.label} must be no more than ${maxLength} characters long`);
            }
            if (pattern && !new RegExp(pattern).test(value)) {
              validationErrors.push(`${field.label} format is invalid`);
            }
          }
        }
      });
      
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          validationErrors
        });
      }
      
      // Create submission
      const submission = new Submission({
        formId,
        data,
        files,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      });
      
      await submission.save();
      
      // Increment form submission count
      await form.incrementSubmissions();
      
      // Note: Email notifications are disabled - data is stored in database only
      console.log(`📝 Form submission received for form: ${form.title} (ID: ${formId})`);
      
      res.status(201).json({
        success: true,
        message: 'Form submitted successfully',
        data: {
          submissionId: submission._id,
          submittedAt: submission.submittedAt,
          thankYouMessage: form.settings.thankYouMessage
        }
      });
    } catch (error) {
      console.error('Submit form error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit form',
        error: error.message
      });
    }
  }
  
  // Get form submissions
  async getSubmissions(req, res) {
    try {
      const { id: formId } = req.params;
      const { 
        page = 1, 
        limit = 10, 
        sortBy = 'submittedAt', 
        sortOrder = 'desc',
        search
      } = req.query;
      
      const userId = req.user?.id;
      
      // Check if user owns the form
      const filter = { _id: formId };
      if (userId) filter.userId = userId;
      
      const form = await Form.findOne(filter);
      
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form not found'
        });
      }
      
      // Build submission filter
      const submissionFilter = { formId };
      
      if (search) {
        // Search in submission data
        submissionFilter.$or = [
          { 'data': { $regex: search, $options: 'i' } }
        ];
      }
      
      const skip = (page - 1) * limit;
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      const [submissions, total] = await Promise.all([
        Submission.find(submissionFilter)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Submission.countDocuments(submissionFilter)
      ]);
      
      res.json({
        success: true,
        data: {
          form: {
            id: form._id,
            title: form.title,
            fields: form.fields
          },
          submissions,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get submissions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch submissions',
        error: error.message
      });
    }
  }
  
  // Get a specific submission
  async getSubmission(req, res) {
    try {
      const { id } = req.params;
      
      const submission = await Submission.findById(id)
        .populate('formId', 'title fields userId');
      
      if (!submission) {
        return res.status(404).json({
          success: false,
          message: 'Submission not found'
        });
      }
      
      // Check if user owns the form (if authentication is enabled)
      const userId = req.user?.id;
      if (userId && submission.formId.userId && 
          submission.formId.userId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
      
      res.json({
        success: true,
        data: submission
      });
    } catch (error) {
      console.error('Get submission error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch submission',
        error: error.message
      });
    }
  }
  
  // Delete a submission
  async deleteSubmission(req, res) {
    try {
      const { id } = req.params;
      
      const submission = await Submission.findById(id)
        .populate('formId', 'userId');
      
      if (!submission) {
        return res.status(404).json({
          success: false,
          message: 'Submission not found'
        });
      }
      
      // Check if user owns the form
      const userId = req.user?.id;
      if (userId && submission.formId.userId && 
          submission.formId.userId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
      
      await Submission.findByIdAndDelete(id);
      
      // Decrement form submission count
      await Form.findByIdAndUpdate(
        submission.formId._id,
        { $inc: { submissionCount: -1 } }
      );
      
      res.json({
        success: true,
        message: 'Submission deleted successfully'
      });
    } catch (error) {
      console.error('Delete submission error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete submission',
        error: error.message
      });
    }
  }
  
  // Export submissions as CSV
  async exportSubmissions(req, res) {
    try {
      const { id: formId } = req.params;
      const userId = req.user?.id;
      
      // Check if user owns the form
      const filter = { _id: formId };
      if (userId) filter.userId = userId;
      
      const form = await Form.findOne(filter);
      
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form not found'
        });
      }
      
      // Get all submissions
      const submissions = await Submission.find({ formId })
        .sort({ submittedAt: -1 })
        .lean();
      
      if (submissions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No submissions to export'
        });
      }
      
      // Prepare CSV data
      const csvData = submissions.map(submission => {
        const row = {
          'Submission ID': submission._id.toString(),
          'Submitted At': submission.submittedAt.toISOString()
        };
        
        // Add form field data
        form.fields.forEach(field => {
          const value = submission.data[field.id];
          
          if (field.type === 'checkbox' && Array.isArray(value)) {
            row[field.label] = value.join('; ');
          } else if (field.type === 'file') {
            const fileData = submission.files.find(f => f.fieldId === field.id);
            row[field.label] = fileData ? fileData.originalName : '';
          } else {
            row[field.label] = value || '';
          }
        });
        
        return row;
      });
      
      // Generate CSV
      const csv = parse(csvData);
      
      // Set response headers for file download
      const fileName = `${form.title.replace(/[^a-zA-Z0-9]/g, '_')}_submissions.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      res.send(csv);
    } catch (error) {
      console.error('Export submissions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export submissions',
        error: error.message
      });
    }
  }
  
  // Get submission statistics
  async getSubmissionStats(req, res) {
    try {
      const { id: formId } = req.params;
      const userId = req.user?.id;
      
      // Check if user owns the form
      const filter = { _id: formId };
      if (userId) filter.userId = userId;
      
      const form = await Form.findOne(filter);
      
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form not found'
        });
      }
      
      const stats = await Submission.aggregate([
        { $match: { formId: mongoose.Types.ObjectId(formId) } },
        {
          $group: {
            _id: null,
            totalSubmissions: { $sum: 1 },
            firstSubmission: { $min: '$submittedAt' },
            lastSubmission: { $max: '$submittedAt' },
            averagePerDay: {
              $avg: {
                $divide: [
                  { $subtract: ['$submittedAt', '$firstSubmission'] },
                  86400000 // milliseconds in a day
                ]
              }
            }
          }
        },
        {
          $project: {
            _id: 0,
            totalSubmissions: 1,
            firstSubmission: 1,
            lastSubmission: 1,
            averagePerDay: { $round: ['$averagePerDay', 2] }
          }
        }
      ]);
      
      res.json({
        success: true,
        data: {
          formId,
          formTitle: form.title,
          stats: stats[0] || {
            totalSubmissions: 0,
            firstSubmission: null,
            lastSubmission: null,
            averagePerDay: 0
          }
        }
      });
    } catch (error) {
      console.error('Get submission stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch submission statistics',
        error: error.message
      });
    }
  }
}

module.exports = new SubmissionController();