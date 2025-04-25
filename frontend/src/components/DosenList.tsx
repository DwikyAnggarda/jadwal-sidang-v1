import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Card } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface Dosen {
  id: number;
  nama: string;
  departemen: string;
}

const DosenList: React.FC = () => {
  const [data, setData] = useState<Dosen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Dosen[]>('/dosen')
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
    <Card className="max-w-2xl mx-auto mt-8 p-6 shadow-lg">
      <h2 className="text-xl font-bold mb-6 text-center">Daftar Dosen</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full border bg-white rounded-lg text-sm">
          <thead className="bg-neutral-100">
            <tr>
              <th className="border px-3 py-2">Nama</th>
              <th className="border px-3 py-2">Departemen</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.id} className="hover:bg-neutral-50 transition">
                <td className="border px-3 py-2 font-medium">{d.nama}</td>
                <td className="border px-3 py-2">{d.departemen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default DosenList;
