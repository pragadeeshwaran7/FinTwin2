import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginHeader from './components/LoginHeader';
import LoginForm from './components/LoginForm';
import TrustIndicators from './components/TrustIndicators';

const LoginPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already authenticated
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    if (isAuthenticated === 'true') {
      navigate('/main-dashboard', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Column - Branding & Trust */}
          <div className="space-y-8 lg:pr-8">
            <LoginHeader />
            <div className="hidden lg:block">
              <TrustIndicators />
            </div>
          </div>

          {/* Right Column - Login Form */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-md">
              <div className="bg-card rounded-xl shadow-modal border border-border p-8">
                <LoginForm />
              </div>

              {/* Mobile Trust Indicators */}
              <div className="lg:hidden mt-8">
                <TrustIndicators />
              </div>

              {/* Footer Links */}
              <div className="mt-8 text-center">
                <div className="flex items-center justify-center space-x-4 text-xs text-muted-foreground">
                  <button className="hover:text-foreground transition-smooth">
                    Privacy Policy
                  </button>
                  <span>•</span>
                  <button className="hover:text-foreground transition-smooth">
                    Terms of Service
                  </button>
                  <span>•</span>
                  <button className="hover:text-foreground transition-smooth">
                    Support
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  © {new Date()?.getFullYear()} FinTwin. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;