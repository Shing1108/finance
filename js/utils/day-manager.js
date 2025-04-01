// day-manager.js - 日期管理工具

/**
 * 日期管理器
 */
window.dayManager = {
    // 當前活動日期
    activeDay: new Date().toISOString().split('T')[0],
    
    /**
     * 初始化日期管理器
     */
    initDayManager: function() {
        console.log("初始化日期管理器");
        
        // 載入最後使用的活動日期
        this.loadActiveDay();
        
        // 更新頂部狀態欄
        this.updateTopStatusBar();
        
        // 綁定新的一天按鈕事件
        const startNewDayButton = document.getElementById('startNewDayButton');
        if (startNewDayButton) {
            startNewDayButton.addEventListener('click', () => this.startNewDay());
        }
    },
    
    /**
     * 載入最後使用的活動日期
     */
    loadActiveDay: function() {
        try {
            // 嘗試從localStorage載入
            const savedActiveDay = localStorage.getItem('activeDay');
            if (savedActiveDay) {
                this.activeDay = savedActiveDay;
            } else {
                // 默認為今天
                this.activeDay = new Date().toISOString().split('T')[0];
            }
            
            console.log("當前活動日期:", this.activeDay);
        } catch (error) {
            console.error("載入活動日期時發生錯誤:", error);
            this.activeDay = new Date().toISOString().split('T')[0];
        }
    },
    
    /**
     * 開始新的一天
     */
    startNewDay: function() {
        console.log("開始新的一天");
        
        try {
            // 獲取今天日期
            const today = new Date().toISOString().split('T')[0];
            
            // 檢查當前活動日期是否已經是今天
            if (this.activeDay === today) {
                showToast('已經是今天了', 'info');
                return;
            }
            
            // 開始日期轉換
            showConfirmDialog(`確定要將活動日期從 ${this.formatDate(this.activeDay)} 切換到 ${this.formatDate(today)} 嗎？`, () => {
                // 記錄舊日期
                const oldActiveDay = this.activeDay;
                
                // 更新活動日期
                this.activeDay = today;
                
                // 保存到localStorage
                localStorage.setItem('activeDay', this.activeDay);
                
                // 檢查預算結束狀態
                this.checkBudgetEndStatus(oldActiveDay, today);
                
                // 更新UI
                this.updateTopStatusBar();
                updateDashboardUI();
                
                // 如果在預算頁面，更新預算UI
                if (document.getElementById('budgets').classList.contains('active')) {
                    updateBudgetsUI();
                }
                
                // 顯示成功消息
                showToast(`已切換到 ${this.formatDate(today)}`, 'success');
            });
        } catch (error) {
            console.error("開始新的一天時發生錯誤:", error);
            showToast('切換日期失敗: ' + error.message, 'error');
        }
    },
    /**
    * 檢查預算結束狀態
    * @param {string} oldDate 舊日期
    * @param {string} newDate 新日期
    */
    checkBudgetEndStatus: function(oldDate, newDate) {
        try {
            // 如果預算有結束日期，並且新日期超過了結束日期，但舊日期沒有超過
            if (appState.budgets.endDate && 
                newDate > appState.budgets.endDate && 
                oldDate <= appState.budgets.endDate) {
                
                console.log("預算已結束，創建歷史記錄");
                
                // 自動保存預算歷史記錄
                if (typeof saveBudgetHistory === 'function') {
                    saveBudgetHistory();
                    showToast('預算已結束，已自動保存為歷史記錄', 'info');
                }
            }
        } catch (error) {
            console.error("檢查預算結束狀態時發生錯誤:", error);
        }
    },

    
    /**
     * 更新頂部狀態欄
     */
    updateTopStatusBar: function() {
        console.log("更新頂部狀態欄");
        
        try {
            // 計算今日收入和支出
            const todayIncome = this.calculateDailyIncome();
            const todayExpense = this.calculateDailyExpense();
            
            // 更新顯示
            const topTodayIncome = document.getElementById('topTodayIncome');
            const topTodayExpense = document.getElementById('topTodayExpense');
            const topTotalAssets = document.getElementById('topTotalAssets');
            
            if (topTodayIncome) {
                topTodayIncome.textContent = formatNumber(todayIncome);
            }
            
            if (topTodayExpense) {
                topTodayExpense.textContent = formatNumber(todayExpense);
            }
            
            if (topTotalAssets) {
                topTotalAssets.textContent = formatNumber(this.calculateTotalAssets());
            }
            
            // 更新按鈕文字
            const startNewDayButton = document.getElementById('startNewDayButton');
            if (startNewDayButton) {
                const today = new Date().toISOString().split('T')[0];
                
                if (this.activeDay === today) {
                    startNewDayButton.innerHTML = `<i class="fas fa-calendar-day"></i> 今天 (${this.formatDate(today)})`;
                } else {
                    startNewDayButton.innerHTML = `<i class="fas fa-calendar-plus"></i> 開啟新的一天`;
                }
            }
        } catch (error) {
            console.error("更新頂部狀態欄時發生錯誤:", error);
        }
    },
    
    /**
     * 格式化日期
     * @param {string} dateString YYYY-MM-DD格式日期
     * @returns {string} 格式化後的日期
     */
    formatDate: function(dateString) {
        try {
            const [year, month, day] = dateString.split('-');
            return `${day}/${month}/${year}`;
        } catch {
            return dateString;
        }
    },
    
/**
 * 計算活動日的收入
 * @returns {number} 收入總額
 */
calculateDailyIncome: function() {
    try {
        // 篩選當天的收入交易，排除轉賬
        const transactions = appState.transactions.filter(t => 
            t.type === 'income' && 
            t.date === this.activeDay &&
            t.categoryId !== 'transfer_in'  // 排除轉賬收入
        );
        
        // 計算總收入
        let totalIncome = 0;
        
        transactions.forEach(transaction => {
            const account = appState.accounts.find(a => a.id === transaction.accountId);
            if (!account) return;
            
            let amount = transaction.amount || 0;
            
            // 如果賬戶貨幣與默認貨幣不同，則轉換
            if (account.currency !== defaultCurrency) {
                try {
                    const rate = getExchangeRate(account.currency, defaultCurrency);
                    amount = amount * rate;
                } catch (e) {
                    console.error("匯率轉換錯誤:", e);
                }
            }
            
            totalIncome += amount;
        });
        
        return totalIncome;
    } catch (error) {
        console.error("計算日收入時發生錯誤:", error);
        return 0;
    }
},

/**
 * 計算活動日的支出
 * @returns {number} 支出總額
 */
calculateDailyExpense: function() {
    try {
        // 篩選當天的支出交易，排除轉賬
        const transactions = appState.transactions.filter(t => 
            t.type === 'expense' && 
            t.date === this.activeDay &&
            t.categoryId !== 'transfer_out'  // 排除轉賬支出
        );
        
        // 計算總支出
        let totalExpense = 0;
        
        transactions.forEach(transaction => {
            const account = appState.accounts.find(a => a.id === transaction.accountId);
            if (!account) return;
            
            let amount = transaction.amount || 0;
            
            // 如果賬戶貨幣與默認貨幣不同，則轉換
            if (account.currency !== defaultCurrency) {
                try {
                    const rate = getExchangeRate(account.currency, defaultCurrency);
                    amount = amount * rate;
                } catch (e) {
                    console.error("匯率轉換錯誤:", e);
                }
            }
            
            totalExpense += amount;
        });
        
        return totalExpense;
    } catch (error) {
        console.error("計算日支出時發生錯誤:", error);
        return 0;
    }
},
    
    /**
     * 計算總資產
     * @returns {number} 總資產
     */
    calculateTotalAssets: function() {
        try {
            // 計算總資產
            let totalAssets = 0;
            
            appState.accounts.forEach(account => {
                let balance = account.balance || 0;
                
                // 如果賬戶貨幣與默認貨幣不同，則轉換
                if (account.currency !== defaultCurrency) {
                    try {
                        const rate = getExchangeRate(account.currency, defaultCurrency);
                        balance = balance * rate;
                    } catch (e) {
                        console.error("匯率轉換錯誤:", e);
                    }
                }
                
                totalAssets += balance;
            });
            
            return totalAssets;
        } catch (error) {
            console.error("計算總資產時發生錯誤:", error);
            return 0;
        }
    },
    
    /**
     * 獲取活動日
     * @returns {string} YYYY-MM-DD格式日期
     */
    getActiveDay: function() {
        return this.activeDay;
    },
    
    /**
     * 設置活動日
     * @param {string} dateString YYYY-MM-DD格式日期
     */
    setActiveDay: function(dateString) {
        this.activeDay = dateString;
        
        // 保存到localStorage
        localStorage.setItem('activeDay', this.activeDay);
        
        // 更新UI
        this.updateTopStatusBar();
        updateDashboardUI();
    },
    
    /**
     * 交易添加後的回調
     */
    onTransactionAdded: function() {
        // 更新頂部狀態欄
        this.updateTopStatusBar();
    },
    /**
 * 檢查月度預算結束狀態
 */
checkMonthlyBudgetEnd: function(oldDate, newDate) {
    // 檢查是否有月度預算
    if (!appState.budgets.monthly) return;
    
    // 獲取舊日期和新日期的月份
    const oldMonth = oldDate.substring(0, 7); // YYYY-MM
    const newMonth = newDate.substring(0, 7); // YYYY-MM
    
    // 如果月份發生變化，檢查舊月份的預算
    if (oldMonth !== newMonth && appState.budgets.monthly[oldMonth]) {
        console.log(`月份從${oldMonth}變更為${newMonth}，檢查月度預算`);
        
        // 自動保存上個月的預算為歷史記錄
        const monthlyBudget = appState.budgets.monthly[oldMonth];
        
        // 創建預算快照
        const budgetSnapshot = {
            id: generateId(),
            period: oldMonth,
            total: monthlyBudget.total,
            categories: JSON.parse(JSON.stringify(monthlyBudget.categories)),
            startDate: monthlyBudget.startDate,
            endDate: monthlyBudget.endDate,
            createdAt: new Date().toISOString()
        };
        
        // 初始化歷史記錄數組
        if (!appState.budgets.history) {
            appState.budgets.history = [];
        }
        
        // 檢查是否已有相同月份的歷史記錄
        const existingIndex = appState.budgets.history.findIndex(h => h.period === oldMonth);
        if (existingIndex === -1) {
            // 添加新記錄
            appState.budgets.history.push(budgetSnapshot);
            
            // 保存到本地存儲
            saveToLocalStorage();
            
            // 顯示通知
            showToast(`${formatYearMonth(oldMonth)}預算已自動保存為歷史記錄`, 'info');
        }
    }
}
    
}