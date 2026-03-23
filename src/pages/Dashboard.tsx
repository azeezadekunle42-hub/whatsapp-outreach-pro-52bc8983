import { Send, Users, CheckCircle, MessageSquare, AlertTriangle, TrendingUp } from 'lucide-react';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import { useAppStore } from '@/store/appStore';

export default function Dashboard() {
  const { campaigns, contacts, logs, accounts } = useAppStore();

  const totalSent = campaigns.reduce((s, c) => s + c.sentCount, 0);
  const totalFailed = campaigns.reduce((s, c) => s + c.failedCount, 0);
  const totalReplied = campaigns.reduce((s, c) => s + c.repliedCount, 0);
  const successRate = totalSent > 0 ? Math.round(((totalSent - totalFailed) / totalSent) * 100) : 0;

  const recentLogs = logs.slice(0, 6);
  const activeCampaigns = campaigns.filter((c) => c.status === 'running' || c.status === 'paused');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your outreach activity</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Messages Sent" value={totalSent.toLocaleString()} icon={Send} color="primary" />
        <StatCard label="Success Rate" value={`${successRate}%`} icon={CheckCircle} color="success" />
        <StatCard label="Replies" value={totalReplied} icon={MessageSquare} color="info" />
        <StatCard label="Contacts" value={contacts.length} icon={Users} color="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active campaigns */}
        <div className="bg-card rounded-lg border border-border shadow-sm animate-fade-in">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold">Active Campaigns</h2>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="divide-y divide-border">
            {activeCampaigns.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted-foreground text-center">No active campaigns</p>
            ) : (
              activeCampaigns.map((c) => (
                <div key={c.id} className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {c.sentCount}/{c.totalContacts} sent
                    </p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-card rounded-lg border border-border shadow-sm animate-fade-in">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent Activity</h2>
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="divide-y divide-border">
            {recentLogs.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted-foreground text-center">No activity yet</p>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="px-5 py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{log.contactName}</p>
                    <p className="text-xs text-muted-foreground truncate">{log.contactPhone}</p>
                  </div>
                  <StatusBadge status={log.status} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Accounts overview */}
      <div className="bg-card rounded-lg border border-border shadow-sm animate-fade-in">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold">WhatsApp Accounts</h2>
        </div>
        <div className="divide-y divide-border">
          {accounts.map((a) => (
            <div key={a.id} className="px-5 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{a.name}</p>
                <p className="text-xs text-muted-foreground">{a.phone} · {a.messagesSent.toLocaleString()} messages</p>
              </div>
              <StatusBadge status={a.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
