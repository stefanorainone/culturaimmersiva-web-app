const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');
const crypto = require('crypto');
const Anthropic = require('@anthropic-ai/sdk');
const webpush = require('web-push');

admin.initializeApp();

// Configure Web Push (for iOS)
const VAPID_PUBLIC_KEY = functions.config().vapid?.public_key;
const VAPID_PRIVATE_KEY = functions.config().vapid?.private_key;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:info@culturaimmersiva.it',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

/**
 * Send push notification (supports both FCM and Web Push for iOS)
 */
async function sendPushNotification(tokenData, notification) {
  const token = tokenData.token;

  // Check if it's a Web Push subscription (iOS)
  if (token && token.startsWith('{')) {
    try {
      const parsed = JSON.parse(token);
      if (parsed.type === 'webpush' && parsed.subscription) {
        await webpush.sendNotification(
          parsed.subscription,
          JSON.stringify({
            title: notification.title,
            body: notification.body,
            icon: '/images/icon-192.png',
            data: notification.data || {}
          })
        );
        console.log('✅ Web Push notification sent (iOS)');
        return true;
      }
    } catch (e) {
      console.error('Web Push error:', e.message);
      return false;
    }
  }

  // FCM for Android/Desktop
  try {
    await admin.messaging().send({
      token: token,
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: notification.data || {},
      webpush: {
        fcmOptions: { link: notification.link || '/admin/whatsapp' },
        notification: {
          icon: '/images/icon-192.png',
          badge: '/images/icon-192.png'
        }
      }
    });
    console.log('✅ FCM notification sent');
    return true;
  } catch (e) {
    console.error('FCM error:', e.message);
    return false;
  }
}

// Anthropic AI configuration
const ANTHROPIC_API_KEY = functions.config().anthropic?.api_key || process.env.ANTHROPIC_API_KEY;

// Get SendGrid API key from Firebase config or environment variable
const SENDGRID_KEY = functions.config().sendgrid?.key || process.env.SENDGRID_KEY;

// Meta Conversions API configuration
const META_PIXEL_ID = functions.config().meta?.pixel_id || process.env.META_PIXEL_ID;
const META_ACCESS_TOKEN = functions.config().meta?.access_token || process.env.META_ACCESS_TOKEN;
const META_API_VERSION = 'v21.0';

// WhatsApp Business API configuration
const WHATSAPP_TOKEN = functions.config().whatsapp?.token || process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = functions.config().whatsapp?.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_VERIFY_TOKEN = functions.config().whatsapp?.verify_token || process.env.WHATSAPP_VERIFY_TOKEN;
const WHATSAPP_API_VERSION = 'v21.0';

// Helper: Download media from WhatsApp and upload to Firebase Storage
async function downloadAndStoreWhatsAppMedia(mediaId, mediaType) {
  if (!mediaId || !WHATSAPP_TOKEN) return null;

  try {
    // Step 1: Get media URL from WhatsApp API
    const mediaInfoResponse = await fetch(
      `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${mediaId}`,
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`
        }
      }
    );

    if (!mediaInfoResponse.ok) {
      console.error('Failed to get media info:', await mediaInfoResponse.text());
      return null;
    }

    const mediaInfo = await mediaInfoResponse.json();
    const mediaUrl = mediaInfo.url;

    if (!mediaUrl) {
      console.error('No media URL returned');
      return null;
    }

    // Step 2: Download the media
    const mediaResponse = await fetch(mediaUrl, {
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`
      }
    });

    if (!mediaResponse.ok) {
      console.error('Failed to download media:', await mediaResponse.text());
      return null;
    }

    const mediaBuffer = Buffer.from(await mediaResponse.arrayBuffer());

    // Step 3: Determine file extension
    const mimeType = mediaInfo.mime_type || 'application/octet-stream';
    const extensions = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'video/mp4': 'mp4',
      'video/3gpp': '3gp',
      'audio/aac': 'aac',
      'audio/mpeg': 'mp3',
      'audio/ogg': 'ogg',
      'application/pdf': 'pdf'
    };
    const ext = extensions[mimeType] || 'bin';

    // Step 4: Upload to Firebase Storage
    const bucket = admin.storage().bucket();
    const fileName = `whatsapp-media/${mediaId}.${ext}`;
    const file = bucket.file(fileName);

    await file.save(mediaBuffer, {
      metadata: {
        contentType: mimeType
      }
    });

    // Make the file publicly accessible
    await file.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    console.log(`✅ Media uploaded: ${publicUrl}`);

    return {
      url: publicUrl,
      mimeType: mimeType
    };
  } catch (error) {
    console.error('❌ Error downloading/storing media:', error);
    return null;
  }
}

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

    // Skip cities without any timeSlots configured yet (new cities being set up)
    // These cities should keep their current status until timeSlots are added
    if (timeSlots.length === 0) {
      console.log(`⏭️  Skipping ${cityName}: no timeSlots configured yet`);
      // Count based on current status
      if (cityData.status === 'available') {
        availableCount++;
      } else {
        unavailableCount++;
      }
      return;
    }

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
 * Cloud Function: Get booking by token for magic link
 * Handles both old bookings (where doc ID != token) and new bookings
 */
exports.getBookingByToken = functions.https.onCall(async (data, context) => {
  const { token } = data;
  const db = admin.firestore();

  if (!token || typeof token !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Token non valido');
  }

  try {
    let bookingDoc = null;

    // First try: document ID = token (new bookings)
    bookingDoc = await db.collection('bookings').doc(token).get();

    // Second try: query by token field (old bookings)
    if (!bookingDoc.exists) {
      const querySnapshot = await db.collection('bookings')
        .where('token', '==', token)
        .limit(1)
        .get();

      if (!querySnapshot.empty) {
        bookingDoc = querySnapshot.docs[0];
      }
    }

    if (!bookingDoc || !bookingDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Prenotazione non trovata');
    }

    const booking = bookingDoc.data();

    // Check if event has passed
    if (booking.date) {
      const eventDate = new Date(booking.date);
      eventDate.setHours(23, 59, 59, 999);
      if (new Date() > eventDate) {
        throw new functions.https.HttpsError('failed-precondition', 'L\'evento è già passato');
      }
    }

    // Return only necessary fields (no sensitive data)
    return {
      id: bookingDoc.id,
      name: booking.name,
      email: booking.email,
      cityName: booking.cityName,
      day: booking.day,
      date: booking.date,
      time: booking.time,
      spots: booking.spots,
      status: booking.status || 'confirmed'
    };

  } catch (error) {
    console.error('Error getting booking:', error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError('internal', 'Errore nel caricamento della prenotazione');
  }
});

/**
 * Cloud Function: Cancel booking by user via magic link
 * Handles both old bookings (where doc ID != token) and new bookings
 */
exports.cancelBookingByUser = functions.https.onCall(async (data, context) => {
  const { token } = data;
  const db = admin.firestore();

  if (!token || typeof token !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Token non valido');
  }

  try {
    let bookingDoc = null;
    let bookingRef = null;

    // First try: document ID = token (new bookings)
    bookingRef = db.collection('bookings').doc(token);
    bookingDoc = await bookingRef.get();

    // Second try: query by token field (old bookings)
    if (!bookingDoc.exists) {
      const querySnapshot = await db.collection('bookings')
        .where('token', '==', token)
        .limit(1)
        .get();

      if (!querySnapshot.empty) {
        bookingDoc = querySnapshot.docs[0];
        bookingRef = bookingDoc.ref;
      }
    }

    if (!bookingDoc || !bookingDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Prenotazione non trovata');
    }

    const booking = bookingDoc.data();

    // Check if already cancelled
    if (booking.status === 'cancelled') {
      throw new functions.https.HttpsError('failed-precondition', 'Prenotazione già annullata');
    }

    // Check if event has passed
    if (booking.date) {
      const eventDate = new Date(booking.date);
      eventDate.setHours(23, 59, 59, 999);
      if (new Date() > eventDate) {
        throw new functions.https.HttpsError('failed-precondition', 'L\'evento è già passato');
      }
    }

    // Update booking status
    await bookingRef.update({
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelledBy: 'user'
    });

    // Decrement bookedSlots on city document
    if (booking.cityId && booking.date && booking.time && booking.spots) {
      const cityRef = db.collection('cities').doc(booking.cityId);
      const slotKey = `${booking.date}_${booking.time}`;

      await cityRef.update({
        [`bookedSlots.${slotKey}`]: admin.firestore.FieldValue.increment(-booking.spots)
      });
    }

    return {
      success: true,
      message: 'Prenotazione annullata con successo'
    };

  } catch (error) {
    console.error('Error cancelling booking:', error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError('internal', 'Errore durante l\'annullamento');
  }
});

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

      if (settingsDoc.exists) {
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
      if (settingsDoc.exists) {
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

// ============================================================================
// WHATSAPP BUSINESS API FUNCTIONS
// ============================================================================

/**
 * Send a WhatsApp message to a single recipient
 */
exports.sendWhatsAppMessage = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { data } = req.body;
    const { phone, message, conversationId, operatorId, operatorName } = data || {};

    if (!phone || !message) {
      return res.status(400).json({ success: false, error: 'Phone and message are required' });
    }

    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      console.error('❌ WhatsApp configuration missing');
      return res.status(500).json({ success: false, error: 'WhatsApp non configurato' });
    }

    // Normalize phone number (remove + for API)
    const normalizedPhone = phone.replace(/\+/g, '').replace(/\s/g, '');

    // Send message via WhatsApp Cloud API
    const whatsappUrl = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const response = await fetch(whatsappUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizedPhone,
        type: 'text',
        text: { body: message }
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ WhatsApp API error:', result);
      return res.status(response.status).json({
        success: false,
        error: result.error?.message || 'Errore invio WhatsApp'
      });
    }

    console.log('✅ WhatsApp message sent:', { phone: normalizedPhone, messageId: result.messages?.[0]?.id });

    const db = admin.firestore();

    // Save message to Firestore with operator info
    const messageDoc = {
      conversationId: conversationId,
      content: message,
      direction: 'outgoing',
      status: 'sent',
      whatsappMessageId: result.messages?.[0]?.id,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      operatorId: operatorId || null,
      operatorName: operatorName || null
    };

    await db.collection('whatsapp_messages').add(messageDoc);

    // Update conversation - mark as replied
    if (conversationId) {
      await db.collection('whatsapp_conversations').doc(conversationId).update({
        lastMessage: message.substring(0, 100),
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
        lastOutgoingAt: admin.firestore.FieldValue.serverTimestamp(),
        needsReply: false,
        lastRepliedBy: operatorName || null
      });
    }

    return res.status(200).json({
      success: true,
      messageId: result.messages?.[0]?.id
    });

  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Send a WhatsApp broadcast message to multiple recipients
 */
exports.sendWhatsAppBroadcast = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { data } = req.body;
    const { recipients, message } = data || {};

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, error: 'Recipients array required' });
    }

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      return res.status(500).json({ success: false, error: 'WhatsApp non configurato' });
    }

    const whatsappUrl = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const db = admin.firestore();

    let sentCount = 0;
    let failedCount = 0;
    const errors = [];

    // Send to each recipient (with rate limiting delay)
    for (const phone of recipients) {
      try {
        const normalizedPhone = phone.replace(/\+/g, '').replace(/\s/g, '');

        const response = await fetch(whatsappUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: normalizedPhone,
            type: 'text',
            text: { body: message }
          })
        });

        const result = await response.json();

        if (response.ok) {
          sentCount++;

          // Find or create conversation and save message
          const conversationsQuery = await db.collection('whatsapp_conversations')
            .where('phone', '==', phone)
            .limit(1)
            .get();

          let conversationId;
          if (!conversationsQuery.empty) {
            conversationId = conversationsQuery.docs[0].id;
            await db.collection('whatsapp_conversations').doc(conversationId).update({
              lastMessage: message.substring(0, 100),
              lastMessageAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }

          if (conversationId) {
            await db.collection('whatsapp_messages').add({
              conversationId,
              content: message,
              direction: 'outgoing',
              status: 'sent',
              whatsappMessageId: result.messages?.[0]?.id,
              timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        } else {
          failedCount++;
          errors.push({ phone, error: result.error?.message });
        }

        // Rate limiting: wait 100ms between messages
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (err) {
        failedCount++;
        errors.push({ phone, error: err.message });
      }
    }

    console.log(`✅ WhatsApp broadcast completed: ${sentCount} sent, ${failedCount} failed`);

    return res.status(200).json({
      success: true,
      sent: sentCount,
      failed: failedCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ Error sending WhatsApp broadcast:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// AI AGENT FOR WHATSAPP
// ============================================================================

/**
 * AI Agent System Prompt
 */
const AI_SYSTEM_PROMPT = `Sei l'assistente virtuale di Cultura Immersiva, un'azienda che organizza esperienze di realtà virtuale in diverse città italiane.

INFORMAZIONI GENERALI:
- Offriamo tour virtuali ed esperienze immersive in varie città italiane
- Le esperienze durano circa 30-45 minuti
- Si può prenotare online o via WhatsApp
- Pagamento sul posto (contanti o carta)

IL TUO RUOLO:
- Rispondi in italiano, in modo cordiale e professionale
- Aiuta i clienti con informazioni su eventi, prenotazioni, cancellazioni
- Puoi cercare, modificare e cancellare prenotazioni

STILE DI COMUNICAZIONE - MOLTO IMPORTANTE:
1. Dai sempre del LEI, mai del "tu" (es: "La ringrazio", "Le auguro", "Può contattarci")
2. NON fare domande all'utente - rispondi solo a ciò che chiede
3. Sii gentile e cordiale
4. Alla fine di ogni risposta:
   - Augura una buona esperienza immersiva
   - Mettiti a disposizione per ulteriori domande
5. Sii conciso (WhatsApp preferisce messaggi brevi)

ESEMPIO DI RISPOSTA CORRETTA:
"Gentile cliente, l'evento a Napoli si terrà sabato 15 e domenica 16 gennaio presso Palazzo Reale. Le auguro una splendida esperienza immersiva! Resto a disposizione per qualsiasi altra informazione."

RISPOSTA A "GRAZIE" O RINGRAZIAMENTI:
Quando l'utente scrive "grazie", "grazie mille", "ok grazie" o simili, rispondi semplicemente:
"Grazie a Lei! Le auguro una splendida esperienza immersiva."
Non aggiungere altro.

MESSAGGI CHE NON RICHIEDONO RISPOSTA:
Quando l'utente risponde solo con:
- "a tra poco", "a dopo", "a presto", "ci vediamo"
- messaggi di chiusura dopo che hai già risposto e augurato buona esperienza
NON rispondere. La conversazione è già conclusa, non serve altra risposta.

EVITA RIPETIZIONI:
- Hai accesso all'intera cronologia della conversazione
- NON ripetere messaggi che hai già inviato
- NON dare informazioni già comunicate
- Se hai già augurato buona esperienza, non farlo di nuovo

REGOLA FONDAMENTALE - MAI INVENTARE:
- NON inventare MAI informazioni che non hai
- NON supporre prezzi, date, orari o dettagli
- Se non hai un'informazione certa, ESCALA all'operatore
- Meglio passare a un umano che dare informazioni sbagliate

REGOLA ESCALATION - QUANDO PASSARE ALL'OPERATORE:
Passa SEMPRE all'operatore umano quando:
- Non sai rispondere con certezza
- L'utente fa domande su cose che non conosci
- Reclami o lamentele
- Richieste di rimborso
- Problemi tecnici
- Richieste particolari o fuori dall'ordinario
- Dubbi sulla risposta corretta

COME FARE ESCALATION - IMPORTANTISSIMO:
1. Usa lo strumento notify_operators con motivo e priorità
2. Rispondi ESATTAMENTE E SOLO con: [ESCALATED]
3. VIETATO scrivere QUALSIASI altro testo all'utente
4. VIETATO dire "un operatore risponderà", "la contatteremo", "attenda" o simili
5. VIETATO scusarti o spiegare
6. L'utente NON deve ricevere NESSUN messaggio - resta tutto in silenzio
7. La conversazione resta in attesa per l'operatore umano che risponderà

ESEMPIO SBAGLIATO (MAI FARE COSÌ):
"Mi scuso, non ho questa informazione. Un operatore la contatterà presto. [ESCALATED]"

ESEMPIO CORRETTO:
[ESCALATED]

Solo quello, nient'altro.

ALTRE REGOLE:
1. Non inventare informazioni - usa gli strumenti per verificare
2. Per modifiche/cancellazioni: HAI GIÀ TUTTI I DATI nel contesto utente (nome, email, città, data, ora, ID prenotazione). NON chiedere nulla all'utente, procedi direttamente con l'operazione.

IMPORTANTE - CONTESTO PRENOTAZIONI:
- Quando un utente scrive, ricevi automaticamente le sue prenotazioni nel contesto
- Usa questi dati per rispondere senza chiedere conferme
- Se l'utente chiede di cancellare/modificare, usa l'ID prenotazione dal contesto
- L'utente ha già ricevuto email/WhatsApp di conferma con tutti i dettagli, quindi sa di cosa parla`;

/**
 * AI Tools Definition
 */
const AI_TOOLS = [
  {
    name: "search_bookings",
    description: "Cerca prenotazioni per numero di telefono, email o nome cliente. Usa questo per trovare prenotazioni esistenti.",
    input_schema: {
      type: "object",
      properties: {
        phone: { type: "string", description: "Numero di telefono del cliente (con prefisso +39)" },
        email: { type: "string", description: "Email del cliente" },
        name: { type: "string", description: "Nome del cliente" }
      },
      required: []
    }
  },
  {
    name: "get_booking_details",
    description: "Ottieni i dettagli completi di una prenotazione specifica usando il suo ID o token.",
    input_schema: {
      type: "object",
      properties: {
        booking_id: { type: "string", description: "ID della prenotazione" },
        token: { type: "string", description: "Token della prenotazione" }
      },
      required: []
    }
  },
  {
    name: "cancel_booking",
    description: "Cancella una prenotazione. Usa solo dopo aver verificato l'identità del cliente.",
    input_schema: {
      type: "object",
      properties: {
        booking_id: { type: "string", description: "ID della prenotazione da cancellare" },
        reason: { type: "string", description: "Motivo della cancellazione" }
      },
      required: ["booking_id"]
    }
  },
  {
    name: "get_city_info",
    description: "Ottieni informazioni su una città/evento: date, orari, prezzi, location.",
    input_schema: {
      type: "object",
      properties: {
        city_id: { type: "string", description: "ID della città (es: 'napoli', 'roma', 'bologna')" },
        city_name: { type: "string", description: "Nome della città da cercare" }
      },
      required: []
    }
  },
  {
    name: "get_available_cities",
    description: "Ottieni l'elenco delle città con eventi disponibili.",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "get_available_slots",
    description: "Ottieni gli slot disponibili per una città specifica.",
    input_schema: {
      type: "object",
      properties: {
        city_id: { type: "string", description: "ID della città" }
      },
      required: ["city_id"]
    }
  },
  {
    name: "notify_operators",
    description: "Notifica gli operatori umani quando non riesci a rispondere o serve intervento. Usa quando: domande complesse, reclami, richieste speciali, errori, o qualsiasi cosa tu non sappia gestire.",
    input_schema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Motivo per cui serve intervento umano" },
        priority: { type: "string", enum: ["low", "medium", "high"], description: "Priorità della richiesta" }
      },
      required: ["reason"]
    }
  },
  {
    name: "send_booking_link",
    description: "Invia al cliente il link per prenotare in una città specifica.",
    input_schema: {
      type: "object",
      properties: {
        city_id: { type: "string", description: "ID della città per cui inviare il link di prenotazione" }
      },
      required: ["city_id"]
    }
  },
  {
    name: "create_booking",
    description: "Crea una nuova prenotazione per il cliente. Prima di creare, verifica la disponibilità con get_available_slots e raccogli tutti i dati necessari dal cliente.",
    input_schema: {
      type: "object",
      properties: {
        city_id: { type: "string", description: "ID della città (es: 'napoli', 'roma')" },
        name: { type: "string", description: "Nome completo del cliente" },
        email: { type: "string", description: "Email del cliente" },
        whatsapp: { type: "string", description: "Numero WhatsApp con prefisso (es: +393331234567)" },
        date: { type: "string", description: "Data della prenotazione (formato: YYYY-MM-DD)" },
        time: { type: "string", description: "Orario della prenotazione (formato: HH:MM)" },
        spots: { type: "number", description: "Numero di posti da prenotare (default: 1)" }
      },
      required: ["city_id", "name", "email", "whatsapp", "date", "time"]
    }
  },
  {
    name: "modify_booking",
    description: "Modifica data e/o orario di una prenotazione esistente. Prima verifica la disponibilità del nuovo slot con get_available_slots.",
    input_schema: {
      type: "object",
      properties: {
        booking_id: { type: "string", description: "ID della prenotazione da modificare" },
        new_date: { type: "string", description: "Nuova data (formato: YYYY-MM-DD)" },
        new_time: { type: "string", description: "Nuovo orario (formato: HH:MM)" }
      },
      required: ["booking_id"]
    }
  }
];

/**
 * Execute AI Tool
 */
async function executeAITool(toolName, toolInput, context) {
  const db = admin.firestore();
  const { conversationId, phone } = context;

  try {
    switch (toolName) {
      case 'search_bookings': {
        let bookings = [];
        const bookingsRef = db.collection('bookings');

        if (toolInput.phone) {
          const phoneClean = toolInput.phone.replace(/\s/g, '');
          const snapshot = await bookingsRef.where('whatsapp', '==', phoneClean).where('status', '==', 'confirmed').get();
          bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        if (toolInput.email && bookings.length === 0) {
          const snapshot = await bookingsRef.where('email', '==', toolInput.email.toLowerCase()).where('status', '==', 'confirmed').get();
          bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        if (toolInput.name && bookings.length === 0) {
          const snapshot = await bookingsRef.where('status', '==', 'confirmed').get();
          bookings = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(b => b.name && b.name.toLowerCase().includes(toolInput.name.toLowerCase()));
        }

        // Also search by conversation phone if no specific search
        if (bookings.length === 0 && phone) {
          const phoneClean = phone.replace(/\s/g, '');
          const snapshot = await bookingsRef.where('whatsapp', '==', phoneClean).where('status', '==', 'confirmed').get();
          bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        if (bookings.length === 0) {
          return { success: true, message: "Nessuna prenotazione trovata.", bookings: [] };
        }

        return {
          success: true,
          bookings: bookings.map(b => ({
            id: b.id,
            name: b.name,
            city: b.cityName || b.cityId,
            date: b.date,
            time: b.time,
            spots: b.spots,
            email: b.email,
            whatsapp: b.whatsapp
          }))
        };
      }

      case 'get_booking_details': {
        let bookingDoc;

        if (toolInput.booking_id) {
          bookingDoc = await db.collection('bookings').doc(toolInput.booking_id).get();
        } else if (toolInput.token) {
          bookingDoc = await db.collection('bookings').doc(toolInput.token).get();
          if (!bookingDoc.exists) {
            const snapshot = await db.collection('bookings').where('token', '==', toolInput.token).limit(1).get();
            if (!snapshot.empty) bookingDoc = snapshot.docs[0];
          }
        }

        if (!bookingDoc || !bookingDoc.exists) {
          return { success: false, message: "Prenotazione non trovata." };
        }

        const booking = bookingDoc.data();
        return {
          success: true,
          booking: {
            id: bookingDoc.id,
            name: booking.name,
            email: booking.email,
            whatsapp: booking.whatsapp,
            city: booking.cityName || booking.cityId,
            date: booking.date,
            time: booking.time,
            spots: booking.spots,
            status: booking.status,
            createdAt: booking.createdAt?.toDate?.()?.toISOString() || booking.createdAt
          }
        };
      }

      case 'cancel_booking': {
        const bookingRef = db.collection('bookings').doc(toolInput.booking_id);
        const bookingDoc = await bookingRef.get();

        if (!bookingDoc.exists) {
          return { success: false, message: "Prenotazione non trovata." };
        }

        const booking = bookingDoc.data();
        if (booking.status === 'cancelled') {
          return { success: false, message: "Questa prenotazione è già stata cancellata." };
        }

        // Cancel the booking
        await bookingRef.update({
          status: 'cancelled',
          cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
          cancelReason: toolInput.reason || 'Cancellata via AI WhatsApp',
          cancelledBy: 'ai_agent'
        });

        // Update city booked slots
        if (booking.cityId && booking.date && booking.time) {
          const cityRef = db.collection('cities').doc(booking.cityId);
          const slotKey = `bookedSlots.${booking.date}-${booking.time}`;
          await cityRef.update({
            [slotKey]: admin.firestore.FieldValue.increment(-(booking.spots || 1))
          });
        }

        return {
          success: true,
          message: `Prenotazione cancellata con successo. Nome: ${booking.name}, Città: ${booking.cityName || booking.cityId}, Data: ${booking.date}, Ora: ${booking.time}`
        };
      }

      case 'get_city_info': {
        let cityDoc;

        if (toolInput.city_id) {
          cityDoc = await db.collection('cities').doc(toolInput.city_id).get();
        } else if (toolInput.city_name) {
          const cityId = toolInput.city_name.toLowerCase().replace(/\s+/g, '-');
          cityDoc = await db.collection('cities').doc(cityId).get();

          if (!cityDoc.exists) {
            // Search by name
            const snapshot = await db.collection('cities').where('status', '==', 'available').get();
            const found = snapshot.docs.find(doc => {
              const name = doc.data().name?.toLowerCase() || '';
              return name.includes(toolInput.city_name.toLowerCase());
            });
            if (found) cityDoc = found;
          }
        }

        if (!cityDoc || !cityDoc.exists) {
          return { success: false, message: "Città non trovata. Usa get_available_cities per vedere le città disponibili." };
        }

        const city = cityDoc.data();
        const eventData = city.eventData || {};

        return {
          success: true,
          city: {
            id: cityDoc.id,
            name: city.name,
            status: city.status,
            dates: eventData.dates,
            duration: eventData.experienceDuration || eventData.duration,
            location: eventData.location?.name,
            address: eventData.location?.address,
            pricing: eventData.pricing,
            experiencesPerTicket: eventData.experiencesPerTicket
          }
        };
      }

      case 'get_available_cities': {
        const snapshot = await db.collection('cities').where('status', '==', 'available').get();
        const cities = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          dates: doc.data().eventData?.dates,
          region: doc.data().region
        }));

        return {
          success: true,
          cities: cities,
          message: `Ci sono ${cities.length} città con eventi disponibili.`
        };
      }

      case 'get_available_slots': {
        const cityDoc = await db.collection('cities').doc(toolInput.city_id).get();

        if (!cityDoc.exists) {
          return { success: false, message: "Città non trovata." };
        }

        const city = cityDoc.data();
        const timeSlots = city.eventData?.timeSlots || [];
        const bookedSlots = city.bookedSlots || {};
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const availableSlots = timeSlots
          .filter(slot => {
            const slotDate = new Date(slot.date);
            slotDate.setHours(0, 0, 0, 0);
            return slotDate >= today;
          })
          .map(slot => {
            const slotKey = `${slot.date}-${slot.time}`;
            const booked = bookedSlots[slotKey] || 0;
            const available = (slot.capacity || 10) - booked;
            return {
              date: slot.date,
              day: slot.day,
              time: slot.time,
              availableSpots: Math.max(0, available)
            };
          })
          .filter(slot => slot.availableSpots > 0);

        return {
          success: true,
          cityName: city.name,
          slots: availableSlots.slice(0, 20) // Limit to 20 slots
        };
      }

      case 'notify_operators': {
        // Mark conversation as needing human attention
        await db.collection('whatsapp_conversations').doc(conversationId).update({
          needsReply: true,
          aiEscalated: true,
          aiEscalationReason: toolInput.reason,
          aiEscalationPriority: toolInput.priority || 'medium',
          aiEscalatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Send push notification to operators
        const fcmTokensSnapshot = await db.collection('fcm_tokens').get();
        if (!fcmTokensSnapshot.empty) {
          const priorityEmoji = toolInput.priority === 'high' ? '🔴' : toolInput.priority === 'medium' ? '🟡' : '🟢';

          for (const doc of fcmTokensSnapshot.docs) {
            await sendPushNotification(doc.data(), {
              title: `${priorityEmoji} AI richiede assistenza`,
              body: toolInput.reason.substring(0, 100)
            }).catch(e => console.log('Push error:', e.message));
          }
        }

        return {
          success: true,
          message: "Ho notificato gli operatori. Ti risponderanno al più presto."
        };
      }

      case 'send_booking_link': {
        const baseUrl = 'https://culturaimmersiva.it';
        const bookingUrl = `${baseUrl}/booking/${toolInput.city_id}`;

        return {
          success: true,
          message: `Ecco il link per prenotare: ${bookingUrl}`
        };
      }

      case 'create_booking': {
        const { city_id, name, email, whatsapp, date, time, spots = 1 } = toolInput;

        // Verify city exists and is available
        const cityDoc = await db.collection('cities').doc(city_id).get();
        if (!cityDoc.exists) {
          return { success: false, message: "Città non trovata. Verifica l'ID città." };
        }

        const city = cityDoc.data();
        if (city.status !== 'available') {
          return { success: false, message: "L'evento in questa città non è attualmente disponibile." };
        }

        // Check slot availability
        const slotKey = `${date}-${time}`;
        const bookedSlots = city.bookedSlots || {};
        const timeSlots = city.eventData?.timeSlots || [];
        const slot = timeSlots.find(s => s.date === date && s.time === time);

        if (!slot) {
          return { success: false, message: `Lo slot ${date} alle ${time} non esiste. Usa get_available_slots per vedere gli slot disponibili.` };
        }

        const booked = bookedSlots[slotKey] || 0;
        const available = (slot.capacity || 10) - booked;

        if (available < spots) {
          return { success: false, message: `Non ci sono abbastanza posti disponibili. Posti richiesti: ${spots}, disponibili: ${available}.` };
        }

        // Generate booking token
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        // Create booking
        const bookingRef = await db.collection('bookings').add({
          cityId: city_id,
          cityName: city.name,
          name: name,
          email: email.toLowerCase(),
          whatsapp: whatsapp,
          date: date,
          time: time,
          spots: spots,
          status: 'confirmed',
          token: token,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: 'ai_agent',
          source: 'whatsapp'
        });

        // Update booked slots
        await db.collection('cities').doc(city_id).update({
          [`bookedSlots.${slotKey}`]: admin.firestore.FieldValue.increment(spots)
        });

        // Find day name for the date
        const dayName = slot.day || new Date(date).toLocaleDateString('it-IT', { weekday: 'long' });

        return {
          success: true,
          message: `Prenotazione creata con successo!`,
          booking: {
            id: bookingRef.id,
            name: name,
            city: city.name,
            date: date,
            day: dayName,
            time: time,
            spots: spots,
            token: token
          }
        };
      }

      case 'modify_booking': {
        const { booking_id, new_date, new_time } = toolInput;

        if (!new_date && !new_time) {
          return { success: false, message: "Devi specificare almeno una nuova data o un nuovo orario." };
        }

        // Get existing booking
        const bookingRef = db.collection('bookings').doc(booking_id);
        const bookingDoc = await bookingRef.get();

        if (!bookingDoc.exists) {
          return { success: false, message: "Prenotazione non trovata." };
        }

        const booking = bookingDoc.data();
        if (booking.status === 'cancelled') {
          return { success: false, message: "Questa prenotazione è stata cancellata." };
        }

        const targetDate = new_date || booking.date;
        const targetTime = new_time || booking.time;

        // If nothing changed
        if (targetDate === booking.date && targetTime === booking.time) {
          return { success: false, message: "La data e l'orario sono gli stessi della prenotazione attuale." };
        }

        // Get city to check availability
        const cityDoc = await db.collection('cities').doc(booking.cityId).get();
        if (!cityDoc.exists) {
          return { success: false, message: "Città dell'evento non trovata." };
        }

        const city = cityDoc.data();
        const timeSlots = city.eventData?.timeSlots || [];
        const newSlot = timeSlots.find(s => s.date === targetDate && s.time === targetTime);

        if (!newSlot) {
          return { success: false, message: `Lo slot ${targetDate} alle ${targetTime} non esiste. Usa get_available_slots per vedere gli slot disponibili.` };
        }

        // Check availability
        const newSlotKey = `${targetDate}-${targetTime}`;
        const oldSlotKey = `${booking.date}-${booking.time}`;
        const bookedSlots = city.bookedSlots || {};
        const booked = bookedSlots[newSlotKey] || 0;
        const available = (newSlot.capacity || 10) - booked;

        if (available < booking.spots) {
          return { success: false, message: `Non ci sono abbastanza posti nel nuovo slot. Richiesti: ${booking.spots}, disponibili: ${available}.` };
        }

        // Update booking
        await bookingRef.update({
          date: targetDate,
          time: targetTime,
          modifiedAt: admin.firestore.FieldValue.serverTimestamp(),
          modifiedBy: 'ai_agent',
          previousDate: booking.date,
          previousTime: booking.time
        });

        // Update slots: decrement old, increment new
        const cityRef = db.collection('cities').doc(booking.cityId);
        await cityRef.update({
          [`bookedSlots.${oldSlotKey}`]: admin.firestore.FieldValue.increment(-booking.spots),
          [`bookedSlots.${newSlotKey}`]: admin.firestore.FieldValue.increment(booking.spots)
        });

        const dayName = newSlot.day || new Date(targetDate).toLocaleDateString('it-IT', { weekday: 'long' });

        return {
          success: true,
          message: `Prenotazione modificata con successo!`,
          booking: {
            id: booking_id,
            name: booking.name,
            city: booking.cityName,
            oldDate: booking.date,
            oldTime: booking.time,
            newDate: targetDate,
            newTime: targetTime,
            day: dayName,
            spots: booking.spots
          }
        };
      }

      default:
        return { success: false, message: `Tool non riconosciuto: ${toolName}` };
    }
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Process message with AI Agent
 */
async function processWithAI(conversationId, phone, incomingMessage, conversationHistory = [], userContext = null) {
  if (!ANTHROPIC_API_KEY) {
    console.log('⚠️ AI Agent disabled: No Anthropic API key');
    return null;
  }

  const db = admin.firestore();

  try {
    // Check if AI is enabled in settings
    const settingsDoc = await db.collection('settings').doc('ai_agent').get();
    const settings = settingsDoc.exists ? settingsDoc.data() : {};

    if (settings.enabled === false) {
      console.log('⚠️ AI Agent disabled in settings');
      return null;
    }

    const anthropic = new Anthropic.default({ apiKey: ANTHROPIC_API_KEY });

    // Determine model based on message complexity
    // Use Sonnet for complex operations, Haiku for simple queries
    const msgLower = incomingMessage.toLowerCase();
    const complexKeywords = [
      'modifica', 'modificare', 'cambia', 'cambiare', 'sposta', 'spostare',
      'cancella', 'cancellare', 'annulla', 'annullare', 'disdici',
      'prenota', 'prenotare', 'prenotazione',
      'problema', 'reclamo', 'lamentela', 'rimborso',
      'non funziona', 'errore', 'sbagliato'
    ];
    const isComplex = complexKeywords.some(kw => msgLower.includes(kw)) || incomingMessage.length > 150;
    const model = isComplex ? 'claude-sonnet-4-20250514' : 'claude-3-5-haiku-20241022';
    console.log(`🧠 Using ${isComplex ? 'Sonnet' : 'Haiku'} for: "${incomingMessage.substring(0, 30)}..."`);

    // Build system prompt with user context
    let systemPrompt = settings.systemPrompt || AI_SYSTEM_PROMPT;

    if (userContext && (userContext.bookings?.length > 0 || userContext.events?.length > 0)) {
      systemPrompt += `\n\n## CONTESTO UTENTE CORRENTE\n\nQuesto utente ha il numero ${phone}.\n`;

      if (userContext.bookings?.length > 0) {
        systemPrompt += `\n### PRENOTAZIONI DELL'UTENTE (usa questi dati, NON chiedere nulla):\n`;
        for (const booking of userContext.bookings) {
          systemPrompt += `
**Prenotazione per ${booking.cityName}**
- ID prenotazione (per modifiche/cancellazioni): ${booking.id}
- Nome cliente: ${booking.name}
- Email: ${booking.email}
- WhatsApp: ${booking.whatsapp}
- Data: ${booking.date}
- Ora: ${booking.time}
- Numero posti: ${booking.spots}
- Stato: ${booking.status}
`;
        }
      }

      if (userContext.events?.length > 0) {
        systemPrompt += `\n### INFO EVENTI:\n`;
        for (const event of userContext.events) {
          systemPrompt += `**${event.cityName}**: ${event.dates || 'Date non specificate'}`;
          if (event.location?.name) systemPrompt += ` presso ${event.location.name}`;
          if (event.location?.address) systemPrompt += ` (${event.location.address})`;
          if (event.duration) systemPrompt += `. Durata: ${event.duration}`;
          systemPrompt += `\n`;
        }
      }

      systemPrompt += `\nHAI TUTTI I DATI NECESSARI. Per cancellare o modificare, usa direttamente l'ID prenotazione sopra indicato.`;
    }

    // Build conversation messages - include full history to avoid repeating responses
    const messages = [
      ...conversationHistory.map(msg => ({
        role: msg.direction === 'incoming' ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: 'user', content: incomingMessage }
    ];

    console.log(`🤖 AI Agent processing message from ${phone}: "${incomingMessage.substring(0, 50)}..."`);
    if (userContext?.bookings?.length > 0) {
      console.log(`📋 User has ${userContext.bookings.length} booking(s)`);
    }

    // Initial AI call
    let response = await anthropic.messages.create({
      model: model,
      max_tokens: 500,
      system: systemPrompt,
      tools: AI_TOOLS,
      messages: messages
    });

    // Process tool calls in a loop
    while (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(block => block.type === 'tool_use');
      const toolResults = [];

      for (const toolUse of toolUseBlocks) {
        console.log(`🔧 AI using tool: ${toolUse.name}`, JSON.stringify(toolUse.input));

        const result = await executeAITool(toolUse.name, toolUse.input, { conversationId, phone });

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result)
        });
      }

      // Continue conversation with tool results
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });

      response = await anthropic.messages.create({
        model: model,
        max_tokens: 500,
        system: systemPrompt,
        tools: AI_TOOLS,
        messages: messages
      });
    }

    // Extract final text response
    const textBlock = response.content.find(block => block.type === 'text');
    const aiResponse = textBlock?.text || null;

    if (aiResponse) {
      console.log(`✅ AI response: "${aiResponse.substring(0, 100)}..."`);

      // Log AI interaction
      await db.collection('ai_logs').add({
        conversationId,
        phone,
        userMessage: incomingMessage,
        aiResponse: aiResponse,
        toolsUsed: response.content.filter(b => b.type === 'tool_use').map(b => b.name),
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    return aiResponse;
  } catch (error) {
    console.error('❌ AI Agent error:', error);
    return null;
  }
}

/**
 * Send WhatsApp message helper
 */
async function sendWhatsAppMessageDirect(to, message) {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.error('WhatsApp not configured');
    return false;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to.replace(/[^0-9]/g, ''),
          type: 'text',
          text: { body: message }
        })
      }
    );

    if (!response.ok) {
      console.error('Failed to send WhatsApp:', await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending WhatsApp:', error);
    return false;
  }
}

/**
 * WhatsApp Webhook - Receives incoming messages and status updates
 */
exports.whatsappWebhook = functions.https.onRequest(async (req, res) => {
  // Webhook verification (GET request from Meta)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
      console.log('✅ WhatsApp webhook verified');
      return res.status(200).send(challenge);
    } else {
      console.error('❌ WhatsApp webhook verification failed');
      return res.status(403).send('Forbidden');
    }
  }

  // Handle incoming webhook events (POST)
  if (req.method === 'POST') {
    const body = req.body;

    // Respond immediately to Meta (they require fast response)
    res.status(200).send('OK');

    // Check if this is a WhatsApp message event
    if (body.object !== 'whatsapp_business_account') {
      return;
    }

    // Process asynchronously after responding
    const db = admin.firestore();
    const promises = [];

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;

        // Handle incoming messages
        if (value.messages) {
          for (const message of value.messages) {
            const from = '+' + message.from;
            const contactName = value.contacts?.[0]?.profile?.name || from;
            const messageId = message.id;
            const timestamp = new Date(parseInt(message.timestamp) * 1000);

            // Extract message content and media info
            let messageContent = message.text?.body || '';
            let mediaType = null;
            let mediaId = null;
            let mediaCaption = null;

            // Check for different media types
            if (message.type === 'image' && message.image) {
              mediaType = 'image';
              mediaId = message.image.id;
              mediaCaption = message.image.caption;
              messageContent = mediaCaption || '[Immagine]';
            } else if (message.type === 'video' && message.video) {
              mediaType = 'video';
              mediaId = message.video.id;
              mediaCaption = message.video.caption;
              messageContent = mediaCaption || '[Video]';
            } else if (message.type === 'audio' && message.audio) {
              mediaType = 'audio';
              mediaId = message.audio.id;
              messageContent = '[Audio]';
            } else if (message.type === 'document' && message.document) {
              mediaType = 'document';
              mediaId = message.document.id;
              mediaCaption = message.document.caption || message.document.filename;
              messageContent = mediaCaption || '[Documento]';
            } else if (message.type === 'sticker' && message.sticker) {
              mediaType = 'sticker';
              mediaId = message.sticker.id;
              messageContent = '[Sticker]';
            }

            console.log(`📩 Incoming WhatsApp from ${from}: ${messageContent.substring(0, 50)}${mediaType ? ` (${mediaType})` : ''}`);

            // Process message asynchronously
            const processMessage = async () => {
              try {
                // Download and store media if present
                let mediaUrl = null;
                let mediaMimeType = null;
                if (mediaId) {
                  console.log(`📥 Downloading media ${mediaId} (${mediaType})...`);
                  const mediaResult = await downloadAndStoreWhatsAppMedia(mediaId, mediaType);
                  if (mediaResult) {
                    mediaUrl = mediaResult.url;
                    mediaMimeType = mediaResult.mimeType;
                  }
                }

                // Use phone as document ID for faster lookup
                const conversationId = from.replace(/[^0-9]/g, '');
                const conversationRef = db.collection('whatsapp_conversations').doc(conversationId);
                const conversationDoc = await conversationRef.get();

                // Use batch write for atomicity and speed
                const batch = db.batch();

                const displayContent = messageContent.substring(0, 100);
                if (!conversationDoc.exists) {
                  batch.set(conversationRef, {
                    phone: from,
                    name: contactName,
                    lastMessage: displayContent,
                    lastMessageAt: admin.firestore.Timestamp.fromDate(timestamp),
                    lastIncomingAt: admin.firestore.Timestamp.fromDate(timestamp),
                    needsReply: true,
                    unreadCount: 1,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                  });
                } else {
                  batch.update(conversationRef, {
                    name: contactName,
                    lastMessage: displayContent,
                    lastMessageAt: admin.firestore.Timestamp.fromDate(timestamp),
                    lastIncomingAt: admin.firestore.Timestamp.fromDate(timestamp),
                    needsReply: true,
                    unreadCount: admin.firestore.FieldValue.increment(1)
                  });
                }

                // Add message
                const messageRef = db.collection('whatsapp_messages').doc();
                batch.set(messageRef, {
                  conversationId: conversationId,
                  content: messageContent,
                  direction: 'incoming',
                  whatsappMessageId: messageId,
                  timestamp: admin.firestore.Timestamp.fromDate(timestamp),
                  mediaType: mediaType,
                  mediaUrl: mediaUrl,
                  mediaMimeType: mediaMimeType,
                  mediaCaption: mediaCaption
                });

                await batch.commit();
                console.log(`✅ Message saved for ${from}`);

                // Send push notifications to all registered operators
                try {
                  const fcmTokensSnapshot = await db.collection('fcm_tokens').get();
                  if (!fcmTokensSnapshot.empty) {
                    const sendPromises = fcmTokensSnapshot.docs.map(doc =>
                      sendPushNotification(doc.data(), {
                        title: contactName,
                        body: messageContent.substring(0, 100),
                        data: {
                          conversationId: conversationId,
                          phone: from,
                          type: 'whatsapp_message'
                        }
                      }).catch(err => console.log('Push error:', err.message))
                    );
                    await Promise.all(sendPromises);
                    console.log(`📲 Push notifications sent to ${fcmTokensSnapshot.size} operators`);
                  }
                } catch (pushError) {
                  console.error('❌ Error sending push notifications:', pushError);
                }

                // Process with AI Agent
                try {
                  // DEBOUNCE: Wait 30 seconds to allow user to send multiple messages
                  await new Promise(resolve => setTimeout(resolve, 30000));

                  // Check if we already responded recently (another instance might have processed)
                  const recentAIResponse = await db.collection('whatsapp_messages')
                    .where('conversationId', '==', conversationId)
                    .where('direction', '==', 'outgoing')
                    .where('sentBy', '==', 'ai_agent')
                    .orderBy('timestamp', 'desc')
                    .limit(1)
                    .get();

                  if (!recentAIResponse.empty) {
                    const lastAITime = recentAIResponse.docs[0].data().timestamp?.toDate?.();
                    if (lastAITime && (Date.now() - lastAITime.getTime()) < 10000) {
                      console.log(`⏭️ Skipping AI - already responded ${Math.round((Date.now() - lastAITime.getTime())/1000)}s ago`);
                      return; // Skip, we just responded
                    }
                  }

                  // Check for closure/acknowledgment messages that don't need a response
                  // Using regex patterns to handle typos and variations

                  // Regex patterns for common closure words (handles typos, repeated letters, etc.)
                  const closurePatterns = [
                    // OK variants (o+k+, okay, oki, etc.)
                    /^o+k+[aey]*[!]*$/i,
                    /^k+$/i,
                    /^va+b+[eu]*[oò]*[n]*[e]*$/i,  // vabbene, vabbuò, vabbe
                    /^va\s*bene$/i,

                    // Grazie variants (handles grazei, graazie, grzaie, etc.)
                    /^gr+[aà]+z+i*e+$/i,           // grazie with typos
                    /^gr+z+[!]*$/i,                 // grz abbreviation
                    /^gr+[aà]+z+i*e+\s*(mille|tante|infinite|molte|a\s*(te|voi|lei))?[!]*$/i,
                    /^(mille|tante|infinite)\s*gr+[aà]+z+i*e+[!]*$/i,
                    /^(ti|la|vi)?\s*r+i+n+gr+[aà]+z+i*[oa]*[!]*$/i,  // ringrazio
                    /^th+[aà]*n+k+s*[!]*$/i,        // thanks
                    /^th+[aà]*n+k+\s*you+[!]*$/i,   // thank you
                    /^t+h*x+[!]*$/i,                // thx

                    // Perfetto variants (prfetto, perfeto, perfettto, etc.)
                    /^p+[eè]*r+f+[eè]*t+o+[!]*$/i,
                    /^o+t+i+m+o+[!]*$/i,            // ottimo
                    /^b+[eè]*n+[i]*s+[i]*m+o+[!]*$/i,  // benissimo
                    /^f+[aà]*n+t+[aà]*s+t+i+c+o+[!]*$/i,  // fantastico
                    /^m+[aà]*g+n+[i]*f+i+c+o+[!]*$/i,     // magnifico
                    /^[eè]+c+[eè]*l+[eè]*n+t+[eè]*[!]*$/i,  // eccellente
                    /^s+p+l+[eè]*n+d+i+d+o+[!]*$/i,   // splendido
                    /^gr+[aà]*n+d+i*[oe]*s*o*[!]*$/i, // grande, grandioso
                    /^m+[eè]*r+[aà]*v+i+g+l+i*[oe]*s*o*[!]*$/i,  // meraviglioso
                    /^s+t+u+p+[eè]*n+d+o+[!]*$/i,     // stupendo
                    /^b+[eè]*l+[i]*s+[i]*m+o+[!]*$/i, // bellissimo
                    /^t+o+p+[!]*$/i,
                    /^s+u+p+[eè]*r+[!]*$/i,

                    // Bene variants
                    /^b+[eè]*n+[eè]+[!]*$/i,
                    /^b+n+[!]*$/i,
                    /^(molto|tutto)\s*b+[eè]*n+[eè]*[!]*$/i,
                    /^b+[eè]*n+o+n+[eè]*[!]*$/i,     // benone

                    // Capito variants (capit, cpito, etc.)
                    /^(ho\s*)?c+[aà]*p+i+t+o+[!]*$/i,
                    /^(tutto\s*)?c+h+i+[aà]*r+o+[!]*$/i,
                    /^c+h+i+[aà]*r+i+s+[i]*m+o+[!]*$/i,
                    /^c+o+m+p+r+[eè]*[ns]*[od]*[!]*$/i,  // comprendo, compreso
                    /^i+n+t+[eè]*s+o+[!]*$/i,        // inteso
                    /^r+i+c+[eè]*v+u+t+o+[!]*$/i,    // ricevuto

                    // Sì/No variants
                    /^s+[iì]+[!]*$/i,
                    /^s+i+s+[i]*[!]*$/i,             // sissi
                    /^s+i+s+[i]*g+n+o+r+[eèi]*[!]*$/i,  // sissignore
                    /^n+o+[!]*$/i,
                    /^c+[eè]*r+t+o+[!]*$/i,
                    /^c+[eè]*r+t+[aà]*m+[eè]*n+t+[eè]*[!]*$/i,  // certamente
                    /^[aà]+s+[o]*l+u+t+[aà]*m+[eè]*n+t+[eè]*[!]*$/i,  // assolutamente
                    /^o+v+[i]*[oa]+[!]*$/i,          // ovvio
                    /^o+v+[i]*[aà]*m+[eè]*n+t+[eè]*[!]*$/i,  // ovviamente
                    /^[eè]+s+[aà]+t+o+[!]*$/i,       // esatto
                    /^[eè]+s+[aà]+t+[aà]*m+[eè]*n+t+[eè]*[!]*$/i,  // esattamente
                    /^p+r+[eè]*c+i+s+[aà]*m+[eè]*n+t+[eè]*[!]*$/i,  // precisamente
                    /^p+r+o+p+r+i*o+\s*c+o+s+[ìi]+[!]*$/i,  // proprio così

                    // Saluti
                    /^c+i+[aà]+o+[n]*[eè]*[!]*$/i,   // ciao, ciaone
                    /^[aà]+r+i+v+[eè]*d+[eè]*r+[cl]+[ia]*[!]*$/i,  // arrivederci, arrivederla
                    /^[aà]+d+i+o+[!]*$/i,            // addio
                    /^b+u+o+n+[aoeèi]+\s*(g+i+o+r+n+[aà]+t+[aà]*|s+[eè]*r+[aà]+t+[aà]*|p+o+m+[eè]*r+i+g+i+o+|n+o+t+[eè]*)[!]*$/i,
                    /^b+u+o+n+g+i+o+r+n+o+[!]*$/i,   // buongiorno
                    /^b+u+o+n+[aà]*s+[eè]*r+[aà]*[!]*$/i,  // buonasera
                    /^b+u+o+n+[aà]*n+o+t+[eè]*[!]*$/i,  // buonanotte
                    /^[aà]+\s*p+r+[eè]*s+t+o+[!]*$/i,  // a presto
                    /^[aà]+\s*d+o+p+o+[!]*$/i,       // a dopo
                    /^[aà]+\s*d+o+m+[aà]+n+i+[!]*$/i,  // a domani
                    /^[aà]+\s*t+r+[aà]*\s*p+o+c+o+[!]*$/i,  // a tra poco
                    /^[aà]+\s*p+i+[uù]+\s*t+[aà]+r+d+i+[!]*$/i,  // a più tardi
                    /^[aà]+l+[aà]*\s*p+r+o+s+[i]*m+[aà]*[!]*$/i,  // alla prossima
                    /^c+i+\s*v+[eè]*d+i+[aà]*m+o+[!]*$/i,  // ci vediamo
                    /^c+i+\s*s+[eè]*n+t+i+[aà]*m+o+[!]*$/i,  // ci sentiamo
                    /^s+[aà]+l+u+t+i+[!]*$/i,        // saluti
                    /^(c+o+r+d+i+[aà]+l+i+\s*)?s+[aà]+l+u+t+i+[!]*$/i,  // cordiali saluti
                    /^u+n+\s*s+[aà]+l+u+t+o+[!]*$/i, // un saluto

                    // Conferme
                    /^d*['\']?[aà]+c+[o]*r+d+o+[!]*$/i,  // d'accordo, daccordo, accordo
                    /^s+o+n+o+\s*d*['\']?[aà]+c+[o]*r+d+o+[!]*$/i,  // sono d'accordo
                    /^c+o+n+f+[eè]*r+m+[oaie]*t*o*[!]*$/i,  // confermo, confermato
                    /^[aà]+\s*p+o+s+t+o+[!]*$/i,     // a posto, apposto
                    /^t+u+t+o+\s*[aà]+\s*p+o+s+t+o+[!]*$/i,  // tutto a posto
                    /^t+u+t+o+\s*o+k+[!]*$/i,        // tutto ok
                    /^f+[aà]+t+o+[!]*$/i,            // fatto

                    // Esclamazioni positive
                    /^[eè]+v+[i]*v+[aà]+[!]*$/i,     // evviva
                    /^u+r+[aà]+[!]*$/i,             // urrà
                    /^y+[eè]+[as]*[h]*[!]*$/i,      // yes, yess, yeah
                    /^w+o+w+[!]*$/i,                 // wow
                    /^u+[aà]+[uo]*[!]*$/i,          // uau
                    /^f+o+r+z+[aà]+[!]*$/i,         // forza
                    /^d+[aà]+i+[!]*$/i,             // dai
                    /^[aà]+n+d+i+[aà]+m+o+[!]*$/i,  // andiamo
                    /^v+[aà]+m+o+s+[!]*$/i,         // vamos

                    // Altro
                    /^n+i+[eè]*n+t+[eè]*[!]*$/i,    // niente
                    /^n+u+l+[aà]*[!]*$/i,           // nulla
                    /^n+[aà]+d+[aà]*[!]*$/i,        // nada
                    /^p+r+[eè]*g+o+[!]*$/i,         // prego
                    /^d+i+\s*n+i+[eè]*n+t+[eè]*[!]*$/i,  // di niente
                    /^d+i+\s*n+u+l+[aà]*[!]*$/i,    // di nulla
                    /^f+i+g+u+r+[aà]+t+i*[!]*$/i,   // figurati
                    /^s+i+\s*f+i+g+u+r+i+[!]*$/i,   // si figuri
                    /^t+r+[aà]+n+q+u+i+l+[oa]*[!]*$/i,  // tranquillo/a
                    /^t+r+[aà]+n+q+u+i+[!]*$/i,     // tranqui
                    /^s+[eè]*r+[eè]*n+[oa]*[!]*$/i, // sereno/a
                    /^t+u+t+o+\s*s+[eè]*r+[eè]*n+o+[!]*$/i  // tutto sereno
                  ];

                  // Emoji-only patterns
                  const emojiOnlyPattern = /^[\u{1F44D}\u{1F44C}\u{1F64F}\u{2764}\u{1F60A}\u{1F642}\u{2705}\u{1F4AA}\u{1F389}\u{1F38A}\u{2B50}\u{1F31F}\u{1F44F}\u{1F64C}\u{1F918}\u{1F919}\u{1F91D}\u{1F49B}\u{1F499}\u{1F49A}\u{1F49C}\u{1F9E1}\u{2728}\u{1F525}\u{1F60D}\u{1F970}\u{1F973}\u{1F929}\u{263A}\u{FE0F}\u{1F603}\u{1F604}\u{1F601}\u{1F606}\u{1F609}\u{1F617}\u{1F618}\u{1F619}\u{1F61A}\u{1F607}\s!.]+$/u;

                  const msgClean = messageContent.trim().toLowerCase().replace(/[!.,\s]+$/, '');

                  // Check if message matches any closure pattern
                  const isClosureMessage = closurePatterns.some(pattern => pattern.test(msgClean)) ||
                                          emojiOnlyPattern.test(messageContent.trim());

                  // If it's a closure message and we already responded, auto-close
                  if (isClosureMessage && !recentAIResponse.empty) {
                    console.log(`✅ Auto-closing conversation - closure message: "${messageContent}"`);
                    await conversationRef.update({
                      needsReply: false,
                      autoClosedAt: admin.firestore.FieldValue.serverTimestamp(),
                      autoCloseReason: 'closure_message'
                    });
                    return; // Skip AI, conversation closed
                  }

                  // Check if last AI message was already a "grazie" response - avoid duplicates
                  if (!recentAIResponse.empty) {
                    const lastAIMessage = recentAIResponse.docs[0].data().content?.toLowerCase() || '';
                    const isGrazieResponse = lastAIMessage.includes('grazie a lei') ||
                                            lastAIMessage.includes('buona esperienza immersiva') ||
                                            lastAIMessage.includes('resto a disposizione');

                    // If AI already said "grazie a lei" and user sends any closure-like message, just close
                    if (isGrazieResponse && isClosureMessage) {
                      console.log(`✅ Auto-closing - AI already sent grazie response`);
                      await conversationRef.update({
                        needsReply: false,
                        autoClosedAt: admin.firestore.FieldValue.serverTimestamp(),
                        autoCloseReason: 'grazie_already_sent'
                      });
                      return;
                    }

                    // Also catch any message that looks like continued thanks/closure after grazie response
                    const continueClosurePattern = /^(grazie|ok|va bene|perfetto|ciao|a dopo|si|no|bene)/i;
                    if (isGrazieResponse && continueClosurePattern.test(msgClean)) {
                      console.log(`✅ Auto-closing - continued closure after grazie: "${messageContent}"`);
                      await conversationRef.update({
                        needsReply: false,
                        autoClosedAt: admin.firestore.FieldValue.serverTimestamp(),
                        autoCloseReason: 'continued_closure'
                      });
                      return;
                    }
                  }

                  // Run queries in PARALLEL for speed
                  const [historySnapshot, bookingsSnapshot] = await Promise.all([
                    // Get full conversation history to avoid AI repeating itself
                    db.collection('whatsapp_messages')
                      .where('conversationId', '==', conversationId)
                      .orderBy('timestamp', 'desc')
                      .limit(30)
                      .get(),
                    // Get user's bookings (use conversationId directly)
                    db.collection('bookings')
                      .where('whatsapp', '==', from)
                      .where('status', '==', 'confirmed')
                      .orderBy('createdAt', 'desc')
                      .limit(3)
                      .get()
                  ]);

                  const conversationHistory = historySnapshot.docs
                    .map(doc => doc.data())
                    .reverse();

                  const userBookings = bookingsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                  }));

                  // Get city info in PARALLEL
                  const cityIds = [...new Set(userBookings.map(b => b.cityId).filter(Boolean))];
                  const cityDocs = await Promise.all(
                    cityIds.map(cityId => db.collection('cities').doc(cityId).get())
                  );

                  const eventContext = cityDocs
                    .filter(doc => doc.exists)
                    .map(doc => {
                      const city = doc.data();
                      const eventData = city.eventData || {};
                      return {
                        cityId: doc.id,
                        cityName: city.name,
                        status: city.status,
                        dates: eventData.dates,
                        duration: eventData.experienceDuration || eventData.duration,
                        location: eventData.location,
                        pricing: eventData.pricing
                      };
                    });

                  // Build user context with ALL booking details
                  const userContext = {
                    bookings: userBookings.map(b => ({
                      id: b.id,
                      name: b.name,
                      email: b.email,
                      whatsapp: b.whatsapp,
                      cityName: b.cityName,
                      cityId: b.cityId,
                      date: b.date,
                      time: b.time,
                      spots: b.spots,
                      status: b.status,
                      token: b.token
                    })),
                    events: eventContext
                  };

                  // Call AI Agent with full context
                  const aiResponse = await processWithAI(
                    conversationId,
                    from,
                    messageContent,
                    conversationHistory,
                    userContext
                  );

                  // If AI has a response, send it (unless escalated)
                  if (aiResponse) {
                    // Check if AI escalated to human operators (contains [ESCALATED] anywhere)
                    if (aiResponse.includes('[ESCALATED]')) {
                      console.log(`⏳ AI escalated to operators - no message sent to ${from}`);
                      // Conversation is already marked as needsReply from incoming message
                      // The notify_operators tool already sent push notifications
                      return; // Exit completely, send NOTHING to user
                    }

                    // Also block responses that mention operators/escalation without proper tag
                    const escalationPhrases = [
                      'operatore risponderà',
                      'operatore la contatterà',
                      'un operatore',
                      'contatteremo',
                      'la ricontatteremo',
                      'sarà contattato',
                      'sarà ricontattato',
                      'risponderà presto',
                      'attenda',
                      'attendere',
                      'non ho questa informazione',
                      'non posso aiutarla',
                      'non sono in grado'
                    ];
                    const responseLower = aiResponse.toLowerCase();
                    const isHiddenEscalation = escalationPhrases.some(phrase => responseLower.includes(phrase));

                    if (isHiddenEscalation) {
                      console.log(`⏳ AI tried to escalate without tag - blocking message: "${aiResponse.substring(0, 80)}..."`);
                      // Mark as needing human reply
                      await conversationRef.update({
                        needsReply: true,
                        aiEscalated: true,
                        escalationReason: 'hidden_escalation_blocked'
                      });
                      return; // Send NOTHING to user
                    }

                    // Normal response - proceed
                    // Check for duplicate response - don't send if we already sent similar message
                    const aiResponseLower = aiResponse.toLowerCase();
                    const recentOutgoing = conversationHistory.filter(m => m.direction === 'outgoing').slice(-3);
                    const isDuplicate = recentOutgoing.some(msg => {
                      const msgLower = (msg.content || '').toLowerCase();
                      // Check for very similar grazie messages
                      if (aiResponseLower.includes('grazie a lei') && msgLower.includes('grazie a lei')) {
                        return true;
                      }
                      // Check for identical or very similar messages
                      if (msgLower === aiResponseLower) {
                        return true;
                      }
                      return false;
                    });

                    if (isDuplicate) {
                      console.log(`⏭️ Skipping duplicate AI response: "${aiResponse.substring(0, 50)}..."`);
                      // Just close the conversation
                      await conversationRef.update({
                        needsReply: false,
                        autoClosedAt: admin.firestore.FieldValue.serverTimestamp(),
                        autoCloseReason: 'duplicate_response_prevented'
                      });
                      return;
                    }

                    const sent = await sendWhatsAppMessageDirect(from, aiResponse);

                    if (sent) {
                      // Save AI response to Firestore
                      await db.collection('whatsapp_messages').add({
                        conversationId: conversationId,
                        content: aiResponse,
                        direction: 'outgoing',
                        timestamp: admin.firestore.FieldValue.serverTimestamp(),
                        sentBy: 'ai_agent',
                        status: 'sent'
                      });

                      // Update conversation - AI responded, but still needs review
                      await conversationRef.update({
                        lastMessage: aiResponse.substring(0, 100),
                        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
                        aiResponded: true,
                        aiRespondedAt: admin.firestore.FieldValue.serverTimestamp(),
                        needsReply: false // AI handled it
                      });

                      console.log(`🤖 AI response sent to ${from}`);
                    }
                  }
                } catch (aiError) {
                  console.error('❌ AI Agent error:', aiError);
                  // Don't let AI errors affect message processing
                }
              } catch (error) {
                console.error(`❌ Error saving message from ${from}:`, error);
              }
            };

            promises.push(processMessage());
          }
        }

        // Handle message status updates
        if (value.statuses) {
          for (const status of value.statuses) {
            const messageId = status.id;
            const statusValue = status.status;

            const updateStatus = async () => {
              try {
                const messagesQuery = await db.collection('whatsapp_messages')
                  .where('whatsappMessageId', '==', messageId)
                  .limit(1)
                  .get();

                if (!messagesQuery.empty) {
                  await messagesQuery.docs[0].ref.update({ status: statusValue });
                  console.log(`📊 Status ${messageId}: ${statusValue}`);
                }
              } catch (error) {
                console.error(`❌ Error updating status:`, error);
              }
            };

            promises.push(updateStatus());
          }
        }
      }
    }

    // Wait for all operations to complete
    await Promise.all(promises);
    return;
  }

  return res.status(405).send('Method not allowed');
});

/**
 * Send WhatsApp reminder using template (promemoria_evento)
 * Saves message to Firestore for dashboard visibility
 */
exports.sendWhatsAppReminder = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { data } = req.body;
    const {
      phone,
      name,
      date,
      time,
      location,
      participants,
      bookingToken,
      bookingId
    } = data || {};

    if (!phone || !name || !date || !time || !location) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: phone, name, date, time, location'
      });
    }

    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      return res.status(500).json({ success: false, error: 'WhatsApp non configurato' });
    }

    const normalizedPhone = phone.replace(/\+/g, '').replace(/\s/g, '');
    const whatsappUrl = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

    // Send template message
    const response = await fetch(whatsappUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: normalizedPhone,
        type: 'template',
        template: {
          name: 'promemoria_evento',
          language: { code: 'it' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', parameter_name: 'nome', text: name },
                { type: 'text', parameter_name: 'data', text: date },
                { type: 'text', parameter_name: 'ore', text: time },
                { type: 'text', parameter_name: 'luogo', text: location },
                { type: 'text', parameter_name: 'n_partecipanti', text: String(participants || 1) }
              ]
            },
            {
              type: 'button',
              sub_type: 'url',
              index: '0',
              parameters: [
                { type: 'text', text: bookingToken || 'manage' }
              ]
            }
          ]
        }
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ WhatsApp template error:', result);
      return res.status(response.status).json({
        success: false,
        error: result.error?.message || 'Errore invio template WhatsApp'
      });
    }

    console.log('✅ WhatsApp reminder sent:', { phone: normalizedPhone, messageId: result.messages?.[0]?.id });

    const db = admin.firestore();
    const formattedPhone = '+' + normalizedPhone;

    // Find or create conversation
    let conversationId;
    const conversationsQuery = await db.collection('whatsapp_conversations')
      .where('phone', '==', formattedPhone)
      .limit(1)
      .get();

    if (conversationsQuery.empty) {
      // Create new conversation
      const convRef = await db.collection('whatsapp_conversations').add({
        phone: formattedPhone,
        name: name,
        lastMessage: `Promemoria: ${date} alle ${time}`,
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
        unreadCount: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      conversationId = convRef.id;
    } else {
      conversationId = conversationsQuery.docs[0].id;
      // Update conversation
      await db.collection('whatsapp_conversations').doc(conversationId).update({
        name: name, // Update name in case it changed
        lastMessage: `Promemoria: ${date} alle ${time}`,
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Build template message content for display
    const templateContent = `📅 *Promemoria prenotazione*

Gentile ${name},
Le ricordiamo l'evento Cultura Immersiva a cui risulta prenotato, che si terrà ${date} alle ${time} presso ${location}.

La Sua prenotazione è valida per ${participants || 1} partecipanti.

Per ulteriori informazioni o esigenze organizzative, può rispondere a questo messaggio.

Cordiali saluti,
Cultura Immersiva`;

    // Save message to Firestore for dashboard
    await db.collection('whatsapp_messages').add({
      conversationId: conversationId,
      content: templateContent,
      direction: 'outgoing',
      status: 'sent',
      whatsappMessageId: result.messages?.[0]?.id,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      isTemplate: true,
      templateName: 'promemoria_evento',
      operatorName: 'Sistema (Promemoria automatico)',
      bookingId: bookingId || null
    });

    return res.status(200).json({
      success: true,
      messageId: result.messages?.[0]?.id,
      conversationId: conversationId
    });

  } catch (error) {
    console.error('❌ Error sending WhatsApp reminder:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Automatic WhatsApp Reminders - runs every hour
 * Sends WhatsApp reminders 24 hours before events
 */
exports.sendWhatsAppAutoReminders = functions
  .region('europe-west1')
  .pubsub
  .schedule('every 1 hours')
  .timeZone('Europe/Rome')
  .onRun(async (context) => {
    console.log('📱 Starting automatic WhatsApp reminders check...');

    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      console.error('❌ WhatsApp not configured');
      return null;
    }

    try {
      const db = admin.firestore();
      const now = new Date();

      // Calculate time window: events happening in 23.5-24.5 hours (to account for hourly schedule)
      const minTime = new Date(now.getTime() + 23.5 * 60 * 60 * 1000);
      const maxTime = new Date(now.getTime() + 24.5 * 60 * 60 * 1000);

      console.log(`📅 Looking for events between ${minTime.toISOString()} and ${maxTime.toISOString()}`);

      // Get all confirmed bookings
      const bookingsSnapshot = await db.collection('bookings')
        .where('status', '==', 'confirmed')
        .get();

      let sentCount = 0;
      let errorCount = 0;

      for (const bookingDoc of bookingsSnapshot.docs) {
        const booking = bookingDoc.data();
        const bookingId = bookingDoc.id;

        // Skip if already sent WhatsApp reminder
        if (booking.whatsappReminderSent) continue;

        // Skip if no phone number (field is called 'whatsapp')
        if (!booking.whatsapp) continue;

        try {
          // Date format is YYYY-MM-DD
          const [year, month, day] = booking.date.split('-');
          const [hours, minutes] = booking.time.split(':');
          const eventDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));

          if (eventDate >= minTime && eventDate <= maxTime) {
            console.log(`📩 Sending WhatsApp reminder for booking ${bookingId}`);

            const cityDoc = await db.collection('cities').doc(booking.cityId).get();
            const cityData = cityDoc.exists ? cityDoc.data() : null;
            const cityName = cityData?.name || booking.cityId;
            const locationName = cityData?.eventData?.location?.name || '';
            const locationAddress = cityData?.eventData?.location?.address || '';
            // Full location string: "Location Name, Address - City"
            const fullLocation = locationName
              ? `${locationName}, ${locationAddress} - ${cityName}`.trim()
              : cityName;

            let phone = booking.whatsapp.replace(/\s/g, '').replace(/-/g, '');
            if (phone.startsWith('+')) phone = phone.substring(1);
            if (phone.startsWith('0')) phone = '39' + phone.substring(1);
            if (!phone.startsWith('39') && phone.length === 10) phone = '39' + phone;

            const whatsappUrl = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

            const response = await fetch(whatsappUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: phone,
                type: 'template',
                template: {
                  name: 'promemoria_evento',
                  language: { code: 'it' },
                  components: [
                    {
                      type: 'body',
                      parameters: [
                        { type: 'text', parameter_name: 'nome', text: booking.name },
                        { type: 'text', parameter_name: 'data', text: booking.date },
                        { type: 'text', parameter_name: 'ore', text: booking.time },
                        { type: 'text', parameter_name: 'luogo', text: fullLocation },
                        { type: 'text', parameter_name: 'n_partecipanti', text: String(booking.spots || 1) }
                      ]
                    },
                    {
                      type: 'button',
                      sub_type: 'url',
                      index: '0',
                      parameters: [{ type: 'text', text: booking.token || 'manage' }]
                    }
                  ]
                }
              })
            });

            const result = await response.json();

            if (response.ok && result.messages?.[0]?.id) {
              console.log(`✅ WhatsApp sent to ${phone}`);

              // Format date for display (YYYY-MM-DD to DD/MM/YYYY)
              const [y, m, d] = booking.date.split('-');
              const formattedDate = `${d}/${m}/${y}`;
              const spots = booking.spots || 1;

              // Full template message content
              const fullMessageContent = `*Promemoria prenotazione*

Gentile ${booking.name},
Le ricordiamo l'evento Cultura Immersiva a cui risulta prenotato, che si terrà ${formattedDate} alle ${booking.time} presso ${fullLocation}.

La Sua prenotazione è valida per ${spots} partecipant${spots === 1 ? 'e' : 'i'}.

Per ulteriori informazioni o esigenze organizzative, può rispondere a questo messaggio.

Cordiali saluti,
Cultura Immersiva

[Pulsante: Modifica prenotazione]`;

              const conversationId = phone.replace(/[^0-9]/g, '');
              const conversationRef = db.collection('whatsapp_conversations').doc(conversationId);
              const conversationDoc = await conversationRef.get();
              const batch = db.batch();

              if (!conversationDoc.exists) {
                batch.set(conversationRef, {
                  phone: '+' + phone,
                  name: booking.name,
                  lastMessage: 'Promemoria prenotazione',
                  lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
                  lastOutgoingAt: admin.firestore.FieldValue.serverTimestamp(),
                  needsReply: false,
                  unreadCount: 0,
                  createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
              } else {
                batch.update(conversationRef, {
                  lastMessage: 'Promemoria prenotazione',
                  lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
                  lastOutgoingAt: admin.firestore.FieldValue.serverTimestamp(),
                  needsReply: false
                });
              }

              const messageRef = db.collection('whatsapp_messages').doc();
              batch.set(messageRef, {
                conversationId: conversationId,
                content: fullMessageContent,
                direction: 'outgoing',
                status: 'sent',
                whatsappMessageId: result.messages[0].id,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                isTemplate: true,
                operatorName: 'Sistema (Auto)',
                bookingId: bookingId
              });

              batch.update(db.collection('bookings').doc(bookingId), {
                whatsappReminderSent: true,
                whatsappReminderSentAt: admin.firestore.FieldValue.serverTimestamp()
              });

              await batch.commit();
              sentCount++;
            } else {
              console.error(`❌ Failed: ${result.error?.message}`);
              errorCount++;
            }
          }
        } catch (e) {
          console.error(`❌ Error booking ${bookingId}:`, e.message);
          errorCount++;
        }
      }

      console.log(`📱 Complete: ${sentCount} sent, ${errorCount} errors`);
      return { sent: sentCount, errors: errorCount };

    } catch (error) {
      console.error('❌ Error in sendWhatsAppAutoReminders:', error);
      return null;
    }
  });

/**
 * Create a city operator with Firebase Auth account
 * Called from CityDashboard to add operators who can manage attendance
 */
exports.createCityOperator = functions.https.onCall(async (data, context) => {
  // Verify caller is authenticated and is admin
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Autenticazione richiesta');
  }

  const db = admin.firestore();

  // Check if caller is admin
  const callerDoc = await db.collection('operators').doc(context.auth.uid).get();
  const isAdmin = !callerDoc.exists || callerDoc.data()?.role === 'admin';

  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Solo gli admin possono creare operatori');
  }

  const { email, password, name, cityId, cityName } = data;

  if (!email || !password || !name || !cityId) {
    throw new functions.https.HttpsError('invalid-argument', 'Email, password, nome e città sono obbligatori');
  }

  if (password.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'La password deve essere di almeno 6 caratteri');
  }

  try {
    // Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: name
    });

    // Create operator document in Firestore
    await db.collection('operators').doc(userRecord.uid).set({
      email: email,
      name: name,
      role: 'city_operator',
      assignedCityId: cityId,
      assignedCityName: cityName || cityId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: context.auth.token.email || context.auth.uid
    });

    console.log(`✅ City operator created: ${email} for city ${cityId}`);

    return {
      success: true,
      uid: userRecord.uid,
      message: `Operatore ${name} creato con successo`
    };

  } catch (error) {
    console.error('Error creating city operator:', error);

    if (error.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError('already-exists', 'Questa email è già registrata');
    }
    if (error.code === 'auth/invalid-email') {
      throw new functions.https.HttpsError('invalid-argument', 'Email non valida');
    }
    if (error.code === 'auth/weak-password') {
      throw new functions.https.HttpsError('invalid-argument', 'Password troppo debole');
    }

    throw new functions.https.HttpsError('internal', 'Errore nella creazione dell\'operatore: ' + error.message);
  }
});

/**
 * Delete a city operator
 */
exports.deleteCityOperator = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Autenticazione richiesta');
  }

  const db = admin.firestore();

  // Check if caller is admin
  const callerDoc = await db.collection('operators').doc(context.auth.uid).get();
  const isAdmin = !callerDoc.exists || callerDoc.data()?.role === 'admin';

  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Solo gli admin possono eliminare operatori');
  }

  const { operatorId } = data;

  if (!operatorId) {
    throw new functions.https.HttpsError('invalid-argument', 'ID operatore richiesto');
  }

  try {
    // Delete Firebase Auth user
    await admin.auth().deleteUser(operatorId);

    // Delete operator document
    await db.collection('operators').doc(operatorId).delete();

    console.log(`✅ City operator deleted: ${operatorId}`);

    return { success: true };

  } catch (error) {
    console.error('Error deleting city operator:', error);
    throw new functions.https.HttpsError('internal', 'Errore nell\'eliminazione: ' + error.message);
  }
});
