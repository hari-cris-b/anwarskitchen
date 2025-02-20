import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  onClick
}) => {
  return (
    <div 
      className={`
        bg-white rounded-lg shadow-sm p-6 transition-shadow duration-200
        ${onClick ? 'cursor-pointer hover:shadow-md' : ''}
      `}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-lg ${icon ? 'bg-gray-50' : ''}`}>
          {icon}
        </div>
        {trend && (
          <span 
            className={`
              inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
              ${trend.isPositive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
            `}
          >
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
        {subtitle && (
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

export default StatCard;