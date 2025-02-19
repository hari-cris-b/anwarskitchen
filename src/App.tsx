import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { FranchiseProvider } from './contexts/FranchiseContext';
import { Toaster } from 'react-hot-toast';
import Navigation from './components/Navigation';
import ProtectedRoute from './components/ProtectedRoute';
import RoleBasedRoute from './components/RoleBasedRoute';
import SuperAdminRoute from './components/SuperAdminRoute';
import ErrorBoundary from './components/ErrorBoundary';
import FloatingActionButton from './components/FloatingActionButton';
import DebugConsole from './components/DebugConsole';

// Pages
import Login from './pages/Login';
import CreateAccount from './pages/CreateAccount';
import POS from './pages/POS';
import Kitchen from './pages/Kitchen';
import Menu from './pages/Menu';
import Staff from './pages/Staff';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Orders from './pages/Orders';
import Unauthorized from './pages/Unauthorized';

// Super Admin Pages
import SuperAdminLayout from './pages/SuperAdmin/Layout';
import Franchises from './pages/SuperAdmin/Franchises';
import FranchiseForm from './pages/SuperAdmin/FranchiseForm';
import Dashboard from './pages/SuperAdmin/Dashboard';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <FranchiseProvider>
            <div className="min-h-screen bg-gray-100">
              <Navigation />
              <main className="p-4">
                <Routes>
                  {/* Public Routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/create-account" element={<CreateAccount />} />
                  <Route path="/unauthorized" element={<Unauthorized />} />

                  {/* Super Admin Routes */}
                  <Route path="/super-admin" element={<SuperAdminRoute><SuperAdminLayout /></SuperAdminRoute>}>
                    <Route index element={<Navigate to="franchises" replace />} />
                    <Route path="franchises" element={<Franchises />} />
                    <Route path="franchises/new" element={<FranchiseForm />} />
                    <Route path="franchises/:id" element={<FranchiseForm />} />
                    <Route path="dashboard" element={<Dashboard />} />
                  </Route>

                  {/* Staff Routes */}
                  <Route
                    path="/pos"
                    element={
                      <RoleBasedRoute allowedRoles={['admin', 'manager', 'staff']}>
                        <POS />
                      </RoleBasedRoute>
                    }
                  />

                  <Route
                    path="/kitchen"
                    element={
                      <RoleBasedRoute allowedRoles={['admin', 'manager', 'kitchen']}>
                        <Kitchen />
                      </RoleBasedRoute>
                    }
                  />

                  <Route
                    path="/menu"
                    element={
                      <RoleBasedRoute allowedRoles={['admin', 'manager']}>
                        <Menu />
                      </RoleBasedRoute>
                    }
                  />

                  <Route
                    path="/staff"
                    element={
                      <RoleBasedRoute allowedRoles={['admin', 'manager']}>
                        <Staff />
                      </RoleBasedRoute>
                    }
                  />

                  <Route
                    path="/orders"
                    element={
                      <RoleBasedRoute allowedRoles={['admin', 'manager']}>
                        <Orders />
                      </RoleBasedRoute>
                    }
                  />

                  <Route
                    path="/reports"
                    element={
                      <RoleBasedRoute allowedRoles={['admin', 'manager']}>
                        <Reports />
                      </RoleBasedRoute>
                    }
                  />

                  <Route
                    path="/settings"
                    element={
                      <RoleBasedRoute allowedRoles={['admin']}>
                        <Settings />
                      </RoleBasedRoute>
                    }
                  />

                  {/* Common Protected Routes */}
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute requireFranchise={false}>
                        <Profile />
                      </ProtectedRoute>
                    }
                  />

                  {/* Default Route - Conditional based on user type */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        {({ profile }) => 
                          profile?.staff_type === 'super_admin' ? (
                            <Navigate to="/super-admin/franchises" replace />
                          ) : (
                            <Navigate to="/pos" replace />
                          )
                        }
                      </ProtectedRoute>
                    }
                  />

                  {/* Catch-all Route */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
              <FloatingActionButton />
              {process.env.NODE_ENV === 'development' && (
                <DebugConsole position="bottom-right" defaultExpanded={false} />
              )}
            </div>
          </FranchiseProvider>
        </AuthProvider>
      </Router>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#4ade80',
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
    </ErrorBoundary>
  );
}

export default App;