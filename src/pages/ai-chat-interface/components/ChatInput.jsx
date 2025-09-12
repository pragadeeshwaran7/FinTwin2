import React, { useState, useRef, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const ChatInput = ({ onSendMessage, isLoading = false, placeholder = "Ask about your finances..." }) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (message?.trim() && !isLoading) {
      onSendMessage(message?.trim());
      setMessage('');
      resetTextareaHeight();
    }
  };

  const handleKeyPress = (e) => {
    if (e?.key === 'Enter' && !e?.shiftKey) {
      e?.preventDefault();
      handleSubmit(e);
    }
  };

  const resetTextareaHeight = () => {
    if (textareaRef?.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const adjustTextareaHeight = () => {
    if (textareaRef?.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef?.current?.scrollHeight;
      const maxHeight = 120; // Maximum height in pixels
      textareaRef.current.style.height = Math.min(scrollHeight, maxHeight) + 'px';
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  const suggestedQueries = [
    "What\'s my biggest expense category?",
    "How much did I spend on dining last month?",
    "Show me my savings rate",
    "Find recurring subscriptions"
  ];

  return (
    <div className="border-t border-border bg-card">
      {/* Suggested Queries */}
      {message === '' && (
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs text-muted-foreground mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQueries?.map((query, index) => (
              <button
                key={index}
                onClick={() => setMessage(query)}
                className="text-xs px-2 py-1 bg-muted hover:bg-muted/80 rounded-md text-muted-foreground hover:text-foreground transition-smooth"
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      )}
      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-4">
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e?.target?.value)}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              disabled={isLoading}
              className="w-full px-4 py-3 text-sm bg-input border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ minHeight: '48px', maxHeight: '120px' }}
              rows={1}
            />
            {message && (
              <button
                type="button"
                onClick={() => {
                  setMessage('');
                  resetTextareaHeight();
                }}
                className="absolute right-2 top-2 p-1 text-muted-foreground hover:text-foreground transition-smooth"
              >
                <Icon name="X" size={14} />
              </button>
            )}
          </div>
          <Button
            type="submit"
            disabled={!message?.trim() || isLoading}
            loading={isLoading}
            size="icon"
            className="h-12 w-12 flex-shrink-0"
          >
            <Icon name="Send" size={18} />
          </Button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted-foreground">
            Press Enter to send, Shift+Enter for new line
          </p>
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <Icon name="Shield" size={12} className="text-success" />
            <span>Secure & Private</span>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ChatInput;