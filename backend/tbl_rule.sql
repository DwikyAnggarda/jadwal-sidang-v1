CREATE TABLE rule (
    id SERIAL PRIMARY KEY,
    jenis_sidang VARCHAR(10) NOT NULL,      -- Jenis sidang: TPPA, TA, KP
    durasi_sidang INT NOT NULL,             -- Durasi dalam menit, misal 60
    jumlah_penguji INT NOT NULL,            -- Jumlah penguji, misal 2
    jam_awal TIME NOT NULL,                 -- Jam mulai, misal '08:00'
    jam_akhir TIME NOT NULL,                -- Jam selesai, misal '12:00'
--     kapasitas_ruangan INT NOT NULL,         -- Kapasitas, misal 5
--     mode_sidang VARCHAR(10) CHECK (mode_sidang IN ('tatap muka', 'online', 'hybrid')), -- Mode sidang
--     pembimbing_sebagai_penguji BOOLEAN DEFAULT FALSE, -- Boleh/tidak, default FALSE
--     maks_sidang_per_dosen INT NOT NULL,     -- Maks sidang dosen, misal 4
--     catatan TEXT                            -- Catatan khusus
);

INSERT INTO rule (
    jenis_sidang, durasi_sidang, jumlah_penguji, jam_awal, jam_akhir, kapasitas_ruangan, mode_sidang, 
    pembimbing_sebagai_penguji, maks_sidang_per_dosen, catatan
) VALUES 
    ('TPPA', 60, 2, '08:00', '12:00', 5, 'tatap muka', FALSE, 4, 'Sidang pertama'),
    ('TA', 90, 3, '09:00', '15:00', 10, 'online', TRUE, 3, 'Sidang daring'),
    ('KP', 75, 2, '10:00', '14:00', 8, 'hybrid', FALSE, 5, 'Sidang kombinasi');
