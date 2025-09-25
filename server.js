const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const fs = require('fs-extra');
const cors = require('cors');
const MedicalAI = require('./medical-ai');
const MySQLManager = require('./mysql-manager');

const app = express();
const PORT = process.env.PORT || 3000;

// Production environment detection
const isProduction = process.env.NODE_ENV === 'production';
console.log(`🚀 Running in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);

// Initialize AI processor and MySQL
const medicalAI = new MedicalAI();
const mysqlManager = new MySQLManager();
console.log('Medical AI initialized');

// Initialize MySQL database
mysqlManager.initializeDatabase().catch(err => {
    console.error('⚠️ MySQL initialization failed:', err.message);
    console.log('💡 Make sure MySQL is running on localhost:3306');
    console.log('💡 Update database credentials in mysql-manager.js if needed');
});

// Middleware
app.use(cors({
    origin: isProduction 
        ? [process.env.FRONTEND_URL, process.env.DOMAIN_URL] 
        : true,
    credentials: true // Enable credentials for cross-origin requests
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'medical-reports-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: isProduction, // Use secure cookies in production (HTTPS)
        httpOnly: false, // Allow JavaScript access for debugging
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: isProduction ? 'strict' : 'lax', // Stricter in production
        path: '/', // Ensure cookie is sent for all paths
        domain: isProduction ? process.env.DOMAIN : undefined
    },
    name: 'connect.sid', // Standard session cookie name
    rolling: false // Don't reset expiry on each request
}));

// Clear conflicting cookies middleware
app.use((req, res, next) => {
    // Clear old medical-session cookie if present
    if (req.headers.cookie && req.headers.cookie.includes('medical-session=')) {
        res.clearCookie('medical-session', { path: '/', domain: undefined });
        console.log('🧹 Cleared old medical-session cookie');
    }
    next();
});

// Add explicit cookie debugging middleware
app.use((req, res, next) => {
    // Log incoming cookies
    if (req.headers.cookie) {
        console.log('🍪 Incoming cookies:', req.headers.cookie);
    }
    
    // Intercept response to log outgoing cookies
    const originalSetHeader = res.setHeader;
    res.setHeader = function(name, value) {
        if (name.toLowerCase() === 'set-cookie') {
            console.log('🍪 Setting cookie:', value);
        }
        return originalSetHeader.call(this, name, value);
    };
    
    next();
});

// Database initialization
const db = new sqlite3.Database('./medical_reports.db');

// Create tables
db.serialize(() => {
    // Users table (hospital staff)
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT DEFAULT 'staff',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Patients table
    db.run(`CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id TEXT UNIQUE NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        date_of_birth DATE,
        gender TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        disease_diagnosis TEXT,
        city TEXT,
        state TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER,
        FOREIGN KEY (created_by) REFERENCES users (id)
    )`);

    // Add columns to existing patients table if they don't exist
    db.run(`ALTER TABLE patients ADD COLUMN disease_diagnosis TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.log('Error adding disease_diagnosis column:', err.message);
        }
    });
    
    db.run(`ALTER TABLE patients ADD COLUMN city TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.log('Error adding city column:', err.message);
        }
    });
    
    db.run(`ALTER TABLE patients ADD COLUMN state TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.log('Error adding state column:', err.message);
        }
    });

    // Medical reports table
    db.run(`CREATE TABLE IF NOT EXISTS medical_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        report_title TEXT NOT NULL,
        report_description TEXT,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        uploaded_by INTEGER,
        FOREIGN KEY (patient_id) REFERENCES patients (id),
        FOREIGN KEY (uploaded_by) REFERENCES users (id)
    )`);

    // Create default admin user
    const defaultPassword = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO users (username, password, full_name, role) 
            VALUES ('admin', ?, 'Administrator', 'admin')`, [defaultPassword]);
    
    // Create AI-enhanced tables for medical data
    createAIEnhancedTables();
});

// Create AI-enhanced database tables for extracted medical data
function createAIEnhancedTables() {
    // Add AI columns to patients table if they don't exist
    db.run(`ALTER TABLE patients ADD COLUMN ai_confidence INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.log('Note: ai_confidence column already exists or could not be added');
        }
    });
    
    db.run(`ALTER TABLE patients ADD COLUMN ai_extracted BOOLEAN DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.log('Note: ai_extracted column already exists or could not be added');
        }
    });
    
    db.run(`ALTER TABLE patients ADD COLUMN disease_category TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.log('Note: disease_category column already exists or could not be added');
        }
    });
    
    // Medical records table for AI-extracted medical data
    db.run(`CREATE TABLE IF NOT EXISTS medical_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER,
        report_id INTEGER,
        diagnosis TEXT,
        symptoms TEXT, -- JSON array
        disease_category TEXT,
        allergies TEXT,
        visit_date DATE,
        appointment_date DATE,
        ai_confidence INTEGER DEFAULT 0,
        extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients (id),
        FOREIGN KEY (report_id) REFERENCES medical_reports (id)
    )`);
    
    // Vital signs table
    db.run(`CREATE TABLE IF NOT EXISTS vital_signs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER,
        medical_record_id INTEGER,
        blood_pressure TEXT,
        temperature REAL,
        pulse INTEGER,
        respiratory_rate INTEGER,
        oxygen_saturation INTEGER,
        weight REAL,
        height REAL,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ai_extracted BOOLEAN DEFAULT 0,
        FOREIGN KEY (patient_id) REFERENCES patients (id),
        FOREIGN KEY (medical_record_id) REFERENCES medical_records (id)
    )`);
    
    // Medications table
    db.run(`CREATE TABLE IF NOT EXISTS medications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER,
        medical_record_id INTEGER,
        medication_name TEXT NOT NULL,
        dosage TEXT,
        frequency TEXT,
        start_date DATE,
        end_date DATE,
        ai_extracted BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients (id),
        FOREIGN KEY (medical_record_id) REFERENCES medical_records (id)
    )`);
    
    // Lab results table
    db.run(`CREATE TABLE IF NOT EXISTS lab_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER,
        medical_record_id INTEGER,
        test_name TEXT NOT NULL,
        test_value REAL,
        test_unit TEXT,
        reference_range TEXT,
        test_date DATE,
        ai_extracted BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients (id),
        FOREIGN KEY (medical_record_id) REFERENCES medical_records (id)
    )`);
    
    // AI processing log table
    db.run(`CREATE TABLE IF NOT EXISTS ai_processing_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_id INTEGER,
        file_name TEXT,
        processing_status TEXT, -- 'processing', 'completed', 'failed'
        extracted_text TEXT,
        confidence_score INTEGER,
        processing_time REAL, -- in seconds
        error_message TEXT,
        processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (report_id) REFERENCES medical_reports (id)
    )`);
}

// Ensure uploads directory exists
fs.ensureDirSync('./uploads');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.txt'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExtension)) {
        cb(null, true);
    } else {
        cb(new Error('Only PDF, JPG, and TXT files are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Authentication middleware
const requireAuth = (req, res, next) => {
    console.log('🔐 Auth check:', {
        sessionId: req.sessionID,
        userId: req.session.userId,
        username: req.session.username,
        hasSession: !!req.session,
        cookies: req.headers.cookie,
        cookieKeys: req.headers.cookie ? Object.keys(req.headers.cookie) : 'none',
        sessionKeys: Object.keys(req.session || {})
    });
    
    if (req.session.userId) {
        console.log('✅ Authentication successful');
        next();
    } else {
        console.log('❌ Authentication failed - no userId in session');
        res.status(401).json({ error: 'Authentication required' });
    }
};

// Routes

// Debug session endpoint
app.get('/api/debug/session', (req, res) => {
    res.json({
        sessionId: req.sessionID,
        userId: req.session.userId,
        username: req.session.username,
        hasSession: !!req.session,
        cookies: req.headers.cookie,
        sessionData: req.session
    });
});

// Simple session test endpoint
app.post('/api/test-session', (req, res) => {
    const testData = { testKey: 'testValue', timestamp: Date.now() };
    req.session.testData = testData;
    
    req.session.save((err) => {
        if (err) {
            console.error('❌ Test session save error:', err);
            return res.status(500).json({ error: 'Session save failed', details: err.message });
        }
        
        console.log('✅ Test session saved:', {
            sessionId: req.sessionID,
            testData: testData,
            sessionKeys: Object.keys(req.session)
        });
        
        res.json({ 
            success: true, 
            sessionId: req.sessionID,
            testData: testData,
            message: 'Test session data saved successfully'
        });
    });
});

// Test session retrieval
app.get('/api/test-session', (req, res) => {
    console.log('🔍 Testing session retrieval:', {
        sessionId: req.sessionID,
        testData: req.session.testData,
        sessionKeys: Object.keys(req.session || {})
    });
    
    res.json({
        sessionId: req.sessionID,
        testData: req.session.testData,
        hasTestData: !!req.session.testData,
        sessionKeys: Object.keys(req.session || {})
    });
});

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    console.log('🔐 Login attempt:', { username, hasPassword: !!password, sessionId: req.sessionID });
    
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            console.error('❌ Database error during login:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!user) {
            console.log('❌ User not found:', username);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        if (!bcrypt.compareSync(password, user.password)) {
            console.log('❌ Invalid password for user:', username);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        console.log('✅ Password valid, setting session data...');
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role;
        
        // Force session save and ensure proper response
        req.session.save((err) => {
            if (err) {
                console.error('❌ Session save error:', err);
                return res.status(500).json({ error: 'Session save failed' });
            }
            
            console.log('✅ Login successful:', {
                sessionId: req.sessionID,
                userId: user.id,
                username: user.username,
                sessionSaved: true,
                sessionKeys: Object.keys(req.session)
            });
            
            res.json({ 
                message: 'Login successful', 
                user: { 
                    id: user.id, 
                    username: user.username, 
                    full_name: user.full_name, 
                    role: user.role 
                } 
            });
        });
    });
});

// Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logout successful' });
});

// Get current user
app.get('/api/user', requireAuth, (req, res) => {
    db.get('SELECT id, username, full_name, role FROM users WHERE id = ?', [req.session.userId], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(user);
    });
});

// Add new patient
app.post('/api/patients', requireAuth, (req, res) => {
    const { patient_id, first_name, last_name, date_of_birth, gender, phone, email, address, disease_diagnosis, city, state } = req.body;
    
    db.run(`INSERT INTO patients (patient_id, first_name, last_name, date_of_birth, gender, phone, email, address, disease_diagnosis, city, state, created_by) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [patient_id, first_name, last_name, date_of_birth, gender, phone, email, address, disease_diagnosis, city, state, req.session.userId],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to add patient' });
            }
            res.json({ message: 'Patient added successfully', patient_id: this.lastID });
        }
    );
});

// Get all patients
app.get('/api/patients', requireAuth, (req, res) => {
    db.all('SELECT * FROM patients ORDER BY created_at DESC', (err, patients) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(patients);
    });
});

// Get patient by ID
app.get('/api/patients/:id', requireAuth, (req, res) => {
    db.get('SELECT * FROM patients WHERE id = ?', [req.params.id], (err, patient) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!patient) {
            return res.status(404).json({ error: 'Patient not found' });
        }
        res.json(patient);
    });
});

// Update patient
app.put('/api/patients/:id', requireAuth, (req, res) => {
    const { patient_id, first_name, last_name, date_of_birth, gender, phone, email, address, disease_diagnosis, city, state } = req.body;
    
    db.run(`UPDATE patients SET 
                patient_id = ?, first_name = ?, last_name = ?, date_of_birth = ?, 
                gender = ?, phone = ?, email = ?, address = ?, 
                disease_diagnosis = ?, city = ?, state = ?
            WHERE id = ?`,
        [patient_id, first_name, last_name, date_of_birth, gender, phone, email, address, disease_diagnosis, city, state, req.params.id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to update patient' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Patient not found' });
            }
            res.json({ message: 'Patient updated successfully' });
        }
    );
});

// Delete patient
app.delete('/api/patients/:id', requireAuth, (req, res) => {
    db.run('DELETE FROM patients WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete patient' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Patient not found' });
        }
        res.json({ message: 'Patient deleted successfully' });
    });
});

// Upload medical report with AI processing
app.post('/api/patients/:id/reports', requireAuth, upload.single('medical_file'), async (req, res) => {
    const patientId = req.params.id;
    const { report_title, report_description } = req.body;
    
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { filename, originalname, mimetype, size, path: filePath } = req.file;
    
    // Insert report into database first
    db.run(`INSERT INTO medical_reports (patient_id, report_title, report_description, file_name, file_path, file_type, file_size, uploaded_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [patientId, report_title, report_description, originalname, filePath, mimetype, size, req.session.userId],
        async function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to save report' });
            }
            
            const reportId = this.lastID;
            
            // Process document with AI in background
            processDocumentWithAI(reportId, filePath, originalname, patientId);
            
            res.json({ 
                message: 'Report uploaded successfully - AI processing started', 
                report_id: reportId,
                ai_processing: true
            });
        }
    );
});

// AI Document Processing Function
async function processDocumentWithAI(reportId, filePath, fileName, patientId) {
    const startTime = Date.now();
    
    try {
        // Log processing start
        db.run(`INSERT INTO ai_processing_log (report_id, file_name, processing_status, processed_at)
                VALUES (?, ?, 'processing', CURRENT_TIMESTAMP)`, [reportId, fileName]);
        
        console.log(`Starting AI processing for report ${reportId}: ${fileName}`);
        
        // Process document with AI
        const result = await medicalAI.processDocument(filePath, fileName);
        const processingTime = (Date.now() - startTime) / 1000;
        
        if (result.success) {
            console.log(`AI processing completed for report ${reportId} - Confidence: ${result.confidence}%`);
            
            // Update processing log
            db.run(`UPDATE ai_processing_log SET 
                    processing_status = 'completed',
                    extracted_text = ?,
                    confidence_score = ?,
                    processing_time = ?
                    WHERE report_id = ?`,
                [result.extractedText.substring(0, 5000), result.confidence, processingTime, reportId]);
            
            // Store extracted medical data
            await storeMedicalData(reportId, patientId, result.medicalInfo);
            
            // 🚀 NEW: Save to MySQL database
            try {
                const mysqlResult = await mysqlManager.saveAIExtractedData(
                    reportId, 
                    result.medicalInfo, 
                    result.confidence
                );
                console.log(`✅ Data saved to MySQL: ${mysqlResult.message}`);
                console.log(`👤 Patient ID: ${mysqlResult.patientId}, Record ID: ${mysqlResult.recordId}`);
            } catch (mysqlError) {
                console.error('❌ MySQL save failed:', mysqlError.message);
                console.log('💡 Check MySQL connection and credentials');
            }
            
            // Update patient record with AI data if confidence is high enough
            if (result.confidence >= 70) {
                await updatePatientWithAIData(patientId, result.medicalInfo);
            }
            
        } else {
            console.error(`AI processing failed for report ${reportId}:`, result.error);
            
            // Log error
            db.run(`UPDATE ai_processing_log SET 
                    processing_status = 'failed',
                    error_message = ?,
                    processing_time = ?
                    WHERE report_id = ?`,
                [result.error, processingTime, reportId]);
        }
        
    } catch (error) {
        const processingTime = (Date.now() - startTime) / 1000;
        console.error(`AI processing error for report ${reportId}:`, error);
        
        // Log error
        db.run(`UPDATE ai_processing_log SET 
                processing_status = 'failed',
                error_message = ?,
                processing_time = ?
                WHERE report_id = ?`,
            [error.message, processingTime, reportId]);
    }
}

// Store extracted medical data
async function storeMedicalData(reportId, patientId, medicalInfo) {
    try {
        const structuredData = medicalInfo.structuredData || {};
        
        // Insert medical record
        db.run(`INSERT INTO medical_records (
                patient_id, report_id, diagnosis, symptoms, disease_category, 
                allergies, visit_date, appointment_date, ai_confidence
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                patientId,
                reportId,
                structuredData.medical?.diagnosis,
                JSON.stringify(structuredData.medical?.symptoms || []),
                structuredData.medical?.diseaseCategory,
                structuredData.medical?.allergies,
                structuredData.visit?.visitDate,
                structuredData.visit?.appointmentDate,
                medicalInfo.confidence || 0
            ],
            function(err) {
                if (err) {
                    console.error('Error storing medical record:', err);
                    return;
                }
                
                const medicalRecordId = this.lastID;
                
                // Store vital signs if available
                const vitalSigns = structuredData.medical?.vitalSigns || {};
                if (Object.keys(vitalSigns).length > 0) {
                    db.run(`INSERT INTO vital_signs (
                            patient_id, medical_record_id, blood_pressure, temperature, 
                            pulse, respiratory_rate, oxygen_saturation, ai_extracted
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
                        [
                            patientId,
                            medicalRecordId,
                            vitalSigns.bloodPressure,
                            parseFloat(vitalSigns.temperature) || null,
                            parseInt(vitalSigns.pulse) || null,
                            parseInt(vitalSigns.respiratoryRate) || null,
                            parseInt(vitalSigns.oxygenSaturation) || null
                        ]);
                }
                
                // Store medications if available
                const medications = structuredData.medical?.medications || [];
                medications.forEach(medication => {
                    if (medication.name) {
                        db.run(`INSERT INTO medications (
                                patient_id, medical_record_id, medication_name, 
                                dosage, ai_extracted
                            ) VALUES (?, ?, ?, ?, 1)`,
                            [patientId, medicalRecordId, medication.name, medication.dosage]);
                    }
                });
                
                // Store lab results if available
                const labResults = structuredData.medical?.labResults || {};
                Object.entries(labResults).forEach(([testName, testValue]) => {
                    if (testValue !== null && testValue !== undefined) {
                        db.run(`INSERT INTO lab_results (
                                patient_id, medical_record_id, test_name, 
                                test_value, ai_extracted
                            ) VALUES (?, ?, ?, ?, 1)`,
                            [patientId, medicalRecordId, testName, parseFloat(testValue) || testValue]);
                    }
                });
            });
            
    } catch (error) {
        console.error('Error storing medical data:', error);
    }
}

// Update patient record with AI-extracted data
async function updatePatientWithAIData(patientId, medicalInfo) {
    try {
        const structuredData = medicalInfo.structuredData || {};
        const patientData = structuredData.patient || {};
        const medicalData = structuredData.medical || {};
        
        let updateFields = [];
        let updateValues = [];
        
        // Update patient demographics if available and not already set
        if (patientData.phone) {
            updateFields.push('phone = ?');
            updateValues.push(patientData.phone);
        }
        
        if (patientData.email) {
            updateFields.push('email = ?');
            updateValues.push(patientData.email);
        }
        
        if (patientData.address) {
            updateFields.push('address = ?');
            updateValues.push(patientData.address);
        }
        
        if (patientData.city) {
            updateFields.push('city = ?');
            updateValues.push(patientData.city);
        }
        
        if (patientData.state) {
            updateFields.push('state = ?');
            updateValues.push(patientData.state);
        }
        
        // Update medical information
        if (medicalData.diagnosis) {
            updateFields.push('disease_diagnosis = ?');
            updateValues.push(medicalData.diagnosis);
        }
        
        if (medicalData.diseaseCategory) {
            updateFields.push('disease_category = ?');
            updateValues.push(medicalData.diseaseCategory);
        }
        
        // Mark as AI extracted
        updateFields.push('ai_extracted = 1');
        updateFields.push('ai_confidence = ?');
        updateValues.push(medicalInfo.confidence || 0);
        
        if (updateFields.length > 0) {
            updateValues.push(patientId);
            
            db.run(`UPDATE patients SET ${updateFields.join(', ')} WHERE id = ?`, 
                updateValues, (err) => {
                    if (err) {
                        console.error('Error updating patient with AI data:', err);
                    } else {
                        console.log(`Patient ${patientId} updated with AI-extracted data`);
                    }
                });
        }
        
    } catch (error) {
        console.error('Error updating patient with AI data:', error);
    }
}

// Get patient reports
app.get('/api/patients/:id/reports', requireAuth, (req, res) => {
    db.all(`SELECT mr.*, 
            apl.processing_status, apl.confidence_score, apl.processed_at as ai_processed_at
            FROM medical_reports mr
            LEFT JOIN ai_processing_log apl ON mr.id = apl.report_id
            WHERE mr.patient_id = ? 
            ORDER BY mr.uploaded_at DESC`, [req.params.id], (err, reports) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(reports);
    });
});

// Get AI processing status for a report
app.get('/api/reports/:id/ai-status', requireAuth, (req, res) => {
    db.get(`SELECT * FROM ai_processing_log WHERE report_id = ? ORDER BY processed_at DESC LIMIT 1`, 
        [req.params.id], (err, log) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (!log) {
                return res.json({ status: 'not_processed' });
            }
            
            res.json({
                status: log.processing_status,
                confidence: log.confidence_score,
                processedAt: log.processed_at,
                processingTime: log.processing_time,
                error: log.error_message
            });
        });
});

// Get extracted medical data for a report
app.get('/api/reports/:id/medical-data', requireAuth, (req, res) => {
    // Get medical record
    db.get(`SELECT * FROM medical_records WHERE report_id = ?`, [req.params.id], (err, medicalRecord) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!medicalRecord) {
            return res.json({ message: 'No extracted medical data available' });
        }
        
        // Get related data
        Promise.all([
            new Promise((resolve, reject) => {
                db.all(`SELECT * FROM vital_signs WHERE medical_record_id = ?`, 
                    [medicalRecord.id], (err, vitals) => {
                        if (err) reject(err);
                        else resolve(vitals);
                    });
            }),
            new Promise((resolve, reject) => {
                db.all(`SELECT * FROM medications WHERE medical_record_id = ?`, 
                    [medicalRecord.id], (err, medications) => {
                        if (err) reject(err);
                        else resolve(medications);
                    });
            }),
            new Promise((resolve, reject) => {
                db.all(`SELECT * FROM lab_results WHERE medical_record_id = ?`, 
                    [medicalRecord.id], (err, labs) => {
                        if (err) reject(err);
                        else resolve(labs);
                    });
            })
        ]).then(([vitals, medications, labs]) => {
            res.json({
                medicalRecord: {
                    ...medicalRecord,
                    symptoms: JSON.parse(medicalRecord.symptoms || '[]')
                },
                vitalSigns: vitals,
                medications: medications,
                labResults: labs
            });
        }).catch(error => {
            res.status(500).json({ error: 'Error fetching medical data' });
        });
    });
});

// Get AI processing statistics
app.get('/api/dashboard/ai-stats', requireAuth, (req, res) => {
    Promise.all([
        new Promise((resolve, reject) => {
            db.get(`SELECT 
                    COUNT(*) as total_processed,
                    COUNT(CASE WHEN processing_status = 'completed' THEN 1 END) as successful,
                    COUNT(CASE WHEN processing_status = 'failed' THEN 1 END) as failed,
                    AVG(confidence_score) as avg_confidence,
                    AVG(processing_time) as avg_processing_time
                    FROM ai_processing_log`, (err, stats) => {
                if (err) reject(err);
                else resolve(stats);
            });
        }),
        new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as ai_enhanced_patients 
                    FROM patients WHERE ai_extracted = 1`, (err, patients) => {
                if (err) reject(err);
                else resolve(patients);
            });
        })
    ]).then(([processingStats, patientStats]) => {
        res.json({
            totalProcessed: processingStats.total_processed || 0,
            successfulProcessing: processingStats.successful || 0,
            failedProcessing: processingStats.failed || 0,
            avgConfidence: Math.round(processingStats.avg_confidence || 0),
            avgProcessingTime: Math.round((processingStats.avg_processing_time || 0) * 100) / 100,
            aiEnhancedPatients: patientStats.ai_enhanced_patients || 0
        });
    }).catch(error => {
        res.status(500).json({ error: 'Error fetching AI statistics' });
    });
});

// Download report file
app.get('/api/reports/:id/download', requireAuth, (req, res) => {
    db.get('SELECT * FROM medical_reports WHERE id = ?', [req.params.id], (err, report) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }
        
        const filePath = path.resolve(report.file_path);
        if (fs.existsSync(filePath)) {
            res.download(filePath, report.file_name);
        } else {
            res.status(404).json({ error: 'File not found' });
        }
    });
});

// Preview report file
app.get('/api/reports/:id/preview', requireAuth, (req, res) => {
    db.get('SELECT * FROM medical_reports WHERE id = ?', [req.params.id], (err, report) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }
        
        const filePath = path.resolve(report.file_path);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }
        
        // Set appropriate content type
        const ext = path.extname(report.file_name).toLowerCase();
        let contentType = 'application/octet-stream';
        
        switch (ext) {
            case '.pdf':
                contentType = 'application/pdf';
                break;
            case '.jpg':
            case '.jpeg':
                contentType = 'image/jpeg';
                break;
            case '.png':
                contentType = 'image/png';
                break;
            case '.gif':
                contentType = 'image/gif';
                break;
            case '.txt':
                contentType = 'text/plain';
                break;
        }
        
        res.setHeader('Content-Type', contentType);
        res.sendFile(filePath);
    });
});

// Text extraction endpoint (foundation for OCR integration)
app.get('/api/reports/:id/extract-text', requireAuth, (req, res) => {
    db.get('SELECT * FROM medical_reports WHERE id = ?', [req.params.id], (err, report) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }
        
        const filePath = path.resolve(report.file_path);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }
        
        const ext = path.extname(report.file_name).toLowerCase();
        
        if (ext === '.txt') {
            // For text files, read the content directly
            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to read file' });
                }
                res.json({ text: data, type: 'text', source: 'direct' });
            });
        } else {
            // Foundation for OCR integration - placeholder for now
            // In production, this would integrate with:
            // - Amazon Textract for PDF/image OCR
            // - Google Cloud Vision API
            // - Azure Cognitive Services
            // - Custom healthcare NLP models
            const placeholder = `Text extraction from ${ext} files requires OCR integration.\n\nProduction Implementation Plan:\n\n1. PDF Files:\n   - Amazon Textract\n   - Google Cloud Document AI\n   - Azure Form Recognizer\n\n2. Image Files:\n   - Google Cloud Vision API\n   - Amazon Rekognition\n   - Azure Computer Vision\n\n3. Medical Text Processing:\n   - Amazon Comprehend Medical\n   - Custom NLP models\n   - FHIR-compliant data extraction\n\n4. Features to implement:\n   - Medical entity recognition\n   - Disease/symptom extraction\n   - Medication identification\n   - Lab result parsing\n   - Clinical note structuring`;
            
            res.json({ 
                text: placeholder,
                type: 'placeholder',
                source: 'demo'
            });
        }
    });
});

// Dashboard Analytics APIs

// Get disease statistics with optional filters
app.get('/api/dashboard/diseases', requireAuth, (req, res) => {
    const { startDate, endDate, city, state } = req.query;
    
    let query = `SELECT 
                disease_diagnosis as disease, 
                COUNT(*) as count 
            FROM patients 
            WHERE disease_diagnosis IS NOT NULL AND disease_diagnosis != ''`;
    
    const params = [];
    
    if (startDate) {
        query += ` AND created_at >= ?`;
        params.push(startDate);
    }
    
    if (endDate) {
        query += ` AND created_at <= ?`;
        params.push(endDate);
    }
    
    if (city) {
        query += ` AND city LIKE ?`;
        params.push(`%${city}%`);
    }
    
    if (state) {
        query += ` AND state LIKE ?`;
        params.push(`%${state}%`);
    }
    
    query += ` GROUP BY disease_diagnosis ORDER BY count DESC`;
    
    db.all(query, params, (err, diseases) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(diseases);
    });
});

// Get geographical disease distribution with filters
app.get('/api/dashboard/disease-by-area', requireAuth, (req, res) => {
    const { startDate, endDate, disease } = req.query;
    
    let query = `SELECT 
                city,
                state,
                disease_diagnosis as disease,
                COUNT(*) as count
            FROM patients 
            WHERE disease_diagnosis IS NOT NULL AND disease_diagnosis != ''
                AND (city IS NOT NULL AND city != '' OR state IS NOT NULL AND state != '')`;
    
    const params = [];
    
    if (startDate) {
        query += ` AND created_at >= ?`;
        params.push(startDate);
    }
    
    if (endDate) {
        query += ` AND created_at <= ?`;
        params.push(endDate);
    }
    
    if (disease) {
        query += ` AND disease_diagnosis = ?`;
        params.push(disease);
    }
    
    query += ` GROUP BY city, state, disease_diagnosis ORDER BY count DESC`;
    
    db.all(query, params, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
});

// Get dashboard summary stats with filters
app.get('/api/dashboard/summary', requireAuth, (req, res) => {
    const { startDate, endDate } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (startDate || endDate) {
        if (startDate) {
            dateFilter += ' AND p.created_at >= ?';
            params.push(startDate);
        }
        if (endDate) {
            dateFilter += ' AND p.created_at <= ?';
            params.push(endDate);
        }
    }
    
    const queries = {
        totalPatients: `SELECT COUNT(*) as count FROM patients p WHERE 1=1${dateFilter}`,
        totalReports: `SELECT COUNT(*) as count FROM medical_reports mr JOIN patients p ON mr.patient_id = p.id WHERE 1=1${dateFilter.replace('p.created_at', 'mr.uploaded_at')}`,
        uniqueDiseases: `SELECT COUNT(DISTINCT disease_diagnosis) as count FROM patients p WHERE disease_diagnosis IS NOT NULL AND disease_diagnosis != ""${dateFilter}`,
        affectedAreas: `SELECT COUNT(DISTINCT city || ", " || state) as count FROM patients p WHERE (city IS NOT NULL AND city != "") OR (state IS NOT NULL AND state != "")${dateFilter}`
    };
    
    const results = {};
    let completed = 0;
    const total = Object.keys(queries).length;
    
    Object.entries(queries).forEach(([key, query]) => {
        db.get(query, params, (err, result) => {
            if (err) {
                console.error(`Error in ${key} query:`, err);
                return res.status(500).json({ error: 'Database error' });
            }
            results[key] = result.count;
            completed++;
            
            if (completed === total) {
                res.json(results);
            }
        });
    });
});

// Get available filter options
app.get('/api/dashboard/filter-options', requireAuth, (req, res) => {
    const queries = {
        diseases: 'SELECT DISTINCT disease_diagnosis as value FROM patients WHERE disease_diagnosis IS NOT NULL AND disease_diagnosis != "" ORDER BY disease_diagnosis',
        cities: 'SELECT DISTINCT city as value FROM patients WHERE city IS NOT NULL AND city != "" ORDER BY city',
        states: 'SELECT DISTINCT state as value FROM patients WHERE state IS NOT NULL AND state != "" ORDER BY state'
    };
    
    const results = {};
    let completed = 0;
    const total = Object.keys(queries).length;
    
    Object.entries(queries).forEach(([key, query]) => {
        db.all(query, (err, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            results[key] = rows.map(row => row.value);
            completed++;
            
            if (completed === total) {
                res.json(results);
            }
        });
    });
});

// Export patient data as CSV
app.get('/api/export/patients', requireAuth, (req, res) => {
    const { format, startDate, endDate, disease, city, state } = req.query;
    
    let query = 'SELECT * FROM patients WHERE 1=1';
    const params = [];
    
    if (startDate) {
        query += ' AND created_at >= ?';
        params.push(startDate);
    }
    
    if (endDate) {
        query += ' AND created_at <= ?';
        params.push(endDate);
    }
    
    if (disease) {
        query += ' AND disease_diagnosis = ?';
        params.push(disease);
    }
    
    if (city) {
        query += ' AND city LIKE ?';
        params.push(`%${city}%`);
    }
    
    if (state) {
        query += ' AND state LIKE ?';
        params.push(`%${state}%`);
    }
    
    query += ' ORDER BY created_at DESC';
    
    db.all(query, params, (err, patients) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (format === 'csv') {
            // Convert to CSV
            const headers = ['Patient ID', 'First Name', 'Last Name', 'Date of Birth', 'Gender', 'Phone', 'Email', 'Address', 'Disease', 'City', 'State', 'Created At'];
            let csv = headers.join(',') + '\n';
            
            patients.forEach(patient => {
                const row = [
                    patient.patient_id,
                    patient.first_name,
                    patient.last_name,
                    patient.date_of_birth || '',
                    patient.gender || '',
                    patient.phone || '',
                    patient.email || '',
                    `"${patient.address || ''}"`,
                    patient.disease_diagnosis || '',
                    patient.city || '',
                    patient.state || '',
                    patient.created_at
                ];
                csv += row.join(',') + '\n';
            });
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="patients.csv"');
            res.send(csv);
        } else {
            res.json(patients);
        }
    });
});

// Get top diseases by area
app.get('/api/dashboard/top-diseases-by-area', requireAuth, (req, res) => {
    db.all(`SELECT 
                CASE 
                    WHEN city IS NOT NULL AND city != '' AND state IS NOT NULL AND state != '' 
                    THEN city || ', ' || state
                    WHEN city IS NOT NULL AND city != '' 
                    THEN city
                    WHEN state IS NOT NULL AND state != '' 
                    THEN state
                    ELSE 'Unknown Location'
                END as area,
                disease_diagnosis as disease,
                COUNT(*) as count
            FROM patients 
            WHERE disease_diagnosis IS NOT NULL AND disease_diagnosis != ''
            GROUP BY area, disease_diagnosis
            HAVING count >= 1
            ORDER BY area, count DESC`, 
        (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            
            // Group by area
            const groupedResults = results.reduce((acc, row) => {
                if (!acc[row.area]) {
                    acc[row.area] = [];
                }
                acc[row.area].push({
                    disease: row.disease,
                    count: row.count
                });
                return acc;
            }, {});
            
            res.json(groupedResults);
        }
    );
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
        }
    }
    res.status(500).json({ error: error.message });
});

// 🚀 NEW: MySQL API Endpoints
// Add patient to MySQL
app.post('/api/mysql/patients', requireAuth, async (req, res) => {
    try {
        const { first_name, last_name, date_of_birth, gender, phone, email, address, city, state, zip_code, disease_diagnosis, symptoms } = req.body;
        
        // Generate patient ID
        const patient_id = 'PAT' + Date.now().toString().slice(-6);
        
        const connection = await mysqlManager.pool.getConnection();
        const [result] = await connection.execute(`
            INSERT INTO patients (patient_id, name, date_of_birth, gender, age, phone, email, address, city, state, zip_code, disease_diagnosis, symptoms)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [patient_id, `${first_name} ${last_name}`, date_of_birth, gender, 
            new Date().getFullYear() - new Date(date_of_birth).getFullYear(),
            phone, email, address, city, state, zip_code, disease_diagnosis, symptoms]);
        
        connection.release();
        
        res.json({
            success: true,
            id: result.insertId,
            patient_id: patient_id,
            message: 'Patient added successfully to MySQL'
        });
    } catch (error) {
        console.error('MySQL add patient error:', error);
        res.status(500).json({ error: 'Failed to add patient to MySQL' });
    }
});

// Get MySQL patient data
app.get('/api/mysql/patient/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;
        const patientData = await mysqlManager.getPatientData(patientId);
        
        if (!patientData) {
            return res.status(404).json({ error: 'Patient not found in MySQL' });
        }
        
        res.json({
            success: true,
            data: patientData,
            source: 'MySQL'
        });
    } catch (error) {
        console.error('MySQL query error:', error);
        res.status(500).json({ error: 'Failed to query MySQL data' });
    }
});

// Get all MySQL patients
app.get('/api/mysql/patients', async (req, res) => {
    try {
        const connection = await mysqlManager.pool.getConnection();
        const [patients] = await connection.execute(`
            SELECT p.id, p.patient_id, p.name, p.date_of_birth, p.gender, 
                   p.age, p.phone, p.email, p.city, p.state, p.created_at, p.updated_at,
                   COUNT(mr.id) as records_count,
                   MAX(mr.created_at) as last_visit
            FROM patients p 
            LEFT JOIN medical_records mr ON p.patient_id = mr.patient_id 
            GROUP BY p.id, p.patient_id, p.name, p.date_of_birth, p.gender, 
                     p.age, p.phone, p.email, p.city, p.state, p.created_at, p.updated_at
            ORDER BY p.created_at DESC
        `);
        connection.release();
        
        res.json({
            success: true,
            data: patients,
            count: patients.length,
            source: 'MySQL'
        });
    } catch (error) {
        console.error('MySQL patients query error:', error);
        res.status(500).json({ error: 'Failed to query MySQL patients' });
    }
});

// Test MySQL connection
app.get('/api/mysql/test', async (req, res) => {
    try {
        const isConnected = await mysqlManager.testConnection();
        res.json({
            success: isConnected,
            message: isConnected ? 'MySQL connection successful!' : 'MySQL connection failed',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.json({
            success: false,
            message: 'MySQL connection error',
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Medical Reports System running on http://localhost:${PORT}`);
    console.log('Default login: admin / admin123');
    console.log('🔗 MySQL Integration enabled - Data will be saved to both SQLite and MySQL');
});