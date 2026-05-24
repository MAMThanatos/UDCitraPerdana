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

// --- HANDLE GET METHOD: FETCH TRANSACTIONS ---
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $sql = "SELECT tk.id_keluar, tk.tgl_keluar, tk.no_ref, tk.tujuan_proyek, tk.tujuan_pengeluaran, tk.keterangan,
                       b.nama_barang, b.kode_barang, dk.jumlah
                FROM transaksikeluar tk
                JOIN detailkeluar dk ON tk.id_keluar = dk.id_keluar
                JOIN barang b ON dk.id_barang = b.id_barang
                ORDER BY tk.tgl_keluar DESC, tk.id_keluar DESC";
                
        $result = $conn->query($sql);
        $transactions = [];
        
        while ($row = $result->fetch_assoc()) {
            $transactions[] = [
                'id_keluar' => (int)$row['id_keluar'],
                'tanggal' => $row['tgl_keluar'],
                'ref' => $row['no_ref'],
                'tujuan' => $row['tujuan_proyek'],
                'tujuan_keluar' => $row['tujuan_pengeluaran'],
                'barang' => $row['nama_barang'],
                'kode_barang' => $row['kode_barang'],
                'qty' => (int)$row['jumlah'],
                'keterangan' => $row['keterangan']
            ];
        }
        
        echo json_encode([
            'status' => 'success',
            'data' => $transactions
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Gagal memuat transaksi: ' . $e->getMessage()
        ]);
    }
    $conn->close();
    exit;
}

// --- HANDLE POST METHOD: CREATE TRANSACTION ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && (!isset($_POST['_method']) || $_POST['_method'] !== 'DELETE')) {
    // Ambil data POST
    $tanggal = $_POST['tanggal'] ?? '';
    $ref = trim($_POST['ref'] ?? '');
    $tujuan = trim($_POST['tujuan'] ?? '');
    $barang_name = trim($_POST['barang'] ?? ''); // nama barang dari dropdown FE
    $qty = (int)($_POST['qty'] ?? 0);
    $tujuan_keluar = trim($_POST['tujuan_keluar'] ?? 'Penjualan / Distribusi');
    $keterangan = trim($_POST['keterangan'] ?? '');

    // Validasi input
    if (empty($tanggal) || empty($ref) || empty($tujuan) || empty($barang_name) || $qty <= 0) {
        echo json_encode(['status' => 'error', 'message' => 'Semua kolom wajib diisi dengan benar.']);
        exit;
    }

    // Mulai Transaksi SQL untuk atomisitas (All or Nothing)
    $conn->begin_transaction();

    try {
        // 1. Cari Barang berdasarkan nama
        $stmt_b = $conn->prepare("SELECT id_barang, stok, satuan FROM barang WHERE nama_barang = ?");
        $stmt_b->bind_param("s", $barang_name);
        $stmt_b->execute();
        $res_b = $stmt_b->get_result();
        
        if ($res_b->num_rows !== 1) {
            // Jika tidak ditemukan dengan nama, coba cari berdasarkan kode barang
            $stmt_b->close();
            $stmt_b = $conn->prepare("SELECT id_barang, stok, satuan FROM barang WHERE kode_barang = ?");
            $stmt_b->bind_param("s", $barang_name);
            $stmt_b->execute();
            $res_b = $stmt_b->get_result();
            
            if ($res_b->num_rows !== 1) {
                throw new Exception("Barang '$barang_name' tidak ditemukan dalam sistem.");
            }
        }
        
        $row_b = $res_b->fetch_assoc();
        $id_barang = $row_b['id_barang'];
        $stok_aktif = (int)$row_b['stok'];
        $satuan = $row_b['satuan'];
        $stmt_b->close();

        // 2. DOUBLE-LAYER SECURITY: Cek apakah stok mencukupi di tingkat server
        if ($stok_aktif < $qty) {
            throw new Exception("Stok tidak mencukupi! Stok saat ini: $stok_aktif $satuan, diminta: $qty $satuan.");
        }

        // 3. Masukkan data ke tabel `transaksikeluar`
        $stmt_tk = $conn->prepare("INSERT INTO transaksikeluar (id_user, tgl_keluar, no_ref, tujuan_proyek, tujuan_pengeluaran, keterangan) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt_tk->bind_param("isssss", $user_id, $tanggal, $ref, $tujuan, $tujuan_keluar, $keterangan);
        $stmt_tk->execute();
        $keluar_id = $conn->insert_id;
        $stmt_tk->close();

        // 4. Masukkan data ke tabel `detailkeluar`
        $stmt_dk = $conn->prepare("INSERT INTO detailkeluar (id_keluar, id_barang, jumlah) VALUES (?, ?, ?)");
        $stmt_dk->bind_param("iii", $keluar_id, $id_barang, $qty);
        $stmt_dk->execute();
        $stmt_dk->close();

        // 5. Update stok barang (- jumlah)
        $stmt_upd = $conn->prepare("UPDATE barang SET stok = stok - ? WHERE id_barang = ?");
        $stmt_upd->bind_param("ii", $qty, $id_barang);
        $stmt_upd->execute();
        $stmt_upd->close();

        // Semua proses sukses -> Commit
        $conn->commit();
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Transaksi Barang Keluar berhasil disimpan!'
        ]);

    } catch (Exception $e) {
        // Terjadi kesalahan -> Batalkan semua perubahan
        $conn->rollback();
        echo json_encode([
            'status' => 'error',
            'message' => $e->getMessage()
        ]);
    }
    
    $conn->close();
    exit;
}

// --- HANDLE DELETE METHOD: STOCK ROLLBACK AND DELETE ---
if ($_SERVER['REQUEST_METHOD'] === 'DELETE' || (isset($_POST['_method']) && $_POST['_method'] === 'DELETE')) {
    $id_keluar = (int)($_POST['id_keluar'] ?? $_GET['id_keluar'] ?? 0);
    
    if ($id_keluar <= 0) {
        echo json_encode(['status' => 'error', 'message' => 'ID transaksi keluar tidak valid.']);
        exit;
    }
    
    $conn->begin_transaction();
    try {
        // Cari detail transaksi keluar untuk mengembalikan stok
        $stmt_det = $conn->prepare("SELECT id_barang, jumlah FROM detailkeluar WHERE id_keluar = ?");
        $stmt_det->bind_param("i", $id_keluar);
        $stmt_det->execute();
        $res_det = $stmt_det->get_result();
        
        while ($row = $res_det->fetch_assoc()) {
            $id_barang = $row['id_barang'];
            $qty = $row['jumlah'];
            
            // Tambahkan stok barang terkait kembali karena transaksi dibatalkan
            $stmt_upd = $conn->prepare("UPDATE barang SET stok = stok + ? WHERE id_barang = ?");
            $stmt_upd->bind_param("ii", $qty, $id_barang);
            $stmt_upd->execute();
            $stmt_upd->close();
        }
        $stmt_det->close();
        
        // Hapus transaksi (akan memicu ON DELETE CASCADE pada detailkeluar)
        $stmt_del = $conn->prepare("DELETE FROM transaksikeluar WHERE id_keluar = ?");
        $stmt_del->bind_param("i", $id_keluar);
        $stmt_del->execute();
        $stmt_del->close();
        
        $conn->commit();
        echo json_encode(['status' => 'success', 'message' => 'Transaksi berhasil dihapus dan stok disesuaikan!']);
        
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['status' => 'error', 'message' => 'Gagal menghapus transaksi: ' . $e->getMessage()]);
    }
    $conn->close();
    exit;
}
?>
