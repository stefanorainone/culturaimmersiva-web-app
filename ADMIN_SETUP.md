# Setup Dashboard Admin - Cultura Immersiva

## 🎯 Panoramica

La dashboard admin è stata implementata con successo! Ora è necessario completare alcuni passaggi nella console Firebase per attivarla.

## 📋 Passaggi da Completare

### 1. Abilita Firestore Database

1. Vai alla **Firebase Console**: https://console.firebase.google.com/project/culturaimmersiva-it/firestore
2. Clicca su **"Crea database"**
3. Seleziona **"Inizia in modalità produzione"**
4. Scegli la location (consigliato: **europe-west1** o **eur3**)
5. Clicca su **"Attiva"**

### 2. Abilita Firebase Authentication

1. Vai a: https://console.firebase.google.com/project/culturaimmersiva-it/authentication
2. Clicca su **"Inizia"**
3. Nella scheda **"Sign-in method"**, abilita **"Email/Password"**
4. Clicca su **"Salva"**

### 3. Crea un Utente Admin

1. Vai alla scheda **"Users"** in Authentication
2. Clicca su **"Aggiungi utente"**
3. Inserisci:
   - **Email**: admin@culturaimmersiva.it (o la tua email preferita)
   - **Password**: Scegli una password sicura
4. Clicca su **"Aggiungi utente"**

### 4. Configura le Regole di Sicurezza Firestore

1. Vai a **Firestore Database** > **Regole**
2. Sostituisci le regole con:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read all cities
    match /cities/{cityId} {
      allow read: if true;  // Public read
      allow write: if request.auth != null;  // Only authenticated users can write
    }
  }
}
```

3. Clicca su **"Pubblica"**

### 5. Configura le Regole di Storage (per l'upload delle immagini)

1. Vai a **Storage** > **Regole**
2. Se Storage non è abilitato, clicca su **"Inizia"**
3. Sostituisci le regole con:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /cities/{allPaths=**} {
      allow read: if true;  // Public read
      allow write: if request.auth != null;  // Only authenticated users can upload
    }
  }
}
```

4. Clicca su **"Pubblica"**

### 6. Migra i Dati Esistenti a Firestore

Esegui lo script di migrazione:

```bash
node scripts/migrate-to-firestore.js
```

Questo caricherà tutte le 43 città esistenti con i loro dati in Firestore.

### 7. Testa il Sistema

1. Avvia il server di sviluppo:
   ```bash
   npm run dev
   ```

2. Vai a: http://localhost:5173/admin/login

3. Accedi con le credenziali create al punto 3

4. Dovresti vedere la dashboard con tutte le città

## 🎨 Funzionalità Implementate

### ✅ Autenticazione
- Login admin con email/password
- Protezione delle route admin
- Logout sicuro

### ✅ Dashboard
- Vista lista di tutte le città
- Statistiche: totale, disponibili, terminati
- Filtri per status
- Ricerca per nome città

### ✅ Gestione Città
- **Aggiungi** nuova città
- **Modifica** città esistente
- **Elimina** città (con conferma)

### ✅ Form Completo
- Informazioni base (nome, regione, status)
- Upload immagine città
- Dati evento:
  - Titolo e descrizione
  - Date
  - Location (nome e indirizzo)
  - Organizzatore
  - Prezzi
  - Esperienze VR (aggiunta/rimozione dinamica)
  - Info prenotazione
  - Numero WhatsApp

### ✅ Upload Immagini
- Upload diretto su Firebase Storage
- Preview immagine
- Gestione automatica URL

## 🔐 Sicurezza

- ✅ Autenticazione richiesta per tutte le operazioni admin
- ✅ Route protette con ProtectedRoute component
- ✅ Regole Firestore per accesso controllato
- ✅ File .env con credenziali (escluso da git)

## 🚀 URL Admin

- **Login**: http://localhost:5173/admin/login
- **Dashboard**: http://localhost:5173/admin/dashboard
- **Aggiungi Città**: http://localhost:5173/admin/cities/new
- **Modifica Città**: http://localhost:5173/admin/cities/{cityId}

## 📱 Deploy

Quando sei pronto per il deploy:

```bash
npm run build
firebase deploy
```

Le variabili d'ambiente (.env) NON vengono deployate. Devi configurarle nelle:
**Firebase Console** > **Project Settings** > **Service accounts** > **Environment variables**

## 🆘 Troubleshooting

### Errore: "Cloud Firestore has not been used..."
- Vai alla console Firebase e abilita Firestore (punto 1)

### Errore: "Auth domain not configured"
- Verifica che Authentication sia abilitato (punto 2)

### Errore: "Permission denied"
- Verifica le regole di sicurezza (punti 4 e 5)

### Città non appaiono
- Assicurati di aver eseguito lo script di migrazione (punto 6)

## ✨ Prossimi Passi Suggeriti

1. Aggiungere ruoli utente (admin, editor, viewer)
2. Log delle modifiche
3. Backup automatico dei dati
4. Notifiche email per nuove prenotazioni
5. Dashboard analytics (visualizzazioni, prenotazioni)

---

**Fatto! La dashboard admin è pronta per l'uso! 🎉**
