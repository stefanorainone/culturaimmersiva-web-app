import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import WhatsAppButton from './components/WhatsAppButton';
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
import Collabora from './pages/Collabora';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsConditions from './pages/TermsConditions';
import Blog from './pages/Blog';
import BlogArticle from './pages/BlogArticle';
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminBookings from './pages/admin/Bookings';
import AdminReminders from './pages/admin/Reminders';
import AdminFixSlots from './pages/admin/FixSlots';
import AdminArticles from './pages/admin/Articles';
import AdminWhatsApp from './pages/admin/WhatsApp';
import AdminOperators from './pages/admin/Operators';
import CityForm from './pages/admin/CityForm';
import CityDashboard from './pages/admin/CityDashboard';

// Redirect component for /news/:slug to /blog/:slug
const NewsSlugRedirect = () => {
  const { slug } = useParams();
  return <Navigate to={`/blog/${slug}`} replace />;
};

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
                  <Route path="/collabora" element={<Collabora />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/termini-condizioni" element={<TermsConditions />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:slug" element={<BlogArticle />} />
                  {/* Redirect old news URLs to blog */}
                  <Route path="/news" element={<Navigate to="/blog" replace />} />
                  <Route path="/news/:slug" element={<NewsSlugRedirect />} />
                </Routes>
              </main>
              <Footer />
              <WhatsAppButton />
            </div>
          } />

          {/* Ticket Page without Header/Footer */}
          <Route path="/ticket" element={<Ticket />} />

          {/* Admin Routes without Header/Footer */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/bookings" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminBookings />
            </ProtectedRoute>
          } />
          <Route path="/admin/reminders" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminReminders />
            </ProtectedRoute>
          } />
          <Route path="/admin/fix-slots" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminFixSlots />
            </ProtectedRoute>
          } />
          <Route path="/admin/articles" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminArticles />
            </ProtectedRoute>
          } />
          <Route path="/admin/whatsapp" element={
            <ProtectedRoute allowedRoles={['admin', 'whatsapp_operator']}>
              <AdminWhatsApp />
            </ProtectedRoute>
          } />
          <Route path="/admin/operators" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminOperators />
            </ProtectedRoute>
          } />
          <Route path="/admin/cities/:id" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <CityForm />
            </ProtectedRoute>
          } />
          <Route path="/admin/city-dashboard/:cityId" element={
            <ProtectedRoute allowedRoles={['admin', 'operator', 'city_operator']}>
              <CityDashboard />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
