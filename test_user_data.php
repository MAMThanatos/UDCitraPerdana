<?php
// test_user_data.php - Insert data user test ke database
require_once('config/db.php');

$message = "";
$message_type = "";

// Handle POST request untuk insert user test
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['insert_test_data'])) {
    // Data user test
    $test_users = array(
        array(
            'username' => 'admin',
            'password' => 'admin123',
            'nama_lengkap' => 'Administrator',
            'role' => 'admin'
        ),
        array(
            'username' => 'manager',
            'password' => 'manager123',
            'nama_lengkap' => 'Manager Warehouse',
            'role' => 'manager'
        ),
        array(
            'username' => 'staff',
            'password' => 'staff123',
            'nama_lengkap' => 'Staff Inventory',
            'role' => 'staff'
        )
    );

    // Clear existing users first
    $conn->query("DELETE FROM user");
    
    $success_count = 0;
    $error_messages = array();

    foreach ($test_users as $user) {
        // Hash password
        $hashed_password = password_hash($user['password'], PASSWORD_DEFAULT);
        
        $query = "INSERT INTO user (username, password, nama_lengkap, role) VALUES (?, ?, ?, ?)";
        $stmt = $conn->prepare($query);
        
        if ($stmt) {
            $stmt->bind_param("ssss", $user['username'], $hashed_password, $user['nama_lengkap'], $user['role']);
            
            if ($stmt->execute()) {
                $success_count++;
            } else {
                $error_messages[] = "Error insert user " . $user['username'] . ": " . $stmt->error;
            }
            $stmt->close();
        } else {
            $error_messages[] = "Error prepare statement: " . $conn->error;
        }
    }

    if ($success_count == count($test_users)) {
        $message = "✓ Berhasil insert " . $success_count . " user test!";
        $message_type = "success";
    } else {
        $message = "Terjadi kesalahan saat insert data. Success: $success_count dari " . count($test_users);
        $message_type = "error";
        if (count($error_messages) > 0) {
            $message .= "<br>" . implode("<br>", $error_messages);
        }
    }
}

// Get existing users
$users_query = "SELECT id_user, username, nama_lengkap, role FROM user ORDER BY id_user";
$users_result = $conn->query($users_query);
$existing_users = array();
if ($users_result) {
    while ($row = $users_result->fetch_assoc()) {
        $existing_users[] = $row;
    }
}

?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Data User Test - Citra Perdana</title>
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
            padding: 30px 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            padding: 40px;
        }
        h1 {
            color: #1f2937;
            margin-bottom: 10px;
            font-size: 28px;
        }
        .subtitle {
            color: #6b7280;
            margin-bottom: 30px;
            font-size: 14px;
        }
        .alert {
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 20px;
            display: flex;
            align-items: flex-start;
            gap: 12px;
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
        .alert-info {
            background-color: #dbeafe;
            border: 1px solid #93c5fd;
            color: #1e40af;
        }
        .alert-warning {
            background-color: #fef3c7;
            border: 1px solid #fde68a;
            color: #92400e;
        }
        .card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .card-title {
            color: #1f2937;
            font-weight: 600;
            margin-bottom: 15px;
            font-size: 16px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        th {
            background-color: #f3f4f6;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: #374151;
            border-bottom: 2px solid #e5e7eb;
            font-size: 13px;
        }
        td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 14px;
        }
        tr:hover {
            background-color: #f9fafb;
        }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
        .badge-admin {
            background-color: #fee2e2;
            color: #991b1b;
        }
        .badge-manager {
            background-color: #fef3c7;
            color: #92400e;
        }
        .badge-staff {
            background-color: #dbeafe;
            color: #1e40af;
        }
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            font-family: 'Inter', sans-serif;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: background-color 0.2s;
            font-size: 14px;
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
            margin-left: 10px;
        }
        .btn-secondary:hover {
            background-color: #e5e7eb;
        }
        .test-data-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        .test-user-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
        }
        .test-user-card strong {
            color: #1f2937;
            display: block;
            margin-bottom: 8px;
        }
        .test-user-card small {
            color: #6b7280;
            display: block;
            line-height: 1.6;
        }
        .test-user-card code {
            background-color: #f3f4f6;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: monospace;
            color: #667eea;
        }
        .link-group {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            display: flex;
            gap: 10px;
        }
        .link-group a {
            padding: 10px 20px;
            background-color: #f3f4f6;
            color: #667eea;
            text-decoration: none;
            border-radius: 6px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            transition: background-color 0.2s;
        }
        .link-group a:hover {
            background-color: #e5e7eb;
        }
        .no-data {
            text-align: center;
            padding: 40px;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1><i class="fas fa-users"></i> Data User Test</h1>
        <p class="subtitle">Kelola data user untuk testing sistem login</p>

        <?php if (!empty($message)): ?>
            <div class="alert alert-<?php echo $message_type; ?>">
                <i class="fas fa-<?php echo ($message_type == 'success') ? 'check-circle' : ($message_type == 'error' ? 'exclamation-circle' : 'info-circle'); ?>"></i>
                <span><?php echo $message; ?></span>
            </div>
        <?php endif; ?>

        <!-- Informasi User Test -->
        <div class="card">
            <div class="card-title"><i class="fas fa-info-circle"></i> User Test yang Tersedia</div>
            <div class="test-data-grid">
                <div class="test-user-card">
                    <strong>👨‍💼 Administrator</strong>
                    <small>
                        Username: <code>admin</code><br>
                        Password: <code>admin123</code><br>
                        Role: <span class="badge badge-admin">Admin</span>
                    </small>
                </div>
                <div class="test-user-card">
                    <strong>📊 Manager</strong>
                    <small>
                        Username: <code>manager</code><br>
                        Password: <code>manager123</code><br>
                        Role: <span class="badge badge-manager">Manager</span>
                    </small>
                </div>
                <div class="test-user-card">
                    <strong>👤 Staff</strong>
                    <small>
                        Username: <code>staff</code><br>
                        Password: <code>staff123</code><br>
                        Role: <span class="badge badge-staff">Staff</span>
                    </small>
                </div>
            </div>

            <form method="POST" action="">
                <input type="hidden" name="insert_test_data" value="1">
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-database"></i> Insert Data User Test
                </button>
            </form>
        </div>

        <!-- User yang Sudah Ada -->
        <div class="card">
            <div class="card-title"><i class="fas fa-list"></i> User di Database</div>
            <?php if (count($existing_users) > 0): ?>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Username</th>
                            <th>Nama Lengkap</th>
                            <th>Role</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($existing_users as $user): ?>
                            <tr>
                                <td><?php echo $user['id_user']; ?></td>
                                <td><code style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px; color: #667eea;"><?php echo htmlspecialchars($user['username']); ?></code></td>
                                <td><?php echo htmlspecialchars($user['nama_lengkap']); ?></td>
                                <td>
                                    <span class="badge badge-<?php echo strtolower($user['role']); ?>">
                                        <?php echo ucfirst($user['role']); ?>
                                    </span>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php else: ?>
                <div class="no-data">
                    <i class="fas fa-user-slash" style="font-size: 40px; margin-bottom: 15px; opacity: 0.5;"></i>
                    <p>Belum ada user di database</p>
                    <p style="font-size: 12px; margin-top: 10px;">Klik tombol di atas untuk insert data user test</p>
                </div>
            <?php endif; ?>
        </div>

        <!-- Link Navigation -->
        <div class="link-group">
            <a href="views/auth/login.php">
                <i class="fas fa-sign-in-alt"></i> Ke Login
            </a>
            <a href="update_db_schema.php">
                <i class="fas fa-database"></i> Update Database
            </a>
            <a href="setup.php">
                <i class="fas fa-cog"></i> Kelola User Manual
            </a>
        </div>
    </div>
</body>
</html>
