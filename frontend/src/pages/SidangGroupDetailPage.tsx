import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Clock, Calendar, Users, Download, MessageCircle, Send } from 'lucide-react';
import { toast } from '../components/ui/toast';

interface SidangItem {
  id: number;
  nrp: string;
  nama_mahasiswa: string;
  judul: string;
  room: string;
  jam_mulai: string;
  jam_selesai: string;
  durasi_sidang: number;
  moderator_nama: string;
  pembimbing_1_nama: string;
  pembimbing_2_nama: string;
  penguji_1_nama: string;
  penguji_2_nama: string;
}

interface SidangGroup {
  id: number;
  tanggal_sidang: string;
  jam_awal: string;
  jam_akhir: string;
  jenis_sidang: string;
  durasi_sidang: number;
  status_sidang: number;
}

interface DetailResponse {
  success: boolean;
  group: SidangGroup;
  items: SidangItem[];
}

const SidangGroupDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);

  const fetchDetail = async () => {
    if (!id) return;
    
    try {
      const response = await fetch(`http://localhost:5000/sidang-group/${id}/detail`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Gagal mengambil data detail');
      }
    } catch (error) {
      console.error('Error fetching detail:', error);
      toast.error('Terjadi kesalahan saat mengambil data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <Badge variant="secondary">Belum Mulai</Badge>;
      case 1:
        return <Badge variant="default">Sedang Berlangsung</Badge>;
      case 2:
        return <Badge variant="outline">Selesai</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleBack = () => {
    navigate('/sidang-group');
  };

  const handleExport = async () => {
    if (!id) return;
    
    setExportLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/sidang-group/${id}/export`, {
        method: 'GET',
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Extract filename from response header or use default
        const contentDisposition = response.headers.get('content-disposition');
        const filename = contentDisposition 
          ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
          : `sidang_grup_${id}.xlsx`;
        
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
        toast.success('File Excel berhasil diunduh');
      } else {
        toast.error('Gagal mengunduh file Excel');
      }
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Terjadi kesalahan saat mengunduh file');
    } finally {
      setExportLoading(false);
    }
  };

  // WhatsApp notification function
  const handleSendNotifications = async () => {
    if (!id) return;
    
    setNotificationLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/notifications/group/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        const { summary } = result;
        toast.success(`Notifikasi berhasil dikirim: ${summary.sent} berhasil, ${summary.failed} gagal dari ${summary.total_notifications} total`);
      } else {
        toast.error(result.message || 'Gagal mengirim notifikasi');
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
      toast.error('Terjadi kesalahan saat mengirim notifikasi');
    } finally {
      setNotificationLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!data || !data.success) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <p className="text-red-500">Data tidak ditemukan atau terjadi kesalahan</p>
          <Button onClick={handleBack} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
        </div>
      </div>
    );
  }

  const { group, items } = data;

  return (
    <div className="container mx-auto p-6">
      {/* Header dengan informasi grup */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Detail Sidang Grup #{group.id}</CardTitle>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(group.tanggal_sidang)}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {group.jam_awal} - {group.jam_akhir}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {items.length} Mahasiswa
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(group.status_sidang)}
              <Button 
                onClick={handleSendNotifications} 
                disabled={notificationLoading || items.length === 0}
                variant="default"
              >
                <Send className="w-4 h-4 mr-2" />
                {notificationLoading ? 'Mengirim...' : 'Kirim Notifikasi'}
              </Button>
              <Button 
                onClick={handleExport} 
                disabled={exportLoading || items.length === 0}
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                {exportLoading ? 'Mengunduh...' : 'Export Excel'}
              </Button>
              <Button onClick={handleBack} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Jenis Sidang</p>
              <p className="font-medium">{group.jenis_sidang}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Durasi per Sidang</p>
              <p className="font-medium">{group.durasi_sidang} menit</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Mahasiswa</p>
              <p className="font-medium">{items.length} orang</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabel detail sidang items */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Mahasiswa Sidang</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Tidak ada data mahasiswa dalam grup ini</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No</TableHead>
                    <TableHead>NRP</TableHead>
                    <TableHead>Nama Mahasiswa</TableHead>
                    <TableHead>Judul</TableHead>
                    <TableHead>Ruang</TableHead>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Moderator</TableHead>
                    <TableHead>Pembimbing 1</TableHead>
                    <TableHead>Pembimbing 2</TableHead>
                    <TableHead>Penguji 1</TableHead>
                    <TableHead>Penguji 2</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-mono">{item.nrp}</TableCell>
                      <TableCell className="font-medium">{item.nama_mahasiswa}</TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={item.judul}>
                          {item.judul}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.room}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {item.jam_mulai} - {item.jam_selesai}
                        </div>
                      </TableCell>
                      <TableCell>{item.moderator_nama || '-'}</TableCell>
                      <TableCell>{item.pembimbing_1_nama || '-'}</TableCell>
                      <TableCell>{item.pembimbing_2_nama || '-'}</TableCell>
                      <TableCell>{item.penguji_1_nama || '-'}</TableCell>
                      <TableCell>{item.penguji_2_nama || '-'}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            setNotificationLoading(true);
                            try {
                              const response = await fetch(`http://localhost:5000/notifications/sidang/${item.id}`, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json'
                                }
                              });
                              
                              const result = await response.json();
                              
                              if (result.success) {
                                const { summary } = result;
                                toast.success(`Notifikasi untuk ${item.nama_mahasiswa}: ${summary.sent} berhasil, ${summary.failed} gagal`);
                              } else {
                                toast.error(result.message || 'Gagal mengirim notifikasi');
                              }
                            } catch (error) {
                              console.error('Error sending notification:', error);
                              toast.error('Terjadi kesalahan saat mengirim notifikasi');
                            } finally {
                              setNotificationLoading(false);
                            }
                          }}
                          disabled={notificationLoading}
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SidangGroupDetailPage;
