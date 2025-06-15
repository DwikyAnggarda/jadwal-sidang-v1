const express = require('express');
const cors = require('cors');
const pool = require('./db');
const multer = require('multer');
const xlsx = require('xlsx');
const upload = multer({ dest: 'uploads/' });
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');

// Import authentication middleware and routes
const { authenticateToken } = require('./middleware/auth');
const authRoutes = require('./routes/auth');

const app = express();
app.use(cors());
app.use(express.json());

// Authentication routes (unprotected)
app.use('/auth', authRoutes);

// =================== WHATSAPP CLIENT INITIALIZATION ===================
let qrCodeString = ""; // Store QR Code temporarily
let whatsappClient = null; // WhatsApp client variable
let isWhatsAppReady = false; // Flag to check if client is initialized

// Function to initialize WhatsApp client
const initializeWhatsApp = () => {
    whatsappClient = new Client({
        puppeteer: {
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        },
        authStrategy: new LocalAuth({
            clientId: "session-whatsapp", // Session storage folder
        }),
    });

    // Event when client is ready
    whatsappClient.on("ready", () => {
        console.log("✅ WhatsApp Web client ready!");
        isWhatsAppReady = true;
        qrCodeString = ""; // Clear QR Code after session starts
    });

    // Event for handling authentication failures
    whatsappClient.on("auth_failure", () => {
        console.log("❌ WhatsApp authentication failed. Please re-register.");
        isWhatsAppReady = false;
    });

    // Event when client is disconnected
    whatsappClient.on("disconnected", (reason) => {
        console.log("🔌 WhatsApp client disconnected. Reason:", reason);
        isWhatsAppReady = false;
    });

    // Event for QR code generation
    whatsappClient.on("qr", (qr) => {
        qrCodeString = qr;
        console.log("📱 QR Code updated. Please scan with your WhatsApp.");
    });

    whatsappClient.initialize();
    console.log("🚀 Initializing WhatsApp Web client...");
};

// Initialize WhatsApp client when server starts
initializeWhatsApp();

// =================== RULE CRUD API ===================
// GET all rules
app.get('/rule', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM rule ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET rule by id (optional, for edit form)
app.get('/rule/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM rule WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Rule tidak ditemukan' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// CREATE rule
app.post('/rule', authenticateToken, async (req, res) => {
    const { jenis_sidang, durasi_sidang, jumlah_sesi } = req.body;
    if (!jenis_sidang || !durasi_sidang || !jumlah_sesi) {
        return res.status(400).json({ success: false, message: 'Field jenis_sidang, durasi_sidang, jumlah_sesi wajib diisi' });
    }
    if (isNaN(durasi_sidang) || isNaN(jumlah_sesi) || durasi_sidang <= 0 || jumlah_sesi <= 0) {
        return res.status(400).json({ success: false, message: 'Durasi dan jumlah sesi harus angka > 0' });
    }
    try {
        // Cek unik
        const exist = await pool.query('SELECT id FROM rule WHERE LOWER(jenis_sidang) = LOWER($1)', [jenis_sidang]);
        if (exist.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Jenis sidang sudah ada' });
        }
        const result = await pool.query(
            'INSERT INTO rule (jenis_sidang, durasi_sidang, jumlah_sesi) VALUES ($1, $2, $3) RETURNING *',
            [jenis_sidang, durasi_sidang, jumlah_sesi]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// UPDATE rule
app.put('/rule/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { jenis_sidang, durasi_sidang, jumlah_sesi } = req.body;
    if (!jenis_sidang || !durasi_sidang || !jumlah_sesi) {
        return res.status(400).json({ success: false, message: 'Field jenis_sidang, durasi_sidang, jumlah_sesi wajib diisi' });
    }
    if (isNaN(durasi_sidang) || isNaN(jumlah_sesi) || durasi_sidang <= 0 || jumlah_sesi <= 0) {
        return res.status(400).json({ success: false, message: 'Durasi dan jumlah sesi harus angka > 0' });
    }
    try {
        // Cek unik kecuali milik sendiri
        const exist = await pool.query('SELECT id FROM rule WHERE LOWER(jenis_sidang) = LOWER($1) AND id != $2', [jenis_sidang, id]);
        if (exist.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Jenis sidang sudah ada' });
        }
        const result = await pool.query(
            'UPDATE rule SET jenis_sidang = $1, durasi_sidang = $2, jumlah_sesi = $3 WHERE id = $4 RETURNING *',
            [jenis_sidang, durasi_sidang, jumlah_sesi, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Rule tidak ditemukan' });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// DELETE rule
app.delete('/rule/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM rule WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Rule tidak ditemukan' });
        }
        res.json({ success: true, message: 'Rule berhasil dihapus' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Endpoint untuk mendapatkan daftar dosen
app.get('/dosen', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM dosen ORDER BY nama ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Endpoint untuk mendapatkan daftar mahasiswa
app.get('/mahasiswa', authenticateToken, async (req, res) => {
    try {
        const { without_pembimbing, with_pembimbing, without_sidang, page = 1, limit = 10 } = req.query;
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

        // Pagination
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 10;
        const offset = (pageNum - 1) * limitNum;

        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM mahasiswa m';
        if (conditions.length > 0) {
            countQuery += ' WHERE ' + conditions.join(' AND ');
        }
        const countResult = await pool.query(countQuery, values);
        const total = parseInt(countResult.rows[0].count, 10);

        // Add limit/offset
        query += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
        const result = await pool.query(query, [...values, limitNum, offset]);
        res.json({ data: result.rows, total });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Endpoint untuk menambahkan dosen
app.post('/dosen', authenticateToken, async (req, res) => {
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
app.put('/dosen/:id', authenticateToken, async (req, res) => {
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
app.delete('/dosen/:id', authenticateToken, async (req, res) => {
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
app.get('/dosen/export', authenticateToken, async (req, res) => {
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
app.get('/dosen/template', authenticateToken, (req, res) => {
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
app.post('/dosen/import', authenticateToken, upload.single('file'), async (req, res) => {
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
        res.status(500).json({ success: false, message: 'Server error' });
    } finally {
        client.release();
    }
});

// Endpoint untuk menambahkan mahasiswa (dengan NRP wajib unik)
app.post('/mahasiswa', authenticateToken, async (req, res) => {
    const { nrp, nama } = req.body;
    if (!nrp || !nama) {
        return res.status(400).json({ success: false, message: 'Field nrp dan nama wajib diisi' });
    }
    try {
        // Cek NRP unik
        const exist = await pool.query('SELECT id FROM mahasiswa WHERE nrp = $1', [nrp]);
        if (exist.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'NRP sudah digunakan oleh mahasiswa lain' });
        }
        const result = await pool.query(
            'INSERT INTO mahasiswa (nrp, nama) VALUES ($1, $2) RETURNING *',
            [nrp, nama]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Endpoint untuk update data mahasiswa (nama, nrp)
app.put('/mahasiswa/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { nrp, nama } = req.body;
    if (!nrp || !nama) {
        return res.status(400).json({ success: false, message: 'Field nrp dan nama wajib diisi' });
    }
    try {
        // Cek NRP unik (kecuali milik sendiri)
        const exist = await pool.query('SELECT id FROM mahasiswa WHERE nrp = $1 AND id != $2', [nrp, id]);
        if (exist.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'NRP sudah digunakan oleh mahasiswa lain' });
        }
        const result = await pool.query(
            'UPDATE mahasiswa SET nrp = $1, nama = $2 WHERE id = $3 RETURNING *',
            [nrp, nama, id]
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
app.delete('/mahasiswa/:id', authenticateToken, async (req, res) => {
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
app.get('/mahasiswa/export', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM mahasiswa ORDER BY nama ASC');
        const mahasiswaRows = result.rows;
        // Header kolom
        const wsData = [
            ['NRP', 'Nama']
        ];
        // Data
        mahasiswaRows.forEach(m => {
            wsData.push([
                m.nrp,
                m.nama
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
app.get('/mahasiswa/template', authenticateToken, (req, res) => {
    const workbook = xlsx.utils.book_new();
    const wsData = [
        ['NRP', 'Nama'],
        ['Contoh: 05111940000001', 'Nama Mahasiswa']
    ];
    const worksheet = xlsx.utils.aoa_to_sheet(wsData);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'TemplateMahasiswa');
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="template_mahasiswa.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
});

// Endpoint untuk import data mahasiswa dari Excel
app.post('/mahasiswa/import', authenticateToken, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'File Excel diperlukan' });
    }
    let mahasiswaList;
    let workbook;
    try {
        workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Validasi header Excel file
        const allData = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        if (allData.length > 0) {
            const headers = allData[0];
            const expectedHeaders = ['NRP', 'Nama'];
            const headersValid = expectedHeaders.every((header, index) => 
                headers[index] && headers[index].toString().trim().toLowerCase() === header.toLowerCase()
            );
            if (!headersValid) {
                fs.unlinkSync(req.file.path);
                return res.status(400).json({ 
                    success: false, 
                    message: `Header Excel tidak sesuai template. Expected: ${expectedHeaders.join(', ')}` 
                });
            }
        }
        
        mahasiswaList = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        // Remove header and example row
        mahasiswaList = mahasiswaList.slice(1).filter(row => row[0]);
    } catch (err) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, message: 'File excel tidak valid' });
    }
    fs.unlinkSync(req.file.path);

    // Format: [NRP, Nama]
    if (!mahasiswaList.length) {
        return res.status(400).json({ success: false, message: 'Data mahasiswa kosong di file' });
    }
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const row of mahasiswaList) {
            const [nrp, nama] = row;
            if (!nrp || !nama) {
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
                'INSERT INTO mahasiswa (nrp, nama) VALUES ($1, $2)',
                [nrp, nama]
            );
        }
        await client.query('COMMIT');
        res.json({ success: true, message: 'Import data mahasiswa berhasil' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    } finally {
        client.release();
    }
});

// Endpoint untuk mengotomatisasi penentuan dosen dan jadwal sidang
app.post('/sidang/assign', authenticateToken, async (req, res) => {
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
app.post('/pembimbing/assign', authenticateToken, async (req, res) => {
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
app.get('/sidang', authenticateToken, async (req, res) => {
    try {
        let query = `
            SELECT s.id, s.mahasiswa_id, m.nama as mahasiswa_nama,
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
app.post('/sidang/batch-assign', authenticateToken, upload.single('file'), async (req, res) => {
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

// Endpoint untuk download template Excel jadwal sidang
app.get('/moderator/template', authenticateToken, (req, res) => {
    const workbook = xlsx.utils.book_new();
    const wsData = [
        ['NRP', 'Nama', 'Judul', 'Pembimbing 1', 'Pembimbing 2'],
        ['Contoh: 05111940000001', 'Nama Mahasiswa', 'Judul Skripsi/TA', 'Dr. Dosen A', 'Dr. Dosen B'],
        ['Contoh: 05111940000002', 'Nama Mahasiswa 2', 'Judul Skripsi/TA 2', 'Prof. Dosen C', 'Dr. Dosen D']
    ];
    const worksheet = xlsx.utils.aoa_to_sheet(wsData);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'TemplateJadwalSidang');
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="template_jadwal_sidang.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
});

// Endpoint untuk penjadwalan moderator sidang otomatis (OLD - replaced by /sidang/moderator/assign)
app.post('/moderator/assign', authenticateToken, upload.single('file'), async (req, res) => {

    let { tanggal_sidang, jam_awal, jam_akhir, durasi_sidang, jenis_sidang } = req.body;
    if (!jenis_sidang) jenis_sidang = 'Skripsi';

    console.log(`[${new Date().toISOString()}] Generate jadwal sidang request:`, {
        tanggal_sidang,
        jam_awal,
        jam_akhir,
        durasi_sidang,
        jenis_sidang,
        filename: req.file?.originalname
    });

    // Validasi field wajib (jenis_sidang tidak wajib, default Skripsi)
    if (!tanggal_sidang || !jam_awal || !jam_akhir || !durasi_sidang || !req.file) {
        return res.status(400).json({ success: false, message: 'Field tanggal_sidang, jam_awal, jam_akhir, durasi_sidang, dan file diperlukan' });
    }

    // Validasi file harus Excel
    if (!req.file.originalname.match(/\.(xlsx|xls)$/i)) {
        return res.status(400).json({ success: false, message: 'File harus berupa Excel (.xlsx/.xls)' });
    }

    // Validasi ukuran file (maksimal 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (req.file.size > maxSize) {
        return res.status(400).json({ success: false, message: 'Ukuran file maksimal 5MB' });
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

    // Tambahan validasi: Cek apakah sudah ada sidang_group di tanggal yang sama
    try {
        const groupCheck = await pool.query('SELECT id FROM sidang_group WHERE tanggal_sidang = $1', [tanggal_sidang]);
        if (groupCheck.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: `Jadwal Sidang pada tanggal ${new Date(tanggal_sidang).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} sudah dibuat atau di-generate. Silahkan cari tanggal lain atau hapus data sebelumnya.`
            });
        }
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Gagal validasi tanggal sidang: ' + err.message });
    }

    // Parse Excel
    let mahasiswaList;
    let client;
    // --- Deklarasi untuk warning mapping ID ---
    let idWarning = false;
    let idWarningList = [];
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

        // --- Tambahan: Simpan ke sidang_group dan sidang_item ---
        client = await pool.connect();
        await client.query('BEGIN');
        // Insert ke sidang_group
        const groupResult = await client.query(
            `INSERT INTO sidang_group (tanggal_sidang, jam_awal, jam_akhir, jenis_sidang, durasi_sidang, status_sidang)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [tanggal_sidang, jam_awal, jam_akhir, jenis_sidang || 'Skripsi', durasi, 0]
        );
        const sidang_group_id = groupResult.rows[0].id;

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
        // Buat map nama dosen ke id (untuk keperluan downstream jika perlu)
        const namaToId = {};
        dosenResult.rows.forEach(d => { namaToId[d.nama] = d.id; });

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
                    pembimbing_2: m.pembimbing_2_nama,
                    // moderator: m.moderator ? namaToId[m.moderator] : null,
                    // pembimbing_1: m.pembimbing_1_nama ? namaToId[m.pembimbing_1_nama] : null,
                    // pembimbing_2: m.pembimbing_2_nama ? namaToId[m.pembimbing_2_nama] : null
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

        // --- Tambahan: Simpan ke sidang_group dan sidang_item TANPA mengubah logic output lama ---
        // Semua logic di bawah ini tidak mengubah hasil output, hanya insert data ke 2 tabel baru
        // Insert dilakukan setelah hasilAkhir selesai dibuat
        // Ensure mapping variables are available in this scope
        const nrpToMhsId = {};
        mahasiswaResult.rows.forEach(m => { nrpToMhsId[m.nrp] = m.id; });
        let client2;
        try {
            client2 = await pool.connect();
            await client2.query('BEGIN');
            // Buat map kelas -> array mahasiswa
            const kelasMap = {};
            hasilAkhir.forEach(m => {
                if (!kelasMap[m.kelas]) kelasMap[m.kelas] = [];
                kelasMap[m.kelas].push(m);
            });
            for (const [kelasNo, arr] of Object.entries(kelasMap)) {
                // jam_awal dan jam_akhir dari sesi pertama dan terakhir
                const jam_awal = arr[0].jam_mulai;
                const jam_akhir = arr[arr.length - 1].jam_selesai;
                // Insert ke sidang_group
                const groupRes = await client2.query(
                    `INSERT INTO sidang_group (tanggal_sidang, jam_awal, jam_akhir, durasi_sidang) VALUES ($1,$2,$3,$4) RETURNING id`,
                    [tanggal_sidang, jam_awal, jam_akhir, durasi_sidang]
                );
                const groupId = groupRes.rows[0].id;
                // Insert semua mahasiswa di kelas ini ke sidang_item
                for (const m of arr) {
                    // Selalu gunakan *_id dari object jika ada, jika tidak, lookup dari nama (khusus penguji_1_id/penguji_2_id lookup ke DB jika perlu)
                    // const pembimbing_1_id = m.pembimbing_1_id || (m.pembimbing_1 ? namaToId[m.pembimbing_1.trim()] || null : null);
                    // const pembimbing_2_id = m.pembimbing_2_id || (m.pembimbing_2 ? namaToId[m.pembimbing_2.trim()] || null : null);
                    // const moderator_id = m.moderator_id || (m.moderator ? namaToId[m.moderator.trim()] || null : null);
                    const pembimbing_1_id = m.pembimbing_1 ? namaToId[m.pembimbing_1.trim()] || null : null;
                    const pembimbing_2_id = m.pembimbing_2 ? namaToId[m.pembimbing_2.trim()] || null : null;
                    const moderator_id = m.moderator ? namaToId[m.moderator.trim()] || null : null;
                    let penguji_1_id = m.penguji_1 ? namaToId[m.penguji_1.trim()] || null : null;
                    let penguji_2_id = m.penguji_2 ? namaToId[m.penguji_2.trim()] || null : null;
                    // let penguji_2_id = m.penguji_2_id || null;
                    // let penguji_1_id = m.penguji_1_id || null;
                    // Jika penguji_1_id/penguji_2_id belum ada, lookup ke DB berdasarkan nama
                    if (!penguji_1_id && m.penguji_1) {
                        const res = await client2.query('SELECT id FROM dosen WHERE LOWER(TRIM(nama)) = $1 LIMIT 1', [m.penguji_1.trim().toLowerCase()]);
                        penguji_1_id = res.rows.length > 0 ? res.rows[0].id : null;
                    }
                    if (!penguji_2_id && m.penguji_2) {
                        const res = await client2.query('SELECT id FROM dosen WHERE LOWER(TRIM(nama)) = $1 LIMIT 1', [m.penguji_2.trim().toLowerCase()]);
                        penguji_2_id = res.rows.length > 0 ? res.rows[0].id : null;
                    }
                    const mahasiswa_id = m.mahasiswa_id || (m.nrp ? nrpToMhsId[m.nrp] || null : null);
                    // Track warning if any id is null
                    if (!mahasiswa_id || !penguji_1_id || !penguji_2_id) {
                        idWarning = true;
                        idWarningList.push({
                            nrp: m.nrp,
                            mahasiswa_id,
                            penguji_1: m.penguji_1,
                            penguji_1_id,
                            penguji_2: m.penguji_2,
                            penguji_2_id
                        });
                    }
                    await client2.query(
                        `INSERT INTO sidang_item (sidang_group_id, mahasiswa_id, moderator_id, pembimbing_1_id, pembimbing_2_id, penguji_1_id, penguji_2_id, jam_mulai, jam_selesai) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
                        [groupId, mahasiswa_id, moderator_id, pembimbing_1_id, pembimbing_2_id, penguji_1_id, penguji_2_id, m.jam_mulai, m.jam_selesai]
                    );
                }
            }
            await client2.query('COMMIT');
        } catch (err) {
            if (client2) await client2.query('ROLLBACK');
            console.error('Gagal insert sidang_group/sidang_item:', err);
            // Tidak mengubah response ke user, hanya log error
        } finally {
            if (client2) client2.release();
        }

        // console.log('namaToId:', namaToId);
        // return res.status(200).json({ message: 'namaToId', namaToId });

        // Simpan ke sidang_item (legacy insert, ensure all *_id fields are mapped)
        for (const m of hasilAkhir) {
            // Map all *_id fields before insert (gunakan namaToId/nrpToMhsId yang sudah dideklarasi di atas)
            // const pembimbing_1_id = m.pembimbing_1 ? namaToId[m.pembimbing_1.trim().toLowerCase()] || null : null;
            // const pembimbing_1_id = m.pembimbing_1_id;
            // const pembimbing_2_id = m.pembimbing_2_id;
            const pembimbing_1_id = m.pembimbing_1 ? namaToId[m.pembimbing_1.trim()] || null : null;
            const pembimbing_2_id = m.pembimbing_2 ? namaToId[m.pembimbing_2.trim()] || null : null;
            const penguji_1_id = m.penguji_1 ? namaToId[m.penguji_1.trim()] || null : null;
            const penguji_2_id = m.penguji_2 ? namaToId[m.penguji_2.trim()] || null : null;
            const moderator_id = m.moderator ? namaToId[m.moderator.trim()] || null : null;
            const mahasiswa_id = m.nrp ? nrpToMhsId[m.nrp] || m.mahasiswa_id || null : m.mahasiswa_id || null;
            // const moderator_id = m.moderator_id;
            
            // Track warning if any id is null
            if (!mahasiswa_id || !penguji_1_id || !penguji_2_id) {
                idWarning = true;
                idWarningList.push({
                    nrp: m.nrp,
                    mahasiswa_id,
                    penguji_1: m.penguji_1,
                    penguji_1_id,
                    penguji_2: m.penguji_2,
                    penguji_2_id
                });
            }
            await client.query(
                `INSERT INTO sidang_item (
                    mahasiswa_id, pembimbing_1_id, pembimbing_2_id, penguji_1_id, penguji_2_id, moderator_id, sidang_group_id, room, tanggal_sidang, durasi_sidang, jam_mulai_final, jam_selesai_final, nrp, nama_mahasiswa, judul, jenis_sidang
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
                )`,
                [
                    mahasiswa_id,
                    pembimbing_1_id,
                    pembimbing_2_id,
                    penguji_1_id,
                    penguji_2_id,
                    moderator_id,
                    sidang_group_id,
                    m.kelas ? m.kelas.toString() : null,
                    // m.room ? m.room.toString() : null,
                    tanggal_sidang,
                    durasi,
                    m.jam_mulai || m.jam_mulai_final || null,
                    m.jam_selesai || m.jam_selesai_final || null,
                    m.nrp,
                    m.nama || m.nama_mahasiswa,
                    m.judul,
                    jenis_sidang || 'Skripsi'
                ]
            );
        }
        await client.query('COMMIT');

        // Warning jika ada kelas yang kekurangan dosen penguji atau jadwal tidak bisa dijadwalkan
        const adaWarning = hasilAkhir.some(m => !m.penguji_1 || !m.penguji_2 || m.jam_mulai === null);
        if (adaWarning || idWarning) {
            return res.status(200).json({
                success: true,
                warning: 'Beberapa kelas kekurangan dosen penguji, jadwal kelas tidak dapat dijadwalkan dalam rentang waktu yang tersedia, atau ada field ID yang gagal di-mapping.',
                idMappingWarning: idWarningList,
                data: hasilAkhir
            });
        }

        return res.json({ success: true, data: hasilAkhir });
    } catch (err) {
        if (client) await client.query('ROLLBACK');
        console.error("Error in /sidang/moderator/assign:", err);
        return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    } finally {
                             if (client) client.release();
    }
});

// Endpoint untuk mendapatkan daftar sidang_group
app.get('/sidang-group', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT 
                sg.id,
                TO_CHAR(sg.tanggal_sidang, 'YYYY-MM-DD') as tanggal_sidang,
                sg.jam_awal,
                sg.jam_akhir,
                sg.jenis_sidang,
                sg.durasi_sidang,
                sg.status_sidang,
                COUNT(si.id) as jumlah_mahasiswa,
                COUNT(DISTINCT si.moderator_id) as jumlah_dosen_moderator,
                COUNT(DISTINCT CASE WHEN si.pembimbing_1_id IS NOT NULL THEN si.pembimbing_1_id END) + 
                COUNT(DISTINCT CASE WHEN si.pembimbing_2_id IS NOT NULL THEN si.pembimbing_2_id END) - 
                COUNT(DISTINCT CASE WHEN si.pembimbing_1_id = si.pembimbing_2_id THEN si.pembimbing_1_id END) as jumlah_dosen_pembimbing,
                COUNT(DISTINCT CASE WHEN si.penguji_1_id IS NOT NULL THEN si.penguji_1_id END) + 
                COUNT(DISTINCT CASE WHEN si.penguji_2_id IS NOT NULL THEN si.penguji_2_id END) - 
                COUNT(DISTINCT CASE WHEN si.penguji_1_id = si.penguji_2_id THEN si.penguji_1_id END) as jumlah_dosen_penguji
            FROM sidang_group sg
            LEFT JOIN sidang_item si ON sg.id = si.sidang_group_id
            GROUP BY sg.id, sg.tanggal_sidang, sg.jam_awal, sg.jam_akhir, sg.jenis_sidang, sg.durasi_sidang, sg.status_sidang
            ORDER BY sg.tanggal_sidang DESC, sg.id DESC
        `;
        
        const result = await pool.query(query);
        const groups = result.rows.map(row => ({
            ...row,
            status_label: row.status_sidang === 0 ? 'Belum Mulai' : row.status_sidang === 1 ? 'Sedang Berlangsung' : 'Selesai'
        }));
        
        res.json(groups);
    } catch (err) {
        console.error('Error fetching sidang groups:', err);
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
});

// Endpoint untuk mendapatkan detail sidang_item berdasarkan sidang_group_id
app.get('/sidang-group/:id/detail', authenticateToken, async (req, res) => {
    const { id } = req.params;
    
    try {
        // Ambil info grup terlebih dahulu
        const groupQuery = `
            SELECT 
                id,
                TO_CHAR(tanggal_sidang, 'YYYY-MM-DD') as tanggal_sidang,
                jam_awal,
                jam_akhir,
                jenis_sidang,
                durasi_sidang,
                status_sidang
            FROM sidang_group 
            WHERE id = $1
        `;
        const groupResult = await pool.query(groupQuery, [id]);
        
        if (groupResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Sidang group tidak ditemukan' });
        }
        
        const group = groupResult.rows[0];
        
        // Ambil semua sidang_item dalam grup ini dengan JOIN ke tabel terkait
        const itemsQuery = `
            SELECT 
                si.id,
                si.nrp,
                si.nama_mahasiswa,
                si.judul,
                si.room,
                TO_CHAR(si.jam_mulai_final, 'HH24:MI') as jam_mulai,
                TO_CHAR(si.jam_selesai_final, 'HH24:MI') as jam_selesai,
                si.durasi_sidang,
                
                -- Moderator
                d_mod.nama as moderator_nama,
                
                -- Pembimbing
                d_pemb1.nama as pembimbing_1_nama,
                d_pemb2.nama as pembimbing_2_nama,
                
                -- Penguji
                d_peng1.nama as penguji_1_nama,
                d_peng2.nama as penguji_2_nama
                
            FROM sidang_item si
            LEFT JOIN dosen d_mod ON si.moderator_id = d_mod.id
            LEFT JOIN dosen d_pemb1 ON si.pembimbing_1_id = d_pemb1.id
            LEFT JOIN dosen d_pemb2 ON si.pembimbing_2_id = d_pemb2.id
            LEFT JOIN dosen d_peng1 ON si.penguji_1_id = d_peng1.id
            LEFT JOIN dosen d_peng2 ON si.penguji_2_id = d_peng2.id
            WHERE si.sidang_group_id = $1
            ORDER BY si.room, si.jam_mulai_final
        `;
        
        const itemsResult = await pool.query(itemsQuery, [id]);
        
        res.json({
            success: true,
            group: group,
            items: itemsResult.rows
        });
        
    } catch (err) {
        console.error('Error fetching sidang group detail:', err);
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
});

// Endpoint untuk menghapus sidang_group dan sidang_item terkait
app.delete('/sidang/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    
    try {
        await pool.query('BEGIN');
        
        // Hapus semua sidang_item yang terkait dengan sidang_group_id
        await pool.query('DELETE FROM sidang_item WHERE sidang_group_id = $1', [id]);
        
        // Hapus sidang_group
        const result = await pool.query('DELETE FROM sidang_group WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Sidang group tidak ditemukan' });
        }
        
        await pool.query('COMMIT');
        res.json({ success: true, message: 'Sidang group berhasil dihapus' });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('Error deleting sidang group:', err);
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
});

// Endpoint untuk export semua sidang grup ke Excel
app.get('/sidang-group/export', authenticateToken, async (req, res) => {
    try {
        // Ambil data sidang grup dengan statistik
        const groupQuery = `
            SELECT 
                sg.id,
                TO_CHAR(sg.tanggal_sidang, 'YYYY-MM-DD') as tanggal_sidang,
                sg.jam_awal,
                sg.jam_akhir,
                sg.jenis_sidang,
                sg.durasi_sidang,
                sg.status_sidang,
                CASE 
                    WHEN sg.status_sidang = 0 THEN 'Belum Mulai'
                    WHEN sg.status_sidang = 1 THEN 'Sedang Berlangsung'
                    WHEN sg.status_sidang = 2 THEN 'Selesai'
                    ELSE 'Unknown'
                END as status_label,
                COUNT(si.id) as jumlah_mahasiswa,
                COUNT(DISTINCT si.moderator_id) as jumlah_dosen_moderator,
                COUNT(DISTINCT CASE WHEN si.pembimbing_1_id IS NOT NULL THEN si.pembimbing_1_id END) + 
                COUNT(DISTINCT CASE WHEN si.pembimbing_2_id IS NOT NULL THEN si.pembimbing_2_id END) - 
                COUNT(DISTINCT CASE WHEN si.pembimbing_1_id = si.pembimbing_2_id THEN si.pembimbing_1_id END) as jumlah_dosen_pembimbing,
                COUNT(DISTINCT CASE WHEN si.penguji_1_id IS NOT NULL THEN si.penguji_1_id END) + 
                COUNT(DISTINCT CASE WHEN si.penguji_2_id IS NOT NULL THEN si.penguji_2_id END) - 
                COUNT(DISTINCT CASE WHEN si.penguji_1_id = si.penguji_2_id THEN si.penguji_1_id END) as jumlah_dosen_penguji
            FROM sidang_group sg
            LEFT JOIN sidang_item si ON sg.id = si.sidang_group_id
            GROUP BY sg.id, sg.tanggal_sidang, sg.jam_awal, sg.jam_akhir, sg.jenis_sidang, sg.durasi_sidang, sg.status_sidang
            ORDER BY sg.tanggal_sidang DESC, sg.id DESC
        `;
        
        const groupResult = await pool.query(groupQuery);
        const groups = groupResult.rows;
        
        // Buat workbook dengan 2 sheet
        const workbook = xlsx.utils.book_new();
        
        // Sheet 1: Ringkasan Grup
        const summaryData = [
            ['ID Grup', 'Tanggal Sidang', 'Jam Mulai', 'Jam Selesai', 'Jenis Sidang', 'Durasi (menit)', 'Status', 'Jumlah Mahasiswa', 'Jumlah Moderator', 'Jumlah Pembimbing', 'Jumlah Penguji']
        ];
        
        groups.forEach(group => {
            summaryData.push([
                group.id,
                group.tanggal_sidang,
                group.jam_awal,
                group.jam_akhir,
                group.jenis_sidang,
                group.durasi_sidang,
                group.status_label,
                group.jumlah_mahasiswa,
                group.jumlah_dosen_moderator,
                group.jumlah_dosen_pembimbing,
                group.jumlah_dosen_penguji
            ]);
        });
        
        const summarySheet = xlsx.utils.aoa_to_sheet(summaryData);
        xlsx.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan Grup');
        
        // Sheet 2: Detail Semua Mahasiswa
        if (groups.length > 0) {
            const detailQuery = `
                SELECT 
                    sg.id as grup_id,
                    TO_CHAR(sg.tanggal_sidang, 'YYYY-MM-DD') as tanggal_sidang,
                    si.nrp,
                    si.nama_mahasiswa,
                    si.judul,
                    si.room,
                    TO_CHAR(si.jam_mulai_final, 'HH24:MI') as jam_mulai,
                    TO_CHAR(si.jam_selesai_final, 'HH24:MI') as jam_selesai,
                    d_mod.nama as moderator_nama,
                    d_pemb1.nama as pembimbing_1_nama,
                    d_pemb2.nama as pembimbing_2_nama,
                    d_peng1.nama as penguji_1_nama,
                    d_peng2.nama as penguji_2_nama
                FROM sidang_group sg
                JOIN sidang_item si ON sg.id = si.sidang_group_id
                LEFT JOIN dosen d_mod ON si.moderator_id = d_mod.id
                LEFT JOIN dosen d_pemb1 ON si.pembimbing_1_id = d_pemb1.id
                LEFT JOIN dosen d_pemb2 ON si.pembimbing_2_id = d_pemb2.id
                LEFT JOIN dosen d_peng1 ON si.penguji_1_id = d_peng1.id
                LEFT JOIN dosen d_peng2 ON si.penguji_2_id = d_peng2.id
                ORDER BY sg.tanggal_sidang DESC, si.room, si.jam_mulai_final
            `;
            
            const detailResult = await pool.query(detailQuery);
            const items = detailResult.rows;
            
            const detailData = [
                ['ID Grup', 'Tanggal', 'NRP', 'Nama Mahasiswa', 'Judul', 'Ruang', 'Jam Mulai', 'Jam Selesai', 'Moderator', 'Pembimbing 1', 'Pembimbing 2', 'Penguji 1', 'Penguji 2']
            ];
            
            items.forEach(item => {
                detailData.push([
                    item.grup_id,
                    item.tanggal_sidang,
                    item.nrp,
                    item.nama_mahasiswa,
                    item.judul,
                    item.room,
                    item.jam_mulai,
                    item.jam_selesai,
                    item.moderator_nama || '-',
                    item.pembimbing_1_nama || '-',
                    item.pembimbing_2_nama || '-',
                    item.penguji_1_nama || '-',
                    item.penguji_2_nama || '-'
                ]);
            });
            
            const detailSheet = xlsx.utils.aoa_to_sheet(detailData);
            xlsx.utils.book_append_sheet(workbook, detailSheet, 'Detail Mahasiswa');
        }
        
        // Generate file dengan timestamp
        const currentDate = new Date().toISOString().split('T')[0];
        const filename = `sidang_grup_${currentDate}.xlsx`;
        
        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
        
    } catch (err) {
        console.error('Error exporting sidang groups:', err);
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
});

// Endpoint untuk export sidang grup tertentu ke Excel
app.get('/sidang-group/:id/export', authenticateToken, async (req, res) => {
    const { id } = req.params;
    
    try {
        // Ambil info grup
        const groupQuery = `
            SELECT 
                id,
                TO_CHAR(tanggal_sidang, 'YYYY-MM-DD') as tanggal_sidang,
                jam_awal,
                jam_akhir,
                jenis_sidang,
                durasi_sidang,
                status_sidang,
                CASE 
                    WHEN status_sidang = 0 THEN 'Belum Mulai'
                    WHEN status_sidang = 1 THEN 'Sedang Berlangsung'
                    WHEN status_sidang = 2 THEN 'Selesai'
                    ELSE 'Unknown'
                END as status_label
            FROM sidang_group 
            WHERE id = $1
        `;
        const groupResult = await pool.query(groupQuery, [id]);
        
        if (groupResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Sidang group tidak ditemukan' });
        }
        
        const group = groupResult.rows[0];
        
        // Ambil semua sidang_item dalam grup ini
        const itemsQuery = `
            SELECT 
                si.nrp,
                si.nama_mahasiswa,
                si.judul,
                si.room,
                TO_CHAR(si.jam_mulai_final, 'HH24:MI') as jam_mulai,
                TO_CHAR(si.jam_selesai_final, 'HH24:MI') as jam_selesai,
                si.durasi_sidang,
                d_mod.nama as moderator_nama,
                d_pemb1.nama as pembimbing_1_nama,
                d_pemb2.nama as pembimbing_2_nama,
                d_peng1.nama as penguji_1_nama,
                d_peng2.nama as penguji_2_nama
            FROM sidang_item si
            LEFT JOIN dosen d_mod ON si.moderator_id = d_mod.id
            LEFT JOIN dosen d_pemb1 ON si.pembimbing_1_id = d_pemb1.id
            LEFT JOIN dosen d_pemb2 ON si.pembimbing_2_id = d_pemb2.id
            LEFT JOIN dosen d_peng1 ON si.penguji_1_id = d_peng1.id
            LEFT JOIN dosen d_peng2 ON si.penguji_2_id = d_peng2.id
            WHERE si.sidang_group_id = $1
            ORDER BY si.room, si.jam_mulai_final
        `;
        
        const itemsResult = await pool.query(itemsQuery, [id]);
        const items = itemsResult.rows;
        
        // Buat workbook
        const workbook = xlsx.utils.book_new();
        
        // Sheet 1: Info Grup
        const infoData = [
            ['Field', 'Value'],
            ['ID Grup', group.id],
            ['Tanggal Sidang', group.tanggal_sidang],
            ['Waktu', `${group.jam_awal} - ${group.jam_akhir}`],
            ['Jenis Sidang', group.jenis_sidang],
            ['Durasi per Sidang', `${group.durasi_sidang} menit`],
            ['Status', group.status_label],
            ['Total Mahasiswa', items.length]
        ];
        
        const infoSheet = xlsx.utils.aoa_to_sheet(infoData);
        xlsx.utils.book_append_sheet(workbook, infoSheet, 'Info Grup');
        
        // Sheet 2: Detail Mahasiswa
        const detailData = [
            ['No', 'NRP', 'Nama Mahasiswa', 'Judul', 'Ruang', 'Jam Mulai', 'Jam Selesai', 'Moderator', 'Pembimbing 1', 'Pembimbing 2', 'Penguji 1', 'Penguji 2']
        ];
        
        items.forEach((item, index) => {
            detailData.push([
                index + 1,
                item.nrp,
                item.nama_mahasiswa,
                item.judul,
                item.room,
                item.jam_mulai,
                item.jam_selesai,
                item.moderator_nama || '-',
                item.pembimbing_1_nama || '-',
                item.pembimbing_2_nama || '-',
                item.penguji_1_nama || '-',
                item.penguji_2_nama || '-'
            ]);
        });
        
        const detailSheet = xlsx.utils.aoa_to_sheet(detailData);
        xlsx.utils.book_append_sheet(workbook, detailSheet, 'Detail Mahasiswa');
        
        // Generate filename
        const filename = `sidang_grup_${id}_${group.tanggal_sidang}.xlsx`;
        
        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
        
    } catch (err) {
        console.error('Error exporting sidang group detail:', err);
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
});

// =================== WHATSAPP NOTIFICATION UTILITIES ===================

// Phone number formatting utility
function formatPhoneNumber(phoneStr) {
    if (!phoneStr) return null;
    
    // Remove all non-digit characters
    let cleaned = phoneStr.replace(/\D/g, '');
    
    // Handle Indonesian numbers
    if (cleaned.startsWith('08')) {
        // Convert 08xxx to 628xxx
        cleaned = '62' + cleaned.substring(1);
    } else if (cleaned.startsWith('8')) {
        // Convert 8xxx to 628xxx
        cleaned = '62' + cleaned;
    } else if (cleaned.startsWith('0')) {
        // Remove leading 0 and add 62
        cleaned = '62' + cleaned.substring(1);
    } else if (!cleaned.startsWith('62')) {
        // Add 62 prefix if not present
        cleaned = '62' + cleaned;
    }
    
    return cleaned;
}

// Message template generator
function generateNotificationMessage(role, sidangData) {
    const { 
        nama_mahasiswa, 
        nrp, 
        tanggal_sidang, 
        jam_mulai, 
        jam_selesai, 
        room,
        jenis_sidang = 'Skripsi'
    } = sidangData;
    
    const tanggalFormatted = new Date(tanggal_sidang).toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const baseMessage = `
🎓 *NOTIFIKASI JADWAL SIDANG ${jenis_sidang.toUpperCase()}*

Yth. Bapak/Ibu,

Dengan hormat, kami informasikan bahwa Anda dijadwalkan sebagai *${role}* pada sidang ${jenis_sidang} berikut:

👤 *Mahasiswa:* ${nama_mahasiswa} (${nrp})
📅 *Tanggal:* ${tanggalFormatted}
⏰ *Waktu:* ${jam_mulai} - ${jam_selesai} WIB
🏢 *Ruang:* ${room}
📋 *Peran:* ${role}

Mohon untuk hadir tepat waktu. Terima kasih atas perhatian dan kerjasamanya.

Salam hormat,
Tim Jadwal Sidang
    `.trim();
    
    return baseMessage;
}

// Send WhatsApp message function using internal client
async function sendWhatsAppMessage(phoneNumber, message) {
    try {
        if (!isWhatsAppReady) {
            return {
                success: false,
                error: 'WhatsApp client is not ready. Please ensure WhatsApp is connected.'
            };
        }

        const formattedNumber = `${phoneNumber}@c.us`;
        await whatsappClient.sendMessage(formattedNumber, message);
        
        return {
            success: true,
            data: { message: 'Message sent successfully', to: phoneNumber }
        };
    } catch (error) {
        console.error('WhatsApp send error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// Delay function for rate limiting
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// =================== WHATSAPP NOTIFICATION API ENDPOINTS ===================

// Send notification to all dosen in a sidang
app.post('/notifications/sidang/:sidangId', authenticateToken, async (req, res) => {
    const { sidangId } = req.params;
    
    try {
        // Get sidang details with all dosen information
        const sidangQuery = `
            SELECT 
                si.id, si.nama_mahasiswa, si.nrp, si.tanggal_sidang, 
                si.jam_mulai_final as jam_mulai, si.jam_selesai_final as jam_selesai,
                si.room, si.jenis_sidang,
                d1.nama as moderator_nama, d1.no_hp as moderator_hp,
                d2.nama as pembimbing_1_nama, d2.no_hp as pembimbing_1_hp,
                d3.nama as pembimbing_2_nama, d3.no_hp as pembimbing_2_hp,
                d4.nama as penguji_1_nama, d4.no_hp as penguji_1_hp,
                d5.nama as penguji_2_nama, d5.no_hp as penguji_2_hp
            FROM sidang_item si
            LEFT JOIN dosen d1 ON si.moderator_id = d1.id
            LEFT JOIN dosen d2 ON si.pembimbing_1_id = d2.id
            LEFT JOIN dosen d3 ON si.pembimbing_2_id = d3.id
            LEFT JOIN dosen d4 ON si.penguji_1_id = d4.id
            LEFT JOIN dosen d5 ON si.penguji_2_id = d5.id
            WHERE si.id = $1
        `;
        
        const result = await pool.query(sidangQuery, [sidangId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Sidang tidak ditemukan'
            });
        }
        
        const sidangData = result.rows[0];
        const notifications = [];
        
        // Define roles and their corresponding data
        const roles = [
            { role: 'Moderator', nama: sidangData.moderator_nama, hp: sidangData.moderator_hp },
            { role: 'Pembimbing 1', nama: sidangData.pembimbing_1_nama, hp: sidangData.pembimbing_1_hp },
            { role: 'Pembimbing 2', nama: sidangData.pembimbing_2_nama, hp: sidangData.pembimbing_2_hp },
            { role: 'Penguji 1', nama: sidangData.penguji_1_nama, hp: sidangData.penguji_1_hp },
            { role: 'Penguji 2', nama: sidangData.penguji_2_nama, hp: sidangData.penguji_2_hp }
        ];
        
        // Send notifications to each role
        for (const roleData of roles) {
            if (roleData.nama && roleData.hp) {
                const phoneNumber = formatPhoneNumber(roleData.hp);
                
                if (phoneNumber) {
                    const message = generateNotificationMessage(roleData.role, sidangData);
                    
                    // Add delay between messages (2-3 seconds)
                    if (notifications.length > 0) {
                        await delay(2500);
                    }
                    
                    const sendResult = await sendWhatsAppMessage(phoneNumber, message);
                    
                    notifications.push({
                        role: roleData.role,
                        nama: roleData.nama,
                        phone: phoneNumber,
                        success: sendResult.success,
                        error: sendResult.error || null,
                        timestamp: new Date().toISOString()
                    });
                } else {
                    notifications.push({
                        role: roleData.role,
                        nama: roleData.nama,
                        phone: roleData.hp,
                        success: false,
                        error: 'Invalid phone number format',
                        timestamp: new Date().toISOString()
                    });
                }
            } else {
                notifications.push({
                    role: roleData.role,
                    nama: roleData.nama || 'Not assigned',
                    phone: null,
                    success: false,
                    error: 'Dosen not assigned or phone number missing',
                    timestamp: new Date().toISOString()
                });
            }
        }
        
        // Calculate success/failure counts
        const successCount = notifications.filter(n => n.success).length;
        const failureCount = notifications.length - successCount;
        
        res.json({
            success: true,
            message: `Notification sent to ${successCount} out of ${notifications.length} recipients`,
            summary: {
                total: notifications.length,
                sent: successCount,
                failed: failureCount
            },
            details: notifications,
            sidang: {
                id: sidangData.id,
                mahasiswa: sidangData.nama_mahasiswa,
                nrp: sidangData.nrp,
                tanggal: sidangData.tanggal_sidang,
                jam: `${sidangData.jam_mulai} - ${sidangData.jam_selesai}`
            }
        });
        
    } catch (error) {
        console.error('Notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while sending notifications',
            error: error.message
        });
    }
});

// Send batch notifications for all sidang in a group
app.post('/notifications/group/:groupId', authenticateToken, async (req, res) => {
    const { groupId } = req.params;
    
    try {
        // Get all sidang items in the group
        const groupQuery = `
            SELECT 
                si.id, si.nama_mahasiswa, si.nrp, si.tanggal_sidang, 
                si.jam_mulai_final as jam_mulai, si.jam_selesai_final as jam_selesai,
                si.room, si.jenis_sidang,
                d1.nama as moderator_nama, d1.no_hp as moderator_hp,
                d2.nama as pembimbing_1_nama, d2.no_hp as pembimbing_1_hp,
                d3.nama as pembimbing_2_nama, d3.no_hp as pembimbing_2_hp,
                d4.nama as penguji_1_nama, d4.no_hp as penguji_1_hp,
                d5.nama as penguji_2_nama, d5.no_hp as penguji_2_hp
            FROM sidang_item si
            LEFT JOIN dosen d1 ON si.moderator_id = d1.id
            LEFT JOIN dosen d2 ON si.pembimbing_1_id = d2.id
            LEFT JOIN dosen d3 ON si.pembimbing_2_id = d3.id
            LEFT JOIN dosen d4 ON si.penguji_1_id = d4.id
            LEFT JOIN dosen d5 ON si.penguji_2_id = d5.id
            WHERE si.sidang_group_id = $1
            ORDER BY si.jam_mulai_final ASC
        `;
        
        const result = await pool.query(groupQuery, [groupId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tidak ada sidang ditemukan dalam group ini'
            });
        }
        
        const allNotifications = [];
        let totalSent = 0;
        let totalFailed = 0;
        
        // Process each sidang in the group
        for (const sidangData of result.rows) {
            const sidangNotifications = [];
            
            // Define roles and their corresponding data
            const roles = [
                { role: 'Moderator', nama: sidangData.moderator_nama, hp: sidangData.moderator_hp },
                { role: 'Pembimbing 1', nama: sidangData.pembimbing_1_nama, hp: sidangData.pembimbing_1_hp },
                { role: 'Pembimbing 2', nama: sidangData.pembimbing_2_nama, hp: sidangData.pembimbing_2_hp },
                { role: 'Penguji 1', nama: sidangData.penguji_1_nama, hp: sidangData.penguji_1_hp },
                { role: 'Penguji 2', nama: sidangData.penguji_2_nama, hp: sidangData.penguji_2_hp }
            ];
            
            // Send notifications to each role
            for (const roleData of roles) {
                if (roleData.nama && roleData.hp) {
                    const phoneNumber = formatPhoneNumber(roleData.hp);
                    
                    if (phoneNumber) {
                        const message = generateNotificationMessage(roleData.role, sidangData);
                        
                        // Add delay between messages (2-3 seconds)
                        if (allNotifications.length > 0) {
                            await delay(2500);
                        }
                        
                        const sendResult = await sendWhatsAppMessage(phoneNumber, message);
                        
                        const notification = {
                            sidang_id: sidangData.id,
                            mahasiswa: sidangData.nama_mahasiswa,
                            role: roleData.role,
                            nama: roleData.nama,
                            phone: phoneNumber,
                            success: sendResult.success,
                            error: sendResult.error || null,
                            timestamp: new Date().toISOString()
                        };
                        
                        sidangNotifications.push(notification);
                        
                        if (sendResult.success) {
                            totalSent++;
                        } else {
                            totalFailed++;
                        }
                    } else {
                        const notification = {
                            sidang_id: sidangData.id,
                            mahasiswa: sidangData.nama_mahasiswa,
                            role: roleData.role,
                            nama: roleData.nama,
                            phone: roleData.hp,
                            success: false,
                            error: 'Invalid phone number format',
                            timestamp: new Date().toISOString()
                        };
                        
                        sidangNotifications.push(notification);
                        totalFailed++;
                    }
                } else {
                    const notification = {
                        sidang_id: sidangData.id,
                        mahasiswa: sidangData.nama_mahasiswa,
                        role: roleData.role,
                        nama: roleData.nama || 'Not assigned',
                        phone: null,
                        success: false,
                        error: 'Dosen not assigned or phone number missing',
                        timestamp: new Date().toISOString()
                    };
                    
                    sidangNotifications.push(notification);
                    totalFailed++;
                }
            }
            
            allNotifications.push({
                sidang_id: sidangData.id,
                mahasiswa: sidangData.nama_mahasiswa,
                nrp: sidangData.nrp,
                jam: `${sidangData.jam_mulai} - ${sidangData.jam_selesai}`,
                notifications: sidangNotifications
            });
        }
        
        res.json({
            success: true,
            message: `Batch notification completed: ${totalSent} sent, ${totalFailed} failed`,
            summary: {
                total_sidang: result.rows.length,
                total_notifications: totalSent + totalFailed,
                sent: totalSent,
                failed: totalFailed
            },
            details: allNotifications,
            group_id: groupId
        });
        
    } catch (error) {
        console.error('Batch notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while sending batch notifications',
            error: error.message
        });
    }
});

// =================== WHATSAPP API ENDPOINTS ===================

// Route for WhatsApp registration (QR Code)
app.get("/whatsapp/register", async (req, res) => {
    if (isWhatsAppReady) {
        return res.status(200).json({
            success: true,
            message: "WhatsApp client is already active and ready to use.",
        });
    }

    // Wait for QR Code to be generated
    setTimeout(async () => {
        if (!qrCodeString) {
            return res.status(200).json({
                success: false,
                message: "QR Code not available or already scanned.",
            });
        }

        try {
            // Convert QR Code to base64 image
            const qrImage = await QRCode.toDataURL(qrCodeString);
            res.status(200).json({
                success: true,
                message: "Scan QR Code with your WhatsApp.",
                qr: qrImage, // QR in base64 format
            });
        } catch (error) {
            console.error("Failed to generate QR Code:", error);
            res.status(500).json({
                success: false,
                message: "Error generating QR Code.",
                error: error.message,
            });
        }
    }, 1000);
});

// Route for WhatsApp status check
app.get("/whatsapp/status", (req, res) => {
    res.json({
        success: true,
        whatsapp_ready: isWhatsAppReady,
        message: isWhatsAppReady 
            ? "WhatsApp client is ready" 
            : "WhatsApp client is not ready. Please scan QR code at /whatsapp/register"
    });
});

// Get WhatsApp service status
app.get('/notifications/status', authenticateToken, async (req, res) => {
    res.json({
        success: true,
        whatsapp_service: isWhatsAppReady ? 'connected' : 'disconnected',
        whatsapp_ready: isWhatsAppReady,
        message: isWhatsAppReady 
            ? 'WhatsApp client is ready for sending notifications' 
            : 'WhatsApp client is not ready. Please scan QR code at /whatsapp/register'
    });
});

// Test single notification endpoint
app.post('/notifications/test', authenticateToken, async (req, res) => {
    const { phone, message } = req.body;
    
    if (!phone || !message) {
        return res.status(400).json({
            success: false,
            message: 'Phone number and message are required'
        });
    }
    
    try {
        const formattedPhone = formatPhoneNumber(phone);
        if (!formattedPhone) {
            return res.status(400).json({
                success: false,
                message: 'Invalid phone number format'
            });
        }
        
        const result = await sendWhatsAppMessage(formattedPhone, message);
        
        res.json({
            success: result.success,
            message: result.success ? 'Test message sent successfully' : 'Failed to send test message',
            phone: formattedPhone,
            error: result.error || null,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error while sending test message',
            error: error.message
        });
    }
});

// module.exports = app;
if (require.main === module) {
    app.listen(5000, () => {
        console.log('Server berjalan di port 5000');
    });
}

module.exports = app;