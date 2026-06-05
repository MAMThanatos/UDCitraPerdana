<?php
// Database connection configuration
$servername = "localhost";
$username = "root";
$password = "";
$database = "ud_citra_perdana";

try {
    $conn = new mysqli($servername, $username, $password, $database);
    
    // Check connection
    if ($conn->connect_error) {
        die("Koneksi gagal: " . $conn->connect_error);
    }
    
    // Set charset to utf8mb4
    $conn->set_charset("utf8mb4");
    
    // Self-healing database check: pastikan kolom session_id ada di tabel user
    $check_col = $conn->query("SHOW COLUMNS FROM `user` LIKE 'session_id'");
    if ($check_col && $check_col->num_rows === 0) {
        $conn->query("ALTER TABLE `user` ADD COLUMN `session_id` varchar(255) DEFAULT NULL");
    }
    
    // Self-healing database check: pastikan kolom created_at ada di tabel barang
    $check_created_at = $conn->query("SHOW COLUMNS FROM `barang` LIKE 'created_at'");
    if ($check_created_at && $check_created_at->num_rows === 0) {
        $conn->query("ALTER TABLE `barang` ADD COLUMN `created_at` timestamp NOT NULL DEFAULT current_timestamp()");
    }
    
} catch(Exception $e) {
    die("Error: " . $e->getMessage());
}
?>
