import React from 'react';
import StatCard from './StatCard';
import { franchisorService } from '../../services/franchisorService';
import { withRetry } from '../../utils/retryUtils';
import { AuthorizationError, DatabaseError } from '../../types/errors';
import type { DashboardStats } from '../../types/franchise';

interface PerformanceData {
  currentPeriod: {
    revenue: number;
    orders: number;
    averageOrderValue: number;
    activeStaff: number;
  };
  previousPeriod: {
    revenue: number;
    orders: number;
    averageOrderValue: number;
    activeStaff: number;
  };
}

const PerformanceMetrics: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<PerformanceData | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Add retry with error handling
        const stats = await withRetry<DashboardStats>(
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
          throw new Error('No stats returned from dashboard');
        }

        // Calculate metrics with safe defaults
        const statsData = {
          currentPeriod: {
            revenue: stats.totalRevenue,
            orders: stats.totalFranchises,
            averageOrderValue: stats.totalRevenue / (stats.totalFranchises || 1),
            activeStaff: stats.totalStaff
          },
          previousPeriod: {
            revenue: 0, // TODO: Add historical data
            orders: 0,
            averageOrderValue: 0,
            activeStaff: 0
          }
        };

        setData(statsData);
      } catch (error) {
        console.error('Failed to load performance metrics:', error);
        setError(error instanceof Error ? error.message : 'Failed to load metrics');
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
            <div className="h-10 w-10 bg-gray-200 rounded-lg mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    );
  }

  const calculateTrend = (current: number, previous: number): number => {
    if (!previous) return 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Revenue"
        value={`₹${data.currentPeriod.revenue.toLocaleString()}`}
        subtitle="Last 30 days"
        icon={
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        trend={{
          value: calculateTrend(data.currentPeriod.revenue, data.previousPeriod.revenue),
          isPositive: data.currentPeriod.revenue >= data.previousPeriod.revenue
        }}
      />

      <StatCard
        title="Active Franchises"
        value={data.currentPeriod.orders}
        subtitle="Currently operating"
        icon={
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        }
        trend={{
          value: calculateTrend(data.currentPeriod.orders, data.previousPeriod.orders),
          isPositive: data.currentPeriod.orders >= data.previousPeriod.orders
        }}
      />

      <StatCard
        title="Average Order Value"
        value={`₹${data.currentPeriod.averageOrderValue.toFixed(2)}`}
        subtitle="Per transaction"
        icon={
          <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        }
        trend={{
          value: calculateTrend(data.currentPeriod.averageOrderValue, data.previousPeriod.averageOrderValue),
          isPositive: data.currentPeriod.averageOrderValue >= data.previousPeriod.averageOrderValue
        }}
      />

      <StatCard
        title="Active Staff"
        value={data.currentPeriod.activeStaff}
        subtitle="Across all franchises"
        icon={
          <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        }
        trend={{
          value: calculateTrend(data.currentPeriod.activeStaff, data.previousPeriod.activeStaff),
          isPositive: data.currentPeriod.activeStaff >= data.previousPeriod.activeStaff
        }}
      />
    </div>
  );
};

export default PerformanceMetrics;