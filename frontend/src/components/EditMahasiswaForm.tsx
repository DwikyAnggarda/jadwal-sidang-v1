import React, { useState } from 'react';
import api from '../api/axios';

interface Mahasiswa {
  id: number;
  nrp: string;
  nama: string;
}

interface EditMahasiswaFormProps {
  mahasiswa: Mahasiswa;
  onSuccess: (data: Mahasiswa) => void;
  onCancel: () => void;
}

const EditMahasiswaForm: React.FC<EditMahasiswaFormProps> = ({ mahasiswa, onSuccess, onCancel }) => {
  const [nrp, setNrp] = useState(mahasiswa.nrp);
  const [nama, setNama] = useState(mahasiswa.nama);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!nrp.trim() || !nama.trim()) {
      setError('Semua field wajib diisi.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.put(`/mahasiswa/${mahasiswa.id}`, { nrp, nama });
      if (res.data && res.data.success) {
        onSuccess(res.data.data);
      } else {
        setError(res.data.message || 'Gagal update data');
      }
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Gagal update data');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block font-medium">NRP</label>
        <input
          type="text"
          value={nrp}
          onChange={e => setNrp(e.target.value)}
          className="border rounded px-2 py-1 w-full"
          disabled={loading}
        />
      </div>
      <div>
        <label className="block font-medium">Nama</label>
        <input
          type="text"
          value={nama}
          onChange={e => setNama(e.target.value)}
          className="border rounded px-2 py-1 w-full"
          disabled={loading}
        />
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-3 py-1 rounded bg-gray-200" disabled={loading}>Batal</button>
        <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-white" disabled={loading}>Simpan</button>
      </div>
    </form>
  );
};

export default EditMahasiswaForm;
