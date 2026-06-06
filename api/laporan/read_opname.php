<?php
session_start();
require_once('../../config/db.php');

header('Content-Type: application/json');

// Check authentication
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized. Silakan login terlebih dahulu.']);
    exit;
}

$action = $_GET['action'] ?? 'list';

try {
    if ($action === 'detail') {
        $id_opname = isset($_GET['id_opname']) ? (int)$_GET['id_opname'] : 0;
        if ($id_opname <= 0) {
            echo json_encode(['status' => 'error', 'message' => 'ID Opname tidak valid.']);
            exit;
        }

        // Ambil detail barang untuk opname terpilih
        $stmt = $conn->prepare("SELECT do.id_detail_opname, do.id_barang, do.stok_sistem, do.stok_fisik, do.selisih, do.keterangan AS ket_selisih,
                                      b.kode_barang, b.nama_barang, b.satuan, k.nama_kategori AS kategori, b.lokasi_rak
                               FROM detailopname do
                               JOIN barang b ON do.id_barang = b.id_barang
                               JOIN kategori k ON b.id_kategori = k.id_kategori
                               WHERE do.id_opname = ?
                               ORDER BY b.kode_barang ASC");
        $stmt->bind_param("i", $id_opname);
        $stmt->execute();
        $res = $stmt->get_result();
        
        $details = [];
        while ($row = $res->fetch_assoc()) {
            $details[] = $row;
        }
        $stmt->close();
        
        echo json_encode([
            'status' => 'success',
            'data' => $details
        ]);
    } else {
        // Ambil daftar riwayat opname
        $sql = "SELECT o.id_opname, o.tgl_opname, o.keterangan, u.nama_lengkap AS nama_user,
                       (SELECT COUNT(*) FROM detailopname WHERE id_opname = o.id_opname) AS total_item,
                       (SELECT SUM(ABS(selisih)) FROM detailopname WHERE id_opname = o.id_opname) AS total_selisih_qty
                FROM opname o
                JOIN user u ON o.id_user = u.id_user
                ORDER BY o.tgl_opname DESC, o.id_opname DESC";

        $res = $conn->query($sql);
        $list = [];

        // Buffer semua baris utama dulu sebelum menjalankan sub-query
        // (menghindari konflik hasil MySQLi pada koneksi yang sama)
        $all_rows = [];
        if ($res) {
            $all_rows = $res->fetch_all(MYSQLI_ASSOC);
            $res->free();
        }

        if (!empty($all_rows)) {
            // Prepare sub-query untuk preview nama barang
            $stmt_prev = $conn->prepare("SELECT b.nama_barang FROM detailopname do
                                         JOIN barang b ON do.id_barang = b.id_barang
                                         WHERE do.id_opname = ?
                                         ORDER BY b.kode_barang ASC
                                         LIMIT 3");

            foreach ($all_rows as $row) {
                $id_op = (int)$row['id_opname'];

                $preview_names = [];
                $stmt_prev->bind_param("i", $id_op);
                $stmt_prev->execute();
                $res_prev = $stmt_prev->get_result();
                while ($pr = $res_prev->fetch_assoc()) {
                    $preview_names[] = $pr['nama_barang'];
                }
                $res_prev->free();   // free mysqli_result, bukan stmt

                $list[] = [
                    'id_opname'        => $id_op,
                    'tgl_opname'       => $row['tgl_opname'],
                    'keterangan'       => $row['keterangan'] ?? '',
                    'nama_user'        => $row['nama_user'],
                    'total_item'       => (int)$row['total_item'],
                    'total_selisih_qty'=> (int)($row['total_selisih_qty'] ?? 0),
                    'barang_preview'   => $preview_names
                ];
            }
            $stmt_prev->close();
        }

        echo json_encode([
            'status' => 'success',
            'data'   => $list
        ]);
    }
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Gagal memproses data opname: ' . $e->getMessage()
    ]);
}

$conn->close();
?>
