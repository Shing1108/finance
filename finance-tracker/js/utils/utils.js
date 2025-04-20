/**
 * utils.js - 通用工具函數
 */

const Utils = {
    /**
     * 生成唯一 ID
     */
    generateId: function() {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    },

    /**
     * 格式化貨幣顯示
     */
    formatCurrency: function(amount, currency = 'HKD', decimals = 2) {
        if (isNaN(amount)) return '0.00';
        
        // 依貨幣決定格式
        const formatter = new Intl.NumberFormat('zh-HK', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
        
        return formatter.format(amount);
    },

    /**
     * 簡化貨幣顯示（不帶貨幣符號）
     */
    formatNumber: function(amount, decimals = 2) {
        if (isNaN(amount)) return '0.00';
        
        return parseFloat(amount).toFixed(decimals);
    },

    /**
     * 顯示提示訊息
     */
    showToast: function(message, type = 'info', duration = 3000) {
        const toastContainer = document.getElementById('toast-container');
        
        // 創建 toast 元素
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // 設定 icon
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'exclamation-circle';
        if (type === 'warning') icon = 'exclamation-triangle';
        
        toast.innerHTML = `
            <i class="fas fa-${icon} toast-icon"></i>
            <div class="toast-message">${message}</div>
            <button class="toast-close">&times;</button>
        `;
        
        // 添加到容器
        toastContainer.appendChild(toast);
        
        // 顯示動畫
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        }, 10);
        
        // 關閉按鈕事件
        toast.querySelector('.toast-close').addEventListener('click', () => {
            closeToast(toast);
        });
        
        // 自動關閉
        if (duration > 0) {
            setTimeout(() => {
                closeToast(toast);
            }, duration);
        }
        
        function closeToast(toastElement) {
            toastElement.style.opacity = '0';
            toastElement.style.transform = 'translateY(-10px)';
            
            setTimeout(() => {
                toastElement.remove();
            }, 300);
        }
    },

    /**
     * 顯示載入中覆蓋層
     */
    showLoading: function() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    },

    /**
     * 隱藏載入中覆蓋層
     */
    hideLoading: function() {
        document.getElementById('loadingOverlay').style.display = 'none';
    },

    /**
     * 深度克隆物件
     */
    deepClone: function(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * 防抖函數 - 避免頻繁調用
     */
    debounce: function(func, wait = 300) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    },

    /**
     * 儲存資料到 localStorage
     */
    saveToLocalStorage: function(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('儲存到 localStorage 失敗:', error);
            return false;
        }
    },

    /**
     * 從 localStorage 讀取資料
     */
    getFromLocalStorage: function(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('從 localStorage 讀取失敗:', error);
            return defaultValue;
        }
    },

    /**
     * 格式化日期
     */
    formatDate: function(date, format = 'YYYY-MM-DD') {
        if (!date) return '';
        
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        
        if (format === 'YYYY-MM-DD') {
            return `${year}-${month}-${day}`;
        } else if (format === 'DD/MM/YYYY') {
            return `${day}/${month}/${year}`;
        } else if (format === 'MM/DD/YYYY') {
            return `${month}/${day}/${year}`;
        }
        
        return `${year}-${month}-${day}`;
    }
};

// 全局事件總線
const EventBus = {
    events: {},
    
    // 訂閱事件
    subscribe: function(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
        
        // 返回取消訂閱函數
        return () => {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        };
    },
    
    // 發布事件
    publish: function(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach(callback => {
            callback(data);
        });
    }
};