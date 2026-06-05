const express = require('express');
const router = express.Router();
const db = require('../lib/database');

// 1. Rute Halaman Utama (Cek Role di Sini!)
router.get('/', function (req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    // PISAHKAN HALAMAN BERDASARKAN ROLE
    if (req.session.user.role === 'penanggung_jawab') {
        // Arahkan ke file dashboard-admin.ejs
        res.render('dashboard-admin', {
            title: 'Dashboard Penanggung Jawab'
            // user nggak perlu dikirim lagi karena udah ada res.locals di app.js
        });
    } else {
        // Arahkan ke file dashboard-user.ejs
        res.render('dashboard-user', {
            title: 'Dashboard Pengguna'
        });
    }
});

// 2. Rute Nampilin Login
router.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/');
    // Pengecualian layout biar nggak error title
    res.render('login', { layout: false, error: null });
});

// 3. Rute Proses Cek Login
router.post('/login', async (req, res, next) => {
    try {
        const { username, password } = req.body;
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [username]);

        // Pengecualian layout kalau gagal login
        if (users.length === 0) return res.render('login', { layout: false, error: 'Email atau Password salah!' });

        const user = users[0];
        // Pengecualian layout kalau password salah
        if (password !== user.password) return res.render('login', { layout: false, error: 'Email atau Password salah!' });

        // --- INI BAGIAN CEK JABATAN (ROLE) ---
        let userRole = 'pengguna'; // Default-nya dilempar ke pengguna biasa

        // Cek ke tabel employees
        const [isEmployee] = await db.query('SELECT id FROM employees WHERE id = ?', [user.id]);

        // Kalau ketemu di tabel employees, ganti role-nya!
        if (isEmployee.length > 0) {
            userRole = 'penanggung_jawab';
        }

        // Masukin role ke dalam session
        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: userRole
        };

        res.redirect('/');
    } catch (err) {
        console.error("Error login:", err);
        next(err);
    }
});

// 4. Rute Logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

module.exports = router;