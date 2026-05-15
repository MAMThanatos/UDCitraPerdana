<?php
/**
 * index.php - Gateway untuk mengakses Dashboard
 * 
 * File ini berfungsi untuk:
 * 1. Memvalidasi session user (check login)
 * 2. Redirect ke halaman login jika user belum login
 * 3. Redirect ke index.html (dashboard utama) jika user sudah login
 */

// Mulai session
session_start();

// Cek apakah user sudah login
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    // User belum login, redirect ke halaman login
    header("Location: views/auth/login.php");
    exit();
}

// User sudah login, redirect ke dashboard utama (index.html)
header("Location: index.html");
exit();
?>