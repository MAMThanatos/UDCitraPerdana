<?php
// Start session dan check login
session_start();

// Check if user is logged in
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    // Redirect to login if not logged in
    header("Location: views/auth/login.php");
    exit();
}

$username = isset($_SESSION['username']) ? $_SESSION['username'] : 'Guest';
$nama_lengkap = isset($_SESSION['nama_lengkap']) ? $_SESSION['nama_lengkap'] : 'Guest';
$role = isset($_SESSION['role']) ? $_SESSION['role'] : 'user';
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Citra Perdana</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="assets/css/style.css">
    <style>
        .welcome-banner {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .welcome-banner h1 {
            margin-bottom: 10px;
            font-size: 24px;
        }
        .welcome-banner p {
            opacity: 0.9;
            margin-bottom: 0;
        }
        .user-info {
            background: rgba(255, 255, 255, 0.1);
            padding: 15px;
            border-radius: 6px;
            margin-top: 15px;
        }
        .user-info-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 14px;
        }
        .user-info-item:last-child {
            margin-bottom: 0;
        }
        .badge-role {
            display: inline-block;
            background: rgba(255, 255, 255, 0.2);
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        .logout-btn {
            margin-top: 15px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(255, 255, 255, 0.2);
            color: white;
            border: 2px solid white;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            text-decoration: none;
            font-weight: 600;
            transition: background 0.2s;
        }
        .logout-btn:hover {
            background: rgba(255, 255, 255, 0.3);
        }
        .user-dropdown {
            position: relative;
        }
        .user-menu-btn {
            background: none;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 12px;
            border-radius: 6px;
            transition: background 0.2s;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            font-weight: 500;
            color: #1e293b;
        }
        .user-menu-btn:hover {
            background: rgba(0, 0, 0, 0.05);
        }
        .dropdown-menu {
            position: absolute;
            top: 100%;
            left: 0;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            min-width: 250px;
            margin-top: 8px;
            display: none;
            z-index: 1000;
        }
        .dropdown-menu.active {
            display: block;
        }
        .dropdown-header {
            padding: 15px;
            border-bottom: 1px solid #e2e8f0;
        }
        .dropdown-user-info {
            margin-bottom: 0;
        }
        .dropdown-user-name {
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 4px;
        }
        .dropdown-user-role {
            font-size: 12px;
            color: #64748B;
        }
        .dropdown-divider {
            height: 1px;
            background: #e2e8f0;
            margin: 0;
        }
        .dropdown-menu a {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 15px;
            color: #1e293b;
            text-decoration: none;
            border: none;
            background: none;
            cursor: pointer;
            width: 100%;
            text-align: left;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            transition: background 0.2s;
        }
        .dropdown-menu a:hover {
            background: #f4f6f8;
        }
        .dropdown-menu a.logout-menu {
            color: #ef4444;
            border-top: 1px solid #e2e8f0;
        }
        .dropdown-menu a.logout-menu:hover {
            background: #fee2e2;
        }
    </style>
</head>
<body>

    <div class="app-container">
        
        <aside class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <h2 style="display: flex; align-items: center;"><img src="assets/images/Logo Citra Perdana.png" 
                    alt="Logo" style="max-height: 30px; margin-right: 10px;">Citra Perdana</h2>
            </div>
            <ul class="sidebar-menu">
                <li>
                    <a href="index.php" class="active">
                        <i class="fas fa-home"></i> <span>Dashboard</span>
                    </a>
                </li>
                <li class="menu-label">Data Master</li>
                <li>
                    <a href="views/barang/data_barang.html">
                        <i class="fas fa-box"></i> <span>Kelola Data Barang</span>
                    </a>
                </li>
                <li class="menu-label">Transaksi</li>
                <li>
                    <a href="views/transaksi/barang_masuk.html">
                        <i class="fas fa-arrow-down" style="color: #10b981;"></i> <span>Barang Masuk</span>
                    </a>
                </li>
                <li>
                    <a href="views/transaksi/barang_keluar.html">
                        <i class="fas fa-arrow-up" style="color: #ef4444;"></i> <span>Barang Keluar</span>
                    </a>
                </li>
                <li class="menu-label">Laporan</li>
                <li>
                    <a href="views/laporan/laporan_stok.html">
                        <i class="fas fa-file-alt"></i> <span>Laporan Stok</span>
                    </a>
                </li>
                <li style="margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                    <a href="logout.php" style="color: #ef4444;">
                        <i class="fas fa-sign-out-alt"></i> <span>Logout</span>
                    </a>
                </li>
            </ul>
        </aside>

        <main class="main-content">
            <header class="topbar">
                <button id="sidebarToggle" class="toggle-btn">
                    <i class="fas fa-bars"></i>
                </button>
                
                <div class="user-dropdown" style="margin-left: auto;">
                    <button class="user-menu-btn" id="userMenuBtn">
                        <span><?php echo htmlspecialchars($nama_lengkap); ?></span>
                        <div class="avatar" style="width: 40px; height: 40px; border-radius: 50%; background-color: #e2e8f0; display: flex; align-items: center; justify-content: center; color: #64748B; margin: 0;">
                            <i class="fas fa-user"></i>
                        </div>
                    </button>
                    
                    <div class="dropdown-menu" id="userDropdown">
                        <div class="dropdown-header">
                            <div class="dropdown-user-info">
                                <div class="dropdown-user-name"><?php echo htmlspecialchars($nama_lengkap); ?></div>
                                <div class="dropdown-user-role">@<?php echo htmlspecialchars($username); ?></div>
                                <div class="dropdown-user-role" style="margin-top: 6px;">
                                    <span style="display: inline-block; background: #667eea; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
                                        <?php echo ucfirst(htmlspecialchars($role)); ?>
                                    </span>
                                </div>
                            </div>
                        </div>
                        <a href="#" onclick="alert('Fitur profil akan segera tersedia'); return false;">
                            <i class="fas fa-user"></i> Profil
                        </a>
                        <a href="#" onclick="alert('Fitur pengaturan akan segera tersedia'); return false;">
                            <i class="fas fa-cog"></i> Pengaturan
                        </a>
                        <a href="logout.php" class="logout-menu">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </a>
                    </div>
                </div>
            </header>

            <div class="content-area">
                <div class="welcome-banner">
                    <h1><i class="fas fa-wave-hand"></i> Selamat Datang, <?php echo htmlspecialchars(explode(' ', $nama_lengkap)[0]); ?>!</h1>
                    <p>Anda berhasil login ke Sistem Inventaris UD Citra Perdana</p>
                    
                    <div class="user-info">
                        <div class="user-info-item">
                            <strong>Username:</strong>
                            <code><?php echo htmlspecialchars($username); ?></code>
                        </div>
                        <div class="user-info-item">
                            <strong>Nama Lengkap:</strong>
                            <?php echo htmlspecialchars($nama_lengkap); ?>
                        </div>
                        <div class="user-info-item">
                            <strong>Role:</strong>
                            <span class="badge-role"><?php echo ucfirst(htmlspecialchars($role)); ?></span>
                        </div>
                    </div>

                    <a href="logout.php" class="logout-btn">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </a>
                </div>

                <div class="dashboard-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
                    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <i class="fas fa-box" style="font-size: 40px; color: #667eea; margin-bottom: 10px;"></i>
                        <h3 style="margin-bottom: 5px;">Kelola Barang</h3>
                        <p style="color: #6b7280; font-size: 14px; margin-bottom: 15px;">Atur data produk dan inventory</p>
                        <a href="views/barang/data_barang.html" style="color: #667eea; text-decoration: none; font-weight: 600;">Buka →</a>
                    </div>

                    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <i class="fas fa-arrow-down" style="font-size: 40px; color: #10b981; margin-bottom: 10px;"></i>
                        <h3 style="margin-bottom: 5px;">Barang Masuk</h3>
                        <p style="color: #6b7280; font-size: 14px; margin-bottom: 15px;">Catat barang yang masuk ke gudang</p>
                        <a href="views/transaksi/barang_masuk.html" style="color: #10b981; text-decoration: none; font-weight: 600;">Buka →</a>
                    </div>

                    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <i class="fas fa-arrow-up" style="font-size: 40px; color: #ef4444; margin-bottom: 10px;"></i>
                        <h3 style="margin-bottom: 5px;">Barang Keluar</h3>
                        <p style="color: #6b7280; font-size: 14px; margin-bottom: 15px;">Catat barang yang keluar dari gudang</p>
                        <a href="views/transaksi/barang_keluar.html" style="color: #ef4444; text-decoration: none; font-weight: 600;">Buka →</a>
                    </div>

                    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <i class="fas fa-file-alt" style="font-size: 40px; color: #f59e0b; margin-bottom: 10px;"></i>
                        <h3 style="margin-bottom: 5px;">Laporan Stok</h3>
                        <p style="color: #6b7280; font-size: 14px; margin-bottom: 15px;">Lihat laporan stok barang</p>
                        <a href="views/laporan/laporan_stok.html" style="color: #f59e0b; text-decoration: none; font-weight: 600;">Buka →</a>
                    </div>
                </div>

                <div style="background: #f0f9ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px;">
                    <h3 style="color: #1e40af; margin-bottom: 10px;">
                        <i class="fas fa-info-circle"></i> Informasi Sistem
                    </h3>
                    <p style="color: #1e40af; font-size: 14px; margin-bottom: 0;">
                        Sistem Inventaris UD Citra Perdana siap digunakan. Pilih menu di sidebar untuk memulai mengelola data barang dan transaksi.
                    </p>
                </div>
            </div>
        </main>
    </div>

    <script src="assets/js/script.js"></script>
    <script>
        // User Dropdown Menu
        const userMenuBtn = document.getElementById('userMenuBtn');
        const userDropdown = document.getElementById('userDropdown');

        if (userMenuBtn && userDropdown) {
            userMenuBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                userDropdown.classList.toggle('active');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', function(e) {
                if (!userDropdown.contains(e.target) && e.target !== userMenuBtn && !userMenuBtn.contains(e.target)) {
                    userDropdown.classList.remove('active');
                }
            });
        }

        // Sidebar Toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        const sidebar = document.getElementById('sidebar');

        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', function() {
                if (sidebar.style.display === 'none' || sidebar.style.display === '') {
                    sidebar.style.display = 'flex';
                } else {
                    sidebar.style.display = 'none';
                }
            });
        }
    </script>
</body>
</html>
