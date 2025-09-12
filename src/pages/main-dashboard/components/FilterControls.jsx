import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const FilterControls = ({ onDateRangeChange, onCategoryFilter, onViewChange }) => {
  const [dateRange, setDateRange] = useState('30d');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [viewType, setViewType] = useState('overview');

  const dateRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 3 months' },
    { value: '1y', label: 'Last year' },
    { value: 'custom', label: 'Custom range' }
  ];

  const categoryOptions = [
    'Food & Dining',
    'Shopping',
    'Transportation',
    'Bills & Utilities',
    'Entertainment',
    'Healthcare',
    'Travel',
    'Other'
  ];

  const viewOptions = [
    { value: 'overview', label: 'Overview', icon: 'LayoutDashboard' },
    { value: 'trends', label: 'Trends', icon: 'TrendingUp' },
    { value: 'categories', label: 'Categories', icon: 'PieChart' },
    { value: 'comparison', label: 'Comparison', icon: 'BarChart3' }
  ];

  const handleDateRangeChange = (range) => {
    setDateRange(range);
    onDateRangeChange?.(range);
  };

  const handleCategoryToggle = (category) => {
    const updated = selectedCategories?.includes(category)
      ? selectedCategories?.filter(c => c !== category)
      : [...selectedCategories, category];
    
    setSelectedCategories(updated);
    onCategoryFilter?.(updated);
  };

  const handleViewChange = (view) => {
    setViewType(view);
    onViewChange?.(view);
  };

  return (
    <div className="bg-card rounded-lg border border-border p-4 shadow-card mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        {/* Date Range Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <label className="text-sm font-medium text-foreground">Time Period:</label>
          <div className="flex flex-wrap gap-2">
            {dateRangeOptions?.map((option) => (
              <button
                key={option?.value}
                onClick={() => handleDateRangeChange(option?.value)}
                className={`px-3 py-1.5 text-sm rounded-md transition-smooth ${
                  dateRange === option?.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                }`}
              >
                {option?.label}
              </button>
            ))}
          </div>
        </div>

        {/* View Type Toggle */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-foreground">View:</label>
          <div className="flex bg-muted rounded-lg p-1">
            {viewOptions?.map((option) => (
              <button
                key={option?.value}
                onClick={() => handleViewChange(option?.value)}
                className={`flex items-center space-x-1 px-3 py-1.5 text-sm rounded-md transition-smooth ${
                  viewType === option?.value
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon name={option?.icon} size={14} />
                <span className="hidden sm:inline">{option?.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Category Filters */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <label className="text-sm font-medium text-foreground">Categories:</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategories([])}
              className={`px-3 py-1.5 text-sm rounded-md transition-smooth ${
                selectedCategories?.length === 0
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }`}
            >
              All Categories
            </button>
            {categoryOptions?.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryToggle(category)}
                className={`px-3 py-1.5 text-sm rounded-md transition-smooth ${
                  selectedCategories?.includes(category)
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" iconName="Download" iconPosition="left">
            Export Data
          </Button>
          <Button variant="outline" size="sm" iconName="RefreshCw" iconPosition="left">
            Refresh
          </Button>
          <Button variant="outline" size="sm" iconName="Settings" iconPosition="left">
            Customize
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FilterControls;