import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../config/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { FaArrowLeft, FaEnvelope, FaPhone, FaMapMarkerAlt, FaTrash, FaCheck, FaClock, FaTimes } from 'react-icons/fa';

const AdminCandidature = () => {
  const [candidature, setCandidature] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidatura, setSelectedCandidatura] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadCandidature();
  }, []);

  const loadCandidature = async () => {
    try {
      const q = query(collection(db, 'candidature'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCandidature(data);
    } catch (error) {
      console.error('Error loading candidature:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await updateDoc(doc(db, 'candidature', id), { status });
      setCandidature(prev => prev.map(c => c.id === id ? { ...c, status } : c));
      if (selectedCandidatura?.id === id) {
        setSelectedCandidatura(prev => ({ ...prev, status }));
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const deleteCandidatura = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa candidatura?')) return;
    try {
      await deleteDoc(doc(db, 'candidature', id));
      setCandidature(prev => prev.filter(c => c.id !== id));
      if (selectedCandidatura?.id === id) {
        setSelectedCandidatura(null);
      }
    } catch (error) {
      console.error('Error deleting candidatura:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'new':
        return { text: 'Nuova', className: 'bg-blue-100 text-blue-700' };
      case 'contacted':
        return { text: 'Contattato', className: 'bg-yellow-100 text-yellow-700' };
      case 'accepted':
        return { text: 'Accettato', className: 'bg-green-100 text-green-700' };
      case 'rejected':
        return { text: 'Rifiutato', className: 'bg-red-100 text-red-700' };
      default:
        return { text: 'Nuova', className: 'bg-blue-100 text-blue-700' };
    }
  };

  const filteredCandidature = candidature.filter(c => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

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
      <div className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin/dashboard" className="text-gray-600 hover:text-gray-800">
              <FaArrowLeft />
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">Candidature</h1>
            <span className="text-sm text-gray-500">({candidature.length} totali)</span>
          </div>
          <div className="flex gap-2">
            {['all', 'new', 'contacted', 'accepted', 'rejected'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-sm rounded-full ${filter === f ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'}`}
              >
                {f === 'all' ? 'Tutte' : getStatusBadge(f).text}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {filteredCandidature.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">Nessuna candidatura {filter !== 'all' ? 'con questo stato' : 'ricevuta'}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {/* List */}
            <div className="md:col-span-1 space-y-3">
              {filteredCandidature.map(c => {
                const badge = getStatusBadge(c.status);
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCandidatura(c)}
                    className={`bg-white p-4 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow ${selectedCandidatura?.id === c.id ? 'ring-2 ring-primary' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-gray-800">{c.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${badge.className}`}>
                        {badge.text}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{c.role}</p>
                    <p className="text-xs text-gray-400">{formatDate(c.createdAt)}</p>
                  </div>
                );
              })}
            </div>

            {/* Detail */}
            <div className="md:col-span-2">
              {selectedCandidatura ? (
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">{selectedCandidatura.name}</h2>
                      <p className="text-gray-600">{selectedCandidatura.role}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => deleteCandidatura(selectedCandidatura.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Elimina"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 mb-6">
                    <a href={`mailto:${selectedCandidatura.email}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                      <FaEnvelope className="text-primary" />
                      <span className="text-sm">{selectedCandidatura.email}</span>
                    </a>
                    <a href={`tel:${selectedCandidatura.phone}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                      <FaPhone className="text-primary" />
                      <span className="text-sm">{selectedCandidatura.phone}</span>
                    </a>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <FaMapMarkerAlt className="text-primary" />
                      <span className="text-sm">{selectedCandidatura.city}</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <FaClock className="text-primary" />
                      <span className="text-sm">{formatDate(selectedCandidatura.createdAt)}</span>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="font-bold text-gray-700 mb-2">Presentazione</h3>
                    <p className="text-gray-600 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                      {selectedCandidatura.message || '-'}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-700 mb-3">Aggiorna stato</h3>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => updateStatus(selectedCandidatura.id, 'new')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${selectedCandidatura.status === 'new' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                      >
                        Nuova
                      </button>
                      <button
                        onClick={() => updateStatus(selectedCandidatura.id, 'contacted')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${selectedCandidatura.status === 'contacted' ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'}`}
                      >
                        Contattato
                      </button>
                      <button
                        onClick={() => updateStatus(selectedCandidatura.id, 'accepted')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${selectedCandidatura.status === 'accepted' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                      >
                        <FaCheck className="inline mr-1" /> Accettato
                      </button>
                      <button
                        onClick={() => updateStatus(selectedCandidatura.id, 'rejected')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${selectedCandidatura.status === 'rejected' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                      >
                        <FaTimes className="inline mr-1" /> Rifiutato
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
                  Seleziona una candidatura per vedere i dettagli
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCandidature;
