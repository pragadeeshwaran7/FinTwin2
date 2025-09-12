import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import Icon from '../AppIcon';

const AuthenticationWrapper = ({ children, isAuthenticated = false }) => {
  const location = useLocation();
  const isAuthPage = ['/login', '/register']?.includes(location?.pathname);

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && isAuthPage) {
    return <Navigate to="/main-dashboard" replace />;
  }

  // Redirect unauthenticated users to login
  if (!isAuthenticated && !isAuthPage) {
    return <Navigate to="/login" replace />;
  }

  // Render auth pages with special layout
  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <Icon name="TrendingUp" size={28} color="white" />
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-semibold text-foreground">FinTwin</h1>
                <p className="text-sm text-muted-foreground">Financial Analytics Platform</p>
              </div>
            </div>
          </div>

          {/* Auth Form Container */}
          <div className="bg-card rounded-lg shadow-card border border-border p-6">
            {children}
          </div>

          {/* Trust Indicators */}
          <div className="mt-6 text-center">
            <div className="flex items-center justify-center space-x-4 text-xs text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Icon name="Shield" size={12} className="text-success" />
                <span>Bank-Level Security</span>
              </div>
              <div className="flex items-center space-x-1">
                <Icon name="Lock" size={12} className="text-success" />
                <span>256-bit Encryption</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Your financial data is protected with enterprise-grade security
            </p>
          </div>

          {/* Footer Links */}
          <div className="mt-8 text-center">
            <div className="flex items-center justify-center space-x-4 text-xs text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-smooth">Privacy Policy</a>
              <span>•</span>
              <a href="#" className="hover:text-foreground transition-smooth">Terms of Service</a>
              <span>•</span>
              <a href="#" className="hover:text-foreground transition-smooth">Support</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render authenticated app content
  return children;
};

export default AuthenticationWrapper;