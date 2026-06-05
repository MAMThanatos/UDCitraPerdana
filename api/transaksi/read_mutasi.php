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
    $sql = "SELECT m.id_mutasi, m.tgl_mutasi, m.no_mutasi, m.gudang_asal, m.gudang_tujuan, m.jumlah, m.biaya_kirim, m.keterangan,
                   b.nama_barang, b.kode_barang, u.nama_lengkap
            FROM mutasi m
            JOIN barang b ON m.id_barang = b.id_barang
            JOIN user u ON m.id_user = u.id_user
            ORDER BY m.tgl_mutasi DESC, m.id_mutasi DESC";
            
    $result = $conn->query($sql);
    $mutations = [];
    
    while ($row = $result->fetch_assoc()) {
        $mutations[] = [
            'id_mutasi' => (int)$row['id_mutasi'],
            'tanggal' => $row['tgl_mutasi'],
            'no_mutasi' => $row['no_mutasi'],
            'gudang_asal' => $row['gudang_asal'],
            'gudang_tujuan' => $row['gudang_tujuan'],
            'barang' => $row['nama_barang'],
            'kode_barang' => $row['kode_barang'],
            'qty' => (int)$row['jumlah'],
            'biaya_kirim' => (double)$row['biaya_kirim'],
            'operator' => $row['nama_lengkap'],
            'keterangan' => $row['keterangan']
        ];
    }
    
    echo json_encode([
        'status' => 'success',
        'data' => $mutations
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Gagal memuat mutasi: ' . $e->getMessage()
    ]);
}
$conn->close();
exit;
?>
