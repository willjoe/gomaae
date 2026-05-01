FROM ubuntu:22.04

# Install core dependencies (Git, Node.js for MCP, Curl)
RUN apt-get update && apt-get install -y git curl ca-certificates bash \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean

# Create the sandbox working directory
WORKDIR /workspace

# Copy the agent's role configuration (Injected at runtime by Orchestrator)
COPY role-vector/ /agent-config/

# Environment Variables (Set dynamically by orchestrator)
# ENV GIT_AUTHOR_NAME="AI-AGENT"
# ENV GIT_COMMITTER_NAME="AI-AGENT"

# The host's cloud CLI login credentials will be mounted here
# e.g., -v ~/.config/gcloud:/root/.config/gcloud

# Entrypoint: Run the AI Agent's main execution loop
CMD ["node", "/agent-config/agent-runner.js"]
