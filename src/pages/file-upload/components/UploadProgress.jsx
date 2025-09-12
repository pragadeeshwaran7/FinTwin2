import React from 'react';
import Icon from '../../../components/AppIcon';

const UploadProgress = ({ 
  progress = 0, 
  fileName = '', 
  fileSize = 0, 
  estimatedTime = 0,
  status = 'uploading' // uploading, processing, completed, error
}) => {
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i))?.toFixed(2)) + ' ' + sizes?.[i];
  };

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
        return <Icon name="Upload" size={20} className="text-primary animate-pulse" />;
      case 'processing':
        return <Icon name="Loader2" size={20} className="text-primary animate-spin" />;
      case 'completed':
        return <Icon name="CheckCircle" size={20} className="text-success" />;
      case 'error':
        return <Icon name="AlertCircle" size={20} className="text-error" />;
      default:
        return <Icon name="Upload" size={20} className="text-primary" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return 'Uploading file...';
      case 'processing':
        return 'Processing CSV data...';
      case 'completed':
        return 'Upload completed successfully';
      case 'error':
        return 'Upload failed';
      default:
        return 'Preparing upload...';
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <p className="text-sm font-medium text-foreground">{fileName}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(fileSize)} • {getStatusText()}
            </p>
          </div>
        </div>
        {status === 'uploading' && estimatedTime > 0 && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">
              {formatTime(estimatedTime)} remaining
            </p>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Progress</span>
          <span className="text-foreground font-medium">{progress}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              status === 'error' ? 'bg-error' : 'bg-primary'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Additional Status Info */}
      {status === 'processing' && (
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <Icon name="Database" size={14} />
          <span>Parsing CSV rows and validating data format...</span>
        </div>
      )}

      {status === 'completed' && (
        <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
          <div className="flex items-center space-x-2 text-sm text-success">
            <Icon name="CheckCircle" size={16} />
            <span>File processed successfully</span>
          </div>
          <button className="text-xs text-success hover:text-success/80 underline">
            View Details
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center justify-between p-3 bg-error/10 rounded-lg">
          <div className="flex items-center space-x-2 text-sm text-error">
            <Icon name="AlertCircle" size={16} />
            <span>Processing failed - Invalid CSV format</span>
          </div>
          <button className="text-xs text-error hover:text-error/80 underline">
            Retry Upload
          </button>
        </div>
      )}
    </div>
  );
};

export default UploadProgress;