const express = require('express');
const router = express.Router();
const db = require('../lib/database');

// --- SATPAM MIDDLEWARE ---
router.use((req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    next();
});

// 1. Tampilkan Daftar Peminjaman
router.get('/', async (req, res, next) => {
    try {
        let sql = '';
        let params = [];

        if (req.session.user.role === 'penanggung_jawab') {
            // Admin: Tarik semua data, ambil nama dari tabel users (entah dia dosen atau mahasiswa)
            sql = `SELECT room_loans.*, rooms.name AS room_name, 
                   users.name AS borrower_name 
                   FROM room_loans 
                   JOIN rooms ON room_loans.room_id = rooms.id 
                   LEFT JOIN users ON users.id = COALESCE(room_loans.employee_id, room_loans.student_id)
                   ORDER BY room_loans.created_at DESC`;
        } else {
            // Mahasiswa: Tarik data miliknya sendiri pakai kolom student_id
            sql = `SELECT room_loans.*, rooms.name AS room_name 
                   FROM room_loans 
                   JOIN rooms ON room_loans.room_id = rooms.id 
                   WHERE room_loans.student_id = ? 
                   ORDER BY room_loans.created_at DESC`;
            params = [req.session.user.id];
        }

        const [bookings] = await db.query(sql, params);
        res.render('booking-list', { title: 'Daftar Peminjaman Ruangan', bookings: bookings });
    } catch (err) {
        next(err);
    }
});

// 2. Tampilkan Form Tambah
router.get('/add', async (req, res, next) => {
    try {
        const [rooms] = await db.query('SELECT * FROM rooms');
        res.render('add-booking', { title: 'Buat Pengajuan Baru', rooms: rooms });
    } catch (err) {
        next(err);
    }
});

// 3. Proses Simpan Data Form
router.post('/add', async (req, res, next) => {
    try {
        const { room_id, tanggal, jam_mulai, jam_selesai, purpose } = req.body;
        const start_time = `${tanggal} ${jam_mulai}:00`;
        const end_time = `${tanggal} ${jam_selesai}:00`;
        const approved_by_id = 1;
        const status = 'requested';

        // --- FILTER ID BERDASARKAN JABATAN ---
        let employee_id = null;
        let student_id = null;

        if (req.session.user.role === 'penanggung_jawab') {
            employee_id = req.session.user.id;
        } else {
            student_id = req.session.user.id; // Mahasiswa masuk ke sini!
        }

        // Simpan dengan query yang udah diperbarui
        const sql = `INSERT INTO room_loans (room_id, employee_id, student_id, start_time, end_time, purpose, status, approved_by_id, created_at, updated_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;

        await db.execute(sql, [room_id, employee_id, student_id, start_time, end_time, purpose, status, approved_by_id]);

        res.redirect('/bookings');
    } catch (err) {
        console.error("Error nambah data:", err); // Biar gampang nge-debug kalau error lagi
        next(err);
    }
});

// 4. Proses ACC / Tolak
router.post('/:id/action', async (req, res, next) => {
    try {
        if (req.session.user.role !== 'penanggung_jawab') {
            return res.status(403).send("Hanya Penanggung Jawab yang boleh melakukan aksi ini.");
        }

        const bookingId = req.params.id;
        const { action_status } = req.body;

        const sql = `UPDATE room_loans SET status = ?, updated_at = NOW() WHERE id = ?`;
        await db.execute(sql, [action_status, bookingId]);

        res.redirect('/bookings');
    } catch (err) {
        next(err);
    }
});

module.exports = router;