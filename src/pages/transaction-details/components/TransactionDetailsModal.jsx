import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const TransactionDetailsModal = ({ isOpen, onClose, transaction, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTransaction, setEditedTransaction] = useState(transaction || {});
  const [isSaving, setIsSaving] = useState(false);

  const categoryOptions = [
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
    { value: 'checking', label: 'Checking Account' },
    { value: 'savings', label: 'Savings Account' },
    { value: 'credit', label: 'Credit Card' },
    { value: 'investment', label: 'Investment Account' }
  ];

  const handleSave = async () => {
    setIsSaving(true);
    
    // Simulate save operation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    onSave(editedTransaction);
    setIsEditing(false);
    setIsSaving(false);
  };

  const handleCancel = () => {
    setEditedTransaction(transaction);
    setIsEditing(false);
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
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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
      food: 'text-orange-600 bg-orange-100',
      transportation: 'text-blue-600 bg-blue-100',
      shopping: 'text-purple-600 bg-purple-100',
      entertainment: 'text-pink-600 bg-pink-100',
      bills: 'text-red-600 bg-red-100',
      healthcare: 'text-green-600 bg-green-100',
      income: 'text-emerald-600 bg-emerald-100',
      transfer: 'text-gray-600 bg-gray-100',
      other: 'text-gray-500 bg-gray-100'
    };
    return colorMap?.[category] || 'text-gray-500 bg-gray-100';
  };

  if (!isOpen || !transaction) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-300 p-4">
      <div className="bg-card rounded-lg shadow-modal border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getCategoryColor(transaction?.category)}`}>
              <Icon name={getCategoryIcon(transaction?.category)} size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Transaction Details</h2>
              <p className="text-sm text-muted-foreground">{formatDate(transaction?.date)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing && (
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                iconName="Edit"
                iconPosition="left"
              >
                Edit
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <Icon name="X" size={16} />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {isEditing ? (
            <div className="space-y-6">
              {/* Edit Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Description"
                  value={editedTransaction?.description}
                  onChange={(e) => setEditedTransaction(prev => ({
                    ...prev,
                    description: e?.target?.value
                  }))}
                />
                <Input
                  label="Merchant"
                  value={editedTransaction?.merchant || ''}
                  onChange={(e) => setEditedTransaction(prev => ({
                    ...prev,
                    merchant: e?.target?.value
                  }))}
                />
                <Select
                  label="Category"
                  options={categoryOptions}
                  value={editedTransaction?.category}
                  onChange={(value) => setEditedTransaction(prev => ({
                    ...prev,
                    category: value
                  }))}
                />
                <Select
                  label="Account"
                  options={accountOptions}
                  value={editedTransaction?.account}
                  onChange={(value) => setEditedTransaction(prev => ({
                    ...prev,
                    account: value
                  }))}
                />
                <Input
                  label="Amount"
                  type="number"
                  step="0.01"
                  value={Math.abs(editedTransaction?.amount)}
                  onChange={(e) => setEditedTransaction(prev => ({
                    ...prev,
                    amount: parseFloat(e?.target?.value) || 0
                  }))}
                />
                <Input
                  label="Date"
                  type="date"
                  value={editedTransaction?.date}
                  onChange={(e) => setEditedTransaction(prev => ({
                    ...prev,
                    date: e?.target?.value
                  }))}
                />
              </div>
              
              <Input
                label="Notes"
                value={editedTransaction?.notes || ''}
                onChange={(e) => setEditedTransaction(prev => ({
                  ...prev,
                  notes: e?.target?.value
                }))}
                description="Add any additional notes about this transaction"
              />

              {/* Edit Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border">
                <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave} 
                  loading={isSaving}
                  iconName="Save"
                  iconPosition="left"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Transaction Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="text-lg font-medium text-foreground mt-1">{transaction?.description}</p>
                  </div>
                  
                  {transaction?.merchant && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Merchant</label>
                      <p className="text-foreground mt-1">{transaction?.merchant}</p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Category</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Icon name={getCategoryIcon(transaction?.category)} size={16} />
                      <span className="text-foreground capitalize">{transaction?.category?.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Amount</label>
                    <p className={`text-2xl font-bold mt-1 ${
                      transaction?.type === 'credit' ? 'text-success' : 'text-foreground'
                    }`}>
                      {formatAmount(transaction?.amount, transaction?.type)}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Account</label>
                    <p className="text-foreground mt-1 capitalize">{transaction?.account}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Transaction ID</label>
                    <p className="text-foreground mt-1 font-mono text-sm">{transaction?.id}</p>
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              {transaction?.notes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Notes</label>
                  <p className="text-foreground mt-1">{transaction?.notes}</p>
                </div>
              )}

              {/* Transaction Metadata */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-foreground mb-3">Transaction Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <span className="ml-2 text-foreground capitalize">{transaction?.type}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <span className="ml-2 text-success">Completed</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Balance Impact:</span>
                    <span className={`ml-2 ${transaction?.type === 'credit' ? 'text-success' : 'text-foreground'}`}>
                      {transaction?.type === 'credit' ? 'Increased' : 'Decreased'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Processing Date:</span>
                    <span className="ml-2 text-foreground">{formatDate(transaction?.date)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionDetailsModal;