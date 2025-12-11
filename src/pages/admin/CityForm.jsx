import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, storage } from '../../config/firebase';
import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FaSave, FaArrowLeft, FaUpload } from 'react-icons/fa';

// Esperienze predefinite disponibili
const DEFAULT_EXPERIENCES = [
  { name: 'Notre Dame de Paris', duration: 15, description: 'Esplora la maestosa cattedrale gotica di Notre Dame' },
  { name: 'Basilica di San Pietro', duration: 15, description: 'Visita virtuale della Basilica di San Pietro in Vaticano' },
  { name: 'Machu Picchu', duration: 15, description: 'Scopri l\'antica città Inca sulle Ande peruviane' },
  { name: 'Grande Muraglia Cinese', duration: 15, description: 'Cammina lungo la Grande Muraglia' },
  { name: 'Taj Mahal', duration: 15, description: 'Ammira il mausoleo simbolo dell\'India' },
  { name: 'Stonehenge', duration: 15, description: 'Esplora il misterioso complesso megalitico' },
  { name: 'Petra', duration: 15, description: 'Visita la città rosa scavata nella roccia' },
  { name: 'Colosseo', duration: 15, description: 'Rivivila gloria dell\'anfiteatro romano' }
];

const CityForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    region: '',
    status: 'available',
    image: '',
    eventData: {
      title: '',
      description: '',
      dates: '',
      duration: '30 minuti', // Default duration
      experienceDuration: '20-30 minuti', // Default experience duration
      location: {
        name: '',
        address: ''
      },
      organizer: {
        name: '',
        description: ''
      },
      pricing: {
        individual: 10,
        group: 20,
        groupSize: 2,
        currency: '€'
      },
      experiences: [],
      booking: {
        advancePayment: false,
        limitedSpots: true,
        whatsapp: true,
        whatsappNumber: ''
      }
    }
  });

  // State per gestire le esperienze selezionate
  const [selectedExperiences, setSelectedExperiences] = useState(
    DEFAULT_EXPERIENCES.map((_, index) => index) // Di default tutte selezionate
  );

  useEffect(() => {
    if (id !== 'new') {
      loadCity();
    }
  }, [id]);

  const loadCity = async () => {
    try {
      const cityDoc = await getDoc(doc(db, 'cities', id));
      if (cityDoc.exists()) {
        const data = cityDoc.data();

        // Costruisci eventData con valori di default per campi mancanti
        const eventData = data.eventData || {};

        setFormData({
          id,
          name: data.name || '',
          region: data.region || '',
          status: data.status || 'available',
          image: data.image || '',
          eventData: {
            title: eventData.title || '',
            description: eventData.description || '',
            dates: eventData.dates || '',
            duration: eventData.duration || '30 minuti',
            experienceDuration: eventData.experienceDuration || '20-30 minuti',
            location: {
              name: eventData.location?.name || '',
              address: eventData.location?.address || ''
            },
            organizer: {
              name: eventData.organizer?.name || '',
              description: eventData.organizer?.description || ''
            },
            pricing: {
              individual: eventData.pricing?.individual || 10,
              group: eventData.pricing?.group || 20,
              groupSize: eventData.pricing?.groupSize || 2,
              currency: eventData.pricing?.currency || '€'
            },
            experiences: eventData.experiences || [],
            booking: {
              advancePayment: eventData.booking?.advancePayment || false,
              limitedSpots: eventData.booking?.limitedSpots || true,
              whatsapp: eventData.booking?.whatsapp || true,
              whatsappNumber: eventData.booking?.whatsappNumber || ''
            }
          }
        });

        // Carica le esperienze selezionate
        if (eventData.experiences && eventData.experiences.length > 0) {
          const selected = [];
          eventData.experiences.forEach(exp => {
            const index = DEFAULT_EXPERIENCES.findIndex(de => de.name === exp.name);
            if (index !== -1) {
              selected.push(index);
            }
          });
          setSelectedExperiences(selected);
        }
      }
    } catch (error) {
      console.error('Error loading city:', error);
      alert('Errore nel caricamento della città');
    }
  };

  // Toggle esperienza selezionata
  const toggleExperience = (index) => {
    setSelectedExperiences(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  // Seleziona/Deseleziona tutte le esperienze
  const toggleAllExperiences = () => {
    if (selectedExperiences.length === DEFAULT_EXPERIENCES.length) {
      setSelectedExperiences([]);
    } else {
      setSelectedExperiences(DEFAULT_EXPERIENCES.map((_, index) => index));
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `cities/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setFormData(prev => ({ ...prev, image: url }));
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Errore nel caricamento dell\'immagine');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Costruisci l'array delle esperienze selezionate
      const experiences = selectedExperiences.map(index => ({
        ...DEFAULT_EXPERIENCES[index]
      }));

      const cityData = {
        ...formData,
        eventData: {
          ...formData.eventData,
          experiences
        },
        updatedAt: serverTimestamp()
      };

      if (id === 'new') {
        cityData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'cities'), cityData);
      } else {
        await setDoc(doc(db, 'cities', id), cityData, { merge: true });
      }

      navigate('/admin/dashboard');
    } catch (error) {
      console.error('Error saving city:', error);
      alert('Errore nel salvataggio della città');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="flex items-center gap-2 text-sm sm:text-base text-primary hover:text-primary-dark"
          >
            <FaArrowLeft />
            Torna alla Dashboard
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6 lg:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-4 sm:mb-6">
            {id === 'new' ? 'Nuova Città' : 'Modifica Città'}
          </h1>

          <form onSubmit={handleSubmit}>
            {/* Basic Info */}
            <div className="space-y-6 mb-8">
              <h2 className="text-xl font-bold text-gray-800 border-b pb-2">
                Informazioni Base
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Città *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Regione *
                  </label>
                  <input
                    type="text"
                    value={formData.region}
                    onChange={(e) => setFormData(prev => ({ ...prev, region: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  >
                    <option value="available">Posti Disponibili</option>
                    <option value="ended">Evento Terminato</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Immagine Città
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                    />
                    {uploading && <span className="text-sm text-gray-500">Caricamento...</span>}
                  </div>
                  {formData.image && (
                    <img src={formData.image} alt="Preview" className="mt-2 w-32 h-32 object-cover rounded" />
                  )}
                </div>
              </div>
            </div>

            {/* Event Data - Updated with new fields: experienceDuration, pricing.group, organizer */}
            <div className="space-y-6 mb-8">
              <h2 className="text-xl font-bold text-gray-800 border-b pb-2">
                Dati Evento
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titolo Evento *
                </label>
                <input
                  type="text"
                  value={formData.eventData.title}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    eventData: { ...prev.eventData, title: e.target.value }
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrizione
                </label>
                <textarea
                  value={formData.eventData.description}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    eventData: { ...prev.eventData, description: e.target.value }
                  }))}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date
                  </label>
                  <input
                    type="text"
                    value={formData.eventData.dates}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      eventData: { ...prev.eventData, dates: e.target.value }
                    }))}
                    placeholder="es: Sabato 29 e Domenica 30 Novembre"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Durata *
                  </label>
                  <input
                    type="text"
                    value={formData.eventData.duration || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      eventData: { ...prev.eventData, duration: e.target.value }
                    }))}
                    placeholder="es: 30 minuti, 1 ora, 45 min"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Durata Esperienza
                  </label>
                  <input
                    type="text"
                    value={formData.eventData.experienceDuration || '20-30 minuti'}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      eventData: { ...prev.eventData, experienceDuration: e.target.value }
                    }))}
                    placeholder="es: 20-30 minuti"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Durata media di ogni singola esperienza VR
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Prezzi</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prezzo Individuale (€) *
                    </label>
                    <input
                      type="number"
                      value={formData.eventData.pricing.individual}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        eventData: {
                          ...prev.eventData,
                          pricing: { ...prev.eventData.pricing, individual: Number(e.target.value) }
                        }
                      }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prezzo a Coppia (€)
                    </label>
                    <input
                      type="number"
                      value={formData.eventData.pricing.group || 20}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        eventData: {
                          ...prev.eventData,
                          pricing: { ...prev.eventData.pricing, group: e.target.value ? Number(e.target.value) : 20 }
                        }
                      }))}
                      placeholder="20"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Prezzo per {formData.eventData.pricing.groupSize || 2} persone (default: 20€)
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Indirizzo
                  </label>
                  <input
                    type="text"
                    value={formData.eventData.location.name}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      eventData: {
                        ...prev.eventData,
                        location: { ...prev.eventData.location, name: e.target.value }
                      }
                    }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Indirizzo
                  </label>
                  <input
                    type="text"
                    value={formData.eventData.location.address}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      eventData: {
                        ...prev.eventData,
                        location: { ...prev.eventData.location, address: e.target.value }
                      }
                    }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Organizzatore</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome Organizzatore
                    </label>
                    <input
                      type="text"
                      value={formData.eventData.organizer?.name || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        eventData: {
                          ...prev.eventData,
                          organizer: { ...prev.eventData.organizer, name: e.target.value }
                        }
                      }))}
                      placeholder="es: Associazione Culturale"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descrizione Organizzatore
                    </label>
                    <input
                      type="text"
                      value={formData.eventData.organizer?.description || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        eventData: {
                          ...prev.eventData,
                          organizer: { ...prev.eventData.organizer, description: e.target.value }
                        }
                      }))}
                      placeholder="Breve descrizione"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Numero WhatsApp
                </label>
                <input
                  type="text"
                  value={formData.eventData.booking.whatsappNumber}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    eventData: {
                      ...prev.eventData,
                      booking: { ...prev.eventData.booking, whatsappNumber: e.target.value }
                    }
                  }))}
                  placeholder="+39 123 456 7890"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Experiences */}
            <div className="space-y-6 mb-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-2">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">Esperienze Disponibili</h2>
                <button
                  type="button"
                  onClick={toggleAllExperiences}
                  className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 w-full sm:w-auto"
                >
                  {selectedExperiences.length === DEFAULT_EXPERIENCES.length ? 'Deseleziona Tutte' : 'Seleziona Tutte'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DEFAULT_EXPERIENCES.map((exp, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedExperiences.includes(index)
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                    onClick={() => toggleExperience(index)}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedExperiences.includes(index)}
                        onChange={() => toggleExperience(index)}
                        className="mt-1 w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 mb-1">{exp.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">{exp.description}</p>
                        <span className="text-xs text-secondary font-medium">{exp.duration} minuti</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-sm text-gray-500 mt-2">
                {selectedExperiences.length} esperienz{selectedExperiences.length === 1 ? 'a selezionata' : 'e selezionate'}
              </p>
            </div>

            {/* Submit */}
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-4">
              <button
                type="button"
                onClick={() => navigate('/admin/dashboard')}
                className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 w-full sm:w-auto"
              >
                Annulla
              </button>

              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 w-full sm:w-auto"
              >
                <FaSave />
                {loading ? 'Salvataggio...' : 'Salva Città'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CityForm;
