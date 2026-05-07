document.addEventListener('DOMContentLoaded', function () {

    const togglePassword = document.querySelector('#togglePassword');
    const passwordInput = document.querySelector('#password');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);

            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            if(sidebar.style.display === 'none') {
                sidebar.style.display = 'flex';
            } else {
                sidebar.style.display = 'none';
            }
        });
    }
});
    }

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
        
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            if(sidebar.style.display === 'none') {
                sidebar.style.display = 'flex';
            } else {
                sidebar.style.display = 'none';
            }
        });
    }
});
    }


    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            if(sidebar.style.display === 'none') {
                sidebar.style.display = 'flex';
            } else {
                sidebar.style.display = 'none';
            }
        });
    }
});

