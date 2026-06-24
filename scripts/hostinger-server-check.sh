#!/bin/bash
# Run this on Hostinger SSH to find web root and runtime support.
set -e
echo "=== Account ==="
whoami
echo "Home: $HOME"
echo ""
echo "=== Web roots (public_html) ==="
find "$HOME" -maxdepth 5 -type d -name public_html 2>/dev/null || true
echo ""
echo "=== Runtimes ==="
command -v dotnet >/dev/null && dotnet --version || echo "dotnet: not available"
command -v node >/dev/null && node --version || echo "node: not available"
command -v php >/dev/null && php -v | head -1 || echo "php: not available"
echo ""
echo "=== Disk ==="
df -h "$HOME" 2>/dev/null | tail -1
