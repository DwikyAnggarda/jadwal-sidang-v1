import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useForm } from 'react-hook-form';
import { Card } from './ui/card';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface Mahasiswa {
  id: number;
  nama: string;
  departemen: string;
}
interface FormValues {
  mahasiswa: string;
  tanggal_sidang: string;
  jam_mulai_sidang: string;
  durasi_sidang: string;
  room: string;
}

const SidangAssignForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [mahasiswaList, setMahasiswaList] = useState<Mahasiswa[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  const form = useForm<FormValues>({
    defaultValues: {
      mahasiswa: '',
      tanggal_sidang: '',
      jam_mulai_sidang: '',
      durasi_sidang: '',
      room: '',
    },
  });

  useEffect(() => {
    api.get<Mahasiswa[]>('/mahasiswa?with_pembimbing=true&without_sidang=true').then(res => setMahasiswaList(res.data));
  }, []);

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    setWarning(null);
    try {
      const res = await api.post('/sidang/assign', {
        mahasiswa_id: values.mahasiswa,
        tanggal_sidang: values.tanggal_sidang,
        jam_mulai_sidang: values.jam_mulai_sidang,
        durasi_sidang: values.durasi_sidang,
        room: values.room,
      });
      if (res.data && res.data.warning) {
        setWarning(res.data.warning);
      }
      setSuccess(true);
      form.reset();
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto p-6 mt-6 shadow-lg">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <h3 className="font-semibold text-lg mb-4 text-center">Assign Jadwal Sidang</h3>
          <FormField
            control={form.control}
            name="mahasiswa"
            rules={{ required: 'Pilih mahasiswa' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mahasiswa</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange} required>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih Mahasiswa" />
                    </SelectTrigger>
                    <SelectContent>
                      {mahasiswaList.map(m => (
                        <SelectItem key={m.id} value={String(m.id)}>{m.nama} ({m.departemen})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tanggal_sidang"
            rules={{ required: 'Tanggal sidang wajib diisi' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tanggal Sidang</FormLabel>
                <FormControl>
                  <Input type="date" {...field} required />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="jam_mulai_sidang"
            rules={{ required: 'Jam mulai sidang wajib diisi' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Jam Mulai Sidang</FormLabel>
                <FormControl>
                  <Input type="time" {...field} required />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="durasi_sidang"
            rules={{ required: 'Durasi sidang wajib diisi' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Durasi Sidang (menit)</FormLabel>
                <FormControl>
                  <Input type="number" min={1} {...field} required />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="room"
            rules={{ required: 'Ruangan wajib diisi' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ruangan</FormLabel>
                <FormControl>
                  <Input type="text" {...field} required />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Assigning...' : 'Assign'}
          </Button>
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert>
              <AlertTitle>Sukses</AlertTitle>
              <AlertDescription>Jadwal sidang berhasil ditetapkan</AlertDescription>
            </Alert>
          )}
          {warning && (
            <Alert>
              <AlertTitle>Peringatan</AlertTitle>
              <AlertDescription>{warning}</AlertDescription>
            </Alert>
          )}
        </form>
      </Form>
    </Card>
  );
};

export default SidangAssignForm;
