import { create } from 'zustand';

export interface Contact {
  id: string;
  name: string;
  phone: string;
  tags: string[];
  blacklisted: boolean;
  status: 'pending' | 'sent' | 'failed' | 'replied';
  lastMessageAt?: string;
}

export interface WhatsAppAccount {
  id: string;
  name: string;
  phone: string;
  status: 'connected' | 'disconnected' | 'flagged';
  messagesSent: number;
}

export interface MessageTemplate {
  id: string;
  name: string;
  body: string;
  spinVariations: Record<string, string[]>;
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  templateId: string;
  contactListIds: string[];
  accountId: string;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'stopped';
  delayMin: number;
  delayMax: number;
  maxPerHour: number;
  maxPerDay: number;
  aiVariation: boolean;
  sentCount: number;
  failedCount: number;
  repliedCount: number;
  totalContacts: number;
  createdAt: string;
}

export interface LogEntry {
  id: string;
  campaignId: string;
  contactId: string;
  contactName: string;
  contactPhone: string;
  accountId: string;
  message: string;
  status: 'sent' | 'failed' | 'pending';
  timestamp: string;
  error?: string;
}

interface AppState {
  contacts: Contact[];
  accounts: WhatsAppAccount[];
  templates: MessageTemplate[];
  campaigns: Campaign[];
  logs: LogEntry[];
  addContacts: (contacts: Omit<Contact, 'id' | 'tags' | 'blacklisted' | 'status'>[]) => void;
  updateContact: (id: string, data: Partial<Contact>) => void;
  removeContact: (id: string) => void;
  tagContacts: (ids: string[], tag: string) => void;
  blacklistContact: (id: string, value: boolean) => void;
  addAccount: (account: Omit<WhatsAppAccount, 'id' | 'messagesSent'>) => void;
  updateAccount: (id: string, data: Partial<WhatsAppAccount>) => void;
  removeAccount: (id: string) => void;
  addTemplate: (template: Omit<MessageTemplate, 'id' | 'createdAt'>) => void;
  updateTemplate: (id: string, data: Partial<MessageTemplate>) => void;
  removeTemplate: (id: string) => void;
  addCampaign: (campaign: Omit<Campaign, 'id' | 'sentCount' | 'failedCount' | 'repliedCount' | 'createdAt'>) => void;
  updateCampaign: (id: string, data: Partial<Campaign>) => void;
  removeCampaign: (id: string) => void;
  addLog: (log: Omit<LogEntry, 'id'>) => void;
}

let idCounter = 0;
const uid = () => `${Date.now()}-${++idCounter}`;

// Seed data
const seedAccounts: WhatsAppAccount[] = [
  { id: 'acc-1', name: 'Main Business', phone: '+1 (555) 012-3456', status: 'connected', messagesSent: 1247 },
  { id: 'acc-2', name: 'Sales Team', phone: '+1 (555) 098-7654', status: 'connected', messagesSent: 832 },
  { id: 'acc-3', name: 'Support Line', phone: '+1 (555) 111-2233', status: 'disconnected', messagesSent: 156 },
];

const seedContacts: Contact[] = [
  { id: 'c-1', name: 'Sarah Mitchell', phone: '+1 (555) 234-5678', tags: ['leads'], blacklisted: false, status: 'sent' },
  { id: 'c-2', name: 'Marcus Chen', phone: '+1 (555) 345-6789', tags: ['clients'], blacklisted: false, status: 'replied' },
  { id: 'c-3', name: 'Amira Okafor', phone: '+44 7700 900123', tags: ['leads', 'vip'], blacklisted: false, status: 'pending' },
  { id: 'c-4', name: 'Daniel Reeves', phone: '+1 (555) 456-7890', tags: ['clients'], blacklisted: false, status: 'sent' },
  { id: 'c-5', name: 'Priya Sharma', phone: '+91 98765 43210', tags: ['leads'], blacklisted: true, status: 'failed' },
  { id: 'c-6', name: 'Luca Fontana', phone: '+39 333 456 7890', tags: [], blacklisted: false, status: 'pending' },
  { id: 'c-7', name: 'Kenji Watanabe', phone: '+81 90-1234-5678', tags: ['clients', 'vip'], blacklisted: false, status: 'sent' },
  { id: 'c-8', name: 'Elena Volkov', phone: '+7 916 123-45-67', tags: ['leads'], blacklisted: false, status: 'pending' },
];

const seedTemplates: MessageTemplate[] = [
  {
    id: 'tpl-1',
    name: 'Welcome Outreach',
    body: '{greeting} {name}! We noticed you recently showed interest in our services. We\'d love to help you get started. Would you be open to a quick chat this week?',
    spinVariations: { greeting: ['Hi', 'Hello', 'Hey', 'Good day'] },
    createdAt: '2025-03-18T10:00:00Z',
  },
  {
    id: 'tpl-2',
    name: 'Follow Up',
    body: '{greeting} {name}, just following up on our previous conversation. {closing}',
    spinVariations: { greeting: ['Hi', 'Hey'], closing: ['Let me know your thoughts!', 'Looking forward to hearing from you.', 'Any updates on your end?'] },
    createdAt: '2025-03-20T14:00:00Z',
  },
];

const seedCampaigns: Campaign[] = [
  {
    id: 'camp-1', name: 'March Outreach', templateId: 'tpl-1', contactListIds: [],
    accountId: 'acc-1', status: 'running', delayMin: 15, delayMax: 45,
    maxPerHour: 30, maxPerDay: 200, aiVariation: true,
    sentCount: 187, failedCount: 12, repliedCount: 34, totalContacts: 250,
    createdAt: '2025-03-15T09:00:00Z',
  },
  {
    id: 'camp-2', name: 'Client Follow-ups', templateId: 'tpl-2', contactListIds: [],
    accountId: 'acc-2', status: 'paused', delayMin: 30, delayMax: 90,
    maxPerHour: 15, maxPerDay: 100, aiVariation: false,
    sentCount: 64, failedCount: 3, repliedCount: 18, totalContacts: 120,
    createdAt: '2025-03-19T11:00:00Z',
  },
  {
    id: 'camp-3', name: 'New Leads April', templateId: 'tpl-1', contactListIds: [],
    accountId: 'acc-1', status: 'draft', delayMin: 10, delayMax: 30,
    maxPerHour: 40, maxPerDay: 300, aiVariation: true,
    sentCount: 0, failedCount: 0, repliedCount: 0, totalContacts: 0,
    createdAt: '2025-03-22T08:00:00Z',
  },
];

const seedLogs: LogEntry[] = [
  { id: 'log-1', campaignId: 'camp-1', contactId: 'c-1', contactName: 'Sarah Mitchell', contactPhone: '+1 (555) 234-5678', accountId: 'acc-1', message: 'Hello Sarah! We noticed you recently...', status: 'sent', timestamp: '2025-03-23T09:15:00Z' },
  { id: 'log-2', campaignId: 'camp-1', contactId: 'c-2', contactName: 'Marcus Chen', contactPhone: '+1 (555) 345-6789', accountId: 'acc-1', message: 'Hi Marcus! We noticed you recently...', status: 'sent', timestamp: '2025-03-23T09:15:32Z' },
  { id: 'log-3', campaignId: 'camp-1', contactId: 'c-5', contactName: 'Priya Sharma', contactPhone: '+91 98765 43210', accountId: 'acc-1', message: 'Hey Priya! We noticed you recently...', status: 'failed', timestamp: '2025-03-23T09:16:05Z', error: 'Number not on WhatsApp' },
  { id: 'log-4', campaignId: 'camp-2', contactId: 'c-4', contactName: 'Daniel Reeves', contactPhone: '+1 (555) 456-7890', accountId: 'acc-2', message: 'Hi Daniel, just following up...', status: 'sent', timestamp: '2025-03-23T09:20:00Z' },
  { id: 'log-5', campaignId: 'camp-1', contactId: 'c-7', contactName: 'Kenji Watanabe', contactPhone: '+81 90-1234-5678', accountId: 'acc-1', message: 'Good day Kenji! We noticed you...', status: 'sent', timestamp: '2025-03-23T09:21:12Z' },
];

export const useAppStore = create<AppState>((set) => ({
  contacts: seedContacts,
  accounts: seedAccounts,
  templates: seedTemplates,
  campaigns: seedCampaigns,
  logs: seedLogs,

  addContacts: (newContacts) =>
    set((s) => ({
      contacts: [
        ...s.contacts,
        ...newContacts.map((c) => ({ ...c, id: uid(), tags: [], blacklisted: false, status: 'pending' as const })),
      ],
    })),

  updateContact: (id, data) =>
    set((s) => ({ contacts: s.contacts.map((c) => (c.id === id ? { ...c, ...data } : c)) })),

  removeContact: (id) => set((s) => ({ contacts: s.contacts.filter((c) => c.id !== id) })),

  tagContacts: (ids, tag) =>
    set((s) => ({
      contacts: s.contacts.map((c) =>
        ids.includes(c.id) && !c.tags.includes(tag) ? { ...c, tags: [...c.tags, tag] } : c
      ),
    })),

  blacklistContact: (id, value) =>
    set((s) => ({ contacts: s.contacts.map((c) => (c.id === id ? { ...c, blacklisted: value } : c)) })),

  addAccount: (account) =>
    set((s) => ({ accounts: [...s.accounts, { ...account, id: uid(), messagesSent: 0 }] })),

  updateAccount: (id, data) =>
    set((s) => ({ accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...data } : a)) })),

  removeAccount: (id) => set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) })),

  addTemplate: (template) =>
    set((s) => ({ templates: [...s.templates, { ...template, id: uid(), createdAt: new Date().toISOString() }] })),

  updateTemplate: (id, data) =>
    set((s) => ({ templates: s.templates.map((t) => (t.id === id ? { ...t, ...data } : t)) })),

  removeTemplate: (id) => set((s) => ({ templates: s.templates.filter((t) => t.id !== id) })),

  addCampaign: (campaign) =>
    set((s) => ({
      campaigns: [
        ...s.campaigns,
        { ...campaign, id: uid(), sentCount: 0, failedCount: 0, repliedCount: 0, createdAt: new Date().toISOString() },
      ],
    })),

  updateCampaign: (id, data) =>
    set((s) => ({ campaigns: s.campaigns.map((c) => (c.id === id ? { ...c, ...data } : c)) })),

  removeCampaign: (id) => set((s) => ({ campaigns: s.campaigns.filter((c) => c.id !== id) })),

  addLog: (log) => set((s) => ({ logs: [{ ...log, id: uid() }, ...s.logs] })),
}));
