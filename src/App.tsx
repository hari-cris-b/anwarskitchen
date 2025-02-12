import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleBasedRoute from './components/RoleBasedRoute';
import Navigation from './components/Navigation';
import LoadingSpinner from './components/LoadingSpinner';
import { Suspense, lazy } from 'react';
import { FranchiseProvider } from './contexts/FranchiseContext';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load route components
const Login = lazy(() => import('./pages/Login'));
const POS = lazy(() => import('./pages/POS'));
const Kitchen = lazy(() => import('./pages/Kitchen'));
const Orders = lazy(() => import('./pages/Orders'));
const Menu = lazy(() => import('./pages/Menu'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const StaffIndex = lazy(() => import('./pages/StaffIndex'));
const Profile = lazy(() => import('./pages/Profile'));
const Unauthorized = lazy(() => import('./pages/Unauthorized'));

// Loading fallback component
const PageLoader = () => (
  <div className="h-screen flex items-center justify-center">
    <LoadingSpinner />
  </div>
);

function AppRoutes() {
  const { loading, user, profile } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  // If not logged in and not on login page, redirect to login
  if (!user && window.location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  // If logged in and on login page, redirect to POS
  if (user && window.location.pathname === '/login' && profile?.franchise_id) {
    return <Navigate to="/pos" replace />;
  }

  const userRole = profile?.role || 'staff';

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          
          {/* Main Routes */}
          <Route path="/*" element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-50">
                <Navigation />
                <main className="pt-4">
                  <Routes>
                    <Route path="/" element={<Navigate to="pos" replace />} />
                    <Route path="pos" element={
                      <RoleBasedRoute allowedRoles={['staff', 'manager', 'admin']}>
                        <ErrorBoundary>
                          <POS />
                        </ErrorBoundary>
                      </RoleBasedRoute>
                    } />
                    <Route path="kitchen" element={
                      <RoleBasedRoute allowedRoles={['kitchen', 'manager', 'admin']}>
                        <ErrorBoundary>
                          <Kitchen />
                        </ErrorBoundary>
                      </RoleBasedRoute>
                    } />
                    <Route path="orders" element={
                      <RoleBasedRoute allowedRoles={['staff', 'manager', 'admin', 'kitchen']}>
                        <ErrorBoundary>
                          <Orders />
                        </ErrorBoundary>
                      </RoleBasedRoute>
                    } />
                    <Route path="menu" element={
                      <RoleBasedRoute allowedRoles={['manager', 'admin']}>
                        <ErrorBoundary>
                          <Menu />
                        </ErrorBoundary>
                      </RoleBasedRoute>
                    } />
                    <Route path="reports" element={
                      <RoleBasedRoute allowedRoles={['manager', 'admin']}>
                        <ErrorBoundary>
                          <Reports />
                        </ErrorBoundary>
                      </RoleBasedRoute>
                    } />
                    <Route path="settings" element={
                      <RoleBasedRoute allowedRoles={['admin']}>
                        <ErrorBoundary>
                          <Settings />
                        </ErrorBoundary>
                      </RoleBasedRoute>
                    } />
                    <Route path="staff" element={
                      <RoleBasedRoute allowedRoles={['admin']}>
                        <ErrorBoundary>
                          <StaffIndex />
                        </ErrorBoundary>
                      </RoleBasedRoute>
                    } />
                    <Route path="profile" element={
                      <ErrorBoundary>
                        <Profile />
                      </ErrorBoundary>
                    } />
                  </Routes>
                </main>
              </div>
            </ProtectedRoute>
          } />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <FranchiseProvider>
            <AppRoutes />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#22c55e',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 4000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </FranchiseProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;