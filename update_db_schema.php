<?php
// update_db_schema.php - Script untuk update database schema jika kolom belum ada
require_once('config/db.php');

$messages = array();

// Check dan add reset_token column jika belum ada
$check_column = $conn->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='user' AND COLUMN_NAME='reset_token' AND TABLE_SCHEMA=DATABASE()");

if ($check_column && $check_column->num_rows == 0) {
    if ($conn->query("ALTER TABLE user ADD COLUMN reset_token VARCHAR(255) DEFAULT NULL AFTER password")) {
        $messages[] = array('type' => 'success', 'text' => 'Kolom reset_token berhasil ditambahkan');
    } else {
        $messages[] = array('type' => 'error', 'text' => 'Error menambah reset_token: ' . $conn->error);
    }
} else {
    $messages[] = array('type' => 'info', 'text' => 'Kolom reset_token sudah ada');
}

// Check dan add reset_token_expiry column jika belum ada
$check_column2 = $conn->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='user' AND COLUMN_NAME='reset_token_expiry' AND TABLE_SCHEMA=DATABASE()");

if ($check_column2 && $check_column2->num_rows == 0) {
    if ($conn->query("ALTER TABLE user ADD COLUMN reset_token_expiry DATETIME DEFAULT NULL AFTER reset_token")) {
        $messages[] = array('type' => 'success', 'text' => 'Kolom reset_token_expiry berhasil ditambahkan');
    } else {
        $messages[] = array('type' => 'error', 'text' => 'Error menambah reset_token_expiry: ' . $conn->error);
    }
} else {
    $messages[] = array('type' => 'info', 'text' => 'Kolom reset_token_expiry sudah ada');
}

// Check kolom password jika terlalu pendek
$check_password = $conn->query("SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='user' AND COLUMN_NAME='password' AND TABLE_SCHEMA=DATABASE()");

if ($check_password) {
    $col_info = $check_password->fetch_assoc();
    if (strpos($col_info['COLUMN_TYPE'], 'varchar(255)') === false) {
        if ($conn->query("ALTER TABLE user MODIFY COLUMN password VARCHAR(255) NOT NULL")) {
            $messages[] = array('type' => 'success', 'text' => 'Kolom password berhasil diupdate ke VARCHAR(255)');
        }
    } else {
        $messages[] = array('type' => 'info', 'text' => 'Kolom password sudah VARCHAR(255)');
    }
}

?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Update Database - Citra Perdana</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            max-width: 500px;
            width: 100%;
            padding: 40px;
        }
        h1 {
            color: #1f2937;
            margin-bottom: 10px;
            font-size: 24px;
        }
        .subtitle {
            color: #6b7280;
            margin-bottom: 30px;
            font-size: 14px;
        }
        .message {
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 14px;
        }
        .message.success {
            background-color: #d1fae5;
            border: 1px solid #6ee7b7;
            color: #065f46;
        }
        .message.error {
            background-color: #fee2e2;
            border: 1px solid #fca5a5;
            color: #991b1b;
        }
        .message.info {
            background-color: #dbeafe;
            border: 1px solid #93c5fd;
            color: #1e40af;
        }
        .actions {
            margin-top: 30px;
            display: flex;
            gap: 10px;
        }
        .btn {
            padding: 12px 20px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            font-family: 'Inter', sans-serif;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            flex: 1;
            justify-content: center;
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
        }
        .btn-secondary:hover {
            background-color: #e5e7eb;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1><i class="fas fa-database"></i> Update Database</h1>
        <p class="subtitle">Mempersiapkan database untuk fitur reset password</p>

        <?php foreach ($messages as $msg): ?>
            <div class="message <?php echo $msg['type']; ?>">
                <i class="fas fa-<?php echo $msg['type'] == 'success' ? 'check-circle' : ($msg['type'] == 'error' ? 'exclamation-circle' : 'info-circle'); ?>"></i>
                <?php echo $msg['text']; ?>
            </div>
        <?php endforeach; ?>

        <div class="actions">
            <a href="setup.php" class="btn btn-primary">
                <i class="fas fa-user-plus"></i> Kelola User
            </a>
            <a href="views/auth/login.php" class="btn btn-secondary">
                <i class="fas fa-sign-in-alt"></i> Login
            </a>
        </div>
    </div>
</body>
</html>
