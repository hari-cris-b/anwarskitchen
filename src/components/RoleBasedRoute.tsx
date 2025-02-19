import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { StaffRole } from '../types/staff';
import { authLogger } from '../utils/authLogger';
import LoadingSpinner from './LoadingSpinner';
import { supabase } from '../lib/supabase';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles: StaffRole[];
}

export default function RoleBasedRoute({ children, allowedRoles }: RoleBasedRouteProps) {
  const { profile, loading } = useAuth();
  const location = useLocation();
  const [canAccess, setCanAccess] = useState<boolean | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    function checkAccess() {
      if (!profile?.auth_id) {
        authLogger.debug('RoleBasedRoute', 'No auth ID found', {
          path: location.pathname
        });
        setCanAccess(false);
        setCheckingAccess(false);
        return;
      }

      try {
        // Super admins can access everything
        if (profile.staff_type === 'super_admin') {
          authLogger.info('RoleBasedRoute', 'Super admin access granted', {
            path: location.pathname
          });
          setCanAccess(true);
          setCheckingAccess(false);
          return;
        }

        authLogger.debug('RoleBasedRoute', 'Starting access check', {
          profile: {
            staff_type: profile.staff_type,
            permissions: profile.permissions
          }
        });

        // First check if user has an allowed role
        const hasAllowedRole = allowedRoles.includes(profile.staff_type);
        
        // If user is admin AND has allowed role, grant access immediately
        if (hasAllowedRole && profile.staff_type === 'admin') {
          authLogger.info('RoleBasedRoute', 'Admin access granted', {
            path: location.pathname,
            allowedRoles
          });
          setCanAccess(true);
          setCheckingAccess(false);
          return;
        }

        // For non-admin roles or if admin doesn't have allowed role
        if (!hasAllowedRole) {
          authLogger.debug('RoleBasedRoute', 'Role not allowed', {
            currentRole: profile.staff_type,
            allowedRoles
          });
          setCanAccess(false);
          setCheckingAccess(false);
          return;
        }

        // For non-admin roles, check specific permissions
        let hasRequiredPermissions = true;
        if (profile.staff_type !== 'admin') {
          switch (location.pathname) {
            case '/menu':
              hasRequiredPermissions = profile.permissions.can_manage_menu;
              break;
            case '/staff':
              hasRequiredPermissions = profile.permissions.can_manage_staff;
              break;
            case '/kitchen':
              hasRequiredPermissions = profile.permissions.can_access_kitchen;
              break;
            case '/reports':
              hasRequiredPermissions = profile.permissions.can_access_reports;
              break;
            case '/pos':
              hasRequiredPermissions = profile.permissions.can_access_pos;
              break;
          }
        }

        const hasAccess = hasRequiredPermissions;

        authLogger.debug('RoleBasedRoute', 'Final access check result', {
          path: location.pathname,
          staff_type: profile.staff_type,
          allowedRoles,
          hasAllowedRole,
          hasRequiredPermissions,
          hasAccess
        });

        setCanAccess(hasAccess);
      } catch (error) {
        authLogger.error('RoleBasedRoute', 'Access check failed', {
          error,
          path: location.pathname
        });
        setCanAccess(false);
      } finally {
        setCheckingAccess(false);
      }
    }

    void checkAccess();
  }, [profile?.auth_id, allowedRoles, location.pathname]);

  if (loading || checkingAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="large" label="Checking access..." />
      </div>
    );
  }

  if (!profile?.auth_id) {
    authLogger.debug('RoleBasedRoute', 'No auth ID - redirecting to login', {
      path: location.pathname
    });
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!canAccess && !loading && !checkingAccess) {
    authLogger.warn('RoleBasedRoute', 'Access denied', {
      path: location.pathname,
      userType: profile?.staff_type,
      allowedRoles
    });
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  authLogger.info('RoleBasedRoute', 'Access granted', {
    path: location.pathname,
    userType: profile?.staff_type
  });

  return <>{children}</>;
}
