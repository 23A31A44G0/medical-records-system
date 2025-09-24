const MedicalAI = require('./medical-ai');

async function demonstrateTextExtraction() {
    const ai = new MedicalAI();
    
    console.log("🤖 MEDICAL AI TEXT EXTRACTION DEMO");
    console.log("=====================================\n");
    
    // Test with the sample text file we created
    const testFilePath = './test-medical-report.txt';
    
    try {
        console.log("📄 Processing test medical report...\n");
        
        const result = await ai.processDocument(testFilePath, 'test-medical-report.txt');
        
        if (result.success) {
            console.log("✅ EXTRACTION SUCCESSFUL!");
            console.log(`📊 Confidence Score: ${result.confidence}%\n`);
            
            console.log("📝 EXTRACTED TEXT:");
            console.log("-------------------");
            console.log(result.extractedText.substring(0, 300) + "...\n");
            
            console.log("🏥 MEDICAL INFORMATION EXTRACTED:");
            console.log("==================================");
            
            const medical = result.medicalInfo;
            
            // Patient Info
            if (medical.patientName) {
                console.log(`👤 Patient Name: ${medical.patientName[0]}`);
            }
            
            // Vital Signs
            if (medical.vitalSigns && Object.keys(medical.vitalSigns).length > 0) {
                console.log("💓 Vital Signs:");
                Object.entries(medical.vitalSigns).forEach(([key, value]) => {
                    console.log(`   - ${key}: ${value}`);
                });
            }
            
            // Lab Results  
            if (medical.labResults && Object.keys(medical.labResults).length > 0) {
                console.log("🧪 Lab Results:");
                Object.entries(medical.labResults).forEach(([key, value]) => {
                    console.log(`   - ${key}: ${value}`);
                });
            }
            
            // Medications
            if (medical.medications && medical.medications.length > 0) {
                console.log("💊 Medications:");
                medical.medications.forEach(med => {
                    console.log(`   - ${med.name} ${med.dosage || ''}`);
                });
            }
            
            // Disease Category
            if (medical.diseaseCategory) {
                console.log(`🏷️  Disease Category: ${medical.diseaseCategory}`);
            }
            
            // Diagnosis
            if (medical.diagnosis) {
                console.log(`🩺 Diagnosis: ${medical.diagnosis[0]}`);
            }
            
            console.log("\n🔍 HOW IT WORKS:");
            console.log("================");
            console.log("1. 📖 Text Extraction:");
            console.log("   • PDF: Uses pdf-parse library to extract text");
            console.log("   • Images: Uses Tesseract.js OCR (Optical Character Recognition)");
            console.log("   • TXT: Reads file directly");
            
            console.log("\n2. 🧠 AI Processing:");
            console.log("   • Regex Pattern Matching for medical terms");
            console.log("   • Natural Language Processing (NLP)");
            console.log("   • Medical terminology classification");
            console.log("   • Confidence scoring based on extracted data");
            
            console.log("\n3. 🗄️  Structured Data Creation:");
            console.log("   • Organizes data into categories");
            console.log("   • Formats for database storage");
            console.log("   • Validates and cleans extracted information");
            
        } else {
            console.log("❌ EXTRACTION FAILED:");
            console.log(result.error);
        }
        
    } catch (error) {
        console.error("Error during demo:", error.message);
    }
}

// Run the demonstration
demonstrateTextExtraction();