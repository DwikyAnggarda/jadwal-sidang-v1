import React, { useState } from 'react';
import api from '../api/axios';

interface Dosen {
  id: number;
  nama: string;
  departemen: string;
}

const AddDosenForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [nama, setNama] = useState('');
  const [departemen, setDepartemen] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await api.post('/dosen', { nama, departemen });
      setSuccess(true);
      setNama('');
      setDepartemen('');
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 p-4 bg-white rounded shadow max-w-md">
      <h3 className="font-semibold mb-2">Tambah Dosen</h3>
      <div className="mb-2">
        <label className="block mb-1">Nama</label>
        <input type="text" value={nama} onChange={e => setNama(e.target.value)} className="border rounded px-2 py-1 w-full" required />
      </div>
      <div className="mb-2">
        <label className="block mb-1">Departemen</label>
        <input type="text" value={departemen} onChange={e => setDepartemen(e.target.value)} className="border rounded px-2 py-1 w-full" required />
      </div>
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}>{loading ? 'Menyimpan...' : 'Tambah'}</button>
      {error && <div className="text-red-600 mt-2">{error}</div>}
      {success && <div className="text-green-600 mt-2">Dosen berhasil ditambahkan</div>}
    </form>
  );
};

export default AddDosenForm;
