# 🔒 Documentazione Sicurezza - Cultura Immersiva

## Indice
- [Panoramica](#panoramica)
- [Misure di Sicurezza Implementate](#misure-di-sicurezza-implementate)
- [Best Practices](#best-practices)
- [Gestione Credenziali](#gestione-credenziali)
- [Monitoraggio e Logging](#monitoraggio-e-logging)
- [Procedure di Emergenza](#procedure-di-emergenza)
- [Checklist di Sicurezza](#checklist-di-sicurezza)

---

## Panoramica

Questo documento descrive le misure di sicurezza implementate nel progetto Cultura Immersiva e fornisce linee guida per mantenere un livello di sicurezza elevato.

**Ultimo aggiornamento:** 2025-01-24
**Versione:** 2.0

---

## Misure di Sicurezza Implementate

### 🔐 1. Autenticazione e Autorizzazione

#### Firebase Authentication
- Sistema di autenticazione basato su Firebase Auth
- Password minima di 12 caratteri con requisiti di complessità
- Protected routes per area amministrativa
- Rate limiting sui tentativi di login (5 tentativi in 15 minuti)

**File coinvolti:**
- `src/contexts/AuthContext.jsx`
- `src/pages/admin/Login.jsx`
- `src/components/ProtectedRoute.jsx`

#### Firestore Security Rules
- Default deny per tutte le collezioni non specificate
- Lettura pubblica per `cities` (sito web pubblico)
- Scrittura solo per utenti autenticati
- Token-based access per modifiche prenotazioni

**File:** `firestore.rules`

#### Firebase Storage Rules
- Lettura pubblica per immagini
- Upload/delete solo per utenti autenticati

**File:** `storage.rules`

---

### 🛡️ 2. Protezione da Attacchi

#### XSS (Cross-Site Scripting)
- ✅ React esegue automaticamente l'escaping di tutti i dati
- ✅ Sanitizzazione HTML nella Cloud Function (`functions/index.js:62-69`)
- ✅ Nessun uso di `dangerouslySetInnerHTML` o `innerHTML`
- ✅ Content Security Policy (CSP) implementata

**Funzioni di sanitizzazione:**
```javascript
// functions/index.js
function sanitizeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
```

#### SQL Injection
- ✅ **N/A** - Firestore è un database NoSQL che non usa query SQL
- ✅ Validazione degli input prima di salvare in Firestore

#### Command Injection
- ✅ Nessun uso di `eval()` o funzioni dinamiche pericolose
- ✅ Input validati prima dell'uso

---

### 📝 3. Validazione Input

#### Client-Side Validation
**File:** `src/pages/BookingForm.jsx`, `src/pages/BookingManage.jsx`

- ✅ Nome: 2-100 caratteri
- ✅ Email: formato valido tramite regex
- ✅ WhatsApp: 8-15 cifre, formato internazionale
- ✅ Posti: 1-50 (numero intero)

#### Server-Side Validation
**File:** `functions/index.js:69-83`

```javascript
function validateBookingData(booking) {
  if (!booking.name || typeof booking.name !== 'string' || booking.name.length > 100) {
    return 'Nome non valido';
  }
  if (!booking.email || !isValidEmail(booking.email)) {
    return 'Email non valida';
  }
  if (!booking.spots || typeof booking.spots !== 'number' || booking.spots < 1 || booking.spots > 50) {
    return 'Numero posti non valido';
  }
  return null;
}
```

---

### 🚦 4. Rate Limiting

#### Email Rate Limiting (Cloud Function)
**File:** `functions/index.js:10-59`

- Limite: **10 email per ora per IP**
- Window: 60 minuti
- Logging completo di tutti i tentativi
- Warning quando si raggiunge l'80% del limite

#### Login Rate Limiting (Frontend)
**File:** `src/pages/admin/Login.jsx`

- Limite: **5 tentativi falliti in 15 minuti**
- Tracciamento in localStorage
- Blocco temporaneo dell'account

---

### 🔑 5. Gestione Token

#### Magic Links per Prenotazioni
**File:** `src/pages/BookingForm.jsx:152-156`

- Token generato con SHA256
- Scadenza: **3 giorni** (ridotta da 7 per maggiore sicurezza)
- Token univoco per ogni prenotazione
- Validazione scadenza prima dell'uso

```javascript
// Generate secure token for magic link
const generateToken = (bookingId, email) => {
  const data = `${bookingId}-${email}-${Date.now()}`;
  return CryptoJS.SHA256(data).toString();
};
```

---

### 🔒 6. Security Headers

**File:** `firebase.json:27-60`

Tutti i seguenti headers sono configurati:

| Header | Valore | Protezione |
|--------|--------|-----------|
| `X-Frame-Options` | `DENY` | Clickjacking |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing |
| `X-XSS-Protection` | `1; mode=block` | XSS legacy |
| `Strict-Transport-Security` | `max-age=31536000` | HTTPS enforcement |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Privacy |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` | Permissions |
| `Content-Security-Policy` | Configurato | XSS, injection |

#### Content Security Policy (CSP) Dettagliata
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://www.googleapis.com https://*.firebaseapp.com https://*.cloudfunctions.net;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com data:;
img-src 'self' data: https: blob:;
connect-src 'self' https://*.googleapis.com https://*.firebaseapp.com https://*.cloudfunctions.net https://*.firebaseio.com wss://*.firebaseio.com https://firestore.googleapis.com;
frame-src 'none';
object-src 'none';
base-uri 'self';
form-action 'self';
upgrade-insecure-requests;
```

---

### 📊 7. Logging e Monitoraggio

#### Login Attempts Logging
**File:** `src/pages/admin/Login.jsx:22-65`

- ✅ Log di ogni tentativo di login (successo/fallimento)
- ✅ Timestamp preciso
- ✅ Codice errore (senza dati sensibili)
- ✅ Storage locale degli ultimi 10 tentativi

#### Rate Limiting Monitoring
**File:** `functions/index.js:26-59`

- ✅ Log di ogni richiesta email
- ✅ Warning quando si raggiunge 80% del limite
- ✅ Alert quando il limite viene superato
- ✅ Tempo rimanente prima del reset

---

## Best Practices

### 🔐 Gestione Password

#### Per Amministratori
1. **Lunghezza minima:** 12 caratteri
2. **Complessità richiesta:**
   - Almeno 1 lettera maiuscola
   - Almeno 1 lettera minuscola
   - Almeno 1 numero
   - Almeno 1 carattere speciale
3. **Cambio periodico:** Ogni 90 giorni
4. **Non riutilizzo:** Mai usare la stessa password
5. **Password Manager:** Utilizzare un gestore password affidabile

#### Creazione Account Admin
**File:** `scripts/create-admin.js`

```bash
# Esegui lo script con input interattivo
node scripts/create-admin.js

# Inserisci email e password quando richiesto
# La password NON verrà salvata nel codice
```

⚠️ **IMPORTANTE:** Dopo la creazione dell'admin, considera di eliminare lo script o spostarlo in una directory sicura.

---

### 🔑 Gestione Credenziali

#### File .env
Il file `.env` contiene credenziali sensibili e **NON deve mai** essere committato nel repository.

**Contenuto tipico:**
```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx

# SendGrid
SENDGRID_KEY=xxx
```

**Verifica esclusione da git:**
```bash
# Verifica che .env sia nel .gitignore
grep ".env" .gitignore

# Verifica che .env NON sia tracciato
git ls-files .env
# (non deve restituire nulla)
```

#### Rotazione Credenziali
- **API Keys:** Ruota ogni 6 mesi
- **SendGrid Key:** Ruota ogni 90 giorni
- **Firebase Project:** Monitora accessi nella console

---

### 🚨 Monitoraggio Continuo

#### Firebase Console
Monitora regolarmente:
1. **Authentication:** Tentativi di login sospetti
2. **Firestore:** Query anomale
3. **Functions:** Errori e timeout
4. **Storage:** Upload/download anomali

#### Log Analysis
Analizza i log per:
- Picchi di rate limiting
- Tentativi di autenticazione falliti
- Errori di validazione ricorrenti
- Pattern di traffico anomalo

---

## Procedure di Emergenza

### 🚨 In caso di Compromissione Account Admin

1. **Immediato:**
   ```bash
   # Accedi alla Firebase Console
   https://console.firebase.google.com

   # Authentication > Users > Disabilita l'account compromesso
   ```

2. **Entro 5 minuti:**
   - Cambia la password da Firebase Console
   - Crea un nuovo account admin
   - Revoca tutte le sessioni attive

3. **Entro 1 ora:**
   - Analizza i log per identificare azioni sospette
   - Verifica modifiche a Firestore
   - Controlla file uploadati su Storage

4. **Entro 24 ore:**
   - Ruota tutte le API keys
   - Aggiorna le credenziali nel progetto
   - Notifica il team

### 🔒 In caso di Attacco DDoS/Rate Limiting

1. **Identifica l'IP:** Controlla i log Cloud Functions
2. **Blocca l'IP:** Usa Firebase App Check o Cloudflare
3. **Aumenta temporaneamente il rate limit** (se necessario)
4. **Analizza il pattern** di attacco
5. **Implementa ulteriori misure** (CAPTCHA, etc.)

### 💾 Backup e Ripristino

#### Backup Firestore
```bash
# Esporta dati Firestore
gcloud firestore export gs://[BUCKET_NAME]/[EXPORT_DATE]

# Esempio
gcloud firestore export gs://culturaimmersiva-backups/2025-01-24
```

#### Backup Firebase Storage
- Usa la console Firebase per download bulk
- Configura backup automatici su Google Cloud Storage

---

## Checklist di Sicurezza

### ✅ Pre-Deploy
- [ ] File `.env` non committato
- [ ] Password hardcoded rimosse
- [ ] Security rules testate
- [ ] Dipendenze aggiornate (`npm audit`)
- [ ] Test di sicurezza eseguiti
- [ ] CSP header configurato
- [ ] HTTPS configurato

### ✅ Post-Deploy
- [ ] Verifica headers con [securityheaders.com](https://securityheaders.com)
- [ ] Test rate limiting
- [ ] Test autenticazione
- [ ] Verifica logging
- [ ] Test magic links
- [ ] Backup Firestore eseguito

### ✅ Mensile
- [ ] Analisi log accessi
- [ ] Review utenti admin
- [ ] Verifica vulnerabilità dipendenze
- [ ] Check rate limiting violations
- [ ] Test disaster recovery

### ✅ Trimestrale
- [ ] Rotazione password admin
- [ ] Rotazione API keys
- [ ] Audit completo sicurezza
- [ ] Review security rules
- [ ] Update documentazione

---

## Risorse Aggiuntive

### Documentazione Ufficiale
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

### Tools di Testing
- [OWASP ZAP](https://www.zaproxy.org/) - Security testing
- [SecurityHeaders.com](https://securityheaders.com) - Header analysis
- [SSL Labs](https://www.ssllabs.com/ssltest/) - SSL/TLS testing

### Reporting Vulnerabilità

Se trovi una vulnerabilità di sicurezza, **NON** aprire una issue pubblica. Contatta:
- Email: security@culturaimmersiva.it (se configurata)
- In alternativa: contatta direttamente il team di sviluppo

---

## Contatti

Per domande sulla sicurezza o per segnalare problemi:
- **Email:** admin@culturaimmersiva.it
- **Firebase Project ID:** culturaimmersiva-it

---

**Ricorda:** La sicurezza è un processo continuo, non un obiettivo finale. Mantieni sempre aggiornate le misure di sicurezza e monitora costantemente il sistema.

🔒 **Stay Safe!**
