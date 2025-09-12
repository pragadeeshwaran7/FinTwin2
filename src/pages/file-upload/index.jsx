import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SidebarNavigation from '../../components/ui/SidebarNavigation';
import ChatPanel from '../../components/ui/ChatPanel';
import FileUploadZone from '../../components/ui/FileUploadZone';
import UploadProgress from './components/UploadProgress';
import FilePreview from './components/FilePreview';
import UploadGuidance from './components/UploadGuidance';
import UploadHistory from './components/UploadHistory';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

const FileUploadPage = () => {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [uploadState, setUploadState] = useState('idle'); // idle, uploading, processing, preview, completed
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [activeTab, setActiveTab] = useState('upload'); // upload, history, guidance

  // Mock CSV data for preview
  const mockPreviewData = [
    { date: '01/15/2025', description: 'Amazon Purchase - Electronics', category: 'Shopping', amount: '-299.99' },
    { date: '01/14/2025', description: 'Salary Deposit - Tech Corp', category: 'Income', amount: '4500.00' },
    { date: '01/13/2025', description: 'Starbucks Coffee', category: 'Food & Dining', amount: '-5.75' },
    { date: '01/12/2025', description: 'Electric Bill Payment', category: 'Utilities', amount: '-145.20' },
    { date: '01/11/2025', description: 'Gas Station Fill-up', category: 'Transportation', amount: '-52.30' },
    { date: '01/10/2025', description: 'Grocery Store - Whole Foods', category: 'Food & Dining', amount: '-127.85' },
    { date: '01/09/2025', description: 'Netflix Subscription', category: 'Entertainment', amount: '-15.99' },
    { date: '01/08/2025', description: 'ATM Withdrawal', category: 'Cash & ATM', amount: '-100.00' }
  ];

  const handleFileUpload = async (file) => {
    setCurrentFile({
      name: file?.name,
      size: file?.size,
      uploadedAt: new Date()
    });
    
    setUploadState('uploading');
    setUploadProgress(0);

    // Simulate upload progress
    for (let progress = 0; progress <= 100; progress += 10) {
      setUploadProgress(progress);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Switch to processing
    setUploadState('processing');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Show preview
    setPreviewData(mockPreviewData);
    setUploadState('preview');
  };

  const handleConfirmImport = async () => {
    setUploadState('processing');
    setUploadProgress(0);

    // Simulate final processing
    for (let progress = 0; progress <= 100; progress += 20) {
      setUploadProgress(progress);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setUploadState('completed');
    
    // Auto-redirect to dashboard after success
    setTimeout(() => {
      navigate('/main-dashboard');
    }, 2000);
  };

  const handleCancelPreview = () => {
    setUploadState('idle');
    setCurrentFile(null);
    setPreviewData([]);
    setUploadProgress(0);
  };

  const resetUpload = () => {
    setUploadState('idle');
    setCurrentFile(null);
    setPreviewData([]);
    setUploadProgress(0);
  };

  const tabs = [
    { id: 'upload', label: 'Upload Files', icon: 'Upload' },
    { id: 'history', label: 'Upload History', icon: 'History' },
    { id: 'guidance', label: 'Format Guide', icon: 'HelpCircle' }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar Navigation */}
      <SidebarNavigation 
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      {/* Main Content */}
      <div className={`transition-smooth ${sidebarCollapsed ? 'ml-16' : 'ml-60'} md:mr-80`}>
        <div className="p-6 pb-20 md:pb-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-foreground">File Upload</h1>
                <p className="text-muted-foreground mt-1">
                  Import your transaction data to start analyzing your finances
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  iconName="BarChart3"
                  iconPosition="left"
                  onClick={() => navigate('/main-dashboard')}
                >
                  View Dashboard
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setChatOpen(!chatOpen)}
                  className="md:hidden"
                >
                  <Icon name="MessageSquare" size={20} />
                </Button>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6">
            <div className="border-b border-border">
              <nav className="flex space-x-8">
                {tabs?.map((tab) => (
                  <button
                    key={tab?.id}
                    onClick={() => setActiveTab(tab?.id)}
                    className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm transition-smooth ${
                      activeTab === tab?.id
                        ? 'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                    }`}
                  >
                    <Icon name={tab?.icon} size={16} />
                    <span>{tab?.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'upload' && (
            <div className="space-y-8">
              {/* Upload States */}
              {uploadState === 'idle' && (
                <FileUploadZone
                  onFileUpload={handleFileUpload}
                  acceptedTypes=".csv,.xlsx,.xls"
                  maxSize={10 * 1024 * 1024}
                />
              )}

              {(uploadState === 'uploading' || uploadState === 'processing') && (
                <div className="space-y-6">
                  <UploadProgress
                    progress={uploadProgress}
                    fileName={currentFile?.name}
                    fileSize={currentFile?.size}
                    estimatedTime={uploadState === 'uploading' ? 15 : 8}
                    status={uploadState}
                  />
                  <div className="text-center">
                    <Button variant="outline" onClick={resetUpload}>
                      Cancel Upload
                    </Button>
                  </div>
                </div>
              )}

              {uploadState === 'preview' && (
                <FilePreview
                  fileName={currentFile?.name}
                  sampleData={previewData}
                  totalRows={previewData?.length}
                  onConfirmImport={handleConfirmImport}
                  onCancel={handleCancelPreview}
                  validationErrors={[]}
                />
              )}

              {uploadState === 'completed' && (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto bg-success/10 rounded-full flex items-center justify-center mb-6">
                    <Icon name="CheckCircle" size={40} className="text-success" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    Upload Completed Successfully!
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Your transaction data has been processed and is ready for analysis.
                  </p>
                  <div className="flex items-center justify-center space-x-4">
                    <Button
                      iconName="BarChart3"
                      iconPosition="left"
                      onClick={() => navigate('/main-dashboard')}
                    >
                      View Dashboard
                    </Button>
                    <Button variant="outline" onClick={resetUpload}>
                      Upload More Files
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <UploadHistory />
          )}

          {activeTab === 'guidance' && (
            <UploadGuidance />
          )}
        </div>
      </div>
      {/* Chat Panel */}
      <div className="hidden md:block fixed right-0 top-0 w-80 h-full border-l border-border bg-background">
        <ChatPanel isOpen={true} onToggle={() => {}} className="h-full" />
      </div>
      {/* Mobile Chat */}
      <ChatPanel
        isOpen={chatOpen}
        onToggle={() => setChatOpen(!chatOpen)}
        className="md:hidden"
      />
    </div>
  );
};

export default FileUploadPage;