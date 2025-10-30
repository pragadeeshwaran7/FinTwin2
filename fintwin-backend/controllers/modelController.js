import { executePythonModel } from "../services/modelService.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const runModel = async (req, res, next) => {
  const { modelName } = req.params;
  const inputData = req.body;

  try {
    const result = await executePythonModel(modelName, inputData);
    res.json({ success: true, model: modelName, result });
  } catch (err) {
    next(err);
  }
};

export const listModels = async (req, res, next) => {
  try {
    const cfg = path.join(__dirname, "..", "config", "models.json");
    const raw = await fs.promises.readFile(cfg, "utf8");
    const json = JSON.parse(raw);
    res.json({ success: true, models: json });
  } catch (err) {
    next(err);
  }
};
