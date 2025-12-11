const admin = require('firebase-admin');

// Initialize Firebase Admin with Application Default Credentials
admin.initializeApp({
  projectId: 'culturaimmersiva-it'
});

const db = admin.firestore();

const articles = [
  {
    title: "Come digitalizzare un museo: guida completa 2024",
    slug: "come-digitalizzare-museo-guida-completa",
    excerpt: "Scopri le migliori strategie e tecnologie per digitalizzare un museo, dalla creazione di tour virtuali alle app mobile per i visitatori.",
    category: "Digitalizzazione",
    readTime: 12,
    published: true,
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    coverImage: "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=1200",
    content: `
<h2>Perché digitalizzare un museo nel 2024</h2>
<p>La digitalizzazione dei musei non è più un'opzione, ma una necessità. I visitatori di oggi si aspettano esperienze interattive e accessibili, e le istituzioni culturali devono adattarsi per rimanere rilevanti.</p>

<p>In questa guida completa, esploreremo tutte le opzioni disponibili per modernizzare il tuo museo, dai tour virtuali alle app mobile, passando per la realtà aumentata e i sistemi di prenotazione digitale.</p>

<h2>1. Tour virtuali e realtà virtuale</h2>
<p>I <strong>tour virtuali</strong> permettono ai visitatori di esplorare le collezioni da qualsiasi parte del mondo. Questa tecnologia è particolarmente utile per:</p>
<ul>
<li>Raggiungere un pubblico internazionale</li>
<li>Offrire anteprime delle mostre</li>
<li>Preservare digitalmente le collezioni</li>
<li>Creare esperienze immersive uniche</li>
</ul>

<p>La <strong>realtà virtuale (VR)</strong> porta l'esperienza a un livello superiore, permettendo ai visitatori di "entrare" letteralmente nelle opere d'arte o nelle ricostruzioni storiche.</p>

<h2>2. App mobile per musei</h2>
<p>Un'<strong>app mobile dedicata</strong> può trasformare completamente l'esperienza del visitatore. Le funzionalità più richieste includono:</p>
<ul>
<li><strong>Audioguide digitali</strong> in più lingue</li>
<li><strong>Mappe interattive</strong> del museo</li>
<li><strong>Informazioni approfondite</strong> sulle opere</li>
<li><strong>Gamification</strong> per coinvolgere i più giovani</li>
<li><strong>Prenotazione biglietti</strong> integrata</li>
</ul>

<h2>3. Realtà aumentata (AR)</h2>
<p>La <strong>realtà aumentata</strong> sovrappone contenuti digitali al mondo reale. Nel contesto museale può essere utilizzata per:</p>
<ul>
<li>Ricostruire opere danneggiate o incomplete</li>
<li>Mostrare come apparivano gli oggetti nel loro contesto originale</li>
<li>Aggiungere animazioni e contenuti interattivi</li>
<li>Creare cacce al tesoro digitali per famiglie</li>
</ul>

<h2>4. Sistemi di prenotazione e gestione visitatori</h2>
<p>Un <strong>sistema di prenotazione online</strong> moderno permette di:</p>
<ul>
<li>Gestire i flussi di visitatori</li>
<li>Ridurre le code all'ingresso</li>
<li>Raccogliere dati per analisi e marketing</li>
<li>Offrire biglietti a fasce orarie</li>
</ul>

<h2>5. Digital signage e installazioni interattive</h2>
<p>Schermi touch, tavoli interattivi e installazioni multimediali possono arricchire l'esperienza in loco, offrendo approfondimenti e modalità di fruizione innovative.</p>

<h2>Come iniziare il percorso di digitalizzazione</h2>
<p>Il primo passo è sempre un'<strong>analisi delle esigenze</strong> specifiche del museo e del suo pubblico. Non tutti i musei hanno bisogno delle stesse soluzioni: un museo archeologico avrà priorità diverse da una galleria d'arte contemporanea.</p>

<p>È fondamentale anche considerare il <strong>budget disponibile</strong> e pianificare un percorso graduale, iniziando magari da un progetto pilota per poi espandere le iniziative di successo.</p>

<h2>Conclusioni</h2>
<p>La digitalizzazione è un investimento che ripaga nel tempo, aumentando l'attrattività del museo, migliorando l'esperienza dei visitatori e aprendo nuove fonti di revenue.</p>

<p>Se stai pensando di digitalizzare il tuo museo, <strong>contattaci per una consulenza gratuita</strong>. Il nostro team ha esperienza nello sviluppo di soluzioni su misura per istituzioni culturali di ogni dimensione.</p>
`
  },
  {
    title: "Realtà virtuale per la valorizzazione del territorio: casi di successo",
    slug: "realta-virtuale-valorizzazione-territorio",
    excerpt: "Come comuni e enti turistici stanno usando la VR per promuovere il patrimonio culturale e attrarre visitatori. Esempi concreti dall'Italia.",
    category: "VR e Musei",
    readTime: 10,
    published: true,
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    coverImage: "https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=1200",
    content: `
<h2>La VR come strumento di promozione territoriale</h2>
<p>La <strong>realtà virtuale</strong> sta rivoluzionando il modo in cui i territori promuovono il proprio patrimonio culturale e turistico. Non si tratta più solo di brochure e video promozionali: oggi è possibile far "vivere" un luogo prima ancora di visitarlo.</p>

<h2>Vantaggi della VR per comuni e enti turistici</h2>
<ul>
<li><strong>Promozione immersiva</strong>: i potenziali visitatori possono esplorare virtualmente le attrazioni</li>
<li><strong>Accessibilità</strong>: persone con mobilità ridotta possono visitare luoghi altrimenti inaccessibili</li>
<li><strong>Preservazione</strong>: documenta digitalmente siti a rischio o già deteriorati</li>
<li><strong>Educazione</strong>: strumento didattico per scuole e università</li>
<li><strong>Eventi</strong>: attrazione per fiere turistiche e stand promozionali</li>
</ul>

<h2>Tipologie di esperienze VR per il territorio</h2>

<h3>Tour virtuali di città storiche</h3>
<p>Permettono di esplorare centri storici, monumenti e piazze in modo immersivo. Possono includere ricostruzioni storiche che mostrano come apparivano i luoghi in epoche passate.</p>

<h3>Ricostruzioni archeologiche</h3>
<p>Siti archeologici prendono vita con ricostruzioni 3D che mostrano edifici, templi e città come erano in origine. Un modo potente per comunicare la storia.</p>

<h3>Esperienze naturalistiche</h3>
<p>Parchi naturali, riserve e paesaggi possono essere esplorati virtualmente, sensibilizzando i visitatori alla tutela ambientale.</p>

<h2>Come implementare un progetto VR</h2>
<p>Un progetto di VR territoriale richiede diverse fasi:</p>
<ol>
<li><strong>Analisi</strong>: identificare i luoghi e le storie da raccontare</li>
<li><strong>Produzione</strong>: riprese 360°, modellazione 3D, sviluppo software</li>
<li><strong>Distribuzione</strong>: app, totem, eventi itineranti</li>
<li><strong>Promozione</strong>: comunicazione e marketing</li>
</ol>

<h2>Il nostro approccio</h2>
<p>Cultura Immersiva organizza <strong>eventi VR itineranti</strong> in oltre 40 città italiane, portando l'esperienza della realtà virtuale direttamente ai cittadini e ai turisti.</p>

<p>Collaboriamo con <strong>comuni, pro loco e associazioni culturali</strong> per creare esperienze su misura che valorizzino le specificità di ogni territorio.</p>

<h2>Conclusioni</h2>
<p>La VR è uno strumento potente per la promozione territoriale, capace di emozionare e coinvolgere come nessun altro medium. L'investimento iniziale viene ripagato dalla visibilità e dall'attrattività che genera.</p>
`
  },
  {
    title: "Quanto costa sviluppare un'app per un museo",
    slug: "quanto-costa-app-museo",
    excerpt: "Guida ai costi di sviluppo di un'app mobile per musei: dalle funzionalità base alle soluzioni più avanzate. Budget e tempi realistici.",
    category: "App Mobile",
    readTime: 8,
    published: true,
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    coverImage: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200",
    content: `
<h2>Fattori che influenzano il costo</h2>
<p>Il costo di un'<strong>app per museo</strong> può variare significativamente in base a diversi fattori. In questo articolo analizziamo cosa influenza il budget e forniamo indicazioni concrete.</p>

<h2>Tipologie di app museali</h2>

<h3>App base (audioguida digitale)</h3>
<p><strong>Budget indicativo: 8.000 - 15.000€</strong></p>
<p>Funzionalità tipiche:</p>
<ul>
<li>Audioguida con tracce audio per le opere principali</li>
<li>Mappa del museo</li>
<li>Informazioni pratiche (orari, biglietti)</li>
<li>Disponibile per iOS e Android</li>
</ul>

<h3>App intermedia (interattiva)</h3>
<p><strong>Budget indicativo: 20.000 - 40.000€</strong></p>
<p>Funzionalità aggiuntive:</p>
<ul>
<li>Contenuti multimediali (video, gallery)</li>
<li>Percorsi tematici personalizzabili</li>
<li>Sistema di beacon per contenuti basati sulla posizione</li>
<li>Multilingua (3-5 lingue)</li>
<li>Accessibilità per non vedenti</li>
</ul>

<h3>App avanzata (con AR/VR)</h3>
<p><strong>Budget indicativo: 50.000 - 100.000€+</strong></p>
<p>Funzionalità premium:</p>
<ul>
<li>Realtà aumentata sulle opere</li>
<li>Tour virtuali integrati</li>
<li>Gamification e quiz</li>
<li>E-commerce per merchandising</li>
<li>Sistema di prenotazione integrato</li>
<li>Analytics avanzati</li>
</ul>

<h2>Costi ricorrenti da considerare</h2>
<p>Oltre allo sviluppo iniziale, ci sono costi annuali:</p>
<ul>
<li><strong>Hosting e server</strong>: 500 - 2.000€/anno</li>
<li><strong>Manutenzione</strong>: 10-20% del costo iniziale/anno</li>
<li><strong>Aggiornamenti contenuti</strong>: variabile</li>
<li><strong>Account sviluppatore</strong>: ~125€/anno (Apple + Google)</li>
</ul>

<h2>Tempi di sviluppo</h2>
<ul>
<li>App base: 2-3 mesi</li>
<li>App intermedia: 4-6 mesi</li>
<li>App avanzata: 6-12 mesi</li>
</ul>

<h2>Come ottimizzare il budget</h2>
<ol>
<li><strong>Partire dal MVP</strong>: sviluppare prima le funzionalità essenziali</li>
<li><strong>Pianificare l'evoluzione</strong>: aggiungere features nel tempo</li>
<li><strong>Riutilizzare asset esistenti</strong>: foto, testi, audio già prodotti</li>
<li><strong>Considerare soluzioni ibride</strong>: web app vs app native</li>
</ol>

<h2>Il nostro servizio</h2>
<p>Cultura Immersiva sviluppa <strong>app su misura per musei</strong> di ogni dimensione. Offriamo consulenza gratuita per definire insieme la soluzione più adatta alle tue esigenze e al tuo budget.</p>

<p><strong>Contattaci</strong> per un preventivo personalizzato.</p>
`
  },
  {
    title: "VR nei musei: 5 casi di successo in Italia",
    slug: "vr-musei-casi-successo-italia",
    excerpt: "Esempi concreti di come i musei italiani stanno usando la realtà virtuale per migliorare l'esperienza dei visitatori e aumentare l'affluenza.",
    category: "VR e Musei",
    readTime: 9,
    published: true,
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    coverImage: "https://images.unsplash.com/photo-1617802690992-15d93263d3a9?w=1200",
    content: `
<h2>La rivoluzione VR nei musei italiani</h2>
<p>L'Italia, con il suo immenso patrimonio culturale, sta abbracciando la <strong>realtà virtuale</strong> per offrire nuove modalità di fruizione delle sue ricchezze artistiche e storiche.</p>

<h2>1. Ricostruzioni di Pompei ed Ercolano</h2>
<p>Diversi progetti VR permettono di vedere le antiche città romane come apparivano prima dell'eruzione del Vesuvio. I visitatori possono:</p>
<ul>
<li>Camminare per le strade ricostruite</li>
<li>Entrare nelle domus e vedere gli affreschi originali</li>
<li>Assistere a scene di vita quotidiana</li>
</ul>
<p>Questo tipo di esperienza trasforma completamente la comprensione del sito archeologico.</p>

<h2>2. Musei archeologici con ricostruzioni 3D</h2>
<p>Molti musei archeologici hanno implementato <strong>postazioni VR</strong> che mostrano:</p>
<ul>
<li>Come venivano usati gli oggetti esposti</li>
<li>Il contesto originale dei reperti</li>
<li>Ricostruzioni di edifici e templi</li>
</ul>

<h2>3. Pinacoteche con tour immersivi</h2>
<p>Alcune pinacoteche offrono la possibilità di "entrare" nei quadri, esplorando i paesaggi dipinti o incontrando i personaggi raffigurati.</p>

<h2>4. Musei scientifici interattivi</h2>
<p>I musei della scienza utilizzano la VR per:</p>
<ul>
<li>Viaggi nel sistema solare</li>
<li>Esplorazione del corpo umano</li>
<li>Simulazioni di fenomeni naturali</li>
</ul>

<h2>5. Esperienze itineranti</h2>
<p>Non solo musei fissi: eventi VR itineranti portano l'esperienza immersiva nelle piazze, nelle scuole e negli eventi culturali, raggiungendo un pubblico più ampio.</p>

<h2>Risultati misurabili</h2>
<p>I musei che hanno implementato soluzioni VR riportano:</p>
<ul>
<li><strong>+30-50%</strong> di tempo medio di visita</li>
<li><strong>+40%</strong> di soddisfazione dei visitatori</li>
<li><strong>+25%</strong> di visitatori nella fascia 18-35 anni</li>
<li>Maggiore copertura mediatica</li>
</ul>

<h2>Come implementare la VR nel tuo museo</h2>
<p>Esistono diverse opzioni per introdurre la VR:</p>
<ol>
<li><strong>Postazioni fisse</strong>: visori dedicati in punti specifici</li>
<li><strong>Tour guidati VR</strong>: gruppi accompagnati da un operatore</li>
<li><strong>App con cardboard</strong>: soluzione low-cost per i visitatori</li>
<li><strong>Eventi speciali</strong>: esperienze VR a rotazione</li>
</ol>

<h2>Conclusioni</h2>
<p>La VR non sostituisce l'esperienza reale, ma la arricchisce. È uno strumento potente per <strong>coinvolgere nuovi pubblici</strong> e offrire prospettive impossibili da ottenere altrimenti.</p>
`
  },
  {
    title: "Sviluppo software per enti culturali: cosa sapere prima di iniziare",
    slug: "sviluppo-software-enti-culturali",
    excerpt: "Guida pratica per musei, fondazioni e associazioni culturali che vogliono sviluppare software personalizzato. Errori da evitare e best practice.",
    category: "Sviluppo Software",
    readTime: 11,
    published: true,
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    coverImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200",
    content: `
<h2>La digitalizzazione degli enti culturali</h2>
<p>Musei, fondazioni, archivi e biblioteche hanno esigenze specifiche che spesso i software standard non riescono a soddisfare. Ecco perché molti enti scelgono lo <strong>sviluppo di soluzioni personalizzate</strong>.</p>

<h2>Tipologie di software per enti culturali</h2>

<h3>Gestione collezioni</h3>
<p>Software per catalogare, documentare e gestire le collezioni:</p>
<ul>
<li>Schede catalografiche digitali</li>
<li>Gestione immagini e documenti</li>
<li>Tracciamento movimentazioni</li>
<li>Gestione prestiti e restauri</li>
</ul>

<h3>Sistemi di prenotazione e biglietteria</h3>
<ul>
<li>Vendita biglietti online</li>
<li>Gestione fasce orarie</li>
<li>Integrazione con sistemi di pagamento</li>
<li>Reportistica e analytics</li>
</ul>

<h3>Piattaforme per la didattica</h3>
<ul>
<li>Prenotazione laboratori</li>
<li>Gestione gruppi scolastici</li>
<li>Materiali didattici digitali</li>
<li>Comunicazione con insegnanti</li>
</ul>

<h3>CRM e gestione membri</h3>
<ul>
<li>Database sostenitori e donatori</li>
<li>Gestione abbonamenti e tessere</li>
<li>Comunicazioni personalizzate</li>
<li>Fundraising</li>
</ul>

<h2>Errori comuni da evitare</h2>

<h3>1. Non definire chiaramente i requisiti</h3>
<p>Prima di iniziare lo sviluppo, è fondamentale documentare in dettaglio cosa deve fare il software. Requisiti vaghi portano a risultati deludenti.</p>

<h3>2. Sottovalutare la formazione</h3>
<p>Il miglior software è inutile se il personale non sa usarlo. Prevedere sempre tempo e budget per la formazione.</p>

<h3>3. Non considerare l'integrazione</h3>
<p>Il nuovo software dovrà dialogare con sistemi esistenti? Verificarlo in anticipo evita costosi interventi successivi.</p>

<h3>4. Trascurare la manutenzione</h3>
<p>Un software richiede aggiornamenti e manutenzione continua. Prevedere un budget annuale dedicato.</p>

<h2>Best practice per un progetto di successo</h2>

<ol>
<li><strong>Coinvolgere gli utenti finali</strong> nella definizione dei requisiti</li>
<li><strong>Procedere per fasi</strong>: rilasci incrementali permettono correzioni in corso d'opera</li>
<li><strong>Documentare tutto</strong>: specifiche, manuali, procedure</li>
<li><strong>Prevedere test approfonditi</strong> prima del rilascio</li>
<li><strong>Scegliere tecnologie standard</strong> per facilitare manutenzione futura</li>
</ol>

<h2>Come scegliere il partner giusto</h2>
<p>Nella scelta del fornitore, valutare:</p>
<ul>
<li><strong>Esperienza nel settore culturale</strong>: conosce le specificità del settore?</li>
<li><strong>Portfolio</strong>: ha già realizzato progetti simili?</li>
<li><strong>Supporto post-vendita</strong>: cosa offre dopo il rilascio?</li>
<li><strong>Tecnologie utilizzate</strong>: sono moderne e manutenibili?</li>
<li><strong>Referenze</strong>: cosa dicono i clienti precedenti?</li>
</ul>

<h2>Il nostro approccio</h2>
<p>Cultura Immersiva sviluppa <strong>software su misura per enti culturali</strong>, combinando competenze tecniche con la comprensione delle esigenze specifiche del settore.</p>

<p>Offriamo <strong>consulenza gratuita</strong> per analizzare le tue esigenze e proporre la soluzione più adatta.</p>
`
  }
];

async function seedArticles() {
  console.log('Seeding articles...');

  for (const article of articles) {
    try {
      const docRef = await db.collection('articles').add(article);
      console.log(`Created article: ${article.title} (${docRef.id})`);
    } catch (error) {
      console.error(`Error creating article ${article.title}:`, error);
    }
  }

  console.log('Done seeding articles!');
  process.exit(0);
}

seedArticles();
