import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../config/firebase';
import {
  getDoc,
  updateDoc,
  doc,
  runTransaction,
  increment,
  onSnapshot
} from 'firebase/firestore';
import { FaEdit, FaCheckCircle, FaClock, FaUsers, FaCalendar, FaExchangeAlt, FaArrowLeft } from 'react-icons/fa';

const BookingManage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    whatsapp: '',
    spots: 1
  });

  // State per modifica data/orario
  const [city, setCity] = useState(null);
  const [showSlotSelector, setShowSlotSelector] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [bookings, setBookings] = useState({});
  const [newSlot, setNewSlot] = useState(null);

  useEffect(() => {
    loadBooking();
  }, [token]);

  const loadBooking = async () => {
    try {
      // Security improvement: Use token as document ID for direct access
      // This prevents enumeration attacks and doesn't require list permission
      const bookingDoc = await getDoc(doc(db, 'bookings', token));

      if (!bookingDoc.exists()) {
        alert('❌ Prenotazione non trovata o link non valido');
        navigate('/');
        return;
      }

      const bookingData = { id: bookingDoc.id, ...bookingDoc.data() };

      // Check if event date has passed (link valid until end of event day)
      if (bookingData.date) {
        const eventDate = new Date(bookingData.date);
        eventDate.setHours(23, 59, 59, 999);
        const now = new Date();
        if (now > eventDate) {
          alert('⚠️ Questo link è scaduto. L\'evento è già passato.');
          navigate('/');
          return;
        }
      }

      setBooking(bookingData);
      setFormData({
        name: bookingData.name,
        email: bookingData.email,
        whatsapp: bookingData.whatsapp,
        spots: bookingData.spots
      });

      // Carica anche i dati della città per mostrare gli slot disponibili
      if (bookingData.cityId) {
        const cityDoc = await getDoc(doc(db, 'cities', bookingData.cityId));
        if (cityDoc.exists()) {
          setCity({ id: cityDoc.id, ...cityDoc.data() });
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading booking:', error);
      alert('Errore nel caricamento della prenotazione');
      navigate('/');
    }
  };

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

  // Real-time listener per i contatori degli slot della città
  useEffect(() => {
    if (!city?.id) return;

    const cityRef = doc(db, 'cities', city.id);
    const unsubscribe = onSnapshot(cityRef, (snapshot) => {
      if (snapshot.exists()) {
        const cityData = snapshot.data();
        setBookings(cityData.bookedSlots || {});
      }
    });

    return () => unsubscribe();
  }, [city?.id]);

  // Calcola posti disponibili per uno slot
  const getAvailableSpots = (slot) => {
    const key = `${slot.date}-${slot.time}`;
    const booked = bookings[key] || 0;
    // Se è lo slot corrente della prenotazione, aggiungi i posti che libereremmo
    if (booking && slot.date === booking.date && slot.time === booking.time) {
      return slot.capacity - booked + booking.spots;
    }
    return slot.capacity - booked;
  };

  // Verifica se una data è futura
  const isFutureDate = (dateString) => {
    if (!dateString) return false;
    const slotDate = new Date(dateString);
    const today = new Date();
    slotDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return slotDate >= today;
  };

  // Raggruppa slot per data (solo date future)
  const groupedSlots = city?.eventData?.timeSlots
    ?.filter(slot => isFutureDate(slot.date))
    .reduce((acc, slot) => {
      const dateKey = slot.date || slot.day;
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(slot);
      return acc;
    }, {}) || {};

  // Verifica se lo slot selezionato è diverso da quello attuale
  const isSlotChanged = () => {
    if (!newSlot) return false;
    return newSlot.date !== booking?.date || newSlot.time !== booking?.time;
  };

  // Seleziona un nuovo slot
  const handleSelectSlot = (slot) => {
    const available = getAvailableSpots(slot);
    if (available < formData.spots) {
      alert(`⚠️ Solo ${available} posti disponibili per questo orario`);
      return;
    }
    setNewSlot(slot);
    setShowSlotSelector(false);
    setSelectedDate(null);
  };

  // Validate email format
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate WhatsApp number
  const isValidWhatsApp = (whatsapp) => {
    const cleaned = whatsapp.replace(/[\s\-\(\)]/g, '');
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      // Se c'è un cambio di slot, usa una transazione atomica
      if (isSlotChanged() && city) {
        await runTransaction(db, async (transaction) => {
          // Leggi il documento della città per verificare disponibilità
          const cityRef = doc(db, 'cities', city.id);
          const cityDoc = await transaction.get(cityRef);

          if (!cityDoc.exists()) {
            throw new Error('Città non trovata');
          }

          const cityData = cityDoc.data();
          const bookedSlots = cityData.bookedSlots || {};

          // Verifica disponibilità del nuovo slot
          const newSlotKey = `${newSlot.date}-${newSlot.time}`;
          const currentBooked = bookedSlots[newSlotKey] || 0;
          const available = newSlot.capacity - currentBooked;

          if (available < formData.spots) {
            throw new Error(`Solo ${available} posti disponibili per il nuovo orario. Riprova.`);
          }

          // Decrementa il vecchio slot
          const oldSlotKey = `${booking.date}-${booking.time}`;
          transaction.update(cityRef, {
            [`bookedSlots.${oldSlotKey}`]: increment(-booking.spots)
          });

          // Incrementa il nuovo slot
          transaction.update(cityRef, {
            [`bookedSlots.${newSlotKey}`]: increment(formData.spots)
          });

          // Aggiorna la prenotazione e resetta i reminder per la nuova data
          const bookingRef = doc(db, 'bookings', booking.id);
          transaction.update(bookingRef, {
            name: formData.name.trim(),
            email: formData.email.trim(),
            whatsapp: formData.whatsapp.trim(),
            spots: Number(formData.spots),
            day: newSlot.day,
            date: newSlot.date,
            time: newSlot.time,
            token: booking.token,
            // Reset reminder flags per la nuova data/orario
            'reminders.threeDaysBefore.sent': false,
            'reminders.threeDaysBefore.sentAt': null,
            'reminders.oneDayBefore.sent': false,
            'reminders.oneDayBefore.sentAt': null,
            'reminders.oneHourBefore.sent': false,
            'reminders.oneHourBefore.sentAt': null
          });
        });
      } else {
        // Se non c'è cambio di slot ma cambiano i posti, aggiorna il contatore
        if (formData.spots !== booking.spots && city) {
          const spotsDiff = Number(formData.spots) - booking.spots;
          const slotKey = `${booking.date}-${booking.time}`;

          await runTransaction(db, async (transaction) => {
            const cityRef = doc(db, 'cities', city.id);
            const cityDoc = await transaction.get(cityRef);

            if (!cityDoc.exists()) {
              throw new Error('Città non trovata');
            }

            const cityData = cityDoc.data();
            const bookedSlots = cityData.bookedSlots || {};
            const currentSlot = city.eventData?.timeSlots?.find(
              s => s.date === booking.date && s.time === booking.time
            );

            if (currentSlot && spotsDiff > 0) {
              const currentBooked = bookedSlots[slotKey] || 0;
              const available = currentSlot.capacity - currentBooked;
              if (available < spotsDiff) {
                throw new Error(`Solo ${available} posti aggiuntivi disponibili per questo orario.`);
              }
            }

            // Aggiorna il contatore
            transaction.update(cityRef, {
              [`bookedSlots.${slotKey}`]: increment(spotsDiff)
            });

            // Aggiorna la prenotazione
            const bookingRef = doc(db, 'bookings', booking.id);
            transaction.update(bookingRef, {
              name: formData.name.trim(),
              email: formData.email.trim(),
              whatsapp: formData.whatsapp.trim(),
              spots: Number(formData.spots),
              token: booking.token
            });
          });
        } else {
          // Solo aggiornamento dati personali
          await updateDoc(doc(db, 'bookings', booking.id), {
            name: formData.name.trim(),
            email: formData.email.trim(),
            whatsapp: formData.whatsapp.trim(),
            spots: Number(formData.spots),
            token: booking.token
          });
        }
      }

      setSuccess(true);

      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (error) {
      console.error('Error updating booking:', error);
      alert(error.message || 'Errore durante l\'aggiornamento. Riprova.');
      setSaving(false);
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

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
          <FaCheckCircle className="text-6xl text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Prenotazione Aggiornata!</h2>
          <p className="text-gray-600 mb-4">
            Le tue modifiche sono state salvate con successo.
          </p>
          <p className="text-sm text-gray-500">
            Verrai reindirizzato tra pochi secondi...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2 flex items-center gap-2">
            <FaEdit />
            Modifica Prenotazione
          </h1>
          <p className="text-gray-600">Aggiorna i dati della tua prenotazione</p>
        </div>

        {/* Current Booking Info */}
        <div className="bg-primary bg-opacity-10 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            {isSlotChanged() ? 'Nuovo Orario Selezionato:' : 'Prenotazione Attuale:'}
          </h2>
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-gray-700">
              <strong>🏛️ Evento:</strong> {booking?.cityName}
            </p>
            <p className="flex items-center gap-2 text-gray-700">
              <FaCalendar className="text-primary" />
              <span>
                <strong>Data:</strong>{' '}
                {isSlotChanged() ? (
                  <>
                    <span className="line-through text-gray-400 mr-2">
                      {booking?.day} {booking?.date && formatDate(booking.date)}
                    </span>
                    <span className="text-green-600 font-semibold">
                      {newSlot?.day} {newSlot?.date && formatDate(newSlot.date)}
                    </span>
                  </>
                ) : (
                  <>{booking?.day} {booking?.date && formatDate(booking.date)}</>
                )}
              </span>
            </p>
            <p className="flex items-center gap-2 text-gray-700">
              <FaClock className="text-primary" />
              <span>
                <strong>Orario:</strong>{' '}
                {isSlotChanged() ? (
                  <>
                    <span className="line-through text-gray-400 mr-2">{booking?.time}</span>
                    <span className="text-green-600 font-semibold">{newSlot?.time}</span>
                  </>
                ) : (
                  booking?.time
                )}
              </span>
            </p>
          </div>

          {/* Pulsante per cambiare data/orario */}
          {city && Object.keys(groupedSlots).length > 0 && (
            <button
              type="button"
              onClick={() => {
                setShowSlotSelector(!showSlotSelector);
                setSelectedDate(null);
                if (!showSlotSelector) setNewSlot(null);
              }}
              className="mt-4 flex items-center gap-2 text-primary hover:text-primary-dark font-medium transition-colors"
            >
              <FaExchangeAlt />
              {showSlotSelector ? 'Annulla cambio orario' : 'Cambia data/orario'}
            </button>
          )}
        </div>

        {/* Selettore Data/Orario */}
        {showSlotSelector && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            {!selectedDate ? (
              <>
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FaCalendar className="text-primary" />
                  Seleziona una Nuova Data
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(groupedSlots).map(([dateKey, dateSlots]) => {
                    const firstSlot = dateSlots[0];
                    const totalAvailable = dateSlots.reduce((sum, slot) => sum + getAvailableSpots(slot), 0);
                    const hasAvailability = totalAvailable >= formData.spots;
                    const isCurrentDate = dateKey === booking?.date;

                    return (
                      <button
                        key={dateKey}
                        onClick={() => setSelectedDate(dateKey)}
                        disabled={!hasAvailability}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          hasAvailability
                            ? isCurrentDate
                              ? 'border-primary bg-primary bg-opacity-5'
                              : 'border-gray-200 hover:border-primary hover:shadow-lg'
                            : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-bold text-lg text-gray-800 mb-1">
                              {firstSlot.date ? formatDate(firstSlot.date) : firstSlot.day}
                            </div>
                            {isCurrentDate && (
                              <span className="text-xs text-primary font-medium">Data attuale</span>
                            )}
                            <div className={`text-sm flex items-center gap-2 mt-1 ${
                              hasAvailability ? 'text-green-600' : 'text-red-600'
                            }`}>
                              <FaUsers />
                              <span>{totalAvailable} posti disponibili</span>
                            </div>
                          </div>
                          {hasAvailability && (
                            <span className="text-primary font-bold">Scegli →</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-primary hover:text-primary-dark flex items-center gap-2 mb-4"
                >
                  <FaArrowLeft /> Torna alle date
                </button>
                <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <FaClock className="text-primary" />
                  Seleziona un Orario
                </h2>
                <p className="text-gray-600 mb-4">
                  {groupedSlots[selectedDate]?.[0]?.date
                    ? formatDate(groupedSlots[selectedDate][0].date)
                    : groupedSlots[selectedDate]?.[0]?.day}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {groupedSlots[selectedDate]?.map((slot, idx) => {
                    const available = getAvailableSpots(slot);
                    const isAvailable = available >= formData.spots;
                    const isCurrentSlot = slot.date === booking?.date && slot.time === booking?.time;

                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectSlot(slot)}
                        disabled={!isAvailable}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          isAvailable
                            ? isCurrentSlot
                              ? 'border-primary bg-primary bg-opacity-5'
                              : 'border-gray-200 hover:border-primary hover:shadow-md'
                            : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-bold text-lg text-gray-800 flex items-center gap-2">
                              <FaClock className="text-primary" />
                              {slot.time}
                            </div>
                            {isCurrentSlot && (
                              <span className="text-xs text-primary font-medium">Orario attuale</span>
                            )}
                            <div className={`text-sm mt-1 flex items-center gap-1 ${
                              isAvailable ? 'text-green-600' : 'text-red-600'
                            }`}>
                              <FaUsers />
                              {isAvailable ? (
                                <span className="font-medium">{available} posti disponibili</span>
                              ) : (
                                <span>Non abbastanza posti ({available} disponibili)</span>
                              )}
                            </div>
                          </div>
                          {isAvailable && (
                            <span className="text-primary font-bold text-sm">
                              {isCurrentSlot ? 'Mantieni' : 'Seleziona'}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Edit Form */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Modifica i tuoi dati
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
                max={(() => {
                  const targetSlot = newSlot || (city?.eventData?.timeSlots?.find(
                    s => s.date === booking?.date && s.time === booking?.time
                  ));
                  return targetSlot ? getAvailableSpots(targetSlot) : 50;
                })()}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
              {city && (
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                  <FaUsers />
                  {(() => {
                    const targetSlot = newSlot || city?.eventData?.timeSlots?.find(
                      s => s.date === booking?.date && s.time === booking?.time
                    );
                    return targetSlot ? `${getAvailableSpots(targetSlot)} posti disponibili per questo orario` : '';
                  })()}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-4 bg-primary text-white font-bold text-lg rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Salvataggio...' : 'Salva Modifiche'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BookingManage;
