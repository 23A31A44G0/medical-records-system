const sqlite3 = require('sqlite3').verbose();
const MedicalAI = require('./medical-ai');

async function updateExistingReportWithAI() {
    const db = new sqlite3.Database('./medical_reports.db');
    const ai = new MedicalAI();
    
    console.log('🔄 Updating existing reports with AI processing...\n');
    
    // Find a report to process
    db.get("SELECT * FROM medical_reports WHERE processing_status IS NULL LIMIT 1", async (err, report) => {
        if (err) {
            console.error('Database error:', err);
            db.close();
            return;
        }
        
        if (!report) {
            console.log('No reports found to process.');
            db.close();
            return;
        }
        
        console.log(`📄 Processing report: ${report.file_name} (ID: ${report.id})`);
        
        try {
            // Process the document with AI
            const result = await ai.processDocument(report.file_path, report.file_name);
            
            console.log(`✅ AI Processing ${result.success ? 'successful' : 'failed'}`);
            console.log(`📊 Confidence: ${result.confidence || 0}%`);
            
            // Update the database
            const updateQuery = `
                UPDATE medical_reports 
                SET processing_status = ?, 
                    confidence_score = ?, 
                    ai_processed_at = CURRENT_TIMESTAMP,
                    extracted_text = ?
                WHERE id = ?
            `;
            
            db.run(updateQuery, [
                result.success ? 'completed' : 'failed',
                result.confidence || 0,
                result.extractedText || null,
                report.id
            ], function(updateErr) {
                if (updateErr) {
                    console.error('Update error:', updateErr);
                } else {
                    console.log(`✨ Report ${report.id} updated successfully!`);
                    
                    if (result.success && result.medicalInfo.structuredData) {
                        // Save structured data
                        console.log('💾 Saving structured medical data...');
                        const structured = result.medicalInfo.structuredData;
                        
                        // You can expand this to save to other tables
                        console.log('Patient info:', structured.patient);
                        console.log('Medical data:', structured.medical);
                    }
                }
                
                db.close();
                console.log('\n🎉 Processing complete! Check the web interface now.');
            });
            
        } catch (error) {
            console.error('AI processing error:', error);
            
            // Update with failed status
            db.run("UPDATE medical_reports SET processing_status = 'failed', ai_processed_at = CURRENT_TIMESTAMP WHERE id = ?", 
                   [report.id], 
                   () => db.close());
        }
    });
}

updateExistingReportWithAI();