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

// Endpoint untuk mengupdate data dosen
app.put('/dosen/:id', async (req, res) => {
    const { id } = req.params;
    const { nama, departemen, no_hp } = req.body;
    if (!nama || !departemen || !no_hp) {
        return res.status(400).send('Field nama, departemen, dan no_hp wajib diisi');
    }
    try {
        const result = await pool.query(
            'UPDATE dosen SET nama = $1, departemen = $2, no_hp = $3 WHERE id = $4 RETURNING *',
            [nama, departemen, no_hp, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).send('Dosen tidak ditemukan');
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Endpoint untuk menghapus dosen
app.delete('/dosen/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM dosen WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Dosen tidak ditemukan' });
        }
        res.json({ success: true, message: 'Dosen berhasil dihapus' });
    } catch (err) {
        // Cek jika error karena foreign key constraint
        if (err.code === '23503') {
            return res.status(400).json({ success: false, message: 'Dosen tidak dapat dihapus karena masih digunakan di data lain.' });
        }
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Endpoint untuk export data dosen ke Excel
app.get('/dosen/export', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM dosen ORDER BY nama ASC');
        const dosenRows = result.rows;
        // Header kolom
        const wsData = [
            ['Nama', 'Departemen', 'No HP', 'Maksimal Bimbingan', 'Bimbingan Saat Ini']
        ];
        // Data
        dosenRows.forEach(d => {
            wsData.push([
                d.nama,
                d.departemen,
                d.no_hp,
                d.maksimal_bimbingan ?? '',
                d.bimbingan_saat_ini ?? ''
            ]);
        });
        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.aoa_to_sheet(wsData);
        xlsx.utils.book_append_sheet(workbook, worksheet, 'DataDosen');
        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename="data_dosen.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        console.error(err);
        res.status(500).send('Gagal export data dosen');
    }
});

// Endpoint untuk download template Excel dosen
app.get('/dosen/template', (req, res) => {
    const workbook = xlsx.utils.book_new();
    const wsData = [
        ['Nama', 'Departemen', 'No HP', 'Maksimal Bimbingan'],
        ['Contoh: Dosen A', 'Teknik Informatika', '081234567890', '5']
    ];
    const worksheet = xlsx.utils.aoa_to_sheet(wsData);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'TemplateDosen');
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="template_dosen.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
});

// Endpoint untuk import data dosen dari Excel
app.post('/dosen/import', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'File Excel diperlukan' });
    }
    let dosenList;
    try {
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        dosenList = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        // Remove header and example row
        dosenList = dosenList.slice(1).filter(row => row[0]);
    } catch (err) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, message: 'File excel tidak valid' });
    }
    fs.unlinkSync(req.file.path);

    // Format: [Nama, Departemen, No HP, Maksimal Bimbingan]
    if (!dosenList.length) {
        return res.status(400).json({ success: false, message: 'Data dosen kosong di file' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const row of dosenList) {
            const [nama, departemen, no_hp, maksimal_bimbingan] = row;
            if (!nama || !departemen || !no_hp || !maksimal_bimbingan) {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, message: `Data tidak lengkap pada baris: ${JSON.stringify(row)}` });
            }
            // Cek duplikat nama dosen
            const exist = await client.query('SELECT 1 FROM dosen WHERE LOWER(nama) = LOWER($1)', [nama]);
            if (exist.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, message: `Dosen dengan nama "${nama}" sudah ada di database.` });
            }
            await client.query(
                'INSERT INTO dosen (nama, departemen, no_hp, maksimal_bimbingan, bimbingan_saat_ini) VALUES ($1, $2, $3, $4, 0)',
                [nama, departemen, no_hp, parseInt(maksimal_bimbingan, 10)]
            );
        }
        await client.query('COMMIT');
        res.json({ success: true, message: 'Import data dosen berhasil' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    } finally {
        client.release();
    }
});

// Endpoint untuk menambahkan mahasiswa (dengan NRP wajib unik)
app.post('/mahasiswa', async (req, res) => {
    const { nrp, nama, departemen } = req.body;
    if (!nrp || !nama || !departemen) {
        return res.status(400).json({ success: false, message: 'Field nrp, nama, dan departemen wajib diisi' });
    }
    try {
        // Cek NRP unik
        const exist = await pool.query('SELECT id FROM mahasiswa WHERE nrp = $1', [nrp]);
        if (exist.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'NRP sudah digunakan oleh mahasiswa lain' });
        }
        const result = await pool.query(
            'INSERT INTO mahasiswa (nrp, nama, departemen) VALUES ($1, $2, $3) RETURNING *',
            [nrp, nama, departemen]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Endpoint untuk update data mahasiswa (nama, departemen, nrp)
app.put('/mahasiswa/:id', async (req, res) => {
    const { id } = req.params;
    const { nrp, nama, departemen } = req.body;
    if (!nrp || !nama || !departemen) {
        return res.status(400).json({ success: false, message: 'Field nrp, nama, dan departemen wajib diisi' });
    }
    try {
        // Cek NRP unik (kecuali milik sendiri)
        const exist = await pool.query('SELECT id FROM mahasiswa WHERE nrp = $1 AND id != $2', [nrp, id]);
        if (exist.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'NRP sudah digunakan oleh mahasiswa lain' });
        }
        const result = await pool.query(
            'UPDATE mahasiswa SET nrp = $1, nama = $2, departemen = $3 WHERE id = $4 RETURNING *',
            [nrp, nama, departemen, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Mahasiswa tidak ditemukan' });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Endpoint untuk menghapus mahasiswa
app.delete('/mahasiswa/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM mahasiswa WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Mahasiswa tidak ditemukan' });
        }
        res.json({ success: true, message: 'Mahasiswa berhasil dihapus' });
    } catch (err) {
        // Cek jika error karena foreign key constraint (misal sudah punya sidang)
        if (err.code === '23503') {
            return res.status(400).json({ success: false, message: 'Mahasiswa tidak dapat dihapus karena masih digunakan di data lain (misal sudah punya sidang).' });
        }
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Endpoint untuk export data mahasiswa ke Excel
app.get('/mahasiswa/export', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM mahasiswa ORDER BY nama ASC');
        const mahasiswaRows = result.rows;
        // Header kolom
        const wsData = [
            ['NRP', 'Nama', 'Departemen']
        ];
        // Data
        mahasiswaRows.forEach(m => {
            wsData.push([
                m.nrp,
                m.nama,
                m.departemen
            ]);
        });
        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.aoa_to_sheet(wsData);
        xlsx.utils.book_append_sheet(workbook, worksheet, 'DataMahasiswa');
        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename="data_mahasiswa.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        console.error(err);
        res.status(500).send('Gagal export data mahasiswa');
    }
});
// Endpoint untuk download template Excel mahasiswa
app.get('/mahasiswa/template', (req, res) => {
    const workbook = xlsx.utils.book_new();
    const wsData = [
        ['NRP', 'Nama', 'Departemen'],
        ['Contoh: 05111940000001', 'Nama Mahasiswa', 'Teknik Informatika']
    ];
    const worksheet = xlsx.utils.aoa_to_sheet(wsData);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'TemplateMahasiswa');
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="template_mahasiswa.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
});

// Endpoint untuk import data mahasiswa dari Excel
app.post('/mahasiswa/import', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'File Excel diperlukan' });
    }
    let mahasiswaList;
    try {
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        mahasiswaList = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        // Remove header and example row
        mahasiswaList = mahasiswaList.slice(1).filter(row => row[0]);
    } catch (err) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, message: 'File excel tidak valid' });
    }
    fs.unlinkSync(req.file.path);

    // Format: [NRP, Nama, Departemen]
    if (!mahasiswaList.length) {
        return res.status(400).json({ success: false, message: 'Data mahasiswa kosong di file' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const row of mahasiswaList) {
            const [nrp, nama, departemen] = row;
            if (!nrp || !nama || !departemen) {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, message: `Data tidak lengkap pada baris: ${JSON.stringify(row)}` });
            }
            // Cek duplikat NRP
            const exist = await client.query('SELECT 1 FROM mahasiswa WHERE nrp = $1', [nrp]);
            if (exist.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, message: `Mahasiswa dengan NRP "${nrp}" sudah ada di database.` });
            }
            await client.query(
                'INSERT INTO mahasiswa (nrp, nama, departemen) VALUES ($1, $2, $3)',
                [nrp, nama, departemen]
            );
        }
        await client.query('COMMIT');
        res.json({ success: true, message: 'Import data mahasiswa berhasil' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    } finally {
        client.release();
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
        let output = [];
        let no = 1;

        // Step 1: Tentukan moderator untuk setiap mahasiswa
        let mahasiswaWithModerator = sidangMahasiswa.map((m, idx) => {
            const pembimbing1Nama = m.pembimbing_1_nama;
            const pembimbing2Nama = m.pembimbing_2_nama;
            if (!moderatorSesiMap[pembimbing1Nama]) moderatorSesiMap[pembimbing1Nama] = 0;
            if (!moderatorSesiMap[pembimbing2Nama]) moderatorSesiMap[pembimbing2Nama] = 0;
            let moderatorNama = null;
            if (moderatorSesiMap[pembimbing1Nama] < totalSesi) {
                moderatorNama = pembimbing1Nama;
                moderatorSesiMap[pembimbing1Nama]++;
            } else if (moderatorSesiMap[pembimbing2Nama] < totalSesi) {
                moderatorNama = pembimbing2Nama;
                moderatorSesiMap[pembimbing2Nama]++;
            } else {
                throw new Error(`Tidak ada dosen yang bisa menjadi moderator untuk mahasiswa ${m.nama} (NRP ${m.nrp}). Pembimbing 1 & 2 sudah mencapai batas sesi.`);
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
        // finalOutput sudah berisi: no, tanggal_sidang, jam_mulai, jam_selesai, room, nrp, nama_mahasiswa, judul, moderator, pembimbing_1, pembimbing_2
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

        // Set global untuk tracking dosen penguji yang sudah dipakai di kelas lain
        const globalPengujiDipakai = new Set();

        // Per kelas, reset jam mulai untuk penjadwalan sesi di kelas tsb
        let kelasStartMinutes = startMinutes;
        let warningJadwal = false;
        for (let kelas of semuaKelas) {
            let sesiKelas = kelas.length;
            let kelasEndMinutes = kelasStartMinutes + sesiKelas * durasi;
            // Jika melebihi jam akhir, reset ke startMinutes (mulai blok waktu baru)
            if (kelasEndMinutes > endMinutes) {
                kelasStartMinutes = startMinutes;
                kelasEndMinutes = kelasStartMinutes + sesiKelas * durasi;
                // Jika tetap melebihi jam akhir, warning global
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
            const pembimbingKelas = kelas.flatMap(m => [m.pembimbing_1, m.pembimbing_2]);
            const pengujiKandidat = allDosenNama.filter(nama =>
                !moderatorKelas.includes(nama) &&
                !pembimbingKelas.includes(nama) &&
                !globalPengujiDipakai.has(nama)
            );
            let pengujiKelas = [];
            let warningPenguji = false;
            const uniqueModerator = [...new Set(moderatorKelas)];

            if (uniqueModerator.length > 1) {
                for (let idx = 0; idx < kelas.length; idx++) {
                    const m = kelas[idx];
                    const otherModerators = uniqueModerator.filter(nama => nama !== m.moderator);
                    let penguji_1 = null;
                    let penguji_2 = null;

                    if (otherModerators.length >= 2) {
                        penguji_1 = otherModerators[0];
                        penguji_2 = otherModerators[1];
                    } else if (otherModerators.length === 1) {
                        penguji_1 = otherModerators[0];
                        penguji_2 = pengujiKandidat.find(nama => nama !== penguji_1) || null;
                        if (!penguji_2) warningPenguji = true;
                        if (penguji_2) globalPengujiDipakai.add(penguji_2);
                    } else {
                        penguji_1 = pengujiKandidat[0] || null;
                        penguji_2 = pengujiKandidat[1] || null;
                        if (!penguji_1 || !penguji_2) warningPenguji = true;
                        if (penguji_1) globalPengujiDipakai.add(penguji_1);
                        if (penguji_2) globalPengujiDipakai.add(penguji_2);
                    }

                    if (penguji_1 === m.moderator) {
                        penguji_1 = pengujiKandidat.find(nama => nama !== m.moderator && nama !== penguji_2) || null;
                        if (penguji_1 && !globalPengujiDipakai.has(penguji_1)) globalPengujiDipakai.add(penguji_1);
                        if (!penguji_1) warningPenguji = true;
                    }
                    if (penguji_2 === m.moderator) {
                        penguji_2 = pengujiKandidat.find(nama => nama !== m.moderator && nama !== penguji_1) || null;
                        if (penguji_2 && !globalPengujiDipakai.has(penguji_2)) globalPengujiDipakai.add(penguji_2);
                        if (!penguji_2) warningPenguji = true;
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
                pengujiKelas = pengujiKandidat.slice(0, 2);
                if (pengujiKelas.length < 2) warningPenguji = true;
                pengujiKelas.forEach(nama => globalPengujiDipakai.add(nama));
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

// module.exports = app;

app.listen(5000, () => {
    console.log('Server berjalan di port 5000');
});