import sys, json
import numpy as np
# from joblib import load
# model = load("model1.joblib")

def main():
    data = json.loads(sys.stdin.read())
    feature = np.array(data.get("feature", [0]))
    prediction = float(np.mean(feature))  # Dummy output
    print(json.dumps({"prediction": prediction, "status": "success"}))

if __name__ == "__main__":
    main()
