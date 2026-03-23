import { useState } from 'react';
import { BarChart3, Send, CheckCircle, MessageSquare, XCircle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import { useAppStore } from '@/store/appStore';

export default function LogsAnalytics() {
  const { logs, campaigns } = useAppStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const totalSent = logs.filter((l) => l.status === 'sent').length;
  const totalFailed = logs.filter((l) => l.status === 'failed').length;
  const totalPending = logs.filter((l) => l.status === 'pending').length;
  const campaignReplies = campaigns.reduce((s, c) => s + c.repliedCount, 0);
  const successRate = logs.length > 0 ? Math.round((totalSent / logs.length) * 100) : 0;

  const filtered = logs.filter((l) => {
    const matchesSearch = !search || l.contactName.toLowerCase().includes(search.toLowerCase()) || l.contactPhone.includes(search);
    const matchesStatus = !statusFilter || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Logs & Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Monitor delivery and campaign performance</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Sent" value={totalSent} icon={Send} color="success" />
        <StatCard label="Failed" value={totalFailed} icon={XCircle} color="destructive" />
        <StatCard label="Success Rate" value={`${successRate}%`} icon={CheckCircle} color="primary" />
        <StatCard label="Replies" value={campaignReplies} icon={MessageSquare} color="info" />
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search logs..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5">
          {[null, 'sent', 'failed', 'pending'].map((s) => (
            <button
              key={s ?? 'all'}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {s ? s : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Log table */}
      <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Message</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{l.contactName}</td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">{l.contactPhone}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[300px] truncate">{l.message}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={l.status} />
                    {l.error && <p className="text-xs text-destructive mt-0.5">{l.error}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums text-xs">
                    {new Date(l.timestamp).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted-foreground">No logs found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
