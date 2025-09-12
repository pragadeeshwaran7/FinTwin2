import { useState, useCallback } from 'react';
import { useMCP } from '../context/MCPProvider.jsx';

export const useMCPContext = () => {
  const { client, isConnected } = useMCP();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const executeQuery = useCallback(async (toolName, args = {}) => {
    if (!client || !isConnected) {
      throw new Error('MCP client not available');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await client.executeTool(toolName, args);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [client, isConnected]);

  return {
    executeQuery,
    loading,
    error,
    isConnected
  };
};