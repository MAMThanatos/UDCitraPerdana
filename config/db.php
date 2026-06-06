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
    
} catch(Exception $e) {
    die("Error: " . $e->getMessage());
}
?>
