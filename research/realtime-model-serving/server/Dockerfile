FROM python:3.10-slim

WORKDIR /app

COPY server/requirements.txt .
RUN pip install --no-cache -r requirements.txt

COPY preprocessing /app/preprocessing
COPY server/ .

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
