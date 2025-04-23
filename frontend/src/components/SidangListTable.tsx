import React, { useEffect, useState } from 'react';
import api from '../api/axios';

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
}

const SidangListTable: React.FC = () => {
  const [data, setData] = useState<Sidang[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Sidang[]>('/sidang')
      .then(res => setData(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;

  return (
    <div className="overflow-x-auto">
      <h2 className="text-xl font-bold mb-4">Daftar Sidang</h2>
      <table className="min-w-full border bg-white">
        <thead>
          <tr>
            <th className="border px-2 py-1">Nama Mahasiswa</th>
            <th className="border px-2 py-1">Departemen</th>
            <th className="border px-2 py-1">Pembimbing 1</th>
            <th className="border px-2 py-1">Pembimbing 2</th>
            <th className="border px-2 py-1">Penguji 1</th>
            <th className="border px-2 py-1">Penguji 2</th>
            <th className="border px-2 py-1">Moderator</th>
            <th className="border px-2 py-1">Ruangan</th>
            <th className="border px-2 py-1">Tanggal Sidang</th>
          </tr>
        </thead>
        <tbody>
          {data.map((s) => (
            <tr key={s.id}>
              <td className="border px-2 py-1">{s.mahasiswa_nama}</td>
              <td className="border px-2 py-1">{s.mahasiswa_departemen}</td>
              <td className="border px-2 py-1">{s.pembimbing_1_nama}</td>
              <td className="border px-2 py-1">{s.pembimbing_2_nama}</td>
              <td className="border px-2 py-1">{s.penguji_1_nama}</td>
              <td className="border px-2 py-1">{s.penguji_2_nama}</td>
              <td className="border px-2 py-1">{s.moderator_nama}</td>
              <td className="border px-2 py-1">{s.room}</td>
              <td className="border px-2 py-1">{s.tanggal_sidang}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SidangListTable;
