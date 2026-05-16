<?php
session_start();
require_once('../../config/db.php');

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method']);
    exit;
}

$nama_lengkap = $_POST['nama_lengkap'] ?? '';
$username = $_POST['username'] ?? '';
$password = $_POST['password'] ?? '';
$role = $_POST['role'] ?? 'Staff Gudang';

if (empty($nama_lengkap) || empty($username) || empty($password)) {
    echo json_encode(['status' => 'error', 'message' => 'Semua field harus diisi']);
    exit;
}

// Cek apakah username sudah dipakai
$stmt = $conn->prepare("SELECT id_user FROM user WHERE username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    echo json_encode(['status' => 'error', 'message' => 'Username sudah terdaftar! Gunakan username lain.']);
    $stmt->close();
    exit;
}
$stmt->close();

// Hash password menggunakan Bcrypt
$hashed_password = password_hash($password, PASSWORD_BCRYPT);

// Insert user baru ke database
$stmt = $conn->prepare("INSERT INTO user (username, password, nama_lengkap, role) VALUES (?, ?, ?, ?)");
$stmt->bind_param("ssss", $username, $hashed_password, $nama_lengkap, $role);

if ($stmt->execute()) {
    echo json_encode(['status' => 'success', 'message' => 'Akun berhasil dibuat! Silakan login.']);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Gagal membuat akun: ' . $conn->error]);
}

$stmt->close();
$conn->close();
?>
