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

    const savedDuration = parseInt(localStorage.getItem('ud_toast_duration') ?? '3000');
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, savedDuration);
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
        if (!localStorage.getItem('ud_cleaned_dummy_v2')) {
            localStorage.removeItem('ud_barang');
            localStorage.removeItem('ud_transaksi_masuk');
            localStorage.removeItem('ud_transaksi_keluar');
            localStorage.removeItem('ud_mutasi');
            localStorage.removeItem('ud_users');
            localStorage.removeItem('ud_cycle_count');
            localStorage.setItem('ud_cleaned_dummy_v2', 'true');
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
        
        this.get('ud_mutasi', []);
        
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
// Sinkronisasi seluruh database dari server ke localStorage (Cache lokal) secara asinkron
const syncDatabase = async () => {
    if (!USER_SESSION) return;
    
    const fetchPromises = [
        // 1. Sinkronisasi Barang
        fetch(BASE_URL + '/api/barang/read.php', { credentials: 'same-origin' })
            .then(res => res.json())
            .then(data => {
                if (data && data.status === 'success') {
                    DB.set('ud_barang', data.data);
                }
            }).catch(e => console.warn("Gagal sinkronisasi data barang:", e)),
            
        // 2. Sinkronisasi Transaksi Masuk
        fetch(BASE_URL + '/api/transaksi/masuk.php', { credentials: 'same-origin' })
            .then(res => res.json())
            .then(data => {
                if (data && data.status === 'success') {
                    DB.set('ud_transaksi_masuk', data.data);
                }
            }).catch(e => console.warn("Gagal sinkronisasi transaksi masuk:", e)),
            
        // 3. Sinkronisasi Transaksi Keluar
        fetch(BASE_URL + '/api/transaksi/keluar.php', { credentials: 'same-origin' })
            .then(res => res.json())
            .then(data => {
                if (data && data.status === 'success') {
                    DB.set('ud_transaksi_keluar', data.data);
                }
            }).catch(e => console.warn("Gagal sinkronisasi transaksi keluar:", e)),
            
        // 4. Sinkronisasi Mutasi Gudang
        fetch(BASE_URL + '/api/transaksi/read_mutasi.php', { credentials: 'same-origin' })
            .then(res => res.json())
            .then(data => {
                if (data && data.status === 'success') {
                    DB.set('ud_mutasi', data.data);
                }
            }).catch(e => console.warn("Gagal sinkronisasi mutasi gudang:", e))
    ];
    
    // Admin mendapatkan otorisasi sinkronisasi daftar akun/user
    if (USER_SESSION.role === 'Admin / Owner') {
        fetchPromises.push(
            fetch(BASE_URL + '/api/user/read.php', { credentials: 'same-origin' })
                .then(res => res.json())
                .then(data => {
                    if (data && data.status === 'success') {
                        const localUsers = DB.get('ud_users', []);
                        const mergedUsers = data.data.map(apiUser => {
                            const lUser = localUsers.find(u => u.username === apiUser.username);
                            if (lUser && lUser.password) apiUser.password = lUser.password;
                            return apiUser;
                        });
                        DB.set('ud_users', mergedUsers);
                    }
                }).catch(e => console.warn("Gagal sinkronisasi manajemen akun:", e))
        );
    }
    
    await Promise.all(fetchPromises);
};

document.addEventListener('DOMContentLoaded', async function () {
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.includes('login.html') || currentPath.includes('register.html');

    // 1. Ambil session dari localStorage secara sinkron untuk rendering awal yang instan (mencegah flash/glitch UI)
    const cachedSessionStr = localStorage.getItem('ud_session');
    let initialSession = null;
    if (cachedSessionStr) {
        try {
            initialSession = JSON.parse(cachedSessionStr);
            USER_SESSION = initialSession;
        } catch (e) {}
    }

    // Fungsi pembantu untuk mengupdate tampilan profil & pembatasan menu secara instan
    const applySessionUI = (session) => {
        if (!session) return;
        
        // Update nama profil & role
        const profileBtn = document.getElementById('userProfileBtn');
        const dropdownMenu = document.getElementById('userDropdownMenu');
        
        if (profileBtn) {
            const span = profileBtn.querySelector('span');
            if (span) span.textContent = session.nama_lengkap;
        }
        
        if (dropdownMenu) {
            const nameEl = dropdownMenu.querySelector('.dropdown-user-name');
            const roleEl = dropdownMenu.querySelector('.dropdown-user-role');
            if (nameEl) nameEl.textContent = session.nama_lengkap;
            if (roleEl) roleEl.textContent = session.role;
            
            // Profil Action (Cari berdasarkan ikon fa-user-circle)
            const profileLink = Array.from(dropdownMenu.querySelectorAll('.dropdown-item')).find(el => el.querySelector('.fa-user-circle'));
            if (profileLink) {
                profileLink.innerHTML = '<i class="fas fa-user-circle"></i> Profil & Pengaturan';
                if (!profileLink.dataset.hasListener) {
                    profileLink.addEventListener('click', function(e) {
                        e.preventDefault();
                        dropdownMenu.classList.remove('active');
                        openProfileModal();
                    });
                    profileLink.dataset.hasListener = 'true';
                }
            }
            
            // Pengaturan Action (Cari berdasarkan ikon fa-cog, sembunyikan agar terintegrasi di modal Profil)
            const settingsLink = Array.from(dropdownMenu.querySelectorAll('.dropdown-item')).find(el => el.querySelector('.fa-cog'));
            if (settingsLink) {
                settingsLink.style.display = 'none';
            }
            
            // Logout Action
            const logoutBtn = dropdownMenu.querySelector('.logout');
            if (logoutBtn && !logoutBtn.dataset.hasListener) {
                logoutBtn.addEventListener('click', async function(e) {
                    e.preventDefault();
                    try {
                        await fetch(BASE_URL + '/api/auth/logout.php');
                    } catch(err) {}
                    localStorage.removeItem('ud_session');
                    window.location.href = BASE_URL + '/views/auth/login.html';
                });
                logoutBtn.dataset.hasListener = 'true';
            }
        }

        // Pembatasan menu role-based
        if (session.role === 'Staf Gudang') {
            const dashboardLinks = document.querySelectorAll('a[href*="index.html"]');
            dashboardLinks.forEach(link => {
                const li = link.closest('li');
                if (li) li.style.display = 'none';
            });

            const manajemenAkunLinks = document.querySelectorAll('a[href*="manajemen_akun.html"]');
            manajemenAkunLinks.forEach(link => {
                const li = link.closest('li');
                if (li) {
                    li.style.display = 'none';
                    const prev = li.previousElementSibling;
                    if (prev && prev.classList.contains('menu-label')) {
                        prev.style.display = 'none';
                    }
                }
            });
            
            // Redirect jika Staf Gudang berada di halaman terlarang
            const onIndexPage = currentPath.endsWith('/') || currentPath.endsWith('index.html') || currentPath.includes('index.html');
            if (onIndexPage || currentPath.includes('manajemen_akun.html')) {
                window.location.href = BASE_URL + '/views/barang/data_barang.html';
            }
        }
    };

    // Render awal secara instan dengan data cache jika ada
    if (USER_SESSION) {
        applySessionUI(USER_SESSION);
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
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('expired') === 'device') {
            setTimeout(() => {
                showToast('Sesi Anda berakhir karena akun telah login di perangkat lain.', 'error');
            }, 100);
        }
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
                const userList = DB.get('ud_users', []);
                const userInDb = userList.find(u => u.username === usernameInput);
                
                if (userInDb) {
                    // Jika user ada di database lokal, WAJIB cocokkan passwordnya.
                    // Jika password di lokal kosong (karena tersinkronisasi dari online tanpa password), 
                    // kita hanya izinkan login jika inputannya persis sama dengan password default awal.
                    // TETAPI jika password di lokal sudah diset, maka tidak boleh pakai default.
                    let isMatch = false;
                    if (userInDb.password) {
                        isMatch = (userInDb.password === passwordInput);
                    } else {
                        // Jika belum ada password yang tersimpan di lokal untuk akun ini
                        isMatch = ((userInDb.username === 'admin' && passwordInput === 'admin123') || 
                                   (userInDb.username === 'budi_gudang' && passwordInput === 'budi123'));
                    }
                    
                    if (isMatch) {
                        const mockSession = {
                            id_user: userInDb.id,
                            username: userInDb.username,
                            nama_lengkap: userInDb.nama || userInDb.nama_lengkap,
                            role: userInDb.role,
                            isMock: true
                        };
                        localStorage.setItem('ud_session', JSON.stringify(mockSession));
                        showToast('Login berhasil! (Mode Offline)', 'success');
                        setTimeout(() => {
                            window.location.href = mockSession.role === 'Staf Gudang' ? BASE_URL + '/views/barang/data_barang.html' : BASE_URL + '/index.html';
                        }, 1000);
                        return true;
                    }
                } else if (userList.length === 0) {
                    // Fallback HANYA jika database lokal benar-benar kosong (belum pernah sinkron)
                    // Hanya izinkan admin login untuk setup pertama kali
                    if (usernameInput === 'admin' && passwordInput === 'admin123') {
                        const mockSession = {
                            id_user: 1,
                            username: 'admin',
                            nama_lengkap: 'Administrator Super',
                            role: 'Admin / Owner',
                            isMock: true
                        };
                        localStorage.setItem('ud_session', JSON.stringify(mockSession));
                        showToast('Login berhasil! (Mode Simulasi Offline)', 'success');
                        setTimeout(() => {
                            window.location.href = BASE_URL + '/index.html';
                        }, 1000);
                        return true;
                    }
                }
                
                showToast('Username atau password salah!', 'error');
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
                    
                    // Simpan password input ke db offline agar bisa login offline nantinya
                    let localUsers = DB.get('ud_users', []);
                    let uIdx = localUsers.findIndex(u => u.username === usernameInput);
                    if (uIdx !== -1) {
                        localUsers[uIdx].password = passwordInput;
                    } else {
                        localUsers.push({
                            id: data.user.id_user || 1,
                            username: usernameInput,
                            nama: data.user.nama,
                            role: data.user.role,
                            password: passwordInput
                        });
                    }
                    DB.set('ud_users', localUsers);

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
                    // tryMockLogin sudah memunculkan toast error
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
            const response = await fetch(BASE_URL + '/api/barang/read.php', { credentials: 'same-origin' });
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
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px 20px;"><div style="color: var(--border-color); margin-bottom: 15px;"><i class="fas fa-box-open fa-3x"></i></div><div style="color: var(--text-muted); font-size: 14px;">Data barang tidak ditemukan. Silakan tambah barang baru atau ubah filter pencarian.</div></td></tr>';
            return;
        }
        
        filtered.forEach(item => {
            const row = document.createElement('tr');
            const isKritis = Number(item.stok) <= Number(item.stok_minimum !== undefined && item.stok_minimum !== null && item.stok_minimum !== '' ? item.stok_minimum : 10);
            row.innerHTML = `
                <td>${item.kode_barang}</td>
                <td style="font-weight: 500;">${item.nama_barang}</td>
                <td><span class="badge badge-info">${item.kategori}</span></td>
                <td><span class="badge" style="background: rgba(99, 102, 241, 0.1); color: #6366f1; font-weight: 600; font-family: monospace;">${item.lokasi_rak || '-'}</span></td>
                <td><strong style="color: ${isKritis ? '#ef4444' : 'inherit'};">${item.stok}</strong></td>
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
            const response = await fetch(BASE_URL + '/api/transaksi/masuk.php', { credentials: 'same-origin' });
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
            masukTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px 20px;"><div style="color: var(--border-color); margin-bottom: 15px;"><i class="fas fa-arrow-down fa-3x" style="opacity: 0.5;"></i></div><div style="color: var(--text-muted); font-size: 14px;">Data transaksi masuk tidak ditemukan.</div></td></tr>';
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
                <td>
                    <button class="btn-icon" style="color: #6366f1; background: rgba(99, 102, 241, 0.1);" onclick="showDetailMasuk(${item.id_masuk})" title="Detail"><i class="fas fa-eye"></i></button>
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
            const response = await fetch(BASE_URL + '/api/transaksi/keluar.php', { credentials: 'same-origin' });
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
            keluarTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px 20px;"><div style="color: var(--border-color); margin-bottom: 15px;"><i class="fas fa-arrow-up fa-3x" style="opacity: 0.5;"></i></div><div style="color: var(--text-muted); font-size: 14px;">Data transaksi keluar tidak ditemukan.</div></td></tr>';
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
                    <button class="btn-icon" style="color: #6366f1; background: rgba(99, 102, 241, 0.1);" onclick="showDetailKeluar(${item.id_keluar})" title="Detail"><i class="fas fa-eye"></i></button>
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
            const response = await fetch(BASE_URL + '/api/laporan/read_stok.php?month=' + monthFilter, { credentials: 'same-origin' });
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
        let totalAssetValue = 0;
        
        if (isOffline) {
            // --- OFFLINE FALLBACK CALCULATION ---
            const barangList = DB.get('ud_barang', []);
            const masukList = DB.get('ud_transaksi_masuk', []);
            const keluarList = DB.get('ud_transaksi_keluar', []);
            
            const filtered = barangList.filter(item => {
                const matchesSearch = item.nama_barang.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                       item.kode_barang.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesCategory = categoryFilter === '' || item.kategori === categoryFilter;
                
                let matchesMonth = true;
                if (monthFilter !== '') {
                    const itemCreated = item.created_at || '';
                    if (itemCreated) {
                        matchesMonth = itemCreated.slice(0, 7) <= monthFilter;
                    }
                }
                
                return matchesSearch && matchesCategory && matchesMonth;
            });
            
            if (filtered.length === 0) {
                laporanStokTableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px 20px;"><div style="color: var(--border-color); margin-bottom: 15px;"><i class="fas fa-file-alt fa-3x"></i></div><div style="color: var(--text-muted); font-size: 14px;">Laporan stok tidak ditemukan atau kosong.</div></td></tr>';
                return;
            }
            
            filtered.forEach(item => {
                let masukQty = 0;
                let keluarQty = 0;
                let akhir = Number(item.stok || 0);
                let awal = akhir;
                
                if (monthFilter !== '') {
                    const itemMasukCurr = masukList.filter(t => t.barang === item.nama_barang && t.tanggal.slice(0, 7) === monthFilter);
                    const itemKeluarCurr = keluarList.filter(t => t.barang === item.nama_barang && t.tanggal.slice(0, 7) === monthFilter);
                    masukQty = itemMasukCurr.reduce((sum, t) => sum + Number(t.qty || 0), 0);
                    keluarQty = itemKeluarCurr.reduce((sum, t) => sum + Number(t.qty || 0), 0);
                    
                    const itemMasukAfter = masukList.filter(t => t.barang === item.nama_barang && t.tanggal.slice(0, 7) > monthFilter);
                    const itemKeluarAfter = keluarList.filter(t => t.barang === item.nama_barang && t.tanggal.slice(0, 7) > monthFilter);
                    const masukAfter = itemMasukAfter.reduce((sum, t) => sum + Number(t.qty || 0), 0);
                    const keluarAfter = itemKeluarAfter.reduce((sum, t) => sum + Number(t.qty || 0), 0);
                    
                    akhir = Number(item.stok || 0) - masukAfter + keluarAfter;
                    awal = akhir - masukQty + keluarQty;
                } else {
                    const itemMasukAll = masukList.filter(t => t.barang === item.nama_barang);
                    const itemKeluarAll = keluarList.filter(t => t.barang === item.nama_barang);
                    masukQty = itemMasukAll.reduce((sum, t) => sum + Number(t.qty || 0), 0);
                    keluarQty = itemKeluarAll.reduce((sum, t) => sum + Number(t.qty || 0), 0);
                    akhir = Number(item.stok || 0);
                    awal = akhir - masukQty + keluarQty;
                }
                
                const hargaBeli = Number(item.harga_beli || 0);
                const assetValue = akhir * hargaBeli;
                totalAssetValue += assetValue;
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.kode_barang}</td>
                    <td style="font-weight: 500;">${item.nama_barang}</td>
                    <td><span class="badge badge-info">${item.kategori}</span></td>
                    <td style="text-align: center;">${awal}</td>
                    <td style="text-align: center; color: #059669; font-weight: 600;">+ ${masukQty}</td>
                    <td style="text-align: center; color: #e11d48; font-weight: 600;">- ${keluarQty}</td>
                    <td style="text-align: center; font-weight: bold; background-color: #f8fafc;">${akhir}</td>
                    <td style="text-align: right;">Rp ${hargaBeli.toLocaleString('id-ID')}</td>
                    <td style="text-align: right; font-weight: 500; color: var(--primary);">Rp ${assetValue.toLocaleString('id-ID')}</td>
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
                laporanStokTableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px 20px;"><div style="color: var(--border-color); margin-bottom: 15px;"><i class="fas fa-file-alt fa-3x"></i></div><div style="color: var(--text-muted); font-size: 14px;">Laporan stok tidak ditemukan atau kosong.</div></td></tr>';
                return;
            }
            
            filtered.forEach(item => {
                const hargaBeli = Number(item.harga_beli || 0);
                const assetValue = Number(item.akhir || 0) * hargaBeli;
                totalAssetValue += assetValue;
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.kode_barang}</td>
                    <td style="font-weight: 500;">${item.nama_barang}</td>
                    <td><span class="badge badge-info">${item.kategori}</span></td>
                    <td style="text-align: center;">${item.awal}</td>
                    <td style="text-align: center; color: #059669; font-weight: 600;">+ ${item.masuk}</td>
                    <td style="text-align: center; color: #e11d48; font-weight: 600;">- ${item.keluar}</td>
                    <td style="text-align: center; font-weight: bold; background-color: #f8fafc;">${item.akhir}</td>
                    <td style="text-align: right;">Rp ${hargaBeli.toLocaleString('id-ID')}</td>
                    <td style="text-align: right; font-weight: 500; color: var(--primary);">Rp ${assetValue.toLocaleString('id-ID')}</td>
                `;
                laporanStokTableBody.appendChild(row);
            });
        }
        
        // Render Summary Total Row
        const summaryRow = document.createElement('tr');
        summaryRow.style.fontWeight = 'bold';
        summaryRow.style.backgroundColor = '#f1f5f9';
        summaryRow.style.borderTop = '2px solid var(--border-color)';
        summaryRow.innerHTML = `
            <td colspan="8" style="text-align: right; padding: 14px 18px; color: var(--text-main);">Total Nilai Aset Gudang:</td>
            <td style="text-align: right; color: #0f172a; font-size: 15px; padding: 14px 18px; font-weight: 700;">Rp ${totalAssetValue.toLocaleString('id-ID')}</td>
        `;
        laporanStokTableBody.appendChild(summaryRow);
    };

    window.renderUserTable = async function(searchQuery = '') {
        const manajemenAkunTableBody = document.getElementById('manajemenAkunTableBody');
        if (!manajemenAkunTableBody) return;
        
        let userList = [];
        let isOffline = false;
        
        try {
            const response = await fetch(BASE_URL + '/api/user/read.php', { credentials: 'same-origin' });
            const data = await response.json();
            if (data.status === 'success') {
                const localUsers = DB.get('ud_users', []);
                userList = data.data.map(apiUser => {
                    const lUser = localUsers.find(u => u.username === apiUser.username);
                    if (lUser && lUser.password) apiUser.password = lUser.password;
                    return apiUser;
                });
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
            manajemenAkunTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px 20px;"><div style="color: var(--border-color); margin-bottom: 15px;"><i class="fas fa-users fa-3x"></i></div><div style="color: var(--text-muted); font-size: 14px;">Data pengguna tidak ditemukan.</div></td></tr>';
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

    window.renderDashboard = async function() {
        const cards = document.querySelector('.dashboard-cards');
        if (!cards) return;
        
        try {
            const response = await fetch(BASE_URL + '/api/dashboard/read.php', { credentials: 'same-origin' });
            const result = await response.json();
            
            if (result.status === 'success') {
                const data = result.data;
                
                // 1. Update Cards
                const cardElements = cards.querySelectorAll('.card');
                if (cardElements.length >= 4) {
                    cardElements[0].querySelector('.card-info h3').textContent = data.totalBarangCount;
                    cardElements[1].querySelector('.card-info h3').textContent = data.totalMasukQty;
                    cardElements[2].querySelector('.card-info h3').textContent = data.totalKeluarQty;
                    cardElements[3].querySelector('.card-info h3').textContent = data.stokMenipisCount;
                }
                
                // 2. Monitoring Cards
                const monitoringCards = document.querySelectorAll('.monitoring-card');
                if (monitoringCards.length >= 3) {
                    // Stok Menipis
                    const kritisCard = monitoringCards[0];
                    kritisCard.querySelector('.monitoring-header .badge-danger').textContent = data.stokMenipisCount;
                    const kritisListContainer = kritisCard.querySelector('.monitoring-list');
                    kritisListContainer.innerHTML = '';
                    if (data.stokMenipisCount === 0) {
                        kritisListContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 14px; padding: 10px 0;">Aman! Tidak ada stok kritis.</div>';
                    } else {
                        data.stokMenipisList.forEach(item => {
                            const itemDiv = document.createElement('div');
                            itemDiv.className = 'product-item';
                            const reorderQty = item.stok_minimum * 2;
                            itemDiv.innerHTML = `
                                <span class="product-name">${item.nama_barang}</span>
                                <span class="product-stock" style="color: #e11d48; font-weight: 600; text-align: right;">
                                    Stok: ${item.stok} ${item.satuan}
                                    <span style="font-size: 11px; font-weight: normal; color: var(--text-muted); display: block; margin-top: 2px;">
                                        (Rekomendasi Pesan: +${reorderQty} ${item.satuan})
                                    </span>
                                </span>
                            `;
                            kritisListContainer.appendChild(itemDiv);
                        });
                    }
                    
                    // Produk Populer
                    const populerCard = monitoringCards[1];
                    populerCard.querySelector('.monitoring-header .badge-info').textContent = data.populerList.length;
                    const populerListContainer = populerCard.querySelector('.monitoring-list');
                    populerListContainer.innerHTML = '';
                    if (data.populerList.length === 0) {
                        populerListContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 14px; padding: 10px 0;">Belum ada produk populer (belum ada penjualan).</div>';
                    } else {
                        data.populerList.forEach(item => {
                            const itemDiv = document.createElement('div');
                            itemDiv.className = 'product-item';
                            itemDiv.innerHTML = `
                                <span class="product-name">${item.nama_barang}</span>
                                <span class="product-stock" style="color: #059669; font-weight: 600;">Terjual: ${item.totalOut} ${item.satuan}</span>
                            `;
                            populerListContainer.appendChild(itemDiv);
                        });
                    }
                    
                    // Aktivitas Terbaru
                    const aktivitasCard = monitoringCards[2];
                    aktivitasCard.querySelector('.monitoring-header .badge-success').textContent = data.activities.length;
                    
                    const activityListContainer = aktivitasCard.querySelector('.activity-list');
                    activityListContainer.innerHTML = '';
                    if (data.activities.length === 0) {
                        activityListContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 14px; padding: 10px 0;">Belum ada aktivitas transaksi.</div>';
                    } else {
                        data.activities.forEach(act => {
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
            }
        } catch (e) {
            console.warn("Gagal terhubung ke API dashboard:", e);
        }
    };

    // Bindings untuk halaman
    if (document.getElementById('barangTableBody')) {
        const searchInput = document.querySelector('.search-box input');
        const kategoriFilter = document.getElementById('kategoriFilter');
        const trigger = () => {
            renderBarangTable(
                searchInput ? searchInput.value : '',
                kategoriFilter ? kategoriFilter.value : ''
            );
        };
        renderBarangTable();
        if (searchInput) searchInput.addEventListener('input', trigger);
        if (kategoriFilter) {
            kategoriFilter.addEventListener('change', trigger);
            kategoriFilter.addEventListener('input', trigger);
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

    if (document.getElementById('mutasiTableBody')) {
        renderMutasiTable();
        const searchInput = document.getElementById('searchMutasi');
        const dateInput = document.getElementById('filterTglMutasi');
        const trigger = () => {
            renderMutasiTable(searchInput ? searchInput.value : '', dateInput ? dateInput.value : '');
        };
        if (searchInput) searchInput.addEventListener('input', trigger);
        if (dateInput) dateInput.addEventListener('change', trigger);
    }

    if (document.getElementById('laporanStokTableBody')) {
        const searchInput = document.querySelector('.search-box input');
        const categorySelect = document.querySelector('.table-header-actions select');
        const monthInput = document.querySelector('.table-header-actions input[type="month"]');
        
        if (monthInput) {
            const now = new Date();
            const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            monthInput.value = currentMonthStr;
        }

        const trigger = () => {
            renderLaporanStokTable(
                searchInput ? searchInput.value : '', 
                categorySelect ? categorySelect.value : '', 
                monthInput ? monthInput.value : ''
            );
        };
        trigger();
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

    // --- SINKRONISASI & VERIFIKASI BACKEND DI LATAR BELAKANG ---
    let isServerOnline = false;
    try {
        const response = await fetch(BASE_URL + '/api/auth/me.php', { credentials: 'same-origin' });
        const data = await response.json();
        isServerOnline = true;
        if (data.status === 'success') {
            USER_SESSION = data.data;
            localStorage.setItem('ud_session', JSON.stringify(USER_SESSION));
            applySessionUI(USER_SESSION);
        } else {
            if (data.message && data.message.includes('perangkat lain')) {
                localStorage.removeItem('ud_session');
                USER_SESSION = null;
                window.location.href = BASE_URL + '/views/auth/login.html?expired=device';
                return;
            }
            let isLocalMock = false;
            if (initialSession && initialSession.isMock) {
                isLocalMock = true;
                USER_SESSION = initialSession;
            }
            if (!isLocalMock && !isLoginPage) {
                localStorage.removeItem('ud_session');
                USER_SESSION = null;
                window.location.href = BASE_URL + '/views/auth/login.html';
                return;
            }
        }
    } catch (error) {
        console.warn("Gagal mengecek session backend (PHP/Database mati), menggunakan local fallback:", error);
    }

    if (!isServerOnline && !USER_SESSION) {
        if (initialSession) {
            USER_SESSION = initialSession;
        }
    }

    if (!USER_SESSION && !isLoginPage) {
        window.location.href = BASE_URL + '/views/auth/login.html';
        return;
    }

    if (isServerOnline && USER_SESSION && !USER_SESSION.isMock) {
        await syncDatabase();
        // Re-render UI dengan data terbaru dari server
        if (document.getElementById('barangTableBody')) {
            const searchInput = document.querySelector('.search-box input');
            const kategoriFilter = document.getElementById('kategoriFilter');
            renderBarangTable(
                searchInput ? searchInput.value : '',
                kategoriFilter ? kategoriFilter.value : ''
            );
        }
        if (document.getElementById('barangMasukTableBody')) {
            renderBarangMasukTable();
        }
        if (document.getElementById('barangKeluarTableBody')) {
            renderBarangKeluarTable();
        }
        if (document.getElementById('mutasiTableBody')) {
            renderMutasiTable();
        }
        if (document.getElementById('laporanStokTableBody')) {
            const searchInput = document.querySelector('.search-box input');
            const categorySelect = document.querySelector('.table-header-actions select');
            const monthInput = document.querySelector('.table-header-actions input[type="month"]');
            renderLaporanStokTable(
                searchInput ? searchInput.value : '', 
                categorySelect ? categorySelect.value : '', 
                monthInput ? monthInput.value : ''
            );
        }
        if (document.getElementById('manajemenAkunTableBody')) {
            renderUserTable();
        }
        if (document.querySelector('.dashboard-cards')) {
            renderDashboard();
        }
        if (document.getElementById('opnameTableBody')) {
            renderOpnameTable();
        }
    }

    if (USER_SESSION && isLoginPage) {
        if (USER_SESSION.role === 'Staf Gudang') {
            window.location.href = BASE_URL + '/views/barang/data_barang.html';
        } else {
            window.location.href = BASE_URL + '/index.html';
        }
        return;
    }

    if (document.getElementById('opnameTableBody')) {
        renderOpnameTable();
        const searchInput = document.querySelector('.search-box input');
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                renderOpnameTable(this.value);
            });
        }
        const katFilter = document.getElementById('filterKategoriOpname');
        if (katFilter) {
            katFilter.addEventListener('change', function() {
                renderOpnameFormItems(this.value);
            });
        }
    }
    
    // Populasikan select barang secara dinamis jika ada form input transaksi
    if (typeof populateSelectBarangOptions === 'function') {
        populateSelectBarangOptions();
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
    const satuanBarangEl = document.getElementById('satuanBarang');
    const satuan = (satuanBarangEl && satuanBarangEl.value) ? satuanBarangEl.value.trim() : 'Pcs';
    const beratBarangEl = document.getElementById('beratBarang');
    const beratBarang = (beratBarangEl && beratBarangEl.value) ? beratBarangEl.value.trim() : '-';
    const dimensiBarangEl = document.getElementById('dimensiBarang');
    const dimensiBarang = (dimensiBarangEl && dimensiBarangEl.value) ? dimensiBarangEl.value.trim() : '-';
    const hargaBeliBarang = parseInt(document.getElementById('hargaBeliBarang').value || 0);
    const hargaBarang = parseInt(document.getElementById('hargaBarang').value || 0);
    const stokMinimumEl = document.getElementById('stokMinimum');
    const stokMinimum = (stokMinimumEl && stokMinimumEl.value !== '') ? parseInt(stokMinimumEl.value) : 10;
    
    // Auto-generate Kode SKU jika kosong
    const barangList = DB.get('ud_barang', []);
    let finalKodeBarang = kodeBarangInput;
    if (finalKodeBarang === '') {
        const maxId = barangList.length > 0 ? Math.max(...barangList.map(b => parseInt(b.id_barang) || 0)) : 0;
        finalKodeBarang = 'BRG-' + String(maxId + 1).padStart(3, '0');
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
    formData.append('stok_minimum', stokMinimum);

    fetch(BASE_URL + '/api/barang/save.php', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin'
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
                barangList[index].stok_minimum = stokMinimum;
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
                stok_minimum: stokMinimum,
                created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
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
            body: formData,
            credentials: 'same-origin'
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
        const keterangan = document.getElementById('keterangan').value.trim();

        formData.append('qty', qty);
        formData.append('po', po);
        formData.append('supplier', supplier);
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
        body: formData,
        credentials: 'same-origin'
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showToast(data.message, 'success');
            closeModalTransaksi();
            syncDatabase().then(() => {
                if (isMasuk) {
                    renderBarangMasukTable();
                } else {
                    renderBarangKeluarTable();
                }
            });
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
            body: formData,
            credentials: 'same-origin'
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                showToast(data.message, 'success');
                syncDatabase().then(() => {
                    renderBarangMasukTable();
                });
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
            body: formData,
            credentials: 'same-origin'
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                showToast(data.message, 'success');
                syncDatabase().then(() => {
                    renderBarangKeluarTable();
                });
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
        body: formData,
        credentials: 'same-origin'
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
                if (password !== '') {
                    userList[index].password = password;
                }
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
                role: role,
                password: password
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
            body: formData,
            credentials: 'same-origin'
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
                const satuanEl = document.getElementById('satuanBarang');
                if (satuanEl) satuanEl.value = item.satuan || '';
                const beratEl = document.getElementById('beratBarang');
                if (beratEl) beratEl.value = item.berat || '';
                const dimensiEl = document.getElementById('dimensiBarang');
                if (dimensiEl) dimensiEl.value = item.dimensi || '';
                const stokMinEl = document.getElementById('stokMinimum');
                if (stokMinEl) stokMinEl.value = item.stok_minimum !== undefined && item.stok_minimum !== null ? item.stok_minimum : '';
                document.getElementById('hargaBeliBarang').value = item.harga_beli || 0;
                document.getElementById('hargaBarang').value = item.harga;
                form.setAttribute('data-edit-id', id);
            }
        } else if (action === 'addMasuk') {
            modalTitle.innerText = 'Tambah Barang Masuk';
            if (form) form.reset();
            const dateInput = document.getElementById('tanggalTransaksi');
            if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
            
            // Auto generate ref and po
            const dateCompact = (dateInput ? dateInput.value : new Date().toISOString().split('T')[0]).replace(/-/g, '');
            const rand = Math.floor(1000 + Math.random() * 9000);
            const poInput = document.getElementById('noPO');
            const refInput = document.getElementById('noReferensi');
            if (poInput) poInput.value = `PO-${dateCompact}-${rand}`;
            if (refInput) refInput.value = `IN-${dateCompact}-${rand}`;
            
            // Populasikan list autocomplete supplier secara dinamis
            const supplierDatalist = document.getElementById('supplierList');
            if (supplierDatalist) {
                supplierDatalist.innerHTML = '';
                fetch(BASE_URL + '/api/transaksi/masuk.php?action=suppliers', { credentials: 'same-origin' })
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'success') {
                        data.data.forEach(supName => {
                            const opt = document.createElement('option');
                            opt.value = supName;
                            supplierDatalist.appendChild(opt);
                        });
                    }
                })
                .catch(err => {
                    console.warn("Gagal memuat list supplier dinamis, menggunakan cache transaksi lokal:", err);
                    // Fallback offline: Ambil dari cache transaksi lokal
                    const masukList = DB.get('ud_transaksi_masuk', []);
                    const uniqueSuppliers = [...new Set(masukList.map(t => t.supplier))].filter(Boolean);
                    uniqueSuppliers.forEach(supName => {
                        const opt = document.createElement('option');
                        opt.value = supName;
                        supplierDatalist.appendChild(opt);
                    });
                });
            }
        } else if (action === 'addKeluar') {
            modalTitle.innerText = 'Tambah Barang Keluar';
            if (form) form.reset();
            const dateInput = document.getElementById('tanggalTransaksi');
            if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
            
            // Auto generate ref
            const dateCompact = (dateInput ? dateInput.value : new Date().toISOString().split('T')[0]).replace(/-/g, '');
            const rand = Math.floor(1000 + Math.random() * 9000);
            const refInput = document.getElementById('noReferensi');
            if (refInput) refInput.value = `OUT-${dateCompact}-${rand}`;
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
    const dynamicProfileModal = document.getElementById('dynamicProfileModal');
    const dynamicSettingsModal = document.getElementById('dynamicSettingsModal');
    
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
    if (event.target == dynamicProfileModal) {
        dynamicProfileModal.remove();
    }
    if (event.target == dynamicSettingsModal) {
        dynamicSettingsModal.remove();
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
        
        const savedVolume = parseFloat(localStorage.getItem('ud_beep_volume') ?? '0.1');
        gainNode.gain.setValueAtTime(savedVolume, audioCtx.currentTime);
        
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

// ==========================================================
// DYNAMIC MODALS FOR PROFILE & SETTINGS
// ==========================================================
window.openProfileModal = function() {
    // Bersihkan modal profil dinamis lama jika ada
    const existing = document.getElementById('dynamicProfileModal');
    if (existing) existing.remove();

    const currentVolume = Math.round(parseFloat(localStorage.getItem('ud_beep_volume') ?? '0.1') * 100);
    const currentDuration = localStorage.getItem('ud_toast_duration') ?? '3000';

    const profileModalHTML = `
    <div id="dynamicProfileModal" class="modal" style="display: flex;">
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3>Profil & Pengaturan Akun</h3>
                <span class="close-btn" onclick="document.getElementById('dynamicProfileModal').remove()">&times;</span>
            </div>
            <div class="modal-body" style="max-height: 80vh; overflow-y: auto; padding: 20px;">
                <!-- Kartu Informasi Pengguna -->
                <div style="display: flex; align-items: center; gap: 15px; background: #f8fafc; padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 20px;">
                    <div style="width: 55px; height: 55px; border-radius: 50%; background-color: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 24px;">
                        <i class="fas fa-user"></i>
                    </div>
                    <div>
                        <h4 style="font-size: 15px; color: var(--text-main); margin-bottom: 2px;">${USER_SESSION.nama_lengkap}</h4>
                        <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">Username: <span style="font-weight: 600; color: var(--text-main);">${USER_SESSION.username}</span></p>
                        <span class="badge badge-info" style="font-size: 9px; padding: 2px 6px;">${USER_SESSION.role}</span>
                    </div>
                </div>
                
                <!-- Kelompok 1: Ubah Keamanan Password -->
                <form id="changePasswordForm" onsubmit="event.preventDefault(); window.changeProfilePassword();" style="background: var(--surface); padding: 15px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 15px;">
                    <h5 style="margin-bottom: 12px; color: var(--primary); font-size: 13px; border-bottom: 1px solid var(--border-color); padding-bottom: 6px;"><i class="fas fa-key" style="margin-right: 5px;"></i> Ubah Keamanan Password</h5>
                    <div class="input-group" style="margin-bottom: 8px;">
                        <label style="font-size: 11px; font-weight: 600;">Password Sekarang</label>
                        <input type="password" id="oldPasswordInput" placeholder="Masukkan password lama" required style="width: 100%; padding: 8px 10px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 13px; outline: none; background-color: var(--surface);">
                    </div>
                    <div class="input-group" style="margin-bottom: 12px;">
                        <label style="font-size: 11px; font-weight: 600;">Password Baru</label>
                        <input type="password" id="newPasswordInput" placeholder="Masukkan password baru" required style="width: 100%; padding: 8px 10px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 13px; outline: none; background-color: var(--surface);">
                    </div>
                    <button type="submit" class="btn btn-primary btn-full" style="padding: 8px; font-size: 12px;">Simpan Password Baru</button>
                </form>
                
                <!-- Kelompok 2: Preferensi Aplikasi -->
                <div style="background: var(--surface); padding: 15px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                    <h5 style="margin-bottom: 12px; color: var(--primary); font-size: 13px; border-bottom: 1px solid var(--border-color); padding-bottom: 6px;"><i class="fas fa-sliders-h" style="margin-right: 5px;"></i> Preferensi Aplikasi</h5>
                    
                    <!-- Volume Beep -->
                    <div style="margin-bottom: 12px;">
                        <label style="display: flex; justify-content: space-between; font-weight: 600; font-size: 11px; color: var(--text-main); margin-bottom: 6px;">
                            <span>Volume Beep (Scan QR)</span>
                            <span id="volumeValueLabel">${currentVolume}%</span>
                        </label>
                        <input type="range" id="soundVolumeRange" min="0" max="100" value="${currentVolume}" style="width: 100%; height: 5px; background: var(--border-color); border-radius: 3px; outline: none; cursor: pointer;">
                    </div>
                    
                    <!-- Durasi Toast -->
                    <div class="input-group" style="margin-bottom: 15px;">
                        <label style="font-size: 11px; font-weight: 600;">Durasi Notifikasi Toast</label>
                        <select id="toastDurationSelect" style="width: 100%; padding: 8px 10px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 13px; outline: none; background-color: var(--surface);">
                            <option value="2000" ${currentDuration === '2000' ? 'selected' : ''}>2 Detik</option>
                            <option value="3000" ${currentDuration === '3000' ? 'selected' : ''}>3 Detik (Default)</option>
                            <option value="5000" ${currentDuration === '5000' ? 'selected' : ''}>5 Detik</option>
                        </select>
                    </div>
                    
                    <!-- Reset Cache -->
                    <div style="border-top: 1px dashed var(--border-color); padding-top: 10px; text-align: center;">
                        <button class="btn btn-secondary" onclick="window.resetLocalStorageCache();" style="width: 100%; padding: 8px; font-size: 11px; color: #ef4444; border-color: #fecaca; background: #fef2f2;"><i class="fas fa-trash-alt" style="margin-right: 5px;"></i> Bersihkan Cache Lokal & Sync Ulang</button>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="document.getElementById('dynamicProfileModal').remove()">Batal</button>
                <button class="btn btn-primary" onclick="window.saveSettingsPreferences();"><i class="fas fa-save" style="margin-right: 5px;"></i> Simpan Pengaturan</button>
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', profileModalHTML);

    document.getElementById('soundVolumeRange').oninput = function() {
        document.getElementById('volumeValueLabel').innerText = this.value + '%';
    };
};

window.changeProfilePassword = function() {
    const oldPassword = document.getElementById('oldPasswordInput').value;
    const newPassword = document.getElementById('newPasswordInput').value;
    
    const formBtn = document.querySelector('#changePasswordForm button');
    const originalText = formBtn.innerHTML;
    formBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Menyimpan...';
    formBtn.disabled = true;
    
    const formData = new FormData();
    formData.append('old_password', oldPassword);
    formData.append('new_password', newPassword);
    
    fetch(BASE_URL + '/api/auth/change_password.php', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin'
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            showToast(data.message, 'success');
            document.getElementById('dynamicProfileModal').remove();
        } else {
            showToast(data.message, 'error');
        }
        formBtn.innerHTML = originalText;
        formBtn.disabled = false;
    })
    .catch(err => {
        showToast('Gagal mengubah password (Offline).', 'error');
        formBtn.innerHTML = originalText;
        formBtn.disabled = false;
    });
};

window.saveSettingsPreferences = function() {
    const volVal = parseFloat(document.getElementById('soundVolumeRange').value) / 100;
    const durVal = document.getElementById('toastDurationSelect').value;
    
    localStorage.setItem('ud_beep_volume', volVal);
    localStorage.setItem('ud_toast_duration', durVal);
    
    showToast('Preferensi pengaturan berhasil disimpan!', 'success');
    document.getElementById('dynamicProfileModal').remove();
};

window.resetLocalStorageCache = function() {
    if (confirm('Apakah Anda yakin ingin membersihkan seluruh cache database offline lokal? Aplikasi akan melakukan sinkronisasi ulang.')) {
        localStorage.removeItem('ud_barang');
        localStorage.removeItem('ud_transaksi_masuk');
        localStorage.removeItem('ud_transaksi_keluar');
        localStorage.removeItem('ud_cleaned_dummy');
        showToast('Cache berhasil dibersihkan! Me-reload halaman...', 'success');
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }
};

// ==========================================================
// CYCLE COUNT / STOCK OPNAME CONTROLLER
// ==========================================================
window.currentOpnameValues = {};
window.currentEditingOpnameId = null;

window.renderOpnameTable = async function(searchQuery = '') {
    const tableBody = document.getElementById('opnameTableBody');
    if (!tableBody) return;

    let opnameList = [];
    try {
        const response = await fetch(BASE_URL + '/api/laporan/read_opname.php', { credentials: 'same-origin' });
        const data = await response.json();
        if (data.status === 'success') {
            opnameList = data.data;
            DB.set('ud_opname', opnameList);
        } else {
            opnameList = DB.get('ud_opname', []);
        }
    } catch (e) {
        console.warn("Gagal terhubung ke API opname, menggunakan cache lokal:", e);
        opnameList = DB.get('ud_opname', []);
    }

    tableBody.innerHTML = '';

    const filtered = opnameList.filter(item => {
        return (item.keterangan && item.keterangan.toLowerCase().includes(searchQuery.toLowerCase())) ||
               (item.nama_user && item.nama_user.toLowerCase().includes(searchQuery.toLowerCase()));
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px 20px;"><div style="color: var(--border-color); margin-bottom: 15px;"><i class="fas fa-clipboard-check fa-3x"></i></div><div style="color: var(--text-muted); font-size: 14px;">Data Stock Opname tidak ditemukan. Silakan mulai opname baru.</div></td></tr>';
        return;
    }

    filtered.forEach(item => {
        const row = document.createElement('tr');

        // Build barang preview chips
        const preview = item.barang_preview || [];
        let barangHtml = '';
        if (preview.length === 0) {
            barangHtml = '<span style="color: var(--text-muted); font-size: 12px;">-</span>';
        } else {
            barangHtml = preview.map(nama =>
                `<span style="display: inline-block; background: rgba(99,102,241,0.1); color: #6366f1; border-radius: 4px; padding: 2px 7px; font-size: 11px; font-weight: 500; margin: 2px 2px 2px 0;">${nama}</span>`
            ).join('');
            const sisa = item.total_item - preview.length;
            if (sisa > 0) {
                barangHtml += `<span style="display: inline-block; background: rgba(100,116,139,0.1); color: #64748b; border-radius: 4px; padding: 2px 7px; font-size: 11px; margin: 2px 0;">+${sisa} lainnya</span>`;
            }
        }

        row.innerHTML = `
            <td>${item.tgl_opname}</td>
            <td style="max-width: 260px;">${barangHtml}</td>
            <td>${item.nama_user}</td>
            <td style="text-align: center;">${item.total_item}</td>
            <td style="text-align: center;">
                <span class="badge" style="background-color: ${item.total_selisih_qty > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)'}; color: ${item.total_selisih_qty > 0 ? '#ef4444' : '#10b981'}; font-weight: 600;">
                    ${item.total_selisih_qty} Item Berselisih
                </span>
            </td>
            <td style="color: var(--text-muted); font-size: 13px;">${item.keterangan || '-'}</td>
            <td style="text-align: center;">
                <div style="display: flex; justify-content: center; gap: 8px;">
                    <button class="btn-icon" onclick="viewOpnameDetail(${item.id_opname}, '${(item.tgl_opname || '').replace(/'/g, "\\'")}'  , '${(item.keterangan || '').replace(/'/g, "\\'")}'  , '${(item.nama_user || '').replace(/'/g, "\\'")}'  )" title="Lihat Detail" style="background: rgba(99,102,241,0.1); color: #6366f1;">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon btn-edit" onclick="editOpname(${item.id_opname})" title="Edit Opname">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteOpname(${item.id_opname})" title="Hapus Opname">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
};

window.viewOpnameDetail = async function(id, tgl, ket, petugas) {
    const modal = document.getElementById('opnameDetailModal');
    if (!modal) return;

    // Set header
    document.getElementById('opnameDetailTitle').innerText = `Detail Opname — ${tgl}`;
    document.getElementById('opnameDetailSubtitle').innerText = `${ket || '-'}  •  Petugas: ${petugas}`;
    document.getElementById('opnameDetailSummary').innerHTML = '';

    // Reset table
    const tbody = document.getElementById('opnameDetailTableBody');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px; color: var(--text-muted);"><i class="fas fa-circle-notch fa-spin" style="margin-right:6px;"></i>Memuat data...</td></tr>';
    modal.style.display = 'flex';

    try {
        const res = await fetch(BASE_URL + `/api/laporan/read_opname.php?action=detail&id_opname=${id}`, { credentials: 'same-origin' });
        const data = await res.json();

        if (data.status !== 'success' || !data.data.length) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-muted);">Tidak ada item teropname.</td></tr>';
            return;
        }

        const items = data.data;
        const totalSelisih = items.filter(i => parseInt(i.selisih) !== 0).length;
        const totalItem = items.length;

        // Summary badges
        const sumEl = document.getElementById('opnameDetailSummary');
        sumEl.innerHTML = `
            <span style="background: rgba(99,102,241,0.1); color:#6366f1; padding:5px 14px; border-radius:20px; font-size:13px; font-weight:600;">
                <i class="fas fa-boxes" style="margin-right:5px;"></i>${totalItem} Item Teropname
            </span>
            <span style="background: ${totalSelisih > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)'}; color:${totalSelisih > 0 ? '#ef4444' : '#10b981'}; padding:5px 14px; border-radius:20px; font-size:13px; font-weight:600;">
                <i class="fas fa-${totalSelisih > 0 ? 'exclamation-triangle' : 'check-circle'}" style="margin-right:5px;"></i>${totalSelisih} Item Berselisih
            </span>
        `;

        // Render rows
        tbody.innerHTML = '';
        items.forEach((item, idx) => {
            const selisih = parseInt(item.selisih) || 0;
            let selisihText = selisih === 0 ? '0' : (selisih > 0 ? `+${selisih}` : `${selisih}`);
            let selisihColor = selisih === 0 ? 'var(--text-muted)' : (selisih > 0 ? '#10b981' : '#ef4444');
            const rowBg = selisih !== 0 ? 'rgba(245,158,11,0.05)' : '';

            const tr = document.createElement('tr');
            if (rowBg) tr.style.backgroundColor = rowBg;
            tr.innerHTML = `
                <td style="text-align:center; color:var(--text-muted); font-size:12px;">${idx + 1}</td>
                <td>
                    <div style="font-weight:600; font-size:13px;">${item.nama_barang}</div>
                    <div style="font-size:11px; color:var(--text-muted); font-family:monospace;">${item.kode_barang}</div>
                </td>
                <td><span class="badge" style="background:rgba(99,102,241,0.1); color:#6366f1; font-weight:500;">${item.lokasi_rak || '-'}</span></td>
                <td style="text-align:center; font-weight:600;">${item.stok_sistem}</td>
                <td style="text-align:center; font-weight:600;">${item.stok_fisik}</td>
                <td style="text-align:center; font-weight:700; color:${selisihColor};">${selisihText}</td>
                <td style="font-size:13px; color:var(--text-muted);">${item.ket_selisih || '-'}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px; color:#ef4444;">Gagal memuat detail. Periksa koneksi.</td></tr>';
    }
};

window.closeOpnameDetailModal = function() {
    const modal = document.getElementById('opnameDetailModal');
    if (modal) modal.style.display = 'none';
};

window.openOpnameModal = async function() {
    const modal = document.getElementById('opnameModal');
    if (!modal) return;

    modal.style.display = 'flex';
    
    const titleEl = document.querySelector('#opnameModal h3');
    if (titleEl) titleEl.innerText = 'Mulai Stock Opname Baru';
    
    window.currentEditingOpnameId = null;
    document.getElementById('tglOpname').value = new Date().toISOString().split('T')[0];
    document.getElementById('keteranganOpname').value = '';
    document.getElementById('filterKategoriOpname').value = '';

    // Ambil list barang terbaru
    let barangList = [];
    try {
        const res = await fetch(BASE_URL + '/api/barang/read.php', { credentials: 'same-origin' });
        const data = await res.json();
        if (data.status === 'success') {
            barangList = data.data;
            DB.set('ud_barang', barangList);
        } else {
            barangList = DB.get('ud_barang', []);
        }
    } catch (e) {
        barangList = DB.get('ud_barang', []);
    }

    // Initialize in-memory values — semua item otomatis diikutsertakan
    window.currentOpnameValues = {};
    barangList.forEach(item => {
        const stok = parseInt(item.stok) || 0;
        window.currentOpnameValues[item.id_barang] = {
            id_barang: item.id_barang,
            kode_barang: item.kode_barang,
            nama_barang: item.nama_barang,
            lokasi_rak: item.lokasi_rak || '-',
            kategori: item.kategori,
            stok_sistem: stok,
            stok_fisik: stok,
            stok_awal: stok,   // simpan nilai awal untuk deteksi perubahan
            keterangan: '',
            checked: true
        };
    });

    window.renderOpnameFormItems();
};

window.closeOpnameModal = function() {
    const modal = document.getElementById('opnameModal');
    if (modal) modal.style.display = 'none';
};

// Helper: hitung & tampilkan counter perubahan
window.updateOpnameCounter = function() {
    const counter = document.getElementById('opnameChangeCounter');
    if (!counter) return;
    const all = Object.values(window.currentOpnameValues);
    const changed = all.filter(i => i.stok_fisik !== i.stok_awal || i.keterangan !== '');
    if (changed.length === 0) {
        counter.innerHTML = `<span style="color: var(--text-muted);">Ubah stok fisik barang yang perlu disesuaikan</span>`;
    } else {
        counter.innerHTML = `<span style="background: rgba(16,185,129,0.12); color: #10b981; padding: 3px 10px; border-radius: 20px; font-weight: 600;">✓ ${changed.length} dari ${all.length} item diubah</span>`;
    }
};

window.renderOpnameFormItems = function(categoryFilter = '') {
    const formTableBody = document.getElementById('opnameFormTableBody');
    if (!formTableBody) return;

    formTableBody.innerHTML = '';

    const items = Object.values(window.currentOpnameValues).filter(item => {
        return categoryFilter === '' || item.kategori === categoryFilter;
    });

    if (items.length === 0) {
        formTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 15px;">Tidak ada barang dalam kategori ini</td></tr>';
        window.updateOpnameCounter();
        return;
    }

    items.forEach(item => {
        const row = document.createElement('tr');
        const diff = item.stok_fisik - item.stok_sistem;
        let diffText = '0';
        let diffColor = 'inherit';
        if (diff > 0) {
            diffText = `+${diff}`;
            diffColor = '#10b981';
        } else if (diff < 0) {
            diffText = `${diff}`;
            diffColor = '#ef4444';
        }

        // Highlight baris jika sudah diubah dari nilai awal
        const isModified = item.stok_fisik !== item.stok_awal || item.keterangan !== '';
        if (isModified) {
            row.style.backgroundColor = 'rgba(245, 158, 11, 0.06)';
            row.style.borderLeft = '3px solid #f59e0b';
        }

        row.innerHTML = `
            <td>
                <div style="font-weight: 600; font-size: 13px;">${item.nama_barang}</div>
                <div style="font-size: 11px; color: var(--text-muted); font-family: monospace;">${item.kode_barang}</div>
            </td>
            <td><span class="badge" style="background: rgba(99, 102, 241, 0.1); color: #6366f1; font-weight: 500;">${item.lokasi_rak}</span></td>
            <td style="text-align: center; font-weight: 600;">${item.stok_sistem}</td>
            <td style="text-align: center;">
                <input type="number" class="fisik-input" data-id="${item.id_barang}" min="0" value="${item.stok_fisik}" style="width: 80px; padding: 6px; border: 1px solid ${isModified ? '#f59e0b' : 'var(--border-color)'}; border-radius: var(--radius-sm); text-align: center; outline: none; background-color: var(--surface);">
            </td>
            <td style="text-align: center; font-weight: 600; color: ${diffColor};" class="diff-span" data-id="${item.id_barang}">${diffText}</td>
            <td>
                <input type="text" class="ket-input" data-id="${item.id_barang}" value="${item.keterangan}" placeholder="Catatan selisih" style="width: 100%; padding: 6px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); outline: none; background-color: var(--surface);">
            </td>
        `;

        formTableBody.appendChild(row);

        const fisikInp = row.querySelector('.fisik-input');
        const ketInp = row.querySelector('.ket-input');
        const diffSpan = row.querySelector('.diff-span');

        fisikInp.oninput = function() {
            const val = parseInt(this.value);
            const cleanVal = isNaN(val) ? 0 : val;

            window.currentOpnameValues[item.id_barang].stok_fisik = cleanVal;

            // update selisih UI
            const newDiff = cleanVal - item.stok_sistem;
            if (newDiff > 0) {
                diffSpan.innerText = `+${newDiff}`;
                diffSpan.style.color = '#10b981';
            } else if (newDiff < 0) {
                diffSpan.innerText = `${newDiff}`;
                diffSpan.style.color = '#ef4444';
            } else {
                diffSpan.innerText = '0';
                diffSpan.style.color = 'inherit';
            }

            // highlight baris jika berbeda dari nilai awal
            const nowModified = cleanVal !== window.currentOpnameValues[item.id_barang].stok_awal
                             || window.currentOpnameValues[item.id_barang].keterangan !== '';
            row.style.backgroundColor = nowModified ? 'rgba(245, 158, 11, 0.06)' : '';
            row.style.borderLeft = nowModified ? '3px solid #f59e0b' : '';
            this.style.borderColor = nowModified ? '#f59e0b' : 'var(--border-color)';

            window.updateOpnameCounter();
        };

        ketInp.oninput = function() {
            window.currentOpnameValues[item.id_barang].keterangan = this.value;

            const nowModified = window.currentOpnameValues[item.id_barang].stok_fisik !== window.currentOpnameValues[item.id_barang].stok_awal
                             || this.value !== '';
            row.style.backgroundColor = nowModified ? 'rgba(245, 158, 11, 0.06)' : '';
            row.style.borderLeft = nowModified ? '3px solid #f59e0b' : '';

            window.updateOpnameCounter();
        };
    });

    window.updateOpnameCounter();
};

window.saveOpname = function() {
    const tgl = document.getElementById('tglOpname').value;
    const ket = document.getElementById('keteranganOpname').value.trim();

    if (!tgl || !ket) {
        showToast('Tanggal dan keterangan opname wajib diisi!', 'error');
        return;
    }

    // Simpan semua item (opname mencatat seluruh stok, bukan hanya yang berubah)
    const itemsToSave = Object.values(window.currentOpnameValues);

    if (itemsToSave.length === 0) {
        showToast('Tidak ada data barang. Pastikan data barang sudah diisi terlebih dahulu.', 'error');
        return;
    }

    const btn = document.querySelector('#opnameModal .modal-footer .btn-primary');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Menyimpan...';
    btn.disabled = true;

    // Siapkan POST FormData
    const formData = new FormData();
    if (window.currentEditingOpnameId) {
        formData.append('id_opname', window.currentEditingOpnameId);
    }
    formData.append('tgl_opname', tgl);
    formData.append('keterangan', ket);
    formData.append('items', JSON.stringify(itemsToSave));

    fetch(BASE_URL + '/api/laporan/save_opname.php', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin'
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            showToast(data.message, 'success');
            closeOpnameModal();
            renderOpnameTable();
        } else {
            showToast(data.message, 'error');
        }
        btn.innerHTML = originalText;
        btn.disabled = false;
        window.currentEditingOpnameId = null;
    })
    .catch(error => {
        console.warn("Gagal mengirim data opname ke server, menggunakan fallback offline:", error);

        // --- FALLBACK OFFLINE LOCALSTORAGE ---
        const opnameList = DB.get('ud_opname', []);
        const barangList = DB.get('ud_barang', []);
        const totalItemsWithDiff = itemsToSave.filter(i => i.stok_fisik !== i.stok_sistem).length;

        if (window.currentEditingOpnameId) {
            // Edit mode offline
            const index = opnameList.findIndex(o => o.id_opname === window.currentEditingOpnameId);
            if (index !== -1) {
                const oldDetails = opnameList[index].details || [];
                
                // 1. Revert stocks for all items in the old details to their stok_sistem
                oldDetails.forEach(oldItem => {
                    const target = barangList.find(b => Number(b.id_barang) === Number(oldItem.id_barang));
                    if (target) {
                        target.stok = oldItem.stok_sistem;
                    }
                });

                // 2. Set stocks to new physical count for currently checked items
                itemsToSave.forEach(item => {
                    const target = barangList.find(b => Number(b.id_barang) === Number(item.id_barang));
                    if (target) {
                        target.stok = item.stok_fisik;
                    }
                });

                opnameList[index].tgl_opname = tgl;
                opnameList[index].keterangan = ket;
                opnameList[index].total_item = itemsToSave.length;
                opnameList[index].total_selisih_qty = totalItemsWithDiff;
                opnameList[index].details = itemsToSave;
            }
            showToast('Stock Opname berhasil diperbarui secara lokal! (Offline)', 'success');
        } else {
            // Insert mode offline
            // Update local stock for each adjusted item
            itemsToSave.forEach(item => {
                const target = barangList.find(b => Number(b.id_barang) === Number(item.id_barang));
                if (target) {
                    target.stok = item.stok_fisik;
                }
            });

            const nextId = opnameList.length > 0 ? Math.max(...opnameList.map(o => o.id_opname)) + 1 : 1;
            const newLocalOpname = {
                id_opname: nextId,
                tgl_opname: tgl,
                keterangan: ket,
                nama_user: USER_SESSION ? USER_SESSION.nama_lengkap : 'Staf Gudang (Offline)',
                total_item: itemsToSave.length,
                total_selisih_qty: totalItemsWithDiff,
                details: itemsToSave
            };
            opnameList.unshift(newLocalOpname); // add to top
            showToast('Stock Opname berhasil disimpan secara lokal! (Offline)', 'success');
        }

        DB.set('ud_opname', opnameList);
        DB.set('ud_barang', barangList);

        closeOpnameModal();
        renderOpnameTable();
        window.currentEditingOpnameId = null;

        btn.innerHTML = originalText;
        btn.disabled = false;
    });
};

window.editOpname = async function(id) {
    const modal = document.getElementById('opnameModal');
    if (!modal) return;

    // Ubah Judul modal
    const titleEl = document.querySelector('#opnameModal h3');
    if (titleEl) titleEl.innerText = 'Edit Hasil Stock Opname';

    window.currentEditingOpnameId = id;
    window.currentOpnameValues = {};

    let details = [];
    let header = null;

    const opnameList = DB.get('ud_opname', []);
    const localOpname = opnameList.find(o => o.id_opname === id);

    try {
        const res = await fetch(BASE_URL + `/api/laporan/read_opname.php?action=detail&id_opname=${id}`, { credentials: 'same-origin' });
        const data = await res.json();
        if (data.status === 'success') {
            details = data.data;
            if (localOpname) {
                header = localOpname;
            } else {
                header = {
                    tgl_opname: details[0] ? new Date().toISOString().split('T')[0] : '-',
                    keterangan: 'Edit Sesi'
                };
            }
        } else {
            if (localOpname) {
                header = localOpname;
                details = localOpname.details || [];
            }
        }
    } catch (e) {
        console.warn("Gagal terhubung ke API detail opname, menggunakan cache lokal:", e);
        if (localOpname) {
            header = localOpname;
            details = localOpname.details || [];
        }
    }

    if (!header && !localOpname) {
        showToast('Data opname tidak ditemukan.', 'error');
        return;
    }

    // Isikan tanggal dan keterangan di modal
    document.getElementById('tglOpname').value = header.tgl_opname || new Date().toISOString().split('T')[0];
    document.getElementById('keteranganOpname').value = header.keterangan || '';
    document.getElementById('filterKategoriOpname').value = '';

    // Isi currentOpnameValues berdasarkan detail sesi opname lama, tandai checked: true
    details.forEach(item => {
        const idBarang = item.id_barang;
        const stokFisik = parseInt(item.stok_fisik) || 0;
        window.currentOpnameValues[idBarang] = {
            id_barang: idBarang,
            kode_barang: item.kode_barang,
            nama_barang: item.nama_barang,
            lokasi_rak: item.lokasi_rak || '-',
            kategori: item.kategori || '',
            stok_sistem: parseInt(item.stok_sistem) || 0,
            stok_fisik: stokFisik,
            stok_awal: stokFisik,   // nilai awal saat edit dibuka (untuk deteksi perubahan)
            keterangan: item.ket_selisih || item.keterangan || '',
            checked: true
        };
    });

    // Render tabel form
    window.renderOpnameFormItems();
    modal.style.display = 'flex';
};

window.deleteOpname = function(id) {
    if (!confirm("Apakah Anda yakin ingin menghapus sesi stock opname ini? Seluruh stok barang akan dikembalikan ke kondisi sebelum opname.")) {
        return;
    }

    fetch(BASE_URL + '/api/laporan/save_opname.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            '_method': 'DELETE',
            'id_opname': id
        }),
        credentials: 'same-origin'
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            showToast(data.message, 'success');
            renderOpnameTable();
        } else {
            showToast(data.message, 'error');
        }
    })
    .catch(error => {
        console.warn("Gagal menghapus opname di server, menggunakan fallback offline:", error);

        // --- FALLBACK OFFLINE LOCALSTORAGE ---
        const opnameList = DB.get('ud_opname', []);
        const barangList = DB.get('ud_barang', []);

        const targetIndex = opnameList.findIndex(o => o.id_opname === id);
        if (targetIndex === -1) {
            showToast('Sesi opname tidak ditemukan secara lokal.', 'error');
            return;
        }

        const targetOpname = opnameList[targetIndex];
        const details = targetOpname.details || [];

        // Kembalikan/Rollback stok barang ke stok_sistem
        details.forEach(item => {
            const targetBrg = barangList.find(b => Number(b.id_barang) === Number(item.id_barang));
            if (targetBrg) {
                targetBrg.stok = item.stok_sistem;
            }
        });

        // Hapus dari list sesi opname
        opnameList.splice(targetIndex, 1);

        DB.set('ud_opname', opnameList);
        DB.set('ud_barang', barangList);

        showToast('Sesi Stock Opname berhasil dihapus secara lokal! (Offline)', 'success');
        renderOpnameTable();
    });
};

// ==========================================================
// WAREHOUSE MUTATION (MUTASI ANTAR GUDANG) CONTROLLER
// ==========================================================

window.renderMutasiTable = async function(searchQuery = '', dateFilter = '') {
    const tableBody = document.getElementById('mutasiTableBody');
    if (!tableBody) return;
    
    let mutasiList = [];
    try {
        const response = await fetch(BASE_URL + '/api/transaksi/read_mutasi.php', { credentials: 'same-origin' });
        const data = await response.json();
        if (data.status === 'success') {
            mutasiList = data.data;
            DB.set('ud_mutasi', mutasiList); // Sync cache
        } else {
            mutasiList = DB.get('ud_mutasi', []);
        }
    } catch (e) {
        console.warn("Gagal terhubung ke API mutasi, menggunakan cache lokal:", e);
        mutasiList = DB.get('ud_mutasi', []);
    }
    
    tableBody.innerHTML = '';
    
    const filtered = mutasiList.filter(item => {
        const matchesSearch = (item.no_mutasi && item.no_mutasi.toLowerCase().includes(searchQuery.toLowerCase())) || 
                              (item.barang && item.barang.toLowerCase().includes(searchQuery.toLowerCase())) || 
                              (item.keterangan && item.keterangan.toLowerCase().includes(searchQuery.toLowerCase())) || 
                              (item.gudang_asal && item.gudang_asal.toLowerCase().includes(searchQuery.toLowerCase())) || 
                              (item.gudang_tujuan && item.gudang_tujuan.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesDate = dateFilter === '' || item.tanggal === dateFilter;
        return matchesSearch && matchesDate;
    });
    
    if (filtered.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px 20px;"><div style="color: var(--border-color); margin-bottom: 15px;"><i class="fas fa-exchange-alt fa-3x" style="opacity: 0.5;"></i></div><div style="color: var(--text-muted); font-size: 14px;">Data transaksi mutasi tidak ditemukan.</div></td></tr>';
        return;
    }
    
    filtered.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.tanggal}</td>
            <td style="font-weight: 600; font-family: monospace; color: var(--primary);">${item.no_mutasi}</td>
            <td style="font-weight: 500;">${item.barang}</td>
            <td>
                <div style="font-size:12px;color:var(--text-muted);"><i class="fas fa-sign-out-alt" style="width:14px;color:#ef4444;"></i> <span style="color:var(--text-main);">${item.gudang_asal}</span></div>
                <div style="font-size:12px;color:var(--text-muted);margin-top:4px;"><i class="fas fa-sign-in-alt" style="width:14px;color:#10b981;"></i> <span style="color:var(--text-main);">${item.gudang_tujuan}</span></div>
            </td>
            <td>
                <strong>${item.qty}</strong>
                <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Ongkir: Rp ${(item.biaya_kirim || 0).toLocaleString('id-ID')}</div>
            </td>
            <td>
                <button class="btn-icon" style="color: #6366f1; background: rgba(99, 102, 241, 0.1);" onclick="showDetailMutasi(${item.id_mutasi})" title="Detail"><i class="fas fa-eye"></i></button>
                <button class="btn-icon btn-delete" onclick="deleteMutasi(${item.id_mutasi})" title="Hapus Data"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });
};

window.openModalMutasi = function() {
    const modal = document.getElementById('mutasiModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    document.getElementById('formMutasi').reset();
    
    const dateInput = document.getElementById('tanggalMutasi');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    
    // Auto-generate temporary transaction code
    const today = new Date();
    const dateStr = today.getFullYear() + String(today.getMonth() + 1).padStart(2, '0') + String(today.getDate()).padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    document.getElementById('noMutasi').value = `MUT-${dateStr}-${rand}`;
    
    // Populate selectBarang
    const selectBarang = document.getElementById('pilihBarangMutasi');
    if (selectBarang) {
        const barangList = DB.get('ud_barang', []);
        selectBarang.innerHTML = '<option value="">-- Pilih Barang --</option>';
        barangList.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.id_barang || item.kode_barang; // use id_barang if available, else code
            opt.textContent = `${item.kode_barang} - ${item.nama_barang} (Stok: ${item.stok})`;
            selectBarang.appendChild(opt);
        });
    }
};

window.closeModalMutasi = function() {
    const modal = document.getElementById('mutasiModal');
    if (modal) modal.style.display = 'none';
};

window.saveMutasi = function() {
    const form = document.getElementById('formMutasi');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const tanggal = document.getElementById('tanggalMutasi').value;
    const noMutasi = document.getElementById('noMutasi').value;
    const selectBarang = document.getElementById('pilihBarangMutasi');
    const barangInput = selectBarang.value;
    const selectedOption = selectBarang.options[selectBarang.selectedIndex];
    if (!selectedOption || !selectedOption.text || selectedOption.text.indexOf(' - ') === -1) {
        showToast('Pilih barang terlebih dahulu.', 'error');
        return;
    }
    const barangName = selectedOption.text.split(' - ')[1].split(' (Stok:')[0];
    const gudangAsal = document.getElementById('gudangAsal').value;
    const gudangTujuan = document.getElementById('gudangTujuan').value;
    const jumlah = parseInt(document.getElementById('jumlahMutasi').value) || 0;
    const biayaKirim = parseFloat(document.getElementById('biayaKirim').value) || 0;
    const keterangan = document.getElementById('keteranganMutasi').value.trim();
    
    if (gudangAsal === gudangTujuan) {
        showToast('Gudang asal dan tujuan tidak boleh sama.', 'error');
        return;
    }
    
    if (jumlah <= 0) {
        showToast('Jumlah mutasi harus lebih besar dari 0.', 'error');
        return;
    }

    // Client-side stock check for validation
    const barangList = DB.get('ud_barang', []);
    const targetBarang = barangList.find(b => (b.id_barang == barangInput || b.kode_barang == barangInput));
    
    if (!targetBarang) {
        showToast('Barang tidak ditemukan.', 'error');
        return;
    }

    const isAsalCabang = gudangAsal.toLowerCase().includes('cabang');
    const isTujuanCabang = gudangTujuan.toLowerCase().includes('cabang');

    if (!isAsalCabang && isTujuanCabang) {
        // Pusat -> Cabang: needs stock subtraction check
        if (targetBarang.stok < jumlah) {
            showToast(`Stok tidak mencukupi! Stok saat ini: ${targetBarang.stok} ${targetBarang.satuan || ''}, diminta: ${jumlah} ${targetBarang.satuan || ''}.`, 'error');
            return;
        }
    }
    
    const btn = document.querySelector('#mutasiModal .modal-footer .btn-primary');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Menyimpan...';
    btn.disabled = true;
    
    const formData = new FormData();
    formData.append('tanggal', tanggal);
    formData.append('no_mutasi', noMutasi);
    formData.append('barang', barangInput);
    formData.append('gudang_asal', gudangAsal);
    formData.append('gudang_tujuan', gudangTujuan);
    formData.append('jumlah', jumlah);
    formData.append('biaya_kirim', biayaKirim);
    formData.append('keterangan', keterangan);
    
    fetch(BASE_URL + '/api/transaksi/save_mutasi.php', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin'
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            showToast(data.message, 'success');
            closeModalMutasi();
            renderMutasiTable();
        } else {
            showToast(data.message, 'error');
        }
        btn.innerHTML = originalText;
        btn.disabled = false;
    })
    .catch(error => {
        console.warn("Gagal mengirim data mutasi ke server, menggunakan fallback offline:", error);
        
        // --- FALLBACK OFFLINE LOCALSTORAGE ---
        const mutasiList = DB.get('ud_mutasi', []);
        
        // Apply stock adjustment to client-side cache
        if (isAsalCabang && !isTujuanCabang) {
            // Cabang -> Pusat: increase stock
            targetBarang.stok = Number(targetBarang.stok) + jumlah;
        } else if (!isAsalCabang && isTujuanCabang) {
            // Pusat -> Cabang: decrease stock
            targetBarang.stok = Number(targetBarang.stok) - jumlah;
        }
        // internal: no total stock changes
        
        const nextId = mutasiList.length > 0 ? Math.max(...mutasiList.map(m => m.id_mutasi || 0)) + 1 : 1;
        const newLocalMutasi = {
            id_mutasi: nextId,
            tanggal: tanggal,
            no_mutasi: noMutasi,
            barang: barangName,
            kode_barang: targetBarang.kode_barang,
            gudang_asal: gudangAsal,
            gudang_tujuan: gudangTujuan,
            qty: jumlah,
            biaya_kirim: biayaKirim,
            operator: USER_SESSION ? USER_SESSION.nama_lengkap : 'Staf Gudang (Offline)',
            keterangan: keterangan
        };
        
        mutasiList.unshift(newLocalMutasi);
        DB.set('ud_mutasi', mutasiList);
        DB.set('ud_barang', barangList);
        
        showToast('Transaksi Mutasi berhasil disimpan secara lokal! (Offline)', 'success');
        closeModalMutasi();
        renderMutasiTable();
        
        btn.innerHTML = originalText;
        btn.disabled = false;
    });
};

window.deleteMutasi = function(id) {
    if (!confirm("Apakah Anda yakin ingin menghapus transaksi mutasi ini? Stok barang akan dikembalikan ke kondisi semula.")) {
        return;
    }
    
    fetch(BASE_URL + '/api/transaksi/save_mutasi.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            '_method': 'DELETE',
            'id_mutasi': id
        }),
        credentials: 'same-origin'
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            showToast(data.message, 'success');
            renderMutasiTable();
        } else {
            showToast(data.message, 'error');
        }
    })
    .catch(error => {
        console.warn("Gagal menghapus mutasi di server, menggunakan fallback offline:", error);
        
        // Fallback offline
        const mutasiList = DB.get('ud_mutasi', []);
        const barangList = DB.get('ud_barang', []);
        
        const targetMutasiIndex = mutasiList.findIndex(m => m.id_mutasi === id);
        if (targetMutasiIndex === -1) {
            showToast('Transaksi mutasi tidak ditemukan secara lokal.', 'error');
            return;
        }
        
        const targetMut = mutasiList[targetMutasiIndex];
        
        // Cari barang
        const targetBarang = barangList.find(b => (b.id_barang == targetMut.id_barang || b.kode_barang == targetMut.kode_barang || b.nama_barang == targetMut.barang));
        
        if (targetBarang) {
            const isAsalCabang = targetMut.gudang_asal.toLowerCase().includes('cabang');
            const isTujuanCabang = targetMut.gudang_tujuan.toLowerCase().includes('cabang');
            
            if (isAsalCabang && !isTujuanCabang) {
                // Original: Cabang -> Pusat (increased stock)
                // Rollback: decrease stock
                targetBarang.stok = Math.max(0, Number(targetBarang.stok) - Number(targetMut.qty));
            } else if (!isAsalCabang && isTujuanCabang) {
                // Original: Pusat -> Cabang (decreased stock)
                // Rollback: increase stock
                targetBarang.stok = Number(targetBarang.stok) + Number(targetMut.qty);
            }
        }
        
        mutasiList.splice(targetMutasiIndex, 1);
        DB.set('ud_mutasi', mutasiList);
        DB.set('ud_barang', barangList);
        
        showToast('Transaksi mutasi berhasil dihapus secara lokal! (Offline)', 'success');
        renderMutasiTable();
    });
};

// ==========================================================
// TRANSACTION DETAIL MODALS CONTROLLERS
// ==========================================================

window.showDetailMasuk = function(id) {
    const list = DB.get('ud_transaksi_masuk', []);
    const item = list.find(x => x.id_masuk === id);
    if (!item) return;
    
    document.getElementById('detMasukTanggal').textContent = item.tanggal || '-';
    document.getElementById('detMasukPO').textContent = item.po || '-';
    document.getElementById('detMasukRef').textContent = item.ref || '-';
    document.getElementById('detMasukSupplier').textContent = item.supplier || '-';
    document.getElementById('detMasukBarang').textContent = item.barang || '-';
    document.getElementById('detMasukQty').textContent = `${item.qty || 0}`;
    document.getElementById('detMasukKeterangan').textContent = item.keterangan || '-';
    
    const modal = document.getElementById('detailMasukModal');
    if (modal) modal.style.display = 'flex';
};

window.closeDetailMasukModal = function() {
    const modal = document.getElementById('detailMasukModal');
    if (modal) modal.style.display = 'none';
};

window.showDetailKeluar = function(id) {
    const list = DB.get('ud_transaksi_keluar', []);
    const item = list.find(x => x.id_keluar === id);
    if (!item) return;
    
    document.getElementById('detKeluarTanggal').textContent = item.tanggal || '-';
    document.getElementById('detKeluarRef').textContent = item.ref || '-';
    document.getElementById('detKeluarTujuan').textContent = item.tujuan || '-';
    document.getElementById('detKeluarJenis').textContent = item.tujuan_keluar || 'Penjualan / Distribusi';
    document.getElementById('detKeluarBarang').textContent = item.barang || '-';
    document.getElementById('detKeluarQty').textContent = `${item.qty || 0}`;
    document.getElementById('detKeluarKeterangan').textContent = item.keterangan || '-';
    
    const modal = document.getElementById('detailKeluarModal');
    if (modal) modal.style.display = 'flex';
};

window.closeDetailKeluarModal = function() {
    const modal = document.getElementById('detailKeluarModal');
    if (modal) modal.style.display = 'none';
};

window.showDetailMutasi = function(id) {
    const list = DB.get('ud_mutasi', []);
    const item = list.find(x => x.id_mutasi === id);
    if (!item) return;
    
    document.getElementById('detMutasiTanggal').textContent = item.tanggal || '-';
    document.getElementById('detMutasiNo').textContent = item.no_mutasi || '-';
    document.getElementById('detMutasiBarang').textContent = item.barang || '-';
    document.getElementById('detMutasiAsal').textContent = item.gudang_asal || '-';
    document.getElementById('detMutasiTujuan').textContent = item.gudang_tujuan || '-';
    document.getElementById('detMutasiQty').textContent = `${item.qty || 0}`;
    document.getElementById('detMutasiBiaya').textContent = `Rp ${(item.biaya_kirim || 0).toLocaleString('id-ID')}`;
    document.getElementById('detMutasiOperator').textContent = item.operator || '-';
    document.getElementById('detMutasiKeterangan').textContent = item.keterangan || '-';
    
    const modal = document.getElementById('detailMutasiModal');
    if (modal) modal.style.display = 'flex';
};

window.closeDetailMutasiModal = function() {
    const modal = document.getElementById('detailMutasiModal');
    if (modal) modal.style.display = 'none';
};

window.populateSelectBarangOptions = function() {
    const selects = [
        document.getElementById('pilihBarang'),
        document.getElementById('pilihBarangMutasi')
    ];
    
    const barangList = DB.get('ud_barang', []);
    if (barangList.length === 0) return;
    
    selects.forEach(select => {
        if (!select) return;
        
        const firstOpt = select.options[0];
        const placeholder = (firstOpt && firstOpt.value === "") ? firstOpt.outerHTML : '<option value="">-- Pilih Barang --</option>';
        
        let html = placeholder;
        // Sort by kode_barang alphabetically
        const sortedBarang = [...barangList].sort((a, b) => a.kode_barang.localeCompare(b.kode_barang));
        
        sortedBarang.forEach(b => {
            html += `<option value="${b.nama_barang}">${b.kode_barang} - ${b.nama_barang} (Stok: ${b.stok})</option>`;
        });
        
        select.innerHTML = html;
    });
};
