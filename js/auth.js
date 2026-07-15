import { dom } from './dom.js';
import { state, showToast } from './state.js';

const firebase = window.firebase;

const firebaseConfig = {
  apiKey: "AIzaSyAvs_dPiOrziX2EyTqs4J5WwC78P4FkDtY",
  authDomain: "ask-breaker.firebaseapp.com",
  projectId: "ask-breaker",
  storageBucket: "ask-breaker.firebasestorage.app",
  messagingSenderId: "1060582779812",
  appId: "1:1060582779812:web:53d409831df72f689c2f31"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

state.db = db;
state.auth = auth;

export const Auth = {
    async login(email, password) {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            if (!userCredential.user.emailVerified) {
                showToast('Пожалуйста, подтвердите ваш email перед входом');
                return false;
            }
            return true;
        } catch (error) {
            let message = 'Произошла ошибка при входе';
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
                message = 'Неверный email или пароль';
            }
            showToast(message);
            return false;
        }
    },

    async register(email, password) {
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            await userCredential.user.sendEmailVerification();
            await auth.signOut();
            showToast('Аккаунт создан! Проверьте вашу почту и перейдите по ссылке для подтверждения.');
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
            showToast(message);
            return false;
        }
    },

    async logout() {
        document.dispatchEvent(new Event('app:logout'));
        await auth.signOut();
    }
};

let isLoginMode = true;

export function renderAuthState() {
    if (dom.globalSplash) dom.globalSplash.style.display = 'none';

    if (state.currentUser && state.currentUser.emailVerified) {
        if(dom.authContainer) dom.authContainer.classList.add('hidden');
        if(dom.appContainer) dom.appContainer.classList.remove('hidden');
        document.dispatchEvent(new Event('app:init'));
    } else {
        if(dom.authContainer) dom.authContainer.classList.remove('hidden');
        if(dom.appContainer) dom.appContainer.classList.add('hidden');
        if(dom.authPassword) dom.authPassword.value = '';
    }
}

export function setupAuthListeners() {
    if (dom.authToggleBtn) {
        dom.authToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            
            if (isLoginMode) {
                if(dom.authTitle) dom.authTitle.textContent = 'Вход в аккаунт';
                if(dom.authSubtitle) dom.authSubtitle.textContent = 'Добро пожаловать обратно';
                if(dom.authSubmitBtn) dom.authSubmitBtn.textContent = 'Войти';
                if(dom.authToggleText) dom.authToggleText.textContent = 'Нет аккаунта?';
                if(dom.authToggleBtn) dom.authToggleBtn.textContent = 'Зарегистрироваться';
            } else {
                if(dom.authTitle) dom.authTitle.textContent = 'Регистрация';
                if(dom.authSubtitle) dom.authSubtitle.textContent = 'Создайте новый аккаунт';
                if(dom.authSubmitBtn) dom.authSubmitBtn.textContent = 'Создать аккаунт';
                if(dom.authToggleText) dom.authToggleText.textContent = 'Уже есть аккаунт?';
                if(dom.authToggleBtn) dom.authToggleBtn.textContent = 'Войти';
            }
        });
    }

    if (dom.authForm) {
        dom.authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = dom.authEmail ? dom.authEmail.value.trim() : '';
            const password = dom.authPassword ? dom.authPassword.value.trim() : '';
            
            if (!email || !password) return;

            if(dom.authSubmitBtn) {
                dom.authSubmitBtn.textContent = 'Ожидание...';
                dom.authSubmitBtn.disabled = true;
            }

            if (isLoginMode) {
                await Auth.login(email, password);
            } else {
                const success = await Auth.register(email, password);
                if (success) {
                    isLoginMode = true;
                    if(dom.authTitle) dom.authTitle.textContent = 'Вход в аккаунт';
                    if(dom.authSubtitle) dom.authSubtitle.textContent = 'Добро пожаловать обратно';
                    if(dom.authSubmitBtn) dom.authSubmitBtn.textContent = 'Войти';
                    if(dom.authToggleText) dom.authToggleText.textContent = 'Нет аккаунта?';
                    if(dom.authToggleBtn) dom.authToggleBtn.textContent = 'Зарегистрироваться';
                }
            }

            if(dom.authSubmitBtn) {
                dom.authSubmitBtn.disabled = false;
                dom.authSubmitBtn.textContent = isLoginMode ? 'Войти' : 'Создать аккаунт';
            }
        });
    }

    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('#logoutBtn');
        if (btn) {
            try {
                await Auth.logout();
                renderAuthState();
            } catch (err) {
                alert('Ошибка при выходе: ' + err.message);
            }
        }
    });

    if (dom.togglePasswordBtn) {
        dom.togglePasswordBtn.addEventListener('click', () => {
            const type = dom.authPassword.getAttribute('type') === 'password' ? 'text' : 'password';
            dom.authPassword.setAttribute('type', type);
            dom.togglePasswordBtn.innerHTML = type === 'password' ? '<i class="fa-solid fa-eye"></i>' : '<i class="fa-solid fa-eye-slash"></i>';
        });
    }

    auth.onAuthStateChanged((user) => {
        state.currentUser = user;
        renderAuthState();
    });
}
