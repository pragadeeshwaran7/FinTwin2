import { spawn } from "child_process";
import dotenv from "dotenv";

dotenv.config();

export const executePythonModel = (modelName, inputData) => {
  return new Promise((resolve, reject) => {
    const pythonExec = process.env.PYTHON_PATH || "python3";
    const python = spawn(pythonExec, [`./models/${modelName}_predict.py`]);

    let output = "";
    let errorOutput = "";

    python.stdin.write(JSON.stringify(inputData));
    python.stdin.end();

    python.stdout.on("data", (data) => (output += data.toString()));
    python.stderr.on("data", (data) => (errorOutput += data.toString()));

    python.on("close", (code) => {
      // If python script printed JSON to stdout, try parsing it even if code !== 0 so we return helpful messages
      if (output) {
        try {
          const parsed = JSON.parse(output);
          resolve(parsed);
          return;
        } catch (e) {
          // fallthrough
        }
      }

      if (code !== 0) reject(new Error(errorOutput || `Python exited with code ${code}`));
      else {
        try {
          resolve(JSON.parse(output));
        } catch (err) {
          reject(new Error("Invalid JSON output: " + output));
        }
      }
    });
  });
};
