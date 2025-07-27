const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  fieldId: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  }
}, { _id: false });

const submissionSchema = new mongoose.Schema({
  formId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Form',
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  files: [fileSchema],
  submittedAt: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String,
    required: false
  },
  userAgent: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

// Indexes
submissionSchema.index({ formId: 1, submittedAt: -1 });
submissionSchema.index({ submittedAt: -1 });
submissionSchema.index({ formId: 1 });

// Virtual for formatted submission date
submissionSchema.virtual('formattedDate').get(function() {
  return this.submittedAt.toLocaleString();
});

// Methods
submissionSchema.methods.toCSVRow = function(formFields) {
  const row = {};
  
  // Add submission metadata
  row['Submission ID'] = this._id.toString();
  row['Submitted At'] = this.submittedAt.toISOString();
  
  // Add form field data
  formFields.forEach(field => {
    const value = this.data[field.id];
    
    if (field.type === 'checkbox' && Array.isArray(value)) {
      row[field.label] = value.join('; ');
    } else if (field.type === 'file') {
      const fileData = this.files.find(f => f.fieldId === field.id);
      row[field.label] = fileData ? fileData.originalName : '';
    } else {
      row[field.label] = value || '';
    }
  });
  
  return row;
};

// Static methods
submissionSchema.statics.findByForm = function(formId, options = {}) {
  const { page = 1, limit = 10, sortBy = 'submittedAt', sortOrder = 'desc' } = options;
  
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
  
  const skip = (page - 1) * limit;
  
  return this.find({ formId })
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate('formId', 'title fields');
};

submissionSchema.statics.countByForm = function(formId) {
  return this.countDocuments({ formId });
};

submissionSchema.statics.getSubmissionStats = function(formId) {
  return this.aggregate([
    { $match: { formId: mongoose.Types.ObjectId(formId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        firstSubmission: { $min: '$submittedAt' },
        lastSubmission: { $max: '$submittedAt' }
      }
    }
  ]);
};

// Pre-save middleware
submissionSchema.pre('save', function(next) {
  // Sanitize data to prevent XSS
  if (this.data && typeof this.data === 'object') {
    this.data = sanitizeObject(this.data);
  }
  next();
});

// Helper function to sanitize data
function sanitizeObject(obj) {
  const sanitized = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Basic XSS prevention - remove script tags and javascript: protocols
      sanitized[key] = value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '');
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' 
          ? item.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          : item
      );
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

module.exports = mongoose.model('Submission', submissionSchema);