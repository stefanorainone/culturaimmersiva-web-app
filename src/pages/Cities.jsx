import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../config/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { sortCitiesByAvailability } from '../utils/cityAvailability';

const Cities = () => {
  const [selectedRegion, setSelectedRegion] = useState('Tutte');
  const [searchTerm, setSearchTerm] = useState('');
  const [cities, setCities] = useState([]);
  const [regions, setRegions] = useState(['Tutte']);
  const [availabilityMap, setAvailabilityMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Carica città da Firestore
  useEffect(() => {
    const loadCities = async () => {
      setLoading(true);
      try {
        const citiesSnapshot = await getDocs(collection(db, 'cities'));
        const loadedCities = citiesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setCities(loadedCities);

        // Extract unique regions from cities
        const uniqueRegions = [...new Set(loadedCities.map(city => city.region).filter(Boolean))].sort();
        setRegions(['Tutte', ...uniqueRegions]);

        // Create availability map
        const availability = {};
        loadedCities.forEach(city => {
          availability[city.id] = city.status || 'available';
        });
        setAvailabilityMap(availability);
      } catch (error) {
        console.error('Error loading cities:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCities();
  }, []);

  const filteredCities = cities
    .filter((city) => {
      const matchesRegion = selectedRegion === 'Tutte' || city.region === selectedRegion;
      const matchesSearch = city.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesRegion && matchesSearch;
    });

  // Ordina: prima disponibili poi non disponibili, entrambi alfabetici
  const sortedCities = sortCitiesByAvailability(filteredCities, availabilityMap);

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-r from-primary to-primary-dark text-white py-20">
        <div className="container-custom text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Le città aperte alla cultura immersiva
          </h1>
          <p className="text-xl md:text-2xl max-w-3xl mx-auto">
            Oltre 50 destinazioni italiane per vivere esperienze culturali immersive in realtà virtuale
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="py-8 bg-white shadow-sm sticky top-20 z-40">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Cerca una città..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Region Filter */}
            <div className="flex-1">
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Tutte">Tutte le Regioni</option>
                {regions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Cities Grid */}
      <section className="py-12">
        <div className="container-custom">
          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Caricamento disponibilità...</p>
            </div>
          ) : sortedCities.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-xl text-gray-600">Nessuna città trovata con i criteri selezionati</p>
            </div>
          ) : (
            <>
              <p className="text-gray-600 mb-8">
                Trovate {sortedCities.length} {sortedCities.length === 1 ? 'città' : 'città'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {sortedCities.map((city) => {
                  const cityStatus = availabilityMap[city.id] || city.status || 'available';

                  const getStatusBadge = (status) => {
                    switch (status) {
                      case 'available':
                        return {
                          text: 'Posti disponibili',
                          className: 'bg-green-100 text-green-700'
                        };
                      case 'sold-out':
                        return {
                          text: 'Esaurito',
                          className: 'bg-orange-100 text-orange-700'
                        };
                      case 'ended':
                        return {
                          text: 'Evento Terminato',
                          className: 'bg-gray-100 text-gray-700'
                        };
                      default:
                        return {
                          text: 'Non disponibile',
                          className: 'bg-gray-100 text-gray-700'
                        };
                    }
                  };

                  const statusBadge = getStatusBadge(cityStatus);

                  return (
                    <div
                      key={city.id}
                      className="group bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden"
                    >
                      <Link to={`/citta/${city.id}`}>
                        <div className="aspect-[4/3] relative overflow-hidden bg-gray-200">
                          <img
                            src={city.image}
                            alt={city.name}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent group-hover:from-black/30 transition-all duration-300"></div>
                        </div>
                        <div className="p-4">
                          <h3 className="text-xl font-bold text-primary mb-1">{city.name}</h3>
                          <p className="text-sm text-gray-600 mb-3">{city.region}</p>
                          <div className="flex items-center justify-between">
                            <span className={`text-xs px-3 py-1 rounded-full ${statusBadge.className}`}>
                              {statusBadge.text}
                            </span>
                            <span className="text-secondary font-medium text-sm group-hover:translate-x-1 transition-transform">
                              Scopri →
                            </span>
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default Cities;
