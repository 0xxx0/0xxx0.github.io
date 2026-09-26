#!/usr/bin/env bash
# Setup Suno and Ideogram API keys for the kestrel profile

set -euo pipefail

echo "=== Suno API Key Setup ==="
echo "1. Log in to Suno (https://suno.com) → Account → API Keys."
echo "2. Create a new key, copy the token."
echo "3. Add the following line to ~/.hermes/profiles/kestrel/.env (use a safe editor):"
echo "   SUNO_API_KEY=your_copied_token_here"
echo ""
echo "=== Ideogram API Key Setup ==="
echo "1. Log in to Ideogram (https://ideogram.ai) → Account → API Keys."
echo "2. Create a new key, copy the token."
echo "3. Add to .env:"
echo "   IDEOGRAM_API_KEY=your_copied_token_here"
echo ""
echo "After updating .env, restart any background processes that depend on these keys."
echo ""
echo "---"
echo "Note: This script only provides guidance. The .env file must be edited manually for security."
echo "---"

exit 0