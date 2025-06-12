import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Trash2, Edit, Eye, Download, Send } from 'lucide-react';
import { toast } from '../components/ui/toast';

interface SidangGroup {
  id: number;
  tanggal_sidang: string;
  jam_awal: string;
  jam_akhir: string;
  jenis_sidang: string;
  durasi_sidang: number;
  status_sidang: number;
  status_label: string;
  jumlah_mahasiswa: number;
  jumlah_dosen_moderator: number;
  jumlah_dosen_pembimbing: number;
  jumlah_dosen_penguji: number;
}

const SidangGroupPage: React.FC = () => {
  const [groups, setGroups] = useState<SidangGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState<number | null>(null);
  const navigate = useNavigate();

  const fetchGroups = async () => {
    try {
      const response = await fetch('http://localhost:5000/sidang-group');
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      } else {
        toast.error('Gagal mengambil data sidang grup');
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Terjadi kesalahan saat mengambil data');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus sidang grup ini? Semua data sidang item terkait akan ikut terhapus.')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/sidang/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Sidang grup berhasil dihapus');
        fetchGroups(); // Refresh data
      } else {
        const error = await response.json();
        toast.error(error.message || 'Gagal menghapus sidang grup');
      }
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Terjadi kesalahan saat menghapus data');
    }
  };

  const handleExportAll = async () => {
    setExportLoading(true);
    try {
      const response = await fetch('http://localhost:5000/sidang-group/export', {
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
          : `sidang_grup_${new Date().toISOString().split('T')[0]}.xlsx`;
        
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

  const handleExportSingle = async (groupId: number) => {
    try {
      const response = await fetch(`http://localhost:5000/sidang-group/${groupId}/export`, {
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
          : `sidang_grup_${groupId}.xlsx`;
        
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
      console.error('Error exporting single group:', error);
      toast.error('Terjadi kesalahan saat mengunduh file');
    }
  };

  const handleSendGroupNotifications = async (groupId: number) => {
    setNotificationLoading(groupId);
    try {
      const response = await fetch(`http://localhost:5000/notifications/group/${groupId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        const { summary } = result;
        toast.success(`Notifikasi grup #${groupId}: ${summary.sent} berhasil, ${summary.failed} gagal dari ${summary.total_notifications} total`);
      } else {
        toast.error(result.message || 'Gagal mengirim notifikasi');
      }
    } catch (error) {
      console.error('Error sending group notifications:', error);
      toast.error('Terjadi kesalahan saat mengirim notifikasi');
    } finally {
      setNotificationLoading(null);
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

  useEffect(() => {
    fetchGroups();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold">Daftar Sidang Grup</CardTitle>
            <div className="flex space-x-2">
              <Button 
                onClick={() => navigate('/generate-jadwal-sidang')}
                variant="default"
              >
                Generate Jadwal Sidang
              </Button>
              <Button 
                onClick={handleExportAll} 
                disabled={exportLoading || groups.length === 0}
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                {exportLoading ? 'Mengunduh...' : 'Export Semua'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Belum ada data sidang grup</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Tanggal Sidang</TableHead>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Durasi</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Mahasiswa</TableHead>
                    <TableHead>Moderator</TableHead>
                    <TableHead>Pembimbing</TableHead>
                    <TableHead>Penguji</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell className="font-medium">{group.id}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{formatDate(group.tanggal_sidang)}</div>
                          <div className="text-sm text-gray-500">{group.tanggal_sidang}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div>{group.jam_awal} - {group.jam_akhir}</div>
                        </div>
                      </TableCell>
                      <TableCell>{group.jenis_sidang}</TableCell>
                      <TableCell>{group.durasi_sidang} menit</TableCell>
                      <TableCell>{getStatusBadge(group.status_sidang)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{group.jumlah_mahasiswa}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{group.jumlah_dosen_moderator}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{group.jumlah_dosen_pembimbing}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{group.jumlah_dosen_penguji}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigate(`/sidang-group/${group.id}/detail`);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendGroupNotifications(group.id)}
                            disabled={notificationLoading === group.id || group.jumlah_mahasiswa === 0}
                            title="Kirim Notifikasi WhatsApp"
                          >
                            {notificationLoading === group.id ? (
                              <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExportSingle(group.id)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // TODO: Implement edit
                              toast.info('Fitur edit belum difungsikan');
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(group.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
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

export default SidangGroupPage;
