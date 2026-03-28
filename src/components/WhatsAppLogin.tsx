import { useState, useEffect, useCallback } from 'react';
import { QrCode, Loader2, CheckCircle2, XCircle, Smartphone, Unplug, RefreshCw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { whatsappApi } from '@/lib/whatsappApi';
import { useWhatsAppInstance } from '@/hooks/useWhatsAppInstance';
import { toast } from 'sonner';

type Step = 'setup' | 'disconnected' | 'connecting' | 'qr' | 'connected' | 'error';

export default function WhatsAppLogin() {
  const { instance, credentials, loading: instanceLoading, saveInstance, updateStatus, removeInstance } = useWhatsAppInstance();
  const [step, setStep] = useState<Step>('setup');
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [polling, setPolling] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [formId, setFormId] = useState('');
  const [formToken, setFormToken] = useState('');
  const [formName, setFormName] = useState('');

  const checkStatus = useCallback(async () => {
    if (!credentials) return;
    try {
      const s = await whatsappApi.getStatus(credentials);
      if (s.status === 'connected') {
        setStep('connected');
        setQrImage(null);
        await updateStatus('connected');
      } else if (s.status === 'error') {
        setStep('error');
        setErrorMsg(s.message);
      } else {
        setStep('disconnected');
      }
    } catch {
      setStep('disconnected');
    }
  }, [credentials]);

  useEffect(() => {
    if (instanceLoading) return;
    if (!instance) {
      setStep('setup');
    } else {
      checkStatus();
    }
  }, [instance, instanceLoading, checkStatus]);

  const handleSaveCredentials = async () => {
    if (!formId || !formToken) { toast.error('Instance ID and Token are required'); return; }
    await saveInstance(formId, formToken, formName || undefined);
    setShowSetup(false);
    setFormId('');
    setFormToken('');
    setFormName('');
    toast.success('WhatsApp credentials saved');
  };

  const handleConnect = async () => {
    if (!credentials) return;
    setStep('connecting');
    try {
      const qr = await whatsappApi.getQrCode(credentials);
      if (qr.status === 'already_authorized') {
        setStep('connected');
        await updateStatus('connected');
        toast.success('WhatsApp already connected!');
        return;
      }
      if (qr.qr) {
        setStep('qr');
        setQrImage(qr.qr);
        setPolling(true);
        toast.info('Scan the QR code with WhatsApp');
      } else {
        setStep('error');
        setErrorMsg('Could not get QR code');
      }
    } catch (err: any) {
      setStep('error');
      setErrorMsg(err.message || 'Failed to connect');
    }
  };

  const handleDisconnect = async () => {
    if (!credentials) return;
    try {
      await whatsappApi.disconnect(credentials);
      await updateStatus('disconnected');
      setStep('disconnected');
      setQrImage(null);
      setPolling(false);
      toast.info('WhatsApp disconnected');
    } catch {
      toast.error('Failed to disconnect');
    }
  };

  useEffect(() => {
    if (!polling || !credentials) return;
    const interval = setInterval(async () => {
      try {
        const s = await whatsappApi.getStatus(credentials);
        if (s.status === 'connected') {
          setStep('connected');
          setQrImage(null);
          setPolling(false);
          await updateStatus('connected');
          toast.success('WhatsApp connected!');
          return;
        }
        const qr = await whatsappApi.getQrCode(credentials);
        if (qr.qr) setQrImage(qr.qr);
      } catch { /* keep polling */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [polling, credentials]);

  if (instanceLoading) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="rounded-xl border border-border bg-card shadow-md p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="rounded-xl border border-border bg-card shadow-md overflow-hidden">
        <div className="px-6 pt-6 pb-4 text-center border-b border-border">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Smartphone className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight">WhatsApp Connection</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {step === 'connected'
              ? 'Your WhatsApp account is linked'
              : instance
              ? 'Connect your WhatsApp to start sending'
              : 'Enter your Green API instance credentials'}
          </p>
        </div>

        <div className="p-6">
          {(step === 'setup' || showSetup) && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Enter your Green API Instance ID and API Token to connect.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Label (optional)</label>
                  <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g., My Business Line" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Instance ID</label>
                  <Input value={formId} onChange={e => setFormId(e.target.value)} placeholder="e.g., 7107563687" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">API Token</label>
                  <Input value={formToken} onChange={e => setFormToken(e.target.value)} placeholder="e.g., 7ee6aa32..." type="password" />
                </div>
              </div>
              <div className="flex gap-2">
                {instance && (
                  <Button variant="outline" className="flex-1" onClick={() => setShowSetup(false)}>Cancel</Button>
                )}
                <Button className="flex-1" onClick={handleSaveCredentials}>Save Credentials</Button>
              </div>
            </div>
          )}

          {step === 'disconnected' && !showSetup && (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
                <QrCode className="w-10 h-10 text-muted-foreground/60" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Ready to connect</p>
                <p className="text-xs text-muted-foreground">
                  Instance: {instance?.instance_name}
                </p>
              </div>
              <Button onClick={handleConnect} className="w-full">
                <QrCode className="w-4 h-4 mr-2" />
                Generate QR Code
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="flex-1" onClick={() => setShowSetup(true)}>
                  <Settings className="w-3.5 h-3.5 mr-1.5" />
                  Change Credentials
                </Button>
                <Button variant="ghost" size="sm" className="flex-1 text-destructive" onClick={async () => { await removeInstance(); toast.success('Instance removed'); }}>
                  Remove
                </Button>
              </div>
            </div>
          )}

          {step === 'connecting' && !showSetup && (
            <div className="text-center space-y-4 py-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
              <p className="text-sm font-medium">Fetching QR code…</p>
            </div>
          )}

          {step === 'qr' && qrImage && !showSetup && (
            <div className="text-center space-y-4">
              <div className="bg-white p-3 rounded-xl inline-block mx-auto shadow-sm border border-border">
                <img src={qrImage} alt="WhatsApp QR Code" className="w-56 h-56" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Scan with WhatsApp</p>
                <ol className="text-xs text-muted-foreground space-y-1 text-left max-w-[240px] mx-auto">
                  <li>1. Open WhatsApp on your phone</li>
                  <li>2. Tap <span className="font-medium text-foreground">Settings → Linked Devices</span></li>
                  <li>3. Tap <span className="font-medium text-foreground">Link a Device</span></li>
                  <li>4. Point your camera at this QR code</li>
                </ol>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Waiting for scan…
              </div>
            </div>
          )}

          {step === 'connected' && !showSetup && (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-success">Connected & Ready</p>
                <p className="text-xs text-muted-foreground">
                  Instance: {instance?.instance_name}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={checkStatus}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Refresh
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-destructive hover:text-destructive" onClick={handleDisconnect}>
                  <Unplug className="w-3.5 h-3.5 mr-1.5" />
                  Disconnect
                </Button>
              </div>
            </div>
          )}

          {step === 'error' && !showSetup && (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">Connection Failed</p>
                <p className="text-xs text-muted-foreground">{errorMsg}</p>
              </div>
              <Button onClick={handleConnect} variant="outline" className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
