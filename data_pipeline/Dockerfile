FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache -r requirements.txt

COPY fetch_alpha.py .

CMD ["python", "fetch_alpha.py"]
