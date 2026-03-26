import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { UserCredentials } from '@/lib/whatsappApi';

export interface WhatsAppInstance {
  id: string;
  user_id: string;
  instance_name: string;
  id_instance: string;
  api_token: string;
  phone_number: string | null;
  status: string;
}

export function useWhatsAppInstance() {
  const { user } = useAuth();
  const [instance, setInstance] = useState<WhatsAppInstance | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInstance = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    setInstance(data as WhatsAppInstance | null);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchInstance(); }, [fetchInstance]);

  const credentials: UserCredentials | null = instance
    ? { idInstance: instance.id_instance, apiToken: instance.api_token }
    : null;

  const saveInstance = async (idInstance: string, apiToken: string, name?: string) => {
    if (!user) return;
    if (instance) {
      await supabase
        .from('whatsapp_instances')
        .update({ id_instance: idInstance, api_token: apiToken, instance_name: name || instance.instance_name })
        .eq('id', instance.id);
    } else {
      await supabase
        .from('whatsapp_instances')
        .insert({ user_id: user.id, id_instance: idInstance, api_token: apiToken, instance_name: name || 'My WhatsApp' });
    }
    await fetchInstance();
  };

  const updateStatus = async (status: string, phoneNumber?: string) => {
    if (!instance) return;
    const updates: Record<string, string> = { status };
    if (phoneNumber) updates.phone_number = phoneNumber;
    await supabase.from('whatsapp_instances').update(updates).eq('id', instance.id);
    await fetchInstance();
  };

  const removeInstance = async () => {
    if (!instance) return;
    await supabase.from('whatsapp_instances').delete().eq('id', instance.id);
    setInstance(null);
  };

  return { instance, credentials, loading, saveInstance, updateStatus, removeInstance, refetch: fetchInstance };
}
