<?php
session_start();

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');

if (isset($_SESSION['user_id'])) {
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
