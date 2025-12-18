// ========== НАСТРОЙКИ GITHUB ==========
const GITHUB_CONFIG = {
    DATA_URL: 'https://raw.githubusercontent.com/azm197414/turnirvihr/main/data.json',
    API_TOKEN: '',
    REPO: 'azm197414/turnirvihr',
    BRANCH: 'main',
    FILE_PATH: 'data.json'
};

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let autoSyncInterval = null;
let isOnlineModeInitialized = false;

// ========== ОСНОВНЫЕ ФУНКЦИИ ==========

// Инициализация онлайн-режима
function initOnlineMode() {
    if (isOnlineModeInitialized) return;
    
    console.log('🚀 Инициализация онлайн-режима...');
    isOnlineModeInitialized = true;
    
    // Ждем немного, чтобы основная таблица создалась
    setTimeout(() => {
        createOnlineUI();
        // Автозагрузка через 2 секунды
        setTimeout(() => {
            loadFromServer();
        }, 2000);
    }, 500);
}

// Создание интерфейса онлайн-режима
function createOnlineUI() {
    const controls = document.querySelector('.controls');
    if (!controls) {
        console.warn('Не найден блок controls');
        return;
    }
    
    // Проверяем, не добавлен ли уже блок
    if (document.querySelector('.online-controls')) {
        console.log('Блок онлайн-режима уже существует');
        return;
    }
    
    const onlineControlsHTML = `
        <div class="online-controls">
            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
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
                    <span id="lastSyncTime">Загрузка при старте...</span>
                    <div style="font-size: 10px;">👁️ <span id="onlineCount">1</span> зрителей</div>
                </div>
            </div>
        </div>
    `;
    
    controls.insertAdjacentHTML('afterend', onlineControlsHTML);
    console.log('✅ Интерфейс онлайн-режима создан');
}

// ========== ЗАГРУЗКА ДАННЫХ (ИСПРАВЛЕННАЯ) ==========

// Загрузка данных с сервера
async function loadFromServer() {
    try {
        showNotification('🔄 Загрузка данных с сервера...', 'info');
        updateSyncStatus('Загрузка...', 'loading');
        
        const url = GITHUB_CONFIG.DATA_URL + '?t=' + Date.now();
        console.log('📥 Запрос к:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Данные получены:', data);
        
        if (!data || !data.participants || !Array.isArray(data.participants)) {
            throw new Error('Некорректный формат данных');
        }
        
        // ПРИМЕНЯЕМ ДАННЫЕ К ТАБЛИЦЕ
        const success = applyDataToTable(data.participants);
        
        if (success) {
            // Сохраняем в localStorage как кэш
            localStorage.setItem('server_data_cache', JSON.stringify(data));
            localStorage.setItem('last_server_sync', Date.now());
            
            updateSyncStatus(`✅ Загружено: ${new Date().toLocaleTimeString()}`, 'success');
            showNotification(`✅ Данные загружены! ${data.participants.length} участников`, 'success');
            
            updateViewerCount();
            return true;
        } else {
            throw new Error('Не удалось применить данные к таблице');
        }
        
    } catch (error) {
        console.error('❌ Ошибка загрузки:', error);
        
        // Пробуем загрузить из кэша
        const cachedData = localStorage.getItem('server_data_cache');
        if (cachedData) {
            try {
                const data = JSON.parse(cachedData);
                applyDataToTable(data.participants);
                showNotification('⚠️ Используются кэшированные данные', 'warning');
                updateSyncStatus('Оффлайн-режим', 'warning');
            } catch (e) {
                showNotification('❌ Не удалось загрузить данные', 'error');
                updateSyncStatus('Ошибка загрузки', 'error');
            }
        } else {
            showNotification('❌ Не удалось загрузить данные: ' + error.message, 'error');
            updateSyncStatus('Ошибка загрузки', 'error');
        }
        
        return false;
    }
}

// ГЛАВНАЯ ИСПРАВЛЕННАЯ ФУНКЦИЯ - применение данных к таблице
function applyDataToTable(participantsData) {
    console.log('🔄 Применение данных к таблице...', participantsData);
    
    if (!participantsData || !Array.isArray(participantsData)) {
        console.error('Некорректные данные участников');
        return false;
    }
    
    let appliedCount = 0;
    const totalParticipants = participantsData.length;
    
    // Ищем элементы таблицы
    for (let i = 0; i < totalParticipants; i++) {
        const participant = participantsData[i];
        
        // Ищем все поля для этого участника
        const angleInput = document.getElementById(`angle_${i}`);
        const timeLzInput = document.getElementById(`time_lz_${i}`);
        const timeKzInput = document.getElementById(`time_kz_${i}`);
        const lapsInput = document.getElementById(`laps_${i}`);
        const gatesInput = document.getElementById(`penalty_gates_${i}`);
        const fallInput = document.getElementById(`penalty_fall_${i}`);
        const flipInput = document.getElementById(`penalty_flip_${i}`);
        
        // Проверяем, найдены ли элементы
        const elementsFound = angleInput && timeLzInput && timeKzInput && lapsInput && gatesInput && fallInput && flipInput;
        
        if (elementsFound) {
            // Заполняем поля
            angleInput.value = participant.angle || 0;
            timeLzInput.value = participant.timeLz || '00:00:00';
            timeKzInput.value = participant.timeKz || '00:00:00';
            lapsInput.value = participant.laps || 0;
            gatesInput.value = participant.penalty_gates || 0;
            fallInput.value = participant.penalty_fall || 0;
            flipInput.value = participant.penalty_flip || 0;
            appliedCount++;
            
            console.log(`   ✅ Участник ${i} (${participant.name}): данные применены`);
        } else {
            console.warn(`   ⚠️ Участник ${i}: не все элементы найдены`);
        }
    }
    
    console.log(`📊 Применено ${appliedCount} из ${totalParticipants} участников`);
    
    // ПЕРЕСЧИТЫВАЕМ РЕЗУЛЬТАТЫ
    if (appliedCount > 0) {
        // Ждем немного, чтобы данные успели обновиться
        setTimeout(() => {
            // Вызываем функцию пересчета из основного скрипта
            if (typeof window.calculateAll === 'function') {
                console.log('🧮 Вызываем calculateAll()');
                window.calculateAll();
            } else {
                console.warn('Функция calculateAll не найдена');
                // Пробуем найти и вызвать вручную
                const calculateBtn = document.querySelector('button[onclick="calculateAll()"]');
                if (calculateBtn) {
                    calculateBtn.click();
                }
            }
        }, 100);
        
        return true;
    } else {
        console.error('❌ Не удалось применить данные: элементы не найдены');
        return false;
    }
}

// ========== СОХРАНЕНИЕ ДАННЫХ ==========

// Сохранение данных на сервер
async function saveToServer() {
    if (window.currentMode !== 'edit') {
        showNotification('❌ Только редакторы могут сохранять', 'error');
        return false;
    }
    
    if (!GITHUB_CONFIG.API_TOKEN) {
        showNotification('❌ Не настроен GitHub API токен', 'error');
        return false;
    }
    
    if (!confirm('Сохранить данные на сервер?\nВсе увидят изменения.')) {
        return;
    }
    
    try {
        showNotification('💾 Сохранение на GitHub...', 'info');
        updateSyncStatus('Сохранение...', 'loading');
        
        const data = {
            lastUpdated: new Date().toISOString(),
            version: (getCurrentVersion() || 0) + 1,
            participants: []
        };
        
        // Собираем текущие данные
        for (let i = 0; i < 10; i++) {
            data.participants.push({
                team: ["Интенсив","Интенсив","Прорыв","Прорыв","Альфа","Альфа","Стабильность","Стабильность","Мотивация","Мотивация"][i],
                name: ["Ксения Л.","Святослав Е.","Никита У.","Варя А.","Дмитрий В.","Иван Ф.","Савелий С.","Богдан Е.","Артем П.","Данила Л."][i],
                angle: parseInt(document.getElementById(`angle_${i}`)?.value || 0),
                timeLz: document.getElementById(`time_lz_${i}`)?.value || '00:00:00',
                timeKz: document.getElementById(`time_kz_${i}`)?.value || '00:00:00',
                laps: parseInt(document.getElementById(`laps_${i}`)?.value || 0),
                penalty_gates: parseInt(document.getElementById(`penalty_gates_${i}`)?.value || 0),
                penalty_fall: parseInt(document.getElementById(`penalty_fall_${i}`)?.value || 0),
                penalty_flip: parseInt(document.getElementById(`penalty_flip_${i}`)?.value || 0)
            });
        }
        
        // Обновляем файл на GitHub
        const success = await updateGitHubFile(data);
        
        if (success) {
            showNotification('✅ Данные сохранены на GitHub!', 'success');
            updateSyncStatus(`💾 Сохранено: ${new Date().toLocaleTimeString()}`, 'success');
            return true;
        } else {
            throw new Error('Ошибка сохранения');
        }
        
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showNotification('❌ Ошибка сохранения: ' + error.message, 'error');
        updateSyncStatus('Ошибка сохранения', 'error');
        return false;
    }
}

// Обновление файла на GitHub
async function updateGitHubFile(data) {
    try {
        const content = JSON.stringify(data, null, 2);
        const contentEncoded = btoa(unescape(encodeURIComponent(content)));
        
        const url = `https://api.github.com/repos/${GITHUB_CONFIG.REPO}/contents/${GITHUB_CONFIG.FILE_PATH}`;
        
        // Получаем текущий SHA
        const getResponse = await fetch(url, {
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
        const updateResponse = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_CONFIG.API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Обновление турнира: ${new Date().toLocaleString('ru-RU')}`,
                content: contentEncoded,
                sha: sha,
                branch: GITHUB_CONFIG.BRANCH
            })
        });
        
        return updateResponse.ok;
        
    } catch (error) {
        console.error('Ошибка обновления файла:', error);
        return false;
    }
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

// Уведомления
function showNotification(message, type = 'info') {
    console.log(`📢 ${type}: ${message}`);
    
    // Простое уведомление через alert для тестирования
    if (type === 'error') {
        alert('❌ ' + message);
    } else if (type === 'success') {
        // Для успеха не показываем alert, чтобы не мешать
        console.log('✅ ' + message);
    }
}

// Обновление статуса
function updateSyncStatus(message, status = 'info') {
    const statusEl = document.getElementById('lastSyncTime');
    if (statusEl) {
        const color = status === 'success' ? '#2ecc71' : 
                     status === 'error' ? '#e74c3c' : 
                     status === 'warning' ? '#f39c12' : '#3498db';
        statusEl.innerHTML = `<span style="color: ${color}">${message}</span>`;
    }
}

// Счетчик зрителей
function updateViewerCount() {
    const countEl = document.getElementById('onlineCount');
    if (countEl) {
        countEl.textContent = Math.floor(Math.random() * 5) + 1;
    }
}

// Получение версии
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

// Автосинхронизация
function toggleAutoSync() {
    const btn = document.getElementById('autoSyncBtn');
    
    if (autoSyncInterval) {
        clearInterval(autoSyncInterval);
        autoSyncInterval = null;
        btn.innerHTML = '🔄 Автообновление (выкл)';
        btn.style.background = '#3498db';
        showNotification('⏸️ Автообновление выключено', 'info');
    } else {
        autoSyncInterval = setInterval(loadFromServer, 30000);
        btn.innerHTML = '🔁 Автообновление (вкл)';
        btn.style.background = '#2ecc71';
        showNotification('🔄 Автообновление включено (30 сек)', 'success');
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========

// Ждем полной загрузки страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM загружен, инициализируем онлайн-режим...');
    
    // Ждем еще немного, чтобы основная таблица создалась
    setTimeout(initOnlineMode, 1000);
});

// Экспортируем функции глобально
window.loadFromServer = loadFromServer;
window.saveToServer = saveToServer;
window.toggleAutoSync = toggleAutoSync;
// ОТЛАДОЧНАЯ ФУНКЦИЯ
function debugTable() {
    console.log('=== ОТЛАДКА ТАБЛИЦЫ ===');
    
    // Проверяем элементы
    for (let i = 0; i < 10; i++) {
        const angle = document.getElementById(`angle_${i}`);
        console.log(`Участник ${i}: angle элемент -`, angle ? 'НАЙДЕН' : 'НЕ НАЙДЕН');
    }
    
    // Проверяем данные в data.json
    fetch(GITHUB_CONFIG.DATA_URL)
        .then(r => r.json())
        .then(data => console.log('Данные в data.json:', data))
        .catch(e => console.error('Ошибка загрузки:', e));
}

// Запускаем отладку через 3 секунды
setTimeout(debugTable, 3000);
