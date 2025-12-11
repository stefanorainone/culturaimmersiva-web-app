import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaMapMarkerAlt, FaClock, FaUsers, FaArrowLeft, FaEuroSign, FaCalendarAlt, FaWhatsapp, FaEnvelope, FaBell, FaUser, FaStar, FaGoogle, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
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
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentReview, setCurrentReview] = useState(0);

  // Recensioni Google reali dal sito culturaimmersiva.it
  const googleReviews = [
    {
      name: "Gabriella Mazzeo",
      rating: 5,
      text: "Un'esperienza emozionante, per un attimo mi è davvero sembrato di trovarmi dentro ad un dipinto e a vagare tra gli astri...",
      date: "Luglio 2024"
    },
    {
      name: "Daniela Prato",
      rating: 5,
      text: "Esperienza bellissima divisa in due parti: entrare in quadri famosi è vivere di più l'arte...",
      date: "Luglio 2024"
    },
    {
      name: "Cristina Roghi",
      rating: 5,
      text: "Esperienza fantastica. Poter entrare all'interno delle opere d'arte è stato come essere protagoniste...",
      date: "Luglio 2024"
    },
    {
      name: "Barbara Cre",
      rating: 5,
      text: "È stata una esperienza molto positiva, è molto emozionante col visore! Staff professionale e cordiale.",
      date: "Luglio 2024"
    },
    {
      name: "Leo Bartoletti",
      rating: 5,
      text: "Una Ottima esperienza. Dal mio punto di vista avrei gradito poter interagire con i quadri...",
      date: "Luglio 2024"
    },
    {
      name: "Antonella D'Ascanio",
      rating: 5,
      text: "Esperienza bellissima si entra letteralmente dentro il quadro e veramente non vorresti uscirne...",
      date: "Aprile 2024"
    }
  ];

  // Esperienze VR di default se non specificate nel database
  const defaultExperiences = [
    {
      name: "Viaggio nel Tempo",
      duration: 7,
      description: "Immergiti nella storia della città attraverso un'esperienza immersiva che ti trasporterà indietro nel tempo. Vivi gli eventi storici più importanti come se fossi presente."
    },
    {
      name: "Patrimonio Culturale",
      duration: 7,
      description: "Esplora i monumenti e i siti culturali più significativi in realtà virtuale. Scopri dettagli nascosti e storie affascinanti del patrimonio artistico locale."
    },
    {
      name: "Arte e Architettura",
      duration: 7,
      description: "Ammira le opere d'arte e l'architettura locale da prospettive uniche. Un viaggio virtuale attraverso secoli di creatività e maestria artistica."
    },
    {
      name: "Tradizioni e Cultura",
      duration: 7,
      description: "Scopri le tradizioni, i costumi e la cultura locale attraverso un'esperienza coinvolgente che celebra l'identità unica del territorio."
    }
  ];

  useEffect(() => {
    const loadCity = async () => {
      try {
        // Always check Firestore FIRST for real-time status
        const cityDoc = await getDoc(doc(db, 'cities', cityId));
        if (cityDoc.exists()) {
          const firestoreCity = { id: cityDoc.id, ...cityDoc.data() };
          console.log('[CityDetail] Loaded from Firestore:', cityId, firestoreCity);
          setCity(firestoreCity);

          // Track anonymous visit (unique per IP via Cloud Function)
          const visitKey = `visited_${cityId}`;
          if (!sessionStorage.getItem(visitKey)) {
            // Call Cloud Function to track view (handles IP uniqueness server-side)
            try {
              const response = await fetch('https://us-central1-culturaimmersiva-it.cloudfunctions.net/trackPageView', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cityId })
              });
              const result = await response.json();
              if (result.counted) {
                console.log('[CityDetail] View counted for:', cityId);
              } else {
                console.log('[CityDetail] View already counted for this IP:', cityId);
              }
              // Mark as visited in session to avoid repeated calls
              sessionStorage.setItem(visitKey, 'true');
            } catch (viewError) {
              console.log('[CityDetail] Could not track view:', viewError);
            }
          }
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

  // Autoplay slider ogni 2 secondi
  useEffect(() => {
    if (!city?.eventData?.experiences || city.eventData.experiences.length === 0) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % city.eventData.experiences.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [city]);

  // Autoplay slider recensioni ogni 5 secondi
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentReview((prev) => (prev + 1) % googleReviews.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [googleReviews.length]);

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
  console.log('[CityDetail] Pricing Debug:', {
    hasPricing: !!cityDetail?.pricing,
    pricing: cityDetail?.pricing,
    individual: cityDetail?.pricing?.individual,
    group: cityDetail?.pricing?.group,
    groupType: typeof cityDetail?.pricing?.group,
    groupGreaterThanZero: cityDetail?.pricing?.group > 0
  });

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
    <div className="bg-white pb-24 md:pb-0">
      {/* Slider Immagini - Mobile 30% schermo, Desktop normale */}
      <section className="relative h-[30vh] md:h-[500px] overflow-hidden">
        {/* Slider con autoplay */}
        {cityDetail?.experiences && cityDetail.experiences.length > 0 ? (
          <div className="relative h-full">
            {cityDetail.experiences.map((exp, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-opacity duration-500 ${
                  index === currentSlide ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <img
                  src={exp.image || city.image}
                  alt={exp.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
            ))}
            {/* Indicatori slider */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
              {cityDetail.experiences.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentSlide ? 'bg-white w-6' : 'bg-white/50'
                  }`}
                  aria-label={`Slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        ) : (
          <img
            src={city.image}
            alt={city.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>

        {/* Titolo sovrapposto - Solo su desktop */}
        <div className="hidden md:flex absolute inset-0 items-center justify-center">
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

        {/* Pulsante torna indietro */}
        <Link
          to="/citta"
          className="absolute top-4 left-4 md:top-8 md:left-8 bg-white/60 backdrop-blur-sm text-primary px-3 py-2 md:px-4 rounded-lg flex items-center gap-2 hover:bg-white/80 transition-colors text-sm md:text-base z-20"
        >
          <FaArrowLeft /> <span className="hidden sm:inline">Torna alle città</span>
        </Link>
      </section>

      {/* Content */}
      <section className="py-4 md:py-16">
        <div className="container-custom">
          {/* Info Essenziali + Prezzo - Mobile First */}
          <div className="md:hidden mb-4">
            {/* Prezzo con gradient colorato e info esperienze integrate */}
            {cityDetail?.pricing && (
              <div className="bg-gradient-to-r from-primary to-secondary text-white rounded-lg p-3 mb-2 shadow-lg">
                {/* Prezzi o Evento Gratuito */}
                {(!cityDetail?.pricing?.individual || Number(cityDetail?.pricing?.individual) === 0) ? (
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <span className="text-2xl font-bold">Evento Gratuito</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between mb-3">
                    {(cityDetail?.pricing?.group && cityDetail.pricing.group > 0) && (
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold">
                          {cityDetail?.pricing?.group}{cityDetail?.pricing?.currency || '€'}
                        </span>
                        <span className="text-xs opacity-90">per 2 persone ({(cityDetail.pricing.group / 2).toFixed(0)}€/persona)</span>
                      </div>
                    )}
                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-bold">
                        {cityDetail?.pricing?.currency || '€'}{cityDetail?.pricing?.individual}
                      </span>
                      <span className="text-xs opacity-90">singolo</span>
                    </div>
                  </div>
                )}

                {/* Separatore */}
                <div className="border-t border-white/30 mb-2"></div>

                {/* Esperienze incluse */}
                <div className="flex items-center gap-2">
                  <span className="text-lg">✨</span>
                  <p className="text-sm font-medium">
                    2 Esperienze immersive incluse nel ticket
                    <span className="block text-xs opacity-80 mt-0.5">Vedi sotto le esperienze disponibili</span>
                  </p>
                </div>
              </div>
            )}

            {/* Info compatte inline */}
            <div className="flex gap-1.5 mb-2 text-[9px]">
              {cityDetail?.booking?.advancePayment === false && (
                <div className="bg-green-50 border border-green-200 rounded px-2 py-1 flex items-center gap-1">
                  <span className="text-green-600">✓</span>
                  <span className="font-semibold text-green-800">Pagamento sul posto</span>
                </div>
              )}
              {cityDetail?.booking?.limitedSpots && (
                <div className="bg-red-50 border border-red-200 rounded px-2 py-1 flex items-center gap-1">
                  <span className="text-red-600">⚠</span>
                  <span className="font-semibold text-red-800">Prenotazione obbligatoria</span>
                </div>
              )}
            </div>

            {/* Info essenziali compatte */}
            <div className="space-y-2 mb-3">
              {cityDetail?.dates && (
                <div className="bg-gray-50 p-3 rounded-lg flex items-center gap-3">
                  <FaCalendarAlt className="text-secondary text-base flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600">Date</p>
                    <p className="text-sm font-semibold text-gray-800">{cityDetail?.dates}</p>
                  </div>
                </div>
              )}
              <div className="bg-gray-50 p-3 rounded-lg flex items-center gap-3">
                <FaClock className="text-secondary text-base flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600">Durata Totale</p>
                  <p className="text-sm font-semibold text-gray-800">{cityDetail?.experienceDuration || cityDetail?.duration || '45 minuti'}</p>
                </div>
              </div>
              {cityDetail?.location?.name && (
                <div className="bg-gray-50 p-3 rounded-lg flex items-center gap-3">
                  <FaMapMarkerAlt className="text-secondary text-base flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600">Indirizzo</p>
                    <p className="text-sm font-semibold text-gray-800">{cityDetail?.location?.name}</p>
                    {cityDetail?.location?.address && (
                      <p className="text-xs text-gray-600 mt-0.5">{cityDetail.location.address}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Google Reviews Slider - Solo Mobile */}
            <div className="md:hidden mb-4">
              <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
                {/* Header con rating Google */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FaGoogle className="text-2xl text-blue-600" />
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-lg font-bold text-gray-800">4.9</span>
                        <div className="flex text-yellow-400">
                          {[...Array(5)].map((_, i) => (
                            <FaStar key={i} className="text-xs" />
                          ))}
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-600">1,1k recensioni</p>
                    </div>
                  </div>
                </div>

                {/* Recensione corrente */}
                <motion.div
                  key={currentReview}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="min-h-[90px]"
                >
                  <div className="flex items-start gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <FaStar
                        key={i}
                        className={`text-xs ${i < googleReviews[currentReview].rating ? 'text-yellow-400' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                  <p className="text-gray-700 text-xs leading-relaxed mb-2 italic">
                    "{googleReviews[currentReview].text}"
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-800 text-xs">{googleReviews[currentReview].name}</p>
                    <p className="text-[10px] text-gray-500">{googleReviews[currentReview].date}</p>
                  </div>
                </motion.div>

                {/* Indicatori */}
                <div className="flex justify-center gap-1.5 mt-3">
                  {googleReviews.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentReview(index)}
                      className={`h-1 rounded-full transition-all ${
                        index === currentReview ? 'w-5 bg-primary' : 'w-1 bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-3xl font-bold text-primary mb-6 hidden md:block">
                  {cityDetail?.title || `Cultura Immersiva - ${city.name}`}
                </h2>

                {/* General Description */}
                <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg p-6 mb-8">
                  <p className="text-lg text-gray-800 leading-relaxed italic">
                    Un viaggio immersivo dove arte, cultura, bellezza e tecnologia si fondono in un'unica esperienza.
                    I visitatori possono esplorare ambienti suggestivi e attraversare luoghi iconici del mondo grazie a coinvolgenti esperienze in realtà virtuale.
                  </p>
                </div>

                {/* Event Info Cards - Solo Desktop */}
                <div className="hidden md:grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
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
                  {(cityDetail?.duration || cityDetail?.experienceDuration) && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-start gap-3">
                        <FaClock className="text-secondary text-xl mt-1" />
                        <div>
                          <h4 className="font-semibold text-primary mb-1">Durata Totale</h4>
                          <p className="text-gray-700">{cityDetail?.experienceDuration || cityDetail?.duration || '45 minuti'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {cityDetail?.location?.name && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-start gap-3">
                        <FaMapMarkerAlt className="text-secondary text-xl mt-1" />
                        <div>
                          <h4 className="font-semibold text-primary mb-1">Indirizzo</h4>
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

                <>
                  <h3 className="text-2xl font-bold text-primary mb-2">
                    2 Esperienze incluse nel ticket
                  </h3>
                  <p className="text-sm text-gray-600 italic mb-4">
                    Potrai scegliere le esperienze che preferisci direttamente sul posto
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {(cityDetail?.experiences && cityDetail.experiences.length > 0 ? cityDetail.experiences : defaultExperiences).map((exp, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                        {exp.image && (
                          <div className="h-40 overflow-hidden">
                            <img
                              src={exp.image}
                              alt={exp.name}
                              className="w-full h-full object-cover"
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
                      <li className="flex items-start gap-3">
                        <span className="text-secondary text-xl">✓</span>
                        <span className="text-gray-700">
                          {cityDetail?.booking?.cancellationPolicy || 'Cancellazione gratuita fino a 24 ore prima dell\'evento'}
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-secondary text-xl">✓</span>
                        <span className="text-gray-700">
                          Pagamento: {cityDetail?.booking?.paymentMethods?.length > 0 ? cityDetail.booking.paymentMethods.join(', ') : 'Contanti, Carta'}
                        </span>
                      </li>
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
                      {(!cityDetail?.pricing?.individual || Number(cityDetail?.pricing?.individual) === 0) ? (
                        <div className="bg-gradient-to-r from-primary to-secondary text-white rounded-lg p-4">
                          <div className="flex items-center justify-center gap-3">
                            <span className="text-3xl font-bold">Evento Gratuito</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
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
                              <FaUser className="text-secondary text-3xl" />
                            </div>
                          </div>

                          {(cityDetail?.pricing?.group && cityDetail.pricing.group > 0) && (
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
                        </>
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
                        Verifica orari disponibili
                      </Link>
                      {cityDetail?.booking?.limitedSpots && (
                        <p className="text-sm text-orange-600 text-center mt-3 flex items-center justify-center gap-1">
                          <span>⚡</span>
                          <span className="font-semibold">I ticket potrebbero terminare in fretta</span>
                        </p>
                      )}
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

                {/* Google Reviews Slider - Solo Desktop */}
                <div className="hidden md:block mt-6">
                  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                    {/* Header con rating Google */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <FaGoogle className="text-3xl text-blue-600" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-gray-800">4.9</span>
                            <div className="flex text-yellow-400">
                              {[...Array(5)].map((_, i) => (
                                <FaStar key={i} className="text-xs" />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-gray-600">1,1k recensioni</p>
                        </div>
                      </div>
                    </div>

                    {/* Recensione corrente */}
                    <motion.div
                      key={currentReview}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="min-h-[100px]"
                    >
                      <div className="flex items-start gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <FaStar
                            key={i}
                            className={`text-sm ${i < googleReviews[currentReview].rating ? 'text-yellow-400' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed mb-3 italic">
                        "{googleReviews[currentReview].text}"
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-gray-800 text-sm">{googleReviews[currentReview].name}</p>
                        <p className="text-xs text-gray-500">{googleReviews[currentReview].date}</p>
                      </div>
                    </motion.div>

                    {/* Indicatori */}
                    <div className="flex justify-center gap-2 mt-4">
                      {googleReviews.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentReview(index)}
                          className={`h-1.5 rounded-full transition-all ${
                            index === currentReview ? 'w-6 bg-primary' : 'w-1.5 bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* FAB - Floating Action Button - Solo Mobile */}
      {city.status === 'available' && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 p-4">
          <Link
            to={`/booking/${cityId}`}
            className="btn-secondary w-full text-center block py-4 text-lg font-bold shadow-xl"
          >
            Verifica orari disponibili
          </Link>
          {cityDetail?.booking?.limitedSpots && (
            <p className="text-xs text-orange-600 text-center mt-2 flex items-center justify-center gap-1">
              <span>⚡</span>
              <span className="font-semibold">I ticket potrebbero terminare in fretta</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default CityDetail;
