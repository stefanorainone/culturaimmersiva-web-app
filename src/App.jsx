import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Cities from './pages/Cities';
import CityDetail from './pages/CityDetail';
import Booking from './pages/Booking';
import BookingForm from './pages/BookingForm';
import BookingManage from './pages/BookingManage';
import BookingCancel from './pages/BookingCancel';
import Ticket from './pages/Ticket';
import Schools from './pages/Schools';
import Museums from './pages/Museums';
import Hotels from './pages/Hotels';
import Contact from './pages/Contact';
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminBookings from './pages/admin/Bookings';
import CityForm from './pages/admin/CityForm';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
        <Routes>
          {/* Public Routes with Header/Footer */}
          <Route path="/*" element={
            <div className="flex flex-col min-h-screen">
              <Header />
              <main className="flex-grow">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/citta" element={<Cities />} />
                  <Route path="/citta/:cityId" element={<CityDetail />} />
                  <Route path="/booking/:cityId" element={<Booking />} />
                  <Route path="/booking-form/:cityId" element={<BookingForm />} />
                  <Route path="/booking-manage/:token" element={<BookingManage />} />
                  <Route path="/booking-cancel/:token" element={<BookingCancel />} />
                  <Route path="/scuole" element={<Schools />} />
                  <Route path="/musei" element={<Museums />} />
                  <Route path="/hotel" element={<Hotels />} />
                  <Route path="/contatti" element={<Contact />} />
                </Routes>
              </main>
              <Footer />
            </div>
          } />

          {/* Ticket Page without Header/Footer */}
          <Route path="/ticket" element={<Ticket />} />

          {/* Admin Routes without Header/Footer */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/bookings" element={
            <ProtectedRoute>
              <AdminBookings />
            </ProtectedRoute>
          } />
          <Route path="/admin/cities/:id" element={
            <ProtectedRoute>
              <CityForm />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
