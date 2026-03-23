import { useState, useRef } from 'react';
import { Upload, Trash2, Tag, ShieldOff, Search, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import StatusBadge from '@/components/StatusBadge';
import { useAppStore } from '@/store/appStore';
import { toast } from 'sonner';

export default function Contacts() {
  const { contacts, addContacts, removeContact, blacklistContact, tagContacts } = useAppStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tagInput, setTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  const allTags = Array.from(new Set(contacts.flatMap((c) => c.tags)));

  const filtered = contacts.filter((c) => {
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
    const matchesTag = !filterTag || c.tags.includes(filterTag);
    return matchesSearch && matchesTag;
  });

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet);

        const parsed = rows
          .map((r) => ({
            name: (r.name || r.Name || r.NAME || '').toString().trim(),
            phone: (r.phone || r.Phone || r.PHONE || r.phone_number || r['Phone Number'] || '').toString().trim(),
          }))
          .filter((r) => r.name && r.phone);

        if (parsed.length === 0) {
          toast.error('No valid contacts found. Ensure columns "name" and "phone" exist.');
          return;
        }

        addContacts(parsed);
        toast.success(`Imported ${parsed.length} contacts`);
      } catch {
        toast.error('Failed to parse file');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.id)));
    }
  };

  const handleTag = () => {
    if (!tagInput.trim()) return;
    tagContacts(Array.from(selected), tagInput.trim());
    setTagInput('');
    setShowTagInput(false);
    setSelected(new Set());
    toast.success('Tags applied');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-1">{contacts.length} total contacts</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Format: <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-[11px]">name, phone</code>
          </span>
          <input
            type="file"
            ref={fileRef}
            className="hidden"
            accept=".csv,.xlsx,.xls"
            onChange={handleUpload}
          />
          <Button onClick={() => fileRef.current?.click()}>
            <Upload className="w-4 h-4 mr-1.5" />
            Upload CSV/Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterTag(null)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${!filterTag ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            All
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setFilterTag(filterTag === t ? null : t)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${filterTag === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-accent rounded-lg px-4 py-2.5 animate-fade-in">
          <span className="text-sm font-medium text-accent-foreground">{selected.size} selected</span>
          <Button variant="ghost" size="sm" onClick={() => setShowTagInput(!showTagInput)}>
            <Tag className="w-3.5 h-3.5 mr-1" />
            Tag
          </Button>
          {showTagInput && (
            <div className="flex gap-1.5 items-center">
              <Input
                placeholder="Tag name..."
                className="h-8 w-32"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTag()}
              />
              <Button size="sm" onClick={handleTag}>Apply</Button>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={() => { selected.forEach((id) => removeContact(id)); setSelected(new Set()); }}>
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            <X className="w-3.5 h-3.5 mr-1" />
            Clear
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 w-10">
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} className="rounded" />
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tags</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((c) => (
                <tr key={c.id} className={`hover:bg-muted/30 transition-colors ${c.blacklisted ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="rounded" />
                  </td>
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">{c.phone}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {c.tags.map((t) => (
                        <span key={t} className="px-2 py-0.5 rounded-full text-xs bg-accent text-accent-foreground">{t}</span>
                      ))}
                      {c.blacklisted && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-destructive/10 text-destructive">blacklisted</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => blacklistContact(c.id, !c.blacklisted)}
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                        title={c.blacklisted ? 'Remove from blacklist' : 'Blacklist'}
                      >
                        <ShieldOff className={`w-3.5 h-3.5 ${c.blacklisted ? 'text-destructive' : 'text-muted-foreground'}`} />
                      </button>
                      <button
                        onClick={() => removeContact(c.id)}
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    No contacts found. Upload a CSV or Excel file to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
