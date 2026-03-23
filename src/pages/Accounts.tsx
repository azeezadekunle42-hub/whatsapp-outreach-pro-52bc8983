import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Wifi, WifiOff, AlertTriangle, QrCode, Loader2, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import StatusBadge from '@/components/StatusBadge';
import { useAppStore } from '@/store/appStore';
import { whatsappApi, WhatsAppStatus } from '@/lib/whatsappApi';
import { toast } from 'sonner';

function QrCodePanel() {
  const [waStatus, setWaStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const status = await whatsappApi.getStatus();
      setWaStatus(status);
      return status;
    } catch (err) {
      console.error('Status check failed:', err);
      return null;
    }
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    try {
      await whatsappApi.connect();
      setPolling(true);
      toast.info('Initializing… QR code will appear shortly');
    } catch (err) {
      toast.error('Failed to connect to WhatsApp server');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await whatsappApi.disconnect();
      setWaStatus({ status: 'disconnected', message: '', qr: null });
      setPolling(false);
      toast.info('WhatsApp disconnected');
    } catch {
      toast.error('Failed to disconnect');
    }
  };

  // Poll for status while waiting for QR scan
  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(async () => {
      const s = await checkStatus();
      if (s?.status === 'connected') {
        setPolling(false);
        toast.success('WhatsApp connected!');
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [polling, checkStatus]);

  // Initial status check
  useEffect(() => {
    if (whatsappApi.isConfigured()) {
      checkStatus();
    }
  }, [checkStatus]);

  if (!whatsappApi.isConfigured()) {
    return (
      <div className="bg-card rounded-lg border border-border p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-base font-semibold">Server Not Configured</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Set <code className="text-xs bg-muted px-1.5 py-0.5 rounded">VITE_WHATSAPP_SERVER_URL</code> and{' '}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">VITE_WHATSAPP_API_KEY</code> to connect to your
          whatsapp-web.js server on Render.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold">WhatsApp Web Connection</h2>
        </div>
        <StatusBadge status={waStatus?.status === 'connected' ? 'connected' : waStatus?.status === 'qr_pending' ? 'disconnected' : 'disconnected'} />
      </div>

      {waStatus?.status === 'connected' && (
        <div className="space-y-3">
          <p className="text-sm text-success font-medium">✓ WhatsApp is connected and ready to send messages</p>
          <Button variant="outline" size="sm" onClick={handleDisconnect}>Disconnect</Button>
        </div>
      )}

      {waStatus?.status === 'qr_pending' && waStatus.qr && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Scan this QR code with WhatsApp on your phone:</p>
          <div className="flex justify-center">
            <img src={waStatus.qr} alt="WhatsApp QR Code" className="w-64 h-64 rounded-lg border border-border" />
          </div>
          <p className="text-xs text-muted-foreground text-center">Open WhatsApp → Settings → Linked Devices → Link a Device</p>
        </div>
      )}

      {(!waStatus || waStatus.status === 'disconnected' || waStatus.status === 'error') && (
        <div className="space-y-3">
          {waStatus?.status === 'error' && (
            <p className="text-sm text-destructive">{waStatus.message}</p>
          )}
          <Button onClick={handleConnect} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <QrCode className="w-4 h-4 mr-1.5" />}
            Connect via QR Code
          </Button>
        </div>
      )}

      {polling && waStatus?.status !== 'connected' && !waStatus?.qr && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Waiting for QR code…
        </div>
      )}
    </div>
  );
}

export default function Accounts() {
  const { accounts, addAccount, updateAccount, removeAccount } = useAppStore();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', status: 'disconnected' as const });

  const handleAdd = () => {
    if (!form.name || !form.phone) { toast.error('Name and phone required'); return; }
    addAccount(form);
    setForm({ name: '', phone: '', status: 'disconnected' });
    setShowAdd(false);
    toast.success('Account added');
  };

  const toggleConnection = (id: string, current: string) => {
    if (current === 'connected') {
      updateAccount(id, { status: 'disconnected' });
      toast.info('Account disconnected');
    } else {
      updateAccount(id, { status: 'connected' });
      toast.success('Account connected');
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <Wifi className="w-5 h-5 text-success" />;
      case 'flagged': return <AlertTriangle className="w-5 h-5 text-destructive" />;
      default: return <WifiOff className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage WhatsApp accounts for sending</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Account
        </Button>
      </div>

      {/* WhatsApp Web QR Connection */}
      <QrCodePanel />

      {showAdd && (
        <div className="bg-card rounded-lg border border-border p-6 shadow-sm space-y-4 animate-fade-in">
          <h2 className="text-base font-semibold">Add WhatsApp Account</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Account Name</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Business Line" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Phone Number</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 (555) 000-0000" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add Account</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((a) => (
          <div key={a.id} className="bg-card rounded-lg border border-border p-5 shadow-sm animate-fade-in">
            <div className="flex items-start justify-between mb-3">
              {statusIcon(a.status)}
              <StatusBadge status={a.status} />
            </div>
            <h3 className="text-sm font-semibold">{a.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">{a.phone}</p>
            <p className="text-xs text-muted-foreground mt-2">{a.messagesSent.toLocaleString()} messages sent</p>

            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => toggleConnection(a.id, a.status)}
              >
                {a.status === 'connected' ? 'Disconnect' : 'Connect'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => { removeAccount(a.id); toast.success('Account removed'); }}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
