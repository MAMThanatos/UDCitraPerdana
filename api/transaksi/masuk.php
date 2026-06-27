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
    if (isset($_GET['action']) && $_GET['action'] === 'suppliers') {
        try {
            $result = $conn->query("SELECT DISTINCT nama_supplier FROM supplier ORDER BY nama_supplier ASC");
            $suppliers = [];
            while ($row = $result->fetch_assoc()) {
                $suppliers[] = $row['nama_supplier'];
            }
            echo json_encode([
                'status' => 'success',
                'data' => $suppliers
            ]);
        } catch (Exception $e) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Gagal memuat supplier: ' . $e->getMessage()
            ]);
        }
        $conn->close();
        exit;
    }

    try {
        $sql = "SELECT tm.id_masuk, tm.tgl_masuk, tm.no_ref, tm.no_po, tm.keterangan,
                       s.nama_supplier, b.nama_barang, b.kode_barang, dm.jumlah, dm.kondisi_qc
                FROM transaksimasuk tm
                JOIN supplier s ON tm.id_supplier = s.id_supplier
                JOIN detailmasuk dm ON tm.id_masuk = dm.id_masuk
                JOIN barang b ON dm.id_barang = b.id_barang
                ORDER BY tm.tgl_masuk DESC, tm.id_masuk DESC";
                
        $result = $conn->query($sql);
        $transactions = [];
        
        while ($row = $result->fetch_assoc()) {
            $transactions[] = [
                'id_masuk' => (int)$row['id_masuk'],
                'tanggal' => $row['tgl_masuk'],
                'ref' => $row['no_ref'],
                'po' => $row['no_po'],
                'supplier' => $row['nama_supplier'],
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
    $po = trim($_POST['po'] ?? '');
    $supplier_name = trim($_POST['supplier'] ?? '');
    $barang_name = trim($_POST['barang'] ?? ''); // nama barang dari dropdown FE
    $qty = (int)($_POST['qty'] ?? 0);
    $qc = 'Baik (Lolos QC)';
    $keterangan = trim($_POST['keterangan'] ?? '');

    // Validasi input
    if (empty($tanggal) || empty($ref) || empty($po) || empty($supplier_name) || empty($barang_name) || $qty <= 0) {
        echo json_encode(['status' => 'error', 'message' => 'Semua kolom wajib diisi dengan benar.']);
        exit;
    }

    // Mulai Transaksi SQL untuk atomisitas (All or Nothing)
    $conn->begin_transaction();

    try {
        // 1. Cari atau buat Supplier secara dinamis
        $stmt_s = $conn->prepare("SELECT id_supplier FROM supplier WHERE nama_supplier = ?");
        $stmt_s->bind_param("s", $supplier_name);
        $stmt_s->execute();
        $res_s = $stmt_s->get_result();
        
        if ($res_s->num_rows === 1) {
            $row_s = $res_s->fetch_assoc();
            $id_supplier = $row_s['id_supplier'];
        } else {
            // Buat supplier baru dengan info default
            $stmt_ins_s = $conn->prepare("INSERT INTO supplier (nama_supplier, alamat) VALUES (?, 'Alamat default')");
            $stmt_ins_s->bind_param("s", $supplier_name);
            $stmt_ins_s->execute();
            $id_supplier = $conn->insert_id;
            $stmt_ins_s->close();
        }
        $stmt_s->close();

        // 2. Cari Barang berdasarkan nama
        $stmt_b = $conn->prepare("SELECT id_barang, stok FROM barang WHERE nama_barang = ?");
        $stmt_b->bind_param("s", $barang_name);
        $stmt_b->execute();
        $res_b = $stmt_b->get_result();
        
        if ($res_b->num_rows !== 1) {
            // Jika tidak ditemukan dengan nama, coba cari berdasarkan kode barang
            $stmt_b->close();
            $stmt_b = $conn->prepare("SELECT id_barang, stok FROM barang WHERE kode_barang = ?");
            $stmt_b->bind_param("s", $barang_name);
            $stmt_b->execute();
            $res_b = $stmt_b->get_result();
            
            if ($res_b->num_rows !== 1) {
                throw new Exception("Barang '$barang_name' tidak ditemukan dalam sistem.");
            }
        }
        
        $row_b = $res_b->fetch_assoc();
        $id_barang = $row_b['id_barang'];
        $stmt_b->close();

        // 3. Masukkan data ke tabel `transaksimasuk`
        $stmt_tm = $conn->prepare("INSERT INTO transaksimasuk (id_supplier, id_user, tgl_masuk, no_po, no_ref, keterangan) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt_tm->bind_param("iissss", $id_supplier, $user_id, $tanggal, $po, $ref, $keterangan);
        $stmt_tm->execute();
        $masuk_id = $conn->insert_id;
        $stmt_tm->close();

        // 4. Masukkan data ke tabel `detailmasuk`
        $stmt_dm = $conn->prepare("INSERT INTO detailmasuk (id_masuk, id_barang, jumlah, kondisi_qc) VALUES (?, ?, ?, ?)");
        $stmt_dm->bind_param("iiis", $masuk_id, $id_barang, $qty, $qc);
        $stmt_dm->execute();
        $stmt_dm->close();

        // 5. Update stok barang (+ jumlah)
        $stmt_upd = $conn->prepare("UPDATE barang SET stok = stok + ? WHERE id_barang = ?");
        $stmt_upd->bind_param("ii", $qty, $id_barang);
        $stmt_upd->execute();
        $stmt_upd->close();

        // Semua proses sukses -> Commit
        $conn->commit();
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Transaksi Barang Masuk berhasil disimpan!'
        ]);

    } catch (Exception $e) {
        // Terjadi kesalahan -> Batalkan semua perubahan
        $conn->rollback();
        echo json_encode([
            'status' => 'error',
            'message' => 'Gagal menyimpan transaksi: ' . $e->getMessage()
        ]);
    }
    
    $conn->close();
    exit;
}

// --- HANDLE DELETE METHOD: STOCK ROLLBACK AND DELETE ---
if ($_SERVER['REQUEST_METHOD'] === 'DELETE' || (isset($_POST['_method']) && $_POST['_method'] === 'DELETE')) {
    $id_masuk = (int)($_POST['id_masuk'] ?? $_GET['id_masuk'] ?? 0);
    
    if ($id_masuk <= 0) {
        echo json_encode(['status' => 'error', 'message' => 'ID transaksi masuk tidak valid.']);
        exit;
    }
    
    $conn->begin_transaction();
    try {
        // Cari detail transaksi masuk untuk mengembalikan stok
        $stmt_det = $conn->prepare("SELECT id_barang, jumlah FROM detailmasuk WHERE id_masuk = ?");
        $stmt_det->bind_param("i", $id_masuk);
        $stmt_det->execute();
        $res_det = $stmt_det->get_result();
        
        while ($row = $res_det->fetch_assoc()) {
            $id_barang = $row['id_barang'];
            $qty = $row['jumlah'];
            
            // Kurangi stok barang terkait karena transaksi dibatalkan
            $stmt_upd = $conn->prepare("UPDATE barang SET stok = GREATEST(0, stok - ?) WHERE id_barang = ?");
            $stmt_upd->bind_param("ii", $qty, $id_barang);
            $stmt_upd->execute();
            $stmt_upd->close();
        }
        $stmt_det->close();
        
        // Hapus transaksi (akan memicu ON DELETE CASCADE pada detailmasuk)
        $stmt_del = $conn->prepare("DELETE FROM transaksimasuk WHERE id_masuk = ?");
        $stmt_del->bind_param("i", $id_masuk);
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
