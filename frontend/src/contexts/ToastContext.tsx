'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Toast types
export type ToastType = 'info' | 'success' | 'warning' | 'error';

// Toast item interface
interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

// Toast context interface
interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  hideToast: (id: string) => void;
  clearToasts: () => void;
}

// Create toast context
const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  showToast: () => {},
  hideToast: () => {},
  clearToasts: () => {},
});

// Toast container component
interface ToastContainerProps {
  children: ReactNode;
}

export function ToastContainer({ children }: ToastContainerProps) {
  return (
    <div className="fixed top-0 right-0 z-50 p-4 space-y-4 pointer-events-none max-w-md w-full">
      {children}
    </div>
  );
}

// Toast component
interface ToastProps extends ToastItem {
  onClose: () => void;
}

export function Toast({ id, type, title, message, duration = 5000, onClose }: ToastProps) {
  // Auto-close toast after duration
  useState(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    
    return () => clearTimeout(timer);
  });
  
  // Get background color based on type
  const getBgColor = () => {
    switch (type) {
      case 'info':
        return 'bg-blue-100 dark:bg-blue-800 border-blue-500';
      case 'success':
        return 'bg-green-100 dark:bg-green-800 border-green-500';
      case 'warning':
        return 'bg-yellow-100 dark:bg-yellow-800 border-yellow-500';
      case 'error':
        return 'bg-red-100 dark:bg-red-800 border-red-500';
      default:
        return 'bg-gray-100 dark:bg-gray-800 border-gray-500';
    }
  };
  
  // Get icon based on type
  const getIcon = () => {
    switch (type) {
      case 'info':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };
  
  return (
    <div
      className={`pointer-events-auto rounded-lg border-l-4 shadow-md transition-all duration-300 ease-in-out transform translate-x-0 opacity-100 ${getBgColor()}`}
      role="alert"
    >
      <div className="p-4 flex items-start">
        <div className="flex-shrink-0 mr-3">
          {getIcon()}
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">{title}</h4>
          {message && <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{message}</p>}
        </div>
        <button
          type="button"
          className="ml-4 text-gray-400 hover:text-gray-500 focus:outline-none"
          onClick={onClose}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Toast provider component
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  
  // Add a new toast
  const showToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = uuidv4();
    setToasts(prevToasts => [...prevToasts, { ...toast, id }]);
    return id;
  }, []);
  
  // Remove a toast by ID
  const hideToast = useCallback((id: string) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);
  
  // Clear all toasts
  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);
  
  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        hideToast,
        clearToasts,
      }}
    >
      {children}
      
      <ToastContainer>
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            id={toast.id}
            type={toast.type}
            title={toast.title}
            message={toast.message}
            duration={toast.duration}
            onClose={() => hideToast(toast.id)}
          />
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
}

// Custom hook for using toast
export function useToast() {
  const context = useContext(ToastContext);
  
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  
  return context;
}
