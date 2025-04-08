/**
 * day-manager.js - 日常資料管理
 */

const DayManager = {
    /**
     * 當前日期
     */
    currentDate: null,
    
    /**
     * 初始化
     */
    init: function() {
        // 從 localStorage 取得當前日期
        const savedDate = Utils.getFromLocalStorage('currentDate');
        
        if (savedDate) {
            this.currentDate = savedDate;
        } else {
            // 否則使用今天的日期
            this.currentDate = DateUtils.today();
            Utils.saveToLocalStorage('currentDate', this.currentDate);
        }
        
        console.log('日期管理已初始化，當前日期:', this.currentDate);
        return this.currentDate;
    },
    
    /**
     * 取得當前日期
     */
    getCurrentDate: function() {
        return this.currentDate;
    },
    
    /**
     * 更新為新的一天（通常在每天第一次開啟應用程式時）
     */
    startNewDay: function() {
        // 檢查是否已經是今天
        const today = DateUtils.today();
        
        if (this.currentDate === today) {
            Utils.showToast('已經是今天了', 'info');
            return false;
        }
        
        if (!confirm('確認要開啟新的一天嗎？')){
            return false;
            }
        
        // 更新當前日期為今天
        this.currentDate = today;
        Utils.saveToLocalStorage('currentDate', this.currentDate);
        
        // 執行每日初始化操作
        this._performDailyInitialization();
        
        // 發布新一天開始事件
        EventBus.publish('newDayStarted', { date: this.currentDate });
        
        Utils.showToast(`成功開始新的一天：${this.currentDate}`, 'success');
        return true;
    },
    
    /**
     * 執行每日初始化操作
     */
    _performDailyInitialization: function() {
        console.log('執行每日初始化', this.currentDate);
        
        // 重置當日支出和收入統計
        const dailyStats = {
            date: this.currentDate,
            income: 0,
            expense: 0,
            transactions: []
        };
        
        Utils.saveToLocalStorage('dailyStats', dailyStats);
        
        // 檢查待續進項
        this._checkRecurringItems();
        
        // 檢查預算
        this._checkBudgets();
        
        // 顯示每日提示
        this._showDailyTips();
    },
    
    /**
     * 檢查週期性項目（如自動繳費等）
     */
    _checkRecurringItems: function() {
        // 從 store 取得週期性項目
        const recurringItems = Utils.getFromLocalStorage('recurringItems', []);
        
        // 檢查今天是否有需要處理的項目
        const today = new Date(this.currentDate);
        const todayItems = recurringItems.filter(item => {
            if (!item.active) return false;
            
            switch (item.frequency) {
                case 'daily':
                    return true;
                    
                case 'weekly':
                    return today.getDay() === item.dayOfWeek;
                    
                case 'monthly':
                    return today.getDate() === item.dayOfMonth;
                    
                case 'yearly':
                    return today.getMonth() === item.month - 1 && 
                           today.getDate() === item.dayOfMonth;
                           
                default:
                    return false;
            }
        });
        
        if (todayItems.length > 0) {
            console.log('今天有週期性項目需要處理:', todayItems);
            
            // 發布事件以便應用程式可以進行相應處理
            EventBus.publish('recurringItemsDue', { items: todayItems });
        }
    },
    
    /**
     * 檢查預算狀態
     */
    _checkBudgets: function() {
        const budgets = Utils.getFromLocalStorage('budgets', []);
        const transactions = Utils.getFromLocalStorage('transactions', []);
        const currentMonth = new Date(this.currentDate).getMonth();
        const currentYear = new Date(this.currentDate).getFullYear();
        
        // 篩選當月交易
        const thisMonthTransactions = transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate.getMonth() === currentMonth && 
                   txDate.getFullYear() === currentYear && 
                   tx.type === 'expense';
        });
        
        // 計算每個類別的總支出
        const categoryExpenses = {};
        thisMonthTransactions.forEach(tx => {
            if (!categoryExpenses[tx.category]) {
                categoryExpenses[tx.category] = 0;
            }
            categoryExpenses[tx.category] += tx.amount;
        });
        
        // 檢查哪些預算接近限制
        const warningThreshold = 0.8; // 80%
        const criticalThreshold = 0.95; // 95%
        
        const budgetWarnings = [];
        
        budgets.forEach(budget => {
            if (!categoryExpenses[budget.category]) return;
            
            const spentPercentage = categoryExpenses[budget.category] / budget.amount;
            
            if (spentPercentage >= criticalThreshold) {
                budgetWarnings.push({
                    category: budget.category,
                    spent: categoryExpenses[budget.category],
                    budget: budget.amount,
                    percentage: spentPercentage,
                    severity: 'critical'
                });
            } else if (spentPercentage >= warningThreshold) {
                budgetWarnings.push({
                    category: budget.category,
                    spent: categoryExpenses[budget.category],
                    budget: budget.amount,
                    percentage: spentPercentage,
                    severity: 'warning'
                });
            }
        });
        
        if (budgetWarnings.length > 0) {
            console.log('預算警告:', budgetWarnings);
            
            // 發布預算警告事件
            EventBus.publish('budgetWarnings', { warnings: budgetWarnings });
        }
    },
    
    /**
     * 顯示每日財務小貼士
     */
    _showDailyTips: function() {
        const tips = [
            '記得每天記錄你的支出，養成良好的理財習慣',
            '設定具體的儲蓄目標可以幫助你更有動力儲蓄',
            '審視你的訂閱服務，取消不必要的訂閱可以節省不少',
            '購物前列一個清單，避免衝動購物',
            '試著在家自己煮飯，不僅健康還能省錢',
            '利用週末規劃下週的餐點，可以節省食材成本',
            '設定自動儲蓄，讓儲蓄變成習慣',
            '投資前做好功課，分散投資可以降低風險',
            '定期檢查你的保險是否足夠，但避免過度投保',
            '善用折扣季節購物，可以省下不少錢'
        ];
        
        // 根據日期選擇一條提示
        const dateObj = new Date(this.currentDate);
        const dayOfYear = Math.floor((dateObj - new Date(dateObj.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
        const tipIndex = dayOfYear % tips.length;
        
        const dailyTip = tips[tipIndex];
        
        // 發布每日提示事件
        EventBus.publish('dailyTip', { tip: dailyTip });
    },
    
    /**
     * 檢查今天是否有生日或紀念日
     */
    checkImportantDates: function() {
        const importantDates = Utils.getFromLocalStorage('importantDates', []);
        const today = new Date(this.currentDate);
        const month = today.getMonth() + 1;
        const day = today.getDate();
        
        const todayEvents = importantDates.filter(event => 
            event.month === month && event.day === day
        );
        
        if (todayEvents.length > 0) {
            console.log('今天有重要日期:', todayEvents);
            EventBus.publish('importantDates', { events: todayEvents });
        }
        
        return todayEvents;
    }
};