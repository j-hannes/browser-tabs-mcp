#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '..', 'tabs-data.json');
const COMMANDS_FILE = path.join(__dirname, '..', 'commands.json');

function sendMessage(message) {
  const messageString = JSON.stringify(message);
  const messageBuffer = Buffer.from(messageString, 'utf8');
  const header = Buffer.alloc(4);
  header.writeUInt32LE(messageBuffer.length, 0);
  process.stdout.write(header);
  process.stdout.write(messageBuffer);
}

function loadCommands() {
  if (!fs.existsSync(COMMANDS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(COMMANDS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function clearCommands() {
  if (fs.existsSync(COMMANDS_FILE)) {
    fs.writeFileSync(COMMANDS_FILE, '[]', 'utf8');
  }
}

let buffer = Buffer.alloc(0);
let messageLength = null;

process.stdin.on('readable', () => {
  let chunk;
  while ((chunk = process.stdin.read()) !== null) {
    buffer = Buffer.concat([buffer, chunk]);

    // Try to read message length if we don't have it yet
    if (messageLength === null && buffer.length >= 4) {
      messageLength = buffer.readUInt32LE(0);
      buffer = buffer.slice(4);
    }

    // Check if we have the full message
    if (messageLength !== null && buffer.length >= messageLength) {
      try {
        const messageBuffer = buffer.slice(0, messageLength);
        const message = JSON.parse(messageBuffer.toString('utf8'));

        // Handle different actions
        if (message.action === 'get_commands') {
          const commands = loadCommands();
          sendMessage({
            success: true,
            commands: commands.filter(c => c.status === 'pending')
          });
        } else if (message.action === 'clear_commands') {
          clearCommands();
          sendMessage({ success: true, message: 'Commands cleared' });
        } else {
          // Default: save tab data
          fs.writeFileSync(OUTPUT_FILE, JSON.stringify(message, null, 2), 'utf8');
          sendMessage({
            success: true,
            message: `Saved ${message.tabCount || 0} tabs`,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        sendMessage({
          success: false,
          error: error.message
        });
      }

      process.exit(0);
    }
  }
});

process.stdin.on('error', (error) => {
  sendMessage({ success: false, error: error.message });
  process.exit(1);
});
