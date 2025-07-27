const { Form, Submission } = require('../models');
const { validationResult } = require('express-validator');

class FormController {
  // Get all forms for the user
  async getForms(req, res) {
    try {
      const { page = 1, limit = 10, status, search } = req.query;
      const userId = req.user?.id; // Optional for now
      
      const filter = {};
      if (userId) filter.userId = userId;
      if (status) filter.status = status;
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }
      
      const skip = (page - 1) * limit;
      
      const [forms, total] = await Promise.all([
        Form.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Form.countDocuments(filter)
      ]);
      
      res.json({
        success: true,
        data: {
          forms,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get forms error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch forms',
        error: error.message
      });
    }
  }
  
  // Get a specific form by ID
  async getForm(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      const filter = { _id: id };
      if (userId) filter.userId = userId;
      
      const form = await Form.findOne(filter);
      
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form not found'
        });
      }
      
      res.json({
        success: true,
        data: form
      });
    } catch (error) {
      console.error('Get form error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch form',
        error: error.message
      });
    }
  }
  
  // Get a published form for public access
  async getPublicForm(req, res) {
    try {
      const { id } = req.params;
      
      const form = await Form.findOne({ 
        _id: id, 
        status: 'published' 
      }).select('-userId');
      
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form not found or not published'
        });
      }
      
      res.json({
        success: true,
        data: form
      });
    } catch (error) {
      console.error('Get public form error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch form',
        error: error.message
      });
    }
  }
  
  // Create a new form
  async createForm(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }
      
      const formData = {
        ...req.body,
        userId: req.user?.id
      };
      
      const form = new Form(formData);
      await form.save();
      
      // Increment user's forms created count
      if (req.user?.id) {
        await req.user.incrementFormsCreated();
      }
      
      res.status(201).json({
        success: true,
        message: 'Form created successfully',
        data: form
      });
    } catch (error) {
      console.error('Create form error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create form',
        error: error.message
      });
    }
  }
  
  // Update a form
  async updateForm(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }
      
      const { id } = req.params;
      const userId = req.user?.id;
      
      const filter = { _id: id };
      if (userId) filter.userId = userId;
      
      const form = await Form.findOneAndUpdate(
        filter,
        { ...req.body, updatedAt: new Date() },
        { new: true, runValidators: true }
      );
      
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Form updated successfully',
        data: form
      });
    } catch (error) {
      console.error('Update form error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update form',
        error: error.message
      });
    }
  }
  
  // Delete a form
  async deleteForm(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      const filter = { _id: id };
      if (userId) filter.userId = userId;
      
      const form = await Form.findOneAndDelete(filter);
      
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form not found'
        });
      }
      
      // Delete all submissions for this form
      await Submission.deleteMany({ formId: id });
      
      res.json({
        success: true,
        message: 'Form deleted successfully'
      });
    } catch (error) {
      console.error('Delete form error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete form',
        error: error.message
      });
    }
  }
  
  // Publish a form
  async publishForm(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      const filter = { _id: id };
      if (userId) filter.userId = userId;
      
      const form = await Form.findOne(filter);
      
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form not found'
        });
      }
      
      if (form.fields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot publish form without fields'
        });
      }
      
      await form.publish();
      
      res.json({
        success: true,
        message: 'Form published successfully',
        data: form
      });
    } catch (error) {
      console.error('Publish form error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to publish form',
        error: error.message
      });
    }
  }
  
  // Unpublish a form
  async unpublishForm(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      const filter = { _id: id };
      if (userId) filter.userId = userId;
      
      const form = await Form.findOne(filter);
      
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form not found'
        });
      }
      
      await form.unpublish();
      
      res.json({
        success: true,
        message: 'Form unpublished successfully',
        data: form
      });
    } catch (error) {
      console.error('Unpublish form error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to unpublish form',
        error: error.message
      });
    }
  }
  
  // Duplicate a form
  async duplicateForm(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      const filter = { _id: id };
      if (userId) filter.userId = userId;
      
      const originalForm = await Form.findOne(filter);
      
      if (!originalForm) {
        return res.status(404).json({
          success: false,
          message: 'Form not found'
        });
      }
      
      const duplicateData = {
        ...originalForm.toObject(),
        title: `${originalForm.title} (Copy)`,
        status: 'draft',
        submissionCount: 0
      };
      
      delete duplicateData._id;
      delete duplicateData.createdAt;
      delete duplicateData.updatedAt;
      
      const duplicateForm = new Form(duplicateData);
      await duplicateForm.save();
      
      res.status(201).json({
        success: true,
        message: 'Form duplicated successfully',
        data: duplicateForm
      });
    } catch (error) {
      console.error('Duplicate form error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to duplicate form',
        error: error.message
      });
    }
  }
  
  // Get form statistics
  async getFormStats(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      const filter = { _id: id };
      if (userId) filter.userId = userId;
      
      const form = await Form.findOne(filter);
      
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form not found'
        });
      }
      
      const submissionStats = await Submission.getSubmissionStats(id);
      
      res.json({
        success: true,
        data: {
          formId: id,
          title: form.title,
          status: form.status,
          totalSubmissions: form.submissionCount,
          createdAt: form.createdAt,
          stats: submissionStats[0] || {}
        }
      });
    } catch (error) {
      console.error('Get form stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch form statistics',
        error: error.message
      });
    }
  }
}

module.exports = new FormController();