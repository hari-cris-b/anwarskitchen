import { OrderStatus } from '../types';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getStatusColor = (status: OrderStatus): { bg: string; text: string } => {
  switch (status) {
    case 'pending':
      return { bg: 'bg-red-100', text: 'text-red-800' };
    case 'preparing':
      return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
    case 'ready':
      return { bg: 'bg-green-100', text: 'text-green-800' };
    case 'completed':
      return { bg: 'bg-gray-100', text: 'text-gray-800' };
  }
};

export const roundToNearest = (num: number, nearest: number = 1): number => {
  return Math.round(num / nearest) * nearest;
};

export const calculateGST = (amount: number, rate: number): { cgst: number; sgst: number } => {
  const gstAmount = (amount * rate) / 100;
  return {
    cgst: gstAmount / 2,
    sgst: gstAmount / 2,
  };
};
