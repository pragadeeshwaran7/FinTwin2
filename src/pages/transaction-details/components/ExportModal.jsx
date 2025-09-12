import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import Select from '../../../components/ui/Select';

const ExportModal = ({ isOpen, onClose, selectedTransactions, totalTransactions }) => {
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportScope, setExportScope] = useState('filtered');
  const [includeColumns, setIncludeColumns] = useState({
    date: true,
    description: true,
    category: true,
    account: true,
    amount: true,
    type: true,
    merchant: false,
    notes: false
  });
  const [isExporting, setIsExporting] = useState(false);

  const formatOptions = [
    { value: 'csv', label: 'CSV (Comma Separated)' },
    { value: 'excel', label: 'Excel Spreadsheet' },
    { value: 'pdf', label: 'PDF Report' }
  ];

  const scopeOptions = [
    { value: 'filtered', label: `Current View (${totalTransactions} transactions)` },
    { value: 'selected', label: `Selected Only (${selectedTransactions?.length} transactions)`, disabled: selectedTransactions?.length === 0 },
    { value: 'all', label: 'All Transactions' }
  ];

  const handleColumnToggle = (column, checked) => {
    setIncludeColumns(prev => ({
      ...prev,
      [column]: checked
    }));
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    // Simulate export process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Create mock download
    const filename = `transactions_${new Date()?.toISOString()?.split('T')?.[0]}.${exportFormat}`;
    
    setIsExporting(false);
    onClose();
    
    // Show success message (in real app, this would trigger actual download)
    alert(`Export completed! File: ${filename}`);
  };

  const getExportCount = () => {
    switch (exportScope) {
      case 'selected':
        return selectedTransactions?.length;
      case 'filtered':
        return totalTransactions;
      case 'all':
        return 5247; // Mock total count
      default:
        return 0;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-300 p-4">
      <div className="bg-card rounded-lg shadow-modal border border-border w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Icon name="Download" size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Export Transactions</h2>
              <p className="text-sm text-muted-foreground">Download your transaction data</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <Icon name="X" size={16} />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Export Format */}
          <div className="space-y-3">
            <Select
              label="Export Format"
              description="Choose the file format for your export"
              options={formatOptions}
              value={exportFormat}
              onChange={setExportFormat}
            />
          </div>

          {/* Export Scope */}
          <div className="space-y-3">
            <Select
              label="Export Scope"
              description="Select which transactions to include"
              options={scopeOptions}
              value={exportScope}
              onChange={setExportScope}
            />
          </div>

          {/* Column Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Include Columns</label>
            <p className="text-xs text-muted-foreground">Select which data fields to include in the export</p>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(includeColumns)?.map(([column, checked]) => (
                <Checkbox
                  key={column}
                  label={column?.charAt(0)?.toUpperCase() + column?.slice(1)}
                  checked={checked}
                  onChange={(e) => handleColumnToggle(column, e?.target?.checked)}
                />
              ))}
            </div>
          </div>

          {/* Export Summary */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-foreground mb-2">Export Summary</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Format:</span>
                <span className="text-foreground font-medium">{exportFormat?.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span>Transactions:</span>
                <span className="text-foreground font-medium">{getExportCount()?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Columns:</span>
                <span className="text-foreground font-medium">
                  {Object.values(includeColumns)?.filter(Boolean)?.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Size:</span>
                <span className="text-foreground font-medium">
                  {Math.round(getExportCount() * 0.1)}KB
                </span>
              </div>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="flex items-start space-x-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <Icon name="Shield" size={16} className="text-warning mt-0.5" />
            <div className="text-xs text-warning">
              <p className="font-medium">Data Privacy Notice</p>
              <p>Exported files contain sensitive financial information. Store securely and delete when no longer needed.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            loading={isExporting}
            iconName="Download"
            iconPosition="left"
            disabled={Object.values(includeColumns)?.every(v => !v)}
          >
            {isExporting ? 'Exporting...' : 'Export Data'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;