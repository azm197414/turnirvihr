// ========== ОНЛАЙН-СИНХРОНИЗАЦИЯ ДЛЯ ТУРНИРА "ВИХРЬ" ==========

// КОНФИГУРАЦИЯ
const GITHUB_TOKEN = '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'; // ЗАМЕНИТЕ НА СВОЙ!
const REPO = 'azm197414/turnirvihr';
const DATA_FILE = 'turnir_data.json';
const DATA_URL = `https://raw.githubusercontent.com/${REPO}/main/${DATA_FILE}`;
const SAVE_URL = `https://api.github.com/repos/${REPO}/contents/${DATA_FILE}`;

// СИСТЕМНЫЕ ПЕРЕМЕННЫЕ
let dataSHA = null;
let isOnlineMode = false;
let autoSaveInterval = null;
let syncStatus = {
    online: false,
    lastSync: null,
    error: null
};

// ========== ИНИЦИАЛИЗАЦИЯ ==========

function initOnlineMode() {
    console.log('🔄 Инициализация онлайн-режима...');
    
    // Проверяем токен
    if (!GITHUB_TOKEN || GITHUB_TOKEN === 'ghp_ваш_действительный_токен') {
        console.warn('⚠️ Токен не настроен. Онлайн-режим отключен.');
        showStatus('offline', 'Токен не настроен');
        return;
    }
    
    isOnlineMode = true;
    showStatus('loading', 'Проверка соединения...');
    
    // Пытаемся загрузить данные с сервера
    setTimeout(async () => {
        try {
            const data = await loadFromServer();
            if (data) {
                showStatus('online', 'Данные загружены');
                console.log('✅ Онлайн-режим активирован');
            } else {
                showStatus('offline', 'Нет данных на сервере');
                console.log('ℹ️ Данных на сервере нет, будет создан новый файл');
            }
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
            showStatus('offline', 'Ошибка соединения');
        }
    }, 1000);
}

// ========== СТАТУС СИНХРОНИЗАЦИИ ==========

function showStatus(status, message = '') {
    const statusElement = document.getElementById('syncStatus');
    if (!statusElement) return;
    
    // Создаем элемент если нет
    if (!document.getElementById('onlineStatus')) {
        const statusBar = document.createElement('div');
        statusBar.id = 'onlineStatus';
        statusBar.style.cssText = `
            margin: 10px 0;
            padding: 10px;
            border-radius: 5px;
            font-weight: bold;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        `;
        document.querySelector('.controls').before(statusBar);
    }
    
    const statusBar = document.getElementById('onlineStatus');
    
    switch(status) {
        case 'loading':
            statusBar.innerHTML = `
                <div style="width: 16px; height: 16px; border: 2px solid #3498db; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <span>${message || 'Загрузка...'}</span>
            `;
            statusBar.style.background = '#e3f2fd';
            statusBar.style.color = '#1565c0';
            break;
            
        case 'online':
            statusBar.innerHTML = `
                <div style="width: 16px; height: 16px; background: #4caf50; border-radius: 50%;"></div>
                <span>✅ ${message || 'Онлайн'}</span>
                <small style="font-weight: normal; opacity: 0.8; margin-left: 10px;">
                    (${new Date().toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'})})
                </small>
            `;
            statusBar.style.background = '#e8f5e9';
            statusBar.style.color = '#2e7d32';
            break;
            
        case 'offline':
            statusBar.innerHTML = `
                <div style="width: 16px; height: 16px; background: #f44336; border-radius: 50%;"></div>
                <span>⚠️ ${message || 'Оффлайн'}</span>
            `;
            statusBar.style.background = '#ffebee';
            statusBar.style.color = '#c62828';
            break;
            
        case 'syncing':
            statusBar.innerHTML = `
                <div style="width: 16px; height: 16px; border: 2px solid #ff9800; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <span>${message || 'Синхронизация...'}</span>
            `;
            statusBar.style.background = '#fff3e0';
            statusBar.style.color = '#ef6c00';
            break;
    }
    
    // Анимация вращения
    if (!document.querySelector('#spinStyle')) {
        const style = document.createElement('style');
        style.id = 'spinStyle';
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
}

// ========== ЗАГРУЗКА С СЕРВЕРА ==========

async function loadFromServer() {
    if (!isOnlineMode) return null;
    
    showStatus('loading', 'Загрузка данных...');
    
    try {
        // Загружаем данные
        const response = await fetch(DATA_URL + '?t=' + Date.now(), {
            cache: 'no-cache'
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                console.log('📭 Файл данных не найден на сервере');
                syncStatus.error = 'Файл не найден';
                return null;
            }
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Получаем информацию о файле (SHA)
        await getFileSHA();
        
        // Применяем данные к таблице
        if (data && typeof data === 'object') {
            applyServerData(data);
            syncStatus.online = true;
            syncStatus.lastSync = new Date();
            syncStatus.error = null;
            
            console.log(`✅ Загружено ${Object.keys(data).length} записей`);
            return data;
        } else {
            console.warn('⚠️ Получены некорректные данные с сервера');
            return null;
        }
        
    } catch (error) {
        console.error('❌ Ошибка загрузки:', error);
        syncStatus.online = false;
        syncStatus.error = error.message;
        showStatus('offline', `Ошибка: ${error.message.substring(0, 30)}`);
        return null;
    }
}

function applyServerData(data) {
    if (!data || typeof data !== 'object') {
        console.error('❌ Неверный формат данных:', data);
        return;
    }
    
    console.log('📊 Применение данных с сервера...');
    
    // Ищем участников в таблице
    const participants = window.participants || [];
    
    // Если participants не определен, пробуем найти элементы таблицы
    if (!participants || participants.length === 0) {
        console.warn('⚠️ Участники не найдены, ищем элементы вручную...');
        applyDataToInputs(data);
        return;
    }
    
    // Применяем данные для каждого участника
    participants.forEach((participant, index) => {
        const key = `participant_${index}`;
        if (data[key]) {
            const p = data[key];
            
            // Находим элементы ввода
            const angleInput = document.getElementById(`angle_${index}`);
            const timeLzInput = document.getElementById(`time_lz_${index}`);
            const timeKzInput = document.getElementById(`time_kz_${index}`);
            const lapsInput = document.getElementById(`laps_${index}`);
            const gatesInput = document.getElementById(`penalty_gates_${index}`);
            const fallInput = document.getElementById(`penalty_fall_${index}`);
            const flipInput = document.getElementById(`penalty_flip_${index}`);
            
            // Устанавливаем значения
            if (angleInput) angleInput.value = p.angle || 0;
            if (timeLzInput) timeLzInput.value = p.timeLz || '00:00:00';
            if (timeKzInput) timeKzInput.value = p.timeKz || '00:00:00';
            if (lapsInput) lapsInput.value = p.laps || 0;
            if (gatesInput) gatesInput.value = p.penalty_gates || 0;
            if (fallInput) fallInput.value = p.penalty_fall || 0;
            if (flipInput) flipInput.value = p.penalty_flip || 0;
        }
    });
    
    // Пересчитываем таблицу
    if (typeof window.calculateAll === 'function') {
        window.calculateAll();
    }
    
    console.log('✅ Данные с сервера применены');
}

function applyDataToInputs(data) {
    // Альтернативный метод: ищем все input элементы
    for (let i = 0; i < 20; i++) { // Проверяем до 20 участников
        const key = `participant_${i}`;
        if (data[key]) {
            const p = data[key];
            
            // Устанавливаем значения по ID
            setInputValue(`angle_${i}`, p.angle);
            setInputValue(`time_lz_${i}`, p.timeLz);
            setInputValue(`time_kz_${i}`, p.timeKz);
            setInputValue(`laps_${i}`, p.laps);
            setInputValue(`penalty_gates_${i}`, p.penalty_gates);
            setInputValue(`penalty_fall_${i}`, p.penalty_fall);
            setInputValue(`penalty_flip_${i}`, p.penalty_flip);
        } else {
            break;
        }
    }
    
    // Пересчитываем если есть функция
    if (typeof window.calculateAll === 'function') {
        setTimeout(() => window.calculateAll(), 100);
    }
}

function setInputValue(id, value) {
    const element = document.getElementById(id);
    if (element && element.tagName === 'INPUT') {
        element.value = value || (element.type === 'number' ? 0 : '');
    }
}

// ========== СОХРАНЕНИЕ НА СЕРВЕР ==========

async function saveToServer() {
    if (!isOnlineMode) {
        console.warn('⚠️ Онлайн-режим отключен');
        return false;
    }
    
    showStatus('syncing', 'Сохранение в облако...');
    
    try {
        // Собираем данные из таблицы
        const data = collectTableData();
        
        if (!data || Object.keys(data).length === 0) {
            console.warn('⚠️ Нет данных для сохранения');
            showStatus('offline', 'Нет данных');
            return false;
        }
        
        // Получаем SHA текущего файла
        await getFileSHA();
        
        // Подготавливаем контент (base64)
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
        
        // Формируем запрос
        const body = {
            message: `Обновление турнирных данных от ${new Date().toLocaleString('ru-RU')}`,
            content: content
        };
        
        // Добавляем SHA если есть
        if (dataSHA) {
            body.sha = dataSHA;
        }
        
        // Отправляем на GitHub
        const response = await fetch(SAVE_URL, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP ${response.status}`);
        }
        
        const result = await response.json();
        dataSHA = result.content.sha;
        
        // Обновляем статус
        syncStatus.online = true;
        syncStatus.lastSync = new Date();
        syncStatus.error = null;
        
        showStatus('online', `Сохранено: ${new Date().toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'})}`);
        console.log('✅ Данные успешно сохранены в облако!');
        
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка сохранения:', error);
        
        // Проверяем, если ошибка авторизации
        if (error.message.includes('Bad credentials') || error.message.includes('401')) {
            showStatus('offline', 'Неверный токен доступа');
            console.error('🔐 ОШИБКА: Неверный GitHub токен. Проверьте GITHUB_TOKEN в online.js');
        } else {
            showStatus('offline', `Ошибка: ${error.message.substring(0, 30)}`);
        }
        
        syncStatus.online = false;
        syncStatus.error = error.message;
        
        return false;
    }
}

function collectTableData() {
    const data = {};
    const participants = window.participants || [];
    
    if (participants && participants.length > 0) {
        // Используем глобальный массив participants
        participants.forEach((participant, index) => {
            data[`participant_${index}`] = {
                angle: getInputValue(`angle_${index}`),
                timeLz: getInputValue(`time_lz_${index}`),
                timeKz: getInputValue(`time_kz_${index}`),
                laps: getInputValue(`laps_${index}`),
                penalty_gates: getInputValue(`penalty_gates_${index}`),
                penalty_fall: getInputValue(`penalty_fall_${index}`),
                penalty_flip: getInputValue(`penalty_flip_${index}`)
            };
        });
    } else {
        // Альтернативный сбор данных
        for (let i = 0; i < 20; i++) {
            const angle = getInputValue(`angle_${i}`);
            if (angle !== null || i === 0) { // Проверяем есть ли данные
                data[`participant_${i}`] = {
                    angle: angle || 0,
                    timeLz: getInputValue(`time_lz_${i}`) || '00:00:00',
                    timeKz: getInputValue(`time_kz_${i}`) || '00:00:00',
                    laps: getInputValue(`laps_${i}`) || 0,
                    penalty_gates: getInputValue(`penalty_gates_${i}`) || 0,
                    penalty_fall: getInputValue(`penalty_fall_${i}`) || 0,
                    penalty_flip: getInputValue(`penalty_flip_${i}`) || 0
                };
            }
        }
    }
    
    return data;
}

function getInputValue(id) {
    const element = document.getElementById(id);
    return element ? element.value : null;
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

async function getFileSHA() {
    if (!isOnlineMode) return null;
    
    try {
        const response = await fetch(SAVE_URL, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (response.ok) {
            const fileInfo = await response.json();
            dataSHA = fileInfo.sha;
            return dataSHA;
        }
        return null;
    } catch (error) {
        console.warn('⚠️ Не удалось получить SHA файла:', error.message);
        return null;
    }
}

function startAutoSync(interval = 60000) {
    if (!isOnlineMode) return;
    
    // Останавливаем предыдущий интервал
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
    }
    
    // Запускаем автосинхронизацию
    autoSaveInterval = setInterval(async () => {
        if (window.currentMode === 'edit') {
            await saveToServer();
        } else {
            await loadFromServer();
        }
    }, interval);
    
    console.log(`🔄 Автосинхронизация запущена (каждые ${interval/1000} сек)`);
}

function stopAutoSync() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
        console.log('⏹️ Автосинхронизация остановлена');
    }
}

function forceSync() {
    if (window.currentMode === 'edit') {
        return saveToServer();
    } else {
        return loadFromServer();
    }
}

function getSyncStatus() {
    return {
        ...syncStatus,
        tokenConfigured: GITHUB_TOKEN && GITHUB_TOKEN !== 'ghp_ваш_действительный_токен',
        isOnlineMode: isOnlineMode
    };
}

// ========== ЭКСПОРТ ФУНКЦИЙ ==========

// Делаем функции доступными глобально
window.OnlineSync = {
    init: initOnlineMode,
    load: loadFromServer,
    save: saveToServer,
    forceSync: forceSync,
    startAutoSync: startAutoSync,
    stopAutoSync: stopAutoSync,
    getStatus: getSyncStatus,
    showStatus: showStatus
};

// Автоматическая инициализация при загрузке
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOnlineMode);
} else {
    setTimeout(initOnlineMode, 1000);
}

console.log('✅ Модуль онлайн-синхронизации загружен');
console.log('📌 Использование:');
console.log('   - OnlineSync.init() - инициализация');
console.log('   - OnlineSync.save() - сохранить данные');
console.log('   - OnlineSync.load() - загрузить данные');
