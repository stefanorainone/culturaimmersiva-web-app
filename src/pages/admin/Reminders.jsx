import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { collection, getDocs, query, orderBy, where, doc, getDoc, setDoc, serverTimestamp, limit as firestoreLimit } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { FaBell, FaSignOutAlt, FaChartBar, FaClock, FaHistory, FaEnvelope, FaCheckCircle, FaHourglassHalf, FaExclamationTriangle, FaCog, FaSave, FaFilter, FaTimes, FaUser, FaPaperPlane, FaSearch, FaEye, FaCalendarAlt } from 'react-icons/fa';

const Reminders = () => {
  const [bookings, setBookings] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    confirmation: { sent: 0, pending: 0 },
    threeDays: { sent: 0, pending: 0 },
    oneDay: { sent: 0, pending: 0 },
    oneHour: { sent: 0, pending: 0 }
  });
  const [upcomingReminders, setUpcomingReminders] = useState([]);
  const [reminderHistory, setReminderHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testType, setTestType] = useState('threeDaysBefore');
  const [sendingTest, setSendingTest] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [settings, setSettings] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // Filters for history
  const [historyFilters, setHistoryFilters] = useState({
    cityId: '',
    dateFrom: '',
    dateTo: '',
    reminderType: ''
  });

  // All scheduled reminders (grouped by city)
  const [allScheduledReminders, setAllScheduledReminders] = useState([]);
  const [previewModal, setPreviewModal] = useState({ open: false, type: null, booking: null });
  const [scheduledFilter, setScheduledFilter] = useState({ cityId: '', reminderType: '' });

  // Custom email sending
  const [selectedBookings, setSelectedBookings] = useState([]);
  const [customEmailData, setCustomEmailData] = useState({
    cityIds: [],
    eventDates: [],
    subject: '',
    message: ''
  });
  const [availableBookings, setAvailableBookings] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [sendingCustomEmail, setSendingCustomEmail] = useState(false);

  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
    loadSettings();
    loadCities();
    loadReminderHistory();
  }, []);

  useEffect(() => {
    applyHistoryFilters();
  }, [historyFilters, reminderHistory]);

  useEffect(() => {
    if (customEmailData.cityIds.length > 0 || customEmailData.eventDates.length > 0) {
      filterAvailableBookings();
    } else {
      setAvailableBookings([]);
    }
  }, [customEmailData.cityIds, customEmailData.eventDates, bookings]);

  useEffect(() => {
    // Extract unique dates from bookings, filtered by selected cities
    let filteredBookings = bookings;

    console.log('[Reminders] Total bookings:', bookings.length);
    console.log('[Reminders] Selected cityIds:', customEmailData.cityIds);

    if (customEmailData.cityIds.length > 0) {
      filteredBookings = bookings.filter(b => {
        const match = customEmailData.cityIds.includes(b.cityId);
        if (customEmailData.cityIds.some(id => id.toLowerCase().includes('ancona'))) {
          console.log('[Reminders] Checking booking:', {
            id: b.id,
            cityId: b.cityId,
            cityName: b.cityName,
            date: b.date,
            matches: match
          });
        }
        return match;
      });
    }

    console.log('[Reminders] Filtered bookings:', filteredBookings.length);

    const dates = [...new Set(filteredBookings.map(b => b.date))].filter(Boolean).sort();
    console.log('[Reminders] Available dates:', dates);
    setAvailableDates(dates);

    // Remove selected dates that are no longer available
    if (customEmailData.eventDates.length > 0) {
      const validDates = customEmailData.eventDates.filter(date => dates.includes(date));
      if (validDates.length !== customEmailData.eventDates.length) {
        setCustomEmailData(prev => ({
          ...prev,
          eventDates: validDates
        }));
      }
    }
  }, [bookings, customEmailData.cityIds]);

  const loadCities = async () => {
    try {
      const citiesSnapshot = await getDocs(collection(db, 'cities'));
      const citiesData = citiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('[Reminders] Loaded cities:', citiesData.map(c => ({ id: c.id, name: c.name })));
      const anconaCities = citiesData.filter(c => c.name?.toLowerCase().includes('ancona'));
      console.log('[Reminders] Ancona cities found:', anconaCities);
      setCities(citiesData);
    } catch (error) {
      console.error('Error loading cities:', error);
    }
  };

  const loadData = async () => {
    try {
      // Query without orderBy to avoid needing composite index
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('status', '==', 'confirmed')
      );
      const snapshot = await getDocs(bookingsQuery);
      const bookingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort client-side by date
      bookingsData.sort((a, b) => {
        const dateA = new Date(a.date || '9999-12-31');
        const dateB = new Date(b.date || '9999-12-31');
        return dateA - dateB;
      });

      setBookings(bookingsData);
      calculateStats(bookingsData);
      calculateUpcomingReminders(bookingsData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const loadReminderHistory = async () => {
    try {
      const historyQuery = query(
        collection(db, 'reminderHistory'),
        orderBy('sentAt', 'desc'),
        firestoreLimit(200)
      );
      const snapshot = await getDocs(historyQuery);
      const historyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        sentAt: doc.data().sentAt?.toDate?.() || new Date(doc.data().sentAt)
      }));
      setReminderHistory(historyData);
      setFilteredHistory(historyData);
    } catch (error) {
      console.error('Error loading reminder history:', error);
      // If collection doesn't exist yet, that's fine
      setReminderHistory([]);
      setFilteredHistory([]);
    }
  };

  const applyHistoryFilters = () => {
    let filtered = [...reminderHistory];

    if (historyFilters.cityId) {
      filtered = filtered.filter(item => item.cityId === historyFilters.cityId);
    }

    if (historyFilters.dateFrom) {
      const fromDate = new Date(historyFilters.dateFrom);
      filtered = filtered.filter(item => new Date(item.eventDate) >= fromDate);
    }

    if (historyFilters.dateTo) {
      const toDate = new Date(historyFilters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(item => new Date(item.eventDate) <= toDate);
    }

    if (historyFilters.reminderType) {
      filtered = filtered.filter(item => item.reminderType === historyFilters.reminderType);
    }

    setFilteredHistory(filtered);
  };

  const clearHistoryFilters = () => {
    setHistoryFilters({
      cityId: '',
      dateFrom: '',
      dateTo: '',
      reminderType: ''
    });
  };

  const filterAvailableBookings = () => {
    let filtered = bookings.filter(b => b.status === 'confirmed');

    if (customEmailData.cityIds.length > 0) {
      filtered = filtered.filter(b => customEmailData.cityIds.includes(b.cityId));
    }

    if (customEmailData.eventDates.length > 0) {
      filtered = filtered.filter(b => customEmailData.eventDates.includes(b.date));
    }

    setAvailableBookings(filtered);
  };

  const toggleCitySelection = (cityId) => {
    setCustomEmailData(prev => ({
      ...prev,
      cityIds: prev.cityIds.includes(cityId)
        ? prev.cityIds.filter(id => id !== cityId)
        : [...prev.cityIds, cityId]
    }));
  };

  const toggleDateSelection = (date) => {
    setCustomEmailData(prev => ({
      ...prev,
      eventDates: prev.eventDates.includes(date)
        ? prev.eventDates.filter(d => d !== date)
        : [...prev.eventDates, date]
    }));
  };

  const selectAllCities = () => {
    setCustomEmailData(prev => ({
      ...prev,
      cityIds: cities.map(c => c.id)
    }));
  };

  const deselectAllCities = () => {
    setCustomEmailData(prev => ({
      ...prev,
      cityIds: []
    }));
  };

  const selectAllDates = () => {
    setCustomEmailData(prev => ({
      ...prev,
      eventDates: [...availableDates]
    }));
  };

  const deselectAllDates = () => {
    setCustomEmailData(prev => ({
      ...prev,
      eventDates: []
    }));
  };

  const toggleBookingSelection = (bookingId) => {
    setSelectedBookings(prev => {
      if (prev.includes(bookingId)) {
        return prev.filter(id => id !== bookingId);
      } else {
        return [...prev, bookingId];
      }
    });
  };

  const selectAllBookings = () => {
    setSelectedBookings(availableBookings.map(b => b.id));
  };

  const deselectAllBookings = () => {
    setSelectedBookings([]);
  };

  const loadSettings = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'reminders'));

      if (settingsDoc.exists()) {
        setSettings(settingsDoc.data());
      } else {
        const defaultSettings = {
          enabled: true,
          timing: {
            threeDaysBefore: {
              enabled: true,
              hoursBeforeEvent: 72,
              label: '3 giorni prima'
            },
            oneDayBefore: {
              enabled: true,
              hoursBeforeEvent: 24,
              label: '1 giorno prima'
            },
            oneHourBefore: {
              enabled: true,
              hoursBeforeEvent: 1,
              label: '1 ora prima'
            }
          },
          templates: {
            threeDaysBefore: {
              subject: 'Reminder: {cityName} tra 3 giorni',
              emoji: '⏰',
              title: 'Promemoria - 3 giorni all\'evento',
              message: 'Ti ricordiamo che la tua esperienza immersiva a <strong>{cityName}</strong> si terrà tra 3 giorni!'
            },
            oneDayBefore: {
              subject: 'Reminder: {cityName} domani',
              emoji: '🔔',
              title: 'Promemoria - Evento domani!',
              message: 'Ti ricordiamo che domani avrai la tua esperienza immersiva a <strong>{cityName}</strong>. Ci vediamo presto!'
            },
            oneHourBefore: {
              subject: 'Ultimo Reminder: {cityName} tra 1 ora',
              emoji: '🚨',
              title: 'Promemoria - Evento tra 1 ora!',
              message: 'La tua esperienza immersiva a <strong>{cityName}</strong> inizierà tra circa 1 ora. Ti aspettiamo!'
            }
          }
        };

        await setDoc(doc(db, 'settings', 'reminders'), {
          ...defaultSettings,
          updatedAt: serverTimestamp()
        });

        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    setSavingSettings(true);

    try {
      await setDoc(doc(db, 'settings', 'reminders'), {
        ...settings,
        updatedAt: serverTimestamp()
      });

      alert('✅ Impostazioni salvate con successo!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('❌ Errore nel salvataggio delle impostazioni: ' + error.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const calculateStats = (bookingsData) => {
    const stats = {
      total: bookingsData.length,
      confirmation: { sent: 0, pending: 0 },
      threeDays: { sent: 0, pending: 0 },
      oneDay: { sent: 0, pending: 0 },
      oneHour: { sent: 0, pending: 0 }
    };

    bookingsData.forEach(booking => {
      const reminders = booking.reminders || {};

      if (reminders.confirmation?.sent) stats.confirmation.sent++;
      else stats.confirmation.pending++;

      if (reminders.threeDaysBefore?.sent) stats.threeDays.sent++;
      else stats.threeDays.pending++;

      if (reminders.oneDayBefore?.sent) stats.oneDay.sent++;
      else stats.oneDay.pending++;

      if (reminders.oneHourBefore?.sent) stats.oneHour.sent++;
      else stats.oneHour.pending++;
    });

    setStats(stats);
  };

  const calculateUpcomingReminders = (bookingsData) => {
    const now = new Date();
    const upcoming = [];

    bookingsData.forEach(booking => {
      if (!booking.date) return;

      const eventDate = new Date(booking.date);
      if (booking.time) {
        const [hours, minutes] = booking.time.split(':');
        eventDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }

      // Skip past events
      if (eventDate < now) return;

      const reminders = booking.reminders || {};

      // 3 days before - show if not sent and scheduled time is in the future (or just passed)
      const threeDaysScheduled = new Date(eventDate.getTime() - 72 * 60 * 60 * 1000);
      if (!reminders.threeDaysBefore?.sent) {
        const hoursUntilSend = (threeDaysScheduled - now) / (1000 * 60 * 60);
        upcoming.push({
          bookingId: booking.id,
          customerName: booking.name,
          customerEmail: booking.email,
          cityName: booking.cityName,
          eventDate: booking.date,
          eventTime: booking.time,
          type: 'threeDaysBefore',
          typeLabel: '3 giorni prima',
          icon: '⏰',
          willBeSentIn: Math.max(0, hoursUntilSend),
          scheduledTime: threeDaysScheduled,
          isPending: threeDaysScheduled <= now // already due
        });
      }

      // 1 day before
      const oneDayScheduled = new Date(eventDate.getTime() - 24 * 60 * 60 * 1000);
      if (!reminders.oneDayBefore?.sent) {
        const hoursUntilSend = (oneDayScheduled - now) / (1000 * 60 * 60);
        upcoming.push({
          bookingId: booking.id,
          customerName: booking.name,
          customerEmail: booking.email,
          cityName: booking.cityName,
          eventDate: booking.date,
          eventTime: booking.time,
          type: 'oneDayBefore',
          typeLabel: '1 giorno prima',
          icon: '🔔',
          willBeSentIn: Math.max(0, hoursUntilSend),
          scheduledTime: oneDayScheduled,
          isPending: oneDayScheduled <= now
        });
      }

      // 1 hour before
      const oneHourScheduled = new Date(eventDate.getTime() - 1 * 60 * 60 * 1000);
      if (!reminders.oneHourBefore?.sent) {
        const hoursUntilSend = (oneHourScheduled - now) / (1000 * 60 * 60);
        upcoming.push({
          bookingId: booking.id,
          customerName: booking.name,
          customerEmail: booking.email,
          cityName: booking.cityName,
          eventDate: booking.date,
          eventTime: booking.time,
          type: 'oneHourBefore',
          typeLabel: '1 ora prima',
          icon: '🚨',
          willBeSentIn: Math.max(0, hoursUntilSend),
          scheduledTime: oneHourScheduled,
          isPending: oneHourScheduled <= now
        });
      }
    });

    // Sort by scheduled time (soonest first)
    upcoming.sort((a, b) => a.scheduledTime - b.scheduledTime);
    setUpcomingReminders(upcoming.slice(0, 50)); // Show more reminders

    // Calculate ALL scheduled reminders for the "Programmati" tab
    calculateAllScheduledReminders(bookingsData);
  };

  const calculateAllScheduledReminders = (bookingsData) => {
    const now = new Date();
    const allReminders = [];

    bookingsData.forEach(booking => {
      if (!booking.date) return;

      const eventDate = new Date(booking.date);
      if (booking.time) {
        const [hours, minutes] = booking.time.split(':');
        eventDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }

      // Skip past events
      if (eventDate < now) return;

      const hoursUntilEvent = (eventDate - now) / (1000 * 60 * 60);
      const reminders = booking.reminders || {};

      // 3 days before
      if (!reminders.threeDaysBefore?.sent) {
        const sendTime = new Date(eventDate.getTime() - 72 * 60 * 60 * 1000);
        allReminders.push({
          bookingId: booking.id,
          customerName: booking.name,
          customerEmail: booking.email,
          whatsapp: booking.whatsapp,
          cityId: booking.cityId,
          cityName: booking.cityName,
          eventDate: booking.date,
          eventTime: booking.time,
          spots: booking.spots,
          locationName: booking.locationName,
          locationAddress: booking.locationAddress,
          type: 'threeDaysBefore',
          typeLabel: '3 giorni prima',
          icon: '⏰',
          scheduledTime: sendTime,
          isPast: sendTime < now,
          willBeSentIn: Math.max(0, (sendTime - now) / (1000 * 60 * 60))
        });
      }

      // 1 day before
      if (!reminders.oneDayBefore?.sent) {
        const sendTime = new Date(eventDate.getTime() - 24 * 60 * 60 * 1000);
        allReminders.push({
          bookingId: booking.id,
          customerName: booking.name,
          customerEmail: booking.email,
          whatsapp: booking.whatsapp,
          cityId: booking.cityId,
          cityName: booking.cityName,
          eventDate: booking.date,
          eventTime: booking.time,
          spots: booking.spots,
          locationName: booking.locationName,
          locationAddress: booking.locationAddress,
          type: 'oneDayBefore',
          typeLabel: '1 giorno prima',
          icon: '🔔',
          scheduledTime: sendTime,
          isPast: sendTime < now,
          willBeSentIn: Math.max(0, (sendTime - now) / (1000 * 60 * 60))
        });
      }

      // 1 hour before
      if (!reminders.oneHourBefore?.sent) {
        const sendTime = new Date(eventDate.getTime() - 1 * 60 * 60 * 1000);
        allReminders.push({
          bookingId: booking.id,
          customerName: booking.name,
          customerEmail: booking.email,
          whatsapp: booking.whatsapp,
          cityId: booking.cityId,
          cityName: booking.cityName,
          eventDate: booking.date,
          eventTime: booking.time,
          spots: booking.spots,
          locationName: booking.locationName,
          locationAddress: booking.locationAddress,
          type: 'oneHourBefore',
          typeLabel: '1 ora prima',
          icon: '🚨',
          scheduledTime: sendTime,
          isPast: sendTime < now,
          willBeSentIn: Math.max(0, (sendTime - now) / (1000 * 60 * 60))
        });
      }
    });

    // Sort by scheduled time
    allReminders.sort((a, b) => a.scheduledTime - b.scheduledTime);
    setAllScheduledReminders(allReminders);
  };

  // Filter scheduled reminders
  const filteredScheduledReminders = allScheduledReminders.filter(r => {
    if (scheduledFilter.cityId && r.cityId !== scheduledFilter.cityId) return false;
    if (scheduledFilter.reminderType && r.type !== scheduledFilter.reminderType) return false;
    return true;
  });

  // Group by city for display
  const groupedByCity = filteredScheduledReminders.reduce((acc, reminder) => {
    const cityName = reminder.cityName || 'Sconosciuta';
    if (!acc[cityName]) {
      acc[cityName] = [];
    }
    acc[cityName].push(reminder);
    return acc;
  }, {});

  // Generate email preview based on actual hours remaining
  const generateEmailPreview = (booking) => {
    const now = new Date();
    let hoursRemaining = null;

    // For historical reminders, use the reminder type to determine the message
    if (booking.isHistorical && booking.reminderType) {
      const cityName = booking.cityName || '';
      let emoji, title, subject, message;

      switch (booking.reminderType) {
        case 'threeDaysBefore':
          emoji = '⏰';
          title = 'Promemoria - Evento tra 3 giorni!';
          subject = `Reminder: ${cityName} tra 3 giorni`;
          message = `Ti ricordiamo che la tua esperienza immersiva a <strong>${cityName}</strong> si terrà tra 3 giorni!`;
          break;
        case 'oneDayBefore':
          emoji = '🔔';
          title = 'Promemoria - Evento domani!';
          subject = `Reminder: ${cityName} domani!`;
          message = `Ti ricordiamo che domani avrai la tua esperienza immersiva a <strong>${cityName}</strong>. Ci vediamo presto!`;
          break;
        case 'oneHourBefore':
          emoji = '🚨';
          title = 'Promemoria - Evento tra poco!';
          subject = `Ultimo Reminder: ${cityName} sta per iniziare!`;
          message = `La tua esperienza immersiva a <strong>${cityName}</strong> inizierà tra poco. Ti aspettiamo!`;
          break;
        default:
          emoji = '📧';
          title = 'Promemoria Evento';
          subject = `Reminder: ${cityName}`;
          message = `Ti ricordiamo la tua esperienza immersiva a <strong>${cityName}</strong>.`;
      }

      return { subject, title, message, emoji, hoursRemaining: null };
    }

    if (booking.eventDate) {
      const eventDate = new Date(booking.eventDate);
      if (booking.eventTime) {
        const [hours, minutes] = booking.eventTime.split(':');
        eventDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
      hoursRemaining = (eventDate - now) / (1000 * 60 * 60);
    }

    // Use willBeSentIn if available (for scheduled reminders)
    if (booking.willBeSentIn !== undefined) {
      hoursRemaining = booking.willBeSentIn;
    }

    const cityName = booking.cityName || '';
    let emoji, title, subject, message;

    // Determine message based on actual hours remaining
    if (hoursRemaining !== null && hoursRemaining > 0) {
      if (hoursRemaining <= 2) {
        emoji = '🚨';
        title = 'Promemoria - Evento tra poco!';
        subject = `Ultimo Reminder: ${cityName} sta per iniziare!`;
        message = `La tua esperienza immersiva a <strong>${cityName}</strong> inizierà tra poco. Ti aspettiamo!`;
      } else if (hoursRemaining <= 6) {
        emoji = '🚨';
        title = 'Promemoria - Evento oggi!';
        subject = `Reminder: ${cityName} oggi!`;
        message = `La tua esperienza immersiva a <strong>${cityName}</strong> si terrà oggi! Preparati per un'esperienza indimenticabile.`;
      } else if (hoursRemaining <= 24) {
        emoji = '🔔';
        title = 'Promemoria - Evento domani!';
        subject = `Reminder: ${cityName} domani!`;
        message = `Ti ricordiamo che domani avrai la tua esperienza immersiva a <strong>${cityName}</strong>. Ci vediamo presto!`;
      } else if (hoursRemaining <= 48) {
        emoji = '⏰';
        title = 'Promemoria - Evento tra 2 giorni!';
        subject = `Reminder: ${cityName} tra 2 giorni`;
        message = `Ti ricordiamo che la tua esperienza immersiva a <strong>${cityName}</strong> si terrà tra 2 giorni!`;
      } else if (hoursRemaining <= 72) {
        emoji = '⏰';
        title = 'Promemoria - Evento tra 3 giorni!';
        subject = `Reminder: ${cityName} tra 3 giorni`;
        message = `Ti ricordiamo che la tua esperienza immersiva a <strong>${cityName}</strong> si terrà tra 3 giorni!`;
      } else {
        const daysRemaining = Math.ceil(hoursRemaining / 24);
        emoji = '📅';
        title = `Promemoria - Evento tra ${daysRemaining} giorni!`;
        subject = `Reminder: ${cityName} tra ${daysRemaining} giorni`;
        message = `Ti ricordiamo che la tua esperienza immersiva a <strong>${cityName}</strong> si terrà tra ${daysRemaining} giorni!`;
      }
    } else {
      // Fallback for past or unknown
      emoji = '📧';
      title = 'Promemoria Evento';
      subject = `Reminder: ${cityName}`;
      message = `Ti ricordiamo la tua esperienza immersiva a <strong>${cityName}</strong>.`;
    }

    return { subject, title, message, emoji, hoursRemaining };
  };

  const handleSendCustomEmail = async () => {
    if (selectedBookings.length === 0) {
      alert('❌ Seleziona almeno una prenotazione');
      return;
    }

    if (!customEmailData.subject || !customEmailData.message) {
      alert('❌ Compila oggetto e messaggio');
      return;
    }

    if (!confirm(`Inviare email a ${selectedBookings.length} destinatari?`)) {
      return;
    }

    setSendingCustomEmail(true);

    try {
      const functions = getFunctions();
      const sendCustomReminder = httpsCallable(functions, 'sendCustomReminder');

      const result = await sendCustomReminder({
        bookingIds: selectedBookings,
        subject: customEmailData.subject,
        message: customEmailData.message,
        sentByEmail: currentUser.email
      });

      if (result.data.success) {
        alert(`✅ Email inviate con successo a ${result.data.sent} destinatari!`);

        // Reset form
        setSelectedBookings([]);
        setCustomEmailData({
          cityIds: [],
          eventDates: [],
          subject: '',
          message: ''
        });

        // Reload data
        await loadReminderHistory();
      } else {
        alert('❌ Errore nell\'invio: ' + result.data.error);
      }
    } catch (error) {
      console.error('Error sending custom email:', error);
      alert('❌ Errore nell\'invio: ' + error.message);
    } finally {
      setSendingCustomEmail(false);
    }
  };

  const handleTestReminder = async () => {
    if (!testEmail) {
      alert('Inserisci un indirizzo email');
      return;
    }

    setSendingTest(true);

    try {
      alert(`✅ Funzionalità di test reminder in sviluppo.`);
      setShowTestModal(false);
      setTestEmail('');
    } catch (error) {
      console.error('Error sending test reminder:', error);
      alert('❌ Errore durante l\'invio del test: ' + error.message);
    } finally {
      setSendingTest(false);
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

  const formatTimeUntil = (hours) => {
    if (hours < 1) {
      const minutes = Math.floor(hours * 60);
      return `${minutes} minuti`;
    } else if (hours < 24) {
      return `${Math.floor(hours)} ore`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.floor(hours % 24);
      return `${days}g ${remainingHours}h`;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateShort = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getReminderTypeLabel = (type) => {
    const labels = {
      confirmation: { label: 'Conferma', icon: '✅' },
      threeDaysBefore: { label: '3 giorni prima', icon: '⏰' },
      oneDayBefore: { label: '1 giorno prima', icon: '🔔' },
      oneHourBefore: { label: '1 ora prima', icon: '🚨' },
      custom: { label: 'Personalizzato', icon: '📧' }
    };
    return labels[type] || { label: type, icon: '📧' };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <FaBell className="text-primary text-3xl" />
              <div>
                <h1 className="text-2xl font-bold text-primary">Gestione Reminder</h1>
                <p className="text-sm text-gray-600">Dashboard, storico e invio personalizzato</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate('/admin/bookings')}
                className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Prenotazioni
              </button>
              <span className="text-sm text-gray-600">{currentUser?.email}</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                <FaSignOutAlt />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'dashboard'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <FaChartBar />
                Dashboard
              </div>
            </button>
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'scheduled'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <FaCalendarAlt />
                Programmati ({allScheduledReminders.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'history'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <FaHistory />
                Storico Completo
              </div>
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'custom'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <FaPaperPlane />
                Invio Personalizzato
              </div>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'settings'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <FaCog />
                Impostazioni
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-600">Caricamento...</div>
          </div>
        ) : (
          <>
            {/* DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
              <>
                {/* Stats Dashboard */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <FaChartBar className="text-primary text-xl" />
                    <h2 className="text-xl font-bold text-gray-800">Statistiche Reminder</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">✅ Conferma</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-green-600">{stats.confirmation.sent}</span>
                        <span className="text-sm text-gray-500">inviati</span>
                      </div>
                      <div className="mt-2 text-sm text-gray-500">
                        {stats.confirmation.pending} in attesa
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">⏰ 3 Giorni Prima</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-blue-600">{stats.threeDays.sent}</span>
                        <span className="text-sm text-gray-500">inviati</span>
                      </div>
                      <div className="mt-2 text-sm text-gray-500">
                        {stats.threeDays.pending} in attesa
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">🔔 1 Giorno Prima</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-yellow-600">{stats.oneDay.sent}</span>
                        <span className="text-sm text-gray-500">inviati</span>
                      </div>
                      <div className="mt-2 text-sm text-gray-500">
                        {stats.oneDay.pending} in attesa
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">🚨 1 Ora Prima</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-red-600">{stats.oneHour.sent}</span>
                        <span className="text-sm text-gray-500">inviati</span>
                      </div>
                      <div className="mt-2 text-sm text-gray-500">
                        {stats.oneHour.pending} in attesa
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upcoming Reminders */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <FaClock className="text-primary text-xl" />
                    <h2 className="text-xl font-bold text-gray-800">Prossimi Reminder Programmati</h2>
                    <span className="text-sm text-gray-500">({upcomingReminders.length})</span>
                  </div>

                  {upcomingReminders.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                      Nessun reminder programmato per eventi futuri
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Città</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Evento</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invio Programmato</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stato</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {upcomingReminders.map((reminder, index) => (
                              <tr
                                key={index}
                                className={`hover:bg-gray-100 cursor-pointer transition-colors ${reminder.isPending ? 'bg-orange-50' : ''}`}
                                onClick={() => setPreviewModal({ open: true, type: reminder.type, booking: reminder })}
                              >
                                <td className="px-6 py-4">
                                  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                                    reminder.type === 'threeDaysBefore' ? 'bg-blue-100 text-blue-800' :
                                    reminder.type === 'oneDayBefore' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {reminder.icon} {reminder.typeLabel}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-sm font-medium text-gray-900">{reminder.customerName}</div>
                                  <div className="text-sm text-gray-500">{reminder.customerEmail}</div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">{reminder.cityName}</td>
                                <td className="px-6 py-4">
                                  <div className="text-sm text-gray-900">{formatDateShort(reminder.eventDate)}</div>
                                  <div className="text-sm text-gray-500">{reminder.eventTime}</div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-sm text-gray-900">{formatDate(reminder.scheduledTime)}</div>
                                  {!reminder.isPending && (
                                    <div className="text-xs text-primary font-medium">
                                      Tra {formatTimeUntil(reminder.willBeSentIn)}
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  {reminder.isPending ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                                      <FaHourglassHalf /> In coda
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                      <FaClock /> Programmato
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* SCHEDULED TAB */}
            {activeTab === 'scheduled' && (
              <>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <FaCalendarAlt className="text-primary text-xl" />
                      <h2 className="text-xl font-bold text-gray-800">Tutti i Reminder Programmati</h2>
                      <span className="text-sm text-gray-500">({filteredScheduledReminders.length} reminder)</span>
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="bg-white rounded-lg shadow p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Filtra per Città</label>
                        <select
                          value={scheduledFilter.cityId}
                          onChange={(e) => setScheduledFilter({ ...scheduledFilter, cityId: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Tutte le città</option>
                          {cities.filter(c => c.status === 'available').map(city => (
                            <option key={city.id} value={city.id}>{city.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo Reminder</label>
                        <select
                          value={scheduledFilter.reminderType}
                          onChange={(e) => setScheduledFilter({ ...scheduledFilter, reminderType: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Tutti i tipi</option>
                          <option value="threeDaysBefore">⏰ 3 giorni prima</option>
                          <option value="oneDayBefore">🔔 1 giorno prima</option>
                          <option value="oneHourBefore">🚨 1 ora prima</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={() => setScheduledFilter({ cityId: '', reminderType: '' })}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                          Resetta Filtri
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Grouped by City */}
                  {Object.keys(groupedByCity).length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                      Nessun reminder programmato
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(groupedByCity).map(([cityName, reminders]) => (
                        <div key={cityName} className="bg-white rounded-lg shadow overflow-hidden">
                          <div className="bg-gradient-to-r from-primary to-secondary px-6 py-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                              📍 {cityName}
                              <span className="text-sm font-normal bg-white bg-opacity-20 px-2 py-1 rounded">
                                {reminders.length} reminder
                              </span>
                            </h3>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Evento</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invio Programmato</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stato</th>
                                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Anteprima</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {reminders.map((reminder, index) => (
                                  <tr key={`${reminder.bookingId}-${reminder.type}-${index}`} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                        reminder.type === 'threeDaysBefore' ? 'bg-blue-100 text-blue-800' :
                                        reminder.type === 'oneDayBefore' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-red-100 text-red-800'
                                      }`}>
                                        {reminder.icon} {reminder.typeLabel}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="text-sm font-medium text-gray-900">{reminder.customerName}</div>
                                      <div className="text-xs text-gray-500">{reminder.customerEmail}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="text-sm text-gray-900">{formatDateShort(reminder.eventDate)}</div>
                                      <div className="text-xs text-gray-500">{reminder.eventTime}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="text-sm text-gray-900">{formatDate(reminder.scheduledTime)}</div>
                                      {!reminder.isPast && (
                                        <div className="text-xs text-primary font-medium">
                                          Tra {formatTimeUntil(reminder.willBeSentIn)}
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-4 py-3">
                                      {reminder.isPast ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                                          <FaHourglassHalf /> In coda
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                          <FaClock /> Programmato
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <button
                                        onClick={() => setPreviewModal({ open: true, type: reminder.type, booking: reminder })}
                                        className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-white rounded-lg hover:bg-primary-dark text-xs"
                                      >
                                        <FaEye /> Anteprima
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* HISTORY TAB */}
            {activeTab === 'history' && (
              <>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <FaHistory className="text-primary text-xl" />
                      <h2 className="text-xl font-bold text-gray-800">Storico Reminder Inviati</h2>
                      <span className="text-sm text-gray-500">({filteredHistory.length} risultati)</span>
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <FaFilter className="text-primary" />
                      <h3 className="text-lg font-semibold text-gray-800">Filtri</h3>
                      {(historyFilters.cityId || historyFilters.dateFrom || historyFilters.dateTo || historyFilters.reminderType) && (
                        <button
                          onClick={clearHistoryFilters}
                          className="ml-auto flex items-center gap-2 px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                          <FaTimes />
                          Cancella Filtri
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Città</label>
                        <select
                          value={historyFilters.cityId}
                          onChange={(e) => setHistoryFilters({ ...historyFilters, cityId: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Tutte le città</option>
                          {cities.map(city => (
                            <option key={city.id} value={city.id}>{city.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Data Evento Da</label>
                        <input
                          type="date"
                          value={historyFilters.dateFrom}
                          onChange={(e) => setHistoryFilters({ ...historyFilters, dateFrom: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Data Evento A</label>
                        <input
                          type="date"
                          value={historyFilters.dateTo}
                          onChange={(e) => setHistoryFilters({ ...historyFilters, dateTo: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo Reminder</label>
                        <select
                          value={historyFilters.reminderType}
                          onChange={(e) => setHistoryFilters({ ...historyFilters, reminderType: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Tutti i tipi</option>
                          <option value="confirmation">✅ Conferma</option>
                          <option value="threeDaysBefore">⏰ 3 giorni prima</option>
                          <option value="oneDayBefore">🔔 1 giorno prima</option>
                          <option value="oneHourBefore">🚨 1 ora prima</option>
                          <option value="custom">📧 Personalizzato</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* History Table */}
                  {filteredHistory.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                      Nessun reminder trovato con i filtri selezionati
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Città</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Evento</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inviato il</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Origine</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredHistory.map((log) => {
                              const typeInfo = getReminderTypeLabel(log.reminderType);
                              return (
                                <tr
                                  key={log.id}
                                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                                  onClick={() => setPreviewModal({
                                    open: true,
                                    type: log.reminderType,
                                    booking: {
                                      ...log,
                                      icon: typeInfo.icon,
                                      typeLabel: typeInfo.label,
                                      isPending: false,
                                      isHistorical: true
                                    }
                                  })}
                                >
                                  <td className="px-6 py-4">
                                    <span className="inline-flex items-center gap-2 text-sm font-medium">
                                      {typeInfo.icon} {typeInfo.label}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-gray-900">{log.customerName}</div>
                                    <div className="text-sm text-gray-500">{log.customerEmail}</div>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-900">{log.cityName}</td>
                                  <td className="px-6 py-4 text-sm text-gray-500">{formatDateShort(log.eventDate)}</td>
                                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(log.sentAt)}</td>
                                  <td className="px-6 py-4">
                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                      log.sentBy === 'auto'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-purple-100 text-purple-800'
                                    }`}>
                                      {log.sentBy === 'auto' ? 'Automatico' : 'Manuale'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* CUSTOM EMAIL TAB */}
            {activeTab === 'custom' && (
              <>
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FaPaperPlane className="text-primary text-xl" />
                    <h2 className="text-xl font-bold text-gray-800">Invio Email Personalizzato</h2>
                  </div>

                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                    <div className="flex items-start gap-2">
                      <FaExclamationTriangle className="text-blue-600 mt-1" />
                      <div className="text-sm text-blue-700">
                        <p className="font-semibold mb-1">Seleziona i destinatari filtrando per città e/o data evento</p>
                        <p>Puoi inviare email personalizzate a specifici gruppi di prenotazioni.</p>
                      </div>
                    </div>
                  </div>

                  {/* Filters for selecting users */}
                  <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <FaSearch className="text-primary" />
                      Filtra Destinatari
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      {/* Cities Selection */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-sm font-medium text-gray-700">
                            Città ({customEmailData.cityIds.length} selezionate)
                          </label>
                          <div className="flex gap-2">
                            <button
                              onClick={selectAllCities}
                              className="text-xs px-2 py-1 bg-primary text-white rounded hover:bg-primary-dark"
                            >
                              Tutte
                            </button>
                            <button
                              onClick={deselectAllCities}
                              className="text-xs px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                            >
                              Nessuna
                            </button>
                          </div>
                        </div>
                        <div className="border border-gray-300 rounded-lg max-h-60 overflow-y-auto">
                          {cities.map(city => (
                            <div
                              key={city.id}
                              onClick={() => toggleCitySelection(city.id)}
                              className={`p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${
                                customEmailData.cityIds.includes(city.id) ? 'bg-blue-50' : ''
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={customEmailData.cityIds.includes(city.id)}
                                  onChange={() => {}}
                                  className="w-4 h-4 text-primary"
                                />
                                <span className="text-sm font-medium text-gray-800">{city.name}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Dates Selection */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-sm font-medium text-gray-700">
                            Date Evento ({customEmailData.eventDates.length} selezionate)
                          </label>
                          <div className="flex gap-2">
                            <button
                              onClick={selectAllDates}
                              className="text-xs px-2 py-1 bg-primary text-white rounded hover:bg-primary-dark"
                            >
                              Tutte
                            </button>
                            <button
                              onClick={deselectAllDates}
                              className="text-xs px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                            >
                              Nessuna
                            </button>
                          </div>
                        </div>
                        <div className="border border-gray-300 rounded-lg max-h-60 overflow-y-auto">
                          {availableDates.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">
                              Nessuna data disponibile
                            </div>
                          ) : (
                            availableDates.map(date => (
                              <div
                                key={date}
                                onClick={() => toggleDateSelection(date)}
                                className={`p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${
                                  customEmailData.eventDates.includes(date) ? 'bg-blue-50' : ''
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={customEmailData.eventDates.includes(date)}
                                    onChange={() => {}}
                                    className="w-4 h-4 text-primary"
                                  />
                                  <span className="text-sm font-medium text-gray-800">{formatDateShort(date)}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Available Bookings */}
                    {(customEmailData.cityIds.length > 0 || customEmailData.eventDates.length > 0) && (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-md font-semibold text-gray-800">
                            Prenotazioni Trovate ({availableBookings.length})
                          </h4>
                          <div className="flex gap-2">
                            <button
                              onClick={selectAllBookings}
                              className="px-3 py-1 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark"
                            >
                              Seleziona Tutti
                            </button>
                            <button
                              onClick={deselectAllBookings}
                              className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                            >
                              Deseleziona Tutti
                            </button>
                          </div>
                        </div>

                        {availableBookings.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            Nessuna prenotazione trovata con i filtri selezionati
                          </div>
                        ) : (
                          <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                            {availableBookings.map(booking => (
                              <div
                                key={booking.id}
                                className={`p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${
                                  selectedBookings.includes(booking.id) ? 'bg-blue-50' : ''
                                }`}
                                onClick={() => toggleBookingSelection(booking.id)}
                              >
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={selectedBookings.includes(booking.id)}
                                    onChange={() => {}}
                                    className="w-5 h-5 text-primary"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                      <FaUser className="text-gray-400" />
                                      <div>
                                        <div className="text-sm font-medium text-gray-900">{booking.name}</div>
                                        <div className="text-sm text-gray-500">{booking.email}</div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-medium text-gray-900">{booking.cityName}</div>
                                    <div className="text-sm text-gray-500">{formatDateShort(booking.date)}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Email Content */}
                  {selectedBookings.length > 0 && (
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <FaEnvelope className="text-primary" />
                        Contenuto Email ({selectedBookings.length} destinatari)
                      </h3>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Oggetto</label>
                          <input
                            type="text"
                            value={customEmailData.subject}
                            onChange={(e) => setCustomEmailData({ ...customEmailData, subject: e.target.value })}
                            placeholder="Es: Aggiornamento importante per la tua esperienza"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Messaggio</label>
                          <textarea
                            value={customEmailData.message}
                            onChange={(e) => setCustomEmailData({ ...customEmailData, message: e.target.value })}
                            rows={8}
                            placeholder="Scrivi il messaggio dell'email..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                          />
                          <p className="text-xs text-gray-500 mt-2">
                            Puoi usare HTML per formattare il testo (es: &lt;strong&gt;, &lt;br&gt;, &lt;a href=""&gt;)
                          </p>
                        </div>

                        <div className="flex justify-end gap-4 pt-4">
                          <button
                            onClick={() => {
                              setSelectedBookings([]);
                              setCustomEmailData({
                                cityIds: [],
                                eventDates: [],
                                subject: '',
                                message: ''
                              });
                            }}
                            className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                          >
                            Annulla
                          </button>
                          <button
                            onClick={handleSendCustomEmail}
                            disabled={sendingCustomEmail || !customEmailData.subject || !customEmailData.message}
                            className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {sendingCustomEmail ? (
                              <>
                                <span className="animate-spin">⏳</span>
                                Invio in corso...
                              </>
                            ) : (
                              <>
                                <FaPaperPlane />
                                Invia a {selectedBookings.length} {selectedBookings.length === 1 ? 'persona' : 'persone'}
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* SETTINGS TAB */}
            {activeTab === 'settings' && settings && (
              <>
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <FaCog className="text-primary text-xl" />
                      <h2 className="text-xl font-bold text-gray-800">Impostazioni Reminder</h2>
                    </div>
                    <button
                      onClick={saveSettings}
                      disabled={savingSettings}
                      className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                    >
                      {savingSettings ? (
                        <>
                          <span className="animate-spin">⏳</span>
                          Salvataggio...
                        </>
                      ) : (
                        <>
                          <FaSave />
                          Salva Impostazioni
                        </>
                      )}
                    </button>
                  </div>

                  {/* Timing Settings */}
                  <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Timing dei Reminder</h3>
                    <p className="text-sm text-gray-600 mb-6">
                      Configura quando ogni reminder deve essere inviato (ore prima dell'evento)
                    </p>

                    <div className="space-y-6">
                      {/* 3 Days Before */}
                      <div className="border-l-4 border-blue-500 pl-4">
                        <div className="flex items-center gap-3 mb-3">
                          <input
                            type="checkbox"
                            checked={settings.timing.threeDaysBefore.enabled}
                            onChange={(e) => setSettings({
                              ...settings,
                              timing: {
                                ...settings.timing,
                                threeDaysBefore: { ...settings.timing.threeDaysBefore, enabled: e.target.checked }
                              }
                            })}
                            className="w-5 h-5 text-primary"
                          />
                          <label className="text-lg font-medium text-gray-800">⏰ {settings.timing.threeDaysBefore.label}</label>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="text-sm text-gray-600">Invia</label>
                          <input
                            type="number"
                            value={settings.timing.threeDaysBefore.hoursBeforeEvent}
                            onChange={(e) => setSettings({
                              ...settings,
                              timing: {
                                ...settings.timing,
                                threeDaysBefore: { ...settings.timing.threeDaysBefore, hoursBeforeEvent: parseInt(e.target.value) }
                              }
                            })}
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                            min="1"
                          />
                          <label className="text-sm text-gray-600">ore prima dell'evento</label>
                        </div>
                      </div>

                      {/* 1 Day Before */}
                      <div className="border-l-4 border-yellow-500 pl-4">
                        <div className="flex items-center gap-3 mb-3">
                          <input
                            type="checkbox"
                            checked={settings.timing.oneDayBefore.enabled}
                            onChange={(e) => setSettings({
                              ...settings,
                              timing: {
                                ...settings.timing,
                                oneDayBefore: { ...settings.timing.oneDayBefore, enabled: e.target.checked }
                              }
                            })}
                            className="w-5 h-5 text-primary"
                          />
                          <label className="text-lg font-medium text-gray-800">🔔 {settings.timing.oneDayBefore.label}</label>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="text-sm text-gray-600">Invia</label>
                          <input
                            type="number"
                            value={settings.timing.oneDayBefore.hoursBeforeEvent}
                            onChange={(e) => setSettings({
                              ...settings,
                              timing: {
                                ...settings.timing,
                                oneDayBefore: { ...settings.timing.oneDayBefore, hoursBeforeEvent: parseInt(e.target.value) }
                              }
                            })}
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                            min="1"
                          />
                          <label className="text-sm text-gray-600">ore prima dell'evento</label>
                        </div>
                      </div>

                      {/* 1 Hour Before */}
                      <div className="border-l-4 border-red-500 pl-4">
                        <div className="flex items-center gap-3 mb-3">
                          <input
                            type="checkbox"
                            checked={settings.timing.oneHourBefore.enabled}
                            onChange={(e) => setSettings({
                              ...settings,
                              timing: {
                                ...settings.timing,
                                oneHourBefore: { ...settings.timing.oneHourBefore, enabled: e.target.checked }
                              }
                            })}
                            className="w-5 h-5 text-primary"
                          />
                          <label className="text-lg font-medium text-gray-800">🚨 {settings.timing.oneHourBefore.label}</label>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="text-sm text-gray-600">Invia</label>
                          <input
                            type="number"
                            value={settings.timing.oneHourBefore.hoursBeforeEvent}
                            onChange={(e) => setSettings({
                              ...settings,
                              timing: {
                                ...settings.timing,
                                oneHourBefore: { ...settings.timing.oneHourBefore, hoursBeforeEvent: parseFloat(e.target.value) }
                              }
                            })}
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                            min="0.5"
                            step="0.5"
                          />
                          <label className="text-sm text-gray-600">ore prima dell'evento</label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Template Settings */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Template Email</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Personalizza il contenuto delle email per ogni tipo di reminder
                    </p>

                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                      <div className="flex items-start gap-2">
                        <FaExclamationTriangle className="text-blue-600 mt-1" />
                        <div className="text-sm text-blue-700">
                          <p className="font-semibold mb-1">Variabili disponibili:</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li><code className="bg-blue-100 px-1">{'{cityName}'}</code> - Nome della città</li>
                            <li><code className="bg-blue-100 px-1">{'{customerName}'}</code> - Nome del cliente</li>
                            <li><code className="bg-blue-100 px-1">{'{eventDate}'}</code> - Data dell'evento</li>
                            <li><code className="bg-blue-100 px-1">{'{eventTime}'}</code> - Orario dell'evento</li>
                            <li><code className="bg-blue-100 px-1">{'{locationName}'}</code> - Nome location</li>
                            <li><code className="bg-blue-100 px-1">{'{locationAddress}'}</code> - Indirizzo</li>
                            <li><code className="bg-blue-100 px-1">{'{spots}'}</code> - Numero posti</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-8">
                      {/* 3 Days Before Template */}
                      <div className="border-t pt-6">
                        <h4 className="font-medium text-gray-800 mb-4">⏰ Reminder 3 Giorni Prima</h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Oggetto Email</label>
                            <input
                              type="text"
                              value={settings.templates.threeDaysBefore.subject}
                              onChange={(e) => setSettings({
                                ...settings,
                                templates: {
                                  ...settings.templates,
                                  threeDaysBefore: { ...settings.templates.threeDaysBefore, subject: e.target.value }
                                }
                              })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Titolo nel Template</label>
                            <input
                              type="text"
                              value={settings.templates.threeDaysBefore.title}
                              onChange={(e) => setSettings({
                                ...settings,
                                templates: {
                                  ...settings.templates,
                                  threeDaysBefore: { ...settings.templates.threeDaysBefore, title: e.target.value }
                                }
                              })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Messaggio</label>
                            <textarea
                              value={settings.templates.threeDaysBefore.message}
                              onChange={(e) => setSettings({
                                ...settings,
                                templates: {
                                  ...settings.templates,
                                  threeDaysBefore: { ...settings.templates.threeDaysBefore, message: e.target.value }
                                }
                              })}
                              rows={3}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 1 Day Before Template */}
                      <div className="border-t pt-6">
                        <h4 className="font-medium text-gray-800 mb-4">🔔 Reminder 1 Giorno Prima</h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Oggetto Email</label>
                            <input
                              type="text"
                              value={settings.templates.oneDayBefore.subject}
                              onChange={(e) => setSettings({
                                ...settings,
                                templates: {
                                  ...settings.templates,
                                  oneDayBefore: { ...settings.templates.oneDayBefore, subject: e.target.value }
                                }
                              })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Titolo nel Template</label>
                            <input
                              type="text"
                              value={settings.templates.oneDayBefore.title}
                              onChange={(e) => setSettings({
                                ...settings,
                                templates: {
                                  ...settings.templates,
                                  oneDayBefore: { ...settings.templates.oneDayBefore, title: e.target.value }
                                }
                              })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Messaggio</label>
                            <textarea
                              value={settings.templates.oneDayBefore.message}
                              onChange={(e) => setSettings({
                                ...settings,
                                templates: {
                                  ...settings.templates,
                                  oneDayBefore: { ...settings.templates.oneDayBefore, message: e.target.value }
                                }
                              })}
                              rows={3}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 1 Hour Before Template */}
                      <div className="border-t pt-6">
                        <h4 className="font-medium text-gray-800 mb-4">🚨 Reminder 1 Ora Prima</h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Oggetto Email</label>
                            <input
                              type="text"
                              value={settings.templates.oneHourBefore.subject}
                              onChange={(e) => setSettings({
                                ...settings,
                                templates: {
                                  ...settings.templates,
                                  oneHourBefore: { ...settings.templates.oneHourBefore, subject: e.target.value }
                                }
                              })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Titolo nel Template</label>
                            <input
                              type="text"
                              value={settings.templates.oneHourBefore.title}
                              onChange={(e) => setSettings({
                                ...settings,
                                templates: {
                                  ...settings.templates,
                                  oneHourBefore: { ...settings.templates.oneHourBefore, title: e.target.value }
                                }
                              })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Messaggio</label>
                            <textarea
                              value={settings.templates.oneHourBefore.message}
                              onChange={(e) => setSettings({
                                ...settings,
                                templates: {
                                  ...settings.templates,
                                  oneHourBefore: { ...settings.templates.oneHourBefore, message: e.target.value }
                                }
                              })}
                              rows={3}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Email Preview Modal */}
      {previewModal.open && previewModal.booking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
              <div>
                <h3 className="text-xl font-bold text-primary">Dettaglio Reminder</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {previewModal.booking.icon} {previewModal.booking.typeLabel} - {previewModal.booking.customerName}
                </p>
              </div>
              <button
                onClick={() => setPreviewModal({ open: false, type: null, booking: null })}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {(() => {
                const preview = generateEmailPreview(previewModal.booking);

                const formatDatePreview = (dateString) => {
                  if (!dateString) return '';
                  const date = new Date(dateString);
                  return date.toLocaleDateString('it-IT', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  });
                };

                const formatDateTime = (date) => {
                  if (!date) return '';
                  const d = date instanceof Date ? date : new Date(date);
                  return d.toLocaleString('it-IT', {
                    weekday: 'short',
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                };

                return (
                  <div className="space-y-6">
                    {/* Reminder Info Card */}
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border">
                      <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <FaEnvelope className="text-primary" />
                        Informazioni Reminder
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Tipo:</span>
                          <span className={`ml-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            previewModal.type === 'threeDaysBefore' ? 'bg-blue-100 text-blue-800' :
                            previewModal.type === 'oneDayBefore' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {previewModal.booking.icon} {previewModal.booking.typeLabel}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Stato:</span>
                          {previewModal.booking.isPending ? (
                            <span className="ml-2 inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                              <FaHourglassHalf /> In coda (da inviare)
                            </span>
                          ) : previewModal.booking.sentAt ? (
                            <span className="ml-2 inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                              <FaCheckCircle /> Inviato
                            </span>
                          ) : (
                            <span className="ml-2 inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                              <FaClock /> Programmato
                            </span>
                          )}
                        </div>
                        {previewModal.booking.scheduledTime && (
                          <div>
                            <span className="text-gray-600">Invio programmato:</span>
                            <span className="ml-2 font-medium">{formatDateTime(previewModal.booking.scheduledTime)}</span>
                          </div>
                        )}
                        {previewModal.booking.sentAt && (
                          <div>
                            <span className="text-gray-600">Inviato il:</span>
                            <span className="ml-2 font-medium">{formatDateTime(previewModal.booking.sentAt?.toDate?.() || previewModal.booking.sentAt)}</span>
                          </div>
                        )}
                        {previewModal.booking.willBeSentIn !== undefined && previewModal.booking.willBeSentIn > 0 && (
                          <div>
                            <span className="text-gray-600">Tempo all'invio:</span>
                            <span className="ml-2 font-medium text-primary">{formatTimeUntil(previewModal.booking.willBeSentIn)}</span>
                          </div>
                        )}
                        {preview.hoursRemaining && preview.hoursRemaining > 0 && (
                          <div>
                            <span className="text-gray-600">Ore all'evento:</span>
                            <span className="ml-2 font-medium">{preview.hoursRemaining.toFixed(1)}h</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Email Header Info */}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2 border">
                      <h4 className="font-bold text-gray-800 mb-2">
                        {previewModal.booking.isHistorical ? '📧 Email inviata' : '📧 Email che verrà inviata'}
                      </h4>
                      <div className="flex items-start gap-2">
                        <span className="text-sm font-medium text-gray-600 w-20">A:</span>
                        <span className="text-sm text-gray-900">{previewModal.booking.customerEmail}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-sm font-medium text-gray-600 w-20">Oggetto:</span>
                        <span className="text-sm text-gray-900 font-medium">{preview.subject}</span>
                      </div>
                    </div>

                    {/* Email Preview */}
                    <div className="border border-gray-300 rounded-lg overflow-hidden shadow-md">
                      {/* Email Header */}
                      <div className="bg-gradient-to-r from-primary to-secondary text-white p-6 text-center">
                        <div className="text-5xl mb-3">{preview.emoji}</div>
                        <h1 className="text-2xl font-bold">{preview.title}</h1>
                      </div>

                      {/* Email Body */}
                      <div className="p-6 bg-white">
                        <p className="text-gray-800 mb-4">
                          Ciao <strong>{previewModal.booking.customerName}</strong>,
                        </p>
                        <p className="text-gray-800 mb-6" dangerouslySetInnerHTML={{ __html: preview.message }} />

                        {/* Booking Details Box */}
                        <div className="bg-gray-50 border-l-4 border-primary p-4 rounded-r-lg mb-6">
                          <h3 className="font-bold text-primary mb-3">📋 Dettagli Prenotazione</h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex">
                              <span className="text-gray-600 w-32">🏛️ Evento:</span>
                              <span className="font-medium">{previewModal.booking.cityName}</span>
                            </div>
                            <div className="flex">
                              <span className="text-gray-600 w-32">📅 Data:</span>
                              <span className="font-medium">{formatDatePreview(previewModal.booking.eventDate)}</span>
                            </div>
                            <div className="flex">
                              <span className="text-gray-600 w-32">🕐 Orario:</span>
                              <span className="font-medium">{previewModal.booking.eventTime || 'N/A'}</span>
                            </div>
                            {previewModal.booking.locationName && (
                              <div className="flex">
                                <span className="text-gray-600 w-32">📍 Luogo:</span>
                                <span className="font-medium">
                                  {previewModal.booking.locationName}
                                  {previewModal.booking.locationAddress && (
                                    <span className="text-gray-500 block text-xs">{previewModal.booking.locationAddress}</span>
                                  )}
                                </span>
                              </div>
                            )}
                            <div className="flex">
                              <span className="text-gray-600 w-32">👥 Posti:</span>
                              <span className="font-medium">{previewModal.booking.spots || 1}</span>
                            </div>
                            <div className="flex">
                              <span className="text-gray-600 w-32">📧 Email:</span>
                              <span className="font-medium">{previewModal.booking.customerEmail}</span>
                            </div>
                            <div className="flex">
                              <span className="text-gray-600 w-32">📱 WhatsApp:</span>
                              <span className="font-medium">{previewModal.booking.whatsapp || 'Non fornito'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Important Notice */}
                        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-6">
                          <p className="text-yellow-800 text-sm">
                            <strong>⚠️ Importante:</strong> Ti consigliamo di presentarti sul luogo dell'evento <strong>almeno 10 minuti prima</strong> dell'orario indicato.
                          </p>
                        </div>

                        <div className="text-center space-x-3">
                          <span className="inline-block px-6 py-3 bg-primary text-white rounded-lg font-medium">
                            Gestisci Prenotazione
                          </span>
                          <span className="inline-block px-6 py-3 bg-red-500 text-white rounded-lg font-medium">
                            Annulla Prenotazione
                          </span>
                        </div>
                      </div>

                      {/* Email Footer */}
                      <div className="bg-gray-100 p-4 text-center text-sm text-gray-600">
                        <p className="font-medium">Cultura Immersiva</p>
                        <p>Esperienze in Realtà Virtuale nelle Città Italiane</p>
                        <p className="mt-2">
                          Hai bisogno di aiuto?{' '}
                          <span className="text-primary font-medium">Contattaci su WhatsApp</span>
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-between items-center pt-4 border-t">
                      <p className="text-sm text-gray-500">
                        Puoi modificare questo template nella sezione <strong>Impostazioni</strong>
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setPreviewModal({ open: false, type: null, booking: null });
                            setActiveTab('settings');
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                          Modifica Template
                        </button>
                        <button
                          onClick={() => setPreviewModal({ open: false, type: null, booking: null })}
                          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
                        >
                          Chiudi
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Test Reminder Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-xl font-bold text-primary">Test Reminder</h3>
              <p className="text-sm text-gray-600 mt-1">Invia un reminder di prova alla tua email</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Destinatario
                </label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="tua@email.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo di Reminder
                </label>
                <select
                  value={testType}
                  onChange={(e) => setTestType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                >
                  <option value="confirmation">✅ Conferma Prenotazione</option>
                  <option value="threeDaysBefore">⏰ Reminder 3 giorni prima</option>
                  <option value="oneDayBefore">🔔 Reminder 1 giorno prima</option>
                  <option value="oneHourBefore">🚨 Reminder 1 ora prima</option>
                </select>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex items-start gap-2">
                  <FaExclamationTriangle className="text-yellow-600 mt-1" />
                  <div className="text-sm text-yellow-700">
                    <p className="font-semibold">Nota:</p>
                    <p>Il reminder di test utilizzerà dati fittizi per simulare l'invio reale.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowTestModal(false);
                  setTestEmail('');
                }}
                disabled={sendingTest}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                onClick={handleTestReminder}
                disabled={sendingTest}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 flex items-center gap-2"
              >
                {sendingTest ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Invio...
                  </>
                ) : (
                  <>
                    <FaEnvelope />
                    Invia Test
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

export default Reminders;
