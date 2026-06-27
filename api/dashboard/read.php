<?php
session_start();
require_once('../../config/db.php');

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized.']);
    exit;
}

try {
    $data = [];

    // 1. Total Barang
    $res = $conn->query("SELECT COUNT(*) AS total FROM barang");
    $data['totalBarangCount'] = (int)$res->fetch_assoc()['total'];

    // 2. Total Masuk Qty
    $res = $conn->query("SELECT SUM(jumlah) AS total FROM detailmasuk");
    $data['totalMasukQty'] = (int)$res->fetch_assoc()['total'];

    // 3. Total Keluar Qty
    $res = $conn->query("SELECT SUM(jumlah) AS total FROM detailkeluar");
    $data['totalKeluarQty'] = (int)$res->fetch_assoc()['total'];

    // 4. Stok Menipis
    $res = $conn->query("SELECT id_barang, kode_barang, nama_barang, stok, satuan, COALESCE(stok_minimum, 10) as stok_min FROM barang WHERE stok <= COALESCE(stok_minimum, 10)");
    $stokMenipisList = [];
    while ($row = $res->fetch_assoc()) {
        $stokMenipisList[] = [
            'nama_barang' => $row['nama_barang'],
            'stok' => (int)$row['stok'],
            'satuan' => $row['satuan'],
            'stok_minimum' => (int)$row['stok_min']
        ];
    }
    $data['stokMenipisList'] = $stokMenipisList;
    $data['stokMenipisCount'] = count($stokMenipisList);

    // 5. Produk Populer (Top 3 by sales)
    $sql_populer = "SELECT b.nama_barang, b.satuan, SUM(dk.jumlah) as totalOut 
                    FROM detailkeluar dk 
                    JOIN barang b ON dk.id_barang = b.id_barang 
                    GROUP BY b.id_barang 
                    ORDER BY totalOut DESC LIMIT 3";
    $res = $conn->query($sql_populer);
    $populerList = [];
    while ($row = $res->fetch_assoc()) {
        $populerList[] = [
            'nama_barang' => $row['nama_barang'],
            'satuan' => $row['satuan'],
            'totalOut' => (int)$row['totalOut']
        ];
    }
    $data['populerList'] = $populerList;

    // 6. Aktivitas Terbaru (Gabungan Masuk, Keluar, Mutasi)
    $activities = [];

    // Masuk
    $sql_masuk = "SELECT tm.tgl_masuk as time, dm.jumlah as qty, b.nama_barang as barang, s.nama_supplier as supplier 
                  FROM transaksimasuk tm 
                  JOIN detailmasuk dm ON tm.id_masuk = dm.id_masuk 
                  JOIN barang b ON dm.id_barang = b.id_barang 
                  JOIN supplier s ON tm.id_supplier = s.id_supplier";
    $res = $conn->query($sql_masuk);
    while ($row = $res->fetch_assoc()) {
        $activities[] = [
            'type' => 'masuk',
            'text' => "Penerimaan {$row['qty']} {$row['barang']} dari {$row['supplier']}",
            'time' => $row['time'],
            'icon' => 'fa-arrow-down',
            'color' => '#10b981'
        ];
    }

    // Keluar
    $sql_keluar = "SELECT tk.tgl_keluar as time, dk.jumlah as qty, b.nama_barang as barang, tk.tujuan 
                   FROM transaksikeluar tk 
                   JOIN detailkeluar dk ON tk.id_keluar = dk.id_keluar 
                   JOIN barang b ON dk.id_barang = b.id_barang";
    $res = $conn->query($sql_keluar);
    while ($row = $res->fetch_assoc()) {
        $activities[] = [
            'type' => 'keluar',
            'text' => "Pengeluaran {$row['qty']} {$row['barang']} ke {$row['tujuan']}",
            'time' => $row['time'],
            'icon' => 'fa-arrow-up',
            'color' => '#ef4444'
        ];
    }

    // Mutasi
    $sql_mutasi = "SELECT tgl_mutasi as time, jumlah as qty, b.nama_barang as barang, gudang_asal, gudang_tujuan 
                   FROM mutasi m 
                   JOIN barang b ON m.id_barang = b.id_barang";
    $res = $conn->query($sql_mutasi);
    while ($row = $res->fetch_assoc()) {
        $activities[] = [
            'type' => 'mutasi',
            'text' => "Mutasi {$row['qty']} {$row['barang']} dari {$row['gudang_asal']} ke {$row['gudang_tujuan']}",
            'time' => $row['time'],
            'icon' => 'fa-exchange-alt',
            'color' => '#6366f1'
        ];
    }

    // Sort by time descending
    usort($activities, function($a, $b) {
        return strcmp($b['time'], $a['time']);
    });

    // Take top 5 for dashboard
    $data['activities'] = array_slice($activities, 0, 5);

    echo json_encode([
        'status' => 'success',
        'data' => $data
    ]);

} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Gagal memuat data dashboard: ' . $e->getMessage()
    ]);
}

$conn->close();
?>
