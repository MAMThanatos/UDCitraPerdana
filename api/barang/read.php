<?php
session_start();
require_once('../../config/db.php');

header('Content-Type: application/json');

// Check authentication
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized. Silakan login terlebih dahulu.']);
    exit;
}

try {
    // Kueri untuk mengambil seluruh data barang beserta nama kategori terkait
    $sql = "SELECT b.*, k.nama_kategori 
            FROM barang b 
            JOIN kategori k ON b.id_kategori = k.id_kategori 
            ORDER BY b.kode_barang ASC";
            
    $result = $conn->query($sql);
    
    $barang = [];
    while ($row = $result->fetch_assoc()) {
        $barang[] = [
            'id_barang' => (int)$row['id_barang'],
            'id_kategori' => (int)$row['id_kategori'],
            'kode_barang' => $row['kode_barang'],
            'nama_barang' => $row['nama_barang'],
            'stok' => (int)$row['stok'],
            'satuan' => $row['satuan'],
            'harga' => (float)$row['harga'],
            'harga_beli' => (float)$row['harga_beli'],
            'deskripsi' => $row['deskripsi'],
            'berat' => $row['berat'],
            'dimensi' => $row['dimensi'],
            'lokasi_rak' => $row['lokasi_rak'],
            'stok_minimum' => (int)$row['stok_minimum'],
            'kategori' => $row['nama_kategori'] // Memetakan nama kategori untuk kecocokan FE
        ];
    }
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Data barang berhasil diambil',
        'data' => $barang
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Gagal mengambil data barang: ' . $e->getMessage()
    ]);
}

$conn->close();
?>
