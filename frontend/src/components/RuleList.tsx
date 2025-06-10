import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';

interface Rule {
  id: number;
  jenis_sidang: string;
  durasi_sidang: number;
  jumlah_sesi: number;
}

const defaultForm: Omit<Rule, 'id'> = {
  jenis_sidang: '',
  durasi_sidang: 60,
  jumlah_sesi: 3,
};

const RuleList: React.FC = () => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Rule, 'id'>>(defaultForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchRules = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Rule[]>('/rule');
      setRules(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal memuat data rule');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRules(); }, []);

  const openAdd = () => {
    setForm(defaultForm);
    setEditId(null);
    setFormError(null);
    setModalOpen(true);
  };
  const openEdit = (rule: Rule) => {
    setForm({ jenis_sidang: rule.jenis_sidang, durasi_sidang: rule.durasi_sidang, jumlah_sesi: rule.jumlah_sesi });
    setEditId(rule.id);
    setFormError(null);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditId(null);
    setForm(defaultForm);
    setFormError(null);
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: name === 'jenis_sidang' ? value : Number(value) }));
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      if (editId) {
        const res = await api.put(`/rule/${editId}`, form);
        if (res.data.success) setSuccessMsg('Rule berhasil diupdate');
      } else {
        const res = await api.post('/rule', form);
        if (res.data.success) setSuccessMsg('Rule berhasil ditambah');
      }
      closeModal();
      fetchRules();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Gagal simpan data');
    }
  };
  const handleDelete = async (id: number) => {
    if (!window.confirm('Yakin hapus rule ini?')) return;
    try {
      const res = await api.delete(`/rule/${id}`);
      if (res.data.success) setSuccessMsg('Rule berhasil dihapus');
      fetchRules();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal hapus rule');
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-8 p-4 bg-white rounded shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Data Rule</h2>
        <Button onClick={openAdd}>Tambah Rule</Button>
      </div>
      {successMsg && <Alert className="mb-2" variant="success"><AlertTitle>Sukses</AlertTitle><AlertDescription>{successMsg}</AlertDescription></Alert>}
      {error && <Alert className="mb-2" variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      <table className="w-full border text-sm">
        <thead className="bg-neutral-100">
          <tr>
            <th className="border px-2 py-1">Jenis Sidang</th>
            <th className="border px-2 py-1">Durasi Sidang (menit)</th>
            <th className="border px-2 py-1">Jumlah Sesi</th>
            <th className="border px-2 py-1">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={4} className="text-center py-4">Memuat...</td></tr>
          ) : rules.length === 0 ? (
            <tr><td colSpan={4} className="text-center py-4">Tidak ada data rule</td></tr>
          ) : rules.map(rule => (
            <tr key={rule.id}>
              <td className="border px-2 py-1">{rule.jenis_sidang}</td>
              <td className="border px-2 py-1">{rule.durasi_sidang}</td>
              <td className="border px-2 py-1">{rule.jumlah_sesi}</td>
              <td className="border px-2 py-1 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(rule)}>Edit</Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(rule.id)}>Hapus</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Dialog open={modalOpen} onOpenChange={open => { if (!open) closeModal(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Rule' : 'Tambah Rule'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium">Jenis Sidang</label>
              <input name="jenis_sidang" value={form.jenis_sidang} onChange={handleChange} className="border rounded px-2 py-1 w-full" required />
            </div>
            <div>
              <label className="block text-sm font-medium">Durasi Sidang (menit)</label>
              <input name="durasi_sidang" type="number" min={1} value={form.durasi_sidang} onChange={handleChange} className="border rounded px-2 py-1 w-full" required />
            </div>
            <div>
              <label className="block text-sm font-medium">Jumlah Sesi</label>
              <input name="jumlah_sesi" type="number" min={1} value={form.jumlah_sesi} onChange={handleChange} className="border rounded px-2 py-1 w-full" required />
            </div>
            {formError && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{formError}</AlertDescription></Alert>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={closeModal}>Batal</Button>
              <Button type="submit">{editId ? 'Update' : 'Tambah'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RuleList;
