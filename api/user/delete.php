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

if ($id_user <= 0) {
    echo json_encode(['status' => 'error', 'message' => 'ID pengguna tidak valid.']);
    exit;
}

// 1. DOUBLE-LAYER SECURITY: Cegah admin menghapus dirinya sendiri yang sedang login
if ($id_user === (int)$_SESSION['user_id']) {
    echo json_encode(['status' => 'error', 'message' => 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan.']);
    exit;
}

try {
    // 2. CHECK RELATION INTEGRITY: Cek apakah user pernah mencatat transaksi masuk
    $stmt_tm = $conn->prepare("SELECT id_masuk FROM transaksimasuk WHERE id_user = ? LIMIT 1");
    $stmt_tm->bind_param("i", $id_user);
    $stmt_tm->execute();
    if ($stmt_tm->get_result()->num_rows > 0) {
        echo json_encode(['status' => 'error', 'message' => 'Gagal menghapus: Pengguna ini memiliki riwayat pencatatan transaksi masuk yang aktif.']);
        $stmt_tm->close();
        exit;
    }
    $stmt_tm->close();

    // 3. CHECK RELATION INTEGRITY: Cek apakah user pernah mencatat transaksi keluar
    $stmt_tk = $conn->prepare("SELECT id_keluar FROM transaksikeluar WHERE id_user = ? LIMIT 1");
    $stmt_tk->bind_param("i", $id_user);
    $stmt_tk->execute();
    if ($stmt_tk->get_result()->num_rows > 0) {
        echo json_encode(['status' => 'error', 'message' => 'Gagal menghapus: Pengguna ini memiliki riwayat pencatatan transaksi keluar yang aktif.']);
        $stmt_tk->close();
        exit;
    }
    $stmt_tk->close();

    // 4. Hapus pengguna secara aman
    $stmt = $conn->prepare("DELETE FROM user WHERE id_user = ?");
    $stmt->bind_param("i", $id_user);
    
    if ($stmt->execute()) {
        echo json_encode(['status' => 'success', 'message' => 'Pengguna berhasil dihapus dari sistem!']);
    } else {
        throw new Exception("Gagal menghapus dari database.");
    }
    $stmt->close();

} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => 'Terjadi kesalahan: ' . $e->getMessage()]);
}

$conn->close();
?>
