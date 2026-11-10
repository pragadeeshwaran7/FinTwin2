# FinTwin: single container (Express API + built React frontend + Python ML)
FROM node:20-bookworm-slim AS web
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY ml/requirements.txt ml/requirements.txt
RUN pip3 install --no-cache-dir --break-system-packages -r ml/requirements.txt
COPY backend/package.json backend/package.json
RUN npm install --prefix backend --omit=dev --no-audit --no-fund
COPY backend/ backend/
COPY ml/ ml/
COPY --from=web /app/frontend/dist frontend/dist
ENV NODE_ENV=production PORT=10000 PYTHON_PATH=python3
EXPOSE 10000
CMD ["node", "backend/src/server.js"]
