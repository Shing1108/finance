// utils.js - 通用工具函數

/**
 * 生成唯一ID
 * @returns {string} 唯一ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

/**
 * 格式化貨幣
 * @param {number} amount 金額
 * @param {string} currency 貨幣代碼
 * @returns {string} 格式化後的貨幣字符串
 */
function formatCurrency(amount, currency) {
    if (typeof amount !== 'number') {
        amount = parseFloat(amount) || 0;
    }
    
    try {
        currency = currency || defaultCurrency || 'HKD';
        const places = typeof decimalPlaces !== 'undefined' ? decimalPlaces : 2;
        
        // 獲取貨幣符號
        let symbol = getCurrencySymbol(currency);
        
        // 格式化數字
        const formattedNumber = amount.toFixed(places).replace(/\d(?=(\d{3})+\.)/g, '$&,');
        
        // 返回格式化後的貨幣字符串
        return symbol + formattedNumber;
    } catch (error) {
        console.error("格式化貨幣時發生錯誤:", error);
        return amount.toFixed(2);
    }
}

/**
 * 獲取貨幣符號
 * @param {string} currency 貨幣代碼
 * @returns {string} 貨幣符號
 */
function getCurrencySymbol(currency) {
    const currencySymbols = {
        'USD': '$',
        'HKD': 'HK$',
        'CNY': '¥',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥'
    };
    
    return currencySymbols[currency] || (currency + ' ');
}

/**
 * 以數字格式顯示金額
 * @param {number} amount 金額
 * @returns {string} 格式化後的數字字符串
 */
function formatNumber(amount) {
    if (typeof amount !== 'number') {
        amount = parseFloat(amount) || 0;
    }
    
    try {
        const places = typeof decimalPlaces !== 'undefined' ? decimalPlaces : 2;
        return amount.toFixed(places).replace(/\d(?=(\d{3})+\.)/g, '$&,');
    } catch (error) {
        console.error("格式化數字時發生錯誤:", error);
        return amount.toFixed(2);
    }
}

/**
 * 格式化日期
 * @param {string} dateString YYYY-MM-DD格式日期
 * @returns {string} 格式化後的日期字符串
 */
function formatDate(dateString) {
    try {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    } catch {
        return dateString;
    }
}

/**
 * 取得賬戶類型名稱
 * @param {string} type 賬戶類型
 * @returns {string} 賬戶類型中文名稱
 */
function getAccountTypeName(type) {
    const types = {
        'cash': '現金',
        'bank': '銀行戶口',
        'credit': '信用卡',
        'investment': '投資',
        'other': '其他'
    };
    
    return types[type] || '其他';
}

/**
 * 取得貨幣名稱
 * @param {string} code 貨幣代碼
 * @returns {string} 貨幣中文名稱
 */
function getCurrencyName(code) {
    const currencies = {
        'USD': '美元',
        'HKD': '港幣',
        'CNY': '人民幣',
        'EUR': '歐元',
        'GBP': '英鎊',
        'JPY': '日圓'
    };
    
    return currencies[code] || code;
}

/**
 * 深度複製對象
 * @param {Object} obj 要複製的對象
 * @returns {Object} 複製後的對象
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => deepClone(item));
    }
    
    const cloned = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            cloned[key] = deepClone(obj[key]);
        }
    }
    
    return cloned;
}

/**
 * 檢查網絡連接狀態
 * @returns {boolean} 是否有網絡連接
 */
function isOnline() {
    return navigator.onLine;
}

/**
 * 防抖函數
 * @param {Function} func 要防抖的函數
 * @param {number} wait 等待時間(毫秒)
 * @returns {Function} 防抖後的函數
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

/**
 * 節流函數
 * @param {Function} func 要節流的函數
 * @param {number} limit 時間限制(毫秒)
 * @returns {Function} 節流後的函數
 */
function throttle(func, limit) {
    let lastCall = 0;
    return function(...args) {
        const now = Date.now();
        if (now - lastCall < limit) return;
        lastCall = now;
        return func.apply(this, args);
    };
}

/**
 * 判斷設備是否為移動設備
 * @returns {boolean} 是否為移動設備
 */
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * 獲取URL參數
 * @param {string} name 參數名
 * @returns {string|null} 參數值
 */
function getUrlParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

/**
 * 計算兩個日期之間的天數
 * @param {string|Date} startDate 開始日期
 * @param {string|Date} endDate 結束日期
 * @returns {number} 天數
 */
function getDaysBetween(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = Math.abs(end - start);
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
}

// 導出工具函數
window.generateId = generateId;
window.formatCurrency = formatCurrency;
window.formatNumber = formatNumber;
window.formatDate = formatDate;
window.getAccountTypeName = getAccountTypeName;
window.getCurrencyName = getCurrencyName;
window.deepClone = deepClone;
window.isOnline = isOnline;
window.debounce = debounce;
window.throttle = throttle;
window.isMobileDevice = isMobileDevice;
window.getUrlParam = getUrlParam;
window.getDaysBetween = getDaysBetween;
window.getCurrencySymbol = getCurrencySymbol;