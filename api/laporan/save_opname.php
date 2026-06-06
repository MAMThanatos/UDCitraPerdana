<?php
session_start();
require_once('../../config/db.php');

header('Content-Type: application/json');

// Check authentication
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized. Silakan login terlebih dahulu.']);
    exit;
}

$id_user = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

// Parse _method if it's sent via POST Form Data
if ($method === 'POST' && isset($_POST['_method'])) {
    $sub_method = strtoupper($_POST['_method']);
    if (in_array($sub_method, ['PUT', 'DELETE'])) {
        $method = $sub_method;
    }
}

// --- HANDLE DELETE: ROLLBACK STOCK AND REMOVE OPNAME ---
if ($method === 'DELETE') {
    // Parse input (body can be URL encoded)
    $input_id = $_POST['id_opname'] ?? $_GET['id_opname'] ?? 0;
    
    // Fallback if raw JSON/urlencoded in DELETE request
    if ($input_id == 0) {
        parse_str(file_get_contents('php://input'), $delete_params);
        $input_id = $delete_params['id_opname'] ?? 0;
    }
    
    $id_opname = (int)$input_id;
    
    if ($id_opname <= 0) {
        echo json_encode(['status' => 'error', 'message' => 'ID Opname tidak valid.']);
        exit;
    }
    
    $conn->begin_transaction();
    try {
        // 1. Ambil detail opname lama untuk mengembalikan stok ke stok_sistem
        $stmt_get = $conn->prepare("SELECT id_barang, stok_sistem FROM detailopname WHERE id_opname = ?");
        $stmt_get->bind_param("i", $id_opname);
        $stmt_get->execute();
        $res = $stmt_get->get_result();
        
        $stmt_restore = $conn->prepare("UPDATE barang SET stok = ? WHERE id_barang = ?");
        
        while ($row = $res->fetch_assoc()) {
            $id_barang = (int)$row['id_barang'];
            $stok_sistem = (int)$row['stok_sistem'];
            
            $stmt_restore->bind_param("ii", $stok_sistem, $id_barang);
            if (!$stmt_restore->execute()) {
                throw new Exception("Gagal mengembalikan stok untuk ID Barang $id_barang");
            }
        }
        $stmt_restore->close();
        $stmt_get->close();
        
        // 2. Hapus header opname (cascade deletes detailopname)
        $stmt_del = $conn->prepare("DELETE FROM opname WHERE id_opname = ?");
        $stmt_del->bind_param("i", $id_opname);
        if (!$stmt_del->execute()) {
            throw new Exception("Gagal menghapus header opname");
        }
        $stmt_del->close();
        
        $conn->commit();
        echo json_encode([
            'status' => 'success',
            'message' => 'Sesi Stock Opname berhasil dihapus dan stok barang dikembalikan ke kondisi semula!'
        ]);
        
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode([
            'status' => 'error',
            'message' => 'Gagal menghapus sesi opname: ' . $e->getMessage()
        ]);
    }
    
    $conn->close();
    exit;
}

// --- HANDLE POST / PUT: SAVE OR UPDATE OPNAME ---
if ($method === 'POST' || $method === 'PUT') {
    $id_opname = isset($_POST['id_opname']) ? (int)$_POST['id_opname'] : 0;
    $tgl_opname = $_POST['tgl_opname'] ?? date('Y-m-d');
    $keterangan = trim($_POST['keterangan'] ?? '');
    $items_raw = $_POST['items'] ?? '[]';
    
    $items = json_decode($items_raw, true);
    
    if (!is_array($items) || empty($items)) {
        echo json_encode(['status' => 'error', 'message' => 'Data detail barang tidak boleh kosong.']);
        exit;
    }
    
    $conn->begin_transaction();
    try {
        if ($id_opname > 0) {
            // --- EDIT MODE (UPDATE) ---
            // 1. Update Header
            $stmt_hdr = $conn->prepare("UPDATE opname SET tgl_opname = ?, keterangan = ? WHERE id_opname = ?");
            $stmt_hdr->bind_param("ssi", $tgl_opname, $keterangan, $id_opname);
            if (!$stmt_hdr->execute()) {
                throw new Exception("Gagal memperbarui header opname");
            }
            $stmt_hdr->close();
            
            // 2. Ambil detail opname lama untuk mengembalikan stok ke kondisi semula (rollback)
            $stmt_old = $conn->prepare("SELECT id_barang, stok_sistem FROM detailopname WHERE id_opname = ?");
            $stmt_old->bind_param("i", $id_opname);
            $stmt_old->execute();
            $res_old = $stmt_old->get_result();
            
            $stmt_restore = $conn->prepare("UPDATE barang SET stok = ? WHERE id_barang = ?");
            while ($row_old = $res_old->fetch_assoc()) {
                $id_barang_old = (int)$row_old['id_barang'];
                $stok_sistem_old = (int)$row_old['stok_sistem'];
                $stmt_restore->bind_param("ii", $stok_sistem_old, $id_barang_old);
                $stmt_restore->execute();
            }
            $stmt_restore->close();
            $stmt_old->close();

            // 3. Hapus detail lama agar bersih
            $stmt_del_details = $conn->prepare("DELETE FROM detailopname WHERE id_opname = ?");
            $stmt_del_details->bind_param("i", $id_opname);
            $stmt_del_details->execute();
            $stmt_del_details->close();

            // 4. Simpan rincian detail yang baru dipilih dan sinkronkan stok barang terbaru
            $stmt_detail = $conn->prepare("INSERT INTO detailopname (id_opname, id_barang, stok_sistem, stok_fisik, selisih, keterangan) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt_update_stok = $conn->prepare("UPDATE barang SET stok = ? WHERE id_barang = ?");
            
            foreach ($items as $item) {
                $id_barang = (int)$item['id_barang'];
                $stok_sistem = (int)$item['stok_sistem'];
                $stok_fisik = (int)$item['stok_fisik'];
                $selisih = $stok_fisik - $stok_sistem;
                $det_ket = trim($item['keterangan'] ?? '');
                
                // Simpan detail baru
                $stmt_detail->bind_param("iiiiis", $id_opname, $id_barang, $stok_sistem, $stok_fisik, $selisih, $det_ket);
                if (!$stmt_detail->execute()) {
                    throw new Exception("Gagal menyimpan detail opname untuk ID Barang $id_barang");
                }
                
                // Sinkronkan stok saat ini di tabel barang
                $stmt_update_stok->bind_param("ii", $stok_fisik, $id_barang);
                if (!$stmt_update_stok->execute()) {
                    throw new Exception("Gagal menyinkronkan stok untuk ID Barang $id_barang");
                }
            }
            $stmt_detail->close();
            $stmt_update_stok->close();
            
            $msg = 'Stock Opname berhasil diperbarui dan stok barang disinkronkan!';
        } else {
            // --- INSERT MODE ---
            // 1. Simpan Header
            $stmt_header = $conn->prepare("INSERT INTO opname (id_user, tgl_opname, keterangan) VALUES (?, ?, ?)");
            $stmt_header->bind_param("iss", $id_user, $tgl_opname, $keterangan);
            if (!$stmt_header->execute()) {
                throw new Exception("Gagal menyimpan header opname: " . $stmt_header->error);
            }
            $id_opname = $conn->insert_id;
            $stmt_header->close();
            
            // 2. Simpan Detail dan Lakukan Penyesuaian Stok
            $stmt_detail = $conn->prepare("INSERT INTO detailopname (id_opname, id_barang, stok_sistem, stok_fisik, selisih, keterangan) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt_update_stok = $conn->prepare("UPDATE barang SET stok = ? WHERE id_barang = ?");
            
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
            
            $msg = 'Stock Opname berhasil disimpan dan stok barang disinkronkan!';
        }
        
        $conn->commit();
        echo json_encode([
            'status' => 'success',
            'message' => $msg
        ]);
        
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode([
            'status' => 'error',
            'message' => 'Gagal menyimpan Stock Opname: ' . $e->getMessage()
        ]);
    }
    
    $conn->close();
    exit;
}
?>
