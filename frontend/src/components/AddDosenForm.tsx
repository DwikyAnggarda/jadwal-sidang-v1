import React, { useState } from 'react';
import api from '../api/axios';
import { useForm } from 'react-hook-form';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface FormValues {
  nama: string;
  nip: string;
  no_hp: string;
}

const AddDosenForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<FormValues>({
    defaultValues: {
      nama: '',
      nip: '',
      no_hp: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await api.post('/dosen', values);
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <h3 className="font-semibold text-lg mb-4 text-center">Tambah Dosen</h3>
        <FormField
          control={form.control}
          name="nama"
          rules={{ required: 'Nama dosen wajib diisi' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Dosen</FormLabel>
              <FormControl>
                <Input type="text" {...field} required />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="nip"
          rules={{ required: 'NIP wajib diisi' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>NIP</FormLabel>
              <FormControl>
                <Input type="text" {...field} required />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="no_hp"
          render={({ field }) => (
            <FormItem>
              <FormLabel>No. HP</FormLabel>
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
            <AlertDescription>Dosen berhasil ditambahkan</AlertDescription>
          </Alert>
        )}
      </form>
    </Form>
  );
};

export default AddDosenForm;
