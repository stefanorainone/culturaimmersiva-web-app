# 🤖 Guida Implementazione CAPTCHA (Opzionale)

Questa guida descrive come implementare CAPTCHA per proteggere ulteriormente il sistema di prenotazione dagli abusi automatizzati.

## Perché Implementare CAPTCHA?

CAPTCHA può aiutare a prevenire:
- Bot automatizzati che prenotano tutti i posti
- Spam di prenotazioni false
- Attacchi di forza bruta
- Abuso del sistema di email

## Opzioni Disponibili

### 1. Google reCAPTCHA v3 (Consigliato)

**Vantaggi:**
- ✅ Invisibile all'utente (score-based)
- ✅ Gratuito fino a 1M richieste/mese
- ✅ Facile integrazione
- ✅ Ben supportato

**Svantaggi:**
- ❌ Richiede account Google
- ❌ Tracking di Google

---

## Implementazione reCAPTCHA v3

### Step 1: Registrazione

1. Vai su [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
2. Crea un nuovo sito
3. Seleziona **reCAPTCHA v3**
4. Aggiungi i domini:
   - `localhost` (per sviluppo)
   - `culturaimmersiva-it.web.app`
   - `culturaimmersiva.it` (se hai dominio custom)

5. Ottieni le chiavi:
   - **Site Key** (pubblica)
   - **Secret Key** (privata)

### Step 2: Configurazione Ambiente

Aggiungi al file `.env`:

```env
# reCAPTCHA v3
VITE_RECAPTCHA_SITE_KEY=6Lc...xxxxx
RECAPTCHA_SECRET_KEY=6Lc...xxxxx
```

### Step 3: Installazione Dipendenze

```bash
npm install react-google-recaptcha-v3
```

### Step 4: Implementazione Frontend

#### A. Setup in `src/main.jsx`

```jsx
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleReCaptchaProvider
      reCaptchaKey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
      language="it"
    >
      <App />
    </GoogleReCaptchaProvider>
  </React.StrictMode>
);
```

#### B. Modifica `src/pages/BookingForm.jsx`

```jsx
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

const BookingForm = () => {
  const { executeRecaptcha } = useGoogleReCaptcha();

  // ... rest of your code ...

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      // Get reCAPTCHA token
      if (!executeRecaptcha) {
        throw new Error('reCAPTCHA not available');
      }

      const recaptchaToken = await executeRecaptcha('booking_submit');

      // Continue with booking creation
      // ... (include recaptchaToken in the booking data) ...

      let bookingId = null;
      let bookingData = null;

      await runTransaction(db, async (transaction) => {
        // ... existing transaction code ...

        bookingData = {
          // ... existing fields ...
          recaptchaToken, // Add token
          recaptchaScore: null // Will be set by Cloud Function
        };

        transaction.set(bookingRef, bookingData);
      });

      // ... rest of your code ...
    } catch (error) {
      console.error('Error creating booking:', error);
      alert(error.message || 'Errore durante la prenotazione. Riprova.');
      setSubmitting(false);
    }
  };

  // ... rest of component ...
};
```

### Step 5: Verifica Backend (Cloud Function)

Crea una nuova funzione in `functions/index.js`:

```javascript
const axios = require('axios');

/**
 * Verify reCAPTCHA token
 */
async function verifyRecaptcha(token, expectedAction) {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!secretKey) {
    console.warn('⚠️  reCAPTCHA secret key not configured, skipping verification');
    return { success: true, score: 1.0 }; // Allow if not configured
  }

  try {
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: secretKey,
          response: token
        }
      }
    );

    const { success, score, action } = response.data;

    // Log the result
    console.log(`🤖 reCAPTCHA verification:`, {
      success,
      score,
      action,
      expected: expectedAction
    });

    // Check if action matches
    if (action !== expectedAction) {
      console.warn(`⚠️  reCAPTCHA action mismatch: ${action} vs ${expectedAction}`);
      return { success: false, score: 0, error: 'Action mismatch' };
    }

    // Threshold: 0.5 (adjust based on your needs)
    // 0.0 = very likely a bot
    // 1.0 = very likely a human
    if (score < 0.5) {
      console.warn(`🚨 Low reCAPTCHA score: ${score}`);
      return { success: false, score, error: 'Low score' };
    }

    return { success: true, score };

  } catch (error) {
    console.error('❌ reCAPTCHA verification error:', error.message);
    return { success: false, score: 0, error: error.message };
  }
}
```

Modifica la Cloud Function esistente per includere la verifica:

```javascript
exports.sendBookingConfirmation = functions.https.onCall(async (data, context) => {
  try {
    const { booking, token } = data;

    // ... existing code ...

    // Verify reCAPTCHA if token is provided
    if (booking.recaptchaToken) {
      const recaptchaResult = await verifyRecaptcha(
        booking.recaptchaToken,
        'booking_submit'
      );

      if (!recaptchaResult.success) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Verifica reCAPTCHA fallita. Riprova.'
        );
      }

      console.log(`✅ reCAPTCHA verified with score: ${recaptchaResult.score}`);
    } else {
      console.warn('⚠️  No reCAPTCHA token provided');
    }

    // ... rest of existing code ...

  } catch (error) {
    // ... existing error handling ...
  }
});
```

### Step 6: Aggiungi axios alle dipendenze Cloud Function

```bash
cd functions
npm install axios
cd ..
```

### Step 7: Deploy

```bash
# Deploy Firestore rules, functions e hosting
npm run deploy

# O solo functions
firebase deploy --only functions
```

---

## Testing

### Test Manualmente

1. **Test con punteggio alto (umano):**
   - Usa il form normalmente
   - Verifica nei log Cloud Functions lo score

2. **Test con punteggio basso (bot):**
   - Usa browser automation (Puppeteer, Selenium)
   - Dovrebbe essere bloccato

### Test con reCAPTCHA Test Keys

Google fornisce chiavi di test per sviluppo:

**Site Key (sempre passa):**
```
6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI
```

**Secret Key (sempre passa):**
```
6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe
```

---

## Configurazione Firestore Rules

Modifica `firestore.rules` per richiedere il campo reCAPTCHA:

```javascript
match /bookings/{bookingId} {
  // Everyone can create bookings with reCAPTCHA verification
  allow create: if request.resource.data.keys().hasAll([
                     'cityId', 'date', 'time', 'name', 'email', 'spots', 'recaptchaToken'
                   ])
                && request.resource.data.spots is int
                && request.resource.data.spots > 0
                && request.resource.data.spots <= 50
                && request.resource.data.recaptchaToken is string;

  // ... rest of rules ...
}
```

---

## Tuning dello Score

Inizia con una soglia di **0.5** e aggiusta in base ai dati:

| Score | Interpretazione | Azione |
|-------|----------------|---------|
| 0.9 - 1.0 | Molto probabilmente umano | ✅ Approva |
| 0.7 - 0.8 | Probabilmente umano | ✅ Approva |
| 0.5 - 0.6 | Neutrale | ⚠️ Approva con cautela |
| 0.3 - 0.4 | Probabilmente bot | ❌ Blocca |
| 0.0 - 0.2 | Molto probabilmente bot | ❌ Blocca |

**Monitora i log per 1-2 settimane**, poi aggiusta la soglia:

```javascript
// Se hai troppi falsi positivi, abbassa la soglia
const THRESHOLD = 0.3; // More permissive

// Se hai troppi bot che passano, alza la soglia
const THRESHOLD = 0.7; // More strict
```

---

## Alternative a reCAPTCHA

### 1. hCaptcha

**Vantaggi:**
- Privacy-focused
- Nessun tracking Google
- Gratuito

**Implementazione simile a reCAPTCHA:**
```bash
npm install @hcaptcha/react-hcaptcha
```

### 2. Cloudflare Turnstile

**Vantaggi:**
- Privacy-focused
- Gratuito e illimitato
- Veloce

**Link:** [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/)

### 3. Custom CAPTCHA

Implementa un semplice CAPTCHA matematico:

```jsx
const [captcha, setCaptcha] = useState({ a: 0, b: 0 });
const [captchaAnswer, setCaptchaAnswer] = useState('');

useEffect(() => {
  // Generate random math problem
  setCaptcha({
    a: Math.floor(Math.random() * 10),
    b: Math.floor(Math.random() * 10)
  });
}, []);

const validateCaptcha = () => {
  return parseInt(captchaAnswer) === (captcha.a + captcha.b);
};

// In JSX
<div>
  <label>Quanto fa {captcha.a} + {captcha.b}?</label>
  <input
    type="number"
    value={captchaAnswer}
    onChange={(e) => setCaptchaAnswer(e.target.value)}
  />
</div>
```

---

## Monitoraggio

Dopo l'implementazione, monitora:

1. **Score distribution** nei log
2. **False positives** (utenti legittimi bloccati)
3. **False negatives** (bot che passano)
4. **Performance impact** sul form

---

## FAQ

**Q: reCAPTCHA rallenta il form?**
A: No, v3 è invisibile e asincrono.

**Q: Costa denaro?**
A: No, fino a 1M richieste/mese è gratuito.

**Q: È compatibile con GDPR?**
A: Sì, ma devi informare gli utenti nella privacy policy che usi Google services.

**Q: Devo implementarlo subito?**
A: No, implementalo solo se noti abusi. Il rate limiting attuale potrebbe essere sufficiente.

---

## Conclusione

L'implementazione di CAPTCHA è **opzionale** ma consigliata se:
- Noti molte prenotazioni false
- Hai picchi anomali di traffico
- Vuoi una protezione extra contro i bot

Il sistema attuale con rate limiting e validazione è già robusto, ma CAPTCHA aggiunge un ulteriore livello di sicurezza.

🤖 **Proteggi il tuo sistema dai bot!**
