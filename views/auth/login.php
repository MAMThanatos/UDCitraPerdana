<?php
// Start session
session_start();

// Include database configuration
require_once('../../config/db.php');

// Initialize variables
$error_message = "";
$success = false;

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $username = isset($_POST['username']) ? trim($_POST['username']) : '';
    $password = isset($_POST['password']) ? trim($_POST['password']) : '';
    
    // Validate input
    if (empty($username) || empty($password)) {
        $error_message = "Username dan password tidak boleh kosong";
    } else {
        // Prepare and execute query
        $query = "SELECT id_user, username, password, nama_lengkap, role FROM user WHERE username = ?";
        $stmt = $conn->prepare($query);
        
        if ($stmt) {
            $stmt->bind_param("s", $username);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows > 0) {
                $row = $result->fetch_assoc();
                
                // Verify password - support both hashed and plain text for testing
                $password_match = false;
                
                // Check if password is hashed (bcrypt format)
                if (substr($row['password'], 0, 4) === '$2y$' || substr($row['password'], 0, 4) === '$2a$' || substr($row['password'], 0, 4) === '$2b$') {
                    $password_match = password_verify($password, $row['password']);
                } else {
                    // Fallback for plain text passwords (for testing)
                    $password_match = ($password === $row['password']);
                }
                
                if ($password_match) {
                    // Set session variables
                    $_SESSION['id_user'] = $row['id_user'];
                    $_SESSION['username'] = $row['username'];
                    $_SESSION['nama_lengkap'] = $row['nama_lengkap'];
                    $_SESSION['role'] = $row['role'];
                    $_SESSION['logged_in'] = true;
                    
                    $success = true;
                    // Redirect to dashboard
                    header("Location: ../../index.html");
                    exit();
                } else {
                    $error_message = "Username atau password salah";
                }
            } else {
                $error_message = "Username atau password salah";
            }
            
            $stmt->close();
        } else {
            $error_message = "Terjadi kesalahan pada server: " . $conn->error;
        }
    }
}

// If already logged in, redirect to dashboard
if (isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true) {
    header("Location: ../../index.html");
    exit();
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Citra Perdana</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../../assets/css/style.css">
</head>
<body class="login-body">

    <div class="login-card">
        <div class="login-logo">
            <img src="../../assets/images/Logo Citra Perdana.png" alt="Logo UD Citra Perdana" style="max-width: 80px; height: auto;">
        </div>
        
        <div class="login-header">
            <h1>Citra Perdana</h1>
            <p>Silakan masuk ke sistem inventaris</p>
        </div>

        <?php if (!empty($error_message)): ?>
            <div class="alert alert-error" style="margin-bottom: 20px; padding: 12px; background-color: #fee; border: 1px solid #fcc; border-radius: 5px; color: #c33;">
                <i class="fas fa-exclamation-circle"></i> <?php echo htmlspecialchars($error_message); ?>
            </div>
        <?php endif; ?>

        <form class="login-form" id="loginForm" method="POST" action="">
            <div class="input-group">
                <label for="username">Username</label>
                <div class="input-wrapper">
                    <i class="fas fa-user icon-left"></i>
                    <input type="text" id="username" name="username" placeholder="Masukkan username" required autocomplete="username">
                </div>
            </div>

            <div class="input-group">
                <label for="password">Password</label>
                <div class="input-wrapper">
                    <i class="fas fa-lock icon-left"></i>
                    <input type="password" id="password" name="password" placeholder="Masukkan password" required autocomplete="current-password">
                    <i class="fas fa-eye toggle-password" id="togglePassword" title="Tampilkan Password"></i>
                </div>
            </div>

            <a href="forgot_password.php" class="forgot-password">Lupa password?</a>

            <button type="submit" class="btn btn-primary btn-full">
                Masuk
            </button>
        </form>
    </div>

    <script src="../../assets/js/script.js"></script>

</body>
</html>
