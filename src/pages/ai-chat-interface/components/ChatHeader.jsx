import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const ChatHeader = ({ onToggleHistory, onClearChat, messageCount = 0 }) => {
  return (
    <div className="bg-card border-b border-border px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleHistory}
            className="lg:hidden"
          >
            <Icon name="Menu" size={20} />
          </Button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Icon name="Bot" size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">FinTwin AI Assistant</h1>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Online</span>
                {messageCount > 0 && (
                  <>
                    <span>•</span>
                    <span>{messageCount} messages</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearChat}
            className="text-muted-foreground hover:text-foreground"
            title="Clear conversation"
          >
            <Icon name="Trash2" size={18} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            title="Chat settings"
          >
            <Icon name="Settings" size={18} />
          </Button>
        </div>
      </div>
      
      {/* AI Capabilities Banner */}
      <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
        <div className="flex items-center space-x-2 mb-2">
          <Icon name="Sparkles" size={16} className="text-primary" />
          <span className="text-sm font-medium text-primary">AI-Powered Financial Analysis</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Icon name="PieChart" size={12} />
            <span>Spending Analysis</span>
          </div>
          <div className="flex items-center space-x-1">
            <Icon name="TrendingUp" size={12} />
            <span>Trend Insights</span>
          </div>
          <div className="flex items-center space-x-1">
            <Icon name="Target" size={12} />
            <span>Budget Tracking</span>
          </div>
          <div className="flex items-center space-x-1">
            <Icon name="Lightbulb" size={12} />
            <span>Smart Recommendations</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;