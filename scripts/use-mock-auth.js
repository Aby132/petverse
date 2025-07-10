#!/usr/bin/env node

/**
 * Switch to Mock Authentication Script
 * This script switches the app back to using mock authentication
 */

const fs = require('fs');
const path = require('path');

const APP_FILE = 'src/App.js';

console.log('🔄 Switching to mock authentication...');

// Update App.js to use mock authentication
let appContent = fs.readFileSync(APP_FILE, 'utf8');

// Replace real auth imports with mock auth imports
appContent = appContent.replace(
    /import { Amplify } from 'aws-amplify';/g,
    "// import { Amplify } from 'aws-amplify';"
);

appContent = appContent.replace(
    /import { AuthProvider } from '\.\/contexts\/AuthContext';/g,
    "// import { AuthProvider } from './contexts/AuthContext';"
);

appContent = appContent.replace(
    /\/\/ import { AuthProvider } from '\.\/contexts\/MockAuthContext'; \/\/ Using mock for development/g,
    "import { AuthProvider } from './contexts/MockAuthContext'; // Using mock for development"
);

appContent = appContent.replace(
    /import awsConfig from '\.\/aws-config';/g,
    "// import awsConfig from './aws-config';"
);

appContent = appContent.replace(
    /\/\/ Configure AWS Amplify/g,
    "// Configure AWS Amplify (commented out for development with mock auth)"
);

appContent = appContent.replace(
    /Amplify\.configure\(awsConfig\);/g,
    "// Amplify.configure(awsConfig);"
);

fs.writeFileSync(APP_FILE, appContent);
console.log('✅ Updated src/App.js to use mock authentication');

console.log('');
console.log('🎉 Switched to mock authentication!');
console.log('');
console.log('🧪 Mock Test Credentials:');
console.log('========================');
console.log('Admin Account:');
console.log('   Email: admin@petverse.com');
console.log('   Password: admin123');
console.log('   Role: admin');
console.log('');
console.log('User Account:');
console.log('   Email: user@petverse.com');
console.log('   Password: user123');
console.log('   Role: user');
console.log('');
console.log('📝 Registration Testing:');
console.log('   Use any email/password');
console.log('   Use any 6-digit code for confirmation (e.g., 123456)');
console.log('');
console.log('🚀 Next Steps:');
console.log('1. Restart your development server: npm start');
console.log('2. Test with mock credentials above');
console.log('');
console.log('🔄 To switch back to AWS authentication:');
console.log('   node scripts/update-config.js');
