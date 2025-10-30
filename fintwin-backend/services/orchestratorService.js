import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

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

  // Format request body for Gemini chat API
  const body = {
    contents: [{
      parts: [{
        text: userMessage
      }]
    }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
      topP: 0.8,
      topK: 40
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      }
    ]
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
    
    // Extract the assistant's response from Gemini API result
    if (!resp.data.candidates || resp.data.candidates.length === 0) {
      throw new Error('No response generated');
    }

    const assistantMessage = resp.data.candidates[0].content?.parts?.[0]?.text;
    if (!assistantMessage) {
      throw new Error('Invalid response format');
    }

    // Return a clean response object
    return {
      message: assistantMessage,
      role: "assistant",
      success: true
    };

  } catch (err) {
    console.error('Gemini API error:', err.response?.data || err.message);
    
    // Return user-friendly error message
    const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to get response';
    throw new Error(`Chat error: ${errorMessage}`);
  }
};
