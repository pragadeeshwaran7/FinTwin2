import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDB } from "./config/db.js";
import modelRoutes from "./routes/modelRoutes.js";
import dataRoutes from "./routes/dataRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import financeRoutes from "./routes/financeRoutes.js";
import orchestratorRoutes from "./routes/orchestratorRoutes.js";
import stocksRoutes from "./routes/stocksRoutes.js";
import { errorHandler } from "./utils/errorHandler.js";

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Routes
app.use("/api", stocksRoutes);
app.use("/api/models", modelRoutes);
app.use("/api/orchestrator", orchestratorRoutes);
app.use("/api/data", dataRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/finance", financeRoutes);

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`✅ FinTwin backend running on port ${PORT}`));