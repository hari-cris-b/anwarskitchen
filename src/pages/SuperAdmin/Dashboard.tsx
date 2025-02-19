import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { franchisorService } from '../../services/franchisorService';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorAlert from '../../components/ErrorAlert';
import Button from '../../components/Button';

interface DashboardStats {
  totalFranchises: number;
  activeFranchises: number;
  totalRevenue: number;
  totalStaff: number;
  recentFranchises: Array<{
    id: string;
    name: string;
    created_at: string;
    status: string;
  }>;
  topPerformers: Array<{
    id: string;
    name: string;
    revenue: number;
    orders: number;
  }>;
}

type DateRange = '7d' | '30d' | '90d' | 'all';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  useEffect(() => {
    loadDashboardStats();
  }, [dateRange]);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await franchisorService.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadDashboardStats();
  };

  const renderDateRangeSelector = () => (
    <div className="inline-flex rounded-md shadow-sm" role="group">
      {(['7d', '30d', '90d', 'all'] as DateRange[]).map((range) => (
        <button
          key={range}
          onClick={() => setDateRange(range)}
          className={`px-4 py-2 text-sm font-medium ${
            dateRange === range
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          } ${
            range === '7d' ? 'rounded-l-lg' : ''
          } ${
            range === 'all' ? 'rounded-r-lg' : ''
          } border border-gray-200`}
          aria-current={dateRange === range}
        >
          {range === '7d' ? '7 Days' : 
           range === '30d' ? '30 Days' : 
           range === '90d' ? '90 Days' : 
           'All Time'}
        </button>
      ))}
    </div>
  );

  if (error) return <ErrorAlert message={error} onRetry={handleRefresh} />;
  if (!stats && loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor your franchise network performance and key metrics
          </p>
        </div>
        <div className="mt-4 sm:mt-0 space-x-3">
          {renderDateRangeSelector()}
          <Button
            onClick={() => navigate('/super-admin/franchises/new')}
            className="inline-flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Franchise
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-full bg-orange-100">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <button
              onClick={() => navigate('/super-admin/franchises')}
              className="text-sm text-orange-600 hover:text-orange-700"
            >
              View all
            </button>
          </div>
          <div className="mt-4">
            <h2 className="text-sm font-medium text-gray-600">Total Franchises</h2>
            <div className="mt-2 flex items-baseline">
              <p className="text-2xl font-semibold text-gray-900">{stats?.totalFranchises}</p>
              <p className="ml-2 text-sm text-green-600">{stats?.activeFranchises} active</p>
            </div>
            <div className="mt-1">
              <div className="h-2 bg-gray-200 rounded-full">
                <div 
                  className="h-2 bg-orange-500 rounded-full" 
                  style={{ 
                    width: `${(stats?.activeFranchises || 0) / (stats?.totalFranchises || 1) * 100}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-full bg-blue-100">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <button
              onClick={() => navigate('/super-admin/reports')}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View reports
            </button>
          </div>
          <div className="mt-4">
            <h2 className="text-sm font-medium text-gray-600">Total Revenue</h2>
            <div className="mt-2 flex items-baseline">
              <p className="text-2xl font-semibold text-gray-900">₹{stats?.totalRevenue.toLocaleString()}</p>
              <p className="ml-2 text-sm text-gray-500">This month</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-full bg-green-100">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <button
              onClick={() => navigate('/super-admin/staff')}
              className="text-sm text-green-600 hover:text-green-700"
            >
              Manage staff
            </button>
          </div>
          <div className="mt-4">
            <h2 className="text-sm font-medium text-gray-600">Active Staff</h2>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{stats?.totalStaff}</p>
            <p className="mt-1 text-sm text-gray-500">Across all franchises</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-full bg-purple-100">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <button
              onClick={() => navigate('/super-admin/reports')}
              className="text-sm text-purple-600 hover:text-purple-700"
            >
              View trends
            </button>
          </div>
          <div className="mt-4">
            <h2 className="text-sm font-medium text-gray-600">Network Growth</h2>
            <p className="mt-2 text-2xl font-semibold text-gray-900">+15.2%</p>
            <p className="mt-1 text-sm text-gray-500">This month</p>
          </div>
        </div>
      </div>

      {/* Recent Franchises & Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Franchises */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Recent Franchises</h2>
                <p className="mt-1 text-sm text-gray-500">Latest additions to your network</p>
              </div>
              <Button
                onClick={() => navigate('/super-admin/franchises/new')}
                className="text-sm"
              >
                Add New
              </Button>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {stats?.recentFranchises.map((franchise) => (
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
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    franchise.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {franchise.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Top Performers</h2>
                <p className="mt-1 text-sm text-gray-500">Best performing franchises</p>
              </div>
              <Button
                onClick={() => navigate('/super-admin/reports')}
                className="text-sm"
              >
                View Report
              </Button>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {stats?.topPerformers.map((franchise) => (
              <div
                key={franchise.id}
                className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => navigate(`/super-admin/franchises/${franchise.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{franchise.name}</p>
                    <p className="text-xs text-gray-500">
                      {franchise.orders.toLocaleString()} orders
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      ₹{franchise.revenue.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="mt-2 h-1 bg-gray-100 rounded-full">
                  <div 
                    className="h-1 bg-green-500 rounded-full" 
                    style={{ width: `${Math.min((franchise.revenue / 1000000) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}