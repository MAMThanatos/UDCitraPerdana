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

    // Self-healing database check: pastikan tabel opname dan detailopname dibuat jika belum ada
    $conn->query("CREATE TABLE IF NOT EXISTS `opname` (
        `id_opname` int(11) NOT NULL AUTO_INCREMENT,
        `id_user` int(11) NOT NULL,
        `tgl_opname` date NOT NULL,
        `keterangan` text DEFAULT NULL,
        PRIMARY KEY (`id_opname`),
        KEY `id_user` (`id_user`),
        CONSTRAINT `opname_ibfk_1` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;");

    $conn->query("CREATE TABLE IF NOT EXISTS `detailopname` (
        `id_detail_opname` int(11) NOT NULL AUTO_INCREMENT,
        `id_opname` int(11) NOT NULL,
        `id_barang` int(11) NOT NULL,
        `stok_sistem` int(11) NOT NULL,
        `stok_fisik` int(11) NOT NULL,
        `selisih` int(11) NOT NULL,
        `keterangan` varchar(255) DEFAULT NULL,
        PRIMARY KEY (`id_detail_opname`),
        KEY `id_opname` (`id_opname`),
        KEY `id_barang` (`id_barang`),
        CONSTRAINT `detailopname_ibfk_1` FOREIGN KEY (`id_opname`) REFERENCES `opname` (`id_opname`) ON DELETE CASCADE,
        CONSTRAINT `detailopname_ibfk_2` FOREIGN KEY (`id_barang`) REFERENCES `barang` (`id_barang`) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;");
    
} catch(Exception $e) {
    die("Error: " . $e->getMessage());
}
?>
