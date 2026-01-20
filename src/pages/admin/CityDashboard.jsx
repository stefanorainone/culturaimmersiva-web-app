import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, getDocs, addDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { FaArrowLeft, FaUsers, FaCheck, FaReceipt, FaClock, FaEuroSign, FaUserPlus, FaTrash, FaTimes, FaUserCog, FaSearch, FaStickyNote, FaCalendar, FaHistory, FaMapMarkerAlt } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';

// Mask email: show first 3 chars + asterisks (unless admin)
const maskEmail = (email, isAdmin = false) => {
  if (!email) return '***';
  if (isAdmin) return email; // Admin sees full email
  const [local, domain] = email.split('@');
  if (!domain) return email.substring(0, 3) + '***';
  const maskedLocal = local.substring(0, 3) + '***';
  return `${maskedLocal}@${domain}`;
};

// Format name
const formatName = (booking) => {
  const name = booking.name || '';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  }
  return { firstName: name, lastName: '' };
};

export default function CityDashboard() {
  const { cityId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [city, setCity] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [availableDates, setAvailableDates] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPastDates, setShowPastDates] = useState(false);

  // Operator management state
  const [showOperatorModal, setShowOperatorModal] = useState(false);
  const [operators, setOperators] = useState([]); // Operators assigned to this city
  const [allOperators, setAllOperators] = useState([]); // All operators (for selection)
  const [operatorForm, setOperatorForm] = useState({ email: '', password: '', name: '' });
  const [operatorLoading, setOperatorLoading] = useState(false);
  const [operatorError, setOperatorError] = useState('');
  const [showNewOperatorForm, setShowNewOperatorForm] = useState(false);

  // Walk-in state (persone senza prenotazione)
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInForm, setWalkInForm] = useState({ name: '', email: '', spots: 1, time: '' });
  const [walkInLoading, setWalkInLoading] = useState(false);

  // Note state
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteBooking, setNoteBooking] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  // Check user role
  useEffect(() => {
    const checkUserRole = async () => {
      if (!currentUser) return;
      const operatorDoc = await getDoc(doc(db, 'operators', currentUser.uid));
      if (operatorDoc.exists()) {
        setUserRole(operatorDoc.data().role);
      } else {
        setUserRole('admin'); // Default to admin for backward compatibility
      }
    };
    checkUserRole();
  }, [currentUser]);

  const isAdmin = userRole === 'admin';

  // Load city info
  useEffect(() => {
    const loadCity = async () => {
      const cityDoc = await getDoc(doc(db, 'cities', cityId));
      if (cityDoc.exists()) {
        setCity({ id: cityDoc.id, ...cityDoc.data() });
      }
    };
    loadCity();
  }, [cityId]);

  // Load all operators and filter for this city
  useEffect(() => {
    // Load when modal opens or city changes
    if (!showOperatorModal && allOperators.length > 0) return;

    const loadOperators = async () => {
      try {
        // Load ALL operators (to show available ones for assignment)
        const snapshot = await getDocs(collection(db, 'operators'));
        const allOps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllOperators(allOps);

        // Filter operators assigned to this city
        // Support both old format (assignedCityId) and new format (assignedCities array)
        const cityOps = allOps.filter(op => {
          // Check new format: assignedCities array
          if (op.assignedCities && Array.isArray(op.assignedCities)) {
            return op.assignedCities.includes(cityId);
          }
          // Check old format: assignedCityId string
          if (op.assignedCityId === cityId) {
            return true;
          }
          return false;
        });

        setOperators(cityOps);
      } catch (error) {
        console.error('Error loading operators:', error);
      }
    };

    loadOperators();
  }, [cityId, showOperatorModal]);

  // Add new operator (create new account)
  const handleAddOperator = async () => {
    if (!operatorForm.email || !operatorForm.password || !operatorForm.name) {
      setOperatorError('Tutti i campi sono obbligatori');
      return;
    }

    setOperatorLoading(true);
    setOperatorError('');

    try {
      const functions = getFunctions();
      const createCityOperator = httpsCallable(functions, 'createCityOperator');
      await createCityOperator({
        email: operatorForm.email,
        password: operatorForm.password,
        name: operatorForm.name,
        cityId: cityId,
        cityName: city?.name || cityId
      });

      setOperatorForm({ email: '', password: '', name: '' });
      setShowNewOperatorForm(false);
      // Reload operators
      const snapshot = await getDocs(collection(db, 'operators'));
      const allOps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllOperators(allOps);
      const cityOps = allOps.filter(op => {
        if (op.assignedCities && Array.isArray(op.assignedCities)) {
          return op.assignedCities.includes(cityId);
        }
        return op.assignedCityId === cityId;
      });
      setOperators(cityOps);
      alert('Operatore creato con successo!');
    } catch (error) {
      console.error('Error creating operator:', error);
      setOperatorError(error.message || 'Errore nella creazione');
    } finally {
      setOperatorLoading(false);
    }
  };

  // Assign existing operator to this city
  const handleAssignOperator = async (operatorId) => {
    setOperatorLoading(true);
    setOperatorError('');

    try {
      const operatorRef = doc(db, 'operators', operatorId);
      const operatorDoc = await getDoc(operatorRef);

      if (!operatorDoc.exists()) {
        setOperatorError('Operatore non trovato');
        return;
      }

      const operatorData = operatorDoc.data();
      let assignedCities = operatorData.assignedCities || [];

      // If using old format, migrate to new format
      if (operatorData.assignedCityId && !assignedCities.includes(operatorData.assignedCityId)) {
        assignedCities.push(operatorData.assignedCityId);
      }

      // Add this city if not already assigned
      if (!assignedCities.includes(cityId)) {
        assignedCities.push(cityId);
      }

      // Build assignedCityNames object
      let assignedCityNames = operatorData.assignedCityNames || {};
      if (operatorData.assignedCityId && operatorData.assignedCityName) {
        assignedCityNames[operatorData.assignedCityId] = operatorData.assignedCityName;
      }
      assignedCityNames[cityId] = city?.name || cityId;

      await updateDoc(operatorRef, {
        assignedCities,
        assignedCityNames
      });

      // Reload operators
      const snapshot = await getDocs(collection(db, 'operators'));
      const allOps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllOperators(allOps);
      const cityOps = allOps.filter(op => {
        if (op.assignedCities && Array.isArray(op.assignedCities)) {
          return op.assignedCities.includes(cityId);
        }
        return op.assignedCityId === cityId;
      });
      setOperators(cityOps);
    } catch (error) {
      console.error('Error assigning operator:', error);
      setOperatorError(error.message || 'Errore nell\'assegnazione');
    } finally {
      setOperatorLoading(false);
    }
  };

  // Remove operator from this city (or delete if only assigned here)
  const handleRemoveOperator = async (operatorId) => {
    const operator = operators.find(op => op.id === operatorId);
    const assignedCities = operator?.assignedCities || [];
    const hasMultipleCities = assignedCities.length > 1;

    const message = hasMultipleCities
      ? `Rimuovere ${operator?.name} da ${city?.name}? L'operatore resterà assegnato alle altre città.`
      : `Sei sicuro di voler eliminare l'operatore ${operator?.name}? È assegnato solo a questa città.`;

    if (!confirm(message)) return;

    try {
      if (hasMultipleCities) {
        // Remove only this city from assignedCities
        const operatorRef = doc(db, 'operators', operatorId);
        const newAssignedCities = assignedCities.filter(c => c !== cityId);
        const operatorData = operator;
        const newAssignedCityNames = { ...operatorData.assignedCityNames };
        delete newAssignedCityNames[cityId];

        await updateDoc(operatorRef, {
          assignedCities: newAssignedCities,
          assignedCityNames: newAssignedCityNames
        });
      } else {
        // Delete operator completely
        const functions = getFunctions();
        const deleteCityOperator = httpsCallable(functions, 'deleteCityOperator');
        await deleteCityOperator({ operatorId });
      }

      // Reload operators
      const snapshot = await getDocs(collection(db, 'operators'));
      const allOps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllOperators(allOps);
      const cityOps = allOps.filter(op => {
        if (op.assignedCities && Array.isArray(op.assignedCities)) {
          return op.assignedCities.includes(cityId);
        }
        return op.assignedCityId === cityId;
      });
      setOperators(cityOps);
    } catch (error) {
      console.error('Error removing operator:', error);
      alert('Errore nella rimozione: ' + error.message);
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

  // Real-time bookings subscription
  useEffect(() => {
    const q = query(
      collection(db, 'bookings'),
      where('cityId', '==', cityId),
      where('status', '==', 'confirmed')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort by date and time
      bookingsData.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.time.localeCompare(b.time);
      });

      setBookings(bookingsData);

      // Extract ALL unique dates (not filtered)
      const allDates = [...new Set(bookingsData.map(b => b.date))].sort();
      setAvailableDates(allDates);

      // Auto-select today or first available future date
      if (!selectedDate && allDates.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const futureDates = allDates.filter(d => isFutureDate(d));
        if (futureDates.length > 0) {
          setSelectedDate(futureDates.includes(today) ? today : futureDates[0]);
        } else {
          // If no future dates, select most recent past date
          setSelectedDate(allDates[allDates.length - 1]);
          setShowPastDates(true);
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [cityId]);

  // Filter bookings by selected date and search query
  const filteredBookings = bookings.filter(b => {
    if (b.date !== selectedDate) return false;
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    const name = (b.name || '').toLowerCase();
    const email = (b.email || '').toLowerCase();

    return name.includes(query) || email.includes(query);
  });

  // Group by time slot
  const groupedByTime = filteredBookings.reduce((acc, booking) => {
    const time = booking.time || 'N/A';
    if (!acc[time]) acc[time] = [];
    acc[time].push(booking);
    return acc;
  }, {});

  // Sort time slots
  const sortedTimeSlots = Object.keys(groupedByTime).sort();

  // Calculate stats
  const totalBookings = filteredBookings.length;
  const totalSpots = filteredBookings.reduce((sum, b) => sum + (b.spots || 1), 0);
  const checkedIn = filteredBookings.filter(b => b.attendance?.confirmed).length;
  const totalRevenue = filteredBookings.reduce((sum, b) => sum + (b.attendance?.pricePaid || 0), 0);

  // Update attendance - auto-confirms when numberPresent is set, unconfirms when cleared
  const updateAttendance = async (bookingId, field, value) => {
    try {
      const updates = {
        [`attendance.${field}`]: value,
        [`attendance.updatedAt`]: new Date()
      };

      // Auto-confirm when numberPresent is set to a value > 0
      if (field === 'numberPresent') {
        if (value > 0) {
          updates['attendance.confirmed'] = true;
          updates['attendance.confirmedAt'] = new Date();
        } else {
          // Unconfirm when numberPresent is cleared (set to 0 or empty)
          updates['attendance.confirmed'] = false;
          updates['attendance.confirmedAt'] = null;
        }
      }

      await updateDoc(doc(db, 'bookings', bookingId), updates);
    } catch (error) {
      console.error('Error updating attendance:', error);
      alert('Errore nell\'aggiornamento');
    }
  };

  // Add walk-in (persona senza prenotazione)
  const addWalkIn = async () => {
    if (!walkInForm.name.trim() || !walkInForm.time) {
      alert('Inserisci nome e orario');
      return;
    }

    setWalkInLoading(true);
    try {
      await addDoc(collection(db, 'bookings'), {
        cityId: cityId,
        cityName: city?.name || cityId,
        date: selectedDate,
        time: walkInForm.time,
        name: walkInForm.name.trim(),
        email: walkInForm.email.trim() || '',
        spots: walkInForm.spots || 1,
        status: 'confirmed',
        isWalkIn: true, // Flag per identificare walk-in
        createdAt: new Date(),
        createdBy: currentUser?.email || 'operator',
        attendance: {
          confirmed: true,
          numberPresent: walkInForm.spots || 1,
          updatedAt: new Date()
        }
      });

      setShowWalkInModal(false);
      setWalkInForm({ name: '', email: '', spots: 1, time: '' });
    } catch (error) {
      console.error('Error adding walk-in:', error);
      alert('Errore nell\'aggiunta');
    } finally {
      setWalkInLoading(false);
    }
  };

  // Open note modal
  const openNoteModal = (booking) => {
    setNoteBooking(booking);
    setNoteText(booking.operatorNote || '');
    setShowNoteModal(true);
  };

  // Save note
  const saveNote = async () => {
    if (!noteBooking) return;

    setNoteSaving(true);
    try {
      await updateDoc(doc(db, 'bookings', noteBooking.id), {
        operatorNote: noteText.trim(),
        noteUpdatedAt: new Date(),
        noteUpdatedBy: currentUser?.email || 'operator'
      });
      setShowNoteModal(false);
      setNoteBooking(null);
      setNoteText('');
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Errore nel salvataggio della nota');
    } finally {
      setNoteSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg sticky top-0 z-10 pwa-safe-top">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(isAdmin ? '/admin/dashboard' : '/admin/login')}
                className="p-2 hover:bg-white/10 rounded-lg transition"
              >
                <FaArrowLeft />
              </button>
              <div>
                <h1 className="text-xl font-bold">{city?.name || cityId}</h1>
                <p className="text-sm opacity-75">Dashboard Prenotazioni</p>
              </div>
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowOperatorModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
              >
                <FaUserCog />
                <span className="hidden sm:inline">Operatori ({operators.length})</span>
              </button>
            )}
            <button
              onClick={() => setShowWalkInModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition"
            >
              <FaUserPlus />
              <span className="hidden sm:inline">Aggiungi persone</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Future/Past Toggle */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setShowPastDates(false);
                // Select first future date
                const futureDates = availableDates.filter(d => isFutureDate(d));
                if (futureDates.length > 0) {
                  const today = new Date().toISOString().split('T')[0];
                  setSelectedDate(futureDates.includes(today) ? today : futureDates[0]);
                }
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                !showPastDates
                  ? 'bg-secondary text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FaCalendar />
              Date Future ({availableDates.filter(d => isFutureDate(d)).length})
            </button>
            <button
              onClick={() => {
                setShowPastDates(true);
                // Select most recent past date
                const pastDates = availableDates.filter(d => !isFutureDate(d));
                if (pastDates.length > 0) {
                  setSelectedDate(pastDates[pastDates.length - 1]);
                }
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                showPastDates
                  ? 'bg-gray-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FaHistory />
              Date Passate ({availableDates.filter(d => !isFutureDate(d)).length})
            </button>
          </div>
        </div>

        {/* Date selector */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {availableDates
              .filter(date => showPastDates ? !isFutureDate(date) : isFutureDate(date))
              .sort((a, b) => showPastDates ? new Date(b) - new Date(a) : new Date(a) - new Date(b))
              .map(date => {
              const d = new Date(date);
              const isToday = date === new Date().toISOString().split('T')[0];
              const dayName = d.toLocaleDateString('it-IT', { weekday: 'short' });
              const dayNum = d.getDate();
              const month = d.toLocaleDateString('it-IT', { month: 'short' });

              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    selectedDate === date
                      ? 'bg-secondary text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  } ${isToday ? 'ring-2 ring-secondary' : ''}`}
                >
                  <div className="text-xs uppercase">{dayName}</div>
                  <div className="text-lg">{dayNum}</div>
                  <div className="text-xs">{month}</div>
                </button>
              );
            })}
            {availableDates.filter(date => showPastDates ? !isFutureDate(date) : isFutureDate(date)).length === 0 && (
              <p className="text-gray-500 text-sm py-4">
                Nessuna {showPastDates ? 'data passata' : 'data futura'} disponibile
              </p>
            )}
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FaUsers className="text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalBookings}</div>
                <div className="text-xs text-gray-500">Prenotazioni</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <FaUsers className="text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalSpots}</div>
                <div className="text-xs text-gray-500">Persone</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <FaCheck className="text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{checkedIn}</div>
                <div className="text-xs text-gray-500">Check-in</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <FaEuroSign className="text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalRevenue}</div>
                <div className="text-xs text-gray-500">Incasso</div>
              </div>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div className="mb-6">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca per nome o email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-secondary focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            )}
          </div>
        </div>

        {/* Time slots */}
        {sortedTimeSlots.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500">
            Nessuna prenotazione per questa data
          </div>
        ) : (
          <div className="space-y-6">
            {sortedTimeSlots.map(time => (
              <div key={time} className="bg-white rounded-xl shadow overflow-hidden">
                {/* Time slot header */}
                <div className="bg-gradient-to-r from-secondary to-secondary-light px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white">
                    <FaClock />
                    <span className="font-bold text-lg">{time}</span>
                  </div>
                  <div className="flex items-center gap-4 text-white text-sm">
                    <span>{groupedByTime[time].length} prenotazioni</span>
                    <span>{groupedByTime[time].reduce((s, b) => s + (b.spots || 1), 0)} persone</span>
                  </div>
                </div>

                {/* Bookings list */}
                <div className="divide-y">
                  {groupedByTime[time].map(booking => {
                    const { firstName, lastName } = formatName(booking);
                    const attendance = booking.attendance || {};

                    return (
                      <div key={booking.id} className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                          {/* Person info */}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 flex items-center gap-2 flex-wrap">
                              {firstName} {lastName}
                              {booking.isWalkIn && (
                                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                  Walk-in
                                </span>
                              )}
                              {booking.payment?.status === 'paid' && booking.payment?.method === 'online' && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  booking.payment?.isGift
                                    ? 'bg-pink-100 text-pink-700'
                                    : 'bg-green-100 text-green-700'
                                }`}>
                                  {booking.payment?.isGift ? '🎁 Regalo' : '✓ Pagato online'}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {maskEmail(booking.email, currentUser?.email === 'admin@culturaimmersiva.it')}
                            </div>
                            {currentUser?.email === 'admin@culturaimmersiva.it' && (
                              <div className="text-sm text-gray-500">
                                📱 {booking.whatsapp || 'N/A'}
                              </div>
                            )}
                            <div className="text-xs text-gray-400 mt-1">
                              {booking.spots || 1} {(booking.spots || 1) === 1 ? 'persona' : 'persone'}
                            </div>
                          </div>

                          {/* Attendance controls */}
                          <div className="flex flex-wrap items-center gap-3">
                            {/* Number present - dropdown 1-10 */}
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-gray-500">Presenti:</label>
                              <select
                                value={attendance.numberPresent ?? ''}
                                onChange={(e) => updateAttendance(booking.id, 'numberPresent', parseInt(e.target.value) || 0)}
                                className="px-2 py-1 border rounded bg-white"
                              >
                                <option value="">-</option>
                                {[...Array(10)].map((_, i) => (
                                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                                ))}
                              </select>
                            </div>

                            {/* Price paid */}
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-gray-500">Pagato:</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={attendance.pricePaid ?? ''}
                                  onChange={(e) => updateAttendance(booking.id, 'pricePaid', parseFloat(e.target.value) || 0)}
                                  className="w-20 px-2 py-1 pr-6 border rounded text-center"
                                  placeholder="0"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                              </div>
                            </div>

                            {/* Payment method */}
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-gray-500">Metodo:</label>
                              <select
                                value={attendance.paymentMethod ?? ''}
                                onChange={(e) => updateAttendance(booking.id, 'paymentMethod', e.target.value)}
                                className="px-2 py-1 border rounded bg-white"
                              >
                                <option value="">-</option>
                                <option value="contanti">Contanti</option>
                                <option value="carta">Carta</option>
                              </select>
                            </div>

                            {/* Receipt sent */}
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={attendance.receiptSent || false}
                                onChange={(e) => updateAttendance(booking.id, 'receiptSent', e.target.checked)}
                                className="w-4 h-4 text-secondary rounded"
                              />
                              <FaReceipt className={attendance.receiptSent ? 'text-green-500' : 'text-gray-300'} />
                              <span className="text-xs text-gray-500">Scontrino</span>
                            </label>

                            {/* Confirmed indicator - only show if numberPresent > 0 */}
                            {attendance.confirmed && attendance.numberPresent > 0 && (
                              <span className="px-3 py-1 rounded-lg text-sm font-medium bg-green-500 text-white">
                                <FaCheck className="inline mr-1" />
                                Presente
                              </span>
                            )}

                            {/* Note button */}
                            <button
                              onClick={() => openNoteModal(booking)}
                              className={`p-2 rounded-lg transition ${
                                booking.operatorNote
                                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                              }`}
                              title={booking.operatorNote || 'Aggiungi nota'}
                            >
                              <FaStickyNote />
                            </button>
                          </div>
                        </div>

                        {/* Show note preview if exists */}
                        {booking.operatorNote && (
                          <div className="mt-2 ml-0 md:ml-4 p-2 bg-yellow-50 border-l-4 border-yellow-400 text-sm text-yellow-800 rounded">
                            <span className="font-medium">Nota:</span> {booking.operatorNote}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Operator Management Modal */}
      {showOperatorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Gestione Operatori</h2>
              <button
                onClick={() => {
                  setShowOperatorModal(false);
                  setShowNewOperatorForm(false);
                  setOperatorError('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-6">
              {operatorError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                  {operatorError}
                </div>
              )}

              {/* Operators assigned to this city */}
              <div className="mb-6">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <FaUsers className="text-secondary" />
                  Operatori assegnati ({operators.length})
                </h3>

                {operators.length === 0 ? (
                  <p className="text-gray-500 text-sm bg-gray-50 p-4 rounded-lg">
                    Nessun operatore assegnato a questa città
                  </p>
                ) : (
                  <div className="space-y-2">
                    {operators.map(op => {
                      const otherCities = (op.assignedCities || []).filter(c => c !== cityId);
                      return (
                        <div key={op.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div>
                            <div className="font-medium text-gray-900">{op.name}</div>
                            <div className="text-sm text-gray-500">{op.email}</div>
                            {otherCities.length > 0 && (
                              <div className="text-xs text-green-600 mt-1">
                                Anche in: {otherCities.map(c => op.assignedCityNames?.[c] || c).join(', ')}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveOperator(op.id)}
                            className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition"
                            title="Rimuovi da questa città"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Available operators (not assigned to this city) */}
              {(() => {
                const operatorIds = operators.map(op => op.id);
                // Show all operators not already assigned to this city
                const availableOperators = allOperators.filter(op => {
                  // Skip if already assigned to this city
                  if (operatorIds.includes(op.id)) return false;
                  // Skip if it's the current admin user
                  if (op.email === 'admin@culturaimmersiva.it') return false;
                  return true;
                });

                if (availableOperators.length === 0 && !showNewOperatorForm) {
                  return (
                    <div className="mb-6">
                      <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <FaUserPlus className="text-blue-500" />
                        Aggiungi operatore
                      </h3>
                      <p className="text-gray-500 text-sm mb-3">
                        Nessun operatore disponibile da aggiungere.
                      </p>
                      <button
                        onClick={() => setShowNewOperatorForm(true)}
                        className="w-full py-2 bg-secondary text-white rounded-lg hover:bg-secondary-dark transition"
                      >
                        Crea nuovo operatore
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="mb-6">
                    <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <FaUserPlus className="text-blue-500" />
                      Aggiungi operatore
                    </h3>

                    {!showNewOperatorForm && availableOperators.length > 0 && (
                      <>
                        <p className="text-sm text-gray-600 mb-3">
                          Seleziona un operatore esistente o crea uno nuovo:
                        </p>
                        <div className="space-y-2 mb-4">
                          {availableOperators.map(op => {
                            const hasAssignments = (op.assignedCities?.length > 0) || op.assignedCityId;
                            const assignedTo = op.assignedCities?.length > 0
                              ? op.assignedCities.map(c => op.assignedCityNames?.[c] || c).join(', ')
                              : op.assignedCityName || op.assignedCityId || null;
                            return (
                              <div key={op.id} className="flex items-center justify-between p-3 bg-gray-50 border rounded-lg">
                                <div>
                                  <div className="font-medium text-gray-900">{op.name}</div>
                                  <div className="text-sm text-gray-500">{op.email}</div>
                                  {hasAssignments && (
                                    <div className="text-xs text-blue-600 mt-1">
                                      Anche in: {assignedTo}
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleAssignOperator(op.id)}
                                  disabled={operatorLoading}
                                  className="px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
                                >
                                  Aggiungi
                                </button>
                              </div>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => setShowNewOperatorForm(true)}
                          className="w-full py-2 border border-secondary text-secondary rounded-lg hover:bg-secondary/5 transition"
                        >
                          Crea nuovo operatore
                        </button>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* New operator form */}
              {showNewOperatorForm && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <FaUserPlus className="text-secondary" />
                    Crea nuovo operatore
                  </h3>

                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Nome operatore"
                      value={operatorForm.name}
                      onChange={(e) => setOperatorForm({ ...operatorForm, name: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={operatorForm.email}
                      onChange={(e) => setOperatorForm({ ...operatorForm, email: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                    />
                    <input
                      type="password"
                      placeholder="Password (min 6 caratteri)"
                      value={operatorForm.password}
                      onChange={(e) => setOperatorForm({ ...operatorForm, password: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowNewOperatorForm(false);
                          setOperatorForm({ email: '', password: '', name: '' });
                          setOperatorError('');
                        }}
                        className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                      >
                        Annulla
                      </button>
                      <button
                        onClick={handleAddOperator}
                        disabled={operatorLoading}
                        className="flex-1 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-dark transition disabled:opacity-50"
                      >
                        {operatorLoading ? 'Creazione...' : 'Crea'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Walk-in Modal */}
      {showWalkInModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold text-gray-900">Aggiungi persone</h2>
              <button
                onClick={() => setShowWalkInModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">
                Registra una persona che si è presentata senza prenotazione.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  value={walkInForm.name}
                  onChange={(e) => setWalkInForm({ ...walkInForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Nome e cognome"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={walkInForm.email}
                  onChange={(e) => setWalkInForm({ ...walkInForm, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="email@esempio.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Orario *
                </label>
                <select
                  value={walkInForm.time}
                  onChange={(e) => setWalkInForm({ ...walkInForm, time: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Seleziona orario</option>
                  {sortedTimeSlots.length > 0 ? (
                    sortedTimeSlots.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))
                  ) : (
                    ['10:00','10:30','11:00','11:30','12:00','12:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30'].map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numero persone
                </label>
                <select
                  value={walkInForm.spots}
                  onChange={(e) => setWalkInForm({ ...walkInForm, spots: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={addWalkIn}
                disabled={walkInLoading || !walkInForm.name || !walkInForm.time}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {walkInLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Salvataggio...
                  </>
                ) : (
                  <>
                    <FaUserPlus />
                    Aggiungi
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {showNoteModal && noteBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FaStickyNote className="text-yellow-500" />
                Nota operatore
              </h2>
              <button
                onClick={() => {
                  setShowNoteModal(false);
                  setNoteBooking(null);
                  setNoteText('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{noteBooking.name}</span>
                <span className="text-gray-400 ml-2">({noteBooking.time})</span>
              </div>

              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Scrivi una nota su questa prenotazione..."
                rows={4}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent resize-none"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowNoteModal(false);
                    setNoteBooking(null);
                    setNoteText('');
                  }}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Annulla
                </button>
                <button
                  onClick={saveNote}
                  disabled={noteSaving}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  {noteSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <FaStickyNote />
                      Salva nota
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
