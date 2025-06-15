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
}
interface Dosen {
  id: number;
  nama: string;
  nip: string;
}
interface FormValues {
  mahasiswa: string;
  pembimbing_1: string;
  pembimbing_2: string;
}

const PembimbingAssignForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [mahasiswaList, setMahasiswaList] = useState<Mahasiswa[]>([]);
  const [dosenList, setDosenList] = useState<Dosen[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<FormValues>({
    defaultValues: {
      mahasiswa: '',
      pembimbing_1: '',
      pembimbing_2: '',
    },
  });

  useEffect(() => {
    api.get<Mahasiswa[]>('/mahasiswa?without_pembimbing=true').then(res => setMahasiswaList(res.data));
    api.get<Dosen[]>('/dosen').then(res => setDosenList(res.data));
  }, []);

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await api.post('/pembimbing/assign', {
        mahasiswa_id: values.mahasiswa,
        pembimbing_1_id: values.pembimbing_1,
        pembimbing_2_id: values.pembimbing_2,
      });
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
          <h3 className="font-semibold text-lg mb-4 text-center">Assign Pembimbing</h3>
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
                        <SelectItem key={m.id} value={String(m.id)}>{m.nama}</SelectItem>
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
            name="pembimbing_1"
            rules={{ required: 'Pilih pembimbing 1' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pembimbing 1</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange} required>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih Pembimbing 1" />
                    </SelectTrigger>
                    <SelectContent>
                      {dosenList.map(d => (
                        <SelectItem key={d.id} value={String(d.id)}>{d.nama}</SelectItem>
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
            name="pembimbing_2"
            rules={{ required: 'Pilih pembimbing 2' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pembimbing 2</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange} required>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih Pembimbing 2" />
                    </SelectTrigger>
                    <SelectContent>
                      {dosenList.map(d => (
                        <SelectItem key={d.id} value={String(d.id)}>{d.nama}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              <AlertDescription>Pembimbing berhasil ditugaskan</AlertDescription>
            </Alert>
          )}
        </form>
      </Form>
    </Card>
  );
};

export default PembimbingAssignForm;
