import React from 'react';
import Icon from '../../../components/AppIcon';

const LoginHeader = () => {
  return (
    <div className="text-center space-y-6">
      {/* Logo and Brand */}
      <div className="inline-flex items-center space-x-4">
        <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg">
          <Icon name="TrendingUp" size={32} color="white" />
        </div>
        <div className="text-left">
          <h1 className="text-3xl font-bold text-foreground">FinTwin</h1>
          <p className="text-muted-foreground font-medium">Financial Analytics Platform</p>
        </div>
      </div>
      {/* Value Proposition */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">
          Your AI-Powered Financial Coach
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
          Upload your transaction data and get intelligent insights through conversational AI. 
          Understand your spending patterns, track budgets, and make smarter financial decisions.
        </p>
      </div>
      {/* Key Features */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
        <div className="flex flex-col items-center space-y-2 p-3 bg-card/50 rounded-lg border border-border/50">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Icon name="Upload" size={20} className="text-primary" />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-medium text-foreground">Easy Upload</h3>
            <p className="text-xs text-muted-foreground">CSV & Excel files</p>
          </div>
        </div>

        <div className="flex flex-col items-center space-y-2 p-3 bg-card/50 rounded-lg border border-border/50">
          <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
            <Icon name="MessageSquare" size={20} className="text-accent" />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-medium text-foreground">AI Chat</h3>
            <p className="text-xs text-muted-foreground">Ask anything</p>
          </div>
        </div>

        <div className="flex flex-col items-center space-y-2 p-3 bg-card/50 rounded-lg border border-border/50">
          <div className="w-10 h-10 bg-warning/10 rounded-full flex items-center justify-center">
            <Icon name="BarChart3" size={20} className="text-warning" />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-medium text-foreground">Smart Analytics</h3>
            <p className="text-xs text-muted-foreground">Visual insights</p>
          </div>
        </div>
      </div>
      {/* Current Date */}
      <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
        <Icon name="Calendar" size={12} />
        <span>
          {new Date()?.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </span>
      </div>
    </div>
  );
};

export default LoginHeader;