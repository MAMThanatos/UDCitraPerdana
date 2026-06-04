<?php
session_start();
require_once('../../config/koneksi.php');

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method']);
    exit;
}

$username = trim($_POST['username'] ?? '');
$password = $_POST['password'] ?? '';

if (empty($username) || empty($password)) {
    echo json_encode(['status' => 'error', 'message' => 'Username dan password harus diisi']);
    exit;
}

try {
    // Cari user berdasarkan username
    $stmt = $conn->prepare("SELECT id_user, username, password, nama_lengkap, role FROM user WHERE username = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();
        
        // Verifikasi password (Bcrypt)
        if (password_verify($password, $user['password'])) {
            // Set session variables
            $_SESSION['user_id'] = $user['id_user'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['nama_lengkap'] = $user['nama_lengkap'];
            $_SESSION['role'] = $user['role'];
            
            // Simpan session ID ke database untuk mencegah concurrent login (Single Session Enforcement)
            $current_session_id = session_id();
            $stmt_sess = $conn->prepare("UPDATE user SET session_id = ? WHERE id_user = ?");
            $stmt_sess->bind_param("si", $current_session_id, $user['id_user']);
            $stmt_sess->execute();
            $stmt_sess->close();
            
            echo json_encode([
                'status' => 'success', 
                'message' => 'Login berhasil! Mengalihkan...',
                'user' => [
                    'id_user' => $user['id_user'],
                    'username' => $user['username'],
                    'nama' => $user['nama_lengkap'],
                    'role' => $user['role']
                ]
            ]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Password salah!']);
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Username tidak ditemukan!']);
    }
    
    $stmt->close();
} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => 'Terjadi kesalahan server: ' . $e->getMessage()]);
}

$conn->close();
?>
