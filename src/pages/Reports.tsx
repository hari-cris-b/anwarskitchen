import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Reports() {
  const { profile } = useAuth();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Reports</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p>Reports and analytics features coming soon...</p>
      </div>
    </div>
  );
}
