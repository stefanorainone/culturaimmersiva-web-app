import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FaLock, FaEnvelope } from 'react-icons/fa';
import { logger } from '../../utils/logger';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await login(email, password);

      // Log successful login (without sensitive data)
      logger.log(`✅ Login successful at ${new Date().toISOString()}`);

      // Check if user is a city operator and redirect to their dashboard
      const operatorDoc = await getDoc(doc(db, 'operators', userCredential.user.uid));
      if (operatorDoc.exists()) {
        const operatorData = operatorDoc.data();
        if (operatorData.role === 'city_operator' && operatorData.assignedCityId) {
          navigate(`/admin/city-dashboard/${operatorData.assignedCityId}`);
          return;
        }
        if (operatorData.role === 'whatsapp_operator') {
          navigate('/admin/whatsapp');
          return;
        }
      }

      navigate('/admin/dashboard');
    } catch (error) {
      // Log failed login attempt (without sensitive data)
      const timestamp = new Date().toISOString();
      const errorCode = error.code || 'unknown';

      logger.warn(`🔒 Failed login attempt at ${timestamp}`, {
        errorCode,
        email: email ? '***' : 'empty', // Don't log actual email
        timestamp
      });

      // Track failed attempts in localStorage for rate limiting
      const failedAttempts = JSON.parse(localStorage.getItem('failedLoginAttempts') || '[]');
      failedAttempts.push({ timestamp, errorCode });

      // Keep only last 10 attempts
      const recentAttempts = failedAttempts.slice(-10);
      localStorage.setItem('failedLoginAttempts', JSON.stringify(recentAttempts));

      // Check if too many recent failures (5 in last 15 minutes)
      const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
      const recentFailures = recentAttempts.filter(
        attempt => new Date(attempt.timestamp).getTime() > fifteenMinutesAgo
      );

      if (recentFailures.length >= 5) {
        setError('⚠️ Troppi tentativi falliti. Attendi 15 minuti prima di riprovare.');
        logger.warn('🚨 Account temporarily locked due to too many failed attempts');
      } else {
        // Display user-friendly error based on error code
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          setError('Email o password non corretti');
        } else if (error.code === 'auth/too-many-requests') {
          setError('Troppi tentativi. Account temporaneamente bloccato.');
        } else if (error.code === 'auth/invalid-email') {
          setError('Formato email non valido');
        } else {
          setError('Errore durante l\'accesso. Riprova.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-primary rounded-full mb-4">
            <FaLock className="text-white text-3xl" />
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">Admin Login</h1>
          <p className="text-gray-600">Dashboard Cultura Immersiva</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <FaEnvelope className="text-gray-400" />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="admin@culturaimmersiva.it"
                required
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <FaLock className="text-gray-400" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
