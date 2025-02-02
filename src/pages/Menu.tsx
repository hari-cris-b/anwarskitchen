import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Menu() {
  const { profile } = useAuth();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Menu Management</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p>Menu management features coming soon...</p>
      </div>
    </div>
  );
}
