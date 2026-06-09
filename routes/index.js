const express = require('express');
const router = express.Router();
const db = require('../lib/database');

// 1. Rute Halaman Utama (Cek Role di Sini!)
router.get('/', async function (req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    try {
        // PISAHKAN HALAMAN BERDASARKAN ROLE
        if (req.session.user.role === 'penanggung_jawab') {
            const [totalSemua] = await db.query('SELECT COUNT(*) as total FROM room_loans');
            const [menunggu] = await db.query('SELECT COUNT(*) as total FROM room_loans WHERE status = "requested"');
            const [disetujui] = await db.query('SELECT COUNT(*) as total FROM room_loans WHERE status = "approved"');
            const [selesai] = await db.query('SELECT COUNT(*) as total FROM room_loans WHERE status = "completed"');
            const [ditolak] = await db.query('SELECT COUNT(*) as total FROM room_loans WHERE status = "rejected"');

            res.render('dashboard-admin', {
                title: 'Dashboard Penanggung Jawab',
                stats: {
                    total: totalSemua[0].total,
                    menunggu: menunggu[0].total,
                    disetujui: disetujui[0].total,
                    selesai: selesai[0].total,
                    ditolak: ditolak[0].total
                }
            });
        } else {
            const userId = req.session.user.id;
            const [totalPeminjaman] = await db.query(
                'SELECT COUNT(*) as total FROM room_loans WHERE employee_id = ?', [userId]
            );
            const [menunggu] = await db.query(
                'SELECT COUNT(*) as total FROM room_loans WHERE employee_id = ? AND status = "requested"', [userId]
            );
            const [disetujui] = await db.query(
                'SELECT COUNT(*) as total FROM room_loans WHERE employee_id = ? AND status = "approved"', [userId]
            );
            const [selesai] = await db.query(
                'SELECT COUNT(*) as total FROM room_loans WHERE employee_id = ? AND status = "completed"', [userId]
            );

            res.render('dashboard-user', {
                title: 'Dashboard Pengguna',
                stats: {
                    total: totalPeminjaman[0].total,
                    menunggu: menunggu[0].total,
                    disetujui: disetujui[0].total,
                    selesai: selesai[0].total
                }
            });
        }
    } catch (err) {
        next(err);
    }
});

// 2. Rute Nampilin Login
router.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.render('login', { layout: false, error: null });
});

// 3. Rute Proses Cek Login
router.post('/login', async (req, res, next) => {
    try {
        const { username, password } = req.body;
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [username]);

        if (users.length === 0) return res.render('login', { layout: false, error: 'Email atau Password salah!' });

        const user = users[0];
        if (password !== user.password) return res.render('login', { layout: false, error: 'Email atau Password salah!' });

        // Cek role dari tabel model_has_roles
        let userRole = 'pengguna';
        const [userRoles] = await db.query(
            `SELECT roles.name FROM roles 
            JOIN model_has_roles ON roles.id = model_has_roles.role_id 
            WHERE model_has_roles.model_id = ? 
            AND model_has_roles.model_type = 'App\\\\Models\\\\User'`,
            [user.id]
        );
        if (userRoles.length > 0 && userRoles[0].name === 'penanggung_jawab') {
            userRole = 'penanggung_jawab';
        }

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