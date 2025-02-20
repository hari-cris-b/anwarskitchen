import React from 'react';
import { useNavigate } from 'react-router-dom';
import { franchisorService } from '../../services/franchisorService';
import ErrorAlert from '../../components/ErrorAlert';
import LoadingState from '../../components/SuperAdmin/LoadingState';
import Button from '../../components/Button';
import { authLogger } from '../../utils/authLogger';
import type { FranchiseOverview } from '../../types/franchise';

const Franchises: React.FC = () => {
  const navigate = useNavigate();
  const [franchises, setFranchises] = React.useState<FranchiseOverview[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadFranchises = async () => {
    try {
      const data = await franchisorService.getFranchiseOverview();
      setFranchises(data);
      authLogger.debug('SuperAdmin', `Loaded ${data.length} franchises`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load franchises';
      setError(message);
      authLogger.error('SuperAdmin', `Failed to load franchises: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    void loadFranchises();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <LoadingState type="table" count={5} />;
  }

  if (error) {
    return (
      <ErrorAlert
        message={error}
        onRetry={() => {
          setError(null);
          setLoading(true);
          void loadFranchises();
        }}
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Franchises</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your franchise network
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button
            onClick={() => navigate('/super-admin/franchises/new')}
            className="inline-flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Franchise
          </Button>
        </div>
      </div>

      {/* Franchise List */}
      <div className="mt-8 bg-white shadow-sm rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Franchise
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Staff
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {franchises.map((franchise) => (
                <tr 
                  key={franchise.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/super-admin/franchises/${franchise.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {franchise.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {franchise.address}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{franchise.email}</div>
                    <div className="text-sm text-gray-500">{franchise.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {franchise.total_staff} members
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{franchise.total_revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(franchise.status)}`}>
                      {franchise.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/super-admin/franchises/${franchise.id}`);
                      }}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {franchises.length === 0 && !loading && !error && (
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
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new franchise.
          </p>
          <div className="mt-6">
            <Button onClick={() => navigate('/super-admin/franchises/new')}>
              Add Franchise
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Franchises;