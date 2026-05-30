<?php
// Database Seeder untuk UD Citra Perdana
// Kategori Toko Bangunan Sederhana, User default BCRYPT, dan Data Awal Realistis

require_once('../config/db.php');

header('Content-Type: text/html; charset=utf-8');

echo "<h2>=== UD Citra Perdana - Database Seeding ===</h2>";

// Disable foreign key checks untuk pembersihan data
$conn->query("SET FOREIGN_KEY_CHECKS = 0;");

// Clear existing data
$tables = ['detailkeluar', 'detailmasuk', 'transaksikeluar', 'transaksimasuk', 'barang', 'kategori', 'supplier', 'user'];
foreach ($tables as $table) {
    if ($conn->query("TRUNCATE TABLE `$table`")) {
        echo "Tabel `$table` berhasil dikosongkan.<br>";
    } else {
        echo "Gagal mengosongkan tabel `$table`: " . $conn->error . "<br>";
    }
}

// Enable foreign key checks kembali
$conn->query("SET FOREIGN_KEY_CHECKS = 1;");
echo "<hr>";

try {
    // 1. Seed User
    echo "Menyemai data pengguna...<br>";
    $users = [
        [
            'username' => 'admin',
            'password' => password_hash('admin123', PASSWORD_DEFAULT),
            'nama' => 'Administrator Super',
            'role' => 'Admin / Owner'
        ],
        [
            'username' => 'budi_gudang',
            'password' => password_hash('budi123', PASSWORD_DEFAULT),
            'nama' => 'Budi Santoso',
            'role' => 'Staf Gudang'
        ]
    ];

    $stmt_user = $conn->prepare("INSERT INTO user (username, password, nama_lengkap, role) VALUES (?, ?, ?, ?)");
    foreach ($users as $u) {
        $stmt_user->bind_param("ssss", $u['username'], $u['password'], $u['nama'], $u['role']);
        $stmt_user->execute();
    }
    $stmt_user->close();
    $admin_id = 1; // ID auto increment pertama dari user
    echo "✔ Pengguna berhasil disemai (admin/admin123 & budi_gudang/budi123).<br>";

    // 2. Seed Kategori Toko Bangunan Sederhana
    echo "Menyemai data kategori...<br>";
    $kategori = [
        'Bahan Bangunan',
        'Peralatan & Perkakas',
        'Cat & Finishing',
        'Pipa & Saniter'
    ];

    $stmt_kat = $conn->prepare("INSERT INTO kategori (nama_kategori) VALUES (?)");
    foreach ($kategori as $k) {
        $stmt_kat->bind_param("s", $k);
        $stmt_kat->execute();
    }
    $stmt_kat->close();
    echo "✔ Kategori sederhana berhasil disemai.<br>";

    // 3. Seed Supplier
    echo "Menyemai data supplier...<br>";
    $suppliers = [
        ['nama' => 'PT. Semen Indonesia', 'alamat' => 'Gresik, Jawa Timur', 'telp' => '08123456789'],
        ['nama' => 'Toko Besi Makmur', 'alamat' => 'Surabaya, Jawa Timur', 'telp' => '08234567890'],
        ['nama' => 'CV. Dulux Colorindo', 'alamat' => 'Jakarta Barat', 'telp' => '08345678901'],
        ['nama' => 'PT. Rucika Saniter', 'alamat' => 'Tangerang, Banten', 'telp' => '08456789012']
    ];

    $stmt_sup = $conn->prepare("INSERT INTO supplier (nama_supplier, alamat, no_telp) VALUES (?, ?, ?)");
    foreach ($suppliers as $s) {
        $stmt_sup->bind_param("sss", $s['nama'], $s['alamat'], $s['telp']);
        $stmt_sup->execute();
    }
    $stmt_sup->close();
    echo "✔ Supplier berhasil disemai.<br>";

    // 4. Seed Barang (Produk Bangunan Realistis)
    echo "Menyemai data barang master...<br>";
    $barang = [
        [
            'id_kategori' => 1, // Bahan Bangunan
            'kode' => 'BRG-001',
            'nama' => 'Semen Gresik 50kg',
            'stok' => 180,
            'satuan' => 'Zak',
            'harga' => 68000,
            'harga_beli' => 60000,
            'deskripsi' => 'Semen PC kualitas tinggi untuk konstruksi kokoh.',
            'berat' => '50 kg',
            'dimensi' => '60x45x15 cm',
            'rak' => 'Rak A-1',
            'min' => 30
        ],
        [
            'id_kategori' => 2, // Peralatan & Perkakas
            'kode' => 'BRG-002',
            'nama' => 'Paku Payung 5cm',
            'stok' => 150,
            'satuan' => 'Kotak',
            'harga' => 15000,
            'harga_beli' => 12000,
            'deskripsi' => 'Paku payung galvanis anti karat untuk atap.',
            'berat' => '1 kg',
            'dimensi' => '15x10x10 cm',
            'rak' => 'Rak B-2',
            'min' => 10
        ],
        [
            'id_kategori' => 3, // Cat & Finishing
            'kode' => 'BRG-003',
            'nama' => 'Cat Tembok Dulux 5kg',
            'stok' => 75,
            'satuan' => 'Pail',
            'harga' => 165000,
            'harga_beli' => 145000,
            'deskripsi' => 'Cat interior kualitas premium, warna Putih Cemerlang.',
            'berat' => '5 kg',
            'dimensi' => 'D:20cm T:25cm',
            'rak' => 'Rak C-1',
            'min' => 15
        ],
        [
            'id_kategori' => 4, // Pipa & Saniter
            'kode' => 'BRG-004',
            'nama' => 'Pipa PVC Rucika 3inch',
            'stok' => 120,
            'satuan' => 'Batang',
            'harga' => 42000,
            'harga_beli' => 35000,
            'deskripsi' => 'Pipa air kelas D tebal untuk saluran buangan.',
            'berat' => '2 kg',
            'dimensi' => 'P: 4 m',
            'rak' => 'Rak D-3',
            'min' => 20
        ]
    ];

    $stmt_brg = $conn->prepare("INSERT INTO barang (id_kategori, kode_barang, nama_barang, stok, satuan, harga, harga_beli, deskripsi, berat, dimensi, lokasi_rak, stok_minimum) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    foreach ($barang as $b) {
        $stmt_brg->bind_param("issisddssssi", 
            $b['id_kategori'], 
            $b['kode'], 
            $b['nama'], 
            $b['stok'], 
            $b['satuan'], 
            $b['harga'], 
            $b['harga_beli'], 
            $b['deskripsi'], 
            $b['berat'], 
            $b['dimensi'], 
            $b['rak'], 
            $b['min']
        );
        $stmt_brg->execute();
    }
    $stmt_brg->close();
    echo "✔ Barang master berhasil disemai.<br>";

    // 5. Seed Transaksi Masuk (Sejarah Penerimaan)
    echo "Menyemai data transaksi masuk...<br>";
    
    // Transaksi Semen Gresik
    $conn->query("INSERT INTO transaksimasuk (id_supplier, id_user, tgl_masuk, no_po, no_ref, keterangan) VALUES (1, 1, '2026-05-10', 'PO-202605001', 'SJ-SEMEN-9921', 'Stok awal distributor')");
    $masuk1_id = $conn->insert_id;
    $conn->query("INSERT INTO detailmasuk (id_masuk, id_barang, jumlah, kondisi_qc) VALUES ($masuk1_id, 1, 200, 'Baik (Lolos QC)')");

    // Transaksi Cat Tembok
    $conn->query("INSERT INTO transaksimasuk (id_supplier, id_user, tgl_masuk, no_po, no_ref, keterangan) VALUES (3, 1, '2026-05-12', 'PO-202605002', 'SJ-DULUX-1002', 'Pengadaan cat tembok retail')");
    $masuk2_id = $conn->insert_id;
    $conn->query("INSERT INTO detailmasuk (id_masuk, id_barang, jumlah, kondisi_qc) VALUES ($masuk2_id, 3, 80, 'Baik (Lolos QC)')");
    
    echo "✔ Transaksi masuk berhasil disemai.<br>";

    // 6. Seed Transaksi Keluar (Sejarah Pengeluaran)
    echo "Menyemai data transaksi keluar...<br>";

    // Pengeluaran Semen Gresik
    $conn->query("INSERT INTO transaksikeluar (id_user, tgl_keluar, no_ref, tujuan_proyek, tujuan_pengeluaran, keterangan) VALUES (1, '2026-05-15', 'SJ-CP-001', 'Bapak Adi - Proyek Rumah Pondok Indah', 'Penjualan / Distribusi', 'Pengiriman material semen')");
    $keluar1_id = $conn->insert_id;
    $conn->query("INSERT INTO detailkeluar (id_keluar, id_barang, jumlah) VALUES ($keluar1_id, 1, 20)");

    // Pengeluaran Cat Tembok
    $conn->query("INSERT INTO transaksikeluar (id_user, tgl_keluar, no_ref, tujuan_proyek, tujuan_pengeluaran, keterangan) VALUES (1, '2026-05-18', 'SJ-CP-002', 'Renovasi Masjid Citra Perdana', 'Penjualan / Distribusi', 'Sumbangan / Penjualan internal')");
    $keluar2_id = $conn->insert_id;
    $conn->query("INSERT INTO detailkeluar (id_keluar, id_barang, jumlah) VALUES ($keluar2_id, 3, 5)");

    echo "✔ Transaksi keluar berhasil disemai.<br>";

    echo "<h3 style='color: green;'>Seeding Selesai! Basis data UD Citra Perdana berhasil di-reset dengan data master bangunan yang realistis.</h3>";
    echo "<p><a href='../views/auth/login.html'>Kembali ke Halaman Login</a></p>";

} catch (Exception $e) {
    echo "<h3 style='color: red;'>Kesalahan Seeding: " . $e->getMessage() . "</h3>";
}

$conn->close();
?>
