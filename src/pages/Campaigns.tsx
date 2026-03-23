import { useState } from 'react';
import { Play, Pause, Square, Plus, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import StatusBadge from '@/components/StatusBadge';
import { useAppStore } from '@/store/appStore';
import { toast } from 'sonner';

export default function Campaigns() {
  const { campaigns, templates, accounts, updateCampaign, addCampaign } = useAppStore();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '',
    templateId: '',
    accountId: '',
    delayMin: 15,
    delayMax: 45,
    maxPerHour: 30,
    maxPerDay: 200,
    aiVariation: false,
  });

  const handleCreate = () => {
    if (!form.name || !form.templateId || !form.accountId) {
      toast.error('Fill in all required fields');
      return;
    }
    addCampaign({ ...form, status: 'draft', contactListIds: [], totalContacts: 0 });
    setShowCreate(false);
    setForm({ name: '', templateId: '', accountId: '', delayMin: 15, delayMax: 45, maxPerHour: 30, maxPerDay: 200, aiVariation: false });
    toast.success('Campaign created');
  };

  const toggleStatus = (id: string, current: string) => {
    if (current === 'running') updateCampaign(id, { status: 'paused' });
    else if (current === 'paused' || current === 'draft') updateCampaign(id, { status: 'running' });
    else if (current === 'stopped') updateCampaign(id, { status: 'draft' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">{campaigns.length} campaigns</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="w-4 h-4 mr-1.5" />
          New Campaign
        </Button>
      </div>

      {showCreate && (
        <div className="bg-card rounded-lg border border-border p-6 shadow-sm space-y-4 animate-fade-in">
          <h2 className="text-base font-semibold">Create Campaign</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Campaign Name *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., April Outreach" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Message Template *</label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.templateId}
                onChange={(e) => setForm({ ...form, templateId: e.target.value })}
              >
                <option value="">Select template</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Sending Account *</label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.accountId}
                onChange={(e) => setForm({ ...form, accountId: e.target.value })}
              >
                <option value="">Select account</option>
                {accounts.filter((a) => a.status === 'connected').map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.aiVariation}
                  onChange={(e) => setForm({ ...form, aiVariation: e.target.checked })}
                  className="rounded"
                />
                <Zap className="w-4 h-4 text-warning" />
                AI Message Variation
              </label>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Timing Controls
            </h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Min Delay (sec)</label>
                <Input type="number" value={form.delayMin} onChange={(e) => setForm({ ...form, delayMin: +e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Max Delay (sec)</label>
                <Input type="number" value={form.delayMax} onChange={(e) => setForm({ ...form, delayMax: +e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Max per Hour</label>
                <Input type="number" value={form.maxPerHour} onChange={(e) => setForm({ ...form, maxPerHour: +e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Max per Day</label>
                <Input type="number" value={form.maxPerDay} onChange={(e) => setForm({ ...form, maxPerDay: +e.target.value })} />
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Campaign</Button>
          </div>
        </div>
      )}

      {/* Campaign list */}
      <div className="space-y-3">
        {campaigns.map((c) => {
          const template = templates.find((t) => t.id === c.templateId);
          const account = accounts.find((a) => a.id === c.accountId);
          const progress = c.totalContacts > 0 ? Math.round((c.sentCount / c.totalContacts) * 100) : 0;

          return (
            <div key={c.id} className="bg-card rounded-lg border border-border p-5 shadow-sm animate-fade-in">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-sm font-semibold">{c.name}</h3>
                    <StatusBadge status={c.status} />
                    {c.aiVariation && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-warning/10 text-warning font-medium">
                        <Zap className="w-3 h-3" /> AI
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Template: {template?.name || '—'} · Account: {account?.name || '—'} · Delay: {c.delayMin}–{c.delayMax}s
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {c.status !== 'completed' && c.status !== 'stopped' && (
                    <Button variant="outline" size="sm" onClick={() => toggleStatus(c.id, c.status)}>
                      {c.status === 'running' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </Button>
                  )}
                  {(c.status === 'running' || c.status === 'paused') && (
                    <Button variant="outline" size="sm" onClick={() => updateCampaign(c.id, { status: 'stopped' })}>
                      <Square className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">{progress}%</span>
              </div>

              <div className="flex gap-6 mt-3 text-xs text-muted-foreground">
                <span>Sent: <strong className="text-foreground">{c.sentCount}</strong></span>
                <span>Failed: <strong className="text-destructive">{c.failedCount}</strong></span>
                <span>Replied: <strong className="text-info">{c.repliedCount}</strong></span>
                <span>Total: <strong className="text-foreground">{c.totalContacts}</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
