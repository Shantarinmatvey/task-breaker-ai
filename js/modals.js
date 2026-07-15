import { dom } from './dom.js';
import { state } from './state.js';
import { renderSidebar } from './kanban.js';

export function showNewProjectView() {
    state.currentProjectId = null;
    renderSidebar();
    if(dom.newProjectView) dom.newProjectView.classList.remove('hidden');
    if(dom.kanbanView) dom.kanbanView.classList.add('hidden');
    if(dom.loadingView) dom.loadingView.classList.add('hidden');
    if(dom.taskInput) dom.taskInput.value = '';
    if(dom.projectTitleInput) dom.projectTitleInput.value = '';
    resetFileInput();
}

export function resetFileInput() {
    state.attachedFilesData = [];
    if(dom.fileInput) dom.fileInput.value = '';
    renderNewProjectFiles();
}

export function renderNewProjectFiles() {
    if (state.attachedFilesData.length === 0) {
        if(dom.newProjectFilesContainer) dom.newProjectFilesContainer.innerHTML = '';
        if(dom.fileNameDisplay) dom.fileNameDisplay.textContent = 'Нажмите, чтобы добавить файлы';
        return;
    }
    
    if(dom.fileNameDisplay) dom.fileNameDisplay.textContent = `Добавлено файлов: ${state.attachedFilesData.length} из 5`;
    if(dom.newProjectFilesContainer) {
        dom.newProjectFilesContainer.innerHTML = state.attachedFilesData.map((f, i) => `
            <div class="file-badge">
                <i class="fa-solid fa-paperclip"></i> <span>${f.name}</span>
                <i class="fa-solid fa-xmark" style="cursor:pointer; margin-left: 5px; color: #ef4444;" data-action="removeAttachedFile" data-index="${i}"></i>
            </div>
        `).join('');
    }
}

export function closeAllModals() {
    if(dom.apiModal) dom.apiModal.classList.add('hidden');
    if(dom.manualTaskModal) dom.manualTaskModal.classList.add('hidden');
    if(dom.accountModal) dom.accountModal.classList.add('hidden');
    if(dom.taskModal) dom.taskModal.classList.add('hidden');
    if(dom.contextModal) dom.contextModal.classList.add('hidden');
    if(dom.renameProjectModal) dom.renameProjectModal.classList.add('hidden');
    document.querySelectorAll('.project-menu-dropdown').forEach(m => m.classList.add('hidden'));
}
