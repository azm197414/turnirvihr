// ========== УПРОЩЕННАЯ ВЕРСИЯ online.js ==========
const GITHUB_CONFIG = {
    DATA_URL: 'https://raw.githubusercontent.com/azm197414/turnirvihr/main/data.json',
    API_TOKEN: ''
};

// Создаем интерфейс
function initOnlineMode() {
    const controls = document.querySelector('.controls');
    if (!controls) return;
    
    const onlineHTML = `
        <div class="online-controls">
            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                <strong style="color: #3498db;">🌐 Онлайн-режим:</strong>
                <button onclick="simpleLoad()" style="background: #2ecc71; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; font-size: 14px;">
                    🔄 Загрузить тестовые данные
                </button>
                <div id="syncStatus" style="margin-left: auto; font-size: 12px; color: #7f8c8d;">
                    <span id="lastSyncTime">Нажмите кнопку →</span>
                </div>
            </div>
        </div>
    `;
    
    controls.insertAdjacentHTML('afterend', onlineHTML);
}

// Простая загрузка
async function simpleLoad() {
    try {
        document.getElementById('lastSyncTime').innerHTML = '<span style="color: #3498db">Загрузка...</span>';
        
        // Пробуем загрузить с сервера
        const response = await fetch(GITHUB_CONFIG.DATA_URL);
        if (!response.ok) throw new Error('Файл не найден');
        
        const data = await response.json();
        
        // Заполняем таблицу
        data.participants.forEach((p, i) => {
            document.getElementById(`angle_${i}`).value = p.angle || 0;
            document.getElementById(`time_lz_${i}`).value = p.timeLz || '00:00:00';
            document.getElementById(`time_kz_${i}`).value = p.timeKz || '00:00:00';
            document.getElementById(`laps_${i}`).value = p.laps || 0;
            document.getElementById(`penalty_gates_${i}`).value = p.penalty_gates || 0;
            document.getElementById(`penalty_fall_${i}`).value = p.penalty_fall || 0;
            document.getElementById(`penalty_flip_${i}`).value = p.penalty_flip || 0;
        });
        
        // Пересчитываем
        if (window.calculateAll) window.calculateAll();
        
        document.getElementById('lastSyncTime').innerHTML = `<span style="color: #2ecc71">Загружено: ${new Date().toLocaleTimeString()}</span>`;
        
        // Показываем уведомление
        alert('✅ Данные успешно загружены!');
        
    } catch (error) {
        // Если ошибка - используем тестовые данные
        loadTestData();
    }
}

// Тестовые данные (на случай если сервер не доступен)
function loadTestData() {
    const testData = [
        {angle: 51, timeLz: '00:45:00', timeKz: '01:15:30', laps: 8, gates: 1, falls: 0, flips: 0},
        {angle: 63, timeLz: '00:53:00', timeKz: '01:20:45', laps: 10, gates: 2, falls: 1, flips: 0},
        {angle: 45, timeLz: '00:48:30', timeKz: '01:30:45', laps: 12, gates: 0, falls: 1, flips: 0},
        {angle: 38, timeLz: '00:52:15', timeKz: '01:35:20', laps: 9, gates: 1, falls: 0, flips: 1},
        {angle: 55, timeLz: '00:42:10', timeKz: '01:25:30', laps: 11, gates: 3, falls: 0, flips: 0},
        {angle: 42, timeLz: '00:55:40', timeKz: '01:40:15', laps: 7, gates: 0, falls: 2, flips: 0},
        {angle: 60, timeLz: '00:46:20', timeKz: '01:18:50', laps: 13, gates: 1, falls: 1, flips: 0},
        {angle: 35, timeLz: '00:57:10', timeKz: '01:45:30', laps: 6, gates: 2, falls: 0, flips: 1},
        {angle: 48, timeLz: '00:49:45', timeKz: '01:28:15', laps: 10, gates: 0, falls: 0, flips: 0},
        {angle: 40, timeLz: '00:54:20', timeKz: '01:38:40', laps: 8, gates: 1, falls: 1, flips: 0}
    ];
    
    testData.forEach((data, i) => {
        document.getElementById(`angle_${i}`).value = data.angle;
        document.getElementById(`time_lz_${i}`).value = data.timeLz;
        document.getElementById(`time_kz_${i}`).value = data.timeKz;
        document.getElementById(`laps_${i}`).value = data.laps;
        document.getElementById(`penalty_gates_${i}`).value = data.gates;
        document.getElementById(`penalty_fall_${i}`).value = data.falls;
        document.getElementById(`penalty_flip_${i}`).value = data.flips;
    });
    
    if (window.calculateAll) window.calculateAll();
    
    document.getElementById('lastSyncTime').innerHTML = `<span style="color: #f39c12">Тестовые данные (оффлайн)</span>`;
    alert('⚠️ Используются тестовые данные (сервер не доступен)');
}

// Запускаем при загрузке
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOnlineMode);
} else {
    initOnlineMode();
}

// Делаем функции глобальными
window.simpleLoad = simpleLoad;
window.loadTestData = loadTestData;
