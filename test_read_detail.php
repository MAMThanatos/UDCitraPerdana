<?php
session_start();
$_SESSION['user_id'] = 1;
$_SESSION['role'] = 'Admin / Owner';
$_SESSION['username'] = 'admin';
$_SESSION['nama_lengkap'] = 'Administrator Super';

$_GET['action'] = 'detail';
$_GET['id_opname'] = 4;

// Include the API script (which will output JSON and exit)
require 'api/laporan/read_opname.php';
?>
