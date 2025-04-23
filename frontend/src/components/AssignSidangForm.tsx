import React, { useEffect, useState } from 'react';
import api from '../api/axios';

interface Mahasiswa {
  id: number;
  nama: string;
  departemen: string;
  pembimbing_1_id?: number;
  pembimbing_2_id?: number;
}

const AssignSidangForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [mahasiswaList, setMahasiswaList] = useState<Mahasiswa[]>([]);
  const [mahasiswaId, setMahasiswaId] = useState('');
  const [tanggalSidang, setTanggalSidang] = useState('');
  const [room, setRoom] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get<Mahasiswa[]>('/mahasiswa?with_pembimbing=true&without_sidang=true').then(res => setMahasiswaList(res.data));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await api.post('/sidang/assign', {
        mahasiswa_id: mahasiswaId,
        tanggal_sidang: tanggalSidang,
        room,
      });
      setSuccess(true);
      setMahasiswaId('');
      setTanggalSidang('');
      setRoom('');
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 p-4 bg-white rounded shadow max-w-md">
      <h3 className="font-semibold mb-2">Assign Jadwal Sidang</h3>
      <div className="mb-2">
        <label className="block mb-1">Mahasiswa</label>
        <select value={mahasiswaId} onChange={e => setMahasiswaId(e.target.value)} className="border rounded px-2 py-1 w-full" required>
          <option value="">Pilih Mahasiswa</option>
          {mahasiswaList.map(m => (
            <option key={m.id} value={m.id}>{m.nama} ({m.departemen})</option>
          ))}
        </select>
      </div>
      <div className="mb-2">
        <label className="block mb-1">Tanggal Sidang</label>
        <input type="date" value={tanggalSidang} onChange={e => setTanggalSidang(e.target.value)} className="border rounded px-2 py-1 w-full" required />
      </div>
      <div className="mb-2">
        <label className="block mb-1">Ruangan</label>
        <input type="text" value={room} onChange={e => setRoom(e.target.value)} className="border rounded px-2 py-1 w-full" required />
      </div>
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}>{loading ? 'Assigning...' : 'Assign'}</button>
      {error && <div className="text-red-600 mt-2">{error}</div>}
      {success && <div className="text-green-600 mt-2">Jadwal sidang berhasil ditetapkan</div>}
    </form>
  );
};

export default AssignSidangForm;
