import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';
import Login from './pages/Login';
import POS from './pages/POS';
import Kitchen from './pages/Kitchen';
import Orders from './pages/Orders';
import Profile from './pages/Profile';
import Unauthorized from './pages/Unauthorized';
import FranchiseProvider from './contexts/FranchiseContext';

function AppRoutes() {
  const { loading, user, profile } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading your account..." />;
  }

  // If not logged in and not on login page, redirect to login
  if (!user && window.location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  // If logged in and on login page, redirect to POS
  if (user && window.location.pathname === '/login' && profile?.franchise_id) {
    return <Navigate to="/pos" replace />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      
      {/* Main Routes */}
      <Route path="/*" element={
        <ProtectedRoute>
          <FranchiseProvider>
            <Routes>
              <Route path="/" element={<Navigate to="pos" replace />} />
              <Route path="pos" element={<POS />} />
              <Route path="kitchen" element={<Kitchen />} />
              <Route path="orders" element={<Orders />} />
              <Route path="profile" element={<Profile />} />
            </Routes>
          </FranchiseProvider>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#333',
              color: '#fff',
            },
            success: {
              iconTheme: {
                primary: '#22c55e',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;