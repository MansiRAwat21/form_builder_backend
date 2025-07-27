const { User } = require('../models');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

class UserController {
  // Register a new user
  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }
      
      const { name, email, password } = req.body;
      
      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }
      
      // Create new user
      const user = new User({
        name,
        email,
        password
      });
      
      await user.save();
      
      // Generate JWT token
      const token = jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: user.profile,
          token
        }
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to register user',
        error: error.message
      });
    }
  }
  
  // Login user
  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }
      
      const { email, password } = req.body;
      
      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }
      
      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated'
        });
      }
      
      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }
      
      // Update last login
      await user.updateLastLogin();
      
      // Generate JWT token
      const token = jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );
      
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: user.profile,
          token
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to login',
        error: error.message
      });
    }
  }
  
  // Get current user profile
  async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.json({
        success: true,
        data: user.profile
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch profile',
        error: error.message
      });
    }
  }
  
  // Update user profile
  async updateProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }
      
      const { name, email } = req.body;
      const userId = req.user.id;
      
      // Check if email is already taken by another user
      if (email) {
        const existingUser = await User.findOne({ 
          email: email.toLowerCase(), 
          _id: { $ne: userId } 
        });
        
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'Email is already taken'
          });
        }
      }
      
      // Update user
      const user = await User.findByIdAndUpdate(
        userId,
        { name, email },
        { new: true, runValidators: true }
      );
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: user.profile
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: error.message
      });
    }
  }
  
  // Change password
  async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }
      
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;
      
      // Find user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }
      
      // Update password
      user.password = newPassword;
      await user.save();
      
      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change password',
        error: error.message
      });
    }
  }
  
  // Delete user account
  async deleteAccount(req, res) {
    try {
      const userId = req.user.id;
      
      // Delete user's forms and submissions
      const { Form, Submission } = require('../models');
      
      // Get user's forms
      const userForms = await Form.find({ userId });
      const formIds = userForms.map(form => form._id);
      
      // Delete submissions for user's forms
      if (formIds.length > 0) {
        await Submission.deleteMany({ formId: { $in: formIds } });
      }
      
      // Delete user's forms
      await Form.deleteMany({ userId });
      
      // Delete user account
      await User.findByIdAndDelete(userId);
      
      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      console.error('Delete account error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete account',
        error: error.message
      });
    }
  }
  
  // Get user dashboard statistics
  async getDashboard(req, res) {
    try {
      const userId = req.user.id;
      const { Form, Submission } = require('../models');
      
      // Get user statistics
      const [user, formsStats, submissionsStats] = await Promise.all([
        User.findById(userId),
        Form.aggregate([
          { $match: { userId: mongoose.Types.ObjectId(userId) } },
          {
            $group: {
              _id: null,
              totalForms: { $sum: 1 },
              publishedForms: {
                $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
              },
              draftForms: {
                $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] }
              },
              totalSubmissions: { $sum: '$submissionCount' }
            }
          }
        ]),
        Submission.aggregate([
          {
            $lookup: {
              from: 'forms',
              localField: 'formId',
              foreignField: '_id',
              as: 'form'
            }
          },
          { $unwind: '$form' },
          { $match: { 'form.userId': mongoose.Types.ObjectId(userId) } },
          {
            $group: {
              _id: {
                year: { $year: '$submittedAt' },
                month: { $month: '$submittedAt' },
                day: { $dayOfMonth: '$submittedAt' }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
          { $limit: 30 } // Last 30 days
        ])
      ]);
      
      const stats = formsStats[0] || {
        totalForms: 0,
        publishedForms: 0,
        draftForms: 0,
        totalSubmissions: 0
      };
      
      res.json({
        success: true,
        data: {
          user: user.profile,
          stats,
          submissionTrend: submissionsStats
        }
      });
    } catch (error) {
      console.error('Get dashboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard data',
        error: error.message
      });
    }
  }
}

module.exports = new UserController();