const mysql = require('mysql2/promise');

// MySQL Database Configuration
const dbConfig = {
    host: 'localhost',
    port: 3306,
    user: 'root',  // Change this to your MySQL username
    password: '1212',  // ⚠️ CHANGE THIS TO YOUR MYSQL PASSWORD
    database: 'medical_records_ai',
    charset: 'utf8mb4'
};

// Create connection pool for better performance
const pool = mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

class MySQLManager {
    constructor() {
        this.pool = pool;
    }

    // Initialize MySQL database and tables
    async initializeDatabase() {
        try {
            console.log('🔄 Initializing MySQL database...');
            
            // Create database if it doesn't exist
            const connection = await mysql.createConnection({
                host: dbConfig.host,
                port: dbConfig.port,
                user: dbConfig.user,
                password: dbConfig.password
            });

            await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
            await connection.end();

            // Create tables
            await this.createTables();
            console.log('✅ MySQL database initialized successfully!');

        } catch (error) {
            console.error('❌ MySQL initialization error:', error.message);
            throw error;
        }
    }

    // Create all necessary tables
    async createTables() {
        const tables = [
            // Patients table
            `CREATE TABLE IF NOT EXISTS patients (
                id INT AUTO_INCREMENT PRIMARY KEY,
                patient_id VARCHAR(50) UNIQUE,
                name VARCHAR(255) NOT NULL,
                date_of_birth DATE,
                gender ENUM('Male', 'Female', 'Other'),
                age INT,
                phone VARCHAR(20),
                email VARCHAR(255),
                address TEXT,
                city VARCHAR(100),
                state VARCHAR(100),
                zip_code VARCHAR(10),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_patient_id (patient_id),
                INDEX idx_name (name)
            )`,

            // Medical Records table
            `CREATE TABLE IF NOT EXISTS medical_records (
                id INT AUTO_INCREMENT PRIMARY KEY,
                patient_id VARCHAR(50),
                report_id INT,
                diagnosis TEXT,
                disease_category VARCHAR(100),
                symptoms JSON,
                allergies TEXT,
                treatment_plan TEXT,
                visit_date DATE,
                appointment_date DATE,
                confidence_score INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_patient_id (patient_id),
                INDEX idx_disease_category (disease_category),
                FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON UPDATE CASCADE
            )`,

            // Vital Signs table
            `CREATE TABLE IF NOT EXISTS vital_signs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                patient_id VARCHAR(50),
                record_id INT,
                blood_pressure VARCHAR(20),
                heart_rate INT,
                temperature DECIMAL(4,1),
                respiratory_rate INT,
                oxygen_saturation INT,
                weight DECIMAL(5,2),
                height DECIMAL(5,2),
                recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_patient_id (patient_id),
                FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON UPDATE CASCADE,
                FOREIGN KEY (record_id) REFERENCES medical_records(id) ON DELETE CASCADE
            )`,

            // Medications table
            `CREATE TABLE IF NOT EXISTS medications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                patient_id VARCHAR(50),
                record_id INT,
                medication_name VARCHAR(255) NOT NULL,
                dosage VARCHAR(100),
                frequency VARCHAR(100),
                start_date DATE,
                end_date DATE,
                prescribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_patient_id (patient_id),
                INDEX idx_medication_name (medication_name),
                FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON UPDATE CASCADE,
                FOREIGN KEY (record_id) REFERENCES medical_records(id) ON DELETE CASCADE
            )`,

            // Lab Results table
            `CREATE TABLE IF NOT EXISTS lab_results (
                id INT AUTO_INCREMENT PRIMARY KEY,
                patient_id VARCHAR(50),
                record_id INT,
                test_name VARCHAR(255) NOT NULL,
                test_value DECIMAL(10,3),
                unit VARCHAR(50),
                reference_range VARCHAR(100),
                status ENUM('Normal', 'Abnormal', 'Critical') DEFAULT 'Normal',
                test_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_patient_id (patient_id),
                INDEX idx_test_name (test_name),
                FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON UPDATE CASCADE,
                FOREIGN KEY (record_id) REFERENCES medical_records(id) ON DELETE CASCADE
            )`,

            // AI Processing Log table
            `CREATE TABLE IF NOT EXISTS ai_processing_log (
                id INT AUTO_INCREMENT PRIMARY KEY,
                report_id INT,
                patient_id VARCHAR(50),
                file_name VARCHAR(255),
                processing_status ENUM('processing', 'completed', 'failed') DEFAULT 'processing',
                confidence_score INT DEFAULT 0,
                extracted_text LONGTEXT,
                processing_time_seconds DECIMAL(5,2),
                error_message TEXT,
                processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_report_id (report_id),
                INDEX idx_patient_id (patient_id),
                INDEX idx_status (processing_status)
            )`
        ];

        for (const tableSQL of tables) {
            await this.pool.execute(tableSQL);
        }

        console.log('📋 MySQL tables created successfully!');
    }

    // Helper function to convert date to MySQL format
    convertToMySQLDate(dateString) {
        if (!dateString) return null;
        
        try {
            // Handle MM/DD/YYYY format
            if (dateString.includes('/')) {
                const [month, day, year] = dateString.split('/');
                return `${year.padStart(4, '20')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
            
            // Handle DD-MM-YYYY format
            if (dateString.includes('-') && dateString.length === 10) {
                const parts = dateString.split('-');
                if (parts[0].length === 4) return dateString; // Already in YYYY-MM-DD format
                return `${parts[2]}-${parts[1]}-${parts[0]}`; // Convert DD-MM-YYYY to YYYY-MM-DD
            }
            
            // Try to parse as Date object
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
            }
            
            return null;
        } catch (error) {
            console.warn('Date conversion error:', error.message);
            return null;
        }
    }

    // Save AI-extracted patient data to MySQL
    async saveAIExtractedData(reportId, extractedData, confidence) {
        const connection = await this.pool.getConnection();
        
        try {
            await connection.beginTransaction();

            const { patient, medical, visit } = extractedData.structuredData;
            let patientId = patient.patientId || `PAT_${Date.now()}`;

            // 1. Insert/Update Patient
            if (patient.name) {
                await connection.execute(`
                    INSERT INTO patients (
                        patient_id, name, date_of_birth, gender, age, 
                        phone, email, address, city, state
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        name = VALUES(name),
                        date_of_birth = VALUES(date_of_birth),
                        gender = VALUES(gender),
                        age = VALUES(age),
                        phone = VALUES(phone),
                        email = VALUES(email),
                        address = VALUES(address),
                        city = VALUES(city),
                        state = VALUES(state),
                        updated_at = CURRENT_TIMESTAMP
                `, [
                    patientId,
                    patient.name,
                    this.convertToMySQLDate(patient.dateOfBirth),
                    patient.gender || null,
                    patient.age || null,
                    patient.phone || null,
                    patient.email || null,
                    patient.address || null,
                    patient.city || null,
                    patient.state || null
                ]);
            }

            // 2. Insert Medical Record
            const [medicalResult] = await connection.execute(`
                INSERT INTO medical_records (
                    patient_id, report_id, diagnosis, disease_category,
                    symptoms, allergies, visit_date, appointment_date, confidence_score
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                patientId,
                reportId,
                medical.diagnosis || null,
                medical.diseaseCategory || null,
                JSON.stringify(medical.symptoms || []),
                medical.allergies || null,
                this.convertToMySQLDate(visit.visitDate),
                this.convertToMySQLDate(visit.appointmentDate),
                confidence || 0
            ]);

            const recordId = medicalResult.insertId;

            // 3. Insert Vital Signs
            if (medical.vitalSigns && Object.keys(medical.vitalSigns).length > 0) {
                const vitals = medical.vitalSigns;
                await connection.execute(`
                    INSERT INTO vital_signs (
                        patient_id, record_id, blood_pressure, heart_rate,
                        temperature, respiratory_rate, oxygen_saturation
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    patientId,
                    recordId,
                    vitals.bloodPressure || null,
                    vitals.pulse ? parseInt(vitals.pulse) : null,
                    vitals.temperature ? parseFloat(vitals.temperature) : null,
                    vitals.respiratoryRate ? parseInt(vitals.respiratoryRate) : null,
                    vitals.oxygenSaturation ? parseInt(vitals.oxygenSaturation) : null
                ]);
            }

            // 4. Insert Medications
            if (medical.medications && medical.medications.length > 0) {
                for (const med of medical.medications) {
                    await connection.execute(`
                        INSERT INTO medications (
                            patient_id, record_id, medication_name, dosage
                        ) VALUES (?, ?, ?, ?)
                    `, [
                        patientId,
                        recordId,
                        med.name || med,
                        med.dosage || null
                    ]);
                }
            }

            // 5. Insert Lab Results
            if (medical.labResults && Object.keys(medical.labResults).length > 0) {
                for (const [testName, value] of Object.entries(medical.labResults)) {
                    await connection.execute(`
                        INSERT INTO lab_results (
                            patient_id, record_id, test_name, test_value, unit
                        ) VALUES (?, ?, ?, ?, ?)
                    `, [
                        patientId,
                        recordId,
                        testName,
                        typeof value === 'number' ? value : parseFloat(value) || null,
                        this.getLabUnit(testName)
                    ]);
                }
            }

            // 6. Log AI Processing
            await connection.execute(`
                INSERT INTO ai_processing_log (
                    report_id, patient_id, processing_status, confidence_score, extracted_text
                ) VALUES (?, ?, 'completed', ?, ?)
            `, [
                reportId,
                patientId,
                confidence || 0,
                extractedData.extractedText?.substring(0, 5000) || null
            ]);

            await connection.commit();
            console.log(`✅ AI data saved to MySQL for patient: ${patient.name || patientId}`);
            
            return {
                success: true,
                patientId,
                recordId,
                message: 'Data successfully saved to MySQL'
            };

        } catch (error) {
            await connection.rollback();
            console.error('❌ MySQL save error:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // Get lab unit based on test name
    getLabUnit(testName) {
        const units = {
            glucose: 'mg/dL',
            cholesterol: 'mg/dL',
            hemoglobin: 'g/dL',
            whiteBloodCell: 'cells/μL',
            plateletCount: 'cells/μL',
            creatinine: 'mg/dL'
        };
        return units[testName] || null;
    }

    // Get patient data from MySQL
    async getPatientData(patientId) {
        try {
            const [patients] = await this.pool.execute(
                'SELECT * FROM patients WHERE patient_id = ?', 
                [patientId]
            );

            if (patients.length === 0) return null;

            const patient = patients[0];

            // Get medical records
            const [records] = await this.pool.execute(
                'SELECT * FROM medical_records WHERE patient_id = ? ORDER BY created_at DESC',
                [patientId]
            );

            // Get vital signs
            const [vitals] = await this.pool.execute(
                'SELECT * FROM vital_signs WHERE patient_id = ? ORDER BY recorded_at DESC',
                [patientId]
            );

            // Get medications
            const [medications] = await this.pool.execute(
                'SELECT * FROM medications WHERE patient_id = ? ORDER BY prescribed_at DESC',
                [patientId]
            );

            // Get lab results
            const [labResults] = await this.pool.execute(
                'SELECT * FROM lab_results WHERE patient_id = ? ORDER BY test_date DESC',
                [patientId]
            );

            return {
                patient,
                records,
                vitals,
                medications,
                labResults
            };

        } catch (error) {
            console.error('MySQL query error:', error);
            throw error;
        }
    }

    // Test connection
    async testConnection() {
        try {
            const connection = await this.pool.getConnection();
            await connection.ping();
            connection.release();
            console.log('✅ MySQL connection successful!');
            return true;
        } catch (error) {
            console.error('❌ MySQL connection failed:', error.message);
            return false;
        }
    }

    // Close all connections
    async close() {
        await this.pool.end();
    }
}

module.exports = MySQLManager;