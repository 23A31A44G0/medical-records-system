# Medical Reports Management System

A comprehensive web application for hospital staff to manage patient medical reports with secure file upload capabilities.

## Features

- **Patient Management**: Add, view, and search patients
- **Medical Reports**: Upload and manage PDF, JPG, and TXT files
- **Secure Authentication**: Login system for hospital staff
- **File Management**: Secure file storage with validation
- **Responsive Design**: Works on desktop and mobile devices

## Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Server**
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

3. **Access the Application**
   Open your browser and navigate to: `http://localhost:3000`

## Default Login Credentials

- **Username**: admin
- **Password**: admin123

## File Upload Specifications

- **Supported Formats**: PDF, JPG, JPEG, TXT
- **Maximum File Size**: 10MB
- **Storage**: Files are securely stored in the `uploads` folder

## Database Schema

The application uses SQLite database with the following tables:

### Users Table
- `id`: Primary key
- `username`: Unique username
- `password`: Hashed password
- `full_name`: Staff member's full name
- `role`: User role (admin/staff)
- `created_at`: Account creation timestamp

### Patients Table
- `id`: Primary key
- `patient_id`: Unique patient identifier
- `first_name`: Patient's first name
- `last_name`: Patient's last name
- `date_of_birth`: Patient's date of birth
- `gender`: Patient's gender
- `phone`: Contact phone number
- `email`: Contact email address
- `address`: Patient's address
- `created_at`: Record creation timestamp
- `created_by`: ID of staff member who created the record

### Medical Reports Table
- `id`: Primary key
- `patient_id`: Reference to patient
- `report_title`: Title of the medical report
- `report_description`: Description of the report
- `file_name`: Original filename
- `file_path`: Path to stored file
- `file_type`: MIME type of the file
- `file_size`: File size in bytes
- `uploaded_at`: Upload timestamp
- `uploaded_by`: ID of staff member who uploaded the file

## API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/user` - Get current user information

### Patient Management
- `GET /api/patients` - Get all patients
- `POST /api/patients` - Add new patient
- `GET /api/patients/:id` - Get specific patient details

### Medical Reports
- `POST /api/patients/:id/reports` - Upload medical report
- `GET /api/patients/:id/reports` - Get patient's reports
- `GET /api/reports/:id/download` - Download report file

## Security Features

- Password hashing using bcryptjs
- Session-based authentication
- File type validation
- File size limits
- Secure file storage
- SQL injection prevention

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **File Upload**: Multer
- **Authentication**: bcryptjs, express-session
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Styling**: CSS Grid, Flexbox, Font Awesome icons

## Folder Structure

```
medical-reports-system/
├── public/
│   ├── index.html      # Main HTML file
│   ├── styles.css      # CSS styles
│   └── script.js       # Frontend JavaScript
├── uploads/            # File storage directory
├── server.js           # Main server file
├── package.json        # Project dependencies
├── medical_reports.db  # SQLite database (created automatically)
└── README.md          # This file
```

## Usage Instructions

### For Hospital Staff

1. **Login**: Use your credentials to access the system
2. **Add Patients**: Fill out the patient form with required information
3. **View Patients**: Browse and search through the patient list
4. **Upload Reports**: Select a patient and upload their medical files
5. **Download Reports**: Access and download previously uploaded reports

### Adding New Staff Members

Currently, new staff members need to be added directly to the database. In a production environment, you would typically have an admin interface for user management.

## Development

To add new features or modify the application:

1. **Backend Changes**: Edit `server.js` for API endpoints and database operations
2. **Frontend Changes**: Modify files in the `public/` directory
3. **Database Changes**: Update the database schema in the initialization section of `server.js`

## Production Deployment

Before deploying to production:

1. Change the session secret in `server.js`
2. Set up HTTPS and update session cookie settings
3. Configure proper file storage (consider cloud storage)
4. Set up database backups
5. Implement proper logging
6. Add input validation and sanitization
7. Set up monitoring and error tracking

## Support

For technical support or feature requests, please contact the development team.

## License

This project is licensed under the ISC License.