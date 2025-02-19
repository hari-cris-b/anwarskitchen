import React, { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import LoadingSpinner from './LoadingSpinner';

interface SuperAdminRouteProps {
  children: ReactNode;
}

export default function SuperAdminRoute({ children }: SuperAdminRouteProps) {
  const { profile, loading } = useAuth();
  const location = useLocation();
  const [canAccess, setCanAccess] = useState<boolean | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    async function checkAccess() {
      if (!profile?.auth_id) {
        setCanAccess(false);
        setCheckingAccess(false);
        return;
      }

      try {
        // Check role and permissions
        const { data, error } = await supabase.rpc(
          'get_user_role',
          { check_auth_id: profile.auth_id }
        );

        if (error) {
          console.error('Error checking role:', error);
          setCanAccess(false);
          return;
        }

        const userRole = data?.[0];
        const hasAccess = userRole?.is_super_admin === true;

        console.log('Role check result:', {
          role: userRole?.role_type,
          isSuperAdmin: userRole?.is_super_admin,
          hasAccess
        });

        setCanAccess(hasAccess);
      } catch (error) {
        console.error('Error in role check:', error);
        setCanAccess(false);
      } finally {
        setCheckingAccess(false);
      }
    }

    void checkAccess();
  }, [profile?.auth_id]);

  if (loading || checkingAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="large" label="Checking access..." />
      </div>
    );
  }

  if (!profile?.auth_id) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!canAccess && !loading && !checkingAccess) {
    console.log('Access denied to super admin route:', {
      path: location.pathname,
      userType: profile?.staff_type
    });
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}