import { useState } from 'react';
import { Plus, Trash2, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import StatusBadge from '@/components/StatusBadge';
import { useAppStore } from '@/store/appStore';
import { toast } from 'sonner';

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
      toast.success('Account connected (simulated)');
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

      {showAdd && (
        <div className="bg-card rounded-lg border border-border p-6 shadow-sm space-y-4 animate-fade-in">
          <h2 className="text-base font-semibold">Add WhatsApp Account</h2>
          <p className="text-sm text-muted-foreground">
            In production, this would open a WhatsApp Web QR code scanner. For now, enter account details manually.
          </p>
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
