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
        this.get('ud_barang', [
            { id_barang: 1, kode_barang: 'BRG-001', nama_barang: 'Semen Gresik 50kg', kategori: 'Material Dasar', stok: 150, satuan: 'Zak', harga: 65000 },
            { id_barang: 2, kode_barang: 'BRG-002', nama_barang: 'Paku Payung 5cm', kategori: 'Aksesoris', stok: 500, satuan: 'Kotak', harga: 15000 },
            { id_barang: 3, kode_barang: 'BRG-003', nama_barang: 'Cat Tembok Dulux', kategori: 'Finishing', stok: 30, satuan: 'Pail', harga: 150000 },
            { id_barang: 4, kode_barang: 'BRG-004', nama_barang: 'Besi Beton 10mm', kategori: 'Material Dasar', stok: 200, satuan: 'Batang', harga: 85000 },
            { id_barang: 5, kode_barang: 'BRG-005', nama_barang: 'Pipa PVC 3/4 inch', kategori: 'Plumbing', stok: 120, satuan: 'Batang', harga: 25000 }
        ]);
        
        this.get('ud_transaksi_masuk', [
            { id_masuk: 1, tanggal: '2026-05-10', ref: 'INV-202605-01', supplier: 'PT. Bangun Jaya', barang: 'Semen Gresik 50kg', qty: 50 },
            { id_masuk: 2, tanggal: '2026-05-09', ref: 'INV-202605-02', supplier: 'Toko Besi Maju', barang: 'Besi Beton 10mm', qty: 100 },
            { id_masuk: 3, tanggal: '2026-05-08', ref: 'INV-202605-03', supplier: 'CV. Warna Abadi', barang: 'Cat Tembok Dulux', qty: 15 }
        ]);
        
        this.get('ud_transaksi_keluar', [
            { id_keluar: 1, tanggal: '2026-05-11', ref: 'OUT-202605-01', tujuan: 'Proyek Perumahan A', barang: 'Semen Gresik 50kg', qty: 20 },
            { id_keluar: 2, tanggal: '2026-05-10', ref: 'OUT-202605-02', tujuan: 'Proyek Renovasi B', barang: 'Cat Tembok Dulux', qty: 5 },
            { id_keluar: 3, tanggal: '2026-05-09', ref: 'OUT-202605-03', tujuan: 'Mandor C (Eceran)', barang: 'Paku Payung 5cm', qty: 100 }
        ]);
        
        this.get('ud_users', [
            { id: 1, nama: 'Administrator Super', username: 'admin', role: 'Admin' },
            { id: 2, nama: 'Budi Santoso', username: 'budi_gudang', role: 'Staff Gudang' },
            { id: 3, nama: 'Siti Aminah', username: 'siti_manajer', role: 'Manajer' }
        ]);
    }
};

// Panggil init database segera
DB.init();

let USER_SESSION = null;

document.addEventListener('DOMContentLoaded', async function () {
    // Cek Session (PHP Backend)
    try {
        const response = await fetch(BASE_URL + '/api/auth/me.php');
        const data = await response.json();
        if (data.status === 'success') {
            USER_SESSION = data.data;
        }
    } catch (error) {
        console.warn("Gagal mengecek session backend (PHP/Database mati), menggunakan local fallback:", error);
    }

    // Fallback ke LocalStorage jika backend offline
    if (!USER_SESSION) {
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
        window.location.href = BASE_URL + '/index.html';
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

            // Fungsi pembantu untuk memproses mock login
            const tryMockLogin = () => {
                if ((usernameInput === 'admin' && passwordInput === 'admin123') || 
                    (usernameInput === 'budi_gudang' && passwordInput === 'budi123') ||
                    (usernameInput === 'siti_manajer' && passwordInput === 'siti123')) {
                    
                    let nama = 'Admin Gudang';
                    let role = 'Administrator';
                    if (usernameInput === 'budi_gudang') {
                        nama = 'Budi Santoso';
                        role = 'Staff Gudang';
                    } else if (usernameInput === 'siti_manajer') {
                        nama = 'Siti Aminah';
                        role = 'Manajer';
                    }
                    
                    const mockSession = {
                        id_user: 1,
                        username: usernameInput,
                        nama_lengkap: nama,
                        role: role
                    };
                    
                    localStorage.setItem('ud_session', JSON.stringify(mockSession));
                    showToast('Login berhasil! (Mode Simulasi Offline)', 'success');
                    
                    setTimeout(() => {
                        window.location.href = BASE_URL + '/index.html';
                    }, 1000);
                    return true;
                }
                return false;
            };

            fetch(BASE_URL + '/api/auth/login.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if(data.status === 'success') {
                    // Simpan ke local juga agar backend-independent
                    localStorage.setItem('ud_session', JSON.stringify({
                        id_user: data.user.id_user || 1,
                        username: usernameInput,
                        nama_lengkap: data.user.nama,
                        role: data.user.role
                    }));
                    showToast(data.message, 'success');
                    setTimeout(() => {
                        window.location.href = BASE_URL + '/index.html';
                    }, 1000);
                } else {
                    // Jika database online tapi user tidak ditemukan (database kosong / belum di-seed)
                    // Coba gunakan mock credentials sebagai fallback
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
                
                // MOCK AUTHENTICATION FALLBACK
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
    // RENDERING ENGINE (DYNAMIC TABLE LOOPS)
    // ==========================================================

    window.renderBarangTable = function(searchQuery = '', categoryFilter = '') {
        const tableBody = document.getElementById('barangTableBody');
        if (!tableBody) return;
        
        const barangList = DB.get('ud_barang', []);
        tableBody.innerHTML = '';
        
        const filtered = barangList.filter(item => {
            const matchesSearch = item.nama_barang.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  item.kode_barang.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = categoryFilter === '' || item.kategori === categoryFilter;
            return matchesSearch && matchesCategory;
        });
        
        if (filtered.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">Data barang tidak ditemukan</td></tr>';
            return;
        }
        
        filtered.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.kode_barang}</td>
                <td style="font-weight: 500;">${item.nama_barang}</td>
                <td><span class="badge badge-info">${item.kategori}</span></td>
                <td>${item.stok}</td>
                <td>Rp ${item.harga.toLocaleString('id-ID')}</td>
                <td>
                    <button class="btn-icon btn-edit" onclick="openModal('edit', '${item.kode_barang}')" title="Edit Data"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon btn-delete" onclick="deleteBarang('${item.kode_barang}')" title="Hapus Data"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    };

    window.renderBarangMasukTable = function(searchQuery = '', dateFilter = '') {
        const masukTableBody = document.getElementById('barangMasukTableBody');
        if (!masukTableBody) return;
        
        const masukList = DB.get('ud_transaksi_masuk', []);
        masukTableBody.innerHTML = '';
        
        const filtered = masukList.filter(item => {
            const matchesSearch = item.ref.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  item.supplier.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  item.barang.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesDate = dateFilter === '' || item.tanggal === dateFilter;
            return matchesSearch && matchesDate;
        });
        
        if (filtered.length === 0) {
            masukTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">Data transaksi masuk tidak ditemukan</td></tr>';
            return;
        }
        
        filtered.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.tanggal}</td>
                <td style="font-weight: 500;">${item.ref}</td>
                <td>${item.supplier}</td>
                <td>${item.barang}</td>
                <td><span class="badge badge-info" style="background-color: #d1fae5; color: #059669;">+ ${item.qty}</span></td>
                <td>
                    <button class="btn-icon btn-edit" onclick="showToast('No Ref: ' + '${item.ref}' + ' - Supplier: ' + '${item.supplier}', 'info')" title="Detail"><i class="fas fa-eye"></i></button>
                    <button class="btn-icon btn-delete" onclick="deleteTransaksiMasuk(${item.id_masuk})" title="Hapus Data"><i class="fas fa-trash"></i></button>
                </td>
            `;
            masukTableBody.appendChild(row);
        });
    };

    window.renderBarangKeluarTable = function(searchQuery = '', dateFilter = '') {
        const keluarTableBody = document.getElementById('barangKeluarTableBody');
        if (!keluarTableBody) return;
        
        const keluarList = DB.get('ud_transaksi_keluar', []);
        keluarTableBody.innerHTML = '';
        
        const filtered = keluarList.filter(item => {
            const matchesSearch = item.ref.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  item.tujuan.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  item.barang.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesDate = dateFilter === '' || item.tanggal === dateFilter;
            return matchesSearch && matchesDate;
        });
        
        if (filtered.length === 0) {
            keluarTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">Data transaksi keluar tidak ditemukan</td></tr>';
            return;
        }
        
        filtered.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.tanggal}</td>
                <td style="font-weight: 500;">${item.ref}</td>
                <td>${item.tujuan}</td>
                <td>${item.barang}</td>
                <td><span class="badge badge-info" style="background-color: #fee2e2; color: #e11d48;">- ${item.qty}</span></td>
                <td>
                    <button class="btn-icon btn-edit" onclick="showToast('No Ref: ' + '${item.ref}' + ' - Tujuan: ' + '${item.tujuan}', 'info')" title="Detail"><i class="fas fa-eye"></i></button>
                    <button class="btn-icon btn-delete" onclick="deleteTransaksiKeluar(${item.id_keluar})" title="Hapus Data"><i class="fas fa-trash"></i></button>
                </td>
            `;
            keluarTableBody.appendChild(row);
        });
    };

    window.renderLaporanStokTable = function(searchQuery = '', categoryFilter = '', monthFilter = '') {
        const laporanStokTableBody = document.getElementById('laporanStokTableBody');
        if (!laporanStokTableBody) return;
        
        const barangList = DB.get('ud_barang', []);
        const masukList = DB.get('ud_transaksi_masuk', []);
        const keluarList = DB.get('ud_transaksi_keluar', []);
        laporanStokTableBody.innerHTML = '';
        
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
            // filter masuk & keluar by item and month
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
    };

    window.renderUserTable = function(searchQuery = '') {
        const manajemenAkunTableBody = document.getElementById('manajemenAkunTableBody');
        if (!manajemenAkunTableBody) return;
        
        const userList = DB.get('ud_users', []);
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
            const roleBadge = user.role === 'Admin' ? 'badge-danger' : (user.role === 'Manajer' ? 'badge-info' : 'badge-success');
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
        const stokMenipisList = barangList.filter(item => item.stok <= 50);
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

    // ==========================================================
    // INITIAL LOAD RENDERING AND FILTER BINDINGS
    // ==========================================================

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

    // User Profile Dropdown
    const userProfileBtn = document.getElementById('userProfileBtn');
    const userDropdownMenu = document.getElementById('userDropdownMenu');

    if (userProfileBtn && userDropdownMenu) {
        userProfileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            userDropdownMenu.classList.toggle('active');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!userDropdownMenu.contains(e.target) && e.target !== userProfileBtn && !userProfileBtn.contains(e.target)) {
                userDropdownMenu.classList.remove('active');
            }
        });
    }
});

// ==========================================================
// CRUD OPERATIONS ENGINE (INTERACTIVE CLIENT-SIDE ACTIONS)
// ==========================================================

window.saveBarang = function() {
    const form = document.getElementById('formBarang');
    if (!form) return;
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const kodeBarang = document.getElementById('kodeBarang').value.trim();
    const namaBarang = document.getElementById('namaBarang').value.trim();
    const kategoriBarang = document.getElementById('kategoriBarang').value;
    const stokBarang = parseInt(document.getElementById('stokBarang').value || 0);
    const hargaBarang = parseInt(document.getElementById('hargaBarang').value || 0);
    
    let satuan = 'Pcs';
    if (kategoriBarang === 'Material Dasar') {
        if (namaBarang.toLowerCase().includes('semen')) satuan = 'Zak';
        else if (namaBarang.toLowerCase().includes('besi')) satuan = 'Batang';
        else if (namaBarang.toLowerCase().includes('pasir') || namaBarang.toLowerCase().includes('split')) satuan = 'Kubik';
    } else if (kategoriBarang === 'Plumbing') {
        satuan = 'Batang';
    } else if (kategoriBarang === 'Finishing') {
        if (namaBarang.toLowerCase().includes('cat')) satuan = 'Pail';
    } else if (kategoriBarang === 'Aksesoris') {
        satuan = 'Kotak';
    }
    
    const barangList = DB.get('ud_barang', []);
    const editId = form.getAttribute('data-edit-id');
    
    const btn = document.querySelector('.modal-footer .btn-primary');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Menyimpan...';
    btn.disabled = true;
    
    setTimeout(() => {
        if (editId) {
            const index = barangList.findIndex(b => b.kode_barang === editId);
            if (index !== -1) {
                barangList[index].nama_barang = namaBarang;
                barangList[index].kategori = kategoriBarang;
                barangList[index].harga = hargaBarang;
                barangList[index].satuan = satuan;
                DB.set('ud_barang', barangList);
                showToast('Data barang berhasil diperbarui!', 'success');
            }
        } else {
            if (barangList.some(b => b.kode_barang === kodeBarang)) {
                showToast('Kode barang sudah terdaftar!', 'error');
                btn.innerHTML = originalText;
                btn.disabled = false;
                return;
            }
            
            barangList.push({
                id_barang: barangList.length > 0 ? Math.max(...barangList.map(b => b.id_barang)) + 1 : 1,
                kode_barang: kodeBarang,
                nama_barang: namaBarang,
                kategori: kategoriBarang,
                stok: stokBarang,
                satuan: satuan,
                harga: hargaBarang
            });
            DB.set('ud_barang', barangList);
            showToast('Data barang berhasil ditambahkan!', 'success');
        }
        
        closeModal();
        btn.innerHTML = originalText;
        btn.disabled = false;
        
        renderBarangTable();
    }, 500);
};

window.deleteBarang = function(kodeBarang) {
    if (confirm(`Apakah Anda yakin ingin menghapus barang dengan kode ${kodeBarang}?`)) {
        const barangList = DB.get('ud_barang', []);
        const filtered = barangList.filter(b => b.kode_barang !== kodeBarang);
        DB.set('ud_barang', filtered);
        showToast('Data barang berhasil dihapus!', 'success');
        renderBarangTable();
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
    
    setTimeout(() => {
        const barangList = DB.get('ud_barang', []);
        const targetBarang = barangList.find(b => b.nama_barang === namaBarang);
        
        if (!targetBarang) {
            showToast('Barang tidak valid!', 'error');
            btn.innerHTML = originalText;
            btn.disabled = false;
            return;
        }
        
        if (inputMasuk) {
            const qty = parseInt(inputMasuk.value || 0);
            const supplier = document.getElementById('supplier').value.trim();
            const masukList = DB.get('ud_transaksi_masuk', []);
            
            masukList.push({
                id_masuk: masukList.length > 0 ? Math.max(...masukList.map(t => t.id_masuk)) + 1 : 1,
                tanggal: tanggal,
                ref: ref,
                supplier: supplier,
                barang: namaBarang,
                qty: qty
            });
            
            targetBarang.stok += qty;
            
            DB.set('ud_transaksi_masuk', masukList);
            DB.set('ud_barang', barangList);
            showToast('Transaksi Barang Masuk berhasil disimpan!', 'success');
            
            closeModalTransaksi();
            renderBarangMasukTable();
            
        } else if (inputKeluar) {
            const qty = parseInt(inputKeluar.value || 0);
            const tujuan = document.getElementById('tujuanProyek').value.trim();
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
                qty: qty
            });
            
            targetBarang.stok -= qty;
            
            DB.set('ud_transaksi_keluar', keluarList);
            DB.set('ud_barang', barangList);
            showToast('Transaksi Barang Keluar berhasil disimpan!', 'success');
            
            closeModalTransaksi();
            renderBarangKeluarTable();
        }
        
        btn.innerHTML = originalText;
        btn.disabled = false;
    }, 500);
};

window.deleteTransaksiMasuk = function(id) {
    if (confirm('Apakah Anda yakin ingin menghapus data transaksi masuk ini? Stok barang terkait akan disesuaikan kembali.')) {
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
            showToast('Transaksi berhasil dihapus dan stok disesuaikan!', 'success');
            renderBarangMasukTable();
        }
    }
};

window.deleteTransaksiKeluar = function(id) {
    if (confirm('Apakah Anda yakin ingin menghapus data transaksi keluar ini? Stok barang terkait akan disesuaikan kembali.')) {
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
            showToast('Transaksi berhasil dihapus dan stok disesuaikan!', 'success');
            renderBarangKeluarTable();
        }
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
    
    const userList = DB.get('ud_users', []);
    const editId = form.getAttribute('data-edit-id');
    
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Menyimpan...';
    btn.disabled = true;
    
    setTimeout(() => {
        if (editId) {
            const index = userList.findIndex(u => u.id == editId);
            if (index !== -1) {
                userList[index].nama = nama;
                userList[index].username = username;
                userList[index].role = role;
                DB.set('ud_users', userList);
                showToast('Pengguna berhasil diperbarui!', 'success');
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
            showToast('Pengguna baru berhasil ditambahkan!', 'success');
        }
        
        closeModal();
        btn.innerHTML = originalText;
        btn.disabled = false;
        
        renderUserTable();
    }, 500);
};

window.deleteUser = function(id) {
    if (confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) {
        const userList = DB.get('ud_users', []);
        const filtered = userList.filter(u => u.id != id);
        DB.set('ud_users', filtered);
        showToast('Pengguna berhasil dihapus!', 'success');
        renderUserTable();
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
                document.getElementById('namaBarang').value = item.nama_barang;
                document.getElementById('kategoriBarang').value = item.kategori;
                document.getElementById('stokBarang').value = item.stok;
                document.getElementById('stokBarang').readOnly = true;
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
    
    if (event.target == barangModal) {
        barangModal.style.display = "none";
    }
    if (event.target == transaksiModal) {
        transaksiModal.style.display = "none";
    }
    if (event.target == akunModal) {
        akunModal.style.display = "none";
    }
};
