import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { CheckCircle, XCircle, RefreshCw, Send } from 'lucide-react';
import { toast } from './ui/toast';
import api from '../api/axios';

interface WhatsAppStatus {
  success: boolean;
  whatsapp_service: 'connected' | 'disconnected';
  status?: any;
  error?: string;
  message?: string;
}

const WhatsAppStatusComponent: React.FC = () => {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Test message dari sistem jadwal sidang');

  const checkStatus = async () => {
    setLoading(true);
    try {
      const response = await api.get('/notifications/status');
      const result = response.data;
      setStatus(result);
    } catch (error) {
      console.error('Error checking WhatsApp status:', error);
      setStatus({
        success: false,
        whatsapp_service: 'disconnected',
        error: 'Failed to connect to backend service'
      });
    } finally {
      setLoading(false);
    }
  };

  const sendTestMessage = async () => {
    if (!testPhone || !testMessage) {
      toast.error('Nomor HP dan pesan harus diisi');
      return;
    }

    setTestLoading(true);
    try {
      const response = await api.post('/notifications/test', {
        phone: testPhone,
        message: testMessage
      });

      const result = response.data;

      if (result.success) {
        toast.success('Pesan test berhasil dikirim!');
      } else {
        toast.error(result.message || 'Gagal mengirim pesan test');
      }
    } catch (error) {
      console.error('Error sending test message:', error);
      toast.error('Terjadi kesalahan saat mengirim pesan test');
    } finally {
      setTestLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
    // Check status every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="max-w-2xl mx-auto mt-8 p-6 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold">Status WhatsApp Service</CardTitle>
          <Button
            onClick={checkStatus}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Display */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {status?.success ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            <span className="font-medium">Service Status:</span>
          </div>
          <Badge variant={status?.success ? "default" : "destructive"}>
            {status?.whatsapp_service === 'connected' ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>

        {/* Error Message */}
        {status?.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{status.error}</p>
            {status.message && (
              <p className="text-xs text-red-600 mt-1">{status.message}</p>
            )}
          </div>
        )}

        {/* Success Info */}
        {status?.success && status?.status && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-700">
              WhatsApp Web service is running and ready to send messages.
            </p>
          </div>
        )}

        {/* Test Message Section */}
        <div className="border-t pt-4">
          <h3 className="font-medium mb-3">Test Notifikasi</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Nomor HP (format: 6281234567890)
              </label>
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="6281234567890"
                className="w-full p-2 border border-gray-300 rounded-md"
                disabled={testLoading || !status?.success}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Pesan Test
              </label>
              <textarea
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Masukkan pesan test..."
                rows={3}
                className="w-full p-2 border border-gray-300 rounded-md"
                disabled={testLoading || !status?.success}
              />
            </div>
            <Button
              onClick={sendTestMessage}
              disabled={testLoading || !status?.success || !testPhone || !testMessage}
              className="w-full"
            >
              <Send className="w-4 h-4 mr-2" />
              {testLoading ? 'Mengirim...' : 'Kirim Test Message'}
            </Button>
          </div>
        </div>

        {/* Instructions */}
        <div className="border-t pt-4">
          <h3 className="font-medium mb-2">Instruksi Setup</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>1. Pastikan WhatsApp Web service berjalan di port 3000</p>
            <p>2. Jalankan: <code className="bg-gray-100 px-1 rounded">cd backend && node app-waweb.js</code></p>
            <p>3. Scan QR code untuk menghubungkan WhatsApp Web</p>
            <p>4. Status akan berubah menjadi "Connected" ketika siap</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WhatsAppStatusComponent;
