#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TABS_FILE = path.join(__dirname, '..', 'tabs-data.json');
const COMMANDS_FILE = path.join(__dirname, '..', 'commands.json');

function writeCommand(command) {
  const commands = fs.existsSync(COMMANDS_FILE)
    ? JSON.parse(fs.readFileSync(COMMANDS_FILE, 'utf8'))
    : [];
  commands.push({ ...command, id: Date.now(), status: 'pending' });
  fs.writeFileSync(COMMANDS_FILE, JSON.stringify(commands, null, 2), 'utf8');
  return command;
}

function loadTabs() {
  if (!fs.existsSync(TABS_FILE)) {
    return null;
  }
  const content = fs.readFileSync(TABS_FILE, 'utf8');
  return JSON.parse(content);
}

function formatAge(timestamp) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const server = new Server(
  { name: 'browser-tabs-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_tabs',
        description: 'List all open browser tabs. Returns tab titles, URLs, and metadata.',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Optional: filter by domain (e.g., "github.com")'
            },
            search: {
              type: 'string',
              description: 'Optional: search in title or URL'
            }
          }
        }
      },
      {
        name: 'group_tabs_by_domain',
        description: 'Group all tabs by their domain and show counts. Great for finding which sites have the most tabs.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'find_duplicate_tabs',
        description: 'Find tabs with duplicate URLs',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'find_old_tabs',
        description: 'Find tabs that haven\'t been accessed recently',
        inputSchema: {
          type: 'object',
          properties: {
            hours: {
              type: 'number',
              description: 'Find tabs older than this many hours (default: 24)',
              default: 24
            }
          }
        }
      },
      {
        name: 'suggest_tab_organization',
        description: 'Analyze tabs and suggest how to organize them (groupings, tabs to close, duplicates)',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'get_tab_stats',
        description: 'Get statistics about open tabs: counts, domains, windows, groups',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'find_tabs_by_category',
        description: 'Categorize tabs into types: social, work, dev, shopping, news, entertainment, etc.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'suggest_focus_tabs',
        description: 'Based on tab titles and domains, suggest which tabs you should focus on',
        inputSchema: {
          type: 'object',
          properties: {
            context: {
              type: 'string',
              description: 'Optional: what are you trying to work on? (e.g., "coding", "research", "emails")'
            }
          }
        }
      },
      // ACTION TOOLS
      {
        name: 'close_tabs',
        description: 'Close tabs matching a domain or URL pattern. Requires user to click "Execute" in extension.',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Close all tabs from this domain (e.g., "youtube.com")'
            },
            urlPattern: {
              type: 'string',
              description: 'Close tabs where URL contains this string'
            },
            tabIds: {
              type: 'array',
              items: { type: 'number' },
              description: 'Close specific tabs by their IDs'
            }
          }
        }
      },
      {
        name: 'close_duplicate_tabs',
        description: 'Close all duplicate tabs, keeping only one of each URL. Requires user to click "Execute" in extension.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'create_tab_group',
        description: 'Create a tab group from tabs matching a domain or pattern. Requires user to click "Execute" in extension.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the tab group'
            },
            domain: {
              type: 'string',
              description: 'Group all tabs from this domain'
            },
            color: {
              type: 'string',
              enum: ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'],
              description: 'Color for the tab group'
            }
          },
          required: ['name', 'domain']
        }
      },
      {
        name: 'focus_tab',
        description: 'Switch to a specific tab by ID or search. Requires user to click "Execute" in extension.',
        inputSchema: {
          type: 'object',
          properties: {
            tabId: {
              type: 'number',
              description: 'The tab ID to focus'
            },
            search: {
              type: 'string',
              description: 'Search for tab by title or URL and focus it'
            }
          }
        }
      },
      {
        name: 'auto_organize_tabs',
        description: 'Automatically organize all tabs by grouping them by purpose/category (GitHub, Jira, Confluence, Docs, Local Dev, AI Tools, Articles, Metrics, Meetings, Support, Social, Shopping, Entertainment, Search). Every tab is assigned to a category. Requires user to click "Execute" in extension.',
        inputSchema: {
          type: 'object',
          properties: {
            closeDuplicates: {
              type: 'boolean',
              description: 'Also close duplicate tabs before organizing (default: false)',
              default: false
            }
          }
        }
      },
      {
        name: 'ungroup_all_tabs',
        description: 'Remove all tabs from their groups, keeping tabs open. Empty groups are automatically removed. Requires user to click "Execute" in extension.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'shuffle_tabs',
        description: 'Randomly reorder all tabs. Great for demos or breaking out of tab habits. Requires user to click "Execute" in extension.',
        inputSchema: { type: 'object', properties: {} }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const data = loadTabs();
  if (!data) {
    return {
      content: [{
        type: 'text',
        text: 'No tab data found. Please click the "Sync Tabs to Claude" button in the browser extension first.'
      }]
    };
  }

  const { tabs, groups, timestamp, tabCount, windowCount } = data;
  const dataAge = formatAge(timestamp);

  switch (name) {
    case 'list_tabs': {
      let filtered = tabs;

      if (args?.domain) {
        filtered = filtered.filter(t => t.domain.includes(args.domain.toLowerCase()));
      }
      if (args?.search) {
        const search = args.search.toLowerCase();
        filtered = filtered.filter(t =>
          t.title.toLowerCase().includes(search) ||
          t.url.toLowerCase().includes(search)
        );
      }

      const output = filtered.map((t, i) =>
        `${i + 1}. ${t.title}\n   ${t.url}\n   [${t.domain}] ${t.pinned ? '📌' : ''} ${t.audible ? '🔊' : ''}`
      ).join('\n\n');

      return {
        content: [{
          type: 'text',
          text: `Found ${filtered.length} tabs (data from ${dataAge}):\n\n${output}`
        }]
      };
    }

    case 'group_tabs_by_domain': {
      const domainCounts = {};
      tabs.forEach(t => {
        domainCounts[t.domain] = (domainCounts[t.domain] || 0) + 1;
      });

      const sorted = Object.entries(domainCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([domain, count]) => `${domain}: ${count} tab${count > 1 ? 's' : ''}`)
        .join('\n');

      return {
        content: [{
          type: 'text',
          text: `Tabs grouped by domain (${Object.keys(domainCounts).length} unique domains):\n\n${sorted}`
        }]
      };
    }

    case 'find_duplicate_tabs': {
      const urlCounts = {};
      tabs.forEach(t => {
        urlCounts[t.url] = (urlCounts[t.url] || []);
        urlCounts[t.url].push(t);
      });

      const duplicates = Object.entries(urlCounts)
        .filter(([url, tabs]) => tabs.length > 1)
        .map(([url, tabs]) => `${tabs.length}x: ${tabs[0].title}\n   ${url}`)
        .join('\n\n');

      if (!duplicates) {
        return { content: [{ type: 'text', text: 'No duplicate tabs found!' }] };
      }

      return {
        content: [{
          type: 'text',
          text: `Found duplicate tabs:\n\n${duplicates}`
        }]
      };
    }

    case 'find_old_tabs': {
      const hours = args?.hours || 24;
      const cutoff = Date.now() - (hours * 60 * 60 * 1000);

      const oldTabs = tabs
        .filter(t => t.lastAccessed && t.lastAccessed < cutoff)
        .sort((a, b) => a.lastAccessed - b.lastAccessed)
        .map(t => `${t.title}\n   ${t.domain} - last accessed ${formatAge(t.lastAccessed)}`);

      if (oldTabs.length === 0) {
        return { content: [{ type: 'text', text: `No tabs older than ${hours} hours found.` }] };
      }

      return {
        content: [{
          type: 'text',
          text: `Found ${oldTabs.length} tabs not accessed in ${hours}+ hours:\n\n${oldTabs.join('\n\n')}`
        }]
      };
    }

    case 'get_tab_stats': {
      const domains = new Set(tabs.map(t => t.domain));
      const pinnedCount = tabs.filter(t => t.pinned).length;
      const audibleCount = tabs.filter(t => t.audible).length;
      const groupedCount = tabs.filter(t => t.groupId && t.groupId !== -1).length;

      return {
        content: [{
          type: 'text',
          text: `Tab Statistics (data from ${dataAge}):
- Total tabs: ${tabCount}
- Windows: ${windowCount}
- Unique domains: ${domains.size}
- Pinned tabs: ${pinnedCount}
- Playing audio: ${audibleCount}
- In groups: ${groupedCount}
- Tab groups: ${groups.length}`
        }]
      };
    }

    case 'find_tabs_by_category': {
      const categories = {
        'Development': ['github.com', 'gitlab.com', 'stackoverflow.com', 'localhost', 'npmjs.com', 'docs.', 'developer.'],
        'Social': ['twitter.com', 'x.com', 'facebook.com', 'linkedin.com', 'instagram.com', 'reddit.com', 'discord.com'],
        'Communication': ['mail.google.com', 'outlook.', 'slack.com', 'teams.microsoft.com', 'zoom.us'],
        'Productivity': ['notion.so', 'docs.google.com', 'sheets.google.com', 'drive.google.com', 'trello.com', 'asana.com', 'jira.'],
        'Shopping': ['amazon.', 'ebay.', 'etsy.com', 'shop.', 'store.'],
        'Entertainment': ['youtube.com', 'netflix.com', 'spotify.com', 'twitch.tv', 'hulu.com'],
        'News': ['news.', 'cnn.com', 'bbc.', 'nytimes.com', 'theguardian.com', 'hackernews', 'ycombinator.com'],
        'AI Tools': ['claude.ai', 'chat.openai.com', 'chatgpt.com', 'anthropic.com', 'huggingface.co']
      };

      const categorized = {};
      const uncategorized = [];

      tabs.forEach(tab => {
        let found = false;
        for (const [category, patterns] of Object.entries(categories)) {
          if (patterns.some(p => tab.domain.includes(p) || tab.url.includes(p))) {
            categorized[category] = categorized[category] || [];
            categorized[category].push(tab);
            found = true;
            break;
          }
        }
        if (!found) uncategorized.push(tab);
      });

      let output = '';
      for (const [category, tabs] of Object.entries(categorized)) {
        output += `\n${category} (${tabs.length}):\n`;
        tabs.forEach(t => { output += `  - ${t.title}\n`; });
      }
      if (uncategorized.length > 0) {
        output += `\nOther (${uncategorized.length}):\n`;
        uncategorized.slice(0, 10).forEach(t => { output += `  - ${t.title} [${t.domain}]\n`; });
        if (uncategorized.length > 10) output += `  ... and ${uncategorized.length - 10} more\n`;
      }

      return { content: [{ type: 'text', text: `Tabs by category:${output}` }] };
    }

    case 'suggest_tab_organization': {
      const suggestions = [];

      // Check for duplicates
      const urlCounts = {};
      tabs.forEach(t => { urlCounts[t.url] = (urlCounts[t.url] || 0) + 1; });
      const duplicateCount = Object.values(urlCounts).filter(c => c > 1).reduce((a, b) => a + b, 0) - Object.values(urlCounts).filter(c => c > 1).length;
      if (duplicateCount > 0) {
        suggestions.push(`Close ${duplicateCount} duplicate tabs`);
      }

      // Check for domain clusters
      const domainCounts = {};
      tabs.forEach(t => { domainCounts[t.domain] = (domainCounts[t.domain] || 0) + 1; });
      const largeClusters = Object.entries(domainCounts).filter(([d, c]) => c >= 5);
      largeClusters.forEach(([domain, count]) => {
        suggestions.push(`Group ${count} tabs from ${domain} together`);
      });

      // Check total count
      if (tabCount > 50) {
        suggestions.push(`Consider closing some tabs - ${tabCount} is a lot!`);
      }

      // Check for old tabs
      const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
      const oldCount = tabs.filter(t => t.lastAccessed && t.lastAccessed < dayAgo).length;
      if (oldCount > 5) {
        suggestions.push(`Review ${oldCount} tabs not accessed in 24+ hours`);
      }

      return {
        content: [{
          type: 'text',
          text: suggestions.length > 0
            ? `Suggestions for organizing your ${tabCount} tabs:\n\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
            : 'Your tabs look pretty well organized!'
        }]
      };
    }

    case 'suggest_focus_tabs': {
      const context = args?.context?.toLowerCase() || '';

      let relevantTabs = tabs;

      // If context provided, filter for relevant tabs
      if (context) {
        const contextKeywords = {
          'coding': ['github', 'stackoverflow', 'docs', 'localhost', 'npm', 'developer'],
          'code': ['github', 'stackoverflow', 'docs', 'localhost', 'npm', 'developer'],
          'research': ['scholar', 'arxiv', 'wikipedia', 'paper', 'research', 'docs'],
          'email': ['mail', 'outlook', 'gmail', 'inbox'],
          'emails': ['mail', 'outlook', 'gmail', 'inbox'],
          'work': ['jira', 'confluence', 'slack', 'teams', 'notion', 'docs.google', 'drive'],
          'meeting': ['zoom', 'meet.google', 'teams', 'calendar'],
          'meetings': ['zoom', 'meet.google', 'teams', 'calendar']
        };

        const keywords = contextKeywords[context] || [context];
        relevantTabs = tabs.filter(t =>
          keywords.some(k =>
            t.domain.includes(k) ||
            t.title.toLowerCase().includes(k) ||
            t.url.toLowerCase().includes(k)
          )
        );
      }

      // Sort by recent access
      relevantTabs.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));

      const top = relevantTabs.slice(0, 5);

      if (top.length === 0) {
        return {
          content: [{
            type: 'text',
            text: context
              ? `No tabs found related to "${context}". Try a different context or sync your tabs again.`
              : 'Sync your tabs first to get focus suggestions.'
          }]
        };
      }

      const output = top.map((t, i) =>
        `${i + 1}. ${t.title}\n   ${t.url}`
      ).join('\n\n');

      return {
        content: [{
          type: 'text',
          text: context
            ? `Top tabs for "${context}":\n\n${output}`
            : `Your most recently accessed tabs:\n\n${output}`
        }]
      };
    }

    // ACTION HANDLERS
    case 'close_tabs': {
      const { domain, urlPattern, tabIds } = args || {};

      let tabsToClose = [];
      if (tabIds && tabIds.length > 0) {
        tabsToClose = tabs.filter(t => tabIds.includes(t.id));
      } else if (domain) {
        tabsToClose = tabs.filter(t => t.domain.includes(domain.toLowerCase()));
      } else if (urlPattern) {
        tabsToClose = tabs.filter(t => t.url.toLowerCase().includes(urlPattern.toLowerCase()));
      }

      if (tabsToClose.length === 0) {
        return { content: [{ type: 'text', text: 'No matching tabs found to close.' }] };
      }

      writeCommand({
        action: 'close_tabs',
        tabIds: tabsToClose.map(t => t.id),
        description: `Close ${tabsToClose.length} tabs`
      });

      return {
        content: [{
          type: 'text',
          text: `Queued ${tabsToClose.length} tabs for closing:\n${tabsToClose.map(t => `- ${t.title}`).join('\n')}\n\nClick "Execute Commands" in the browser extension to apply.`
        }]
      };
    }

    case 'close_duplicate_tabs': {
      const urlMap = {};
      const duplicateIds = [];

      tabs.forEach(t => {
        if (urlMap[t.url]) {
          duplicateIds.push(t.id);
        } else {
          urlMap[t.url] = t;
        }
      });

      if (duplicateIds.length === 0) {
        return { content: [{ type: 'text', text: 'No duplicate tabs found!' }] };
      }

      writeCommand({
        action: 'close_tabs',
        tabIds: duplicateIds,
        description: `Close ${duplicateIds.length} duplicate tabs`
      });

      return {
        content: [{
          type: 'text',
          text: `Queued ${duplicateIds.length} duplicate tabs for closing.\n\nClick "Execute Commands" in the browser extension to apply.`
        }]
      };
    }

    case 'create_tab_group': {
      const { name, domain, color } = args || {};

      if (!name || !domain) {
        return { content: [{ type: 'text', text: 'Please provide both name and domain for the tab group.' }] };
      }

      const matchingTabs = tabs.filter(t => t.domain.includes(domain.toLowerCase()));

      if (matchingTabs.length === 0) {
        return { content: [{ type: 'text', text: `No tabs found matching domain "${domain}"` }] };
      }

      writeCommand({
        action: 'create_group',
        tabIds: matchingTabs.map(t => t.id),
        groupName: name,
        color: color || 'blue',
        description: `Group ${matchingTabs.length} tabs as "${name}"`
      });

      return {
        content: [{
          type: 'text',
          text: `Queued ${matchingTabs.length} tabs to be grouped as "${name}":\n${matchingTabs.map(t => `- ${t.title}`).join('\n')}\n\nClick "Execute Commands" in the browser extension to apply.`
        }]
      };
    }

    case 'focus_tab': {
      const { tabId, search } = args || {};

      let targetTab = null;
      if (tabId) {
        targetTab = tabs.find(t => t.id === tabId);
      } else if (search) {
        const s = search.toLowerCase();
        targetTab = tabs.find(t =>
          t.title.toLowerCase().includes(s) ||
          t.url.toLowerCase().includes(s)
        );
      }

      if (!targetTab) {
        return { content: [{ type: 'text', text: 'Tab not found.' }] };
      }

      writeCommand({
        action: 'focus_tab',
        tabId: targetTab.id,
        windowId: targetTab.windowId,
        description: `Focus: ${targetTab.title}`
      });

      return {
        content: [{
          type: 'text',
          text: `Queued focus on: ${targetTab.title}\n\nClick "Execute Commands" in the browser extension to apply.`
        }]
      };
    }

    case 'auto_organize_tabs': {
      const closeDuplicates = args?.closeDuplicates || false;

      // Define categories with patterns (order matters - first match wins)
      const categoryDefinitions = [
        {
          name: 'GitHub',
          color: 'green',
          patterns: ['github.com', 'gitlab.com', 'bitbucket.org']
        },
        {
          name: 'Jira',
          color: 'blue',
          patterns: ['atlassian.net/browse', 'atlassian.net/jira', 'atlassian.com']
        },
        {
          name: 'Confluence',
          color: 'blue',
          patterns: ['atlassian.net/wiki']
        },
        {
          name: 'Docs',
          color: 'purple',
          patterns: ['docs.', '/docs/', 'documentation', 'readme', 'knip.dev', 'nx.dev', 'npmjs.com', 'developer.', 'devdocs.io', 'mdn.', 'w3schools']
        },
        {
          name: 'Local Dev',
          color: 'yellow',
          patterns: ['localhost', '127.0.0.1', '0.0.0.0']
        },
        {
          name: 'AI Tools',
          color: 'pink',
          patterns: ['claude.ai', 'chat.openai.com', 'chatgpt.com', 'anthropic.com', 'huggingface.co', 'code.claude']
        },
        {
          name: 'Articles',
          color: 'cyan',
          patterns: ['medium.com', 'dev.to', 'reddit.com', 'hackernews', 'news.ycombinator', 'blog', 'substack.com', 'hashnode.', 'freecodecamp']
        },
        {
          name: 'Metrics',
          color: 'red',
          patterns: ['datadog', 'grafana', 'prometheus', 'newrelic', 'dora', 'analytics', 'sonarcloud', 'sonarqube', 'snyk.io', 'backstage']
        },
        {
          name: 'Meetings',
          color: 'orange',
          patterns: ['zoom.us', 'meet.google', 'teams.microsoft', 'webex', 'calendar']
        },
        {
          name: 'Support',
          color: 'grey',
          patterns: ['service-now', 'servicenow', 'zendesk', 'freshdesk', 'support.', 'helpdesk']
        },
        {
          name: 'Social',
          color: 'pink',
          patterns: ['twitter.com', 'x.com', 'facebook.com', 'linkedin.com', 'instagram.com', 'discord.com', 'slack.com']
        },
        {
          name: 'Shopping',
          color: 'orange',
          patterns: ['amazon.', 'ebay.', 'etsy.com', 'apple.com/shop', 'store.', 'checkout', 'cart']
        },
        {
          name: 'Entertainment',
          color: 'red',
          patterns: ['youtube.com', 'netflix.com', 'spotify.com', 'twitch.tv', 'hulu.com', 'disneyplus.com']
        },
        {
          name: 'Search',
          color: 'grey',
          patterns: ['google.com/search', 'bing.com/search', 'duckduckgo.com']
        }
      ];

      // Find duplicates if requested
      let duplicateIds = [];
      if (closeDuplicates) {
        const urlMap = {};
        tabs.forEach(t => {
          if (urlMap[t.url]) {
            duplicateIds.push(t.id);
          } else {
            urlMap[t.url] = t;
          }
        });
      }

      // Categorize each tab
      const categorizedTabs = {};
      const processedTabIds = new Set();

      // Filter out duplicates first
      const tabsToProcess = closeDuplicates
        ? tabs.filter(t => !duplicateIds.includes(t.id))
        : tabs;

      // Assign tabs to categories
      tabsToProcess.forEach(tab => {
        // Skip pinned tabs and extension pages
        if (tab.pinned || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
          return;
        }

        let assigned = false;
        for (const category of categoryDefinitions) {
          const matches = category.patterns.some(pattern =>
            tab.url.toLowerCase().includes(pattern.toLowerCase()) ||
            tab.domain.toLowerCase().includes(pattern.toLowerCase())
          );

          if (matches) {
            if (!categorizedTabs[category.name]) {
              categorizedTabs[category.name] = { color: category.color, tabs: [] };
            }
            categorizedTabs[category.name].tabs.push(tab);
            processedTabIds.add(tab.id);
            assigned = true;
            break;
          }
        }

        // Assign uncategorized tabs to "Other"
        if (!assigned) {
          if (!categorizedTabs['Other']) {
            categorizedTabs['Other'] = { color: 'grey', tabs: [] };
          }
          categorizedTabs['Other'].tabs.push(tab);
          processedTabIds.add(tab.id);
        }
      });

      // Create group commands for each category
      const groupCommands = [];
      const summary = [];

      for (const [categoryName, { color, tabs: categoryTabs }] of Object.entries(categorizedTabs)) {
        if (categoryTabs.length > 0) {
          groupCommands.push({
            action: 'create_group',
            tabIds: categoryTabs.map(t => t.id),
            groupName: categoryName,
            color: color,
            description: `Group ${categoryTabs.length} tabs as "${categoryName}"`
          });
          summary.push(`${categoryName}: ${categoryTabs.length} tabs`);
        }
      }

      // Queue close duplicates command first if requested
      if (closeDuplicates && duplicateIds.length > 0) {
        writeCommand({
          action: 'close_tabs',
          tabIds: duplicateIds,
          description: `Close ${duplicateIds.length} duplicate tabs`
        });
      }

      // Queue all group commands
      groupCommands.forEach(cmd => writeCommand(cmd));

      if (groupCommands.length === 0) {
        return {
          content: [{
            type: 'text',
            text: 'No tabs to organize (all tabs are pinned or extension pages).'
          }]
        };
      }

      return {
        content: [{
          type: 'text',
          text: `Queued auto-organization:\n${closeDuplicates && duplicateIds.length > 0 ? `- Close ${duplicateIds.length} duplicates\n` : ''}- Create ${groupCommands.length} tab groups:\n  ${summary.join('\n  ')}\n\nClick "Execute Commands" in the browser extension to apply.`
        }]
      };
    }

    case 'ungroup_all_tabs': {
      // Find all tabs that are in groups
      const groupedTabs = tabs.filter(t => t.groupId && t.groupId !== -1);

      if (groupedTabs.length === 0) {
        return {
          content: [{
            type: 'text',
            text: 'No tabs are currently in groups.'
          }]
        };
      }

      // Get unique group names for the summary
      const groupNames = [...new Set(groupedTabs.map(t => {
        const group = groups.find(g => g.id === t.groupId);
        return group ? group.title || 'Unnamed' : 'Unknown';
      }))];

      writeCommand({
        action: 'ungroup_tabs',
        tabIds: groupedTabs.map(t => t.id),
        description: `Ungroup ${groupedTabs.length} tabs from ${groupNames.length} groups`
      });

      return {
        content: [{
          type: 'text',
          text: `Queued ${groupedTabs.length} tabs to be ungrouped from ${groupNames.length} groups:\n- ${groupNames.join('\n- ')}\n\nEmpty groups will be automatically removed.\n\nClick "Execute Commands" in the browser extension to apply.`
        }]
      };
    }

    case 'shuffle_tabs': {
      // Get all non-pinned tabs (pinned tabs stay in place)
      const shufflableTabs = tabs.filter(t => !t.pinned && !t.url.startsWith('chrome://') && !t.url.startsWith('chrome-extension://'));

      if (shufflableTabs.length < 2) {
        return {
          content: [{
            type: 'text',
            text: 'Not enough tabs to shuffle.'
          }]
        };
      }

      // Fisher-Yates shuffle
      const shuffled = [...shufflableTabs];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      writeCommand({
        action: 'shuffle_tabs',
        moves: shuffled.map((tab, newIndex) => ({ tabId: tab.id, windowId: tab.windowId, index: newIndex })),
        description: `Shuffle ${shuffled.length} tabs randomly`
      });

      return {
        content: [{
          type: 'text',
          text: `Queued ${shuffled.length} tabs to be shuffled randomly.\n\nClick "Execute Commands" in the browser extension to apply.`
        }]
      };
    }

    default:
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }]
      };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
