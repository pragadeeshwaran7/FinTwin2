import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const UploadHistory = ({ className = '' }) => {
  const [selectedFile, setSelectedFile] = useState(null);

  const uploadHistory = [
    {
      id: 1,
      fileName: 'bank_transactions_december_2024.csv',
      uploadDate: new Date('2025-01-08T14:30:00'),
      status: 'completed',
      recordCount: 247,
      fileSize: 45600,
      processingTime: 12,
      errors: 0
    },
    {
      id: 2,
      fileName: 'credit_card_november_2024.csv',
      uploadDate: new Date('2025-01-05T09:15:00'),
      status: 'completed',
      recordCount: 89,
      fileSize: 18200,
      processingTime: 8,
      errors: 2
    },
    {
      id: 3,
      fileName: 'checking_account_october_2024.csv',
      uploadDate: new Date('2025-01-02T16:45:00'),
      status: 'completed',
      recordCount: 156,
      fileSize: 32100,
      processingTime: 15,
      errors: 0
    },
    {
      id: 4,
      fileName: 'savings_transactions_september_2024.csv',
      uploadDate: new Date('2024-12-28T11:20:00'),
      status: 'error',
      recordCount: 0,
      fileSize: 12800,
      processingTime: 0,
      errors: 15
    }
  ];

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i))?.toFixed(2)) + ' ' + sizes?.[i];
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })?.format(date);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <Icon name="CheckCircle" size={16} className="text-success" />;
      case 'error':
        return <Icon name="AlertCircle" size={16} className="text-error" />;
      case 'processing':
        return <Icon name="Loader2" size={16} className="text-primary animate-spin" />;
      default:
        return <Icon name="Clock" size={16} className="text-muted-foreground" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Failed';
      case 'processing':
        return 'Processing';
      default:
        return 'Pending';
    }
  };

  const handleReprocess = (fileId) => {
    console.log('Reprocessing file:', fileId);
    // Implement reprocessing logic
  };

  const handleDownloadReport = (fileId) => {
    console.log('Downloading report for file:', fileId);
    // Implement download logic
  };

  if (uploadHistory?.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
          <Icon name="History" size={32} className="text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No upload history yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Your uploaded files will appear here
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Upload History</h3>
        <Button variant="outline" size="sm" iconName="Download" iconPosition="left">
          Export Report
        </Button>
      </div>
      <div className="space-y-3">
        {uploadHistory?.map((file) => (
          <div
            key={file?.id}
            className={`bg-card border border-border rounded-lg p-4 transition-smooth hover:shadow-card ${
              selectedFile === file?.id ? 'ring-2 ring-primary/20 border-primary/30' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center shrink-0">
                  <Icon name="FileSpreadsheet" size={20} className="text-muted-foreground" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-medium text-foreground truncate">
                      {file?.fileName}
                    </h4>
                    {getStatusIcon(file?.status)}
                    <span className={`text-xs font-medium ${
                      file?.status === 'completed' ? 'text-success' :
                      file?.status === 'error' ? 'text-error' : 'text-muted-foreground'
                    }`}>
                      {getStatusText(file?.status)}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <span>{formatDate(file?.uploadDate)}</span>
                    <span>•</span>
                    <span>{formatFileSize(file?.fileSize)}</span>
                    {file?.status === 'completed' && (
                      <>
                        <span>•</span>
                        <span>{file?.recordCount?.toLocaleString()} records</span>
                        <span>•</span>
                        <span>{file?.processingTime}s processing</span>
                      </>
                    )}
                  </div>

                  {file?.errors > 0 && (
                    <div className="flex items-center space-x-1 mt-2">
                      <Icon name="AlertTriangle" size={12} className="text-warning" />
                      <span className="text-xs text-warning">
                        {file?.errors} validation {file?.errors === 1 ? 'error' : 'errors'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 ml-4">
                {file?.status === 'completed' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    iconName="BarChart3"
                    onClick={() => handleDownloadReport(file?.id)}
                  >
                    View Report
                  </Button>
                )}
                
                {file?.status === 'error' && (
                  <Button
                    variant="outline"
                    size="sm"
                    iconName="RefreshCw"
                    onClick={() => handleReprocess(file?.id)}
                  >
                    Retry
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedFile(selectedFile === file?.id ? null : file?.id)}
                >
                  <Icon name={selectedFile === file?.id ? "ChevronUp" : "ChevronDown"} size={16} />
                </Button>
              </div>
            </div>

            {/* Expanded Details */}
            {selectedFile === file?.id && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <p className="text-muted-foreground mb-1">File Size</p>
                    <p className="font-medium text-foreground">{formatFileSize(file?.fileSize)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Records</p>
                    <p className="font-medium text-foreground">{file?.recordCount?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Processing Time</p>
                    <p className="font-medium text-foreground">{file?.processingTime}s</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Errors</p>
                    <p className={`font-medium ${file?.errors > 0 ? 'text-error' : 'text-success'}`}>
                      {file?.errors}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default UploadHistory;