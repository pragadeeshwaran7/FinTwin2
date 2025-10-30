import express from "express";
import { runModel, listModels } from "../controllers/modelController.js";
const router = express.Router();

// GET /api/models/list  -> returns model metadata and input templates
router.get("/list", listModels);

// POST /api/models/:modelName -> run a specific model
router.post("/:modelName", runModel);

export default router;
