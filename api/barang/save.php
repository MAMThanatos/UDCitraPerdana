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

// Ambil data POST
$id_barang = $_POST['id_barang'] ?? null;
$kode_barang = trim($_POST['kode_barang'] ?? '');
$nama_barang = trim($_POST['nama_barang'] ?? '');
$kategori_nama = trim($_POST['kategori'] ?? '');
$stok = (int)($_POST['stok'] ?? 0);
$satuan = trim($_POST['satuan'] ?? 'Pcs');
$harga = (float)($_POST['harga'] ?? 0);
$harga_beli = (float)($_POST['harga_beli'] ?? 0);
$deskripsi = trim($_POST['deskripsi'] ?? '');
$berat = trim($_POST['berat'] ?? '');
$dimensi = trim($_POST['dimensi'] ?? '');
$lokasi_rak = trim($_POST['lokasi_rak'] ?? '');
$stok_minimum = (int)($_POST['stok_minimum'] ?? ($stok <= 100 ? 30 : 50));

// Validasi Input Wajib
if (empty($kode_barang) || empty($nama_barang) || empty($kategori_nama) || $harga < 0 || $harga_beli < 0) {
    echo json_encode(['status' => 'error', 'message' => 'Semua field wajib diisi dengan benar.']);
    exit;
}

try {
    // 1. Dapatkan atau buat Kategori ID berdasarkan namanya
    $stmt = $conn->prepare("SELECT id_kategori FROM kategori WHERE nama_kategori = ?");
    $stmt->bind_param("s", $kategori_nama);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 1) {
        $kat = $result->fetch_assoc();
        $id_kategori = $kat['id_kategori'];
    } else {
        // Buat kategori baru jika tidak ada
        $stmt_ins = $conn->prepare("INSERT INTO kategori (nama_kategori) VALUES (?)");
        $stmt_ins->bind_param("s", $kategori_nama);
        $stmt_ins->execute();
        $id_kategori = $conn->insert_id;
        $stmt_ins->close();
    }
    $stmt->close();

    // 2. Tentukan apakah ini Tambah Baru atau Edit Data
    // Cari apakah barang dengan kode ini sudah terdaftar
    $stmt_check = $conn->prepare("SELECT id_barang, stok FROM barang WHERE kode_barang = ?");
    $stmt_check->bind_param("s", $kode_barang);
    $stmt_check->execute();
    $check_result = $stmt_check->get_result();
    
    if ($check_result->num_rows > 0) {
        // Kode barang sudah terdaftar
        $existing = $check_result->fetch_assoc();
        $stmt_check->close();
        
        if ($id_barang && (int)$id_barang === (int)$existing['id_barang']) {
            // Ini adalah proses EDIT barang yang sah (id cocok dengan kode barang)
            $stmt_upd = $conn->prepare("UPDATE barang SET 
                id_kategori = ?, 
                nama_barang = ?, 
                satuan = ?, 
                harga = ?, 
                harga_beli = ?, 
                deskripsi = ?, 
                berat = ?, 
                dimensi = ?, 
                lokasi_rak = ?, 
                stok_minimum = ?
                WHERE id_barang = ?");
                
            $stmt_upd->bind_param("issddssssii", 
                $id_kategori, 
                $nama_barang, 
                $satuan, 
                $harga, 
                $harga_beli, 
                $deskripsi, 
                $berat, 
                $dimensi, 
                $lokasi_rak, 
                $stok_minimum, 
                $id_barang
            );
            
            if ($stmt_upd->execute()) {
                echo json_encode(['status' => 'success', 'message' => 'Data barang berhasil diperbarui!']);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Gagal memperbarui data barang: ' . $conn->error]);
            }
            $stmt_upd->close();
        } else {
            // Ini adalah proses TAMBAH BARU dengan kode yang duplikat
            echo json_encode(['status' => 'error', 'message' => 'Kode barang sudah terdaftar! Gunakan kode lain.']);
        }
    } else {
        // Kode barang tidak terdaftar, berarti TAMBAH BARU
        $stmt_check->close();
        
        $stmt_ins = $conn->prepare("INSERT INTO barang (id_kategori, kode_barang, nama_barang, stok, satuan, harga, harga_beli, deskripsi, berat, dimensi, lokasi_rak, stok_minimum) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt_ins->bind_param("issisddssssi", 
            $id_kategori, 
            $kode_barang, 
            $nama_barang, 
            $stok, 
            $satuan, 
            $harga, 
            $harga_beli, 
            $deskripsi, 
            $berat, 
            $dimensi, 
            $lokasi_rak, 
            $stok_minimum
        );
        
        if ($stmt_ins->execute()) {
            echo json_encode(['status' => 'success', 'message' => 'Data barang berhasil ditambahkan!']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Gagal menambahkan data barang: ' . $conn->error]);
        }
        $stmt_ins->close();
    }
    
} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => 'Terjadi kesalahan sistem: ' . $e->getMessage()]);
}

$conn->close();
?>
