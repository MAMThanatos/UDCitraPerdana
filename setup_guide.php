<?php
// setup_guide.php - Panduan setup sistem login
session_start();
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Panduan Setup - Citra Perdana</title>
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
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        .header h1 {
            font-size: 32px;
            margin-bottom: 10px;
        }
        .header p {
            font-size: 16px;
            opacity: 0.9;
        }
        .content {
            padding: 40px;
        }
        .step-section {
            margin-bottom: 40px;
            border-left: 4px solid #667eea;
            padding-left: 30px;
            position: relative;
        }
        .step-number {
            position: absolute;
            left: -20px;
            top: 0;
            width: 36px;
            height: 36px;
            background: #667eea;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 18px;
        }
        .step-title {
            color: #1f2937;
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 15px;
        }
        .step-description {
            color: #6b7280;
            line-height: 1.7;
            margin-bottom: 15px;
        }
        .code-block {
            background: #f3f4f6;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 15px;
            margin: 15px 0;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            overflow-x: auto;
            color: #374151;
        }
        .link-list {
            list-style: none;
            margin: 15px 0;
        }
        .link-list li {
            margin-bottom: 10px;
        }
        .link-list a {
            color: #667eea;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        .link-list a:hover {
            text-decoration: underline;
        }
        .highlight {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            border-radius: 4px;
            margin: 15px 0;
            color: #92400e;
        }
        .success-box {
            background: #d1fae5;
            border-left: 4px solid #10b981;
            padding: 15px;
            border-radius: 4px;
            margin: 15px 0;
            color: #065f46;
        }
        .btn-group {
            display: flex;
            gap: 10px;
            margin-top: 30px;
            flex-wrap: wrap;
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
            text-decoration: none;
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
        }
        .btn-secondary:hover {
            background-color: #e5e7eb;
        }
        .table-data {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            overflow: hidden;
        }
        .table-data th {
            background-color: #f3f4f6;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: #374151;
            border-bottom: 2px solid #e5e7eb;
        }
        .table-data td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
        }
        .table-data tr:last-child td {
            border-bottom: none;
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
        code {
            background: #f3f4f6;
            padding: 2px 6px;
            border-radius: 3px;
            color: #667eea;
            font-family: monospace;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Panduan Setup Sistem Login</h1>
            <p>UD Citra Perdana - Inventory Management System</p>
        </div>

        <div class="content">
            <!-- STEP 1 -->
            <div class="step-section">
                <div class="step-number">1</div>
                <div class="step-title">Update Database Schema</div>
                <div class="step-description">
                    Sebelum menggunakan fitur login dan reset password, pastikan database sudah di-update dengan kolom yang diperlukan.
                </div>
                <div class="link-list">
                    <li>
                        <a href="update_db_schema.php">
                            <i class="fas fa-database"></i> Buka Update Database Schema
                        </a>
                    </li>
                </ul>
                <div class="highlight">
                    <i class="fas fa-info-circle"></i> Halaman ini akan otomatis menambahkan kolom <code>reset_token</code> dan <code>reset_token_expiry</code> jika belum ada.
                </div>
            </div>

            <!-- STEP 2 -->
            <div class="step-section">
                <div class="step-number">2</div>
                <div class="step-title">Insert Data User Test</div>
                <div class="step-description">
                    Sistem sudah menyediakan 3 user test yang siap digunakan untuk testing. Anda dapat langsung menggunakan credentials ini atau membuat user custom di setup.php.
                </div>

                <table class="table-data">
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Password</th>
                            <th>Nama Lengkap</th>
                            <th>Role</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><code>admin</code></td>
                            <td><code>admin123</code></td>
                            <td>Administrator</td>
                            <td><span class="badge badge-admin">Admin</span></td>
                        </tr>
                        <tr>
                            <td><code>manager</code></td>
                            <td><code>manager123</code></td>
                            <td>Manager Warehouse</td>
                            <td><span class="badge badge-admin">Manager</span></td>
                        </tr>
                        <tr>
                            <td><code>staff</code></td>
                            <td><code>staff123</code></td>
                            <td>Staff Inventory</td>
                            <td><span class="badge badge-admin">Staff</span></td>
                        </tr>
                    </tbody>
                </table>

                <div class="link-list">
                    <li>
                        <a href="test_user_data.php">
                            <i class="fas fa-users"></i> Buka Test User Data
                        </a>
                    </li>
                </ul>
                <div class="success-box">
                    <i class="fas fa-check-circle"></i> Klik tombol "Insert Data User Test" untuk menambahkan user ini ke database.
                </div>
            </div>

            <!-- STEP 3 -->
            <div class="step-section">
                <div class="step-number">3</div>
                <div class="step-title">Login ke Sistem</div>
                <div class="step-description">
                    Setelah user test sudah di-insert, Anda dapat login menggunakan salah satu credentials di atas.
                </div>

                <div class="highlight">
                    <i class="fas fa-arrow-right"></i> URL Login: <code>/UDCitraPerdana/views/auth/login.php</code>
                </div>

                <div class="link-list">
                    <li>
                        <a href="views/auth/login.php">
                            <i class="fas fa-sign-in-alt"></i> Buka Login Page
                        </a>
                    </li>
                </ul>

                <div class="code-block">
                Username: admin
Password: admin123
                </div>
            </div>

            <!-- STEP 4 -->
            <div class="step-section">
                <div class="step-number">4</div>
                <div class="step-title">Fitur Lupa Password (Reset Password)</div>
                <div class="step-description">
                    Jika pengguna lupa password, mereka dapat menggunakan fitur "Lupa Password?" di halaman login untuk reset password dengan cara:
                </div>

                <ul style="margin-left: 20px; color: #6b7280; line-height: 2;">
                    <li><strong>Langkah 1:</strong> Masukkan username</li>
                    <li><strong>Langkah 2:</strong> Jawab pertanyaan keamanan (nama depan dari nama lengkap)</li>
                    <li><strong>Langkah 3:</strong> Masukkan password baru dan konfirmasi</li>
                </ul>

                <div class="highlight">
                    <i class="fas fa-key"></i> <strong>Pertanyaan Keamanan:</strong> Sistem akan bertanya "Siapa nama depan Anda?" - jawaban adalah nama depan dari nama lengkap yang terdaftar.
                </div>

                <div style="margin: 20px 0;">
                    <p style="margin-bottom: 10px; color: #6b7280;">Contoh:</p>
                    <div class="code-block">
Jika Nama Lengkap: "Adi Sucipto"
Jawaban Keamanan: "Adi"
                    </div>
                </div>

                <div class="link-list">
                    <li>
                        <a href="views/auth/forgot_password.php">
                            <i class="fas fa-key"></i> Buka Halaman Lupa Password
                        </a>
                    </li>
                </ul>
            </div>

            <!-- STEP 5 -->
            <div class="step-section">
                <div class="step-number">5</div>
                <div class="step-title">Kelola User Secara Manual</div>
                <div class="step-description">
                    Untuk menambah user baru secara manual atau mengelola user yang sudah ada, gunakan halaman setup.
                </div>

                <div class="highlight">
                    <i class="fas fa-user-plus"></i> Di sini Anda dapat menambah user dengan custom username, password, nama lengkap, dan role.
                </div>

                <div class="link-list">
                    <li>
                        <a href="setup.php">
                            <i class="fas fa-cog"></i> Buka Setup & Kelola User
                        </a>
                    </li>
                </ul>
            </div>

            <!-- Summary -->
            <div class="step-section" style="border-left-color: #10b981;">
                <div class="step-number" style="background: #10b981;">✓</div>
                <div class="step-title" style="color: #10b981;">Ringkasan File yang Dibuat</div>
                
                <table class="table-data">
                    <thead>
                        <tr>
                            <th>File</th>
                            <th>Fungsi</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><code>config/db.php</code></td>
                            <td>Koneksi database MySQL</td>
                        </tr>
                        <tr>
                            <td><code>views/auth/login.php</code></td>
                            <td>Halaman login dengan validasi database</td>
                        </tr>
                        <tr>
                            <td><code>views/auth/forgot_password.php</code></td>
                            <td>Halaman reset password dengan security question</td>
                        </tr>
                        <tr>
                            <td><code>update_db_schema.php</code></td>
                            <td>Script untuk update database schema</td>
                        </tr>
                        <tr>
                            <td><code>test_user_data.php</code></td>
                            <td>Insert data user test ke database</td>
                        </tr>
                        <tr>
                            <td><code>setup.php</code></td>
                            <td>Halaman untuk kelola user secara manual</td>
                        </tr>
                        <tr>
                            <td><code>logout.php</code></td>
                            <td>Script untuk logout</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Action Buttons -->
            <div class="btn-group">
                <a href="update_db_schema.php" class="btn btn-primary">
                    <i class="fas fa-database"></i> Update Database
                </a>
                <a href="test_user_data.php" class="btn btn-primary">
                    <i class="fas fa-users"></i> Insert User Test
                </a>
                <a href="views/auth/login.php" class="btn btn-secondary">
                    <i class="fas fa-sign-in-alt"></i> Login
                </a>
            </div>
        </div>
    </div>
</body>
</html>
