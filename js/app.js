import { state, loadState } from './state.js';
import { setupAuthListeners } from './auth.js';
import { setupEventListeners } from './events.js';
import { initSortable, renderKanban, renderSidebar } from './kanban.js';
import { closeAllModals } from './modals.js';
import { dom } from './dom.js';

document.addEventListener('app:init', async () => {
    await loadState();
    initSortable();
    
    if (state.projects && state.projects.length > 0) {
        if (!state.currentProjectId) {
            let lastActive = null;
            try { lastActive = localStorage.getItem('lastActiveProjectId'); } catch(e) {}
            if (lastActive && state.projects.some(p => p.id === lastActive)) {
                state.currentProjectId = lastActive;
            } else {
                state.currentProjectId = state.projects[0].id;
            }
        }
        renderSidebar();
        renderKanban();
        if(dom.newProjectView) dom.newProjectView.classList.add('hidden');
        if(dom.kanbanView) dom.kanbanView.classList.remove('hidden');
    } else {
        renderSidebar();
        if(dom.kanbanView) dom.kanbanView.classList.add('hidden');
        if(dom.newProjectView) dom.newProjectView.classList.remove('hidden');
    }
});

document.addEventListener('app:logout', () => {
    closeAllModals();
    state.projects = [];
    state.currentProjectId = null;
    state.attachedFilesData = [];
    renderSidebar();
    renderKanban();
    if(dom.kanbanView) dom.kanbanView.classList.add('hidden');
    if(dom.newProjectView) dom.newProjectView.classList.remove('hidden');
});

function init() {
    setupAuthListeners();
    setupEventListeners();
}

init();
