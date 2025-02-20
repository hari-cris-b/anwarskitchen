import React, { ReactNode, useEffect, useState, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import LoadingSpinner from './LoadingSpinner';
import { DatabaseError } from '../types/errors';

interface SuperAdminRouteProps {
  children: ReactNode;
}

interface UserRole {
  role_type: string;
  id: string | null;
  is_super_admin: boolean;
}

interface AdminSetupCheck {
  check_type: string;
  status: 'Found' | 'Not Found' | 'Linked' | 'Not Linked' | 'Working' | 'Not Working';
  details: string;
}

function isValidUserRole(data: unknown): data is UserRole[] {
  if (!Array.isArray(data)) {
    console.debug('RPC response is not an array:', data);
    return false;
  }

  if (data.length === 0) {
    console.debug('Empty role response - no access');
    return true; // Empty array is valid but means no access
  }

  const role = data[0];
  const isValid = typeof role === 'object' &&
    role !== null &&
    'role_type' in role &&
    typeof role.role_type === 'string' &&
    'id' in role &&
    (role.id === null || typeof role.id === 'string') &&
    'is_super_admin' in role &&
    typeof role.is_super_admin === 'boolean';

  if (!isValid) {
    console.debug('Invalid role structure:', role);
  }

  return isValid;
}

export default function SuperAdminRoute({ children }: SuperAdminRouteProps) {
  const { profile, loading } = useAuth();
  const location = useLocation();
  const [canAccess, setCanAccess] = useState<boolean | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);

  const checkAccess = useCallback(async () => {
    if (!profile?.auth_id) {
      setCanAccess(false);
      return;
    }

    const MAX_RETRIES = 2;
    let retryCount = 0;

    while (retryCount <= MAX_RETRIES) {
      try {
        // Add a small delay on retries to allow for role setup
        if (retryCount > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // First verify the super admin setup
        const { data, error: verifyError } = await supabase.rpc(
          'verify_super_admin_setup',
          { p_auth_id: profile.auth_id }
        );

        if (verifyError) {
          console.error('Verification Error:', verifyError);
          throw new DatabaseError(verifyError.message);
        }

        const verifyData = data as AdminSetupCheck[];
        if (!verifyData || !Array.isArray(verifyData)) {
          throw new DatabaseError('Invalid verification data format');
        }

        // Only block access if account doesn't exist or isn't linked
        const hasBlockingIssues = verifyData.some((check: AdminSetupCheck) =>
          check.check_type === 'account_exists' && check.status === 'Not Found' ||
          check.check_type === 'auth_linked' && check.status === 'Not Linked'
        );
        
        if (hasBlockingIssues) {
          console.warn('Critical super admin setup issues:', verifyData);
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            continue;
          }
          throw new DatabaseError('Critical super admin setup issues found');
        }

        // Log non-blocking issues but continue
        const hasWarnings = verifyData.some((check: AdminSetupCheck) =>
          check.status === 'Not Working'
        );
        
        if (hasWarnings) {
          console.warn('Non-critical super admin setup warnings:', verifyData);
        }

        // If verification passes, check role access
        const { data: roleData, error: roleError } = await supabase.rpc(
          'get_user_role',
          { check_auth_id: profile.auth_id }
        );

        if (roleError) {
          console.error('Role Check Error:', roleError);
          throw new DatabaseError(roleError.message);
        }

        // First check if user has basic access via staff_type
        if (profile?.staff_type === 'super_admin') {
          console.debug('User has super_admin staff type - granting access');
          setCanAccess(true);
          return;
        }

        // Then check role data if available
        if (isValidUserRole(roleData)) {
          const hasRoleAccess = roleData.length > 0 && roleData[0].is_super_admin === true;

          console.debug('Role check result:', {
            roleType: roleData[0]?.role_type,
            roleId: roleData[0]?.id,
            isSuperAdmin: roleData[0]?.is_super_admin,
            hasRoleAccess,
            retryCount
          });

          if (hasRoleAccess) {
            setCanAccess(true);
            return;
          }
        } else {
          console.warn('Invalid role data structure - falling back to staff type check');
        }

        // If no access and not last retry, continue to next iteration
        if (retryCount < MAX_RETRIES) {
          console.debug(`Retry ${retryCount + 1}/${MAX_RETRIES}`);
          retryCount++;
          continue;
        }

        // If we get here on last retry, access is denied
        setCanAccess(false);
        return;

      } catch (error) {
        console.error('Error checking super admin status:', error);
        
        // If not last retry, continue to next iteration
        if (retryCount < MAX_RETRIES) {
          console.debug(`Error retry ${retryCount + 1}/${MAX_RETRIES}`);
          retryCount++;
          continue;
        }
        
        // If we get here on last retry, access is denied
        setCanAccess(false);
        return;
      }
    }
  }, [profile?.auth_id]);

  useEffect(() => {
    let isMounted = true;

    async function performAccessCheck() {
      if (!isMounted) return;
      setCheckingAccess(true);

      try {
        await checkAccess();
      } finally {
        if (isMounted) {
          setCheckingAccess(false);
        }
      }
    }

    void performAccessCheck();
    return () => {
      isMounted = false;
    };
  }, [checkAccess]);

  if (loading || checkingAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="large" label="Checking access..." />
      </div>
    );
  }

  if (!profile?.auth_id) {
    console.debug('No auth ID - redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!canAccess) {
    console.debug('Access denied to super admin route:', {
      path: location.pathname,
      userType: profile?.staff_type,
      auth: {
        isAuthenticated: !!profile?.auth_id,
        userId: profile?.auth_id
      },
      access: {
        loading,
        checking: checkingAccess,
        hasAccess: canAccess
      }
    });
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}