<?php
session_start();
require_once('../../config/db.php');

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized. Silakan login terlebih dahulu.']);
    exit;
}

$user_id = (int)$_SESSION['user_id'];
$old_password = $_POST['old_password'] ?? '';
$new_password = $_POST['new_password'] ?? '';

if (empty($old_password) || empty($new_password)) {
    echo json_encode(['status' => 'error', 'message' => 'Semua kolom password wajib diisi.']);
    exit;
}

try {
    // 1. Ambil password lama dari database
    $stmt = $conn->prepare("SELECT password FROM user WHERE id_user = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $res = $stmt->get_result();
    
    if ($res->num_rows === 1) {
        $row = $res->fetch_assoc();
        
        // 2. Verifikasi password lama
        if (password_verify($old_password, $row['password'])) {
            // 3. Hash password baru dan update
            $new_hashed = password_hash($new_password, PASSWORD_DEFAULT);
            $stmt_upd = $conn->prepare("UPDATE user SET password = ? WHERE id_user = ?");
            $stmt_upd->bind_param("si", $new_hashed, $user_id);
            if ($stmt_upd->execute()) {
                echo json_encode(['status' => 'success', 'message' => 'Password berhasil diubah!']);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Gagal mengubah password di database.']);
            }
            $stmt_upd->close();
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Password lama salah!']);
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Pengguna tidak ditemukan.']);
    }
    $stmt->close();
} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => 'Terjadi kesalahan server: ' . $e->getMessage()]);
}

$conn->close();
?>
