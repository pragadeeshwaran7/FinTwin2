import express from "express";
import { runModel } from "../controllers/modelController.js";
const router = express.Router();

router.post("/:modelName", runModel);

export default router;
