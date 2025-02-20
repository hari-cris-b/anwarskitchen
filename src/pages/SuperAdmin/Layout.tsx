import React from 'react';
import { Outlet } from 'react-router-dom';
import Navigation from '../../components/Navigation';
import { authLogger } from '../../utils/authLogger';

const SuperAdminLayout: React.FC = () => {
  authLogger.debug('SuperAdminLayout', 'Super admin layout rendered');

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation />
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-4 sm:px-0">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default SuperAdminLayout;