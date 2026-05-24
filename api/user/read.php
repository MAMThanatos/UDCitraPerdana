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

try {
    $sql = "SELECT id_user, username, nama_lengkap, role FROM user ORDER BY id_user ASC";
    $result = $conn->query($sql);
    
    $users = [];
    while ($row = $result->fetch_assoc()) {
        $users[] = [
            'id' => (int)$row['id_user'],
            'nama' => $row['nama_lengkap'],
            'username' => $row['username'],
            'role' => $row['role']
        ];
    }
    
    echo json_encode([
        'status' => 'success',
        'data' => $users
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Gagal memuat pengguna: ' . $e->getMessage()
    ]);
}

$conn->close();
?>
