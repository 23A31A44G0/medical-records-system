#!/bin/bash

echo "🚀 Setting up Medical Records System for Production..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p uploads
mkdir -p logs

# Set up environment variables
if [ ! -f .env ]; then
    echo "⚙️ Copying environment template..."
    cp .env.example .env
    echo "⚠️ Please edit .env with your production values!"
fi

# Set up database
echo "🗄️ Setting up database..."
node setup-mysql.js

# Set correct permissions for uploads
chmod 755 uploads/

echo "✅ Production setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your production values"
echo "2. Configure your domain and SSL certificate"  
echo "3. Start the application with: npm start"
echo "4. Set up a reverse proxy (Nginx) for production"