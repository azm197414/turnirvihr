// config.js - публичные настройки
const CONFIG = {
    // Твой репозиторий
    REPO: 'azm197414/turnirvihr',
    
    // Файл с данными турнира
    DATA_FILE: 'turnir_data.json',
    
    // Пароль для редактирования
    EDIT_PASSWORD: 'Вихрь2024',
    
    // Интервал автосинхронизации (секунды)
    AUTO_SYNC_INTERVAL: 60,
    
    // Режим по умолчанию
    DEFAULT_MODE: 'view'
};

// Для совместимости
if (typeof window !== 'undefined') {
    window.PUBLIC_CONFIG = CONFIG;
}
