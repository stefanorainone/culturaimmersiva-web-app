import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../config/firebase';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot
} from 'firebase/firestore';
import { FaClock, FaUsers, FaCalendar, FaCheckCircle } from 'react-icons/fa';

const Booking = () => {
  const { cityId } = useParams();
  const navigate = useNavigate();
  const slotsRef = useRef(null);
  const [city, setCity] = useState(null);
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null); // Track selected date

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Load city data
  useEffect(() => {
    const loadCity = async () => {
      try {
        const cityDoc = await getDoc(doc(db, 'cities', cityId));
        if (cityDoc.exists()) {
          const cityData = { id: cityDoc.id, ...cityDoc.data() };
          setCity(cityData);
          setSlots(cityData.eventData?.timeSlots || []);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error loading city:', error);
        setLoading(false);
      }
    };
    loadCity();
  }, [cityId]);

  // Auto-scroll to slots section when date is selected
  useEffect(() => {
    if (selectedDate && slotsRef.current) {
      setTimeout(() => {
        slotsRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    }
  }, [selectedDate]);

  // Real-time listener for city document (atomic counter - race condition fix)
  useEffect(() => {
    if (!cityId) return;

    const cityRef = doc(db, 'cities', cityId);

    const unsubscribe = onSnapshot(cityRef, (snapshot) => {
      if (snapshot.exists()) {
        const cityData = snapshot.data();
        // Use atomic counter from city document
        setBookings(cityData.bookedSlots || {});
      }
    });

    return () => unsubscribe();
  }, [cityId]);

  // Calculate available spots for a slot using atomic counter
  const getAvailableSpots = (slot) => {
    const key = `${slot.date}-${slot.time}`;
    const booked = bookings[key] || 0;
    return slot.capacity - booked;
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  // Check if a date is in the future
  const isFutureDate = (dateString) => {
    if (!dateString) return false;
    const slotDate = new Date(dateString);
    const today = new Date();
    // Set time to start of day for comparison
    slotDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return slotDate >= today;
  };

  // Filter out past dates and group slots by date
  const groupedSlots = slots
    .filter(slot => isFutureDate(slot.date))
    .reduce((acc, slot) => {
      const dateKey = slot.date || slot.day;
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(slot);
      return acc;
    }, {});

  // Handle slot selection
  const handleSelectSlot = (slot) => {
    const available = getAvailableSpots(slot);
    if (available <= 0) {
      alert('⚠️ Non ci sono più posti disponibili per questo orario');
      return;
    }
    // Navigate to booking form with slot data
    navigate(`/booking-form/${cityId}`, { state: { slot } });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!city) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Città non trovata</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Verifica Disponibilità
          </h1>
          <p className="text-xl text-gray-700">{city.name} - {city.region}</p>
          <p className="text-gray-600 mt-2">{city.eventData?.dates}</p>
        </div>

        {/* Step 1: Select Date (if no date selected) */}
        {!selectedDate && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <FaCalendar className="text-primary" />
              Seleziona una Data
            </h2>

            {slots.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Non ci sono date disponibili al momento
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(groupedSlots).map(([dateKey, dateSlots]) => {
                  const firstSlot = dateSlots[0];
                  // Calculate total available spots for this date
                  const totalAvailable = dateSlots.reduce((sum, slot) => {
                    return sum + getAvailableSpots(slot);
                  }, 0);
                  const hasAvailability = totalAvailable > 0;

                  return (
                    <button
                      key={dateKey}
                      onClick={() => setSelectedDate(dateKey)}
                      disabled={!hasAvailability}
                      className={`p-6 rounded-lg border-2 transition-all text-left ${
                        hasAvailability
                          ? 'border-gray-200 hover:border-primary hover:shadow-lg hover:scale-105'
                          : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-bold text-xl text-gray-800 mb-2">
                            {firstSlot.date ? formatDate(firstSlot.date) : firstSlot.day}
                          </div>
                          <div className={`text-sm flex items-center gap-2 ${
                            hasAvailability ? 'text-green-600' : 'text-red-600'
                          }`}>
                            <FaClock />
                            <span>{dateSlots.length} {dateSlots.length === 1 ? 'orario' : 'orari'}</span>
                          </div>
                          {hasAvailability && (
                            <div className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                              <FaUsers />
                              <span>{totalAvailable} posti disponibili</span>
                            </div>
                          )}
                        </div>
                        {hasAvailability && (
                          <div className="text-primary font-bold text-lg">
                            Scegli →
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Time Slot (if date selected) */}
        {selectedDate && (
          <div ref={slotsRef} className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-6">
              <button
                onClick={() => setSelectedDate(null)}
                className="text-primary hover:text-primary-dark flex items-center gap-2 mb-4"
              >
                ← Torna alle date
              </button>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <FaClock className="text-primary" />
                Orari Disponibili
              </h2>
              <p className="text-gray-600 mt-2">
                {groupedSlots[selectedDate]?.[0]?.date
                  ? formatDate(groupedSlots[selectedDate][0].date)
                  : groupedSlots[selectedDate]?.[0]?.day}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {groupedSlots[selectedDate]?.map((slot, idx) => {
                const available = getAvailableSpots(slot);
                const isAvailable = available > 0;

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectSlot(slot)}
                    disabled={!isAvailable}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      isAvailable
                        ? 'border-gray-200 hover:border-primary hover:shadow-md hover:scale-105'
                        : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-bold text-lg text-gray-800 flex items-center gap-2">
                          <FaClock className="text-primary" />
                          {slot.time}
                        </div>
                        <div className={`text-sm mt-2 flex items-center gap-1 ${
                          isAvailable ? 'text-green-600' : 'text-red-600'
                        }`}>
                          <FaUsers />
                          {isAvailable ? (
                            <span className="font-medium">{available} posti disponibili</span>
                          ) : (
                            <span>Esaurito</span>
                          )}
                        </div>
                      </div>
                      {isAvailable && (
                        <div className="text-primary font-bold text-sm">
                          Prenota →
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Booking;
