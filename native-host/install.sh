#!/bin/bash

# Install script for the native messaging host
# Run this after loading the extension to get the extension ID

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOST_TEMPLATE="$SCRIPT_DIR/host.template.js"
HOST_PATH="$SCRIPT_DIR/host.js"
HOST_NAME="com.claude.tabs_organizer"

# Check template exists
if [ ! -f "$HOST_TEMPLATE" ]; then
    echo "Error: host.template.js not found"
    exit 1
fi

# Detect node path
NODE_PATH=$(which node 2>/dev/null)
if [ -z "$NODE_PATH" ]; then
    echo "Error: Node.js not found in PATH"
    echo "Please install Node.js or add it to your PATH"
    exit 1
fi

echo "Native Messaging Host Installer"
echo "================================"
echo ""
echo "Detected Node.js at: $NODE_PATH"

# Copy template to host.js and update shebang with detected node path
# This is required because Chrome's native messaging doesn't use shell PATH
cp "$HOST_TEMPLATE" "$HOST_PATH"
sed -i '' "1s|.*|#!$NODE_PATH|" "$HOST_PATH"
echo "Created host.js with shebang: $NODE_PATH"
echo ""

# Make host executable
chmod +x "$HOST_PATH"

# Get extension ID from user
read -p "Enter your Chrome extension ID (from chrome://extensions): " EXTENSION_ID

if [ -z "$EXTENSION_ID" ]; then
    echo "Error: Extension ID is required"
    exit 1
fi

# Create manifest
MANIFEST='{
  "name": "'"$HOST_NAME"'",
  "description": "Tab Organizer native messaging host for Claude Code",
  "path": "'"$HOST_PATH"'",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://'"$EXTENSION_ID"'/"
  ]
}'

# Determine manifest location based on browser
echo ""
echo "Select your browser:"
echo "1) Google Chrome"
echo "2) Chromium"
echo "3) Brave"
echo "4) Arc"
echo "5) Microsoft Edge"
read -p "Choice [1-5]: " BROWSER_CHOICE

case $BROWSER_CHOICE in
    1)
        MANIFEST_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
        ;;
    2)
        MANIFEST_DIR="$HOME/Library/Application Support/Chromium/NativeMessagingHosts"
        ;;
    3)
        MANIFEST_DIR="$HOME/Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts"
        ;;
    4)
        MANIFEST_DIR="$HOME/Library/Application Support/Arc/User Data/NativeMessagingHosts"
        ;;
    5)
        MANIFEST_DIR="$HOME/Library/Application Support/Microsoft Edge/NativeMessagingHosts"
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

# Create directory if needed
mkdir -p "$MANIFEST_DIR"

# Write manifest
MANIFEST_FILE="$MANIFEST_DIR/$HOST_NAME.json"
echo "$MANIFEST" > "$MANIFEST_FILE"

echo ""
echo "Success! Native messaging host installed."
echo "Manifest written to: $MANIFEST_FILE"
echo ""
echo "You may need to restart your browser for changes to take effect."
