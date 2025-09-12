import React from 'react';
import Icon from '../../../components/AppIcon';

const TrustIndicators = () => {
  const securityFeatures = [
    {
      icon: 'Shield',
      label: 'Bank-Level Security',
      description: 'Your data is protected with enterprise-grade encryption'
    },
    {
      icon: 'Lock',
      label: '256-bit Encryption',
      description: 'All communications are secured with SSL/TLS encryption'
    },
    {
      icon: 'Eye',
      label: 'Privacy Protected',
      description: 'We never share your financial data with third parties'
    },
    {
      icon: 'Server',
      label: 'Secure Storage',
      description: 'Data stored in SOC 2 compliant infrastructure'
    }
  ];

  const certifications = [
    { name: 'SOC 2 Type II', icon: 'Award' },
    { name: 'ISO 27001', icon: 'Shield' },
    { name: 'PCI DSS', icon: 'CreditCard' },
    { name: 'GDPR Compliant', icon: 'Globe' }
  ];

  return (
    <div className="space-y-6">
      {/* Main Security Features */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {securityFeatures?.map((feature, index) => (
          <div
            key={index}
            className="flex items-start space-x-3 p-3 bg-card/50 rounded-lg border border-border/50"
          >
            <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center shrink-0">
              <Icon name={feature?.icon} size={16} className="text-success" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-medium text-foreground">{feature?.label}</h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {feature?.description}
              </p>
            </div>
          </div>
        ))}
      </div>
      {/* Compliance Badges */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-foreground text-center">
          Trusted & Certified
        </h4>
        <div className="flex items-center justify-center space-x-4">
          {certifications?.map((cert, index) => (
            <div
              key={index}
              className="flex flex-col items-center space-y-1 p-2 hover:bg-muted/50 rounded-lg transition-smooth"
              title={cert?.name}
            >
              <div className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center">
                <Icon name={cert?.icon} size={12} className="text-primary" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {cert?.name}
              </span>
            </div>
          ))}
        </div>
      </div>
      {/* Security Promise */}
      <div className="text-center p-4 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg border border-primary/10">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <Icon name="ShieldCheck" size={20} className="text-primary" />
          <span className="text-sm font-semibold text-primary">Security Promise</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Your financial data is encrypted end-to-end and stored with the same security standards 
          used by major financial institutions. We are committed to protecting your privacy and 
          maintaining the highest security standards.
        </p>
      </div>
      {/* Contact Support */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          Questions about security?{' '}
          <button className="text-primary hover:text-primary/80 underline transition-smooth">
            Contact our security team
          </button>
        </p>
      </div>
    </div>
  );
};

export default TrustIndicators;