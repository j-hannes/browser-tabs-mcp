const NATIVE_HOST_NAME = 'com.claude.tabs_organizer';

async function getAllTabs() {
  const tabs = await chrome.tabs.query({});
  return tabs.map(tab => ({
    id: tab.id,
    windowId: tab.windowId,
    index: tab.index,
    title: tab.title || '',
    url: tab.url || '',
    domain: tab.url ? new URL(tab.url).hostname : '',
    pinned: tab.pinned,
    active: tab.active,
    groupId: tab.groupId,
    lastAccessed: tab.lastAccessed,
    audible: tab.audible,
    mutedInfo: tab.mutedInfo,
    favIconUrl: tab.favIconUrl || ''
  }));
}

async function getTabGroups() {
  try {
    const groups = await chrome.tabGroups.query({});
    return groups.map(g => ({
      id: g.id,
      title: g.title || '',
      color: g.color,
      collapsed: g.collapsed,
      windowId: g.windowId
    }));
  } catch (e) {
    return [];
  }
}

async function syncTabs() {
  const tabs = await getAllTabs();
  const groups = await getTabGroups();
  const windows = await chrome.windows.getAll();

  const data = {
    timestamp: new Date().toISOString(),
    windowCount: windows.length,
    tabCount: tabs.length,
    groups: groups,
    tabs: tabs
  };

  return new Promise((resolve, reject) => {
    chrome.runtime.sendNativeMessage(NATIVE_HOST_NAME, data, response => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

// Execute commands from Claude
async function executeCommands(commands) {
  const results = [];

  for (const cmd of commands) {
    if (cmd.status !== 'pending') continue;

    try {
      switch (cmd.action) {
        case 'close_tabs': {
          if (cmd.tabIds && cmd.tabIds.length > 0) {
            await chrome.tabs.remove(cmd.tabIds);
            results.push({ id: cmd.id, success: true, message: `Closed ${cmd.tabIds.length} tabs` });
          }
          break;
        }

        case 'create_group': {
          if (cmd.tabIds && cmd.tabIds.length > 0) {
            const groupId = await chrome.tabs.group({ tabIds: cmd.tabIds });
            await chrome.tabGroups.update(groupId, {
              title: cmd.groupName || 'Group',
              color: cmd.color || 'blue',
              collapsed: true
            });
            results.push({ id: cmd.id, success: true, message: `Created group "${cmd.groupName}"` });
          }
          break;
        }

        case 'focus_tab': {
          if (cmd.tabId) {
            await chrome.tabs.update(cmd.tabId, { active: true });
            if (cmd.windowId) {
              await chrome.windows.update(cmd.windowId, { focused: true });
            }
            results.push({ id: cmd.id, success: true, message: 'Tab focused' });
          }
          break;
        }

        case 'ungroup_tabs': {
          if (cmd.tabIds && cmd.tabIds.length > 0) {
            await chrome.tabs.ungroup(cmd.tabIds);
            results.push({ id: cmd.id, success: true, message: `Ungrouped ${cmd.tabIds.length} tabs` });
          }
          break;
        }

        case 'shuffle_tabs': {
          if (cmd.moves && cmd.moves.length > 0) {
            // Move tabs to their new positions
            for (const move of cmd.moves) {
              try {
                await chrome.tabs.move(move.tabId, { index: move.index });
              } catch (e) {
                // Tab may have been closed, continue with others
              }
            }
            results.push({ id: cmd.id, success: true, message: `Shuffled ${cmd.moves.length} tabs` });
          }
          break;
        }

        default:
          results.push({ id: cmd.id, success: false, message: `Unknown action: ${cmd.action}` });
      }
    } catch (error) {
      results.push({ id: cmd.id, success: false, message: error.message });
    }
  }

  return results;
}

// Fetch commands from native host
async function fetchCommands() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendNativeMessage(NATIVE_HOST_NAME, { action: 'get_commands' }, response => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

// Clear commands via native host
async function clearCommands() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendNativeMessage(NATIVE_HOST_NAME, { action: 'clear_commands' }, response => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'syncTabs') {
    syncTabs()
      .then(response => sendResponse({ success: true, response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.action === 'getTabs') {
    getAllTabs()
      .then(tabs => sendResponse({ success: true, tabs }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.action === 'getCommands') {
    fetchCommands()
      .then(response => sendResponse({ success: true, commands: response?.commands || [] }))
      .catch(error => sendResponse({ success: false, error: error.message, commands: [] }));
    return true;
  }

  if (message.action === 'executeCommands') {
    const commands = message.commands || [];
    executeCommands(commands)
      .then(async (results) => {
        // Clear executed commands
        await clearCommands().catch(() => {});
        // Re-sync tabs after executing
        await syncTabs().catch(() => {});
        sendResponse({ success: true, results });
      })
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});
