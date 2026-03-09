const axios = require('axios');
const crypto = require('crypto');

// In-memory webhook registry (keyed by webhookId)
const webhookRegistry = new Map();

// Recent incoming events log (last 100)
const incomingEvents = [];
const MAX_EVENTS = 100;

/**
 * Register a new webhook endpoint
 * POST /webhook/register
 * Body: { name, callbackUrl, description, secret (optional) }
 */
async function registerWebhook(req, res) {
  try {
    const { name, callbackUrl, description, secret } = req.body;

    if (!name || !callbackUrl) {
      return res.status(400).json({ success: false, error: 'name and callbackUrl are required' });
    }

    // Validate URL
    try { new URL(callbackUrl); } catch {
      return res.status(400).json({ success: false, error: 'Invalid callbackUrl' });
    }

    const webhookId = crypto.randomBytes(12).toString('hex');
    const entry = {
      webhookId,
      name,
      callbackUrl,
      description: description || '',
      secret: secret || null,
      createdAt: new Date().toISOString(),
      triggerCount: 0,
      lastTriggeredAt: null,
      ingestUrl: `/webhook/ingest/${webhookId}`
    };

    webhookRegistry.set(webhookId, entry);

    return res.status(201).json({
      success: true,
      webhook: {
        ...entry,
        secret: entry.secret ? '***hidden***' : null
      }
    });
  } catch (error) {
    console.error('[Webhook] Register error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * List all registered webhooks
 * GET /webhook/list
 */
function listWebhooks(req, res) {
  const list = Array.from(webhookRegistry.values()).map(w => ({
    ...w,
    secret: w.secret ? '***hidden***' : null
  }));
  return res.json({ success: true, webhooks: list, total: list.length });
}

/**
 * Delete a webhook
 * DELETE /webhook/:webhookId
 */
function deleteWebhook(req, res) {
  const { webhookId } = req.params;
  if (!webhookRegistry.has(webhookId)) {
    return res.status(404).json({ success: false, error: 'Webhook not found' });
  }
  webhookRegistry.delete(webhookId);
  return res.json({ success: true, message: `Webhook ${webhookId} deleted` });
}

/**
 * Receive an incoming webhook (ingest endpoint)
 * POST /webhook/ingest/:webhookId
 */
async function ingestWebhook(req, res) {
  try {
    const { webhookId } = req.params;
    const payload = req.body;
    const headers = req.headers;

    const entry = webhookRegistry.get(webhookId);
    if (!entry) {
      // Still accept and log even if not registered
      console.log(`[Webhook] Received unregistered ingest for ${webhookId}`);
    }

    const event = {
      id: crypto.randomBytes(8).toString('hex'),
      webhookId,
      receivedAt: new Date().toISOString(),
      payload,
      source: headers['x-webhook-source'] || headers['user-agent'] || 'unknown',
      headers: {
        'content-type': headers['content-type'],
        'x-webhook-source': headers['x-webhook-source'],
        'x-event-type': headers['x-event-type']
      }
    };

    incomingEvents.unshift(event);
    if (incomingEvents.length > MAX_EVENTS) incomingEvents.pop();

    if (entry) {
      entry.triggerCount += 1;
      entry.lastTriggeredAt = new Date().toISOString();
    }

    console.log(`[Webhook] Ingest ${webhookId}: payload keys = ${Object.keys(payload).join(', ')}`);

    return res.json({
      success: true,
      eventId: event.id,
      received: true,
      webhookId
    });
  } catch (error) {
    console.error('[Webhook] Ingest error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get recent incoming events
 * GET /webhook/events
 */
function getEvents(req, res) {
  const limit = Math.min(parseInt(req.query.limit) || 20, MAX_EVENTS);
  const webhookId = req.query.webhookId;
  const events = webhookId
    ? incomingEvents.filter(e => e.webhookId === webhookId).slice(0, limit)
    : incomingEvents.slice(0, limit);
  return res.json({ success: true, events, total: events.length });
}

/**
 * Send an outgoing webhook (tool call)
 * POST /webhook/send
 * Body: { url, payload, method (optional), headers (optional), secret (optional) }
 */
async function sendWebhook(req, res) {
  try {
    const { url, payload, method = 'POST', headers: customHeaders = {}, secret } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, error: 'url is required' });
    }

    try { new URL(url); } catch {
      return res.status(400).json({ success: false, error: 'Invalid url' });
    }

    const sentAt = new Date().toISOString();
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload || {});

    // Build headers
    const requestHeaders = {
      'Content-Type': 'application/json',
      'X-Webhook-Source': 'InFlow',
      'X-Sent-At': sentAt,
      ...customHeaders
    };

    // Optionally sign payload with HMAC-SHA256 if secret provided
    if (secret) {
      const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
      requestHeaders['X-Webhook-Signature'] = `sha256=${sig}`;
    }

    const response = await axios({
      method: method.toUpperCase(),
      url,
      data: payload || {},
      headers: requestHeaders,
      timeout: 10000
    });

    console.log(`[Webhook] Sent to ${url}: status ${response.status}`);

    return res.json({
      success: true,
      url,
      method: method.toUpperCase(),
      sentAt,
      responseStatus: response.status,
      responseBody: response.data
    });
  } catch (error) {
    const status = error.response?.status;
    const responseBody = error.response?.data;
    console.error(`[Webhook] Send error to ${req.body?.url}: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message,
      responseStatus: status,
      responseBody
    });
  }
}

module.exports = {
  registerWebhook,
  listWebhooks,
  deleteWebhook,
  ingestWebhook,
  getEvents,
  sendWebhook
};
