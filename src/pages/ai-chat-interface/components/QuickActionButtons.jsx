import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const QuickActionButtons = ({ onActionClick, isVisible = true }) => {
  const quickActions = [
    {
      id: 'spending-trends',
      label: 'Show spending trends',
      icon: 'TrendingUp',
      query: 'Show me my spending trends for the last 3 months'
    },
    {
      id: 'category-breakdown',
      label: 'Analyze category breakdown',
      icon: 'PieChart',
      query: 'Break down my expenses by category this month'
    },
    {
      id: 'budget-review',
      label: 'Budget review',
      icon: 'Target',
      query: 'How am I doing against my budget this month?'
    },
    {
      id: 'savings-analysis',
      label: 'Savings analysis',
      icon: 'PiggyBank',
      query: 'Analyze my savings patterns and suggest improvements'
    },
    {
      id: 'unusual-spending',
      label: 'Find unusual spending',
      icon: 'AlertTriangle',
      query: 'Identify any unusual or large transactions this month'
    },
    {
      id: 'investment-advice',
      label: 'Investment advice',
      icon: 'TrendingUp',
      query: 'Based on my spending, what investment opportunities do you recommend?'
    }
  ];

  if (!isVisible) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center space-x-2 mb-3">
        <Icon name="Zap" size={16} className="text-primary" />
        <h3 className="text-sm font-medium text-foreground">Quick Actions</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {quickActions?.map((action) => (
          <Button
            key={action?.id}
            variant="outline"
            size="sm"
            onClick={() => onActionClick(action?.query)}
            className="justify-start text-left h-auto py-3 px-3"
          >
            <div className="flex items-center space-x-2 w-full">
              <Icon name={action?.icon} size={16} className="text-muted-foreground flex-shrink-0" />
              <span className="text-sm truncate">{action?.label}</span>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default QuickActionButtons;