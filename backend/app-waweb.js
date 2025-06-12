const express = require("express");
const cors = require("cors");
const path = require("path");
const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");
// const fs = require("fs");

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let qrCodeString = ""; // Menyimpan QR Code sementara
let client; // Variabel untuk WhatsApp client
let isClientInitialized = false; // Flag untuk mengecek apakah client sudah diinisialisasi

// Fungsi untuk inisialisasi client
const initializeClient = () => {
    client = new Client({
        puppeteer: {
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        },
        authStrategy: new LocalAuth({
            clientId: "session-whatsapp", // Folder penyimpanan sesi
        }),
    });

    // Event saat client siap
    client.on("ready", () => {
        console.log("WhatsApp Web siap digunakan!");
        isClientInitialized = true;
        qrCodeString = ""; // Hapus QR Code setelah sesi dimulai
    });

    // Event untuk menangani error
    client.on("auth_failure", () => {
        console.log("Autentikasi gagal. Silakan ulangi registrasi.");
        isClientInitialized = false;
    });

    // Event saat client terputus
    client.on("disconnected", (reason) => {
        console.log("WhatsApp Client terputus. Alasan:", reason);
        isClientInitialized = false;
    });

    client.initialize();
};

// Jalankan inisialisasi client saat server dinyalakan
initializeClient();

// Route untuk API /register
app.get("/register", async (req, res) => {
    if (isClientInitialized) {
        return res.status(400).json({
            message: "Client sudah aktif. Silakan gunakan client yang ada.",
        });
    }

    // Tambahkan event listener untuk menangani QR Code
    client.on("qr", (qr) => {
        qrCodeString = qr;
        console.log("QR Code diperbarui. Silakan pindai menggunakan WhatsApp.");
    });

    // Tunggu QR Code dibuat
    setTimeout(async () => {
        if (!qrCodeString) {
            return res.status(200).json({
                message: "QR Code tidak tersedia atau sudah dipindai.",
            });
        }

        try {
            // Konversi QR Code ke gambar base64
            const qrImage = await QRCode.toDataURL(qrCodeString);
            res.status(200).json({
                message: "Pindai QR Code dengan WhatsApp Anda.",
                qr: qrImage, // QR dalam format base64
            });
        } catch (error) {
            console.error("Gagal membuat QR Code:", error);
            res.status(500).json({
                message: "Terjadi kesalahan saat membuat QR Code.",
                error: error.message,
            });
        }
    }, 1000);
});

// Route untuk API /send-message
app.post("/send-message", async (req, res) => {
    const { number, message } = req.body;

    if (!isClientInitialized) {
        return res.status(400).json({
            message: "Client belum diinisialisasi. Silakan akses /register terlebih dahulu.",
        });
    }

    if (!number || !message) {
        return res.status(400).json({
            message: "Nomor telepon dan pesan diperlukan.",
        });
    }

    const formattedNumber = `${number}@c.us`;

    try {
        await client.sendMessage(formattedNumber, message);
        res.status(200).json({
            message: "Pesan berhasil dikirim.",
            to: number,
        });
    } catch (error) {
        console.error("Gagal mengirim pesan:", error);
        res.status(500).json({
            message: "Terjadi kesalahan saat mengirim pesan.",
            error: error.message,
        });
    }
});

// Jalankan server
app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});
