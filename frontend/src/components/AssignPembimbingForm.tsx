import React, { useEffect, useState } from 'react';
import api from '../api/axios';

interface Mahasiswa {
  id: number;
  nama: string;
  departemen: string;
}
interface Dosen {
  id: number;
  nama: string;
  departemen: string;
  bimbingan_saat_ini?: number;
  maksimal_bimbingan?: number;
}

const AssignPembimbingForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [mahasiswaList, setMahasiswaList] = useState<Mahasiswa[]>([]);
  const [dosenList, setDosenList] = useState<Dosen[]>([]);
  const [mahasiswaId, setMahasiswaId] = useState('');
  const [pembimbing1, setPembimbing1] = useState('');
  const [pembimbing2, setPembimbing2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get<Mahasiswa[]>('/mahasiswa?without_pembimbing=true').then(res => setMahasiswaList(res.data));
    api.get<Dosen[]>('/dosen').then(res => setDosenList(res.data));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    if (pembimbing1 === pembimbing2) {
      setError('Pembimbing 1 dan 2 harus berbeda');
      setLoading(false);
      return;
    }
    try {
      await api.post('/pembimbing/assign', {
        mahasiswa_id: parseInt(mahasiswaId, 10),
        pembimbing_1_id: parseInt(pembimbing1, 10),
        pembimbing_2_id: parseInt(pembimbing2, 10),
      });
      setSuccess(true);
      setMahasiswaId('');
      setPembimbing1('');
      setPembimbing2('');
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 p-4 bg-white rounded shadow max-w-md">
      <h3 className="font-semibold mb-2">Assign Pembimbing</h3>
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
        <label className="block mb-1">Pembimbing 1</label>
        <select value={pembimbing1} onChange={e => setPembimbing1(e.target.value)} className="border rounded px-2 py-1 w-full" required>
          <option value="">Pilih Dosen</option>
          {dosenList.map(d => (
            <option key={d.id} value={d.id}>{d.nama} ({d.departemen})</option>
          ))}
        </select>
      </div>
      <div className="mb-2">
        <label className="block mb-1">Pembimbing 2</label>
        <select value={pembimbing2} onChange={e => setPembimbing2(e.target.value)} className="border rounded px-2 py-1 w-full" required>
          <option value="">Pilih Dosen</option>
          {dosenList.map(d => (
            <option key={d.id} value={d.id}>{d.nama} ({d.departemen})</option>
          ))}
        </select>
      </div>
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}>{loading ? 'Assigning...' : 'Assign'}</button>
      {error && <div className="text-red-600 mt-2">{error}</div>}
      {success && <div className="text-green-600 mt-2">Pembimbing berhasil ditugaskan</div>}
    </form>
  );
};

export default AssignPembimbingForm;
