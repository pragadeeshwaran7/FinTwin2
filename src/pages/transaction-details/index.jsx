import React, { useState, useEffect, useMemo } from 'react';
import { useTransactionData } from '../../hooks/useTransactionData.js';
import { useMCP } from '../../context/MCPProvider.jsx';
import { Link } from 'react-router-dom';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import SidebarNavigation from '../../components/ui/SidebarNavigation';
import ChatPanel from '../../components/ui/ChatPanel';
import TransactionFilters from './components/TransactionFilters';
import TransactionTable from './components/TransactionTable';
import TransactionPagination from './components/TransactionPagination';
import ExportModal from './components/ExportModal';
import TransactionDetailsModal from './components/TransactionDetailsModal';

const TransactionDetails = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const [filters, setFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const { isConnected } = useMCP();
  const {
    transactions,
    loading,
    error,
    loadTransactions
  } = useTransactionData();

  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    category: '',
    type: '',
    minAmount: '',
    maxAmount: ''
  });
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);

  useEffect(() => {
    if (isConnected) {
      loadTransactions(filters);
    }
  }, [isConnected, filters, loadTransactions]);

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleTransactionClick = (transaction) => {
    setSelectedTransaction(transaction);
  };

  const handleExport = () => {
    setShowExportModal(true);
  };

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

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = transactions.slice(startIndex, endIndex);
  const totalPages = Math.ceil(transactions.length / itemsPerPage);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Transaction Details</h1>
        <div className="flex space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">MCP Connected</span>
          </div>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Export Data
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <TransactionFilters
          filters={filters}
          onFiltersChange={handleFilterChange}
          loading={loading}
        />
      </div>

      {/* Results Summary */}
      {transactions.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1}-{Math.min(endIndex, transactions.length)} of {transactions.length} transactions
            {Object.values(filters).some(f => f) && (
              <span className="ml-2 text-blue-600">(filtered)</span>
            )}
          </div>
        </div>
      )}

      {/* Transactions Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div className="ml-3 text-lg">Loading transactions...</div>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-6 rounded-lg">
          <div className="text-red-600 font-medium">Error loading transactions</div>
          <div className="text-red-500 text-sm mt-1">{error}</div>
          <button
            onClick={() => loadTransactions(filters)}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="text-gray-500 text-lg">No transactions found</div>
          <div className="text-gray-400 text-sm mt-2">
            Try adjusting your filters or check your data connection
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <TransactionTable
            transactions={paginatedTransactions}
            onTransactionClick={handleTransactionClick}
            loading={loading}
          />
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <TransactionPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Modals */}
      {selectedTransaction && (
        <TransactionDetailsModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}

      {showExportModal && (
        <ExportModal
          transactions={transactions}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
};


  // Mock transaction data
  const mockTransactions = [
    {
      id: "TXN-2025-001",
      date: "2025-01-08",
      description: "Starbucks Coffee",
      merchant: "Starbucks Store #1234",
      category: "food",
      account: "checking",
      amount: 5.47,
      type: "debit",
      notes: "Morning coffee before work"
    },
    {
      id: "TXN-2025-002",
      date: "2025-01-08",
      description: "Salary Deposit",
      merchant: "ABC Corporation",
      category: "income",
      account: "checking",
      amount: 3500.00,
      type: "credit",
      notes: "Monthly salary payment"
    },
    {
      id: "TXN-2025-003",
      date: "2025-01-07",
      description: "Uber Ride",
      merchant: "Uber Technologies",
      category: "transportation",
      account: "credit",
      amount: 18.25,
      type: "debit",
      notes: "Ride to downtown meeting"
    },
    {
      id: "TXN-2025-004",
      date: "2025-01-07",
      description: "Amazon Purchase",
      merchant: "Amazon.com",
      category: "shopping",
      account: "credit",
      amount: 89.99,
      type: "debit",
      notes: "Office supplies and books"
    },
    {
      id: "TXN-2025-005",
      date: "2025-01-06",
      description: "Netflix Subscription",
      merchant: "Netflix Inc",
      category: "entertainment",
      account: "checking",
      amount: 15.99,
      type: "debit",
      notes: "Monthly streaming subscription"
    },
    {
      id: "TXN-2025-006",
      date: "2025-01-06",
      description: "Electric Bill",
      merchant: "City Power Company",
      category: "bills",
      account: "checking",
      amount: 127.45,
      type: "debit",
      notes: "December electricity bill"
    },
    {
      id: "TXN-2025-007",
      date: "2025-01-05",
      description: "Grocery Shopping",
      merchant: "Whole Foods Market",
      category: "food",
      account: "checking",
      amount: 156.78,
      type: "debit",
      notes: "Weekly grocery shopping"
    },
    {
      id: "TXN-2025-008",
      date: "2025-01-05",
      description: "Gas Station",
      merchant: "Shell Gas Station",
      category: "transportation",
      account: "credit",
      amount: 45.20,
      type: "debit",
      notes: "Fill up gas tank"
    },
    {
      id: "TXN-2025-009",
      date: "2025-01-04",
      description: "Movie Tickets",
      merchant: "AMC Theaters",
      category: "entertainment",
      account: "credit",
      amount: 28.50,
      type: "debit",
      notes: "Weekend movie with friends"
    },
    {
      id: "TXN-2025-010",
      date: "2025-01-04",
      description: "Pharmacy",
      merchant: "CVS Pharmacy",
      category: "healthcare",
      account: "checking",
      amount: 24.99,
      type: "debit",
      notes: "Prescription medication"
    },
    {
      id: "TXN-2025-011",
      date: "2025-01-03",
      description: "Restaurant Dinner",
      merchant: "The Italian Place",
      category: "food",
      account: "credit",
      amount: 67.85,
      type: "debit",
      notes: "Dinner with family"
    },
    {
      id: "TXN-2025-012",
      date: "2025-01-03",
      description: "ATM Withdrawal",
      merchant: "Bank ATM",
      category: "transfer",
      account: "checking",
      amount: 100.00,
      type: "debit",
      notes: "Cash withdrawal for weekend"
    },
    {
      id: "TXN-2025-013",
      date: "2025-01-02",
      description: "Online Course",
      merchant: "Udemy",
      category: "other",
      account: "credit",
      amount: 49.99,
      type: "debit",
      notes: "React development course"
    },
    {
      id: "TXN-2025-014",
      date: "2025-01-02",
      description: "Gym Membership",
      merchant: "FitLife Gym",
      category: "healthcare",
      account: "checking",
      amount: 39.99,
      type: "debit",
      notes: "Monthly gym membership"
    },
    {
      id: "TXN-2025-015",
      date: "2025-01-01",
      description: "Interest Payment",
      merchant: "First National Bank",
      category: "income",
      account: "savings",
      amount: 12.50,
      type: "credit",
      notes: "Monthly savings interest"
    }
  ];

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = [...mockTransactions];

    // Apply filters
    if (filters?.searchQuery) {
      const query = filters?.searchQuery?.toLowerCase();
      filtered = filtered?.filter(transaction =>
        transaction?.description?.toLowerCase()?.includes(query) ||
        transaction?.merchant?.toLowerCase()?.includes(query) ||
        transaction?.category?.toLowerCase()?.includes(query)
      );
    }

    if (filters?.category) {
      filtered = filtered?.filter(transaction => transaction?.category === filters?.category);
    }

    if (filters?.account) {
      filtered = filtered?.filter(transaction => transaction?.account === filters?.account);
    }

    if (filters?.type) {
      filtered = filtered?.filter(transaction => transaction?.type === filters?.type);
    }

    if (filters?.dateFrom) {
      filtered = filtered?.filter(transaction => transaction?.date >= filters?.dateFrom);
    }

    if (filters?.dateTo) {
      filtered = filtered?.filter(transaction => transaction?.date <= filters?.dateTo);
    }

    if (filters?.amountMin) {
      filtered = filtered?.filter(transaction => Math.abs(transaction?.amount) >= parseFloat(filters?.amountMin));
    }

    if (filters?.amountMax) {
      filtered = filtered?.filter(transaction => Math.abs(transaction?.amount) <= parseFloat(filters?.amountMax));
    }

    // Apply sorting
    filtered?.sort((a, b) => {
      let aValue = a?.[sortConfig?.key];
      let bValue = b?.[sortConfig?.key];

      if (sortConfig?.key === 'amount') {
        aValue = Math.abs(aValue);
        bValue = Math.abs(bValue);
      }

      if (sortConfig?.key === 'date') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (aValue < bValue) {
        return sortConfig?.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig?.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [filters, sortConfig]);

  // Paginate transactions
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedTransactions?.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedTransactions, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedTransactions?.length / itemsPerPage);

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig?.key === key && prevConfig?.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setSelectedTransactions([]);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
    setSelectedTransactions([]);
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
    setSelectedTransactions([]);
  };

  const handleEditTransaction = (transaction) => {
    setSelectedTransaction(transaction);
    setDetailsModalOpen(true);
  };

  const handleViewDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setDetailsModalOpen(true);
  };

  const handleSaveTransaction = (updatedTransaction) => {
    // In a real app, this would update the transaction in the backend
    console.log('Saving transaction:', updatedTransaction);
    setDetailsModalOpen(false);
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar Navigation */}
      <SidebarNavigation 
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      {/* Main Content */}
      <div className={`transition-smooth ${sidebarCollapsed ? 'ml-16' : 'ml-60'} md:mr-0 ${chatOpen ? 'mr-80' : ''}`}>
        <div className="p-6 pb-20 md:pb-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Transaction Details</h1>
                <p className="text-muted-foreground mt-1">
                  Manage and analyze your financial transactions
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setExportModalOpen(true)}
                  iconName="Download"
                  iconPosition="left"
                >
                  Export
                </Button>
                <Link to="/file-upload">
                  <Button iconName="Upload" iconPosition="left">
                    Import Data
                  </Button>
                </Link>
              </div>
            </div>

            {/* Breadcrumb */}
            <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Link to="/main-dashboard" className="hover:text-foreground transition-smooth">
                Dashboard
              </Link>
              <Icon name="ChevronRight" size={14} />
              <span className="text-foreground">Transactions</span>
            </nav>
          </div>

          {/* Filters */}
          <TransactionFilters
            onFiltersChange={handleFiltersChange}
            totalTransactions={mockTransactions?.length}
            filteredCount={filteredAndSortedTransactions?.length}
          />

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Icon name="Receipt" size={16} className="text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Total Transactions</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">
                {filteredAndSortedTransactions?.length?.toLocaleString()}
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Icon name="TrendingDown" size={16} className="text-red-500" />
                <span className="text-sm font-medium text-muted-foreground">Total Spent</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">
                ${filteredAndSortedTransactions?.filter(t => t?.type === 'debit')?.reduce((sum, t) => sum + t?.amount, 0)?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Icon name="TrendingUp" size={16} className="text-success" />
                <span className="text-sm font-medium text-muted-foreground">Total Income</span>
              </div>
              <p className="text-2xl font-bold text-success mt-1">
                ${filteredAndSortedTransactions?.filter(t => t?.type === 'credit')?.reduce((sum, t) => sum + t?.amount, 0)?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Icon name="Calendar" size={16} className="text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Date Range</span>
              </div>
              <p className="text-sm font-medium text-foreground mt-1">
                {filteredAndSortedTransactions?.length > 0 ? (
                  <>
                    {new Date(Math.min(...filteredAndSortedTransactions.map(t => new Date(t.date))))?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' - '}
                    {new Date(Math.max(...filteredAndSortedTransactions.map(t => new Date(t.date))))?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </>
                ) : 'No data'}
              </p>
            </div>
          </div>

          {/* Transaction Table */}
          <TransactionTable
            transactions={paginatedTransactions}
            selectedTransactions={selectedTransactions}
            onSelectionChange={setSelectedTransactions}
            onSort={handleSort}
            sortConfig={sortConfig}
            onEditTransaction={handleEditTransaction}
            onViewDetails={handleViewDetails}
          />

          {/* Pagination */}
          <div className="mt-6">
            <TransactionPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredAndSortedTransactions?.length}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          </div>
        </div>
      </div>
      {/* Chat Panel */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-card border-l border-border transition-smooth z-100 ${
        chatOpen ? 'translate-x-0' : 'translate-x-full'
      } hidden md:block`}>
        <ChatPanel isOpen={chatOpen} onToggle={() => setChatOpen(!chatOpen)} />
      </div>
      {/* Mobile Chat */}
      <ChatPanel 
        isOpen={chatOpen} 
        onToggle={() => setChatOpen(!chatOpen)} 
        className="md:hidden"
      />
      {/* Modals */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        selectedTransactions={selectedTransactions}
        totalTransactions={filteredAndSortedTransactions?.length}
      />
      <TransactionDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        transaction={selectedTransaction}
        onSave={handleSaveTransaction}
      />
    </div>
  );
};

export default TransactionDetails;