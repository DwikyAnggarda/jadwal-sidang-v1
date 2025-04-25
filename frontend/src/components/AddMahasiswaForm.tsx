import React, { useState } from 'react';
import api from '../api/axios';
import { useForm } from 'react-hook-form';
import { Card } from './ui/card';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface FormValues {
  nama: string;
  departemen: string;
}

const AddMahasiswaForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<FormValues>({
    defaultValues: {
      nama: '',
      departemen: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await api.post('/mahasiswa', values);
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
          <h3 className="font-semibold text-lg mb-4 text-center">Tambah Mahasiswa</h3>
          <FormField
            control={form.control}
            name="nama"
            rules={{ required: 'Nama mahasiswa wajib diisi' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nama Mahasiswa</FormLabel>
                <FormControl>
                  <Input type="text" {...field} required />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="departemen"
            rules={{ required: 'Departemen wajib diisi' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Departemen</FormLabel>
                <FormControl>
                  <Input type="text" {...field} required />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Menyimpan...' : 'Simpan'}
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
              <AlertDescription>Mahasiswa berhasil ditambahkan</AlertDescription>
            </Alert>
          )}
        </form>
      </Form>
    </Card>
  );
};

export default AddMahasiswaForm;
