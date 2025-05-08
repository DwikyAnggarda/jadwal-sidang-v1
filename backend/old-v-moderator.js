// Endpoint baru untuk penjadwalan moderator sidang otomatis (v2)
app.post('/sidang/moderator/assign/v2', upload.single('file'), async (req, res) => {
    const { tanggal_sidang, jam_awal, jam_akhir, durasi_sidang } = req.body;
    if (!tanggal_sidang || !jam_awal || !jam_akhir || !durasi_sidang || !req.file) {
        return res.status(400).json({ success: false, message: 'Field tanggal_sidang, jam_awal, jam_akhir, durasi_sidang, dan file diperlukan' });
    }

    let filePath = req.file.path;
    try {
        // Parse Excel
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const excelData = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        const mahasiswaList = excelData.slice(1).filter(row => row[0]);
        fs.unlinkSync(filePath);
        filePath = null;

        // Ambil dosen dan mahasiswa dari DB
        const dosenResult = await pool.query('SELECT id, nama FROM dosen');
        const dosenMap = {};
        dosenResult.rows.forEach(d => { dosenMap[d.nama.trim().toLowerCase()] = d; });
        const mahasiswaResult = await pool.query('SELECT id, nrp, nama FROM mahasiswa');
        const mahasiswaMap = {};
        mahasiswaResult.rows.forEach(m => { mahasiswaMap[m.nrp] = m; });

        // Validasi dan mapping data mahasiswa
        const sidangMahasiswa = [];
        const validationErrors = [];
        for (let i = 0; i < mahasiswaList.length; i++) {
            const row = mahasiswaList[i];
            const [nrp, nama, judul, dosen1, dosen2] = row;
            const rowIndex = i + 2;
            if (!nrp || !nama || !judul || !dosen1 || !dosen2) {
                validationErrors.push(`Row ${rowIndex}: Data tidak lengkap (NRP, Nama, Judul, Pembimbing 1, Pembimbing 2 wajib diisi).`);
                continue;
            }
            const mhs = mahasiswaMap[nrp];
            if (!mhs) {
                validationErrors.push(`Row ${rowIndex}: Mahasiswa dengan NRP ${nrp} tidak ditemukan di database.`);
                continue;
            }
            const d1 = dosenMap[dosen1.trim().toLowerCase()];
            if (!d1) {
                validationErrors.push(`Row ${rowIndex}: Dosen Pembimbing 1 "${dosen1}" tidak ditemukan di database.`);
            }
            const d2 = dosenMap[dosen2.trim().toLowerCase()];
            if (!d2) {
                validationErrors.push(`Row ${rowIndex}: Dosen Pembimbing 2 "${dosen2}" tidak ditemukan di database.`);
            }
            if (d1 && d2) {
                sidangMahasiswa.push({
                    nrp,
                    nama,
                    judul,
                    mahasiswa_id: mhs.id,
                    pembimbing_1_id: d1.id,
                    pembimbing_1_nama: d1.nama,
                    pembimbing_2_id: d2.id,
                    pembimbing_2_nama: d2.nama,
                });
            }
        }
        if (validationErrors.length > 0) {
            return res.status(400).json({ success: false, message: "Validasi data gagal:", errors: validationErrors });
        }

        // Helper waktu
        function timeToMinutes(t) {
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
        }
        function minutesToTime(m) {
            const h = Math.floor(m / 60);
            const min = m % 60;
            return h.toString().padStart(2, '0') + ':' + min.toString().padStart(2, '0');
        }
        const startMinutes = timeToMinutes(jam_awal);
        const endMinutes = timeToMinutes(jam_akhir);
        const durasi = parseInt(durasi_sidang, 10);
        if (isNaN(durasi) || durasi <= 0) {
            return res.status(400).json({ success: false, message: 'Durasi sidang tidak valid.' });
        }
        if (startMinutes >= endMinutes) {
            return res.status(400).json({ success: false, message: 'Jam akhir harus setelah jam awal.' });
        }
        const totalSesi = Math.floor((endMinutes - startMinutes) / durasi);
        if (totalSesi <= 0) {
            return res.status(400).json({ success: false, message: 'Rentang waktu tidak cukup untuk satu sesi sidang.' });
        }

        // 1. Kelompokkan mahasiswa berdasarkan nama pembimbing 1 (urut sesuai Excel)
        const kelompokMap = {};
        sidangMahasiswa.forEach(m => {
            const key = m.pembimbing_1_nama;
            if (!kelompokMap[key]) kelompokMap[key] = [];
            kelompokMap[key].push(m);
        });
        // Urutkan kelompok sesuai urutan kemunculan di Excel
        const kelompokOrder = [];
        sidangMahasiswa.forEach(m => {
            if (!kelompokOrder.includes(m.pembimbing_1_nama)) kelompokOrder.push(m.pembimbing_1_nama);
        });

        // 2. Buat ruangan: satu ruangan diisi mahasiswa dengan moderator (pembimbing 1) yang sama, maksimal totalSesi per ruangan
        let rooms = [];
        let roomNo = 1;
        let sisaMahasiswa = [];
        kelompokOrder.forEach(nama => {
            const group = kelompokMap[nama];
            let idx = 0;
            while (idx < group.length) {
                const chunk = group.slice(idx, idx + totalSesi);
                if (chunk.length === totalSesi) {
                    rooms.push({
                        room: roomNo++,
                        moderator: nama,
                        mahasiswa: chunk
                    });
                } else {
                    // Sisa mahasiswa yang tidak cukup untuk satu ruangan penuh
                    sisaMahasiswa = sisaMahasiswa.concat(chunk);
                }
                idx += totalSesi;
            }
        });

        // 3. Gabungkan sisa mahasiswa ke ruangan campuran (boleh campur moderator) hingga ruangan penuh, kecuali ruangan terakhir
        let idx = 0;
        while (idx < sisaMahasiswa.length) {
            const chunk = sisaMahasiswa.slice(idx, idx + totalSesi);
            rooms.push({
                room: roomNo++,
                moderator: chunk.length === 1 ? chunk[0].pembimbing_1_nama : 'Campuran',
                mahasiswa: chunk
            });
            idx += totalSesi;
        }

        // 4. Penjadwalan sesi per ruangan (jam_awal selalu mulai dari awal per ruangan)
        let output = [];
        let no = 1;
        for (const r of rooms) {
            for (let sesiIdx = 0; sesiIdx < r.mahasiswa.length; sesiIdx++) {
                const m = r.mahasiswa[sesiIdx];
                const jam_mulai = minutesToTime(startMinutes + sesiIdx * durasi);
                const jam_selesai = minutesToTime(startMinutes + (sesiIdx + 1) * durasi);
                output.push({
                    no: no++,
                    tanggal_sidang,
                    jam_mulai,
                    jam_selesai,
                    room: r.room,
                    nrp: m.nrp,
                    nama_mahasiswa: m.nama,
                    judul: m.judul,
                    moderator: r.moderator === 'Campuran' ? m.pembimbing_1_nama : r.moderator,
                    pembimbing_1: m.pembimbing_1_nama,
                    pembimbing_2: m.pembimbing_2_nama
                });
            }
        }

        return res.json({ success: true, data: output });

    } catch (err) {
        console.error("Error in /sidang/moderator/assign:", err);
        if (filePath) {
            try { fs.unlinkSync(filePath); } catch (e) {}
        }
        return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
});

app.post('/sidang/moderator/assign/v3', upload.single('file'), async (req, res) => {
    const { tanggal_sidang, jam_awal, jam_akhir, durasi_sidang } = req.body;
    if (!tanggal_sidang || !jam_awal || !jam_akhir || !durasi_sidang || !req.file) {
        return res.status(400).json({ success: false, message: 'Field tanggal_sidang, jam_awal, jam_akhir, durasi_sidang, dan file diperlukan' });
    }

    let filePath = req.file.path;
    try {
        // Parse Excel
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const excelData = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        const mahasiswaList = excelData.slice(1).filter(row => row[0]);
        fs.unlinkSync(filePath);
        filePath = null;

        // Ambil dosen dan mahasiswa dari DB
        const dosenResult = await pool.query('SELECT id, nama FROM dosen');
        const dosenMap = {};
        dosenResult.rows.forEach(d => { dosenMap[d.nama.trim().toLowerCase()] = d; });
        const mahasiswaResult = await pool.query('SELECT id, nrp, nama FROM mahasiswa');
        const mahasiswaMap = {};
        mahasiswaResult.rows.forEach(m => { mahasiswaMap[m.nrp] = m; });

        // Validasi dan mapping data mahasiswa
        const sidangMahasiswa = [];
        const validationErrors = [];
        for (let i = 0; i < mahasiswaList.length; i++) {
            const row = mahasiswaList[i];
            const [nrp, nama, judul, dosen1, dosen2] = row;
            const rowIndex = i + 2;
            if (!nrp || !nama || !judul || !dosen1 || !dosen2) {
                validationErrors.push(`Row ${rowIndex}: Data tidak lengkap (NRP, Nama, Judul, Pembimbing 1, Pembimbing 2 wajib diisi).`);
                continue;
            }
            const mhs = mahasiswaMap[nrp];
            if (!mhs) {
                validationErrors.push(`Row ${rowIndex}: Mahasiswa dengan NRP ${nrp} tidak ditemukan di database.`);
                continue;
            }
            const d1 = dosenMap[dosen1.trim().toLowerCase()];
            if (!d1) {
                validationErrors.push(`Row ${rowIndex}: Dosen Pembimbing 1 "${dosen1}" tidak ditemukan di database.`);
            }
            const d2 = dosenMap[dosen2.trim().toLowerCase()];
            if (!d2) {
                validationErrors.push(`Row ${rowIndex}: Dosen Pembimbing 2 "${dosen2}" tidak ditemukan di database.`);
            }
            if (d1 && d2) {
                sidangMahasiswa.push({
                    nrp,
                    nama,
                    judul,
                    mahasiswa_id: mhs.id,
                    pembimbing_1_id: d1.id,
                    pembimbing_1_nama: d1.nama,
                    pembimbing_2_id: d2.id,
                    pembimbing_2_nama: d2.nama,
                });
            }
        }
        if (validationErrors.length > 0) {
            return res.status(400).json({ success: false, message: "Validasi data gagal:", errors: validationErrors });
        }

        // Helper waktu
        function timeToMinutes(t) {
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
        }
        function minutesToTime(m) {
            const h = Math.floor(m / 60);
            const min = m % 60;
            return h.toString().padStart(2, '0') + ':' + min.toString().padStart(2, '0');
        }
        const startMinutes = timeToMinutes(jam_awal);
        const endMinutes = timeToMinutes(jam_akhir);
        const durasi = parseInt(durasi_sidang, 10);
        if (isNaN(durasi) || durasi <= 0) {
            return res.status(400).json({ success: false, message: 'Durasi sidang tidak valid.' });
        }
        if (startMinutes >= endMinutes) {
            return res.status(400).json({ success: false, message: 'Jam akhir harus setelah jam awal.' });
        }
        const totalSesi = Math.floor((endMinutes - startMinutes) / durasi);
        if (totalSesi <= 0) {
            return res.status(400).json({ success: false, message: 'Rentang waktu tidak cukup untuk satu sesi sidang.' });
        }

        // 1. Kelompokkan mahasiswa berdasarkan nama pembimbing 1 (urut sesuai Excel)
        const kelompokMap = {};
        sidangMahasiswa.forEach(m => {
            const key = m.pembimbing_1_nama;
            if (!kelompokMap[key]) kelompokMap[key] = [];
            kelompokMap[key].push(m);
        });
        // Urutkan kelompok sesuai urutan kemunculan di Excel
        const kelompokOrder = [];
        sidangMahasiswa.forEach(m => {
            if (!kelompokOrder.includes(m.pembimbing_1_nama)) kelompokOrder.push(m.pembimbing_1_nama);
        });

        // 2. Buat ruangan: satu ruangan diisi mahasiswa dengan moderator (pembimbing 1) yang sama, maksimal totalSesi per ruangan
        let rooms = [];
        let roomNo = 1;
        kelompokOrder.forEach(nama => {
            const group = kelompokMap[nama];
            let idx = 0;
            while (idx < group.length) {
                const chunk = group.slice(idx, idx + totalSesi);
                rooms.push({
                    room: roomNo++,
                    moderator: nama,
                    mahasiswa: chunk
                });
                idx += totalSesi;
            }
        });

        // --- REVISI: Gabungkan ruangan-ruangan yang hanya berisi satu mahasiswa saja ---
        // 1. Identifikasi ruangan satuan
        let singleRooms = [];
        let otherRooms = [];
        for (const r of rooms) {
            if (r.mahasiswa.length === 1) {
                singleRooms.push(r);
            } else {
                otherRooms.push(r);
            }
        }

        // 2. Jika ada lebih dari satu ruangan satuan, gabungkan menjadi grup baru
        if (singleRooms.length > 1) {
            // Kumpulkan mahasiswa satuan, urut sesuai urutan Excel
            const nrpOrder = sidangMahasiswa.map(m => m.nrp);
            singleRooms.sort((a, b) => {
                return nrpOrder.indexOf(a.mahasiswa[0].nrp) - nrpOrder.indexOf(b.mahasiswa[0].nrp);
            });
            const allSingleMahasiswa = singleRooms.map(r => r.mahasiswa[0]);

            // Bagi menjadi grup-grup minimal 2, maksimal totalSesi
            let idx = 0;
            let newRooms = [];
            while (idx < allSingleMahasiswa.length) {
                let chunkSize = Math.min(totalSesi, allSingleMahasiswa.length - idx);
                // Jika sisa terakhir hanya 1, dan chunk sebelumnya >=2, buat ruangan satuan di akhir
                if (allSingleMahasiswa.length - idx === 1 && newRooms.length > 0) {
                    chunkSize = 1;
                } else if (chunkSize < 2 && allSingleMahasiswa.length - idx > 1) {
                    chunkSize = 2;
                }
                const chunk = allSingleMahasiswa.slice(idx, idx + chunkSize);
                // Untuk setiap mahasiswa di chunk, moderator tetap pembimbing 1 masing-masing
                for (const m of chunk) {
                    newRooms.push({
                        room: roomNo++,
                        moderator: m.pembimbing_1_nama,
                        mahasiswa: [m]
                    });
                }
                idx += chunkSize;
            }

            // Gabungkan ruangan baru (hasil penggabungan) ke otherRooms
            // Namun, jika ada chunk dengan lebih dari 1 mahasiswa, jadikan satu ruangan
            let mergedRooms = [];
            let temp = [];
            for (let i = 0; i < allSingleMahasiswa.length;) {
                let remaining = allSingleMahasiswa.length - i;
                let size = Math.min(totalSesi, remaining);
                if (remaining === 1 && temp.length > 0) {
                    size = 1;
                } else if (size < 2 && remaining > 1) {
                    size = 2;
                }
                const chunk = allSingleMahasiswa.slice(i, i + size);
                if (chunk.length === 1) {
                    // Ruangan satuan (hanya jika benar-benar sisa satu)
                    mergedRooms.push({
                        room: roomNo++,
                        moderator: chunk[0].pembimbing_1_nama,
                        mahasiswa: [chunk[0]]
                    });
                } else {
                    // Ruangan gabungan, moderator tetap sesuai pembimbing 1 masing-masing
                    mergedRooms.push({
                        room: roomNo++,
                        moderator: null, // akan diisi per mahasiswa pada output
                        mahasiswa: chunk
                    });
                }
                i += size;
            }
            // Gabungkan dengan ruangan lain yang bukan satuan
            rooms = otherRooms.concat(mergedRooms);
        } else {
            // Tidak ada atau hanya satu ruangan satuan, tidak perlu penggabungan
            rooms = otherRooms.concat(singleRooms);
        }

        // --- PENOMORAN ULANG ROOM SECARA BERURUTAN ---
        // Setelah rooms final terbentuk, urutkan ulang nomor ruangan agar berurutan mulai dari 1
        rooms.forEach((r, idx) => {
            r.room = idx + 1;
        });

        // 4. Penjadwalan sesi per ruangan (jam_awal selalu mulai dari awal per ruangan)
        let output = [];
        let no = 1;
        for (const r of rooms) {
            for (let sesiIdx = 0; sesiIdx < r.mahasiswa.length; sesiIdx++) {
                const m = r.mahasiswa[sesiIdx];
                const jam_mulai = minutesToTime(startMinutes + sesiIdx * durasi);
                const jam_selesai = minutesToTime(startMinutes + (sesiIdx + 1) * durasi);
                output.push({
                    no: no++,
                    tanggal_sidang,
                    jam_mulai,
                    jam_selesai,
                    room: r.room,
                    nrp: m.nrp,
                    nama_mahasiswa: m.nama,
                    judul: m.judul,
                    moderator: r.moderator ? r.moderator : m.pembimbing_1_nama,
                    pembimbing_1: m.pembimbing_1_nama,
                    pembimbing_2: m.pembimbing_2_nama
                });
            }
        }

        return res.json({ success: true, data: output });

    } catch (err) {
        console.error("Error in /sidang/moderator/assign:", err);
        if (filePath) {
            try { fs.unlinkSync(filePath); } catch (e) { }
        }
        return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
});