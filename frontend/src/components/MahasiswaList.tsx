import React, { useEffect, useState, useMemo } from 'react';
import api from '../api/axios';
import { Card } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import AddMahasiswaForm from './AddMahasiswaForm';

interface Mahasiswa {
  id: number;
  nama: string;
  departemen: string;
  pembimbing_1_nama?: string | null;
  pembimbing_2_nama?: string | null;
}

interface Filters {
  departemen: string;
  with_pembimbing: boolean;
  without_pembimbing: boolean;
}

const MahasiswaList: React.FC = () => {
  const [data, setData] = useState<Mahasiswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    departemen: '',
    with_pembimbing: false,
    without_pembimbing: false,
  });
  const [allData, setAllData] = useState<Mahasiswa[]>([]); // Store all data for client-side filtering if needed

  const fetchMahasiswa = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.departemen) params.append('departemen', filters.departemen);
      if (filters.with_pembimbing) params.append('with_pembimbing', 'true');
      if (filters.without_pembimbing) params.append('without_pembimbing', 'true');

      const res = await api.get<Mahasiswa[]>(`/mahasiswa?${params.toString()}`);
      setData(res.data);
      // If fetching all data initially for filters, store it
      if (!filters.departemen && !filters.with_pembimbing && !filters.without_pembimbing && allData.length === 0) {
        setAllData(res.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMahasiswa();
  }, [filters]); // Refetch when filters change

  const uniqueDepartemen = useMemo(() => {
    // Get unique departemen from all data if available, otherwise from current data
    const sourceData = allData.length > 0 ? allData : data;
    return [...new Set(sourceData.map(m => m.departemen))];
  }, [allData, data]);

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
      <div className="flex justify-between items-center mb-6">
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

        <div className="flex items-center gap-4">
          <Select
            value={filters.departemen}
            onValueChange={(value) => handleFilterChange('departemen', value === 'all' ? '' : value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter Departemen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Departemen</SelectItem>
              {uniqueDepartemen.map(dep => (
                <SelectItem key={dep} value={dep}>{dep}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        </div>
      </div>

      <div className="overflow-x-auto">
        {loading && <div className="text-center py-4">Memuat data...</div>} {/* Show loading indicator during refetch */}
        <table className="min-w-full border bg-white dark:bg-neutral-900 rounded-lg text-sm">
          <thead className="bg-neutral-100 dark:bg-neutral-800">
            <tr>
              <th className="border px-3 py-2">Nama</th>
              <th className="border px-3 py-2">Departemen</th>
              <th className="border px-3 py-2">Pembimbing 1</th>
              <th className="border px-3 py-2">Pembimbing 2</th>
            </tr>
          </thead>
          <tbody>
            {data.map((m) => (
              <tr key={m.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800 transition">
                <td className="border px-3 py-2 font-medium">{m.nama}</td>
                <td className="border px-3 py-2">{m.departemen}</td>
                <td className="border px-3 py-2">{m.pembimbing_1_nama || '-'}</td>
                <td className="border px-3 py-2">{m.pembimbing_2_nama || '-'}</td>
              </tr>
            ))}
            {data.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="text-center py-4 border">Tidak ada data mahasiswa ditemukan.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default MahasiswaList;
