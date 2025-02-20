import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { FranchiseProvider } from './contexts/FranchiseContext';
import ProtectedRoute from './components/ProtectedRoute';
import SuperAdminRoute from './components/SuperAdminRoute';
import RoleBasedRoute from './components/RoleBasedRoute';
import Navigation from './components/Navigation';

// Staff Routes
import StaffIndex from './pages/StaffIndex';
import Staff from './pages/Staff';
import Menu from './pages/Menu';
import POS from './pages/POS';
import Kitchen from './pages/Kitchen';
import Orders from './pages/Orders';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Profile from './pages/Profile';

// Auth Routes
import Login from './pages/Login';
import CreateAccount from './pages/CreateAccount';
import Unauthorized from './pages/Unauthorized';

// Super Admin Routes
import SuperAdminLayout from './pages/SuperAdmin/Layout';
import SuperAdminDashboard from './pages/SuperAdmin/Dashboard';
import SuperAdminSettings from './pages/SuperAdmin/Settings';
import Franchises from './pages/SuperAdmin/Franchises';
import FranchiseForm from './pages/SuperAdmin/FranchiseForm';
import Performance from './pages/SuperAdmin/Performance';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FranchiseProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/create-account" element={<CreateAccount />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Super Admin Routes */}
            <Route path="/super-admin" element={
              <SuperAdminRoute>
                <SuperAdminLayout />
              </SuperAdminRoute>
            }>
              <Route index element={<SuperAdminDashboard />} />
              <Route path="franchises" element={<Franchises />} />
              <Route path="franchises/new" element={<FranchiseForm />} />
              <Route path="franchises/:id" element={<FranchiseForm />} />
              <Route path="performance" element={<Performance />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<SuperAdminSettings />} />
            </Route>

            {/* Staff Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <StaffIndex />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/pos" replace />} />
              <Route path="pos" element={<POS />} />
              <Route path="kitchen" element={
                <RoleBasedRoute allowedRoles={['kitchen', 'admin', 'manager']}>
                  <Kitchen />
                </RoleBasedRoute>
              } />
              <Route path="orders" element={<Orders />} />
              <Route path="menu" element={
                <RoleBasedRoute allowedRoles={['admin', 'manager']}>
                  <Menu />
                </RoleBasedRoute>
              } />
              <Route path="staff" element={
                <RoleBasedRoute allowedRoles={['admin', 'manager']}>
                  <Staff />
                </RoleBasedRoute>
              } />
              <Route path="reports" element={
                <RoleBasedRoute allowedRoles={['admin', 'manager']}>
                  <Reports />
                </RoleBasedRoute>
              } />
              <Route path="settings" element={
                <RoleBasedRoute allowedRoles={['admin']}>
                  <Settings />
                </RoleBasedRoute>
              } />
              <Route path="profile" element={<Profile />} />
            </Route>

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#333',
                color: '#fff',
              },
            }}
          />
        </FranchiseProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;