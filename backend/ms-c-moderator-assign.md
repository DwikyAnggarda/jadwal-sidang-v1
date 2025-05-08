Berikut adalah aturan yang telah disusun ulang sesuai dengan arahan, dengan fokus pada penentuan moderator dan validasi konflik, serta penyesuaian input data dan pembatasan sesi per ruangan:

---

## **Rules untuk Penentuan Moderator Sidang Mahasiswa**

### 1. **Input Data**

- **Data Mahasiswa:**  
  Diimpor dari file Excel yang memuat kolom:
  - **NRP**
  - **NAMA**
  - **JUDUL**
  - **PEMBIMBING 1**
  - **PEMBIMBING 2**

- **Input Tambahan:**  
  Parameter-parameter yang tidak terdapat pada file Excel diinput secara terpisah, yaitu:
  - **Tanggal Sidang**
  - **Jam Awal Sidang**
  - **Maksimal Jam Sidang/Jam Akhir**
  - **Durasi Sidang**

### 2. **Pengelompokan Mahasiswa**

- **Pengelompokan Berdasarkan Pembimbing 1:**  
  Mahasiswa dikelompokkan berdasarkan dosen pada kolom **PEMBIMBING 1**.  
- **Penetapan Moderator Awal:**  
  Setiap kelompok awalnya mendapatkan moderator default, yaitu dosen dari **PEMBIMBING 1**.

### 3. **Penentuan Sesi dan Penjadwalan Ruangan**

- **Perhitungan Jumlah Sesi:**  
  Gunakan rumus berikut untuk menghitung jumlah sesi:
  ```
  Jumlah Sesi = (Maksimal Jam Sidang - Jam Awal Sidang) / Durasi Sidang
  ```
- **Pembatasan Sesi dalam Ruangan:**  
  Meskipun hasil perhitungan mungkin menghasilkan lebih dari 3 sesi, setiap ruangan dibatasi maksimal **3 sesi persidangan**. Jika diperlukan, pendistribusian ke ruangan tambahan harus dilakukan sedemikian rupa sehingga tidak ada ruangan yang melebihi batas tersebut.

### 4. **Penentuan Moderator dalam Ruangan**

- **Alokasi Moderator Sesuai Kuota Sesi:**  
  - Jika jumlah kelompok (berdasarkan **PEMBIMBING 1**) kurang dari atau sama dengan jumlah sesi di ruangan, maka masing-masing kelompok menggunakan dosen **PEMBIMBING 1** sebagai moderator.
  - Jika jumlah kelompok melebihi kuota sesi yang tersedia dalam satu ruangan, maka:
    - Moderator default tetap diisi oleh dosen **PEMBIMBING 1** untuk kelompok-kelompok tertentu.
    - Untuk kelompok sisanya yang masih harus dimuat dalam ruangan yang sama, gunakan dosen **PEMBIMBING 2** sebagai moderator tambahan.
    
- **Uniqueness Moderator:**  
  Pastikan setiap moderator bersifat unik dalam setiap ruangan. Artinya, seorang dosen tidak boleh dijadwalkan sebagai moderator di lebih dari satu ruangan dalam sesi sidang yang sama.

### 5. **Validasi Konflik Moderator**

- **Pengecekan Konflik:**  
  Selama proses penentuan moderator, lakukan validasi sehingga:
  - Seorang dosen tidak dijadwalkan sebagai moderator di dua ruangan atau lebih pada waktu sidang yang sama.
- **Penanganan Konflik:**  
  Jika ditemukan konflik, sistem harus:
  - Menampilkan notifikasi atau log error.
  - Mengaktifkan mekanisme penyesuaian ulang agar dosen yang bersangkutan hanya terjadwal di satu ruangan.

### 6. **Implementasi dengan GitHub Copilot**

- **Parsing Data:**  
  Gunakan GitHub Copilot untuk mengotomasi pembacaan dan parsing file Excel yang hanya memuat kolom **NRP, NAMA, JUDUL, PEMBIMBING 1, dan PEMBIMBING 2**.
  
- **Pengambilan Input Tambahan:**  
  Integrasikan input pengguna untuk **Tanggal Sidang, Jam Awal Sidang, Maksimal Jam Sidang/Jam Akhir, dan Durasi Sidang** sebagai parameter penyusunan jadwal.
  
- **Pengelompokan dan Penjadwalan:**  
  - Kelompokkan data berdasarkan **PEMBIMBING 1**.
  - Hitung jumlah sesi menggunakan rumus yang telah ditentukan.
  - Alokasikan moderator untuk tiap ruangan dengan batas maksimal 3 sesi per ruangan, menggunakan **PEMBIMBING 1** dan ditambah **PEMBIMBING 2** jika diperlukan.
  
- **Validasi Konflik:**  
  Implementasikan fungsi pengecekan untuk memastikan bahwa tiap dosen hanya memiliki satu alokasi moderator per waktu sidang.
  
Dengan aturan dan langkah-langkah tersebut, sistem penjadwalan sidang dapat memastikan penentuan moderator yang terstruktur, bebas konflik, dan sesuai dengan parameter waktu yang telah ditentukan.