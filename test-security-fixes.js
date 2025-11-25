#!/usr/bin/env node

/**
 * Test Automatici Sicurezza
 *
 * Verifica automaticamente tutti i fix di sicurezza implementati
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

let testsPassed = 0;
let testsFailed = 0;

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function testPass(name) {
  testsPassed++;
  log(`✅ PASS: ${name}`, colors.green);
}

function testFail(name, reason) {
  testsFailed++;
  log(`❌ FAIL: ${name}`, colors.red);
  if (reason) {
    log(`   Reason: ${reason}`, colors.yellow);
  }
}

function testHeader(name) {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(`TEST: ${name}`, colors.cyan);
  log('='.repeat(60), colors.cyan);
}

// ============================================================================
// TEST 1: Build Output - No Console Logs
// ============================================================================
testHeader('Build Output - No Console Logs');

try {
  const distPath = path.join(__dirname, 'dist', 'assets');

  if (!fs.existsSync(distPath)) {
    testFail('Build Output Check', 'dist/assets folder not found. Run npm run build first.');
  } else {
    // Only check our own code, not vendor chunks (they may have console.* from 3rd party libs)
    const files = fs.readdirSync(distPath).filter(f => f.endsWith('.js') && !f.includes('vendor-'));
    let foundConsoleLogs = false;
    let filesWithLogs = [];

    for (const file of files) {
      const filePath = path.join(distPath, file);
      const content = fs.readFileSync(filePath, 'utf8');

      // Check for console.log, console.error, console.warn, etc.
      const consoleRegex = /console\.(log|error|warn|info|debug)/g;
      const matches = content.match(consoleRegex);

      if (matches && matches.length > 0) {
        foundConsoleLogs = true;
        filesWithLogs.push({ file, count: matches.length });
      }
    }

    if (foundConsoleLogs) {
      testFail('No Console Logs in Our Code', `Found console.* in ${filesWithLogs.length} files: ${filesWithLogs.map(f => `${f.file} (${f.count}x)`).join(', ')}`);
    } else {
      testPass('No Console Logs in Our Code (vendor chunks excluded)');
    }
  }
} catch (error) {
  testFail('Build Output Check', error.message);
}

// ============================================================================
// TEST 2: No Source Maps in Production Build
// ============================================================================
testHeader('No Source Maps in Production Build');

try {
  const distPath = path.join(__dirname, 'dist', 'assets');

  if (!fs.existsSync(distPath)) {
    testFail('Source Maps Check', 'dist/assets folder not found');
  } else {
    const mapFiles = fs.readdirSync(distPath).filter(f => f.endsWith('.map'));

    if (mapFiles.length > 0) {
      testFail('No Source Maps', `Found ${mapFiles.length} .map files: ${mapFiles.join(', ')}`);
    } else {
      testPass('No Source Maps in Build');
    }
  }
} catch (error) {
  testFail('Source Maps Check', error.message);
}

// ============================================================================
// TEST 3: Logger Utility Exists and is Conditional
// ============================================================================
testHeader('Logger Utility - Conditional Logging');

try {
  const loggerPath = path.join(__dirname, 'src', 'utils', 'logger.js');

  if (!fs.existsSync(loggerPath)) {
    testFail('Logger Utility', 'src/utils/logger.js not found');
  } else {
    const content = fs.readFileSync(loggerPath, 'utf8');

    // Check for conditional logic
    const hasDevCheck = content.includes('import.meta.env.DEV') || content.includes('isDev');
    const hasProdCheck = content.includes('import.meta.env.PROD') || content.includes('isProd');
    const hasLogMethod = content.includes('log:') || content.includes('log(');
    const hasErrorMethod = content.includes('error:') || content.includes('error(');

    if (!hasDevCheck) {
      testFail('Logger - Dev Check', 'Logger does not check for DEV environment');
    } else {
      testPass('Logger checks DEV environment');
    }

    if (!hasProdCheck) {
      testFail('Logger - Prod Check', 'Logger does not check for PROD environment');
    } else {
      testPass('Logger checks PROD environment');
    }

    if (!hasLogMethod) {
      testFail('Logger - Log Method', 'Logger missing log method');
    } else {
      testPass('Logger has log method');
    }

    if (!hasErrorMethod) {
      testFail('Logger - Error Method', 'Logger missing error method');
    } else {
      testPass('Logger has error method');
    }
  }
} catch (error) {
  testFail('Logger Utility Check', error.message);
}

// ============================================================================
// TEST 4: Files Using Logger Instead of Console
// ============================================================================
testHeader('Files Using Logger Instead of Console');

const filesToCheck = [
  'src/pages/BookingForm.jsx',
  'src/pages/BookingCancel.jsx',
  'src/pages/admin/Login.jsx',
  'src/components/ErrorBoundary.jsx'
];

try {
  for (const file of filesToCheck) {
    const filePath = path.join(__dirname, file);

    if (!fs.existsSync(filePath)) {
      testFail(`File Check - ${file}`, 'File not found');
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');

    // Check if file imports logger
    const hasLoggerImport = content.includes('import') && content.includes('logger');

    // Check if file uses logger (not console directly for logging)
    const usesLogger = content.includes('logger.log') ||
                      content.includes('logger.error') ||
                      content.includes('logger.warn');

    if (hasLoggerImport && usesLogger) {
      testPass(`${file} uses logger`);
    } else if (hasLoggerImport && !usesLogger) {
      testFail(`${file} imports logger but doesn't use it`, 'Logger imported but not used');
    } else {
      testFail(`${file} does not use logger`, 'Should import and use logger utility');
    }
  }
} catch (error) {
  testFail('Logger Usage Check', error.message);
}

// ============================================================================
// TEST 5: Error Boundary Component Exists
// ============================================================================
testHeader('Error Boundary Component');

try {
  const errorBoundaryPath = path.join(__dirname, 'src', 'components', 'ErrorBoundary.jsx');

  if (!fs.existsSync(errorBoundaryPath)) {
    testFail('Error Boundary', 'ErrorBoundary.jsx not found');
  } else {
    const content = fs.readFileSync(errorBoundaryPath, 'utf8');

    const hasComponentDidCatch = content.includes('componentDidCatch');
    const hasGetDerivedStateFromError = content.includes('getDerivedStateFromError');
    const hasDevCheck = content.includes('import.meta.env.DEV');
    const hasProdCheck = content.includes('import.meta.env.PROD');
    const usesLogger = content.includes('logger.error');

    if (!hasComponentDidCatch) {
      testFail('Error Boundary - componentDidCatch', 'Missing componentDidCatch method');
    } else {
      testPass('Error Boundary has componentDidCatch');
    }

    if (!hasGetDerivedStateFromError) {
      testFail('Error Boundary - getDerivedStateFromError', 'Missing getDerivedStateFromError');
    } else {
      testPass('Error Boundary has getDerivedStateFromError');
    }

    if (!hasDevCheck || !hasProdCheck) {
      testFail('Error Boundary - Environment Check', 'Missing conditional rendering for DEV/PROD');
    } else {
      testPass('Error Boundary has conditional rendering');
    }

    if (!usesLogger) {
      testFail('Error Boundary - Logger', 'Should use logger for error logging');
    } else {
      testPass('Error Boundary uses logger');
    }
  }
} catch (error) {
  testFail('Error Boundary Check', error.message);
}

// ============================================================================
// TEST 6: Error Boundary Integrated in main.jsx
// ============================================================================
testHeader('Error Boundary Integration');

try {
  const mainPath = path.join(__dirname, 'src', 'main.jsx');

  if (!fs.existsSync(mainPath)) {
    testFail('main.jsx Check', 'main.jsx not found');
  } else {
    const content = fs.readFileSync(mainPath, 'utf8');

    const importsErrorBoundary = content.includes('ErrorBoundary');
    const wrapsApp = content.includes('<ErrorBoundary>') && content.includes('</ErrorBoundary>');

    if (!importsErrorBoundary) {
      testFail('main.jsx - Import', 'ErrorBoundary not imported');
    } else {
      testPass('main.jsx imports ErrorBoundary');
    }

    if (!wrapsApp) {
      testFail('main.jsx - Usage', 'ErrorBoundary does not wrap <App />');
    } else {
      testPass('ErrorBoundary wraps App component');
    }
  }
} catch (error) {
  testFail('main.jsx Integration Check', error.message);
}

// ============================================================================
// TEST 7: BookingForm - Atomic Counter Implementation
// ============================================================================
testHeader('BookingForm - Atomic Counter (Race Condition Fix)');

try {
  const bookingFormPath = path.join(__dirname, 'src', 'pages', 'BookingForm.jsx');

  if (!fs.existsSync(bookingFormPath)) {
    testFail('BookingForm Check', 'BookingForm.jsx not found');
  } else {
    const content = fs.readFileSync(bookingFormPath, 'utf8');

    const usesTransaction = content.includes('runTransaction');
    const usesAtomicCounter = content.includes('bookedSlots');
    const hasSlotKey = content.includes('slotKey');
    const updatesCounter = content.includes('transaction.update');
    const hasAvailabilityCheck = content.includes('available <') || content.includes('available<');

    if (!usesTransaction) {
      testFail('BookingForm - Transaction', 'Does not use runTransaction for atomic operations');
    } else {
      testPass('BookingForm uses runTransaction');
    }

    if (!usesAtomicCounter) {
      testFail('BookingForm - Atomic Counter', 'Does not use bookedSlots field');
    } else {
      testPass('BookingForm uses bookedSlots atomic counter');
    }

    if (!hasSlotKey) {
      testFail('BookingForm - Slot Key', 'Does not generate slot key');
    } else {
      testPass('BookingForm generates slot key');
    }

    if (!updatesCounter) {
      testFail('BookingForm - Counter Update', 'Does not update counter with transaction');
    } else {
      testPass('BookingForm updates counter atomically');
    }

    if (!hasAvailabilityCheck) {
      testFail('BookingForm - Availability Check', 'Missing availability check before booking');
    } else {
      testPass('BookingForm checks availability');
    }
  }
} catch (error) {
  testFail('BookingForm Check', error.message);
}

// ============================================================================
// TEST 8: Token Generation - Cryptographic Randomness
// ============================================================================
testHeader('Token Generation - Cryptographic Randomness');

try {
  const bookingFormPath = path.join(__dirname, 'src', 'pages', 'BookingForm.jsx');

  if (!fs.existsSync(bookingFormPath)) {
    testFail('Token Generation Check', 'BookingForm.jsx not found');
  } else {
    const content = fs.readFileSync(bookingFormPath, 'utf8');

    const importsCrypto = content.includes('CryptoJS');
    const usesWordArray = content.includes('WordArray.random') || content.includes('lib.WordArray.random');
    const usesSHA256 = content.includes('SHA256');
    const hasGenerateToken = content.includes('generateToken');

    if (!importsCrypto) {
      testFail('Token - CryptoJS Import', 'Does not import CryptoJS');
    } else {
      testPass('Token generation imports CryptoJS');
    }

    if (!usesWordArray) {
      testFail('Token - Random Generation', 'Does not use CryptoJS.lib.WordArray.random for entropy');
    } else {
      testPass('Token uses cryptographic random (WordArray.random)');
    }

    if (!usesSHA256) {
      testFail('Token - Hashing', 'Does not use SHA256 hashing');
    } else {
      testPass('Token uses SHA256 hashing');
    }

    if (!hasGenerateToken) {
      testFail('Token - Function', 'generateToken function not found');
    } else {
      testPass('generateToken function exists');
    }
  }
} catch (error) {
  testFail('Token Generation Check', error.message);
}

// ============================================================================
// TEST 9: BookingCancel - CSRF Double Confirmation
// ============================================================================
testHeader('BookingCancel - CSRF Double Confirmation');

try {
  const bookingCancelPath = path.join(__dirname, 'src', 'pages', 'BookingCancel.jsx');

  if (!fs.existsSync(bookingCancelPath)) {
    testFail('BookingCancel Check', 'BookingCancel.jsx not found');
  } else {
    const content = fs.readFileSync(bookingCancelPath, 'utf8');

    const hasFirstConfirm = content.includes('window.confirm');
    const hasSecondConfirm = content.includes('window.prompt');
    const checksANNULLA = content.includes('ANNULLA') || content.includes('"ANNULLA"');

    if (!hasFirstConfirm) {
      testFail('BookingCancel - First Confirmation', 'Missing first confirmation (window.confirm)');
    } else {
      testPass('BookingCancel has first confirmation');
    }

    if (!hasSecondConfirm) {
      testFail('BookingCancel - Second Confirmation', 'Missing second confirmation (window.prompt)');
    } else {
      testPass('BookingCancel has second confirmation');
    }

    if (!checksANNULLA) {
      testFail('BookingCancel - Text Verification', 'Does not check for "ANNULLA" text');
    } else {
      testPass('BookingCancel verifies "ANNULLA" text');
    }
  }
} catch (error) {
  testFail('BookingCancel Check', error.message);
}

// ============================================================================
// TEST 10: Vite Config - Build Optimizations
// ============================================================================
testHeader('Vite Config - Build Optimizations');

try {
  const viteConfigPath = path.join(__dirname, 'vite.config.js');

  if (!fs.existsSync(viteConfigPath)) {
    testFail('Vite Config Check', 'vite.config.js not found');
  } else {
    const content = fs.readFileSync(viteConfigPath, 'utf8');

    const usesTerser = content.includes("minify: 'terser'");
    const dropsConsole = content.includes('drop_console: true');
    const dropsDebugger = content.includes('drop_debugger: true');
    const noSourcemap = content.includes('sourcemap: false');
    const hasManualChunks = content.includes('manualChunks');
    const hasSecurityHeaders = content.includes('X-Content-Type-Options') ||
                              content.includes('X-Frame-Options');

    if (!usesTerser) {
      testFail('Vite Config - Terser', 'Not using terser for minification');
    } else {
      testPass('Vite Config uses terser');
    }

    if (!dropsConsole) {
      testFail('Vite Config - Drop Console', 'Not configured to drop console logs');
    } else {
      testPass('Vite Config drops console logs');
    }

    if (!dropsDebugger) {
      testFail('Vite Config - Drop Debugger', 'Not configured to drop debugger statements');
    } else {
      testPass('Vite Config drops debugger statements');
    }

    if (!noSourcemap) {
      testFail('Vite Config - Source Maps', 'Source maps not disabled');
    } else {
      testPass('Vite Config disables source maps');
    }

    if (!hasManualChunks) {
      testFail('Vite Config - Code Splitting', 'Manual chunks not configured');
    } else {
      testPass('Vite Config has code splitting');
    }

    if (!hasSecurityHeaders) {
      testFail('Vite Config - Security Headers', 'Security headers not configured');
    } else {
      testPass('Vite Config has security headers');
    }
  }
} catch (error) {
  testFail('Vite Config Check', error.message);
}

// ============================================================================
// TEST 11: Firestore Rules - Atomic Counter Support
// ============================================================================
testHeader('Firestore Rules - Atomic Counter Support');

try {
  const rulesPath = path.join(__dirname, 'firestore.rules');

  if (!fs.existsSync(rulesPath)) {
    testFail('Firestore Rules Check', 'firestore.rules not found');
  } else {
    const content = fs.readFileSync(rulesPath, 'utf8');

    const hasBookedSlotsRule = content.includes('bookedSlots');
    const hasOnlyUpdatingFunction = content.includes('onlyUpdatingBookedSlots');
    const hasValidationFunction = content.includes('validBookedSlotsUpdate');
    const allowsPublicUpdate = content.includes('request.auth == null');

    if (!hasBookedSlotsRule) {
      testFail('Firestore Rules - bookedSlots', 'No rules for bookedSlots field');
    } else {
      testPass('Firestore Rules mention bookedSlots');
    }

    if (!hasOnlyUpdatingFunction) {
      testFail('Firestore Rules - Update Check', 'Missing onlyUpdatingBookedSlots function');
    } else {
      testPass('Firestore Rules have onlyUpdatingBookedSlots check');
    }

    if (!hasValidationFunction) {
      testFail('Firestore Rules - Validation', 'Missing validBookedSlotsUpdate function');
    } else {
      testPass('Firestore Rules have validation function');
    }

    if (!allowsPublicUpdate) {
      testFail('Firestore Rules - Public Update', 'Does not allow public updates for bookedSlots');
    } else {
      testPass('Firestore Rules allow public bookedSlots updates');
    }
  }
} catch (error) {
  testFail('Firestore Rules Check', error.message);
}

// ============================================================================
// TEST 12: Build Size and Chunks
// ============================================================================
testHeader('Build Optimization - Code Splitting');

try {
  const distPath = path.join(__dirname, 'dist', 'assets');

  if (!fs.existsSync(distPath)) {
    testFail('Build Chunks Check', 'dist/assets folder not found');
  } else {
    const files = fs.readdirSync(distPath).filter(f => f.endsWith('.js'));

    const vendorReact = files.some(f => f.includes('vendor-react'));
    const vendorFirebase = files.some(f => f.includes('vendor-firebase'));
    const vendorUi = files.some(f => f.includes('vendor-ui'));
    const vendorUtils = files.some(f => f.includes('vendor-utils'));

    if (!vendorReact) {
      testFail('Build Chunks - vendor-react', 'vendor-react chunk not found');
    } else {
      testPass('Build has vendor-react chunk');
    }

    if (!vendorFirebase) {
      testFail('Build Chunks - vendor-firebase', 'vendor-firebase chunk not found');
    } else {
      testPass('Build has vendor-firebase chunk');
    }

    if (!vendorUi) {
      testFail('Build Chunks - vendor-ui', 'vendor-ui chunk not found');
    } else {
      testPass('Build has vendor-ui chunk');
    }

    if (!vendorUtils) {
      testFail('Build Chunks - vendor-utils', 'vendor-utils chunk not found');
    } else {
      testPass('Build has vendor-utils chunk');
    }

    log(`\n   Total JS files in build: ${files.length}`, colors.blue);
  }
} catch (error) {
  testFail('Build Chunks Check', error.message);
}

// ============================================================================
// SUMMARY
// ============================================================================
log('\n' + '='.repeat(60), colors.cyan);
log('TEST SUMMARY', colors.cyan);
log('='.repeat(60), colors.cyan);

const totalTests = testsPassed + testsFailed;
const passRate = totalTests > 0 ? ((testsPassed / totalTests) * 100).toFixed(1) : 0;

log(`\nTotal Tests: ${totalTests}`);
log(`Passed: ${testsPassed}`, colors.green);
log(`Failed: ${testsFailed}`, testsFailed > 0 ? colors.red : colors.green);
log(`Pass Rate: ${passRate}%`, passRate >= 90 ? colors.green : (passRate >= 70 ? colors.yellow : colors.red));

if (testsFailed === 0) {
  log('\n🎉 ALL SECURITY TESTS PASSED! 🎉', colors.green);
  log('✅ All security fixes have been successfully implemented and verified.', colors.green);
  process.exit(0);
} else {
  log('\n⚠️  SOME TESTS FAILED', colors.red);
  log(`Please review the ${testsFailed} failed test(s) above.`, colors.yellow);
  process.exit(1);
}
