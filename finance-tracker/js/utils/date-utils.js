/**
 * date-utils.js - 日期工具函數
 */

const DateUtils = {
    /**
     * 取得今天日期 (YYYY-MM-DD 格式)
     */
    today: function() {
        return Utils.formatDate(new Date(), 'YYYY-MM-DD');
    },
    
    /**
     * 取得昨天日期
     */
    yesterday: function() {
        const date = new Date();
        date.setDate(date.getDate() - 1);
        return Utils.formatDate(date, 'YYYY-MM-DD');
    },
    
    /**
     * 取得明天日期
     */
    tomorrow: function() {
        const date = new Date();
        date.setDate(date.getDate() + 1);
        return Utils.formatDate(date, 'YYYY-MM-DD');
    },
    
    /**
     * 取得當前月份第一天
     */
    firstDayOfMonth: function(date = new Date()) {
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        return Utils.formatDate(firstDay, 'YYYY-MM-DD');
    },
    
    /**
     * 取得當前月份最後一天
     */
    lastDayOfMonth: function(date = new Date()) {
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        return Utils.formatDate(lastDay, 'YYYY-MM-DD');
    },
    
    /**
     * 計算兩個日期之間的天數
     */
    daysBetween: function(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const timeDiff = Math.abs(end.getTime() - start.getTime());
        return Math.ceil(timeDiff / (1000 * 3600 * 24));
    },
    
    /**
     * 檢查日期是否在指定範圍內
     */
    isDateInRange: function(date, startDate, endDate) {
        const checkDate = new Date(date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        return checkDate >= start && checkDate <= end;
    },
    
    /**
     * 格式化日期為人性化顯示
     */
    formatHumanReadable: function(dateStr) {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (Utils.formatDate(date) === Utils.formatDate(today)) {
            return '今天';
        } else if (Utils.formatDate(date) === Utils.formatDate(yesterday)) {
            return '昨天';
        } else {
            // 取得當地日期表達
            return date.toLocaleDateString('zh-HK', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
    },
    
    /**
     * 取得當月日數
     */
    getDaysInMonth: function(year, month) {
        return new Date(year, month, 0).getDate();
    },
    
    /**
     * 取得當前年份
     */
    getCurrentYear: function() {
        return new Date().getFullYear();
    },
    
    /**
     * 取得當前月份 (1-12)
     */
    getCurrentMonth: function() {
        return new Date().getMonth() + 1;
    },
    
    /**
     * 取得當前季度 (1-4)
     */
    getCurrentQuarter: function() {
        const month = this.getCurrentMonth();
        return Math.ceil(month / 3);
    },
    
    /**
     * 取得季度日期範圍
     */
    getQuarterDateRange: function(year, quarter) {
        const startMonth = (quarter - 1) * 3;
        const startDate = new Date(year, startMonth, 1);
        const endDate = new Date(year, startMonth + 3, 0);
        
        return {
            start: Utils.formatDate(startDate),
            end: Utils.formatDate(endDate)
        };
    },
    
    /**
     * 取得最近 N 天日期範圍
     */
    getLastNDays: function(n) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (n - 1));
        
        return {
            start: Utils.formatDate(startDate),
            end: Utils.formatDate(endDate)
        };
    },
    
    /**
     * 取得一週中的日期陣列
     */
    getWeekDates: function(date = new Date()) {
        const result = [];
        const day = date.getDay(); // 0 = 星期日, 1-6 = 星期一至六
        
        // 調整為週一開始
        const startOffset = day === 0 ? -6 : 1 - day;
        const monday = new Date(date);
        monday.setDate(date.getDate() + startOffset);
        
        // 生成一週的日期
        for (let i = 0; i < 7; i++) {
            const weekDate = new Date(monday);
            weekDate.setDate(monday.getDate() + i);
            result.push(Utils.formatDate(weekDate));
        }
        
        return result;
    }
};