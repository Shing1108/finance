// date-utils.js - 日期處理工具

/**
 * 取得今天日期
 * @returns {string} YYYY-MM-DD格式日期
 */
function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

/**
 * 取得本月第一天
 * @returns {string} YYYY-MM-DD格式日期
 */
function getFirstDayOfMonth() {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
}

/**
 * 取得本月最後一天
 * @returns {string} YYYY-MM-DD格式日期
 */
function getLastDayOfMonth() {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
}

/**
 * 取得N天前的日期
 * @param {number} days 天數
 * @returns {string} YYYY-MM-DD格式日期
 */
function getDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
}

/**
 * 取得N天後的日期
 * @param {number} days 天數
 * @returns {string} YYYY-MM-DD格式日期
 */
function getDaysLater(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
}

/**
 * 格式化日期
 * @param {string|Date} date 日期字符串或Date對象
 * @param {string} format 格式字符串('short', 'medium', 'long', 'full')
 * @returns {string} 格式化後的日期
 */
function formatDateString(date, format = 'medium') {
    try {
        // 轉換為Date對象
        const dateObj = date instanceof Date ? date : new Date(date);
        
        // 根據格式返回不同的日期格式
        switch (format) {
            case 'short':
                return dateObj.toLocaleDateString('zh-TW', { 
                    year: 'numeric', 
                    month: 'numeric', 
                    day: 'numeric' 
                });
            case 'medium':
                return dateObj.toLocaleDateString('zh-TW', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
            case 'long':
                return dateObj.toLocaleDateString('zh-TW', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric', 
                    weekday: 'long' 
                });
            case 'full':
                return dateObj.toLocaleDateString('zh-TW', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric', 
                    weekday: 'long',
                    hour: 'numeric',
                    minute: 'numeric'
                });
            default:
                return dateObj.toLocaleDateString('zh-TW');
        }
    } catch (error) {
        console.error("格式化日期時發生錯誤:", error);
        return date.toString();
    }
}

/**
 * 獲取兩個日期之間的差距(天數)
 * @param {string|Date} date1 第一個日期
 * @param {string|Date} date2 第二個日期
 * @returns {number} 天數差距
 */
function getDaysDifference(date1, date2) {
    // 轉換為Date對象
    const d1 = date1 instanceof Date ? date1 : new Date(date1);
    const d2 = date2 instanceof Date ? date2 : new Date(date2);
    
    // 計算差距(毫秒)
    const diffTime = Math.abs(d2 - d1);
    // 轉換為天數
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
}

/**
 * 檢查日期是否在指定範圍內
 * @param {string|Date} date 要檢查的日期
 * @param {string|Date} startDate 範圍開始日期
 * @param {string|Date} endDate 範圍結束日期
 * @returns {boolean} 是否在範圍內
 */
function isDateInRange(date, startDate, endDate) {
    // 轉換為Date對象
    const d = date instanceof Date ? date : new Date(date);
    const start = startDate instanceof Date ? startDate : new Date(startDate);
    const end = endDate instanceof Date ? endDate : new Date(endDate);
    
    // 重置時間部分為00:00:00
    d.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    // 檢查是否在範圍內
    return d >= start && d <= end;
}

/**
 * 獲取日期對應的星期幾
 * @param {string|Date} date 日期
 * @returns {number} 星期幾(0-6, 0代表週日)
 */
function getDayOfWeek(date) {
    const d = date instanceof Date ? date : new Date(date);
    return d.getDay();
}

/**
 * 獲取日期對應的月份
 * @param {string|Date} date 日期
 * @returns {number} 月份(0-11, 0代表1月)
 */
function getMonth(date) {
    const d = date instanceof Date ? date : new Date(date);
    return d.getMonth();
}

/**
 * 獲取日期對應的年份
 * @param {string|Date} date 日期
 * @returns {number} 年份
 */
function getYear(date) {
    const d = date instanceof Date ? date : new Date(date);
    return d.getFullYear();
}

/**
 * 檢查是否為閏年
 * @param {number} year 年份
 * @returns {boolean} 是否為閏年
 */
function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * 獲取指定月份的天數
 * @param {number} year 年份
 * @param {number} month 月份(0-11, 0代表1月)
 * @returns {number} 天數
 */
function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

// 導出函數
window.dateUtils = {
    getTodayDate,
    getFirstDayOfMonth,
    getLastDayOfMonth,
    getDaysAgo,
    getDaysLater,
    formatDateString,
    getDaysDifference,
    isDateInRange,
    getDayOfWeek,
    getMonth,
    getYear,
    isLeapYear,
    getDaysInMonth
};