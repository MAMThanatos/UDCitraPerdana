<?php
session_start();
require_once('../../config/db.php');

header('Content-Type: application/json');

// Check authentication
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized. Silakan login terlebih dahulu.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
    exit;
}

$id_user = $_SESSION['user_id'];
$tgl_opname = $_POST['tgl_opname'] ?? date('Y-m-d');
$keterangan = trim($_POST['keterangan'] ?? '');
$items_raw = $_POST['items'] ?? '[]';

$items = json_decode($items_raw, true);

if (!is_array($items) || empty($items)) {
    echo json_encode(['status' => 'error', 'message' => 'Data detail barang tidak boleh kosong.']);
    exit;
}

// Mulai transaksi database
$conn->begin_transaction();

try {
    // 1. Simpan Header Opname
    $stmt_header = $conn->prepare("INSERT INTO opname (id_user, tgl_opname, keterangan) VALUES (?, ?, ?)");
    $stmt_header->bind_param("iss", $id_user, $tgl_opname, $keterangan);
    if (!$stmt_header->execute()) {
        throw new Exception("Gagal menyimpan header opname: " . $stmt_header->error);
    }
    $id_opname = $conn->insert_id;
    $stmt_header->close();

    // Persiapkan statement untuk detail dan update stok barang
    $stmt_detail = $conn->prepare("INSERT INTO detailopname (id_opname, id_barang, stok_sistem, stok_fisik, selisih, keterangan) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt_update_stok = $conn->prepare("UPDATE barang SET stok = ? WHERE id_barang = ?");

    // 2. Simpan Detail dan Lakukan Penyesuaian Stok
    foreach ($items as $item) {
        $id_barang = (int)$item['id_barang'];
        $stok_sistem = (int)$item['stok_sistem'];
        $stok_fisik = (int)$item['stok_fisik'];
        $selisih = $stok_fisik - $stok_sistem;
        $det_ket = trim($item['keterangan'] ?? '');

        // Insert ke detailopname
        $stmt_detail->bind_param("iiiiis", $id_opname, $id_barang, $stok_sistem, $stok_fisik, $selisih, $det_ket);
        if (!$stmt_detail->execute()) {
            throw new Exception("Gagal menyimpan detail opname untuk ID Barang $id_barang: " . $stmt_detail->error);
        }

        // Jalankan update stok pada tabel barang
        $stmt_update_stok->bind_param("ii", $stok_fisik, $id_barang);
        if (!$stmt_update_stok->execute()) {
            throw new Exception("Gagal memperbarui stok barang untuk ID Barang $id_barang: " . $stmt_update_stok->error);
        }
    }

    $stmt_detail->close();
    $stmt_update_stok->close();

    // Commit transaksi
    $conn->commit();

    echo json_encode([
        'status' => 'success',
        'message' => 'Stock Opname berhasil disimpan dan stok barang disinkronkan!'
    ]);

} catch (Exception $e) {
    // Rollback transaksi jika terjadi error
    $conn->rollback();
    echo json_encode([
        'status' => 'error',
        'message' => 'Gagal melakukan Stock Opname: ' . $e->getMessage()
    ]);
}

$conn->close();
?>
