// Fungsi Global untuk Toast Notification
window.showToast = function(message, type = 'success') {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle');
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
};

const getBaseUrl = () => {
    const path = window.location.pathname;
    const lowerPath = path.toLowerCase();
    const searchStr = '/projek/udcitraperdana';
    const index = lowerPath.indexOf(searchStr);
    
    if (index !== -1) {
        return path.substring(0, index + searchStr.length);
    }
    
    // Fallback: hitung relatif berdasarkan kedalaman direktori saat ini jika diakses via file://
    if (path.includes('/views/')) {
        if (path.includes('/views/auth/') || path.includes('/views/barang/') || path.includes('/views/laporan/') || path.includes('/views/transaksi/') || path.includes('/views/user/')) {
            return '../..';
        }
        return '..';
    }
    return '.';
};

const BASE_URL = getBaseUrl();

// ==========================================================
// CENTRALIZED STATE ENGINE (CLIENT-SIDE DATABASE MOCK)
// ==========================================================
const DB = {
    // Membaca data dari localStorage dengan fallback data default
    get(key, defaultData) {
        const data = localStorage.getItem(key);
        if (!data) {
            localStorage.setItem(key, JSON.stringify(defaultData));
            return defaultData;
        }
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error(`Error parsing data for ${key}:`, e);
            return defaultData;
        }
    },
    
    // Menyimpan data ke localStorage
    set(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    },
    
    // Inisialisasi Database
    init() {
        // Bersihkan data dummy lama sekali saja agar browser klien bersih
        if (!localStorage.getItem('ud_cleaned_dummy')) {
            localStorage.removeItem('ud_barang');
            localStorage.removeItem('ud_transaksi_masuk');
            localStorage.removeItem('ud_transaksi_keluar');
            localStorage.setItem('ud_cleaned_dummy', 'true');
        }

        // Melakukan migrasi database lokal jika ada skema lama (seperti role Manajer atau Admin)
        const currentUsers = localStorage.getItem('ud_users');
        if (currentUsers && (currentUsers.includes('"Manajer"') || currentUsers.includes('"Admin"'))) {
            localStorage.removeItem('ud_users');
            localStorage.removeItem('ud_session');
        }

        // Melakukan migrasi database barang jika tidak ada atribut baru (seperti harga_beli)
        const currentBarang = localStorage.getItem('ud_barang');
        if (currentBarang && !currentBarang.includes('harga_beli')) {
            localStorage.removeItem('ud_barang');
            localStorage.removeItem('ud_transaksi_masuk');
            localStorage.removeItem('ud_transaksi_keluar');
        }

        this.get('ud_barang', []);
        
        this.get('ud_transaksi_masuk', []);
        
        this.get('ud_transaksi_keluar', []);
        
        this.get('ud_users', [
            { id: 1, nama: 'Administrator Super', username: 'admin', role: 'Admin / Owner' },
            { id: 2, nama: 'Budi Santoso', username: 'budi_gudang', role: 'Staf Gudang' }
        ]);
    }
};

// Panggil init database segera
DB.init();

let USER_SESSION = null;

// Penanganan tombol Back / Forward browser agar halaman di-reload riil (mengatasi bfcache)
window.addEventListener('pageshow', function (event) {
    const historyTraversal = event.persisted || 
                             (typeof window.performance != 'undefined' && 
                              (window.performance.navigation.type === 2 || 
                               (performance.getEntriesByType && 
                                performance.getEntriesByType('navigation')[0] && 
                                performance.getEntriesByType('navigation')[0].type === 'back_forward')));
    if (historyTraversal) {
        window.location.reload();
    }
});
document.addEventListener('DOMContentLoaded', async function () {
    let isServerOnline = false;
    // Cek Session (PHP Backend)
    try {
        const response = await fetch(BASE_URL + '/api/auth/me.php', { credentials: 'same-origin' });
        const data = await response.json();
        isServerOnline = true;
        if (data.status === 'success') {
            USER_SESSION = data.data;
            // Sinkronkan ke local storage agar sejalan
            localStorage.setItem('ud_session', JSON.stringify(USER_SESSION));
        } else {
            // Server online, tapi sesi kosong/kedaluwarsa -> cek apakah ada sesi mock lokal
            const localSessionStr = localStorage.getItem('ud_session');
            let isLocalMock = false;
            if (localSessionStr) {
                try {
                    const localSession = JSON.parse(localSessionStr);
                    if (localSession && localSession.isMock) {
                        isLocalMock = true;
                        USER_SESSION = localSession;
                    }
                } catch(e) {}
            }
            
            if (!isLocalMock) {
                // Server online, dan tidak ada mock -> hapus sesi lokal untuk keamanan
                localStorage.removeItem('ud_session');
                USER_SESSION = null;
            }
        }
    } catch (error) {
        console.warn("Gagal mengecek session backend (PHP/Database mati), menggunakan local fallback:", error);
    }

    // Fallback ke LocalStorage HANYA jika backend offline (Server mati)
    if (!isServerOnline && !USER_SESSION) {
        const localSession = localStorage.getItem('ud_session');
        if (localSession) {
            try {
                USER_SESSION = JSON.parse(localSession);
            } catch (e) {
                console.error("Gagal membaca session lokal:", e);
            }
        }
    }

    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.includes('login.html') || currentPath.includes('register.html');

    if (!USER_SESSION && !isLoginPage) {
        window.location.href = BASE_URL + '/views/auth/login.html';
        return;
    }

    if (USER_SESSION && isLoginPage) {
        if (USER_SESSION.role === 'Staf Gudang') {
            window.location.href = BASE_URL + '/views/barang/data_barang.html';
        } else {
            window.location.href = BASE_URL + '/index.html';
        }
        return;
    }

    // Update UI dengan data User
    if (USER_SESSION) {
        const profileBtn = document.getElementById('userProfileBtn');
        const dropdownMenu = document.getElementById('userDropdownMenu');
        
        if (profileBtn) {
            profileBtn.querySelector('span').textContent = USER_SESSION.nama_lengkap;
        }
        
        if (dropdownMenu) {
            dropdownMenu.querySelector('.dropdown-user-name').textContent = USER_SESSION.nama_lengkap;
            dropdownMenu.querySelector('.dropdown-user-role').textContent = USER_SESSION.role;
            
            // Logout Action
            const logoutBtn = dropdownMenu.querySelector('.logout');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', async function(e) {
                    e.preventDefault();
                    try {
                        await fetch(BASE_URL + '/api/auth/logout.php');
                    } catch(err) {}
                    localStorage.removeItem('ud_session');
                    window.location.href = BASE_URL + '/views/auth/login.html';
                });
            }
        }
    }

    // Enforce role-based menu visibility based on Use Case Diagram (2 Roles)
    if (USER_SESSION) {
        if (USER_SESSION.role === 'Staf Gudang') {
            // 1. Hide "Dashboard" link from sidebar
            const dashboardLinks = document.querySelectorAll('a[href*="index.html"]');
            dashboardLinks.forEach(link => {
                const li = link.closest('li');
                if (li) {
                    li.style.display = 'none';
                }
            });

            // 2. Hide "Manajemen Akun" link from sidebar
            const manajemenAkunLinks = document.querySelectorAll('a[href*="manajemen_akun.html"]');
            manajemenAkunLinks.forEach(link => {
                const li = link.closest('li');
                if (li) {
                    li.style.display = 'none';
                    // Hide the preceding menu label "Pengaturan"
                    const prev = li.previousElementSibling;
                    if (prev && prev.classList.contains('menu-label')) {
                        prev.style.display = 'none';
                    }
                }
            });
            
            // 3. Redirect if they try to access index.html or manajemen_akun.html manually
            const onIndexPage = currentPath.endsWith('/') || currentPath.endsWith('index.html') || currentPath.includes('index.html');
            if (onIndexPage || currentPath.includes('manajemen_akun.html')) {
                window.location.href = BASE_URL + '/views/barang/data_barang.html';
                return;
            }
        }
    }

    // Toggle Password Visibility untuk Login & Register
    const togglePasswordElements = document.querySelectorAll('.toggle-password');
    togglePasswordElements.forEach(toggle => {
        toggle.addEventListener('click', function () {
            // Cari input di sebelahnya
            const input = this.previousElementSibling;
            if (input && (input.tagName === 'INPUT')) {
                const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                input.setAttribute('type', type);
                this.classList.toggle('fa-eye');
                this.classList.toggle('fa-eye-slash');
            }
        });
    });

    // Login Form Submit Logic (Fetch ke PHP API + Mock Mode)
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const btn = this.querySelector('button');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Memproses...';
            btn.style.opacity = '0.8';
            btn.disabled = true;

            const formData = new FormData(this);
            const usernameInput = formData.get('username');
            const passwordInput = formData.get('password');

            // Fungsi pembantu untuk memproses mock login jika API gagal
            const tryMockLogin = () => {
                if ((usernameInput === 'admin' && passwordInput === 'admin123') || 
                    (usernameInput === 'budi_gudang' && passwordInput === 'budi123')) {
                    
                    let nama = 'Administrator Super';
                    let role = 'Admin / Owner';
                    if (usernameInput === 'budi_gudang') {
                        nama = 'Budi Santoso';
                        role = 'Staf Gudang';
                    }
                    
                    const mockSession = {
                        id_user: usernameInput === 'admin' ? 1 : 2,
                        username: usernameInput,
                        nama_lengkap: nama,
                        role: role,
                        isMock: true
                    };
                    
                    localStorage.setItem('ud_session', JSON.stringify(mockSession));
                    showToast('Login berhasil! (Mode Simulasi Offline)', 'success');
                    
                    setTimeout(() => {
                        if (role === 'Staf Gudang') {
                            window.location.href = BASE_URL + '/views/barang/data_barang.html';
                        } else {
                            window.location.href = BASE_URL + '/index.html';
                        }
                    }, 1000);
                    return true;
                }
                return false;
            };

            fetch(BASE_URL + '/api/auth/login.php', {
                method: 'POST',
                body: formData,
                credentials: 'same-origin'
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    // Simpan ke local storage juga agar backend-independent
                    localStorage.setItem('ud_session', JSON.stringify({
                        id_user: data.user.id_user || 1,
                        username: usernameInput,
                        nama_lengkap: data.user.nama,
                        role: data.user.role
                    }));
                    showToast(data.message, 'success');
                    setTimeout(() => {
                        if (data.user.role === 'Staf Gudang' || data.user.role === 'Staff Gudang') {
                            window.location.href = BASE_URL + '/views/barang/data_barang.html';
                        } else {
                            window.location.href = BASE_URL + '/index.html';
                        }
                    }, 1000);
                } else {
                    // Coba mock login jika database kosong
                    if (tryMockLogin()) {
                        return;
                    }
                    showToast(data.message, 'error');
                    btn.innerHTML = originalText;
                    btn.style.opacity = '1';
                    btn.disabled = false;
                }
            })
            .catch(error => {
                console.warn("Koneksi API gagal, menggunakan simulasi offline:", error);
                if (tryMockLogin()) {
                    return;
                } else {
                    showToast('Username atau password salah! (Gunakan admin / admin123)', 'error');
                    btn.innerHTML = originalText;
                    btn.style.opacity = '1';
                    btn.disabled = false;
                }
            });
        });
    }

    // Sidebar Toggle & Mobile Responsiveness
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');

    if (sidebar) {
        // Buat overlay secara dinamis jika belum ada untuk mobile drawer
        let overlay = document.getElementById('sidebarOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'sidebarOverlay';
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
        }

        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.innerWidth <= 768) {
                    sidebar.classList.toggle('active');
                    overlay.classList.toggle('active');
                } else {
                    sidebar.classList.toggle('collapsed');
                }
            });
        }

        // Klik overlay untuk menutup sidebar mobile
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });

        // Klik link menu di sidebar mobile juga otomatis menutup sidebar
        const menuLinks = sidebar.querySelectorAll('.sidebar-menu a');
        menuLinks.forEach(link => {
            link.addEventListener('click', () => {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            });
        });
    }

    // ==========================================================
    // RENDERING ENGINE (DYNAMIC TABLE LOOPS - OFFLINE STATE)
    // ==========================================================

    window.renderBarangTable = async function(searchQuery = '', categoryFilter = '') {
        const tableBody = document.getElementById('barangTableBody');
        if (!tableBody) return;
        
        let barangList = [];
        try {
            const response = await fetch(BASE_URL + '/api/barang/read.php');
            const data = await response.json();
            if (data.status === 'success') {
                barangList = data.data;
                DB.set('ud_barang', barangList); // Sinkronisasi cache lokal
            } else {
                barangList = DB.get('ud_barang', []);
            }
        } catch (e) {
            console.warn("Gagal terhubung ke API barang, menggunakan cache lokal:", e);
            barangList = DB.get('ud_barang', []);
        }
        
        tableBody.innerHTML = '';
        
        const filtered = barangList.filter(item => {
            const matchesSearch = item.nama_barang.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  item.kode_barang.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = categoryFilter === '' || item.kategori === categoryFilter;
            return matchesSearch && matchesCategory;
        });
        
        if (filtered.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 20px;">Data barang tidak ditemukan</td></tr>';
            return;
        }
        
        filtered.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.kode_barang}</td>
                <td style="font-weight: 500;">${item.nama_barang}</td>
                <td><span class="badge badge-info">${item.kategori}</span></td>
                <td><span class="badge" style="background: rgba(99, 102, 241, 0.1); color: #6366f1; font-weight: 600; font-family: monospace;">${item.lokasi_rak || '-'}</span></td>
                <td><strong style="color: ${item.stok <= (item.stok_minimum || 50) ? '#ef4444' : 'inherit'};">${item.stok}</strong></td>
                <td>Rp ${(item.harga_beli || 0).toLocaleString('id-ID')}</td>
                <td>Rp ${item.harga.toLocaleString('id-ID')}</td>
                <td>
                    <button class="btn-icon" style="color: #6366f1; background: rgba(99, 102, 241, 0.1);" onclick="showQrCode('${item.kode_barang}', '${item.nama_barang}')" title="Tampilkan QR Code"><i class="fas fa-qrcode"></i></button>
                    <button class="btn-icon btn-edit" onclick="openModal('edit', '${item.kode_barang}')" title="Edit Data"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon btn-delete" onclick="deleteBarang('${item.kode_barang}')" title="Hapus Data"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    };

    window.renderBarangMasukTable = async function(searchQuery = '', dateFilter = '') {
        const masukTableBody = document.getElementById('barangMasukTableBody');
        if (!masukTableBody) return;
        
        let masukList = [];
        try {
            const response = await fetch(BASE_URL + '/api/transaksi/masuk.php');
            const data = await response.json();
            if (data.status === 'success') {
                masukList = data.data;
                DB.set('ud_transaksi_masuk', masukList); // Sinkronisasi cache
            } else {
                masukList = DB.get('ud_transaksi_masuk', []);
            }
        } catch (e) {
            console.warn("Gagal terhubung ke API transaksi masuk, menggunakan cache lokal:", e);
            masukList = DB.get('ud_transaksi_masuk', []);
        }
        
        masukTableBody.innerHTML = '';
        
        const filtered = masukList.filter(item => {
            const matchesSearch = (item.ref && item.ref.toLowerCase().includes(searchQuery.toLowerCase())) || 
                                  (item.po && item.po.toLowerCase().includes(searchQuery.toLowerCase())) || 
                                  (item.supplier && item.supplier.toLowerCase().includes(searchQuery.toLowerCase())) || 
                                  (item.barang && item.barang.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesDate = dateFilter === '' || item.tanggal === dateFilter;
            return matchesSearch && matchesDate;
        });
        
        if (filtered.length === 0) {
            masukTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 20px;">Data transaksi masuk tidak ditemukan</td></tr>';
            return;
        }
        
        filtered.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.tanggal}</td>
                <td style="font-weight: 600; font-family: monospace; color: var(--primary);">${item.po || '-'}</td>
                <td style="font-weight: 500;">${item.ref}</td>
                <td>${item.supplier}</td>
                <td>${item.barang}</td>
                <td><span class="badge" style="background-color: #d1fae5; color: #059669; font-weight: 600;">+ ${item.qty}</span></td>
                <td><span class="badge ${item.qc && item.qc.includes('Baik') ? 'badge-success' : (item.qc && item.qc.includes('Rusak') ? 'badge-danger' : 'badge-warning')}">${item.qc || 'Baik (Lolos QC)'}</span></td>
                <td>
                    <button class="btn-icon btn-edit" onclick="showToast('PO: ' + '${item.po || '-'}' + ' | Ref: ' + '${item.ref}' + ' | QC: ' + '${item.qc || '-'}', 'info')" title="Detail"><i class="fas fa-eye"></i></button>
                    <button class="btn-icon btn-delete" onclick="deleteTransaksiMasuk(${item.id_masuk})" title="Hapus Data"><i class="fas fa-trash"></i></button>
                </td>
            `;
            masukTableBody.appendChild(row);
        });
    };

    window.renderBarangKeluarTable = async function(searchQuery = '', dateFilter = '') {
        const keluarTableBody = document.getElementById('barangKeluarTableBody');
        if (!keluarTableBody) return;
        
        let keluarList = [];
        try {
            const response = await fetch(BASE_URL + '/api/transaksi/keluar.php');
            const data = await response.json();
            if (data.status === 'success') {
                keluarList = data.data;
                DB.set('ud_transaksi_keluar', keluarList); // Sinkronisasi cache
            } else {
                keluarList = DB.get('ud_transaksi_keluar', []);
            }
        } catch (e) {
            console.warn("Gagal terhubung ke API transaksi keluar, menggunakan cache lokal:", e);
            keluarList = DB.get('ud_transaksi_keluar', []);
        }
        
        keluarTableBody.innerHTML = '';
        
        const filtered = keluarList.filter(item => {
            const matchesSearch = (item.ref && item.ref.toLowerCase().includes(searchQuery.toLowerCase())) || 
                                  (item.tujuan && item.tujuan.toLowerCase().includes(searchQuery.toLowerCase())) || 
                                  (item.barang && item.barang.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesDate = dateFilter === '' || item.tanggal === dateFilter;
            return matchesSearch && matchesDate;
        });
        
        if (filtered.length === 0) {
            keluarTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 20px;">Data transaksi keluar tidak ditemukan</td></tr>';
            return;
        }
        
        filtered.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.tanggal}</td>
                <td style="font-weight: 500;">${item.ref}</td>
                <td>${item.tujuan}</td>
                <td>${item.barang}</td>
                <td><span class="badge" style="background-color: #fee2e2; color: #e11d48; font-weight: 600;">- ${item.qty}</span></td>
                <td><span class="badge badge-info" style="background: rgba(99, 102, 241, 0.1); color: #6366f1;">${item.tujuan_keluar || 'Penjualan / Distribusi'}</span></td>
                <td>
                    <button class="btn-icon btn-edit" onclick="showToast('Ref: ' + '${item.ref}' + ' | Jenis: ' + '${item.tujuan_keluar || '-'}', 'info')" title="Detail"><i class="fas fa-eye"></i></button>
                    <button class="btn-icon btn-delete" onclick="deleteTransaksiKeluar(${item.id_keluar})" title="Hapus Data"><i class="fas fa-trash"></i></button>
                </td>
            `;
            keluarTableBody.appendChild(row);
        });
    };

    window.renderLaporanStokTable = async function(searchQuery = '', categoryFilter = '', monthFilter = '') {
        const laporanStokTableBody = document.getElementById('laporanStokTableBody');
        if (!laporanStokTableBody) return;
        
        let reportData = [];
        let isOffline = false;
        
        try {
            const response = await fetch(BASE_URL + '/api/laporan/read_stok.php?month=' + monthFilter);
            const data = await response.json();
            if (data.status === 'success') {
                reportData = data.data;
            } else {
                isOffline = true;
            }
        } catch (e) {
            console.warn("Gagal menghubungi API laporan stok, menggunakan fallback offline local:", e);
            isOffline = true;
        }
        
        laporanStokTableBody.innerHTML = '';
        
        if (isOffline) {
            // --- OFFLINE FALLBACK CALCULATION ---
            const barangList = DB.get('ud_barang', []);
            const masukList = DB.get('ud_transaksi_masuk', []);
            const keluarList = DB.get('ud_transaksi_keluar', []);
            
            const filtered = barangList.filter(item => {
                const matchesSearch = item.nama_barang.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                       item.kode_barang.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesCategory = categoryFilter === '' || item.kategori === categoryFilter;
                return matchesSearch && matchesCategory;
            });
            
            if (filtered.length === 0) {
                laporanStokTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 20px;">Laporan tidak ditemukan</td></tr>';
                return;
            }
            
            filtered.forEach(item => {
                const itemMasuk = masukList.filter(t => t.barang === item.nama_barang && (monthFilter === '' || t.tanggal.startsWith(monthFilter)));
                const itemKeluar = keluarList.filter(t => t.barang === item.nama_barang && (monthFilter === '' || t.tanggal.startsWith(monthFilter)));
                const masukQty = itemMasuk.reduce((sum, t) => sum + parseInt(t.qty || 0), 0);
                const keluarQty = itemKeluar.reduce((sum, t) => sum + parseInt(t.qty || 0), 0);
                const akhir = parseInt(item.stok || 0);
                const awal = akhir - masukQty + keluarQty;
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.kode_barang}</td>
                    <td style="font-weight: 500;">${item.nama_barang}</td>
                    <td><span class="badge badge-info">${item.kategori}</span></td>
                    <td style="text-align: center;">${awal}</td>
                    <td style="text-align: center; color: #059669; font-weight: 600;">+ ${masukQty}</td>
                    <td style="text-align: center; color: #e11d48; font-weight: 600;">- ${keluarQty}</td>
                    <td style="text-align: center; font-weight: bold; background-color: #f8fafc;">${akhir}</td>
                `;
                laporanStokTableBody.appendChild(row);
            });
        } else {
            // --- ONLINE REAL-TIME RENDER ---
            const filtered = reportData.filter(item => {
                const matchesSearch = item.nama_barang.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                       item.kode_barang.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesCategory = categoryFilter === '' || item.kategori === categoryFilter;
                return matchesSearch && matchesCategory;
            });
            
            if (filtered.length === 0) {
                laporanStokTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 20px;">Laporan tidak ditemukan</td></tr>';
                return;
            }
            
            filtered.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.kode_barang}</td>
                    <td style="font-weight: 500;">${item.nama_barang}</td>
                    <td><span class="badge badge-info">${item.kategori}</span></td>
                    <td style="text-align: center;">${item.awal}</td>
                    <td style="text-align: center; color: #059669; font-weight: 600;">+ ${item.masuk}</td>
                    <td style="text-align: center; color: #e11d48; font-weight: 600;">- ${item.keluar}</td>
                    <td style="text-align: center; font-weight: bold; background-color: #f8fafc;">${item.akhir}</td>
                `;
                laporanStokTableBody.appendChild(row);
            });
        }
    };

    window.renderUserTable = async function(searchQuery = '') {
        const manajemenAkunTableBody = document.getElementById('manajemenAkunTableBody');
        if (!manajemenAkunTableBody) return;
        
        let userList = [];
        let isOffline = false;
        
        try {
            const response = await fetch(BASE_URL + '/api/user/read.php');
            const data = await response.json();
            if (data.status === 'success') {
                userList = data.data;
                DB.set('ud_users', userList); // sync local cache
            } else {
                isOffline = true;
            }
        } catch (e) {
            console.warn("Gagal terhubung ke API pengguna, menggunakan cache lokal:", e);
            isOffline = true;
        }
        
        if (isOffline) {
            userList = DB.get('ud_users', []);
        }
        
        manajemenAkunTableBody.innerHTML = '';
        
        const filtered = userList.filter(user => {
            return user.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
                   user.username.toLowerCase().includes(searchQuery.toLowerCase());
        });
        
        if (filtered.length === 0) {
            manajemenAkunTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">Pengguna tidak ditemukan</td></tr>';
            return;
        }
        
        filtered.forEach(user => {
            const roleBadge = user.role === 'Admin / Owner' ? 'badge-danger' : 'badge-success';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>USR-${String(user.id).padStart(3, '0')}</td>
                <td style="font-weight: 500;">${user.nama}</td>
                <td>${user.username}</td>
                <td><span class="badge ${roleBadge}">${user.role}</span></td>
                <td>
                    <button class="btn-icon btn-edit" onclick="openModal('editAkun', '${user.id}')" title="Edit Pengguna"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon btn-delete" onclick="deleteUser('${user.id}')" title="Hapus Pengguna"><i class="fas fa-trash"></i></button>
                </td>
            `;
            manajemenAkunTableBody.appendChild(row);
        });
    };

    window.renderDashboard = function() {
        const cards = document.querySelector('.dashboard-cards');
        if (!cards) return;
        
        const barangList = DB.get('ud_barang', []);
        const masukList = DB.get('ud_transaksi_masuk', []);
        const keluarList = DB.get('ud_transaksi_keluar', []);
        
        const totalBarangCount = barangList.length;
        const totalMasukQty = masukList.reduce((sum, t) => sum + parseInt(t.qty || 0), 0);
        const totalKeluarQty = keluarList.reduce((sum, t) => sum + parseInt(t.qty || 0), 0);
        const stokMenipisList = barangList.filter(item => item.stok <= (item.stok_minimum || 50));
        const stokMenipisCount = stokMenipisList.length;
        
        const cardElements = cards.querySelectorAll('.card');
        if (cardElements.length >= 4) {
            cardElements[0].querySelector('.card-info h3').textContent = totalBarangCount;
            cardElements[1].querySelector('.card-info h3').textContent = totalMasukQty;
            cardElements[2].querySelector('.card-info h3').textContent = totalKeluarQty;
            cardElements[3].querySelector('.card-info h3').textContent = stokMenipisCount;
        }
        
        const monitoringCards = document.querySelectorAll('.monitoring-card');
        if (monitoringCards.length >= 3) {
            const kritisCard = monitoringCards[0];
            kritisCard.querySelector('.monitoring-header .badge-danger').textContent = stokMenipisCount;
            const kritisListContainer = kritisCard.querySelector('.monitoring-list');
            kritisListContainer.innerHTML = '';
            if (stokMenipisCount === 0) {
                kritisListContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 14px; padding: 10px 0;">Aman! Tidak ada stok kritis.</div>';
            } else {
                stokMenipisList.forEach(item => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'product-item';
                    itemDiv.innerHTML = `
                        <span class="product-name">${item.nama_barang}</span>
                        <span class="product-stock" style="color: #e11d48; font-weight: 600;">${item.stok} ${item.satuan}</span>
                    `;
                    kritisListContainer.appendChild(itemDiv);
                });
            }
            
            const populerCard = monitoringCards[1];
            const itemKeluarTotals = {};
            barangList.forEach(b => { itemKeluarTotals[b.nama_barang] = 0; });
            keluarList.forEach(t => {
                if (itemKeluarTotals[t.barang] !== undefined) {
                    itemKeluarTotals[t.barang] += parseInt(t.qty || 0);
                }
            });
            const sortedPopuler = [...barangList].sort((a, b) => itemKeluarTotals[b.nama_barang] - itemKeluarTotals[a.nama_barang]);
            populerCard.querySelector('.monitoring-header .badge-info').textContent = sortedPopuler.length;
            const populerListContainer = populerCard.querySelector('.monitoring-list');
            populerListContainer.innerHTML = '';
            sortedPopuler.slice(0, 3).forEach(item => {
                const totalOut = itemKeluarTotals[item.nama_barang];
                const itemDiv = document.createElement('div');
                itemDiv.className = 'product-item';
                itemDiv.innerHTML = `
                    <span class="product-name">${item.nama_barang}</span>
                    <span class="product-stock" style="color: #059669; font-weight: 600;">Terjual: ${totalOut} ${item.satuan}</span>
                `;
                populerListContainer.appendChild(itemDiv);
            });
            
            const aktivitasCard = monitoringCards[2];
            const combinedActivities = [];
            
            masukList.forEach(t => {
                combinedActivities.push({
                    type: 'masuk',
                    text: `Penerimaan ${t.qty} ${t.barang} dari ${t.supplier}`,
                    time: t.tanggal,
                    icon: 'fa-arrow-down',
                    color: '#10b981'
                });
            });
            
            keluarList.forEach(t => {
                combinedActivities.push({
                    type: 'keluar',
                    text: `Pengeluaran ${t.qty} ${t.barang} ke ${t.tujuan}`,
                    time: t.tanggal,
                    icon: 'fa-arrow-up',
                    color: '#ef4444'
                });
            });
            
            combinedActivities.sort((a, b) => b.time.localeCompare(a.time));
            aktivitasCard.querySelector('.monitoring-header .badge-success').textContent = combinedActivities.length;
            
            const activityListContainer = aktivitasCard.querySelector('.activity-list');
            activityListContainer.innerHTML = '';
            if (combinedActivities.length === 0) {
                activityListContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 14px; padding: 10px 0;">Belum ada aktivitas transaksi.</div>';
            } else {
                combinedActivities.slice(0, 3).forEach(act => {
                    const actDiv = document.createElement('div');
                    actDiv.className = 'activity-item';
                    actDiv.innerHTML = `
                        <i class="fas ${act.icon}" style="color:${act.color}; font-size:18px; width:24px; text-align:center;"></i>
                        <div class="activity-info">
                            <span class="activity-text" style="font-weight: 500;">${act.text}</span>
                            <span class="activity-time">${act.time}</span>
                        </div>
                    `;
                    activityListContainer.appendChild(actDiv);
                });
            }
        }
    };

    // Bindings untuk halaman
    if (document.getElementById('barangTableBody')) {
        renderBarangTable();
        const searchInput = document.querySelector('.search-box input');
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                renderBarangTable(this.value);
            });
        }
    }

    if (document.getElementById('barangMasukTableBody')) {
        renderBarangMasukTable();
        const searchInput = document.querySelector('.search-box input');
        const dateInput = document.querySelector('.table-header-actions input[type="date"]');
        const trigger = () => {
            renderBarangMasukTable(searchInput ? searchInput.value : '', dateInput ? dateInput.value : '');
        };
        if (searchInput) searchInput.addEventListener('input', trigger);
        if (dateInput) dateInput.addEventListener('change', trigger);
    }

    if (document.getElementById('barangKeluarTableBody')) {
        renderBarangKeluarTable();
        const searchInput = document.querySelector('.search-box input');
        const dateInput = document.querySelector('.table-header-actions input[type="date"]');
        const trigger = () => {
            renderBarangKeluarTable(searchInput ? searchInput.value : '', dateInput ? dateInput.value : '');
        };
        if (searchInput) searchInput.addEventListener('input', trigger);
        if (dateInput) dateInput.addEventListener('change', trigger);
    }

    if (document.getElementById('laporanStokTableBody')) {
        renderLaporanStokTable();
        const searchInput = document.querySelector('.search-box input');
        const categorySelect = document.querySelector('.table-header-actions select');
        const monthInput = document.querySelector('.table-header-actions input[type="month"]');
        const trigger = () => {
            renderLaporanStokTable(
                searchInput ? searchInput.value : '', 
                categorySelect ? categorySelect.value : '', 
                monthInput ? monthInput.value : ''
            );
        };
        if (searchInput) searchInput.addEventListener('input', trigger);
        if (categorySelect) categorySelect.addEventListener('change', trigger);
        if (monthInput) monthInput.addEventListener('change', trigger);
    }

    if (document.getElementById('manajemenAkunTableBody')) {
        renderUserTable();
        const searchInput = document.querySelector('.search-box input');
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                renderUserTable(this.value);
            });
        }
    }

    if (document.querySelector('.dashboard-cards')) {
        renderDashboard();
    }

    // User Profile Dropdown Toggle
    const userProfileBtn = document.getElementById('userProfileBtn');
    const userDropdownMenu = document.getElementById('userDropdownMenu');

    if (userProfileBtn && userDropdownMenu) {
        userProfileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            userDropdownMenu.classList.toggle('active');
        });

        document.addEventListener('click', function(e) {
            if (!userDropdownMenu.contains(e.target) && e.target !== userProfileBtn && !userProfileBtn.contains(e.target)) {
                userDropdownMenu.classList.remove('active');
            }
        });
    }
});

// ==========================================================
// CRUD OPERATIONS ENGINE (INTERACTIVE CLIENT-SIDE ACTIONS - OFFLINE)
// ==========================================================

window.saveBarang = function() {
    const form = document.getElementById('formBarang');
    if (!form) return;
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const kodeBarangInput = document.getElementById('kodeBarang').value.trim();
    const lokasiRak = document.getElementById('lokasiRak').value.trim() || '-';
    const namaBarang = document.getElementById('namaBarang').value.trim();
    const deskripsiBarang = document.getElementById('deskripsiBarang').value.trim() || '-';
    const kategoriBarang = document.getElementById('kategoriBarang').value;
    const stokBarang = parseInt(document.getElementById('stokBarang').value || 0);
    const beratBarangEl = document.getElementById('beratBarang');
    const beratBarang = (beratBarangEl && beratBarangEl.value) ? beratBarangEl.value.trim() : '-';
    const dimensiBarangEl = document.getElementById('dimensiBarang');
    const dimensiBarang = (dimensiBarangEl && dimensiBarangEl.value) ? dimensiBarangEl.value.trim() : '-';
    const hargaBeliBarang = parseInt(document.getElementById('hargaBeliBarang').value || 0);
    const hargaBarang = parseInt(document.getElementById('hargaBarang').value || 0);
    
    // Auto-generate Kode SKU jika kosong
    const barangList = DB.get('ud_barang', []);
    let finalKodeBarang = kodeBarangInput;
    if (finalKodeBarang === '') {
        const maxId = barangList.length > 0 ? Math.max(...barangList.map(b => parseInt(b.id_barang) || 0)) : 0;
        finalKodeBarang = 'BRG-' + String(maxId + 1).padStart(3, '0');
    }
    
    // Logika Satuan yang realistis berdasarkan kategori toko bangunan sederhana
    let satuan = 'Pcs';
    if (kategoriBarang === 'Bahan Bangunan') {
        if (namaBarang.toLowerCase().includes('semen')) satuan = 'Zak';
        else if (namaBarang.toLowerCase().includes('besi') || namaBarang.toLowerCase().includes('baja')) satuan = 'Batang';
        else if (namaBarang.toLowerCase().includes('pasir') || namaBarang.toLowerCase().includes('split') || namaBarang.toLowerCase().includes('tanah')) satuan = 'Kubik';
        else if (namaBarang.toLowerCase().includes('bata') || namaBarang.toLowerCase().includes('genteng') || namaBarang.toLowerCase().includes('paving')) satuan = 'Pcs';
    } else if (kategoriBarang === 'Pipa & Saniter') {
        if (namaBarang.toLowerCase().includes('pipa')) satuan = 'Batang';
        else if (namaBarang.toLowerCase().includes('selang')) satuan = 'Meter';
        else satuan = 'Pcs';
    } else if (kategoriBarang === 'Cat & Finishing') {
        if (namaBarang.toLowerCase().includes('cat')) satuan = 'Pail';
        else if (namaBarang.toLowerCase().includes('tiner')) satuan = 'Kaleng';
        else satuan = 'Pcs';
    } else if (kategoriBarang === 'Peralatan & Perkakas') {
        if (namaBarang.toLowerCase().includes('paku')) satuan = 'Kotak';
        else if (namaBarang.toLowerCase().includes('kawat')) satuan = 'Roll';
        else satuan = 'Pcs';
    }
    
    const editId = form.getAttribute('data-edit-id');
    const btn = document.querySelector('.modal-footer .btn-primary');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Menyimpan...';
    btn.disabled = true;
    
    // Siapkan FormData untuk dikirim ke PHP API
    const formData = new FormData();
    if (editId) {
        const item = barangList.find(b => b.kode_barang === editId);
        if (item) {
            formData.append('id_barang', item.id_barang);
        }
    }
    formData.append('kode_barang', finalKodeBarang);
    formData.append('lokasi_rak', lokasiRak);
    formData.append('nama_barang', namaBarang);
    formData.append('deskripsi', deskripsiBarang);
    formData.append('kategori', kategoriBarang);
    formData.append('stok', stokBarang);
    formData.append('satuan', satuan);
    formData.append('berat', beratBarang);
    formData.append('dimensi', dimensiBarang);
    formData.append('harga_beli', hargaBeliBarang);
    formData.append('harga', hargaBarang);

    fetch(BASE_URL + '/api/barang/save.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showToast(data.message, 'success');
            closeModal();
            renderBarangTable();
        } else {
            showToast(data.message, 'error');
        }
        btn.innerHTML = originalText;
        btn.disabled = false;
    })
    .catch(error => {
        console.warn("Gagal menghubungi API barang, menggunakan fallback offline local:", error);
        
        // --- FALLBACK OFFLINE LOCALSTORAGE ---
        const barangList = DB.get('ud_barang', []);
        if (editId) {
            const index = barangList.findIndex(b => b.kode_barang === editId);
            if (index !== -1) {
                barangList[index].nama_barang = namaBarang;
                barangList[index].kategori = kategoriBarang;
                barangList[index].harga = hargaBarang;
                barangList[index].harga_beli = hargaBeliBarang;
                barangList[index].deskripsi = deskripsiBarang;
                barangList[index].berat = beratBarang;
                barangList[index].dimensi = dimensiBarang;
                barangList[index].lokasi_rak = lokasiRak;
                barangList[index].satuan = satuan;
                DB.set('ud_barang', barangList);
                showToast('Data barang diperbarui secara lokal! (Offline)', 'success');
            }
        } else {
            if (barangList.some(b => b.kode_barang === finalKodeBarang)) {
                showToast('Kode barang sudah terdaftar!', 'error');
                btn.innerHTML = originalText;
                btn.disabled = false;
                return;
            }
            
            barangList.push({
                id_barang: barangList.length > 0 ? Math.max(...barangList.map(b => b.id_barang)) + 1 : 1,
                kode_barang: finalKodeBarang,
                nama_barang: namaBarang,
                kategori: kategoriBarang,
                stok: stokBarang,
                satuan: satuan,
                harga: hargaBarang,
                harga_beli: hargaBeliBarang,
                deskripsi: deskripsiBarang,
                berat: beratBarang,
                dimensi: dimensiBarang,
                lokasi_rak: lokasiRak,
                stok_minimum: stokBarang <= 100 ? 30 : 50
            });
            DB.set('ud_barang', barangList);
            showToast('Data barang ditambahkan secara lokal! (Offline)', 'success');
        }
        
        closeModal();
        btn.innerHTML = originalText;
        btn.disabled = false;
        renderBarangTable();
    });
};

window.deleteBarang = function(kodeBarang) {
    if (confirm(`Apakah Anda yakin ingin menghapus barang dengan kode ${kodeBarang}?`)) {
        const formData = new FormData();
        formData.append('kode_barang', kodeBarang);
        
        fetch(BASE_URL + '/api/barang/delete.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                showToast(data.message, 'success');
                renderBarangTable();
            } else {
                showToast(data.message, 'error');
            }
        })
        .catch(error => {
            console.warn("Gagal menghubungi API barang, menggunakan fallback offline local:", error);
            const barangList = DB.get('ud_barang', []);
            const filtered = barangList.filter(b => b.kode_barang !== kodeBarang);
            DB.set('ud_barang', filtered);
            showToast('Data barang dihapus secara lokal! (Offline)', 'success');
            renderBarangTable();
        });
    }
};

window.saveTransaksi = function() {
    const form = document.getElementById('formTransaksi');
    if (!form) return;
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const tanggal = document.getElementById('tanggalTransaksi').value;
    const ref = document.getElementById('noReferensi').value.trim();
    const selectBarang = document.getElementById('pilihBarang');
    const namaBarang = selectBarang.value;
    
    const inputMasuk = document.getElementById('jumlahMasuk');
    const inputKeluar = document.getElementById('jumlahKeluar');
    
    const btn = document.querySelector('.modal-footer .btn-primary');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Menyimpan...';
    btn.disabled = true;

    // Siapkan data untuk API
    const formData = new FormData();
    formData.append('tanggal', tanggal);
    formData.append('ref', ref);
    formData.append('barang', namaBarang);

    let apiUrl = '';
    let isMasuk = false;
    let qty = 0;

    if (inputMasuk) {
        isMasuk = true;
        qty = parseInt(inputMasuk.value || 0);
        const po = document.getElementById('noPO').value.trim();
        const supplier = document.getElementById('supplier').value.trim();
        const qc = document.getElementById('kondisiQC').value;
        const keterangan = document.getElementById('keterangan').value.trim();

        formData.append('qty', qty);
        formData.append('po', po);
        formData.append('supplier', supplier);
        formData.append('qc', qc);
        formData.append('keterangan', keterangan);

        apiUrl = BASE_URL + '/api/transaksi/masuk.php';
    } else if (inputKeluar) {
        isMasuk = false;
        qty = parseInt(inputKeluar.value || 0);
        const tujuan = document.getElementById('tujuanProyek').value.trim();
        const tujuan_keluar = document.getElementById('tujuanPengeluaran').value;
        const keterangan = document.getElementById('keterangan').value.trim();

        formData.append('qty', qty);
        formData.append('tujuan', tujuan);
        formData.append('tujuan_keluar', tujuan_keluar);
        formData.append('keterangan', keterangan);

        apiUrl = BASE_URL + '/api/transaksi/keluar.php';
    }

    fetch(apiUrl, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showToast(data.message, 'success');
            closeModalTransaksi();
            if (isMasuk) {
                renderBarangMasukTable();
            } else {
                renderBarangKeluarTable();
            }
        } else {
            showToast(data.message, 'error');
        }
        btn.innerHTML = originalText;
        btn.disabled = false;
    })
    .catch(error => {
        console.warn("Gagal terhubung ke API Transaksi, menggunakan fallback offline local:", error);
        
        // --- FALLBACK OFFLINE LOCALSTORAGE ---
        const barangList = DB.get('ud_barang', []);
        const targetBarang = barangList.find(b => b.nama_barang === namaBarang);
        
        if (!targetBarang) {
            showToast('Barang tidak ditemukan!', 'error');
            btn.innerHTML = originalText;
            btn.disabled = false;
            return;
        }
        
        if (isMasuk) {
            const po = document.getElementById('noPO').value.trim();
            const supplier = document.getElementById('supplier').value.trim();
            const qc = document.getElementById('kondisiQC').value;
            const keterangan = document.getElementById('keterangan').value.trim();
            const masukList = DB.get('ud_transaksi_masuk', []);
            
            masukList.push({
                id_masuk: masukList.length > 0 ? Math.max(...masukList.map(t => t.id_masuk)) + 1 : 1,
                tanggal: tanggal,
                ref: ref,
                po: po,
                supplier: supplier,
                barang: namaBarang,
                qty: qty,
                qc: qc,
                keterangan: keterangan
            });
            
            targetBarang.stok += qty;
            
            DB.set('ud_transaksi_masuk', masukList);
            DB.set('ud_barang', barangList);
            showToast('Transaksi disimpan secara lokal! (Offline)', 'success');
            closeModalTransaksi();
            renderBarangMasukTable();
        } else {
            const tujuan = document.getElementById('tujuanProyek').value.trim();
            const tujuan_keluar = document.getElementById('tujuanPengeluaran').value;
            const keterangan = document.getElementById('keterangan').value.trim();
            const keluarList = DB.get('ud_transaksi_keluar', []);
            
            if (targetBarang.stok < qty) {
                showToast(`Stok tidak mencukupi! Stok saat ini: ${targetBarang.stok} ${targetBarang.satuan}`, 'error');
                btn.innerHTML = originalText;
                btn.disabled = false;
                return;
            }
            
            keluarList.push({
                id_keluar: keluarList.length > 0 ? Math.max(...keluarList.map(t => t.id_keluar)) + 1 : 1,
                tanggal: tanggal,
                ref: ref,
                tujuan: tujuan,
                barang: namaBarang,
                qty: qty,
                tujuan_keluar: tujuan_keluar,
                keterangan: keterangan
            });
            
            targetBarang.stok -= qty;
            
            DB.set('ud_transaksi_keluar', keluarList);
            DB.set('ud_barang', barangList);
            showToast('Transaksi disimpan secara lokal! (Offline)', 'success');
            closeModalTransaksi();
            renderBarangKeluarTable();
        }
        
        btn.innerHTML = originalText;
        btn.disabled = false;
    });
};

window.deleteTransaksiMasuk = function(id) {
    if (confirm('Apakah Anda yakin ingin menghapus data transaksi masuk ini? Stok barang terkait akan disesuaikan kembali.')) {
        const formData = new FormData();
        formData.append('_method', 'DELETE');
        formData.append('id_masuk', id);
        
        fetch(BASE_URL + '/api/transaksi/masuk.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                showToast(data.message, 'success');
                renderBarangMasukTable();
            } else {
                showToast(data.message, 'error');
            }
        })
        .catch(error => {
            console.warn("Gagal menghubungi API transaksi masuk, menggunakan fallback offline local:", error);
            
            const masukList = DB.get('ud_transaksi_masuk', []);
            const t = masukList.find(x => x.id_masuk === id);
            if (t) {
                const barangList = DB.get('ud_barang', []);
                const targetBarang = barangList.find(b => b.nama_barang === t.barang);
                if (targetBarang) {
                    targetBarang.stok = Math.max(0, targetBarang.stok - t.qty);
                    DB.set('ud_barang', barangList);
                }
                
                const filtered = masukList.filter(x => x.id_masuk !== id);
                DB.set('ud_transaksi_masuk', filtered);
                showToast('Transaksi berhasil dihapus secara lokal! (Offline)', 'success');
                renderBarangMasukTable();
            }
        });
    }
};

window.deleteTransaksiKeluar = function(id) {
    if (confirm('Apakah Anda yakin ingin menghapus data transaksi keluar ini? Stok barang terkait akan disesuaikan kembali.')) {
        const formData = new FormData();
        formData.append('_method', 'DELETE');
        formData.append('id_keluar', id);
        
        fetch(BASE_URL + '/api/transaksi/keluar.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                showToast(data.message, 'success');
                renderBarangKeluarTable();
            } else {
                showToast(data.message, 'error');
            }
        })
        .catch(error => {
            console.warn("Gagal menghubungi API transaksi keluar, menggunakan fallback offline local:", error);
            
            const keluarList = DB.get('ud_transaksi_keluar', []);
            const t = keluarList.find(x => x.id_keluar === id);
            if (t) {
                const barangList = DB.get('ud_barang', []);
                const targetBarang = barangList.find(b => b.nama_barang === t.barang);
                if (targetBarang) {
                    targetBarang.stok += t.qty;
                    DB.set('ud_barang', barangList);
                }
                
                const filtered = keluarList.filter(x => x.id_keluar !== id);
                DB.set('ud_transaksi_keluar', filtered);
                showToast('Transaksi berhasil dihapus secara lokal! (Offline)', 'success');
                renderBarangKeluarTable();
            }
        });
    }
};

window.simpanAkun = function(btn) {
    const form = document.getElementById('akunForm');
    if (!form) return;
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const nama = document.getElementById('nama_lengkap').value.trim();
    const username = document.getElementById('username').value.trim();
    const role = document.getElementById('role').value;
    const password = document.getElementById('password') ? document.getElementById('password').value : '';
    
    const editId = form.getAttribute('data-edit-id');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Menyimpan...';
    btn.disabled = true;

    // Siapkan FormData
    const formData = new FormData();
    if (editId) {
        formData.append('id_user', editId);
    }
    formData.append('nama_lengkap', nama);
    formData.append('username', username);
    formData.append('role', role);
    if (password !== '') {
        formData.append('password', password);
    }

    fetch(BASE_URL + '/api/user/save.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showToast(data.message, 'success');
            closeModal();
            renderUserTable();
        } else {
            showToast(data.message, 'error');
        }
        btn.innerHTML = originalText;
        btn.disabled = false;
    })
    .catch(error => {
        console.warn("Gagal terhubung ke API user, menggunakan fallback offline local:", error);
        
        // --- FALLBACK OFFLINE LOCALSTORAGE ---
        const userList = DB.get('ud_users', []);
        if (editId) {
            const index = userList.findIndex(u => u.id == editId);
            if (index !== -1) {
                userList[index].nama = nama;
                userList[index].username = username;
                userList[index].role = role;
                DB.set('ud_users', userList);
                showToast('Pengguna berhasil diperbarui secara lokal! (Offline)', 'success');
            }
        } else {
            if (userList.some(u => u.username === username)) {
                showToast('Username sudah digunakan!', 'error');
                btn.innerHTML = originalText;
                btn.disabled = false;
                return;
            }
            
            userList.push({
                id: userList.length > 0 ? Math.max(...userList.map(u => u.id)) + 1 : 1,
                nama: nama,
                username: username,
                role: role
            });
            DB.set('ud_users', userList);
            showToast('Pengguna baru berhasil ditambahkan secara lokal! (Offline)', 'success');
        }
        
        closeModal();
        btn.innerHTML = originalText;
        btn.disabled = false;
        renderUserTable();
    });
};

window.deleteUser = function(id) {
    if (confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) {
        const formData = new FormData();
        formData.append('id_user', id);
        
        fetch(BASE_URL + '/api/user/delete.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                showToast(data.message, 'success');
                renderUserTable();
            } else {
                showToast(data.message, 'error');
            }
        })
        .catch(error => {
            console.warn("Gagal menghubungi API pengguna, menggunakan fallback offline local:", error);
            const userList = DB.get('ud_users', []);
            const filtered = userList.filter(u => u.id != id);
            DB.set('ud_users', filtered);
            showToast('Pengguna berhasil dihapus secara lokal! (Offline)', 'success');
            renderUserTable();
        });
    }
};

// ==========================================================
// MODAL CONTROLLER & TEMPLATE ENGINE
// ==========================================================

window.openModal = function(action, id = null) {
    let modalId = 'barangModal';
    let titleId = 'modalTitle';
    let formId = 'formBarang';

    if (action === 'addMasuk' || action === 'addKeluar') {
        modalId = 'transaksiModal';
        titleId = 'modalTitle';
        formId = 'formTransaksi';
    } else if (action === 'tambahAkun' || action === 'editAkun') {
        modalId = 'akunModal';
        titleId = 'modalTitle';
        formId = 'akunForm';
    }

    const modal = document.getElementById(modalId);
    const modalTitle = document.getElementById(titleId);
    const form = document.getElementById(formId);
    
    if (modal) {
        modal.style.display = 'flex';
        
        const selectBarang = document.getElementById('pilihBarang');
        if (selectBarang && (action === 'addMasuk' || action === 'addKeluar')) {
            const barangList = DB.get('ud_barang', []);
            selectBarang.innerHTML = '<option value="">-- Pilih Barang --</option>';
            barangList.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item.nama_barang;
                opt.textContent = `${item.kode_barang} - ${item.nama_barang} (Stok: ${item.stok})`;
                selectBarang.appendChild(opt);
            });
            
            // Auto-populate lokasiPenempatan / lokasiAsal ketika barang dipilih
            selectBarang.onchange = function() {
                const selectedVal = this.value;
                const targetBarang = barangList.find(b => b.nama_barang === selectedVal);
                const lokasiPenempatan = document.getElementById('lokasiPenempatan');
                const lokasiAsal = document.getElementById('lokasiAsal');
                
                if (targetBarang) {
                    if (lokasiPenempatan) lokasiPenempatan.value = targetBarang.lokasi_rak || '-';
                    if (lokasiAsal) lokasiAsal.value = targetBarang.lokasi_rak || '-';
                } else {
                    if (lokasiPenempatan) lokasiPenempatan.value = '';
                    if (lokasiAsal) lokasiAsal.value = '';
                }
            };
        }

        if (action === 'add') {
            modalTitle.innerText = 'Tambah Data Barang';
            if (form) {
                form.reset();
                form.removeAttribute('data-edit-id');
                document.getElementById('kodeBarang').readOnly = false;
                document.getElementById('stokBarang').readOnly = false;
            }
        } else if (action === 'edit') {
            modalTitle.innerText = 'Edit Data Barang';
            const barangList = DB.get('ud_barang', []);
            const item = barangList.find(b => b.kode_barang === id);
            if (item && form) {
                document.getElementById('kodeBarang').value = item.kode_barang;
                document.getElementById('kodeBarang').readOnly = true;
                document.getElementById('lokasiRak').value = item.lokasi_rak || '';
                document.getElementById('namaBarang').value = item.nama_barang;
                document.getElementById('deskripsiBarang').value = item.deskripsi || '';
                document.getElementById('kategoriBarang').value = item.kategori;
                document.getElementById('stokBarang').value = item.stok;
                document.getElementById('stokBarang').readOnly = true;
                const beratEl = document.getElementById('beratBarang');
                if (beratEl) beratEl.value = item.berat || '';
                const dimensiEl = document.getElementById('dimensiBarang');
                if (dimensiEl) dimensiEl.value = item.dimensi || '';
                document.getElementById('hargaBeliBarang').value = item.harga_beli || 0;
                document.getElementById('hargaBarang').value = item.harga;
                form.setAttribute('data-edit-id', id);
            }
        } else if (action === 'addMasuk') {
            modalTitle.innerText = 'Tambah Barang Masuk';
            if (form) form.reset();
            const dateInput = document.getElementById('tanggalTransaksi');
            if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
        } else if (action === 'addKeluar') {
            modalTitle.innerText = 'Tambah Barang Keluar';
            if (form) form.reset();
            const dateInput = document.getElementById('tanggalTransaksi');
            if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
        } else if (action === 'tambahAkun') {
            modalTitle.innerText = 'Tambah Pengguna Baru';
            if (form) {
                form.reset();
                form.removeAttribute('data-edit-id');
            }
            const passwordInput = document.getElementById('password');
            if (passwordInput) {
                passwordInput.required = true;
                passwordInput.placeholder = 'Masukkan password';
            }
        } else if (action === 'editAkun') {
            modalTitle.innerText = 'Edit Pengguna';
            const userList = DB.get('ud_users', []);
            const user = userList.find(u => u.id == id);
            if (user && form) {
                document.getElementById('nama_lengkap').value = user.nama;
                document.getElementById('username').value = user.username;
                document.getElementById('role').value = user.role;
                const passwordInput = document.getElementById('password');
                if (passwordInput) {
                    passwordInput.value = '';
                    passwordInput.required = false;
                    passwordInput.placeholder = 'Kosongkan jika tidak diubah';
                }
                form.setAttribute('data-edit-id', id);
            }
        }
    }
};

window.closeModal = function() {
    const modal = document.getElementById('barangModal');
    const modalAkun = document.getElementById('akunModal');
    if (modal) modal.style.display = 'none';
    if (modalAkun) modalAkun.style.display = 'none';
};

window.closeModalTransaksi = function() {
    const modal = document.getElementById('transaksiModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

window.onclick = function(event) {
    const barangModal = document.getElementById('barangModal');
    const transaksiModal = document.getElementById('transaksiModal');
    const akunModal = document.getElementById('akunModal');
    const qrModal = document.getElementById('qrModal');
    const scannerModal = document.getElementById('scannerModal');
    
    if (event.target == barangModal) {
        barangModal.style.display = "none";
    }
    if (event.target == transaksiModal) {
        transaksiModal.style.display = "none";
    }
    if (event.target == akunModal) {
        akunModal.style.display = "none";
    }
    if (event.target == qrModal) {
        qrModal.style.display = "none";
    }
    if (event.target == scannerModal) {
        scannerModal.style.display = "none";
    }
};

// ==========================================================
// SYSTEM QR CODE GENERATOR & SCAN SIMULATOR
// ==========================================================

// Tampilkan QR Code Barang
window.showQrCode = function(kode, nama) {
    const modal = document.getElementById('qrModal');
    const qrNama = document.getElementById('qrNamaBarang');
    const qrKode = document.getElementById('qrKodeBarang');
    const qrImage = document.getElementById('qrImage');
    
    if (modal && qrNama && qrKode && qrImage) {
        qrNama.innerText = nama;
        qrKode.innerText = kode;
        
        const qrDataString = encodeURIComponent(`Kode: ${kode}\nNama: ${nama}\nSistem Inventaris UD Citra Perdana`);
        qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrDataString}`;
        
        modal.style.display = 'flex';
    }
};

// Tutup QR Modal
window.closeQrModal = function() {
    const modal = document.getElementById('qrModal');
    if (modal) modal.style.display = 'none';
};

// Buka Simulator Scanner QR
window.openScannerSim = function() {
    const modal = document.getElementById('scannerModal');
    const container = document.getElementById('scannerBarangList');
    
    if (modal && container) {
        modal.style.display = 'flex';
        
        const barangList = DB.get('ud_barang', []);
        container.innerHTML = '';
        
        if (barangList.length === 0) {
            container.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">Belum ada data barang untuk dipindai.</div>';
            return;
        }
        
        barangList.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'activity-item';
            itemDiv.style.cursor = 'pointer';
            itemDiv.style.border = '1px solid var(--border-color)';
            itemDiv.style.borderRadius = 'var(--radius-sm)';
            itemDiv.style.padding = '8px 10px';
            itemDiv.style.transition = 'all 0.2s';
            
            itemDiv.innerHTML = `
                <div style="display: flex; align-items: center; width: 100%; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-qrcode" style="color: #6366f1; font-size: 16px;"></i>
                        <div>
                            <div style="font-weight: 600; font-size: 13px; color: var(--text-main);">${item.kode_barang}</div>
                            <div style="font-size: 11px; color: var(--text-muted);">${item.nama_barang}</div>
                        </div>
                    </div>
                    <span class="badge badge-info" style="font-size: 10px; padding: 2px 6px;">Pindai</span>
                </div>
            `;
            
            itemDiv.onmouseover = () => {
                itemDiv.style.backgroundColor = 'rgba(99, 102, 241, 0.05)';
                itemDiv.style.borderColor = '#6366f1';
            };
            itemDiv.onmouseout = () => {
                itemDiv.style.backgroundColor = '';
                itemDiv.style.borderColor = 'var(--border-color)';
            };
            
            itemDiv.onclick = () => {
                triggerScanSuccess(item.nama_barang, item.kode_barang);
            };
            
            container.appendChild(itemDiv);
        });
    }
};

// Tutup Simulator Scanner QR
window.closeScannerSim = function() {
    const modal = document.getElementById('scannerModal');
    if (modal) modal.style.display = 'none';
};

// Simulasi Scan Berhasil (Beep + Auto Fill)
window.triggerScanSuccess = function(nama, kode) {
    const selectBarang = document.getElementById('pilihBarang');
    if (!selectBarang) return;
    
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 1200;
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        
        oscillator.start();
        setTimeout(() => {
            oscillator.stop();
        }, 100);
    } catch (e) {
        console.warn("Web Audio API not supported, skipping beep sound");
    }
    
    const scannerIcon = document.getElementById('scannerIcon');
    if (scannerIcon) {
        scannerIcon.innerHTML = `
            <i class="fas fa-check-circle fa-4x" style="color: #10b981; margin-bottom: 10px; animation: pulse 0.5s;"></i>
            <span style="font-size: 11px; font-weight: 500; letter-spacing: 1px; color: #10b981;">PEMINDAIAN BERHASIL!</span>
        `;
    }
    
    setTimeout(() => {
        let found = false;
        for (let i = 0; i < selectBarang.options.length; i++) {
            const opt = selectBarang.options[i];
            if (opt.value === nama || opt.value === kode || opt.text.includes(kode)) {
                selectBarang.selectedIndex = i;
                found = true;
                break;
            }
        }
        
        selectBarang.dispatchEvent(new Event('change'));
        
        if (found) {
            showToast(`Pindai QR Berhasil: ${nama} (${kode})`, 'success');
        } else {
            showToast(`Gagal memindai: Barang tidak ditemukan di opsi form`, 'error');
        }
        
        closeScannerSim();
        
        if (scannerIcon) {
            scannerIcon.innerHTML = `
                <i class="fas fa-qrcode fa-4x" style="margin-bottom: 10px; animation: pulse 1.5s infinite;"></i>
                <span style="font-size: 11px; font-weight: 500; letter-spacing: 1px; color: rgba(255,255,255,0.4);">MENCARI QR CODE...</span>
            `;
        }
    }, 600);
};

// ==========================================================
// EXPORT LAPORAN STOK TO EXCEL
// ==========================================================
window.exportLaporanStokToExcel = function() {
    const table = document.querySelector('.data-table');
    if (!table) return;
    
    // Ambil isi HTML tabel
    let html = table.outerHTML;
    
    // Bungkus dengan template Excel HTML standar
    const template = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <!--[if gte mso 9]>
            <xml>
                <x:ExcelWorkbook>
                    <x:ExcelWorksheets>
                        <x:ExcelWorksheet>
                            <x:Name>Laporan Stok</x:Name>
                            <x:WorksheetOptions>
                                <x:DisplayGridlines/>
                            </x:WorksheetOptions>
                        </x:ExcelWorksheet>
                    </x:ExcelWorksheets>
                </x:ExcelWorkbook>
            </xml>
            <![endif]-->
            <meta charset="utf-8">
            <style>
                th { background-color: #0a3d62; color: white; font-weight: bold; }
                td, th { border: 1px solid #ddd; text-align: left; padding: 8px; }
            </style>
        </head>
        <body>
            ${html}
        </body>
        </html>
    `;
    
    const blob = new Blob([template], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    
    const monthInput = document.querySelector('.table-header-actions input[type="month"]');
    const monthVal = monthInput ? monthInput.value : '';
    const suffix = monthVal ? `_${monthVal}` : '';
    a.download = `Laporan_Stok_UD_Citra_Perdana${suffix}.xls`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Laporan Stok berhasil diexport ke Excel!', 'success');
};
