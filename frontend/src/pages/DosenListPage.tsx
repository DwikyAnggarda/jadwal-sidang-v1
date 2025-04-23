import React, { useEffect, useState } from 'react';
import api from '../api/axios';

interface Dosen {
  id: number;
  nama: string;
  departemen: string;
  bimbingan_saat_ini?: number;
  maksimal_bimbingan?: number;
}

const DosenListPage: React.FC = () => {
  const [data, setData] = useState<Dosen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Dosen[]>('/dosen')
      .then(res => setData(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Daftar Dosen</h2>
      <table className="min-w-full border bg-white">
        <thead>
          <tr>
            <th className="border px-4 py-2">ID</th>
            <th className="border px-4 py-2">Nama</th>
            <th className="border px-4 py-2">Departemen</th>
            <th className="border px-4 py-2">Bimbingan Saat Ini</th>
            <th className="border px-4 py-2">Maksimal Bimbingan</th>
          </tr>
        </thead>
        <tbody>
          {data.map(dosen => (
            <tr key={dosen.id}>
              <td className="border px-4 py-2">{dosen.id}</td>
              <td className="border px-4 py-2">{dosen.nama}</td>
              <td className="border px-4 py-2">{dosen.departemen}</td>
              <td className="border px-4 py-2">{dosen.bimbingan_saat_ini ?? '-'}</td>
              <td className="border px-4 py-2">{dosen.maksimal_bimbingan ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DosenListPage;
