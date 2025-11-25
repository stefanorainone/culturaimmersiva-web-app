import { db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Verifica se una città ha date disponibili future
 * @param {string} cityId - ID della città
 * @returns {Promise<boolean>} - true se ci sono date disponibili, false altrimenti
 */
export const checkCityAvailability = async (cityId) => {
  try {
    const cityRef = doc(db, 'cities', cityId);
    const cityDoc = await getDoc(cityRef);

    if (!cityDoc.exists()) {
      return false;
    }

    const cityData = cityDoc.data();

    // Controlla timeSlots in eventData
    const timeSlots = cityData.eventData?.timeSlots || [];

    // Data di oggi senza ore
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Verifica se ci sono slot con date future
    const hasFutureDates = timeSlots.some(slot => {
      if (!slot.date) return false;
      const slotDate = new Date(slot.date);
      slotDate.setHours(0, 0, 0, 0);
      return slotDate >= today;
    });

    return hasFutureDates;
  } catch (error) {
    console.error(`Error checking availability for ${cityId}:`, error);
    return false;
  }
};

/**
 * Ordina le città: prima disponibili poi non disponibili, entrambi in ordine alfabetico
 * @param {Array} cities - Array di città
 * @param {Object} availabilityMap - Mappa cityId -> isAvailable
 * @returns {Array} - Array ordinato
 */
export const sortCitiesByAvailability = (cities, availabilityMap = {}) => {
  return cities.sort((a, b) => {
    const aAvailable = availabilityMap[a.id] ?? (a.status === 'available');
    const bAvailable = availabilityMap[b.id] ?? (b.status === 'available');

    // Prima ordina per disponibilità (disponibili prima)
    if (aAvailable !== bAvailable) {
      return bAvailable ? 1 : -1;
    }

    // Poi ordina alfabeticamente
    return a.name.localeCompare(b.name, 'it');
  });
};

/**
 * Carica la disponibilità per tutte le città
 * @param {Array} cities - Array di città
 * @returns {Promise<Object>} - Mappa cityId -> isAvailable
 */
export const loadCitiesAvailability = async (cities) => {
  const availabilityMap = {};

  // Carica disponibilità per tutte le città in parallelo
  await Promise.all(
    cities.map(async (city) => {
      const isAvailable = await checkCityAvailability(city.id);
      availabilityMap[city.id] = isAvailable;
    })
  );

  return availabilityMap;
};
