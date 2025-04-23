const express = require('express');
const cors = require('cors');
const pool = require('./db');

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
        let query = 'SELECT * FROM mahasiswa';
        const conditions = [];
        if (without_pembimbing === 'true') {
            conditions.push('pembimbing_1_id IS NULL AND pembimbing_2_id IS NULL');
        }
        if (with_pembimbing === 'true') {
            conditions.push('pembimbing_1_id IS NOT NULL AND pembimbing_2_id IS NOT NULL');
        }
        if (without_sidang === 'true') {
            conditions.push('id NOT IN (SELECT mahasiswa_id FROM sidang)');
        }
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        query += ' ORDER BY nama ASC';

        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Endpoint untuk menambahkan dosen
app.post('/dosen', async (req, res) => {
    const { nama, departemen } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO dosen (nama, departemen) VALUES ($1, $2) RETURNING *',
            [nama, departemen]
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
    const { mahasiswa_id, tanggal_sidang, room } = req.body;

    if (!mahasiswa_id || !tanggal_sidang || !room) {
        return res.status(400).send('Field mahasiswa_id, tanggal_sidang, dan room diperlukan');
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

        // Cek ketersediaan ruangan
        const roomBusyResult = await pool.query(
            'SELECT 1 FROM sidang WHERE room = $1 AND tanggal_sidang = $2',
            [room, tanggal_sidang]
        );
        if (roomBusyResult.rows.length > 0) {
            return res.status(400).send('Ruangan sudah dipesan pada tanggal_sidang tersebut');
        }

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

        // Cek ketersediaan pembimbing pada tanggal_sidang tersebut
        const busyDosenResult = await pool.query(`
            SELECT DISTINCT unnest(array[pembimbing_1_id, pembimbing_2_id, penguji_1_id, penguji_2_id, moderator_id]) as dosen_id
            FROM sidang
            WHERE tanggal_sidang = $1
        `, [tanggal_sidang]);
        const busyDosenIds = busyDosenResult.rows.map(row => row.dosen_id);

        if (busyDosenIds.includes(pembimbing_1_id) || busyDosenIds.includes(pembimbing_2_id)) {
            return res.status(400).send('Pembimbing tidak tersedia pada tanggal_sidang tersebut');
        }

        // Ambil dosen yang tersedia untuk penguji dan moderator
        const availableDosenResult = await pool.query(`
            SELECT * FROM dosen
            WHERE id NOT IN ($1, $2)
            AND id NOT IN (
                SELECT unnest(array[pembimbing_1_id, pembimbing_2_id, penguji_1_id, penguji_2_id, moderator_id])
                FROM sidang
                WHERE tanggal_sidang = $3
            )
        `, [pembimbing_1_id, pembimbing_2_id, tanggal_sidang]);
        const availableDosen = availableDosenResult.rows;

        if (availableDosen.length < 3) {
            return res.status(400).send('Tidak cukup dosen tersedia untuk penguji dan moderator');
        }

        // Pilih tiga dosen berbeda untuk penguji dan moderator
        const [penguji1, penguji2, moderator] = availableDosen.slice(0, 3);

        // Simpan ke tabel sidang
        await pool.query(`
            INSERT INTO sidang (mahasiswa_id, pembimbing_1_id, pembimbing_2_id, penguji_1_id, penguji_2_id, moderator_id, room, tanggal_sidang)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [mahasiswa_id, pembimbing_1_id, pembimbing_2_id, penguji1.id, penguji2.id, moderator.id, room, tanggal_sidang]);

        res.send('Penugasan berhasil');
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
                   s.room, TO_CHAR(s.tanggal_sidang, 'YYYY-MM-DD') as tanggal_sidang
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

// Endpoint untuk mendapatkan daftar ruangan
/* app.get('/rooms', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM room');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
}); */

app.listen(5000, () => {
    console.log('Server berjalan di port 5000');
});