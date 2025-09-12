import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const RecentTransactions = ({ transactions, title = "Recent Transactions" }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    })?.format(Math.abs(amount));
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday?.setDate(yesterday?.getDate() - 1);

    if (date?.toDateString() === today?.toDateString()) {
      return 'Today';
    } else if (date?.toDateString() === yesterday?.toDateString()) {
      return 'Yesterday';
    } else {
      return date?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getCategoryIcon = (category) => {
    const iconMap = {
      'Food & Dining': 'UtensilsCrossed',
      'Shopping': 'ShoppingBag',
      'Transportation': 'Car',
      'Bills & Utilities': 'Receipt',
      'Entertainment': 'Film',
      'Healthcare': 'Heart',
      'Travel': 'Plane',
      'Income': 'TrendingUp',
      'Other': 'MoreHorizontal'
    };
    return iconMap?.[category] || 'MoreHorizontal';
  };

  const getCategoryColor = (category) => {
    const colorMap = {
      'Food & Dining': 'text-orange-500',
      'Shopping': 'text-purple-500',
      'Transportation': 'text-blue-500',
      'Bills & Utilities': 'text-red-500',
      'Entertainment': 'text-pink-500',
      'Healthcare': 'text-green-500',
      'Travel': 'text-indigo-500',
      'Income': 'text-emerald-500',
      'Other': 'text-gray-500'
    };
    return colorMap?.[category] || 'text-gray-500';
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <Button variant="ghost" size="sm" iconName="ExternalLink" iconPosition="right">
          View All
        </Button>
      </div>
      <div className="space-y-3">
        {transactions?.map((transaction) => (
          <div
            key={transaction?.id}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-smooth"
          >
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center ${getCategoryColor(transaction?.category)}`}>
                <Icon name={getCategoryIcon(transaction?.category)} size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {transaction?.description}
                </p>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <span>{transaction?.category}</span>
                  <span>•</span>
                  <span>{formatDate(transaction?.date)}</span>
                  {transaction?.account && (
                    <>
                      <span>•</span>
                      <span>{transaction?.account}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-sm font-semibold ${
                transaction?.amount > 0 ? 'text-success' : 'text-foreground'
              }`}>
                {transaction?.amount > 0 ? '+' : '-'}{formatCurrency(transaction?.amount)}
              </p>
              {transaction?.pending && (
                <p className="text-xs text-warning">Pending</p>
              )}
            </div>
          </div>
        ))}
      </div>
      {transactions?.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
            <Icon name="Receipt" size={24} className="text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No recent transactions</p>
          <p className="text-xs text-muted-foreground mt-1">
            Upload your financial data to see transactions here
          </p>
        </div>
      )}
    </div>
  );
};

export default RecentTransactions;