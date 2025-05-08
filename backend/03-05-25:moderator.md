Berikut adalah improvement pada rules yang dapat digunakan di GitHub Copilot untuk menentukan moderator sidang mahasiswa, dengan fokus hanya pada moderator (mengabaikan penguji untuk saat ini). Rules ini dirancang agar Anda dapat mengelompokkan mahasiswa berdasarkan moderator (dosen pembimbing 1 dan pembimbing 2) serta mengatur jadwal sidang secara terstruktur dan jelas.

---

## **Rules untuk Penentuan Moderator**

### **Endpoint**
- /moderator/assign

### **Tujuan**
- Menentukan moderator untuk sidang mahasiswa.
- Mengelompokkan mahasiswa ke dalam ruangan berdasarkan moderator.
- Memastikan jadwal sidang sesuai dengan aturan yang ada tanpa konflik.

### **Input Data**
- **NRP** (Nomor Registrasi Pokok) mahasiswa
- **Nama mahasiswa**
- **Dosen pembimbing 1**
- **Dosen pembimbing 2**
- **Tanggal sidang**
- **Jam awal sidang**
- **Jam akhir sidang**
- **Durasi sidang**

### **Database yang Dibutuhkan**
- **Tabel mahasiswa**: Berisi data mahasiswa seperti NRP, nama, dll.
- **Tabel dosen**: Berisi data dosen.
- **Tabel rule**: Berisi aturan sidang. kolom-kolomnya adalah jenis_sidang (SPPA, KP, PA), durasi_sidang, jam_awal, jam_akhir

### **Langkah-langkah Penentuan Moderator**

#### **1. Kelompokkan Mahasiswa Berdasarkan Pembimbing 1**
- Grupkan mahasiswa yang memiliki **dosen pembimbing 1** yang sama ke dalam satu kelompok.
- Moderator awal untuk setiap kelompok adalah **dosen pembimbing 1**.

#### **2. Hitung Jumlah Sesi Sidang**
- Hitung jumlah sesi yang tersedia dengan rumus:
  ```
  Jumlah sesi = (Jam akhir sidang - Jam awal sidang) / Durasi per sidang
  ```
- Contoh:
  - Jam awal = 08:00
  - Jam akhir = 12:00
  - Durasi per sidang = 1 jam
  - Jumlah sesi = (12 - 8) / 1 = 4 sesi.

#### **3. Tentukan Moderator untuk Setiap Ruangan**
- **Jika jumlah kelompok ≤ jumlah sesi**:
  - Setiap kelompok ditempatkan di ruangan berbeda dengan moderator = **dosen pembimbing 1**.
- **Jika jumlah kelompok > jumlah sesi**:
  - Gunakan **dosen pembimbing 2** sebagai moderator tambahan untuk kelompok yang tidak kebagian ruangan.
  - Pastikan tidak ada moderator yang sama di dua ruangan berbeda pada sesi yang sama.

#### **4. Alokasikan Mahasiswa ke Ruangan**
- Setiap ruangan memiliki satu moderator yang unik.
- Mahasiswa dikelompokkan ke ruangan berdasarkan moderator (pembimbing 1 atau pembimbing 2).
- Pastikan jumlah mahasiswa per ruangan tidak melebihi **kapasitas ruangan** yang ditentukan di tabel rule.

#### **5. Atur Jadwal Sidang**
- Tentukan jadwal sidang untuk setiap ruangan berdasarkan sesi yang tersedia.
- Pastikan tidak ada moderator yang bertugas di lebih dari satu ruangan pada sesi yang sama.

### **Rules Tambahan**
- **Aturan Konflik Jadwal**: Moderator tidak boleh dijadwalkan di dua ruangan berbeda pada waktu yang sama.
- **Prioritas Pembimbing 1**: Selalu utamakan dosen pembimbing 1 sebagai moderator jika memungkinkan.
- **Batasan Beban Moderator**: Jika ada batas maksimum sidang per moderator (misalnya dari tabel rule), pastikan tidak melebihi batas tersebut.

---

## **Contoh Implementasi**
Misalkan:
- Ada 10 mahasiswa.
- Ada 5 dosen pembimbing.
- Jumlah sesi = 4.
- Kapasitas ruangan = 3 mahasiswa per ruangan.

**Langkah 1**: Kelompokkan mahasiswa berdasarkan pembimbing 1. Misalnya, terbentuk 3 kelompok dengan pembimbing 1 yang berbeda.

**Langkah 2**: Karena jumlah kelompok (3) ≤ jumlah sesi (4), setiap kelompok ditempatkan di ruangan terpisah dengan moderator = pembimbing 1.

**Langkah 3**: Jika ada kelompok tambahan (misalnya jumlah kelompok jadi 5), gunakan pembimbing 2 sebagai moderator untuk kelompok yang tersisa.

**Langkah 4**: Alokasikan mahasiswa ke ruangan sesuai moderator, pastikan tidak melebihi kapasitas (3 mahasiswa per ruangan).

**Langkah 5**: Atur jadwal sidang per sesi, pastikan tidak ada moderator yang bentrok.