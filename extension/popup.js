const statsEl = document.getElementById('stats');
const syncBtn = document.getElementById('syncBtn');
const statusEl = document.getElementById('status');
const commandsSection = document.getElementById('commandsSection');
const commandsList = document.getElementById('commandsList');
const executeBtn = document.getElementById('executeBtn');

let pendingCommands = [];

async function loadStats() {
  chrome.runtime.sendMessage({ action: 'getTabs' }, response => {
    if (response.success) {
      const tabs = response.tabs;
      const domains = new Set(tabs.map(t => t.domain)).size;
      statsEl.textContent = `${tabs.length} tabs across ${domains} domains`;
    } else {
      statsEl.textContent = 'Could not load tabs';
    }
  });
}

async function loadCommands() {
  chrome.runtime.sendMessage({ action: 'getCommands' }, response => {
    pendingCommands = response?.commands || [];
    updateCommandsUI();
  });
}

function updateCommandsUI() {
  if (pendingCommands.length === 0) {
    commandsSection.classList.remove('visible');
    return;
  }

  commandsSection.classList.add('visible');
  commandsList.innerHTML = pendingCommands
    .map(cmd => `<div class="command-item">&bull; ${cmd.description || cmd.action}</div>`)
    .join('');
}

function showStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.className = 'status ' + (isError ? 'error' : 'success');
}

syncBtn.addEventListener('click', async () => {
  syncBtn.disabled = true;
  syncBtn.textContent = 'Syncing...';
  statusEl.className = 'status';

  chrome.runtime.sendMessage({ action: 'syncTabs' }, response => {
    syncBtn.disabled = false;
    syncBtn.textContent = 'Sync Tabs to Claude';

    if (response.success) {
      showStatus('Tabs synced! Ask Claude to organize them.');
      loadCommands(); // Refresh commands after sync
    } else {
      showStatus('Error: ' + response.error, true);
    }
  });
});

executeBtn.addEventListener('click', async () => {
  if (pendingCommands.length === 0) return;

  executeBtn.disabled = true;
  executeBtn.textContent = 'Executing...';
  statusEl.className = 'status';

  chrome.runtime.sendMessage({ action: 'executeCommands', commands: pendingCommands }, response => {
    executeBtn.disabled = false;
    executeBtn.textContent = 'Execute Commands';

    if (response.success) {
      const results = response.results || [];
      const successCount = results.filter(r => r.success).length;
      showStatus(`Executed ${successCount} command(s) successfully!`);
      pendingCommands = [];
      updateCommandsUI();
      loadStats(); // Refresh stats after execution
    } else {
      showStatus('Error: ' + response.error, true);
    }
  });
});

// Initial load
loadStats();
loadCommands();
