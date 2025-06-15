import React, { useEffect, useState, useRef } from 'react';
import { Input } from './ui/input';
// Import Mahasiswa Excel Modal
const ImportMahasiswaDialog: React.FC<{ open: boolean; onOpenChange: (open: boolean) => void; onSuccess: () => void; }> = ({ open, onOpenChange, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Pilih file Excel terlebih dahulu');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/mahasiswa/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data && res.data.success) {
        setSuccess(res.data.message || 'Import berhasil');
        setFile(null);
        if (inputRef.current) inputRef.current.value = '';
        onSuccess();
      } else {
        setError(res.data.message || 'Gagal import data');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal import data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Mahasiswa dari Excel</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Input type="file" accept=".xlsx,.xls" onChange={handleFileChange} ref={inputRef} disabled={loading} />
          <div className="text-xs text-neutral-500">File harus format Excel sesuai template.</div>
          {error && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
          {success && <Alert><AlertTitle>Sukses</AlertTitle><AlertDescription>{success}</AlertDescription></Alert>}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Batal</Button>
          <Button onClick={handleImport} disabled={loading || !file}>{loading ? 'Mengimpor...' : 'Import'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
import api from '../api/axios';
import { Card } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import AddMahasiswaForm from './AddMahasiswaForm';
import EditMahasiswaForm from './EditMahasiswaForm';

interface Mahasiswa {
  id: number;
  nrp?: string;
  nama: string;
  pembimbing_1_nama?: string | null;
  pembimbing_2_nama?: string | null;
}

interface Filters {
  with_pembimbing: boolean;
  without_pembimbing: boolean;
}

const MahasiswaList: React.FC = () => {
  const [data, setData] = useState<Mahasiswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    with_pembimbing: false,
    without_pembimbing: false,
  });
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  // Download template Excel
  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get('/mahasiswa/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'template_mahasiswa.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Gagal mengunduh template');
    }
  };

  // Export data Excel
  const handleExport = async () => {
    try {
      const res = await api.get('/mahasiswa/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'data_mahasiswa.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Gagal mengunduh data');
    }
  };
  const [selectedMahasiswa, setSelectedMahasiswa] = useState<Mahasiswa | null>(null);
  const [editSuccessMsg, setEditSuccessMsg] = useState<string | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const handleDeleteClick = (id: number) => {
    setDeleteConfirmId(id);
    setDeleteError(null);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmId(null);
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmId == null) return;
    setDeleteLoadingId(deleteConfirmId);
    setDeleteError(null);
    try {
      const res = await api.delete(`/mahasiswa/${deleteConfirmId}`);
      if (res.data && res.data.success) {
        setEditSuccessMsg('Data mahasiswa berhasil dihapus.');
        fetchMahasiswa();
      } else {
        setDeleteError(res.data.message || 'Gagal menghapus mahasiswa');
      }
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.message) {
        setDeleteError(err.response.data.message);
      } else {
        setDeleteError('Gagal menghapus mahasiswa');
      }
    } finally {
      setDeleteLoadingId(null);
      setDeleteConfirmId(null);
    }
  };
  const handleEditClick = (mahasiswa: Mahasiswa) => {
    setSelectedMahasiswa(mahasiswa);
    setEditModalOpen(true);
    setEditSuccessMsg(null);
  };

  const handleEditSuccess = () => {
    setEditModalOpen(false);
    setSelectedMahasiswa(null);
    setEditSuccessMsg('Data mahasiswa berhasil diperbarui.');
    fetchMahasiswa();
  };

  const handleEditCancel = () => {
    setEditModalOpen(false);
    setSelectedMahasiswa(null);
  };

  const fetchMahasiswa = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.with_pembimbing) params.append('with_pembimbing', 'true');
      if (filters.without_pembimbing) params.append('without_pembimbing', 'true');
      params.append('page', String(currentPage));
      params.append('limit', String(itemsPerPage));
      const res = await api.get(`/mahasiswa?${params.toString()}`);
      setData(res.data.data);
      setTotal(res.data.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMahasiswa();
    // eslint-disable-next-line
  }, [filters, currentPage, itemsPerPage]); // Refetch when filters or page/limit change

  const handleFilterChange = (key: keyof Filters, value: string | boolean) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSuccess = () => {
    setIsModalOpen(false);
    fetchMahasiswa(); // Refresh data after adding
  };

  if (loading && data.length === 0) return <div className="text-center py-8">Loading...</div>; // Show loading only on initial load
  if (error) return (
    <Alert variant="destructive" className="max-w-4xl mx-auto my-8">
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );

  return (
    <Card className="max-w-4xl mx-auto mt-8 p-6 shadow-lg">
      {/* Edit Mahasiswa Dialog */}
      <Dialog open={editModalOpen} onOpenChange={open => { if (!open) handleEditCancel(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Mahasiswa</DialogTitle>
          </DialogHeader>
          {selectedMahasiswa && (
            <EditMahasiswaForm
              mahasiswa={selectedMahasiswa as any}
              onSuccess={handleEditSuccess}
              onCancel={handleEditCancel}
            />
          )}
        </DialogContent>
      </Dialog>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
        <div className="flex gap-2">
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button>Tambah Mahasiswa</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Mahasiswa Baru</DialogTitle>
            </DialogHeader>
            <AddMahasiswaForm onSuccess={handleSuccess} />
          </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={handleDownloadTemplate}>Download Template</Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>Import Excel</Button>
          <Button variant="outline" onClick={handleExport}>Export Excel</Button>
        </div>
      {/* Import Mahasiswa Dialog */}
      <ImportMahasiswaDialog open={importOpen} onOpenChange={setImportOpen} onSuccess={fetchMahasiswa} />

        {/* <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="with_pembimbing"
              checked={filters.with_pembimbing}
              onCheckedChange={(checked) => handleFilterChange('with_pembimbing', !!checked)}
            />
            <Label htmlFor="with_pembimbing">Dengan Pembimbing</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="without_pembimbing"
              checked={filters.without_pembimbing}
              onCheckedChange={(checked) => handleFilterChange('without_pembimbing', !!checked)}
            />
            <Label htmlFor="without_pembimbing">Tanpa Pembimbing</Label>
          </div>
        </div> */}
      </div>

      {editSuccessMsg && (
        <Alert className="mb-4">
          <AlertTitle>Sukses</AlertTitle>
          <AlertDescription>{editSuccessMsg}</AlertDescription>
        </Alert>
      )}
      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={open => { if (!open) handleDeleteCancel(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus Mahasiswa</DialogTitle>
          </DialogHeader>
          <div>Apakah Anda yakin ingin menghapus data mahasiswa ini?</div>
          {deleteError && (
            <Alert variant="destructive" className="my-2">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={handleDeleteCancel} disabled={!!deleteLoadingId}>Batal</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={!!deleteLoadingId}>
              {deleteLoadingId ? 'Menghapus...' : 'Hapus'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <div className="overflow-x-auto">
        {loading && <div className="text-center py-4">Memuat data...</div>}
        <table className="min-w-full border bg-white dark:bg-neutral-900 rounded-lg text-sm">
          <thead className="bg-neutral-100 dark:bg-neutral-800">
            <tr>
              <th className="border px-3 py-2">NRP</th>
              <th className="border px-3 py-2">Nama</th>
              {/* <th className="border px-3 py-2">Pembimbing 1</th> */}
              {/* <th className="border px-3 py-2">Pembimbing 2</th> */}
              <th className="border px-3 py-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {data.map((m) => (
              <tr key={m.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800 transition">
                <td className="border px-3 py-2 font-mono">{m.nrp || '-'}</td>
                <td className="border px-3 py-2 font-medium">{m.nama}</td>
                {/* <td className="border px-3 py-2">{m.pembimbing_1_nama || '-'}</td>
                <td className="border px-3 py-2">{m.pembimbing_2_nama || '-'}</td> */}
                <td className="border px-3 py-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEditClick(m)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDeleteClick(m.id)} disabled={deleteLoadingId === m.id}>
                    {deleteLoadingId === m.id ? 'Menghapus...' : 'Hapus'}
                  </Button>
                </td>
              </tr>
            ))}
            {data.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="text-center py-4 border">Tidak ada data mahasiswa ditemukan.</td>
              </tr>
            )}
          </tbody>
        </table>
        {/* Pagination Controls */}
        {total > itemsPerPage && (
          <div className="flex justify-center items-center gap-2 mt-4">
            <Button size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>&lt;</Button>
            {Array.from({ length: Math.ceil(total / itemsPerPage) }, (_, i) => (
              <Button
                key={i + 1}
                size="sm"
                variant={currentPage === i + 1 ? 'default' : 'outline'}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </Button>
            ))}
            <Button size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.min(Math.ceil(total / itemsPerPage), p + 1))} disabled={currentPage === Math.ceil(total / itemsPerPage)}>&gt;</Button>
            <select
              className="ml-2 border rounded px-2 py-1 text-sm"
              value={itemsPerPage}
              onChange={e => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              {[10, 20, 50, 100].map(size => (
                <option key={size} value={size}>{size} / halaman</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </Card>
  );
};

export default MahasiswaList;
