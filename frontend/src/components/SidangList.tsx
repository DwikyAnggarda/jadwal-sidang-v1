import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Card } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { MessageCircle } from 'lucide-react';
import { toast } from './ui/toast';

interface Sidang {
  id: number;
  mahasiswa_nama: string;
  mahasiswa_departemen: string;
  pembimbing_1_nama: string;
  pembimbing_2_nama: string;
  penguji_1_nama: string;
  penguji_2_nama: string;
  moderator_nama: string;
  room: string;
  tanggal_sidang: string;
  jam_mulai_sidang?: string;
  jam_mulai_final?: string;
  jam_selesai_final?: string;
  durasi_sidang?: number;
}

const SidangList: React.FC = () => {
  const [data, setData] = useState<Sidang[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notificationLoading, setNotificationLoading] = useState<number | null>(null);

  useEffect(() => {
    api.get<Sidang[]>('/sidang')
      .then(res => setData(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Send notification for a specific sidang
  const handleSendNotification = async (sidangId: number, mahasiswaName: string) => {
    setNotificationLoading(sidangId);
    try {
      const response = await fetch(`http://localhost:5000/notifications/sidang/${sidangId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        const { summary } = result;
        toast.success(`Notifikasi untuk ${mahasiswaName}: ${summary.sent} berhasil, ${summary.failed} gagal dari ${summary.total} total`);
      } else {
        toast.error(result.message || 'Gagal mengirim notifikasi');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Terjadi kesalahan saat mengirim notifikasi');
    } finally {
      setNotificationLoading(null);
    }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (error) return (
    <Alert variant="destructive" className="max-w-2xl mx-auto my-8">
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );

  return (
    <Card className="max-w-6xl mx-auto mt-8 p-6 shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">Daftar Sidang</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full border bg-white rounded-lg text-sm">
          <thead className="bg-neutral-100">
            <tr>
              <th className="border px-3 py-2">Tanggal</th>
              <th className="border px-3 py-2">Ruangan</th>
              <th className="border px-3 py-2">Waktu</th>
              <th className="border px-3 py-2">Nama Mahasiswa</th>
              <th className="border px-3 py-2">Departemen</th>
              <th className="border px-3 py-2">Moderator</th>
              <th className="border px-3 py-2">Pembimbing 1</th>
              <th className="border px-3 py-2">Pembimbing 2</th>
              <th className="border px-3 py-2">Penguji 1</th>
              <th className="border px-3 py-2">Penguji 2</th>
              <th className="border px-3 py-2">Aksi</th>
              {/* <th className="border px-3 py-2">Durasi (menit)</th> */}
            </tr>
          </thead>
          <tbody>
            {data.map((s) => (
              <tr key={s.id} className="hover:bg-neutral-50 transition">
                <td className="border px-3 py-2">{s.tanggal_sidang}</td>
                <td className="border px-3 py-2">{s.room}</td>
                <td className="border px-3 py-2">{s.jam_mulai_final + ' - ' + s.jam_selesai_final}</td>
                <td className="border px-3 py-2 font-medium">{s.mahasiswa_nama}</td>
                <td className="border px-3 py-2">{s.mahasiswa_departemen}</td>
                <td className="border px-3 py-2">{s.moderator_nama}</td>
                <td className="border px-3 py-2">{s.pembimbing_1_nama}</td>
                <td className="border px-3 py-2">{s.pembimbing_2_nama}</td>
                <td className="border px-3 py-2">{s.penguji_1_nama}</td>
                <td className="border px-3 py-2">{s.penguji_2_nama}</td>
                <td className="border px-3 py-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSendNotification(s.id, s.mahasiswa_nama)}
                    disabled={notificationLoading === s.id}
                    title={`Kirim Notifikasi WhatsApp untuk ${s.mahasiswa_nama}`}
                  >
                    {notificationLoading === s.id ? (
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                    ) : (
                      <MessageCircle className="w-4 h-4" />
                    )}
                  </Button>
                </td>
                {/* <td className="border px-3 py-2">{s.durasi_sidang ?? '-'}</td> */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default SidangList;
