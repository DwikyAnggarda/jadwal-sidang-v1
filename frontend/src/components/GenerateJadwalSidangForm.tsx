import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Download, Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import api from '../api/axios';

interface FormValues {
  tanggal_sidang: string;
  jam_awal: string;
  jam_akhir: string;
  durasi_sidang: string;
  jenis_sidang: string;
  file: FileList;
}

interface Rule {
  id: number;
  jenis_sidang: string;
  durasi_sidang: number;
  jumlah_penguji: number;
  jam_awal: string;
  jam_akhir: string;
  jumlah_sesi: number;
}

const GenerateJadwalSidangForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const form = useForm<FormValues>({
    defaultValues: {
      tanggal_sidang: '',
      jam_awal: '',
      jam_akhir: '',
      durasi_sidang: '60',
      jenis_sidang: '',
    },
  });

  // Fetch rules data saat component mount
  useEffect(() => {
    const fetchRules = async () => {
      try {
        setLoadingRules(true);
        const response = await api.get('/rule');
        setRules(response.data);
        
        // Set default jenis_sidang ke rule pertama jika ada
        if (response.data.length > 0) {
          form.setValue('jenis_sidang', response.data[0].jenis_sidang);
        }
      } catch (err) {
        console.error('Error fetching rules:', err);
        setError('Gagal memuat data jenis sidang');
      } finally {
        setLoadingRules(false);
      }
    };

    fetchRules();
  }, [form]);

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    setWarning(null);

    try {
      const formData = new FormData();
      formData.append('tanggal_sidang', values.tanggal_sidang);
      formData.append('jam_awal', values.jam_awal);
      formData.append('jam_akhir', values.jam_akhir);
      formData.append('durasi_sidang', values.durasi_sidang);
      formData.append('jenis_sidang', values.jenis_sidang);
      
      if (values.file && values.file.length > 0) {
        formData.append('file', values.file[0]);
      }

      const response = await api.post('/moderator/assign', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        },
      });

      if (response.data.success) {
        setSuccess(true);
        if (response.data.warning) {
          setWarning(response.data.warning);
        }
        
        // Reset form
        form.reset();
        setSelectedFile(null);
        setUploadProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        // Redirect setelah 2 detik
        setTimeout(() => {
          navigate('/sidang-group');
        }, 2000);
      }
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.response?.data?.message || err.message || 'Terjadi kesalahan saat generate jadwal');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const response = await api.get('/moderator/template', {
        responseType: 'blob',
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'template_jadwal_sidang.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading template:', err);
      setError('Gagal mengunduh template');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Tanggal Sidang */}
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

        {/* Jam Awal */}
        <FormField
          control={form.control}
          name="jam_awal"
          rules={{ required: 'Jam awal wajib diisi' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Jam Awal</FormLabel>
              <FormControl>
                <Input type="time" {...field} required />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Jam Akhir */}
        <FormField
          control={form.control}
          name="jam_akhir"
          rules={{ 
            required: 'Jam akhir wajib diisi',
            validate: (value) => {
              const jamAwal = form.getValues('jam_awal');
              if (jamAwal && value) {
                const [jamAwalHour, jamAwalMin] = jamAwal.split(':').map(Number);
                const [jamAkhirHour, jamAkhirMin] = value.split(':').map(Number);
                const awal = jamAwalHour * 60 + jamAwalMin;
                const akhir = jamAkhirHour * 60 + jamAkhirMin;
                
                if (akhir <= awal) {
                  return 'Jam akhir harus setelah jam awal';
                }
                
                const durasi = parseInt(form.getValues('durasi_sidang')) || 60;
                const totalWaktu = akhir - awal;
                if (totalWaktu < durasi) {
                  return `Rentang waktu minimal ${durasi} menit untuk satu sesi sidang`;
                }
              }
              return true;
            }
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Jam Akhir</FormLabel>
              <FormControl>
                <Input 
                  type="time" 
                  {...field} 
                  required 
                  onChange={(e) => {
                    field.onChange(e);
                    // Trigger validasi jam awal jika ada
                    if (form.getValues('jam_awal')) {
                      form.trigger('jam_awal');
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Durasi Sidang */}
        <FormField
          control={form.control}
          name="durasi_sidang"
          rules={{ 
            required: 'Durasi sidang wajib diisi',
            min: { value: 1, message: 'Durasi minimal 1 menit' }
          }}
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

        {/* Jenis Sidang */}
        <FormField
          control={form.control}
          name="jenis_sidang"
          rules={{ required: 'Jenis sidang wajib dipilih' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Jenis Sidang</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange} disabled={loadingRules}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingRules ? "Memuat jenis sidang..." : "Pilih jenis sidang"} />
                  </SelectTrigger>
                  <SelectContent>
                    {rules.map((rule) => (
                      <SelectItem key={rule.id} value={rule.jenis_sidang}>
                        {rule.jenis_sidang}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              {loadingRules && (
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Memuat data jenis sidang...
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Template Download */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-800 mb-2">
            Download template Excel terlebih dahulu untuk format data yang benar:
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            disabled={downloadingTemplate}
          >
            <Download className="w-4 h-4 mr-2" />
            {downloadingTemplate ? 'Mengunduh...' : 'Download Template'}
          </Button>
        </div>

        {/* File Upload */}
        <FormField
          control={form.control}
          name="file"
          rules={{ 
            required: 'File Excel wajib diupload',
            validate: {
              fileSize: (files) => {
                if (files && files.length > 0) {
                  const file = files[0];
                  const maxSize = 5 * 1024 * 1024; // 5MB
                  if (file.size > maxSize) {
                    return 'Ukuran file maksimal 5MB';
                  }
                }
                return true;
              },
              fileType: (files) => {
                if (files && files.length > 0) {
                  const file = files[0];
                  const allowedTypes = [
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'application/vnd.ms-excel'
                  ];
                  if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
                    return 'File harus berupa Excel (.xlsx atau .xls)';
                  }
                }
                return true;
              }
            }
          }}
          render={({ field: { onChange } }) => (
            <FormItem>
              <FormLabel>Upload File Excel</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  ref={fileInputRef}
                  onChange={(e) => {
                    onChange(e.target.files);
                    // Set selected file untuk preview
                    if (e.target.files && e.target.files.length > 0) {
                      setSelectedFile(e.target.files[0]);
                    } else {
                      setSelectedFile(null);
                    }
                    // Reset error ketika file baru dipilih
                    if (error) setError(null);
                  }}
                  required
                />
              </FormControl>
              <p className="text-sm text-gray-500">
                Format: NRP, Nama, Judul, Pembimbing 1, Pembimbing 2 (Maksimal 5MB)
              </p>
              {selectedFile && (
                <div className="flex items-center gap-2 p-2 bg-green-50 rounded-md">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-800">
                    File dipilih: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sedang generate jadwal...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Generate Jadwal Sidang
            </>
          )}
        </Button>

        {/* Progress Bar */}
        {loading && uploadProgress > 0 && uploadProgress < 100 && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
            <p className="text-sm text-center mt-1 text-gray-600">
              Upload progress: {uploadProgress}%
            </p>
          </div>
        )}

        {/* Messages */}
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert>
            <AlertTitle>Sukses!</AlertTitle>
            <AlertDescription>
              Jadwal sidang berhasil di-generate. Anda akan diarahkan ke halaman daftar sidang grup...
            </AlertDescription>
          </Alert>
        )}
        
        {warning && (
          <Alert>
            <AlertTitle>Peringatan</AlertTitle>
            <AlertDescription>{warning}</AlertDescription>
          </Alert>
        )}

        {/* Back Button */}
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => navigate('/sidang-group')}
        >
          Kembali ke Daftar Sidang Grup
        </Button>
      </form>
    </Form>
  );
};

export default GenerateJadwalSidangForm;
