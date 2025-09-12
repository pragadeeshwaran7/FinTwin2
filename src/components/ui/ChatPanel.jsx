import React, { useState, useRef, useEffect } from 'react';
import Icon from '../AppIcon';
import Button from './Button';

const ChatPanel = ({ isOpen = false, onToggle, className = '' }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      content: 'Hello! I\'m your financial AI assistant. I can help you analyze your spending patterns, track budgets, and provide insights about your financial data. What would you like to know?',
      timestamp: new Date(Date.now() - 300000)
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef?.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue?.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue?.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "Based on your recent transactions, I notice you've spent 23% more on dining out this month compared to last month. Would you like me to suggest some budget adjustments?",
        "I can see a pattern in your spending. Your grocery expenses have decreased by 15% while your subscription services have increased. Let me break this down for you.",
        "Your savings rate this month is 18%, which is above the recommended 15%. Great job! Would you like me to suggest investment opportunities for your excess savings?",
        "I've analyzed your transaction categories. Your largest expense category is housing at 32% of income, which is within the recommended 30-35% range.",
        "Looking at your cash flow, you have consistent income but irregular large expenses. I can help you set up an emergency fund strategy."
      ];

      const assistantMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: responses?.[Math.floor(Math.random() * responses?.length)],
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyPress = (e) => {
    if (e?.key === 'Enter' && !e?.shiftKey) {
      e?.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })?.format(timestamp);
  };

  const quickActions = [
    { label: 'Analyze spending', icon: 'PieChart' },
    { label: 'Budget review', icon: 'Target' },
    { label: 'Investment advice', icon: 'TrendingUp' },
    { label: 'Savings goals', icon: 'Piggy Bank' }
  ];

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-modal hover:shadow-lg transition-smooth lift-hover z-200 md:hidden ${className}`}
      >
        <Icon name="MessageSquare" size={24} />
      </button>
    );
  }

  return (
    <>
      {/* Mobile Overlay */}
      <div className="fixed inset-0 bg-black/50 z-200 md:hidden" onClick={onToggle} />
      {/* Chat Panel */}
      <div className={`fixed inset-x-4 bottom-4 top-20 bg-card rounded-lg shadow-modal z-300 md:relative md:inset-auto md:h-full md:rounded-none md:shadow-none md:bg-transparent ${className}`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border md:px-0">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <Icon name="Bot" size={16} className="text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">AI Assistant</h3>
                <p className="text-xs text-muted-foreground">
                  {isTyping ? 'Typing...' : 'Online'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="md:hidden"
            >
              <Icon name="X" size={16} />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 md:px-0">
            {messages?.map((message) => (
              <div
                key={message?.id}
                className={`flex ${message?.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    message?.type === 'user' ?'bg-primary text-primary-foreground' :'bg-muted text-foreground'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message?.content}</p>
                  <p className={`text-xs mt-1 ${
                    message?.type === 'user' ?'text-primary-foreground/70' :'text-muted-foreground'
                  }`}>
                    {formatTime(message?.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {messages?.length === 1 && (
            <div className="px-4 pb-4 md:px-0">
              <p className="text-xs text-muted-foreground mb-2">Quick actions:</p>
              <div className="grid grid-cols-2 gap-2">
                {quickActions?.map((action) => (
                  <button
                    key={action?.label}
                    onClick={() => setInputValue(action?.label)}
                    className="flex items-center space-x-2 p-2 text-left text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-smooth"
                  >
                    <Icon name={action?.icon} size={14} />
                    <span>{action?.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-border md:px-0">
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e?.target?.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about your finances..."
                  className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-smooth"
                  rows={1}
                  style={{ minHeight: '40px', maxHeight: '120px' }}
                />
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue?.trim() || isTyping}
                size="icon"
                className="shrink-0"
              >
                <Icon name="Send" size={16} />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatPanel;