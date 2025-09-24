const MySQLManager = require('./mysql-manager');

async function setupMySQL() {
    console.log('🚀 Setting up MySQL for AI-extracted medical data...\n');
    
    const mysqlManager = new MySQLManager();
    
    try {
        // Test connection
        console.log('1️⃣ Testing MySQL connection...');
        const isConnected = await mysqlManager.testConnection();
        
        if (!isConnected) {
            console.log('\n❌ MySQL connection failed!');
            console.log('\n📋 Setup Instructions:');
            console.log('1. Make sure MySQL is installed and running');
            console.log('2. Start MySQL service: net start mysql (Windows) or brew services start mysql (Mac)');
            console.log('3. Update credentials in mysql-manager.js:');
            console.log('   - host: localhost');
            console.log('   - port: 3306');
            console.log('   - user: root (or your MySQL username)');
            console.log('   - password: (your MySQL password)');
            console.log('\n🔗 Test connection: mysql -u root -p');
            return;
        }
        
        // Initialize database and tables
        console.log('2️⃣ Creating database and tables...');
        await mysqlManager.initializeDatabase();
        
        console.log('3️⃣ Setup completed successfully! ✅\n');
        
        // Show table information
        console.log('📊 Created MySQL Tables:');
        console.log('├── patients (patient demographics)');
        console.log('├── medical_records (diagnoses, symptoms)');
        console.log('├── vital_signs (blood pressure, heart rate, etc.)');
        console.log('├── medications (prescriptions and dosages)');
        console.log('├── lab_results (test results and values)');
        console.log('└── ai_processing_log (AI processing history)\n');
        
        console.log('🎯 Ready to receive AI-extracted data!');
        console.log('📈 Data will be automatically saved to MySQL when documents are processed.\n');
        
        console.log('🔗 Test endpoints:');
        console.log('• http://localhost:3000/api/mysql/test - Test connection');
        console.log('• http://localhost:3000/api/mysql/patients - View all patients');
        console.log('• http://localhost:3000/api/mysql/patient/{id} - View patient data');
        
    } catch (error) {
        console.error('\n❌ Setup failed:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 MySQL server is not running. Please start MySQL:');
            console.log('Windows: net start mysql');
            console.log('Mac: brew services start mysql');
            console.log('Linux: sudo systemctl start mysql');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('\n💡 Access denied. Please check your MySQL credentials in mysql-manager.js');
        }
    } finally {
        await mysqlManager.close();
    }
}

// Run setup
setupMySQL();