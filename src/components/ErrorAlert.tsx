import React from 'react';
import {
  FranchiseError,
  AuthorizationError,
  ValidationError,
  DatabaseError,
  isFranchiseError,
  isAuthorizationError,
  isValidationError,
  isDatabaseError
} from '../types/errors';

export interface ErrorAlertProps {
  error?: unknown;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({ error, message, onRetry, className = '' }) => {
  const getErrorDetails = () => {
    // If message prop is provided, use it
    if (message) {
      return {
        title: 'Error',
        message,
        showRetry: true
      };
    }

    // Otherwise process the error object
    if (!error) {
      return {
        title: 'Error',
        message: 'An unknown error occurred',
        showRetry: false
      };
    }

    if (isFranchiseError(error)) {
      return {
        title: 'Franchise Error',
        message: error.message,
        showRetry: true
      };
    }

    if (isAuthorizationError(error)) {
      return {
        title: 'Access Denied',
        message: error.message,
        showRetry: false
      };
    }

    if (isValidationError(error)) {
      return {
        title: 'Validation Error',
        message: error.message,
        showRetry: false
      };
    }

    if (isDatabaseError(error)) {
      return {
        title: 'Database Error',
        message: 'An error occurred while accessing the database',
        showRetry: true
      };
    }

    // Handle string errors
    if (typeof error === 'string') {
      return {
        title: 'Error',
        message: error,
        showRetry: true
      };
    }

    // Handle Error objects
    if (error instanceof Error) {
      return {
        title: error.name,
        message: error.message,
        showRetry: true
      };
    }

    // Default case
    return {
      title: 'Error',
      message: 'An unexpected error occurred',
      showRetry: true
    };
  };

  const { title, message: displayMessage, showRetry } = getErrorDetails();

  return (
    <div className={`bg-red-50 border-l-4 border-red-400 p-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg 
            className="h-5 w-5 text-red-400" 
            viewBox="0 0 20 20" 
            fill="currentColor"
            aria-hidden="true"
          >
            <path 
              fillRule="evenodd" 
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" 
              clipRule="evenodd" 
            />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            {title}
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{displayMessage}</p>
          </div>
          {showRetry && onRetry && (
            <div className="mt-4">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <svg 
                  className="-ml-0.5 mr-2 h-4 w-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                  />
                </svg>
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorAlert;
