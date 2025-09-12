import React from 'react';
import Icon from '../../../components/AppIcon';

const FinancialInsightCard = ({ insight, className = '' }) => {
  const getInsightIcon = (type) => {
    switch (type) {
      case 'spending': return 'TrendingDown';
      case 'savings': return 'PiggyBank';
      case 'budget': return 'Target';
      case 'investment': return 'TrendingUp';
      case 'warning': return 'AlertTriangle';
      case 'success': return 'CheckCircle';
      default: return 'Info';
    }
  };

  const getInsightColor = (type) => {
    switch (type) {
      case 'spending': return 'text-blue-600 bg-blue-50';
      case 'savings': return 'text-green-600 bg-green-50';
      case 'budget': return 'text-purple-600 bg-purple-50';
      case 'investment': return 'text-emerald-600 bg-emerald-50';
      case 'warning': return 'text-amber-600 bg-amber-50';
      case 'success': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className={`bg-card border border-border rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getInsightColor(insight?.type)}`}>
          <Icon name={getInsightIcon(insight?.type)} size={20} />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-foreground mb-1">
            {insight?.title}
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {insight?.description}
          </p>
          {insight?.metrics && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {insight?.metrics?.map((metric, index) => (
                <div key={index} className="text-center">
                  <div className="text-lg font-semibold text-foreground">
                    {metric?.value}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {metric?.label}
                  </div>
                </div>
              ))}
            </div>
          )}
          {insight?.action && (
            <div className="mt-3 p-2 bg-muted/50 rounded-md">
              <p className="text-xs text-muted-foreground">
                <Icon name="Lightbulb" size={12} className="inline mr-1" />
                {insight?.action}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialInsightCard;