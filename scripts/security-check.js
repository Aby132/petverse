#!/usr/bin/env node

/**
 * Security Check Script
 * Run this before committing to ensure no secrets are in the codebase
 */

const fs = require('fs');
const path = require('path');

// Files that should never contain secrets
const SENSITIVE_FILES = [
  'src/aws-config.js',
  'src/services/cartService.js'
];

// Files that should be in .gitignore
const GITIGNORE_FILES = [
  'src/config/environment.js'
];

// Patterns that indicate secrets
const SECRET_PATTERNS = [
  /password\s*[:=]\s*['"`][^'"`]+['"`]/gi,
  /secret\s*[:=]\s*['"`][^'"`]+['"`]/gi,
  /key\s*[:=]\s*['"`][^'"`]+['"`]/gi,
  /token\s*[:=]\s*['"`][^'"`]+['"`]/gi,
  /credential\s*[:=]\s*['"`][^'"`]+['"`]/gi,
  /api[_-]?key\s*[:=]\s*['"`][^'"`]+['"`]/gi,
  /client[_-]?secret\s*[:=]\s*['"`][^'"`]+['"`]/gi,
  /access[_-]?key\s*[:=]\s*['"`][^'"`]+['"`]/gi,
];

// Check if environment.js file exists
function checkEnvironmentFile() {
  const envPath = path.join(process.cwd(), 'src/config/environment.js');
  if (!fs.existsSync(envPath)) {
    console.error('❌ src/config/environment.js file not found!');
    console.error('   Copy environment.template.js to environment.js and add your secrets');
    return false;
  }
  console.log('✅ environment.js file exists');
  return true;
}

// Check if sensitive files are in .gitignore
function checkGitignore() {
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    console.error('❌ .gitignore file not found!');
    return false;
  }

  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  let allFilesIgnored = true;

  GITIGNORE_FILES.forEach(file => {
    if (!gitignoreContent.includes(file)) {
      console.error(`❌ ${file} not found in .gitignore!`);
      allFilesIgnored = false;
    }
  });

  if (allFilesIgnored) {
    console.log('✅ All sensitive files are in .gitignore');
    return true;
  }
  return false;
}

// Check for secrets in files
function checkForSecrets() {
  let hasSecrets = false;

  SENSITIVE_FILES.forEach(filePath => {
    const fullPath = path.join(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  ${filePath} not found`);
      return;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    let fileHasSecrets = false;

    SECRET_PATTERNS.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        console.error(`❌ Potential secret found in ${filePath}:`);
        matches.forEach(match => {
          console.error(`   ${match.trim()}`);
        });
        fileHasSecrets = true;
        hasSecrets = true;
      }
    });

    if (!fileHasSecrets) {
      console.log(`✅ ${filePath} looks clean`);
    }
  });

  return !hasSecrets;
}

// Check for hardcoded URLs that should be environment variables
function checkHardcodedUrls() {
  const cartServicePath = path.join(process.cwd(), 'src/services/cartService.js');
  if (fs.existsSync(cartServicePath)) {
    const content = fs.readFileSync(cartServicePath, 'utf8');
    
    // Check for hardcoded API URLs
    const hardcodedUrlPattern = /https:\/\/[a-zA-Z0-9.-]+\/prod/;
    if (hardcodedUrlPattern.test(content)) {
      console.error('❌ Hardcoded API URL found in cartService.js');
      console.error('   Use environment variables instead');
      return false;
    }
  }
  
  console.log('✅ No hardcoded URLs found');
  return true;
}

// Main security check
function runSecurityCheck() {
  console.log('🔐 Running Security Check...\n');

  const checks = [
    checkEnvironmentFile(),
    checkGitignore(),
    checkForSecrets(),
    checkHardcodedUrls()
  ];

  const allPassed = checks.every(check => check === true);

  console.log('\n' + '='.repeat(50));
  
  if (allPassed) {
    console.log('✅ All security checks passed!');
    console.log('   Your code is safe to commit.');
    process.exit(0);
  } else {
    console.log('❌ Security issues found!');
    console.log('   Fix the issues above before committing.');
    process.exit(1);
  }
}

// Run the check
runSecurityCheck();
