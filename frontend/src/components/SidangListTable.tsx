import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Card } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

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

  useEffect(() => {
    api.get<Sidang[]>('/sidang')
      .then(res => setData(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (error) return (
    <Alert variant="destructive" className="max-w-2xl mx-auto my-8">
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );

  return (
    <Card className="max-w-6xl mx-auto mt-1 p-6 shadow-lg">
      {/* <h2 className="text-2xl font-bold mb-6 text-center">Daftar Sidang</h2> */}
      <div className="overflow-x-auto">
        <table className="min-w-full border bg-white rounded-lg text-sm">
          <thead className="bg-neutral-100">
            <tr>
              <th className="border px-7 py-2">Tanggal</th>
              <th className="border px-1 py-2">Ruangan</th>
              <th className="border px-10 py-2">Waktu</th>
              <th className="border px-3 py-2">Nama Mahasiswa</th>
              <th className="border px-3 py-2">Departemen</th>
              <th className="border px-3 py-2">Moderator</th>
              <th className="border px-3 py-2">Pembimbing 1</th>
              <th className="border px-3 py-2">Pembimbing 2</th>
              <th className="border px-3 py-2">Penguji 1</th>
              <th className="border px-3 py-2">Penguji 2</th>
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
