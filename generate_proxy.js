const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'network-proxy');

if (!fs.existsSync(baseDir)) {
  fs.mkdirSync(baseDir, { recursive: true });
}

// --- Egress Allowlist ---
const allowlist = `# High-Integrity AI Egress Allowlist
# Only domains listed here can be accessed by the AI Sandboxes.
# All other outbound traffic (HTTP/HTTPS) is explicitly dropped to prevent data exfiltration.

# --- Version Control & Ticketing ---
.github.com
api.github.com
.gitlab.com
api.linear.app
.atlassian.net

# --- LLM API Endpoints ---
api.anthropic.com
generativelanguage.googleapis.com
api.openai.com

# --- Package Managers & Registries ---
registry.npmjs.org
pypi.org
files.pythonhosted.org
proxy.golang.org
pkg.go.dev
hub.docker.com

# --- Official Documentation (Read-Only Context) ---
docs.python.org
developer.mozilla.org
react.dev
nextjs.org
kubernetes.io/docs
cloud.google.com/docs
aws.amazon.com/docs
`;

// --- Squid Proxy Configuration ---
const squidConfig = `# High-Integrity AI Sandbox Proxy Configuration
# This proxy intercepts all traffic from the Docker bridge network.

# Define the local network where AI sandboxes run
acl sandbox_network src 172.17.0.0/16
acl sandbox_network src 172.18.0.0/16

# Define allowed ports
acl SSL_ports port 443
acl Safe_ports port 80
acl Safe_ports port 443

# Deny requests to unknown ports
http_access deny !Safe_ports
http_access deny CONNECT !SSL_ports

# --- The High-Integrity Egress Gate ---

# 1. Load the explicit allowlist of domains
acl allowed_domains dstdomain "/etc/squid/ai-egress-allowlist.txt"

# 2. Block file uploads / POST requests to anything EXCEPT the ticketing/git APIs and LLMs
acl allowed_post_domains dstdomain api.github.com .gitlab.com api.linear.app .atlassian.net api.anthropic.com generativelanguage.googleapis.com api.openai.com
acl is_post method POST PUT PATCH

# Deny POST/PUT to any domain not in the allowed_post_domains list (Prevents Exfiltration)
http_access deny is_post !allowed_post_domains

# 3. Allow GET requests ONLY to the allowed_domains list
http_access allow sandbox_network allowed_domains

# 4. Default Deny All (The High-Integrity Core Rule)
http_access deny all

# Logging for Audit Trail (Crucial for monitoring AI behavior)
access_log daemon:/var/log/squid/access.log squid

# Port to listen on (Transparent interception mode)
http_port 3128 intercept
https_port 3129 intercept ssl-bump generate-host-certificates=on dynamic_cert_mem_cache_size=4MB cert=/etc/squid/ssl_cert/myca.pem
`;

// --- Docker-Compose for the Proxy ---
const dockerCompose = `version: '3.8'

services:
  egress-proxy:
    image: ubuntu/squid:latest
    container_name: high-integrity-egress-proxy
    ports:
      - "3128:3128"
      - "3129:3129"
    volumes:
      - ./squid.conf:/etc/squid/squid.conf:ro
      - ./ai-egress-allowlist.txt:/etc/squid/ai-egress-allowlist.txt:ro
      - proxy-logs:/var/log/squid
    networks:
      - sandbox-net
    restart: always

networks:
  sandbox-net:
    driver: bridge
    # AI Sandbox containers MUST be attached to this network to route through the proxy
    ipam:
      config:
        - subnet: 172.18.0.0/16

volumes:
  proxy-logs:
`;

fs.writeFileSync(path.join(baseDir, 'ai-egress-allowlist.txt'), allowlist);
fs.writeFileSync(path.join(baseDir, 'squid.conf'), squidConfig);
fs.writeFileSync(path.join(baseDir, 'docker-compose.yml'), dockerCompose);

console.log("Network Proxy rules and High-Integrity Egress configuration generated successfully.");
