#!/usr/bin/env node

/**
 * Security Check Script
 * Verifica che tutte le misure di sicurezza siano in place
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

let issues = 0;
let warnings = 0;

log('\n🔒 === SECURITY CHECK - Cultura Immersiva ===\n', 'blue');

// 1. Check .env file is not tracked by git
info('1. Checking .env configuration...');
try {
  const gitFiles = execSync('git ls-files .env 2>/dev/null || echo ""', {
    cwd: rootDir,
    encoding: 'utf-8'
  }).trim();

  if (gitFiles.includes('.env')) {
    error('.env file is tracked by git! Remove it immediately:');
    console.log('   git rm --cached .env');
    console.log('   git commit -m "Remove .env from tracking"');
    issues++;
  } else {
    success('.env is not tracked by git');
  }

  // Check if .env exists locally
  if (existsSync(join(rootDir, '.env'))) {
    success('.env file exists locally');
  } else {
    warning('.env file not found (may be in production)');
    warnings++;
  }
} catch (e) {
  warning('Could not check git status (not a git repo?)');
  warnings++;
}

// 2. Check for hardcoded passwords
info('\n2. Checking for hardcoded passwords...');
try {
  const createAdminFile = readFileSync(
    join(rootDir, 'scripts', 'create-admin.js'),
    'utf-8'
  );

  if (createAdminFile.includes('const password =') &&
      createAdminFile.includes('readline')) {
    success('create-admin.js uses interactive password input');
  } else if (createAdminFile.includes('const password = \'')) {
    error('Hardcoded password found in create-admin.js!');
    issues++;
  } else {
    warning('Could not verify password input method');
    warnings++;
  }
} catch (e) {
  error(`Could not read create-admin.js: ${e.message}`);
  issues++;
}

// 3. Check Security Headers in firebase.json
info('\n3. Checking security headers...');
try {
  const firebaseConfig = JSON.parse(
    readFileSync(join(rootDir, 'firebase.json'), 'utf-8')
  );

  const headers = firebaseConfig.hosting?.headers?.[0]?.headers || [];
  const requiredHeaders = [
    'X-Frame-Options',
    'X-Content-Type-Options',
    'X-XSS-Protection',
    'Strict-Transport-Security',
    'Content-Security-Policy'
  ];

  const foundHeaders = headers.map(h => h.key);

  requiredHeaders.forEach(header => {
    if (foundHeaders.includes(header)) {
      success(`${header} header configured`);
    } else {
      error(`${header} header missing!`);
      issues++;
    }
  });
} catch (e) {
  error(`Could not read firebase.json: ${e.message}`);
  issues++;
}

// 4. Check npm audit
info('\n4. Running npm audit...');
try {
  execSync('npm audit --production --audit-level=moderate', {
    cwd: rootDir,
    stdio: 'inherit'
  });
  success('No vulnerabilities found in dependencies');
} catch (e) {
  error('Vulnerabilities found in dependencies!');
  console.log('   Run: npm audit fix');
  issues++;
}

// 5. Check Firestore Rules
info('\n5. Checking Firestore rules...');
try {
  const firestoreRules = readFileSync(
    join(rootDir, 'firestore.rules'),
    'utf-8'
  );

  if (firestoreRules.includes('allow read, write: if false')) {
    success('Default deny rule found');
  } else {
    warning('Default deny rule not found');
    warnings++;
  }

  if (firestoreRules.includes('request.auth != null')) {
    success('Authentication check found in rules');
  } else {
    warning('No authentication check found in rules');
    warnings++;
  }
} catch (e) {
  error(`Could not read firestore.rules: ${e.message}`);
  issues++;
}

// 6. Check for dangerouslySetInnerHTML
info('\n6. Checking for XSS vulnerabilities...');
try {
  const result = execSync(
    'grep -r "dangerouslySetInnerHTML\\|innerHTML" src/ 2>/dev/null || echo ""',
    { cwd: rootDir, encoding: 'utf-8' }
  ).trim();

  if (result) {
    error('Found potentially unsafe HTML usage:');
    console.log(result);
    issues++;
  } else {
    success('No dangerouslySetInnerHTML or innerHTML usage found');
  }
} catch (e) {
  warning('Could not check for XSS vulnerabilities');
  warnings++;
}

// 7. Check token expiry
info('\n7. Checking token expiry configuration...');
try {
  const bookingFormFile = readFileSync(
    join(rootDir, 'src', 'pages', 'BookingForm.jsx'),
    'utf-8'
  );

  if (bookingFormFile.includes('tokenExpiry.setDate(tokenExpiry.getDate() + 3)')) {
    success('Token expiry set to 3 days');
  } else if (bookingFormFile.includes('tokenExpiry.setDate(tokenExpiry.getDate() + 7)')) {
    warning('Token expiry is 7 days (consider reducing to 3)');
    warnings++;
  } else {
    warning('Could not verify token expiry setting');
    warnings++;
  }
} catch (e) {
  warning(`Could not read BookingForm.jsx: ${e.message}`);
  warnings++;
}

// 8. Check rate limiting
info('\n8. Checking rate limiting...');
try {
  const functionsFile = readFileSync(
    join(rootDir, 'functions', 'index.js'),
    'utf-8'
  );

  if (functionsFile.includes('MAX_EMAILS_PER_IP')) {
    success('Email rate limiting implemented');
  } else {
    error('Email rate limiting not found!');
    issues++;
  }

  const loginFile = readFileSync(
    join(rootDir, 'src', 'pages', 'admin', 'Login.jsx'),
    'utf-8'
  );

  if (loginFile.includes('failedLoginAttempts')) {
    success('Login rate limiting implemented');
  } else {
    error('Login rate limiting not found!');
    issues++;
  }
} catch (e) {
  error(`Could not verify rate limiting: ${e.message}`);
  issues++;
}

// 9. Check validation
info('\n9. Checking input validation...');
try {
  const bookingFormFile = readFileSync(
    join(rootDir, 'src', 'pages', 'BookingForm.jsx'),
    'utf-8'
  );

  if (bookingFormFile.includes('validateForm')) {
    success('Client-side validation in BookingForm');
  } else {
    error('No client-side validation in BookingForm!');
    issues++;
  }

  const bookingManageFile = readFileSync(
    join(rootDir, 'src', 'pages', 'BookingManage.jsx'),
    'utf-8'
  );

  if (bookingManageFile.includes('validateForm')) {
    success('Client-side validation in BookingManage');
  } else {
    error('No client-side validation in BookingManage!');
    issues++;
  }

  const functionsFile = readFileSync(
    join(rootDir, 'functions', 'index.js'),
    'utf-8'
  );

  if (functionsFile.includes('validateBookingData')) {
    success('Server-side validation in Cloud Functions');
  } else {
    error('No server-side validation in Cloud Functions!');
    issues++;
  }
} catch (e) {
  error(`Could not verify validation: ${e.message}`);
  issues++;
}

// Summary
log('\n📊 === SUMMARY ===\n', 'blue');

if (issues === 0 && warnings === 0) {
  success('All security checks passed! 🎉');
} else {
  if (issues > 0) {
    error(`Found ${issues} critical issue(s)`);
  }
  if (warnings > 0) {
    warning(`Found ${warnings} warning(s)`);
  }

  log('\n📚 For more information, see SECURITY.md', 'blue');
}

log('');

// Exit with appropriate code
process.exit(issues > 0 ? 1 : 0);
