import { useState } from 'react';
import { Plus, Trash2, Copy, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/store/appStore';
import { toast } from 'sonner';

export default function Templates() {
  const { templates, addTemplate, updateTemplate, removeTemplate } = useAppStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', body: '', spinVariations: {} as Record<string, string[]> });
  const [spinKey, setSpinKey] = useState('');
  const [spinValues, setSpinValues] = useState('');

  const handleCreate = () => {
    if (!form.name || !form.body) { toast.error('Name and message body required'); return; }
    addTemplate(form);
    setForm({ name: '', body: '', spinVariations: {} });
    setShowCreate(false);
    toast.success('Template created');
  };

  const addSpin = () => {
    if (!spinKey.trim() || !spinValues.trim()) return;
    const values = spinValues.split(',').map((s) => s.trim()).filter(Boolean);
    setForm({ ...form, spinVariations: { ...form.spinVariations, [spinKey.trim()]: values } });
    setSpinKey('');
    setSpinValues('');
  };

  const removeSpin = (key: string) => {
    const next = { ...form.spinVariations };
    delete next[key];
    setForm({ ...form, spinVariations: next });
  };

  const previewMessage = (body: string, spins: Record<string, string[]>) => {
    let result = body;
    Object.entries(spins).forEach(([key, values]) => {
      const random = values[Math.floor(Math.random() * values.length)];
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), random);
    });
    result = result.replace(/\{name\}/g, 'Sarah');
    return result;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">Reusable message templates with spin variations</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="w-4 h-4 mr-1.5" />
          New Template
        </Button>
      </div>

      {showCreate && (
        <div className="bg-card rounded-lg border border-border p-6 shadow-sm space-y-4 animate-fade-in">
          <h2 className="text-base font-semibold">Create Template</h2>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Template Name</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Welcome Message" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Message Body</label>
            <Textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Use {name} for contact name, and {greeting} etc. for spin variables"
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">Variables: {'{name}'} is replaced with contact name. Add spin variables below.</p>
          </div>

          {/* Spin variations */}
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <Wand2 className="w-4 h-4 text-muted-foreground" />
              Spin Variations
            </h3>
            {Object.entries(form.spinVariations).map(([key, values]) => (
              <div key={key} className="flex items-center gap-2 mb-2 bg-muted/50 rounded-md px-3 py-2">
                <code className="text-xs font-mono text-primary">{`{${key}}`}</code>
                <span className="text-xs text-muted-foreground">{values.join(' / ')}</span>
                <button onClick={() => removeSpin(key)} className="ml-auto p-1 hover:bg-muted rounded">
                  <Trash2 className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            ))}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Variable name</label>
                <Input value={spinKey} onChange={(e) => setSpinKey(e.target.value)} placeholder="greeting" className="h-8" />
              </div>
              <div className="flex-[2]">
                <label className="text-xs text-muted-foreground mb-1 block">Values (comma-separated)</label>
                <Input value={spinValues} onChange={(e) => setSpinValues(e.target.value)} placeholder="Hi, Hello, Hey, Good day" className="h-8" />
              </div>
              <Button size="sm" variant="outline" onClick={addSpin}>Add</Button>
            </div>
          </div>

          {/* Preview */}
          {form.body && (
            <div className="bg-muted/40 rounded-lg p-4 border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Preview:</p>
              <p className="text-sm">{previewMessage(form.body, form.spinVariations)}</p>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Save Template</Button>
          </div>
        </div>
      )}

      {/* Template list */}
      <div className="space-y-3">
        {templates.map((t) => (
          <div key={t.id} className="bg-card rounded-lg border border-border p-5 shadow-sm animate-fade-in">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-semibold">{t.name}</h3>
              <div className="flex gap-1">
                <button
                  onClick={() => { navigator.clipboard.writeText(t.body); toast.success('Copied'); }}
                  className="p-1.5 rounded hover:bg-muted transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => removeTemplate(t.id)} className="p-1.5 rounded hover:bg-muted transition-colors">
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{t.body}</p>
            {Object.keys(t.spinVariations).length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {Object.entries(t.spinVariations).map(([key, values]) => (
                  <span key={key} className="px-2.5 py-1 rounded-md text-xs bg-accent text-accent-foreground">
                    <code>{`{${key}}`}</code>: {values.join(' / ')}
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Created {new Date(t.createdAt).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
