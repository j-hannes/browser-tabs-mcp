# Browser Tabs MCP

An MCP server + Chrome extension that lets Claude Code organize your browser tabs.

## Features

### Analysis Tools
- **list_tabs** - List all open tabs with filtering by domain or search
- **group_tabs_by_domain** - See which domains have the most tabs
- **find_duplicate_tabs** - Find tabs with duplicate URLs
- **find_old_tabs** - Find tabs you haven't looked at in a while
- **suggest_tab_organization** - Get AI suggestions for organizing tabs
- **get_tab_stats** - Quick overview of your tab situation
- **find_tabs_by_category** - Categorize tabs (dev, social, work, etc.)
- **suggest_focus_tabs** - Get suggestions on what to focus on

### Action Tools
- **close_tabs** - Close tabs matching a domain or URL pattern
- **close_duplicate_tabs** - Close all duplicate tabs, keeping one of each
- **create_tab_group** - Create a tab group from tabs matching a domain
- **focus_tab** - Switch to a specific tab by search
- **auto_organize_tabs** - Automatically group all tabs by category (GitHub, Jira, Confluence, Docs, Local Dev, AI Tools, Articles, Metrics, Meetings, Support, Social, Shopping, Entertainment, Search)
- **ungroup_all_tabs** - Remove all tabs from groups (keeps tabs open)
- **shuffle_tabs** - Randomly reorder all tabs

## Setup

### Step 1: Load the Chrome Extension

1. Open Chrome/Brave/Arc and go to `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `extension` folder from this project
5. **Copy the extension ID** shown under the extension name (you'll need this)

### Step 2: Install Native Messaging Host

```bash
cd native-host
./install.sh
```

The script will ask for:
- Your extension ID (from Step 1)
- Your browser choice

### Step 3: Add MCP Server to Claude Code

Add to your `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "browser-tabs": {
      "command": "node",
      "args": ["<path-to-repo>/mcp-server/index.js"]
    }
  }
}
```

Replace `<path-to-repo>` with the absolute path where you cloned this repository.

For example:
- macOS/Linux: `/home/username/browser-tabs-mcp/mcp-server/index.js`
- Windows: `C:\\Users\\username\\browser-tabs-mcp\\mcp-server\\index.js`

Or add to your project's `.claude/settings.json` for project-specific setup.

### Step 4: Restart Claude Code

Restart Claude Code to load the new MCP server.

## Usage

1. Click the extension icon in your browser
2. Click "Sync Tabs to Claude"
3. Ask Claude Code to organize your tabs!

**Example prompts:**
- "What tabs do I have open?"
- "Find duplicate tabs"
- "What should I focus on for coding?"
- "Show me tabs I haven't used in 24 hours"
- "Organize all my tabs by category"
- "Close all duplicate tabs"
- "Close all YouTube tabs"
- "Ungroup all my tabs"
- "Shuffle my tabs randomly"

## File Structure

```
browser-tabs-mcp/
├── extension/           # Chrome extension
│   ├── manifest.json
│   ├── background.js
│   ├── popup.html
│   └── popup.js
├── native-host/         # Native messaging host
│   ├── host.js
│   └── install.sh
├── mcp-server/          # MCP server for Claude Code
│   ├── package.json
│   └── index.js
└── tabs-data.json       # Synced tab data (created after first sync)
```

## Troubleshooting

### "No tab data found"
Click the extension icon and sync your tabs first.

### Extension says "Error: ..."
- Make sure you ran `install.sh`
- Make sure you entered the correct extension ID
- Try restarting your browser

### MCP server not showing up in Claude Code
- Check that the path in settings.json is correct
- Restart Claude Code
- Check `~/.claude/logs` for errors

## Privacy

All data stays local. Tab data is written to `tabs-data.json` in this directory and is only read by the local MCP server. Nothing is sent to any external servers.
