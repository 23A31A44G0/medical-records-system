// Production setup script
const fs = require('fs-extra');
const path = require('path');

async function setupProduction() {
    console.log('🚀 Setting up Medical Records System for Production...');
    
    try {
        // Ensure required directories exist
        await fs.ensureDir('./uploads');
        await fs.ensureDir('./logs');
        
        // Set up environment file if it doesn't exist
        if (!fs.existsSync('.env')) {
            await fs.copy('.env.example', '.env');
            console.log('⚙️ Created .env file from template');
            console.log('⚠️ Please edit .env with your production values!');
        }
        
        // Create logs directory structure
        await fs.ensureDir('./logs/access');
        await fs.ensureDir('./logs/error');
        
        console.log('✅ Production setup complete!');
        console.log('');
        console.log('Next steps:');
        console.log('1. Edit .env file with your production values');
        console.log('2. Configure your MySQL database');
        console.log('3. Set up your domain and SSL certificate');
        console.log('4. Start with: npm start');
        
    } catch (error) {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    }
}

// Run setup if called directly
if (require.main === module) {
    setupProduction();
}

module.exports = setupProduction;