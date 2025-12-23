import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  updateDoc,
  where,
  increment,
  runTransaction,
  getDoc
} from 'firebase/firestore';
import { FaEdit, FaSignOutAlt, FaCalendarCheck, FaFilter, FaUsers, FaFileCsv, FaSearch, FaBell, FaExchangeAlt, FaClock, FaCalendar, FaArrowLeft, FaSms, FaBan, FaWhatsapp, FaChartBar } from 'react-icons/fa';
import Papa from 'papaparse';

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCities, setSelectedCities] = useState([]); // Array for multiple cities
  const [selectedDates, setSelectedDates] = useState([]); // Array for multiple dates
  const [statusFilter, setStatusFilter] = useState('active'); // 'all', 'active', 'cancelled'
  const [citySearchTerm, setCitySearchTerm] = useState('');
  const [dateSearchTerm, setDateSearchTerm] = useState('');
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [showDateSuggestions, setShowDateSuggestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingBooking, setEditingBooking] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    whatsapp: '',
    spots: 1
  });
  const [selectedBookings, setSelectedBookings] = useState([]);

  // Stato per modifica data/orario
  const [citySlots, setCitySlots] = useState([]);
  const [bookedSlots, setBookedSlots] = useState({});
  const [showSlotSelector, setShowSlotSelector] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [newSlot, setNewSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderType, setReminderType] = useState('threeDaysBefore');
  const [customMessage, setCustomMessage] = useState('');
  const [sendingReminders, setSendingReminders] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [processingCancel, setProcessingCancel] = useState(false);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    loadData();
  }, []);

  // Apply URL filters when data is loaded
  useEffect(() => {
    if (bookings.length === 0) return;

    const cityIdParam = searchParams.get('cityId');
    const dateFromParam = searchParams.get('dateFrom');

    if (cityIdParam && !selectedCities.includes(cityIdParam)) {
      setSelectedCities([cityIdParam]);
    }

    if (dateFromParam) {
      // Filter all dates >= dateFrom
      const futureDates = [...new Set(bookings.map(b => b.date))]
        .filter(date => date >= dateFromParam)
        .sort();

      if (futureDates.length > 0) {
        setSelectedDates(futureDates);
      }
    }
  }, [bookings, searchParams]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.city-search-container')) {
        setShowCitySuggestions(false);
      }
      if (!event.target.closest('.date-search-container')) {
        setShowDateSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    try {
      // Load bookings
      const bookingsQuery = query(
        collection(db, 'bookings'),
        orderBy('createdAt', 'desc')
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookingsData = bookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBookings(bookingsData);

      // Load cities for filter
      const citiesSnapshot = await getDocs(collection(db, 'cities'));
      const citiesData = citiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCities(citiesData);

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const handleDelete = async (bookingId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa prenotazione?')) {
      return;
    }

    try {
      // Find the booking to get slot information
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) {
        alert('Prenotazione non trovata');
        return;
      }

      // Find and update the timeslot to release the spots
      if (booking.cityId && booking.date && booking.time) {
        const slotsQuery = query(
          collection(db, 'timeslots'),
          where('cityId', '==', booking.cityId),
          where('date', '==', booking.date),
          where('time', '==', booking.time)
        );

        const slotsSnapshot = await getDocs(slotsQuery);

        if (!slotsSnapshot.empty) {
          const slotDoc = slotsSnapshot.docs[0];
          // Release the spots: increment available, decrement booked
          await updateDoc(doc(db, 'timeslots', slotDoc.id), {
            availableSpots: increment(booking.spots || 1),
            bookedSpots: increment(-(booking.spots || 1))
          });
          console.log(`✅ Released ${booking.spots || 1} spots for ${booking.cityName} - ${booking.date} ${booking.time}`);
        }
      }

      // Delete the booking
      await deleteDoc(doc(db, 'bookings', bookingId));
      setBookings(bookings.filter(booking => booking.id !== bookingId));
      alert('✅ Prenotazione eliminata e posti rilasciati con successo');
    } catch (error) {
      console.error('Error deleting booking:', error);
      alert('Errore durante l\'eliminazione della prenotazione: ' + error.message);
    }
  };

  const handleEdit = async (booking) => {
    setEditingBooking(booking);
    setEditForm({
      name: booking.name,
      email: booking.email,
      whatsapp: booking.whatsapp,
      spots: booking.spots
    });

    // Reset slot selector state
    setShowSlotSelector(false);
    setSelectedDate(null);
    setNewSlot(null);
    setCitySlots([]);
    setBookedSlots({});

    // Load city slots if cityId exists
    if (booking.cityId) {
      setLoadingSlots(true);
      try {
        const cityDoc = await getDoc(doc(db, 'cities', booking.cityId));
        if (cityDoc.exists()) {
          const cityData = cityDoc.data();
          setCitySlots(cityData.eventData?.timeSlots || []);
          setBookedSlots(cityData.bookedSlots || {});
        }
      } catch (error) {
        console.error('Error loading city slots:', error);
      }
      setLoadingSlots(false);
    }
  };

  // Helper: calcola posti disponibili per uno slot
  const getAvailableSpots = (slot) => {
    const key = `${slot.date}-${slot.time}`;
    const booked = bookedSlots[key] || 0;
    // Se è lo slot corrente della prenotazione, aggiungi i posti che libereremmo
    if (editingBooking && slot.date === editingBooking.date && slot.time === editingBooking.time) {
      return slot.capacity - booked + editingBooking.spots;
    }
    return slot.capacity - booked;
  };

  // Helper: verifica se una data è futura
  const isFutureDate = (dateString) => {
    if (!dateString) return false;
    const slotDate = new Date(dateString);
    const today = new Date();
    slotDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return slotDate >= today;
  };

  // Raggruppa slot per data (solo date future)
  const groupedSlots = citySlots
    .filter(slot => isFutureDate(slot.date))
    .reduce((acc, slot) => {
      const dateKey = slot.date || slot.day;
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(slot);
      return acc;
    }, {});

  // Verifica se lo slot selezionato è diverso da quello attuale
  const isSlotChanged = () => {
    if (!newSlot) return false;
    return newSlot.date !== editingBooking?.date || newSlot.time !== editingBooking?.time;
  };

  // Seleziona un nuovo slot
  const handleSelectSlot = (slot) => {
    const available = getAvailableSpots(slot);
    if (available < editForm.spots) {
      alert(`⚠️ Solo ${available} posti disponibili per questo orario`);
      return;
    }
    setNewSlot(slot);
    setShowSlotSelector(false);
    setSelectedDate(null);
  };

  const handleSaveEdit = async () => {
    try {
      const newSpots = Number(editForm.spots);

      // Se c'è un cambio di slot, usa una transazione atomica
      if (isSlotChanged() && editingBooking.cityId) {
        await runTransaction(db, async (transaction) => {
          // Leggi il documento della città per verificare disponibilità
          const cityRef = doc(db, 'cities', editingBooking.cityId);
          const cityDoc = await transaction.get(cityRef);

          if (!cityDoc.exists()) {
            throw new Error('Città non trovata');
          }

          const cityData = cityDoc.data();
          const currentBookedSlots = cityData.bookedSlots || {};

          // Verifica disponibilità del nuovo slot
          const newSlotKey = `${newSlot.date}-${newSlot.time}`;
          const currentBooked = currentBookedSlots[newSlotKey] || 0;
          const available = newSlot.capacity - currentBooked;

          if (available < newSpots) {
            throw new Error(`Solo ${available} posti disponibili per il nuovo orario. Riprova.`);
          }

          // Decrementa il vecchio slot
          const oldSlotKey = `${editingBooking.date}-${editingBooking.time}`;
          transaction.update(cityRef, {
            [`bookedSlots.${oldSlotKey}`]: increment(-editingBooking.spots)
          });

          // Incrementa il nuovo slot
          transaction.update(cityRef, {
            [`bookedSlots.${newSlotKey}`]: increment(newSpots)
          });

          // Aggiorna la prenotazione
          const bookingRef = doc(db, 'bookings', editingBooking.id);
          transaction.update(bookingRef, {
            name: editForm.name,
            email: editForm.email,
            whatsapp: editForm.whatsapp,
            spots: newSpots,
            day: newSlot.day,
            date: newSlot.date,
            time: newSlot.time
          });
        });

        // Update local state
        setBookings(bookings.map(b =>
          b.id === editingBooking.id
            ? { ...b, ...editForm, spots: newSpots, day: newSlot.day, date: newSlot.date, time: newSlot.time }
            : b
        ));
      } else {
        // Se non c'è cambio di slot ma cambiano i posti, aggiorna il contatore
        const oldSpots = editingBooking.spots || 1;
        const spotsDifference = newSpots - oldSpots;

        if (spotsDifference !== 0 && editingBooking.cityId) {
          const slotKey = `${editingBooking.date}-${editingBooking.time}`;

          await runTransaction(db, async (transaction) => {
            const cityRef = doc(db, 'cities', editingBooking.cityId);
            const cityDoc = await transaction.get(cityRef);

            if (!cityDoc.exists()) {
              throw new Error('Città non trovata');
            }

            const cityData = cityDoc.data();
            const currentBookedSlots = cityData.bookedSlots || {};
            const currentSlot = citySlots.find(
              s => s.date === editingBooking.date && s.time === editingBooking.time
            );

            if (currentSlot && spotsDifference > 0) {
              const currentBooked = currentBookedSlots[slotKey] || 0;
              const available = currentSlot.capacity - currentBooked;
              if (available < spotsDifference) {
                throw new Error(`Solo ${available} posti aggiuntivi disponibili per questo orario.`);
              }
            }

            // Aggiorna il contatore
            transaction.update(cityRef, {
              [`bookedSlots.${slotKey}`]: increment(spotsDifference)
            });

            // Aggiorna la prenotazione
            const bookingRef = doc(db, 'bookings', editingBooking.id);
            transaction.update(bookingRef, {
              name: editForm.name,
              email: editForm.email,
              whatsapp: editForm.whatsapp,
              spots: newSpots
            });
          });
        } else {
          // Solo aggiornamento dati personali
          await updateDoc(doc(db, 'bookings', editingBooking.id), {
            name: editForm.name,
            email: editForm.email,
            whatsapp: editForm.whatsapp,
            spots: newSpots
          });
        }

        // Update local state
        setBookings(bookings.map(b =>
          b.id === editingBooking.id
            ? { ...b, ...editForm, spots: newSpots }
            : b
        ));
      }

      setEditingBooking(null);
      setNewSlot(null);
      alert('✅ Prenotazione aggiornata con successo');
    } catch (error) {
      console.error('Error updating booking:', error);
      alert(error.message || 'Errore durante l\'aggiornamento della prenotazione');
    }
  };

  const handleSelectBooking = (bookingId) => {
    setSelectedBookings(prev =>
      prev.includes(bookingId)
        ? prev.filter(id => id !== bookingId)
        : [...prev, bookingId]
    );
  };

  const handleSelectAll = () => {
    if (selectedBookings.length === filteredBookings.length) {
      setSelectedBookings([]);
    } else {
      setSelectedBookings(filteredBookings.map(b => b.id));
    }
  };

  const handleSendReminders = async () => {
    if (selectedBookings.length === 0) {
      alert('Seleziona almeno una prenotazione');
      return;
    }

    if (reminderType === 'custom' && !customMessage.trim()) {
      alert('Inserisci un messaggio personalizzato');
      return;
    }

    setSendingReminders(true);

    try {
      // Import Cloud Function
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      const sendManualReminders = httpsCallable(functions, 'sendManualReminders');

      const result = await sendManualReminders({
        bookingIds: selectedBookings,
        reminderType,
        customMessage: reminderType === 'custom' ? customMessage : null
      });

      alert(`✅ Reminder inviati: ${result.data.sent} successi, ${result.data.failed} errori`);
      setShowReminderModal(false);
      setSelectedBookings([]);
      setCustomMessage('');
    } catch (error) {
      console.error('Error sending reminders:', error);
      alert('❌ Errore durante l\'invio dei reminder: ' + error.message);
    } finally {
      setSendingReminders(false);
    }
  };

  // Handle admin cancellation of booking
  const handleAdminCancel = async () => {
    if (!cancellingBooking) return;

    setProcessingCancel(true);

    try {
      // 1. Update booking status to cancelled and decrement slot counter
      await runTransaction(db, async (transaction) => {
        // Get city document to update booked slots counter
        if (cancellingBooking.cityId && cancellingBooking.date && cancellingBooking.time) {
          const cityRef = doc(db, 'cities', cancellingBooking.cityId);
          const cityDoc = await transaction.get(cityRef);

          if (cityDoc.exists()) {
            const slotKey = `${cancellingBooking.date}-${cancellingBooking.time}`;
            // Decrement the booked slots counter
            transaction.update(cityRef, {
              [`bookedSlots.${slotKey}`]: increment(-(cancellingBooking.spots || 1))
            });
          }
        }

        // Update booking status to cancelled
        const bookingRef = doc(db, 'bookings', cancellingBooking.id);
        transaction.update(bookingRef, {
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
          cancelledBy: 'admin',
          cancelReason: cancelReason || null
        });
      });

      // 2. Send cancellation email to user
      try {
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const functions = getFunctions();
        const sendAdminCancellation = httpsCallable(functions, 'sendAdminCancellation');

        await sendAdminCancellation({
          booking: cancellingBooking,
          reason: cancelReason
        });
      } catch (emailError) {
        console.error('Error sending cancellation email:', emailError);
        // Don't fail the operation if email fails
      }

      // 3. Update local state - mark as cancelled
      setBookings(bookings.map(b =>
        b.id === cancellingBooking.id
          ? { ...b, status: 'cancelled', cancelledAt: new Date().toISOString(), cancelledBy: 'admin', cancelReason: cancelReason || null }
          : b
      ));

      alert('✅ Prenotazione disdetta con successo. L\'utente è stato notificato via email.');

      // Reset modal state
      setShowCancelModal(false);
      setCancellingBooking(null);
      setCancelReason('');

    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert('❌ Errore durante la disdetta: ' + error.message);
    } finally {
      setProcessingCancel(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return date.toLocaleString('it-IT');
  };

  // Export to CSV (more secure than Excel)
  const exportToCSV = () => {
    // Prepare data for CSV
    const csvData = filteredBookings.map(booking => ({
      'Nome e Cognome': booking.name,
      'Email': booking.email,
      'WhatsApp': booking.whatsapp,
      'Città': booking.cityName,
      'Giorno': booking.day,
      'Data Evento': booking.date ? formatDate(booking.date) : 'N/A',
      'Orario': booking.time,
      'Posti Prenotati': booking.spots,
      'Status': booking.status || 'confirmed',
      'Data Prenotazione': formatTimestamp(booking.createdAt)
    }));

    // Convert to CSV
    const csv = Papa.unparse(csvData, {
      delimiter: ',',
      header: true,
      encoding: 'utf-8'
    });

    // Generate filename
    const cityName = selectedCities.length > 0
      ? selectedCities.length === 1
        ? cities.find(c => c.id === selectedCities[0])?.name || 'Tutte'
        : `${selectedCities.length}_Citta`
      : 'Tutte';
    const dateStr = selectedDates.length > 0
      ? selectedDates.length === 1
        ? selectedDates[0]
        : `${selectedDates.length}_Date`
      : 'Tutte_le_date';
    const filename = `Prenotazioni_${cityName}_${dateStr}.csv`;

    // Create blob and download
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Export to CSV for SMS/WhatsApp
  const exportToSmsCSV = () => {
    // Helper per formattare il numero di telefono con prefisso 39 (deve essere 12 cifre totali)
    const formatPhoneNumber = (phone) => {
      if (!phone) return '';
      // Rimuovi spazi, trattini e altri caratteri non numerici
      let cleaned = phone.replace(/[^\d]/g, '');

      // Rimuovi 00 iniziale (es. 0039...)
      if (cleaned.startsWith('00')) {
        cleaned = cleaned.substring(2);
      }

      // Se è già 12 cifre e inizia con 39, è corretto
      if (cleaned.length === 12 && cleaned.startsWith('39')) {
        return cleaned;
      }

      // Se è 10 cifre (numero italiano senza prefisso), aggiungi 39
      if (cleaned.length === 10) {
        return '39' + cleaned;
      }

      // Se è 11 cifre e inizia con 39, il numero originale era incompleto
      // Aggiungiamo comunque 39 per renderlo 13 cifre? No, meglio prendere le ultime 10
      // Se è più di 12 cifre o ha altri formati strani, prendiamo le ultime 10 cifre e aggiungiamo 39
      if (cleaned.length !== 12) {
        // Prendi le ultime 10 cifre (il numero senza prefisso internazionale)
        const last10 = cleaned.slice(-10);
        return '39' + last10;
      }

      return cleaned;
    };

    // Helper per formattare la data in modo leggibile
    const formatDateReadable = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('it-IT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
    };

    // Prepare data for SMS CSV
    const csvData = filteredBookings.map(booking => {
      // Trova la città per ottenere l'indirizzo
      const city = cities.find(c => c.id === booking.cityId);
      const locationName = city?.eventData?.location?.name || '';
      const locationAddress = city?.eventData?.location?.address || '';

      // Costruisci la stringa della location (senza città perché è già nell'indirizzo)
      let locationString = '';
      if (locationName && locationAddress) {
        locationString = `${locationName}; ${locationAddress}`;
      } else if (locationAddress) {
        locationString = locationAddress;
      } else if (locationName) {
        locationString = locationName;
      }

      // Costruisci il messaggio
      const message = `Gentile ${booking.name}; le ricordiamo della sua prenotazione per ${booking.spots || 1} ${(booking.spots || 1) === 1 ? 'persona' : 'persone'} per ${formatDateReadable(booking.date)} alle ${booking.time} con Cultura Immersiva presso ${locationString}.`;

      return {
        'messaggio': message,
        'numeroditelefono': formatPhoneNumber(booking.whatsapp)
      };
    });

    // Convert to CSV
    const csv = Papa.unparse(csvData, {
      delimiter: ',',
      header: true,
      encoding: 'utf-8'
    });

    // Generate filename
    const cityName = selectedCities.length > 0
      ? selectedCities.length === 1
        ? cities.find(c => c.id === selectedCities[0])?.name || 'Tutte'
        : `${selectedCities.length}_Citta`
      : 'Tutte';
    const dateStr = selectedDates.length > 0
      ? selectedDates.length === 1
        ? selectedDates[0]
        : `${selectedDates.length}_Date`
      : 'Tutte_le_date';
    const filename = `SMS_Reminder_${cityName}_${dateStr}.csv`;

    // Create blob and download
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Get unique dates for filter
  const uniqueDates = [...new Set(bookings.map(b => b.date))].filter(Boolean).sort();

  // Get filtered city suggestions
  const filteredCitySuggestions = cities.filter(city =>
    city.name.toLowerCase().includes(citySearchTerm.toLowerCase()) &&
    !selectedCities.includes(city.id)
  );

  // Get filtered date suggestions
  const filteredDateSuggestions = uniqueDates.filter(date => {
    const formattedDate = new Date(date).toLocaleDateString('it-IT', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    return formattedDate.toLowerCase().includes(dateSearchTerm.toLowerCase()) &&
           !selectedDates.includes(date);
  });

  // Add city to selection
  const addCity = (cityId) => {
    setSelectedCities(prev => [...prev, cityId]);
    setCitySearchTerm('');
    setShowCitySuggestions(false);
  };

  // Add date to selection
  const addDate = (date) => {
    setSelectedDates(prev => [...prev, date]);
    setDateSearchTerm('');
    setShowDateSuggestions(false);
  };

  // Remove city from selection
  const removeCity = (cityId) => {
    setSelectedCities(prev => prev.filter(id => id !== cityId));
  };

  // Remove date from selection
  const removeDate = (date) => {
    setSelectedDates(prev => prev.filter(d => d !== date));
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedCities([]);
    setSelectedDates([]);
    setSearchTerm('');
  };

  // Filter bookings
  const filteredBookings = bookings.filter(booking => {
    // Status filter
    if (statusFilter === 'active' && booking.status === 'cancelled') return false;
    if (statusFilter === 'cancelled' && booking.status !== 'cancelled') return false;

    // City filter
    if (selectedCities.length > 0 && !selectedCities.includes(booking.cityId)) return false;

    // Date filter
    if (selectedDates.length > 0 && !selectedDates.includes(booking.date)) return false;

    // Search filter (nome, email e città)
    if (searchTerm.trim() !== '') {
      const search = searchTerm.toLowerCase();
      const matchesName = booking.name?.toLowerCase().includes(search);
      const matchesEmail = booking.email?.toLowerCase().includes(search);
      const matchesCity = booking.cityName?.toLowerCase().includes(search);
      if (!matchesName && !matchesEmail && !matchesCity) return false;
    }

    return true;
  });

  // Calculate stats based on filtered bookings
  const stats = {
    total: filteredBookings.length,
    totalSpots: filteredBookings.reduce((sum, b) => sum + (b.spots || 0), 0),
    cities: [...new Set(filteredBookings.map(b => b.cityId))].length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <FaCalendarCheck className="text-primary text-2xl sm:text-3xl" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-primary">Gestione Prenotazioni</h1>
                <p className="text-xs sm:text-sm text-gray-600">Visualizza e gestisci tutte le prenotazioni</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full lg:w-auto">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="px-3 sm:px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors w-full sm:w-auto"
              >
                Torna alle Città
              </button>
              <span className="text-xs sm:text-sm text-gray-600 hidden md:inline">
                {currentUser?.email}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors w-full sm:w-auto"
              >
                <FaSignOutAlt />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">
              Prenotazioni Totali
              {(selectedCities.length > 0 || selectedDates.length > 0) && (
                <span className="ml-2 text-xs text-blue-600">
                  (Filtrato)
                </span>
              )}
            </div>
            <div className="text-3xl font-bold text-primary">{stats.total}</div>
            <div className="text-xs text-gray-500 mt-1">
              {selectedCities.length === 0 && selectedDates.length === 0
                ? 'Tutte le città e date'
                : `${selectedCities.length > 0 ? `${selectedCities.length} ${selectedCities.length === 1 ? 'città' : 'città'}` : 'Tutte le città'}${selectedCities.length > 0 && selectedDates.length > 0 ? ' • ' : ''}${selectedDates.length > 0 ? `${selectedDates.length} ${selectedDates.length === 1 ? 'data' : 'date'}` : ''}`
              }
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">
              Posti Prenotati
              {(selectedCities.length > 0 || selectedDates.length > 0) && (
                <span className="ml-2 text-xs text-orange-600">
                  (Filtrato)
                </span>
              )}
            </div>
            <div className="text-3xl font-bold text-secondary">{stats.totalSpots}</div>
            <div className="text-xs text-gray-500 mt-1">
              {selectedCities.length === 0 && selectedDates.length === 0
                ? 'Tutte le città e date'
                : `${selectedCities.length > 0 ? `${selectedCities.length} ${selectedCities.length === 1 ? 'città' : 'città'}` : 'Tutte le città'}${selectedCities.length > 0 && selectedDates.length > 0 ? ' • ' : ''}${selectedDates.length > 0 ? `${selectedDates.length} ${selectedDates.length === 1 ? 'data' : 'date'}` : ''}`
              }
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">
              Città con Prenotazioni
              {(selectedCities.length > 0 || selectedDates.length > 0) && (
                <span className="ml-2 text-xs text-green-600">
                  (Filtrato)
                </span>
              )}
            </div>
            <div className="text-3xl font-bold text-green-600">{stats.cities}</div>
            <div className="text-xs text-gray-500 mt-1">
              {selectedCities.length === 0 && selectedDates.length === 0
                ? 'Tutte le città e date'
                : 'Nei filtri selezionati'
              }
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ricerca Rapida
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <FaSearch className="text-gray-400" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cerca per nome, email o città..."
              className="w-full pl-10 pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
          {searchTerm && (
            <p className="mt-2 text-sm text-gray-600">
              Trovate {filteredBookings.length} prenotazioni
            </p>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === 'active'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Attive ({bookings.filter(b => b.status !== 'cancelled').length})
            </button>
            <button
              onClick={() => setStatusFilter('cancelled')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === 'cancelled'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Disdette ({bookings.filter(b => b.status === 'cancelled').length})
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tutte ({bookings.length})
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <FaFilter className="text-primary" />
              <h2 className="text-base sm:text-lg font-semibold text-gray-800">
                Filtri Avanzati ({selectedCities.length === 0 && selectedDates.length === 0 ? 'Tutte' : `${filteredBookings.length} risultati`})
              </h2>
            </div>
            <div className="flex gap-2">
              {(selectedCities.length > 0 || selectedDates.length > 0 || searchTerm) && (
                <button
                  onClick={clearAllFilters}
                  className="px-3 py-2 text-xs sm:text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancella Tutto
                </button>
              )}
              <button
                onClick={exportToCSV}
                disabled={filteredBookings.length === 0}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaFileCsv />
                <span className="hidden sm:inline">CSV ({filteredBookings.length})</span>
                <span className="sm:hidden">CSV</span>
              </button>
              <button
                onClick={exportToSmsCSV}
                disabled={filteredBookings.length === 0}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Esporta CSV per invio SMS"
              >
                <FaSms />
                <span className="hidden sm:inline">SMS</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cities Filter with Autocomplete */}
            <div className="city-search-container">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cerca Città
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={citySearchTerm}
                  onChange={(e) => {
                    setCitySearchTerm(e.target.value);
                    setShowCitySuggestions(true);
                  }}
                  onFocus={() => setShowCitySuggestions(true)}
                  placeholder="Digita per cercare città..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />

                {/* City Suggestions Dropdown */}
                {showCitySuggestions && citySearchTerm && filteredCitySuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredCitySuggestions.map(city => {
                      const count = bookings.filter(b => b.cityId === city.id).length;
                      return (
                        <div
                          key={city.id}
                          onClick={() => addCity(city.id)}
                          className="px-4 py-2 hover:bg-primary hover:bg-opacity-10 cursor-pointer flex justify-between items-center"
                        >
                          <span className="text-sm font-medium">{city.name}</span>
                          <span className="text-xs text-gray-500">({count})</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected Cities Tags */}
              {selectedCities.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedCities.map(cityId => {
                    const city = cities.find(c => c.id === cityId);
                    return city ? (
                      <span
                        key={cityId}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-primary bg-opacity-10 text-primary rounded-full text-sm font-medium"
                      >
                        {city.name}
                        <button
                          onClick={() => navigate(`/admin/city-dashboard/${cityId}`)}
                          className="hover:text-secondary"
                          title="Dashboard presenze"
                        >
                          <FaChartBar />
                        </button>
                        <button
                          onClick={() => removeCity(cityId)}
                          className="hover:text-primary-dark"
                        >
                          ✕
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            {/* Dates Filter with Autocomplete */}
            <div className="date-search-container">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cerca Date
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={dateSearchTerm}
                  onChange={(e) => {
                    setDateSearchTerm(e.target.value);
                    setShowDateSuggestions(true);
                  }}
                  onFocus={() => setShowDateSuggestions(true)}
                  placeholder="Digita per cercare date..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                />

                {/* Date Suggestions Dropdown */}
                {showDateSuggestions && dateSearchTerm && filteredDateSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredDateSuggestions.map(date => {
                      const count = bookings.filter(b => b.date === date).length;
                      return (
                        <div
                          key={date}
                          onClick={() => addDate(date)}
                          className="px-4 py-2 hover:bg-secondary hover:bg-opacity-10 cursor-pointer flex justify-between items-center"
                        >
                          <span className="text-sm font-medium">
                            {new Date(date).toLocaleDateString('it-IT', {
                              weekday: 'long',
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="text-xs text-gray-500">({count})</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected Dates Tags */}
              {selectedDates.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedDates.map(date => (
                    <span
                      key={date}
                      className="inline-flex items-center gap-2 px-3 py-1 bg-secondary bg-opacity-10 text-secondary rounded-full text-sm font-medium"
                    >
                      {new Date(date).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                      <button
                        onClick={() => removeDate(date)}
                        className="hover:text-secondary-dark"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Send Reminders Button */}
        {selectedBookings.length > 0 && (
          <div className="mb-4 bg-primary text-white p-4 rounded-lg shadow flex justify-between items-center">
            <span className="font-semibold">
              {selectedBookings.length} prenotazion{selectedBookings.length === 1 ? 'e' : 'i'} selezionat{selectedBookings.length === 1 ? 'a' : 'e'}
            </span>
            <button
              onClick={() => setShowReminderModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-primary rounded-lg hover:bg-gray-100 transition-colors font-semibold"
            >
              <FaBell />
              Invia Reminder
            </button>
          </div>
        )}

        {/* Bookings Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-600">Caricamento...</div>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-600">Nessuna prenotazione trovata</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedBookings.length === filteredBookings.length && filteredBookings.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Città
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data & Ora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Posti
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prenotato il
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reminders
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Consensi
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedBookings.includes(booking.id)}
                          onChange={() => handleSelectBooking(booking.id)}
                          className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {booking.name}
                        </div>
                        <div className="text-sm text-gray-500">{booking.email}</div>
                        <div className="text-sm text-gray-500">📱 {booking.whatsapp}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{booking.cityName}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {booking.day} {booking.date && formatDate(booking.date)}
                        </div>
                        <div className="text-sm font-medium text-primary">{booking.time}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="flex items-center gap-1 text-sm font-medium text-gray-900">
                          <FaUsers className="text-gray-400" />
                          {booking.spots}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {booking.status === 'cancelled' ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            Disdetta
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Confermata
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTimestamp(booking.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <div className="space-y-1">
                          <div className={`flex items-center gap-1 ${booking.reminders?.confirmation?.sent ? 'text-green-600' : 'text-gray-400'}`}>
                            <span>{booking.reminders?.confirmation?.sent ? '✅' : '⏳'}</span>
                            <span>Conferma</span>
                          </div>
                          <div className={`flex items-center gap-1 ${booking.reminders?.threeDaysBefore?.sent ? 'text-green-600' : 'text-gray-400'}`}>
                            <span>{booking.reminders?.threeDaysBefore?.sent ? '✅' : '⏳'}</span>
                            <span>3 giorni</span>
                          </div>
                          <div className={`flex items-center gap-1 ${booking.reminders?.oneDayBefore?.sent ? 'text-green-600' : 'text-gray-400'}`}>
                            <span>{booking.reminders?.oneDayBefore?.sent ? '✅' : '⏳'}</span>
                            <span>1 giorno</span>
                          </div>
                          <div className={`flex items-center gap-1 ${booking.reminders?.oneHourBefore?.sent ? 'text-green-600' : 'text-gray-400'}`}>
                            <span>{booking.reminders?.oneHourBefore?.sent ? '✅' : '⏳'}</span>
                            <span>1 ora</span>
                          </div>
                          <div className={`flex items-center gap-1 ${booking.whatsappReminderSent ? 'text-green-600' : 'text-gray-400'}`}>
                            <FaWhatsapp className={booking.whatsappReminderSent ? 'text-green-500' : ''} />
                            <span>{booking.whatsappReminderSent ? '✅' : '⏳'}</span>
                            <span>WA 24h</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {booking.consents ? (
                          <div className="space-y-1">
                            <div className={`flex items-center gap-1 ${booking.consents.termsAndConditions?.accepted ? 'text-green-600' : 'text-gray-400'}`}>
                              <span>{booking.consents.termsAndConditions?.accepted ? '✅' : '❌'}</span>
                              <span>T&C</span>
                            </div>
                            <div className={`flex items-center gap-1 ${booking.consents.marketing?.accepted ? 'text-green-600' : 'text-gray-400'}`}>
                              <span>{booking.consents.marketing?.accepted ? '✅' : '❌'}</span>
                              <span>Marketing</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {booking.status !== 'cancelled' ? (
                          <>
                            <button
                              onClick={() => handleEdit(booking)}
                              className="text-primary hover:text-primary-dark mr-3"
                              title="Modifica"
                            >
                              <FaEdit className="inline" />
                            </button>
                            <button
                              onClick={() => {
                                setCancellingBooking(booking);
                                setShowCancelModal(true);
                              }}
                              className="text-orange-500 hover:text-orange-700"
                              title="Disdici con notifica"
                            >
                              <FaBan className="inline" />
                            </button>
                          </>
                        ) : (
                          <span className="text-gray-400 text-xs italic">Disdetta</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 sticky top-0 bg-white z-10">
              <h3 className="text-lg sm:text-xl font-bold text-primary">Modifica Prenotazione</h3>
              <p className="text-sm text-gray-600">{editingBooking.cityName}</p>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              {/* Data e Orario Attuale */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  {isSlotChanged() ? 'Nuovo Orario Selezionato:' : 'Data e Orario Attuale:'}
                </h4>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <FaCalendar className="text-primary" />
                    {isSlotChanged() ? (
                      <>
                        <span className="line-through text-gray-400">{editingBooking.day} {formatDate(editingBooking.date)}</span>
                        <span className="text-green-600 font-semibold ml-2">{newSlot.day} {formatDate(newSlot.date)}</span>
                      </>
                    ) : (
                      <span>{editingBooking.day} {formatDate(editingBooking.date)}</span>
                    )}
                  </span>
                  <span className="flex items-center gap-1">
                    <FaClock className="text-primary" />
                    {isSlotChanged() ? (
                      <>
                        <span className="line-through text-gray-400">{editingBooking.time}</span>
                        <span className="text-green-600 font-semibold ml-2">{newSlot.time}</span>
                      </>
                    ) : (
                      <span>{editingBooking.time}</span>
                    )}
                  </span>
                </div>

                {/* Pulsante Cambia Data/Orario */}
                {!loadingSlots && Object.keys(groupedSlots).length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowSlotSelector(!showSlotSelector);
                      setSelectedDate(null);
                      if (!showSlotSelector) setNewSlot(null);
                    }}
                    className="mt-3 flex items-center gap-2 text-primary hover:text-primary-dark font-medium text-sm"
                  >
                    <FaExchangeAlt />
                    {showSlotSelector ? 'Annulla cambio orario' : 'Cambia data/orario'}
                  </button>
                )}
                {loadingSlots && (
                  <p className="mt-2 text-sm text-gray-500">Caricamento slot...</p>
                )}
              </div>

              {/* Selettore Data/Orario */}
              {showSlotSelector && (
                <div className="border border-gray-200 rounded-lg p-4">
                  {!selectedDate ? (
                    <>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <FaCalendar className="text-primary" />
                        Seleziona una Nuova Data
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                        {Object.entries(groupedSlots).map(([dateKey, dateSlots]) => {
                          const firstSlot = dateSlots[0];
                          const totalAvailable = dateSlots.reduce((sum, slot) => sum + getAvailableSpots(slot), 0);
                          const hasAvailability = totalAvailable >= editForm.spots;
                          const isCurrentDate = dateKey === editingBooking?.date;

                          return (
                            <button
                              key={dateKey}
                              onClick={() => setSelectedDate(dateKey)}
                              disabled={!hasAvailability}
                              className={`p-3 rounded-lg border text-left text-sm ${
                                hasAvailability
                                  ? isCurrentDate
                                    ? 'border-primary bg-primary bg-opacity-5'
                                    : 'border-gray-200 hover:border-primary'
                                  : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                              }`}
                            >
                              <div className="font-medium">
                                {formatDate(firstSlot.date)}
                              </div>
                              {isCurrentDate && (
                                <span className="text-xs text-primary">Data attuale</span>
                              )}
                              <div className={`text-xs flex items-center gap-1 ${hasAvailability ? 'text-green-600' : 'text-red-600'}`}>
                                <FaUsers />
                                {totalAvailable} posti
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
                        className="text-primary hover:text-primary-dark flex items-center gap-1 mb-3 text-sm"
                      >
                        <FaArrowLeft /> Torna alle date
                      </button>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <FaClock className="text-primary" />
                        Seleziona un Orario - {formatDate(selectedDate)}
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                        {groupedSlots[selectedDate]?.map((slot, idx) => {
                          const available = getAvailableSpots(slot);
                          const isAvailable = available >= editForm.spots;
                          const isCurrentSlot = slot.date === editingBooking?.date && slot.time === editingBooking?.time;

                          return (
                            <button
                              key={idx}
                              onClick={() => handleSelectSlot(slot)}
                              disabled={!isAvailable}
                              className={`p-3 rounded-lg border text-left text-sm ${
                                isAvailable
                                  ? isCurrentSlot
                                    ? 'border-primary bg-primary bg-opacity-5'
                                    : 'border-gray-200 hover:border-primary'
                                  : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                              }`}
                            >
                              <div className="font-bold flex items-center gap-1">
                                <FaClock className="text-primary text-xs" />
                                {slot.time}
                              </div>
                              {isCurrentSlot && (
                                <span className="text-xs text-primary">Attuale</span>
                              )}
                              <div className={`text-xs ${isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                                {available} posti
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Form Dati */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome e Cognome
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={editForm.whatsapp}
                    onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numero Posti
                  </label>
                  <input
                    type="number"
                    value={editForm.spots}
                    onChange={(e) => setEditForm({ ...editForm, spots: e.target.value })}
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                  {citySlots.length > 0 && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <FaUsers />
                      {(() => {
                        const targetSlot = newSlot || citySlots.find(
                          s => s.date === editingBooking?.date && s.time === editingBooking?.time
                        );
                        return targetSlot ? `${getAvailableSpots(targetSlot)} posti disponibili` : '';
                      })()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-4 sticky bottom-0 bg-white">
              <button
                onClick={() => {
                  setEditingBooking(null);
                  setNewSlot(null);
                  setShowSlotSelector(false);
                }}
                className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 w-full sm:w-auto"
              >
                Annulla
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-primary text-white rounded-lg hover:bg-primary-dark w-full sm:w-auto"
              >
                {isSlotChanged() ? 'Salva con Nuovo Orario' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Reminders Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-xl font-bold text-primary">Invia Reminder</h3>
              <p className="text-sm text-gray-600 mt-1">
                Invia reminder a {selectedBookings.length} prenotazion{selectedBookings.length === 1 ? 'e' : 'i'}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo di Reminder
                </label>
                <select
                  value={reminderType}
                  onChange={(e) => setReminderType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                >
                  <option value="threeDaysBefore">⏰ Reminder 3 giorni prima</option>
                  <option value="oneDayBefore">🔔 Reminder 1 giorno prima</option>
                  <option value="oneHourBefore">🚨 Reminder 1 ora prima</option>
                  <option value="custom">📝 Messaggio Personalizzato</option>
                </select>
              </div>

              {reminderType === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Messaggio Personalizzato
                  </label>
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Scrivi qui il tuo messaggio..."
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowReminderModal(false);
                  setCustomMessage('');
                }}
                disabled={sendingReminders}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                onClick={handleSendReminders}
                disabled={sendingReminders}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 flex items-center gap-2"
              >
                {sendingReminders ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Invio in corso...
                  </>
                ) : (
                  <>
                    <FaBell />
                    Invia Reminder
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Cancel Modal */}
      {showCancelModal && cancellingBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-xl font-bold text-orange-600 flex items-center gap-2">
                <FaBan />
                Disdici Prenotazione
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                L'utente riceverà una email di notifica
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Booking details */}
              <div className="bg-gray-50 rounded-lg p-4 text-sm">
                <p><strong>Cliente:</strong> {cancellingBooking.name}</p>
                <p><strong>Email:</strong> {cancellingBooking.email}</p>
                <p><strong>Città:</strong> {cancellingBooking.cityName}</p>
                <p><strong>Data:</strong> {cancellingBooking.date ? new Date(cancellingBooking.date).toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : ''}</p>
                <p><strong>Orario:</strong> {cancellingBooking.time}</p>
                <p><strong>Posti:</strong> {cancellingBooking.spots}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivazione (opzionale)
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Es: L'evento è stato annullato per motivi organizzativi..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Questa motivazione sarà inclusa nell'email inviata all'utente
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancellingBooking(null);
                  setCancelReason('');
                }}
                disabled={processingCancel}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                onClick={handleAdminCancel}
                disabled={processingCancel}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
              >
                {processingCancel ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Elaborazione...
                  </>
                ) : (
                  <>
                    <FaBan />
                    Conferma Disdetta
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bookings;
