const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');
const crypto = require('crypto');

admin.initializeApp();

// Get SendGrid API key from Firebase config or environment variable
const SENDGRID_KEY = functions.config().sendgrid?.key || process.env.SENDGRID_KEY;

// Meta Conversions API configuration
const META_PIXEL_ID = functions.config().meta?.pixel_id || process.env.META_PIXEL_ID;
const META_ACCESS_TOKEN = functions.config().meta?.access_token || process.env.META_ACCESS_TOKEN;
const META_API_VERSION = 'v21.0';

// Rate limiting: Track email sends per IP
const emailRateLimits = new Map();
const MAX_EMAILS_PER_IP = 10; // Max 10 emails per hour per IP
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of emailRateLimits.entries()) {
    if (now - data.firstRequest > RATE_LIMIT_WINDOW) {
      emailRateLimits.delete(ip);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

// Check rate limit for an IP
function checkRateLimit(ip) {
  const now = Date.now();
  const ipData = emailRateLimits.get(ip);

  if (!ipData) {
    emailRateLimits.set(ip, { count: 1, firstRequest: now });
    console.log(`📊 Rate limit: New IP ${ip.substring(0, 8)}*** - Count: 1/${MAX_EMAILS_PER_IP}`);
    return true;
  }

  // Reset if window expired
  if (now - ipData.firstRequest > RATE_LIMIT_WINDOW) {
    emailRateLimits.set(ip, { count: 1, firstRequest: now });
    console.log(`📊 Rate limit: Window reset for IP ${ip.substring(0, 8)}*** - Count: 1/${MAX_EMAILS_PER_IP}`);
    return true;
  }

  // Check if limit exceeded
  if (ipData.count >= MAX_EMAILS_PER_IP) {
    console.warn(`🚨 Rate limit EXCEEDED for IP ${ip.substring(0, 8)}*** - Count: ${ipData.count}/${MAX_EMAILS_PER_IP} - Time remaining: ${Math.ceil((RATE_LIMIT_WINDOW - (now - ipData.firstRequest)) / 60000)} minutes`);
    return false;
  }

  // Increment count
  ipData.count++;
  console.log(`📊 Rate limit: IP ${ip.substring(0, 8)}*** - Count: ${ipData.count}/${MAX_EMAILS_PER_IP}`);

  // Warn if approaching limit
  if (ipData.count >= MAX_EMAILS_PER_IP * 0.8) {
    console.warn(`⚠️  Rate limit WARNING: IP ${ip.substring(0, 8)}*** approaching limit - Count: ${ipData.count}/${MAX_EMAILS_PER_IP}`);
  }

  return true;
}

// Sanitize HTML to prevent XSS
function sanitizeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate booking data
function validateBookingData(booking) {
  if (!booking.name || typeof booking.name !== 'string' || booking.name.length > 100) {
    return 'Nome non valido';
  }
  if (!booking.email || !isValidEmail(booking.email)) {
    return 'Email non valida';
  }
  if (!booking.cityName || typeof booking.cityName !== 'string') {
    return 'Nome città non valido';
  }
  if (!booking.spots || typeof booking.spots !== 'number' || booking.spots < 1 || booking.spots > 50) {
    return 'Numero posti non valido';
  }
  return null;
}

/**
 * Cloud Function to send booking confirmation emails via SendGrid
 * Callable function that can be invoked from the frontend
 */
exports.sendBookingConfirmation = functions.https.onCall(async (data, context) => {
  try {
    const { booking, token } = data;

    // Get client IP for rate limiting
    const clientIp = context.rawRequest?.ip || context.rawRequest?.headers['x-forwarded-for'] || 'unknown';

    // Check rate limit
    if (!checkRateLimit(clientIp)) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Troppi tentativi. Riprova tra un\'ora.'
      );
    }

    // Validate input
    if (!booking || !token) {
      throw new functions.https.HttpsError('invalid-argument', 'Dati prenotazione o token mancanti');
    }

    // Validate booking data
    const validationError = validateBookingData(booking);
    if (validationError) {
      throw new functions.https.HttpsError('invalid-argument', validationError);
    }

    // Validate token format (should be SHA256 hash)
    if (!token || typeof token !== 'string' || token.length !== 64) {
      throw new functions.https.HttpsError('invalid-argument', 'Token non valido');
    }

    // Validate SendGrid API key
    if (!SENDGRID_KEY) {
      throw new functions.https.HttpsError('failed-precondition', 'SendGrid API key not configured');
    }

    // Initialize SendGrid with API key
    sgMail.setApiKey(SENDGRID_KEY);

    // Get base URL - use production URL
    const baseUrl = 'https://culturaimmersiva-it.web.app';
    const editUrl = `${baseUrl}/booking-manage/${token}`;
    const cancelUrl = `${baseUrl}/booking-cancel/${token}`;

    // Format date for display
    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('it-IT', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    };

    // Sanitize user input for email
    const safeName = sanitizeHtml(booking.name);
    const safeEmail = sanitizeHtml(booking.email);
    const safeCityName = sanitizeHtml(booking.cityName);
    const safeWhatsapp = sanitizeHtml(booking.whatsapp || 'Non fornito');
    const safeLocationName = sanitizeHtml(booking.locationName || '');
    const safeLocationAddress = sanitizeHtml(booking.locationAddress || '');

    // Create HTML email template
    const emailHtml = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Conferma Prenotazione</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: white;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .content {
      padding: 30px 20px;
    }
    .booking-details {
      background-color: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 20px 0;
      border-radius: 5px;
    }
    .detail-row {
      margin: 10px 0;
      padding: 8px 0;
      border-bottom: 1px solid #e9ecef;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      color: #6c757d;
      font-size: 14px;
      margin-bottom: 4px;
    }
    .detail-value {
      color: #212529;
      font-size: 16px;
      font-weight: 600;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      margin: 10px 5px;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      font-size: 14px;
      transition: transform 0.2s;
    }
    .btn-edit {
      background-color: #667eea;
      color: white;
    }
    .btn-cancel {
      background-color: #dc3545;
      color: white;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      color: #6c757d;
      font-size: 12px;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    .info-box {
      background-color: #e7f3ff;
      border-left: 4px solid #2196F3;
      padding: 15px;
      margin: 20px 0;
      border-radius: 5px;
    }
    @media only screen and (max-width: 600px) {
      .button {
        display: block;
        margin: 10px 0;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Prenotazione Confermata!</h1>
    </div>

    <div class="content">
      <p style="font-size: 16px; color: #212529;">
        Ciao <strong>${safeName}</strong>,
      </p>

      <p style="font-size: 16px; color: #212529;">
        La tua prenotazione è stata confermata con successo! 🎉
      </p>

      <div class="booking-details">
        <h2 style="margin-top: 0; color: #667eea; font-size: 20px;">📋 Dettagli Prenotazione</h2>

        <div class="detail-row">
          <div class="detail-label">🏛️ Evento</div>
          <div class="detail-value">${safeCityName}</div>
        </div>

        <div class="detail-row">
          <div class="detail-label">📅 Data</div>
          <div class="detail-value">${booking.date ? formatDate(booking.date) : ''}</div>
        </div>

        <div class="detail-row">
          <div class="detail-label">🕐 Orario</div>
          <div class="detail-value">${sanitizeHtml(booking.time)}</div>
        </div>

        ${safeLocationName ? `
        <div class="detail-row">
          <div class="detail-label">📍 Luogo</div>
          <div class="detail-value">${safeLocationName}${safeLocationAddress ? `<br><span style="font-size: 14px; font-weight: 400; color: #6c757d;">${safeLocationAddress}</span>` : ''}</div>
        </div>
        ` : ''}

        <div class="detail-row">
          <div class="detail-label">👥 Numero Posti</div>
          <div class="detail-value">${booking.spots} ${booking.spots === 1 ? 'posto' : 'posti'}</div>
        </div>

        <div class="detail-row">
          <div class="detail-label">📧 Email</div>
          <div class="detail-value">${safeEmail}</div>
        </div>

        <div class="detail-row">
          <div class="detail-label">📱 WhatsApp</div>
          <div class="detail-value">${safeWhatsapp}</div>
        </div>
      </div>

      <div class="info-box">
        <p style="margin: 0; font-size: 14px; color: #1976d2;">
          <strong>ℹ️ Importante:</strong> Ti ricordiamo di presentarti 10 minuti prima dell'orario prenotato.
          Riceverai un promemoria via WhatsApp il giorno prima dell'evento.
        </p>
      </div>

      <h3 style="color: #212529; margin-top: 30px;">🔗 Gestisci la tua prenotazione</h3>
      <p style="font-size: 14px; color: #6c757d;">
        Puoi modificare o annullare la tua prenotazione in qualsiasi momento utilizzando i link qui sotto:
      </p>

      <div class="button-container">
        <a href="${editUrl}" class="button btn-edit">✏️ Modifica Prenotazione</a>
        <a href="${cancelUrl}" class="button btn-cancel">❌ Annulla Prenotazione</a>
      </div>

      <p style="font-size: 14px; color: #6c757d; margin-top: 30px;">
        Hai domande? Contattaci su <a href="https://www.culturaimmersiva.it/contatti" style="color: #667eea; text-decoration: none;">culturaimmersiva.it/contatti</a>
      </p>
    </div>

    <div class="footer">
      <p style="margin: 5px 0;">
        <strong>Cultura Immersiva</strong><br>
        Esperienze culturali in realtà virtuale
      </p>
      <p style="margin: 5px 0;">
        <a href="https://www.culturaimmersiva.it">www.culturaimmersiva.it</a>
      </p>
      <p style="margin: 15px 0 5px 0; font-size: 11px; color: #999;">
        Questa email è stata inviata automaticamente. Per favore non rispondere a questa email.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    // Create email message
    const msg = {
      to: booking.email,
      from: {
        email: 'info@culturaimmersiva.it',
        name: 'Cultura Immersiva'
      },
      subject: `✅ Conferma Prenotazione - ${safeCityName}`,
      html: emailHtml,
      text: `Conferma Prenotazione\n\nCiao ${safeName},\n\nLa tua prenotazione è stata confermata!\n\nEvento: ${safeCityName}\nData: ${booking.date ? formatDate(booking.date) : ''}\nOrario: ${sanitizeHtml(booking.time)}${safeLocationName ? `\nLuogo: ${safeLocationName}${safeLocationAddress ? ` - ${safeLocationAddress}` : ''}` : ''}\nPosti: ${booking.spots}\n\nPer modificare la prenotazione: ${editUrl}\nPer annullare la prenotazione: ${cancelUrl}\n\nGrazie per aver scelto Cultura Immersiva!`
    };

    // Send email via SendGrid
    await sgMail.send(msg);

    // Log without sensitive data
    console.log(`Booking confirmation email sent successfully for city: ${safeCityName.substring(0, 20)}`);

    return {
      success: true,
      message: 'Email sent successfully'
    };

  } catch (error) {
    console.error('Error sending email:', error);

    // If it's already an HttpsError, rethrow it
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    // Otherwise create a new HttpsError
    throw new functions.https.HttpsError(
      'internal',
      'Failed to send email',
      error.message
    );
  }
});

/**
 * Send admin cancellation email
 * Called when admin cancels a booking from dashboard
 */
exports.sendAdminCancellation = functions.https.onCall(async (data, context) => {
  try {
    const { booking, reason } = data;

    // Validate input
    if (!booking || !booking.email) {
      throw new functions.https.HttpsError('invalid-argument', 'Dati prenotazione mancanti');
    }

    // Validate SendGrid API key
    if (!SENDGRID_KEY) {
      throw new functions.https.HttpsError('failed-precondition', 'SendGrid API key not configured');
    }

    // Initialize SendGrid with API key
    sgMail.setApiKey(SENDGRID_KEY);

    // Format date for display
    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('it-IT', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    };

    // Sanitize user input for email
    const safeName = sanitizeHtml(booking.name);
    const safeCityName = sanitizeHtml(booking.cityName);
    const safeReason = reason ? sanitizeHtml(reason) : '';
    const safeLocationName = sanitizeHtml(booking.locationName || '');
    const safeLocationAddress = sanitizeHtml(booking.locationAddress || '');

    // Create HTML email template for cancellation
    const emailHtml = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prenotazione Annullata</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: white;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .content {
      padding: 30px 20px;
    }
    .booking-details {
      background-color: #f8f9fa;
      border-left: 4px solid #dc3545;
      padding: 20px;
      margin: 20px 0;
      border-radius: 5px;
    }
    .detail-row {
      margin: 10px 0;
      padding: 8px 0;
      border-bottom: 1px solid #e9ecef;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      color: #6c757d;
      font-size: 14px;
      margin-bottom: 4px;
    }
    .detail-value {
      color: #212529;
      font-size: 16px;
      font-weight: 600;
    }
    .reason-box {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px 20px;
      margin: 20px 0;
      border-radius: 5px;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      margin: 10px 5px;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      font-size: 14px;
      background-color: #667eea;
      color: white;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6c757d;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>❌ Prenotazione Annullata</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
        ${safeCityName}
      </p>
    </div>

    <div class="content">
      <p style="font-size: 16px; color: #212529;">
        Gentile <strong>${safeName}</strong>,
      </p>
      <p style="font-size: 16px; color: #212529;">
        Siamo spiacenti di informarti che la tua prenotazione è stata annullata dall'organizzatore.
      </p>

      ${safeReason ? `
      <div class="reason-box">
        <p style="margin: 0; font-size: 14px; color: #856404;">
          <strong>📝 Motivazione:</strong><br>
          ${safeReason}
        </p>
      </div>
      ` : ''}

      <div class="booking-details">
        <h3 style="margin: 0 0 15px 0; color: #212529; font-size: 18px;">
          📋 Dettagli della prenotazione annullata
        </h3>

        <div class="detail-row">
          <div class="detail-label">🎭 Evento</div>
          <div class="detail-value">${safeCityName}</div>
        </div>

        <div class="detail-row">
          <div class="detail-label">📅 Data</div>
          <div class="detail-value">${booking.date ? formatDate(booking.date) : ''}</div>
        </div>

        <div class="detail-row">
          <div class="detail-label">🕐 Orario</div>
          <div class="detail-value">${sanitizeHtml(booking.time)}</div>
        </div>

        ${safeLocationName ? `
        <div class="detail-row">
          <div class="detail-label">📍 Luogo</div>
          <div class="detail-value">${safeLocationName}${safeLocationAddress ? `<br><span style="font-size: 14px; font-weight: 400; color: #6c757d;">${safeLocationAddress}</span>` : ''}</div>
        </div>
        ` : ''}

        <div class="detail-row">
          <div class="detail-label">👥 Numero Posti</div>
          <div class="detail-value">${booking.spots} ${booking.spots === 1 ? 'posto' : 'posti'}</div>
        </div>
      </div>

      <p style="font-size: 14px; color: #6c757d;">
        Se desideri prenotare per un altro evento o data, puoi farlo visitando il nostro sito:
      </p>

      <div class="button-container">
        <a href="https://culturaimmersiva-it.web.app/citta" class="button">🔍 Scopri altri eventi</a>
      </div>

      <p style="font-size: 14px; color: #6c757d; margin-top: 30px;">
        Ci scusiamo per l'inconveniente. Per qualsiasi domanda, contattaci su <a href="https://www.culturaimmersiva.it/contatti" style="color: #667eea; text-decoration: none;">culturaimmersiva.it/contatti</a>
      </p>
    </div>

    <div class="footer">
      <p style="margin: 5px 0;">
        <strong>Cultura Immersiva</strong><br>
        Esperienze culturali in realtà virtuale
      </p>
      <p style="margin: 5px 0;">
        <a href="https://www.culturaimmersiva.it">www.culturaimmersiva.it</a>
      </p>
      <p style="margin: 15px 0 5px 0; font-size: 11px; color: #999;">
        Questa email è stata inviata automaticamente. Per favore non rispondere a questa email.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    // Create email message
    const msg = {
      to: booking.email,
      from: {
        email: 'info@culturaimmersiva.it',
        name: 'Cultura Immersiva'
      },
      subject: `❌ Prenotazione Annullata - ${safeCityName}`,
      html: emailHtml,
      text: `Prenotazione Annullata\n\nGentile ${safeName},\n\nSiamo spiacenti di informarti che la tua prenotazione è stata annullata dall'organizzatore.\n\n${safeReason ? `Motivazione: ${safeReason}\n\n` : ''}Dettagli della prenotazione annullata:\nEvento: ${safeCityName}\nData: ${booking.date ? formatDate(booking.date) : ''}\nOrario: ${sanitizeHtml(booking.time)}${safeLocationName ? `\nLuogo: ${safeLocationName}${safeLocationAddress ? ` - ${safeLocationAddress}` : ''}` : ''}\nPosti: ${booking.spots}\n\nCi scusiamo per l'inconveniente.\n\nPer scoprire altri eventi: https://culturaimmersiva-it.web.app/citta\n\nGrazie,\nCultura Immersiva`
    };

    // Send email via SendGrid
    await sgMail.send(msg);

    console.log(`Admin cancellation email sent successfully for booking in city: ${safeCityName.substring(0, 20)}`);

    return {
      success: true,
      message: 'Cancellation email sent successfully'
    };

  } catch (error) {
    console.error('Error sending cancellation email:', error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      'Failed to send cancellation email',
      error.message
    );
  }
});

/**
 * Core logic for updating city availability
 */
async function updateCityAvailabilityLogic() {
  console.log('🔄 Starting city availability update...');

  const db = admin.firestore();
  const citiesSnapshot = await db.collection('cities').get();

  let updatedCount = 0;
  let availableCount = 0;
  let unavailableCount = 0;

  // Get today's date at start of day
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Process all cities
  const updatePromises = citiesSnapshot.docs.map(async (cityDoc) => {
    const cityId = cityDoc.id;
    const cityData = cityDoc.data();
    const cityName = cityData.name || cityId;

    // Get time slots from eventData
    const timeSlots = cityData.eventData?.timeSlots || [];

    // Check if city has future dates available
    const hasFutureDates = timeSlots.some(slot => {
      if (!slot.date) return false;
      const slotDate = new Date(slot.date);
      slotDate.setHours(0, 0, 0, 0);
      return slotDate >= today;
    });

    const newStatus = hasFutureDates ? 'available' : 'ended';
    const currentStatus = cityData.status;

    // Update only if status changed
    if (currentStatus !== newStatus) {
      await db.collection('cities').doc(cityId).update({
        status: newStatus,
        lastAvailabilityCheck: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`✅ Updated ${cityName}: ${currentStatus} → ${newStatus}`);
      updatedCount++;
    }

    if (newStatus === 'available') {
      availableCount++;
    } else {
      unavailableCount++;
    }
  });

  // Wait for all updates to complete
  await Promise.all(updatePromises);

  const summary = {
    totalCities: citiesSnapshot.size,
    updatedCities: updatedCount,
    availableCities: availableCount,
    unavailableCities: unavailableCount,
    timestamp: new Date().toISOString()
  };

  console.log('✨ Availability update completed:', summary);

  // Store summary in Firestore for monitoring
  await db.collection('maintenance').doc('lastAvailabilityUpdate').set(summary);

  return summary;
}

/**
 * Scheduled Function: Update City Availability
 *
 * Runs every Sunday at 22:00 (Europe/Rome timezone)
 * Checks all cities for future available dates and updates their status automatically
 */
exports.updateCityAvailability = functions
  .region('europe-west1')
  .pubsub
  .schedule('0 22 * * 0') // Every Sunday at 22:00
  .timeZone('Europe/Rome')
  .onRun(async (context) => {
    try {
      return await updateCityAvailabilityLogic();
    } catch (error) {
      console.error('❌ Error updating city availability:', error);
      throw error;
    }
  });

/**
 * Manual Trigger Function: Update City Availability (HTTP Callable)
 *
 * Allows manual triggering of the availability update via HTTP call
 * Useful for testing without waiting for scheduled execution
 */
exports.manualUpdateCityAvailability = functions
  .region('europe-west1')
  .https
  .onCall(async (data, context) => {
    // Optional: Require authentication
    // if (!context.auth) {
    //   throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    // }

    console.log('📞 Manual city availability update triggered');

    try {
      const result = await updateCityAvailabilityLogic();
      return {
        success: true,
        ...result
      };
    } catch (error) {
      console.error('❌ Error in manual update:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to update city availability',
        error.message
      );
    }
  });

// ============================================================================
// REMINDER SYSTEM
// ============================================================================

/**
 * Replace variables in template strings with booking data
 */
function replaceTemplateVariables(template, booking) {
  const safeName = sanitizeHtml(booking.name);
  const safeCityName = sanitizeHtml(booking.cityName);
  const safeLocationName = sanitizeHtml(booking.locationName || '');
  const safeLocationAddress = sanitizeHtml(booking.locationAddress || '');

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (dateString, timeString) => {
    if (timeString) return timeString;
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  return template
    .replace(/{cityName}/g, safeCityName)
    .replace(/{customerName}/g, safeName)
    .replace(/{eventDate}/g, formatDate(booking.date))
    .replace(/{eventTime}/g, booking.time || formatTime(booking.date, booking.time))
    .replace(/{locationName}/g, safeLocationName)
    .replace(/{locationAddress}/g, safeLocationAddress)
    .replace(/{spots}/g, booking.spots || '');
}

/**
 * Generate email template for reminders with settings support
 * @param {Object} booking - The booking data
 * @param {string} reminderType - Original reminder type (threeDaysBefore, oneDayBefore, oneHourBefore)
 * @param {Object} templateSettings - Custom template settings
 * @param {number} hoursRemaining - Actual hours remaining until event (optional)
 */
function generateReminderEmail(booking, reminderType, templateSettings = null, hoursRemaining = null) {
  const baseUrl = 'https://culturaimmersiva-it.web.app';
  const editUrl = `${baseUrl}/booking-manage/${booking.token}`;
  const cancelUrl = `${baseUrl}/booking-cancel/${booking.token}`;

  const safeName = sanitizeHtml(booking.name);
  const safeCityName = sanitizeHtml(booking.cityName);
  const safeLocationName = sanitizeHtml(booking.locationName || '');
  const safeLocationAddress = sanitizeHtml(booking.locationAddress || '');
  const safeEmail = sanitizeHtml(booking.email || '');
  const safeWhatsapp = sanitizeHtml(booking.whatsapp || 'Non fornito');

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (dateString, timeString) => {
    if (timeString) return timeString;
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  let subject, title, message, emoji;

  // Determine message based on ACTUAL time remaining (if provided)
  if (hoursRemaining !== null) {
    if (hoursRemaining <= 2) {
      emoji = '🚨';
      title = 'Promemoria - Evento tra poco!';
      subject = `Ultimo Reminder: ${safeCityName} sta per iniziare!`;
      message = `La tua esperienza immersiva a <strong>${safeCityName}</strong> inizierà tra poco. Ti aspettiamo!`;
    } else if (hoursRemaining <= 6) {
      emoji = '🚨';
      title = 'Promemoria - Evento oggi!';
      subject = `Reminder: ${safeCityName} oggi!`;
      message = `La tua esperienza immersiva a <strong>${safeCityName}</strong> si terrà oggi! Preparati per un'esperienza indimenticabile.`;
    } else if (hoursRemaining <= 24) {
      emoji = '🔔';
      title = 'Promemoria - Evento domani!';
      subject = `Reminder: ${safeCityName} domani!`;
      message = `Ti ricordiamo che domani avrai la tua esperienza immersiva a <strong>${safeCityName}</strong>. Ci vediamo presto!`;
    } else if (hoursRemaining <= 48) {
      emoji = '⏰';
      title = 'Promemoria - Evento tra 2 giorni!';
      subject = `Reminder: ${safeCityName} tra 2 giorni`;
      message = `Ti ricordiamo che la tua esperienza immersiva a <strong>${safeCityName}</strong> si terrà tra 2 giorni!`;
    } else if (hoursRemaining <= 72) {
      emoji = '⏰';
      title = 'Promemoria - Evento tra 3 giorni!';
      subject = `Reminder: ${safeCityName} tra 3 giorni`;
      message = `Ti ricordiamo che la tua esperienza immersiva a <strong>${safeCityName}</strong> si terrà tra 3 giorni!`;
    } else {
      const daysRemaining = Math.ceil(hoursRemaining / 24);
      emoji = '📅';
      title = `Promemoria - Evento tra ${daysRemaining} giorni!`;
      subject = `Reminder: ${safeCityName} tra ${daysRemaining} giorni`;
      message = `Ti ricordiamo che la tua esperienza immersiva a <strong>${safeCityName}</strong> si terrà tra ${daysRemaining} giorni!`;
    }
  } else if (templateSettings) {
    // Use custom template if provided
    subject = replaceTemplateVariables(templateSettings.subject, booking);
    title = replaceTemplateVariables(templateSettings.title, booking);
    message = replaceTemplateVariables(templateSettings.message, booking);
    emoji = templateSettings.emoji || '⏰';
  } else {
    // Default templates (fallback) based on reminder type
    switch (reminderType) {
      case 'threeDaysBefore':
        emoji = '⏰';
        subject = `Reminder: ${safeCityName} tra 3 giorni`;
        title = 'Promemoria - 3 giorni all\'evento';
        message = `Ti ricordiamo che la tua esperienza immersiva a <strong>${safeCityName}</strong> si terrà tra 3 giorni!`;
        break;
      case 'oneDayBefore':
        emoji = '🔔';
        subject = `Reminder: ${safeCityName} domani`;
        title = 'Promemoria - Evento domani!';
        message = `Ti ricordiamo che domani avrai la tua esperienza immersiva a <strong>${safeCityName}</strong>. Ci vediamo presto!`;
        break;
      case 'oneHourBefore':
        emoji = '🚨';
        subject = `Ultimo Reminder: ${safeCityName} tra 1 ora`;
        title = 'Promemoria - Evento tra 1 ora!';
        message = `La tua esperienza immersiva a <strong>${safeCityName}</strong> inizierà tra circa 1 ora. Ti aspettiamo!`;
        break;
      default:
        return null;
    }
  }

  const emailHtml = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: white;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .content {
      padding: 30px 20px;
    }
    .booking-details {
      background-color: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 20px 0;
      border-radius: 5px;
    }
    .detail-row {
      margin: 10px 0;
      padding: 8px 0;
      border-bottom: 1px solid #e9ecef;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      color: #6c757d;
      font-size: 14px;
      margin-bottom: 4px;
    }
    .detail-value {
      color: #212529;
      font-size: 16px;
      font-weight: 600;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      margin: 10px 5px;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      font-size: 14px;
      background-color: #667eea;
      color: white;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      color: #6c757d;
      font-size: 12px;
    }
    @media only screen and (max-width: 600px) {
      .button {
        display: block;
        margin: 10px 0;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${emoji} ${title}</h1>
    </div>

    <div class="content">
      <p style="font-size: 16px; color: #212529;">
        Ciao <strong>${safeName}</strong>,
      </p>

      <p style="font-size: 16px; color: #212529;">
        ${message}
      </p>

      <div class="booking-details">
        <h2 style="margin-top: 0; color: #667eea; font-size: 20px;">📋 Dettagli Prenotazione</h2>

        <div class="detail-row">
          <div class="detail-label">🏛️ Evento</div>
          <div class="detail-value">${safeCityName}</div>
        </div>

        <div class="detail-row">
          <div class="detail-label">📅 Data</div>
          <div class="detail-value">${formatDate(booking.date)}</div>
        </div>

        <div class="detail-row">
          <div class="detail-label">🕐 Orario</div>
          <div class="detail-value">${booking.time || formatTime(booking.date, booking.time)}</div>
        </div>

        ${safeLocationName ? `
        <div class="detail-row">
          <div class="detail-label">📍 Luogo</div>
          <div class="detail-value">${safeLocationName}${safeLocationAddress ? `<br><span style="font-size: 14px; font-weight: 400; color: #6c757d;">${safeLocationAddress}</span>` : ''}</div>
        </div>
        ` : ''}

        <div class="detail-row">
          <div class="detail-label">👥 Posti Prenotati</div>
          <div class="detail-value">${booking.spots}</div>
        </div>

        <div class="detail-row">
          <div class="detail-label">📧 Email</div>
          <div class="detail-value">${safeEmail}</div>
        </div>

        <div class="detail-row">
          <div class="detail-label">📱 WhatsApp</div>
          <div class="detail-value">${safeWhatsapp}</div>
        </div>
      </div>

      <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; color: #856404; font-size: 14px;">
          <strong>⚠️ Importante:</strong> Ti consigliamo di presentarti sul luogo dell'evento <strong>almeno 10 minuti prima</strong> dell'orario indicato.
        </p>
      </div>

      <div class="button-container">
        <a href="${editUrl}" class="button">
          Gestisci Prenotazione
        </a>
        <a href="${cancelUrl}" class="button" style="background-color: #dc3545;">
          Annulla Prenotazione
        </a>
      </div>

      <p style="font-size: 14px; color: #6c757d; text-align: center;">
        Non vediamo l'ora di vederti! 🎉
      </p>
    </div>

    <div class="footer">
      <p>Cultura Immersiva<br>
      Esperienze in Realtà Virtuale nelle Città Italiane</p>
      <p>Hai bisogno di aiuto? <a href="https://wa.me/393792121188" style="color: #667eea; text-decoration: none;">Contattaci su WhatsApp</a></p>
    </div>
  </div>
</body>
</html>
  `;

  const emailText = `
${title}

Ciao ${safeName},

${message.replace(/<\/?strong>/g, '')}

Dettagli Prenotazione:
- Evento: ${safeCityName}
- Data: ${formatDate(booking.date)}
- Orario: ${booking.time || formatTime(booking.date, booking.time)}
${safeLocationName ? `- Luogo: ${safeLocationName}${safeLocationAddress ? ` - ${safeLocationAddress}` : ''}` : ''}
- Posti Prenotati: ${booking.spots}
- Email: ${safeEmail}
- WhatsApp: ${safeWhatsapp}

⚠️ IMPORTANTE: Ti consigliamo di presentarti sul luogo dell'evento almeno 10 minuti prima dell'orario indicato.

Gestisci la tua prenotazione: ${editUrl}
Annulla la prenotazione: ${cancelUrl}

Non vediamo l'ora di vederti!

---
Cultura Immersiva
Esperienze in Realtà Virtuale nelle Città Italiane
Hai bisogno di aiuto? Contattaci su WhatsApp: https://wa.me/393792121188
  `;

  return {
    subject,
    html: emailHtml,
    text: emailText
  };
}

/**
 * Scheduled Function: Send Automatic Reminders
 * Runs every hour to check and send reminders
 */
exports.sendAutomaticReminders = functions
  .region('europe-west1')
  .pubsub
  .schedule('every 1 hours')
  .timeZone('Europe/Rome')
  .onRun(async (context) => {
    console.log('⏰ Starting automatic reminders check...');

    if (!SENDGRID_KEY) {
      console.error('❌ SendGrid API key not configured');
      return null;
    }

    sgMail.setApiKey(SENDGRID_KEY);

    try {
      const db = admin.firestore();
      const now = new Date();

      // Load reminder settings from Firestore
      const settingsDoc = await db.collection('settings').doc('reminders').get();
      let settings;

      if (settingsDoc.exists()) {
        settings = settingsDoc.data();
        console.log('✅ Loaded reminder settings from Firestore');
      } else {
        // Default settings as fallback
        settings = {
          enabled: true,
          timing: {
            threeDaysBefore: { enabled: true, hoursBeforeEvent: 72 },
            oneDayBefore: { enabled: true, hoursBeforeEvent: 24 },
            oneHourBefore: { enabled: true, hoursBeforeEvent: 1 }
          },
          templates: {}
        };
        console.log('⚠️  No settings found, using defaults');
      }

      // Check if reminder system is globally enabled
      if (!settings.enabled) {
        console.log('⏸️  Reminder system is disabled in settings');
        return { message: 'Reminders disabled' };
      }

      // Get all confirmed bookings that haven't been cancelled
      const bookingsSnapshot = await db.collection('bookings')
        .where('status', '==', 'confirmed')
        .get();

      let sentCount = 0;
      const results = {
        threeDaysBefore: 0,
        oneDayBefore: 0,
        oneHourBefore: 0,
        errors: 0
      };

      for (const bookingDoc of bookingsSnapshot.docs) {
        const booking = bookingDoc.data();
        const bookingId = bookingDoc.id;

        if (!booking.date || !booking.email) {
          console.log(`⚠️  Skipping booking ${bookingId}: missing date or email`);
          continue;
        }

        const eventDate = new Date(booking.date);

        // Parse time if provided
        if (booking.time) {
          const [hours, minutes] = booking.time.split(':');
          eventDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }

        const hoursUntilEvent = (eventDate - now) / (1000 * 60 * 60);

        // Check each reminder type
        const reminders = booking.reminders || {};

        // 3 days before reminder
        const threeDayConfig = settings.timing.threeDaysBefore;
        if (threeDayConfig.enabled &&
            hoursUntilEvent <= threeDayConfig.hoursBeforeEvent &&
            hoursUntilEvent > 0 &&
            !reminders.threeDaysBefore?.sent) {
          try {
            const template = settings.templates?.threeDaysBefore || null;
            // Pass actual hours remaining for accurate message
            const emailTemplate = generateReminderEmail(booking, 'threeDaysBefore', template, hoursUntilEvent);
            await sgMail.send({
              to: booking.email,
              from: 'noreply@culturaimmersiva.it',
              subject: emailTemplate.subject,
              text: emailTemplate.text,
              html: emailTemplate.html
            });

            await db.collection('bookings').doc(bookingId).update({
              'reminders.threeDaysBefore.sent': true,
              'reminders.threeDaysBefore.sentAt': admin.firestore.FieldValue.serverTimestamp()
            });

            // Save to history
            await saveReminderToHistory(db, booking, bookingId, 'threeDaysBefore', 'auto');

            console.log(`✅ Sent 3-day reminder for booking ${bookingId}`);
            results.threeDaysBefore++;
            sentCount++;
          } catch (error) {
            console.error(`❌ Error sending 3-day reminder for ${bookingId}:`, error);
            results.errors++;
          }
        }

        // 1 day before reminder
        const oneDayConfig = settings.timing.oneDayBefore;
        if (oneDayConfig.enabled &&
            hoursUntilEvent <= oneDayConfig.hoursBeforeEvent &&
            hoursUntilEvent > 0 &&
            !reminders.oneDayBefore?.sent) {
          try {
            const template = settings.templates?.oneDayBefore || null;
            const emailTemplate = generateReminderEmail(booking, 'oneDayBefore', template, hoursUntilEvent);
            await sgMail.send({
              to: booking.email,
              from: 'noreply@culturaimmersiva.it',
              subject: emailTemplate.subject,
              text: emailTemplate.text,
              html: emailTemplate.html
            });

            await db.collection('bookings').doc(bookingId).update({
              'reminders.oneDayBefore.sent': true,
              'reminders.oneDayBefore.sentAt': admin.firestore.FieldValue.serverTimestamp()
            });

            // Save to history
            await saveReminderToHistory(db, booking, bookingId, 'oneDayBefore', 'auto');

            console.log(`✅ Sent 1-day reminder for booking ${bookingId}`);
            results.oneDayBefore++;
            sentCount++;
          } catch (error) {
            console.error(`❌ Error sending 1-day reminder for ${bookingId}:`, error);
            results.errors++;
          }
        }

        // 1 hour before reminder
        const oneHourConfig = settings.timing.oneHourBefore;
        if (oneHourConfig.enabled &&
            hoursUntilEvent <= oneHourConfig.hoursBeforeEvent &&
            hoursUntilEvent > 0 &&
            !reminders.oneHourBefore?.sent) {
          try {
            const template = settings.templates?.oneHourBefore || null;
            const emailTemplate = generateReminderEmail(booking, 'oneHourBefore', template, hoursUntilEvent);
            await sgMail.send({
              to: booking.email,
              from: 'noreply@culturaimmersiva.it',
              subject: emailTemplate.subject,
              text: emailTemplate.text,
              html: emailTemplate.html
            });

            await db.collection('bookings').doc(bookingId).update({
              'reminders.oneHourBefore.sent': true,
              'reminders.oneHourBefore.sentAt': admin.firestore.FieldValue.serverTimestamp()
            });

            // Save to history
            await saveReminderToHistory(db, booking, bookingId, 'oneHourBefore', 'auto');

            console.log(`✅ Sent 1-hour reminder for booking ${bookingId}`);
            results.oneHourBefore++;
            sentCount++;
          } catch (error) {
            console.error(`❌ Error sending 1-hour reminder for ${bookingId}:`, error);
            results.errors++;
          }
        }
      }

      console.log(`✅ Reminder check complete. Sent ${sentCount} reminders`, results);
      return results;

    } catch (error) {
      console.error('❌ Error in sendAutomaticReminders:', error);
      return null;
    }
  });

/**
 * Callable Function: Send Manual Reminders to Group
 * Allows admin to send reminders to multiple bookings
 */
exports.sendManualReminders = functions
  .region('europe-west1')
  .https
  .onCall(async (data, context) => {
    try {
      // Require authentication
      if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
      }

      const { bookingIds, reminderType, customMessage } = data;

      if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'bookingIds array is required');
      }

      if (!['threeDaysBefore', 'oneDayBefore', 'oneHourBefore', 'custom'].includes(reminderType)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid reminder type');
      }

      if (!SENDGRID_KEY) {
        throw new functions.https.HttpsError('failed-precondition', 'SendGrid API key not configured');
      }

      sgMail.setApiKey(SENDGRID_KEY);
      const db = admin.firestore();

      // Load reminder settings from Firestore
      const settingsDoc = await db.collection('settings').doc('reminders').get();
      let settings = null;
      if (settingsDoc.exists()) {
        settings = settingsDoc.data();
        console.log('✅ Loaded reminder settings for manual send');
      }

      const results = {
        sent: 0,
        failed: 0,
        errors: []
      };

      for (const bookingId of bookingIds) {
        try {
          const bookingDoc = await db.collection('bookings').doc(bookingId).get();

          if (!bookingDoc.exists) {
            console.log(`⚠️  Booking ${bookingId} not found`);
            results.failed++;
            results.errors.push({ bookingId, error: 'Booking not found' });
            continue;
          }

          const booking = bookingDoc.data();

          if (!booking.email) {
            console.log(`⚠️  Booking ${bookingId} has no email`);
            results.failed++;
            results.errors.push({ bookingId, error: 'No email address' });
            continue;
          }

          // Calculate hours remaining for accurate message
          let hoursRemaining = null;
          if (booking.date) {
            const eventDate = new Date(booking.date);
            if (booking.time) {
              const [hours, minutes] = booking.time.split(':');
              eventDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            }
            hoursRemaining = (eventDate - new Date()) / (1000 * 60 * 60);
          }

          let emailTemplate;
          if (reminderType === 'custom' && customMessage) {
            // Custom message reminder
            emailTemplate = {
              subject: `Promemoria: ${booking.cityName}`,
              html: generateCustomReminderEmail(booking, customMessage),
              text: customMessage
            };
          } else {
            // Use settings template if available
            const template = settings?.templates?.[reminderType] || null;
            emailTemplate = generateReminderEmail(booking, reminderType, template, hoursRemaining);
          }

          await sgMail.send({
            to: booking.email,
            from: 'noreply@culturaimmersiva.it',
            subject: emailTemplate.subject,
            text: emailTemplate.text,
            html: emailTemplate.html
          });

          console.log(`✅ Sent manual reminder to ${booking.email} for booking ${bookingId}`);
          results.sent++;

        } catch (error) {
          console.error(`❌ Error sending reminder to ${bookingId}:`, error);
          results.failed++;
          results.errors.push({ bookingId, error: error.message });
        }
      }

      console.log(`📊 Manual reminders complete: ${results.sent} sent, ${results.failed} failed`);
      return results;

    } catch (error) {
      console.error('❌ Error in sendManualReminders:', error);
      throw new functions.https.HttpsError('internal', 'Failed to send manual reminders', error.message);
    }
  });

// Helper function for custom reminder email
function generateCustomReminderEmail(booking, customMessage) {
  const safeName = sanitizeHtml(booking.name);
  const safeCityName = sanitizeHtml(booking.cityName);
  const safeMessage = sanitizeHtml(customMessage);

  return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Promemoria</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: white;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .content {
      padding: 30px 20px;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      color: #6c757d;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📢 Promemoria</h1>
    </div>
    <div class="content">
      <p>Ciao <strong>${safeName}</strong>,</p>
      <p>${safeMessage.replace(/\n/g, '<br>')}</p>
      <p style="margin-top: 20px;"><strong>Evento:</strong> ${safeCityName}</p>
    </div>
    <div class="footer">
      <p>Cultura Immersiva<br>
      Esperienze in Realtà Virtuale nelle Città Italiane</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Cloud Function to fix slot consistency
 * Only accessible by admin users
 * Does everything server-side: reads, analyzes, and updates
 */
exports.fixSlotsConsistency = functions.https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    console.log('🔧 Starting slot consistency fix...');

    const db = admin.firestore();

    // 1. Load all slots
    const slotsSnapshot = await db.collection('timeslots').get();
    const slots = slotsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`📊 Found ${slots.length} total slots`);

    // 2. Load all bookings
    const bookingsSnapshot = await db.collection('bookings').get();
    const bookings = bookingsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`📋 Found ${bookings.length} total bookings`);

    // 3. Group bookings by slot
    const bookingsBySlot = {};
    bookings.forEach(booking => {
      const key = `${booking.cityId}_${booking.date}_${booking.time}`;
      if (!bookingsBySlot[key]) {
        bookingsBySlot[key] = [];
      }
      bookingsBySlot[key].push(booking);
    });

    console.log('🔄 Analyzing slots...');

    let corrected = 0;
    let alreadyCorrect = 0;
    const inconsistencies = [];

    // 4. Find and fix inconsistencies
    for (const slot of slots) {
      const key = `${slot.cityId}_${slot.date}_${slot.time}`;
      const slotBookings = bookingsBySlot[key] || [];

      // Calculate actual booked spots
      const actualBookedSpots = slotBookings.reduce((sum, b) => sum + (b.spots || 1), 0);
      const currentBookedSpots = slot.bookedSpots || 0;
      const totalSpots = slot.totalSpots || 10;

      // Calculate correct available spots
      const correctAvailableSpots = totalSpots - actualBookedSpots;
      const currentAvailableSpots = slot.availableSpots || totalSpots;

      if (actualBookedSpots !== currentBookedSpots || correctAvailableSpots !== currentAvailableSpots) {
        // Inconsistency found - fix it
        const updateData = {
          bookedSpots: actualBookedSpots,
          availableSpots: correctAvailableSpots
        };

        try {
          await db.collection('timeslots').doc(slot.id).update(updateData);

          inconsistencies.push({
            cityName: slot.cityName || slot.cityId,
            date: slot.date,
            time: slot.time,
            oldBooked: currentBookedSpots,
            newBooked: actualBookedSpots,
            oldAvailable: currentAvailableSpots,
            newAvailable: correctAvailableSpots,
            bookingsCount: slotBookings.length,
            bookings: slotBookings.map(b => `${b.name}: ${b.spots} posti`).join(', ')
          });

          corrected++;
          console.log(`✅ Fixed ${slot.cityName} ${slot.date} ${slot.time}: booked ${currentBookedSpots}→${actualBookedSpots}, available ${currentAvailableSpots}→${correctAvailableSpots}`);
        } catch (error) {
          console.error(`❌ Failed to update slot ${slot.id}:`, error);
        }
      } else {
        alreadyCorrect++;
      }
    }

    console.log(`\n📈 Slot fix completed: ${alreadyCorrect} already correct, ${corrected} fixed`);

    return {
      success: true,
      total: slots.length,
      alreadyCorrect,
      corrected,
      inconsistencies
    };

  } catch (error) {
    console.error('❌ Error in fixSlotsConsistency:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Cloud Function to debug Ancona slot
 */
exports.debugAnconaSlot = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    console.log('🔍 Debug Ancona slot - checking all variations...');

    const db = admin.firestore();

    // Try different variations of cityId
    const cityVariations = ['ancona', 'Ancona', 'ANCONA'];
    let allSlots = [];
    let allBookings = [];
    let foundCityId = null;

    for (const cityId of cityVariations) {
      const slotsSnapshot = await db.collection('timeslots')
        .where('cityId', '==', cityId)
        .get();

      if (!slotsSnapshot.empty) {
        console.log(`✅ Found ${slotsSnapshot.size} slots for cityId="${cityId}"`);
        foundCityId = cityId;
        allSlots = slotsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Also get bookings with this cityId
        const bookingsSnapshot = await db.collection('bookings')
          .where('cityId', '==', cityId)
          .get();

        allBookings = bookingsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        break; // Found it, no need to try other variations
      } else {
        console.log(`❌ No slots found for cityId="${cityId}"`);
      }
    }

    if (allSlots.length === 0) {
      return {
        success: false,
        error: 'No Ancona slots found with any variation',
        triedVariations: cityVariations
      };
    }

    // Group bookings by slot
    const bookingsBySlot = {};
    allBookings.forEach(booking => {
      const key = `${booking.date}_${booking.time}`;
      if (!bookingsBySlot[key]) {
        bookingsBySlot[key] = [];
      }
      bookingsBySlot[key].push({
        id: booking.id,
        name: booking.name,
        email: booking.email,
        spots: booking.spots,
        createdAt: booking.createdAt
      });
    });

    // Analyze each slot
    const analysis = allSlots.map(slot => {
      const key = `${slot.date}_${slot.time}`;
      const slotBookings = bookingsBySlot[key] || [];
      const actualBookedSpots = slotBookings.reduce((sum, b) => sum + (b.spots || 0), 0);

      return {
        slotId: slot.id,
        cityId: slot.cityId, // Include actual cityId format
        date: slot.date,
        time: slot.time,
        totalSpots: slot.totalSpots,
        bookedSpots: slot.bookedSpots,
        availableSpots: slot.availableSpots,
        actualBookedSpots,
        expectedAvailableSpots: slot.totalSpots - actualBookedSpots,
        bookingsCount: slotBookings.length,
        bookings: slotBookings,
        isConsistent: slot.bookedSpots === actualBookedSpots && slot.availableSpots === (slot.totalSpots - actualBookedSpots)
      };
    });

    return {
      success: true,
      foundCityId: foundCityId,
      totalSlots: allSlots.length,
      totalBookings: allBookings.length,
      slots: analysis
    };

  } catch (error) {
    console.error('❌ Error in debugAnconaSlot:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Cloud Function to manually fix Ancona 10:30 slot
 */
exports.fixAnconaSlot = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    console.log('🔧 Fixing Ancona 10:30 slot - trying all variations...');

    const db = admin.firestore();

    // Try different variations
    const cityVariations = ['ancona', 'Ancona', 'ANCONA'];
    const timeVariations = ['10:30', '10.30'];

    let slotDoc = null;
    let slotData = null;
    let foundCityId = null;
    let foundTime = null;

    // Try all combinations
    for (const cityId of cityVariations) {
      for (const time of timeVariations) {
        const slotsSnapshot = await db.collection('timeslots')
          .where('cityId', '==', cityId)
          .where('time', '==', time)
          .get();

        if (!slotsSnapshot.empty) {
          console.log(`✅ Found slot with cityId="${cityId}" and time="${time}"`);
          slotDoc = slotsSnapshot.docs[0];
          slotData = slotDoc.data();
          foundCityId = cityId;
          foundTime = time;
          break;
        }
      }
      if (slotDoc) break;
    }

    if (!slotDoc) {
      // Try to find ANY Ancona slot with 10:30 to provide better error message
      const allAncona = await db.collection('timeslots')
        .where('cityId', 'in', cityVariations)
        .get();

      const times = allAncona.docs.map(doc => doc.data().time);

      throw new functions.https.HttpsError(
        'not-found',
        `Slot Ancona 10:30 not found. Found ${allAncona.size} Ancona slots with times: ${[...new Set(times)].join(', ')}`
      );
    }

    // Find actual bookings for this slot
    const bookingsSnapshot = await db.collection('bookings')
      .where('cityId', '==', foundCityId)
      .where('time', '==', foundTime)
      .where('date', '==', slotData.date)
      .get();

    const actualBookedSpots = bookingsSnapshot.docs.reduce((sum, doc) => {
      return sum + (doc.data().spots || 0);
    }, 0);

    const totalSpots = slotData.totalSpots || 10;
    const correctAvailableSpots = totalSpots - actualBookedSpots;

    console.log(`Current slot data:`);
    console.log(`  CityId: ${foundCityId}`);
    console.log(`  Time: ${foundTime}`);
    console.log(`  Date: ${slotData.date}`);
    console.log(`  Total: ${totalSpots}`);
    console.log(`  Booked (DB): ${slotData.bookedSpots}`);
    console.log(`  Available (DB): ${slotData.availableSpots}`);
    console.log(`  Actual bookings: ${bookingsSnapshot.size} (${actualBookedSpots} spots)`);
    console.log(`  Correcting to: ${actualBookedSpots} booked, ${correctAvailableSpots} available`);

    // Update the slot
    await db.collection('timeslots').doc(slotDoc.id).update({
      bookedSpots: actualBookedSpots,
      availableSpots: correctAvailableSpots
    });

    console.log('✅ Slot updated successfully');

    return {
      success: true,
      slotId: slotDoc.id,
      cityId: foundCityId,
      date: slotData.date,
      time: foundTime,
      oldBooked: slotData.bookedSpots,
      newBooked: actualBookedSpots,
      oldAvailable: slotData.availableSpots,
      newAvailable: correctAvailableSpots,
      bookingsCount: bookingsSnapshot.size,
      totalSpots
    };

  } catch (error) {
    console.error('❌ Error in fixAnconaSlot:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Helper Function: Save reminder to history collection
 * Saves each sent reminder to reminderHistory collection for tracking
 */
async function saveReminderToHistory(db, booking, bookingId, reminderType, sentBy = 'auto', sentByEmail = null, customSubject = null, customMessage = null) {
  try {
    await db.collection('reminderHistory').add({
      bookingId: bookingId,
      customerName: booking.name || 'N/A',
      customerEmail: booking.email,
      cityId: booking.cityId || '',
      cityName: booking.cityName || 'N/A',
      eventDate: booking.date,
      eventTime: booking.time || '',
      reminderType: reminderType,
      subject: customSubject || null,
      message: customMessage || null,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      sentBy: sentBy, // 'auto' or 'manual'
      sentByEmail: sentByEmail || null
    });
    console.log(`📝 Saved reminder to history: ${bookingId} - ${reminderType}`);
  } catch (error) {
    console.error(`❌ Error saving reminder to history:`, error);
    // Don't throw - we don't want to fail the email send if history fails
  }
}

/**
 * Callable Function: Send Custom Reminder
 * Allows admin to send custom emails to selected bookings
 */
exports.sendCustomReminder = functions
  .region('europe-west1')
  .https
  .onCall(async (data, context) => {
    try {
      // Require authentication
      if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
      }

      const { bookingIds, subject, message, sentByEmail } = data;

      if (!bookingIds || bookingIds.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'bookingIds is required');
      }

      if (!subject || !message) {
        throw new functions.https.HttpsError('invalid-argument', 'subject and message are required');
      }

      if (!SENDGRID_KEY) {
        throw new functions.https.HttpsError('failed-precondition', 'Email service not configured');
      }

      sgMail.setApiKey(SENDGRID_KEY);
      const db = admin.firestore();

      let sent = 0;
      let failed = 0;
      const errors = [];

      for (const bookingId of bookingIds) {
        try {
          const bookingDoc = await db.collection('bookings').doc(bookingId).get();

          if (!bookingDoc.exists) {
            console.log(`⚠️  Booking ${bookingId} not found`);
            failed++;
            errors.push({ bookingId, error: 'Not found' });
            continue;
          }

          const booking = bookingDoc.data();

          if (!booking.email) {
            console.log(`⚠️  Booking ${bookingId} has no email`);
            failed++;
            errors.push({ bookingId, error: 'No email' });
            continue;
          }

          // Replace variables in subject and message
          let finalSubject = subject
            .replace(/{cityName}/g, booking.cityName || '')
            .replace(/{customerName}/g, booking.name || '')
            .replace(/{eventDate}/g, booking.date || '')
            .replace(/{eventTime}/g, booking.time || '')
            .replace(/{locationName}/g, booking.locationName || '')
            .replace(/{locationAddress}/g, booking.locationAddress || '')
            .replace(/{spots}/g, booking.spots || '');

          let finalMessage = message
            .replace(/{cityName}/g, booking.cityName || '')
            .replace(/{customerName}/g, booking.name || '')
            .replace(/{eventDate}/g, booking.date || '')
            .replace(/{eventTime}/g, booking.time || '')
            .replace(/{locationName}/g, booking.locationName || '')
            .replace(/{locationAddress}/g, booking.locationAddress || '')
            .replace(/{spots}/g, booking.spots || '');

          // Generate HTML email
          const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 28px; }
    .content { padding: 40px 30px; }
    .message { font-size: 16px; line-height: 1.6; color: #333333; }
    .booking-details { background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 5px; }
    .booking-details p { margin: 8px 0; color: #555555; }
    .booking-details strong { color: #333333; }
    .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #888888; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📧 ${finalSubject}</h1>
    </div>
    <div class="content">
      <div class="message">
        ${finalMessage}
      </div>
      <div class="booking-details">
        <p><strong>📍 Città:</strong> ${booking.cityName || 'N/A'}</p>
        <p><strong>📅 Data:</strong> ${booking.date || 'N/A'}</p>
        <p><strong>⏰ Orario:</strong> ${booking.time || 'N/A'}</p>
        <p><strong>📌 Luogo:</strong> ${booking.locationName || 'N/A'}</p>
        <p><strong>👥 Posti prenotati:</strong> ${booking.spots || 'N/A'}</p>
      </div>
    </div>
    <div class="footer">
      <p>Cultura Immersiva - Esperienze VR nelle Città Italiane</p>
      <p>www.culturaimmersiva.it</p>
    </div>
  </div>
</body>
</html>`;

          // Send email
          await sgMail.send({
            to: booking.email,
            from: 'noreply@culturaimmersiva.it',
            subject: finalSubject,
            text: finalMessage.replace(/<[^>]*>/g, ''), // Strip HTML for text version
            html: htmlContent
          });

          // Save to history
          await saveReminderToHistory(
            db,
            booking,
            bookingId,
            'custom',
            'manual',
            sentByEmail,
            finalSubject,
            finalMessage
          );

          console.log(`✅ Sent custom email to ${booking.email} (${bookingId})`);
          sent++;

        } catch (error) {
          console.error(`❌ Error sending to ${bookingId}:`, error);
          failed++;
          errors.push({ bookingId, error: error.message });
        }
      }

      return {
        success: true,
        sent: sent,
        failed: failed,
        total: bookingIds.length,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      console.error('❌ Error in sendCustomReminder:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

// ============================================
// TRACK PAGE VIEW (unique per IP, optimized)
// ============================================

// In-memory cache per ridurre letture Firestore (persiste finché l'istanza è attiva)
const recentViews = new Map();
const CACHE_MAX_SIZE = 10000;
const CACHE_TTL = 10 * 60 * 1000; // 10 minuti

// Rate limiting per IP (previene spam)
const viewRateLimits = new Map();
const VIEW_RATE_MAX = 20; // max 20 richieste
const VIEW_RATE_WINDOW = 60 * 1000; // per minuto

function checkRateLimitView(ip) {
  const now = Date.now();
  const data = viewRateLimits.get(ip);

  if (!data || now - data.start > VIEW_RATE_WINDOW) {
    viewRateLimits.set(ip, { count: 1, start: now });
    return true;
  }

  if (data.count >= VIEW_RATE_MAX) {
    return false;
  }

  data.count++;
  return true;
}

// Pulizia periodica cache
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of recentViews.entries()) {
    if (now - data.time > CACHE_TTL) recentViews.delete(key);
  }
  for (const [key, data] of viewRateLimits.entries()) {
    if (now - data.start > VIEW_RATE_WINDOW) viewRateLimits.delete(key);
  }
}, 60 * 1000);

exports.trackPageView = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { cityId } = req.body;

    if (!cityId || typeof cityId !== 'string' || cityId.length > 50) {
      res.status(400).json({ error: 'Invalid cityId' });
      return;
    }

    // Get client IP
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
                  || req.headers['x-real-ip']
                  || req.connection?.remoteAddress
                  || req.ip
                  || 'unknown';

    // Rate limiting - blocca spam prima di qualsiasi operazione Firestore
    if (!checkRateLimitView(clientIp)) {
      res.status(429).json({ error: 'Too many requests', counted: false });
      return;
    }

    // Hash IP per privacy
    const ipHash = crypto.createHash('sha256').update(clientIp + cityId).digest('hex').substring(0, 16);
    const cacheKey = `${cityId}:${ipHash}`;

    // 1. Check in-memory cache PRIMA di Firestore (gratis!)
    if (recentViews.has(cacheKey)) {
      res.json({ success: true, counted: false, cached: true });
      return;
    }

    const db = admin.firestore();
    const viewRef = db.collection('cities').doc(cityId).collection('views').doc(ipHash);

    // 2. Check Firestore (1 read)
    const viewDoc = await viewRef.get();

    if (viewDoc.exists) {
      // Aggiungi a cache per evitare future letture
      if (recentViews.size < CACHE_MAX_SIZE) {
        recentViews.set(cacheKey, { time: Date.now() });
      }
      res.json({ success: true, counted: false });
      return;
    }

    // 3. Nuovo visitatore - scrivi (2 writes)
    const batch = db.batch();
    batch.set(viewRef, { t: admin.firestore.FieldValue.serverTimestamp() });
    batch.update(db.collection('cities').doc(cityId), {
      views: admin.firestore.FieldValue.increment(1)
    });
    await batch.commit();

    // Aggiungi a cache
    if (recentViews.size < CACHE_MAX_SIZE) {
      recentViews.set(cacheKey, { time: Date.now() });
    }

    console.log(`👁️ +1 view: ${cityId}`);
    res.json({ success: true, counted: true });

  } catch (error) {
    console.error('❌ View error:', error.message);
    res.status(500).json({ error: 'Error' });
  }
});

/**
 * Meta Conversions API - Track booking completions
 * Sends CompleteRegistration event to Meta when a booking is completed
 */
exports.trackMetaConversion = functions
  .region('europe-west1')
  .https
  .onCall(async (data, context) => {
    try {
      // Validate Meta configuration
      if (!META_PIXEL_ID || !META_ACCESS_TOKEN) {
        console.warn('⚠️ Meta Conversions API not configured (missing PIXEL_ID or ACCESS_TOKEN)');
        return { success: false, error: 'Meta API not configured' };
      }

      const {
        email,
        phone,
        eventSourceUrl,
        userAgent,
        eventId,
        cityName,
        bookingValue
      } = data;

      if (!email) {
        throw new functions.https.HttpsError('invalid-argument', 'Email is required');
      }

      // Hash email (lowercase, trimmed) with SHA256
      const hashedEmail = crypto
        .createHash('sha256')
        .update(email.toLowerCase().trim())
        .digest('hex');

      // Hash phone if provided (remove spaces, dashes, parentheses)
      let hashedPhone = null;
      if (phone) {
        const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');
        hashedPhone = crypto
          .createHash('sha256')
          .update(cleanPhone)
          .digest('hex');
      }

      // Build the event payload
      const eventTime = Math.floor(Date.now() / 1000);

      const eventPayload = {
        data: [
          {
            event_name: 'CompleteRegistration',
            event_time: eventTime,
            event_id: eventId || `booking_${eventTime}_${Math.random().toString(36).substring(7)}`,
            action_source: 'website',
            event_source_url: eventSourceUrl || 'https://culturaimmersiva.it',
            user_data: {
              em: [hashedEmail],
              ph: hashedPhone ? [hashedPhone] : [],
              client_user_agent: userAgent || null
            },
            custom_data: {
              content_name: cityName || 'Esperienza VR',
              content_category: 'Booking',
              currency: 'EUR',
              value: bookingValue || 0
            }
          }
        ]
      };

      // Send to Meta Conversions API
      const metaUrl = `https://graph.facebook.com/${META_API_VERSION}/${META_PIXEL_ID}/events?access_token=${META_ACCESS_TOKEN}`;

      const response = await fetch(metaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventPayload)
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('❌ Meta Conversions API error:', result);
        return {
          success: false,
          error: result.error?.message || 'Unknown error'
        };
      }

      console.log('✅ Meta Conversion tracked:', {
        event_name: 'CompleteRegistration',
        events_received: result.events_received,
        fbtrace_id: result.fbtrace_id
      });

      return {
        success: true,
        events_received: result.events_received,
        fbtrace_id: result.fbtrace_id
      };

    } catch (error) {
      console.error('❌ Error tracking Meta conversion:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });
