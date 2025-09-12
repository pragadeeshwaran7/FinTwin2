import React, { useState, useEffect } from 'react';
import { useTransactionData } from '../../hooks/useTransactionData.js';
import { useMCP } from '../../context/MCPProvider.jsx';
import { Link } from 'react-router-dom';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import SidebarNavigation from '../../components/ui/SidebarNavigation';
import ChatPanel from '../../components/ui/ChatPanel';
import MetricCard from './components/MetricCard';
import SpendingChart from './components/SpendingChart';
import CategoryChart from './components/CategoryChart';
import MonthlyTrendChart from './components/MonthlyTrendChart';
import FilterControls from './components/FilterControls';
import RecentTransactions from './components/RecentTransactions';


const MainDashboard = () => {

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [currentView, setCurrentView] = useState('overview');
  const [dateRange, setDateRange] = useState('30d');
  const [selectedCategories, setSelectedCategories] = useState([]);

  // Mock financial data
  const { isConnected, loading: mcpLoading } = useMCP();
  const {
    dashboardData,
    loading,
    error,
    loadDashboardData
  } = useTransactionData();

  useEffect(() => {
    if (isConnected) {
      loadDashboardData('month');
    }
  }, [isConnected, loadDashboardData]);

  if (mcpLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Connecting to financial data...</div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-64 bg-red-50 rounded-lg">
        <div className="text-center">
          <div className="text-red-600 text-lg font-medium">Connection Error</div>
          <div className="text-red-500 text-sm mt-1">Unable to connect to financial data server</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <div className="ml-3 text-lg">Loading dashboard data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-red-50 rounded-lg">
        <div className="text-center">
          <div className="text-red-600 text-lg font-medium">Data Error</div>
          <div className="text-red-500 text-sm mt-1">{error}</div>
          <button 
            onClick={() => loadDashboardData('month')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { metrics, chartData, recentTransactions } = dashboardData || {};

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Financial Dashboard</h1>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm text-gray-600">Connected to MCP Server</span>
        </div>
      </div>

      {/* Filter Controls */}
      <FilterControls onFiltersChange={loadDashboardData} />

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Income"
            value={`${metrics.totalIncome?.toFixed(2) || '0.00'}`}
            trend="up"
            trendValue="5.2%"
            icon="💰"
          />
          <MetricCard
            title="Total Expenses"
            value={`${metrics.totalExpenses?.toFixed(2) || '0.00'}`}
            trend="down"
            trendValue="2.1%"
            icon="💳"
          />
          <MetricCard
            title="Net Income"
            value={`${metrics.netIncome?.toFixed(2) || '0.00'}`}
            trend="up"
            trendValue="8.4%"
            icon="📈"
          />
          <MetricCard
            title="Savings Rate"
            value={`${metrics.savingsRate?.toFixed(1) || '0.0'}%`}
            trend="up"
            trendValue="1.3%"
            icon="🏦"
          />
        </div>
      )}

      {/* Charts */}
      {chartData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Spending Overview</h2>
            <SpendingChart data={chartData.spending} />
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Category Breakdown</h2>
            <CategoryChart data={chartData.categories} />
          </div>
        </div>
      )}

      {/* Monthly Trends */}
      {chartData?.trends && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Monthly Trends</h2>
          <MonthlyTrendChart data={chartData.trends} />
        </div>
      )}

      {/* Recent Transactions */}
      {recentTransactions && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
          <RecentTransactions transactions={recentTransactions} />
        </div>
      )}
    </div>
  );
};

  const metricsData = [
    {
      title: "Total Spending",
      value: "$4,247.82",
      change: "+12.5%",
      changeType: "negative",
      icon: "CreditCard",
      trend: true
    },
    {
      title: "Monthly Income",
      value: "$6,850.00",
      change: "+3.2%",
      changeType: "positive",
      icon: "TrendingUp",
      trend: true
    },
    {
      title: "Savings Rate",
      value: "38.0%",
      change: "+5.1%",
      changeType: "positive",
      icon: "PiggyBank",
      trend: true
    },
    {
      title: "Active Accounts",
      value: "4",
      change: "No change",
      changeType: "neutral",
      icon: "Wallet",
      trend: false
    }
  ];

  const spendingData = [
    { date: "2024-08-15", amount: 145.67 },
    { date: "2024-08-16", amount: 89.23 },
    { date: "2024-08-17", amount: 234.56 },
    { date: "2024-08-18", amount: 67.89 },
    { date: "2024-08-19", amount: 178.45 },
    { date: "2024-08-20", amount: 298.76 },
    { date: "2024-08-21", amount: 156.34 },
    { date: "2024-08-22", amount: 203.45 },
    { date: "2024-08-23", amount: 134.67 },
    { date: "2024-08-24", amount: 267.89 },
    { date: "2024-08-25", amount: 189.23 },
    { date: "2024-08-26", amount: 345.67 },
    { date: "2024-08-27", amount: 123.45 },
    { date: "2024-08-28", amount: 278.90 },
    { date: "2024-08-29", amount: 198.76 },
    { date: "2024-08-30", amount: 234.56 },
    { date: "2024-08-31", amount: 167.89 },
    { date: "2024-09-01", amount: 289.34 },
    { date: "2024-09-02", amount: 145.67 },
    { date: "2024-09-03", amount: 203.45 },
    { date: "2024-09-04", amount: 178.90 },
    { date: "2024-09-05", amount: 256.78 },
    { date: "2024-09-06", amount: 134.56 },
    { date: "2024-09-07", amount: 298.45 },
    { date: "2024-09-08", amount: 167.89 },
    { date: "2024-09-09", amount: 223.67 },
    { date: "2024-09-10", amount: 189.45 }
  ];

  const categoryData = [
    { category: "Food & Dining", amount: 1247.82, percentage: 29.4 },
    { category: "Shopping", amount: 856.34, percentage: 20.2 },
    { category: "Transportation", amount: 634.56, percentage: 14.9 },
    { category: "Bills & Utilities", amount: 567.89, percentage: 13.4 },
    { category: "Entertainment", amount: 423.67, percentage: 10.0 },
    { category: "Healthcare", amount: 298.45, percentage: 7.0 },
    { category: "Travel", amount: 156.78, percentage: 3.7 },
    { category: "Other", amount: 62.31, percentage: 1.4 }
  ];

  const monthlyTrendData = [
    { month: "Jan", income: 6500, expenses: 4200 },
    { month: "Feb", income: 6750, expenses: 4350 },
    { month: "Mar", income: 6600, expenses: 4100 },
    { month: "Apr", income: 6850, expenses: 4450 },
    { month: "May", income: 6900, expenses: 4300 },
    { month: "Jun", income: 7100, expenses: 4600 },
    { month: "Jul", income: 6950, expenses: 4250 },
    { month: "Aug", income: 6850, expenses: 4247 }
  ];

  const recentTransactions = [
    {
      id: 1,
      description: "Starbucks Coffee",
      amount: -5.67,
      category: "Food & Dining",
      date: "2024-09-10",
      account: "Chase Checking",
      pending: false
    },
    {
      id: 2,
      description: "Amazon Purchase",
      amount: -89.23,
      category: "Shopping",
      date: "2024-09-09",
      account: "Chase Checking",
      pending: false
    },
    {
      id: 3,
      description: "Salary Deposit",
      amount: 3425.00,
      category: "Income",
      date: "2024-09-08",
      account: "Chase Checking",
      pending: false
    },
    {
      id: 4,
      description: "Uber Ride",
      amount: -23.45,
      category: "Transportation",
      date: "2024-09-08",
      account: "Chase Checking",
      pending: false
    },
    {
      id: 5,
      description: "Netflix Subscription",
      amount: -15.99,
      category: "Entertainment",
      date: "2024-09-07",
      account: "Chase Checking",
      pending: true
    },
    {
      id: 6,
      description: "Grocery Store",
      amount: -127.84,
      category: "Food & Dining",
      date: "2024-09-07",
      account: "Chase Checking",
      pending: false
    }
  ];

  const handleDateRangeChange = (range) => {
    setDateRange(range);
    // In a real app, this would trigger data refetch
    console.log('Date range changed to:', range);
  };

  const handleCategoryFilter = (categories) => {
    setSelectedCategories(categories);
    // In a real app, this would filter the displayed data
    console.log('Categories filtered:', categories);
  };

  const handleViewChange = (view) => {
    setCurrentView(view);
  };

  const renderMainContent = () => {
    switch (currentView) {
      case 'trends':
        return (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <SpendingChart 
              data={spendingData} 
              title="Daily Spending Trend" 
              height={400} 
            />
            <MonthlyTrendChart 
              data={monthlyTrendData} 
              title="Monthly Income vs Expenses" 
              height={400} 
            />
          </div>
        );
      
      case 'categories':
        return (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <CategoryChart 
              data={categoryData} 
              title="Spending by Category" 
              height={400} 
            />
            <RecentTransactions transactions={recentTransactions} />
          </div>
        );
      
      case 'comparison':
        return (
          <div className="grid grid-cols-1 gap-6">
            <MonthlyTrendChart 
              data={monthlyTrendData} 
              title="Income vs Expenses Comparison" 
              height={400} 
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SpendingChart 
                data={spendingData?.slice(-14)} 
                title="Last 14 Days" 
                height={300} 
              />
              <CategoryChart 
                data={categoryData?.slice(0, 5)} 
                title="Top 5 Categories" 
                height={300} 
              />
            </div>
          </div>
        );
      
      default: // overview
        return (
          <div className="space-y-6">
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {metricsData?.map((metric, index) => (
                <MetricCard key={index} {...metric} />
              ))}
            </div>
            {/* Main Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <SpendingChart 
                data={spendingData} 
                title="Daily Spending Trend" 
                height={350} 
              />
              <CategoryChart 
                data={categoryData} 
                title="Spending by Category" 
                height={350} 
              />
            </div>
            {/* Secondary Content */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <MonthlyTrendChart 
                  data={monthlyTrendData} 
                  title="Monthly Income vs Expenses" 
                  height={300} 
                />
              </div>
              <RecentTransactions transactions={recentTransactions} />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar Navigation */}
      <SidebarNavigation 
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <div className={`transition-smooth ${
        sidebarCollapsed ? 'ml-16' : 'ml-60'
      } md:mr-80`}>
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Financial Dashboard</h1>
                <p className="text-muted-foreground mt-1">
                  Track your spending patterns and financial insights
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Button 
                  variant="outline" 
                  iconName="Upload" 
                  iconPosition="left"
                  asChild
                >
                  <Link to="/file-upload">Upload Data</Link>
                </Button>
                <Button 
                  variant="outline" 
                  iconName="MessageSquare" 
                  iconPosition="left"
                  onClick={() => setChatOpen(true)}
                  className="md:hidden"
                >
                  AI Assistant
                </Button>
              </div>
            </div>
          </div>

          {/* Filter Controls */}
          <FilterControls
            onDateRangeChange={handleDateRangeChange}
            onCategoryFilter={handleCategoryFilter}
            onViewChange={handleViewChange}
          />

          {/* Main Dashboard Content */}
          {renderMainContent()}

          {/* Quick Insights */}
          <div className="mt-8 bg-card rounded-lg border border-border p-6 shadow-card">
            <h3 className="text-lg font-semibold text-foreground mb-4">AI Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-start space-x-3 p-4 bg-primary/5 rounded-lg">
                <Icon name="TrendingUp" size={20} className="text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Spending Increase</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your dining expenses increased by 23% this month compared to last month
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-4 bg-success/5 rounded-lg">
                <Icon name="PiggyBank" size={20} className="text-success mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Savings Goal</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You're on track to save $2,600 this month, exceeding your goal by 18%
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-4 bg-warning/5 rounded-lg">
                <Icon name="AlertTriangle" size={20} className="text-warning mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Budget Alert</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Shopping category is 15% over budget. Consider reducing discretionary purchases
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Chat Panel */}
      <div className="hidden md:block fixed right-0 top-0 w-80 h-full bg-card border-l border-border">
        <ChatPanel isOpen={true} onToggle={() => {}} className="h-full" />
      </div>

      {/* Mobile Chat Panel */}
      <ChatPanel 
        isOpen={chatOpen} 
        onToggle={() => setChatOpen(!chatOpen)}
        className="md:hidden"
      />

      {/* Mobile Bottom Navigation Spacer */}
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default MainDashboard;