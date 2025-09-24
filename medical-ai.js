// AI Medical Information Extractor
const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const natural = require('natural');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

class MedicalAI {
    constructor() {
        this.tokenizer = new natural.WordTokenizer();
        this.stemmer = natural.PorterStemmer;
        
        // Medical keywords and patterns
        this.medicalPatterns = {
            // Patient Information
            patientName: /(?:patient name|name)[:\s]*([a-zA-Z\s]+)/gi,
            patientId: /(?:patient id|id|mrn)[:\s]*([a-zA-Z0-9\-]+)/gi,
            dateOfBirth: /(?:dob|date of birth|born)[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/gi,
            gender: /(?:gender|sex)[:\s]*(male|female|m|f)/gi,
            age: /(?:age)[:\s]*(\d+)/gi,
            
            // Contact Information
            phone: /(?:phone|tel|mobile)[:\s]*([+]?[\d\s\-\(\)]{10,})/gi,
            email: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
            address: /(?:address)[:\s]*([^\\n]+)/gi,
            
            // Medical Information
            diagnosis: /(?:diagnosis|diagnosed with|condition)[:\s]*([^\\n.;]+)/gi,
            symptoms: /(?:symptoms?|presents? with|complains? of)[:\s]*([^\\n.;]+)/gi,
            medications: /(?:medications?|drugs?|prescriptions?)[:\s]*([^\\n.;]+)/gi,
            allergies: /(?:allergies|allergic to)[:\s]*([^\\n.;]+)/gi,
            
            // Vital Signs
            bloodPressure: /(?:bp|blood pressure)[:\s]*(\d{2,3}\/\d{2,3})/gi,
            temperature: /(?:temp|temperature)[:\s]*(\d{2,3}\.?\d?[°]?[fc]?)/gi,
            pulse: /(?:pulse|heart rate|hr)[:\s]*(\d{2,3})/gi,
            weight: /(?:weight)[:\s]*(\d+\.?\d*\s*(?:kg|lbs?))/gi,
            height: /(?:height)[:\s]*(\d+\.?\d*\s*(?:cm|ft|in))/gi,
            
            // Lab Results
            glucose: /(?:glucose|blood sugar)[:\s]*(\d+\.?\d*)/gi,
            cholesterol: /(?:cholesterol)[:\s]*(\d+\.?\d*)/gi,
            hemoglobin: /(?:hemoglobin|hb)[:\s]*(\d+\.?\d*)/gi,
            
            // Dates and Times
            visitDate: /(?:date|visit date|seen on)[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/gi,
            appointmentDate: /(?:appointment|follow[- ]?up)[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/gi,
            
            // Location Information
            city: /(?:city)[:\s]*([a-zA-Z\s]+)/gi,
            state: /(?:state)[:\s]*([a-zA-Z\s]+)/gi,
            zipCode: /(?:zip|postal)[:\s]*(\d{5})/gi
        };
        
        // Medical terminology for disease classification
        this.diseaseCategories = {
            cardiovascular: ['heart', 'cardiac', 'hypertension', 'stroke', 'angina', 'arrhythmia'],
            respiratory: ['lung', 'asthma', 'copd', 'pneumonia', 'bronchitis', 'respiratory'],
            diabetes: ['diabetes', 'diabetic', 'insulin', 'glucose', 'blood sugar'],
            neurological: ['brain', 'neurological', 'seizure', 'migraine', 'alzheimer', 'parkinson'],
            orthopedic: ['bone', 'joint', 'fracture', 'arthritis', 'spine', 'orthopedic'],
            infectious: ['infection', 'bacterial', 'viral', 'fever', 'flu', 'covid'],
            mental_health: ['depression', 'anxiety', 'bipolar', 'mental', 'psychiatric'],
            cancer: ['cancer', 'tumor', 'oncology', 'chemotherapy', 'radiation', 'malignant']
        };
    }
    
    // Main document processing function
    async processDocument(filePath, fileName) {
        try {
            console.log(`Processing document: ${fileName}`);
            
            let extractedText = '';
            const fileExtension = path.extname(fileName).toLowerCase();
            
            // Extract text based on file type
            switch (fileExtension) {
                case '.pdf':
                    extractedText = await this.extractTextFromPDF(filePath);
                    break;
                case '.jpg':
                case '.jpeg':
                case '.png':
                case '.bmp':
                case '.tiff':
                    extractedText = await this.extractTextFromImage(filePath);
                    break;
                case '.txt':
                    extractedText = await this.extractTextFromFile(filePath);
                    break;
                default:
                    throw new Error(`Unsupported file type: ${fileExtension}`);
            }
            
            // Process extracted text with AI
            const medicalInfo = await this.extractMedicalInformation(extractedText);
            
            return {
                success: true,
                extractedText: extractedText.substring(0, 5000), // Limit text length
                medicalInfo,
                confidence: this.calculateConfidence(medicalInfo),
                processedAt: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('Document processing error:', error);
            return {
                success: false,
                error: error.message,
                extractedText: '',
                medicalInfo: {},
                confidence: 0
            };
        }
    }
    
    // Extract text from PDF
    async extractTextFromPDF(filePath) {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        return data.text;
    }
    
    // Extract text from images using OCR
    async extractTextFromImage(filePath) {
        try {
            // Optimize image for OCR
            const optimizedPath = await this.optimizeImageForOCR(filePath);
            
            const { data: { text } } = await Tesseract.recognize(optimizedPath, 'eng', {
                logger: m => console.log('OCR Progress:', m)
            });
            
            // Clean up temporary file
            if (optimizedPath !== filePath) {
                fs.unlinkSync(optimizedPath);
            }
            
            return text;
        } catch (error) {
            console.error('OCR Error:', error);
            throw error;
        }
    }
    
    // Extract text from text files
    async extractTextFromFile(filePath) {
        return fs.readFileSync(filePath, 'utf8');
    }
    
    // Optimize image for better OCR results
    async optimizeImageForOCR(imagePath) {
        try {
            const optimizedPath = imagePath.replace(/\\.[^.]+$/, '_optimized.png');
            
            await sharp(imagePath)
                .resize(null, 2000, { withoutEnlargement: true })
                .normalize()
                .sharpen()
                .png()
                .toFile(optimizedPath);
            
            return optimizedPath;
        } catch (error) {
            console.error('Image optimization error:', error);
            return imagePath; // Return original if optimization fails
        }
    }
    
    // Extract medical information using pattern matching and NLP
    async extractMedicalInformation(text) {
        const medicalInfo = {};
        
        // Clean and normalize text
        const cleanText = this.cleanText(text);
        
        // Extract information using patterns
        for (const [category, pattern] of Object.entries(this.medicalPatterns)) {
            const matches = this.extractMatches(cleanText, pattern);
            if (matches.length > 0) {
                medicalInfo[category] = matches;
            }
        }
        
        // Classify diseases and conditions
        medicalInfo.diseaseCategory = this.classifyDisease(cleanText);
        
        // Extract medications and dosages
        medicalInfo.medications = this.extractMedications(cleanText);
        
        // Extract vital signs
        medicalInfo.vitalSigns = this.extractVitalSigns(cleanText);
        
        // Extract lab results
        medicalInfo.labResults = this.extractLabResults(cleanText);
        
        // Extract structured data
        medicalInfo.structuredData = this.createStructuredData(medicalInfo);
        
        return medicalInfo;
    }
    
    // Clean and normalize text
    cleanText(text) {
        return text
            .replace(/\\n\\n+/g, '\\n') // Remove extra newlines
            .replace(/\\s+/g, ' ') // Normalize spaces
            .trim();
    }
    
    // Extract matches using regex patterns
    extractMatches(text, pattern) {
        const matches = [];
        let match;
        
        while ((match = pattern.exec(text)) !== null) {
            if (match[1] && match[1].trim()) {
                matches.push(match[1].trim());
            }
        }
        
        return [...new Set(matches)]; // Remove duplicates
    }
    
    // Classify disease category
    classifyDisease(text) {
        const lowerText = text.toLowerCase();
        const scores = {};
        
        for (const [category, keywords] of Object.entries(this.diseaseCategories)) {
            scores[category] = keywords.reduce((score, keyword) => {
                const regex = new RegExp(keyword, 'gi');
                const matches = (lowerText.match(regex) || []).length;
                return score + matches;
            }, 0);
        }
        
        // Return category with highest score
        const maxScore = Math.max(...Object.values(scores));
        if (maxScore > 0) {
            return Object.keys(scores).find(key => scores[key] === maxScore);
        }
        
        return 'general';
    }
    
    // Extract medications with dosages
    extractMedications(text) {
        const medicationPatterns = [
            /([a-zA-Z]+(?:in|ol|am|ex|ide|ate|one)?)\\s*(\\d+\\s*(?:mg|ml|g|units?))/gi,
            /([a-zA-Z]+)\\s*(\\d+\\s*(?:mg|ml|g|units?))\\s*(?:daily|bid|tid|qid)/gi
        ];
        
        const medications = [];
        
        medicationPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                medications.push({
                    name: match[1].trim(),
                    dosage: match[2] ? match[2].trim() : null
                });
            }
        });
        
        return medications;
    }
    
    // Extract vital signs
    extractVitalSigns(text) {
        const vitals = {};
        
        const vitalPatterns = {
            bloodPressure: /(?:bp|blood pressure)[:\\s]*(\\d{2,3}\/\\d{2,3})/gi,
            temperature: /(?:temp|temperature)[:\\s]*(\\d{2,3}\\.?\\d?)[°]?[fc]?/gi,
            pulse: /(?:pulse|heart rate|hr)[:\\s]*(\\d{2,3})/gi,
            respiratoryRate: /(?:rr|respiratory rate)[:\\s]*(\\d{1,2})/gi,
            oxygenSaturation: /(?:o2 sat|oxygen saturation|spo2)[:\\s]*(\\d{2,3})%?/gi
        };
        
        for (const [vital, pattern] of Object.entries(vitalPatterns)) {
            const matches = this.extractMatches(text, pattern);
            if (matches.length > 0) {
                vitals[vital] = matches[0]; // Take first match
            }
        }
        
        return vitals;
    }
    
    // Extract lab results
    extractLabResults(text) {
        const labResults = {};
        
        const labPatterns = {
            hemoglobin: /(?:hb|hemoglobin)[:\\s]*(\\d+\\.?\\d*)/gi,
            whiteBloodCell: /(?:wbc|white blood cell)[:\\s]*(\\d+\\.?\\d*)/gi,
            plateletCount: /(?:platelet|plt)[:\\s]*(\\d+\\.?\\d*)/gi,
            glucose: /(?:glucose|blood sugar)[:\\s]*(\\d+\\.?\\d*)/gi,
            cholesterol: /(?:cholesterol|chol)[:\\s]*(\\d+\\.?\\d*)/gi,
            creatinine: /(?:creatinine)[:\\s]*(\\d+\\.?\\d*)/gi
        };
        
        for (const [lab, pattern] of Object.entries(labPatterns)) {
            const matches = this.extractMatches(text, pattern);
            if (matches.length > 0) {
                labResults[lab] = parseFloat(matches[0]) || matches[0];
            }
        }
        
        return labResults;
    }
    
    // Create structured data for database storage
    createStructuredData(medicalInfo) {
        return {
            // Patient Demographics
            patient: {
                name: medicalInfo.patientName?.[0] || null,
                patientId: medicalInfo.patientId?.[0] || null,
                dateOfBirth: medicalInfo.dateOfBirth?.[0] || null,
                gender: medicalInfo.gender?.[0] || null,
                age: medicalInfo.age?.[0] || null,
                phone: medicalInfo.phone?.[0] || null,
                email: medicalInfo.email?.[0] || null,
                address: medicalInfo.address?.[0] || null,
                city: medicalInfo.city?.[0] || null,
                state: medicalInfo.state?.[0] || null
            },
            
            // Medical Data
            medical: {
                diagnosis: medicalInfo.diagnosis?.[0] || null,
                diseaseCategory: medicalInfo.diseaseCategory || null,
                symptoms: medicalInfo.symptoms || [],
                medications: medicalInfo.medications || [],
                allergies: medicalInfo.allergies?.[0] || null,
                vitalSigns: medicalInfo.vitalSigns || {},
                labResults: medicalInfo.labResults || {}
            },
            
            // Visit Information
            visit: {
                visitDate: medicalInfo.visitDate?.[0] || null,
                appointmentDate: medicalInfo.appointmentDate?.[0] || null
            }
        };
    }
    
    // Calculate confidence score
    calculateConfidence(medicalInfo) {
        let score = 0;
        let totalFields = 0;
        
        // Check for key medical information
        const keyFields = [
            'patientName', 'diagnosis', 'medications', 'vitalSigns',
            'symptoms', 'visitDate', 'patientId'
        ];
        
        keyFields.forEach(field => {
            totalFields++;
            if (medicalInfo[field] && 
                (Array.isArray(medicalInfo[field]) ? medicalInfo[field].length > 0 : 
                 typeof medicalInfo[field] === 'object' ? Object.keys(medicalInfo[field]).length > 0 : 
                 medicalInfo[field])) {
                score++;
            }
        });
        
        return Math.round((score / totalFields) * 100);
    }
}

module.exports = MedicalAI;