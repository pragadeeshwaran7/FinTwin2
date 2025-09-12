import React from 'react';
import { Helmet } from 'react-helmet';
import AuthenticationWrapper from '../../components/ui/AuthenticationWrapper';
import RegistrationForm from './components/RegistrationForm';
import TrustIndicators from './components/TrustIndicators';
import FeatureHighlights from './components/FeatureHighlights';

const RegisterPage = () => {
  return (
    <>
      <Helmet>
        <title>Create Account - FinTwin | AI-Powered Financial Analytics</title>
        <meta 
          name="description" 
          content="Join FinTwin to unlock AI-powered financial insights. Create your secure account and start analyzing your spending patterns with our intelligent financial coach." 
        />
        <meta name="keywords" content="financial analytics, personal finance, AI coach, spending analysis, account registration" />
        <meta property="og:title" content="Create Account - FinTwin" />
        <meta property="og:description" content="Join thousands of users managing their finances with AI-powered insights" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="/register" />
      </Helmet>

      <AuthenticationWrapper isAuthenticated={false}>
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Left Column - Registration Form */}
                <div className="order-2 lg:order-1">
                  <div className="bg-card rounded-lg shadow-card border border-border p-6 lg:p-8">
                    <RegistrationForm />
                  </div>
                </div>

                {/* Right Column - Features & Trust */}
                <div className="order-1 lg:order-2 space-y-6">
                  {/* Welcome Message */}
                  <div className="text-center lg:text-left">
                    <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                      Transform Your Financial Future
                    </h1>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      Join the next generation of financial management with AI-powered insights, 
                      intelligent analytics, and personalized coaching that adapts to your unique spending patterns.
                    </p>
                  </div>

                  {/* Feature Highlights */}
                  <div className="bg-card rounded-lg shadow-card border border-border p-6">
                    <FeatureHighlights />
                  </div>

                  {/* Trust Indicators */}
                  <div className="bg-card rounded-lg shadow-card border border-border p-6">
                    <TrustIndicators />
                  </div>

                  {/* Quick Stats */}
                  <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg p-6 border border-primary/10">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-primary">99.9%</div>
                        <div className="text-xs text-muted-foreground">Uptime</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-primary">&lt;2s</div>
                        <div className="text-xs text-muted-foreground">Response Time</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-primary">24/7</div>
                        <div className="text-xs text-muted-foreground">Support</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom CTA Section */}
          <div className="bg-muted/30 border-t border-border py-8">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto text-center">
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Ready to Take Control of Your Finances?
                </h2>
                <p className="text-muted-foreground mb-4">
                  Join thousands of users who have already discovered the power of AI-driven financial insights
                </p>
                <div className="flex items-center justify-center space-x-6 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-success rounded-full"></div>
                    <span>Free to start</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-success rounded-full"></div>
                    <span>No credit card required</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-success rounded-full"></div>
                    <span>Cancel anytime</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AuthenticationWrapper>
    </>
  );
};

export default RegisterPage;