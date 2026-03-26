// Green API WhatsApp client — per-user credentials version
// Each user has their own idInstance + apiToken stored in the database

const API_URL = 'https://api.green-api.com';

export interface UserCredentials {
  idInstance: string;
  apiToken: string;
}

/** Build Green API endpoint URL with provided credentials */
const endpoint = (creds: UserCredentials, method: string) =>
  `${API_URL}/waInstance${creds.idInstance}/${method}/${creds.apiToken}`;

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

function formatPhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const whatsappApi = {
  async getStatus(creds: UserCredentials): Promise<WhatsAppStatus> {
    const res = await fetch(endpoint(creds, 'getStateInstance'));
    if (!res.ok) throw new Error(`Status check failed: ${res.status}`);
    const data = await res.json();

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

  async getQrCode(creds: UserCredentials): Promise<{ qr: string | null; status: string }> {
    const res = await fetch(endpoint(creds, 'qr'));
    if (!res.ok) {
      if (res.status === 460) return { qr: null, status: 'already_authorized' };
      throw new Error(`QR fetch failed: ${res.status}`);
    }
    const data = await res.json();
    return {
      qr: data.message ? `data:image/png;base64,${data.message}` : null,
      status: data.type || 'qr',
    };
  },

  async disconnect(creds: UserCredentials): Promise<{ status: string }> {
    const res = await fetch(endpoint(creds, 'logout'), { method: 'GET' });
    if (!res.ok) throw new Error(`Disconnect failed: ${res.status}`);
    return { status: 'disconnected' };
  },

  async sendMessage(creds: UserCredentials, phone: string, message: string): Promise<SendResult> {
    const chatId = formatPhone(phone) + '@c.us';
    try {
      const res = await fetch(endpoint(creds, 'sendMessage'), {
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

  startBulkSend(
    creds: UserCredentials,
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
        const result = await whatsappApi.sendMessage(creds, phone, message);
        if (result.success) progress.sent++;
        else progress.failed++;
        progress.results.push(result);
        onProgress?.({ ...progress });
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

  async getLastIncomingMessages(creds: UserCredentials): Promise<Reply[]> {
    const replies: Reply[] = [];
    try {
      const res = await fetch(endpoint(creds, 'receiveNotification'));
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

      if (data.receiptId) {
        await fetch(endpoint(creds, 'deleteNotification') + `/${data.receiptId}`, {
          method: 'DELETE',
        });
      }
    } catch {
      // Silently fail for polling
    }
    return replies;
  },
};
