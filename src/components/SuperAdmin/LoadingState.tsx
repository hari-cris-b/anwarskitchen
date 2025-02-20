import React from 'react';

interface LoadingStateProps {
  type?: 'card' | 'table' | 'list';
  count?: number;
}

const LoadingState: React.FC<LoadingStateProps> = ({ type = 'card', count = 4 }) => {
  const renderCardSkeleton = () => (
    <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
        <div className="h-4 w-16 bg-gray-200 rounded"></div>
      </div>
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        <div className="h-8 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    </div>
  );

  const renderTableSkeleton = () => (
    <div className="bg-white shadow-sm rounded-lg animate-pulse">
      <div className="border-b border-gray-200 p-6">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
      </div>
      <div className="divide-y divide-gray-200">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-3 flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </div>
              <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderListSkeleton = () => (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="h-8 w-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );

  switch (type) {
    case 'table':
      return renderTableSkeleton();
    case 'list':
      return renderListSkeleton();
    default:
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: count }).map((_, i) => (
            <React.Fragment key={i}>{renderCardSkeleton()}</React.Fragment>
          ))}
        </div>
      );
  }
};

export default LoadingState;