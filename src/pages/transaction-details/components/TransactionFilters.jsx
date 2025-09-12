import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const TransactionFilters = ({ onFiltersChange, totalTransactions, filteredCount }) => {
  const [filters, setFilters] = useState({
    searchQuery: '',
    dateFrom: '',
    dateTo: '',
    category: '',
    amountMin: '',
    amountMax: '',
    account: '',
    type: ''
  });

  const [isExpanded, setIsExpanded] = useState(false);

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    { value: 'food', label: 'Food & Dining' },
    { value: 'transportation', label: 'Transportation' },
    { value: 'shopping', label: 'Shopping' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'bills', label: 'Bills & Utilities' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'income', label: 'Income' },
    { value: 'transfer', label: 'Transfers' },
    { value: 'other', label: 'Other' }
  ];

  const accountOptions = [
    { value: '', label: 'All Accounts' },
    { value: 'checking', label: 'Checking Account' },
    { value: 'savings', label: 'Savings Account' },
    { value: 'credit', label: 'Credit Card' },
    { value: 'investment', label: 'Investment Account' }
  ];

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'debit', label: 'Debit' },
    { value: 'credit', label: 'Credit' }
  ];

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    const clearedFilters = {
      searchQuery: '',
      dateFrom: '',
      dateTo: '',
      category: '',
      amountMin: '',
      amountMax: '',
      account: '',
      type: ''
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters = Object.values(filters)?.some(value => value !== '');

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-6">
      {/* Search and Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex-1">
          <div className="relative">
            <Icon 
              name="Search" 
              size={16} 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" 
            />
            <Input
              type="search"
              placeholder="Search transactions... (e.g., 'coffee last week', 'grocery over $50')"
              value={filters?.searchQuery}
              onChange={(e) => handleFilterChange('searchQuery', e?.target?.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsExpanded(!isExpanded)}
            iconName={isExpanded ? "ChevronUp" : "ChevronDown"}
            iconPosition="right"
          >
            Advanced Filters
          </Button>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={clearAllFilters}
              iconName="X"
              iconPosition="left"
              className="text-muted-foreground"
            >
              Clear All
            </Button>
          )}
        </div>
      </div>
      {/* Results Count */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Icon name="Filter" size={14} />
          <span>
            Showing {filteredCount?.toLocaleString()} of {totalTransactions?.toLocaleString()} transactions
          </span>
          {hasActiveFilters && (
            <span className="inline-flex items-center px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
              Filtered
            </span>
          )}
        </div>
      </div>
      {/* Advanced Filters */}
      {isExpanded && (
        <div className="border-t border-border pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Date Range</label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  placeholder="From"
                  value={filters?.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e?.target?.value)}
                />
                <Input
                  type="date"
                  placeholder="To"
                  value={filters?.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e?.target?.value)}
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Select
                label="Category"
                options={categoryOptions}
                value={filters?.category}
                onChange={(value) => handleFilterChange('category', value)}
              />
            </div>

            {/* Account */}
            <div className="space-y-2">
              <Select
                label="Account"
                options={accountOptions}
                value={filters?.account}
                onChange={(value) => handleFilterChange('account', value)}
              />
            </div>

            {/* Transaction Type */}
            <div className="space-y-2">
              <Select
                label="Type"
                options={typeOptions}
                value={filters?.type}
                onChange={(value) => handleFilterChange('type', value)}
              />
            </div>
          </div>

          {/* Amount Range */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Amount Range</label>
            <div className="grid grid-cols-2 gap-2 max-w-md">
              <Input
                type="number"
                placeholder="Min amount"
                value={filters?.amountMin}
                onChange={(e) => handleFilterChange('amountMin', e?.target?.value)}
              />
              <Input
                type="number"
                placeholder="Max amount"
                value={filters?.amountMax}
                onChange={(e) => handleFilterChange('amountMax', e?.target?.value)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionFilters;