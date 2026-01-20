import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FaArrowLeft, FaStar, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCalendar, FaUsers, FaExternalLinkAlt } from 'react-icons/fa';

const Reviews = () => {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState('all');
  const [filterCity, setFilterCity] = useState('all');

  useEffect(() => {
    const reviewsRef = collection(db, 'reviews');
    const q = query(reviewsRef, orderBy('submittedAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reviewsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReviews(reviewsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Get unique cities for filter
  const cities = [...new Set(reviews.map(r => r.cityName).filter(Boolean))];

  // Filter reviews
  const filteredReviews = reviews.filter(review => {
    if (filterRating !== 'all' && review.rating !== parseInt(filterRating)) return false;
    if (filterCity !== 'all' && review.cityName !== filterCity) return false;
    return true;
  });

  // Stats
  const internalReviews = reviews.filter(r => !r.redirectedToTrustpilot);
  const trustpilotRedirects = reviews.filter(r => r.redirectedToTrustpilot);
  const avgRating = internalReviews.length > 0
    ? (internalReviews.reduce((sum, r) => sum + r.rating, 0) / internalReviews.length).toFixed(1)
    : '-';

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRatingColor = (rating) => {
    if (rating >= 4) return 'text-green-600 bg-green-50';
    if (rating >= 3) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <FaArrowLeft />
              </button>
              <h1 className="text-xl font-bold text-gray-800">Recensioni</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-500">Totale recensioni</p>
            <p className="text-2xl font-bold text-gray-800">{internalReviews.length}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-500">Media voto</p>
            <p className="text-2xl font-bold text-yellow-500">{avgRating} <FaStar className="inline text-lg" /></p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-500">Redirect Trustpilot</p>
            <p className="text-2xl font-bold text-blue-600">{trustpilotRedirects.length}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-500">Tasso 5 stelle</p>
            <p className="text-2xl font-bold text-green-600">
              {reviews.length > 0 ? Math.round((trustpilotRedirects.length / reviews.length) * 100) : 0}%
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg p-4 shadow-sm mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Voto</label>
              <select
                value={filterRating}
                onChange={(e) => setFilterRating(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="all">Tutti</option>
                <option value="1">1 stella</option>
                <option value="2">2 stelle</option>
                <option value="3">3 stelle</option>
                <option value="4">4 stelle</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Città</label>
              <select
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="all">Tutte</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Reviews List */}
        {filteredReviews.length === 0 ? (
          <div className="bg-white rounded-lg p-8 shadow-sm text-center">
            <FaStar className="text-4xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nessuna recensione trovata</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <div key={review.id} className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {/* Rating badge */}
                    {review.redirectedToTrustpilot ? (
                      <div className="flex items-center gap-1 px-3 py-1 bg-green-50 text-green-600 rounded-full text-sm font-medium">
                        <FaExternalLinkAlt size={12} />
                        <span>5 stelle - Trustpilot</span>
                      </div>
                    ) : (
                      <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getRatingColor(review.rating)}`}>
                        {[...Array(5)].map((_, i) => (
                          <FaStar
                            key={i}
                            size={12}
                            className={i < review.rating ? 'text-current' : 'text-gray-300'}
                          />
                        ))}
                      </div>
                    )}
                    <span className="text-sm text-gray-500">{formatDate(review.submittedAt)}</span>
                  </div>
                </div>

                {/* Review text */}
                {review.reviewText && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <p className="text-gray-700 italic">"{review.reviewText}"</p>
                  </div>
                )}

                {/* User & Booking Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <FaUsers className="text-gray-400" />
                    <span className="font-medium">{review.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <FaEnvelope className="text-gray-400" />
                    <a href={`mailto:${review.email}`} className="hover:text-primary">{review.email}</a>
                  </div>
                  {review.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <FaPhone className="text-gray-400" />
                      <a href={`tel:${review.phone}`} className="hover:text-primary">{review.phone}</a>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600">
                    <FaMapMarkerAlt className="text-gray-400" />
                    <span>{review.cityName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <FaCalendar className="text-gray-400" />
                    <span>{review.date} - {review.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Reviews;
