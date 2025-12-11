import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../config/firebase';
import {
  getDoc,
  updateDoc,
  doc
} from 'firebase/firestore';
import { FaExclamationTriangle, FaCheckCircle, FaClock, FaCalendar } from 'react-icons/fa';
import { logger } from '../utils/logger';

const BookingCancel = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);

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
      setLoading(false);
    } catch (error) {
      logger.error('Error loading booking:', error);
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

  const handleCancel = async () => {
    // First confirmation
    if (!window.confirm('Sei sicuro di voler annullare questa prenotazione? Questa azione non può essere annullata.')) {
      return;
    }

    // Second confirmation (CSRF protection enhancement)
    const confirmText = window.prompt('Per confermare, digita "ANNULLA" (tutto maiuscolo):');
    if (confirmText !== 'ANNULLA') {
      alert('❌ Cancellazione non confermata. Nessuna modifica è stata effettuata.');
      return;
    }

    setCancelling(true);

    try {
      // Mark booking as cancelled instead of deleting (keeps history and releases spots)
      await updateDoc(doc(db, 'bookings', booking.id), {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        token: booking.token // Keep the same token for security rules
      });

      setCancelled(true);

      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (error) {
      logger.error('Error cancelling booking:', error);
      alert('Errore durante l\'annullamento. Riprova.');
      setCancelling(false);
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

  if (cancelled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
          <FaCheckCircle className="text-6xl text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Prenotazione Annullata</h2>
          <p className="text-gray-600 mb-4">
            La tua prenotazione è stata annullata con successo.
          </p>
          <p className="text-sm text-gray-500">
            I posti sono ora di nuovo disponibili per altri utenti.
          </p>
          <p className="text-sm text-gray-500 mt-2">
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
          <h1 className="text-3xl font-bold text-red-600 mb-2 flex items-center gap-2">
            <FaExclamationTriangle />
            Annulla Prenotazione
          </h1>
          <p className="text-gray-600">Sei sicuro di voler annullare la tua prenotazione?</p>
        </div>

        {/* Booking Info */}
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Dettagli Prenotazione da Annullare:</h2>
          <div className="space-y-3">
            <div className="bg-white rounded p-3">
              <p className="text-sm text-gray-600">Nome</p>
              <p className="font-medium text-gray-900">{booking?.name}</p>
            </div>

            <div className="bg-white rounded p-3">
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium text-gray-900">{booking?.email}</p>
            </div>

            <div className="bg-white rounded p-3">
              <p className="text-sm text-gray-600">Evento</p>
              <p className="font-medium text-gray-900">{booking?.cityName}</p>
            </div>

            <div className="bg-white rounded p-3 flex items-center gap-2">
              <FaCalendar className="text-primary" />
              <div>
                <p className="text-sm text-gray-600">Data</p>
                <p className="font-medium text-gray-900">
                  {booking?.day} {booking?.date && formatDate(booking.date)}
                </p>
              </div>
            </div>

            <div className="bg-white rounded p-3 flex items-center gap-2">
              <FaClock className="text-primary" />
              <div>
                <p className="text-sm text-gray-600">Orario</p>
                <p className="font-medium text-gray-900">{booking?.time}</p>
              </div>
            </div>

            <div className="bg-white rounded p-3">
              <p className="text-sm text-gray-600">Posti Prenotati</p>
              <p className="font-medium text-gray-900">{booking?.spots} {booking?.spots === 1 ? 'posto' : 'posti'}</p>
            </div>
          </div>
        </div>

        {/* Warning and Actions */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <FaExclamationTriangle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Attenzione
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    Una volta annullata, la prenotazione non potrà essere recuperata.
                    I posti torneranno disponibili per altri utenti.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex-1 py-3 bg-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-400 transition-colors"
            >
              Torna Indietro
            </button>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex-1 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelling ? 'Annullamento...' : 'Conferma Annullamento'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingCancel;
