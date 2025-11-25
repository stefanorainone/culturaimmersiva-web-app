# 🔍 Audit Vulnerabilità Avanzate - Cultura Immersiva

**Data Audit:** 2025-01-24
**Versione:** 2.1
**Auditor:** Claude Code Advanced Security Analysis

---

## 📋 Sommario Esecutivo

Dopo l'implementazione delle misure di sicurezza di base, è stata condotta un'analisi approfondita per identificare vulnerabilità più sottili e problemi di sicurezza avanzati.

### Risultati Generali
- **Vulnerabilità CRITICHE:** 1 🔴
- **Vulnerabilità MEDIE:** 2 🟡
- **Vulnerabilità BASSE:** 3 🟢
- **Best Practices:** 4 📘

---

## 🔴 VULNERABILITÀ CRITICHE

### 1. Race Condition nel Sistema di Prenotazione

**Severità:** 🔴 **CRITICA**
**CVSS Score:** 7.5 (High)
**CWE:** CWE-362 (Concurrent Execution using Shared Resource with Improper Synchronization)

#### Descrizione
Il sistema utilizza `runTransaction()` di Firestore per prevenire double-booking, ma **all'interno della transazione** esegue `getDocs()` che **NON è un'operazione transazionale**. Questo crea una finestra di vulnerabilità per race conditions.

#### File Affetto
`src/pages/BookingForm.jsx:174-226`

#### Codice Problematico
```javascript
await runTransaction(db, async (transaction) => {
  // 🔴 PROBLEMA: getDocs NON è transazionale!
  const bookingsQuery = query(
    collection(db, 'bookings'),
    where('cityId', '==', cityId),
    where('date', '==', selectedSlot.date),
    where('time', '==', selectedSlot.time)
  );

  const bookingsSnapshot = await getDocs(bookingsQuery);  // ❌ Non atomico
  let totalBooked = 0;
  bookingsSnapshot.docs.forEach(doc => {
    // Calcolo posti...
  });

  // Creazione booking
  transaction.set(bookingRef, bookingData);
});
```

#### Scenario di Attacco
1. Utente A e Utente B provano a prenotare contemporaneamente l'ultimo posto disponibile
2. Entrambi leggono lo stesso stato (1 posto disponibile)
3. Entrambi passano la validazione
4. Entrambi creano la prenotazione
5. **Risultato:** Overbooking (2 prenotazioni, 1 posto)

#### Impatto
- ⚠️ Overbooking di eventi
- ⚠️ Esperienza utente negativa
- ⚠️ Perdita di fiducia
- ⚠️ Potenziale perdita economica

#### Proof of Concept
```bash
# Simula 2 richieste simultanee
curl -X POST https://.../ & curl -X POST https:/.../ &
```

#### Soluzione Raccomandata

**Opzione A - Contatore Atomico (Consigliato):**
```javascript
// Usa un campo counter nel documento city
await runTransaction(db, async (transaction) => {
  const cityRef = doc(db, 'cities', cityId);
  const cityDoc = await transaction.get(cityRef);

  if (!cityDoc.exists()) {
    throw new Error('City not found');
  }

  const slotKey = `${selectedSlot.date}-${selectedSlot.time}`;
  const bookedCount = cityDoc.data().bookedSlots?.[slotKey] || 0;
  const available = selectedSlot.capacity - bookedCount;

  if (available < formData.spots) {
    throw new Error(`Solo ${available} posti disponibili`);
  }

  // Incremento atomico
  transaction.update(cityRef, {
    [`bookedSlots.${slotKey}`]: bookedCount + formData.spots
  });

  // Crea booking
  const bookingRef = doc(collection(db, 'bookings'));
  transaction.set(bookingRef, bookingData);
});
```

**Opzione B - Distributed Lock (Più complesso):**
Implementare un sistema di lock distribuito usando Cloud Functions.

**Priorità:** 🔴 **ALTA - Risolvere prima del deploy in produzione**

---

## 🟡 VULNERABILITÀ MEDIE

### 2. Information Disclosure via Console Logs

**Severità:** 🟡 **MEDIA**
**CVSS Score:** 4.3 (Medium)
**CWE:** CWE-532 (Insertion of Sensitive Information into Log File)

#### Descrizione
Il codice contiene **35+ chiamate** a `console.log()` e `console.error()` che potrebbero esporre informazioni sensibili in produzione.

#### File Affetti
- `src/pages/admin/Login.jsx` - Log di tentativi login
- `src/pages/BookingForm.jsx` - Errori booking con dettagli
- `src/pages/BookingManage.jsx` - Errori aggiornamento
- `src/pages/BookingCancel.jsx` - Errori cancellazione
- **14 file totali con console logs**

#### Esempi Problematici
```javascript
// src/pages/BookingForm.jsx:232
console.error('Error sending email:', emailError);
// Potrebbe esporre: API errors, email addresses, internal paths

// src/pages/admin/Login.jsx:31
console.warn(`🔒 Failed login attempt at ${timestamp}`, {
  errorCode,
  email: email ? '***' : 'empty', // Mascherato ma timestamp visibile
  timestamp
});
```

#### Impatto
- ℹ️ Raccolta di intelligence per attaccanti
- ℹ️ Esposizione di struttura interna
- ℹ️ Potenziale leak di email/token in errori
- ℹ️ Fingerprinting dell'applicazione

#### Soluzione Raccomandata

**1. Implementare Logging Condizionale:**
```javascript
// src/utils/logger.js
const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args) => isDev && console.log(...args),
  error: (...args) => {
    if (isDev) {
      console.error(...args);
    } else {
      // In produzione, log solo su servizio esterno (es: Sentry)
      // sendToSentry(args);
    }
  },
  warn: (...args) => isDev && console.warn(...args)
};
```

**2. Sostituire tutti i console.* con logger:**
```javascript
// Prima
console.error('Error:', error);

// Dopo
import { logger } from '../utils/logger';
logger.error('Error:', error);
```

**Priorità:** 🟡 **MEDIA - Risolvere entro 2 settimane**

---

### 3. Mancanza di Protezione CSRF su State-Changing Operations

**Severità:** 🟡 **MEDIA**
**CVSS Score:** 5.4 (Medium)
**CWE:** CWE-352 (Cross-Site Request Forgery)

#### Descrizione
Anche se Firebase fornisce protezione CSRF di base tramite i token di sessione, le operazioni di modifica/cancellazione prenotazioni basate su token URL sono vulnerabili a CSRF se il token viene intercettato.

#### File Affetti
- `src/pages/BookingManage.jsx` - Update senza CSRF token
- `src/pages/BookingCancel.jsx` - Cancel senza CSRF token

#### Scenario di Attacco
1. Attaccante ottiene token valido (es: shoulder surfing, email intercettata)
2. Crea pagina HTML malevola che fa auto-submit di form
3. Vittima visita la pagina con token ancora valido
4. Prenotazione modificata/cancellata senza consenso

#### Soluzione Raccomandata

**Aggiungere SameSite Cookie Protection:**
```javascript
// firebase.json
{
  "hosting": {
    "headers": [{
      "source": "**",
      "headers": [{
        "key": "Set-Cookie",
        "value": "SameSite=Strict; Secure"
      }]
    }]
  }
}
```

**Aggiungere Confirmation Step:**
```javascript
// src/pages/BookingCancel.jsx
const handleCancel = async () => {
  // ✅ Già implementato: window.confirm()
  if (!window.confirm('Sei sicuro...')) {
    return;
  }

  // ✅ BONUS: Aggiungere secondo fattore di conferma
  const confirmText = prompt('Digita "CONFERMA" per procedere:');
  if (confirmText !== 'CONFERMA') {
    return;
  }

  // Procedi con cancellazione...
};
```

**Priorità:** 🟡 **MEDIA - Risolvere entro 1 mese**

---

## 🟢 VULNERABILITÀ BASSE

### 4. Client-Side Token Storage in State

**Severità:** 🟢 **BASSA**
**CVSS Score:** 3.1 (Low)
**CWE:** CWE-922 (Insecure Storage of Sensitive Information)

#### Descrizione
I token delle prenotazioni vengono passati attraverso `location.state` che, anche se non persistito, può essere ispezionato via DevTools.

#### File Affetti
- `src/pages/BookingForm.jsx:237-239` - navigate con state
- `src/pages/Ticket.jsx:11` - accesso al token dallo state

#### Codice
```javascript
navigate('/ticket', {
  state: { booking: bookingData },  // Include token
  replace: true
});
```

#### Impatto Limitato
- ⚠️ Token visibile in DevTools (ma scade in 3 giorni)
- ⚠️ Utente malintenzionato con accesso fisico potrebbe rubare token
- ✅ Non persistito quindi non sopravvive a refresh
- ✅ Replace: true previene back navigation

#### Soluzione (Opzionale)
```javascript
// Rimuovi token prima di passare allo state
const { token, tokenExpiry, ...safeBooking } = bookingData;
navigate('/ticket', {
  state: { booking: safeBooking },
  replace: true
});
```

**Priorità:** 🟢 **BASSA - Nice to have**

---

### 5. Mancanza di Integrity Checks su localStorage

**Severità:** 🟢 **BASSA**
**CVSS Score:** 3.3 (Low)
**CWE:** CWE-353 (Missing Support for Integrity Check)

#### Descrizione
I dati di rate limiting in localStorage possono essere manipolati da un utente malintenzionato per bypassare il limite.

#### File Affetto
`src/pages/admin/Login.jsx:38-43`

#### Codice Vulnerabile
```javascript
const failedAttempts = JSON.parse(localStorage.getItem('failedLoginAttempts') || '[]');
// ❌ Utente può modificare questo array via DevTools
```

#### Impatto Limitato
- ⚠️ Rate limiting bypassabile client-side
- ✅ Firebase ha già rate limiting server-side
- ✅ Impatto minimo perché è solo UX

#### Soluzione (Opzionale)
```javascript
// Aggiungere HMAC per verificare integrità
import CryptoJS from 'crypto-js';

const SECRET = 'app-secret-key'; // In produzione, da env

function saveFailedAttempts(attempts) {
  const data = JSON.stringify(attempts);
  const hmac = CryptoJS.HmacSHA256(data, SECRET).toString();
  localStorage.setItem('failedLoginAttempts', data);
  localStorage.setItem('failedLoginAttempts_hmac', hmac);
}

function getFailedAttempts() {
  const data = localStorage.getItem('failedLoginAttempts') || '[]';
  const hmac = localStorage.getItem('failedLoginAttempts_hmac');
  const expectedHmac = CryptoJS.HmacSHA256(data, SECRET).toString();

  if (hmac !== expectedHmac) {
    // Dati manipolati, reset
    return [];
  }

  return JSON.parse(data);
}
```

**Priorità:** 🟢 **BASSA - Opzionale**

---

### 6. Weak Randomness per Token Generation

**Severità:** 🟢 **BASSA**
**CVSS Score:** 2.9 (Low)
**CWE:** CWE-338 (Use of Cryptographically Weak Pseudo-Random Number Generator)

#### Descrizione
Il token usa `Date.now()` come parte del seed, che è prevedibile.

#### File Affetto
`src/pages/BookingForm.jsx:153-156`

#### Codice
```javascript
const generateToken = (bookingId, email) => {
  const data = `${bookingId}-${email}-${Date.now()}`;  // ❌ Date.now() prevedibile
  return CryptoJS.SHA256(data).toString();
};
```

#### Impatto Limitato
- ⚠️ Timestamp prevedibile entro millisecondi
- ✅ SHA256 rende difficile reversing
- ✅ bookingId è UUID random da Firestore
- ✅ Combinazione di 3 fattori aumenta entropia

#### Soluzione (Miglioramento)
```javascript
import CryptoJS from 'crypto-js';

const generateToken = (bookingId, email) => {
  // Aggiungi randomness crittografico
  const random = CryptoJS.lib.WordArray.random(16).toString();
  const data = `${bookingId}-${email}-${Date.now()}-${random}`;
  return CryptoJS.SHA256(data).toString();
};
```

**Priorità:** 🟢 **BASSA - Nice to have**

---

## 📘 BEST PRACTICES

### 7. Mancanza di Subresource Integrity (SRI)

**Tipo:** 📘 **BEST PRACTICE**

#### Descrizione
Non vengono utilizzati tag `<script>` o `<link>` con hash SRI per risorse esterne (se presenti).

#### Situazione Attuale
```html
<!-- index.html -->
<!doctype html>
<html lang="it">
  <head>
    <script type="module" src="/src/main.jsx"></script>
    <!-- ✅ Nessuna risorsa esterna CDN -->
  </head>
</html>
```

**Status:** ✅ **OK** - Non ci sono CDN esterni, quindi SRI non necessario.

**Se in futuro aggiungi CDN:**
```html
<link
  rel="stylesheet"
  href="https://cdn.example.com/style.css"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
  crossorigin="anonymous"
>
```

---

### 8. Configurazione Vite Minimale

**Tipo:** 📘 **BEST PRACTICE**

#### File
`vite.config.js`

#### Configurazione Attuale
```javascript
export default defineConfig({
  plugins: [react()],
})
```

#### Raccomandazioni
```javascript
export default defineConfig({
  plugins: [react()],

  // Build optimizations
  build: {
    // Minify per ridurre superficie di attacco
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // Rimuovi console.log in prod
        drop_debugger: true
      }
    },

    // Source maps solo in dev
    sourcemap: false,

    // Rollup options per splitting
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore']
        }
      }
    }
  },

  // Security headers (già in firebase.json, ma ridondanza OK)
  server: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY'
    }
  }
})
```

**Priorità:** 📘 **BEST PRACTICE - Migliora performance e sicurezza**

---

### 9. Mancanza di Error Boundary

**Tipo:** 📘 **BEST PRACTICE**

#### Descrizione
Non c'è un Error Boundary React globale per catturare errori e prevenire leak di stack traces.

#### Raccomandazione
```jsx
// src/components/ErrorBoundary.jsx
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log a servizio esterno (Sentry, LogRocket, etc.)
    if (!import.meta.env.DEV) {
      // sendToSentry(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">
              Si è verificato un errore
            </h1>
            <p className="text-gray-600 mb-4">
              Ci scusiamo per l'inconveniente
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="btn-primary"
            >
              Torna alla home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// src/main.jsx
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

**Priorità:** 📘 **BEST PRACTICE - Migliora UX e sicurezza**

---

### 10. Rate Limiting solo Client-Side per Booking

**Tipo:** 📘 **BEST PRACTICE**

#### Descrizione
Il rate limiting delle prenotazioni è solo client-side (UI disabled), facilmente bypassabile.

#### Raccomandazione
Aggiungere rate limiting server-side nella Cloud Function:

```javascript
// functions/index.js
const bookingRateLimits = new Map();
const MAX_BOOKINGS_PER_IP = 5;  // Max 5 prenotazioni per ora
const BOOKING_RATE_WINDOW = 60 * 60 * 1000;  // 1 hour

exports.createBooking = functions.https.onCall(async (data, context) => {
  const clientIp = context.rawRequest?.ip || 'unknown';

  // Check rate limit
  if (!checkBookingRateLimit(clientIp)) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      'Troppi tentativi. Riprova tra un\'ora.'
    );
  }

  // ... proceed with booking ...
});
```

**Priorità:** 📘 **BEST PRACTICE - Previene abusi**

---

## 📊 Riepilogo Priorità

| # | Vulnerabilità | Severità | Priorità | Effort |
|---|--------------|----------|----------|--------|
| 1 | Race Condition Booking | 🔴 Critica | **ALTA** | 4h |
| 2 | Console Logs | 🟡 Media | **MEDIA** | 2h |
| 3 | CSRF Token Operations | 🟡 Media | **MEDIA** | 1h |
| 4 | Token in State | 🟢 Bassa | Bassa | 30min |
| 5 | localStorage Integrity | 🟢 Bassa | Bassa | 1h |
| 6 | Weak Randomness | 🟢 Bassa | Bassa | 15min |
| 7 | SRI | 📘 Best Practice | N/A | N/A |
| 8 | Vite Config | 📘 Best Practice | MEDIA | 30min |
| 9 | Error Boundary | 📘 Best Practice | MEDIA | 1h |
| 10 | Server Rate Limiting | 📘 Best Practice | MEDIA | 2h |

### Tempo Totale Stimato
- **Critiche + Medie:** ~8 ore
- **Best Practices:** ~3.5 ore
- **TOTALE:** ~11.5 ore

---

## 🎯 Raccomandazioni Immediate

### Da Fare Subito (Prima del Deploy Produzione)
1. ✅ **Fix Race Condition** - Implementare contatore atomico
2. ✅ **Rimuovere Console Logs** - Implementare logger condizionale
3. ✅ **Migliorare Token Generation** - Aggiungere randomness crittografico

### Da Fare Entro 1 Mese
4. ⏳ **CSRF Protection** - Aggiungere confirmation steps
5. ⏳ **Vite Config** - Ottimizzare build per produzione
6. ⏳ **Error Boundary** - Catturare errori globalmente

### Da Considerare
7. 💡 **localStorage Integrity** - Se tempo disponibile
8. 💡 **Token da State** - Se paranoia alta
9. 💡 **Server Rate Limiting** - Per prevenire abusi

---

## 🔧 Script di Verifica Aggiornato

Aggiornare `scripts/security-check.js` per includere questi check:

```javascript
// Check for console.log in src/ (should be 0 in production build)
info('10. Checking for console.log in source...');
const consoleCount = execSync(
  'grep -r "console\\." src/ | wc -l',
  { encoding: 'utf-8' }
).trim();

if (parseInt(consoleCount) > 0) {
  warning(`Found ${consoleCount} console.* calls in source`);
  console.log('   Ensure these are removed/conditional in production');
  warnings++;
} else {
  success('No console calls found');
}
```

---

## 📞 Risorse Aggiuntive

### Testing Tools
- **Race Condition Testing:** Apache JMeter, Gatling
- **CSRF Testing:** Burp Suite, OWASP ZAP
- **Console Log Detection:** ESLint plugin `no-console`

### Monitoring
- **Error Tracking:** Sentry, LogRocket, Rollbar
- **Performance:** Firebase Performance Monitoring
- **Security:** Snyk, WhiteSource

---

## ✅ Checklist di Verifica

Prima del deploy in produzione:

- [ ] Race condition nel booking system risolta
- [ ] Console logs rimossi o condizionali
- [ ] Vite config ottimizzato
- [ ] Error Boundary implementato
- [ ] Token generation migliorato
- [ ] Test di carico eseguiti (race condition)
- [ ] Monitoring configurato
- [ ] Security scan eseguito

---

**Prossimo Audit:** 2025-04-24 (3 mesi)

**Contatto Sicurezza:** security@culturaimmersiva.it

🔒 **Keep your system secure!**
