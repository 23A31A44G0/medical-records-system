# 🏥 AI-Powered Medical Records System with MySQL Integration

## 🚀 **MySQL Setup Instructions**

### **Prerequisites:**
1. **MySQL Server** installed and running on `localhost:3306`
2. **Node.js** and npm installed
3. All npm packages installed (`npm install`)

### **Step 1: Configure MySQL Credentials**
1. Open `mysql-manager.js`
2. Update the database configuration:
```javascript
const dbConfig = {
    host: 'localhost',
    port: 3306,
    user: 'root',          // ← Your MySQL username
    password: '1212', // ← Your MySQL password
    database: 'medical_records_ai'
};
```

### **Step 2: Set Up MySQL Database**
Run the setup script to create database and tables:
```bash
node setup-mysql.js
```

### **Step 3: Migrate Existing Data (Optional)**
If you have existing reports, migrate them to MySQL:
```bash
node migrate-to-mysql.js
```

### **Step 4: Start the Application**
```bash
node server.js
```

## 📊 **MySQL Database Schema**

The system automatically creates these tables:

### **🧑‍⚕️ Patients Table**
- Patient demographics (name, DOB, contact info)
- Auto-extracted from AI document processing

### **📋 Medical Records Table**  
- Diagnoses, symptoms, disease categories
- Visit dates, confidence scores
- Links to patient records

### **💓 Vital Signs Table**
- Blood pressure, heart rate, temperature
- Respiratory rate, oxygen saturation
- Time-stamped vital measurements

### **💊 Medications Table**
- Medication names, dosages, frequencies
- Prescription dates and durations
- Patient medication history

### **🧪 Lab Results Table**
- Test names, values, units, reference ranges
- Status indicators (Normal/Abnormal/Critical)
- Historical lab data tracking

### **🤖 AI Processing Log Table**
- Processing status and confidence scores
- Extracted text and processing times
- Error tracking and debugging info

## 🔗 **API Endpoints**

### **MySQL Data Access:**
- `GET /api/mysql/test` - Test MySQL connection
- `GET /api/mysql/patients` - Get all patients from MySQL
- `GET /api/mysql/patient/:patientId` - Get specific patient data

### **Example Response:**
```json
{
  "success": true,
  "data": {
    "patient": {
      "id": 1,
      "patient_id": "PAT001",
      "name": "John Smith",
      "date_of_birth": "1985-01-15",
      "gender": "Male"
    },
    "records": [...],
    "vitals": [...],
    "medications": [...],
    "labResults": [...]
  },
  "source": "MySQL"
}
```

## 🎯 **How It Works**

1. **Document Upload**: Staff uploads medical documents (PDF/JPG/TXT)
2. **AI Processing**: System extracts text and medical information
3. **Dual Storage**: Data saved to both SQLite (local) and MySQL (server)
4. **Structured Data**: AI organizes information into proper medical categories
5. **API Access**: Query structured data via REST endpoints

## 🛠️ **Troubleshooting**

### **MySQL Connection Issues:**
```bash
# Check if MySQL is running
mysql -u root -p

# Start MySQL service (Windows)
net start mysql

# Start MySQL service (macOS)
brew services start mysql

# Start MySQL service (Linux)
sudo systemctl start mysql
```

### **Common Errors:**
- **Access denied**: Check username/password in `mysql-manager.js`
- **Connection refused**: MySQL server not running
- **Database not found**: Run `setup-mysql.js` first

## 📈 **Data Flow Diagram**

```
📄 Document Upload
    ↓
🤖 AI Processing (OCR + NLP)
    ↓
📊 Structured Data Extraction
    ↓
🏪 Dual Database Storage
    ├── SQLite (Local/Backup)
    └── MySQL (Server/Production)
    ↓
🌐 API Access & Queries
```

## 🎉 **Features**

✅ **Automatic AI extraction** of medical information  
✅ **Dual database storage** (SQLite + MySQL)  
✅ **RESTful API** for data access  
✅ **Structured medical data** (patients, vitals, meds, labs)  
✅ **Real-time processing** status tracking  
✅ **Confidence scoring** for AI extractions  
✅ **Error handling** and logging  

## 🔮 **Next Steps**

After MySQL integration is working:
- [ ] FHIR compatibility for healthcare interoperability
- [ ] Advanced analytics and reporting
- [ ] Real-time data synchronization
- [ ] Multi-hospital deployment support

---

**🏥 Your medical records system is now powered by AI and MySQL!** 🚀