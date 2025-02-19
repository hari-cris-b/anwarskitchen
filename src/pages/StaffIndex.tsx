import React, { Suspense } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBoundary from '../components/ErrorBoundary';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const StaffPage = React.lazy(() => import('./Staff'));

export const StaffIndex: React.FC = () => {
  const { profile } = useAuth();

  if (!profile?.staff_type || profile.staff_type !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="flex h-screen items-center justify-center">
          <LoadingSpinner />
        </div>
      }>
        <StaffPage />
      </Suspense>
    </ErrorBoundary>
  );
};

export default StaffIndex;