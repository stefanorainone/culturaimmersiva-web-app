import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { collection, getDocs, query, orderBy, where, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { FaBell, FaSignOutAlt, FaChartBar, FaClock, FaHistory, FaEnvelope, FaCheckCircle, FaHourglassHalf, FaExclamationTriangle, FaCog, FaSave } from 'react-icons/fa';

const Reminders = () => {
  const [bookings, setBookings] = useState([]);
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
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testType, setTestType] = useState('threeDaysBefore');
  const [sendingTest, setSendingTest] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'settings'
  const [settings, setSettings] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
    loadSettings();
  }, []);

  const loadData = async () => {
    try {
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('status', '==', 'confirmed'),
        orderBy('date', 'asc')
      );
      const snapshot = await getDocs(bookingsQuery);
      const bookingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setBookings(bookingsData);
      calculateStats(bookingsData);
      calculateUpcomingReminders(bookingsData);
      calculateHistory(bookingsData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'reminders'));

      if (settingsDoc.exists()) {
        setSettings(settingsDoc.data());
      } else {
        // Initialize with defaults if not exists
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

      // Confirmation
      if (reminders.confirmation?.sent) stats.confirmation.sent++;
      else stats.confirmation.pending++;

      // 3 days before
      if (reminders.threeDaysBefore?.sent) stats.threeDays.sent++;
      else stats.threeDays.pending++;

      // 1 day before
      if (reminders.oneDayBefore?.sent) stats.oneDay.sent++;
      else stats.oneDay.pending++;

      // 1 hour before
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

      const hoursUntilEvent = (eventDate - now) / (1000 * 60 * 60);
      const reminders = booking.reminders || {};

      // Check each reminder type
      if (hoursUntilEvent <= 72 && hoursUntilEvent > 0 && !reminders.threeDaysBefore?.sent) {
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
          willBeSentIn: Math.max(0, hoursUntilEvent - 72),
          scheduledTime: new Date(eventDate.getTime() - 72 * 60 * 60 * 1000)
        });
      }

      if (hoursUntilEvent <= 24 && hoursUntilEvent > 0 && !reminders.oneDayBefore?.sent) {
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
          willBeSentIn: Math.max(0, hoursUntilEvent - 24),
          scheduledTime: new Date(eventDate.getTime() - 24 * 60 * 60 * 1000)
        });
      }

      if (hoursUntilEvent <= 1 && hoursUntilEvent > 0 && !reminders.oneHourBefore?.sent) {
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
          willBeSentIn: Math.max(0, hoursUntilEvent - 1),
          scheduledTime: new Date(eventDate.getTime() - 1 * 60 * 60 * 1000)
        });
      }
    });

    // Sort by scheduled time
    upcoming.sort((a, b) => a.scheduledTime - b.scheduledTime);
    setUpcomingReminders(upcoming.slice(0, 20)); // Show max 20
  };

  const calculateHistory = (bookingsData) => {
    const history = [];

    bookingsData.forEach(booking => {
      const reminders = booking.reminders || {};

      Object.entries(reminders).forEach(([type, data]) => {
        if (data.sent && data.sentAt) {
          let typeLabel, icon;
          switch(type) {
            case 'confirmation':
              typeLabel = 'Conferma';
              icon = '✅';
              break;
            case 'threeDaysBefore':
              typeLabel = '3 giorni prima';
              icon = '⏰';
              break;
            case 'oneDayBefore':
              typeLabel = '1 giorno prima';
              icon = '🔔';
              break;
            case 'oneHourBefore':
              typeLabel = '1 ora prima';
              icon = '🚨';
              break;
            default:
              typeLabel = type;
              icon = '📧';
          }

          history.push({
            bookingId: booking.id,
            customerName: booking.name,
            customerEmail: booking.email,
            cityName: booking.cityName,
            eventDate: booking.date,
            type,
            typeLabel,
            icon,
            sentAt: data.sentAt
          });
        }
      });
    });

    // Sort by sent date (most recent first)
    history.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
    setReminderHistory(history.slice(0, 50)); // Show max 50
  };

  const handleTestReminder = async () => {
    if (!testEmail) {
      alert('Inserisci un indirizzo email');
      return;
    }

    setSendingTest(true);

    try {
      // Create a test booking object
      const testBooking = {
        id: 'test-' + Date.now(),
        name: 'Test User',
        email: testEmail,
        cityName: 'Test City',
        locationName: 'Test Location',
        locationAddress: 'Via Test 123, Test City',
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        time: '15:00',
        spots: 2,
        token: 'test-token'
      };

      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      const sendManualReminders = httpsCallable(functions, 'sendManualReminders');

      // For test, we'll just send to the test email directly via a simpler method
      alert(`✅ Funzionalità di test reminder in sviluppo. Per ora puoi:\n1. Creare una prenotazione di test\n2. Selezionarla nella pagina Prenotazioni\n3. Inviare un reminder manuale`);

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
                <p className="text-sm text-gray-600">Dashboard e monitoraggio reminder automatici</p>
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
            {activeTab === 'dashboard' && (
              <>
                {/* Stats Dashboard */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <FaChartBar className="text-primary text-xl" />
                <h2 className="text-xl font-bold text-gray-800">Statistiche Reminder</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Confirmation */}
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

                {/* 3 Days */}
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

                {/* 1 Day */}
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

                {/* 1 Hour */}
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

            {/* Test Reminder Button */}
            <div className="mb-8 flex justify-end">
              <button
                onClick={() => setShowTestModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-secondary text-white rounded-lg hover:bg-secondary-dark shadow-lg transition-all"
              >
                <FaEnvelope />
                Test Reminder / Anteprima Email
              </button>
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
                  Nessun reminder programmato nelle prossime 72 ore
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
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sarà Inviato</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {upcomingReminders.map((reminder, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                {reminder.icon} {reminder.typeLabel}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">{reminder.customerName}</div>
                              <div className="text-sm text-gray-500">{reminder.customerEmail}</div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">{reminder.cityName}</td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">{formatDate(reminder.eventDate)}</div>
                              <div className="text-sm text-gray-500">{reminder.eventTime}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-primary">
                                {reminder.willBeSentIn < 1 ? 'Entro 1 ora' : `Tra ${formatTimeUntil(reminder.willBeSentIn)}`}
                              </div>
                              <div className="text-xs text-gray-500">{formatDate(reminder.scheduledTime)}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Reminder History */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <FaHistory className="text-primary text-xl" />
                <h2 className="text-xl font-bold text-gray-800">Cronologia Invii</h2>
                <span className="text-sm text-gray-500">(ultimi 50)</span>
              </div>

              {reminderHistory.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                  Nessun reminder inviato ancora
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
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Stato</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reminderHistory.map((log, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-2 text-sm font-medium">
                                {log.icon} {log.typeLabel}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">{log.customerName}</div>
                              <div className="text-sm text-gray-500">{log.customerEmail}</div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">{log.cityName}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{formatDate(log.eventDate)}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{formatDate(log.sentAt)}</td>
                            <td className="px-6 py-4 text-center">
                              <FaCheckCircle className="inline text-green-500 text-xl" title="Inviato con successo" />
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

            {activeTab === 'settings' && settings && (
              <>
                {/* Settings Section */}
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
