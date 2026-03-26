import { useState, useEffect } from 'react';
import { Plus, Trash2, UserPlus, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface AdminInstance {
  id: string;
  label: string;
  id_instance: string;
  api_token: string;
  assigned_to: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
}

export default function AdminInstances() {
  const { user } = useAuth();
  const [instances, setInstances] = useState<AdminInstance[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ label: '', id_instance: '', api_token: '' });

  useEffect(() => {
    if (!user) return;
    checkAdmin();
    fetchData();
  }, [user]);

  const checkAdmin = async () => {
    if (!user) return;
    const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    setIsAdmin(!!data);
    setLoading(false);
  };

  const fetchData = async () => {
    const [{ data: inst }, { data: profs }] = await Promise.all([
      supabase.from('admin_instances').select('*'),
      supabase.from('profiles').select('*'),
    ]);
    setInstances((inst as AdminInstance[]) || []);
    setProfiles((profs as Profile[]) || []);
  };

  const handleAdd = async () => {
    if (!form.label || !form.id_instance || !form.api_token) {
      toast.error('All fields required');
      return;
    }
    const { error } = await supabase.from('admin_instances').insert(form);
    if (error) { toast.error(error.message); return; }
    toast.success('Instance added');
    setForm({ label: '', id_instance: '', api_token: '' });
    setShowAdd(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('admin_instances').delete().eq('id', id);
    toast.success('Instance removed');
    fetchData();
  };

  const handleAssign = async (instanceId: string, userId: string | null) => {
    await supabase.from('admin_instances').update({ assigned_to: userId }).eq('id', instanceId);
    
    // If assigning, also save to user's whatsapp_instances table
    if (userId) {
      const inst = instances.find(i => i.id === instanceId);
      if (inst) {
        // Upsert into whatsapp_instances for the user
        const { error } = await supabase.from('whatsapp_instances').upsert({
          user_id: userId,
          id_instance: inst.id_instance,
          api_token: inst.api_token,
          instance_name: inst.label,
        }, { onConflict: 'user_id' });
        if (error) toast.error('Failed to assign: ' + error.message);
      }
    }
    
    toast.success(userId ? 'Instance assigned' : 'Instance unassigned');
    fetchData();
  };

  const getProfileName = (userId: string) => {
    const p = profiles.find(pr => pr.user_id === userId);
    return p?.display_name || userId.slice(0, 8);
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;

  if (!isAdmin) {
    return (
      <div className="text-center py-12 space-y-2">
        <Key className="w-12 h-12 text-muted-foreground mx-auto" />
        <h2 className="text-lg font-semibold">Admin Access Required</h2>
        <p className="text-sm text-muted-foreground">Only admins can manage WhatsApp instances.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Manage Instances</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create Green API instances and assign them to team members
          </p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Instance
        </Button>
      </div>

      {showAdd && (
        <div className="bg-card rounded-lg border border-border p-6 shadow-sm space-y-4 animate-fade-in">
          <h2 className="text-base font-semibold">New Green API Instance</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Label</label>
              <Input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="e.g., Sales Team" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Instance ID</label>
              <Input value={form.id_instance} onChange={e => setForm({ ...form, id_instance: e.target.value })} placeholder="e.g., 7107563687" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">API Token</label>
              <Input value={form.api_token} onChange={e => setForm({ ...form, api_token: e.target.value })} placeholder="API token" type="password" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add Instance</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {instances.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No instances yet. Add your first Green API instance above.
          </p>
        )}
        {instances.map(inst => (
          <div key={inst.id} className="bg-card rounded-lg border border-border p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">{inst.label}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">ID: {inst.id_instance}</p>
                {inst.assigned_to && (
                  <p className="text-xs text-primary mt-1">
                    Assigned to: {getProfileName(inst.assigned_to)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="text-xs border border-border rounded-md px-2 py-1.5 bg-background"
                  value={inst.assigned_to || ''}
                  onChange={e => handleAssign(inst.id, e.target.value || null)}
                >
                  <option value="">Unassigned</option>
                  {profiles.map(p => (
                    <option key={p.user_id} value={p.user_id}>
                      {p.display_name || p.user_id.slice(0, 8)}
                    </option>
                  ))}
                </select>
                <Button variant="outline" size="sm" onClick={() => handleDelete(inst.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Team Members */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Team Members</h2>
        <div className="space-y-2">
          {profiles.map(p => {
            const assigned = instances.find(i => i.assigned_to === p.user_id);
            return (
              <div key={p.id} className="flex items-center justify-between bg-card rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-medium">{p.display_name || 'No name'}</p>
                  <p className="text-xs text-muted-foreground">{p.user_id.slice(0, 8)}...</p>
                </div>
                <div className="text-xs">
                  {assigned ? (
                    <span className="text-primary font-medium">Instance: {assigned.label}</span>
                  ) : (
                    <span className="text-muted-foreground">No instance assigned</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
