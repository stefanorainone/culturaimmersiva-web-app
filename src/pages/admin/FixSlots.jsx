import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FaSignOutAlt, FaWrench, FaCheckCircle } from 'react-icons/fa';

const FixSlots = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [errors, setErrors] = useState([]);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const fixSlotsConsistency = async () => {
    setLoading(true);
    setResults(null);
    setErrors([]);

    try {
      console.log('🔍 Chiamata Cloud Function per verificare e correggere slot...');

      // Chiama la Cloud Function che fa tutto lato server
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      const fixSlots = httpsCallable(functions, 'fixSlotsConsistency');

      const result = await fixSlots({});

      if (result.data.success) {
        console.log(`✅ Analisi completata: ${result.data.corrected} slot corretti`);

        setResults({
          total: result.data.total,
          alreadyCorrect: result.data.alreadyCorrect,
          corrected: result.data.corrected,
          inconsistencies: result.data.inconsistencies || []
        });
      } else {
        throw new Error('Errore nella correzione degli slot');
      }

    } catch (error) {
      console.error('❌ Errore:', error);
      alert('Errore durante la correzione: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const debugAnconaSlot = async () => {
    setLoading(true);

    try {
      console.log('🔍 Debug slot Ancona...');

      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      const debugAncona = httpsCallable(functions, 'debugAnconaSlot');

      const result = await debugAncona({});

      console.log('📊 Debug result:', result.data);

      if (result.data.success) {
        // Format the output nicely
        let message = `🔍 Analisi Slot Ancona\n\n`;
        message += `CityId trovato: "${result.data.foundCityId}"\n`;
        message += `Slot totali: ${result.data.totalSlots}\n`;
        message += `Prenotazioni totali: ${result.data.totalBookings}\n\n`;

        message += `SLOT:\n`;
        result.data.slots.forEach(slot => {
          message += `\n📍 ${slot.date} - ${slot.time}\n`;
          message += `   ID: ${slot.slotId}\n`;
          message += `   Total: ${slot.totalSpots} | Booked: ${slot.bookedSpots} | Available: ${slot.availableSpots}\n`;
          message += `   Real bookings: ${slot.bookingsCount} (${slot.actualBookedSpots} spots)\n`;
          message += `   ${slot.isConsistent ? '✅ CONSISTENTE' : '❌ INCONSISTENTE'}\n`;
          if (slot.bookings && slot.bookings.length > 0) {
            message += `   Prenotazioni:\n`;
            slot.bookings.forEach(b => {
              message += `     - ${b.name} (${b.email}): ${b.spots} spot\n`;
            });
          }
        });

        alert(message);
      } else {
        alert(`❌ ${result.data.error}\nVarianti provate: ${result.data.triedVariations?.join(', ')}`);
      }

    } catch (error) {
      console.error('❌ Errore:', error);
      alert('Errore durante il debug: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fixAnconaSlot = async () => {
    setLoading(true);

    try {
      console.log('🔧 Correzione manuale slot Ancona 10:30...');

      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      const fixAncona = httpsCallable(functions, 'fixAnconaSlot');

      const result = await fixAncona({});

      if (result.data.success) {
        alert(`✅ Slot Ancona corretto!\n\nCityId: ${result.data.cityId}\nData: ${result.data.date}\nOra: ${result.data.time}\n\nPosti prenotati: ${result.data.oldBooked} → ${result.data.newBooked}\nPosti disponibili: ${result.data.oldAvailable} → ${result.data.newAvailable}`);
        console.log('Slot Ancona corretto:', result.data);
      } else {
        throw new Error('Errore nella correzione dello slot');
      }

    } catch (error) {
      console.error('❌ Errore:', error);
      alert('Errore durante la correzione: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <FaWrench className="text-primary text-3xl" />
              <div>
                <h1 className="text-2xl font-bold text-primary">Correggi Posti Disponibili</h1>
                <p className="text-sm text-gray-600">Ripara inconsistenze tra slot e prenotazioni</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Torna al Dashboard
              </button>
              <span className="text-sm text-gray-600">{currentUser?.email}</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <FaSignOutAlt />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">ℹ️ Come funziona</h2>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>• Verifica tutti gli slot e confronta i posti prenotati con le prenotazioni reali</li>
            <li>• Trova inconsistenze causate da prenotazioni cancellate manualmente</li>
            <li>• Corregge automaticamente i posti disponibili negli slot</li>
            <li>• Mostra un report dettagliato delle correzioni effettuate</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="text-center mb-8 space-y-4">
          <button
            onClick={fixSlotsConsistency}
            disabled={loading}
            className="px-8 py-4 text-lg font-bold bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
          >
            {loading ? '🔄 Verifica in corso...' : '🔧 Verifica e Correggi Tutti gli Slot'}
          </button>

          <div className="pt-4 border-t">
            <p className="text-sm text-gray-600 mb-3">Strumenti debug e correzione Ancona:</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={debugAnconaSlot}
                disabled={loading}
                className="px-6 py-3 text-base font-semibold bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow"
              >
                🔍 Debug Slot Ancona
              </button>
              <button
                onClick={fixAnconaSlot}
                disabled={loading}
                className="px-6 py-3 text-base font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow"
              >
                🎯 Correggi Slot Ancona 10:30
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {results && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <FaCheckCircle className="text-green-600 text-2xl" />
              <h2 className="text-xl font-bold text-gray-800">Risultati</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Slot Totali</div>
                <div className="text-2xl font-bold text-gray-800">{results.total}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-600 mb-1">Già Corretti</div>
                <div className="text-2xl font-bold text-green-600">{results.alreadyCorrect}</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-sm text-orange-600 mb-1">Corretti Ora</div>
                <div className="text-2xl font-bold text-orange-600">{results.corrected}</div>
              </div>
            </div>

            {results.inconsistencies.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Inconsistenze Trovate e Corrette:
                </h3>
                <div className="space-y-4">
                  {results.inconsistencies.map((inc, index) => (
                    <div key={index} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-semibold text-orange-900">{inc.cityName}</div>
                          <div className="text-sm text-orange-700">{inc.date} - {inc.time}</div>
                        </div>
                        <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded">
                          {inc.bookingsCount} prenotazion{inc.bookingsCount === 1 ? 'e' : 'i'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">Posti Prenotati:</div>
                          <div className="font-semibold">
                            <span className="text-red-600 line-through">{inc.oldBooked}</span>
                            {' → '}
                            <span className="text-green-600">{inc.newBooked}</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600">Posti Disponibili:</div>
                          <div className="font-semibold">
                            <span className="text-red-600 line-through">{inc.oldAvailable}</span>
                            {' → '}
                            <span className="text-green-600">{inc.newAvailable}</span>
                          </div>
                        </div>
                      </div>
                      {inc.bookings && (
                        <div className="mt-2 text-xs text-gray-600">
                          Prenotazioni: {inc.bookings}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.corrected === 0 && (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">🎉</div>
                <div className="text-xl font-semibold text-green-600">
                  Tutti gli slot sono già corretti!
                </div>
              </div>
            )}
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mt-6">
            <h3 className="text-lg font-semibold text-red-900 mb-4">⚠️ Errori durante l'aggiornamento:</h3>
            <ul className="space-y-2">
              {errors.map((err, index) => (
                <li key={index} className="text-sm text-red-800">
                  Slot {err.slotId}: {err.error}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default FixSlots;
