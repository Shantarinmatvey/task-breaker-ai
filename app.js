function getApiKey() {
    if (!window.Auth || !window.Auth.currentUser) return '';
    return localStorage.getItem(`gemini_api_key_${window.Auth.currentUser.uid}`) || '';
}

    async function callGemini(contents, signal = null) {
        const apiKey = getApiKey();
        if (!apiKey) {
            document.getElementById('apiModal')?.classList.remove('hidden');
            throw new Error('Укажите API ключ Google Gemini в настройках (кнопка слева внизу).');
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`;
        
        const fetchOptions = {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-goog-api-key': apiKey
            },
            body: JSON.stringify({ contents })
        };
        
        if (signal) fetchOptions.signal = signal;

        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || 'API Error');
        }
        
        return await response.json();
    }

    // DOM Elements
    const newProjectBtn = document.getElementById('newProjectBtn');
    const projectsList = document.getElementById('projectsList');
    const clearAllBtn = document.getElementById('clearAllBtn');
    
    const newProjectView = document.getElementById('newProjectView');
    const loadingView = document.getElementById('loadingView');
    const kanbanView = document.getElementById('kanbanView');
    
    // Form Elements
    const projectTitleInput = document.getElementById('projectTitleInput');
    const taskInput = document.getElementById('taskInput');
    const linkInput = document.getElementById('linkInput');
    const fileInput = document.getElementById('fileInput');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const newProjectFilesContainer = document.getElementById('newProjectFilesContainer');
    const breakDownBtn = document.getElementById('breakDownBtn');
    
    // Kanban Elements
    const currentProjectTitle = document.getElementById('currentProjectTitle');
    const colTodo = document.getElementById('col-todo');
    const colInProgress = document.getElementById('col-in-progress');
    const colDone = document.getElementById('col-done');
    const countTodo = document.getElementById('count-todo');
    const countInProgress = document.getElementById('count-in-progress');
    const countDone = document.getElementById('count-done');
    const toast = document.getElementById('toast');

    // Chart Elements
    const circleTodo = document.getElementById('circleTodo');
    const circleInProgress = document.getElementById('circleInProgress');
    const circleDone = document.getElementById('circleDone');
    const statTextTodo = document.getElementById('statTextTodo');
    const statTextInProgress = document.getElementById('statTextInProgress');
    const statTextDone = document.getElementById('statTextDone');

    // Modal Elements
    const taskModal = document.getElementById('taskModal');
    const closeTaskModalBtn = document.getElementById('closeTaskModalBtn');
    const modalBreakDownBtn = document.getElementById('modalBreakDownBtn');
    
    // Context Modal Elements
    const contextModal = document.getElementById('contextModal');
    const closeContextModalBtn = document.getElementById('closeContextModalBtn');
    const projectContextBtn = document.getElementById('projectContextBtn');


    // State
    let projects = [];
    let currentProjectId = null;
    let attachedFilesData = []; // { type: 'base64'|'text', data: string, mime: string, name: string }

    // --- Initialization ---
    window.initializeApp = async function() {
        if (!window.Auth || !window.Auth.currentUser) return; // Prevent init if not logged in
        await loadState();
    };

    window.clearAppState = function() {
        if (typeof window.closeAllModals === 'function') {
            window.closeAllModals();
        }
        projects = [];
        currentProjectId = null;
        attachedFilesData = [];
        if (typeof renderSidebar === 'function') {
            renderSidebar();
        }
        renderKanban();
        document.getElementById('kanbanView')?.classList.add('hidden');
        document.getElementById('newProjectView')?.classList.remove('hidden');
    };
    
    // Attempt initial load only if auth says we're logged in (this acts as a fallback)
    if (window.Auth && window.Auth.currentUser) {
        window.initializeApp();
    }
    initSortable();

    // Event Listeners
    const openApiModalBtn = document.getElementById('openApiModalBtn');
    const apiModal = document.getElementById('apiModal');
    const closeApiModalBtn = document.getElementById('closeApiModalBtn');
    const saveApiBtn = document.getElementById('saveApiBtn');
    const apiInput = document.getElementById('apiInput');

    const openAccountModalBtn = document.getElementById('openAccountModalBtn');
    const accountModal = document.getElementById('accountModal');
    const closeAccountModalBtn = document.getElementById('closeAccountModalBtn');
    const accountEmailDisplay = document.getElementById('accountEmailDisplay');

    if (openAccountModalBtn) {
        openAccountModalBtn.addEventListener('click', () => {
            if (accountEmailDisplay && window.Auth && window.Auth.currentUser) {
                accountEmailDisplay.textContent = window.Auth.currentUser.email;
            }
            if (accountModal) accountModal.classList.remove('hidden');
        });
    }
    if (closeAccountModalBtn) {
        closeAccountModalBtn.addEventListener('click', () => {
            if (accountModal) accountModal.classList.add('hidden');
        });
    }

    if (openApiModalBtn) {
        openApiModalBtn.addEventListener('click', () => {
            if (apiInput) apiInput.value = getApiKey();
            if (apiModal) apiModal.classList.remove('hidden');
        });
    }
    if (closeApiModalBtn) {
        closeApiModalBtn.addEventListener('click', () => {
            if (apiModal) apiModal.classList.add('hidden');
        });
    }
    if (saveApiBtn) {
        saveApiBtn.addEventListener('click', () => {
            const key = apiInput.value.trim();
            if (key) {
                if (window.Auth && window.Auth.currentUser) {
                    localStorage.setItem(`gemini_api_key_${window.Auth.currentUser.uid}`, key);
                }
                if (apiModal) apiModal.classList.add('hidden');
                showToast('API ключ успешно сохранен');
            } else {
                showToast('Пожалуйста, введите валидный ключ');
            }
        });
    }

    newProjectBtn.addEventListener('click', showNewProjectView);
    breakDownBtn.addEventListener('click', handleCreateProject);
    closeTaskModalBtn.addEventListener('click', () => taskModal.classList.add('hidden'));
    closeContextModalBtn.addEventListener('click', () => contextModal.classList.add('hidden'));
    
    projectContextBtn.addEventListener('click', () => {
        const project = projects.find(p => p.id === currentProjectId);
        if (!project) return;
        
        document.getElementById('contextModalGoal').textContent = project.goal || 'Не указано';
        document.getElementById('contextModalLinks').textContent = project.link || 'Нет ссылок';
        
        const filesContainer = document.getElementById('contextModalFiles');
        if (project.files && project.files.length > 0) {
            filesContainer.innerHTML = project.files.map(name => `
                <div class="file-badge"><i class="fa-solid fa-paperclip"></i> <span>${name}</span></div>
            `).join('');
        } else {
            filesContainer.innerHTML = '<span style="color:var(--text-muted-dark)">Нет файлов</span>';
        }
        
        contextModal.classList.remove('hidden');
    });

    // Event Listeners for Manual Task
    const openManualTaskBtn = document.getElementById('openManualTaskBtn');
    const manualTaskModal = document.getElementById('manualTaskModal');
    const closeManualTaskBtn = document.getElementById('closeManualTaskBtn');
    const saveManualTaskBtn = document.getElementById('saveManualTaskBtn');
    
    const addManualSubtaskBtn = document.getElementById('addManualSubtaskBtn');
    const newSubtaskInput = document.getElementById('newSubtaskInput');
    const manualSubtasksListContainer = document.getElementById('manualSubtasksListContainer');
    let currentManualSubtasks = [];

    function renderManualSubtasks() {
        if (!manualSubtasksListContainer) return;
        manualSubtasksListContainer.innerHTML = currentManualSubtasks.map((st, i) => `
            <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.05); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid rgba(0,0,0,0.1);">
                <span style="color: var(--text-dark); word-break: break-word;">${st}</span>
                <i class="fa-solid fa-xmark" style="color: #ef4444; cursor: pointer; padding: 0.25rem;" onclick="removeManualSubtask(${i})"></i>
            </div>
        `).join('');
    }

    window.removeManualSubtask = (index) => {
        currentManualSubtasks.splice(index, 1);
        renderManualSubtasks();
    };


    if (addManualSubtaskBtn) {
        addManualSubtaskBtn.addEventListener('click', () => {
            const val = newSubtaskInput.value.trim();
            if (val) {
                currentManualSubtasks.push(val);
                newSubtaskInput.value = '';
                renderManualSubtasks();
            }
        });
    }

    if (newSubtaskInput) {
        newSubtaskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addManualSubtaskBtn.click();
            }
        });
    }
    
    window.closeAllModals = () => {
        document.getElementById('apiModal')?.classList.add('hidden');
        document.getElementById('manualTaskModal')?.classList.add('hidden');
        document.getElementById('accountModal')?.classList.add('hidden');
    };

    if (openManualTaskBtn) {
        openManualTaskBtn.addEventListener('click', () => {
            document.getElementById('manualTaskTitle').value = '';
            document.getElementById('manualTaskTime').value = '1 час';
            if (newSubtaskInput) newSubtaskInput.value = '';
            currentManualSubtasks = [];
            renderManualSubtasks();
            if (manualTaskModal) manualTaskModal.classList.remove('hidden');
        });
    }
    
    if (closeManualTaskBtn) {
        closeManualTaskBtn.addEventListener('click', () => {
            if (manualTaskModal) manualTaskModal.classList.add('hidden');
        });
    }
    
    if (saveManualTaskBtn) {
        saveManualTaskBtn.addEventListener('click', () => {
            const title = document.getElementById('manualTaskTitle').value.trim();
            const time = document.getElementById('manualTaskTime').value.trim() || '-';
            
            if (!title) {
                showToast('Пожалуйста, введите название задачи');
                return;
            }
            
            const subtasks = currentManualSubtasks.map(s => ({ title: s, done: false }));
            
            const project = projects.find(p => p.id === currentProjectId);
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
                if (manualTaskModal) manualTaskModal.classList.add('hidden');
                showToast('Задача добавлена!');
            }
        });
    }
    
    fileInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        for (const file of files) {
            if (attachedFilesData.length >= 5) {
                showToast('Максимум 5 файлов');
                break;
            }
            if (attachedFilesData.some(f => f.name === file.name)) continue; // Пропускаем дубликаты

            if (file.name.endsWith('.docx')) {
                try {
                    const arrayBuffer = await file.arrayBuffer();
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    attachedFilesData.push({ type: 'text', data: result.value, mime: null, name: file.name });
                } catch (err) {
                    console.error(err);
                    showToast('Ошибка при чтении DOCX: ' + file.name);
                }
            } else if (file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.csv')) {
                try {
                    const text = await file.text();
                    attachedFilesData.push({ type: 'text', data: text, mime: null, name: file.name });
                } catch(err) {
                    showToast('Ошибка при чтении текстового файла: ' + file.name);
                }
            } else {
                await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        attachedFilesData.push({ 
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
        fileInput.value = ''; // Сброс инпута
    });

    function renderNewProjectFiles() {
        if (attachedFilesData.length === 0) {
            newProjectFilesContainer.innerHTML = '';
            fileNameDisplay.textContent = 'Нажмите, чтобы добавить файлы';
            return;
        }
        
        fileNameDisplay.textContent = `Добавлено файлов: ${attachedFilesData.length} из 5`;
        newProjectFilesContainer.innerHTML = attachedFilesData.map((f, i) => `
            <div class="file-badge">
                <i class="fa-solid fa-paperclip"></i> <span>${f.name}</span>
                <i class="fa-solid fa-xmark" style="cursor:pointer; margin-left: 5px; color: #ef4444;" onclick="removeAttachedFile(${i})"></i>
            </div>
        `).join('');
    }

    window.removeAttachedFile = (index) => {
        attachedFilesData.splice(index, 1);
        renderNewProjectFiles();
    };

    function resetFileInput() {
        attachedFilesData = [];
        fileInput.value = '';
        if(newProjectFilesContainer) renderNewProjectFiles();
    }

    window.showToast = function(message) {
        toast.textContent = message;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 3000);
    }

    // --- State Management ---
    async function loadState() {
        if (!window.Auth || !window.Auth.currentUser) return;
        const uid = window.Auth.currentUser.uid;
        try {
            const docRef = window.db.collection("users").doc(uid);
            const docSnap = await docRef.get();
            if (docSnap.exists) {
                projects = docSnap.data().projects || [];
            } else {
                projects = [];
            }
        } catch (error) {
            console.error("Error loading state:", error);
            projects = [];
            showToast("Ошибка загрузки данных");
        }

        renderSidebar();
        
        if (projects.length > 0) {
            selectProject(projects[0].id);
        } else {
            showNewProjectView();
        }
    }

    async function saveState() {
        if (!window.Auth || !window.Auth.currentUser) return;
        const uid = window.Auth.currentUser.uid;
        try {
            await window.db.collection("users").doc(uid).set({ projects });
        } catch (error) {
            console.error("Error saving state:", error);
            showToast("Ошибка сохранения данных");
        }
        renderSidebar();
    }

    window.deleteProject = (e, id) => {
        e.stopPropagation(); // Предотвращаем клик по самой папке
        const menu = document.getElementById(`menu-${id}`);
        if (menu) menu.classList.add('hidden');

        if (confirm('Удалить этот проект?')) {
            projects = projects.filter(p => p.id !== id);
            saveState();
            if (currentProjectId === id) showNewProjectView();
        }
    };

    window.renameProject = (e, id) => {
        e.stopPropagation();
        const menu = document.getElementById(`menu-${id}`);
        if (menu) menu.classList.add('hidden');
        
        const project = projects.find(p => p.id === id);
        if (!project) return;
        
        const modal = document.getElementById('renameProjectModal');
        const input = document.getElementById('renameProjectInput');
        const saveBtn = document.getElementById('saveRenameModalBtn');
        const closeBtn = document.getElementById('closeRenameModalBtn');
        
        if (input) input.value = project.title;
        if (modal) modal.classList.remove('hidden');
        
        const handleSave = () => {
            const newTitle = input.value.trim();
            if (newTitle.length > 0) {
                project.title = newTitle;
                saveState();
                if (currentProjectId === id && document.getElementById('currentProjectTitle')) {
                    document.getElementById('currentProjectTitle').textContent = project.title;
                }
            }
            closeModal();
        };
        
        const closeModal = () => {
            if (modal) modal.classList.add('hidden');
            if (saveBtn) saveBtn.removeEventListener('click', handleSave);
            if (closeBtn) closeBtn.removeEventListener('click', closeModal);
            if (input) input.removeEventListener('keypress', handleKeypress);
        };
        
        const handleKeypress = (e) => {
            if (e.key === 'Enter') handleSave();
        };
        
        if (saveBtn) saveBtn.addEventListener('click', handleSave);
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (input) input.addEventListener('keypress', handleKeypress);
    };
    
    window.toggleProjectMenu = (e, id) => {
        e.stopPropagation();
        document.querySelectorAll('.project-menu-dropdown').forEach(m => {
            if (m.id !== `menu-${id}`) m.classList.add('hidden');
        });
        
        const menu = document.getElementById(`menu-${id}`);
        if (menu) menu.classList.toggle('hidden');
    };

    document.addEventListener('click', () => {
        document.querySelectorAll('.project-menu-dropdown').forEach(m => m.classList.add('hidden'));
    });

    window.deleteTask = (taskId) => {
        if (!confirm('Вы уверены, что хотите удалить эту задачу?')) return;
        const project = projects.find(p => p.id === currentProjectId);
        if (project) {
            project.tasks = project.tasks.filter(t => t.id !== taskId);
            saveState();
            renderKanban();
            showToast('Задача удалена');
        }
    };

    // --- Navigation & UI ---
    function showNewProjectView() {
        currentProjectId = null;
        renderSidebar();
        newProjectView.classList.remove('hidden');
        kanbanView.classList.add('hidden');
        loadingView.classList.add('hidden');
        taskInput.value = '';
        projectTitleInput.value = '';
        resetFileInput();
    }

    function selectProject(id) {
        currentProjectId = id;
        renderSidebar();
        renderKanban();
        newProjectView.classList.add('hidden');
        loadingView.classList.add('hidden');
        kanbanView.classList.remove('hidden');
    }

    function renderSidebar() {
        projectsList.innerHTML = '';
        projects.forEach(p => {
            const li = document.createElement('li');
            li.className = `project-item ${p.id === currentProjectId ? 'active' : ''}`;
            li.onclick = () => selectProject(p.id);
            
            li.innerHTML = `
                <span class="project-item-title" title="${p.title}" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px; flex-grow: 1;">${p.title}</span>
                <div style="position: relative;">
                    <button class="delete-project-btn" onclick="toggleProjectMenu(event, '${p.id}')">
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                    <div id="menu-${p.id}" class="project-menu-dropdown hidden" style="position: absolute; right: 0; top: 100%; background: var(--card-white); border: 1px solid #e4e4e7; border-radius: var(--radius-sm); box-shadow: var(--shadow-sm); z-index: 10; display: flex; flex-direction: column; min-width: 170px; overflow: hidden;">
                        <button onclick="renameProject(event, '${p.id}')" style="padding: 0.75rem 1rem; display: flex; align-items: center; gap: 0.5rem; text-align: left; background: none; border: none; border-bottom: 1px solid #e4e4e7; cursor: pointer; color: var(--text-dark); width: 100%; font-size: 0.9rem; font-weight: 500; transition: background 0.2s;" onmouseover="this.style.backgroundColor='rgba(0,0,0,0.05)'" onmouseout="this.style.backgroundColor='transparent'"><i class="fa-solid fa-pen"></i> Переименовать</button>
                        <button onclick="deleteProject(event, '${p.id}')" style="padding: 0.75rem 1rem; display: flex; align-items: center; gap: 0.5rem; text-align: left; background: none; border: none; cursor: pointer; color: #ef4444; width: 100%; font-size: 0.9rem; font-weight: 500; transition: background 0.2s;" onmouseover="this.style.backgroundColor='rgba(239,68,68,0.1)'" onmouseout="this.style.backgroundColor='transparent'"><i class="fa-solid fa-trash"></i> Удалить</button>
                    </div>
                </div>
            `;
            
            projectsList.appendChild(li);
        });
    }

    // --- API Calls & Project Creation ---
    async function handleCreateProject() {
        if (!getApiKey()) {
            showToast("Пожалуйста, добавьте API ключ (кнопка слева внизу)");
            document.getElementById('apiModal')?.classList.remove('hidden');
            return;
        }

        const customTitle = projectTitleInput.value.trim();
        const goal = taskInput.value.trim();
        const link = linkInput.value.trim();

        if (!goal || !customTitle) {
            showToast('Пожалуйста, введите название проекта и задачу');
            if (!customTitle) projectTitleInput.focus();
            else taskInput.focus();
            return;
        }

        newProjectView.classList.add('hidden');
        loadingView.classList.remove('hidden');

        try {
            const prompt = `
            Действуй как опытный менеджер проектов.
            Глобальная задача: "${goal}".
            Ссылки: "${link || 'Нет'}".
            
            Твоя цель:
            1. Проанализировать задачу, ссылки и прикрепленные файлы.
            2. Разбить задачу на 5-8 конкретных шагов.
            3. Для каждого шага написать короткий заголовок (title) и оценить время. Обязательно используй понятный формат: часы и минуты, или дни (например: "1 час 30 мин", "4 часа", "2 дня", "45 мин"). ИЗБЕГАЙ больших чисел только в минутах (не пиши "400 мин").
            4. Сразу разбить каждый шаг на 3-5 простых микро-действий (subtasks). Описание (description) писать НЕ НУЖНО.
            
            Ответь СТРОГО в формате JSON:
            {
                "tasks": [
                    { 
                        "title": "Сделать X", 
                        "time": "15 мин", 
                        "subtasks": [
                            {"title": "Шаг 1"}, 
                            {"title": "Шаг 2"}
                        ] 
                    }
                ]
            }
            `;

            const contents = [{ parts: [{ text: prompt }] }];

            // Добавляем все прикрепленные файлы
            for (const fd of attachedFilesData) {
                if (fd.type === 'text') {
                    contents[0].parts.push({ text: `\nТекст из файла "${fd.name}":\n${fd.data}` });
                } else if (fd.type === 'base64') {
                    contents[0].parts.push({ text: `\nФайл "${fd.name}":` });
                    contents[0].parts.push({
                        inlineData: { mimeType: fd.mime, data: fd.data }
                    });
                }
            }

            const data = await callGemini(contents);
            const textResponse = data.candidates[0].content.parts[0].text;
            
            // Найти первый валидный JSON объект
            const match = textResponse.match(/\{[\s\S]*\}/);
            if (!match) throw new Error('Не удалось найти JSON в ответе ИИ');
            
            const parsed = JSON.parse(match[0]);

            const newProject = {
                id: 'proj_' + Date.now(),
                title: customTitle,
                goal: goal,
                link: link,
                files: attachedFilesData.map(f => f.name),
                tasks: parsed.tasks.map((t, i) => ({
                    id: `task_${Date.now()}_${i}`,
                    title: t.title,
                    time: t.time || '-',
                    status: 'todo', // todo, in-progress, done
                    subtasks: t.subtasks ? t.subtasks.map(st => ({ title: st.title, done: false })) : []
                }))
            };

            projects.push(newProject);
            saveState();
            selectProject(newProject.id);

        } catch (error) {
            console.error(error);
            showToast('Ошибка: ' + error.message);
            loadingView.classList.add('hidden');
            newProjectView.classList.remove('hidden');
        }
    }

    // --- Kanban Rendering ---
    function renderKanban() {
        const project = projects.find(p => p.id === currentProjectId);
        if (!project) return;

        currentProjectTitle.textContent = project.title;
        
        colTodo.innerHTML = '';
        colInProgress.innerHTML = '';
        colDone.innerHTML = '';
        
        let doneCount = 0;

        // Alternate card colors for Bento style
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
                        <label class="subtask-item ${st.done ? 'done' : ''}">
                            <input type="checkbox" ${st.done ? 'checked' : ''} onchange="toggleSubtask('${task.id}', ${sti})">
                            <span>${st.title}</span>
                        </label>
                    `;
                });
                subtasksHTML += '</div>';
            }

            el.innerHTML = `
                <div class="task-card-header">
                    <h4 class="task-title">${task.title}</h4>
                    <span class="task-time"><i class="fa-regular fa-clock"></i> ${task.time}</span>
                </div>
                ${subtasksHTML}
                <div class="card-actions" style="justify-content: space-between;">
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <button class="expand-btn" onclick="expandTask('${task.id}')">
                            <i class="fa-solid fa-expand"></i> Читать
                        </button>
                        <button class="break-down-btn" onclick="breakDownTask('${task.id}')">
                            <i class="fa-solid fa-list-check"></i> Раздробить
                        </button>
                    </div>
                    <button class="icon-btn-circle small" onclick="deleteTask('${task.id}')" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; align-self: center;" title="Удалить задачу">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;

            if (task.status === 'todo') colTodo.appendChild(el);
            else if (task.status === 'in-progress') colInProgress.appendChild(el);
            else if (task.status === 'done') colDone.appendChild(el);
        });

        const todoCount = project.tasks.filter(t => t.status === 'todo').length;
        const inProgressCount = project.tasks.filter(t => t.status === 'in-progress').length;
        
        countTodo.textContent = todoCount;
        countInProgress.textContent = inProgressCount;
        countDone.textContent = doneCount;
        
        updateChart(todoCount, inProgressCount, doneCount);
    }
    
    function updateChart(todo, inProgress, done) {
        const total = todo + inProgress + done;
        if (total === 0) return;
        
        const pTodo = todo / total;
        const pInProg = inProgress / total;
        const pDone = done / total;
        
        // 251.2, 188.5, 125.6 are the circumferences
        circleTodo.style.strokeDashoffset = 251.2 - (251.2 * pTodo);
        circleInProgress.style.strokeDashoffset = 188.5 - (188.5 * pInProg);
        circleDone.style.strokeDashoffset = 125.6 - (125.6 * pDone);
        
        statTextTodo.textContent = todo;
        statTextInProgress.textContent = inProgress;
        statTextDone.textContent = done;
    }

    // --- Subtasks Logic ---
    window.toggleSubtask = (taskId, subtaskId) => {
        const project = projects.find(p => p.id === currentProjectId);
        const task = project.tasks.find(t => t.id === taskId);
        task.subtasks[subtaskId].done = !task.subtasks[subtaskId].done;
        saveState();
        renderKanban();
        // If modal is open for this task, re-render modal content
        if (!taskModal.classList.contains('hidden') && document.getElementById('modalTaskTitle').textContent === task.title) {
            expandTask(taskId);
        }
    };

    window.expandTask = (taskId) => {
        try {
            const project = projects.find(p => p.id === currentProjectId);
            if (!project) return;
            const task = project.tasks.find(t => t.id === taskId);
            if (!task) return;
            
            // Передаем цвет карточки в модальное окно
            const cardEl = document.querySelector(`.task-card[data-task-id="${taskId}"]`);
            const colors = ['card-white', 'card-purple', 'card-mint', 'card-dark'];
            let cardColorClass = 'card-white';
            if (cardEl) {
                colors.forEach(c => { if(cardEl.classList.contains(c)) cardColorClass = c; });
            }
            
            const modalContent = document.getElementById('taskModalContainer');
            if (modalContent) modalContent.className = `modal-content bento-card task-modal-content ${cardColorClass}`;
            
            // Обновляем цвет кнопки "Раздробить" для контраста с фоном
            const buttonColorMap = {
                'card-white': 'card-dark',
                'card-purple': 'card-mint',
                'card-mint': 'card-purple',
                'card-dark': 'card-mint'
            };
            const btnColor = buttonColorMap[cardColorClass] || 'card-dark';
            if (typeof modalBreakDownBtn !== 'undefined' && modalBreakDownBtn) {
                modalBreakDownBtn.className = `primary-btn ${btnColor}`;
            }
            
            const titleEl = document.getElementById('modalTaskTitle');
            if (titleEl) titleEl.textContent = task.title || '';
            
            const timeEl = document.getElementById('modalTaskTime');
            if (timeEl) timeEl.innerHTML = `<i class="fa-regular fa-clock"></i> ${task.time || ''}`;
            
            const subtasksContainer = document.getElementById('modalSubtasks');
            if (subtasksContainer) {
                if (task.subtasks && task.subtasks.length > 0) {
                    let html = '<div class="subtasks-list" style="gap: 1rem;">';
                    task.subtasks.forEach((st, sti) => {
                        html += `
                            <label class="subtask-item ${st.done ? 'done' : ''}">
                                <input type="checkbox" style="width: 18px; height: 18px; flex-shrink: 0;" ${st.done ? 'checked' : ''} onchange="toggleSubtask('${task.id}', ${sti})">
                                <span>${st.title}</span>
                            </label>
                        `;
                    });
                    html += '</div>';
                    subtasksContainer.innerHTML = html;
                } else {
                    subtasksContainer.innerHTML = '<p style="color: var(--text-muted-dark);">Нет подзадач.</p>';
                }
            }

            // Привязываем кнопку дробления
            if (typeof modalBreakDownBtn !== 'undefined' && modalBreakDownBtn) {
                modalBreakDownBtn.onclick = () => {
                    if (typeof taskModal !== 'undefined' && taskModal) taskModal.classList.add('hidden');
                    breakDownTask(taskId);
                };
            }

            if (typeof taskModal !== 'undefined' && taskModal) {
                taskModal.classList.remove('hidden');
            } else {
                document.getElementById('taskModal')?.classList.remove('hidden');
            }
        } catch (err) {
            console.error(err);
            alert('Ошибка при открытии карточки: ' + err.message);
        }
    };

    const activeBreakdownRequests = {};
    
    window.abortBreakdown = (taskId) => {
        if (activeBreakdownRequests[taskId]) {
            activeBreakdownRequests[taskId].abort();
            delete activeBreakdownRequests[taskId];
        }
    };

    window.breakDownTask = async (taskId) => {
        const project = projects.find(p => p.id === currentProjectId);
        const task = project.tasks.find(t => t.id === taskId);
        
        // Find the button and show loading/stop state
        const card = document.querySelector(`[data-task-id="${taskId}"]`);
        const btn = card.querySelector('.break-down-btn');
        
        // Transform button to Stop
        btn.innerHTML = '<i class="fa-solid fa-stop"></i> Отмена';
        btn.style.backgroundColor = '#ef4444';
        btn.style.color = '#fff';
        btn.onclick = () => window.abortBreakdown(taskId);

        const controller = new AbortController();
        activeBreakdownRequests[taskId] = controller;

        try {
            const existingSubtasks = task.subtasks && task.subtasks.length > 0 
                ? task.subtasks.map(st => st.title).join("; ") 
                : "Нет текущих подзадач";
                
            const prompt = `
            Глобальный проект: "${project.title}".
            Шаг: "${task.title}".
            Уже есть подзадачи: "${existingSubtasks}".
            
            Твоя цель: Придумать 3-5 НОВЫХ, ДОПОЛНИТЕЛЬНЫХ микро-действий (subtasks), которые углубляют и продолжают этот шаг. Не повторяй существующие пункты.
            Ответь СТРОГО массивом JSON без дополнительных объектов-оберток. Никогда не пиши поясняющий текст.
            Пример:
            [
                { "title": "Новый шаг 1" },
                { "title": "Новый шаг 2" }
            ]
            `;

            const contents = [{ parts: [{ text: prompt }] }];

            const data = await callGemini(contents, controller.signal);
            const textResponse = data.candidates[0].content.parts[0].text;
            
            // Надежный парсинг массива
            const jsonStart = textResponse.indexOf('[');
            const jsonEnd = textResponse.lastIndexOf(']');
            if (jsonStart === -1 || jsonEnd === -1) throw new Error('Не удалось найти JSON массив');
            
            const parsedSubtasks = JSON.parse(textResponse.substring(jsonStart, jsonEnd + 1));
            
            const newSubtasks = parsedSubtasks.map(st => ({ title: st.title, done: false }));
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
                btn.innerHTML = '<i class="fa-solid fa-list-check"></i> Раздробить';
                btn.style.backgroundColor = '';
                btn.style.color = '';
                btn.onclick = () => breakDownTask(taskId);
            }
        }
    };

    // --- Sortable.js Initialization ---
    function initSortable() {
        const columns = [colTodo, colInProgress, colDone];
        
        columns.forEach(col => {
            new Sortable(col, {
                group: 'kanban',
                animation: 150,
                ghostClass: 'sortable-ghost',
                dragClass: 'sortable-drag',
                onEnd: function (evt) {
                    const itemEl = evt.item;
                    const taskId = itemEl.dataset.taskId;
                    const newStatus = evt.to.dataset.status; // todo, in-progress, done
                    
                    // Update State
                    const project = projects.find(p => p.id === currentProjectId);
                    if (project) {
                        const task = project.tasks.find(t => t.id === taskId);
                        if (task && task.status !== newStatus) {
                            task.status = newStatus;
                            saveState();
                            // Update counts without full re-render
                            const todoCount = project.tasks.filter(t => t.status === 'todo').length;
                            const inProgressCount = project.tasks.filter(t => t.status === 'in-progress').length;
                            const doneCount = project.tasks.filter(t => t.status === 'done').length;
                            
                            countTodo.textContent = todoCount;
                            countInProgress.textContent = inProgressCount;
                            countDone.textContent = doneCount;
                            
                            updateChart(todoCount, inProgressCount, doneCount);
                        }
                    }
                },
            });
        });
    }

