import React, { useState, useEffect } from 'react';
import * as THREE from 'three';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      errorMessages: []
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console
    console.error("Game component error:", error, errorInfo);
    
    // Add the error to our collection
    this.setState(prevState => ({
      errorInfo,
      errorMessages: [
        ...prevState.errorMessages,
        {
          id: Date.now(),
          message: error.message,
          stack: error.stack,
          time: new Date().toLocaleTimeString()
        }
      ]
    }));
    
    // Optional: Send to error reporting service
    // reportErrorToService(error, errorInfo);
  }
  
  // Handle dismissing errors
  dismissError = (id) => {
    this.setState(prevState => ({
      errorMessages: prevState.errorMessages.filter(err => err.id !== id)
    }));
  }
  
  // Only reset the main error if it's not a critical one
  tryAgain = () => {
    if (this.canRecoverFromError()) {
      this.setState({ 
        hasError: false, 
        error: null,
        errorInfo: null 
      });
    }
  }
  
  // Determine if we can recover from this error
  canRecoverFromError() {
    const { error } = this.state;
    
    // Check for audio loading errors - these are recoverable
    if (error && error.message && (
      error.message.includes('Unable to decode audio data') ||
      error.message.includes('Could not load') ||
      error.message.includes('Failed to load')
    )) {
      return true;
    }
    
    return false;
  }

  render() {
    const { hasError, error, errorMessages } = this.state;
    
    // Show error notifications regardless of crash state
    const errorNotifications = (
      <div className="asset-error auto-hide">
        <div>Asset Loading Issues:</div>
        <ul className="asset-error-list">
          {errorMessages.slice(-3).map(err => (
            <li key={err.id}>
              {err.message.substring(0, 60)}{err.message.length > 60 ? '...' : ''}
            </li>
          ))}
        </ul>
      </div>
    );
    
    // If we crashed but can recover, show a minimal error and continue
    if (hasError && this.canRecoverFromError()) {
      console.warn("Recoverable error detected - continuing with fallback");
      
      // Show error notifications and continue with children
      return (
        <>
          {errorMessages.length > 0 && errorNotifications}
          {this.props.children}
        </>
      );
    }
    
    // For critical errors, show the fallback UI
    if (hasError) {
      console.warn("Critical error - rendering fallback UI");
      
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return (
            <>
              {errorMessages.length > 0 && errorNotifications}
              {this.props.fallback(error)}
            </>
          );
        }
        return (
          <>
            {errorMessages.length > 0 && errorNotifications}
            {this.props.fallback}
          </>
        );
      }
      
      // Default fallback UI
      return (
        <>
          {errorMessages.length > 0 && errorNotifications}
          <group position={[0, 0, 0]}>
            <mesh position={[0, 1, 0]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="red" />
            </mesh>
            <pointLight position={[10, 10, 10]} intensity={1} />
            <ambientLight intensity={0.5} />
          </group>
        </>
      );
    }

    // No errors, just render children normally
    return (
      <>
        {errorMessages.length > 0 && errorNotifications}
        {this.props.children}
      </>
    );
  }
} 