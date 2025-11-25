// Email service for booking confirmations
// Uses Firebase Cloud Function + SendGrid for sending emails

import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../config/firebase';

// Initialize Firebase Functions
const functions = getFunctions(app);

// Reference to the Cloud Function
const sendBookingConfirmationFunction = httpsCallable(functions, 'sendBookingConfirmation');

export const sendBookingConfirmation = async (booking, token) => {
  try {
    console.log('📧 Sending booking confirmation email to:', booking.email);

    // Call the Firebase Cloud Function to send email via SendGrid
    const result = await sendBookingConfirmationFunction({
      booking,
      token
    });

    console.log('✅ Email sent successfully:', result.data);

    const baseUrl = window.location.origin;
    const editUrl = `${baseUrl}/booking-manage/${token}`;
    const cancelUrl = `${baseUrl}/booking-cancel/${token}`;

    return {
      success: true,
      editUrl,
      cancelUrl
    };

  } catch (error) {
    console.error('❌ Error sending email:', error);

    // Don't throw error - we don't want to fail the booking if email fails
    // Just log it and return success: false
    return {
      success: false,
      error: error.message
    };
  }
};

export const getEmailTemplate = () => {
  return `
Per configurare l'invio email in produzione:

1. Registrati su EmailJS (https://www.emailjs.com/) - GRATUITO per 200 email/mese
2. Crea un servizio email
3. Crea un template con queste variabili:
   - {{to_email}}
   - {{to_name}}
   - {{city_name}}
   - {{booking_date}}
   - {{booking_time}}
   - {{booking_spots}}
   - {{edit_url}}
   - {{cancel_url}}

4. Aggiungi al file .env:
   VITE_EMAILJS_SERVICE_ID=tuo_service_id
   VITE_EMAILJS_TEMPLATE_ID=tuo_template_id
   VITE_EMAILJS_PUBLIC_KEY=tua_public_key

5. Installa: npm install emailjs-com

Oppure usa SendGrid, Resend, o Firebase Functions + Nodemailer
  `;
};
