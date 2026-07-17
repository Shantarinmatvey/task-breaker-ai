import { dom } from './dom.js';
import { state, saveState, showToast } from './state.js';
import { showNewProjectView } from './modals.js';
import { callGemini, getApiKey } from './api.js';

export const activeBreakdownRequests = {};

export function selectProject(id) {
    state.currentProjectId = id;
    renderSidebar();
    renderKanban();
    if(dom.newProjectView) dom.newProjectView.classList.add('hidden');
    if(dom.loadingView) dom.loadingView.classList.add('hidden');
    if(dom.kanbanView) dom.kanbanView.classList.remove('hidden');
}

export function renderSidebar() {
    if(!dom.projectsList) return;
    dom.projectsList.innerHTML = '';
    state.projects.forEach(p => {
        const li = document.createElement('li');
        li.className = `project-item ${p.id === state.currentProjectId ? 'active' : ''}`;
        li.dataset.action = 'selectProject';
        li.dataset.id = p.id;
        
        li.innerHTML = `
            <span class="project-item-title" title="${p.title}" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px; flex-grow: 1;">${p.title}</span>
            <div style="position: relative;">
                <button class="delete-project-btn" data-action="toggleProjectMenu" data-id="${p.id}">
                    <i class="fa-solid fa-ellipsis-vertical" style="pointer-events: none;"></i>
                </button>
                <div id="menu-${p.id}" class="project-menu-dropdown hidden" style="position: absolute; right: 0; top: 100%; background: var(--card-white); border: 1px solid #e4e4e7; border-radius: var(--radius-sm); box-shadow: var(--shadow-sm); z-index: 10; display: flex; flex-direction: column; min-width: 170px; overflow: hidden;">
                    <button data-action="renameProject" data-id="${p.id}" style="padding: 0.75rem 1rem; display: flex; align-items: center; gap: 0.5rem; text-align: left; background: none; border: none; border-bottom: 1px solid #e4e4e7; cursor: pointer; color: var(--text-dark); width: 100%; font-size: 0.9rem; font-weight: 500; transition: background 0.2s;" onmouseover="this.style.backgroundColor='rgba(0,0,0,0.05)'" onmouseout="this.style.backgroundColor='transparent'"><i class="fa-solid fa-pen" style="pointer-events: none;"></i> Переименовать</button>
                    <button data-action="deleteProject" data-id="${p.id}" style="padding: 0.75rem 1rem; display: flex; align-items: center; gap: 0.5rem; text-align: left; background: none; border: none; cursor: pointer; color: #ef4444; width: 100%; font-size: 0.9rem; font-weight: 500; transition: background 0.2s;" onmouseover="this.style.backgroundColor='rgba(239,68,68,0.1)'" onmouseout="this.style.backgroundColor='transparent'"><i class="fa-solid fa-trash" style="pointer-events: none;"></i> Удалить</button>
                </div>
            </div>
        `;
        
        dom.projectsList.appendChild(li);
    });
}

export function renderKanban() {
    const project = state.projects.find(p => p.id === state.currentProjectId);
    if (!project) return;

    if(dom.currentProjectTitle) dom.currentProjectTitle.textContent = project.title;
    
    if(dom.colTodo) dom.colTodo.innerHTML = '';
    if(dom.colInProgress) dom.colInProgress.innerHTML = '';
    if(dom.colDone) dom.colDone.innerHTML = '';
    
    let doneCount = 0;
    const colors = ['card-white', 'card-purple', 'card-mint', 'card-dark'];

    project.tasks.forEach((task, index) => {
        const el = document.createElement('div');
        el.className = `bento-card task-card ${colors[index % colors.length]}`;
        el.dataset.taskId = task.id;

        if (task.status === 'done') doneCount++;

        let subtasksHTML = '';
        if (task.subtasks && task.subtasks.length > 0) {
            subtasksHTML = '<div class="subtasks-list">';
            task.subtasks.forEach((st, sti) => {
                subtasksHTML += `
                    <label class="subtask-item ${st.done ? 'done' : ''}" title="${st.description || ''}">
                        <input type="checkbox" ${st.done ? 'checked' : ''} data-action="toggleSubtask" data-task-id="${task.id}" data-subtask-id="${sti}">
                        <span>${st.title}</span>
                    </label>
                `;
            });
            subtasksHTML += '</div>';
        }

        el.innerHTML = `
            <div class="task-card-header">
                <h4 class="task-title">${task.title}</h4>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <span class="task-complexity badge-${task.complexity || 'M'}">${task.complexity || 'M'}</span>
                    <i class="fa-solid fa-grip-vertical drag-handle" title="Перетащить"></i>
                </div>
            </div>
            ${subtasksHTML}
            <div class="card-actions" style="justify-content: space-between;">
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <button class="expand-btn card-action-btn" data-action="expandTask" data-task-id="${task.id}">
                        <i class="fa-solid fa-expand" style="pointer-events: none;"></i> Развернуть
                    </button>
                    <button class="break-down-btn card-action-btn ${activeBreakdownRequests[task.id] ? 'active' : ''}" data-action="${activeBreakdownRequests[task.id] ? 'abortBreakdown' : 'breakDownTask'}" data-task-id="${task.id}">
                        <i class="fa-solid ${activeBreakdownRequests[task.id] ? 'fa-spinner fa-spin' : 'fa-list-check'}" style="pointer-events: none;"></i> ${activeBreakdownRequests[task.id] ? 'Отменить' : 'Раздробить'}
                    </button>
                </div>
                <button class="icon-btn-circle small delete-btn" data-action="deleteTask" data-task-id="${task.id}" title="Удалить задачу">
                    <i class="fa-solid fa-trash" style="pointer-events: none;"></i>
                </button>
            </div>
        `;

        if (task.status === 'todo') {
            if(dom.colTodo) dom.colTodo.appendChild(el);
        } else if (task.status === 'in-progress') {
            if(dom.colInProgress) dom.colInProgress.appendChild(el);
        } else if (task.status === 'done') {
            if(dom.colDone) dom.colDone.appendChild(el);
        }
    });

    const todoCount = project.tasks.filter(t => t.status === 'todo').length;
    const inProgressCount = project.tasks.filter(t => t.status === 'in-progress').length;
    
    if(dom.countTodo) dom.countTodo.textContent = todoCount;
    if(dom.countInProgress) dom.countInProgress.textContent = inProgressCount;
    if(dom.countDone) dom.countDone.textContent = doneCount;
    
    updateChart(todoCount, inProgressCount, doneCount);
}

export function updateChart(todo, inProgress, done) {
    const total = todo + inProgress + done;
    if (total === 0) return;
    
    const pTodo = todo / total;
    const pInProg = inProgress / total;
    const pDone = done / total;
    
    if(dom.circleTodo) dom.circleTodo.style.strokeDashoffset = 251.2 - (251.2 * pTodo);
    if(dom.circleInProgress) dom.circleInProgress.style.strokeDashoffset = 188.5 - (188.5 * pInProg);
    if(dom.circleDone) dom.circleDone.style.strokeDashoffset = 125.6 - (125.6 * pDone);
    
    if(dom.statTextTodo) dom.statTextTodo.textContent = todo;
    if(dom.statTextInProgress) dom.statTextInProgress.textContent = inProgress;
    if(dom.statTextDone) dom.statTextDone.textContent = done;
}

export function renderManualSubtasks() {
    if (!dom.manualSubtasksListContainer) return;
    dom.manualSubtasksListContainer.innerHTML = state.currentManualSubtasks.map((st, i) => `
        <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.05); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid rgba(0,0,0,0.1);">
            <span style="color: var(--text-dark); word-break: break-word;">${st}</span>
            <i class="fa-solid fa-xmark" style="color: #ef4444; cursor: pointer; padding: 0.25rem;" data-action="removeManualSubtask" data-index="${i}"></i>
        </div>
    `).join('');
}

export function initSortable() {
    if(typeof Sortable === 'undefined') return;
    const columns = [dom.colTodo, dom.colInProgress, dom.colDone];
    
    columns.forEach(col => {
        if(!col) return;
        new Sortable(col, {
            group: 'kanban',
            animation: 150,
            handle: '.drag-handle',
            fallbackOnBody: true,
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            onEnd: function (evt) {
                const itemEl = evt.item;
                const taskId = itemEl.dataset.taskId;
                const newStatus = evt.to.dataset.status;
                
                const project = state.projects.find(p => p.id === state.currentProjectId);
                if (project) {
                    const task = project.tasks.find(t => t.id === taskId);
                    if (task && task.status !== newStatus) {
                        task.status = newStatus;
                        saveState();
                        
                        const todoCount = project.tasks.filter(t => t.status === 'todo').length;
                        const inProgressCount = project.tasks.filter(t => t.status === 'in-progress').length;
                        const doneCount = project.tasks.filter(t => t.status === 'done').length;
                        
                        if(dom.countTodo) dom.countTodo.textContent = todoCount;
                        if(dom.countInProgress) dom.countInProgress.textContent = inProgressCount;
                        if(dom.countDone) dom.countDone.textContent = doneCount;
                        
                        updateChart(todoCount, inProgressCount, doneCount);
                    }
                }
            },
        });
    });
}

export function abortBreakdown(taskId) {
    if (activeBreakdownRequests[taskId]) {
        activeBreakdownRequests[taskId].abort();
        delete activeBreakdownRequests[taskId];
    }
}

export async function breakDownTask(taskId) {
    const project = state.projects.find(p => p.id === state.currentProjectId);
    const task = project.tasks.find(t => t.id === taskId);
    
    const card = document.querySelector(`[data-task-id="${taskId}"]`);
    if(!card) return;
    const btn = card.querySelector('.break-down-btn');
    
    if(btn) {
        btn.innerHTML = '<i class="fa-solid fa-stop" style="pointer-events: none;"></i> Отмена';
        btn.style.backgroundColor = '#ef4444';
        btn.style.color = '#fff';
        btn.dataset.action = 'abortBreakdown';
    }

    const controller = new AbortController();
    activeBreakdownRequests[taskId] = controller;

    try {
        const existingSubtasks = task.subtasks && task.subtasks.length > 0 
            ? task.subtasks.map(st => st.title).join("; ") 
            : "Нет текущих подзадач";
            
        const prompt = `
        Роль: Ты — Senior Project Manager и Agile-эксперт.
        Проект: "${project.title}".
        Текущая задача: "${task.title}".
        Уже существующие подзадачи: "${existingSubtasks}".
        
        Задача: Декомпозировать эту задачу еще на 3-5 подзадач (subtasks) используя принцип MECE (взаимоисключающие, совместно исчерпывающие).
        Они не должны дублировать уже существующие подзадачи.
        
        Требования:
        1. Action-Oriented: Заголовки должны начинаться с глагола (например, "Разработать API...").
        2. DoD (Definition of Done): Для каждой подзадачи напиши краткое описание/критерий приемки (свойство description).
        
        Ответь строго в формате JSON, представляющем массив объектов. Не пиши никакой другой текст.
        Пример:
        [
            { 
              "title": "Спроектировать схему БД", 
              "description": "Таблицы созданы, связи настроены, скрипты миграции готовы." 
            }
        ]
        `;

        const contents = [{ parts: [{ text: prompt }] }];

        const data = await callGemini(contents, controller.signal);
        const textResponse = data.candidates[0].content.parts[0].text;
        
        const jsonStart = textResponse.indexOf('[');
        const jsonEnd = textResponse.lastIndexOf(']');
        if (jsonStart === -1 || jsonEnd === -1) throw new Error('Не удалось извлечь JSON массив');
        
        const parsedSubtasks = JSON.parse(textResponse.substring(jsonStart, jsonEnd + 1));
        
        const newSubtasks = parsedSubtasks.map(st => ({ 
            title: st.title, 
            description: st.description || '',
            done: false 
        }));
        
        if (task.subtasks) {
            task.subtasks.push(...newSubtasks);
        } else {
            task.subtasks = newSubtasks;
        }
        
        delete activeBreakdownRequests[taskId];
        saveState();
        renderKanban();

    } catch (error) {
        delete activeBreakdownRequests[taskId];
        if (error.name === 'AbortError') {
            showToast('Дробление отменено');
        } else {
            console.error(error);
            showToast('Ошибка дробления: ' + error.message);
        }
        
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-list-check" style="pointer-events: none;"></i> Раздробить';
            btn.style.backgroundColor = '';
            btn.style.color = '';
            btn.dataset.action = 'breakDownTask';
        }
    }
}

export async function handleCreateProject() {
    if (!getApiKey()) {
        showToast("Пожалуйста, добавьте API ключ (кнопка слева внизу)");
        if(dom.apiModal) dom.apiModal.classList.remove('hidden');
        return;
    }

    const customTitle = dom.projectTitleInput.value.trim();
    const goal = dom.taskInput.value.trim();
    const link = dom.linkInput.value.trim();

    if (!goal || !customTitle) {
        showToast('Пожалуйста, введите название проекта и задачу');
        if (!customTitle) dom.projectTitleInput.focus();
        else dom.taskInput.focus();
        return;
    }

    if(dom.newProjectView) dom.newProjectView.classList.add('hidden');
    if(dom.loadingView) dom.loadingView.classList.remove('hidden');

    try {
        const prompt = `
        Роль: Ты — Senior Project Manager, Системный аналитик и Agile-эксперт.
        
        Главная цель: "${goal}".
        Дополнительная ссылка: "${link || 'Нет'}".
        
        Твоя задача:
        1. Оценить предоставленные источники (ссылку и файлы, если они есть). Насколько они полезны для декомпозиции?
        2. Разбить цель на 5-8 крупных задач по принципу MECE (взаимоисключающие, совместно исчерпывающие).
        3. Заголовки задач должны быть Action-Oriented (начинаться с глагола, например: "Настроить сервер").
        4. Для каждой задачи указать "complexity" (сложность: S, M, L, XL).
        5. Разбить каждую задачу на 3-5 конкретных подзадач.
        6. Для каждой подзадачи написать "description" (Definition of Done - критерии приемки).
        
        Верни строго JSON объект следующей структуры, без Markdown оборачивания (\`\`\`json) и без лишнего текста:
        {
            "source_evaluation": [
                {
                    "source_name": "Название источника (например, ссылка или имя файла)",
                    "usefulness_score": 5,
                    "reason": "Кратко почему источник полезен (или не полезен)."
                }
            ],
            "tasks": [
                {
                    "title": "Название задачи",
                    "complexity": "M",
                    "subtasks": [
                        { 
                            "title": "Название подзадачи", 
                            "description": "Критерии того, что подзадача выполнена" 
                        }
                    ]
                }
            ]
        }
        `;

        const contents = [{ parts: [{ text: prompt }] }];

        for (const fd of state.attachedFilesData) {
            if (fd.type === 'text') {
                contents[0].parts.push({ text: `\n--- Файл "${fd.name}":\n${fd.data}` });
            } else if (fd.type === 'base64') {
                contents[0].parts.push({ text: `\n--- Файл "${fd.name}":` });
                contents[0].parts.push({
                    inlineData: { mimeType: fd.mime, data: fd.data }
                });
            }
        }

        const data = await callGemini(contents);
        const textResponse = data.candidates[0].content.parts[0].text;
        
        const match = textResponse.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('Не удалось найти JSON в ответе ИИ');
        
        const parsed = JSON.parse(match[0]);

        const newProject = {
            id: 'proj_' + Date.now(),
            title: customTitle,
            goal: goal,
            link: link,
            files: state.attachedFilesData.map(f => f.name),
            source_evaluation: parsed.source_evaluation || [],
            tasks: parsed.tasks.map((t, i) => ({
                id: `task_${Date.now()}_${i}`,
                title: t.title,
                complexity: t.complexity || 'M',
                status: 'todo',
                subtasks: (t.subtasks || []).map(st => ({
                    title: st.title,
                    description: st.description || '',
                    done: false
                }))
            }))
        };

        state.projects.push(newProject);
        saveState();
        selectProject(newProject.id);

    } catch (error) {
        console.error(error);
        showToast('Ошибка: ' + error.message);
        if(dom.loadingView) dom.loadingView.classList.add('hidden');
        if(dom.newProjectView) dom.newProjectView.classList.remove('hidden');
    }
}

export function expandTask(taskId) {
    try {
        const project = state.projects.find(p => p.id === state.currentProjectId);
        if (!project) return;
        const task = project.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        const cardEl = document.querySelector(`.task-card[data-task-id="${taskId}"]`);
        const colors = ['card-white', 'card-purple', 'card-mint', 'card-dark'];
        let cardColorClass = 'card-white';
        if (cardEl) {
            colors.forEach(c => { if(cardEl.classList.contains(c)) cardColorClass = c; });
        }
        
        if (dom.taskModalContainer) dom.taskModalContainer.className = `modal-content bento-card task-modal-content ${cardColorClass}`;
        
        const buttonColorMap = {
            'card-white': 'card-dark',
            'card-purple': 'card-mint',
            'card-mint': 'card-purple',
            'card-dark': 'card-mint'
        };
        const btnColor = buttonColorMap[cardColorClass] || 'card-dark';
        if (dom.modalBreakDownBtn) {
            dom.modalBreakDownBtn.className = `primary-btn ${btnColor}`;
            dom.modalBreakDownBtn.dataset.action = 'modalBreakDown';
            dom.modalBreakDownBtn.dataset.taskId = taskId;
        }
        
        if (dom.modalTaskTitle) dom.modalTaskTitle.textContent = task.title || '';
        if (dom.modalTaskTime) dom.modalTaskTime.innerHTML = `<span class="task-complexity badge-${task.complexity || 'M'}">${task.complexity || 'M'}</span>`;
        
        if (dom.modalSubtasks) {
            if (task.subtasks && task.subtasks.length > 0) {
                let html = '<div class="subtasks-list" style="gap: 1rem;">';
                task.subtasks.forEach((st, sti) => {
                    html += `
                        <label class="subtask-item ${st.done ? 'done' : ''}">
                            <input type="checkbox" style="width: 18px; height: 18px; flex-shrink: 0;" ${st.done ? 'checked' : ''} data-action="toggleSubtask" data-task-id="${task.id}" data-subtask-id="${sti}">
                            <span>${st.title}</span>
                        </label>
                    `;
                });
                html += '</div>';
                dom.modalSubtasks.innerHTML = html;
            } else {
                dom.modalSubtasks.innerHTML = '<p style="color: var(--text-muted-dark);">Нет подзадач.</p>';
            }
        }

        if (dom.taskModal) dom.taskModal.classList.remove('hidden');
    } catch (err) {
        console.error(err);
        alert('Ошибка при открытии карточки: ' + err.message);
    }
}
