const mongoose = require('mongoose');

const fieldSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['text', 'email', 'textarea', 'select', 'radio', 'checkbox', 'file']
  },
  label: {
    type: String,
    required: true
  },
  required: {
    type: Boolean,
    default: false
  },
  placeholder: {
    type: String,
    default: ''
  },
  options: [{
    type: String
  }],
  validation: {
    minLength: Number,
    maxLength: Number,
    pattern: String
  }
}, { _id: false });

const formSettingsSchema = new mongoose.Schema({
  thankYouMessage: {
    type: String,
    default: 'Thank you for your submission!'
  },
  submissionLimit: {
    type: Number,
    default: 0 // 0 means no limit
  },
  allowAnonymous: {
    type: Boolean,
    default: true
  },
  notificationEmail: {
    type: String
    // Note: Email stored but not used - notifications disabled
  }
}, { _id: false });

const formSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Optional for now
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  fields: [fieldSchema],
  settings: {
    type: formSettingsSchema,
    default: () => ({})
  },
  submissionCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
formSchema.index({ userId: 1, status: 1 });
formSchema.index({ status: 1 });
formSchema.index({ createdAt: -1 });

// Virtual for public URL
formSchema.virtual('publicUrl').get(function() {
  return `/form/${this._id}`;
});

// Methods
formSchema.methods.publish = function() {
  this.status = 'published';
  return this.save();
};

formSchema.methods.unpublish = function() {
  this.status = 'draft';
  return this.save();
};

formSchema.methods.incrementSubmissions = function() {
  this.submissionCount += 1;
  return this.save();
};

// Static methods
formSchema.statics.findPublished = function() {
  return this.find({ status: 'published' });
};

formSchema.statics.findByUser = function(userId) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

// Pre-save middleware
formSchema.pre('save', function(next) {
  // Ensure field IDs are unique within the form
  const fieldIds = this.fields.map(field => field.id);
  const uniqueIds = [...new Set(fieldIds)];
  
  if (fieldIds.length !== uniqueIds.length) {
    return next(new Error('Field IDs must be unique within a form'));
  }
  
  next();
});

module.exports = mongoose.model('Form', formSchema);