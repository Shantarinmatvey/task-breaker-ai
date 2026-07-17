import { dom } from './dom.js';
import { state, saveState, showToast } from './state.js';
import { renderSidebar, selectProject, renderKanban, renderManualSubtasks, breakDownTask, abortBreakdown, handleCreateProject, expandTask } from './kanban.js';
import { showNewProjectView, renderNewProjectFiles, closeAllModals } from './modals.js';
import { getApiKey } from './api.js';

export function setupEventListeners() {
    if (dom.mobileMenuBtn && dom.mobileSidebarOverlay && dom.sidebar) {
        dom.mobileMenuBtn.addEventListener('click', () => {
            dom.sidebar.classList.add('mobile-open');
            dom.mobileSidebarOverlay.classList.remove('hidden');
        });
        dom.mobileSidebarOverlay.addEventListener('click', () => {
            dom.sidebar.classList.remove('mobile-open');
            dom.mobileSidebarOverlay.classList.add('hidden');
        });
        dom.projectsList.addEventListener('click', (e) => {
            if (e.target.closest('li') && window.innerWidth <= 768) {
                dom.sidebar.classList.remove('mobile-open');
                dom.mobileSidebarOverlay.classList.add('hidden');
            }
        });
    }

    if(dom.newProjectBtn) dom.newProjectBtn.addEventListener('click', () => {
        showNewProjectView();
        if (window.innerWidth <= 768 && dom.sidebar) {
            dom.sidebar.classList.remove('mobile-open');
            if (dom.mobileSidebarOverlay) dom.mobileSidebarOverlay.classList.add('hidden');
        }
    });

    if(dom.breakDownBtn) dom.breakDownBtn.addEventListener('click', handleCreateProject);
    
    if(dom.closeTaskModalBtn) dom.closeTaskModalBtn.addEventListener('click', () => { if(dom.taskModal) dom.taskModal.classList.add('hidden'); });
    if(dom.closeContextModalBtn) dom.closeContextModalBtn.addEventListener('click', () => { if(dom.contextModal) dom.contextModal.classList.add('hidden'); });

    if (dom.openAccountModalBtn) {
        dom.openAccountModalBtn.addEventListener('click', () => {
            if (dom.accountEmailDisplay && state.currentUser) {
                dom.accountEmailDisplay.textContent = state.currentUser.email;
            }
            if (dom.accountModal) dom.accountModal.classList.remove('hidden');
        });
    }
    if (dom.closeAccountModalBtn) dom.closeAccountModalBtn.addEventListener('click', () => { if(dom.accountModal) dom.accountModal.classList.add('hidden'); });

    if (dom.openApiModalBtn) {
        dom.openApiModalBtn.addEventListener('click', () => {
            if (dom.apiInput) dom.apiInput.value = state.geminiApiKey || '';
            if (dom.apiModal) dom.apiModal.classList.remove('hidden');
        });
    }
    if (dom.closeApiModalBtn) dom.closeApiModalBtn.addEventListener('click', () => { if(dom.apiModal) dom.apiModal.classList.add('hidden'); });

    if (dom.saveApiBtn) {
        dom.saveApiBtn.addEventListener('click', () => {
            const key = dom.apiInput.value.trim();
            if (key) {
                state.geminiApiKey = key;
                saveState();
                if (dom.apiModal) dom.apiModal.classList.add('hidden');
                showToast('API ключ успешно сохранен');
            } else {
                showToast('Пожалуйста, введите валидный ключ');
            }
        });
    }

    if (dom.projectContextBtn) {
        dom.projectContextBtn.addEventListener('click', () => {
            const project = state.projects.find(p => p.id === state.currentProjectId);
            if (!project) return;
            
            if(dom.contextModalGoal) dom.contextModalGoal.textContent = project.goal || 'Не указано';
            if(dom.contextModalLinks) dom.contextModalLinks.textContent = project.link || 'Нет ссылок';
            
            if (dom.contextModalFiles) {
                if (project.files && project.files.length > 0) {
                    dom.contextModalFiles.innerHTML = project.files.map(name => `
                        <div class="file-badge"><i class="fa-solid fa-paperclip"></i> <span>${name}</span></div>
                    `).join('');
                } else {
                    dom.contextModalFiles.innerHTML = '<span style="color:var(--text-muted-dark)">Нет файлов</span>';
                }
            }
            if(dom.contextModal) dom.contextModal.classList.remove('hidden');
        });
    }

    if (dom.openManualTaskBtn) {
        dom.openManualTaskBtn.addEventListener('click', () => {
            if(dom.manualTaskTitle) dom.manualTaskTitle.value = '';
            if(dom.manualTaskTime) dom.manualTaskTime.value = '1 час';
            if (dom.newSubtaskInput) dom.newSubtaskInput.value = '';
            state.currentManualSubtasks = [];
            renderManualSubtasks();
            if (dom.manualTaskModal) dom.manualTaskModal.classList.remove('hidden');
        });
    }
    
    if (dom.closeManualTaskBtn) dom.closeManualTaskBtn.addEventListener('click', () => { if (dom.manualTaskModal) dom.manualTaskModal.classList.add('hidden'); });
    
    if (dom.saveManualTaskBtn) {
        dom.saveManualTaskBtn.addEventListener('click', () => {
            const title = dom.manualTaskTitle ? dom.manualTaskTitle.value.trim() : '';
            const time = dom.manualTaskTime ? dom.manualTaskTime.value.trim() || '-' : '-';
            
            if (!title) {
                showToast('Пожалуйста, введите название задачи');
                return;
            }
            
            const subtasks = state.currentManualSubtasks.map(s => ({ title: s, done: false }));
            const project = state.projects.find(p => p.id === state.currentProjectId);
            if (project) {
                project.tasks.push({
                    id: `task_${Date.now()}_manual`,
                    title: title,
                    time: time,
                    status: 'todo',
                    subtasks: subtasks
                });
                saveState();
                renderKanban();
                if (dom.manualTaskModal) dom.manualTaskModal.classList.add('hidden');
                showToast('Задача добавлена!');
            }
        });
    }
    
    if (dom.addManualSubtaskBtn) {
        dom.addManualSubtaskBtn.addEventListener('click', () => {
            const val = dom.newSubtaskInput.value.trim();
            if (val) {
                state.currentManualSubtasks.push(val);
                dom.newSubtaskInput.value = '';
                renderManualSubtasks();
            }
        });
    }

    if (dom.newSubtaskInput) {
        dom.newSubtaskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                dom.addManualSubtaskBtn.click();
            }
        });
    }

    if (dom.fileInput) {
        dom.fileInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;
            
            for (const file of files) {
                if (state.attachedFilesData.length >= 5) {
                    showToast('Максимум 5 файлов');
                    break;
                }
                if (state.attachedFilesData.some(f => f.name === file.name)) continue;
    
                if (file.name.endsWith('.docx')) {
                    try {
                        const arrayBuffer = await file.arrayBuffer();
                        const result = await mammoth.extractRawText({ arrayBuffer });
                        state.attachedFilesData.push({ type: 'text', data: result.value, mime: null, name: file.name });
                    } catch (err) {
                        console.error(err);
                        showToast('Ошибка при чтении DOCX: ' + file.name);
                    }
                } else if (file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.csv')) {
                    try {
                        const text = await file.text();
                        state.attachedFilesData.push({ type: 'text', data: text, mime: null, name: file.name });
                    } catch(err) {
                        showToast('Ошибка при чтении текстового файла: ' + file.name);
                    }
                } else {
                    await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            state.attachedFilesData.push({ 
                                type: 'base64', 
                                data: reader.result.split(',')[1], 
                                mime: file.type || 'application/octet-stream',
                                name: file.name
                            });
                            resolve();
                        };
                        reader.readAsDataURL(file);
                    });
                }
            }
            renderNewProjectFiles();
            dom.fileInput.value = '';
        });
    }

    document.addEventListener('click', (e) => {
        const target = e.target;
        
        if (!target.closest('.project-menu-dropdown') && !target.closest('.delete-project-btn')) {
            document.querySelectorAll('.project-menu-dropdown').forEach(m => m.classList.add('hidden'));
        }

        const actionEl = target.closest('[data-action]');
        if (!actionEl) return;
        
        const action = actionEl.dataset.action;
        const id = actionEl.dataset.id;
        const taskId = actionEl.dataset.taskId;
        const index = actionEl.dataset.index;

        if (action === 'selectProject') {
            if (!e.target.closest('.delete-project-btn') && !e.target.closest('.project-menu-dropdown')) {
                selectProject(id);
            }
        }
        else if (action === 'toggleProjectMenu') {
            e.stopPropagation();
            document.querySelectorAll('.project-menu-dropdown').forEach(m => {
                if (m.id !== `menu-${id}`) m.classList.add('hidden');
            });
            const menu = document.getElementById(`menu-${id}`);
            if (menu) menu.classList.toggle('hidden');
        }
        else if (action === 'deleteProject') {
            e.stopPropagation();
            const menu = document.getElementById(`menu-${id}`);
            if (menu) menu.classList.add('hidden');
            if (confirm('Удалить этот проект?')) {
                state.projects = state.projects.filter(p => p.id !== id);
                saveState();
                if (state.currentProjectId === id) showNewProjectView();
                else renderSidebar();
            }
        }
        else if (action === 'renameProject') {
            e.stopPropagation();
            const menu = document.getElementById(`menu-${id}`);
            if (menu) menu.classList.add('hidden');
            
            const project = state.projects.find(p => p.id === id);
            if (!project) return;
            
            if(dom.renameProjectInput) dom.renameProjectInput.value = project.title;
            if(dom.renameProjectModal) dom.renameProjectModal.classList.remove('hidden');
            
            const handleSave = () => {
                const newTitle = dom.renameProjectInput ? dom.renameProjectInput.value.trim() : '';
                if (newTitle.length > 0) {
                    project.title = newTitle;
                    saveState();
                    if (state.currentProjectId === id && dom.currentProjectTitle) {
                        dom.currentProjectTitle.textContent = project.title;
                    }
                    renderSidebar();
                }
                closeModal();
            };
            
            const closeModal = () => {
                if(dom.renameProjectModal) dom.renameProjectModal.classList.add('hidden');
                if(dom.saveRenameModalBtn) dom.saveRenameModalBtn.removeEventListener('click', handleSave);
                if(dom.closeRenameModalBtn) dom.closeRenameModalBtn.removeEventListener('click', closeModal);
                if(dom.renameProjectInput) dom.renameProjectInput.removeEventListener('keypress', handleKeypress);
            };
            
            const handleKeypress = (ev) => {
                if (ev.key === 'Enter') handleSave();
            };
            
            if(dom.saveRenameModalBtn) dom.saveRenameModalBtn.addEventListener('click', handleSave);
            if(dom.closeRenameModalBtn) dom.closeRenameModalBtn.addEventListener('click', closeModal);
            if(dom.renameProjectInput) dom.renameProjectInput.addEventListener('keypress', handleKeypress);
        }
        else if (action === 'deleteTask') {
            if (!confirm('Вы уверены, что хотите удалить эту задачу?')) return;
            const project = state.projects.find(p => p.id === state.currentProjectId);
            if (project) {
                project.tasks = project.tasks.filter(t => t.id !== taskId);
                saveState();
                renderKanban();
                showToast('Задача удалена');
            }
        }
        else if (action === 'expandTask') {
            expandTask(taskId);
        }
        else if (action === 'breakDownTask') {
            breakDownTask(taskId);
        }
        else if (action === 'abortBreakdown') {
            abortBreakdown(taskId);
        }
        else if (action === 'modalBreakDown') {
            if(dom.taskModal) dom.taskModal.classList.add('hidden');
            breakDownTask(taskId);
        }
        else if (action === 'removeAttachedFile') {
            state.attachedFilesData.splice(parseInt(index), 1);
            renderNewProjectFiles();
        }
        else if (action === 'removeManualSubtask') {
            state.currentManualSubtasks.splice(parseInt(index), 1);
            renderManualSubtasks();
        }
    });
    
    document.addEventListener('change', (e) => {
        const target = e.target;
        const actionEl = target.closest('[data-action="toggleSubtask"]');
        if (actionEl) {
            const taskId = actionEl.dataset.taskId;
            const subtaskId = actionEl.dataset.subtaskId;
            const project = state.projects.find(p => p.id === state.currentProjectId);
            if(project) {
                const task = project.tasks.find(t => t.id === taskId);
                if(task) {
                    task.subtasks[subtaskId].done = target.checked;
                    saveState();
                    renderKanban();
                    if (dom.taskModal && !dom.taskModal.classList.contains('hidden') && dom.modalTaskTitle && dom.modalTaskTitle.textContent === task.title) {
                        expandTask(taskId);
                    }
                }
            }
        }
    });
}
