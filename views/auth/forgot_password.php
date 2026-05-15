<?php
// Forgot Password Page
session_start();
require_once('../../config/db.php');

$message = "";
$message_type = "";
$step = 1; // Step 1: Ask username, Step 2: Security question, Step 3: Reset password

// Check if reset token is valid
$reset_token = isset($_GET['token']) ? sanitize($_GET['token']) : '';

if (!empty($reset_token)) {
    // Verify token
    $token_query = "SELECT id_user, username FROM user WHERE reset_token = ? AND reset_token_expiry > NOW()";
    $stmt = $conn->prepare($token_query);
    if ($stmt) {
        $stmt->bind_param("s", $reset_token);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $step = 3; // Show reset password form
            $reset_user = $result->fetch_assoc();
        } else {
            $message = "Link reset password tidak valid atau sudah kadaluarsa!";
            $message_type = "error";
            $step = 1;
        }
        $stmt->close();
    }
}

// Handle form submissions
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    
    // Step 1: Find user by username
    if (isset($_POST['action']) && $_POST['action'] == 'find_user') {
        $username = isset($_POST['username']) ? trim($_POST['username']) : '';
        
        if (empty($username)) {
            $message = "Username tidak boleh kosong";
            $message_type = "error";
        } else {
            $query = "SELECT id_user, username, nama_lengkap FROM user WHERE username = ?";
            $stmt = $conn->prepare($query);
            
            if ($stmt) {
                $stmt->bind_param("s", $username);
                $stmt->execute();
                $result = $stmt->get_result();
                
                if ($result->num_rows > 0) {
                    $user_data = $result->fetch_assoc();
                    $_SESSION['reset_user_id'] = $user_data['id_user'];
                    $_SESSION['reset_username'] = $user_data['username'];
                    $_SESSION['reset_nama'] = $user_data['nama_lengkap'];
                    $step = 2;
                    $message = "Username ditemukan! Silakan jawab pertanyaan keamanan.";
                    $message_type = "success";
                } else {
                    $message = "Username tidak ditemukan dalam sistem";
                    $message_type = "error";
                }
                $stmt->close();
            } else {
                $message = "Terjadi kesalahan: " . $conn->error;
                $message_type = "error";
            }
        }
    }
    
    // Step 2: Verify security question
    elseif (isset($_POST['action']) && $_POST['action'] == 'verify_security') {
        $security_answer = isset($_POST['security_answer']) ? strtolower(trim($_POST['security_answer'])) : '';
        
        if (empty($security_answer)) {
            $message = "Jawaban tidak boleh kosong";
            $message_type = "error";
            $step = 2;
        } else {
            // Simple security check: nama depan dari nama lengkap
            $nama_lengkap = isset($_SESSION['reset_nama']) ? $_SESSION['reset_nama'] : '';
            $nama_depan = strtolower(explode(' ', $nama_lengkap)[0]);
            
            if ($security_answer === $nama_depan) {
                $step = 3;
                $message = "Jawaban benar! Silakan reset password Anda.";
                $message_type = "success";
                
                // Generate reset token
                $reset_token = bin2hex(random_bytes(32));
                $_SESSION['reset_token'] = $reset_token;
                
                // Update database dengan token
                $update_query = "UPDATE user SET reset_token = ?, reset_token_expiry = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE id_user = ?";
                $update_stmt = $conn->prepare($update_query);
                if ($update_stmt) {
                    $update_stmt->bind_param("si", $reset_token, $_SESSION['reset_user_id']);
                    $update_stmt->execute();
                    $update_stmt->close();
                }
            } else {
                $message = "Jawaban salah! Silakan coba lagi.";
                $message_type = "error";
                $step = 2;
            }
        }
    }
    
    // Step 3: Reset password
    elseif (isset($_POST['action']) && $_POST['action'] == 'reset_password') {
        $new_password = isset($_POST['new_password']) ? $_POST['new_password'] : '';
        $confirm_password = isset($_POST['confirm_password']) ? $_POST['confirm_password'] : '';
        $user_id = isset($_SESSION['reset_user_id']) ? $_SESSION['reset_user_id'] : 0;
        
        if (empty($new_password) || empty($confirm_password)) {
            $message = "Password dan konfirmasi tidak boleh kosong";
            $message_type = "error";
            $step = 3;
        } elseif ($new_password !== $confirm_password) {
            $message = "Password tidak cocok!";
            $message_type = "error";
            $step = 3;
        } elseif (strlen($new_password) < 6) {
            $message = "Password minimal 6 karakter";
            $message_type = "error";
            $step = 3;
        } else {
            // Hash password
            $hashed_password = password_hash($new_password, PASSWORD_DEFAULT);
            
            // Update password
            $update_query = "UPDATE user SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id_user = ?";
            $update_stmt = $conn->prepare($update_query);
            
            if ($update_stmt) {
                $update_stmt->bind_param("si", $hashed_password, $user_id);
                
                if ($update_stmt->execute()) {
                    $message = "Password berhasil direset! Silakan login dengan password baru Anda.";
                    $message_type = "success";
                    
                    // Clear session
                    session_destroy();
                    
                    // Redirect to login after 2 seconds
                    echo '<script>
                        setTimeout(function() {
                            window.location.href = "login.php";
                        }, 2000);
                    </script>';
                } else {
                    $message = "Terjadi kesalahan: " . $update_stmt->error;
                    $message_type = "error";
                }
                $update_stmt->close();
            }
        }
    }
}

function sanitize($input) {
    return htmlspecialchars(strip_tags(trim($input)));
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lupa Password - Citra Perdana</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../../assets/css/style.css">
    <style>
        .forgot-password-container {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: 'Inter', sans-serif;
            padding: 20px;
        }
        .forgot-password-card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            width: 100%;
            max-width: 400px;
            padding: 40px;
        }
        .forgot-header {
            text-align: center;
            margin-bottom: 30px;
        }
        .forgot-header h1 {
            color: #1f2937;
            margin-bottom: 8px;
            font-size: 24px;
        }
        .forgot-header p {
            color: #6b7280;
            font-size: 14px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        .form-group label {
            display: block;
            color: #374151;
            font-weight: 500;
            margin-bottom: 8px;
            font-size: 14px;
        }
        .form-group input {
            width: 100%;
            padding: 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            transition: border-color 0.2s;
        }
        .form-group input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        .btn {
            width: 100%;
            padding: 12px;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            transition: background-color 0.2s;
        }
        .btn-primary {
            background-color: #667eea;
            color: white;
        }
        .btn-primary:hover {
            background-color: #5568d3;
        }
        .btn-secondary {
            background-color: #f3f4f6;
            color: #374151;
            margin-top: 10px;
        }
        .btn-secondary:hover {
            background-color: #e5e7eb;
        }
        .alert {
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 20px;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .alert-success {
            background-color: #d1fae5;
            border: 1px solid #6ee7b7;
            color: #065f46;
        }
        .alert-error {
            background-color: #fee2e2;
            border: 1px solid #fca5a5;
            color: #991b1b;
        }
        .back-to-login {
            text-align: center;
            margin-top: 20px;
        }
        .back-to-login a {
            color: #667eea;
            text-decoration: none;
            font-size: 14px;
        }
        .back-to-login a:hover {
            text-decoration: underline;
        }
        .step-indicator {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            gap: 10px;
        }
        .step {
            flex: 1;
            height: 4px;
            background-color: #e5e7eb;
            border-radius: 2px;
        }
        .step.active {
            background-color: #667eea;
        }
        .step.completed {
            background-color: #10b981;
        }
        .security-info {
            background-color: #f0f9ff;
            border: 1px solid #bfdbfe;
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 20px;
            font-size: 13px;
            color: #1e40af;
        }
    </style>
</head>
<body style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">

    <div class="forgot-password-container">
        <div class="forgot-password-card">
            
            <div class="forgot-header">
                <h1>Lupa Password?</h1>
                <p>Kami akan membantu Anda reset password</p>
            </div>

            <?php if (!empty($message)): ?>
                <div class="alert alert-<?php echo $message_type; ?>">
                    <i class="fas fa-<?php echo $message_type == 'error' ? 'exclamation-circle' : 'check-circle'; ?>"></i>
                    <?php echo htmlspecialchars($message); ?>
                </div>
            <?php endif; ?>

            <div class="step-indicator">
                <div class="step <?php echo ($step >= 1) ? 'active' : ''; ?> <?php echo ($step > 1) ? 'completed' : ''; ?>"></div>
                <div class="step <?php echo ($step >= 2) ? 'active' : ''; ?> <?php echo ($step > 2) ? 'completed' : ''; ?>"></div>
                <div class="step <?php echo ($step >= 3) ? 'active' : ''; ?>"></div>
            </div>

            <!-- STEP 1: Find Username -->
            <?php if ($step == 1): ?>
            <form method="POST" action="">
                <input type="hidden" name="action" value="find_user">
                
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" id="username" name="username" placeholder="Masukkan username Anda" required autocomplete="username">
                </div>

                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-search"></i> Cari Username
                </button>
            </form>
            <?php endif; ?>

            <!-- STEP 2: Security Question -->
            <?php if ($step == 2): ?>
            <form method="POST" action="">
                <input type="hidden" name="action" value="verify_security">
                
                <div class="security-info">
                    <i class="fas fa-info-circle"></i> 
                    Jawab pertanyaan keamanan di bawah untuk verifikasi
                </div>

                <div class="form-group">
                    <label>Pertanyaan Keamanan</label>
                    <p style="margin: 0; padding: 10px; background-color: #f9fafb; border-radius: 6px; color: #374151; font-size: 14px;">
                        <strong>Siapa nama depan Anda?</strong>
                    </p>
                    <small style="display: block; margin-top: 8px; color: #6b7280;">
                        Nama depan dari: <?php echo htmlspecialchars(isset($_SESSION['reset_nama']) ? $_SESSION['reset_nama'] : ''); ?>
                    </small>
                </div>

                <div class="form-group">
                    <label for="security_answer">Jawaban</label>
                    <input type="text" id="security_answer" name="security_answer" placeholder="Masukkan nama depan Anda" required>
                </div>

                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-check"></i> Verifikasi
                </button>
            </form>
            <?php endif; ?>

            <!-- STEP 3: Reset Password -->
            <?php if ($step == 3): ?>
            <form method="POST" action="">
                <input type="hidden" name="action" value="reset_password">
                
                <div class="form-group">
                    <label for="new_password">Password Baru</label>
                    <input type="password" id="new_password" name="new_password" placeholder="Minimal 6 karakter" required>
                </div>

                <div class="form-group">
                    <label for="confirm_password">Konfirmasi Password</label>
                    <input type="password" id="confirm_password" name="confirm_password" placeholder="Ulangi password baru" required>
                </div>

                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-lock"></i> Reset Password
                </button>
            </form>
            <?php endif; ?>

            <div class="back-to-login">
                <a href="login.php">
                    <i class="fas fa-arrow-left"></i> Kembali ke Login
                </a>
            </div>
        </div>
    </div>

</body>
</html>
