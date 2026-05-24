<?php
session_start();
require_once('../../config/db.php');

header('Content-Type: application/json');

// Check authentication & role (Admin only)
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized. Silakan login terlebih dahulu.']);
    exit;
}

if ($_SESSION['role'] !== 'Admin / Owner') {
    echo json_encode(['status' => 'error', 'message' => 'Forbidden. Hanya Admin / Owner yang diizinkan mengakses data ini.']);
    exit;
}

$id_user = isset($_POST['id_user']) ? (int)$_POST['id_user'] : 0;
$nama = trim($_POST['nama_lengkap'] ?? '');
$username = trim($_POST['username'] ?? '');
$role = trim($_POST['role'] ?? '');
$password = $_POST['password'] ?? '';

// Validasi input wajib
if (empty($nama) || empty($username) || empty($role)) {
    echo json_encode(['status' => 'error', 'message' => 'Semua kolom wajib diisi dengan benar.']);
    exit;
}

try {
    if ($id_user > 0) {
        // --- PROSES EDIT PENGGUNA ---
        
        // 1. Validasi: Jangan biarkan admin mengubah role dirinya sendiri agar tidak terkunci
        if ($id_user === (int)$_SESSION['user_id'] && $role !== 'Admin / Owner') {
            echo json_encode(['status' => 'error', 'message' => 'Anda tidak dapat mengubah hak akses Admin Anda sendiri untuk mencegah kegagalan sistem.']);
            exit;
        }
        
        // 2. Cek apakah username baru sudah digunakan oleh pengguna lain
        $stmt_check = $conn->prepare("SELECT id_user FROM user WHERE username = ? AND id_user != ?");
        $stmt_check->bind_param("si", $username, $id_user);
        $stmt_check->execute();
        if ($stmt_check->get_result()->num_rows > 0) {
            echo json_encode(['status' => 'error', 'message' => 'Username sudah digunakan oleh akun lain!']);
            $stmt_check->close();
            exit;
        }
        $stmt_check->close();
        
        if (!empty($password)) {
            // Edit beserta password baru
            $hashed_pass = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $conn->prepare("UPDATE user SET nama_lengkap = ?, username = ?, role = ?, password = ? WHERE id_user = ?");
            $stmt->bind_param("ssssi", $nama, $username, $role, $hashed_pass, $id_user);
        } else {
            // Edit tanpa mengubah password
            $stmt = $conn->prepare("UPDATE user SET nama_lengkap = ?, username = ?, role = ? WHERE id_user = ?");
            $stmt->bind_param("sssi", $nama, $username, $role, $id_user);
        }
        
        if ($stmt->execute()) {
            // Jika admin mengedit datanya sendiri, perbarui data sesi
            if ($id_user === (int)$_SESSION['user_id']) {
                $_SESSION['username'] = $username;
                $_SESSION['nama_lengkap'] = $nama;
                $_SESSION['role'] = $role;
            }
            echo json_encode(['status' => 'success', 'message' => 'Data pengguna berhasil diperbarui!']);
        } else {
            throw new Exception("Gagal mengupdate database.");
        }
        $stmt->close();
        
    } else {
        // --- PROSES TAMBAH PENGGUNA BARU ---
        
        if (empty($password)) {
            echo json_encode(['status' => 'error', 'message' => 'Password wajib diisi untuk pengguna baru.']);
            exit;
        }
        
        // 1. Cek apakah username sudah ada
        $stmt_check = $conn->prepare("SELECT id_user FROM user WHERE username = ?");
        $stmt_check->bind_param("s", $username);
        $stmt_check->execute();
        if ($stmt_check->get_result()->num_rows > 0) {
            echo json_encode(['status' => 'error', 'message' => 'Username sudah terdaftar!']);
            $stmt_check->close();
            exit;
        }
        $stmt_check->close();
        
        // 2. Hash password dan Insert
        $hashed_pass = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $conn->prepare("INSERT INTO user (nama_lengkap, username, role, password) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("ssss", $nama, $username, $role, $hashed_pass);
        
        if ($stmt->execute()) {
            echo json_encode(['status' => 'success', 'message' => 'Pengguna baru berhasil ditambahkan!']);
        } else {
            throw new Exception("Gagal menyimpan ke database.");
        }
        $stmt->close();
    }
    
} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => 'Terjadi kesalahan: ' . $e->getMessage()]);
}

$conn->close();
?>
