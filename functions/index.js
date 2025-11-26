const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

admin.initializeApp();

// Get SendGrid API key from environment variable
const SENDGRID_KEY = process.env.SENDGRID_KEY;

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
