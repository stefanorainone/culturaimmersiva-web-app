import { useState } from 'react';
import { FaPlus, FaTrash, FaMagic, FaClock, FaUsers, FaCalendar } from 'react-icons/fa';

const TimeSlotGenerator = ({ slots, onChange }) => {
  const [generators, setGenerators] = useState([{
    id: Date.now(),
    date: '', // es: 2024-11-23
    startTime: '09:00',
    endTime: '13:00',
    slotDuration: 30,
    capacity: 10
  }]);

  const [showGenerator, setShowGenerator] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualSlot, setManualSlot] = useState({
    date: '',
    time: '09:00',
    capacity: 10
  });

  // Get day name from date
  const getDayFromDate = (dateString) => {
    if (!dateString) return 'Giorno';
    const date = new Date(dateString + 'T00:00:00');
    const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    return days[date.getDay()];
  };

  // Helper function to convert time string to minutes
  const timeToMinutes = (timeString) => {
    const [hour, minute] = timeString.split(':').map(Number);
    return hour * 60 + minute;
  };

  // Helper function to check if two slots overlap
  const slotsOverlap = (slot1, slot2, duration) => {
    if (slot1.day !== slot2.day) return false;

    const start1 = timeToMinutes(slot1.time);
    const end1 = start1 + duration;
    const start2 = timeToMinutes(slot2.time);
    const end2 = start2 + duration;

    return (start1 < end2 && end1 > start2);
  };

  // Helper function to sort slots
  const sortSlots = (slotsArray) => {
    const dayOrder = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

    return [...slotsArray].sort((a, b) => {
      const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
      if (dayDiff !== 0) return dayDiff;
      return timeToMinutes(a.time) - timeToMinutes(b.time);
    });
  };

  // Helper function to remove duplicate slots
  const removeDuplicates = (slotsArray) => {
    const seen = new Set();
    return slotsArray.filter(slot => {
      const key = `${slot.day}-${slot.time}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Add new generator
  const addGenerator = () => {
    const lastGen = generators[generators.length - 1];
    setGenerators([...generators, {
      id: Date.now(),
      date: lastGen.date || '',
      startTime: '15:00',
      endTime: '19:00',
      slotDuration: lastGen.slotDuration || 30,
      capacity: lastGen.capacity || 10
    }]);
  };

  // Remove generator
  const removeGenerator = (id) => {
    if (generators.length === 1) {
      alert('⚠️ Devi avere almeno una fascia oraria!');
      return;
    }
    setGenerators(generators.filter(g => g.id !== id));
  };

  // Update generator
  const updateGenerator = (id, field, value) => {
    setGenerators(generators.map(g =>
      g.id === id ? { ...g, [field]: value } : g
    ));
  };

  const generateSlots = () => {
    let allNewSlots = [];

    // Generate slots for each generator
    for (const generator of generators) {
      const { date, startTime, endTime, slotDuration, capacity } = generator;

      // Validate date
      if (!date) {
        alert('⚠️ Seleziona una data per tutte le fasce orarie!');
        return;
      }

      // Validate times
      if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
        alert(`⚠️ Fascia oraria ${startTime}-${endTime}: l'ora di fine deve essere dopo l'ora di inizio!`);
        return;
      }

      // Get day name from date
      const day = getDayFromDate(date);

      // Parse start and end times
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);

      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      let currentMinutes = startMinutes;

      while (currentMinutes < endMinutes) {
        const hour = Math.floor(currentMinutes / 60);
        const minute = currentMinutes % 60;
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

        const newSlot = {
          day,
          date,
          time: timeString,
          capacity: Number(capacity)
        };

        allNewSlots.push(newSlot);
        currentMinutes += slotDuration;
      }
    }

    // Check for overlaps with existing slots
    const overlapping = [];
    const slotDuration = generators[0]?.slotDuration || 30;
    for (const newSlot of allNewSlots) {
      for (const existingSlot of slots) {
        if (slotsOverlap(newSlot, existingSlot, slotDuration)) {
          overlapping.push(newSlot);
          break;
        }
      }
    }

    if (overlapping.length > 0) {
      const proceed = window.confirm(
        `⚠️ Attenzione: ${overlapping.length} slot si sovrappongono con slot esistenti.\n\n` +
        `Vuoi procedere comunque? Gli slot sovrapposti saranno ignorati.`
      );

      if (!proceed) return;
    }

    // Filter out overlapping slots
    const validNewSlots = allNewSlots.filter(newSlot => {
      return !slots.some(existingSlot => slotsOverlap(newSlot, existingSlot, slotDuration));
    });

    if (validNewSlots.length === 0) {
      alert('❌ Nessun nuovo slot da aggiungere (tutti si sovrappongono con slot esistenti)');
      return;
    }

    // Combine, remove duplicates, and sort
    const allSlots = [...slots, ...validNewSlots];
    const uniqueSlots = removeDuplicates(allSlots);
    const sortedSlots = sortSlots(uniqueSlots);

    onChange(sortedSlots);
    setShowGenerator(false);

    // Show success message
    const skipped = allNewSlots.length - validNewSlots.length;
    const totalGenerators = generators.length;
    if (skipped > 0) {
      alert(`✅ Generati ${validNewSlots.length} slot da ${totalGenerators} ${totalGenerators === 1 ? 'fascia oraria' : 'fasce orarie'}\n⚠️ ${skipped} slot ignorati (sovrapposizioni)`);
    } else {
      alert(`✅ Generati ${validNewSlots.length} slot da ${totalGenerators} ${totalGenerators === 1 ? 'fascia oraria' : 'fasce orarie'}`);
    }
  };

  const removeSlot = (index) => {
    const filtered = slots.filter((_, i) => i !== index);
    onChange(filtered);
  };

  const updateSlot = (index, field, value) => {
    const updated = [...slots];
    updated[index] = { ...updated[index], [field]: value };

    // Remove duplicates and sort after update
    const uniqueSlots = removeDuplicates(updated);
    const sortedSlots = sortSlots(uniqueSlots);
    onChange(sortedSlots);
  };

  const addManualSlot = () => {
    const { date, time, capacity } = manualSlot;

    // Validate
    if (!date) {
      alert('⚠️ Seleziona una data!');
      return;
    }

    const day = getDayFromDate(date);

    const newSlots = [...slots, { day, date, time, capacity: Number(capacity) }];

    // Remove duplicates and sort
    const uniqueSlots = removeDuplicates(newSlots);
    const sortedSlots = sortSlots(uniqueSlots);
    onChange(sortedSlots);

    // Reset form and close
    setManualSlot({ date: '', time: '09:00', capacity: 10 });
    setShowManualForm(false);

    alert(`✅ Slot aggiunto: ${day} ${formatDate(date)} alle ${time}`);
  };

  const clearAllSlots = () => {
    if (window.confirm('Sei sicuro di voler eliminare tutti gli slot?')) {
      onChange([]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <FaClock className="text-primary" />
          Slot Orari ({slots.length} slot totali)
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowGenerator(!showGenerator)}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-light transition-colors"
          >
            <FaMagic />
            {showGenerator ? 'Chiudi Generatore' : 'Generatore Automatico'}
          </button>
          <button
            type="button"
            onClick={() => setShowManualForm(!showManualForm)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            <FaPlus />
            {showManualForm ? 'Chiudi Form' : 'Slot Manuale'}
          </button>
          {slots.length > 0 && (
            <button
              type="button"
              onClick={clearAllSlots}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <FaTrash className="inline" />
            </button>
          )}
        </div>
      </div>

      {/* Manual Slot Form */}
      {showManualForm && (
        <div className="bg-gradient-to-br from-primary to-primary-dark p-6 rounded-lg shadow-lg text-white">
          <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
            <FaPlus />
            Aggiungi Slot Manuale
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                <FaCalendar className="inline mr-1" />
                Data *
                {manualSlot.date && (
                  <span className="ml-2 text-white bg-white bg-opacity-20 px-2 py-1 rounded text-xs">
                    {getDayFromDate(manualSlot.date)}
                  </span>
                )}
              </label>
              <input
                type="date"
                value={manualSlot.date}
                onChange={(e) => setManualSlot({ ...manualSlot, date: e.target.value })}
                className="w-full px-3 py-2 bg-white text-gray-800 border-0 rounded focus:ring-2 focus:ring-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                <FaClock className="inline mr-1" />
                Orario
              </label>
              <input
                type="time"
                value={manualSlot.time}
                onChange={(e) => setManualSlot({ ...manualSlot, time: e.target.value })}
                className="w-full px-3 py-2 bg-white text-gray-800 border-0 rounded focus:ring-2 focus:ring-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                <FaUsers className="inline mr-1" />
                Persone/Slot
              </label>
              <input
                type="number"
                value={manualSlot.capacity}
                onChange={(e) => setManualSlot({ ...manualSlot, capacity: e.target.value })}
                className="w-full px-3 py-2 bg-white text-gray-800 border-0 rounded focus:ring-2 focus:ring-white"
                min="1"
              />
            </div>
          </div>

          {manualSlot.date && (
            <div className="bg-white bg-opacity-20 rounded p-3 mb-4 text-sm">
              <strong>Anteprima:</strong> {getDayFromDate(manualSlot.date)} {formatDate(manualSlot.date)} alle {manualSlot.time} - {manualSlot.capacity} persone
            </div>
          )}

          <button
            type="button"
            onClick={addManualSlot}
            className="w-full py-3 bg-white text-primary font-bold rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
          >
            <FaPlus />
            Aggiungi Slot
          </button>
        </div>
      )}

      {/* Automatic Generator */}
      {showGenerator && (
        <div className="bg-gradient-to-br from-secondary to-secondary-light p-6 rounded-lg shadow-lg text-white space-y-4">
          <h4 className="text-lg font-bold flex items-center gap-2">
            <FaMagic />
            Generatore Automatico Slot ({generators.length} {generators.length === 1 ? 'fascia oraria' : 'fasce orarie'})
          </h4>

          {generators.map((generator, index) => (
            <div key={generator.id} className="bg-white bg-opacity-10 rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h5 className="font-semibold">Fascia Oraria #{index + 1}</h5>
                <div className="flex gap-2">
                  {generators.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeGenerator(generator.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
                    >
                      <FaTrash className="inline" />
                    </button>
                  )}
                  {index === generators.length - 1 && (
                    <button
                      type="button"
                      onClick={addGenerator}
                      className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm font-bold"
                    >
                      <FaPlus className="inline mr-1" />
                      Altra Fascia
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <FaCalendar className="inline mr-1" />
                    Data *
                    {generator.date && (
                      <span className="ml-2 text-white bg-white bg-opacity-20 px-2 py-1 rounded text-xs">
                        {getDayFromDate(generator.date)}
                      </span>
                    )}
                  </label>
                  <input
                    type="date"
                    value={generator.date}
                    onChange={(e) => updateGenerator(generator.id, 'date', e.target.value)}
                    className="w-full px-3 py-2 bg-white text-gray-800 border-0 rounded focus:ring-2 focus:ring-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    <FaUsers className="inline mr-1" />
                    Persone/Slot
                  </label>
                  <input
                    type="number"
                    value={generator.capacity}
                    onChange={(e) => updateGenerator(generator.id, 'capacity', e.target.value)}
                    className="w-full px-3 py-2 bg-white text-gray-800 border-0 rounded focus:ring-2 focus:ring-white"
                    min="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <FaClock className="inline mr-1" />
                    Ora Inizio
                  </label>
                  <input
                    type="time"
                    value={generator.startTime}
                    onChange={(e) => updateGenerator(generator.id, 'startTime', e.target.value)}
                    className="w-full px-3 py-2 bg-white text-gray-800 border-0 rounded focus:ring-2 focus:ring-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    <FaClock className="inline mr-1" />
                    Ora Fine
                  </label>
                  <input
                    type="time"
                    value={generator.endTime}
                    onChange={(e) => updateGenerator(generator.id, 'endTime', e.target.value)}
                    className="w-full px-3 py-2 bg-white text-gray-800 border-0 rounded focus:ring-2 focus:ring-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    <FaClock className="inline mr-1" />
                    Durata Slot (min)
                  </label>
                  <select
                    value={generator.slotDuration}
                    onChange={(e) => updateGenerator(generator.id, 'slotDuration', Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white text-gray-800 border-0 rounded focus:ring-2 focus:ring-white"
                  >
                    <option value="15">15 minuti</option>
                    <option value="20">20 minuti</option>
                    <option value="30">30 minuti</option>
                    <option value="45">45 minuti</option>
                    <option value="60">60 minuti</option>
                  </select>
                </div>
              </div>

              {generator.date && (
                <div className="bg-white bg-opacity-20 rounded p-2 text-xs">
                  <strong>Anteprima:</strong> ~
                  {Math.floor(
                    (parseInt(generator.endTime.split(':')[0]) * 60 +
                      parseInt(generator.endTime.split(':')[1]) -
                      (parseInt(generator.startTime.split(':')[0]) * 60 +
                        parseInt(generator.startTime.split(':')[1]))) /
                      generator.slotDuration
                  )}{' '}
                  slot per {getDayFromDate(generator.date)} {formatDate(generator.date)} dalle {generator.startTime} alle {generator.endTime}
                </div>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={generateSlots}
            className="w-full py-3 bg-white text-secondary font-bold rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
          >
            <FaMagic />
            Genera Tutti gli Slot
          </button>
        </div>
      )}

      {/* Slots List */}
      {slots.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <FaClock className="text-4xl text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500">Nessuno slot creato</p>
          <p className="text-sm text-gray-400 mt-1">
            Usa il generatore automatico o aggiungi slot manualmente
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {/* Group slots by day */}
          {['Sabato', 'Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'].map(
            (day) => {
              const daySlots = slots
                .map((slot, index) => ({ ...slot, originalIndex: index }))
                .filter((slot) => slot.day === day);

              if (daySlots.length === 0) return null;

              return (
                <div key={day} className="border border-gray-200 rounded-lg p-3 bg-white">
                  <div className="font-semibold text-primary mb-2 flex items-center gap-2">
                    <FaCalendar />
                    {day}
                    {daySlots[0]?.date && ` - ${formatDate(daySlots[0].date)}`}
                    <span className="text-sm text-gray-600">({daySlots.length} slot)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {daySlots.map((slot) => (
                      <div
                        key={slot.originalIndex}
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200"
                      >
                        <FaClock className="text-gray-400 flex-shrink-0" />
                        <input
                          type="time"
                          value={slot.time}
                          onChange={(e) =>
                            updateSlot(slot.originalIndex, 'time', e.target.value)
                          }
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                        <div className="flex items-center gap-1">
                          <FaUsers className="text-gray-400 text-xs" />
                          <input
                            type="number"
                            value={slot.capacity}
                            onChange={(e) =>
                              updateSlot(slot.originalIndex, 'capacity', Number(e.target.value))
                            }
                            className="w-12 px-1 py-1 text-sm text-center border border-gray-300 rounded"
                            min="1"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSlot(slot.originalIndex)}
                          className="text-red-500 hover:text-red-700 flex-shrink-0"
                        >
                          <FaTrash className="text-xs" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

      {/* Summary */}
      {slots.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{slots.length}</div>
              <div className="text-sm text-gray-600">Slot Totali</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {slots.reduce((sum, slot) => sum + slot.capacity, 0)}
              </div>
              <div className="text-sm text-gray-600">Posti Totali</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {[...new Set(slots.map((s) => s.day))].length}
              </div>
              <div className="text-sm text-gray-600">Giorni</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {slots.length > 0
                  ? Math.round(slots.reduce((sum, slot) => sum + slot.capacity, 0) / slots.length)
                  : 0}
              </div>
              <div className="text-sm text-gray-600">Media Persone/Slot</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeSlotGenerator;
