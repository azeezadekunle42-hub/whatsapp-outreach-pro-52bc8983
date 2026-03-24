// Green API WhatsApp client
// Uses Green API's hosted WhatsApp service — no server deployment needed
// Docs: https://green-api.com/en/docs/

const API_URL = 'https://api.green-api.com';
const MEDIA_URL = 'https://media.green-api.com';

const getIdInstance = () => {
  const id = import.meta.env.VITE_GREEN_API_ID_INSTANCE;
  if (!id) throw new Error('VITE_GREEN_API_ID_INSTANCE is not configured');
  return id;
};

const getApiToken = () => {
  const token = import.meta.env.VITE_GREEN_API_TOKEN;
  if (!token) throw new Error('VITE_GREEN_API_TOKEN is not configured');
  return token;
};

/** Build Green API endpoint URL */
const endpoint = (method: string) =>
  `${API_URL}/waInstance${getIdInstance()}/${method}/${getApiToken()}`;

export interface WhatsAppStatus {
  status: 'disconnected' | 'qr_pending' | 'connected' | 'error';
  message: string;
  qr: string | null;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  phone: string;
  error?: string;
  timestamp?: string;
}

export interface BulkSendRequest {
  messages: { phone: string; message: string }[];
  delayMin?: number;
  delayMax?: number;
}

export interface BulkProgress {
  total: number;
  sent: number;
  failed: number;
  done: boolean;
  results: SendResult[];
}

export interface Reply {
  from: string;
  body: string;
  timestamp: string;
}

// --- Helpers ---
function formatPhone(phone: string): string {
  // Strip everything except digits
  return phone.replace(/[^0-9]/g, '');
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const whatsappApi = {
  /**
   * Get current connection state from Green API
   */
  async getStatus(): Promise<WhatsAppStatus> {
    const res = await fetch(endpoint('getStateInstance'));
    if (!res.ok) throw new Error(`Status check failed: ${res.status}`);
    const data = await res.json();

    // Green API states: notAuthorized, authorized, blocked, sleepMode, starting
    const stateMap: Record<string, WhatsAppStatus['status']> = {
      authorized: 'connected',
      notAuthorized: 'disconnected',
      blocked: 'error',
      sleepMode: 'disconnected',
      starting: 'qr_pending',
    };

    return {
      status: stateMap[data.stateInstance] || 'disconnected',
      message: data.stateInstance || 'Unknown',
      qr: null,
    };
  },

  /**
   * Get QR code for scanning (returns base64 image)
   */
  async getQrCode(): Promise<{ qr: string | null; status: string }> {
    const res = await fetch(endpoint('qr'));
    if (!res.ok) {
      // 460 = already authorized
      if (res.status === 460) return { qr: null, status: 'already_authorized' };
      throw new Error(`QR fetch failed: ${res.status}`);
    }
    const data = await res.json();
    // data.message contains the QR as base64 image
    return {
      qr: data.message ? `data:image/png;base64,${data.message}` : null,
      status: data.type || 'qr',
    };
  },

  /**
   * Logout / disconnect the instance
   */
  async disconnect(): Promise<{ status: string }> {
    const res = await fetch(endpoint('logout'), { method: 'GET' });
    if (!res.ok) throw new Error(`Disconnect failed: ${res.status}`);
    return { status: 'disconnected' };
  },

  /**
   * Check if a phone number is registered on WhatsApp
   */
  async checkWhatsApp(phone: string): Promise<boolean> {
    const res = await fetch(endpoint('checkWhatsapp'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: parseInt(formatPhone(phone)) }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.existsWhatsapp === true;
  },

  /**
   * Send a single text message
   */
  async sendMessage(phone: string, message: string): Promise<SendResult> {
    const chatId = formatPhone(phone) + '@c.us';
    try {
      const res = await fetch(endpoint('sendMessage'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, message }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, phone, error: `API error ${res.status}: ${errText}` };
      }

      const data = await res.json();
      return {
        success: true,
        messageId: data.idMessage,
        phone,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return { success: false, phone, error: err.message };
    }
  },

  /**
   * Send bulk messages with delays (runs in browser)
   * Returns a controller object to track progress
   */
  startBulkSend(
    messages: { phone: string; message: string }[],
    delayMin = 10,
    delayMax = 30,
    onProgress?: (progress: BulkProgress) => void
  ): { promise: Promise<BulkProgress>; cancel: () => void } {
    let cancelled = false;
    const progress: BulkProgress = {
      total: messages.length,
      sent: 0,
      failed: 0,
      done: false,
      results: [],
    };

    const promise = (async () => {
      for (const { phone, message } of messages) {
        if (cancelled) break;

        const result = await whatsappApi.sendMessage(phone, message);
        if (result.success) progress.sent++;
        else progress.failed++;
        progress.results.push(result);

        onProgress?.({ ...progress });

        // Random delay between messages
        if (!cancelled) {
          const wait = randomBetween(delayMin * 1000, delayMax * 1000);
          await delay(wait);
        }
      }
      progress.done = true;
      onProgress?.({ ...progress });
      return progress;
    })();

    return { promise, cancel: () => { cancelled = true; } };
  },

  /**
   * Get recent incoming messages (last notification from Green API)
   */
  async getLastIncomingMessages(): Promise<Reply[]> {
    const replies: Reply[] = [];
    // Green API uses a webhook/notification queue — poll receiveNotification
    try {
      const res = await fetch(endpoint('receiveNotification'));
      if (!res.ok || res.status === 204) return replies;
      const data = await res.json();
      if (!data) return replies;

      if (data.body?.typeWebhook === 'incomingMessageReceived') {
        const msg = data.body;
        replies.push({
          from: msg.senderData?.sender?.replace('@c.us', '') || '',
          body: msg.messageData?.textMessageData?.textMessage || '',
          timestamp: new Date((msg.timestamp || 0) * 1000).toISOString(),
        });
      }

      // Delete the notification after reading
      if (data.receiptId) {
        await fetch(endpoint('deleteNotification') + `/${data.receiptId}`, {
          method: 'DELETE',
        });
      }
    } catch {
      // Silently fail for polling
    }
    return replies;
  },

  isConfigured(): boolean {
    try {
      getIdInstance();
      getApiToken();
      return true;
    } catch {
      return false;
    }
  },
};
