import { dom } from './dom.js';

export const state = {
    projects: [],
    currentProjectId: null,
    attachedFilesData: [],
    currentManualSubtasks: [],
    currentUser: null,
    db: null,
    auth: null,
    geminiApiKey: ""
};

export async function loadState() {
    if (!state.currentUser || !state.db) return;
    const uid = state.currentUser.uid;
    try {
        const docRef = state.db.collection("users").doc(uid);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            const data = docSnap.data();
            state.projects = data.projects || [];
            state.geminiApiKey = data.geminiApiKey || "";
        } else {
            state.projects = [];
            state.geminiApiKey = "";
        }
    } catch (error) {
        console.error("Error loading state:", error);
        state.projects = [];
        state.geminiApiKey = "";
        showToast("Ошибка загрузки данных");
    }
}

export async function saveState() {
    if (!state.currentUser || !state.db) return;
    const uid = state.currentUser.uid;
    try {
        await state.db.collection("users").doc(uid).set({ 
            projects: state.projects,
            geminiApiKey: state.geminiApiKey
        }, { merge: true });
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
