import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { CheckCircle, XCircle, RefreshCw, Send, Smartphone, MessageCircle, Clock, Loader2 } from 'lucide-react';
import { toast } from './ui/toast';

interface WhatsAppStatus {
  success: boolean;
  whatsapp_ready: boolean;
  whatsapp_service: 'connected' | 'disconnected';
  message: string;
}

interface QRCodeResponse {
  success: boolean;
  qr?: string;
  message: string;
}

interface TestResult {
  success: boolean;
  message: string;
  phone?: string;
  error?: string;
  timestamp: string;
}

const WhatsAppSetupComponent: React.FC = () => {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('🧪 Test notifikasi dari Sistem Jadwal Sidang');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Check WhatsApp status
  const checkStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/whatsapp/status');
      const result = await response.json();
      setStatus(result);
      
      // If not ready and auto-refresh enabled, get QR code
      if (!result.whatsapp_ready && autoRefresh) {
        await getQRCode();
      }
    } catch (error) {
      console.error('Error checking WhatsApp status:', error);
      setStatus({
        success: false,
        whatsapp_ready: false,
        whatsapp_service: 'disconnected',
        message: 'Failed to connect to backend service'
      });
    } finally {
      setLoading(false);
    }
  };

  // Get QR Code for scanning
  const getQRCode = async () => {
    setQrLoading(true);
    try {
      const response = await fetch('http://localhost:5000/whatsapp/register');
      const result: QRCodeResponse = await response.json();
      
      if (result.success && result.qr) {
        setQrCode(result.qr);
      } else {
        setQrCode(null);
        if (result.message.includes('already active')) {
          toast.success('WhatsApp sudah terhubung!');
          checkStatus(); // Refresh status
        }
      }
    } catch (error) {
      console.error('Error getting QR code:', error);
      toast.error('Gagal mendapatkan QR code');
    } finally {
      setQrLoading(false);
    }
  };

  // Send test notification
  const sendTestNotification = async () => {
    if (!testPhone || !testMessage) {
      toast.error('Nomor HP dan pesan harus diisi');
      return;
    }

    setTestLoading(true);
    setTestResult(null);
    
    try {
      const response = await fetch('http://localhost:5000/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: testPhone,
          message: testMessage
        })
      });

      const result: TestResult = await response.json();
      setTestResult(result);

      if (result.success) {
        toast.success(`Pesan test berhasil dikirim ke ${result.phone}!`);
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

  // Auto-refresh status and QR code
  useEffect(() => {
    checkStatus();
    
    const statusInterval = setInterval(() => {
      checkStatus();
    }, 5000); // Check every 5 seconds

    const qrInterval = setInterval(() => {
      if (!status?.whatsapp_ready && autoRefresh) {
        getQRCode();
      }
    }, 30000); // Refresh QR every 30 seconds

    return () => {
      clearInterval(statusInterval);
      clearInterval(qrInterval);
    };
  }, [status?.whatsapp_ready, autoRefresh]);

  const getStatusIcon = () => {
    if (loading) return <Loader2 className="w-5 h-5 animate-spin" />;
    if (!status) return <XCircle className="w-5 h-5 text-gray-500" />;
    return status.whatsapp_ready ? 
      <CheckCircle className="w-5 h-5 text-green-500" /> : 
      <XCircle className="w-5 h-5 text-red-500" />;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header dengan Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold flex items-center gap-3">
              <MessageCircle className="w-8 h-8 text-green-600" />
              WhatsApp Integration Setup
            </CardTitle>
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
        <CardContent>
          <div className="flex items-center gap-4">
            {getStatusIcon()}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Status:</span>
                <Badge variant={status?.whatsapp_ready ? "default" : "destructive"}>
                  {status?.whatsapp_ready ? '🟢 Ready' : '🔴 Not Connected'}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {status?.message || 'Checking connection...'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QR Code Section - Only show if not connected */}
      {!status?.whatsapp_ready && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-6 h-6" />
              Step 1: Scan QR Code dengan WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="bg-white p-6 rounded-lg border-2 border-dashed border-gray-300">
              {qrLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <p className="text-gray-600">Generating QR Code...</p>
                </div>
              ) : qrCode ? (
                <div className="space-y-4">
                  <img 
                    src={qrCode} 
                    alt="WhatsApp QR Code"
                    className="mx-auto max-w-xs border rounded-lg shadow-sm"
                  />
                  <div className="text-sm text-gray-600">
                    <p className="font-medium">Instruksi:</p>
                    <ol className="list-decimal list-inside space-y-1 mt-2 text-left max-w-md mx-auto">
                      <li>Buka WhatsApp di ponsel Anda</li>
                      <li>Tap Menu (⋮) atau Settings</li>
                      <li>Pilih "Linked Devices"</li>
                      <li>Tap "Link a Device"</li>
                      <li>Scan QR code di atas</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <div className="py-12">
                  <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">QR Code tidak tersedia</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-center gap-2">
              <Button onClick={getQRCode} disabled={qrLoading} variant="outline">
                <RefreshCw className={`w-4 h-4 mr-2 ${qrLoading ? 'animate-spin' : ''}`} />
                Refresh QR Code
              </Button>
              <Button
                onClick={() => setAutoRefresh(!autoRefresh)}
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
              >
                <Clock className="w-4 h-4 mr-2" />
                Auto Refresh: {autoRefresh ? 'ON' : 'OFF'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Notification Section - Only show if connected */}
      {status?.whatsapp_ready && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-6 h-6" />
              Step 2: Test Notification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Nomor HP (08xxx atau 628xxx)
                </label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="0895341112220 atau 628123456789"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={testLoading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format akan otomatis dikonversi ke 628xxx
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Pesan Test
                </label>
                <textarea
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Masukkan pesan test..."
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={testLoading}
                />
              </div>
            </div>

            <Button
              onClick={sendTestNotification}
              disabled={testLoading || !testPhone || !testMessage}
              className="w-full"
              size="lg"
            >
              {testLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {testLoading ? 'Mengirim...' : 'Kirim Test Notification'}
            </Button>

            {/* Test Result */}
            {testResult && (
              <div className={`p-4 rounded-md border ${
                testResult.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {testResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className={`font-medium ${
                    testResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {testResult.success ? 'Test Berhasil!' : 'Test Gagal'}
                  </span>
                </div>
                <p className={`text-sm ${
                  testResult.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {testResult.message}
                </p>
                {testResult.phone && (
                  <p className="text-xs text-gray-600 mt-1">
                    Dikirim ke: {testResult.phone} • {new Date(testResult.timestamp).toLocaleString('id-ID')}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {status?.whatsapp_ready && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
              <h3 className="text-lg font-semibold text-green-800">
                🎉 WhatsApp Integration Ready!
              </h3>
              <p className="text-green-700">
                Sistem siap mengirim notifikasi WhatsApp untuk sidang mahasiswa.
              </p>
              <div className="text-sm text-green-600 space-y-1">
                <p>✅ Notifikasi untuk dosen moderator, pembimbing, dan penguji</p>
                <p>✅ Format nomor HP otomatis (08xxx → 628xxx)</p>
                <p>✅ Rate limiting untuk mencegah spam</p>
                <p>✅ Template pesan profesional dalam bahasa Indonesia</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Development Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-blue-800">
            📋 Development Information
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-blue-700 space-y-1">
          <p><strong>Backend:</strong> http://localhost:5000 (Unified server dengan WhatsApp client)</p>
          <p><strong>Session:</strong> LocalAuth dengan clientId "session-whatsapp"</p>
          <p><strong>Rate Limiting:</strong> 2.5 detik delay antar pesan</p>
          <p><strong>Test Phones:</strong> {['0895341112220', '083832108514', '081230929260'].join(', ')}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppSetupComponent;
