const express = require('express');
const cors = require('cors');
const pool = require('./db');
const multer = require('multer');
const xlsx = require('xlsx');
const upload = multer({ dest: 'uploads/' });
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint untuk mendapatkan daftar dosen
app.get('/dosen', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM dosen ORDER BY nama ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Endpoint untuk mendapatkan daftar mahasiswa
app.get('/mahasiswa', async (req, res) => {
    try {
        const { without_pembimbing, with_pembimbing, without_sidang } = req.query;
        // Act Mode

        // Build base query with LEFT JOIN to dosen for pembimbing_1 and pembimbing_2
        let query = `
            SELECT m.*, 
               d1.nama AS pembimbing_1_nama, 
               d2.nama AS pembimbing_2_nama
            FROM mahasiswa m
            LEFT JOIN dosen d1 ON m.pembimbing_1_id = d1.id
            LEFT JOIN dosen d2 ON m.pembimbing_2_id = d2.id
        `;
        const conditions = [];
        const values = [];

        // Apply filters if present
        if (without_pembimbing === 'true') {
            conditions.push('m.pembimbing_1_id IS NULL AND m.pembimbing_2_id IS NULL');
        }
        if (with_pembimbing === 'true') {
            conditions.push('m.pembimbing_1_id IS NOT NULL AND m.pembimbing_2_id IS NOT NULL');
        }
        if (without_sidang === 'true') {
            conditions.push('NOT EXISTS (SELECT 1 FROM sidang s WHERE s.mahasiswa_id = m.id)');
        }
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        query += ' ORDER BY m.nama ASC';

        const result = await pool.query(query, values);
        res.json(result.rows);
        } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
        }
    });

// Endpoint untuk menambahkan dosen
app.post('/dosen', async (req, res) => {
    const { nama, departemen, no_hp } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO dosen (nama, departemen, no_hp) VALUES ($1, $2, $3) RETURNING *',
            [nama, departemen, no_hp]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Endpoint untuk menambahkan mahasiswa (tanpa pembimbing)
app.post('/mahasiswa', async (req, res) => {
    const { nama, departemen } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO mahasiswa (nama, departemen) VALUES ($1, $2) RETURNING *',
            [nama, departemen]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Endpoint untuk mengotomatisasi penentuan dosen dan jadwal sidang
app.post('/sidang/assign', async (req, res) => {
    const { mahasiswa_id, tanggal_sidang, jam_mulai_sidang, durasi_sidang, room } = req.body;

    if (!mahasiswa_id || !tanggal_sidang || !jam_mulai_sidang || !durasi_sidang || !room) {
        return res.status(400).send('Field mahasiswa_id, tanggal_sidang, jam_mulai_sidang, durasi_sidang, dan room diperlukan');
    }

    try {
        // Cek apakah mahasiswa sudah memiliki sidang
        const existingSidang = await pool.query(
            'SELECT 1 FROM sidang WHERE mahasiswa_id = $1',
            [mahasiswa_id]
        );
        if (existingSidang.rows.length > 0) {
            return res.status(400).send('Mahasiswa sudah memiliki sidang');
        }

        // Cek jumlah mahasiswa di room pada tanggal dan jam yang sama
        const roomSidangResult = await pool.query(
            'SELECT COUNT(*) as count FROM sidang WHERE room = $1 AND tanggal_sidang = $2 AND jam_mulai_sidang = $3',
            [room, tanggal_sidang, jam_mulai_sidang]
        );
        const sidangCount = parseInt(roomSidangResult.rows[0].count, 10);
        if (sidangCount >= 5) {
            return res.status(400).send('Room sudah penuh pada jam tersebut');
        }
        let warning = null;
        if (sidangCount < 1) {
            warning = 'Warning: Room ini baru berisi 1 mahasiswa pada sesi ini.';
        }

        // Cek tidak ada sidang lain di room pada jam_mulai_sidang yang sama (tanggal boleh sama)
        // Sudah dicek di atas dengan count, jadi tidak perlu pengecekan tambahan

        // Ambil pembimbing dari mahasiswa
        const mahasiswaResult = await pool.query(
            'SELECT pembimbing_1_id, pembimbing_2_id FROM mahasiswa WHERE id = $1',
            [mahasiswa_id]
        );
        if (mahasiswaResult.rows.length === 0) {
            return res.status(404).send('Mahasiswa tidak ditemukan');
        }
        const { pembimbing_1_id, pembimbing_2_id } = mahasiswaResult.rows[0];
        if (!pembimbing_1_id || !pembimbing_2_id) {
            return res.status(400).send('Mahasiswa belum memiliki pembimbing');
        }

        // Cek pembimbing tidak double-booked di room lain pada jam dan tanggal yang sama
        const pembimbingBusyResult = await pool.query(
            'SELECT 1 FROM sidang WHERE tanggal_sidang = $1 AND jam_mulai_sidang = $2 AND room != $3 AND (pembimbing_1_id = $4 OR pembimbing_2_id = $4 OR pembimbing_1_id = $5 OR pembimbing_2_id = $5)',
            [tanggal_sidang, jam_mulai_sidang, room, pembimbing_1_id, pembimbing_2_id]
        );
        if (pembimbingBusyResult.rows.length > 0) {
            return res.status(400).send('Pembimbing tidak tersedia pada jam dan tanggal tersebut di ruangan lain');
        }

        // Ambil dosen yang tersedia untuk penguji dan moderator
        // Penguji tidak boleh pembimbing, moderator boleh
        const availableDosenResult = await pool.query(
            'SELECT * FROM dosen WHERE id NOT IN ($1, $2)',
            [pembimbing_1_id, pembimbing_2_id]
        );
        let availableDosen = availableDosenResult.rows;
        // Filter dosen yang sudah menjadi penguji/moderator di sidang lain pada waktu yang sama
        const dosenBusyResult = await pool.query(
            `SELECT DISTINCT unnest(array[pembimbing_1_id, pembimbing_2_id, penguji_1_id, penguji_2_id, moderator_id]) as dosen_id
             FROM sidang WHERE tanggal_sidang = $1 AND jam_mulai_sidang = $2`,
            [tanggal_sidang, jam_mulai_sidang]
        );
        const busyDosenIds = dosenBusyResult.rows.map(row => row.dosen_id);
        // Penguji tidak boleh pembimbing, dan tidak boleh dosen yang sudah jadi penguji/moderator di waktu yang sama
        const pengujiCandidates = availableDosen.filter(d => !busyDosenIds.includes(d.id));
        if (pengujiCandidates.length < 2) {
            return res.status(400).send('Tidak cukup dosen tersedia untuk penguji');
        }
        // Pilih dua penguji
        const [penguji1, penguji2] = pengujiCandidates.slice(0, 2);
        // Moderator: boleh pembimbing, tapi tidak boleh penguji
        const moderatorCandidates = availableDosenResult.rows.filter(d => d.id !== penguji1.id && d.id !== penguji2.id);
        let moderator = moderatorCandidates[0];
        if (!moderator) {
            // Jika tidak ada dosen lain, boleh pakai pembimbing sebagai moderator
            const pembimbingResult = await pool.query('SELECT * FROM dosen WHERE id IN ($1, $2)', [pembimbing_1_id, pembimbing_2_id]);
            moderator = pembimbingResult.rows.find(d => d.id !== penguji1.id && d.id !== penguji2.id);
            if (!moderator) {
                return res.status(400).send('Tidak ada dosen yang bisa menjadi moderator');
            }
        }

        // Simpan ke tabel sidang
        await pool.query(
            `INSERT INTO sidang (mahasiswa_id, pembimbing_1_id, pembimbing_2_id, penguji_1_id, penguji_2_id, moderator_id, room, tanggal_sidang, jam_mulai_sidang, durasi_sidang)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [mahasiswa_id, pembimbing_1_id, pembimbing_2_id, penguji1.id, penguji2.id, moderator.id, room, tanggal_sidang, jam_mulai_sidang, durasi_sidang]
        );

        if (warning) {
            return res.status(200).json({ message: 'Penugasan berhasil', warning });
        } else {
            return res.send('Penugasan berhasil');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Endpoint untuk menugaskan pembimbing
app.post('/pembimbing/assign', async (req, res) => {
    const { mahasiswa_id, pembimbing_1_id, pembimbing_2_id } = req.body;
    try {
        const mahasiswaResult = await pool.query('SELECT pembimbing_1_id, pembimbing_2_id FROM mahasiswa WHERE id = $1', [mahasiswa_id]);
        if (mahasiswaResult.rows.length === 0) {
            return res.status(404).send('Mahasiswa tidak ditemukan');
        }
        const mahasiswa = mahasiswaResult.rows[0];
        if (mahasiswa.pembimbing_1_id !== null || mahasiswa.pembimbing_2_id !== null) {
            return res.status(400).send('Pembimbing sudah ditugaskan');
        }
        let supervisor1, supervisor2;
        if (pembimbing_1_id && pembimbing_2_id) {
            if (pembimbing_1_id === pembimbing_2_id) {
                return res.status(400).send('Pembimbing harus berbeda');
            }
            const dosenResult = await pool.query('SELECT id, bimbingan_saat_ini, maksimal_bimbingan FROM dosen WHERE id IN ($1, $2)', [pembimbing_1_id, pembimbing_2_id]);
            if (dosenResult.rows.length !== 2) {
                return res.status(400).send('Satu atau kedua pembimbing tidak ditemukan');
            }
            for (const dosen of dosenResult.rows) {
                if (dosen.bimbingan_saat_ini >= dosen.maksimal_bimbingan) {
                    return res.status(400).send(`Pembimbing ${dosen.id} telah mencapai kapasitas maksimum`);
                }
            }
            supervisor1 = dosenResult.rows.find(d => d.id === pembimbing_1_id);
            supervisor2 = dosenResult.rows.find(d => d.id === pembimbing_2_id);
        } else {
            const availableDosenResult = await pool.query('SELECT id FROM dosen WHERE bimbingan_saat_ini < maksimal_bimbingan');
            const availableDosen = availableDosenResult.rows;
            if (availableDosen.length < 2) {
                return res.status(400).send('Tidak cukup pembimbing yang tersedia');
            }
            const shuffled = availableDosen.sort(() => 0.5 - Math.random());
            supervisor1 = shuffled[0];
            supervisor2 = shuffled[1];
        }
        await pool.query('UPDATE mahasiswa SET pembimbing_1_id = $1, pembimbing_2_id = $2 WHERE id = $3', [supervisor1.id, supervisor2.id, mahasiswa_id]);
        await pool.query('UPDATE dosen SET bimbingan_saat_ini = bimbingan_saat_ini + 1 WHERE id IN ($1, $2)', [supervisor1.id, supervisor2.id]);
        res.send('Pembimbing berhasil ditugaskan');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Endpoint untuk mendapatkan daftar sidang
app.get('/sidang', async (req, res) => {
    try {
        let query = `
            SELECT s.id, s.mahasiswa_id, m.nama as mahasiswa_nama, m.departemen as mahasiswa_departemen,
               s.pembimbing_1_id, d1.nama as pembimbing_1_nama,
               s.pembimbing_2_id, d2.nama as pembimbing_2_nama,
               s.penguji_1_id, d3.nama as penguji_1_nama,
               s.penguji_2_id, d4.nama as penguji_2_nama,
               s.moderator_id, d5.nama as moderator_nama,
               s.room, TO_CHAR(s.tanggal_sidang, 'YYYY-MM-DD') as tanggal_sidang, s.jam_mulai_sidang, s.durasi_sidang,
               TO_CHAR(s.jam_mulai_final, 'HH24:MI') as jam_mulai_final,
               TO_CHAR(s.jam_selesai_final, 'HH24:MI') as jam_selesai_final
            FROM sidang s
            JOIN mahasiswa m ON s.mahasiswa_id = m.id
            JOIN dosen d1 ON s.pembimbing_1_id = d1.id
            JOIN dosen d2 ON s.pembimbing_2_id = d2.id
            JOIN dosen d3 ON s.penguji_1_id = d3.id
            JOIN dosen d4 ON s.penguji_2_id = d4.id
            JOIN dosen d5 ON s.moderator_id = d5.id
        `;
        const conditions = [];
        const values = [];
        if (req.query.room) {
            conditions.push('s.room = $' + (values.length + 1));
            values.push(req.query.room);
        }
        if (req.query.date) {
            conditions.push('s.tanggal_sidang = $' + (values.length + 1));
            values.push(req.query.date);
        }
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        query += ' ORDER BY tanggal_sidang ASC';
        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Endpoint batch assign jadwal sidang
app.post('/sidang/batch-assign', upload.single('file'), async (req, res) => {
    const { tanggal_sidang, jam_mulai_sidang, durasi_sidang } = req.body;
    if (!tanggal_sidang || !jam_mulai_sidang || !durasi_sidang || !req.file) {
        return res.status(400).json({ success: false, message: 'Field tanggal_sidang, jam_mulai_sidang, durasi_sidang, dan file diperlukan' });
    }

    // Parse Excel
    let mahasiswaList;
    try {
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        mahasiswaList = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        // Remove header
        mahasiswaList = mahasiswaList.slice(1).filter(row => row[0]);
    } catch (err) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, message: 'File excel tidak valid' });
    }
    fs.unlinkSync(req.file.path);

    // Format: [NRP, Nama Mahasiswa, Judul, Nama Dosen Pembimbing 1, Nama Dosen Pembimbing 2]
    // Validasi data mahasiswa & dosen
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

        // Cek dosen penguji cukup
        const allPembimbingIds = sidangMahasiswa.flatMap(m => [m.pembimbing_1_id, m.pembimbing_2_id]);
        const pengujiCandidates = dosenResult.rows.filter(d => !allPembimbingIds.includes(d.id));
        const totalSidang = sidangMahasiswa.length;
        if (pengujiCandidates.length < 2) {
            return res.status(400).json({ success: false, message: 'dosen penguji kurang dari kebutuhan, tambahkan dosen lagi di data dosen' });
        }

        // Grouping room (max 3 per room)
        const rooms = [];
        for (let i = 0; i < sidangMahasiswa.length; i += 3) {
            rooms.push(sidangMahasiswa.slice(i, i + 3));
        }

        // Penjadwalan jam dan assign penguji/moderator
        // Ambil semua dosen penguji yang bukan pembimbing
        let pengujiPool = pengujiCandidates.map(d => d.id);
        if (pengujiPool.length < 2) {
            return res.status(400).json({ success: false, message: 'dosen penguji kurang dari kebutuhan, tambahkan dosen lagi di data dosen' });
        }

        // Untuk rollback jika error
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            let output = [];
            let no = 1;

            // Cek duplikasi sebelum insert
            // Ambil semua kombinasi mahasiswa_id dan tanggal_sidang yang akan di-insert
            const mahasiswaIds = sidangMahasiswa.map(m => m.mahasiswa_id);
            const checkQuery = `
                SELECT mahasiswa_id, tanggal_sidang 
                FROM sidang 
                WHERE mahasiswa_id = ANY($1) AND tanggal_sidang = $2
            `;
            const checkResult = await client.query(checkQuery, [mahasiswaIds, tanggal_sidang]);
            if (checkResult.rows.length > 0) {
                // Ambil nama mahasiswa dari sidangMahasiswa
                const dupeNames = checkResult.rows.map(r => {
                    const found = sidangMahasiswa.find(m => m.mahasiswa_id === r.mahasiswa_id);
                    return found ? found.nama : r.mahasiswa_id;
                }).join(', ');
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, message: `Sidang untuk mahasiswa berikut pada tanggal ${tanggal_sidang} sudah ada: ${dupeNames}` });
            }

            for (let roomIdx = 0; roomIdx < rooms.length; roomIdx++) {
                const group = rooms[roomIdx];
                let jamMulai = jam_mulai_sidang;
                for (let idx = 0; idx < group.length; idx++) {
                    const m = group[idx];
                    // Moderator = pembimbing 1
                    const moderator_id = m.pembimbing_1_id;
                    const moderator_nama = m.pembimbing_1_nama;

                    // Penguji 1 & 2: bukan pembimbing 1/2, bukan moderator, dan tidak sama satu sama lain
                    // Pilih penguji dari pool yang bukan pembimbing 1/2
                    const pengujiAvailable = dosenResult.rows.filter(d =>
                        d.id !== m.pembimbing_1_id &&
                        d.id !== m.pembimbing_2_id
                    );
                    if (pengujiAvailable.length < 2) {
                        await client.query('ROLLBACK');
                        return res.status(400).json({ success: false, message: 'dosen penguji kurang dari kebutuhan, tambahkan dosen lagi di data dosen' });
                    }
                    // Pilih penguji 1 dan 2 yang berbeda
                    const penguji_1 = pengujiAvailable[0];
                    const penguji_2 = pengujiAvailable[1];

                    // Hitung jam mulai dan selesai
                    const [jam, menit] = jamMulai.split(':').map(Number);
                    const durasi = parseInt(durasi_sidang, 10);
                    const jamSelesaiDate = new Date(2000, 0, 1, jam, menit + durasi);
                    const jamSelesai = jamSelesaiDate.getHours().toString().padStart(2, '0') + ':' + jamSelesaiDate.getMinutes().toString().padStart(2, '0');
                    const jamMulaiFinal = jam.toString().padStart(2, '0') + ':' + menit.toString().padStart(2, '0');

                    // Insert ke tabel sidang
                    await client.query(
                        `INSERT INTO sidang (
                            mahasiswa_id, pembimbing_1_id, pembimbing_2_id, penguji_1_id, penguji_2_id, moderator_id, room, tanggal_sidang, jam_mulai_sidang, durasi_sidang, jam_mulai_final, jam_selesai_final
                        ) VALUES (
                            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
                        )`,
                        [
                            m.mahasiswa_id,
                            m.pembimbing_1_id,
                            m.pembimbing_2_id,
                            penguji_1.id,
                            penguji_2.id,
                            moderator_id,
                            roomIdx + 1,
                            tanggal_sidang,
                            jamMulai,
                            durasi,
                            jamMulaiFinal,
                            jamSelesai
                        ]
                    );

                    output.push({
                        no: no++,
                        jam_mulai_final: jamMulaiFinal,
                        jam_selesai_final: jamSelesai,
                        durasi_sidang: durasi,
                        tanggal: tanggal_sidang,
                        nrp: m.nrp,
                        nama_mahasiswa: m.nama,
                        judul: m.judul,
                        moderator: moderator_nama,
                        pembimbing_1: m.pembimbing_1_nama,
                        pembimbing_2: m.pembimbing_2_nama,
                        penguji_1: penguji_1.nama,
                        penguji_2: penguji_2.nama,
                        room: roomIdx + 1
                    });

                    // Update jamMulai untuk mahasiswa berikutnya di room yang sama
                    const jamMulaiDate = new Date(2000, 0, 1, jam, menit + durasi * (idx + 1));
                    jamMulai = jamMulaiDate.getHours().toString().padStart(2, '0') + ':' + jamMulaiDate.getMinutes().toString().padStart(2, '0');
                }
            }
            await client.query('COMMIT');
            return res.json(output);
        } catch (err) {
            await client.query('ROLLBACK');
            console.error(err);
            return res.status(500).json({ success: false, message: 'Terjadi error saat insert data: ' + err.message });
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
});

// Endpoint untuk penjadwalan moderator sidang otomatis (OLD - replaced by /sidang/moderator/assign)
app.post('/moderator/assign', upload.single('file'), async (req, res) => {
    const { tanggal_sidang, jam_awal, jam_akhir, durasi_sidang } = req.body;
    if (!tanggal_sidang || !jam_awal || !jam_akhir || !durasi_sidang || !req.file) {
        return res.status(400).json({ success: false, message: 'Field tanggal_sidang, jam_awal, jam_akhir, durasi_sidang, dan file diperlukan' });
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

    // Format: [NRP, Nama Mahasiswa, Judul, Nama Dosen Pembimbing 1, Nama Dosen Pembimbing 2]
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
        const startMinutes = timeToMinutes(jam_awal);
        const endMinutes = timeToMinutes(jam_akhir);
        const durasi = parseInt(durasi_sidang, 10);
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
                    mahasiswa: chunk
                });
                idx += totalSesi;
            }
        });

        // Gabungkan ruangan-ruangan yang hanya berisi satu mahasiswa saja
        let singleRooms = [];
        let otherRooms = [];
        for (const r of rooms) {
            if (r.mahasiswa.length === 1) {
                singleRooms.push(r);
            } else {
                otherRooms.push(r);
            }
        }
        if (singleRooms.length > 1) {
            const nrpOrder = sidangMahasiswa.map(m => m.nrp);
            singleRooms.sort((a, b) => nrpOrder.indexOf(a.mahasiswa[0].nrp) - nrpOrder.indexOf(b.mahasiswa[0].nrp));
            const allSingleMahasiswa = singleRooms.map(r => r.mahasiswa[0]);
            let idx = 0;
            let mergedRooms = [];
            while (idx < allSingleMahasiswa.length) {
                let remaining = allSingleMahasiswa.length - idx;
                let size = Math.min(totalSesi, remaining);
                if (remaining === 1 && mergedRooms.length > 0) {
                    size = 1;
                } else if (size < 2 && remaining > 1) {
                    size = 2;
                }
                const chunk = allSingleMahasiswa.slice(idx, idx + size);
                mergedRooms.push({
                    mahasiswa: chunk
                });
                idx += size;
            }
            rooms = otherRooms.concat(mergedRooms);
        } else {
            rooms = otherRooms.concat(singleRooms);
        }

        // Penomoran ulang room secara berurutan
        rooms.forEach((r, idx) => {
            r.room = idx + 1;
        });

        // --- Penjadwalan moderator: satu dosen hanya boleh menjadi moderator di satu ruangan dan maksimal totalSesi sesi ---
        // Tracking: moderatorRoomMap (namaDosen -> room), moderatorSesiMap (namaDosen -> jumlahSesi)
        const moderatorRoomMap = {};
        const moderatorSesiMap = {};

        // Daftar semua dosen (nama)
        const allDosenNama = dosenResult.rows.map(d => d.nama);

        // Assign moderator untuk setiap ruangan
        for (let i = 0; i < rooms.length; i++) {
            const r = rooms[i];
            // Calon moderator: pembimbing 1 semua mahasiswa di ruangan
            const calonPembimbing1 = r.mahasiswa.map(m => m.pembimbing_1_nama);
            // Calon moderator: pembimbing 2 semua mahasiswa di ruangan
            const calonPembimbing2 = r.mahasiswa.map(m => m.pembimbing_2_nama);

            // Urutan prioritas: pembimbing 1, pembimbing 2, dosen lain
            let kandidat = [];
            // Unik dan urut
            calonPembimbing1.forEach(nama => { if (!kandidat.includes(nama)) kandidat.push(nama); });
            calonPembimbing2.forEach(nama => { if (!kandidat.includes(nama)) kandidat.push(nama); });
            allDosenNama.forEach(nama => { if (!kandidat.includes(nama)) kandidat.push(nama); });

            let found = false;
            for (const nama of kandidat) {
                // Belum pernah jadi moderator di ruangan lain dan belum melebihi totalSesi
                if (
                    moderatorRoomMap[nama] === undefined &&
                    (moderatorSesiMap[nama] === undefined || moderatorSesiMap[nama] + r.mahasiswa.length <= totalSesi)
                ) {
                    r.moderator = nama;
                    moderatorRoomMap[nama] = r.room;
                    moderatorSesiMap[nama] = (moderatorSesiMap[nama] || 0) + r.mahasiswa.length;
                    found = true;
                    break;
                }
            }
            if (!found) {
                return res.status(400).json({ success: false, message: `Tidak ada dosen yang bisa menjadi moderator di room ${r.room}. Semua dosen sudah mencapai batas.` });
            }
        }

        // Output final
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
                    moderator: r.moderator,
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

app.listen(5000, () => {
    console.log('Server berjalan di port 5000');
});