import React, { useState, useRef, useEffect } from 'react';
import { useTransactionData } from '../../hooks/useTransactionData.js';
import { useMCP } from '../../context/MCPProvider.jsx';
import { useNavigate } from 'react-router-dom';
import SidebarNavigation from '../../components/ui/SidebarNavigation';
import MessageBubble from './components/MessageBubble';
import QuickActionButtons from './components/QuickActionButtons';
import ChatInput from './components/ChatInput';
import ChatHistory from './components/ChatHistory';
import FinancialInsightCard from './components/FinancialInsightCard';
import ChatHeader from './components/ChatHeader';
import { sendMessageToGemini } from '../../utils/gemini';


const AIChatInterface = () => {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState('default');
  const messagesEndRef = useRef(null);
<<<<<<< Updated upstream
=======
  const [fiMcpData, setFiMcpData] = useState(null);


  const { isConnected } = useMCP();
  const { getFinancialInsights } = useTransactionData();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentInsight, setCurrentInsight] = useState(null);

  // Initial greeting message
  useEffect(() => {
    if (isConnected && messages.length === 0) {
      setMessages([
        {
          id: 1,
          type: 'assistant',
          content: 'Hello! I\'m your AI financial assistant. I can help you analyze your spending, generate reports, and provide insights about your finances. What would you like to know?',
          timestamp: new Date()
        }
      ]);
    }
  }, [isConnected, messages.length]);

  const handleSendMessage = async (content, messageType = 'text') => {
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      // Use MCP to get financial insights
      const insights = await getFinancialInsights(content, 'chat_context');
      
      const assistantMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: insights.summary,
        timestamp: new Date(),
        insights: insights,
        recommendations: insights.recommendations
      };

      setMessages(prev => [...prev, assistantMessage]);
      setCurrentInsight(insights);
      
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: 'I apologize, but I\'m having trouble accessing your financial data right now. Please try again.',
        timestamp: new Date(),
        error: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async (action) => {
    const actionMessages = {
      'analyze_spending': 'Can you analyze my spending patterns for this month?',
      'budget_review': 'How am I doing with my budget this month?',
      'savings_tips': 'What are some ways I can improve my savings?',
      'expense_categories': 'Show me my expense breakdown by category'
    };

    if (actionMessages[action]) {
      await handleSendMessage(actionMessages[action]);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 text-xl font-medium">AI Assistant Unavailable</div>
          <div className="text-gray-600 mt-2">Cannot connect to financial data server</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <ChatHeader isConnected={isConnected} />

      {/* Main Chat Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Messages */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4">
            <ChatHistory messages={messages} loading={loading} />
          </div>

          {/* Quick Actions */}
          <div className="px-4 py-2 border-t bg-white">
            <QuickActionButtons onAction={handleQuickAction} />
          </div>

          {/* Input */}
          <div className="p-4 border-t bg-white">
            <ChatInput 
              onSendMessage={handleSendMessage}
              disabled={loading}
              placeholder="Ask me about your finances..."
            />
          </div>
        </div>

        {/* Insights Panel */}
        {currentInsight && (
          <div className="w-80 border-l bg-white p-4 overflow-y-auto">
            <FinancialInsightCard insight={currentInsight} />
          </div>
        )}
      </div>
    </div>
  );
};
  const handleFetchFiMcpData = async () => {
    // In a real application, you would get the accessToken from a secure source
    // For this example, we'll use a placeholder.
    const accessToken = "YOUR_FI_MCP_ACCESS_TOKEN"; // REPLACE WITH ACTUAL TOKEN
    try {
      const data = await fetchFinancialDataFromFiMCP(accessToken);
      setFiMcpData(data);
      setMessages(prev => [...prev, {
        id: Date.now(),
        content: "Successfully fetched financial data from Fi MCP. You can now ask questions about your assets, liabilities, etc.",
        isUser: false,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error("Error fetching Fi MCP data:", error);
      setMessages(prev => [...prev, {
        id: Date.now(),
        content: `Error fetching financial data: ${error.message}. Please ensure Fi MCP is running and you have a valid access token.`,
        isUser: false,
        timestamp: new Date()
      }]);
    }
  };
>>>>>>> Stashed changes

  // Mock conversation data
  const [conversations] = useState([
    {
      id: 'default',
      title: 'Financial Overview',
      preview: 'Welcome! I can help you analyze your spending patterns...',
      messageCount: 3,
      updatedAt: new Date(),
      createdAt: new Date()
    },
    {
      id: 'spending-analysis',
      title: 'Spending Analysis',
      preview: 'Your dining expenses have increased by 23% this month...',
      messageCount: 8,
      updatedAt: new Date(Date.now() - 3600000),
      createdAt: new Date(Date.now() - 86400000)
    },
    {
      id: 'budget-review',
      title: 'Budget Review',
      preview: 'You are currently 15% under budget for this month...',
      messageCount: 5,
      updatedAt: new Date(Date.now() - 7200000),
      createdAt: new Date(Date.now() - 172800000)
    },
    // Export statement should be outside the conversations array
];
// Remove the duplicate export statement
  ]);

  // Mock messages for current conversation
  const [messages, setMessages] = useState([
    {
      id: 1,
      content: `Welcome to FinTwin AI! I'm your personal financial assistant, ready to help you understand and optimize your financial health.\n\nI can analyze your spending patterns, track your budget progress, identify trends, and provide personalized recommendations based on your transaction data.\n\nWhat would you like to explore today?`,
      isUser: false,
      timestamp: new Date(Date.now() - 300000),
      insights: [
        {
          type: 'success',
          title: 'Account Connected',
          description: 'Your financial data is securely connected and ready for analysis.',
          metrics: [
            { label: 'Transactions', value: '1,247' },
            { label: 'Categories', value: '12' }
          ]
        }
      ]
    }
  ]);

  const scrollToBottom = () => {
    messagesEndRef?.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async (messageContent) => {
    const userMessage = {
      id: Date.now(),
      content: messageContent,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const aiResponse = await sendMessageToGemini(messageContent);
      const aiMessage = {
        id: Date.now() + 1,
        content: aiResponse,
        isUser: false,
        timestamp: new Date(),
        insights: [] // You may want to parse insights from the response
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error sending message to Gemini:", error);
      const errorMessage = {
        id: Date.now() + 1,
        content: "An error occurred while communicating with the AI. Please try again later.",
        isUser: false,
        timestamp: new Date(),
        insights: []
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = (query) => {
    handleSendMessage(query);
  };

  const handleNewChat = () => {
    setMessages([
      {
        id: Date.now(),
        content: `Hello! I'm ready to help you with a fresh financial analysis. What would you like to explore?`,
        isUser: false,
        timestamp: new Date()
      }
    ]);
    setCurrentConversationId('new-' + Date.now());
  };

  const handleClearChat = () => {
    if (window.confirm('Are you sure you want to clear this conversation?')) {
      setMessages([
        {
          id: Date.now(),
          content: `Conversation cleared. I'm here to help with your financial questions!`,
          isUser: false,
          timestamp: new Date()
        }
      ]);
    }
  };

  const handleSelectConversation = (conversationId) => {
    setCurrentConversationId(conversationId);
    // In a real app, this would load the conversation messages
    setShowHistory(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar Navigation */}
      <SidebarNavigation 
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      {/* Main Content */}
      <div className={`transition-all duration-300 ${
        sidebarCollapsed ? 'ml-16' : 'ml-60'
      } md:ml-0 md:pl-60`}>
        <div className="flex h-screen">
          {/* Chat History Sidebar */}
          {showHistory && (
            <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setShowHistory(false)} />
          )}
          <div className={`${showHistory ? 'fixed inset-y-0 left-0 z-50' : 'hidden'} lg:block lg:relative`}>
            <ChatHistory
              conversations={conversations}
              onSelectConversation={handleSelectConversation}
              currentConversationId={currentConversationId}
              onNewChat={handleNewChat}
            />
          </div>

          {/* Chat Interface */}
          <div className="flex-1 flex flex-col h-screen">
            {/* Chat Header */}
            <ChatHeader
              onToggleHistory={() => setShowHistory(!showHistory)}
              onClearChat={handleClearChat}
              messageCount={messages?.length}
            />

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Quick Actions - Show only when conversation is new */}
              {messages?.length <= 1 && (
                <QuickActionButtons
                  onActionClick={handleQuickAction}
                  isVisible={!isTyping}
                />
              )}

              {/* Messages */}
              <div className="space-y-4">
                {messages?.map((message) => (
                  <div key={message?.id}>
                    <MessageBubble
                      message={message?.content}
                      isUser={message?.isUser}
                      timestamp={message?.timestamp}
                    />
                    {/* Financial Insights */}
                    {message?.insights && message?.insights?.map((insight, index) => (
                      <div key={index} className="ml-11 mt-2">
                        <FinancialInsightCard insight={insight} />
                      </div>
                    ))}
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <MessageBubble 
                    message=""
                    isUser={false}
                    timestamp={new Date()}
                    isTyping={true} 
                  />
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Chat Input */}
            <ChatInput
              onSendMessage={handleSendMessage}
              isLoading={isTyping}
              placeholder="Ask about your spending, budgets, savings, or financial goals..."
            />
          </div>
        </div>
      </div>
      {/* Mobile Bottom Navigation Spacer */}
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default AIChatInterface;