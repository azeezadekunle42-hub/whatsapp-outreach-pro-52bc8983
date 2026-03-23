const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.API_KEY || 'change-me-in-production';

// --- Middleware ---
app.use(cors());
app.use(express.json());

// Simple API key auth
function auth(req, res, next) {
  const key = req.headers['x-api-key'];
  if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// --- WhatsApp Client ---
let client = null;
let qrDataUrl = null;
let clientStatus = 'disconnected'; // disconnected | qr_pending | connected | error
let statusMessage = '';

function initClient() {
  client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
      ],
    },
  });

  client.on('qr', async (qr) => {
    clientStatus = 'qr_pending';
    qrDataUrl = await QRCode.toDataURL(qr);
    console.log('QR code generated — scan with WhatsApp');
  });

  client.on('ready', () => {
    clientStatus = 'connected';
    qrDataUrl = null;
    statusMessage = 'WhatsApp client is ready';
    console.log('WhatsApp client ready');
  });

  client.on('authenticated', () => {
    console.log('WhatsApp authenticated');
  });

  client.on('auth_failure', (msg) => {
    clientStatus = 'error';
    statusMessage = `Auth failure: ${msg}`;
    console.error('Auth failure:', msg);
  });

  client.on('disconnected', (reason) => {
    clientStatus = 'disconnected';
    statusMessage = `Disconnected: ${reason}`;
    console.log('Client disconnected:', reason);
  });

  client.initialize();
}

// --- Routes ---

// Health check (no auth)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', whatsapp: clientStatus });
});

// Get connection status + QR code
app.get('/api/status', auth, (req, res) => {
  res.json({
    status: clientStatus,
    message: statusMessage,
    qr: qrDataUrl,
  });
});

// Initialize / reconnect
app.post('/api/connect', auth, (req, res) => {
  if (clientStatus === 'connected') {
    return res.json({ status: 'already_connected' });
  }
  if (client) {
    client.destroy().catch(() => {});
  }
  initClient();
  res.json({ status: 'initializing', message: 'Scan the QR code from /api/status' });
});

// Disconnect
app.post('/api/disconnect', auth, (req, res) => {
  if (client) {
    client.destroy().catch(() => {});
    client = null;
  }
  clientStatus = 'disconnected';
  qrDataUrl = null;
  res.json({ status: 'disconnected' });
});

// Send a single message
app.post('/api/send', auth, async (req, res) => {
  if (clientStatus !== 'connected') {
    return res.status(400).json({ error: 'WhatsApp not connected', status: clientStatus });
  }

  const { phone, message } = req.body;
  if (!phone || !message) {
    return res.status(400).json({ error: 'phone and message are required' });
  }

  try {
    // Format: country code + number @ c.us (e.g. 15551234567@c.us)
    const chatId = phone.replace(/[^0-9]/g, '') + '@c.us';

    // Check if number is registered on WhatsApp
    const isRegistered = await client.isRegisteredUser(chatId);
    if (!isRegistered) {
      return res.json({ success: false, error: 'Number not on WhatsApp', phone });
    }

    // Simulate typing delay (1-3 seconds)
    const chat = await client.getChatById(chatId);
    await chat.sendStateTyping();
    await delay(randomBetween(1000, 3000));
    await chat.clearState();

    // Send message
    const result = await client.sendMessage(chatId, message);
    res.json({
      success: true,
      messageId: result.id._serialized,
      phone,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Send error:', err.message);
    res.json({ success: false, error: err.message, phone });
  }
});

// Send bulk messages with delays
app.post('/api/send-bulk', auth, async (req, res) => {
  if (clientStatus !== 'connected') {
    return res.status(400).json({ error: 'WhatsApp not connected' });
  }

  const { messages, delayMin = 10, delayMax = 30 } = req.body;
  // messages: [{ phone, message }]
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  // Process in background, return immediately
  const batchId = Date.now().toString(36);
  bulkResults[batchId] = { total: messages.length, sent: 0, failed: 0, results: [], done: false };

  processBulk(batchId, messages, delayMin, delayMax);

  res.json({ batchId, total: messages.length, status: 'processing' });
});

// Check bulk send progress
app.get('/api/send-bulk/:batchId', auth, (req, res) => {
  const batch = bulkResults[req.params.batchId];
  if (!batch) return res.status(404).json({ error: 'Batch not found' });
  res.json(batch);
});

// Listen for incoming messages (replies)
const recentReplies = [];
app.get('/api/replies', auth, (req, res) => {
  const since = req.query.since || new Date(Date.now() - 3600000).toISOString();
  const filtered = recentReplies.filter((r) => r.timestamp >= since);
  res.json({ replies: filtered });
});

// --- Bulk processing ---
const bulkResults = {};

async function processBulk(batchId, messages, delayMin, delayMax) {
  const batch = bulkResults[batchId];
  for (const { phone, message } of messages) {
    try {
      const chatId = phone.replace(/[^0-9]/g, '') + '@c.us';
      const isRegistered = await client.isRegisteredUser(chatId);

      if (!isRegistered) {
        batch.failed++;
        batch.results.push({ phone, success: false, error: 'Not on WhatsApp' });
        continue;
      }

      // Typing simulation
      const chat = await client.getChatById(chatId);
      await chat.sendStateTyping();
      await delay(randomBetween(1000, 3000));
      await chat.clearState();

      const result = await client.sendMessage(chatId, message);
      batch.sent++;
      batch.results.push({ phone, success: true, messageId: result.id._serialized });
    } catch (err) {
      batch.failed++;
      batch.results.push({ phone, success: false, error: err.message });
    }

    // Random delay between messages
    const wait = randomBetween(delayMin * 1000, delayMax * 1000);
    await delay(wait);
  }
  batch.done = true;
}

// --- Reply listener ---
function setupReplyListener() {
  if (!client) return;
  client.on('message', (msg) => {
    if (msg.fromMe) return;
    recentReplies.push({
      from: msg.from.replace('@c.us', ''),
      body: msg.body,
      timestamp: new Date().toISOString(),
    });
    // Keep only last 500 replies in memory
    if (recentReplies.length > 500) recentReplies.shift();
  });
}

// --- Helpers ---
function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// --- Start ---
app.listen(PORT, () => {
  console.log(`WhatsApp server running on port ${PORT}`);
  initClient();
  // Attach reply listener after a short delay to ensure client is set up
  setTimeout(setupReplyListener, 2000);
});
