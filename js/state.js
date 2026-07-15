import { dom } from './dom.js';

export const state = {
    projects: [],
    currentProjectId: null,
    attachedFilesData: [],
    currentManualSubtasks: [],
    currentUser: null,
    db: null,
    auth: null
};

export async function loadState() {
    if (!state.currentUser || !state.db) return;
    const uid = state.currentUser.uid;
    try {
        const docRef = state.db.collection("users").doc(uid);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            state.projects = docSnap.data().projects || [];
        } else {
            state.projects = [];
        }
    } catch (error) {
        console.error("Error loading state:", error);
        state.projects = [];
        showToast("Ошибка загрузки данных");
    }
}

export async function saveState() {
    if (!state.currentUser || !state.db) return;
    const uid = state.currentUser.uid;
    try {
        await state.db.collection("users").doc(uid).set({ projects: state.projects });
    } catch (error) {
        console.error("Error saving state:", error);
        showToast("Ошибка сохранения данных");
    }
}

export function showToast(message) {
    if(dom.toast) {
        dom.toast.textContent = message;
        dom.toast.classList.remove('hidden');
        setTimeout(() => dom.toast.classList.add('hidden'), 3000);
    }
}
