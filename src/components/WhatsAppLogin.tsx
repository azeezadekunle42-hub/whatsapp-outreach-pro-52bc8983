import { useState, useEffect, useCallback } from 'react';
import { QrCode, Loader2, CheckCircle2, XCircle, Smartphone, Unplug, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { whatsappApi, WhatsAppStatus } from '@/lib/whatsappApi';
import { toast } from 'sonner';

type Step = 'not-configured' | 'disconnected' | 'connecting' | 'qr' | 'connected' | 'error';

export default function WhatsAppLogin() {
  const [step, setStep] = useState<Step>('disconnected');
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [polling, setPolling] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const s = await whatsappApi.getStatus();
      applyStatus(s);
      return s;
    } catch {
      return null;
    }
  }, []);

  const applyStatus = (s: WhatsAppStatus) => {
    if (s.status === 'connected') {
      setStep('connected');
      setQrImage(null);
    } else if (s.status === 'qr_pending' && s.qr) {
      setStep('qr');
      setQrImage(s.qr);
    } else if (s.status === 'error') {
      setStep('error');
      setErrorMsg(s.message);
    } else {
      setStep('disconnected');
    }
  };

  const handleConnect = async () => {
    setStep('connecting');
    try {
      await whatsappApi.connect();
      setPolling(true);
      toast.info('Initializing session…');
    } catch {
      setStep('error');
      setErrorMsg('Could not reach the WhatsApp server. Check your server URL.');
      toast.error('Connection failed');
    }
  };

  const handleDisconnect = async () => {
    try {
      await whatsappApi.disconnect();
      setStep('disconnected');
      setQrImage(null);
      setPolling(false);
      toast.info('WhatsApp disconnected');
    } catch {
      toast.error('Failed to disconnect');
    }
  };

  // Poll while waiting for QR scan
  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(async () => {
      const s = await checkStatus();
      if (s?.status === 'connected') {
        setPolling(false);
        toast.success('WhatsApp connected!');
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [polling, checkStatus]);

  // Initial check
  useEffect(() => {
    if (!whatsappApi.isConfigured()) {
      setStep('not-configured');
      return;
    }
    checkStatus();
  }, [checkStatus]);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="rounded-xl border border-border bg-card shadow-md overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center border-b border-border">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Smartphone className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight">WhatsApp Sign In</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {step === 'connected'
              ? 'Your WhatsApp account is linked'
              : 'Link your WhatsApp to start sending messages'}
          </p>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Not Configured */}
          {step === 'not-configured' && (
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                <XCircle className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Server not configured. Set your{' '}
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">VITE_WHATSAPP_SERVER_URL</code>{' '}
                and{' '}
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">VITE_WHATSAPP_API_KEY</code>{' '}
                environment variables.
              </p>
            </div>
          )}

          {/* Disconnected */}
          {step === 'disconnected' && (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
                <QrCode className="w-10 h-10 text-muted-foreground/60" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Ready to connect</p>
                <p className="text-xs text-muted-foreground">
                  Click below to generate a QR code, then scan it with your phone
                </p>
              </div>
              <Button onClick={handleConnect} className="w-full">
                <QrCode className="w-4 h-4 mr-2" />
                Generate QR Code
              </Button>
            </div>
          )}

          {/* Connecting / Loading */}
          {step === 'connecting' && (
            <div className="text-center space-y-4 py-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Starting session…</p>
                <p className="text-xs text-muted-foreground">
                  This may take a few seconds
                </p>
              </div>
            </div>
          )}

          {/* QR Code */}
          {step === 'qr' && qrImage && (
            <div className="text-center space-y-4">
              <div className="bg-white p-3 rounded-xl inline-block mx-auto shadow-sm border border-border">
                <img
                  src={qrImage}
                  alt="WhatsApp QR Code"
                  className="w-56 h-56"
                />
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

          {/* Connected */}
          {step === 'connected' && (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-success">Connected & Ready</p>
                <p className="text-xs text-muted-foreground">
                  Your WhatsApp account is linked and ready to send messages
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => checkStatus()}>
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

          {/* Error */}
          {step === 'error' && (
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
