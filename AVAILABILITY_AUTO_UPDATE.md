# 🤖 Aggiornamento Automatico Disponibilità Città

## Descrizione

Sistema automatico che controlla e aggiorna lo stato delle città in base alle date disponibili future.

**Funzionamento**:
- ⏰ **Quando**: Ogni domenica alle 22:00 (fuso orario Europa/Roma)
- 🔍 **Cosa fa**: Controlla tutte le città in Firestore
- ✅ **Logica**: Se una città ha date future disponibili → "available", altrimenti → "ended"
- 📊 **Logging**: Salva un summary in Firestore (`maintenance/lastAvailabilityUpdate`)

---

## Cloud Function

### Funzione: `updateCityAvailability`

**Location**: `functions/index.js` (righe 399-487)

**Schedule**: `0 22 * * 0` (Cron format)
- Ogni domenica
- Ore 22:00
- Timezone: Europe/Rome

**Region**: europe-west1 (Belgio - più vicino all'Italia)

---

## Come Funziona

### Logica di Controllo

```javascript
// Per ogni città:
1. Legge tutti i timeSlots da eventData.timeSlots
2. Filtra slot con date >= oggi
3. Se ci sono date future → status = "available"
4. Se NON ci sono date future → status = "ended"
5. Aggiorna solo se lo status è cambiato
```

### Esempio

**Città con date future**:
```
Benevento:
  - 2025-12-01, 10:00 ✅ Futuro
  - 2025-12-01, 14:00 ✅ Futuro
  → Status: available
```

**Città senza date future**:
```
Genova:
  - 2024-10-15, 10:00 ❌ Passato
  - 2024-10-15, 14:00 ❌ Passato
  → Status: ended
```

---

## Deploy

### 1. Deploy della Function

```bash
# Dalla directory principale
cd functions

# Deploy solo questa function
firebase deploy --only functions:updateCityAvailability

# Oppure deploy di tutte le functions
firebase deploy --only functions
```

### 2. Verifica Deploy

```bash
# Controlla i log
firebase functions:log --only updateCityAvailability

# Oppure dalla console Firebase
https://console.firebase.google.com/project/culturaimmersiva-it/functions
```

---

## Test Manuale

### Script di Test

Ho creato uno script che permette di testare la logica senza aspettare la domenica.

**Location**: `functions/test-availability-update.js`

### Come Usare

```bash
# 1. Vai nella directory functions
cd functions

# 2. Esegui lo script di test (DRY RUN)
node test-availability-update.js

# Output:
# - Mostra tutte le città
# - Status attuale vs nuovo status
# - Date future disponibili
# - Summary dei cambiamenti

# 3. Conferma per applicare i cambiamenti
# > Do you want to apply these changes? (y/n)
# > y

# ✅ Cambiamenti applicati!
```

### Esempio Output

```
🔄 Starting manual city availability update test...

📅 Today: 24/11/2025

📍 Benevento (benevento)
   Current Status: available
   Total Slots: 8
   Future Slots: 4
   Dates: 2025-12-01, 2025-12-02...
   New Status: available
   ✓ No change needed

📍 Genova (genova)
   Current Status: available
   Total Slots: 6
   Future Slots: 0
   New Status: ended
   ⚠️  STATUS CHANGE: available → ended

========================================
📊 SUMMARY
========================================
Total Cities: 43
Cities to Update: 5
Available Cities: 15
Unavailable Cities: 28

📝 CHANGES TO BE APPLIED:
   Genova: available → ended (0 future dates)
   Pisa: available → ended (0 future dates)
   ...

❓ Do you want to apply these changes? (y/n)
>
```

---

## Monitoraggio

### 1. Logs in Firebase Console

```
https://console.firebase.google.com/project/culturaimmersiva-it/functions/logs
```

Cerca: `updateCityAvailability`

### 2. Firestore Document

La function salva un summary in:
```
Collection: maintenance
Document: lastAvailabilityUpdate

{
  totalCities: 43,
  updatedCities: 5,
  availableCities: 15,
  unavailableCities: 28,
  timestamp: "2025-11-24T22:00:00.000Z"
}
```

### 3. City Documents

Ogni città aggiornata avrà:
```javascript
{
  status: "available" | "ended",
  lastAvailabilityCheck: Timestamp // quando è stata controllata
}
```

---

## Troubleshooting

### La function non si esegue

**Controlla**:
1. Function deployata correttamente
2. Scheduler abilitato (Firebase Console > Functions)
3. Timezone corretto (Europe/Rome)
4. Logs per errori

**Fix**:
```bash
# Re-deploy della function
firebase deploy --only functions:updateCityAvailability

# Controlla logs
firebase functions:log --only updateCityAvailability
```

### Status non si aggiorna

**Possibili cause**:
1. Campo `eventData.timeSlots` mancante o vuoto
2. Date nel formato sbagliato
3. Permission error in Firestore

**Debug**:
```bash
# Esegui lo script di test
cd functions
node test-availability-update.js

# Verifica che mostri le date correttamente
```

### Voglio cambiare l'orario

**Modifica in**: `functions/index.js` riga 408

```javascript
// Attuale: Ogni domenica alle 22:00
.schedule('0 22 * * 0')

// Esempi:
.schedule('0 23 * * 0')  // Domenica 23:00
.schedule('0 22 * * 1')  // Lunedì 22:00
.schedule('0 14 * * *')  // Ogni giorno 14:00
.schedule('0 2 * * *')   // Ogni giorno 02:00

// Format: minuto ora giorno mese giornoSettimana
// 0-6 dove 0=Domenica, 1=Lunedì, etc.
```

Poi re-deploy:
```bash
firebase deploy --only functions:updateCityAvailability
```

---

## Costi

**Firebase Cloud Functions**:
- **Invocazioni**: ~1/settimana = 4/mese
- **Compute time**: ~5-10 secondi per esecuzione
- **Costo stimato**: < $0.01/mese (praticamente gratis)

**Nota**: Rientra ampiamente nel free tier di Firebase

---

## Manuale Run (Senza Aspettare Domenica)

Se vuoi aggiornare subito la disponibilità:

```bash
# Opzione 1: Script di test (Raccomandato)
cd functions
node test-availability-update.js

# Opzione 2: Trigger manuale dalla console Firebase
# https://console.firebase.google.com/project/culturaimmersiva-it/functions
# → Trova updateCityAvailability
# → Click "..." → "Execute now"
```

---

## Integrazione con il Sito

Il sistema si integra automaticamente con:

### 1. **Pagina Cities** (`/citta`)
- Usa `loadCitiesAvailability()` per caricare disponibilità real-time
- Ordina: disponibili prima, poi non disponibili
- Badge verde/grigio automatico

### 2. **Home Page** (`/`)
- Mostra prime 6 città disponibili
- Stessa logica di ordinamento

### 3. **Pagina Booking** (`/citta/:cityId`)
- Filtra automaticamente date passate
- Mostra solo slot futuri

---

## Best Practices

1. ✅ **Non modificare manualmente lo status**: Lascia che la function lo aggiorni automaticamente
2. ✅ **Testa prima di deploy**: Usa `test-availability-update.js` per verificare i cambiamenti
3. ✅ **Monitora i logs**: Controlla periodicamente che la function si esegua correttamente
4. ✅ **Backup regolari**: Esporta Firestore regolarmente
5. ✅ **Aggiorna le date**: Aggiungi nuove date future quando necessario

---

## Comandi Rapidi

```bash
# Deploy function
firebase deploy --only functions:updateCityAvailability

# Test manuale
cd functions && node test-availability-update.js

# Logs
firebase functions:log --only updateCityAvailability

# Console Firebase
https://console.firebase.google.com/project/culturaimmersiva-it/functions
```

---

## 🎉 Benefici

✅ **Automatico**: Nessun intervento manuale richiesto
✅ **Affidabile**: Si esegue ogni settimana automaticamente
✅ **Monitorabile**: Logs e summary salvati in Firestore
✅ **Testabile**: Script di test per verificare prima del deploy
✅ **Economico**: Praticamente gratis (rientra nel free tier)
✅ **Scalabile**: Gestisce 40+ città senza problemi

---

**Creato**: 24 Novembre 2025
**Ultima modifica**: 24 Novembre 2025
