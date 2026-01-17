#!/bin/bash
set -e

# Install dependencies
npm install

# Load existing .env if present
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# Helper: prompt for optional variable
prompt_optional() {
  local var_name="$1"
  local prompt_text="$2"
  local default_value="$3"
  local current_value="${!var_name}"

  if [ -z "$current_value" ]; then
    read -p "$prompt_text (default: $default_value): " value
    if [ -z "$value" ]; then
      eval "$var_name=\"\$default_value\""
    else
      eval "$var_name=\"\$value\""
    fi
  fi
}

# Blink Bitcoin/Lightning
if [ -z "$BLINK_API_KEY" ]; then
  read -p "Blink API key (format: blink_xxx, get from dashboard.blink.sv): " BLINK_API_KEY
fi
if [ -n "$BLINK_API_KEY" ] && [ -z "$BLINK_ENDPOINT" ]; then
  prompt_optional "BLINK_ENDPOINT" "Blink API endpoint" "https://api.blink.sv/graphql"
fi

# MCP Server
prompt_optional "MCP_PORT" "MCP server HTTP port" "3000"
if [ -z "$MCP_API_KEY" ]; then
  read -p "MCP server API key (optional, press Enter to skip): " MCP_API_KEY
fi

# HTTPS (optional)
if [ -z "$MCP_DOMAIN" ]; then
  read -p "MCP server domain for HTTPS (optional, leave empty for HTTP-only): " MCP_DOMAIN
fi
if [ -n "$MCP_DOMAIN" ]; then
  if [ -z "$MCP_ACME_EMAIL" ]; then
    read -p "Email for Let's Encrypt notifications: " MCP_ACME_EMAIL
  fi
  prompt_optional "MCP_HTTPS_PORT" "HTTPS port" "443"
  prompt_optional "MCP_ACME_STAGING" "Use Let's Encrypt staging (true/false)" "false"

  # Create greenlock.d/config.json
  mkdir -p greenlock.d
  cat > greenlock.d/config.json << GREENLOCKEOF
{
  "sites": [
    {
      "subject": "$MCP_DOMAIN",
      "altnames": ["$MCP_DOMAIN"]
    }
  ]
}
GREENLOCKEOF
  echo "greenlock.d/config.json configured for $MCP_DOMAIN"
fi

# Write .env
cat > .env << EOF
# Blink Bitcoin/Lightning
BLINK_API_KEY="$BLINK_API_KEY"
BLINK_ENDPOINT="$BLINK_ENDPOINT"

# MCP Server
MCP_PORT="$MCP_PORT"
MCP_API_KEY="$MCP_API_KEY"
MCP_DOMAIN="$MCP_DOMAIN"
MCP_ACME_EMAIL="$MCP_ACME_EMAIL"
MCP_HTTPS_PORT="$MCP_HTTPS_PORT"
MCP_ACME_STAGING="$MCP_ACME_STAGING"
EOF

echo ".env configured"

echo ""
echo "Setup complete. Available commands:"
echo "  npm run dev    # Start MCP server (development)"
echo "  npm run start  # Start MCP server (production)"
echo "  npm run build  # Build TypeScript"
