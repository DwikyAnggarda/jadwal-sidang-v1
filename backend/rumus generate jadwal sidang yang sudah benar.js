// Endpoint untuk penjadwalan moderator sidang otomatis (OLD - replaced by /sidang/moderator/assign)
app.post('/moderator/assign', upload.single('file'), async (req, res) => {
    const { tanggal_sidang, jam_awal, jam_akhir, durasi_sidang } = req.body;

    // Validasi field wajib
    if (!tanggal_sidang || !jam_awal || !jam_akhir || !durasi_sidang || !req.file) {
        return res.status(400).json({ success: false, message: 'Field tanggal_sidang, jam_awal, jam_akhir, durasi_sidang, dan file diperlukan' });
    }

    // Validasi file harus Excel
    if (!req.file.originalname.match(/\.(xlsx|xls)$/i)) {
        return res.status(400).json({ success: false, message: 'File harus berupa Excel (.xlsx/.xls)' });
    }

    // Validasi durasi_sidang harus angka positif
    const durasi = parseInt(durasi_sidang, 10);
    if (isNaN(durasi) || durasi <= 0) {
        return res.status(400).json({ success: false, message: 'Durasi sidang harus angka positif' });
    }

    // Validasi jam_awal < jam_akhir
    const [jamAwal, menitAwal] = jam_awal.split(':').map(Number);
    const [jamAkhir, menitAkhir] = jam_akhir.split(':').map(Number);
    const totalAwal = jamAwal * 60 + menitAwal;
    const totalAkhir = jamAkhir * 60 + menitAkhir;
    if (totalAkhir <= totalAwal) {
        return res.status(400).json({ success: false, message: 'jam_akhir harus setelah jam_awal' });
    }

    // Parse Excel
    let mahasiswaList;
    try {
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        mahasiswaList = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        mahasiswaList = mahasiswaList.slice(1).filter(row => row[0]);
    } catch (err) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, message: 'File excel tidak valid' });
    }
    fs.unlinkSync(req.file.path);

    try {
        // Ambil semua dosen
        const dosenResult = await pool.query('SELECT id, nama FROM dosen');
        const dosenMap = {};
        dosenResult.rows.forEach(d => { dosenMap[d.nama.trim().toLowerCase()] = d; });

        // Ambil semua mahasiswa
        const mahasiswaResult = await pool.query('SELECT id, nrp, nama FROM mahasiswa');
        const mahasiswaMap = {};
        mahasiswaResult.rows.forEach(m => { mahasiswaMap[m.nrp] = m; });

        // Siapkan data mahasiswa sidang
        const sidangMahasiswa = [];
        for (const row of mahasiswaList) {
            const [nrp, nama, judul, dosen1, dosen2] = row;
            // Revisi: dosen2 juga wajib
            if (!nrp || !nama || !judul || !dosen1 || !dosen2) {
                return res.status(400).json({ success: false, message: `Data tidak lengkap pada NRP ${nrp}` });
            }
            const mhs = mahasiswaResult.rows.find(m => m.nrp == nrp);
            if (!mhs) {
                return res.status(400).json({ success: false, message: `Mahasiswa dengan NRP ${nrp} tidak ditemukan di database` });
            }
            const d1 = dosenMap[dosen1.trim().toLowerCase()];
            const d2 = dosenMap[dosen2.trim().toLowerCase()];
            if (!d1) {
                return res.status(400).json({ success: false, message: `Dosen pembimbing 1 tidak ditemukan untuk NRP ${nrp}` });
            }
            if (!d2) {
                return res.status(400).json({ success: false, message: `Dosen pembimbing 2 tidak ditemukan untuk NRP ${nrp}` });
            }
            sidangMahasiswa.push({
                nrp, nama, judul,
                mahasiswa_id: mhs.id,
                pembimbing_1_id: d1.id,
                pembimbing_2_id: d2.id,
                pembimbing_1_nama: d1.nama,
                pembimbing_2_nama: d2.nama
            });
        }

        // Hitung sesi
        function timeToMinutes(t) {
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
        }
        function minutesToTime(m) {
            const h = Math.floor(m / 60);
            const min = m % 60;
            return h.toString().padStart(2, '0') + ':' + min.toString().padStart(2, '0');
        }
        let startMinutes = timeToMinutes(jam_awal);
        let endMinutes = timeToMinutes(jam_akhir);
        let durasi = parseInt(durasi_sidang, 10);
        if (isNaN(durasi) || durasi <= 0) {
            return res.status(400).json({ success: false, message: 'Durasi sidang tidak valid.' });
        }
        if (startMinutes >= endMinutes) {
            return res.status(400).json({ success: false, message: 'Jam akhir harus setelah jam awal.' });
        }
        // const totalSesi = Math.floor((endMinutes - startMinutes) / durasi);
        const totalSesi = 3;
        console.log('Total sesi:', totalSesi);
        if (totalSesi <= 0) {
            return res.status(400).json({ success: false, message: 'Rentang waktu tidak cukup untuk satu sesi sidang.' });
        }

        // Penjadwalan moderator sesuai algoritma revisi
        // Tracking jumlah sesi moderator per dosen per hari
        const moderatorSesiMap = {}; // key: dosen_nama, value: jumlah sesi
        // Tracking dosen yang sudah pernah menjadi penguji di kelas manapun
        const dosenPernahPenguji = new Set();
        // Tracking dosen yang sudah pernah menjadi moderator di kelas manapun
        const dosenPernahModerator = new Set();
        let output = [];
        let no = 1;

        // Step 1: Tentukan moderator untuk setiap mahasiswa
        let mahasiswaWithModerator = sidangMahasiswa.map((m, idx) => {
            const pembimbing1Nama = m.pembimbing_1_nama;
            const pembimbing2Nama = m.pembimbing_2_nama;
            if (!moderatorSesiMap[pembimbing1Nama]) moderatorSesiMap[pembimbing1Nama] = 0;
            if (!moderatorSesiMap[pembimbing2Nama]) moderatorSesiMap[pembimbing2Nama] = 0;
            let moderatorNama = null;
            // Pilih moderator yang belum pernah menjadi penguji di kelas manapun
            if (
                moderatorSesiMap[pembimbing1Nama] < totalSesi &&
                !dosenPernahPenguji.has(pembimbing1Nama)
            ) {
                moderatorNama = pembimbing1Nama;
                moderatorSesiMap[pembimbing1Nama]++;
                dosenPernahModerator.add(pembimbing1Nama);
            } else if (
                moderatorSesiMap[pembimbing2Nama] < totalSesi &&
                !dosenPernahPenguji.has(pembimbing2Nama)
            ) {
                moderatorNama = pembimbing2Nama;
                moderatorSesiMap[pembimbing2Nama]++;
                dosenPernahModerator.add(pembimbing2Nama);
            } else {
                throw new Error(`Tidak ada dosen yang bisa menjadi moderator untuk mahasiswa ${m.nama} (NRP ${m.nrp}). Pembimbing 1 & 2 sudah menjadi penguji atau mencapai batas sesi.`);
            }
            return {
                ...m,
                moderator: moderatorNama,
                idx // simpan urutan awal untuk penjadwalan jam
            };
        });

        // Step 2: Group mahasiswa berdasarkan moderator
        const moderatorGroups = {};
        mahasiswaWithModerator.forEach(m => {
            if (!moderatorGroups[m.moderator]) moderatorGroups[m.moderator] = [];
            moderatorGroups[m.moderator].push(m);
        });

        // Step 3: Buat output dengan penomoran room urut dan penjadwalan jam sesuai urutan awal
        let roomNo = 1;
        let sesiIdx = 0;
        let finalOutput = [];
        Object.keys(moderatorGroups).forEach(moderatorNama => {
            const group = moderatorGroups[moderatorNama];
            group.forEach(m => {
                const jam_mulai = minutesToTime(startMinutes + sesiIdx * durasi);
                const jam_selesai = minutesToTime(startMinutes + (sesiIdx + 1) * durasi);
                finalOutput.push({
                    no: no++,
                    tanggal_sidang,
                    jam_mulai,
                    jam_selesai,
                    room: roomNo,
                    nrp: m.nrp,
                    nama_mahasiswa: m.nama,
                    judul: m.judul,
                    moderator: m.moderator,
                    pembimbing_1: m.pembimbing_1_nama,
                    pembimbing_2: m.pembimbing_2_nama
                });
                sesiIdx++;
            });
            roomNo++;
        });

        // --- Mulai regrouping kelas ---
        // Aturan: totalSesi per kelas, gabungkan room yang < totalSesi sesuai instruksi user

        function timeToMinutesAgain(t) {
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
        }
        function minutesToTimeAgain(m) {
            const h = Math.floor(m / 60);
            const min = m % 60;
            return h.toString().padStart(2, '0') + ':' + min.toString().padStart(2, '0');
        }
        startMinutes = timeToMinutesAgain(jam_awal);
        durasi = parseInt(durasi_sidang, 10);

        // Step 1: Group by room
        const roomMap = {};
        finalOutput.forEach(m => {
            if (!roomMap[m.room]) roomMap[m.room] = [];
            roomMap[m.room].push(m);
        });

        // Step 2: Pisahkan room yang sudah totalSesi dan yang kurang
        let kelasUtuh = [];
        let sisaMahasiswa = [];
        Object.values(roomMap).forEach(arr => {
            if (arr.length === totalSesi) {
                kelasUtuh.push(arr);
            } else {
                sisaMahasiswa = sisaMahasiswa.concat(arr);
            }
        });

        // Step 3: Gabungkan sisa mahasiswa menjadi kelas baru, max totalSesi per kelas
        let kelasGabungan = [];
        let temp = [];
        for (let i = 0; i < sisaMahasiswa.length; i++) {
            temp.push(sisaMahasiswa[i]);
            if (temp.length === totalSesi) {
                kelasGabungan.push(temp);
                temp = [];
            }
        }
        if (temp.length > 0) {
            kelasGabungan.push(temp); // kelas terakhir bisa < totalSesi
        }

        // Step 4: Gabungkan semua kelas dan beri nomor urut kelas
        let semuaKelas = [...kelasUtuh, ...kelasGabungan];
        let hasilAkhir = [];
        let kelasNo = 1;

        // Ambil seluruh nama dosen
        const allDosenNama = dosenResult.rows.map(d => d.nama);

        // Set global untuk tracking dosen yang sudah menjadi moderator atau penguji di kelas manapun
        const dosenSudahDipakai = new Set();

        // Per kelas, reset jam mulai untuk penjadwalan sesi di kelas tsb
        let kelasStartMinutes = startMinutes;
        let warningJadwal = false;
        for (let kelas of semuaKelas) {
            let sesiKelas = kelas.length;
            let kelasEndMinutes = kelasStartMinutes + sesiKelas * durasi;
            if (kelasEndMinutes > endMinutes) {
                kelasStartMinutes = startMinutes;
                kelasEndMinutes = kelasStartMinutes + sesiKelas * durasi;
                if (kelasEndMinutes > endMinutes) {
                    warningJadwal = true;
                    hasilAkhir.push(...kelas.map(m => ({
                        ...m,
                        kelas: kelasNo,
                        jam_mulai: null,
                        jam_selesai: null,
                        penguji_1: null,
                        penguji_2: null
                    })));
                    kelasNo++;
                    continue;
                }
            }

            const moderatorKelas = kelas.map(m => m.moderator);
            moderatorKelas.forEach(nama => dosenSudahDipakai.add(nama));
            const pembimbingKelas = kelas.flatMap(m => [m.pembimbing_1, m.pembimbing_2]);

            // Per kelas, pastikan tidak ada penguji yang sama di kelas yang sama
            let pengujiSudahDipakaiDiKelas = new Set();

            // Fungsi untuk mencari kandidat penguji dengan fallback berlapis
            function cariPengujiKandidat() {
                // 1. Belum pernah jadi moderator/penguji di kelas manapun, bukan moderator/pembimbing di kelas ini, belum dipakai di kelas ini
                let kandidat = allDosenNama.filter(nama =>
                    !moderatorKelas.includes(nama) &&
                    !pembimbingKelas.includes(nama) &&
                    !dosenPernahModerator.has(nama) &&
                    !dosenPernahPenguji.has(nama) &&
                    !pengujiSudahDipakaiDiKelas.has(nama)
                );
                if (kandidat.length >= 2) return kandidat;
                // 2. Belum pernah jadi penguji di kelas manapun, bukan moderator/pembimbing di kelas ini, belum dipakai di kelas ini
                kandidat = allDosenNama.filter(nama =>
                    !moderatorKelas.includes(nama) &&
                    !pembimbingKelas.includes(nama) &&
                    !dosenPernahPenguji.has(nama) &&
                    !pengujiSudahDipakaiDiKelas.has(nama)
                );
                if (kandidat.length >= 2) return kandidat;
                // 3. Belum pernah jadi moderator di kelas manapun, bukan moderator/pembimbing di kelas ini, belum dipakai di kelas ini
                kandidat = allDosenNama.filter(nama =>
                    !moderatorKelas.includes(nama) &&
                    !pembimbingKelas.includes(nama) &&
                    !dosenPernahModerator.has(nama) &&
                    !pengujiSudahDipakaiDiKelas.has(nama)
                );
                if (kandidat.length >= 2) return kandidat;
                // 4. Bukan pembimbing di kelas ini, belum dipakai di kelas ini
                kandidat = allDosenNama.filter(nama =>
                    !pembimbingKelas.includes(nama) &&
                    !pengujiSudahDipakaiDiKelas.has(nama)
                );
                if (kandidat.length >= 2) return kandidat;
                // 5. Belum dipakai di kelas ini
                kandidat = allDosenNama.filter(nama =>
                    !pengujiSudahDipakaiDiKelas.has(nama)
                );
                return kandidat;
            }

            let warningPenguji = false;
            const uniqueModerator = [...new Set(moderatorKelas)];

            if (uniqueModerator.length > 1) {
                for (let idx = 0; idx < kelas.length; idx++) {
                    const m = kelas[idx];
                    const otherModerators = uniqueModerator.filter(nama => nama !== m.moderator);
                    let penguji_1 = null;
                    let penguji_2 = null;

                    let pengujiKandidatLokal = cariPengujiKandidat();

                    if (otherModerators.length >= 2) {
                        penguji_1 = otherModerators[0];
                        penguji_2 = otherModerators[1];
                    } else if (otherModerators.length === 1) {
                        penguji_1 = otherModerators[0];
                        penguji_2 = pengujiKandidatLokal.find(nama => nama !== penguji_1) || null;
                        if (!penguji_2) warningPenguji = true;
                    } else {
                        penguji_1 = pengujiKandidatLokal[0] || null;
                        penguji_2 = pengujiKandidatLokal[1] || null;
                        if (!penguji_1 || !penguji_2) warningPenguji = true;
                    }

                    // Pastikan penguji tidak sama dan tidak null
                    if (penguji_1 === penguji_2) penguji_2 = pengujiKandidatLokal.find(nama => nama !== penguji_1) || null;
                    if (!penguji_1 || !penguji_2) warningPenguji = true;

                    // Tandai penguji sudah dipakai
                    if (penguji_1) {
                        dosenSudahDipakai.add(penguji_1);
                        dosenPernahPenguji.add(penguji_1);
                        pengujiSudahDipakaiDiKelas.add(penguji_1);
                    }
                    if (penguji_2) {
                        dosenSudahDipakai.add(penguji_2);
                        dosenPernahPenguji.add(penguji_2);
                        pengujiSudahDipakaiDiKelas.add(penguji_2);
                    }

                    const jamMulai = minutesToTimeAgain(kelasStartMinutes + idx * durasi);
                    const jamSelesai = minutesToTimeAgain(kelasStartMinutes + (idx + 1) * durasi);
                    hasilAkhir.push({
                        ...m,
                        kelas: kelasNo,
                        jam_mulai: jamMulai,
                        jam_selesai: jamSelesai,
                        penguji_1,
                        penguji_2
                    });
                }
            } else {
                let pengujiKandidatLokal = cariPengujiKandidat();
                let pengujiKelas = pengujiKandidatLokal.slice(0, 2);
                if (pengujiKelas.length < 2) warningPenguji = true;
                pengujiKelas.forEach(nama => {
                    dosenSudahDipakai.add(nama);
                    dosenPernahPenguji.add(nama);
                    pengujiSudahDipakaiDiKelas.add(nama);
                });
                for (let idx = 0; idx < kelas.length; idx++) {
                    const m = kelas[idx];
                    let penguji_1 = null;
                    let penguji_2 = null;
                    if (pengujiKelas.length === 2) {
                        // Rotasi: ganjil/genap urutan
                        if (idx % 2 === 0) {
                            penguji_1 = pengujiKelas[0];
                            penguji_2 = pengujiKelas[1];
                        } else {
                            penguji_1 = pengujiKelas[1];
                            penguji_2 = pengujiKelas[0];
                        }
                    } else if (pengujiKelas.length === 1) {
                        penguji_1 = pengujiKelas[0];
                        penguji_2 = null;
                        warningPenguji = true;
                    } else {
                        penguji_1 = null;
                        penguji_2 = null;
                        warningPenguji = true;
                    }
                    if (penguji_1 === penguji_2) penguji_2 = pengujiKandidatLokal.find(nama => nama !== penguji_1) || null;
                    if (!penguji_1 || !penguji_2) warningPenguji = true;
                    const jamMulai = minutesToTimeAgain(kelasStartMinutes + idx * durasi);
                    const jamSelesai = minutesToTimeAgain(kelasStartMinutes + (idx + 1) * durasi);
                    hasilAkhir.push({
                        ...m,
                        kelas: kelasNo,
                        jam_mulai: jamMulai,
                        jam_selesai: jamSelesai,
                        penguji_1,
                        penguji_2
                    });
                }
            }
            kelasNo++;
            kelasStartMinutes += sesiKelas * durasi;
        }

        // Step 5: Penomoran ulang field no
        hasilAkhir = hasilAkhir.map((m, idx) => ({ ...m, no: idx + 1 }));

        // Warning jika ada kelas yang kekurangan dosen penguji atau jadwal tidak bisa dijadwalkan
        const adaWarning = hasilAkhir.some(m => !m.penguji_1 || !m.penguji_2 || m.jam_mulai === null);
        if (adaWarning) {
            return res.status(200).json({
                success: true,
                warning: 'Beberapa kelas kekurangan dosen penguji atau jadwal kelas tidak dapat dijadwalkan dalam rentang waktu yang tersedia.',
                data: hasilAkhir
            });
        }

        return res.json({ success: true, data: hasilAkhir });
    } catch (err) {
        console.error("Error in /sidang/moderator/assign:", err);
        return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
});