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

    // Login Form Submit Logic
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const btn = this.querySelector('button');
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Memproses...';
            btn.style.opacity = '0.8';
            btn.disabled = true;

            setTimeout(() => {
                window.location.href = '../../index.html';
            }, 1000);
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
});

// Modal Global Functions
window.openModal = function(action, id = null) {
    const modal = document.getElementById('barangModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('formBarang');
    
    if (modal) {
        modal.style.display = 'flex';
        if (action === 'add') {
            modalTitle.innerText = 'Tambah Data Barang';
            if (form) form.reset();
        } else if (action === 'edit') {
            modalTitle.innerText = 'Edit Data Barang - ' + id;
            // Simulasi pengisian form jika edit
        }
    }
};

window.closeModal = function() {
    const modal = document.getElementById('barangModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

// Tutup modal jika user mengklik area di luar modal
window.onclick = function(event) {
    const modal = document.getElementById('barangModal');
    if (event.target == modal) {
        modal.style.display = "none";
    }
};
