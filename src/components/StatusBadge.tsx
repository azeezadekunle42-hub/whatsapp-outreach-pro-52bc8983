const statusStyles: Record<string, string> = {
  connected: 'bg-success/10 text-success',
  disconnected: 'bg-muted text-muted-foreground',
  flagged: 'bg-destructive/10 text-destructive',
  running: 'bg-success/10 text-success',
  paused: 'bg-warning/10 text-warning',
  completed: 'bg-info/10 text-info',
  stopped: 'bg-destructive/10 text-destructive',
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-success/10 text-success',
  pending: 'bg-warning/10 text-warning',
  failed: 'bg-destructive/10 text-destructive',
  replied: 'bg-info/10 text-info',
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyles[status] || 'bg-muted text-muted-foreground'}`}>
      {status}
    </span>
  );
}
