// ========== НАСТРОЙКИ GITHUB ==========
const GITHUB_CONFIG = {
    // URL вашего JSON файла на GitHub (ЗАМЕНИТЕ НА ВАШ!)
    DATA_URL: 'https://raw.githubusercontent.com/azm197414/turnirvihr/main/data.json',
    
    // Для записи нужен GitHub API токен
    // Создать: GitHub → Settings → Developer settings → Personal access tokens
    // Дайте права "repo" или "gist"
    API_TOKEN: '', // ОСТАВЬТЕ ПУСТЫМ, пока не создадите токен
    
    REPO: 'azm197414/turnirvihr',
    BRANCH: 'main',
    FILE_PATH: 'data.json'
};

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let onlineModeEnabled = false;
let autoSyncInterval = null;

// ========== ОСНОВНЫЕ ФУНКЦИИ ==========

// Инициализация онлайн-режима
function initOnlineMode() {
    console.log('Инициализация онлайн-режима...');
    
    // Создаем элементы интерфейса
    createOnlineUI();
    
    // Загружаем данные с сервера при старте
    setTimeout(() => {
        loadFromServer();
    }, 1000);
    
    // Сохраняем данные каждую минуту в режиме редактирования
    if (currentMode === 'edit') {
        startAutoSave();
    }
}

// Создание интерфейса онлайн-режима
function createOnlineUI() {
    const controls = document.querySelector('.controls');
    
    const onlineControls = document.createElement('div');
    onlineControls.className = 'online-controls';
    onlineControls.innerHTML = `
        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd;">
            <strong style="color: #3498db;">🌐 Онлайн-режим:</strong>
            <button onclick="loadFromServer()" id="loadOnlineBtn" style="background: #2ecc71; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; font-size: 14px;">
                🔄 Загрузить с сервера
            </button>
            <button onclick="saveToServer()" id="saveOnlineBtn" style="background: #9b59b6; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; font-size: 14px;" disabled>
                💾 Сохранить на сервер
            </button>
            <button onclick="toggleAutoSync()" id="autoSyncBtn" style="background: #3498db; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; font-size: 14px;">
                🔄 Автообновление (выкл)
            </button>
            <div id="syncStatus" style="margin-left: auto; font-size: 12px; color: #7f8c8d;">
                <span id="lastSyncTime">Не синхронизировано</span>
                <div style="font-size: 10px;">👁️ <span id="onlineCount">1</span> зрителей</div>
            </div>
        </div>
    `;
    
    controls.parentNode.insertBefore(onlineControls, controls.nextSibling);
    
    // Обновляем кнопку сохранения в зависимости от режима
    updateSaveButton();
}

// Обновление состояния кнопки сохранения
function updateSaveButton() {
    const saveBtn = document.getElementById('saveOnlineBtn');
    if (!saveBtn) return;
    
    if (currentMode === 'edit' && GITHUB_CONFIG.API_TOKEN) {
        saveBtn.disabled = false;
        saveBtn.title = 'Сохранить данные на GitHub';
    } else if (currentMode !== 'edit') {
        saveBtn.disabled = true;
        saveBtn.title = 'Только редакторы могут сохранять';
    } else if (!GITHUB_CONFIG.API_TOKEN) {
        saveBtn.disabled = true;
        saveBtn.title = 'Добавьте GitHub API токен в настройках';
    }
}

// ========== ЗАГРУЗКА ДАННЫХ ==========

// Загрузка данных с сервера
async function loadFromServer() {
    try {
        showNotification('🔄 Загрузка данных с сервера...', 'info');
        updateSyncStatus('Загрузка...', 'loading');
        
        // Добавляем метку времени для избежания кеширования
        const url = GITHUB_CONFIG.DATA_URL + '?t=' + Date.now();
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data || !data.participants) {
            throw new Error('Некорректный формат данных');
        }
        
        // Применяем данные к таблице
        applyServerData(data.participants);
        
        // Сохраняем в localStorage как кэш
        localStorage.setItem('server_data_cache', JSON.stringify(data));
        localStorage.setItem('last_server_sync', Date.now());
        
        // Обновляем статистику
        updateSyncStatus(`Загружено: ${new Date().toLocaleTimeString()}`, 'success');
        showNotification(`✅ Данные успешно загружены (${data.participants.length} участников)`, 'success');
        
        // Обновляем счетчик зрителей
        updateViewerCount();
        
        return true;
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        
        // Пробуем загрузить из кэша
        const cachedData = localStorage.getItem('server_data_cache');
        if (cachedData) {
            try {
                const data = JSON.parse(cachedData);
                applyServerData(data.participants);
                showNotification('⚠️ Используются кэшированные данные (оффлайн)', 'warning');
                updateSyncStatus('Оффлайн-режим', 'warning');
            } catch (e) {
                // Если кэш тоже поврежден
                showNotification('❌ Не удалось загрузить данные', 'error');
                updateSyncStatus('Ошибка загрузки', 'error');
            }
        } else {
            showNotification('❌ Не удалось загрузить данные', 'error');
            updateSyncStatus('Ошибка загрузки', 'error');
        }
        
        return false;
    }
}

// Применение данных с сервера к таблице
function applyServerData(participantsData) {
    if (!participantsData || !Array.isArray(participantsData)) {
        console.error('Некорректные данные участников');
        return;
    }
    
    // Проходим по всем участникам
    participantsData.forEach((participant, index) => {
        if (index < participants.length) {
            // Обновляем поля ввода
            const angleInput = document.getElementById(`angle_${index}`);
            const timeLzInput = document.getElementById(`time_lz_${index}`);
            const timeKzInput = document.getElementById(`time_kz_${index}`);
            const lapsInput = document.getElementById(`laps_${index}`);
            const gatesInput = document.getElementById(`penalty_gates_${index}`);
            const fallInput = document.getElementById(`penalty_fall_${index}`);
            const flipInput = document.getElementById(`penalty_flip_${index}`);
            
            if (angleInput) angleInput.value = participant.angle || 0;
            if (timeLzInput) timeLzInput.value = participant.timeLz || '00:00:00';
            if (timeKzInput) timeKzInput.value = participant.timeKz || '00:00:00';
            if (lapsInput) lapsInput.value = participant.laps || 0;
            if (gatesInput) gatesInput.value = participant.penalty_gates || 0;
            if (fallInput) fallInput.value = participant.penalty_fall || 0;
            if (flipInput) flipInput.value = participant.penalty_flip || 0;
        }
    });
    
    // Пересчитываем все результаты
    calculateAll();
    
    // Сохраняем локально (как резервную копию)
    saveToLocalStorage();
}

// ========== СОХРАНЕНИЕ ДАННЫХ ==========

// Сохранение данных на сервер
async function saveToServer() {
    if (currentMode !== 'edit') {
        showNotification('❌ Только редакторы могут сохранять данные', 'error');
        return false;
    }
    
    if (!GITHUB_CONFIG.API_TOKEN) {
        showNotification('❌ Не настроен GitHub API токен', 'error');
        showTokenInstructions();
        return false;
    }
    
    if (!confirm('Сохранить текущие данные на сервер?\nВсе пользователи увидят изменения.')) {
        return false;
    }
    
    try {
        showNotification('💾 Сохранение данных на GitHub...', 'info');
        updateSyncStatus('Сохранение...', 'loading');
        
        // Получаем текущие данные
        const data = getCurrentDataForServer();
        
        // Обновляем файл на GitHub
        const success = await updateGitHubFile(data);
        
        if (success) {
            showNotification('✅ Данные успешно сохранены на GitHub!', 'success');
            updateSyncStatus(`Сохранено: ${new Date().toLocaleTimeString()}`, 'success');
            
            // Обновляем кэш
            localStorage.setItem('server_data_cache', JSON.stringify(data));
            localStorage.setItem('last_server_sync', Date.now());
            
            return true;
        } else {
            throw new Error('Не удалось сохранить на GitHub');
        }
        
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showNotification('❌ Ошибка сохранения на сервер', 'error');
        updateSyncStatus('Ошибка сохранения', 'error');
        return false;
    }
}

// Получение текущих данных для отправки на сервер
function getCurrentDataForServer() {
    const participantsData = [];
    
    for (let i = 0; i < participants.length; i++) {
        participantsData.push({
            team: participants[i].team,
            name: participants[i].name,
            angle: parseInt(document.getElementById(`angle_${i}`).value) || 0,
            timeLz: document.getElementById(`time_lz_${i}`).value || '00:00:00',
            timeKz: document.getElementById(`time_kz_${i}`).value || '00:00:00',
            laps: parseInt(document.getElementById(`laps_${i}`).value) || 0,
            penalty_gates: parseInt(document.getElementById(`penalty_gates_${i}`).value) || 0,
            penalty_fall: parseInt(document.getElementById(`penalty_fall_${i}`).value) || 0,
            penalty_flip: parseInt(document.getElementById(`penalty_flip_${i}`).value) || 0
        });
    }
    
    return {
        lastUpdated: new Date().toISOString(),
        version: getCurrentVersion() + 1,
        participants: participantsData
    };
}

// Обновление файла на GitHub через API
async function updateGitHubFile(data) {
    try {
        const content = JSON.stringify(data, null, 2);
        const contentEncoded = btoa(unescape(encodeURIComponent(content)));
        
        // Сначала получаем информацию о файле
        const getUrl = `https://api.github.com/repos/${GITHUB_CONFIG.REPO}/contents/${GITHUB_CONFIG.FILE_PATH}`;
        const getResponse = await fetch(getUrl, {
            headers: {
                'Authorization': `token ${GITHUB_CONFIG.API_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        let sha = '';
        if (getResponse.ok) {
            const fileInfo = await getResponse.json();
            sha = fileInfo.sha;
        }
        
        // Обновляем файл
        const updateUrl = `https://api.github.com/repos/${GITHUB_CONFIG.REPO}/contents/${GITHUB_CONFIG.FILE_PATH}`;
        const updateResponse = await fetch(updateUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_CONFIG.API_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message: `Обновление турнирной таблицы: ${new Date().toLocaleString('ru-RU')}`,
                content: contentEncoded,
                sha: sha || undefined,
                branch: GITHUB_CONFIG.BRANCH
            })
        });
        
        return updateResponse.ok;
        
    } catch (error) {
        console.error('Ошибка обновления файла:', error);
        return false;
    }
}

// ========== АВТОСИНХРОНИЗАЦИЯ ==========

// Включение/выключение автосинхронизации
function toggleAutoSync() {
    const autoSyncBtn = document.getElementById('autoSyncBtn');
    
    if (autoSyncInterval) {
        // Выключаем
        clearInterval(autoSyncInterval);
        autoSyncInterval = null;
        autoSyncBtn.innerHTML = '🔄 Автообновление (выкл)';
        autoSyncBtn.style.background = '#3498db';
        showNotification('⏸️ Автообновление выключено', 'info');
    } else {
        // Включаем
        autoSyncInterval = setInterval(async () => {
            await loadFromServer();
        }, 30000); // Каждые 30 секунд
        
        autoSyncBtn.innerHTML = '🔁 Автообновление (вкл)';
        autoSyncBtn.style.background = '#2ecc71';
        showNotification('🔄 Автообновление включено (каждые 30 сек)', 'success');
    }
}

// Автосохранение для редакторов
function startAutoSave() {
    if (currentMode === 'edit' && GITHUB_CONFIG.API_TOKEN) {
        setInterval(() => {
            // Автосохранение каждые 2 минуты, только если были изменения
            if (hasUnsavedChanges()) {
                saveToServer();
            }
        }, 120000); // 2 минуты
    }
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

// Показать уведомление
function showNotification(message, type = 'info') {
    // Создаем или находим контейнер для уведомлений
    let container = document.getElementById('notificationContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notificationContainer';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 300px;
        `;
        document.body.appendChild(container);
    }
    
    // Создаем уведомление
    const notification = document.createElement('div');
    notification.style.cssText = `
        background: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : type === 'warning' ? '#f39c12' : '#3498db'};
        color: white;
        padding: 12px 16px;
        margin-bottom: 10px;
        border-radius: 5px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        animation: slideIn 0.3s ease-out;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 18px;">${getIconForType(type)}</span>
            <span>${message}</span>
        </div>
    `;
    
    container.appendChild(notification);
    
    // Автоматическое скрытие
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                container.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function getIconForType(type) {
    switch(type) {
        case 'success': return '✅';
        case 'error': return '❌';
        case 'warning': return '⚠️';
        default: return 'ℹ️';
    }
}

// Обновление статуса синхронизации
function updateSyncStatus(message, status = 'info') {
    const statusEl = document.getElementById('lastSyncTime');
    if (statusEl) {
        statusEl.innerHTML = `<span style="color: ${
            status === 'success' ? '#2ecc71' : 
            status === 'error' ? '#e74c3c' : 
            status === 'warning' ? '#f39c12' : 
            status === 'loading' ? '#3498db' : '#7f8c8d'
        }">${message}</span>`;
    }
}

// Обновление счетчика зрителей
function updateViewerCount() {
    const countEl = document.getElementById('onlineCount');
    if (countEl) {
        // Простая эмуляция - всегда показываем хотя бы 1
        const baseCount = 1;
        const randomAddition = Math.floor(Math.random() * 3); // 0-2 случайных зрителя
        countEl.textContent = baseCount + randomAddition;
    }
}

// Проверка на несохраненные изменения
function hasUnsavedChanges() {
    // Простая реализация - всегда возвращаем true для автосохранения
    return currentMode === 'edit';
}

// Получение текущей версии данных
function getCurrentVersion() {
    const cached = localStorage.getItem('server_data_cache');
    if (cached) {
        try {
            const data = JSON.parse(cached);
            return data.version || 0;
        } catch (e) {
            return 0;
        }
    }
    return 0;
}

// Инструкции по получению GitHub токена
function showTokenInstructions() {
    const instructions = `
        <div style="background: white; padding: 20px; border-radius: 10px; max-width: 500px; margin: 20px auto; box-shadow: 0 0 20px rgba(0,0,0,0.2);">
            <h3 style="color: #2c3e50; margin-top: 0;">🔑 Настройка GitHub API токена</h3>
            <ol style="text-align: left;">
                <li>Зайдите на <a href="https://github.com/settings/tokens" target="_blank">GitHub → Settings → Developer settings → Tokens</a></li>
                <li>Нажмите "Generate new token"</li>
                <li>Назовите токен (например, "Турнир Вихрь")</li>
                <li>Выберите срок действия (рекомендуется "No expiration")</li>
                <li>В разделе "Select scopes" отметьте <strong>"repo"</strong> (полный контроль репозиториев)</li>
                <li>Нажмите "Generate token"</li>
                <li>Скопируйте токен и вставьте в файл online.js:<br>
                    <code>API_TOKEN: 'ваш_токен_здесь'</code></li>
            </ol>
            <p style="color: #e74c3c; font-size: 12px;">
                ⚠️ Никому не передавайте токен! Он дает доступ к вашему репозиторию.
            </p>
            <button onclick="this.parentNode.style.display='none'" style="background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                Понятно
            </button>
        </div>
    `;
    
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10001;
    `;
    
    overlay.innerHTML = instructions;
    document.body.appendChild(overlay);
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========

// Добавляем CSS анимации
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .online-controls {
        transition: all 0.3s;
    }
`;
document.head.appendChild(style);

// Ждем загрузки страницы и инициализируем
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (typeof currentMode !== 'undefined') {
            initOnlineMode();
        } else {
            console.log('Ожидание инициализации основной таблицы...');
            // Повторная попытка через 2 секунды
            setTimeout(initOnlineMode, 2000);
        }
    }, 500);
});

// Экспортируем функции для использования в основном скрипте
window.onlineModule = {
    loadFromServer,
    saveToServer,
    toggleAutoSync,
    initOnlineMode
};
