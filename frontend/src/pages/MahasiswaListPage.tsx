import React, { useEffect, useState } from 'react';
import api from '../api/axios';

interface Mahasiswa {
  id: number;
  nama: string;
  departemen: string;
  pembimbing_1_id?: number | null;
  pembimbing_2_id?: number | null;
}

const MahasiswaListPage: React.FC = () => {
  const [data, setData] = useState<Mahasiswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'without_pembimbing' | 'with_pembimbing' | 'without_sidang'>('all');

  useEffect(() => {
    let url = '/mahasiswa';
    if (filter === 'without_pembimbing') url += '?without_pembimbing=true';
    else if (filter === 'with_pembimbing') url += '?with_pembimbing=true';
    else if (filter === 'without_sidang') url += '?without_sidang=true';
    setLoading(true);
    setError(null);
    api.get<Mahasiswa[]>(url)
      .then(res => setData(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Daftar Mahasiswa</h2>
      <div className="mb-4 flex gap-2">
        <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Semua</button>
        <button onClick={() => setFilter('without_pembimbing')} className={`px-3 py-1 rounded ${filter === 'without_pembimbing' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Tanpa Pembimbing</button>
        <button onClick={() => setFilter('with_pembimbing')} className={`px-3 py-1 rounded ${filter === 'with_pembimbing' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Sudah Ada Pembimbing</button>
        <button onClick={() => setFilter('without_sidang')} className={`px-3 py-1 rounded ${filter === 'without_sidang' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Belum Sidang</button>
      </div>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-600">Error: {error}</div>}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full border bg-white">
            <thead>
              <tr>
                <th className="border px-4 py-2">ID</th>
                <th className="border px-4 py-2">Nama</th>
                <th className="border px-4 py-2">Departemen</th>
                <th className="border px-4 py-2">Pembimbing 1</th>
                <th className="border px-4 py-2">Pembimbing 2</th>
              </tr>
            </thead>
            <tbody>
              {data.map(m => (
                <tr key={m.id}>
                  <td className="border px-4 py-2">{m.id}</td>
                  <td className="border px-4 py-2">{m.nama}</td>
                  <td className="border px-4 py-2">{m.departemen}</td>
                  <td className="border px-4 py-2">{m.pembimbing_1_id ?? '-'}</td>
                  <td className="border px-4 py-2">{m.pembimbing_2_id ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MahasiswaListPage;
