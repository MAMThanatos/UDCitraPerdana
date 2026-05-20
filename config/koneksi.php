<?php
$host = "localhost";
$user = "root";
$pass = "";
$db   = "ud_citra_perdana";

$conn = mysqli_connect($host, $user, $pass, $db);

if (!$conn) {
    die("Koneksi database gagal: " . mysqli_connect_error());
}
?>
