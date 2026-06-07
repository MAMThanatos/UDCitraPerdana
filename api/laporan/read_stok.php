<?php
session_start();
require_once('../../config/db.php');

header('Content-Type: application/json');

// Check authentication
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized. Silakan login terlebih dahulu.']);
    exit;
}

// Ambil parameter filter bulan (format: YYYY-MM)
$monthFilter = $_GET['month'] ?? '';

try {
    // 1. Ambil semua data barang (filter berdasarkan tanggal jika ada bulan terpilih)
    $sql_barang = "SELECT b.id_barang, b.kode_barang, b.nama_barang, b.stok AS stok_sekarang, b.harga_beli, k.nama_kategori AS kategori
                   FROM barang b
                   JOIN kategori k ON b.id_kategori = k.id_kategori";
    
    if (!empty($monthFilter) && preg_match('/^\d{4}-\d{2}$/', $monthFilter)) {
        $escaped_month = $conn->real_escape_string($monthFilter);
        // Tampilkan HANYA barang yang memiliki transaksi masuk atau keluar pada bulan terpilih
        $sql_barang .= " WHERE (b.id_barang IN (
                            SELECT id_barang FROM detailmasuk dm 
                            JOIN transaksimasuk tm ON dm.id_masuk = tm.id_masuk 
                            WHERE DATE_FORMAT(tm.tgl_masuk, '%Y-%m') = '$escaped_month'
                         )
                         OR b.id_barang IN (
                            SELECT id_barang FROM detailkeluar dk 
                            JOIN transaksikeluar tk ON dk.id_keluar = tk.id_keluar 
                            WHERE DATE_FORMAT(tk.tgl_keluar, '%Y-%m') = '$escaped_month'
                         ))";
    }
    
    $sql_barang .= " ORDER BY b.kode_barang ASC";
    $res_barang = $conn->query($sql_barang);
    
    $report_data = [];
    
    while ($row = $res_barang->fetch_assoc()) {
        $id_barang = (int)$row['id_barang'];
        $stok_sekarang = (int)$row['stok_sekarang'];
        
        $masuk_qty = 0;
        $keluar_qty = 0;
        $awal = $stok_sekarang;
        $akhir = $stok_sekarang;
        
        if (!empty($monthFilter)) {
            // Validasi format YYYY-MM
            if (preg_match('/^\d{4}-\d{2}$/', $monthFilter)) {
                $start_date = $monthFilter . '-01';
                $end_date = date('Y-m-t', strtotime($start_date)); // t = last day of the month
                
                // A. Hitung total masuk selama bulan terpilih
                $stmt_masuk_curr = $conn->prepare("SELECT SUM(dm.jumlah) AS qty 
                                                   FROM detailmasuk dm 
                                                   JOIN transaksimasuk tm ON dm.id_masuk = tm.id_masuk 
                                                   WHERE dm.id_barang = ? AND tm.tgl_masuk BETWEEN ? AND ?");
                $stmt_masuk_curr->bind_param("iss", $id_barang, $start_date, $end_date);
                $stmt_masuk_curr->execute();
                $res_masuk_curr = $stmt_masuk_curr->get_result()->fetch_assoc();
                $masuk_qty = (int)($res_masuk_curr['qty'] ?? 0);
                $stmt_masuk_curr->close();
                
                // B. Hitung total keluar selama bulan terpilih
                $stmt_keluar_curr = $conn->prepare("SELECT SUM(dk.jumlah) AS qty 
                                                    FROM detailkeluar dk 
                                                    JOIN transaksikeluar tk ON dk.id_keluar = tk.id_keluar 
                                                    WHERE dk.id_barang = ? AND tk.tgl_keluar BETWEEN ? AND ?");
                $stmt_keluar_curr->bind_param("iss", $id_barang, $start_date, $end_date);
                $stmt_keluar_curr->execute();
                $res_keluar_curr = $stmt_keluar_curr->get_result()->fetch_assoc();
                $keluar_qty = (int)($res_keluar_curr['qty'] ?? 0);
                $stmt_keluar_curr->close();

                // B.2 Hitung total penyesuaian opname selama bulan terpilih
                $stmt_opname_curr = $conn->prepare("SELECT SUM(do.selisih) AS qty 
                                                    FROM detailopname do 
                                                    JOIN opname o ON do.id_opname = o.id_opname 
                                                    WHERE do.id_barang = ? AND o.tgl_opname BETWEEN ? AND ?");
                $stmt_opname_curr->bind_param("iss", $id_barang, $start_date, $end_date);
                $stmt_opname_curr->execute();
                $res_opname_curr = $stmt_opname_curr->get_result()->fetch_assoc();
                $opname_qty = (int)($res_opname_curr['qty'] ?? 0);
                $stmt_opname_curr->close();

                // B.3 Hitung total penyesuaian mutasi selama bulan terpilih
                $stmt_mutasi_curr = $conn->prepare("SELECT SUM(CASE 
                                                        WHEN (gudang_asal LIKE '%cabang%' AND gudang_tujuan NOT LIKE '%cabang%') THEN jumlah
                                                        WHEN (gudang_asal NOT LIKE '%cabang%' AND gudang_tujuan LIKE '%cabang%') THEN -jumlah
                                                        ELSE 0 
                                                    END) AS net_qty 
                                                    FROM mutasi 
                                                    WHERE id_barang = ? AND tgl_mutasi BETWEEN ? AND ?");
                $stmt_mutasi_curr->bind_param("iss", $id_barang, $start_date, $end_date);
                $stmt_mutasi_curr->execute();
                $res_mutasi_curr = $stmt_mutasi_curr->get_result()->fetch_assoc();
                $mutasi_qty = (int)($res_mutasi_curr['net_qty'] ?? 0);
                $stmt_mutasi_curr->close();
                
                // C. Hitung total masuk SETELAH bulan terpilih (untuk menghitung stok akhir di akhir bulan terpilih)
                $stmt_masuk_after = $conn->prepare("SELECT SUM(dm.jumlah) AS qty 
                                                    FROM detailmasuk dm 
                                                    JOIN transaksimasuk tm ON dm.id_masuk = tm.id_masuk 
                                                    WHERE dm.id_barang = ? AND tm.tgl_masuk > ?");
                $stmt_masuk_after->bind_param("is", $id_barang, $end_date);
                $stmt_masuk_after->execute();
                $res_masuk_after = $stmt_masuk_after->get_result()->fetch_assoc();
                $masuk_after = (int)($res_masuk_after['qty'] ?? 0);
                $stmt_masuk_after->close();
                
                // D. Hitung total keluar SETELAH bulan terpilih
                $stmt_keluar_after = $conn->prepare("SELECT SUM(dk.jumlah) AS qty 
                                                     FROM detailkeluar dk 
                                                     JOIN transaksikeluar tk ON dk.id_keluar = tk.id_keluar 
                                                     WHERE dk.id_barang = ? AND tk.tgl_keluar > ?");
                $stmt_keluar_after->bind_param("is", $id_barang, $end_date);
                $stmt_keluar_after->execute();
                $res_keluar_after = $stmt_keluar_after->get_result()->fetch_assoc();
                $keluar_after = (int)($res_keluar_after['qty'] ?? 0);
                $stmt_keluar_after->close();

                // D.2 Hitung total penyesuaian opname SETELAH bulan terpilih
                $stmt_opname_after = $conn->prepare("SELECT SUM(do.selisih) AS qty 
                                                     FROM detailopname do 
                                                     JOIN opname o ON do.id_opname = o.id_opname 
                                                     WHERE do.id_barang = ? AND o.tgl_opname > ?");
                $stmt_opname_after->bind_param("is", $id_barang, $end_date);
                $stmt_opname_after->execute();
                $res_opname_after = $stmt_opname_after->get_result()->fetch_assoc();
                $opname_after = (int)($res_opname_after['qty'] ?? 0);
                $stmt_opname_after->close();

                // D.3 Hitung total penyesuaian mutasi SETELAH bulan terpilih
                $stmt_mutasi_after = $conn->prepare("SELECT SUM(CASE 
                                                         WHEN (gudang_asal LIKE '%cabang%' AND gudang_tujuan NOT LIKE '%cabang%') THEN jumlah
                                                         WHEN (gudang_asal NOT LIKE '%cabang%' AND gudang_tujuan LIKE '%cabang%') THEN -jumlah
                                                         ELSE 0 
                                                     END) AS net_qty 
                                                     FROM mutasi 
                                                     WHERE id_barang = ? AND tgl_mutasi > ?");
                $stmt_mutasi_after->bind_param("is", $id_barang, $end_date);
                $stmt_mutasi_after->execute();
                $res_mutasi_after = $stmt_mutasi_after->get_result()->fetch_assoc();
                $mutasi_after = (int)($res_mutasi_after['net_qty'] ?? 0);
                $stmt_mutasi_after->close();
                
                // E. Kalkulasi akhir & awal
                $akhir = $stok_sekarang - $masuk_after + $keluar_after - $opname_after - $mutasi_after;
                $awal = $akhir - $masuk_qty + $keluar_qty - $opname_qty - $mutasi_qty;
            }
        } else {
            // Jika filter bulan kosong, tampilkan mutasi akumulatif sepanjang masa
            // A. Hitung total masuk sepanjang masa
            $stmt_masuk_all = $conn->prepare("SELECT SUM(jumlah) AS qty FROM detailmasuk WHERE id_barang = ?");
            $stmt_masuk_all->bind_param("i", $id_barang);
            $stmt_masuk_all->execute();
            $masuk_qty = (int)($stmt_masuk_all->get_result()->fetch_assoc()['qty'] ?? 0);
            $stmt_masuk_all->close();
            
            // B. Hitung total keluar sepanjang masa
            $stmt_keluar_all = $conn->prepare("SELECT SUM(jumlah) AS qty FROM detailkeluar WHERE id_barang = ?");
            $stmt_keluar_all->bind_param("i", $id_barang);
            $stmt_keluar_all->execute();
            $keluar_qty = (int)($stmt_keluar_all->get_result()->fetch_assoc()['qty'] ?? 0);
            $stmt_keluar_all->close();

            // B.2 Hitung total penyesuaian opname sepanjang masa
            $stmt_opname_all = $conn->prepare("SELECT SUM(do.selisih) AS qty FROM detailopname do WHERE do.id_barang = ?");
            $stmt_opname_all->bind_param("i", $id_barang);
            $stmt_opname_all->execute();
            $opname_qty = (int)($stmt_opname_all->get_result()->fetch_assoc()['qty'] ?? 0);
            $stmt_opname_all->close();

            // B.3 Hitung total penyesuaian mutasi sepanjang masa
            $stmt_mutasi_all = $conn->prepare("SELECT SUM(CASE 
                                                    WHEN (gudang_asal LIKE '%cabang%' AND gudang_tujuan NOT LIKE '%cabang%') THEN jumlah
                                                    WHEN (gudang_asal NOT LIKE '%cabang%' AND gudang_tujuan LIKE '%cabang%') THEN -jumlah
                                                    ELSE 0 
                                                END) AS net_qty 
                                                FROM mutasi 
                                                WHERE id_barang = ?");
            $stmt_mutasi_all->bind_param("i", $id_barang);
            $stmt_mutasi_all->execute();
            $res_mutasi_all = $stmt_mutasi_all->get_result()->fetch_assoc();
            $mutasi_qty = (int)($res_mutasi_all['net_qty'] ?? 0);
            $stmt_mutasi_all->close();
            
            // C. Kalkulasi
            $akhir = $stok_sekarang;
            $awal = $akhir - $masuk_qty + $keluar_qty - $opname_qty - $mutasi_qty;
        }
        
        $report_data[] = [
            'id_barang' => $id_barang,
            'kode_barang' => $row['kode_barang'],
            'nama_barang' => $row['nama_barang'],
            'kategori' => $row['kategori'],
            'harga_beli' => (float)$row['harga_beli'],
            'awal' => $awal,
            'masuk' => $masuk_qty,
            'keluar' => $keluar_qty,
            'akhir' => $akhir
        ];
    }
    
    echo json_encode([
        'status' => 'success',
        'data' => $report_data
    ]);

} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Gagal memuat laporan stok: ' . $e->getMessage()
    ]);
}

$conn->close();
?>
