
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './contexts/AuthContext';
import awsConfig from './aws-config';

import ProtectedRoute, { AdminRoute, UserRoute, RoleBasedRedirect } from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import HomeWithRedirect from './components/HomeWithRedirect';
import About from './pages/About';
import Login from './pages/Login';
import Register from './pages/Register';
import AuthCallback from './components/AuthCallback';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import Store from './pages/Store';
import Discover from './pages/Discover';
import Chatbot from './pages/Chatbot';
import Orders from './pages/Orders';
import Favorites from './pages/Favorites';
import Settings from './pages/Settings';
import AdminProducts from './pages/admin/AdminProducts';
import AdminAnimals from './pages/admin/AdminAnimals';
import AdminUsers from './pages/admin/AdminUsers';
import AdminOrders from './pages/admin/AdminOrders';
import AdminContent from './pages/admin/AdminContent';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminSettings from './pages/admin/AdminSettings';
import GoogleOAuthTest from './components/GoogleOAuthTest';
import NearbyServices from './pages/Discover';

// Configure AWS Amplify
Amplify.configure(awsConfig);

// Component to conditionally render Navbar
const ConditionalNavbar = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return !isAdminRoute ? <Navbar /> : null;
};

function App() {
  // Check if Google Client ID is properly configured
  const isGoogleConfigured = awsConfig.Google.clientId &&
    awsConfig.Google.clientId !== 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com' &&
    awsConfig.Google.clientId !== '123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com';

  const AppContent = () => (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <ConditionalNavbar />
          <main>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomeWithRedirect />} />
              <Route path="/about" element={<About />} />
              <Route path="/store" element={<Store />} />
              <Route path="/discover" element={<Discover />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/auth/callback" element={<AuthCallback />} />

              {/* Google OAuth Test Route */}
              <Route path="/test-google" element={<GoogleOAuthTest />} />

              {/* Protected Routes */}
              <Route
                path="/admin-dashboard"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/products"
                element={
                  <AdminRoute>
                    <AdminProducts />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/animals"
                element={
                  <AdminRoute>
                    <AdminAnimals />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <AdminRoute>
                    <AdminUsers />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/orders"
                element={
                  <AdminRoute>
                    <AdminOrders />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/content"
                element={
                  <AdminRoute>
                    <AdminContent />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/analytics"
                element={
                  <AdminRoute>
                    <AdminAnalytics />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <AdminRoute>
                    <AdminSettings />
                  </AdminRoute>
                }
              />
            
              <Route
                path="/nearby-services"
                element={<NearbyServices />}
              />
              <Route
                path="/user-dashboard"
                element={
                  <UserRoute>
                    <UserDashboard />
                  </UserRoute>
                }
              />
              <Route
                path="/chatbot"
                element={
                  <ProtectedRoute>
                    <Chatbot />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <ProtectedRoute>
                    <Orders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/favorites"
                element={
                  <ProtectedRoute>
                    <Favorites />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />

              {/* Role-based redirect route */}
              <Route path="/dashboard" element={<RoleBasedRedirect />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );

  return isGoogleConfigured ? (
    <GoogleOAuthProvider clientId={awsConfig.Google.clientId}>
      <AppContent />
    </GoogleOAuthProvider>
  ) : (
    <AppContent />
  );
}

export default App;
