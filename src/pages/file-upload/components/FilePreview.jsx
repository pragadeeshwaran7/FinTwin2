import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const FilePreview = ({ 
  fileName = '',
  sampleData = [],
  totalRows = 0,
  onConfirmImport,
  onCancel,
  validationErrors = []
}) => {
  const [showAllRows, setShowAllRows] = useState(false);

  const displayData = showAllRows ? sampleData : sampleData?.slice(0, 5);

  const formatCurrency = (amount) => {
    const numAmount = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    })?.format(numAmount);
  };

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date?.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Icon name="FileSpreadsheet" size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Preview CSV Data</h3>
              <p className="text-sm text-muted-foreground">
                {fileName} • {totalRows?.toLocaleString()} transactions found
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <Icon name="X" size={16} />
          </Button>
        </div>

        {/* Validation Errors */}
        {validationErrors?.length > 0 && (
          <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Icon name="AlertTriangle" size={16} className="text-warning" />
              <span className="text-sm font-medium text-warning">Data Validation Issues</span>
            </div>
            <ul className="text-xs text-warning space-y-1">
              {validationErrors?.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Description
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Category
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {displayData?.map((row, index) => (
              <tr key={index} className="hover:bg-muted/30">
                <td className="px-4 py-3 text-sm text-foreground">
                  {formatDate(row?.date)}
                </td>
                <td className="px-4 py-3 text-sm text-foreground">
                  <div className="max-w-xs truncate" title={row?.description}>
                    {row?.description}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary/10 text-secondary">
                    {row?.category || 'Uncategorized'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  <span className={`font-medium ${
                    parseFloat(row?.amount) < 0 ? 'text-error' : 'text-success'
                  }`}>
                    {formatCurrency(row?.amount)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Show More/Less */}
      {sampleData?.length > 5 && (
        <div className="px-6 py-3 border-t border-border">
          <button
            onClick={() => setShowAllRows(!showAllRows)}
            className="text-sm text-primary hover:text-primary/80 font-medium"
          >
            {showAllRows ? 'Show Less' : `Show All ${sampleData?.length} Rows`}
          </button>
        </div>
      )}
      {/* Footer Actions */}
      <div className="p-6 border-t border-border bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Ready to import {totalRows?.toLocaleString()} transactions
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              onClick={onConfirmImport}
              iconName="Database"
              iconPosition="left"
              disabled={validationErrors?.length > 0}
            >
              Import Data
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilePreview;