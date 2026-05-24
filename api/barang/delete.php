<?php
session_start();
require_once('../../config/db.php');

header('Content-Type: application/json');

// Check authentication & Role (only Admin / Owner can delete)
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized. Silakan login terlebih dahulu.']);
    exit;
}

if ($_SESSION['role'] !== 'Admin / Owner') {
    echo json_encode(['status' => 'error', 'message' => 'Akses ditolak. Hanya Admin / Owner yang dapat menghapus barang.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
    exit;
}

$kode_barang = trim($_POST['kode_barang'] ?? '');

if (empty($kode_barang)) {
    echo json_encode(['status' => 'error', 'message' => 'Kode barang wajib disertakan.']);
    exit;
}

try {
    // 1. Dapatkan id_barang berdasarkan kode_barang
    $stmt = $conn->prepare("SELECT id_barang FROM barang WHERE kode_barang = ?");
    $stmt->bind_param("s", $kode_barang);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows !== 1) {
        echo json_encode(['status' => 'error', 'message' => 'Barang tidak ditemukan.']);
        $stmt->close();
        exit;
    }
    
    $row = $result->fetch_assoc();
    $id_barang = $row['id_barang'];
    $stmt->close();
    
    // 2. Periksa apakah barang pernah digunakan di transaksi masuk
    $stmt_masuk = $conn->prepare("SELECT id_detail FROM detailmasuk WHERE id_barang = ? LIMIT 1");
    $stmt_masuk->bind_param("i", $id_barang);
    $stmt_masuk->execute();
    $result_masuk = $stmt_masuk->get_result();
    
    if ($result_masuk->num_rows > 0) {
        echo json_encode([
            'status' => 'error', 
            'message' => 'Barang tidak dapat dihapus karena memiliki riwayat transaksi masuk. Hapus transaksi terkait terlebih dahulu!'
        ]);
        $stmt_masuk->close();
        exit;
    }
    $stmt_masuk->close();
    
    // 3. Periksa apakah barang pernah digunakan di transaksi keluar
    $stmt_keluar = $conn->prepare("SELECT id_detail FROM detailkeluar WHERE id_barang = ? LIMIT 1");
    $stmt_keluar->bind_param("i", $id_barang);
    $stmt_keluar->execute();
    $result_keluar = $stmt_keluar->get_result();
    
    if ($result_keluar->num_rows > 0) {
        echo json_encode([
            'status' => 'error', 
            'message' => 'Barang tidak dapat dihapus karena memiliki riwayat transaksi keluar. Hapus transaksi terkait terlebih dahulu!'
        ]);
        $stmt_keluar->close();
        exit;
    }
    $stmt_keluar->close();
    
    // 4. Lakukan penghapusan barang
    $stmt_del = $conn->prepare("DELETE FROM barang WHERE id_barang = ?");
    $stmt_del->bind_param("i", $id_barang);
    
    if ($stmt_del->execute()) {
        echo json_encode(['status' => 'success', 'message' => 'Data barang berhasil dihapus dari database!']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Gagal menghapus data barang: ' . $conn->error]);
    }
    $stmt_del->close();
    
} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => 'Terjadi kesalahan sistem: ' . $e->getMessage()]);
}

$conn->close();
?>
