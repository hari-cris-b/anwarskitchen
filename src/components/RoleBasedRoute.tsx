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
    let mounted = true;

    async function checkAccess() {
      // Add a small delay to allow auth state to initialize
      await new Promise(resolve => setTimeout(resolve, 100));

      if (!mounted) return;

      if (!profile?.auth_id) {
        authLogger.debug('RoleBasedRoute', 'No auth ID found', {
          path: location.pathname,
          loading
        });
        setCanAccess(false);
        setCheckingAccess(false);
        return;
      }

      // Wait a frame to ensure state is properly initialized
      await new Promise(resolve => requestAnimationFrame(resolve));

      try {
        if (!mounted) return;

        // Super admins can access everything except POS, and must be in allowedRoles
        if (profile.staff_type === 'super_admin') {
          const isTryingToAccessPOS = location.pathname.startsWith('/pos');
          const isSuperAdminAllowed = allowedRoles.includes('super_admin');

          if (isTryingToAccessPOS) {
            authLogger.warn('RoleBasedRoute', 'Super admin attempting to access POS', {
              path: location.pathname
            });
            setCanAccess(false);
          } else if (!isSuperAdminAllowed) {
            authLogger.warn('RoleBasedRoute', 'Super admin role not allowed for this route', {
              path: location.pathname,
              allowedRoles
            });
            setCanAccess(false);
          } else {
            authLogger.info('RoleBasedRoute', 'Super admin access granted', {
              path: location.pathname
            });
            setCanAccess(true);
          }
          setCheckingAccess(false);
          return;
        }

        authLogger.debug('RoleBasedRoute', 'Starting access check', {
          profile: {
            staff_type: profile.staff_type,
            permissions: profile.permissions,
            franchiseId: profile.franchise_id
          },
          path: location.pathname
        });

        // Verify franchise association for non-super-admin users
        if (!profile.franchise_id) {
          authLogger.warn('RoleBasedRoute', 'User has no franchise association', {
            userType: profile.staff_type
          });
          setCanAccess(false);
          setCheckingAccess(false);
          return;
        }

        // Check if user has an allowed role
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

    void (async () => {
      try {
        await checkAccess();
      } catch (error) {
        if (mounted) {
          authLogger.error('RoleBasedRoute', 'Access check failed', {
            error,
            path: location.pathname
          });
          setCanAccess(false);
          setCheckingAccess(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [profile?.auth_id, allowedRoles, location.pathname, loading]);

  // If we're loading or checking access, show loading spinner
  if (loading || checkingAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="large" label="Checking access..." />
      </div>
    );
  }

  // After loading is complete, check auth state
  if (!loading && !profile?.auth_id) {
    authLogger.debug('RoleBasedRoute', 'No auth ID after loading - redirecting to login', {
      path: location.pathname
    });
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Only redirect to unauthorized if we're certain the user doesn't have access
  if (!canAccess && !loading && !checkingAccess && profile?.auth_id) {
    authLogger.warn('RoleBasedRoute', 'Access denied after full check', {
      path: location.pathname,
      userType: profile?.staff_type,
      allowedRoles,
      hasAuthId: Boolean(profile?.auth_id),
      loading,
      checkingAccess
    });
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  authLogger.info('RoleBasedRoute', 'Access granted', {
    path: location.pathname,
    userType: profile?.staff_type
  });

  return <>{children}</>;
}
