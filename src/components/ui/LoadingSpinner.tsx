import React from 'react';

// Types following strict TypeScript guidelines from rules.md
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  className?: string;
  color?: 'blue' | 'indigo' | 'gray' | 'green' | 'red';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message,
  className = '',
  color = 'indigo'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const colorClasses = {
    blue: 'border-blue-500',
    indigo: 'border-indigo-500',
    gray: 'border-gray-500',
    green: 'border-green-500',
    red: 'border-red-500'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div 
        className={`${sizeClasses[size]} border-2 ${colorClasses[color]} border-t-transparent rounded-full animate-spin`}
      />
      {message && (
        <p className="mt-3 text-sm text-gray-600 text-center max-w-xs">
          {message}
        </p>
      )}
    </div>
  );
};

// Variants for specific use cases
export const PageLoadingSpinner: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <LoadingSpinner size="xl" message={message} />
  </div>
);

export const InlineLoadingSpinner: React.FC<{ message?: string }> = ({ message }) => (
  <LoadingSpinner size="sm" message={message} className="py-4" />
);

export const ButtonLoadingSpinner: React.FC = () => (
  <LoadingSpinner size="sm" className="text-white" color="gray" />
);

export default LoadingSpinner;