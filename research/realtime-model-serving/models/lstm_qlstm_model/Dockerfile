# Use official lightweight Python image
FROM python:3.10-slim

# Set working directory inside container
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache -r requirements.txt

# Copy your app code and model weights
COPY serve.py lstm_qlstm_model.pth ./

# Run the FastAPI app with uvicorn on container start
CMD ["uvicorn", "serve:app", "--host", "0.0.0.0", "--port", "8000"]
