# Form Builder Backend

A robust Node.js + Express + MongoDB backend API for the Form Builder application.

## 🚀 Quick Start

### Prerequisites

- Node.js 16.0.0 or higher
- MongoDB 4.4 or higher
- npm or yarn

### Installation

1. **Clone and navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/formbuilder
   JWT_SECRET=your-super-secret-jwt-key
   CORS_ORIGIN=http://localhost:3000
   ENABLE_EMAIL_NOTIFICATIONS=false
   ```

4. **Start the server**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

5. **Verify installation**
   - API: http://localhost:5000/api
   - Health: http://localhost:5000/health

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication
Optional JWT-based authentication. Include token in headers:
```
Authorization: Bearer <your-jwt-token>
```

### Core Endpoints

#### Forms
- `GET /forms` - Get all forms
- `POST /forms` - Create new form
- `GET /forms/:id` - Get specific form
- `PUT /forms/:id` - Update form
- `DELETE /forms/:id` - Delete form
- `POST /forms/:id/publish` - Publish form
- `POST /forms/:id/unpublish` - Unpublish form

#### Public Access
- `GET /public/forms/:id` - Get published form

#### Submissions
- `POST /forms/:id/submit` - Submit form data
- `GET /forms/:id/submissions` - Get form submissions
- `GET /forms/:id/export` - Export submissions as CSV

#### File Upload
- `POST /upload` - Upload file
- `GET /files/:filename` - Serve uploaded file

#### Users (Optional)
- `POST /users/register` - Register user
- `POST /users/login` - Login user
- `GET /users/profile` - Get user profile

### Example Requests

#### Create a Form
```bash
curl -X POST http://localhost:5000/api/forms \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Contact Form",
    "description": "Get in touch with us",
    "fields": [
      {
        "id": "name",
        "type": "text",
        "label": "Full Name",
        "required": true,
        "placeholder": "Enter your name"
      },
      {
        "id": "email",
        "type": "email",
        "label": "Email",
        "required": true,
        "placeholder": "your@email.com"
      }
    ]
  }'
```

#### Submit Form Data
```bash
curl -X POST http://localhost:5000/api/forms/{form-id}/submit \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  }'
```

## 🏗️ Project Structure

```
backend/
├── src/
│   ├── controllers/     # Business logic
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   ├── middleware/     # Custom middleware
│   ├── config/         # Configuration
│   └── utils/          # Utility functions
├── uploads/            # File storage
├── package.json
└── server.js          # Entry point
```

## 🛠️ Development

### Available Scripts

```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm test           # Run tests
npm run test:watch # Run tests in watch mode
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/formbuilder` |
| `JWT_SECRET` | JWT signing secret | Required for auth |
| `CORS_ORIGIN` | Allowed CORS origins | `http://localhost:3000` |
| `MAX_FILE_SIZE` | Max upload size in bytes | `5242880` (5MB) |
| `UPLOAD_DIR` | File upload directory | `./uploads` |
| `ENABLE_EMAIL_NOTIFICATIONS` | Enable email notifications | `false` |

### Database Schema

#### Forms Collection
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  status: "draft" | "published",
  fields: [
    {
      id: String,
      type: "text" | "email" | "textarea" | "select" | "radio" | "checkbox" | "file",
      label: String,
      required: Boolean,
      placeholder: String,
      options: [String]
    }
  ],
  submissionCount: Number,
  createdAt: Date,
  updatedAt: Date
}
```

#### Submissions Collection
```javascript
{
  _id: ObjectId,
  formId: ObjectId,
  data: Object,
  files: [
    {
      fieldId: String,
      originalName: String,
      fileName: String,
      filePath: String,
      fileSize: Number,
      mimeType: String
    }
  ],
  submittedAt: Date,
  ipAddress: String,
  userAgent: String
}
```

## 🔒 Security Features

- **Input Validation**: Express-validator for request validation
- **XSS Protection**: Input sanitization and security headers
- **Rate Limiting**: Configurable rate limits for different endpoints
- **File Upload Security**: Type validation and size limits
- **CORS Configuration**: Configurable cross-origin resource sharing
- **JWT Authentication**: Optional secure user authentication
- **Database-Only Storage**: All data stored in database, no email notifications sent

## 🧪 Testing

Run the test suite:

```bash
npm test
```

### Manual Testing

Test the API using curl, Postman, or any HTTP client:

1. **Health Check**
   ```bash
   curl http://localhost:5000/health
   ```

2. **Create and Submit Form**
   ```bash
   # Create form
   curl -X POST http://localhost:5000/api/forms -H "Content-Type: application/json" -d '{"title":"Test Form","fields":[{"id":"name","type":"text","label":"Name","required":true}]}'
   
   # Submit to form
   curl -X POST http://localhost:5000/api/forms/{form-id}/submit -H "Content-Type: application/json" -d '{"data":{"name":"Test User"}}'
   ```

## 🚀 Deployment

### Production Setup

1. **Environment Configuration**
   ```env
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=mongodb://your-production-db-url
   JWT_SECRET=your-production-secret
   ```

2. **Process Management** (using PM2)
   ```bash
   npm install -g pm2
   pm2 start server.js --name "form-builder-api"
   pm2 startup
   pm2 save
   ```

3. **Reverse Proxy** (Nginx example)
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location /api {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🔧 Integration with Frontend

This backend is designed to work seamlessly with your React form builder frontend:

1. **Update frontend API base URL**
   ```javascript
   const API_BASE_URL = 'http://localhost:5000/api';
   ```

2. **Replace localStorage with API calls**
   ```javascript
   // Instead of localStorage.getItem('forms')
   const response = await fetch(`${API_BASE_URL}/forms`);
   const forms = await response.json();
   ```

3. **Form submission**
   ```javascript
   // Submit form data
   const response = await fetch(`${API_BASE_URL}/forms/${formId}/submit`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ data: formData })
   });
   ```

## 📊 Monitoring

### Health Checks

- **API Health**: `GET /health`
- **Database Status**: Included in health check response
- **Memory Usage**: Included in health check response

### Logging

The application uses Morgan for HTTP request logging and includes:
- Request method, URL, status code, response time
- User agent and IP address
- Structured JSON logging in production

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Verify MongoDB is running
   - Check connection string in `.env`
   - Ensure network connectivity

2. **File Upload Errors**
   - Check upload directory permissions
   - Verify file size limits
   - Check allowed file types

3. **CORS Issues**
   - Update `CORS_ORIGIN` in `.env`
   - Check frontend URL matches allowed origins

### Debug Mode

Enable detailed logging:
```bash
NODE_ENV=development npm run dev
```

## 📝 API Response Format

All API responses follow this format:

```javascript
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* response data */ },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

Error responses:
```javascript
{
  "success": false,
  "message": "Error description",
  "errors": [ /* validation errors */ ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🤝 Contributing

1. Follow existing code style
2. Add tests for new features
3. Update documentation
4. Ensure all tests pass

---

For more detailed documentation, see [BACKEND_STRUCTURE.md](../BACKEND_STRUCTURE.md)