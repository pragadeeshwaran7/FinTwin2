import React, { useState, useRef } from 'react';
import Icon from '../AppIcon';
import Button from './Button';

const FileUploadZone = ({ 
  onFileUpload, 
  acceptedTypes = '.csv,.xlsx,.xls',
  maxSize = 10 * 1024 * 1024, // 10MB
  className = '' 
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e?.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e?.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e?.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e?.dataTransfer?.files);
    handleFiles(files);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e?.target?.files);
    handleFiles(files);
  };

  const validateFile = (file) => {
    const validTypes = acceptedTypes?.split(',')?.map(type => type?.trim());
    const fileExtension = '.' + file?.name?.split('.')?.pop()?.toLowerCase();
    
    if (!validTypes?.includes(fileExtension)) {
      return `File type ${fileExtension} is not supported. Please upload ${acceptedTypes} files.`;
    }
    
    if (file?.size > maxSize) {
      return `File size exceeds ${Math.round(maxSize / (1024 * 1024))}MB limit.`;
    }
    
    return null;
  };

  const handleFiles = async (files) => {
    setError('');
    
    for (const file of files) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      for (const file of files) {
        // Simulate upload progress
        for (let progress = 0; progress <= 100; progress += 10) {
          setUploadProgress(progress);
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const processedFile = {
          id: Date.now() + Math.random(),
          name: file?.name,
          size: file?.size,
          type: file?.type,
          uploadedAt: new Date(),
          status: 'completed',
          records: Math.floor(Math.random() * 1000) + 100 // Simulated record count
        };

        setUploadedFiles(prev => [...prev, processedFile]);
        
        if (onFileUpload) {
          onFileUpload(processedFile);
        }
      }
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev?.filter(file => file?.id !== fileId));
  };

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
      hour: '2-digit',
      minute: '2-digit'
    })?.format(date);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-smooth ${
          isDragOver
            ? 'border-primary bg-primary/5' :'border-border hover:border-primary/50 hover:bg-muted/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes}
          onChange={handleFileSelect}
          className="hidden"
        />

        {isUploading ? (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Icon name="Upload" size={32} className="text-primary animate-pulse" />
            </div>
            <div>
              <p className="text-lg font-medium text-foreground">Uploading...</p>
              <div className="w-full max-w-xs mx-auto mt-2 bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-1">{uploadProgress}% complete</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
              <Icon name="FileSpreadsheet" size={32} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-medium text-foreground">
                Drop your files here, or{' '}
                <button
                  onClick={() => fileInputRef?.current?.click()}
                  className="text-primary hover:text-primary/80 underline"
                >
                  browse
                </button>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Supports {acceptedTypes} files up to {Math.round(maxSize / (1024 * 1024))}MB
              </p>
            </div>
            <Button
              onClick={() => fileInputRef?.current?.click()}
              variant="outline"
              iconName="Upload"
              iconPosition="left"
            >
              Choose Files
            </Button>
          </div>
        )}
      </div>
      {/* Error Message */}
      {error && (
        <div className="flex items-center space-x-2 p-3 bg-error/10 border border-error/20 rounded-lg">
          <Icon name="AlertCircle" size={16} className="text-error" />
          <p className="text-sm text-error">{error}</p>
        </div>
      )}
      {/* Uploaded Files */}
      {uploadedFiles?.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Uploaded Files</h3>
          <div className="space-y-2">
            {uploadedFiles?.map((file) => (
              <div
                key={file?.id}
                className="flex items-center justify-between p-3 bg-card border border-border rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                    <Icon name="FileCheck" size={20} className="text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{file?.name}</p>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(file?.size)}</span>
                      <span>•</span>
                      <span>{file?.records} records</span>
                      <span>•</span>
                      <span>{formatDate(file?.uploadedAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1 text-xs text-success">
                    <Icon name="CheckCircle" size={14} />
                    <span>Processed</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(file?.id)}
                    className="text-muted-foreground hover:text-error"
                  >
                    <Icon name="X" size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Upload Guidelines */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-2">File Requirements</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li className="flex items-center space-x-2">
            <Icon name="Check" size={12} className="text-success" />
            <span>CSV or Excel files with transaction data</span>
          </li>
          <li className="flex items-center space-x-2">
            <Icon name="Check" size={12} className="text-success" />
            <span>Include columns: Date, Description, Amount, Category</span>
          </li>
          <li className="flex items-center space-x-2">
            <Icon name="Check" size={12} className="text-success" />
            <span>Maximum file size: {Math.round(maxSize / (1024 * 1024))}MB</span>
          </li>
          <li className="flex items-center space-x-2">
            <Icon name="Check" size={12} className="text-success" />
            <span>Data will be encrypted and processed securely</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default FileUploadZone;