# syntax=docker/dockerfile:1
FROM node:22-alpine
WORKDIR /app
ENV CI=true
COPY package*.json ./
# If workspace, fall back to install ignoring scripts
RUN npm install || (npm cache verify && npm install)
COPY . .
EXPOSE 9000
ENV NEXT_TELEMETRY_DISABLED=1
# Next dev for dev usage; can switch to build/start for production
CMD ["npm", "run", "dev"]
