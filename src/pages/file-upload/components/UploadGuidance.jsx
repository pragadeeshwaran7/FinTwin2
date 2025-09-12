import React from 'react';
import Icon from '../../../components/AppIcon';

const UploadGuidance = ({ className = '' }) => {
  const requirements = [
    {
      icon: 'FileSpreadsheet',
      title: 'CSV Format Required',
      description: 'Upload CSV files exported from your bank or financial institution',
      color: 'text-primary'
    },
    {
      icon: 'Columns',
      title: 'Required Columns',
      description: 'Date, Description, Amount, Category (optional)',
      color: 'text-success'
    },
    {
      icon: 'Calendar',
      title: 'Date Format',
      description: 'MM/DD/YYYY, DD/MM/YYYY, or YYYY-MM-DD formats supported',
      color: 'text-warning'
    },
    {
      icon: 'DollarSign',
      title: 'Amount Format',
      description: 'Negative values for expenses, positive for income',
      color: 'text-accent'
    }
  ];

  const sampleData = [
    { date: '01/15/2025', description: 'Grocery Store Purchase', category: 'Food & Dining', amount: '-85.42' },
    { date: '01/14/2025', description: 'Salary Deposit', category: 'Income', amount: '3500.00' },
    { date: '01/13/2025', description: 'Electric Bill Payment', category: 'Utilities', amount: '-120.50' },
    { date: '01/12/2025', description: 'Coffee Shop', category: 'Food & Dining', amount: '-4.75' }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Requirements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {requirements?.map((req, index) => (
          <div key={index} className="flex items-start space-x-3 p-4 bg-card border border-border rounded-lg">
            <div className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center ${req?.color}`}>
              <Icon name={req?.icon} size={16} />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-foreground">{req?.title}</h4>
              <p className="text-xs text-muted-foreground mt-1">{req?.description}</p>
            </div>
          </div>
        ))}
      </div>
      {/* Sample Data Preview */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-medium text-foreground flex items-center">
            <Icon name="Eye" size={16} className="mr-2" />
            Sample CSV Format
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Your CSV file should look similar to this structure
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Description</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Category</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sampleData?.map((row, index) => (
                <tr key={index} className="hover:bg-muted/30">
                  <td className="px-3 py-2 text-foreground">{row?.date}</td>
                  <td className="px-3 py-2 text-foreground">{row?.description}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row?.category}</td>
                  <td className={`px-3 py-2 text-right font-medium ${
                    parseFloat(row?.amount) < 0 ? 'text-error' : 'text-success'
                  }`}>
                    ${Math.abs(parseFloat(row?.amount))?.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Tips Section */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center">
          <Icon name="Lightbulb" size={16} className="mr-2 text-warning" />
          Preparation Tips
        </h4>
        <ul className="space-y-2 text-xs text-muted-foreground">
          <li className="flex items-start space-x-2">
            <Icon name="Check" size={12} className="text-success mt-0.5 shrink-0" />
            <span>Remove any header rows or summary information from your CSV</span>
          </li>
          <li className="flex items-start space-x-2">
            <Icon name="Check" size={12} className="text-success mt-0.5 shrink-0" />
            <span>Ensure all amounts are numeric values (remove currency symbols)</span>
          </li>
          <li className="flex items-start space-x-2">
            <Icon name="Check" size={12} className="text-success mt-0.5 shrink-0" />
            <span>Use consistent date formatting throughout your file</span>
          </li>
          <li className="flex items-start space-x-2">
            <Icon name="Check" size={12} className="text-success mt-0.5 shrink-0" />
            <span>Categories will be auto-detected if not provided</span>
          </li>
        </ul>
      </div>
      {/* Security Notice */}
      <div className="flex items-center space-x-3 p-4 bg-success/10 border border-success/20 rounded-lg">
        <Icon name="Shield" size={20} className="text-success" />
        <div>
          <p className="text-sm font-medium text-success">Secure Processing</p>
          <p className="text-xs text-success/80">
            Your financial data is encrypted and processed locally. We never store your raw transaction data.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UploadGuidance;