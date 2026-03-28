import { useState, useMemo } from 'react';
import { Search, Check, CheckCheck, Clock, XCircle, ChevronLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/store/appStore';

type ConversationSummary = {
  contactId: string;
  contactName: string;
  contactPhone: string;
  lastMessage: string;
  lastTimestamp: string;
  unreadCount: number;
  lastStatus: 'sent' | 'failed' | 'pending';
};

function StatusIcon({ status }: { status: 'sent' | 'failed' | 'pending' }) {
  switch (status) {
    case 'sent':
      return <CheckCheck className="w-4 h-4 text-blue-500 shrink-0" />;
    case 'failed':
      return <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />;
    case 'pending':
      return <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
  }
}

function formatTime(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const oneDay = 86400000;

  if (diff < oneDay && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < oneDay * 2) return 'Yesterday';
  if (diff < oneDay * 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function Messages() {
  const { logs } = useAppStore();
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState<string | null>(null);

  // Group logs by contact into conversations
  const conversations = useMemo<ConversationSummary[]>(() => {
    const map = new Map<string, ConversationSummary>();
    // Sort logs oldest first so last entry wins
    const sorted = [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    for (const log of sorted) {
      const existing = map.get(log.contactId);
      map.set(log.contactId, {
        contactId: log.contactId,
        contactName: log.contactName,
        contactPhone: log.contactPhone,
        lastMessage: log.message,
        lastTimestamp: log.timestamp,
        lastStatus: log.status,
        unreadCount: existing ? existing.unreadCount + (log.status === 'sent' ? 0 : 0) : 0,
      });
    }
    // Sort by most recent
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime()
    );
  }, [logs]);

  const filtered = conversations.filter(
    (c) =>
      !search ||
      c.contactName.toLowerCase().includes(search.toLowerCase()) ||
      c.contactPhone.includes(search)
  );

  // Messages for selected contact
  const contactMessages = useMemo(() => {
    if (!selectedContact) return [];
    return [...logs]
      .filter((l) => l.contactId === selectedContact)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [logs, selectedContact]);

  const selectedConvo = conversations.find((c) => c.contactId === selectedContact);

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
        <p className="text-sm text-muted-foreground mt-1">Track delivery status of every message</p>
      </div>

      <div className="flex-1 min-h-0 flex rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Chat List */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-border flex flex-col shrink-0 ${
            selectedContact ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search */}
          <div className="p-3 border-b border-border bg-muted/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                className="pl-9 h-9 bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                No conversations yet
              </div>
            ) : (
              filtered.map((convo) => (
                <button
                  key={convo.contactId}
                  onClick={() => setSelectedContact(convo.contactId)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-border/50 hover:bg-accent/50 ${
                    selectedContact === convo.contactId ? 'bg-accent' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-primary">
                      {convo.contactName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">{convo.contactName}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatTime(convo.lastTimestamp)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <StatusIcon status={convo.lastStatus} />
                      <span className="text-xs text-muted-foreground truncate">{convo.lastMessage}</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Detail */}
        <div
          className={`flex-1 flex flex-col ${
            selectedContact ? 'flex' : 'hidden md:flex'
          }`}
        >
          {selectedContact && selectedConvo ? (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
                <button
                  onClick={() => setSelectedContact(null)}
                  className="md:hidden p-1 rounded-md hover:bg-accent"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-primary">
                    {selectedConvo.contactName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-sm">{selectedConvo.contactName}</p>
                  <p className="text-xs text-muted-foreground">{selectedConvo.contactPhone}</p>
                </div>
              </div>

              {/* Messages */}
              <div
                className="flex-1 overflow-y-auto p-4 space-y-2"
                style={{
                  backgroundImage:
                    'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.04\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                }}
              >
                {contactMessages.map((msg) => (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[80%] bg-primary/10 rounded-lg rounded-tr-none px-3 py-2 shadow-sm">
                      <p className="text-sm">{msg.message}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <StatusIcon status={msg.status} />
                      </div>
                      {msg.error && (
                        <p className="text-[10px] text-destructive mt-1">{msg.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-2">
                <CheckCheck className="w-12 h-12 mx-auto text-muted-foreground/30" />
                <p className="text-sm">Select a conversation to view message status</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
