import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { franchisorService } from '../../services/franchisorService';
import { authLogger } from '../../utils/authLogger';
import { useAuth } from '../../contexts/AuthContext';
import { FranchiseOverview } from '../../types/franchise';
import LoadingSpinner from '../../components/LoadingSpinner';

const Franchises: React.FC = () => {
  const [franchises, setFranchises] = useState<FranchiseOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { profile } = useAuth();

  React.useEffect(() => {
    const loadFranchises = async () => {
      try {
        authLogger.debug('Franchises', 'Loading franchises');
        setLoading(true);
        const data = await franchisorService.getFranchiseOverview();
        setFranchises(data);
        authLogger.info('Franchises', 'Franchises loaded', { count: data.length });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load franchises';
        authLogger.error('Franchises', 'Error loading franchises', { error: err });
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void loadFranchises();
  }, []);

  const handleAddFranchise = () => {
    authLogger.debug('Franchises', 'Navigating to add franchise');
    navigate('/super-admin/franchises/new');
  };

  const handleEditFranchise = (id: string) => {
    authLogger.debug('Franchises', 'Navigating to edit franchise', { id });
    navigate(`/super-admin/franchises/${id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="large" label="Loading franchises..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm leading-5 font-medium text-red-800">Error</h3>
            <p className="mt-1 text-sm leading-5 text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Franchises</h1>
        <button
          onClick={handleAddFranchise}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Add Franchise
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {franchises.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No franchises</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new franchise.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {franchises.map((franchise) => (
              <li
                key={franchise.id}
                className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleEditFranchise(franchise.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{franchise.name}</h3>
                    <div className="mt-1 flex items-center text-sm text-gray-500">
                      <span>{franchise.address}</span>
                      <span className="mx-2">•</span>
                      <span>{franchise.email}</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        franchise.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {franchise.status}
                    </span>
                    <span className="ml-4 text-sm text-gray-500">
                      Staff: {franchise.total_staff}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Franchises;