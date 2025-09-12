import React from 'react';
import Icon from '../../../components/AppIcon';

const TrustIndicators = () => {
  const securityFeatures = [
    {
      icon: 'Shield',
      title: 'Bank-Level Security',
      description: 'Your data is protected with enterprise-grade encryption'
    },
    {
      icon: 'Lock',
      title: '256-bit SSL Encryption',
      description: 'All communications are secured with industry standards'
    },
    {
      icon: 'Eye',
      title: 'Privacy First',
      description: 'We never share your financial data with third parties'
    },
    {
      icon: 'Server',
      title: 'Secure Storage',
      description: 'Data stored in SOC 2 compliant infrastructure'
    }
  ];

  const certifications = [
    { name: 'SOC 2 Type II', icon: 'Award' },
    { name: 'GDPR Compliant', icon: 'CheckCircle' },
    { name: 'PCI DSS', icon: 'CreditCard' },
    { name: 'ISO 27001', icon: 'Shield' }
  ];

  return (
    <div className="space-y-6">
      {/* Security Features */}
      <div className="bg-muted/30 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center">
          <Icon name="Shield" size={16} className="text-success mr-2" />
          Your Security is Our Priority
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {securityFeatures?.map((feature, index) => (
            <div key={index} className="flex items-start space-x-2">
              <div className="w-6 h-6 bg-success/10 rounded-full flex items-center justify-center mt-0.5">
                <Icon name={feature?.icon} size={12} className="text-success" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">{feature?.title}</p>
                <p className="text-xs text-muted-foreground">{feature?.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Certifications */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h4 className="text-xs font-medium text-foreground mb-3">Security Certifications</h4>
        <div className="grid grid-cols-2 gap-2">
          {certifications?.map((cert, index) => (
            <div key={index} className="flex items-center space-x-2 p-2 bg-muted/50 rounded-md">
              <Icon name={cert?.icon} size={12} className="text-success" />
              <span className="text-xs font-medium text-foreground">{cert?.name}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Trust Stats */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-4 text-xs text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Icon name="Users" size={12} className="text-primary" />
            <span>50,000+ Users</span>
          </div>
          <div className="flex items-center space-x-1">
            <Icon name="DollarSign" size={12} className="text-primary" />
            <span>$2B+ Analyzed</span>
          </div>
          <div className="flex items-center space-x-1">
            <Icon name="Star" size={12} className="text-primary" />
            <span>4.9/5 Rating</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Trusted by individuals and families worldwide for secure financial management
        </p>
      </div>
    </div>
  );
};

export default TrustIndicators;