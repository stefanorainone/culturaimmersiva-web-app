import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../config/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc
} from 'firebase/firestore';
import { FaEdit, FaCheckCircle, FaClock, FaUsers, FaCalendar } from 'react-icons/fa';

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

  useEffect(() => {
    loadBooking();
  }, [token]);

  const loadBooking = async () => {
    try {
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('token', '==', token)
      );

      const snapshot = await getDocs(bookingsQuery);

      if (snapshot.empty) {
        alert('❌ Prenotazione non trovata o link non valido');
        navigate('/');
        return;
      }

      const bookingDoc = snapshot.docs[0];
      const bookingData = { id: bookingDoc.id, ...bookingDoc.data() };

      // Check if token is expired
      if (bookingData.tokenExpiry) {
        const expiryDate = new Date(bookingData.tokenExpiry);
        const now = new Date();
        if (now > expiryDate) {
          alert('⚠️ Questo link è scaduto. Contattaci per modificare la tua prenotazione.');
          navigate('/contatti');
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
      // Include the token in the update to satisfy security rules
      await updateDoc(doc(db, 'bookings', booking.id), {
        name: formData.name.trim(),
        email: formData.email.trim(),
        whatsapp: formData.whatsapp.trim(),
        spots: Number(formData.spots),
        token: booking.token // Keep the same token
      });

      setSuccess(true);

      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (error) {
      console.error('Error updating booking:', error);
      alert('Errore durante l\'aggiornamento. Riprova.');
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
          <h2 className="text-lg font-bold text-gray-800 mb-4">Prenotazione Attuale:</h2>
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-gray-700">
              <strong>🏛️ Evento:</strong> {booking?.cityName}
            </p>
            <p className="flex items-center gap-2 text-gray-700">
              <FaCalendar className="text-primary" />
              <span><strong>Data:</strong> {booking?.day} {booking?.date && formatDate(booking.date)}</span>
            </p>
            <p className="flex items-center gap-2 text-gray-700">
              <FaClock className="text-primary" />
              <span><strong>Orario:</strong> {booking?.time}</span>
            </p>
          </div>
        </div>

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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-2">
                Nota: Verifica la disponibilità prima di aumentare i posti
              </p>
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
