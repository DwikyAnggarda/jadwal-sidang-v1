import React, { useEffect, useState, useCallback, useRef } from 'react';
import api from '../api/axios';
import { Card } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import AddDosenForm from './AddDosenForm';
import EditDosenForm from './EditDosenForm';

interface Dosen {
  id: number;
  nama: string;
  departemen: string;
  no_hp: string;
}

const DosenList: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [data, setData] = useState<Dosen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedDosen, setSelectedDosen] = useState<Dosen | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dosenToDelete, setDosenToDelete] = useState<Dosen | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const paginatedData = data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const fetchDosen = useCallback(() => {
    setLoading(true);
    setError(null);
    api.get<Dosen[]>('/dosen')
      .then(res => setData(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchDosen();
  }, [fetchDosen]);

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (error) return (
    <Alert variant="destructive" className="max-w-2xl mx-auto my-8">
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );

  return (
    <Card className="max-w-2xl mx-auto mt-8 p-6 shadow-lg">
      <div className="flex flex-wrap gap-2 justify-between items-center mb-6">
        {/* <h2 className="text-xl font-bold text-center w-full">Daftar Dosen</h2> */}
        <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={async () => {
            try {
              const response = await api.get('/dosen/export', { responseType: 'blob' });
              const blob = response.data;
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'data_dosen.xlsx';
              document.body.appendChild(a);
              a.click();
              setTimeout(() => {
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
              }, 100);
            } catch (err) {
              alert('Gagal mengunduh data dosen.');
            }
          }}
        >
          Download Data Dosen
        </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                const response = await api.get('/dosen/template', { responseType: 'blob' });
                const blob = response.data;
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'template_dosen.xlsx';
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                }, 100);
              } catch (err) {
                alert('Gagal mengunduh template.');
              }
            }}
          >
            Download Template
          </Button>
          <Button
            variant="secondary"
            onClick={() => setImportDialogOpen(true)}
          >
            Import Dosen
          </Button>
          <Dialog open={importDialogOpen} onOpenChange={(open) => {
            setImportDialogOpen(open);
            if (!open) {
              setImportError(null);
              setImportSuccess(null);
              setImportLoading(false);
            }
          }}>
            <DialogContent className="max-w-md w-full">
              <DialogHeader>
                <DialogTitle>Import Data Dosen (Excel)</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!fileInputRef.current?.files?.[0]) {
                    setImportError('Pilih file Excel terlebih dahulu');
                    return;
                  }
                  setImportLoading(true);
                  setImportError(null);
                  setImportSuccess(null);
                  const formData = new FormData();
                  formData.append('file', fileInputRef.current.files[0]);
                  try {
                    await api.post('/dosen/import', formData, {
                      headers: { 'Content-Type': 'multipart/form-data' },
                    });
                    setImportSuccess('Import data dosen berhasil');
                    fetchDosen();
                    setTimeout(() => {
                      setImportDialogOpen(false);
                      setImportSuccess(null);
                    }, 1200);
                  } catch (err: any) {
                    setImportError(err.response?.data?.message || err.message);
                  } finally {
                    setImportLoading(false);
                  }
                }}
                className="space-y-4"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="block w-full border rounded px-2 py-1"
                  disabled={importLoading}
                />
                {importError && (
                  <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{importError}</AlertDescription>
                  </Alert>
                )}
                {importSuccess && (
                  <Alert>
                    <AlertTitle>Sukses</AlertTitle>
                    <AlertDescription>{importSuccess}</AlertDescription>
                  </Alert>
                )}
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setImportDialogOpen(false)} disabled={importLoading}>Batal</Button>
                  <Button type="submit" variant="default" disabled={importLoading}>
                    {importLoading ? 'Mengimpor...' : 'Import'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) fetchDosen();
        }}>
          <DialogTrigger asChild>
            <Button variant="default" className="ml-4 whitespace-nowrap">Tambah Dosen</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Dosen</DialogTitle>
            </DialogHeader>
            <AddDosenForm onSuccess={() => {
              setIsDialogOpen(false);
              fetchDosen();
            }} />
          </DialogContent>
        </Dialog>
        {/* Edit Dosen Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setSelectedDosen(null);
            fetchDosen();
          }
        }}>
          <DialogContent className="max-w-xl w-full">
            <DialogHeader>
              <DialogTitle>Edit Dosen</DialogTitle>
            </DialogHeader>
            {selectedDosen && (
              <EditDosenForm
                dosen={selectedDosen}
                onSuccess={() => {
                  setEditDialogOpen(false);
                  setSelectedDosen(null);
                  fetchDosen();
                }}
                onCancel={() => {
                  setEditDialogOpen(false);
                  setSelectedDosen(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border bg-white rounded-lg text-sm">
          <thead className="bg-neutral-100">
            <tr>
              <th className="border px-3 py-2">Nama</th>
              <th className="border px-3 py-2">No. HP</th>
              <th className="border px-3 py-2">Departemen</th>
              <th className="border px-3 py-2">Bimbingan Saat Ini</th>
              <th className="border px-3 py-2">Maksimal Bimbingan</th>
              <th className="border px-3 py-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((d) => (
              <tr key={d.id} className="hover:bg-neutral-50 transition">
                <td className="border px-3 py-2 font-medium">{d.nama}</td>
                <td className="border px-3 py-2">{d.no_hp}</td>
                <td className="border px-3 py-2">{d.departemen}</td>
                <td className="border px-3 py-2">{(d as any).bimbingan_saat_ini ?? '-'}</td>
                <td className="border px-3 py-2">{(d as any).maksimal_bimbingan ?? '-'}</td>
                <td className="border px-3 py-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => {
                    setSelectedDosen(d);
                    setEditDialogOpen(true);
                  }}>
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => {
                    setDosenToDelete(d);
                    setDeleteDialogOpen(true);
                  }}>
                    Hapus
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-4">
            <Button size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>&lt;</Button>
            {Array.from({ length: totalPages }, (_, i) => (
              <Button
                key={i + 1}
                size="sm"
                variant={currentPage === i + 1 ? 'default' : 'outline'}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </Button>
            ))}
            <Button size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>&gt;</Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default DosenList;
