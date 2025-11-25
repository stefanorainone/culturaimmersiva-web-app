# Cultura Immersiva - Sito Web React

Sito web per esperienze culturali immersive in realtà virtuale nelle città italiane.

## Tecnologie Utilizzate

- **React 18** - Libreria UI
- **Vite** - Build tool e dev server
- **React Router** - Routing
- **Tailwind CSS** - Styling
- **Framer Motion** - Animazioni
- **React Icons** - Icone

## Struttura del Progetto

```
src/
├── components/
│   ├── layout/          # Header, Footer
│   ├── common/          # Componenti riutilizzabili
│   └── sections/        # Sezioni specifiche
├── pages/               # Pagine principali
│   ├── Home.jsx
│   ├── Cities.jsx
│   ├── CityDetail.jsx
│   ├── Schools.jsx
│   ├── Museums.jsx
│   ├── Hotels.jsx
│   └── Contact.jsx
├── data/                # Dati delle città e contenuti
├── assets/              # Immagini e file statici
└── utils/               # Funzioni di utilità
```

## Caratteristiche

### Pagine Principali
- **Home** - Hero section, caratteristiche principali, città in evidenza
- **Città** - Grid di 40+ città italiane con filtri per regione e ricerca
- **Dettaglio Città** - Informazioni dettagliate sulle esperienze VR per ogni città
- **Scuole** - Soluzioni per istituti educativi
- **Musei** - Servizi per musei e siti culturali
- **Hotel** - Pacchetti per strutture ricettive
- **Contatti** - Form di contatto con validazione

### Design System
- **Colori**:
  - Primary: #022553 (Navy blu)
  - Secondary: #c7925c (Oro)
- **Font**: Poppins (testo), Dancing Script (decorativo)
- **Componenti**: Bottoni, cards, form con stili consistenti

### Funzionalità
- Navigazione responsive con menu mobile
- Animazioni fluide con Framer Motion
- Filtri e ricerca per le città
- Form di contatto funzionale
- Design completamente responsive

## Installazione

```bash
# Installa le dipendenze
npm install

# Avvia il server di sviluppo
npm run dev

# Build per produzione
npm run build

# Preview della build
npm run preview
```

## Sviluppo

Il server di sviluppo sarà disponibile su `http://localhost:5173/`

## 🔒 Sicurezza

### Comandi Disponibili

```bash
# Verifica sicurezza del progetto
npm run security-check

# Crea account amministratore (interattivo)
npm run create-admin
```

### Documentazione Sicurezza

- **[SECURITY.md](./SECURITY.md)** - Documentazione completa sulle misure di sicurezza
- **[SECURITY_IMPROVEMENTS.md](./SECURITY_IMPROVEMENTS.md)** - Registro dei miglioramenti implementati
- **[CAPTCHA_GUIDE.md](./CAPTCHA_GUIDE.md)** - Guida opzionale per implementare CAPTCHA

### Caratteristiche di Sicurezza

✅ **Autenticazione & Autorizzazione**
- Firebase Authentication
- Protected routes per area admin
- Rate limiting su login (5 tentativi in 15 minuti)

✅ **Protezione Attacchi**
- XSS protection (sanitizzazione HTML)
- SQL Injection N/A (Firestore NoSQL)
- CSRF protection via Firebase
- Content Security Policy (CSP)

✅ **Validazione Input**
- Client-side validation completa
- Server-side validation in Cloud Functions
- Sanitizzazione di tutti gli input utente

✅ **Rate Limiting**
- Email: 10 per ora per IP
- Login: 5 tentativi falliti in 15 minuti

✅ **Security Headers**
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Strict-Transport-Security
- Content-Security-Policy
- Referrer-Policy

✅ **Token Security**
- SHA256 hash per magic links
- Scadenza 3 giorni
- Validazione lato server

✅ **Monitoring & Logging**
- Logging tentativi di login
- Monitoring rate limiting
- Alert per attività sospette

### Security Check

Prima di ogni deploy, esegui:

```bash
npm run security-check
```

Il tool verifica:
- ✅ .env non tracciato da git
- ✅ Nessuna password hardcoded
- ✅ Security headers configurati
- ✅ Nessuna vulnerabilità nelle dipendenze
- ✅ Firestore rules corrette
- ✅ Nessuna vulnerabilità XSS
- ✅ Rate limiting implementato
- ✅ Validazione input presente

## Prossimi Passi

1. **Aggiungere immagini reali** - Sostituire i placeholder con foto delle città
2. **Integrare Google Maps** - Embed mappa nella pagina contatti
3. **Implementare backend** - API per il form di contatto
4. **Aggiungere recensioni Google** - Widget recensioni nella home
5. **SEO** - Meta tags, sitemap, robots.txt
6. **Analytics** - Google Analytics o alternative
7. **Performance** - Ottimizzazione immagini, lazy loading
8. **Accessibilità** - Migliorare ARIA labels e navigazione da tastiera

## Note

- Il progetto è stato creato partendo dal template Vite + React
- Tailwind CSS è configurato con i colori del brand
- I dati delle città sono in `src/data/cities.js` - personalizzare secondo necessità
- Il form di contatto attualmente simula l'invio - integrare con backend reale

## Licenza

Tutti i diritti riservati © 2025 Cultura Immersiva
