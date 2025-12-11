const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-primary mb-8">Privacy Policy</h1>

          <p className="text-sm text-gray-500 mb-8">
            Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">1. Titolare del Trattamento</h2>
            <p className="text-gray-600 leading-relaxed">
              Il Titolare del trattamento dei dati personali è:<br /><br />
              <strong>Cultura Immersiva</strong><br />
              Via Mauro 9<br />
              80036 Palma Campania (NA) - Italia<br />
              P.IVA: 09880501219<br />
              Email: <a href="mailto:info@culturaimmersiva.it" className="text-primary hover:underline">info@culturaimmersiva.it</a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">2. Tipologie di Dati Raccolti</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Fra i Dati Personali raccolti da questa Applicazione, in modo autonomo o tramite terze parti, ci sono:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Dati di contatto:</strong> nome, cognome, indirizzo email, numero di telefono/WhatsApp</li>
              <li><strong>Dati di navigazione:</strong> indirizzo IP, tipo di browser, sistema operativo, pagine visitate, data e ora di accesso</li>
              <li><strong>Dati di prenotazione:</strong> data, orario e numero di partecipanti per le esperienze prenotate</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">3. Finalità del Trattamento</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              I Dati dell'Utente sono raccolti per le seguenti finalità:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Gestione delle prenotazioni:</strong> per consentire la prenotazione delle esperienze immersive e l'invio di conferme e promemoria</li>
              <li><strong>Comunicazioni di servizio:</strong> per inviare informazioni relative alle prenotazioni effettuate (conferma, modifica, cancellazione, reminder)</li>
              <li><strong>Assistenza clienti:</strong> per rispondere alle richieste di informazioni e supporto</li>
              <li><strong>Adempimenti legali:</strong> per adempiere ad obblighi previsti dalla legge, da regolamenti o dalla normativa comunitaria</li>
              <li><strong>Analisi statistica:</strong> in forma anonima e aggregata, per migliorare i nostri servizi</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">4. Base Giuridica del Trattamento</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Il trattamento dei Dati Personali si basa sulle seguenti basi giuridiche ai sensi dell'Art. 6 del GDPR:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Esecuzione di un contratto:</strong> il trattamento è necessario per l'esecuzione della prenotazione e l'erogazione del servizio richiesto</li>
              <li><strong>Consenso:</strong> l'Utente ha prestato il proprio consenso per una o più finalità specifiche (es. invio di comunicazioni promozionali)</li>
              <li><strong>Obbligo legale:</strong> il trattamento è necessario per adempiere un obbligo legale al quale è soggetto il Titolare</li>
              <li><strong>Legittimo interesse:</strong> il trattamento è necessario per il perseguimento del legittimo interesse del Titolare (es. prevenzione frodi, sicurezza)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">5. Modalità di Trattamento</h2>
            <p className="text-gray-600 leading-relaxed">
              Il trattamento dei Dati Personali viene effettuato mediante strumenti informatici e/o telematici, con modalità organizzative e con logiche strettamente correlate alle finalità indicate.
              Oltre al Titolare, in alcuni casi, potrebbero avere accesso ai Dati altri soggetti coinvolti nell'organizzazione di questa Applicazione (personale amministrativo, commerciale, marketing, legali, amministratori di sistema) ovvero soggetti esterni (come fornitori di servizi tecnici terzi, corrieri postali, hosting provider, società informatiche, agenzie di comunicazione).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">6. Periodo di Conservazione</h2>
            <p className="text-gray-600 leading-relaxed">
              I Dati sono trattati e conservati per il tempo richiesto dalle finalità per le quali sono stati raccolti:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-4">
              <li><strong>Dati di prenotazione:</strong> conservati per 24 mesi dalla data dell'evento per finalità amministrative e statistiche</li>
              <li><strong>Dati di contatto:</strong> conservati fino alla richiesta di cancellazione da parte dell'interessato</li>
              <li><strong>Dati di navigazione:</strong> conservati per un massimo di 12 mesi</li>
              <li><strong>Dati per adempimenti fiscali:</strong> conservati per 10 anni come previsto dalla normativa vigente</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">7. Diritti dell'Interessato</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Ai sensi degli articoli 15-22 del Regolamento UE 2016/679 (GDPR), l'Utente ha il diritto di:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Diritto di accesso (Art. 15):</strong> ottenere conferma che sia o meno in corso un trattamento di dati personali che lo riguardano e, in tal caso, ottenere l'accesso ai dati personali</li>
              <li><strong>Diritto di rettifica (Art. 16):</strong> ottenere la rettifica dei dati personali inesatti che lo riguardano senza ingiustificato ritardo</li>
              <li><strong>Diritto alla cancellazione (Art. 17):</strong> ottenere la cancellazione dei dati personali che lo riguardano senza ingiustificato ritardo ("diritto all'oblio")</li>
              <li><strong>Diritto di limitazione (Art. 18):</strong> ottenere la limitazione del trattamento in determinati casi</li>
              <li><strong>Diritto alla portabilità (Art. 20):</strong> ricevere i dati personali in un formato strutturato, di uso comune e leggibile da dispositivo automatico</li>
              <li><strong>Diritto di opposizione (Art. 21):</strong> opporsi in qualsiasi momento al trattamento dei dati personali che lo riguardano</li>
              <li><strong>Diritto di revoca del consenso:</strong> revocare il consenso in qualsiasi momento senza pregiudicare la liceità del trattamento basata sul consenso prestato prima della revoca</li>
              <li><strong>Diritto di proporre reclamo:</strong> proporre reclamo all'Autorità Garante per la Protezione dei Dati Personali (www.garanteprivacy.it)</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-4">
              Per esercitare i propri diritti, l'Utente può inviare una richiesta scritta al Titolare all'indirizzo email: <a href="mailto:info@culturaimmersiva.it" className="text-primary hover:underline">info@culturaimmersiva.it</a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">8. Trasferimento dei Dati</h2>
            <p className="text-gray-600 leading-relaxed">
              I dati personali sono trattati presso la sede del Titolare e in ogni altro luogo in cui le parti coinvolte nel trattamento siano localizzate.
              Il Titolare si avvale di servizi di terze parti (es. Firebase/Google Cloud, SendGrid) che potrebbero comportare il trasferimento dei dati in paesi extra-UE.
              In tal caso, il trasferimento avviene nel rispetto delle garanzie previste dal GDPR, incluse le Clausole Contrattuali Standard approvate dalla Commissione Europea.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">9. Cookie e Tecnologie di Tracciamento</h2>

            <h3 className="text-lg font-medium text-gray-700 mb-2">9.1 Cookie Tecnici</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Questa Applicazione utilizza Cookie tecnici necessari per il corretto funzionamento del sito.
              Questi cookie non richiedono il consenso dell'Utente in quanto essenziali per la navigazione.
            </p>

            <h3 className="text-lg font-medium text-gray-700 mb-2">9.2 Meta Conversions API</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              <strong>Solo previo consenso esplicito dell'Utente</strong>, questa Applicazione utilizza la Meta Conversions API, un servizio di tracciamento lato server fornito da Meta Platforms Ireland Limited.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              <strong>Quando viene attivato il tracciamento:</strong> Il tracciamento avviene <strong>esclusivamente</strong> quando l'Utente, durante la procedura di prenotazione, seleziona volontariamente la casella di consenso per le comunicazioni marketing. Senza questa azione esplicita, nessun dato viene condiviso con Meta.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              <strong>Dati condivisi con Meta (solo con consenso):</strong>
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>Indirizzo email (sottoposto a hashing SHA-256 prima dell'invio)</li>
              <li>Numero di telefono (sottoposto a hashing SHA-256 prima dell'invio)</li>
              <li>Evento di completamento prenotazione</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mb-4">
              <strong>Finalità del trattamento:</strong>
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>Misurazione dell'efficacia delle campagne pubblicitarie su Meta (Facebook, Instagram)</li>
              <li>Ottimizzazione delle inserzioni pubblicitarie</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mb-4">
              <strong>Base giuridica:</strong> Consenso esplicito dell'Utente (Art. 6, par. 1, lett. a del GDPR).
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              <strong>Trasferimento dati:</strong> I dati vengono trasferiti a Meta Platforms, Inc. negli Stati Uniti sulla base delle Clausole Contrattuali Standard approvate dalla Commissione Europea.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              <strong>Come evitare il tracciamento:</strong>
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>Non selezionando la casella di consenso marketing durante la prenotazione</li>
              <li>Modificando le impostazioni sulla privacy del proprio account Facebook: <a href="https://www.facebook.com/settings?tab=ads" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Impostazioni inserzioni Facebook</a></li>
            </ul>
            <p className="text-gray-600 leading-relaxed">
              Per maggiori informazioni: <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Privacy Policy di Meta</a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">10. Sicurezza dei Dati</h2>
            <p className="text-gray-600 leading-relaxed">
              Il Titolare adotta misure di sicurezza tecniche e organizzative adeguate per proteggere i Dati Personali contro il trattamento non autorizzato o illecito e contro la perdita, la distruzione o il danno accidentali.
              Tali misure includono: crittografia dei dati in transito (HTTPS/TLS), controllo degli accessi, backup regolari, e monitoraggio della sicurezza.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">11. Modifiche alla Privacy Policy</h2>
            <p className="text-gray-600 leading-relaxed">
              Il Titolare si riserva il diritto di apportare modifiche alla presente Privacy Policy in qualunque momento dandone informazione agli Utenti su questa pagina.
              Si prega di consultare spesso questa pagina, prendendo come riferimento la data di ultima modifica indicata in alto.
              Nel caso di mancata accettazione delle modifiche apportate, l'Utente è tenuto a cessare l'utilizzo di questa Applicazione.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">12. Riferimenti Legali</h2>
            <p className="text-gray-600 leading-relaxed">
              La presente informativa privacy è redatta in conformità al Regolamento UE 2016/679 (GDPR) e al D.Lgs. 196/2003 (Codice Privacy) come modificato dal D.Lgs. 101/2018.
            </p>
          </section>

          <section className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Contatti del Titolare</h2>
            <p className="text-gray-600">
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

export default PrivacyPolicy;
