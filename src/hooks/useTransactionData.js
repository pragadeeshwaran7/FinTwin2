import { useState, useEffect, useCallback } from 'react';
import { useMCPContext } from './useMCPContext.js';

export const useTransactionData = (initialFilters = {}) => {
  const { executeQuery } = useMCPContext();
  const [transactions, setTransactions] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadTransactions = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const result = await executeQuery('read_transactions', { ...initialFilters, ...filters });
      if (result.success) {
        setTransactions(result.data);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [executeQuery, initialFilters]);

  const loadAnalysis = useCallback(async (period = 'monthly') => {
    setLoading(true);
    try {
      const result = await executeQuery('analyze_spending', { period });
      if (result.success) {
        setAnalysis(result.data);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [executeQuery]);

  const loadDashboardData = useCallback(async (timeRange = 'month') => {
    setLoading(true);
    try {
      const result = await executeQuery('generate_dashboard_data', { timeRange });
      if (result.success) {
        setDashboardData(result.data);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [executeQuery]);

  const getFinancialInsights = useCallback(async (query, context = '') => {
    try {
      const result = await executeQuery('get_financial_insights', { query, context });
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [executeQuery]);

  // Load initial data
  useEffect(() => {
    loadTransactions();
    loadDashboardData();
  }, [loadTransactions, loadDashboardData]);

  return {
    transactions,
    analysis,
    dashboardData,
    loading,
    error,
    loadTransactions,
    loadAnalysis,
    loadDashboardData,
    getFinancialInsights
  };
};