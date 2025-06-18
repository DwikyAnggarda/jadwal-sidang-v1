import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Trash2, Edit, Eye, Download, Send } from 'lucide-react';
import { toast } from '../components/ui/toast';
import api from '../api/axios';

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
  const [editStatusDialog, setEditStatusDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<SidangGroup | null>(null);
  const [newStatus, setNewStatus] = useState<number | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const navigate = useNavigate();

  const statusOptions = [
    { value: 0, label: 'Belum Mulai' },
    { value: 1, label: 'Sedang Berlangsung' },
    { value: 2, label: 'Selesai' }
  ];

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await api.get<SidangGroup[]>('/sidang-group');
      setGroups(response.data);
    } catch (error: any) {
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
      await api.delete(`/sidang/${id}`);
      toast.success('Sidang grup berhasil dihapus');
      fetchGroups(); // Refresh data
    } catch (error: any) {
      console.error('Error deleting group:', error);
      const errorMessage = error.response?.data?.message || 'Gagal menghapus sidang grup';
      toast.error(errorMessage);
    }
  };

  const handleExportAll = async () => {
    setExportLoading(true);
    try {
      const response = await api.get('/sidang-group/export', {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from response header or use default
      const contentDisposition = response.headers['content-disposition'];
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `sidang_grup_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('File Excel berhasil diunduh');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Terjadi kesalahan saat mengunduh file');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportSingle = async (groupId: number) => {
    try {
      const response = await api.get(`/sidang-group/${groupId}/export`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from response header or use default
      const contentDisposition = response.headers['content-disposition'];
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `sidang_grup_${groupId}.xlsx`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('File Excel berhasil diunduh');
    } catch (error) {
      console.error('Error exporting single group:', error);
      toast.error('Terjadi kesalahan saat mengunduh file');
    }
  };

  const handleSendGroupNotifications = async (groupId: number) => {
    setNotificationLoading(groupId);
    try {
      const response = await api.post(`/notifications/group/${groupId}`);
      
      if (response.data.success) {
        const { summary } = response.data;
        toast.success(`Notifikasi grup #${groupId}: ${summary.sent} berhasil, ${summary.failed} gagal dari ${summary.total_notifications} total`);
      } else {
        toast.error(response.data.message || 'Gagal mengirim notifikasi');
      }
    } catch (error: any) {
      console.error('Error sending group notifications:', error);
      const errorMessage = error.response?.data?.message || 'Terjadi kesalahan saat mengirim notifikasi';
      toast.error(errorMessage);
    } finally {
      setNotificationLoading(null);
    }
  };

  const handleEditStatus = (group: SidangGroup) => {
    setSelectedGroup(group);
    setNewStatus(group.status_sidang);
    setEditStatusDialog(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedGroup || newStatus === null) return;

    setUpdateLoading(true);
    try {
      const response = await api.put(`/sidang-group/${selectedGroup.id}/status`, {
        status_sidang: newStatus
      });

      if (response.data.success) {
        toast.success('Status sidang berhasil diubah');
        setEditStatusDialog(false);
        fetchGroups(); // Refresh data
      } else {
        toast.error(response.data.message || 'Gagal mengubah status sidang');
      }
    } catch (error: any) {
      console.error('Error updating status:', error);
      const errorMessage = error.response?.data?.message || 'Terjadi kesalahan saat mengubah status';
      toast.error(errorMessage);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleCloseEditDialog = () => {
    setEditStatusDialog(false);
    setSelectedGroup(null);
    setNewStatus(null);
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
                            onClick={() => handleEditStatus(group)}
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

      {/* Edit Status Dialog */}
      <Dialog open={editStatusDialog} onOpenChange={handleCloseEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Status Sidang</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Grup:</strong> #{selectedGroup?.id} - {selectedGroup?.jenis_sidang}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Tanggal:</strong> {selectedGroup ? formatDate(selectedGroup.tanggal_sidang) : ''}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                <strong>Status Saat Ini:</strong> {selectedGroup ? getStatusBadge(selectedGroup.status_sidang) : ''}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Pilih Status Baru:
              </label>
              <Select 
                value={newStatus?.toString() || ''} 
                onValueChange={(value) => setNewStatus(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih status..." />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newStatus !== null && newStatus !== selectedGroup?.status_sidang && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>Konfirmasi:</strong> Anda akan mengubah status dari "{statusOptions.find(s => s.value === selectedGroup?.status_sidang)?.label}" 
                  menjadi "{statusOptions.find(s => s.value === newStatus)?.label}".
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEditDialog}>
              Batal
            </Button>
            <Button 
              onClick={handleUpdateStatus}
              disabled={updateLoading || newStatus === null || newStatus === selectedGroup?.status_sidang}
            >
              {updateLoading ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SidangGroupPage;
