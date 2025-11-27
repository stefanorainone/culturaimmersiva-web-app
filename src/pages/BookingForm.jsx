import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { db } from '../config/firebase';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  runTransaction,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { FaClock, FaUsers, FaCalendar, FaArrowLeft } from 'react-icons/fa';
import CryptoJS from 'crypto-js';
import { sendBookingConfirmation } from '../services/emailService';
import { logger } from '../utils/logger';

const BookingForm = () => {
  const { cityId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const selectedSlot = location.state?.slot;
  const selectedSlotRef = useRef(null);

  const [city, setCity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [availableSpots, setAvailableSpots] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    whatsapp: '',
    spots: 1
  });

  // Load city data and check availability
  useEffect(() => {
    const loadData = async () => {
      if (!selectedSlot) {
        navigate(`/booking/${cityId}`);
        return;
      }

      try {
        // Load city
        const cityDoc = await getDoc(doc(db, 'cities', cityId));
        if (cityDoc.exists()) {
          setCity({ id: cityDoc.id, ...cityDoc.data() });
        }

        // Check current availability
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('cityId', '==', cityId),
          where('date', '==', selectedSlot.date),
          where('time', '==', selectedSlot.time)
        );

        const bookingsSnapshot = await getDocs(bookingsQuery);
        let totalBooked = 0;
        bookingsSnapshot.docs.forEach(doc => {
          const booking = doc.data();
          // Skip cancelled bookings
          if (booking.status !== 'cancelled') {
            totalBooked += booking.spots;
          }
        });

        const available = selectedSlot.capacity - totalBooked;
        setAvailableSpots(available);

        if (available <= 0) {
          alert('⚠️ Non ci sono più posti disponibili per questo orario. Scegli un altro slot.');
          navigate(`/booking/${cityId}`);
          return;
        }

        setLoading(false);
      } catch (error) {
        logger.error('Error loading data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, [cityId, selectedSlot, navigate]);

  // Auto-scroll to selected slot section when data is loaded
  useEffect(() => {
    if (!loading && selectedSlotRef.current) {
      setTimeout(() => {
        selectedSlotRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 100);
    }
  }, [loading]);

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

  // Validate email format
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate WhatsApp number (Italian format)
  const isValidWhatsApp = (whatsapp) => {
    // Remove spaces and special chars
    const cleaned = whatsapp.replace(/[\s\-\(\)]/g, '');
    // Check if it's a valid phone number (8-15 digits, optionally starts with +)
    const phoneRegex = /^\+?\d{8,15}$/;
    return phoneRegex.test(cleaned);
  };

  // Validate form data
  const validateForm = () => {
    if (!formData.name || formData.name.trim().length < 2) {
      alert('❌ Inserisci un nome valido (almeno 2 caratteri)');
      return false;
    }
    if (formData.name.length > 100) {
      alert('❌ Il nome è troppo lungo (massimo 100 caratteri)');
      return false;
    }
    if (!isValidEmail(formData.email)) {
      alert('❌ Inserisci un indirizzo email valido');
      return false;
    }
    if (!formData.whatsapp || !isValidWhatsApp(formData.whatsapp)) {
      alert('❌ Inserisci un numero WhatsApp valido (es: +39 123 456 7890)');
      return false;
    }
    if (!formData.spots || formData.spots < 1 || formData.spots > 50) {
      alert('❌ Numero posti non valido (1-50)');
      return false;
    }
    return true;
  };

  // Generate secure token for magic link with strong randomness
  const generateToken = (bookingId, email) => {
    // Add cryptographically secure randomness
    const random = CryptoJS.lib.WordArray.random(16).toString();
    const data = `${bookingId}-${email}-${Date.now()}-${random}`;
    return CryptoJS.SHA256(data).toString();
  };

  // Handle booking submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      let bookingId = null;
      let bookingData = null;

      // Use transaction with atomic counter to prevent double-booking (race condition fix)
      await runTransaction(db, async (transaction) => {
        // Get city document to check atomic counter
        const cityRef = doc(db, 'cities', cityId);
        const cityDoc = await transaction.get(cityRef);

        if (!cityDoc.exists()) {
          throw new Error('Città non trovata');
        }

        // Use atomic counter for this time slot
        const slotKey = `${selectedSlot.date}-${selectedSlot.time}`;
        const cityData = cityDoc.data();
        const bookedSlots = cityData.bookedSlots || {};
        const currentBooked = bookedSlots[slotKey] || 0;
        const available = selectedSlot.capacity - currentBooked;

        // Check availability atomically
        if (available < formData.spots) {
          throw new Error(`Solo ${available} posti disponibili. Un'altra persona ha prenotato nel frattempo.`);
        }

        // Generate token for magic link
        const bookingRef = doc(collection(db, 'bookings'));
        bookingId = bookingRef.id;
        const token = generateToken(bookingId, formData.email);

        // Token expires in 3 days (increased security)
        const tokenExpiry = new Date();
        tokenExpiry.setDate(tokenExpiry.getDate() + 3);

        bookingData = {
          cityId,
          cityName: city.name,
          locationName: city.eventData?.location?.name || '',
          locationAddress: city.eventData?.location?.address || '',
          day: selectedSlot.day,
          date: selectedSlot.date,
          time: selectedSlot.time,
          name: formData.name,
          email: formData.email,
          whatsapp: formData.whatsapp,
          spots: Number(formData.spots),
          token: token,
          tokenExpiry: tokenExpiry.toISOString(),
          createdAt: serverTimestamp(),
          status: 'confirmed',
          reminders: {
            confirmation: {
              sent: false,
              sentAt: null
            },
            threeDaysBefore: {
              sent: false,
              sentAt: null
            },
            oneDayBefore: {
              sent: false,
              sentAt: null
            },
            oneHourBefore: {
              sent: false,
              sentAt: null
            }
          }
        };

        // Atomic update: increment booked counter
        transaction.update(cityRef, {
          [`bookedSlots.${slotKey}`]: currentBooked + formData.spots
        });

        // Create booking
        transaction.set(bookingRef, bookingData);
      });

      // Send confirmation email
      try {
        await sendBookingConfirmation(bookingData, bookingData.token);

        // Mark confirmation reminder as sent
        await updateDoc(doc(db, 'bookings', bookingId), {
          'reminders.confirmation.sent': true,
          'reminders.confirmation.sentAt': new Date().toISOString()
        });
      } catch (emailError) {
        logger.error('Error sending email:', emailError);
        // Don't fail the booking if email fails
      }

      // Success - navigate to ticket page
      navigate('/ticket', {
        state: { booking: bookingData },
        replace: true
      });

    } catch (error) {
      logger.error('Error creating booking:', error);
      alert(error.message || 'Errore durante la prenotazione. Riprova.');
      setSubmitting(false);
    }
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

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Back Button */}
        <button
          onClick={() => navigate(`/booking/${cityId}`)}
          className="flex items-center gap-2 text-primary hover:text-primary-dark mb-6"
        >
          <FaArrowLeft />
          Torna agli orari
        </button>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Completa la prenotazione
          </h1>
          <p className="text-xl text-gray-700">{city?.name} - {city?.region}</p>
        </div>

        {/* Selected Slot Info */}
        <div ref={selectedSlotRef} className="bg-primary bg-opacity-10 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Orario selezionato:</h2>
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-gray-700">
              <FaCalendar className="text-primary" />
              <span className="font-medium">
                {selectedSlot?.day} {selectedSlot?.date && formatDate(selectedSlot.date)}
              </span>
            </p>
            <p className="flex items-center gap-2 text-gray-700">
              <FaClock className="text-primary" />
              <span className="font-medium text-xl">{selectedSlot?.time}</span>
            </p>
            <p className="flex items-center gap-2 text-green-600 font-medium">
              <FaUsers />
              {availableSpots} posti disponibili
            </p>
          </div>
        </div>

        {/* Booking Form */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Dati per la prenotazione
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome e Cognome *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Mario Rossi"
                minLength="2"
                maxLength="100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="mario.rossi@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numero WhatsApp *
              </label>
              <p className="text-xs text-gray-500 mb-2">
                (per poterti ricordare dell'evento anche tramite whatsapp)
              </p>
              <input
                type="tel"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                placeholder="+39 123 456 7890"
                pattern="[\+\d\s\-\(\)]{8,20}"
                title="Inserisci un numero di telefono valido"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numero Posti *
              </label>
              <input
                type="number"
                value={formData.spots}
                onChange={(e) => setFormData({ ...formData, spots: e.target.value })}
                min="1"
                max={availableSpots}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-2">
                Massimo {availableSpots} posti disponibili
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-primary text-white font-bold text-lg rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Prenotazione in corso...' : 'Conferma Prenotazione'}
            </button>

            <p className="text-xs text-gray-500 text-center">
              Riceverai una conferma via email
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BookingForm;
