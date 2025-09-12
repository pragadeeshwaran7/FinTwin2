import React from 'react';
import Icon from '../../../components/AppIcon';

const FeatureHighlights = () => {
  const features = [
    {
      icon: 'Upload',
      title: 'Easy Data Import',
      description: 'Upload CSV files from any bank or financial institution with drag-and-drop simplicity'
    },
    {
      icon: 'Bot',
      title: 'AI Financial Coach',
      description: 'Get personalized insights and answers about your spending patterns through natural conversation'
    },
    {
      icon: 'BarChart3',
      title: 'Smart Analytics',
      description: 'Visualize your financial data with interactive charts and comprehensive spending breakdowns'
    },
    {
      icon: 'TrendingUp',
      title: 'Trend Analysis',
      description: 'Track your financial progress over time with detailed monthly and category trend analysis'
    },
    {
      icon: 'Search',
      title: 'Intelligent Search',
      description: 'Find specific transactions and patterns using natural language queries and filters'
    },
    {
      icon: 'Download',
      title: 'Data Export',
      description: 'Export your analyzed data and insights in multiple formats for external use'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Why Choose FinTwin?
        </h3>
        <p className="text-sm text-muted-foreground">
          Powerful features designed to transform how you understand your finances
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {features?.map((feature, index) => (
          <div
            key={index}
            className="flex items-start space-x-3 p-3 bg-card border border-border rounded-lg hover:shadow-card transition-smooth"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <Icon name={feature?.icon} size={20} className="text-primary" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-foreground mb-1">
                {feature?.title}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {feature?.description}
              </p>
            </div>
          </div>
        ))}
      </div>
      {/* Success Stories */}
      <div className="bg-success/5 border border-success/20 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-2">
          <Icon name="Quote" size={16} className="text-success" />
          <span className="text-sm font-medium text-success">Success Story</span>
        </div>
        <blockquote className="text-sm text-foreground italic">
          "FinTwin helped me identify $400 in monthly subscription waste and optimize my spending categories. The AI insights are incredibly accurate!"
        </blockquote>
        <cite className="text-xs text-muted-foreground mt-2 block">
          — Sarah M., Software Engineer
        </cite>
      </div>
    </div>
  );
};

export default FeatureHighlights;