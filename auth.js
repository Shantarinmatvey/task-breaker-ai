// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAvs_dPiOrziX2EyTqs4J5WwC78P4FkDtY",
  authDomain: "ask-breaker.firebaseapp.com",
  projectId: "ask-breaker",
  storageBucket: "ask-breaker.firebasestorage.app",
  messagingSenderId: "1060582779812",
  appId: "1:1060582779812:web:53d409831df72f689c2f31"
};

// Initialize Firebase using the Compat API
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

window.db = db; // Export DB for app.js

const Auth = {
    currentUser: null,

    async login(email, password) {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            if (!userCredential.user.emailVerified) {
                if(typeof window.showToast === 'function') window.showToast('Пожалуйста, подтвердите ваш email перед входом');
                return false;
            }
            return true;
        } catch (error) {
            let message = 'Произошла ошибка при входе';
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
                message = 'Неверный email или пароль';
            }
            if(typeof window.showToast === 'function') window.showToast(message);
            return false;
        }
    },

    async register(email, password) {
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            await userCredential.user.sendEmailVerification();
            // We want to force them to verify before they can truly use the app
            await auth.signOut();
            if(typeof window.showToast === 'function') window.showToast('Аккаунт создан! Проверьте вашу почту и перейдите по ссылке для подтверждения.');
            return true;
        } catch (error) {
            console.error(error);
            let message = 'Ошибка регистрации';
            if (error.code === 'auth/email-already-in-use') {
                message = 'Пользователь с таким email уже существует';
            } else if (error.code === 'auth/weak-password') {
                message = 'Слишком слабый пароль (минимум 6 символов)';
            } else if (error.code === 'auth/invalid-email') {
                message = 'Некорректный email';
            }
            if(typeof window.showToast === 'function') window.showToast(message);
            return false;
        }
    },

    async logout() {
        if (typeof window.clearAppState === 'function') {
            window.clearAppState();
        }
        await auth.signOut();
    }
};

window.Auth = Auth; // Expose globally for app.js

const authContainer = document.getElementById('authContainer');
const appContainer = document.getElementById('appContainer');
    const authForm = document.getElementById('authForm');
    const authEmail = document.getElementById('authEmail');
    const authPassword = document.getElementById('authPassword');
    const authToggleBtn = document.getElementById('authToggleBtn');
    const authToggleText = document.getElementById('authToggleText');
    const authTitle = document.getElementById('authTitle');
    const authSubtitle = document.getElementById('authSubtitle');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const togglePasswordBtn = document.getElementById('togglePasswordBtn');
    
    let isLoginMode = true;

    window.renderAuthState = function() {
        const globalSplash = document.getElementById('globalSplash');
        if (globalSplash) globalSplash.style.display = 'none';

        if (Auth.currentUser && Auth.currentUser.emailVerified) {
            authContainer.classList.add('hidden');
            appContainer.classList.remove('hidden');
            // Trigger app initialization
            if (typeof window.initializeApp === 'function') {
                window.initializeApp();
            }
        } else {
            authContainer.classList.remove('hidden');
            appContainer.classList.add('hidden');
            authPassword.value = '';
        }
    };

    if (authToggleBtn) {
        authToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            
            if (isLoginMode) {
                authTitle.textContent = 'Вход в аккаунт';
                authSubtitle.textContent = 'Добро пожаловать обратно';
                authSubmitBtn.textContent = 'Войти';
                authToggleText.textContent = 'Нет аккаунта?';
                authToggleBtn.textContent = 'Зарегистрироваться';
            } else {
                authTitle.textContent = 'Регистрация';
                authSubtitle.textContent = 'Создайте новый аккаунт';
                authSubmitBtn.textContent = 'Создать аккаунт';
                authToggleText.textContent = 'Уже есть аккаунт?';
                authToggleBtn.textContent = 'Войти';
            }
        });
    }

    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Need preventDefault for forms!
            const email = authEmail.value.trim();
            const password = authPassword.value.trim();
            
            if (!email || !password) return;

            // Visual feedback
            const originalText = authSubmitBtn.textContent;
            authSubmitBtn.textContent = 'Ожидание...';
            authSubmitBtn.disabled = true;

            if (isLoginMode) {
                await Auth.login(email, password);
            } else {
                const success = await Auth.register(email, password);
                if (success) {
                    // switch back to login mode so they can login after verification
                    isLoginMode = true;
                    authTitle.textContent = 'Вход в аккаунт';
                    authSubtitle.textContent = 'Добро пожаловать обратно';
                    authSubmitBtn.textContent = 'Войти';
                    authToggleText.textContent = 'Нет аккаунта?';
                    authToggleBtn.textContent = 'Зарегистрироваться';
                }
            }

            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = isLoginMode ? 'Войти' : 'Создать аккаунт';
        });
    }

    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('#logoutBtn');
        if (btn) {
            try {
                await Auth.logout();
                window.renderAuthState();
            } catch (err) {
                alert('Ошибка при выходе: ' + err.message);
            }
        }
    });

    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', () => {
            const type = authPassword.getAttribute('type') === 'password' ? 'text' : 'password';
            authPassword.setAttribute('type', type);
            togglePasswordBtn.innerHTML = type === 'password' ? '<i class="fa-solid fa-eye"></i>' : '<i class="fa-solid fa-eye-slash"></i>';
        });
    }

    auth.onAuthStateChanged((user) => {
        if (user) {
            Auth.currentUser = user;
            window.renderAuthState();
        } else {
            Auth.currentUser = null;
            window.renderAuthState();
        }
    });
