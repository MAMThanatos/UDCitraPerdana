<?php
session_start();
header('Content-Type: application/json');

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
