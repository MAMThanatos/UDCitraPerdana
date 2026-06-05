<?php
session_start();
require_once('../../config/db.php');

header('Content-Type: application/json');

// Check authentication
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized. Silakan login terlebih dahulu.']);
    exit;
}

$user_id = $_SESSION['user_id'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Get POST inputs
    $tanggal = $_POST['tanggal'] ?? '';
    $no_mutasi = trim($_POST['no_mutasi'] ?? '');
    $barang_input = trim($_POST['barang'] ?? '');
    $gudang_asal = trim($_POST['gudang_asal'] ?? '');
    $gudang_tujuan = trim($_POST['gudang_tujuan'] ?? '');
    $jumlah = (int)($_POST['jumlah'] ?? 0);
    $biaya_kirim = (double)($_POST['biaya_kirim'] ?? 0);
    $keterangan = trim($_POST['keterangan'] ?? '');

    // Validation
    if (empty($tanggal) || empty($barang_input) || empty($gudang_asal) || empty($gudang_tujuan) || $jumlah <= 0) {
        echo json_encode(['status' => 'error', 'message' => 'Semua kolom wajib diisi dengan benar.']);
        exit;
    }

    if ($gudang_asal === $gudang_tujuan) {
        echo json_encode(['status' => 'error', 'message' => 'Gudang asal dan tujuan tidak boleh sama.']);
        exit;
    }

    // Auto-generate no_mutasi if empty
    if (empty($no_mutasi)) {
        $date_prefix = date('Ymd', strtotime($tanggal));
        $rand = strtoupper(substr(md5(uniqid(rand(), true)), 0, 4));
        $no_mutasi = "MUT-" . $date_prefix . "-" . $rand;
    }

    // Begin SQL Transaction
    $conn->begin_transaction();

    try {
        // Find barang
        $id_barang = 0;
        $stok_aktif = 0;
        $satuan = '';

        if (is_numeric($barang_input)) {
            $stmt_b = $conn->prepare("SELECT id_barang, stok, satuan FROM barang WHERE id_barang = ?");
            $stmt_b->bind_param("i", $barang_input);
        } else {
            $stmt_b = $conn->prepare("SELECT id_barang, stok, satuan FROM barang WHERE nama_barang = ? OR kode_barang = ?");
            $stmt_b->bind_param("ss", $barang_input, $barang_input);
        }
        
        $stmt_b->execute();
        $res_b = $stmt_b->get_result();
        
        if ($res_b->num_rows === 1) {
            $row_b = $res_b->fetch_assoc();
            $id_barang = $row_b['id_barang'];
            $stok_aktif = (int)$row_b['stok'];
            $satuan = $row_b['satuan'];
        } else {
            throw new Exception("Barang tidak ditemukan dalam sistem.");
        }
        $stmt_b->close();

        // Stock modification logic based on warehouses
        // External warehouse string match: contains 'cabang' or 'external' or matches specifically 'Gudang Cabang (Eksternal)'
        $is_asal_cabang = (strpos(strtolower($gudang_asal), 'cabang') !== false);
        $is_tujuan_cabang = (strpos(strtolower($gudang_tujuan), 'cabang') !== false);

        if ($is_asal_cabang && !$is_tujuan_cabang) {
            // Cabang -> Pusat: increase local stock
            $stmt_upd = $conn->prepare("UPDATE barang SET stok = stok + ? WHERE id_barang = ?");
            $stmt_upd->bind_param("ii", $jumlah, $id_barang);
            $stmt_upd->execute();
            $stmt_upd->close();
        } else if (!$is_asal_cabang && $is_tujuan_cabang) {
            // Pusat -> Cabang: decrease local stock (check if enough)
            if ($stok_aktif < $jumlah) {
                throw new Exception("Stok tidak mencukupi untuk mutasi ke cabang! Stok saat ini: $stok_aktif $satuan, diminta: $jumlah $satuan.");
            }
            $stmt_upd = $conn->prepare("UPDATE barang SET stok = stok - ? WHERE id_barang = ?");
            $stmt_upd->bind_param("ii", $jumlah, $id_barang);
            $stmt_upd->execute();
            $stmt_upd->close();
        }
        // If internal to internal (e.g. Pusat <-> Depo/Depan), we do not update local stock since both are internal.

        // Check if no_mutasi is unique in database
        $stmt_check = $conn->prepare("SELECT id_mutasi FROM mutasi WHERE no_mutasi = ?");
        $stmt_check->bind_param("s", $no_mutasi);
        $stmt_check->execute();
        $res_check = $stmt_check->get_result();
        if ($res_check->num_rows > 0) {
            // Regenerate
            $date_prefix = date('Ymd', strtotime($tanggal));
            $rand = strtoupper(substr(md5(uniqid(rand(), true)), 0, 4));
            $no_mutasi = "MUT-" . $date_prefix . "-" . $rand;
        }
        $stmt_check->close();

        // Insert into mutasi table
        $stmt_ins = $conn->prepare("INSERT INTO mutasi (id_barang, id_user, tgl_mutasi, no_mutasi, gudang_asal, gudang_tujuan, jumlah, biaya_kirim, keterangan) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt_ins->bind_param("iissssdid", $id_barang, $user_id, $tanggal, $no_mutasi, $gudang_asal, $gudang_tujuan, $jumlah, $biaya_kirim, $keterangan);
        $stmt_ins->execute();
        $stmt_ins->close();

        // Commit transaction
        $conn->commit();

        echo json_encode([
            'status' => 'success',
            'message' => 'Transaksi Mutasi Gudang berhasil disimpan!',
            'no_mutasi' => $no_mutasi
        ]);

    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode([
            'status' => 'error',
            'message' => $e->getMessage()
        ]);
    }
    
    $conn->close();
    exit;
}
?>
