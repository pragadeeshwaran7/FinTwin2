FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache -r requirements.txt

COPY serve.py lstm_model.pth ./

CMD ["uvicorn", "serve:app", "--host", "0.0.0.0", "--port", "8000"]
