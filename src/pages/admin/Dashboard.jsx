import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import {
  collection,
  getDocs,
  doc,
  query,
  orderBy,
  updateDoc,
  where,
  Timestamp
} from 'firebase/firestore';
import { FaPlus, FaEdit, FaSignOutAlt, FaCity, FaCalendarCheck, FaCopy, FaBell, FaBan, FaWhatsapp, FaUsers, FaChartBar, FaCalendar, FaClock, FaStar } from 'react-icons/fa';
import CityModal from '../../components/admin/CityModal';

const Dashboard = () => {
  const [cities, setCities] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [cityViews, setCityViews] = useState({}); // { cityId: { total: N, future: N } }
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('available');
  const [selectedDates, setSelectedDates] = useState([]); // Array of selected dates
  const [dateSearchTerm, setDateSearchTerm] = useState('');
  const [showDateSuggestions, setShowDateSuggestions] = useState(false);
  const [citySearchTerm, setCitySearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCityId, setSelectedCityId] = useState(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cityToCancel, setCityToCancel] = useState(null);
  const [cancelMessage, setCancelMessage] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelConfirmText, setCancelConfirmText] = useState('');
  const [showPastBookings, setShowPastBookings] = useState(false);
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

  // Reset date filters when switching between future/past
  useEffect(() => {
    setSelectedDates([]);
    setDateSearchTerm('');
  }, [showPastBookings]);

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
      // Check timeSlots for future dates (more reliable than parsing dates string)
      const timeSlots = city.eventData?.timeSlots || [];

      // If no timeSlots, skip this city
      if (timeSlots.length === 0) continue;

      // Check if there are any future dates in timeSlots
      const hasFutureDates = timeSlots.some(slot => {
        if (!slot.date) return false;
        const slotDate = new Date(slot.date);
        slotDate.setHours(0, 0, 0, 0);
        return slotDate >= today;
      });

      // If no future dates and status is available, mark as ended
      if (!hasFutureDates && city.status === 'available') {
        try {
          await updateDoc(doc(db, 'cities', city.id), { status: 'ended' });
          city.status = 'ended'; // Update local data
          updatedCount++;
        } catch (error) {
          console.error(`Error updating city ${city.name}:`, error);
        }
      }

      // If has future dates but status is ended, mark as available
      if (hasFutureDates && city.status !== 'available') {
        try {
          await updateDoc(doc(db, 'cities', city.id), { status: 'available' });
          city.status = 'available'; // Update local data
          updatedCount++;
          console.log(`✅ ${city.name}: riattivato (date future trovate)`);
        } catch (error) {
          console.error(`Error updating city ${city.name}:`, error);
        }
      }
    }

    if (updatedCount > 0) {
      console.log(`✅ Aggiornati automaticamente ${updatedCount} eventi`);
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

      // Carica le visite per ogni città (in background)
      loadCityViews(citiesData);
    } catch (error) {
      console.error('Error loading cities:', error);
    } finally {
      setLoading(false);
    }
  };

  // Carica le visite dalla prima data futura per ogni città
  const loadCityViews = async (citiesData) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const viewsMap = {};

    // Process cities in parallel (batch of 5 to avoid rate limits)
    const batchSize = 5;
    for (let i = 0; i < citiesData.length; i += batchSize) {
      const batch = citiesData.slice(i, i + batchSize);

      await Promise.all(batch.map(async (city) => {
        try {
          // Trova la prima data futura dai timeSlots
          const timeSlots = city.eventData?.timeSlots || [];
          const futureDates = timeSlots
            .filter(slot => {
              if (!slot.date) return false;
              const slotDate = new Date(slot.date);
              slotDate.setHours(0, 0, 0, 0);
              return slotDate >= today;
            })
            .map(slot => new Date(slot.date))
            .sort((a, b) => a - b);

          const firstFutureDate = futureDates.length > 0 ? futureDates[0] : null;

          // Carica le visite dalla sotto-collezione
          const viewsSnapshot = await getDocs(collection(db, 'cities', city.id, 'views'));
          const totalViews = viewsSnapshot.size;

          let futureViews = 0;
          if (firstFutureDate) {
            // Conta le visite con timestamp >= prima data futura
            viewsSnapshot.docs.forEach(doc => {
              const data = doc.data();
              const viewTimestamp = data.t?.toDate?.() || data.t;
              if (viewTimestamp && viewTimestamp >= firstFutureDate) {
                futureViews++;
              }
            });
          }

          viewsMap[city.id] = {
            total: totalViews,
            future: futureViews,
            firstFutureDate: firstFutureDate?.toISOString()
          };
        } catch (error) {
          console.error(`Error loading views for ${city.id}:`, error);
          viewsMap[city.id] = { total: city.views || 0, future: city.views || 0 };
        }
      }));
    }

    setCityViews(viewsMap);
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

  // Helper: verifica se una data è futura
  const isFutureDate = (dateString) => {
    if (!dateString) return false;
    const eventDate = new Date(dateString);
    const today = new Date();
    eventDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return eventDate >= today;
  };

  const handleOpenCancelModal = (city) => {
    setCityToCancel(city);
    setCancelMessage(`Siamo spiacenti di informarti che l'evento "${city.name}" è stato annullato. Ci scusiamo per il disagio.`);
    setCancelModalOpen(true);
  };

  const handleCancelEvent = async () => {
    if (!cityToCancel || !cancelMessage.trim()) return;

    // Security check: require confirmation text
    if (cancelConfirmText.toUpperCase() !== 'ANNULLA') {
      alert('Per confermare l\'annullamento, digita "ANNULLA" nel campo di conferma.');
      return;
    }

    setIsCancelling(true);

    try {
      // Get all confirmed bookings for this city
      const cityBookings = bookings.filter(
        b => b.cityId === cityToCancel.id && b.status === 'confirmed'
      );

      console.log(`Annullamento evento ${cityToCancel.name}: ${cityBookings.length} prenotazioni`);

      // Cancel each booking and send email
      for (const booking of cityBookings) {
        // Update booking status
        await updateDoc(doc(db, 'bookings', booking.id), {
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
          cancelReason: 'Evento annullato'
        });

        // Send cancellation email via Cloud Function
        try {
          await fetch('https://us-central1-culturaimmersiva-it.cloudfunctions.net/sendAdminCancellation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data: {
                booking: {
                  name: booking.name,
                  email: booking.email,
                  cityName: booking.cityName,
                  date: booking.date,
                  time: booking.time,
                  spots: booking.spots,
                  locationName: booking.locationName || '',
                  locationAddress: booking.locationAddress || ''
                },
                reason: cancelMessage
              }
            })
          });
          console.log(`Email inviata a ${booking.email}`);
        } catch (emailError) {
          console.error(`Errore invio email a ${booking.email}:`, emailError);
        }
      }

      // Update city status to ended
      await updateDoc(doc(db, 'cities', cityToCancel.id), {
        status: 'ended'
      });

      // Update local state
      setCities(cities.map(c =>
        c.id === cityToCancel.id ? { ...c, status: 'ended' } : c
      ));
      setBookings(bookings.map(b =>
        b.cityId === cityToCancel.id && b.status === 'confirmed'
          ? { ...b, status: 'cancelled' }
          : b
      ));

      alert(`Evento annullato!\n\n${cityBookings.length} prenotazioni cancellate e notificate via email.`);
      setCancelModalOpen(false);
      setCityToCancel(null);
      setCancelMessage('');
      setCancelConfirmText('');

    } catch (error) {
      console.error('Errore durante annullamento:', error);
      alert(`Errore durante l'annullamento: ${error.message}`);
    } finally {
      setIsCancelling(false);
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


  // Get unique dates from bookings (filtered by future/past)
  const uniqueDates = [...new Set(bookings.map(b => b.date))]
    .filter(date => {
      if (!date) return false;
      return showPastBookings ? !isFutureDate(date) : isFutureDate(date);
    })
    .sort((a, b) => showPastBookings ? new Date(b) - new Date(a) : new Date(a) - new Date(b));

  // Get all future event dates
  const getAllFutureDates = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return uniqueDates
      .filter(dateStr => new Date(dateStr) >= today)
      .sort((a, b) => new Date(a) - new Date(b));
  };

  // Calculate stats for a city based on date filter
  const getCityStats = (cityId) => {
    let cityBookings = bookings.filter(b => b.cityId === cityId && b.status !== 'cancelled');

    // Apply future/past filter
    cityBookings = cityBookings.filter(b =>
      showPastBookings ? !isFutureDate(b.date) : isFutureDate(b.date)
    );

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

  // Select all future events
  const selectFutureEvents = () => {
    const futureDates = getAllFutureDates();
    if (futureDates.length > 0) {
      setSelectedDates(futureDates);
      setDateSearchTerm('');
    }
  };

  const filteredCities = cities.filter(city => {
    // Filter by status
    if (filter !== 'all' && city.status !== filter) return false;

    // Filter by selected dates - only show cities that have bookings for those dates
    if (selectedDates.length > 0) {
      const cityHasBookingsForDates = bookings.some(
        b => b.cityId === city.id && selectedDates.includes(b.date) && b.status !== 'cancelled'
      );
      if (!cityHasBookingsForDates) return false;
    }

    // Filter by search term (city name or region)
    if (citySearchTerm) {
      const searchLower = citySearchTerm.toLowerCase();
      const cityName = (city.name || '').toLowerCase();
      const region = (city.region || '').toLowerCase();
      return cityName.includes(searchLower) || region.includes(searchLower);
    }

    return true;
  });

  // Calculate booking stats based on selected dates AND filtered cities
  const getBookingStats = () => {
    let filteredBookings = bookings;

    // Filter by future/past
    filteredBookings = filteredBookings.filter(b =>
      showPastBookings ? !isFutureDate(b.date) : isFutureDate(b.date)
    );

    // Filter by dates
    if (selectedDates.length > 0) {
      filteredBookings = filteredBookings.filter(b => selectedDates.includes(b.date));
    }

    // Filter by cities displayed in table
    const filteredCityIds = filteredCities.map(c => c.id);
    filteredBookings = filteredBookings.filter(b => filteredCityIds.includes(b.cityId));

    return {
      totalBookings: filteredBookings.length,
      totalSpots: filteredBookings.reduce((sum, b) => sum + (b.spots || 0), 0)
    };
  };

  const bookingStats = getBookingStats();

  const stats = {
    total: cities.length,
    available: cities.filter(c => c.status === 'available').length,
    ended: cities.filter(c => c.status === 'ended').length,
    bookings: bookingStats.totalBookings,
    spots: bookingStats.totalSpots
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm pwa-safe-top">
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
              <button
                onClick={() => navigate('/admin/whatsapp')}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors w-full sm:w-auto justify-center"
              >
                <FaWhatsapp />
                <span className="hidden sm:inline">WhatsApp</span>
                <span className="sm:hidden">WA</span>
              </button>
              <button
                onClick={() => navigate('/admin/operators')}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors w-full sm:w-auto justify-center"
              >
                <FaUsers />
                <span className="hidden sm:inline">Operatori</span>
                <span className="sm:hidden">Op.</span>
              </button>
              <button
                onClick={() => navigate('/admin/reviews')}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-yellow-500 text-white text-sm rounded-lg hover:bg-yellow-600 transition-colors w-full sm:w-auto justify-center"
              >
                <FaStar />
                <span className="hidden sm:inline">Recensioni</span>
                <span className="sm:hidden">Rec.</span>
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
            <div className="text-xs text-gray-500 mt-1">
              {stats.available} disponibili • {stats.ended} terminati
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">
              Prenotazioni {showPastBookings ? 'Passate' : 'Future'}
              {selectedDates.length > 0 && (
                <span className="ml-2 text-xs text-blue-600">
                  ({selectedDates.length} {selectedDates.length === 1 ? 'data' : 'date'})
                </span>
              )}
            </div>
            <div className="text-3xl font-bold text-blue-600">{stats.bookings}</div>
            <div className="text-xs text-gray-500 mt-1">
              {showPastBookings ? 'Eventi già conclusi' : 'Eventi in programma'}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">
              Posti {showPastBookings ? 'Passati' : 'Prenotati'}
              {selectedDates.length > 0 && (
                <span className="ml-2 text-xs text-purple-600">
                  ({selectedDates.length} {selectedDates.length === 1 ? 'data' : 'date'})
                </span>
              )}
            </div>
            <div className="text-3xl font-bold text-purple-600">{stats.spots}</div>
            <div className="text-xs text-gray-500 mt-1">
              {showPastBookings ? 'Eventi già conclusi' : 'Eventi in programma'}
            </div>
          </div>
        </div>

        {/* Future/Past Filter */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowPastBookings(false)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                !showPastBookings
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FaCalendar />
              Eventi Futuri ({bookings.filter(b => isFutureDate(b.date) && b.status !== 'cancelled').length})
            </button>
            <button
              onClick={() => setShowPastBookings(true)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                showPastBookings
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FaClock />
              Eventi Passati ({bookings.filter(b => !isFutureDate(b.date) && b.status !== 'cancelled').length})
            </button>
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
                onClick={selectFutureEvents}
                className="px-3 py-1 text-xs sm:text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Prossimi Eventi
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

        {/* Search and Actions */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              value={citySearchTerm}
              onChange={(e) => setCitySearchTerm(e.target.value)}
              placeholder="Cerca per nome città o regione..."
              className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white shadow-sm"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {citySearchTerm && (
              <button
                onClick={() => setCitySearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filters and Add Button */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
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
        </div>

        {/* Search Results Info */}
        {citySearchTerm && (
          <div className="mb-4 text-sm text-gray-600">
            {filteredCities.length === 0 ? (
              <span>Nessun risultato per "<strong>{citySearchTerm}</strong>"</span>
            ) : (
              <span>
                {filteredCities.length} {filteredCities.length === 1 ? 'risultato' : 'risultati'} per "<strong>{citySearchTerm}</strong>"
              </span>
            )}
          </div>
        )}

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
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Visite
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Conversione
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const today = new Date().toISOString().split('T')[0];
                          navigate(`/admin/bookings?cityId=${city.id}&dateFrom=${today}`);
                        }}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors cursor-pointer"
                        title="Vedi prenotazioni per questa città"
                      >
                        {getCityStats(city.id).bookingsCount}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const today = new Date().toISOString().split('T')[0];
                          navigate(`/admin/bookings?cityId=${city.id}&dateFrom=${today}`);
                        }}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors cursor-pointer"
                        title="Vedi prenotazioni per questa città"
                      >
                        {getCityStats(city.id).totalSpots}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
                        title={cityViews[city.id]?.firstFutureDate
                          ? `Visite dal ${new Date(cityViews[city.id].firstFutureDate).toLocaleDateString('it-IT')} (totali: ${cityViews[city.id]?.total || 0})`
                          : `Visite totali`
                        }
                      >
                        {showPastBookings
                          ? (cityViews[city.id]?.total || city.views || 0)
                          : (cityViews[city.id]?.future ?? city.views ?? 0)
                        }
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {(() => {
                        const views = showPastBookings
                          ? (cityViews[city.id]?.total || city.views || 0)
                          : (cityViews[city.id]?.future ?? city.views ?? 0);
                        const bookings = getCityStats(city.id).bookingsCount;
                        const rate = views > 0 ? ((bookings / views) * 100).toFixed(1) : 0;
                        return (
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            rate >= 10 ? 'bg-green-100 text-green-800' :
                            rate >= 5 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {rate}%
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/city-dashboard/${city.id}`);
                        }}
                        className="text-secondary hover:text-secondary-light mr-4"
                        title="Dashboard prenotazioni"
                      >
                        <FaChartBar className="inline" />
                      </button>
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
                      {city.status === 'available' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCancelModal(city);
                          }}
                          className="text-red-600 hover:text-red-900"
                          title="Annulla evento"
                        >
                          <FaBan className="inline" />
                        </button>
                      )}
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

      {/* Cancel Event Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2">
              <FaBan /> Annulla Evento
            </h3>

            <div className="mb-4">
              <p className="text-gray-700 mb-2">
                Stai per annullare l'evento <strong>{cityToCancel?.name}</strong>.
              </p>
              <p className="text-sm text-gray-600">
                {bookings.filter(b => b.cityId === cityToCancel?.id && b.status === 'confirmed').length} prenotazioni verranno cancellate e notificate via email.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Messaggio da inviare ai clienti:
              </label>
              <textarea
                value={cancelMessage}
                onChange={(e) => setCancelMessage(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Inserisci il messaggio da inviare..."
              />
            </div>

            {/* Confirmation input */}
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-red-700 mb-2">
                Per confermare, digita <span className="font-bold">ANNULLA</span>
              </label>
              <input
                type="text"
                value={cancelConfirmText}
                onChange={(e) => setCancelConfirmText(e.target.value)}
                placeholder="Digita ANNULLA per confermare"
                className="w-full px-4 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 uppercase"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setCancelModalOpen(false);
                  setCityToCancel(null);
                  setCancelMessage('');
                  setCancelConfirmText('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                disabled={isCancelling}
              >
                Chiudi
              </button>
              <button
                onClick={handleCancelEvent}
                disabled={isCancelling || !cancelMessage.trim() || cancelConfirmText.toUpperCase() !== 'ANNULLA'}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCancelling ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Annullamento in corso...
                  </>
                ) : (
                  <>
                    <FaBan />
                    Conferma Annullamento
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
