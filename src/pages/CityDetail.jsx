import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaMapMarkerAlt, FaClock, FaUsers, FaArrowLeft, FaEuroSign, FaCalendarAlt, FaWhatsapp, FaEnvelope, FaBell } from 'react-icons/fa';
import { db } from '../config/firebase';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { getCityById } from '../data/cities';

const CityDetail = () => {
  const { cityId } = useParams();
  const [city, setCity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notificationForm, setNotificationForm] = useState({
    email: '',
    whatsapp: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  useEffect(() => {
    const loadCity = async () => {
      try {
        // Always check Firestore FIRST for real-time status
        const cityDoc = await getDoc(doc(db, 'cities', cityId));
        if (cityDoc.exists()) {
          const firestoreCity = { id: cityDoc.id, ...cityDoc.data() };
          console.log('[CityDetail] Loaded from Firestore:', cityId, firestoreCity);
          setCity(firestoreCity);
        } else {
          // Fallback: use static data if not in Firestore
          const staticCity = getCityById(cityId);
          console.log('[CityDetail] Not in Firestore, using static data for:', cityId, staticCity);
          if (staticCity) {
            setCity(staticCity);
          }
        }
      } catch (error) {
        console.error('Error loading city:', error);
        // Fallback in caso di errore
        const staticCity = getCityById(cityId);
        console.log('[CityDetail] Error, using static data for:', cityId, staticCity);
        if (staticCity) {
          setCity(staticCity);
        }
      } finally {
        setLoading(false);
      }
    };
    loadCity();
  }, [cityId]);

  const handleNotificationSubmit = async (e) => {
    e.preventDefault();

    if (!notificationForm.email && !notificationForm.whatsapp) {
      setSubmitMessage('Inserisci almeno un contatto (email o WhatsApp)');
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      await addDoc(collection(db, 'notifications'), {
        cityId: cityId,
        cityName: city.name,
        email: notificationForm.email || null,
        whatsapp: notificationForm.whatsapp || null,
        createdAt: new Date().toISOString(),
        status: 'pending'
      });

      setSubmitMessage('✅ Grazie! Ti contatteremo non appena ci saranno novità su ' + city.name);
      setNotificationForm({ email: '', whatsapp: '' });
    } catch (error) {
      console.error('Error saving notification:', error);
      setSubmitMessage('❌ Errore durante la registrazione. Riprova più tardi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cityDetail = city?.eventData;

  console.log('[CityDetail] Render:', { city, cityDetail, hasCity: !!city, hasCityDetail: !!cityDetail, cityStatus: city?.status });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!city) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-primary mb-4">Città non trovata</h2>
          <Link to="/citta" className="btn-primary">
            Torna alle Città
          </Link>
        </div>
      </div>
    );
  }

  // Se l'evento è terminato (status ended) O non ha eventData completo, mostra il form di notifica
  // Controlla anche che ci siano i dati minimi necessari (pricing e timeSlots)
  const hasRequiredData = cityDetail && cityDetail.pricing && cityDetail.timeSlots && cityDetail.timeSlots.length > 0;

  if (city.status === 'ended' || !cityDetail || !hasRequiredData) {
    return (
      <div className="bg-white">
        {/* Hero Image */}
        <section className="relative h-[500px] overflow-hidden">
          <img
            src={city.image}
            alt={city.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black bg-opacity-50"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center text-white"
            >
              <h1 className="text-5xl md:text-7xl font-bold mb-4">{typeof city.name === 'string' ? city.name : city.name?.name || 'Città'}</h1>
              <p className="text-2xl flex items-center justify-center gap-2">
                <FaMapMarkerAlt /> {typeof city.region === 'string' ? city.region : city.region?.name || 'Italia'}
              </p>
            </motion.div>
          </div>
          <Link
            to="/citta"
            className="absolute top-8 left-8 bg-white text-primary px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-100 transition-colors"
          >
            <FaArrowLeft /> Torna alle città
          </Link>
        </section>

        {/* Content */}
        <section className="py-16">
          <div className="container-custom">
            <div className="max-w-3xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <>
                  <h2 className="text-3xl font-bold text-primary mb-4">
                    {city.status === 'ended' ? 'Prossimamente' : 'Evento in Preparazione'} a {typeof city.name === 'string' ? city.name : city.name?.name || city.name?.stringValue || 'questa città'}
                  </h2>
                  <p className="text-lg text-gray-700 mb-8">
                    {city.status === 'ended'
                      ? `L'ultima esperienza VR a ${typeof city.name === 'string' ? city.name : city.name?.name || 'questa città'} è terminata, ma stiamo pianificando un nuovo evento in questa città!`
                      : `Stiamo preparando un'esperienza VR speciale a ${typeof city.name === 'string' ? city.name : city.name?.name || 'questa città'}.`
                    }
                    {' '}Lascia i tuoi contatti per essere informato quando sarà disponibile.
                  </p>

                    {/* Notification Form */}
                    <div className="max-w-lg mx-auto bg-gray-50 rounded-lg p-8 shadow-lg text-left">
                      <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                        <FaEnvelope className="text-secondary" />
                        Ricevi Notifiche
                      </h3>
                      <p className="text-sm text-gray-600 mb-6">
                        Inserisci almeno un contatto e ti avviseremo quando organizzeremo il prossimo evento a {typeof city.name === 'string' ? city.name : city.name?.name || 'questa città'}
                      </p>

                      {submitMessage && (
                        <div className={`mb-4 p-4 rounded-lg ${
                          submitMessage.includes('✅')
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {submitMessage}
                        </div>
                      )}

                      <form onSubmit={handleNotificationSubmit} className="space-y-4">
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                            Email
                          </label>
                          <div className="relative">
                            <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="email"
                              id="email"
                              value={notificationForm.email}
                              onChange={(e) => setNotificationForm({...notificationForm, email: e.target.value})}
                              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                              placeholder="tua@email.com"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 mb-2">
                            WhatsApp
                          </label>
                          <div className="relative">
                            <FaWhatsapp className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="tel"
                              id="whatsapp"
                              value={notificationForm.whatsapp}
                              onChange={(e) => setNotificationForm({...notificationForm, whatsapp: e.target.value})}
                              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                              placeholder="+39 123 456 7890"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? (
                            <>
                              <span className="animate-spin">⏳</span>
                              Invio in corso...
                            </>
                          ) : (
                            <>
                              <FaBell />
                              Avvisami quando disponibile
                            </>
                          )}
                        </button>
                      </form>
                    </div>

                    <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                      <Link to="/citta" className="btn-secondary">
                        Scopri le Città Disponibili
                      </Link>
                    </div>
                  </>
              </motion.div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="bg-white">
      {/* Hero Image */}
      <section className="relative h-[500px] overflow-hidden">
        <img
          src={city.image}
          alt={city.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center text-white"
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-4">{typeof city.name === 'string' ? city.name : city.name?.name || 'Città'}</h1>
            <p className="text-2xl flex items-center justify-center gap-2">
              <FaMapMarkerAlt /> {typeof city.region === 'string' ? city.region : city.region?.name || 'Italia'}
            </p>
          </motion.div>
        </div>
        <Link
          to="/citta"
          className="absolute top-8 left-8 bg-white text-primary px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-100 transition-colors"
        >
          <FaArrowLeft /> Torna alle città
        </Link>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-3xl font-bold text-primary mb-6">
                  {cityDetail?.title || `Cultura Immersiva - ${city.name}`}
                </h2>
                <p className="text-lg text-gray-700 leading-relaxed mb-8">
                  {cityDetail?.description || 'Un\'esperienza culturale immersiva in realtà virtuale. Vivi la storia, l\'arte e la scienza come mai prima d\'ora.'}
                </p>

                {/* General Description */}
                <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg p-6 mb-8">
                  <p className="text-lg text-gray-800 leading-relaxed italic">
                    Un viaggio immersivo dove arte, cultura, bellezza e tecnologia si fondono in un'unica esperienza.
                    I visitatori possono esplorare ambienti suggestivi e attraversare luoghi iconici del mondo grazie a coinvolgenti esperienze in realtà virtuale.
                  </p>
                </div>

                {/* Event Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {cityDetail?.dates && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-start gap-3">
                        <FaCalendarAlt className="text-secondary text-xl mt-1" />
                        <div>
                          <h4 className="font-semibold text-primary mb-1">Date</h4>
                          <p className="text-gray-700">{cityDetail?.dates}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {cityDetail?.duration && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-start gap-3">
                        <FaClock className="text-secondary text-xl mt-1" />
                        <div>
                          <h4 className="font-semibold text-primary mb-1">Durata</h4>
                          <p className="text-gray-700">{cityDetail?.duration}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {cityDetail?.location?.name && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-start gap-3">
                        <FaMapMarkerAlt className="text-secondary text-xl mt-1" />
                        <div>
                          <h4 className="font-semibold text-primary mb-1">Location</h4>
                          <p className="text-gray-700 font-medium">{cityDetail?.location?.name}</p>
                          {cityDetail?.location?.address && (
                            <p className="text-gray-600 text-sm">{cityDetail?.location?.address}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {cityDetail?.organizer && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-start gap-3">
                        <FaUsers className="text-secondary text-xl mt-1" />
                        <div>
                          <h4 className="font-semibold text-primary mb-1">Organizzatore</h4>
                          <p className="text-gray-700">{typeof cityDetail?.organizer === 'string' ? cityDetail?.organizer : cityDetail?.organizer?.name || 'Organizzatore'}</p>
                          {cityDetail?.organizer?.description && (
                            <p className="text-gray-600 text-sm mt-1">{cityDetail?.organizer?.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {cityDetail?.experiences && cityDetail?.experiences.length > 0 && (
                  <>
                    <h3 className="text-2xl font-bold text-primary mb-4">
                      Esperienze Disponibili {cityDetail?.experiencesPerTicket && `(Scegline ${cityDetail?.experiencesPerTicket})`}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                      {cityDetail?.experiences.map((exp, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg overflow-hidden hover:border-secondary transition-colors group">
                      {exp.image && (
                        <div className="h-40 overflow-hidden">
                          <img
                            src={exp.image}
                            alt={exp.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-bold text-primary text-lg">{typeof exp.name === 'string' ? exp.name : exp.name?.name || 'Esperienza'}</h4>
                          <span className="text-secondary font-semibold ml-2 whitespace-nowrap">{exp.duration} min</span>
                        </div>
                        <p className="text-gray-700 text-sm">{typeof exp.description === 'string' ? exp.description : exp.description?.description || ''}</p>
                      </div>
                    </div>
                      ))}
                    </div>
                  </>
                )}

                {cityDetail?.booking && (
                  <>
                    <h3 className="text-2xl font-bold text-primary mb-4">Informazioni sulla Prenotazione</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3">
                        <span className="text-secondary text-xl">✓</span>
                        <span className="text-gray-700">
                          {cityDetail?.booking?.limitedSpots ? 'Posti limitati - prenotazione obbligatoria' : 'Prenotazione consigliata'}
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-secondary text-xl">✓</span>
                        <span className="text-gray-700">
                          {cityDetail?.booking?.advancePayment ? 'Pagamento anticipato richiesto' : 'Nessun pagamento anticipato - paga sul posto'}
                        </span>
                      </li>
                      {cityDetail?.booking?.cancellationPolicy && (
                        <li className="flex items-start gap-3">
                          <span className="text-secondary text-xl">✓</span>
                          <span className="text-gray-700">{cityDetail?.booking?.cancellationPolicy}</span>
                        </li>
                      )}
                      {cityDetail?.booking?.paymentMethods && cityDetail?.booking?.paymentMethods.length > 0 && (
                        <li className="flex items-start gap-3">
                          <span className="text-secondary text-xl">✓</span>
                          <span className="text-gray-700">
                            Pagamento: {cityDetail?.booking?.paymentMethods.join(', ')}
                          </span>
                        </li>
                      )}
                      <li className="flex items-start gap-3">
                        <FaWhatsapp className="text-green-600 text-xl" />
                        <span className="text-gray-700">
                          Assistenza WhatsApp: +39 379 212 1188
                        </span>
                      </li>
                    </ul>
                  </>
                )}
              </motion.div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="bg-gray-50 rounded-lg p-6 sticky top-32"
              >
                {cityDetail?.pricing && (
                  <>
                    <h3 className="text-2xl font-bold text-primary mb-6">Prezzi</h3>

                    <div className="space-y-4 mb-6">
                      {cityDetail?.pricing?.individual && (
                        <div className="bg-white rounded-lg p-4 border-2 border-secondary">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Biglietto Individuale</p>
                              <p className="text-3xl font-bold text-primary">
                                {cityDetail?.pricing?.currency || '€'}{cityDetail?.pricing?.individual}
                              </p>
                              {cityDetail?.pricing?.note && (
                                <p className="text-xs text-gray-500 mt-1">{cityDetail?.pricing?.note}</p>
                              )}
                            </div>
                            <FaEuroSign className="text-secondary text-3xl" />
                          </div>
                        </div>
                      )}

                      {cityDetail?.pricing?.group && (
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Biglietto a Coppia</p>
                              <p className="text-3xl font-bold text-primary">
                                {cityDetail?.pricing?.currency || '€'}{cityDetail?.pricing?.group}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                ({cityDetail?.pricing?.currency || '€'}{(cityDetail?.pricing?.group / (cityDetail?.pricing?.groupSize || 2)).toFixed(2)}/persona)
                              </p>
                            </div>
                            <FaUsers className="text-secondary text-2xl" />
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-3">
                    <FaMapMarkerAlt className="text-secondary text-xl mt-1" />
                    <div>
                      <h4 className="font-semibold text-primary mb-1">Disponibilità</h4>
                      <p className={`font-medium ${
                        city.status === 'available' ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {city.status === 'available' ? 'Posti disponibili' : 'Evento terminato'}
                      </p>
                    </div>
                  </div>

                  {cityDetail?.experiencesPerTicket && (
                    <div className="flex items-start gap-3">
                      <FaClock className="text-secondary text-xl mt-1" />
                      <div>
                        <h4 className="font-semibold text-primary mb-1">Esperienze</h4>
                        <p className="text-gray-700">{cityDetail?.experiencesPerTicket} esperienze a scelta</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-gray-200">
                  {city.status === 'available' ? (
                    <>
                      <Link to={`/booking/${cityId}`} className="btn-primary w-full text-center block">
                        Verifica Disponibilità
                      </Link>
                      <p className="text-sm text-gray-600 text-center mt-4">
                        Controlla gli orari disponibili
                      </p>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-600 font-medium">Evento terminato</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Le prenotazioni non sono più disponibili
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CityDetail;
