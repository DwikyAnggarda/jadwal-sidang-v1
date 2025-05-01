import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import { Card } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import AddDosenForm from './AddDosenForm';

interface Dosen {
  id: number;
  nama: string;
  departemen: string;
}

const DosenList: React.FC = () => {
  const [data, setData] = useState<Dosen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-center w-full">Daftar Dosen</h2>
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
            <AddDosenForm onSuccess={() => {}} />
          </DialogContent>
        </Dialog>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border bg-white rounded-lg text-sm">
          <thead className="bg-neutral-100">
            <tr>
              <th className="border px-3 py-2">Nama</th>
              <th className="border px-3 py-2">Departemen</th>
              <th className="border px-3 py-2">Bimbingan Saat Ini</th>
              <th className="border px-3 py-2">Maksimal Bimbingan</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.id} className="hover:bg-neutral-50 transition">
                <td className="border px-3 py-2 font-medium">{d.nama}</td>
                <td className="border px-3 py-2">{d.departemen}</td>
                <td className="border px-3 py-2">{(d as any).bimbingan_saat_ini ?? '-'}</td>
                <td className="border px-3 py-2">{(d as any).maksimal_bimbingan ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default DosenList;
