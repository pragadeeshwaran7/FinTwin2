import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import NotFound from "pages/NotFound";
import MainDashboard from './pages/main-dashboard';
import TransactionDetails from './pages/transaction-details';
import LoginPage from './pages/login';
import AIChatInterface from './pages/ai-chat-interface';
import RegisterPage from './pages/register';
import FileUploadPage from './pages/file-upload';

const Routes = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
      <ScrollToTop />
      <RouterRoutes>
        {/* Define your route here */}
        <Route path="/" element={<AIChatInterface />} />
        <Route path="/main-dashboard" element={<MainDashboard />} />
        <Route path="/transaction-details" element={<TransactionDetails />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/ai-chat-interface" element={<AIChatInterface />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/file-upload" element={<FileUploadPage />} />
        <Route path="*" element={<NotFound />} />
      </RouterRoutes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;
