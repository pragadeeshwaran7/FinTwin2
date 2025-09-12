import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

const ChatHistory = ({ conversations, onSelectConversation, currentConversationId, onNewChat }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const filteredConversations = conversations?.filter(conv =>
    conv?.title?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
    conv?.preview?.toLowerCase()?.includes(searchTerm?.toLowerCase())
  );

  const formatDate = (date) => {
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    })?.format(date);
  };

  const groupConversationsByDate = (conversations) => {
    const groups = {};
    conversations?.forEach(conv => {
      const date = formatDate(conv?.updatedAt);
      if (!groups?.[date]) groups[date] = [];
      groups?.[date]?.push(conv);
    });
    return groups;
  };

  const conversationGroups = groupConversationsByDate(filteredConversations);

  return (
    <div className={`bg-card border-r border-border transition-all duration-300 ${
      isExpanded ? 'w-80' : 'w-16'
    } lg:w-80 flex flex-col h-full`}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {isExpanded || window.innerWidth >= 1024 ? (
            <>
              <h2 className="text-lg font-semibold text-foreground">Chat History</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onNewChat}
                className="text-muted-foreground hover:text-foreground"
              >
                <Icon name="Plus" size={16} />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(true)}
              className="mx-auto"
            >
              <Icon name="MessageSquare" size={20} />
            </Button>
          )}
        </div>
        
        {(isExpanded || window.innerWidth >= 1024) && (
          <div className="mt-3">
            <Input
              type="search"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e?.target?.value)}
              className="text-sm"
            />
          </div>
        )}
      </div>
      {/* Conversations List */}
      {(isExpanded || window.innerWidth >= 1024) && (
        <div className="flex-1 overflow-y-auto">
          {Object.keys(conversationGroups)?.length === 0 ? (
            <div className="p-4 text-center">
              <Icon name="MessageSquare" size={32} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No conversations yet</p>
              <p className="text-xs text-muted-foreground mt-1">Start chatting to see your history</p>
            </div>
          ) : (
            <div className="p-2">
              {Object.entries(conversationGroups)?.map(([date, convs]) => (
                <div key={date} className="mb-4">
                  <h3 className="text-xs font-medium text-muted-foreground px-2 mb-2 uppercase tracking-wide">
                    {date}
                  </h3>
                  <div className="space-y-1">
                    {convs?.map((conversation) => (
                      <button
                        key={conversation?.id}
                        onClick={() => onSelectConversation(conversation?.id)}
                        className={`w-full text-left p-3 rounded-lg transition-smooth hover:bg-muted group ${
                          currentConversationId === conversation?.id
                            ? 'bg-primary/10 border border-primary/20' :'hover:bg-muted'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className={`text-sm font-medium truncate ${
                              currentConversationId === conversation?.id
                                ? 'text-primary' :'text-foreground'
                            }`}>
                              {conversation?.title}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {conversation?.preview}
                            </p>
                            <div className="flex items-center space-x-2 mt-2">
                              <span className="text-xs text-muted-foreground">
                                {conversation?.messageCount} messages
                              </span>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground">
                                {new Intl.DateTimeFormat('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })?.format(conversation?.updatedAt)}
                              </span>
                            </div>
                          </div>
                          <Icon 
                            name="ChevronRight" 
                            size={14} 
                            className={`text-muted-foreground group-hover:text-foreground transition-smooth ${
                              currentConversationId === conversation?.id ? 'text-primary' : ''
                            }`}
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Collapse Button for Mobile */}
      {isExpanded && window.innerWidth < 1024 && (
        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(false)}
            className="w-full"
          >
            <Icon name="ChevronLeft" size={16} className="mr-2" />
            Collapse
          </Button>
        </div>
      )}
    </div>
  );
};

export default ChatHistory;