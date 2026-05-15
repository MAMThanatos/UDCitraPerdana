document.addEventListener('DOMContentLoaded', function () {

    // Toggle Password Visibility
    const togglePassword = document.querySelector('#togglePassword');
    const passwordInput = document.querySelector('#password');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);

            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }

    // Login Form Submit Logic - Show loading state
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            const btn = this.querySelector('button');
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Memproses...';
            btn.style.opacity = '0.8';
            btn.disabled = true;
        });
    }

    // Sidebar Toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            if (sidebar.style.display === 'none' || sidebar.style.display === '') {
                sidebar.style.display = 'flex';
            } else {
                sidebar.style.display = 'none';
            }
        });
    }

    // Render Dummy Data untuk Halaman Kelola Data Barang
    const tableBody = document.getElementById('barangTableBody');
    if (tableBody) {
        const dummyBarang = [
            { id: 'BRG-001', nama: 'Semen Gresik 50kg', kategori: 'Material Dasar', stok: 150, harga: 65000 },
            { id: 'BRG-002', nama: 'Paku Payung 5cm', kategori: 'Aksesoris', stok: 500, harga: 15000 },
            { id: 'BRG-003', nama: 'Cat Tembok Dulux', kategori: 'Finishing', stok: 30, harga: 150000 },
            { id: 'BRG-004', nama: 'Besi Beton 10mm', kategori: 'Material Dasar', stok: 200, harga: 85000 },
            { id: 'BRG-005', nama: 'Pipa PVC 3/4 inch', kategori: 'Plumbing', stok: 120, harga: 25000 },
        ];

        dummyBarang.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.id}</td>
                <td style="font-weight: 500;">${item.nama}</td>
                <td><span class="badge badge-info">${item.kategori}</span></td>
                <td>${item.stok}</td>
                <td>Rp ${item.harga.toLocaleString('id-ID')}</td>
                <td>
                    <button class="btn-icon btn-edit" onclick="openModal('edit', '${item.id}')" title="Edit Data"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon btn-delete" title="Hapus Data"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    // Render Dummy Data untuk Halaman Barang Masuk
    const masukTableBody = document.getElementById('barangMasukTableBody');
    if (masukTableBody) {
        const dummyMasuk = [
            { tanggal: '2026-05-10', ref: 'INV-202605-01', supplier: 'PT. Bangun Jaya', barang: 'Semen Gresik 50kg', qty: 50 },
            { tanggal: '2026-05-09', ref: 'INV-202605-02', supplier: 'Toko Besi Maju', barang: 'Besi Beton 10mm', qty: 100 },
            { tanggal: '2026-05-08', ref: 'INV-202605-03', supplier: 'CV. Warna Abadi', barang: 'Cat Tembok Dulux', qty: 15 },
        ];

        dummyMasuk.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.tanggal}</td>
                <td style="font-weight: 500;">${item.ref}</td>
                <td>${item.supplier}</td>
                <td>${item.barang}</td>
                <td><span class="badge badge-info" style="background-color: #d1fae5; color: #059669;">+ ${item.qty}</span></td>
                <td>
                    <button class="btn-icon btn-edit" title="Detail"><i class="fas fa-eye"></i></button>
                    <button class="btn-icon btn-delete" title="Hapus Data"><i class="fas fa-trash"></i></button>
                </td>
            `;
            masukTableBody.appendChild(row);
        });
    }
    // Render Dummy Data untuk Halaman Barang Keluar
    const keluarTableBody = document.getElementById('barangKeluarTableBody');
    if (keluarTableBody) {
        const dummyKeluar = [
            { tanggal: '2026-05-11', ref: 'OUT-202605-01', tujuan: 'Proyek Perumahan A', barang: 'Semen Gresik 50kg', qty: 20 },
            { tanggal: '2026-05-10', ref: 'OUT-202605-02', tujuan: 'Proyek Renovasi B', barang: 'Cat Tembok Dulux', qty: 5 },
            { tanggal: '2026-05-09', ref: 'OUT-202605-03', tujuan: 'Mandor C (Eceran)', barang: 'Paku Payung 5cm', qty: 100 },
        ];

        dummyKeluar.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.tanggal}</td>
                <td style="font-weight: 500;">${item.ref}</td>
                <td>${item.tujuan}</td>
                <td>${item.barang}</td>
                <td><span class="badge badge-info" style="background-color: #fee2e2; color: #e11d48;">- ${item.qty}</span></td>
                <td>
                    <button class="btn-icon btn-edit" title="Detail"><i class="fas fa-eye"></i></button>
                    <button class="btn-icon btn-delete" title="Hapus Data"><i class="fas fa-trash"></i></button>
                </td>
            `;
            keluarTableBody.appendChild(row);
        });
    }

    // Render Dummy Data untuk Halaman Laporan Stok
    const laporanStokTableBody = document.getElementById('laporanStokTableBody');
    if (laporanStokTableBody) {
        const dummyLaporan = [
            { id: 'BRG-001', nama: 'Semen Gresik 50kg', kategori: 'Material Dasar', awal: 120, masuk: 50, keluar: 20, akhir: 150 },
            { id: 'BRG-002', nama: 'Paku Payung 5cm', kategori: 'Aksesoris', awal: 600, masuk: 0, keluar: 100, akhir: 500 },
            { id: 'BRG-003', nama: 'Cat Tembok Dulux', kategori: 'Finishing', awal: 20, masuk: 15, keluar: 5, akhir: 30 },
            { id: 'BRG-004', nama: 'Besi Beton 10mm', kategori: 'Material Dasar', awal: 100, masuk: 100, keluar: 0, akhir: 200 },
            { id: 'BRG-005', nama: 'Pipa PVC 3/4 inch', kategori: 'Plumbing', awal: 120, masuk: 0, keluar: 0, akhir: 120 },
        ];

        dummyLaporan.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.id}</td>
                <td style="font-weight: 500;">${item.nama}</td>
                <td><span class="badge badge-info">${item.kategori}</span></td>
                <td style="text-align: center;">${item.awal}</td>
                <td style="text-align: center; color: #059669; font-weight: 600;">+ ${item.masuk}</td>
                <td style="text-align: center; color: #e11d48; font-weight: 600;">- ${item.keluar}</td>
                <td style="text-align: center; font-weight: bold; background-color: #f8fafc;">${item.akhir}</td>
            `;
            laporanStokTableBody.appendChild(row);
        });
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

// Modal Global Functions
window.openModal = function(action, id = null) {
    let modalId = 'barangModal';
    let titleId = 'modalTitle';
    let formId = 'formBarang';

    if (action === 'addMasuk') {
        modalId = 'transaksiModal';
        titleId = 'modalTitle';
        formId = 'formTransaksi';
    } else if (action === 'addKeluar') {
        modalId = 'transaksiModal';
        titleId = 'modalTitle';
        formId = 'formTransaksi';
    }

    const modal = document.getElementById(modalId);
    const modalTitle = document.getElementById(titleId);
    const form = document.getElementById(formId);
    
    if (modal) {
        modal.style.display = 'flex';
        if (action === 'add') {
            modalTitle.innerText = 'Tambah Data Barang';
            if (form) form.reset();
        } else if (action === 'edit') {
            modalTitle.innerText = 'Edit Data Barang - ' + id;
            // Simulasi pengisian form jika edit
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
        }
    }
};

window.closeModal = function() {
    const modal = document.getElementById('barangModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

window.closeModalTransaksi = function() {
    const modal = document.getElementById('transaksiModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

// Tutup modal jika user mengklik area di luar modal
window.onclick = function(event) {
    const barangModal = document.getElementById('barangModal');
    const transaksiModal = document.getElementById('transaksiModal');
    
    if (event.target == barangModal) {
        barangModal.style.display = "none";
    }
    if (event.target == transaksiModal) {
        transaksiModal.style.display = "none";
    }
};
