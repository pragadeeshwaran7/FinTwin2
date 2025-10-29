export const analyzePortfolio = async (portfolio) => {
  // Example: simple summary logic
  const totalInvested = portfolio.reduce((sum, p) => sum + p.invested, 0);
  const totalValue = portfolio.reduce((sum, p) => sum + p.currentValue, 0);
  const profit = totalValue - totalInvested;
  const profitPercent = ((profit / totalInvested) * 100).toFixed(2);

  return { totalInvested, totalValue, profit, profitPercent };
};
