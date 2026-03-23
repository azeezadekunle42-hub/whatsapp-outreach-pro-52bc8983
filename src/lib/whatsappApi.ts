// WhatsApp server API client
// Connects to the whatsapp-web.js server running on Render

const getServerUrl = () => {
  const url = import.meta.env.VITE_WHATSAPP_SERVER_URL;
  if (!url) throw new Error('VITE_WHATSAPP_SERVER_URL is not configured');
  return url.replace(/\/$/, '');
};

const getApiKey = () => {
  const key = import.meta.env.VITE_WHATSAPP_API_KEY;
  if (!key) throw new Error('VITE_WHATSAPP_API_KEY is not configured');
  return key;
};

const headers = () => ({
  'Content-Type': 'application/json',
  'x-api-key': getApiKey(),
});

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

export const whatsappApi = {
  async getStatus(): Promise<WhatsAppStatus> {
    const res = await fetch(`${getServerUrl()}/api/status`, { headers: headers() });
    if (!res.ok) throw new Error(`Status check failed: ${res.status}`);
    return res.json();
  },

  async connect(): Promise<{ status: string; message?: string }> {
    const res = await fetch(`${getServerUrl()}/api/connect`, {
      method: 'POST',
      headers: headers(),
    });
    if (!res.ok) throw new Error(`Connect failed: ${res.status}`);
    return res.json();
  },

  async disconnect(): Promise<{ status: string }> {
    const res = await fetch(`${getServerUrl()}/api/disconnect`, {
      method: 'POST',
      headers: headers(),
    });
    if (!res.ok) throw new Error(`Disconnect failed: ${res.status}`);
    return res.json();
  },

  async sendMessage(phone: string, message: string): Promise<SendResult> {
    const res = await fetch(`${getServerUrl()}/api/send`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ phone, message }),
    });
    if (!res.ok) throw new Error(`Send failed: ${res.status}`);
    return res.json();
  },

  async sendBulk(data: BulkSendRequest): Promise<{ batchId: string; total: number }> {
    const res = await fetch(`${getServerUrl()}/api/send-bulk`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Bulk send failed: ${res.status}`);
    return res.json();
  },

  async getBulkProgress(batchId: string): Promise<BulkProgress> {
    const res = await fetch(`${getServerUrl()}/api/send-bulk/${batchId}`, {
      headers: headers(),
    });
    if (!res.ok) throw new Error(`Progress check failed: ${res.status}`);
    return res.json();
  },

  async getReplies(since?: string): Promise<{ replies: Reply[] }> {
    const params = since ? `?since=${since}` : '';
    const res = await fetch(`${getServerUrl()}/api/replies${params}`, {
      headers: headers(),
    });
    if (!res.ok) throw new Error(`Replies fetch failed: ${res.status}`);
    return res.json();
  },

  isConfigured(): boolean {
    try {
      getServerUrl();
      getApiKey();
      return true;
    } catch {
      return false;
    }
  },
};
