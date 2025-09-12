import React, { createContext, useContext, useState, useEffect } from 'react';
import FinTwinMCPClient from '../services/mcpClient.js';

const MCPContext = createContext();

export const useMCP = () => {
  const context = useContext(MCPContext);
  if (!context) {
    throw new Error('useMCP must be used within an MCPProvider');
  }
  return context;
};

export const MCPProvider = ({ children }) => {
  const [client, setClient] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeMCP = async () => {
      try {
        setLoading(true);
        const mcpClient = new FinTwinMCPClient();
        const connected = await mcpClient.connect();
        
        setClient(mcpClient);
        setIsConnected(connected);
        setError(connected ? null : 'Failed to connect to MCP server');
      } catch (err) {
        setError(err.message);
        setIsConnected(false);
      } finally {
        setLoading(false);
      }
    };

    initializeMCP();
  }, []);

  const value = {
    client,
    isConnected,
    loading,
    error,
    reconnect: async () => {
      if (client) {
        const connected = await client.connect();
        setIsConnected(connected);
        setError(connected ? null : 'Reconnection failed');
      }
    }
  };

  return (
    <MCPContext.Provider value={value}>
      {children}
    </MCPContext.Provider>
  );
};