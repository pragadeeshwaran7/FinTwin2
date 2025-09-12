import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';

const TransactionTable = ({ 
  transactions, 
  selectedTransactions, 
  onSelectionChange, 
  onSort, 
  sortConfig,
  onEditTransaction,
  onViewDetails 
}) => {
  const [hoveredRow, setHoveredRow] = useState(null);

  const handleSelectAll = (checked) => {
    if (checked) {
      onSelectionChange(transactions?.map(t => t?.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectTransaction = (transactionId, checked) => {
    if (checked) {
      onSelectionChange([...selectedTransactions, transactionId]);
    } else {
      onSelectionChange(selectedTransactions?.filter(id => id !== transactionId));
    }
  };

  const formatAmount = (amount, type) => {
    const formattedAmount = Math.abs(amount)?.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD'
    });
    
    return type === 'credit' ? `+${formattedAmount}` : `-${formattedAmount}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString)?.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getCategoryIcon = (category) => {
    const iconMap = {
      food: 'UtensilsCrossed',
      transportation: 'Car',
      shopping: 'ShoppingBag',
      entertainment: 'Film',
      bills: 'Receipt',
      healthcare: 'Heart',
      income: 'TrendingUp',
      transfer: 'ArrowRightLeft',
      other: 'MoreHorizontal'
    };
    return iconMap?.[category] || 'MoreHorizontal';
  };

  const getCategoryColor = (category) => {
    const colorMap = {
      food: 'text-orange-600',
      transportation: 'text-blue-600',
      shopping: 'text-purple-600',
      entertainment: 'text-pink-600',
      bills: 'text-red-600',
      healthcare: 'text-green-600',
      income: 'text-emerald-600',
      transfer: 'text-gray-600',
      other: 'text-gray-500'
    };
    return colorMap?.[category] || 'text-gray-500';
  };

  const getSortIcon = (column) => {
    if (sortConfig?.key !== column) return 'ArrowUpDown';
    return sortConfig?.direction === 'asc' ? 'ArrowUp' : 'ArrowDown';
  };

  const isAllSelected = transactions?.length > 0 && selectedTransactions?.length === transactions?.length;
  const isIndeterminate = selectedTransactions?.length > 0 && selectedTransactions?.length < transactions?.length;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Table Header with Bulk Actions */}
      {selectedTransactions?.length > 0 && (
        <div className="bg-primary/5 border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              {selectedTransactions?.length} transaction{selectedTransactions?.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" iconName="Tag" iconPosition="left">
                Categorize
              </Button>
              <Button variant="outline" size="sm" iconName="Download" iconPosition="left">
                Export
              </Button>
              <Button variant="outline" size="sm" iconName="Trash2" iconPosition="left">
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="w-12 px-4 py-3">
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isIndeterminate}
                  onChange={(e) => handleSelectAll(e?.target?.checked)}
                />
              </th>
              <th className="text-left px-4 py-3">
                <button
                  onClick={() => onSort('date')}
                  className="flex items-center space-x-1 text-sm font-medium text-foreground hover:text-primary transition-smooth"
                >
                  <span>Date</span>
                  <Icon name={getSortIcon('date')} size={14} />
                </button>
              </th>
              <th className="text-left px-4 py-3">
                <button
                  onClick={() => onSort('description')}
                  className="flex items-center space-x-1 text-sm font-medium text-foreground hover:text-primary transition-smooth"
                >
                  <span>Description</span>
                  <Icon name={getSortIcon('description')} size={14} />
                </button>
              </th>
              <th className="text-left px-4 py-3">
                <button
                  onClick={() => onSort('category')}
                  className="flex items-center space-x-1 text-sm font-medium text-foreground hover:text-primary transition-smooth"
                >
                  <span>Category</span>
                  <Icon name={getSortIcon('category')} size={14} />
                </button>
              </th>
              <th className="text-left px-4 py-3">
                <button
                  onClick={() => onSort('account')}
                  className="flex items-center space-x-1 text-sm font-medium text-foreground hover:text-primary transition-smooth"
                >
                  <span>Account</span>
                  <Icon name={getSortIcon('account')} size={14} />
                </button>
              </th>
              <th className="text-right px-4 py-3">
                <button
                  onClick={() => onSort('amount')}
                  className="flex items-center justify-end space-x-1 text-sm font-medium text-foreground hover:text-primary transition-smooth"
                >
                  <span>Amount</span>
                  <Icon name={getSortIcon('amount')} size={14} />
                </button>
              </th>
              <th className="w-24 px-4 py-3">
                <span className="text-sm font-medium text-foreground">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions?.map((transaction) => (
              <tr
                key={transaction?.id}
                className={`border-b border-border hover:bg-muted/30 transition-smooth ${
                  selectedTransactions?.includes(transaction?.id) ? 'bg-primary/5' : ''
                }`}
                onMouseEnter={() => setHoveredRow(transaction?.id)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                <td className="px-4 py-3">
                  <Checkbox
                    checked={selectedTransactions?.includes(transaction?.id)}
                    onChange={(e) => handleSelectTransaction(transaction?.id, e?.target?.checked)}
                  />
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-foreground">
                    {formatDate(transaction?.date)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="max-w-xs">
                    <p className="text-sm font-medium text-foreground truncate">
                      {transaction?.description}
                    </p>
                    {transaction?.merchant && (
                      <p className="text-xs text-muted-foreground truncate">
                        {transaction?.merchant}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <Icon 
                      name={getCategoryIcon(transaction?.category)} 
                      size={16} 
                      className={getCategoryColor(transaction?.category)}
                    />
                    <span className="text-sm text-foreground capitalize">
                      {transaction?.category?.replace('_', ' ')}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-foreground capitalize">
                    {transaction?.account}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`text-sm font-medium ${
                    transaction?.type === 'credit' ? 'text-success' : 'text-foreground'
                  }`}>
                    {formatAmount(transaction?.amount, transaction?.type)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onViewDetails(transaction)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Icon name="Eye" size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEditTransaction(transaction)}
                      className={`transition-opacity ${
                        hoveredRow === transaction?.id ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      <Icon name="Edit" size={14} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-3 p-4">
        {transactions?.map((transaction) => (
          <div
            key={transaction?.id}
            className={`bg-card border border-border rounded-lg p-4 ${
              selectedTransactions?.includes(transaction?.id) ? 'ring-2 ring-primary/20 bg-primary/5' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={selectedTransactions?.includes(transaction?.id)}
                  onChange={(e) => handleSelectTransaction(transaction?.id, e?.target?.checked)}
                />
                <div className="flex items-center space-x-2">
                  <Icon 
                    name={getCategoryIcon(transaction?.category)} 
                    size={16} 
                    className={getCategoryColor(transaction?.category)}
                  />
                  <span className="text-xs text-muted-foreground capitalize">
                    {transaction?.category?.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <span className={`text-sm font-medium ${
                transaction?.type === 'credit' ? 'text-success' : 'text-foreground'
              }`}>
                {formatAmount(transaction?.amount, transaction?.type)}
              </span>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                {transaction?.description}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatDate(transaction?.date)}</span>
                <span className="capitalize">{transaction?.account}</span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 mt-3 pt-3 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewDetails(transaction)}
                iconName="Eye"
                iconPosition="left"
              >
                View
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditTransaction(transaction)}
                iconName="Edit"
                iconPosition="left"
              >
                Edit
              </Button>
            </div>
          </div>
        ))}
      </div>
      {/* Empty State */}
      {transactions?.length === 0 && (
        <div className="text-center py-12">
          <Icon name="Receipt" size={48} className="text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No transactions found</h3>
          <p className="text-muted-foreground">
            Try adjusting your filters or search terms to find transactions.
          </p>
        </div>
      )}
    </div>
  );
};

export default TransactionTable;