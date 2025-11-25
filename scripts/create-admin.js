import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import * as readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') });

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Create readline interface for secure input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to prompt for input
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Function to validate password strength
function validatePassword(password) {
  if (password.length < 12) {
    return 'La password deve essere lunga almeno 12 caratteri';
  }
  if (!/[A-Z]/.test(password)) {
    return 'La password deve contenere almeno una lettera maiuscola';
  }
  if (!/[a-z]/.test(password)) {
    return 'La password deve contenere almeno una lettera minuscola';
  }
  if (!/[0-9]/.test(password)) {
    return 'La password deve contenere almeno un numero';
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return 'La password deve contenere almeno un carattere speciale';
  }
  return null;
}

async function createAdmin() {
  console.log('\n🔐 === CREAZIONE UTENTE ADMIN ===\n');
  console.log('⚠️  ATTENZIONE: Questo script crea un account amministratore.');
  console.log('   Assicurati di usare una password sicura!\n');

  try {
    // Get email
    const email = await prompt('📧 Email admin (default: admin@culturaimmersiva.it): ');
    const adminEmail = email.trim() || 'admin@culturaimmersiva.it';

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      console.error('❌ Email non valida\n');
      rl.close();
      process.exit(1);
    }

    // Get password with validation
    let password = '';
    let validationError = null;

    do {
      password = await prompt('\n🔑 Password (minimo 12 caratteri, maiuscole, minuscole, numeri, caratteri speciali): ');
      validationError = validatePassword(password);

      if (validationError) {
        console.error(`❌ ${validationError}`);
      }
    } while (validationError);

    // Confirm password
    const confirmPassword = await prompt('🔑 Conferma password: ');

    if (password !== confirmPassword) {
      console.error('\n❌ Le password non coincidono\n');
      rl.close();
      process.exit(1);
    }

    console.log('\n📝 Creazione utente in corso...\n');

    // Create admin user
    const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, password);

    console.log('✅ Utente admin creato con successo!\n');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   UID: ${userCredential.user.uid}`);
    console.log('\n⚠️  IMPORTANTE:');
    console.log('   1. Salva queste credenziali in un luogo sicuro (es: password manager)');
    console.log('   2. NON condividere la password con nessuno');
    console.log('   3. Cambia la password periodicamente dalla dashboard admin');
    console.log('   4. Considera di eliminare questo script dopo il primo utilizzo\n');
    console.log('🔒 Per maggiore sicurezza, abilita 2FA dalla Firebase Console\n');

    rl.close();
    process.exit(0);

  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('\n✅ Un utente con questa email esiste già!');
      console.log('   Se hai dimenticato la password, reimpostala dalla Firebase Console.\n');
    } else if (error.code === 'auth/weak-password') {
      console.error('\n❌ Password troppo debole. Firebase richiede almeno 6 caratteri.\n');
    } else if (error.code === 'auth/invalid-email') {
      console.error('\n❌ Email non valida\n');
    } else {
      console.error('\n❌ Errore durante la creazione dell\'utente:', error.message, '\n');
    }

    rl.close();
    process.exit(1);
  }
}

createAdmin();
