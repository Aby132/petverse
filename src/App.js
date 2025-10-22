
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import React, { Suspense, lazy } from 'react';
import { Amplify } from 'aws-amplify';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './contexts/AuthContext';
import awsConfig from './aws-config';

import ProtectedRoute, { AdminRoute, UserRoute, RoleBasedRedirect } from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import HomeWithRedirect from './components/HomeWithRedirect';
const About = lazy(() => import('./pages/About'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const AuthCallback = lazy(() => import('./components/AuthCallback'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const Store = lazy(() => import('./pages/Store'));
const Cart = lazy(() => import('./pages/Cart'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Discover = lazy(() => import('./pages/Discover'));
const Chatbot = lazy(() => import('./pages/Chatbot'));
const Orders = lazy(() => import('./pages/Orders'));
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation'));
const Favorites = lazy(() => import('./pages/Favorites'));
const Settings = lazy(() => import('./pages/Settings'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const AdminAnimals = lazy(() => import('./pages/admin/AdminAnimals'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminContent = lazy(() => import('./pages/admin/AdminContent'));
const AdminCommunity = lazy(() => import('./pages/admin/AdminCommunity'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const Community = lazy(() => import('./pages/Community'));
const Animals = lazy(() => import('./pages/Animals'));


// Configure AWS Amplify
Amplify.configure(awsConfig);

// Component to conditionally render Navbar
const ConditionalNavbar = () => {
  const location = useLocation();
  const path = location.pathname;
  const isUserCommunityPage = path.startsWith('/admin/community');
  const isOtherAdminPage = path.startsWith('/admin') && !isUserCommunityPage;
  const isAdminCommunitiesShortPath = path.startsWith('/communities');
  const hideNavbar = isOtherAdminPage || isAdminCommunitiesShortPath;

  return hideNavbar ? null : <Navbar />;
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
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomeWithRedirect />} />
              <Route path="/about" element={<About />} />
              <Route path="/store" element={<Store />} />
              <Route path="/animals" element={<Animals />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/product/:productId" element={<ProductDetail />} />
              <Route path="/discover" element={<Discover />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/auth/callback" element={<AuthCallback />} />



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
                path="/admin/communities"
                element={
                  <AdminRoute>
                    <AdminCommunity />
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
                path="/user-dashboard"
                element={
                  <UserRoute>
                    <UserDashboard />
                  </UserRoute>
                }
              />
              <Route
                path="/checkout"
                element={
                  <ProtectedRoute>
                    <Checkout />
                  </ProtectedRoute>
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
                path="/order-confirmation"
                element={
                  <ProtectedRoute>
                    <OrderConfirmation />
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
              <Route
                path="/admin/community"
                element={
                  <ProtectedRoute>
                    <Community />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/communities"
                element={
                  <AdminRoute>
                    <AdminCommunity />
                  </AdminRoute>
                }
              />

              {/* Role-based redirect route */}
              <Route path="/dashboard" element={<RoleBasedRedirect />} />
            </Routes>
            </Suspense>
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
