import { useState, useEffect } from 'react';
import { db, storage } from '../../config/firebase';
import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FaSave, FaTimes, FaPlus, FaTrash, FaClock, FaUsers } from 'react-icons/fa';
import { predefinedExperiences, defaultCityExperiences } from '../../data/predefinedExperiences';
import { generateCityImage } from '../../services/imageGenerator';
import TimeSlotGenerator from './TimeSlotGenerator';

// Generate URL-friendly slug from city name
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-'); // Replace multiple hyphens with single hyphen
};

const CityModal = ({ isOpen, onClose, cityId, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [existingCities, setExistingCities] = useState([]);
  const [selectedExperiences, setSelectedExperiences] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    region: '',
    status: 'available',
    image: '',
    eventData: {
      title: '',
      description: '',
      dates: '',
      duration: '30 minuti',
      experienceDuration: '20-30 minuti',
      location: {
        name: '',
        address: ''
      },
      organizer: {
        name: 'Cultura Immersiva',
        description: ''
      },
      pricing: {
        individual: 10,
        group: 20,
        groupSize: 2,
        currency: '€'
      },
      experiences: [],
      timeSlots: [],
      booking: {
        advancePayment: false,
        limitedSpots: true,
        whatsapp: true,
        whatsappNumber: '+39 123 456 7890'
      }
    }
  });

  useEffect(() => {
    if (isOpen) {
      loadExistingCities();
      if (cityId) {
        loadCity();
      } else {
        autoFillNewCity();
      }
    }
  }, [isOpen, cityId]);

  const loadExistingCities = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'cities'));
      const cities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExistingCities(cities);
    } catch (error) {
      console.error('Error loading cities:', error);
    }
  };

  const loadCity = async () => {
    try {
      const cityDoc = await getDoc(doc(db, 'cities', cityId));
      if (cityDoc.exists()) {
        const data = { id: cityId, ...cityDoc.data() };
        setFormData(data);

        // Load selected experiences
        if (data.eventData?.experiences) {
          setSelectedExperiences(data.eventData.experiences.map((exp, idx) => ({
            ...exp,
            tempId: idx
          })));
        }
      }
    } catch (error) {
      console.error('Error loading city:', error);
    }
  };

  const autoFillNewCity = async () => {
    // Auto-fill based on existing cities
    const mostRecentCity = existingCities[0]; // Assuming sorted by date

    if (mostRecentCity) {
      setFormData(prev => ({
        ...prev,
        eventData: {
          ...mostRecentCity.eventData,
          title: '',
          description: 'Un\'esperienza culturale immersiva in realtà virtuale. Vivi la storia, l\'arte e la scienza come mai prima d\'ora.',
          dates: '',
          location: {
            name: '',
            address: ''
          },
          experiences: [],
          timeSlots: [
            { time: '09:00', capacity: 20, day: 'Sabato' },
            { time: '11:00', capacity: 20, day: 'Sabato' },
            { time: '15:00', capacity: 20, day: 'Sabato' },
            { time: '17:00', capacity: 20, day: 'Sabato' },
            { time: '09:00', capacity: 20, day: 'Domenica' },
            { time: '11:00', capacity: 20, day: 'Domenica' },
            { time: '15:00', capacity: 20, day: 'Domenica' },
            { time: '17:00', capacity: 20, day: 'Domenica' }
          ]
        }
      }));
    }

    // Load default experiences
    const defaultExps = predefinedExperiences
      .filter(exp => defaultCityExperiences.includes(exp.id))
      .map((exp, idx) => ({ ...exp, tempId: idx }));

    setSelectedExperiences(defaultExps);
  };

  const handleGenerateImage = async () => {
    if (!formData.name || !formData.region) {
      alert('Inserisci prima il nome della città e la regione');
      return;
    }

    setGenerating(true);
    try {
      const imageUrl = await generateCityImage(formData.name, formData.region);

      // Upload to Firebase Storage if it's an external URL
      if (imageUrl.startsWith('http')) {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const storageRef = ref(storage, `cities/${Date.now()}_${formData.name}.webp`);
        await uploadBytes(storageRef, blob);
        const url = await getDownloadURL(storageRef);
        setFormData(prev => ({ ...prev, image: url }));
      } else {
        setFormData(prev => ({ ...prev, image: imageUrl }));
      }
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Errore nella generazione dell\'immagine');
    } finally {
      setGenerating(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Per favore seleziona un file immagine valido');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('L\'immagine è troppo grande. Dimensione massima: 5MB');
      return;
    }

    setLoading(true);
    try {
      const cityName = formData.name || 'city';
      const storageRef = ref(storage, `cities/${Date.now()}_${cityName}.webp`);

      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      setFormData(prev => ({ ...prev, image: url }));
      alert('Immagine caricata con successo!');
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Errore nel caricamento dell\'immagine');
    } finally {
      setLoading(false);
    }
  };

  const toggleExperience = (experience) => {
    const isSelected = selectedExperiences.some(exp => exp.id === experience.id);

    if (isSelected) {
      setSelectedExperiences(prev => prev.filter(exp => exp.id !== experience.id));
    } else {
      setSelectedExperiences(prev => [...prev, { ...experience, tempId: Date.now() }]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Prepare experiences from selected predefined ones
      const experiences = selectedExperiences.map(exp => ({
        id: exp.id,
        name: exp.name,
        duration: exp.duration,
        description: exp.description,
        image: exp.image
      }));

      const cityData = {
        ...formData,
        eventData: {
          ...formData.eventData,
          title: formData.eventData.title || `Cultura Immersiva - ${formData.name}`,
          experiences
        },
        updatedAt: serverTimestamp()
      };

      if (cityId) {
        // Update existing city
        await setDoc(doc(db, 'cities', cityId), cityData, { merge: true });
      } else {
        // Create new city with slug as ID
        const slug = generateSlug(formData.name);

        // Check if city with this slug already exists
        const existingCity = await getDoc(doc(db, 'cities', slug));
        if (existingCity.exists()) {
          alert(`Esiste già una città con il nome "${formData.name}". Per favore usa un nome diverso.`);
          setLoading(false);
          return;
        }

        cityData.createdAt = serverTimestamp();
        cityData.slug = slug; // Store slug in the document as well
        await setDoc(doc(db, 'cities', slug), cityData);

        alert(`Città creata con successo! URL: /citta/${slug}`);
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving city:', error);
      alert('Errore nel salvataggio della città');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
            <h2 className="text-2xl font-bold text-primary">
              {cityId ? 'Modifica Città' : 'Nuova Città'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaTimes className="text-2xl" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-8">
            {/* Basic Info */}
            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Informazioni Base</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              </div>

              {/* Image Upload */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Immagine Città
                </label>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleGenerateImage}
                    disabled={generating || !formData.name}
                    className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {generating ? 'Generazione...' : 'Genera con AI'}
                  </button>

                  <label className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={loading}
                      className="hidden"
                    />
                    {loading ? 'Caricamento...' : 'Carica Immagine'}
                  </label>

                  {formData.image && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Rimuovi
                    </button>
                  )}
                </div>

                {formData.image && (
                  <div className="mt-3">
                    <img
                      src={formData.image}
                      alt="Preview"
                      className="w-full max-w-md h-48 object-cover rounded-lg border-2 border-gray-300"
                    />
                    <p className="text-xs text-gray-500 mt-1">Anteprima immagine città</p>
                  </div>
                )}

                {!formData.image && (
                  <p className="text-sm text-gray-500 mt-2">
                    Puoi generare un'immagine con AI o caricare un'immagine personalizzata (max 5MB)
                  </p>
                )}
              </div>
            </section>

            {/* Event Data */}
            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Dati Evento</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prezzo Individuale (€)
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
                          pricing: { ...prev.eventData.pricing, group: Number(e.target.value) }
                        }
                      }))}
                      placeholder="20"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome Location
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome Organizzatore
                    </label>
                    <input
                      type="text"
                      value={formData.eventData.organizer?.name || 'Cultura Immersiva'}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        eventData: {
                          ...prev.eventData,
                          organizer: { ...prev.eventData.organizer, name: e.target.value }
                        }
                      }))}
                      placeholder="es: Cultura Immersiva"
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
            </section>

            {/* Experiences Selection */}
            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Esperienze VR</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {predefinedExperiences.map(exp => {
                  const isSelected = selectedExperiences.some(e => e.id === exp.id);
                  return (
                    <button
                      key={exp.id}
                      type="button"
                      onClick={() => toggleExperience(exp)}
                      className={`p-3 border-2 rounded-lg text-left transition-all ${
                        isSelected
                          ? 'border-primary bg-primary bg-opacity-10'
                          : 'border-gray-200 hover:border-primary'
                      }`}
                    >
                      <div className="font-semibold text-sm">{exp.name}</div>
                      <div className="text-xs text-gray-600 mt-1">{exp.duration} min</div>
                      <div className="text-xs text-gray-500 mt-1">{exp.category}</div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 text-sm text-gray-600">
                Selezionate: {selectedExperiences.length} esperienze
              </div>
            </section>

            {/* Time Slots */}
            <section>
              <TimeSlotGenerator
                slots={formData.eventData.timeSlots || []}
                onChange={(newSlots) =>
                  setFormData((prev) => ({
                    ...prev,
                    eventData: { ...prev.eventData, timeSlots: newSlots }
                  }))
                }
              />
            </section>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
            >
              <FaSave />
              {loading ? 'Salvataggio...' : 'Salva Città'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CityModal;
