import { spawn } from "child_process";
import dotenv from "dotenv";

dotenv.config();

export const executePythonModel = (modelName, inputData) => {
  return new Promise((resolve, reject) => {
    const python = spawn(process.env.PYTHON_PATH, [`./models/${modelName}_predict.py`]);

    let output = "";
    let errorOutput = "";

    python.stdin.write(JSON.stringify(inputData));
    python.stdin.end();

    python.stdout.on("data", (data) => (output += data.toString()));
    python.stderr.on("data", (data) => (errorOutput += data.toString()));

    python.on("close", (code) => {
      if (code !== 0) reject(new Error(errorOutput));
      else {
        try {
          resolve(JSON.parse(output));
        } catch {
          reject(new Error("Invalid JSON output: " + output));
        }
      }
    });
  });
};
