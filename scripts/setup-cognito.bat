@echo off
echo 🚀 Setting up AWS Cognito for PetVerse...
echo.
echo This will create:
echo - Cognito User Pool with custom role attribute
echo - User Pool Client for web app
echo - Identity Pool for AWS service access
echo - IAM roles for authentication
echo - Admin test user (admin@petverse.com / Admin123!)
echo.
pause
echo.
powershell -ExecutionPolicy Bypass -File "scripts/setup-cognito.ps1"
echo.
echo 🔧 Updating app configuration...
node scripts/update-config.js
echo.
echo ✅ Setup complete! Restart your development server with: npm start
pause
