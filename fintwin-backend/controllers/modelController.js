import { executePythonModel } from "../services/modelService.js";

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
