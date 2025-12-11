const TermsConditions = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-primary mb-8">Termini e Condizioni</h1>

          <p className="text-sm text-gray-500 mb-8">
            Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">1. Identificazione del Fornitore</h2>
            <p className="text-gray-600 leading-relaxed">
              I presenti Termini e Condizioni regolano l'utilizzo del sito web e dei servizi offerti da:<br /><br />
              <strong>Cultura Immersiva</strong><br />
              Via Mauro 9<br />
              80036 Palma Campania (NA) - Italia<br />
              P.IVA: 09880501219<br />
              Email: <a href="mailto:info@culturaimmersiva.it" className="text-primary hover:underline">info@culturaimmersiva.it</a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">2. Definizioni</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>"Fornitore":</strong> Cultura Immersiva, come sopra identificato</li>
              <li><strong>"Utente":</strong> qualsiasi persona fisica che accede al sito web e/o utilizza i servizi offerti</li>
              <li><strong>"Servizio":</strong> le esperienze culturali immersive in realtà virtuale offerte da Cultura Immersiva</li>
              <li><strong>"Prenotazione":</strong> la richiesta di partecipazione a un'esperienza immersiva effettuata tramite il sito</li>
              <li><strong>"Sito":</strong> il sito web www.culturaimmersiva.it</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">3. Accettazione dei Termini</h2>
            <p className="text-gray-600 leading-relaxed">
              L'utilizzo del Sito e dei Servizi implica l'accettazione integrale dei presenti Termini e Condizioni.
              Se l'Utente non accetta i presenti Termini, è pregato di non utilizzare il Sito e di non effettuare prenotazioni.
              Il Fornitore si riserva il diritto di modificare i presenti Termini in qualsiasi momento, dandone comunicazione sul Sito.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">4. Descrizione del Servizio</h2>
            <p className="text-gray-600 leading-relaxed">
              Cultura Immersiva offre esperienze culturali immersive in realtà virtuale nelle città italiane.
              Le esperienze permettono ai partecipanti di esplorare luoghi storici, artistici e culturali attraverso tecnologie di realtà virtuale.
              Le specifiche di ciascuna esperienza (durata, contenuti, location, prezzi) sono indicate nelle rispettive pagine del Sito.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">5. Attrezzature e Dispositivi Meta Quest 3</h2>

            <h3 className="text-lg font-medium text-gray-700 mb-2">5.1 Noleggio delle Attrezzature</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Per lo svolgimento delle esperienze immersive, Cultura Immersiva mette a disposizione dei partecipanti visori di realtà virtuale Meta Quest 3 e relativi accessori in regime di noleggio temporaneo per la durata dell'esperienza.
              Le attrezzature rimangono di esclusiva proprietà di Cultura Immersiva e devono essere restituite al termine dell'esperienza nelle medesime condizioni in cui sono state consegnate.
            </p>

            <h3 className="text-lg font-medium text-gray-700 mb-2">5.2 Condizioni di Utilizzo dei Visori Meta Quest 3</h3>
            <p className="text-gray-600 leading-relaxed mb-4">L'Utente, utilizzando i dispositivi Meta Quest 3, accetta e si impegna a rispettare le seguenti condizioni:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>Utilizzare il visore esclusivamente secondo le istruzioni fornite dal personale di Cultura Immersiva</li>
              <li>Non manomettere, modificare o tentare di riparare il dispositivo</li>
              <li>Non rimuovere etichette, adesivi o componenti dal visore</li>
              <li>Maneggiare il dispositivo con cura, evitando urti, cadute o esposizione a liquidi</li>
              <li>Non cedere il visore a terzi durante l'esperienza senza autorizzazione del personale</li>
              <li>Segnalare immediatamente al personale qualsiasi malfunzionamento o danno riscontrato</li>
              <li>Rispettare le avvertenze di sicurezza indicate da Meta per l'utilizzo del dispositivo</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-700 mb-2">5.3 Avvertenze di Sicurezza Meta Quest 3</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Prima di utilizzare il visore Meta Quest 3, l'Utente è tenuto a prendere visione delle seguenti avvertenze di sicurezza stabilite dal produttore Meta:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li><strong>Epilessia fotosensibile:</strong> alcune persone (circa 1 su 4000) possono avere crisi epilettiche o svenimenti provocati da luci lampeggianti o pattern visivi. Se l'Utente o un suo familiare ha una storia di epilessia o convulsioni, deve consultare un medico prima dell'uso</li>
              <li><strong>Età minima:</strong> il dispositivo non è destinato all'uso da parte di bambini di età inferiore ai 13 anni</li>
              <li><strong>Disagio fisico:</strong> interrompere immediatamente l'uso in caso di nausea, vertigini, disorientamento, mal di testa, affaticamento degli occhi, convulsioni o altri sintomi</li>
              <li><strong>Lesioni da movimento:</strong> l'uso del visore può causare perdita di equilibrio. L'Utente deve assicurarsi di avere spazio sufficiente e di essere consapevole dell'ambiente circostante</li>
              <li><strong>Affaticamento:</strong> l'uso prolungato può causare affaticamento muscolare o degli occhi. Si raccomandano pause regolari</li>
              <li><strong>Interferenze con dispositivi medici:</strong> il visore contiene magneti e componenti che emettono onde radio che potrebbero interferire con pacemaker, apparecchi acustici o altri dispositivi medici impiantati</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-700 mb-2">5.4 Danni alle Attrezzature</h3>
            <p className="text-gray-600 leading-relaxed">
              L'Utente è responsabile per qualsiasi danno arrecato alle attrezzature durante l'utilizzo causato da negligenza, uso improprio o mancato rispetto delle istruzioni fornite.
              In caso di danno, l'Utente sarà tenuto al risarcimento del valore di riparazione o sostituzione dell'attrezzatura danneggiata.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">6. Prenotazioni</h2>
            <h3 className="text-lg font-medium text-gray-700 mb-2">6.1 Procedura di Prenotazione</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              L'Utente può prenotare un'esperienza selezionando la città, la data e l'orario desiderati e fornendo i propri dati personali (nome, email, numero WhatsApp).
              La prenotazione si considera confermata al momento dell'invio della email di conferma da parte del sistema.
            </p>

            <h3 className="text-lg font-medium text-gray-700 mb-2">6.2 Disponibilità</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Le prenotazioni sono soggette a disponibilità. Il numero di posti per ciascuna sessione è limitato.
              Il Fornitore si riserva il diritto di modificare la disponibilità in qualsiasi momento.
            </p>

            <h3 className="text-lg font-medium text-gray-700 mb-2">6.3 Conferma</h3>
            <p className="text-gray-600 leading-relaxed">
              Dopo aver effettuato la prenotazione, l'Utente riceverà una email di conferma contenente i dettagli della prenotazione e i link per la gestione della stessa.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">7. Prezzi e Pagamenti</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              I prezzi delle esperienze sono indicati nelle rispettive pagine del Sito e sono espressi in Euro (EUR), IVA inclusa ove applicabile.
              Il Fornitore si riserva il diritto di modificare i prezzi in qualsiasi momento, fermo restando che le prenotazioni già confermate manterranno il prezzo indicato al momento della prenotazione.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Le modalità di pagamento sono specificate nella pagina di ciascuna esperienza. Alcune esperienze potrebbero prevedere il pagamento sul posto.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">8. Modifica e Cancellazione</h2>
            <h3 className="text-lg font-medium text-gray-700 mb-2">8.1 Modifica da parte dell'Utente</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              L'Utente può modificare la propria prenotazione (data, orario, numero di partecipanti) tramite il link ricevuto nella email di conferma, fino alla data dell'evento.
            </p>

            <h3 className="text-lg font-medium text-gray-700 mb-2">8.2 Cancellazione da parte dell'Utente</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              L'Utente può cancellare la propria prenotazione in qualsiasi momento fino alla data dell'evento tramite il link ricevuto nella email di conferma.
              In caso di cancellazione, i posti torneranno disponibili per altri utenti.
            </p>

            <h3 className="text-lg font-medium text-gray-700 mb-2">8.3 Cancellazione da parte del Fornitore</h3>
            <p className="text-gray-600 leading-relaxed">
              Il Fornitore si riserva il diritto di cancellare o modificare le esperienze programmate per cause di forza maggiore, condizioni meteorologiche avverse, indisponibilità del personale o altre circostanze imprevedibili.
              In tal caso, l'Utente sarà tempestivamente informato e potrà scegliere una data alternativa o ottenere il rimborso integrale dell'eventuale pagamento effettuato.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">9. Obblighi dell'Utente</h2>
            <p className="text-gray-600 leading-relaxed mb-4">L'Utente si impegna a:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Fornire dati personali veritieri e aggiornati</li>
              <li>Presentarsi puntuali all'appuntamento</li>
              <li>Seguire le istruzioni del personale durante l'esperienza</li>
              <li>Utilizzare correttamente le attrezzature messe a disposizione</li>
              <li>Non arrecare danni alle attrezzature o agli spazi</li>
              <li>Mantenere un comportamento rispettoso verso il personale e gli altri partecipanti</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">10. Responsabilità e Manleva</h2>

            <h3 className="text-lg font-medium text-gray-700 mb-2">10.1 Limitazione di Responsabilità</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Il Fornitore non è responsabile per danni indiretti, incidentali o consequenti derivanti dall'utilizzo del Sito o dalla partecipazione alle esperienze, salvo nei casi di dolo o colpa grave.
            </p>

            <h3 className="text-lg font-medium text-gray-700 mb-2">10.2 Esclusione di Responsabilità per Danni all'Utente</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Cultura Immersiva fornisce le attrezzature (visori Meta Quest 3 e accessori) in regime di noleggio temporaneo esclusivamente per la durata dell'esperienza.
              <strong> Cultura Immersiva non si assume alcuna responsabilità per eventuali danni, lesioni o pregiudizi di qualsiasi natura arrecati agli Utenti derivanti da cause non direttamente attribuibili a Cultura Immersiva</strong>, inclusi ma non limitati a:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>Danni derivanti da condizioni mediche preesistenti dell'Utente (epilessia, disturbi dell'equilibrio, patologie cardiache, ecc.)</li>
              <li>Danni causati dal mancato rispetto delle istruzioni fornite dal personale o delle avvertenze di sicurezza</li>
              <li>Danni derivanti da uso improprio o negligente delle attrezzature</li>
              <li>Danni causati da reazioni individuali all'utilizzo della realtà virtuale (motion sickness, nausea, vertigini, affaticamento)</li>
              <li>Danni derivanti da difetti intrinseci dei dispositivi Meta Quest 3, per i quali si applicano le garanzie e responsabilità del produttore Meta</li>
              <li>Danni causati da comportamenti dell'Utente non conformi alle norme di sicurezza</li>
              <li>Danni derivanti da interferenze con dispositivi medici impiantati (pacemaker, apparecchi acustici, ecc.)</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-700 mb-2">10.3 Responsabilità del Produttore</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              I visori Meta Quest 3 sono prodotti e commercializzati da Meta Platforms, Inc. Per eventuali difetti di fabbricazione, malfunzionamenti del dispositivo o problematiche tecniche intrinseche al prodotto, l'Utente dovrà rivolgersi direttamente al produttore secondo i termini di garanzia e le condizioni d'uso stabilite da Meta.
              Cultura Immersiva non è responsabile per eventuali danni derivanti da difetti del prodotto non causati da negligenza del Fornitore.
            </p>

            <h3 className="text-lg font-medium text-gray-700 mb-2">10.4 Assunzione di Rischio</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              L'Utente dichiara di essere consapevole che l'utilizzo di dispositivi di realtà virtuale comporta rischi intrinseci e partecipa alle esperienze assumendosi la piena responsabilità per la propria salute e sicurezza.
              L'Utente dichiara di non avere condizioni mediche che possano essere aggravate dall'utilizzo di dispositivi VR, ovvero di aver consultato un medico in caso di dubbio.
            </p>

            <h3 className="text-lg font-medium text-gray-700 mb-2">10.5 Avvertenze sulla Realtà Virtuale</h3>
            <p className="text-gray-600 leading-relaxed">
              L'utilizzo di dispositivi di realtà virtuale può causare in alcuni soggetti sensazioni di disorientamento, nausea o affaticamento visivo (motion sickness).
              L'Utente partecipa alle esperienze sotto la propria responsabilità. Si consiglia di interrompere l'esperienza in caso di malessere.
              Le esperienze potrebbero non essere adatte a persone con epilessia fotosensibile o altre condizioni mediche. In caso di dubbio, si consiglia di consultare un medico prima della partecipazione.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">11. Proprietà Intellettuale</h2>
            <p className="text-gray-600 leading-relaxed">
              Tutti i contenuti presenti sul Sito (testi, immagini, video, grafica, loghi, software) sono di proprietà esclusiva del Fornitore o dei suoi licenzianti e sono protetti dalle leggi sul diritto d'autore e sulla proprietà intellettuale.
              È vietata la riproduzione, distribuzione, modifica o utilizzo dei contenuti senza l'autorizzazione scritta del Fornitore.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">12. Privacy</h2>
            <p className="text-gray-600 leading-relaxed">
              Il trattamento dei dati personali dell'Utente è disciplinato dalla nostra <a href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</a>, che costituisce parte integrante dei presenti Termini e Condizioni.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">13. Comunicazioni</h2>
            <p className="text-gray-600 leading-relaxed">
              Tutte le comunicazioni relative al servizio saranno inviate all'indirizzo email fornito dall'Utente in fase di prenotazione.
              L'Utente è responsabile di fornire un indirizzo email valido e di controllare regolarmente la propria casella di posta, inclusa la cartella spam.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">14. Legge Applicabile e Foro Competente</h2>
            <p className="text-gray-600 leading-relaxed">
              I presenti Termini e Condizioni sono regolati dalla legge italiana.
              Per qualsiasi controversia derivante dall'interpretazione o dall'esecuzione dei presenti Termini, sarà competente il Foro di Napoli, fatti salvi i diritti del consumatore ai sensi del D.Lgs. 206/2005 (Codice del Consumo) che prevedono la competenza del foro di residenza del consumatore.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">15. Risoluzione delle Controversie Online</h2>
            <p className="text-gray-600 leading-relaxed">
              Ai sensi dell'art. 14 del Regolamento UE n. 524/2013, si informa che in caso di controversia è possibile presentare un reclamo attraverso la piattaforma ODR (Online Dispute Resolution) messa a disposizione dalla Commissione Europea, raggiungibile al seguente link: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://ec.europa.eu/consumers/odr</a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">16. Disposizioni Finali</h2>
            <p className="text-gray-600 leading-relaxed">
              L'eventuale nullità o inefficacia di una o più clausole dei presenti Termini non comporterà la nullità delle restanti clausole, che rimarranno pienamente valide ed efficaci.
              Il mancato esercizio da parte del Fornitore di un diritto previsto dai presenti Termini non costituirà rinuncia a tale diritto.
            </p>
          </section>

          <section className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Contatti</h2>
            <p className="text-gray-600">
              Per qualsiasi domanda o chiarimento sui presenti Termini e Condizioni, contattare:<br /><br />
              <strong>Cultura Immersiva</strong><br />
              Via Mauro 9, 80036 Palma Campania (NA) - Italia<br />
              P.IVA: 09880501219<br />
              Email: <a href="mailto:info@culturaimmersiva.it" className="text-primary hover:underline">info@culturaimmersiva.it</a><br />
              Tel: <a href="tel:+393292890532" className="text-primary hover:underline">+39 329 289 0532</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsConditions;
