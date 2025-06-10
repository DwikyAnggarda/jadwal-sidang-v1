import React, { useState } from 'react';
import api from '../api/axios';
import { useForm } from 'react-hook-form';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface FormValues {
  nama: string;
  departemen: string;
  no_hp: string;
}

interface EditDosenFormProps {
  dosen: { id: number; nama: string; departemen: string; no_hp: string };
  onSuccess: () => void;
  onCancel?: () => void;
}

const EditDosenForm: React.FC<EditDosenFormProps> = ({ dosen, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<FormValues>({
    defaultValues: {
      nama: dosen.nama,
      departemen: dosen.departemen,
      no_hp: dosen.no_hp,
    },
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await api.put(`/dosen/${dosen.id}`, values);
      setSuccess(true);
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
        <h3 className="font-semibold text-lg mb-4 text-center">Edit Dosen</h3>
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
        <div className="flex gap-2">
          <Button type="submit" className="w-fit" disabled={loading}>
            {loading ? 'Menyimpan...' : 'Simpan'}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              Batal
            </Button>
          )}
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert>
            <AlertTitle>Sukses</AlertTitle>
            <AlertDescription>Dosen berhasil diupdate</AlertDescription>
          </Alert>
        )}
      </form>
    </Form>
  );
};

export default EditDosenForm;
