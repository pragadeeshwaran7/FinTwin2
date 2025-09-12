#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';

const TransactionSchema = z.object({
  id: z.string(),
  date: z.string(),
  amount: z.number(),
  category: z.string(),
  description: z.string(),
  account: z.string(),
  type: z.enum(['income', 'expense', 'transfer'])
});

class FinTwinMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'fintwin-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupHandlers();
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'read_transactions',
          description: 'Read transactions from FinTwin data source',
          inputSchema: {
            type: 'object',
            properties: {
              dateFrom: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
              dateTo: { type: 'string', description: 'End date (YYYY-MM-DD)' },
              category: { type: 'string', description: 'Filter by category' },
              limit: { type: 'number', description: 'Maximum number of transactions' }
            }
          }
        },
        {
          name: 'analyze_spending',
          description: 'Analyze spending patterns for FinTwin dashboard',
          inputSchema: {
            type: 'object',
            properties: {
              period: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'yearly'] },
              category: { type: 'string', description: 'Category to analyze' }
            }
          }
        },
        {
          name: 'get_financial_insights',
          description: 'Get AI-powered financial insights for chat interface',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'User question about finances' },
              context: { type: 'string', description: 'Additional context' }
            }
          }
        },
        {
          name: 'generate_dashboard_data',
          description: 'Generate data for FinTwin main dashboard',
          inputSchema: {
            type: 'object',
            properties: {
              timeRange: { type: 'string', enum: ['week', 'month', 'quarter', 'year'] }
            }
          }
        }
      ]
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'read_transactions':
          return await this.readTransactions(args);
        case 'analyze_spending':
          return await this.analyzeSpending(args);
        case 'get_financial_insights':
          return await this.getFinancialInsights(args);
        case 'generate_dashboard_data':
          return await this.generateDashboardData(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async readTransactions(args) {
    try {
      const { dateFrom, dateTo, category, limit = 100 } = args;
      
      // Read from your data source (adapt this to your actual data source)
      const csvPath = path.resolve('src/data/transactions.csv');
      const csvContent = await fs.readFile(csvPath, 'utf-8');
      
      const lines = csvContent.trim().split('\n');
      const headers = lines[0].split(',');
      
      let transactions = lines.slice(1).map(line => {
        const values = line.split(',');
        const transaction = {};
        headers.forEach((header, index) => {
          transaction[header.trim()] = values[index]?.trim();
        });
        
        if (transaction.amount) {
          transaction.amount = parseFloat(transaction.amount);
        }
        
        return transaction;
      });

      // Apply filters
      if (dateFrom) {
        transactions = transactions.filter(t => t.date >= dateFrom);
      }
      if (dateTo) {
        transactions = transactions.filter(t => t.date <= dateTo);
      }
      if (category) {
        transactions = transactions.filter(t => 
          t.category?.toLowerCase().includes(category.toLowerCase())
        );
      }

      // Limit results
      transactions = transactions.slice(0, limit);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: transactions,
              total: transactions.length
            })
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message
            })
          }
        ]
      };
    }
  }

  async analyzeSpending(args) {
    try {
      const { period = 'monthly', category } = args;
      
      // Get transactions first
      const transactionResult = await this.readTransactions({});
      const resultText = transactionResult.content[0].text;
      const { data: transactions } = JSON.parse(resultText);

      // Analyze spending patterns
      const expenses = transactions.filter(t => t.type === 'expense' || t.amount < 0);
      const totalSpent = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      // Group by period
      const grouped = this.groupByPeriod(expenses, period);
      
      // Calculate insights
      const insights = {
        totalSpent,
        averageTransaction: totalSpent / expenses.length || 0,
        transactionCount: expenses.length,
        topCategories: this.getTopCategories(expenses),
        periodBreakdown: grouped,
        trend: this.calculateTrend(grouped)
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: insights
            })
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message
            })
          }
        ]
      };
    }
  }

  async getFinancialInsights(args) {
    try {
      const { query, context } = args;
      
      // Get recent transactions for context
      const transactionResult = await this.readTransactions({ limit: 50 });
      const { data: transactions } = JSON.parse(transactionResult.content[0].text);
      
      // Generate insights based on query (this would integrate with your AI chat)
      const insights = {
        query,
        summary: this.generateInsightSummary(transactions, query),
        recommendations: this.generateRecommendations(transactions),
        keyMetrics: this.calculateKeyMetrics(transactions)
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: insights
            })
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message
            })
          }
        ]
      };
    }
  }

  async generateDashboardData(args) {
    try {
      const { timeRange = 'month' } = args;
      
      // Get transactions for the specified time range
      const dateFrom = this.getDateFromRange(timeRange);
      const transactionResult = await this.readTransactions({ 
        dateFrom: dateFrom.toISOString().split('T')[0] 
      });
      const { data: transactions } = JSON.parse(transactionResult.content[0].text);
      
      // Generate dashboard data
      const dashboardData = {
        metrics: this.calculateDashboardMetrics(transactions),
        chartData: {
          spending: this.generateSpendingChartData(transactions),
          categories: this.generateCategoryChartData(transactions),
          trends: this.generateTrendChartData(transactions)
        },
        recentTransactions: transactions.slice(0, 10)
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: dashboardData
            })
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message
            })
          }
        ]
      };
    }
  }

  // Helper methods
  groupByPeriod(transactions, period) {
    const grouped = {};
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      let key;
      
      switch (period) {
        case 'daily':
          key = date.toISOString().split('T')[0];
          break;
        case 'weekly':
          const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'yearly':
          key = date.getFullYear().toString();
          break;
      }
      
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(transaction);
    });
    
    return grouped;
  }

  getTopCategories(transactions) {
    const categories = {};
    transactions.forEach(t => {
      const category = t.category || 'Unknown';
      if (!categories[category]) {
        categories[category] = { total: 0, count: 0 };
      }
      categories[category].total += Math.abs(t.amount);
      categories[category].count++;
    });
    
    return Object.entries(categories)
      .sort(([,a], [,b]) => b.total - a.total)
      .slice(0, 5)
      .map(([category, data]) => ({ category, ...data }));
  }

  calculateTrend(grouped) {
    const periods = Object.keys(grouped).sort();
    if (periods.length < 2) return 'insufficient_data';
    
    const latest = grouped[periods[periods.length - 1]].reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const previous = grouped[periods[periods.length - 2]].reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const change = ((latest - previous) / previous) * 100;
    
    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }

  generateInsightSummary(transactions, query) {
    // Simple insight generation (you can enhance this with AI)
    if (query.toLowerCase().includes('spending')) {
      const total = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
      return `Your total spending is $${total.toFixed(2)}`;
    }
    return 'Financial insight based on your data';
  }

  generateRecommendations(transactions) {
    // Generate simple recommendations
    const categories = this.getTopCategories(transactions.filter(t => t.amount < 0));
    return [
      `Consider reviewing your ${categories[0]?.category} spending`,
      'Set up automated savings for better financial health',
      'Track your daily expenses more closely'
    ];
  }

  calculateKeyMetrics(transactions) {
    const income = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    return {
      totalIncome: income,
      totalExpenses: expenses,
      netIncome: income - expenses,
      savingsRate: income > 0 ? ((income - expenses) / income * 100) : 0
    };
  }

  getDateFromRange(range) {
    const now = new Date();
    switch (range) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'quarter':
        return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      case 'year':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  calculateDashboardMetrics(transactions) {
    return this.calculateKeyMetrics(transactions);
  }

  generateSpendingChartData(transactions) {
    const expenses = transactions.filter(t => t.amount < 0);
    const daily = this.groupByPeriod(expenses, 'daily');
    
    return Object.entries(daily).map(([date, trans]) => ({
      date,
      amount: trans.reduce((sum, t) => sum + Math.abs(t.amount), 0)
    }));
  }

  generateCategoryChartData(transactions) {
    return this.getTopCategories(transactions.filter(t => t.amount < 0));
  }

  generateTrendChartData(transactions) {
    const monthly = this.groupByPeriod(transactions, 'monthly');
    
    return Object.entries(monthly).map(([month, trans]) => ({
      month,
      income: trans.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
      expenses: trans.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)
    }));
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('FinTwin MCP server running on stdio');
  }
}

// Start the server
const server = new FinTwinMCPServer();
server.start().catch(console.error);