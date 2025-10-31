import axios from 'axios';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const stocksList = JSON.parse(readFileSync(join(__dirname, '..', 'stocks.json'), 'utf-8'));

dotenv.config();

// Function to find stock ticker from user message
function findStockTicker(message) {
  const lowercaseMsg = message.toLowerCase();
  
  // Map of common company names/variations to their tickers
  const stockMap = {
    'reliance': 'RELIANCE.NS',
    'ril': 'RELIANCE.NS',
    'hdfc': 'HDFCBANK.NS',
    'icici': 'ICICIBANK.NS',
    'infy': 'INFY.NS',
    'infosys': 'INFY.NS',
    'tcs': 'TCS.NS',
    'hindustan': 'HINDUNILVR.NS',
    'hindustan unilever': 'HINDUNILVR.NS',
    'hul': 'HINDUNILVR.NS',
    'airtel': 'BHARTIARTL.NS',
    'bharti': 'BHARTIARTL.NS',
    'itc': 'ITC.NS',
    'larsen': 'LT.NS',
    'l&t': 'LT.NS',
    'axis': 'AXISBANK.NS',
    'kotak': 'KOTAKBANK.NS',
    'maruti': 'MARUTI.NS',
    'mahindra': 'M&M.NS',
    'm&m': 'M&M.NS',
    'hcl': 'HCLTECH.NS',
    'sun': 'SUNPHARMA.NS',
    'sun pharma': 'SUNPHARMA.NS'
  };

  // Check for exact ticker matches first
  const exactTicker = stocksList.find(ticker => 
    lowercaseMsg.includes(ticker.toLowerCase().replace('.ns', ''))
  );
  if (exactTicker) return exactTicker;

  // Check for company name matches
  for (const [name, ticker] of Object.entries(stockMap)) {
    if (lowercaseMsg.includes(name)) {
      return ticker;
    }
  }

  return null;
}

// Function to get news for a stock
async function getStockNews(ticker) {
  try {
    const companyName = ticker.replace('.NS', '');
    const today = new Date();
    const threeDaysAgo = new Date(today.setDate(today.getDate() - 3));
    
    // Use a news API to get recent news - using Google News RSS feed as an example
    const newsUrl = `https://news.google.com/rss/search?q=${companyName}+stock+when:3d&hl=en-IN&gl=IN&ceid=IN:en`;
    const response = await axios.get(newsUrl);
    
    // Parse the XML response
    const newsItems = response.data.match(/<title>(?!Google News)([^<]+)<\/title>/g) || [];
    const headlines = newsItems.slice(0, 3).map(item => 
      item.replace(/<\/?title>/g, '').trim()
    );
    
    return headlines;
  } catch (err) {
    console.error('Error fetching news:', err.message);
    return ['No recent news available'];
  }
}

// Function to get real-time stock data including news
async function getStockData(ticker) {
  try {
    // Get current price
    const priceResponse = await axios.get(`http://localhost:5001/api/finance/price/${ticker}`);
    const price = priceResponse.data.price;
    
    // Get historical data
    const historyResponse = await axios.get(`http://localhost:5001/api/finance/historical-data/${ticker}`);
    const history = historyResponse.data;
    
    // Get news
    const news = await getStockNews(ticker);
    
    return {
      currentPrice: price,
      historicalData: history,
      recentNews: news
    };
  } catch (err) {
    console.error('Error fetching stock data:', err.message);
    return null;
  }
}

/**
 * Call the Gemini API for chat interactions. Formats requests according to Gemini's
 * API spec and returns user-friendly responses.
 */
export const callExternalLLM = async (input) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = process.env.GEMINI_URL;

  if (!apiKey || !url) {
    throw new Error('GEMINI_API_KEY and GEMINI_URL must be set in environment to use the orchestrator');
  }

  // Extract user's message, defaulting to 'Hello' if none provided
  const userMessage = input?.payload?.query || input?.query || 'Hello';
  
  // Try to identify which stock the user is asking about
  const stockTicker = findStockTicker(userMessage);
  
  // Fetch real-time data if we identified a stock
  let stockData = null;
  if (stockTicker) {
    stockData = await getStockData(stockTicker);
  }

  // Create a system prompt that guides the model to give crisp, focused responses
  let systemPrompt = `You are a financial assistant. When asked about stocks:
- Always include current price and percentage change
- ALWAYS mention 1-2 recent news headlines that impact the stock
- Keep responses under 4 bullet points
- Be direct and specific about price movements and news impact
- Format as: Price update, Key news impact, Market sentiment
Do not include pleasantries or elaborate explanations.

Available stocks for real-time data: ${stocksList.join(', ')}`;

  // If we have real stock data, include it in the prompt
  if (stockData) {
    const companyName = stockTicker.replace('.NS', '');
    systemPrompt += `\n\nCurrent real-time data for ${companyName}:
- Current Price: ₹${stockData.currentPrice}
- Historical context: ${stockData.historicalData}
- Recent News Headlines:
  ${stockData.recentNews.map(news => `* ${news}`).join('\n  ')}

Please use this real-time data and news in your response. Mention both price and relevant news.`;
  }

  // Format request body for Gemini 2.5 Flash API
  const body = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: systemPrompt + "\n\nUser query: " + userMessage
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.3, // Lower temperature for more focused responses
      topP: 0.8,
      maxOutputTokens: 150 // Limit response length
    }
  };

  const headers = {
    'Content-Type': 'application/json',
    'x-goog-api-key': apiKey
  };

  try {
    // Debug log the request
    console.log('Sending request to Gemini API:');
    console.log('URL:', url);
    console.log('Headers:', headers);
    console.log('Body:', JSON.stringify(body, null, 2));

    const resp = await axios.post(url, body, { headers, timeout: 20000 });
    
    // Debug log the response
    console.log('Gemini API Response:', JSON.stringify(resp.data, null, 2));
    
    // Log the full response for debugging
    console.log('Full Gemini API Response:', JSON.stringify(resp.data, null, 2));

    // For streamed responses, the data is an array of chunks
    if (Array.isArray(resp.data)) {
      let fullMessage = '';
      
      // Combine all text chunks from the stream
      for (const chunk of resp.data) {
        if (chunk.candidates?.[0]?.content?.parts?.[0]?.text) {
          fullMessage += chunk.candidates[0].content.parts[0].text;
        }
      }
      
      if (fullMessage) {
        return {
          message: fullMessage,
          role: "assistant",
          success: true
        };
      }
    }

    throw new Error('Could not extract response from Gemini API result: ' + JSON.stringify(resp.data));

  } catch (err) {
    console.error('Gemini API error:', err.response?.data || err.message);
    
    // Return user-friendly error message
    const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to get response';
    throw new Error(`Chat error: ${errorMessage}`);
  }
};
