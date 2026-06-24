# High-Integrity Agent Worker Base Image
FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the agent runner script
COPY agent-runner.js /usr/local/bin/agent-runner.js

# Setup environment
ENV NODE_ENV=production

# Entrypoint runs the agent script
CMD ["node", "/usr/local/bin/agent-runner.js"]
