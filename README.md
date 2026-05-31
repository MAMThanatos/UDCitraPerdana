# 🏗️ UD Citra Perdana - Sistem Inventaris & Manajemen Gudang

Sistem Aplikasi Inventaris Gudang Premium berbasis Web Relasional untuk **UD Citra Perdana** (Toko Bangunan). Aplikasi ini dikembangkan menggunakan kombinasi teknologi modern **HTML5, CSS3 Vanilla, Vanilla JavaScript, PHP, dan MariaDB/MySQL**, serta disesuaikan secara khusus untuk memenuhi studi kasus dunia nyata toko material & bahan bangunan.

Aplikasi ini mengusung model otorisasi **Multi-Role (2-User Model)** yang ketat dan dilengkapi fitur canggih seperti **Automatic Relational Mapping**, **Pindai Kamera QR Simulator dengan Sintesis Suara (Web Audio API)**, **Ekspor Laporan Excel**, serta **Offline Fallback Engine** otomatis jika koneksi database XAMPP terputus.

---

## 🌟 Fitur Utama Aplikasi

### 1. 🔐 Manajemen Otorisasi Pengguna & Keamanan Ketat
* **Dua Peran Pengguna (Multi-Role):**
  * **Admin / Owner:** Memiliki akses penuh ke Dashboard monitoring, Kelola Barang, Transaksi Masuk/Keluar, Laporan Stok Bulanan, dan Manajemen Akun Staf.
  * **Staf Gudang:** Akses khusus terbatas untuk mencatat transaksi Barang Masuk & Barang Keluar, serta cetak stiker QR Code. Sidebar Dashboard dan Manajemen Akun disembunyikan secara otomatis demi keamanan.
* **Bypass Protection:** Proteksi halaman ketat menggunakan verifikasi session PHP (`PHPSESSID`). Jika dicoba akses langsung tanpa login, otomatis dialihkan ke login.
* **Bfcache Bypass Redirect:** Mengatasi celah tombol *Back/Forward* browser. Saat pengguna melakukan logout, menekan tombol *Back* pada browser tidak akan bisa mem-bypass halaman karena sistem akan memaksa reload dan melakukan validasi ulang.
* **No-Cache API Headers:** Endpoint dilindungi dengan header HTTP anti-cache guna mencegah browser menyimpan data kredensial sensitif.

### 2. 📦 Kelola Data Barang Master (Toko Bangunan Realistis)
* **Form Simetris 2-Kolom Premium:** Input data barang disederhanakan menjadi 8 field praktis yang disesuaikan dengan toko bangunan (menghilangkan dimensi/berat teoretis yang rumit menjadi otomatis).
* **Auto-Generated SKU/Kode Barang:** Sistem secara otomatis menyusun kode barang (`BRG-00X`) secara cerdas jika kolom SKU dikosongkan oleh pengguna.
* **Dynamic Relational Kategori:** Ketika barang baru disimpan dengan nama kategori baru, sistem backend secara otomatis mendaftarkan kategori tersebut ke tabel relasi database `kategori` tanpa memerlukan input manual di halaman terpisah.

### 3. 🔄 Transaksi Logistik Cerdas (Barang Masuk & Keluar)
* **Double-Layer Stock Validation:** Keamanan berlapis yang mencegah pencatatan transaksi Barang Keluar jika stok yang tersedia di gudang tidak mencukupi.
* **Dynamic Autocomplete Supplier:** Form input nama Supplier dilengkapi rekomendasi otomatis (*Auto-Suggest Dropdown*) dari database. Jika Anda menuliskan nama baru, sistem otomatis menambahkannya ke tabel `supplier` di phpMyAdmin.
* **Database Relasional Utuh:** Seluruh transaksi tercatat secara relasional terpisah ke tabel detail transaksi (`detailmasuk`, `detailkeluar`) dengan dukungan integritas data referensial (*ON DELETE CASCADE*).

### 4. 🖨️ Fitur Interaktif & Ekspor Laporan
* **QR Code Sticker Generator:** Membuat kode QR unik secara real-time untuk setiap barang menggunakan API eksternal yang siap dicetak sebagai stiker fisik.
* **Camera Laser Scanner Simulator:** Simulasi pemindaian stiker QR barang menggunakan kamera yang dilengkapi dengan efek suara **Beep laser sintetis (Web Audio API)** untuk mempercepat input transaksi.
* **Ekspor Laporan Excel:** Unduh Laporan Stok Bulanan secara instan dalam format `.xls` rapi yang siap dibuka di Microsoft Excel.

### 5. 🛜 Offline Fallback Engine (Robust Client-Side Simulation)
* Jika server XAMPP / MySQL mendadak offline saat presentasi, aplikasi tidak akan crash. JavaScript akan mendeteksi status offline dan secara mulus mengalihkan seluruh mesin operasional (penyimpanan barang, login, dan pencatatan transaksi) menggunakan simulasi memori **`localStorage` browser**.

---

## 🛠️ Spesifikasi Teknologi
* **Frontend:** HTML5 (Struktur Semantik), CSS3 Vanilla (Glassmorphism & Neon Dark Mode Accent), JavaScript ES6 (Asynchronous Fetch & State Engine).
* **Backend:** PHP 8.x (Prepared Statements, Session Protection, OOP PDO/MySQLi).
* **Database:** MySQL / MariaDB (Relasi Terbuka, Foreign Key Integrity, Cascade Delete).
* **Library Eksternal:** FontAwesome 6.4 (Ikonografi), Google Fonts Inter (Tipografi).

---

## 📂 Struktur Direktori Projek
```text
UdCitraPerdana/
│
├── api/                             # Backend API (PHP)
│   ├── auth/                        # Kredensial & Session
│   │   ├── login.php
│   │   ├── logout.php
│   │   └── me.php
│   ├── barang/                      # CRUD Barang
│   │   ├── read.php
│   │   ├── save.php
│   │   └── delete.php
│   ├── transaksi/                   # Transaksi Logistik
│   │   ├── masuk.php
│   │   └── keluar.php
│   └── laporan/                     # Rolling stock bulanan
│       └── read_stok.php
│
├── assets/                          # Static Assets
│   ├── css/
│   │   └── style.css                # Desain UI Premium & Dark Mode
│   ├── js/
│   │   └── script.js                # State Engine & Client controller
│   └── images/                      # Logo & Ilustrasi
│
├── config/                          # Koneksi Database
│   ├── db.php
│   └── koneksi.php
│
├── database/                        # Database Script
│   └── ud_citra_perdana.sql         # Struktur skema & data awal
│
├── views/                           # Tampilan Halaman HTML
│   ├── auth/
│   │   └── login.html
│   ├── barang/
│   │   └── data_barang.html
│   ├── transaksi/
│   │   ├── barang_masuk.html
│   │   └── barang_keluar.html
│   ├── laporan/
│   │   └── laporan_stok.html
│   └── user/
│       └── manajemen_akun.html
│
├── index.html                       # Dashboard Utama (Admin)
└── README.md                        # Panduan Dokumentasi
```

---

## ⚙️ Petunjuk Instalasi & Menjalankan Projek

### 1. Persiapan Environment
1. Pastikan Anda telah menginstal **XAMPP** (versi disarankan dengan PHP 8.x ke atas).
2. Aktifkan modul **Apache** dan **MySQL** pada XAMPP Control Panel Anda.

### 2. Pemasangan Source Code
1. Pindahkan folder `UdCitraPerdana` ke dalam direktori lokal server Apache Anda:
   * **Windows:** `C:\xampp\htdocs\Projek\UdCitraPerdana`

### 3. Konfigurasi Database (phpMyAdmin)
1. Buka browser Anda dan akses **phpMyAdmin** di alamat: `http://localhost/phpmyadmin/`
2. Buat database baru dengan nama: **`ud_citra_perdana`**
3. Klik database `ud_citra_perdana` tersebut, masuk ke tab **Import** (Impor).
4. Pilih file database yang sudah disediakan di folder projek:
   * `C:\xampp\htdocs\Projek\UdCitraPerdana\database\ud_citra_perdana.sql`
5. Klik **Import / Go** di pojok kanan bawah.
6. *Database Anda sekarang telah terisi dengan struktur tabel relasional lengkap beserta akun default, kategori, dan master supplier.*

---

## 🔑 Kredensial Akun Pengujian

Aplikasi ini siap diuji menggunakan akun-akun bawaan di bawah ini:

| Peran Pengguna | Username | Password | Deskripsi Otoritas |
| :--- | :--- | :--- | :--- |
| **Admin / Owner** | `admin` | `admin123` | Akses penuh dashboard, barang, transaksi, laporan & akun |
| **Staf Gudang** | `budi_gudang` | `budi123` | Akses terbatas hanya kelola transaksi masuk & keluar |

---
*Dikembangkan dengan penuh dedikasi untuk keindahan visual dan integritas data terbaik.*  
**UD Citra Perdana © 2026**
