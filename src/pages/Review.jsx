import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { FaStar, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

// Trustpilot URL per Cultura Immersiva
const TRUSTPILOT_URL = 'https://it.trustpilot.com/review/www.culturaimmersiva.it';

const Review = () => {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('booking');
  const initialRating = parseInt(searchParams.get('rating')) || 0;

  const [status, setStatus] = useState('loading'); // loading, form, submitting, success, error, already-submitted
  const [bookingInfo, setBookingInfo] = useState(null);
  const [rating, setRating] = useState(initialRating);
  const [reviewText, setReviewText] = useState('');
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  // Se rating è 5, redirect a Google Reviews
  useEffect(() => {
    if (initialRating === 5 && bookingId) {
      // Prima verifica che la prenotazione esista
      checkAndRedirect();
    }
  }, [initialRating, bookingId]);

  const checkAndRedirect = async () => {
    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      const bookingDoc = await getDoc(bookingRef);

      if (bookingDoc.exists()) {
        // Salva che ha cliccato 5 stelle prima del redirect
        const reviewRef = doc(db, 'reviews', bookingId);
        const existingReview = await getDoc(reviewRef);

        if (!existingReview.exists()) {
          const data = bookingDoc.data();
          await setDoc(reviewRef, {
            bookingId,
            rating: 5,
            redirectedToTrustpilot: true,
            name: data.name,
            email: data.email,
            phone: data.whatsapp || data.phone,
            cityId: data.cityId,
            cityName: data.cityName,
            date: data.date,
            time: data.time,
            spots: data.spots,
            submittedAt: serverTimestamp()
          });
        }

        // Redirect a Google Reviews
        window.location.href = TRUSTPILOT_URL;
      }
    } catch (error) {
      console.error('Error redirecting:', error);
      setStatus('form');
    }
  };

  const loadBooking = async () => {
    if (!bookingId) {
      setStatus('error');
      return;
    }

    try {
      // Check if review already exists
      const reviewRef = doc(db, 'reviews', bookingId);
      const existingReview = await getDoc(reviewRef);

      if (existingReview.exists() && !existingReview.data().redirectedToTrustpilot) {
        setBookingInfo(existingReview.data());
        setStatus('already-submitted');
        return;
      }

      // Get booking info
      const bookingRef = doc(db, 'bookings', bookingId);
      const bookingDoc = await getDoc(bookingRef);

      if (!bookingDoc.exists()) {
        setStatus('error');
        return;
      }

      const data = bookingDoc.data();
      setBookingInfo({
        name: data.name,
        email: data.email,
        phone: data.whatsapp || data.phone,
        cityId: data.cityId,
        cityName: data.cityName,
        date: data.date,
        time: data.time,
        spots: data.spots
      });

      // Se rating era 5, è già stato gestito sopra
      if (initialRating !== 5) {
        setStatus('form');
      }
    } catch (error) {
      console.error('Error loading booking:', error);
      setStatus('error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (rating === 0) {
      alert('Seleziona una valutazione');
      return;
    }

    // Se ora seleziona 5 stelle, redirect a Google
    if (rating === 5) {
      window.location.href = TRUSTPILOT_URL;
      return;
    }

    setStatus('submitting');

    try {
      const reviewRef = doc(db, 'reviews', bookingId);
      await setDoc(reviewRef, {
        bookingId,
        rating,
        reviewText: reviewText.trim(),
        name: bookingInfo.name,
        email: bookingInfo.email,
        phone: bookingInfo.phone,
        cityId: bookingInfo.cityId,
        cityName: bookingInfo.cityName,
        date: bookingInfo.date,
        time: bookingInfo.time,
        spots: bookingInfo.spots,
        submittedAt: serverTimestamp()
      });

      setStatus('success');
    } catch (error) {
      console.error('Error saving review:', error);
      setStatus('error');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
          <FaExclamationCircle className="text-6xl text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Ops!</h2>
          <p className="text-gray-600 mb-6">
            Prenotazione non trovata o link non valido.
          </p>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors"
          >
            Torna alla Home
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'already-submitted') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
          <FaCheckCircle className="text-6xl text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Grazie!</h2>
          <p className="text-gray-600 mb-4">
            Hai già inviato una recensione per questa esperienza.
          </p>
          <div className="flex justify-center gap-1 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <FaStar
                key={star}
                className={star <= bookingInfo?.rating ? 'text-yellow-400' : 'text-gray-300'}
                size={24}
              />
            ))}
          </div>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors"
          >
            Torna alla Home
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
          <FaCheckCircle className="text-6xl text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Grazie per la tua recensione!</h2>
          <p className="text-gray-600 mb-6">
            Il tuo feedback ci aiuta a migliorare le nostre esperienze.
          </p>
          <Link
            to="/citta"
            className="inline-block px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors"
          >
            Scopri altre esperienze
          </Link>
        </div>
      </div>
    );
  }

  // Form status
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">
          Com'è andata?
        </h1>

        {bookingInfo && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-center">
            <p className="font-medium text-gray-800">{bookingInfo.cityName}</p>
            <p className="text-sm text-gray-600">{bookingInfo.date} - {bookingInfo.time}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Star Rating */}
          <div className="mb-6">
            <p className="text-gray-600 mb-3 text-center">Valuta la tua esperienza</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110 focus:outline-none"
                >
                  <FaStar
                    size={40}
                    className={
                      star <= (hoverRating || rating)
                        ? 'text-yellow-400'
                        : 'text-gray-300'
                    }
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className={`text-center text-sm mt-2 font-medium ${
                rating <= 2 ? 'text-red-500' : rating === 3 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {rating === 1 && 'Pessima esperienza'}
                {rating === 2 && 'Esperienza deludente'}
                {rating === 3 && 'Esperienza nella media'}
                {rating === 4 && 'Bella esperienza'}
                {rating === 5 && 'Esperienza meravigliosa!'}
              </p>
            )}
          </div>

          {/* Review Text - solo se rating < 5 */}
          {rating > 0 && rating < 5 && (
            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2">
                Cosa pensi sia migliorabile?
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Raccontaci la tua esperienza..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                rows={4}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={rating === 0 || status === 'submitting'}
            className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'submitting' ? 'Invio...' : rating === 5 ? 'Continua su Trustpilot' : 'Invia recensione'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-4">
          Ciao {bookingInfo?.name}, il tuo feedback è prezioso per noi.
        </p>
      </div>
    </div>
  );
};

export default Review;
