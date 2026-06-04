<?php
session_start();
require_once('../../config/db.php');

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');

if (isset($_SESSION['user_id'])) {
    $user_id = (int)$_SESSION['user_id'];
    $current_session_id = session_id();
    
    // Cek apakah session_id di database masih cocok (untuk mencegah concurrent login)
    $stmt = $conn->prepare("SELECT session_id FROM user WHERE id_user = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $res = $stmt->get_result();
    
    if ($res->num_rows === 1) {
        $row = $res->fetch_assoc();
        if ($row['session_id'] !== null && $row['session_id'] !== $current_session_id) {
            // Sesi sudah di-takeover oleh perangkat lain -> Hancurkan sesi ini
            session_unset();
            session_destroy();
            echo json_encode(['status' => 'error', 'message' => 'Sesi Anda telah berakhir karena akun ini telah login di perangkat lain.']);
            $stmt->close();
            $conn->close();
            exit;
        }
    }
    $stmt->close();
    $conn->close();

    echo json_encode([
        'status' => 'success',
        'data' => [
            'id_user' => $_SESSION['user_id'],
            'username' => $_SESSION['username'],
            'nama_lengkap' => $_SESSION['nama_lengkap'],
            'role' => $_SESSION['role']
        ]
    ]);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Not authenticated']);
}
?>
