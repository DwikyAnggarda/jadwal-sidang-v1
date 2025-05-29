const request = require('supertest');
const path = require('path');
const app = require('../server');

describe('POST /moderator/assign', () => {
    it('should return 200 and valid output for valid Excel', async () => {
        const res = await request(app)
            .post('/moderator/assign')
            .field('tanggal_sidang', '2025-05-26')
            .field('jam_awal', '09:00')
            .field('jam_akhir', '12:00')
            .field('durasi_sidang', '30')
            .attach('file', path.join(__dirname, '../tmpl_find_moderator_unique_case.xlsx'));
        // Debug respons jika gagal
        if (res.statusCode !== 200) {
            // Tampilkan pesan error dari backend untuk membantu debugging
            console.error('API response:', res.body);
        }
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);
        const mhs = res.body.data[0];
        expect(mhs).toHaveProperty('nrp');
        expect(mhs).toHaveProperty('nama_mahasiswa');
        expect(mhs).toHaveProperty('moderator');
        expect(mhs).toHaveProperty('kelas');
    });

    it('should return 400 if required fields are missing', async () => {
        const res = await request(app)
            .post('/moderator/assign')
            .field('tanggal_sidang', '')
            .attach('file', path.join(__dirname, '../tmpl_find_moderator_unique_case.xlsx'));
        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it('should return 400 if file is not Excel', async () => {
        const res = await request(app)
            .post('/moderator/assign')
            .field('tanggal_sidang', '2025-05-26')
            .field('jam_awal', '09:00')
            .field('jam_akhir', '12:00')
            .field('durasi_sidang', 30)
            .attach('file', Buffer.from('not an excel'), path.join(__dirname, '../test.txt'));
        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it('should return 400 if durasi_sidang is invalid', async () => {
        const res = await request(app)
            .post('/moderator/assign')
            .field('tanggal_sidang', '2025-05-26')
            .field('jam_awal', '09:00')
            .field('jam_akhir', '12:00')
            .field('durasi_sidang', '-10')
            .attach('file', path.join(__dirname, '../tmpl_find_moderator_unique_case.xlsx'));
        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it('should return 400 if jam_akhir before jam_awal', async () => {
        const res = await request(app)
            .post('/moderator/assign')
            .field('tanggal_sidang', '2025-05-26')
            .field('jam_awal', '12:00')
            .field('jam_akhir', '09:00')
            .field('durasi_sidang', 30)
            .attach('file', path.join(__dirname, '../tmpl_find_moderator_unique_case.xlsx'));
        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });
});