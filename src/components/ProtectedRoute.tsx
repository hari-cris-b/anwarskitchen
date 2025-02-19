import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import { AuthUser } from '../types/staff';

interface ProtectedRouteProps {
  children: ReactNode | ((props: { profile: AuthUser }) => ReactNode);
  requireFranchise?: boolean;
}

export default function ProtectedRoute({ children, requireFranchise = true }: ProtectedRouteProps) {
  const { session, profile, loading, error } = useAuth();
  const location = useLocation();

  // Prevent flashing unauthorized during initial load
  if (loading || (!loading && session && !profile)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="large" label="Loading..." />
      </div>
    );
  }

  if (error) {
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  if (!session || !profile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Only check franchise requirement if we have a valid profile
  if (requireFranchise && !profile.franchise_id && profile.staff_type !== 'super_admin') {
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  if (typeof children === 'function') {
    return <>{children({ profile })}</>;
  }

  return <>{children}</>;
}