# Guida Deploy su Firebase Hosting

Il progetto è già configurato e compilato. Segui questi passaggi per pubblicarlo su Firebase Hosting.

## Prerequisiti

- Account Google
- Accesso alla Console Firebase (https://console.firebase.google.com)

## Passo 1: Crea un Nuovo Progetto Firebase

1. Vai su https://console.firebase.google.com
2. Clicca su "Aggiungi progetto"
3. Inserisci il nome del progetto (es: "culturaimmersiva" o "cultura-immersiva-it")
4. Accetta i termini e continua
5. Disabilita Google Analytics se non necessario
6. Clicca su "Crea progetto"

## Passo 2: Abilita Firebase Hosting

1. Nel progetto Firebase, vai su "Build" > "Hosting" nel menu laterale
2. Clicca su "Inizia"
3. Segui i passaggi guidati (non serve installare nulla, è già fatto)

## Passo 3: Login a Firebase

Apri il terminale nella cartella del progetto ed esegui:

```bash
npx firebase login
```

Questo aprirà il browser per l'autenticazione. Accedi con il tuo account Google.

## Passo 4: Collega il Progetto Firebase

Dopo aver creato il progetto su Firebase Console, devi collegarlo localmente:

1. Apri il file `.firebaserc` nella root del progetto
2. Sostituisci `"culturaimmersiva"` con il nome del tuo progetto Firebase:

```json
{
  "projects": {
    "default": "il-tuo-nome-progetto"
  }
}
```

## Passo 5: Deploy

Ora puoi fare il deploy con un solo comando:

```bash
npm run deploy
```

Oppure:

```bash
npx firebase deploy
```

## Passo 6: Verifica il Deploy

Dopo il deploy, Firebase ti darà due URL:

- **Hosting URL**: https://il-tuo-progetto.web.app
- **Hosting URL**: https://il-tuo-progetto.firebaseapp.com

Apri uno di questi URL nel browser per vedere il sito online!

## Comandi Utili

```bash
# Build del progetto (se hai fatto modifiche)
npm run build

# Deploy completo (build + deploy)
npm run deploy

# Solo deploy (senza build)
npx firebase deploy --only hosting

# Anteprima locale del build
npm run preview
```

## Dominio Personalizzato

Per collegare il tuo dominio personalizzato (es: culturaimmersiva.it):

1. Vai su Firebase Console > Hosting
2. Clicca su "Aggiungi dominio personalizzato"
3. Inserisci il tuo dominio
4. Segui le istruzioni per aggiornare i record DNS

## Configurazione File

Il progetto include già questi file di configurazione:

- `firebase.json` - Configurazione Firebase Hosting
- `.firebaserc` - Collegamento al progetto Firebase
- `dist/` - Cartella con il build ottimizzato per la produzione

## Note

- Il sito è già stato compilato nella cartella `dist/`
- Tutte le dipendenze sono installate
- La configurazione è pronta per React Router (SPA)
- Ricorda di aggiornare `.firebaserc` con il nome del tuo progetto!

## Troubleshooting

### Errore "Project not found"
Assicurati di aver aggiornato il file `.firebaserc` con il nome corretto del tuo progetto Firebase.

### Errore "Permission denied"
Esegui `npx firebase logout` e poi `npx firebase login` per riautenticarti.

### Build fallito
Esegui `npm install` per assicurarti che tutte le dipendenze siano installate.

---

Buon deploy! 🚀
