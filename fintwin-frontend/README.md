# FinTwin Frontend (Vite + React)

1. Install
   npm install

2. Run
   npm run dev

3. Default assumes backend at http://localhost:5000
   - Model call: POST /api/models/:modelName
   - Stock data: GET /api/data/stock/:symbol
   - Orchestrator: POST /api/orchestrator/query (optional)

If your backend runs on another host, create a .env file with:
VITE_API_BASE=http://your-backend-host:5000

How to run the frontend

Save all files above into the fintwin-frontend folder structure.

Install dependencies:

cd fintwin-frontend
npm install


Start dev server:

npm run dev


Open http://localhost:5173 in your browser.

Where to update when you swap in real models

Payload shapes: each ModelCard sends JSON payload you edit in the textarea. Match that to your model's expected input.

API base URL: change VITE_API_BASE or update src/services/api.js BASE constant.

Orchestrator: Chatbot.jsx calls /api/orchestrator/query. If you implement orchestrator server route, that will work. Otherwise remove or point it to your orchestrator endpoint.

Model names: MODEL_NAMES in Dashboard.jsx must match the route names your backend exposes (e.g., model1,transaction_analyzer, etc.). If your backend uses names like transaction-analyze, update them here.
