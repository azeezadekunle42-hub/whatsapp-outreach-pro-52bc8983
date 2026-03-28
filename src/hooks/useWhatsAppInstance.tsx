import { useState, useEffect, useCallback } from 'react';
import type { UserCredentials } from '@/lib/whatsappApi';

export interface WhatsAppInstance {
  instance_name: string;
  id_instance: string;
  api_token: string;
  status: string;
}

const STORAGE_KEY = 'whatsapp_instance';

function loadInstance(): WhatsAppInstance | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useWhatsAppInstance() {
  const [instance, setInstance] = useState<WhatsAppInstance | null>(loadInstance);
  const [loading] = useState(false);

  const credentials: UserCredentials | null = instance
    ? { idInstance: instance.id_instance, apiToken: instance.api_token }
    : null;

  const saveInstance = async (idInstance: string, apiToken: string, name?: string) => {
    const inst: WhatsAppInstance = {
      id_instance: idInstance,
      api_token: apiToken,
      instance_name: name || 'My WhatsApp',
      status: 'disconnected',
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inst));
    setInstance(inst);
  };

  const updateStatus = async (status: string) => {
    if (!instance) return;
    const updated = { ...instance, status };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setInstance(updated);
  };

  const removeInstance = async () => {
    localStorage.removeItem(STORAGE_KEY);
    setInstance(null);
  };

  const refetch = useCallback(() => {
    setInstance(loadInstance());
  }, []);

  return { instance, credentials, loading, saveInstance, updateStatus, removeInstance, refetch };
}
