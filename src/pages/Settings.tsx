import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFranchise } from '../contexts/FranchiseContext';

export default function Settings() {
  const { profile } = useAuth();
  const { settings } = useFranchise();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Franchise Settings</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p>Franchise settings management coming soon...</p>
      </div>
    </div>
  );
}
