import React, { useState, useEffect, createContext, useContext } from 'react';

// Create context for error tracking
export const ErrorTrackerContext = createContext({
  addError: () => {},
  errors: [],
  clearErrors: () => {}
});

// Hook for components to report errors
export const useErrorTracker = () => useContext(ErrorTrackerContext);

// Provider component for tests
export const ErrorTrackerProvider = ErrorTrackerContext.Provider;

// Main component to track and display errors
export const ErrorTracker = ({ children }) => {
  const [errors, setErrors] = useState([]);
  const [showDisplay, setShowDisplay] = useState(false);
  
  // Add errors with a timestamp and unique ID
  const addError = (message, source = 'unknown') => {
    console.warn(`[ErrorTracker] ${message} (${source})`);
    setErrors(prev => [
      ...prev,
      {
        id: Date.now(),
        message,
        source,
        time: new Date().toLocaleTimeString()
      }
    ]);
    
    // Show the error display whenever we have errors
    setShowDisplay(true);
  };
  
  // Clear all errors
  const clearErrors = () => {
    setErrors([]);
    setShowDisplay(false);
  };
  
  // Memoize the context value
  const contextValue = {
    addError,
    errors,
    clearErrors
  };
  
  // Set a timer to auto-hide the errors after some time if there are no new ones
  useEffect(() => {
    if (errors.length > 0) {
      const timer = setTimeout(() => {
        setShowDisplay(false);
      }, 8000);
      
      return () => clearTimeout(timer);
    }
  }, [errors]);
  
  return (
    <ErrorTrackerContext.Provider value={contextValue}>
      {children}
      
      {showDisplay && errors.length > 0 && (
        <div className="asset-error auto-hide">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Asset Loading Issues ({errors.length})</span>
            <button 
              onClick={() => setShowDisplay(false)}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'white', 
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              ✕
            </button>
          </div>
          <ul className="asset-error-list">
            {errors.slice(-3).map(err => (
              <li key={err.id}>
                {err.message.substring(0, 60)}{err.message.length > 60 ? '...' : ''}
              </li>
            ))}
            {errors.length > 3 && (
              <li>...and {errors.length - 3} more issues</li>
            )}
          </ul>
        </div>
      )}
    </ErrorTrackerContext.Provider>
  );
}; 