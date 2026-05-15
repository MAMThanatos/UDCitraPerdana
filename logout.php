<?php
// Logout script
session_start();

// Destroy session
session_destroy();

// Clear session data
$_SESSION = array();

// Redirect ke login page
header("Location: views/auth/login.php");
exit();
?>
