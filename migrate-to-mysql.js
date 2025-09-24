const sqlite3 = require('sqlite3').verbose();
const MySQLManager = require('./mysql-manager');
const MedicalAI = require('./medical-ai');

async function migrateExistingDataToMySQL() {
    console.log('📤 Migrating existing AI-extracted data to MySQL...\n');
    
    const db = new sqlite3.Database('./medical_reports.db');
    const mysqlManager = new MySQLManager();
    const ai = new MedicalAI();
    
    try {
        // Test MySQL connection
        const isConnected = await mysqlManager.testConnection();
        if (!isConnected) {
            console.log('❌ MySQL connection failed. Run setup-mysql.js first.');
            return;
        }
        
        // Get reports that need processing or have been processed
        const reports = await new Promise((resolve, reject) => {
            db.all(`
                SELECT * FROM medical_reports 
                WHERE file_name IS NOT NULL
                ORDER BY id DESC 
                LIMIT 5
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log(`📊 Found ${reports.length} reports to process\n`);
        
        for (const report of reports) {
            console.log(`🔄 Processing: ${report.file_name} (ID: ${report.id})`);
            
            try {
                // Process document with AI if not already processed
                let result;
                if (report.extracted_text && report.confidence_score) {
                    // Use existing data
                    console.log(`📄 Using existing AI data (${report.confidence_score}% confidence)`);
                    
                    // Re-extract medical info from stored text
                    result = {
                        success: true,
                        extractedText: report.extracted_text,
                        confidence: report.confidence_score,
                        medicalInfo: await ai.extractMedicalInformation(report.extracted_text)
                    };
                } else {
                    // Process document fresh
                    console.log('🤖 Processing document with AI...');
                    result = await ai.processDocument(report.file_path, report.file_name);
                }
                
                if (result.success && result.medicalInfo.structuredData) {
                    // Save to MySQL
                    const mysqlResult = await mysqlManager.saveAIExtractedData(
                        report.id,
                        result.medicalInfo,
                        result.confidence || 0
                    );
                    
                    console.log(`✅ Saved to MySQL: ${mysqlResult.message}`);
                    console.log(`👤 Patient: ${mysqlResult.patientId}\n`);
                } else {
                    console.log('⚠️  No structured data to save\n');
                }
                
            } catch (error) {
                console.error(`❌ Error processing ${report.file_name}:`, error.message);
            }
        }
        
        // Show summary
        console.log('📈 Migration Summary:');
        const connection = await mysqlManager.pool.getConnection();
        
        // Count patients
        const [patientCount] = await connection.execute('SELECT COUNT(*) as count FROM patients');
        console.log(`👥 Patients: ${patientCount[0].count}`);
        
        // Count medical records
        const [recordCount] = await connection.execute('SELECT COUNT(*) as count FROM medical_records');
        console.log(`📋 Medical Records: ${recordCount[0].count}`);
        
        // Count medications
        const [medicationCount] = await connection.execute('SELECT COUNT(*) as count FROM medications');
        console.log(`💊 Medications: ${medicationCount[0].count}`);
        
        // Count lab results
        const [labCount] = await connection.execute('SELECT COUNT(*) as count FROM lab_results');
        console.log(`🧪 Lab Results: ${labCount[0].count}`);
        
        // Count vital signs
        const [vitalCount] = await connection.execute('SELECT COUNT(*) as count FROM vital_signs');
        console.log(`💓 Vital Signs Records: ${vitalCount[0].count}`);
        
        connection.release();
        
        console.log('\n🎉 Migration completed successfully!');
        console.log('🌐 You can now query the MySQL database for AI-extracted medical data.');
        
    } catch (error) {
        console.error('Migration error:', error.message);
    } finally {
        db.close();
        await mysqlManager.close();
    }
}

// Run migration
migrateExistingDataToMySQL();