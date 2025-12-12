import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaVrCardboard, FaSchool, FaLandmark, FaHotel, FaStar, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { db } from '../config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { sortCitiesByAvailability } from '../utils/cityAvailability';

const Home = () => {
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [cities, setCities] = useState([]);
  const [availabilityMap, setAvailabilityMap] = useState({});
  const [loadingCities, setLoadingCities] = useState(true);

  const reviews = [
    {
      name: 'Maria Santoro',
      date: '3 giorni fa',
      text: 'Esperienza fantastica! La realtà virtuale ti fa vivere l\'arte in un modo completamente nuovo. Consigliato a tutti!',
      rating: 5
    },
    {
      name: 'Alessandro Conti',
      date: '5 giorni fa',
      text: 'Incredibile! Sembra davvero di entrare nei dipinti. Il personale è molto preparato e gentile. Da ripetere!',
      rating: 5
    },
    {
      name: 'Laura Bianchi',
      date: '1 settimana fa',
      text: 'Un\'esperienza unica che mescola tecnologia e cultura. I miei figli si sono divertiti moltissimo. Torneremo sicuramente!',
      rating: 5
    },
    {
      name: 'Roberto Esposito',
      date: '2 settimane fa',
      text: 'Bellissima esperienza immersiva. La qualità dei contenuti VR è altissima. Perfetto per scoprire le città italiane in modo innovativo.',
      rating: 5
    },
    {
      name: 'Gabriella Mazzeo',
      date: '3 settimane fa',
      text: 'Un\'esperienza emozionante, per un attimo mi è davvero sembrato di trovarmi dentro ad un dipinto e a vagare tra gli astri.',
      rating: 5
    },
    {
      name: 'Elena Russo',
      date: '1 mese fa',
      text: 'Visitare le città italiane in VR è stata una scoperta meravigliosa. Tecnologia al servizio dell\'arte e della cultura!',
      rating: 5
    },
    {
      name: 'Daniela Prato',
      date: '1 mese fa',
      text: 'Esperienza bellissima divisa in due parti: entrare in quadri famosi è vivere di più l\'arte. Personale gentilissimo!',
      rating: 5
    },
    {
      name: 'Cristina Roghi',
      date: '1 mese fa',
      text: 'Esperienza fantastica. Poter entrare all\'interno delle opere d\'arte è stato come essere protagoniste delle stesse.',
      rating: 5
    },
    {
      name: 'Paolo Moretti',
      date: '2 mesi fa',
      text: 'Una ventata di innovazione nel mondo della cultura. L\'esperienza VR è coinvolgente e ben realizzata. Complimenti!',
      rating: 5
    },
    {
      name: 'Barbara Cre',
      date: '2 mesi fa',
      text: 'È stata una esperienza molto positiva, è molto emozionante col visore! Professionalità e gentilezza dello staff.',
      rating: 5
    },
    {
      name: 'Leo Bartoletti',
      date: '2 mesi fa',
      text: 'Una Ottima esperienza. Da mio punto di vista avrei gradito poter interagire con i quadri, ma comunque super consigliato!',
      rating: 5
    },
    {
      name: 'Francesca De Luca',
      date: '3 mesi fa',
      text: 'Ho portato mia madre che non può più viaggiare e si è commossa vedendo Napoli in VR. Grazie per questa opportunità!',
      rating: 5
    }
  ];

  const nextReview = () => {
    setCurrentReviewIndex((prev) => {
      const maxIndex = reviews.length - 3;
      return prev >= maxIndex ? 0 : prev + 3;
    });
  };

  const prevReview = () => {
    setCurrentReviewIndex((prev) => {
      const maxIndex = reviews.length - 3;
      return prev <= 0 ? maxIndex : prev - 3;
    });
  };

  useEffect(() => {
    const interval = setInterval(nextReview, 7000);
    return () => clearInterval(interval);
  }, []);

  // Carica città da Firestore
  useEffect(() => {
    const loadCities = async () => {
      setLoadingCities(true);
      try {
        const citiesSnapshot = await getDocs(collection(db, 'cities'));
        const loadedCities = citiesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setCities(loadedCities);

        // Create availability map from loaded cities
        const availability = {};
        loadedCities.forEach(city => {
          availability[city.id] = city.status || 'available';
        });
        setAvailabilityMap(availability);
      } catch (error) {
        console.error('Error loading cities:', error);
      } finally {
        setLoadingCities(false);
      }
    };

    loadCities();
  }, []);

  const features = [
    {
      icon: <FaLandmark className="text-5xl text-secondary" />,
      title: 'Siti Culturali e Musei',
      description: 'Esperienze VR personalizzate per i visitatori e campagne di marketing internazionali per attrarre un pubblico più giovane.',
      link: '/musei'
    },
    {
      icon: <FaSchool className="text-5xl text-secondary" />,
      title: 'Scuole e Università',
      description: 'Contenuti VR educativi dedicati alle istituzioni scolastiche.',
      link: '/scuole'
    },
    {
      icon: <FaVrCardboard className="text-5xl text-secondary" />,
      title: 'Eventi e Fiere',
      description: 'Esperienze VR per i partecipanti e opportunità di promozione del brand nel metaverso per gli sponsor.',
      link: '/contatti'
    },
    {
      icon: <FaHotel className="text-5xl text-secondary" />,
      title: 'Hotel / B&B',
      description: 'Contenuti VR che promuovono le attività locali e le eccellenze regionali.',
      link: '/hotel'
    },
  ];

  // Ordina città e prendi le prime 6 disponibili
  const sortedCities = sortCitiesByAvailability(cities, availabilityMap);
  const featuredCities = sortedCities.slice(0, 6);

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center text-white overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/images/sfondo-pompei-culturaimmersiva.webp)',
          }}
        ></div>
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black opacity-60"></div>
        <div className="container-custom text-center relative z-10">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6">
            <span className="font-dancing text-secondary">Scopri l'Italia</span>
            <br />
            con la Realtà Virtuale
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto text-gray-100">
            Esperienze culturali immersive che emozionano. Viaggia attraverso la storia e l'arte delle più belle città italiane.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/citta" className="btn-primary">
              Esplora le Città
            </Link>
            <Link to="/contatti" className="btn-secondary">
              Contattaci
            </Link>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full">
            <path fill="#ffffff" fillOpacity="1" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,138.7C960,139,1056,117,1152,106.7C1248,96,1344,96,1392,96L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-primary mb-4">
              Cosa Offriamo
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Soluzioni innovative per ogni esigenza culturale e educativa
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Link
                key={index}
                to={feature.link}
                className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer block"
              >
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-primary mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="py-20 bg-white">
        <div className="container-custom">
          <div className="max-w-7xl mx-auto relative">
            <div className="flex items-center gap-8 overflow-hidden">
              {/* Left Card - Company Info */}
              <div className="hidden lg:block flex-shrink-0 w-64 bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src="/images/logo-cultura-immersiva.png"
                    alt="Cultura Immersiva"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <h3 className="font-bold text-gray-800">Cultura Immersiva</h3>
                </div>

                <div className="mb-2">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-3xl font-bold text-gray-800">4.9</span>
                    {[...Array(5)].map((_, i) => (
                      <FaStar key={i} className="text-orange-500 text-lg" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-600">Based on 1.1k reviews</p>
                </div>

                <div className="flex items-center gap-1 text-xs text-gray-500 mb-4">
                  <span>powered by</span>
                  <span className="font-bold">
                    <span className="text-blue-600">G</span>
                    <span className="text-red-600">o</span>
                    <span className="text-yellow-500">o</span>
                    <span className="text-blue-600">g</span>
                    <span className="text-green-600">l</span>
                    <span className="text-red-600">e</span>
                  </span>
                </div>

                <a
                  href="https://g.page/r/CYourGooglePlaceID/review"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                >
                  <span>review us on</span>
                  <svg className="w-4 h-4" viewBox="0 0 48 48" fill="currentColor">
                    <path d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" fill="#EA4335"/>
                    <path d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" fill="#4285F4"/>
                    <path d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" fill="#FBBC05"/>
                    <path d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" fill="#34A853"/>
                  </svg>
                </a>
              </div>

              {/* Reviews Grid */}
              <div className="flex-1 relative">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {reviews.slice(currentReviewIndex, currentReviewIndex + 3).map((review, index) => (
                    <div key={currentReviewIndex + index} className="bg-white rounded-lg shadow-lg p-6 flex flex-col">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                            {review.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <h4 className="font-semibold text-blue-600 text-sm">{review.name}</h4>
                            <p className="text-xs text-gray-500">{review.date}</p>
                          </div>
                        </div>
                        <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 48 48">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                        </svg>
                      </div>

                      <div className="flex gap-1 mb-3">
                        {[...Array(review.rating)].map((_, i) => (
                          <FaStar key={i} className="text-orange-500 text-sm" />
                        ))}
                      </div>

                      <p className="text-gray-700 text-sm leading-relaxed flex-1">
                        {review.text}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Navigation Arrows */}
                {currentReviewIndex > 0 && (
                  <button
                    onClick={prevReview}
                    className="absolute -left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors z-10"
                    aria-label="Previous reviews"
                  >
                    <FaChevronLeft />
                  </button>
                )}
                {currentReviewIndex < reviews.length - 3 && (
                  <button
                    onClick={nextReview}
                    className="absolute -right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors z-10"
                    aria-label="Next reviews"
                  >
                    <FaChevronRight />
                  </button>
                )}
              </div>
            </div>

            {/* Dots Indicator */}
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: Math.ceil(reviews.length / 3) }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentReviewIndex(index * 3)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    Math.floor(currentReviewIndex / 3) === index
                      ? 'bg-blue-600'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Go to reviews page ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Cities */}
      <section className="py-20 bg-gray-50">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-primary mb-4">
              Città in Evidenza
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Oltre 50 destinazioni italiane ti aspettano
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {featuredCities.map((city) => (
              <div
                key={city.id}
                className="group relative overflow-hidden rounded-lg shadow-lg hover:shadow-2xl transition-shadow duration-300"
              >
                <Link to={`/citta/${city.id}`}>
                  <div className="aspect-[4/3] relative overflow-hidden bg-gray-200">
                    <img
                      src={city.image}
                      alt={city.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent group-hover:from-black/40 transition-all duration-300"></div>
                  <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
                    <h3 className="text-2xl font-bold mb-2">{city.name}</h3>
                    <p className="text-sm text-gray-200">{city.region}</p>
                    <span className="mt-4 inline-block px-4 py-2 bg-secondary text-white rounded-md text-sm font-medium group-hover:bg-secondary-light transition-colors">
                      Scopri di più
                    </span>
                  </div>
                </Link>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link to="/citta" className="btn-primary">
              Vedi Tutte le Città
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-primary-dark text-white">
        <div className="container-custom text-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Pronto per un'esperienza immersiva?
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Contattaci oggi per scoprire come portare la cultura italiana in realtà virtuale
            </p>
            <Link to="/contatti" className="btn-secondary">
              Richiedi Informazioni
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
