/**
 * calendar.js - 財務日曆功能
 */

const CalendarManager = {
    // 當前顯示的年月
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(),
    
    /**
     * 初始化日曆功能
     */
    init: function() {
        this._bindEvents();
        
        // 渲染當前月份
        this.renderCalendarView();
        
        console.log('財務日曆初始化完成');
    },
    
    /**
     * 綁定事件
     */
    _bindEvents: function() {
        // 月份導航按鈕 - 添加元素存在检查
        const prevMonthBtn = document.getElementById('prevMonthBtn');
        if (prevMonthBtn) {
            prevMonthBtn.addEventListener('click', () => {
                this.navigateCalendar('prev');
            });
        }
        
        const nextMonthBtn = document.getElementById('nextMonthBtn');
        if (nextMonthBtn) {
            nextMonthBtn.addEventListener('click', () => {
                this.navigateCalendar('next');
            });
        }
        
        // 今天按鈕
        const todayBtn = document.getElementById('todayBtn');
        if (todayBtn) {
            todayBtn.addEventListener('click', () => {
                this.navigateToToday();
            });
        }
        
        // 日期點擊事件委託
        const financeCalendar = document.getElementById('financeCalendar');
        if (financeCalendar) {
            financeCalendar.addEventListener('click', (e) => {
                const dateCell = e.target.closest('.date-cell');
                if (dateCell && dateCell.dataset.date) {
                    this.showDayTransactions(dateCell.dataset.date);
                }
            });
        }
    },
    
    /**
     * 導航到今天
     */
    navigateToToday: function() {
        const today = new Date();
        this.currentYear = today.getFullYear();
        this.currentMonth = today.getMonth();
        this.renderCalendarView();
    },
    
   /**
     * 渲染月曆視圖
     */
   renderCalendarView: function(year = this.currentYear, month = this.currentMonth) {
    const calendarContainer = document.getElementById('financeCalendar');
    if (!calendarContainer) {
        console.error("Calendar container not found");
        return;
    }
    
    // 更新當前顯示的年月
    this.currentYear = year;
    this.currentMonth = month;
    
    // 更新月份顯示 - 添加元素存在检查
    const monthDisplay = document.getElementById('currentMonthDisplay');
    if (monthDisplay) {
        const monthNames = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
        monthDisplay.textContent = `${this.currentYear}年 ${monthNames[this.currentMonth]}`;
    }
    
    // 獲取該月第一天和最後一天
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 該月總天數
    const daysInMonth = lastDay.getDate();
    
    // 獲取該月第一天是星期幾 (0-6, 0是星期日)
    // 調整為星期一為一週的第一天 (0-6, 0是星期一)
    let firstDayIndex = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    
    // 獲取該月所有交易記錄
    const monthTransactions = Store.getTransactions({
        startDate: Utils.formatDate(firstDay),
        endDate: Utils.formatDate(lastDay)
    });
    
    // 按日聚合交易
    const transactionsByDate = {};
    
    for (let i = 1; i <= daysInMonth; i++) {
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        transactionsByDate[dateString] = {
            totalIncome: 0,
            totalExpense: 0,
            transactions: []
        };
    }
    
    // 填充交易數據
    monthTransactions.forEach(tx => {
        if (!transactionsByDate[tx.date]) return;
        
        transactionsByDate[tx.date].transactions.push(tx);
        
        if (tx.type === 'income') {
            transactionsByDate[tx.date].totalIncome += tx.amount;
        } else if (tx.type === 'expense') {
            transactionsByDate[tx.date].totalExpense += tx.amount;
        }
    });
    
    // 生成月曆 HTML
    let calendarHTML = `
        <div class="calendar-header">
            <div class="weekday">一</div>
            <div class="weekday">二</div>
            <div class="weekday">三</div>
            <div class="weekday">四</div>
            <div class="weekday">五</div>
            <div class="weekday">六</div>
            <div class="weekday">日</div>
        </div>
        <div class="calendar-body">
    `;
    
    // 添加空白單元格
    for (let i = 0; i < firstDayIndex; i++) {
        calendarHTML += `<div class="date-cell empty"></div>`;
    }
    
    // 添加日期單元格
    for (let i = 1; i <= daysInMonth; i++) {
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayData = transactionsByDate[dateString];
        
        // 判斷是否為今天
        const isToday = dateString === Utils.formatDate(new Date());
        
        // 計算日餘額
        const dayBalance = dayData.totalIncome - dayData.totalExpense;
        const balanceClass = dayBalance >= 0 ? 'positive' : 'negative';
        
        // 查找該日是否有預算提醒 - 改進預算提醒檢查
        const hasBudgetAlert = this._checkDailyBudgetAlert(dateString, dayData.totalExpense);
        
        calendarHTML += `
            <div class="date-cell ${isToday ? 'today' : ''} ${hasBudgetAlert ? 'budget-alert' : ''}" data-date="${dateString}">
                <div class="date-number">${i}</div>
                ${dayData.totalIncome > 0 || dayData.totalExpense > 0 ? `
                    <div class="date-summary">
                        ${dayData.totalIncome > 0 ? `<div class="income">+${Utils.formatCurrency(dayData.totalIncome, Store.settings.defaultCurrency, 0)}</div>` : ''}
                        ${dayData.totalExpense > 0 ? `<div class="expense">-${Utils.formatCurrency(dayData.totalExpense, Store.settings.defaultCurrency, 0)}</div>` : ''}
                        <div class="balance ${balanceClass}">${Utils.formatCurrency(dayBalance, Store.settings.defaultCurrency, 0)}</div>
                    </div>
                ` : ''}
                ${hasBudgetAlert ? '<div class="alert-indicator"><i class="fas fa-exclamation-circle"></i></div>' : ''}
            </div>
        `;
    }
    
    calendarHTML += '</div>';
    
    // 更新月曆容器
    calendarContainer.innerHTML = calendarHTML;
    
    // 計算並更新預算進度 - 添加元素存在检查
    this.updateBudgetProgress();
},

    /**
     * 改進的預算提醒檢查 - 檢查具體日期的支出
     */
    _checkDailyBudgetAlert: function(dateString, dailyExpense) {
        if (!dailyExpense || dailyExpense <= 0) return false;
        
        // 计算该日的预算阈值
        const dailyBudget = this._calculateDailyBudgetForDate(dateString);
        if (!dailyBudget.hasData) return false;
        
        // 检查该日支出是否超过了日预算的警戒线比例
        const alertThreshold = Store.settings && Store.settings.alertThreshold ? Store.settings.alertThreshold : 80;
        const percentage = (dailyExpense / dailyBudget.amount) * 100;
        
        return percentage >= alertThreshold;
    },
    /**
     * 原始的月度預算提醒檢查（保留為參考）
     */
    _checkBudgetAlert: function(dateString) {
        const currentDate = new Date(dateString);
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        
        // 獲取當月預算使用情況
        const budgetUsages = Store.getAllBudgetUsage ? Store.getAllBudgetUsage('monthly', year, month) : [];
        
        // 檢查是否有任何預算超過警戒線
        return Array.isArray(budgetUsages) && budgetUsages.some(usage => {
            if (!usage) return false;
            return usage.percentage >= (Store.settings && Store.settings.alertThreshold ? Store.settings.alertThreshold : 80);
        });
    },
    
    
    /**
     * 更新預算進度 - 修正元素存在檢查
     */
    updateBudgetProgress: function() {
        const progressElement = document.getElementById('monthlyBudgetProgress');
        // 如果元素不存在，直接返回，不执行任何操作
        if (!progressElement) return;
        
        const today = new Date();
        const year = this.currentYear;
        const month = this.currentMonth + 1;
        
        // 如果不是當前月份，不顯示進度
        if (year !== today.getFullYear() || month !== today.getMonth() + 1) {
            progressElement.innerHTML = '<p class="note">僅顯示當月預算進度</p>';
            return;
        }
        
        // 獲取當月預算使用情況
        const budgetUsages = Store.getAllBudgetUsage ? Store.getAllBudgetUsage('monthly', year, month) : [];
        
        // 如果沒有預算，顯示提示
        if (!Array.isArray(budgetUsages) || budgetUsages.length === 0) {
            progressElement.innerHTML = '<p class="note">尚未設置當月預算</p>';
            return;
        }
        
        // 生成預算進度 HTML
        let progressHTML = '<div class="budget-progress-list">';
        
        budgetUsages.forEach(usage => {
            if (!usage || !usage.category) return;
            
            const alertThreshold = Store.settings && Store.settings.alertThreshold ? Store.settings.alertThreshold : 80;
            const warningClass = usage.percentage >= alertThreshold ? 'warning' : '';
            
            progressHTML += `
                <div class="budget-progress-item ${warningClass}">
                    <div class="budget-category">
                        <div class="budget-category-icon" style="background-color: ${usage.category.color}20; color: ${usage.category.color}">
                            <i class="fas fa-${usage.category.icon}"></i>
                        </div>
                        <div class="budget-category-details">
                            <div class="budget-category-name">${usage.category.name}</div>
                            <div class="budget-category-spent">${Utils.formatCurrency(usage.totalExpense, Store.settings.defaultCurrency)} / ${Utils.formatCurrency(usage.budget.amount, Store.settings.defaultCurrency)}</div>
                        </div>
                    </div>
                    <div class="budget-progress-container">
                        <div class="budget-progress-bar" style="width: ${usage.percentage}%"></div>
                    </div>
                    <div class="budget-percentage">${Math.round(usage.percentage)}%</div>
                </div>
            `;
        });
        
        progressHTML += '</div>';
        
        // 更新預算進度容器
        progressElement.innerHTML = progressHTML;
    },

    /**
     * 導航月曆
     */
    navigateCalendar: function(direction) {
        if (direction === 'prev') {
            // 上個月
            this.currentMonth--;
            if (this.currentMonth < 0) {
                this.currentMonth = 11;
                this.currentYear--;
            }
        } else {
            // 下個月
            this.currentMonth++;
            if (this.currentMonth > 11) {
                this.currentMonth = 0;
                this.currentYear++;
            }
        }
        
        // 重新渲染月曆
        this.renderCalendarView();
    },
    
    /**
     * 顯示某日的交易記錄
     */
    showDayTransactions: function(dateString) {
        // 獲取該日的交易記錄
        const dayTransactions = Store.getTransactions({
            startDate: dateString,
            endDate: dateString
        });
        
        // 獲取或創建詳情模態框
        let modalElement = document.getElementById('dayTransactionsModal');
        
        if (!modalElement) {
            modalElement = document.createElement('div');
            modalElement.id = 'dayTransactionsModal';
            modalElement.className = 'modal';
            document.body.appendChild(modalElement);
        }
        
        // 格式化日期顯示
        const formattedDate = new Date(dateString).toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });
        
        // 計算收入和支出總額
        let totalIncome = 0;
        let totalExpense = 0;
        
        dayTransactions.forEach(tx => {
            if (tx.type === 'income') {
                totalIncome += tx.amount;
            } else if (tx.type === 'expense') {
                totalExpense += tx.amount;
            }
        });
        
        // 計算餘額
        const balance = totalIncome - totalExpense;
        const balanceClass = balance >= 0 ? 'positive-balance' : 'negative-balance';
        
        // 檢查該日是否在預算範圍內
        const dailyBudget = this._calculateDailyBudgetForDate(dateString);
        let budgetStatusHTML = '';
        
        if (dailyBudget.hasData) {
            const isOverBudget = totalExpense > dailyBudget.amount;
            budgetStatusHTML = `
                <div class="budget-status ${isOverBudget ? 'over-budget' : 'within-budget'}">
                    <div class="status-label">每日預算</div>
                    <div class="status-value">${Utils.formatCurrency(dailyBudget.amount, Store.settings.defaultCurrency)}</div>
                    <div class="status-message">
                        ${isOverBudget ? 
                            `超出預算 ${Utils.formatCurrency(totalExpense - dailyBudget.amount, Store.settings.defaultCurrency)}` : 
                            `低於預算 ${Utils.formatCurrency(dailyBudget.amount - totalExpense, Store.settings.defaultCurrency)}`
                        }
                    </div>
                </div>
            `;
        }
        
        // 生成交易記錄 HTML
        let transactionsHTML = '';
        let addTransactionButton = '';
        
        // 添加交易按鈕 (僅當日是當前日期或未來日期時顯示)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDate = new Date(dateString);
        selectedDate.setHours(0, 0, 0, 0);
        
        if (selectedDate >= today) {
            addTransactionButton = `
                <button class="btn btn-sm add-transaction-btn" data-date="${dateString}">
                    <i class="fas fa-plus"></i> 添加交易
                </button>
            `;
        }
        
        if (dayTransactions.length === 0) {
            transactionsHTML = '<p class="empty-message">該日無交易記錄</p>';
        } else {
            transactionsHTML = '<div class="transactions-list">';
            
            dayTransactions.forEach(tx => {
                const category = Store.getCategory(tx.categoryId) || { name: '未分類', icon: 'question-circle', color: '#999' };
                const account = Store.getAccount(tx.accountId) || { name: '未知戶口' };
                
                transactionsHTML += `
                    <div class="transaction-item ${tx.type}">
                        <div class="transaction-icon" style="background-color: ${category.color}20; color: ${category.color}">
                            <i class="fas fa-${category.icon}"></i>
                        </div>
                        <div class="transaction-details">
                            <div class="transaction-category">${category.name}</div>
                            <div class="transaction-account">${account.name}</div>
                            ${tx.note ? `<div class="transaction-note">${tx.note}</div>` : ''}
                        </div>
                        <div class="transaction-amount">
                            ${tx.type === 'income' ? '+' : '-'}${Utils.formatCurrency(tx.amount, tx.currency)}
                        </div>
                        <div class="transaction-actions">
                            <button class="btn-icon edit-transaction" data-id="${tx.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon delete-transaction" data-id="${tx.id}">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
            
            transactionsHTML += '</div>';
        }
        
        // 更新模態框內容
        modalElement.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${formattedDate}交易記錄</h3>
                    <span class="close-button">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="day-summary">
                        <div class="summary-item">
                            <div class="summary-label">收入</div>
                            <div class="summary-value income">+${Utils.formatCurrency(totalIncome, Store.settings.defaultCurrency)}</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-label">支出</div>
                            <div class="summary-value expense">-${Utils.formatCurrency(totalExpense, Store.settings.defaultCurrency)}</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-label">餘額</div>
                            <div class="summary-value ${balanceClass}">${Utils.formatCurrency(balance, Store.settings.defaultCurrency)}</div>
                        </div>
                    </div>
                    ${budgetStatusHTML}
                    ${transactionsHTML}
                </div>
                <div class="modal-footer">
                    ${addTransactionButton}
                </div>
            </div>
        `;
        
        // 綁定關閉按鈕事件
        modalElement.querySelector('.close-button').addEventListener('click', () => {
            UiCore.closeModal('dayTransactionsModal');
        });
        
        // 綁定添加交易按鈕事件
        const addTxBtn = modalElement.querySelector('.add-transaction-btn');
        if (addTxBtn) {
            addTxBtn.addEventListener('click', () => {
                UiCore.closeModal('dayTransactionsModal');
                UiTransactions.showAddTransactionModal(dateString);
            });
        }
        
        // 綁定編輯交易按鈕事件
        const editBtns = modalElement.querySelectorAll('.edit-transaction');
        editBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const txId = btn.dataset.id;
                UiCore.closeModal('dayTransactionsModal');
                UiTransactions.showEditTransactionModal(txId);
            });
        });
        
        // 綁定刪除交易按鈕事件
        const deleteBtns = modalElement.querySelectorAll('.delete-transaction');
        deleteBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const txId = btn.dataset.id;
                
                if (confirm('確定要刪除此交易嗎？')) {
                    const result = App.deleteTransaction(txId);
                    
                    if (result) {
                        // 關閉模態框
                        UiCore.closeModal('dayTransactionsModal');
                        
                        // 更新月曆
                        this.renderCalendarView();
                    }
                }
            });
        });
        
        // 顯示模態框
        UiCore.showModal('dayTransactionsModal');
    },
    
    /**
     * 計算特定日期的每日預算
     */
    _calculateDailyBudgetForDate: function(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        
        // 獲取當月預算
        const budgets = Store.getBudgets('monthly', year, month);
        
        // 如果沒有預算數據，返回假數據
        if (budgets.length === 0) {
            return {
                hasData: false,
                amount: 0
            };
        }
        
        // 計算總預算
        let totalBudget = 0;
        budgets.forEach(budget => {
            totalBudget += budget.amount;
        });
        
        // 獲取當月天數
        const daysInMonth = new Date(year, month, 0).getDate();
        
        // 計算每日預算
        const dailyBudget = totalBudget / daysInMonth;
        
        return {
            hasData: true,
            amount: dailyBudget
        };
    },

    /**
 * 日曆診斷功能 - 添加到CalendarManager对象中
 */
diagnoseCalendar: function() {
    console.group('📅 財務日曆診斷');
    
    // 檢查關鍵元素
    const calendarContainer = document.getElementById('financeCalendar');
    console.log('日曆容器存在:', !!calendarContainer);
    
    const monthDisplay = document.getElementById('currentMonthDisplay');
    console.log('月份顯示元素存在:', !!monthDisplay);
    
    const prevBtn = document.getElementById('prevMonthBtn');
    console.log('上月按鈕存在:', !!prevBtn);
    
    const nextBtn = document.getElementById('nextMonthBtn');
    console.log('下月按鈕存在:', !!nextBtn);
    
    // 檢查Store功能
    console.log('Store對象存在:', typeof Store !== 'undefined');
    
    if (typeof Store !== 'undefined') {
        console.log('getTransactions方法存在:', typeof Store.getTransactions === 'function');
        console.log('getAllBudgetUsage方法存在:', typeof Store.getAllBudgetUsage === 'function');
        console.log('getBudgets方法存在:', typeof Store.getBudgets === 'function');
    }
    
    // 檢查當前日期設置
    console.log('當前顯示年份:', this.currentYear);
    console.log('當前顯示月份:', this.currentMonth);
    
    // 檢查預算數據
    if (typeof Store !== 'undefined') {
        try {
            if (typeof Store.getBudgets === 'function') {
                const budgets = Store.getBudgets('monthly', this.currentYear, this.currentMonth + 1);
                console.log('月度預算數據:', budgets);
                console.log('預算數量:', Array.isArray(budgets) ? budgets.length : 'N/A');
            }
            
            if (typeof Store.getAllBudgetUsage === 'function') {
                const budgetUsages = Store.getAllBudgetUsage('monthly', this.currentYear, this.currentMonth + 1);
                console.log('預算使用情況:', budgetUsages);
            }
        } catch (error) {
            console.error('獲取預算數據時出錯:', error);
        }
    }
    
    // 檢查交易數據
    if (typeof Store !== 'undefined' && typeof Store.getTransactions === 'function') {
        try {
            const firstDay = new Date(this.currentYear, this.currentMonth, 1);
            const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
            
            const formattedFirstDay = Utils.formatDate(firstDay);
            const formattedLastDay = Utils.formatDate(lastDay);
            
            console.log('月份範圍:', formattedFirstDay, '至', formattedLastDay);
            
            const transactions = Store.getTransactions({
                startDate: formattedFirstDay,
                endDate: formattedLastDay
            });
            
            console.log('月份交易數量:', transactions.length);
            // 輸出前兩筆交易作為樣本
            if (transactions.length > 0) {
                console.log('交易樣本:', transactions.slice(0, 2));
            }
            
            // 按类型统计交易
            const incomeCount = transactions.filter(tx => tx.type === 'income').length;
            const expenseCount = transactions.filter(tx => tx.type === 'expense').length;
            console.log('收入交易:', incomeCount, '支出交易:', expenseCount);
        } catch (error) {
            console.error('獲取交易數據時出錯:', error);
        }
    }
    
    console.groupEnd();
    
    return {
        calendarContainerExists: !!calendarContainer,
        monthDisplayExists: !!monthDisplay,
        storeExists: typeof Store !== 'undefined',
        year: this.currentYear,
        month: this.currentMonth
    };
},
    
    /**
     * 刷新日曆
     */
    refresh: function() {
        this.renderCalendarView();
    }
};