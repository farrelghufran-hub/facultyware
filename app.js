require('dotenv').config();
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var expressLayouts = require('express-ejs-layouts'); // <-- IMPORT LAYOUT DI SINI

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var bookingRouter = require('./routes/bookingRoutes');
const { notFoundHandler, errorHandler } = require('./middlewares/error');

var app = express();

// --- 1. SETUP VIEW ENGINE & LAYOUT (WAJIB DI ATAS) ---
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts); // Mengaktifkan layouting
app.set('layout', 'layout'); // Kasih tau Express kalau file masternya namanya 'layout.ejs'

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// --- 2. SETUP SESSION ---
app.use(session({
  secret: 'kunci-rahasia-dosen-pweb',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));
app.use((req, res, next) => {
  // Variabel ini otomatis bisa dibaca di SEMUA file .ejs lu tanpa harus dikirim manual
  res.locals.user = req.session.user || null;
  res.locals.title = 'Facultyware Peminjaman';
  next();
});

// --- 3. PENDAFTARAN RUTE (WAJIB DI BAWAH LAYOUT & SESSION) ---
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/bookings', bookingRouter);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;