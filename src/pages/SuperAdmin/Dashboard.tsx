import React from 'react';
import { useNavigate } from 'react-router-dom';
import PerformanceMetrics from '../../components/SuperAdmin/PerformanceMetrics';
import Button from '../../components/Button';
import { franchisorService } from '../../services/franchisorService';
import { withRetry } from '../../utils/retryUtils';
import { AuthorizationError, DatabaseError } from '../../types/errors';
import type { TopPerformingFranchise } from '../../types/franchise';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [topPerformers, setTopPerformers] = React.useState<TopPerformingFranchise[]>([]);
  const [recentFranchises, setRecentFranchises] = React.useState<Array<{
    id: string;
    name: string;
    created_at: string;
    status: string;
  }>>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const stats = await withRetry(
          () => franchisorService.getDashboardStats(),
          {
            maxRetries: 3,
            delayMs: 1500,
            shouldRetry: (error: Error) =>
              error instanceof AuthorizationError ||
              (error instanceof DatabaseError && error.message.includes('permission'))
          }
        );

        if (!stats) {
          throw new Error('No dashboard data returned');
        }

        setTopPerformers(stats.topPerformers);
        setRecentFranchises(stats.recentFranchises);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    void loadDashboardData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Overview of your franchise network performance
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

      {/* Performance Metrics */}
      <PerformanceMetrics />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Recent Activity & Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Franchises */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent Franchises</h2>
            <p className="mt-1 text-sm text-gray-500">Latest additions to your network</p>
          </div>
          <div className="divide-y divide-gray-200">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/4"></div>
                </div>
              ))
            ) : (
              recentFranchises.map((franchise) => (
                <div
                  key={franchise.id}
                  className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/super-admin/franchises/${franchise.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{franchise.name}</p>
                      <p className="text-xs text-gray-500">
                        Added {new Date(franchise.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`
                      px-2 py-1 text-xs rounded-full
                      ${franchise.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                      }
                    `}>
                      {franchise.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Top Performers</h2>
            <p className="mt-1 text-sm text-gray-500">Best performing franchises</p>
          </div>
          <div className="divide-y divide-gray-200">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="p-6 animate-pulse">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-200 rounded-full mr-4"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-gray-100 rounded w-1/4"></div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              topPerformers.map((franchise, index) => (
                <div
                  key={franchise.id}
                  className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/super-admin/franchises/${franchise.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center mr-4
                        ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-100 text-gray-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-50 text-gray-600'}
                      `}>
                        #{index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{franchise.name}</p>
                        <p className="text-xs text-gray-500">{franchise.orders} orders</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        ₹{franchise.revenue.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 h-1 bg-gray-100 rounded-full">
                    <div 
                      className="h-1 bg-blue-500 rounded-full" 
                      style={{ 
                        width: `${Math.min((franchise.revenue / 1000000) * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;