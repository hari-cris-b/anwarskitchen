import React from 'react';
import { franchisorService } from '../../services/franchisorService';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorAlert from '../../components/ErrorAlert';
import StatCard from '../../components/SuperAdmin/StatCard';
import PerformanceMetrics from '../../components/SuperAdmin/PerformanceMetrics';

interface PerformanceProps {}

const Performance: React.FC<PerformanceProps> = () => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [dateRange, setDateRange] = React.useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const handleRefresh = () => {
    // TODO: Implement refresh functionality
  };

  const renderDateSelector = () => (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white" role="group">
      {[
        { value: '7d', label: '7 Days' },
        { value: '30d', label: '30 Days' },
        { value: '90d', label: '90 Days' },
        { value: 'all', label: 'All Time' }
      ].map(({ value, label }) => (
        <button
          key={value}
          onClick={() => setDateRange(value as typeof dateRange)}
          className={`
            px-4 py-2 text-sm font-medium
            ${dateRange === value 
              ? 'bg-gray-100 text-gray-900' 
              : 'bg-white text-gray-600 hover:bg-gray-50'
            }
            ${value === '7d' ? 'rounded-l-lg' : ''}
            ${value === 'all' ? 'rounded-r-lg' : ''}
          `}
        >
          {label}
        </button>
      ))}
    </div>
  );

  if (error) {
    return <ErrorAlert message={error} onRetry={handleRefresh} />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performance Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Detailed performance metrics across your franchise network
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          {renderDateSelector()}
        </div>
      </div>

      {/* Overview Metrics */}
      <PerformanceMetrics />

      {/* Monthly Performance Chart */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Monthly Performance</h2>
            <p className="mt-1 text-sm text-gray-500">Revenue trends across franchises</p>
          </div>
        </div>
        <div className="h-80">
          {/* TODO: Add chart component */}
          <div className="flex items-center justify-center h-full text-gray-500">
            Chart component to be implemented
          </div>
        </div>
      </div>

      {/* Franchise Rankings */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Franchise Rankings</h2>
          <p className="mt-1 text-sm text-gray-500">Performance comparison across franchises</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Franchise
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg. Order Value
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Growth
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4">
                    <LoadingSpinner />
                  </td>
                </tr>
              ) : (
                // TODO: Add franchise data rows
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Performance;