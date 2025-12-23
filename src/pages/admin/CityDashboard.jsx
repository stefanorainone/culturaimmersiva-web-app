import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { FaArrowLeft, FaUsers, FaCheck, FaReceipt, FaClock, FaEuroSign, FaUserPlus, FaTrash, FaTimes, FaUserCog, FaSearch } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';

// Mask email: show first 3 chars + asterisks
const maskEmail = (email) => {
  if (!email) return '***';
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

  // Operator management state
  const [showOperatorModal, setShowOperatorModal] = useState(false);
  const [operators, setOperators] = useState([]);
  const [operatorForm, setOperatorForm] = useState({ email: '', password: '', name: '' });
  const [operatorLoading, setOperatorLoading] = useState(false);
  const [operatorError, setOperatorError] = useState('');

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

  // Load operators for this city (admin only)
  useEffect(() => {
    if (!isAdmin) return;

    const loadOperators = async () => {
      const q = query(
        collection(db, 'operators'),
        where('assignedCityId', '==', cityId)
      );
      const snapshot = await getDocs(q);
      const ops = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOperators(ops);
    };

    loadOperators();
  }, [cityId, isAdmin, showOperatorModal]);

  // Add operator
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
      setShowOperatorModal(false);
      alert('Operatore creato con successo!');
    } catch (error) {
      console.error('Error creating operator:', error);
      setOperatorError(error.message || 'Errore nella creazione');
    } finally {
      setOperatorLoading(false);
    }
  };

  // Delete operator
  const handleDeleteOperator = async (operatorId) => {
    if (!confirm('Sei sicuro di voler eliminare questo operatore?')) return;

    try {
      const functions = getFunctions();
      const deleteCityOperator = httpsCallable(functions, 'deleteCityOperator');
      await deleteCityOperator({ operatorId });
      setOperators(ops => ops.filter(op => op.id !== operatorId));
    } catch (error) {
      console.error('Error deleting operator:', error);
      alert('Errore nell\'eliminazione: ' + error.message);
    }
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

      // Extract unique dates
      const dates = [...new Set(bookingsData.map(b => b.date))].sort();
      setAvailableDates(dates);

      // Auto-select today or first available date
      if (!selectedDate && dates.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        setSelectedDate(dates.includes(today) ? today : dates[0]);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [cityId, selectedDate]);

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
        } else {
          // Unconfirm when numberPresent is cleared (set to 0 or empty)
          updates['attendance.confirmed'] = false;
        }
      }

      await updateDoc(doc(db, 'bookings', bookingId), updates);
    } catch (error) {
      console.error('Error updating attendance:', error);
      alert('Errore nell\'aggiornamento');
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
      <header className="bg-primary text-white shadow-lg sticky top-0 z-10">
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
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Date selector */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {availableDates.map(date => {
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
                            <div className="font-medium text-gray-900">
                              {firstName} {lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {maskEmail(booking.email)}
                            </div>
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
                          </div>
                        </div>
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
                onClick={() => setShowOperatorModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-6">
              {/* Add new operator form */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <FaUserPlus className="text-secondary" />
                  Aggiungi Operatore
                </h3>

                {operatorError && (
                  <div className="mb-3 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                    {operatorError}
                  </div>
                )}

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
                  <button
                    onClick={handleAddOperator}
                    disabled={operatorLoading}
                    className="w-full py-2 bg-secondary text-white rounded-lg hover:bg-secondary-dark transition disabled:opacity-50"
                  >
                    {operatorLoading ? 'Creazione...' : 'Crea Operatore'}
                  </button>
                </div>
              </div>

              {/* Operators list */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">
                  Operatori assegnati ({operators.length})
                </h3>

                {operators.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    Nessun operatore assegnato a questa città
                  </p>
                ) : (
                  <div className="space-y-2">
                    {operators.map(op => (
                      <div key={op.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">{op.name}</div>
                          <div className="text-sm text-gray-500">{op.email}</div>
                        </div>
                        <button
                          onClick={() => handleDeleteOperator(op.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                          title="Elimina operatore"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
