### Aplikasi Pembuatan Jadwal Sidang Otomatis Dengan Notifikasi

## Gambaran Umum

Aplikasi ini merupakan sistem penjadwalan sidang  otomatis yang terintegrasi dengan notifikasi WhatsApp. Sistem ini terdiri dari:

- **Backend**: Node.js dengan Express.js dan PostgreSQL
- **Frontend**: React dengan TypeScript dan Tailwind CSS
- **Fitur Utama**:
  - Penjadwalan otomatis dengan algoritma heuristik
  - Import/Export data Excel
  - Sistem autentikasi multi-role
  - Notifikasi WhatsApp otomatis
  - Manajemen data mahasiswa, dosen, dan jadwal sidang

## Requirements
- Node JS 16++
- NPM
- PostgreSQL 17++
- Git

## Backend Guide

**Install dependencies**

    ```bash
    cd jadwal-sidang-v1
    cd backend
    npm install
    npm install dotenv
    cp .env.example .env
    ```

**Edit file .env**

    ```env
    # Database Configuration
    DB_HOST=localhost
    DB_PORT=5417
    DB_NAME=sppa_db
    DB_USER=your_db_user
    DB_PASSWORD=your_db_password
    
    # Server Configuration
    PORT=9000
    NODE_ENV=development
    
    # JWT Configuration
    JWT_SECRET=your_jwt_secret_key_here
    JWT_EXPIRES_IN=7d
    
    # WhatsApp Configuration (optional)
    WHATSAPP_SESSION_PATH=./whatsapp-session
    ```

**Run project**

    ```bash
    npm run dev
    ```

Backend akan berjalan di port 9000 (sesuai konfigurasi .env)

## Frontend Guide

**Install dependencies**

    ```bash
    cd jadwal-sidang-v1
    cd frontend
    npm install
    ```

**Setup environment variables**

    ```bash
    # Buat file .env di folder frontend
    touch .env
    ```

**Edit file .env (frontend)**

    ```env
    # API Configuration
    VITE_API_BASE_URL=http://localhost:9000
    
    # Environment
    VITE_NODE_ENV=development
    ```

**Run project**

    ```bash
    npm run dev
    ```

Frontend akan berjalan di port default Vite (biasanya 5173) dan akan terhubung ke backend di port 9000

## Environment Variables

### Backend (.env)
- `PORT`: Port server backend (default: 9000)
- `DB_HOST`: Host database PostgreSQL
- `DB_PORT`: Port database PostgreSQL
- `DB_NAME`: Nama database
- `DB_USER`: Username database
- `DB_PASSWORD`: Password database
- `JWT_SECRET`: Secret key untuk JWT authentication
- `JWT_EXPIRES_IN`: Durasi expire token JWT

### Frontend (.env)
- `VITE_API_BASE_URL`: URL backend API (default: http://localhost:9000)
- `VITE_NODE_ENV`: Environment mode (development/production)

## Catatan Penting

1. Pastikan port backend (9000) tidak digunakan oleh aplikasi lain
2. File `.env` harus dibuat di kedua folder (backend dan frontend)
3. Restart server setelah mengubah environment variables
4. Untuk production, ubah URL dan port sesuai dengan server deployment