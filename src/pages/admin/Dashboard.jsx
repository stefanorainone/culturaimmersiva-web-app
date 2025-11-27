import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  updateDoc
} from 'firebase/firestore';
import { FaPlus, FaEdit, FaTrash, FaSignOutAlt, FaCity, FaCalendarCheck, FaCopy, FaExternalLinkAlt, FaBell } from 'react-icons/fa';
import CityModal from '../../components/admin/CityModal';

const Dashboard = () => {
  const [cities, setCities] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedDates, setSelectedDates] = useState([]); // Array of selected dates
  const [dateSearchTerm, setDateSearchTerm] = useState('');
  const [showDateSuggestions, setShowDateSuggestions] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCityId, setSelectedCityId] = useState(null);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadCities();
    loadBookings();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.date-search-container')) {
        setShowDateSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Funzione per estrarre l'ultima data da una stringa di date
  const parseEventDate = (dateString) => {
    if (!dateString) return null;

    const months = {
      'gennaio': 0, 'febbraio': 1, 'marzo': 2, 'aprile': 3,
      'maggio': 4, 'giugno': 5, 'luglio': 6, 'agosto': 7,
      'settembre': 8, 'ottobre': 9, 'novembre': 10, 'dicembre': 11
    };

    const monthNames = Object.keys(months);
    let foundMonth = null;
    let foundYear = new Date().getFullYear();

    const lowerDateString = dateString.toLowerCase();
    for (const month of monthNames) {
      if (lowerDateString.includes(month)) {
        foundMonth = months[month];
        break;
      }
    }

    if (foundMonth === null) return null;

    const yearMatch = dateString.match(/\b(20\d{2})\b/);
    if (yearMatch) {
      foundYear = parseInt(yearMatch[1]);
    }

    const dayNumbers = dateString.match(/\b(\d{1,2})\b/g);
    if (!dayNumbers || dayNumbers.length === 0) return null;

    const lastDay = parseInt(dayNumbers[dayNumbers.length - 1]);
    const day = lastDay > 31 && dayNumbers.length > 1
      ? parseInt(dayNumbers[dayNumbers.length - 2])
      : lastDay;

    if (day > 31) return null;

    return new Date(foundYear, foundMonth, day, 23, 59, 59);
  };

  // Aggiorna automaticamente gli eventi passati
  const updatePastEvents = async (citiesData) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let updatedCount = 0;

    for (const city of citiesData) {
      const dateString = city.eventData?.dates;
      if (!dateString || city.status === 'ended') continue;

      const eventDate = parseEventDate(dateString);
      if (!eventDate) continue;

      if (eventDate < today) {
        try {
          await updateDoc(doc(db, 'cities', city.id), { status: 'ended' });
          city.status = 'ended'; // Update local data
          updatedCount++;
        } catch (error) {
          console.error(`Error updating city ${city.name}:`, error);
        }
      }
    }

    if (updatedCount > 0) {
      console.log(`✅ Aggiornati automaticamente ${updatedCount} eventi passati`);
    }

    return citiesData;
  };

  const loadCities = async () => {
    try {
      const citiesQuery = query(
        collection(db, 'cities'),
        orderBy('name', 'asc')
      );
      const snapshot = await getDocs(citiesQuery);
      let citiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Aggiorna automaticamente gli eventi passati
      citiesData = await updatePastEvents(citiesData);

      setCities(citiesData);
    } catch (error) {
      console.error('Error loading cities:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async () => {
    try {
      const bookingsQuery = query(
        collection(db, 'bookings'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(bookingsQuery);
      const bookingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBookings(bookingsData);
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  };

  const handleDelete = async (cityId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa città?')) {
      return;
    }

    console.log('[Dashboard] Deleting city:', cityId);

    try {
      await deleteDoc(doc(db, 'cities', cityId));
      console.log('[Dashboard] City deleted successfully from Firestore');

      // Update local state
      setCities(cities.filter(city => city.id !== cityId));
      console.log('[Dashboard] Local state updated');

      alert('Città eliminata con successo!');
    } catch (error) {
      console.error('[Dashboard] Error deleting city:', error);
      console.error('[Dashboard] Error code:', error.code);
      console.error('[Dashboard] Error message:', error.message);
      alert(`Errore durante l'eliminazione della città:\n${error.message || error.code || 'Errore sconosciuto'}`);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleOpenModal = (cityId = null) => {
    setSelectedCityId(cityId);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedCityId(null);
  };

  const handleSaveCity = () => {
    loadCities();
  };

  const handleCopyLink = (cityId, cityName) => {
    const link = `${window.location.origin}/citta/${cityId}`;
    navigator.clipboard.writeText(link).then(() => {
      alert(`✅ Link copiato!\n\n${link}`);
    }).catch(() => {
      alert(`Link: ${link}`);
    });
  };


  // Get unique dates from bookings
  const uniqueDates = [...new Set(bookings.map(b => b.date))].filter(Boolean).sort();

  // Get next event date (earliest future date)
  const getNextEventDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDates = uniqueDates
      .map(dateStr => new Date(dateStr))
      .filter(date => date >= today)
      .sort((a, b) => a - b);

    return futureDates.length > 0 ? futureDates[0].toISOString().split('T')[0] : null;
  };

  // Calculate stats for a city based on date filter
  const getCityStats = (cityId) => {
    let cityBookings = bookings.filter(b => b.cityId === cityId && b.status !== 'cancelled');

    // Apply date filter (if dates are selected, filter by those dates)
    if (selectedDates.length > 0) {
      cityBookings = cityBookings.filter(b => selectedDates.includes(b.date));
    }

    return {
      bookingsCount: cityBookings.length,
      totalSpots: cityBookings.reduce((sum, b) => sum + (b.spots || 0), 0)
    };
  };

  // Get filtered date suggestions
  const filteredDateSuggestions = uniqueDates.filter(date => {
    const formattedDate = new Date(date).toLocaleDateString('it-IT', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    return formattedDate.toLowerCase().includes(dateSearchTerm.toLowerCase()) &&
           !selectedDates.includes(date);
  });

  // Add date to selection
  const addDate = (date) => {
    setSelectedDates(prev => [...prev, date]);
    setDateSearchTerm('');
    setShowDateSuggestions(false);
  };

  // Remove date from selection
  const removeDate = (date) => {
    setSelectedDates(prev => prev.filter(d => d !== date));
  };

  // Clear all dates (shows all events)
  const clearAllDates = () => {
    setSelectedDates([]);
    setDateSearchTerm('');
  };

  // Select next event
  const selectNextEvent = () => {
    const nextDate = getNextEventDate();
    if (nextDate) {
      setSelectedDates([nextDate]);
      setDateSearchTerm('');
    }
  };

  const filteredCities = cities.filter(city => {
    if (filter === 'all') return true;
    return city.status === filter;
  });

  const stats = {
    total: cities.length,
    available: cities.filter(c => c.status === 'available').length,
    ended: cities.filter(c => c.status === 'ended').length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center">
              <FaCity className="text-primary text-2xl sm:text-3xl mr-2 sm:mr-3" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-primary">Admin Dashboard</h1>
                <p className="text-xs sm:text-sm text-gray-600">Gestione Città - Cultura Immersiva</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full lg:w-auto">
              <button
                onClick={() => navigate('/admin/bookings')}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-secondary text-white text-sm rounded-lg hover:bg-secondary-light transition-colors w-full sm:w-auto justify-center"
              >
                <FaCalendarCheck />
                <span className="hidden sm:inline">Prenotazioni</span>
                <span className="sm:hidden">Prenot.</span>
              </button>
              <button
                onClick={() => navigate('/admin/reminders')}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition-colors w-full sm:w-auto justify-center"
              >
                <FaBell />
                <span className="hidden sm:inline">Reminder</span>
                <span className="sm:hidden">Remind.</span>
              </button>
              <span className="text-xs sm:text-sm text-gray-600 hidden md:inline">
                {currentUser?.email}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors w-full sm:w-auto justify-center"
              >
                <FaSignOutAlt />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Totale Città</div>
            <div className="text-3xl font-bold text-primary">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Posti Disponibili</div>
            <div className="text-3xl font-bold text-green-600">{stats.available}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Eventi Terminati</div>
            <div className="text-3xl font-bold text-gray-500">{stats.ended}</div>
          </div>
        </div>

        {/* Date Filter */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Statistiche Prenotazioni per Evento ({selectedDates.length === 0 ? 'Tutti gli eventi' : `${selectedDates.length} ${selectedDates.length === 1 ? 'data selezionata' : 'date selezionate'}`})
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={clearAllDates}
                className="px-3 py-1 text-xs sm:text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Tutti gli Eventi
              </button>
              <button
                onClick={selectNextEvent}
                className="px-3 py-1 text-xs sm:text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Prossimo Evento
              </button>
            </div>
          </div>

          {uniqueDates.length > 0 ? (
            <div className="date-search-container">
              <div className="relative">
                <input
                  type="text"
                  value={dateSearchTerm}
                  onChange={(e) => {
                    setDateSearchTerm(e.target.value);
                    setShowDateSuggestions(true);
                  }}
                  onFocus={() => setShowDateSuggestions(true)}
                  placeholder="Digita per cercare date..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />

                {/* Date Suggestions Dropdown */}
                {showDateSuggestions && dateSearchTerm && filteredDateSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredDateSuggestions.map(date => (
                      <div
                        key={date}
                        onClick={() => addDate(date)}
                        className="px-4 py-2 hover:bg-primary hover:bg-opacity-10 cursor-pointer transition-colors"
                      >
                        {new Date(date).toLocaleDateString('it-IT', {
                          weekday: 'long',
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Dates Tags */}
              {selectedDates.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedDates.map(date => (
                    <span
                      key={date}
                      className="inline-flex items-center gap-2 px-3 py-1 bg-primary bg-opacity-10 text-primary rounded-full text-sm font-medium"
                    >
                      {new Date(date).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                      <button
                        onClick={() => removeDate(date)}
                        className="hover:text-primary-dark transition-colors"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              Nessuna prenotazione disponibile
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 sm:px-4 py-2 text-sm rounded-lg ${
                filter === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Tutte ({stats.total})
            </button>
            <button
              onClick={() => setFilter('available')}
              className={`px-3 sm:px-4 py-2 text-sm rounded-lg ${
                filter === 'available'
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Disponibili ({stats.available})
            </button>
            <button
              onClick={() => setFilter('ended')}
              className={`px-3 sm:px-4 py-2 text-sm rounded-lg ${
                filter === 'ended'
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Terminati ({stats.ended})
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => handleOpenModal(null)}
              className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-secondary text-white rounded-lg hover:bg-secondary-light transition-colors"
            >
              <FaPlus />
              <span className="hidden sm:inline">Aggiungi Città</span>
              <span className="sm:hidden">Aggiungi</span>
            </button>
          </div>
        </div>

        {/* Cities Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-600">Caricamento...</div>
            </div>
          ) : filteredCities.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-600">Nessuna città trovata</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Città
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Regione
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prenotazioni
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Posti Tot.
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCities.map((city) => (
                  <tr
                    key={city.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleOpenModal(city.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img
                          src={city.image}
                          alt={city.name}
                          className="w-12 h-12 rounded object-cover mr-3"
                        />
                        <div className="text-sm font-medium text-gray-900">
                          {city.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{city.region}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          city.status === 'available'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {city.status === 'available' ? 'Disponibile' : 'Terminato'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {city.eventData?.dates || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {getCityStats(city.id).bookingsCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                        {getCityStats(city.id).totalSpots}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyLink(city.id, city.name);
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                        title="Copia link pagina città"
                      >
                        <FaCopy className="inline" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenModal(city.id);
                        }}
                        className="text-primary hover:text-primary-dark mr-4"
                        title="Modifica città"
                      >
                        <FaEdit className="inline" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(city.id);
                        }}
                        className="text-red-600 hover:text-red-900"
                        title="Elimina città"
                      >
                        <FaTrash className="inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>

      {/* City Modal */}
      <CityModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        cityId={selectedCityId}
        onSave={handleSaveCity}
      />
    </div>
  );
};

export default Dashboard;
