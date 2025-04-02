// analytics.js - 數據分析功能

/**
 * 分析模組
 */
window.analytics = {
    /**
     * 初始化數據分析
     */
    initAnalytics: function() {
        console.log("初始化數據分析模組");
        
        try {
            // 加載 Chart.js (如果尚未加載)
            this.loadDependencies()
                .then(() => {
                    // 設置週期選擇器事件
                    this.setupPeriodSelector();
                    
                    // 使用上次的週期選擇
                    this.loadLastUsedPeriod();
                    
                    // 初始化圖表
                    this.initializeCharts();
                    
                    // 生成洞察
                    this.generateInsights();
                })
                .catch(error => {
                    console.error("加載數據分析依賴時出錯:", error);
                    document.getElementById('trendChart').innerHTML = '<p class="error-message">載入圖表庫失敗</p>';
                    document.getElementById('financialInsights').innerHTML = '<p class="error-message">載入分析功能失敗</p>';
                });
        } catch (error) {
            console.error("初始化數據分析時發生錯誤:", error);
            
            // 顯示錯誤消息
            const containers = ['trendChart', 'categoryDistribution', 'comparisonChart', 'financialInsights'];
            containers.forEach(id => {
                const container = document.getElementById(id);
                if (container) {
                    container.innerHTML = '<p class="error-message">初始化分析時出錯</p>';
                }
            });
        }
    },
    
    /**
     * 加載依賴庫
     */
    loadDependencies: function() {
        return new Promise((resolve, reject) => {
            // 檢查 Chart.js 是否已加載
            if (typeof Chart !== 'undefined') {
                resolve();
                return;
            }
            
            // 加載 Chart.js
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load Chart.js'));
            document.head.appendChild(script);
        });
    },
    
    /**
     * 設置週期選擇器事件
     */
    setupPeriodSelector: function() {
        // 獲取所有週期按鈕
        const periodButtons = document.querySelectorAll('.period-btn');
        const customPeriodContainer = document.querySelector('.custom-period');
        
        if (!periodButtons.length || !customPeriodContainer) {
            console.warn("找不到週期選擇按鈕或自定義週期容器");
            return;
        }
        
        // 為每個按鈕添加點擊事件
        periodButtons.forEach(button => {
            button.addEventListener('click', () => {
                // 移除所有按鈕的active類
                periodButtons.forEach(btn => btn.classList.remove('active'));
                
                // 添加active類到當前按鈕
                button.classList.add('active');
                
                // 獲取所選週期
                const period = button.getAttribute('data-period');
                
                // 顯示或隱藏自定義日期範圍
                if (period === 'custom') {
                    customPeriodContainer.style.display = 'flex';
                } else {
                    customPeriodContainer.style.display = 'none';
                    
                    // 保存選擇的週期
                    appState.analytics.lastUsedPeriod = period;
                    saveToLocalStorage();
                    
                    // 更新圖表和洞察
                    this.updateData();
                }
            });
        });
        
        // 自定義日期範圍應用按鈕
        const applyCustomPeriodButton = document.getElementById('applyCustomPeriod');
        if (applyCustomPeriodButton) {
            applyCustomPeriodButton.addEventListener('click', () => {
                const startDate = document.getElementById('analyticsStartDate').value;
                const endDate = document.getElementById('analyticsEndDate').value;
                
                if (!startDate || !endDate) {
                    showToast('請選擇開始和結束日期', 'error');
                    return;
                }
                
                if (startDate > endDate) {
                    showToast('開始日期不能晚於結束日期', 'error');
                    return;
                }
                
                // 保存自定義日期範圍
                appState.analytics.lastUsedPeriod = 'custom';
                appState.analytics.customPeriod = {
                    start: startDate,
                    end: endDate
                };
                saveToLocalStorage();
                
                // 更新圖表和洞察
                this.updateData();
            });
        }
    },
    
    /**
     * 加載上次使用的週期設置
     */
    loadLastUsedPeriod: function() {
        // 獲取上次使用的週期
        const lastPeriod = appState.analytics.lastUsedPeriod || 'month';
        
        // 選中對應的按鈕
        const periodButton = document.querySelector(`.period-btn[data-period="${lastPeriod}"]`);
        if (periodButton) {
            periodButton.click();
        }
        
        // 如果是自定義週期，設置日期
        if (lastPeriod === 'custom' && appState.analytics.customPeriod) {
            const { start, end } = appState.analytics.customPeriod;
            
            const startInput = document.getElementById('analyticsStartDate');
            const endInput = document.getElementById('analyticsEndDate');
            
            if (startInput && endInput) {
                startInput.value = start;
                endInput.value = end;
            }
        }
    },
    
    /**
     * 初始化所有圖表
     */
    initializeCharts: function() {
        this.showLoadingState();
        setTimeout(() => this.updateData(), 100);
    },
    
    /**
     * 顯示載入中狀態
     */
    showLoadingState: function() {
        const containers = ['trendChart', 'categoryDistribution', 'comparisonChart'];
        const loadingHTML = `
            <div class="chart-loading">
                <div class="spinner"></div>
                <p>載入數據中...</p>
            </div>
        `;
        
        containers.forEach(id => {
            const container = document.getElementById(id);
            if (container) {
                container.innerHTML = loadingHTML;
            }
        });
        
        // 洞察區載入
        const insightsContainer = document.getElementById('financialInsights');
        if (insightsContainer) {
            insightsContainer.innerHTML = '<div class="insight-loading">分析數據中...</div>';
        }
    },
    
    /**
     * 更新所有數據
     */
    updateData: function() {
        console.log("更新分析數據");
        
        // 獲取日期範圍
        const dateRange = this.getDateRange();
        
        // 更新所有圖表
        this.updateTrendChart(dateRange);
        this.updateCategoryDistribution(dateRange);
        this.updateComparisonChart(dateRange);
        
        // 生成洞察
        this.generateInsights(dateRange);
    },
    
    /**
     * 獲取當前選擇的日期範圍
     * @returns {Object} 包含開始和結束日期的對象
     */
    getDateRange: function() {
        const today = new Date();
        const period = appState.analytics.lastUsedPeriod || 'month';
        
        // 自定義日期範圍
        if (period === 'custom' && appState.analytics.customPeriod) {
            return {
                start: appState.analytics.customPeriod.start,
                end: appState.analytics.customPeriod.end
            };
        }
        
        // 計算開始日期
        let startDate = new Date(today);
        
        if (period === 'month') {
            // 當月第一天
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        } else if (period === 'quarter') {
            // 當季第一天
            const quarter = Math.floor(today.getMonth() / 3);
            startDate = new Date(today.getFullYear(), quarter * 3, 1);
        } else if (period === 'year') {
            // 當年第一天
            startDate = new Date(today.getFullYear(), 0, 1);
        }
        
        // 格式化為YYYY-MM-DD
        const start = startDate.toISOString().split('T')[0];
        const end = today.toISOString().split('T')[0];
        
        return { start, end };
    },
    
    /**
     * 更新趨勢圖表
     * @param {Object} dateRange 日期範圍
     */
    updateTrendChart: function(dateRange) {
        try {
            const container = document.getElementById('trendChart');
            if (!container) return;
            
            // 解析日期範圍
            const { start, end } = dateRange;
            const startDate = new Date(start);
            const endDate = new Date(end);
            
            // 生成日期標籤和數據點
            const dateLabels = [];
            const incomeData = [];
            const expenseData = [];
            const balanceData = [];
            
            // 根據時間跨度決定數據粒度
            const daysDiff = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
            let interval = 'day';
            
            if (daysDiff > 90) {
                interval = 'month';
            } else if (daysDiff > 30) {
                interval = 'week';
            }
            
            // 生成日期標籤和空數據點
            if (interval === 'day') {
                // 按天聚合
                for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                    dateLabels.push(d.toISOString().split('T')[0]);
                    incomeData.push(0);
                    expenseData.push(0);
                    balanceData.push(0);
                }
                
                // 填充交易數據
                appState.transactions.forEach(transaction => {
                    if (transaction.date < start || transaction.date > end) return;
                    
                    // 跳過轉賬交易
                    if (transaction.categoryId === 'transfer_in' || transaction.categoryId === 'transfer_out') return;
                    
                    // 找到日期索引
                    const dateIndex = dateLabels.indexOf(transaction.date);
                    if (dateIndex === -1) return;
                    
                    // 獲取賬戶和貨幣轉換
                    const account = appState.accounts.find(a => a.id === transaction.accountId);
                    if (!account) return;
                    
                    let amount = transaction.amount || 0;
                    
                    // 貨幣轉換
                    if (account.currency !== defaultCurrency) {
                        try {
                            const rate = getExchangeRate(account.currency, defaultCurrency);
                            amount = amount * rate;
                        } catch (e) {
                            console.error("匯率轉換錯誤:", e);
                        }
                    }
                    
                    // 更新數據
                    if (transaction.type === 'income') {
                        incomeData[dateIndex] += amount;
                    } else {
                        expenseData[dateIndex] += amount;
                    }
                });
            } else if (interval === 'week') {
                // 按週聚合
                const weeks = [];
                let currentWeekStart = new Date(startDate);
                
                // 找到第一個週日
                const dayOfWeek = currentWeekStart.getDay();
                if (dayOfWeek !== 0) {
                    currentWeekStart.setDate(currentWeekStart.getDate() - dayOfWeek);
                }
                
                // 生成週標籤
                while (currentWeekStart <= endDate) {
                    const weekEnd = new Date(currentWeekStart);
                    weekEnd.setDate(weekEnd.getDate() + 6);
                    
                    const weekLabel = `${currentWeekStart.toISOString().split('T')[0]} ~ ${weekEnd.toISOString().split('T')[0]}`;
                    dateLabels.push(weekLabel);
                    incomeData.push(0);
                    expenseData.push(0);
                    balanceData.push(0);
                    
                    weeks.push({
                        start: currentWeekStart.toISOString().split('T')[0],
                        end: weekEnd.toISOString().split('T')[0]
                    });
                    
                    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
                }
                
                // 填充交易數據
                appState.transactions.forEach(transaction => {
                    if (transaction.date < start || transaction.date > end) return;
                    
                    // 跳過轉賬交易
                    if (transaction.categoryId === 'transfer_in' || transaction.categoryId === 'transfer_out') return;
                    
                    // 找到所屬週
                    const weekIndex = weeks.findIndex(week => transaction.date >= week.start && transaction.date <= week.end);
                    if (weekIndex === -1) return;
                    
                    // 獲取賬戶和貨幣轉換
                    const account = appState.accounts.find(a => a.id === transaction.accountId);
                    if (!account) return;
                    
                    let amount = transaction.amount || 0;
                    
                    // 貨幣轉換
                    if (account.currency !== defaultCurrency) {
                        try {
                            const rate = getExchangeRate(account.currency, defaultCurrency);
                            amount = amount * rate;
                        } catch (e) {
                            console.error("匯率轉換錯誤:", e);
                        }
                    }
                    
                    // 更新數據
                    if (transaction.type === 'income') {
                        incomeData[weekIndex] += amount;
                    } else {
                        expenseData[weekIndex] += amount;
                    }
                });
            } else {
                // 按月聚合
                const months = [];
                let currentMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
                
                // 生成月標籤
                while (currentMonth <= endDate) {
                    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
                    
                    const monthLabel = `${currentMonth.getFullYear()}年${currentMonth.getMonth() + 1}月`;
                    dateLabels.push(monthLabel);
                    incomeData.push(0);
                    expenseData.push(0);
                    balanceData.push(0);
                    
                    months.push({
                        start: currentMonth.toISOString().split('T')[0],
                        end: monthEnd.toISOString().split('T')[0]
                    });
                    
                    currentMonth.setMonth(currentMonth.getMonth() + 1);
                }
                
                // 填充交易數據
                appState.transactions.forEach(transaction => {
                    if (transaction.date < start || transaction.date > end) return;
                    
                    // 跳過轉賬交易
                    if (transaction.categoryId === 'transfer_in' || transaction.categoryId === 'transfer_out') return;
                    
                    // 找到所屬月
                    const monthIndex = months.findIndex(month => transaction.date >= month.start && transaction.date <= month.end);
                    if (monthIndex === -1) return;
                    
                    // 獲取賬戶和貨幣轉換
                    const account = appState.accounts.find(a => a.id === transaction.accountId);
                    if (!account) return;
                    
                    let amount = transaction.amount || 0;
                    
                    // 貨幣轉換
                    if (account.currency !== defaultCurrency) {
                        try {
                            const rate = getExchangeRate(account.currency, defaultCurrency);
                            amount = amount * rate;
                        } catch (e) {
                            console.error("匯率轉換錯誤:", e);
                        }
                    }
                    
                    // 更新數據
                    if (transaction.type === 'income') {
                        incomeData[monthIndex] += amount;
                    } else {
                        expenseData[monthIndex] += amount;
                    }
                });
            }
            
            // 計算累計餘額
            let runningBalance = 0;
            for (let i = 0; i < dateLabels.length; i++) {
                runningBalance += incomeData[i] - expenseData[i];
                balanceData[i] = runningBalance;
            }
            
            // 清除容器
            container.innerHTML = '<canvas id="trendChartCanvas"></canvas>';
            
            // 創建圖表
            const ctx = document.getElementById('trendChartCanvas').getContext('2d');
            
            // 檢查是否有先前的圖表實例並銷毀
            if (window.trendChart instanceof Chart) {
                window.trendChart.destroy();
            }
            
            // 網格和刻度顏色
            const gridColor = darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
            const tickColor = darkMode ? '#ecf0f1' : '#333';
            
            window.trendChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: dateLabels,
                    datasets: [
                        {
                            label: '收入',
                            data: incomeData,
                            backgroundColor: 'rgba(46, 204, 113, 0.7)',
                            borderColor: 'rgba(46, 204, 113, 1)',
                            borderWidth: 1,
                            order: 2
                        },
                        {
                            label: '支出',
                            data: expenseData,
                            backgroundColor: 'rgba(231, 76, 60, 0.7)',
                            borderColor: 'rgba(231, 76, 60, 1)',
                            borderWidth: 1,
                            order: 3
                        },
                        {
                            label: '累計餘額',
                            data: balanceData,
                            type: 'line',
                            borderColor: 'rgba(52, 152, 219, 1)',
                            backgroundColor: 'rgba(52, 152, 219, 0.2)',
                            borderWidth: 2,
                            pointRadius: 3,
                            fill: true,
                            order: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            grid: {
                                display: false,
                                color: gridColor
                            },
                            ticks: {
                                color: tickColor,
                                maxRotation: 45,
                                minRotation: 45
                            }
                        },
                        y: {
                            grid: {
                                color: gridColor
                            },
                            ticks: {
                                color: tickColor,
                                callback: function(value) {
                                    return formatCurrency(value, defaultCurrency).replace(currencySymbols[defaultCurrency] || defaultCurrency, '');
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: {
                                color: tickColor
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': ' + formatCurrency(context.raw, defaultCurrency);
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error("更新趨勢圖表時發生錯誤:", error);
            
            const container = document.getElementById('trendChart');
            if (container) {
                container.innerHTML = '<p class="error-message">更新趨勢圖表失敗</p>';
            }
        }
    },
    
    /**
     * 更新類別分佈圖表
     * @param {Object} dateRange 日期範圍
     */
    updateCategoryDistribution: function(dateRange) {
        try {
            const container = document.getElementById('categoryDistribution');
            if (!container) return;
            
            // 解析日期範圍
            const { start, end } = dateRange;
            
            // 按類別分組支出
            const categoryExpenses = {};
            
            // 獲取日期範圍內的支出交易
            const rangeTransactions = appState.transactions.filter(t =>
                t.type === 'expense' &&
                t.categoryId !== 'transfer_out' &&
                t.date >= start &&
                t.date <= end
            );
            
            // 如果沒有交易
            if (rangeTransactions.length === 0) {
                container.innerHTML = '<p class="empty-message">所選時期內沒有支出交易</p>';
                return;
            }
            
            // 統計每個類別的支出
            rangeTransactions.forEach(transaction => {
                const account = appState.accounts.find(a => a.id === transaction.accountId);
                if (!account) return;
                
                let amount = transaction.amount || 0;
                
                // 貨幣轉換
                if (account.currency !== defaultCurrency) {
                    try {
                        const rate = getExchangeRate(account.currency, defaultCurrency);
                        amount = amount * rate;
                    } catch (e) {
                        console.error("匯率轉換錯誤:", e);
                    }
                }
                
                // 找到類別
                const category = appState.categories.expense.find(c => c.id === transaction.categoryId);
                if (!category) return;
                
                // 更新類別支出
                if (!categoryExpenses[category.name]) {
                    categoryExpenses[category.name] = {
                        amount: 0,
                        color: category.color || '#666'
                    };
                }
                
                categoryExpenses[category.name].amount += amount;
            });
            
            // 轉換為數組並排序
            const sortedCategories = Object.entries(categoryExpenses)
                .map(([name, data]) => ({
                    name,
                    amount: data.amount,
                    color: data.color
                }))
                .sort((a, b) => b.amount - a.amount);
            
            // 準備圖表數據
            const labels = sortedCategories.map(c => c.name);
            const data = sortedCategories.map(c => c.amount);
            const colors = sortedCategories.map(c => c.color);
            
            // 清除容器
            container.innerHTML = '<canvas id="categoryDistributionCanvas"></canvas>';
            
            // 創建圖表
            const ctx = document.getElementById('categoryDistributionCanvas').getContext('2d');
            
            // 檢查是否有先前的圖表實例並銷毀
            if (window.categoryDistributionChart instanceof Chart) {
                window.categoryDistributionChart.destroy();
            }
            
            // 網格和刻度顏色
            const tickColor = darkMode ? '#ecf0f1' : '#333';
            
            window.categoryDistributionChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            data: data,
                            backgroundColor: colors,
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                color: tickColor
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.raw;
                                    const total = data.reduce((sum, val) => sum + val, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
            
            // 添加總支出信息
            const totalExpense = data.reduce((sum, val) => sum + val, 0);
            const topCategory = sortedCategories[0];
            
            const analysisHTML = `
                <div class="chart-analysis">
                    <p>總支出: <strong>${formatCurrency(totalExpense)}</strong></p>
                    <p>最大支出類別: <strong>${topCategory.name}</strong> (${formatCurrency(topCategory.amount)}, 佔總支出的 ${((topCategory.amount / totalExpense) * 100).toFixed(1)}%)</p>
                </div>
            `;
            
            container.insertAdjacentHTML('beforeend', analysisHTML);
        } catch (error) {
            console.error("更新類別分佈圖表時發生錯誤:", error);
            
            const container = document.getElementById('categoryDistribution');
            if (container) {
                container.innerHTML = '<p class="error-message">更新類別分佈失敗</p>';
            }
        }
    },
    
    /**
     * 更新收支對比圖表
     * @param {Object} dateRange 日期範圍
     */
    updateComparisonChart: function(dateRange) {
        try {
            const container = document.getElementById('comparisonChart');
            if (!container) return;
            
            // 解析日期範圍
            const { start, end } = dateRange;
            const startDate = new Date(start);
            const endDate = new Date(end);
            
            // 計算收入和支出
            let totalIncome = 0;
            let totalExpense = 0;
            
            // 獲取日期範圍內的交易
            const rangeTransactions = appState.transactions.filter(t =>
                t.date >= start &&
                t.date <= end &&
                t.categoryId !== 'transfer_in' &&
                t.categoryId !== 'transfer_out'
            );
            
            // 如果沒有交易
            if (rangeTransactions.length === 0) {
                container.innerHTML = '<p class="empty-message">所選時期內沒有交易記錄</p>';
                return;
            }
            
            // 統計收入和支出
            rangeTransactions.forEach(transaction => {
                const account = appState.accounts.find(a => a.id === transaction.accountId);
                if (!account) return;
                
                let amount = transaction.amount || 0;
                
                // 貨幣轉換
                if (account.currency !== defaultCurrency) {
                    try {
                        const rate = getExchangeRate(account.currency, defaultCurrency);
                        amount = amount * rate;
                    } catch (e) {
                        console.error("匯率轉換錯誤:", e);
                    }
                }
                
                // 更新總額
                if (transaction.type === 'income') {
                    totalIncome += amount;
                } else {
                    totalExpense += amount;
                }
            });
            
            // 清除容器
            container.innerHTML = '<canvas id="comparisonChartCanvas"></canvas>';
            
            // 創建圖表
            const ctx = document.getElementById('comparisonChartCanvas').getContext('2d');
            
            // 檢查是否有先前的圖表實例並銷毀
            if (window.comparisonChart instanceof Chart) {
                window.comparisonChart.destroy();
            }
            
            // 網格和刻度顏色
            const gridColor = darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
            const tickColor = darkMode ? '#ecf0f1' : '#333';
            
            window.comparisonChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['收入', '支出'],
                    datasets: [
                        {
                            data: [totalIncome, totalExpense],
                            backgroundColor: ['rgba(46, 204, 113, 0.7)', 'rgba(231, 76, 60, 0.7)'],
                            borderColor: ['rgba(46, 204, 113, 1)', 'rgba(231, 76, 60, 1)'],
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            grid: {
                                display: false,
                                color: gridColor
                            },
                            ticks: {
                                color: tickColor
                            }
                        },
                        y: {
                            grid: {
                                color: gridColor
                            },
                            ticks: {
                                color: tickColor,
                                callback: function(value) {
                                    return formatCurrency(value, defaultCurrency).replace(currencySymbols[defaultCurrency] || defaultCurrency, '');
                                }
                            },
                            beginAtZero: true
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return formatCurrency(context.raw, defaultCurrency);
                                }
                            }
                        }
                    }
                }
            });
            
            // 添加收支分析
            const balance = totalIncome - totalExpense;
            const savingRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;
            
            // 時間跨度描述
            let periodDescription = '';
            const daysSpan = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
            
            if (daysSpan <= 31) {
                periodDescription = `${daysSpan}天`;
            } else if (daysSpan <= 93) {
                const weeks = Math.ceil(daysSpan / 7);
                periodDescription = `${weeks}週`;
            } else {
                const months = Math.ceil(daysSpan / 30);
                periodDescription = `${months}個月`;
            }
            
            const analysisHTML = `
                <div class="chart-analysis">
                    <p>時間跨度: <strong>${periodDescription}</strong> (${start} 至 ${end})</p>
                    <p>總收入: <strong>${formatCurrency(totalIncome)}</strong></p>
                    <p>總支出: <strong>${formatCurrency(totalExpense)}</strong></p>
                    <p>淨收入: <strong>${formatCurrency(balance)}</strong> (儲蓄率: ${savingRate.toFixed(1)}%)</p>
                </div>
            `;
            
            container.insertAdjacentHTML('beforeend', analysisHTML);
        } catch (error) {
            console.error("更新收支對比圖表時發生錯誤:", error);
            
            const container = document.getElementById('comparisonChart');
            if (container) {
                container.innerHTML = '<p class="error-message">更新收支對比失敗</p>';
            }
        }
    },
    
    /**
     * 生成財務洞察
     * @param {Object} dateRange 日期範圍
     */
    generateInsights: function(dateRange) {
        try {
            const container = document.getElementById('financialInsights');
            if (!container) return;
            
            // 顯示載入中
            container.innerHTML = '<div class="insight-loading">分析數據中...</div>';
            
            // 如果未傳入日期範圍，獲取當前範圍
            if (!dateRange) {
                dateRange = this.getDateRange();
            }
            
            setTimeout(() => {
                try {
                    // 計算洞察
                    const insights = this.calculateInsights(dateRange);
                    
                    // 生成HTML
                    let html = '';
                    
                    // 趨勢洞察
                    if (insights.trends) {
                        html += `
                            <div class="insight-item">
                                <div class="insight-title">
                                    <i class="fas fa-chart-line"></i>
                                    收支趨勢
                                </div>
                                <div class="insight-content">
                                    ${insights.trends}
                                </div>
                            </div>
                        `;
                    }
                    
                    // 排名洞察
                    if (insights.topCategories) {
                        html += `
                            <div class="insight-item">
                                <div class="insight-title">
                                    <i class="fas fa-trophy"></i>
                                    支出排名
                                </div>
                                <div class="insight-content">
                                    ${insights.topCategories}
                                </div>
                            </div>
                        `;
                    }
                    
                    // 儲蓄洞察
                    if (insights.savings) {
                        html += `
                            <div class="insight-item">
                                <div class="insight-title">
                                    <i class="fas fa-piggy-bank"></i>
                                    儲蓄分析
                                </div>
                                <div class="insight-content">
                                    ${insights.savings}
                                </div>
                            </div>
                        `;
                    }
                    
                    // 建議洞察
                    if (insights.suggestions) {
                        html += `
                            <div class="insight-item">
                                <div class="insight-title">
                                    <i class="fas fa-lightbulb"></i>
                                    財務建議
                                </div>
                                <div class="insight-content">
                                    ${insights.suggestions}
                                </div>
                            </div>
                        `;
                    }
                    
                    // 更新容器
                    container.innerHTML = html || '<p class="empty-message">無法生成洞察，數據可能不足</p>';
                } catch (error) {
                    console.error("生成洞察時發生錯誤:", error);
                    container.innerHTML = '<p class="error-message">生成財務洞察失敗</p>';
                }
            }, 500);
        } catch (error) {
            console.error("生成財務洞察時發生錯誤:", error);
            
            const container = document.getElementById('financialInsights');
            if (container) {
                container.innerHTML = '<p class="error-message">生成財務洞察失敗</p>';
            }
        }
    },
    
    /**
     * 計算財務洞察
     * @param {Object} dateRange 日期範圍
     * @returns {Object} 洞察結果
     */
    calculateInsights: function(dateRange) {
        // 解析日期範圍
        const { start, end } = dateRange;
        const startDate = new Date(start);
        const endDate = new Date(end);
        
        // 獲取日期範圍內的交易
        const rangeTransactions = appState.transactions.filter(t =>
            t.date >= start &&
            t.date <= end &&
            t.categoryId !== 'transfer_in' &&
            t.categoryId !== 'transfer_out'
        );
        
        // 如果沒有交易，返回空洞察
        if (rangeTransactions.length === 0) {
            return {
                trends: '所選時期內沒有交易記錄，無法分析趨勢。',
                topCategories: '所選時期內沒有支出交易，無法分析排名。',
                savings: '所選時期內沒有收支記錄，無法分析儲蓄。',
                suggestions: '請先添加更多交易記錄，以獲取更有價值的財務建議。'
            };
        }
        
        // 計算收入和支出
        let totalIncome = 0;
        let totalExpense = 0;
        
        // 類別支出統計
        const categoryExpenses = {};
        
        // 處理每筆交易
        rangeTransactions.forEach(transaction => {
            const account = appState.accounts.find(a => a.id === transaction.accountId);
            if (!account) return;
            
            let amount = transaction.amount || 0;
            
            // 貨幣轉換
            if (account.currency !== defaultCurrency) {
                try {
                    const rate = getExchangeRate(account.currency, defaultCurrency);
                    amount = amount * rate;
                } catch (e) {
                    console.error("匯率轉換錯誤:", e);
                }
            }
            
            // 更新總額
            if (transaction.type === 'income') {
                totalIncome += amount;
            } else {
                totalExpense += amount;
                
                // 更新類別支出
                const category = appState.categories.expense.find(c => c.id === transaction.categoryId);
                if (category) {
                    if (!categoryExpenses[category.name]) {
                        categoryExpenses[category.name] = 0;
                    }
                    
                    categoryExpenses[category.name] += amount;
                }
            }
        });
        
        // 計算淨收入和儲蓄率
        const netIncome = totalIncome - totalExpense;
        const savingRate = totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0;
        
        // 排序類別支出
        const sortedCategories = Object.entries(categoryExpenses)
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount);
        
        // 獲取前三名
        const topCategories = sortedCategories.slice(0, 3);
        
        // 獲取過去的交易記錄以分析趨勢
        // 計算相同長度的前一時期
        const periodDuration = endDate - startDate;
        const previousStartDate = new Date(startDate);
        previousStartDate.setTime(startDate.getTime() - periodDuration - 1); // 往前一個相同長度的時期
        const previousStart = previousStartDate.toISOString().split('T')[0];
        const previousEnd = new Date(previousStartDate.getTime() + periodDuration).toISOString().split('T')[0];
        
        // 獲取前一時期的交易
        const previousTransactions = appState.transactions.filter(t =>
            t.date >= previousStart &&
            t.date <= previousEnd &&
            t.categoryId !== 'transfer_in' &&
            t.categoryId !== 'transfer_out'
        );
        
        // 計算前一時期的收入和支出
        let previousIncome = 0;
        let previousExpense = 0;
        
        previousTransactions.forEach(transaction => {
            const account = appState.accounts.find(a => a.id === transaction.accountId);
            if (!account) return;
            
            let amount = transaction.amount || 0;
            
            // 貨幣轉換
            if (account.currency !== defaultCurrency) {
                try {
                    const rate = getExchangeRate(account.currency, defaultCurrency);
                    amount = amount * rate;
                } catch (e) {
                    console.error("匯率轉換錯誤:", e);
                }
            }
            
            if (transaction.type === 'income') {
                previousIncome += amount;
            } else {
                previousExpense += amount;
            }
        });
        
        // 計算收入和支出的變化率
        const incomeChange = previousIncome > 0 ? ((totalIncome - previousIncome) / previousIncome) * 100 : null;
        const expenseChange = previousExpense > 0 ? ((totalExpense - previousExpense) / previousExpense) * 100 : null;
        
        // 生成趨勢洞察
        let trendsInsight = '';
        
        if (incomeChange !== null && expenseChange !== null) {
            trendsInsight = `相比前一時期，您的收入${incomeChange > 0 ? '增加了' : '減少了'}${Math.abs(incomeChange).toFixed(1)}%，`;
            trendsInsight += `支出${expenseChange > 0 ? '增加了' : '減少了'}${Math.abs(expenseChange).toFixed(1)}%。`;
            
            if (incomeChange > 0 && expenseChange < 0) {
                trendsInsight += ' 您的財務狀況正在改善，收入增加且支出減少。';
            } else if (incomeChange > 0 && expenseChange > 0 && incomeChange > expenseChange) {
                trendsInsight += ' 儘管支出增加，但您的收入增長更快，整體財務狀況仍有所改善。';
            } else if (incomeChange < 0 && expenseChange > 0) {
                trendsInsight += ' 您的財務狀況需要關注，收入減少且支出增加。';
            } else if (incomeChange < 0 && expenseChange < 0 && Math.abs(incomeChange) < Math.abs(expenseChange)) {
                trendsInsight += ' 您的支出減少幅度大於收入減少幅度，這是一個積極的跡象。';
            }
        } else if (previousTransactions.length === 0) {
            trendsInsight = `在此${formatDateRange(startDate, endDate)}期間，`;
            trendsInsight += `您的總收入為${formatCurrency(totalIncome)}，總支出為${formatCurrency(totalExpense)}，`;
            trendsInsight += `淨收入為${formatCurrency(netIncome)}。`;
            trendsInsight += ` 您目前的儲蓄率為${savingRate.toFixed(1)}%。`;
        } else {
            if (incomeChange !== null) {
                trendsInsight = `相比前一時期，您的收入${incomeChange > 0 ? '增加了' : '減少了'}${Math.abs(incomeChange).toFixed(1)}%。`;
            } else if (expenseChange !== null) {
                trendsInsight = `相比前一時期，您的支出${expenseChange > 0 ? '增加了' : '減少了'}${Math.abs(expenseChange).toFixed(1)}%。`;
            }
        }
        
        // 生成類別排名洞察
        let categoriesInsight = '';
        
        if (topCategories.length > 0) {
            categoriesInsight = `您在此期間的前三大支出類別是：`;
            
            topCategories.forEach((category, index) => {
                const percentage = (category.amount / totalExpense) * 100;
                
                if (index === 0) {
                    categoriesInsight += `${category.name} (${formatCurrency(category.amount)}, 佔總支出的${percentage.toFixed(1)}%)`;
                } else if (index === topCategories.length - 1) {
                    categoriesInsight += `和${category.name} (${formatCurrency(category.amount)}, 佔總支出的${percentage.toFixed(1)}%)。`;
                } else {
                    categoriesInsight += `、${category.name} (${formatCurrency(category.amount)}, 佔總支出的${percentage.toFixed(1)}%)`;
                }
            });
            
            // 添加支出集中度分析
            if (topCategories.length > 0) {
                const topCategoryPercentage = (topCategories[0].amount / totalExpense) * 100;
                
                if (topCategoryPercentage > 50) {
                    categoriesInsight += ` 您的支出高度集中在${topCategories[0].name}類別，考慮檢視此類別的支出是否合理。`;
                } else if (topCategories.length >= 3) {
                    const top3Percentage = topCategories.slice(0, 3).reduce((sum, category) => sum + category.amount, 0) / totalExpense * 100;
                    
                    if (top3Percentage > 80) {
                        categoriesInsight += ' 您的前三大支出類別佔總支出的比例較高，可以考慮更均衡的支出分配。';
                    }
                }
            }
        } else {
            categoriesInsight = '所選時期內沒有支出交易，無法分析排名。';
        }
        
        // 生成儲蓄洞察
        let savingsInsight = '';
        
        if (savingRate >= 30) {
            savingsInsight = `您的儲蓄率為${savingRate.toFixed(1)}%，這是一個非常好的儲蓄水平。`;
            savingsInsight += ' 您可以考慮將部分儲蓄投資以獲取更高回報。';
        } else if (savingRate >= 20) {
            savingsInsight = `您的儲蓄率為${savingRate.toFixed(1)}%，這是一個不錯的儲蓄水平。`;
            savingsInsight += ' 繼續保持良好的理財習慣。';
        } else if (savingRate >= 10) {
            savingsInsight = `您的儲蓄率為${savingRate.toFixed(1)}%，這是一個基本的儲蓄水平。`;
            savingsInsight += ' 可以嘗試增加儲蓄比例以提高財務安全性。';
        } else if (savingRate > 0) {
            savingsInsight = `您的儲蓄率為${savingRate.toFixed(1)}%，低於推薦的儲蓄率。`;
            savingsInsight += ' 建議檢視非必要支出，並嘗試增加儲蓄比例。';
        } else {
            savingsInsight = `您的儲蓄率為${savingRate.toFixed(1)}%，支出超過收入。`;
            savingsInsight += ' 建議立即檢視預算並控制支出，避免長期財務壓力。';
        }
        
        if (appState.savingsGoals && appState.savingsGoals.length > 0) {
            const totalGoals = appState.savingsGoals.reduce((sum, goal) => sum + goal.target, 0);
            const totalProgress = appState.savingsGoals.reduce((sum, goal) => sum + goal.current, 0);
            const overallProgress = (totalProgress / totalGoals) * 100;
            
            savingsInsight += ` 您的儲蓄目標整體完成率為${overallProgress.toFixed(1)}%。`;
        }
        
        // 生成財務建議
        let suggestionsInsight = '';
        
        if (savingRate < 10) {
            suggestionsInsight = '以下是一些可能幫助您改善財務狀況的建議：\n';
            
            if (topCategories.length > 0) {
                suggestionsInsight += `- 檢視您在${topCategories[0].name}類別的支出，尋找可能的節約空間。\n`;
            }
            
            suggestionsInsight += '- 制定更詳細的預算計劃，並嚴格執行。\n';
            suggestionsInsight += '- 尋找增加收入的途徑，例如副業或技能提升。\n';
            
            if (savingRate < 0) {
                suggestionsInsight += '- 考慮暫時削減一些非必要支出，直到收支平衡。\n';
            }
        } else if (savingRate >= 30) {
            suggestionsInsight = '恭喜您擁有良好的財務習慣！以下是一些進一步優化的建議：\n';
            suggestionsInsight += '- 考慮將部分儲蓄用於投資，以獲取更高的長期回報。\n';
            suggestionsInsight += '- 檢視您的保險覆蓋範圍，確保有足夠的保障。\n';
            suggestionsInsight += '- 思考長期財務目標，例如退休規劃或購置資產。\n';
        } else {
            suggestionsInsight = '以下是一些可能對您有幫助的財務建議：\n';
            
            if (topCategories.length > 0 && (topCategories[0].amount / totalExpense) * 100 > 40) {
                suggestionsInsight += `- 您在${topCategories[0].name}上的支出佔比較高，可以考慮是否有優化空間。\n`;
            }
            
            if (incomeChange !== null && incomeChange < 0) {
                suggestionsInsight += '- 收入有所下降，可以考慮探索增加收入的途徑。\n';
            }
            
            if (expenseChange !== null && expenseChange > 0) {
                suggestionsInsight += '- 支出有所增加，檢視是否有非必要支出可以削減。\n';
            }
            
            suggestionsInsight += '- 試著提高儲蓄率，建議達到收入的15-20%。\n';
            suggestionsInsight += '- 定期檢視並調整預算，以適應不斷變化的財務需求。\n';
        }
        
        return {
            trends: trendsInsight,
            topCategories: categoriesInsight,
            savings: savingsInsight,
            suggestions: suggestionsInsight
        };
    }
};

/**
 * 格式化日期範圍
 * @param {Date} startDate 開始日期
 * @param {Date} endDate 結束日期
 * @returns {string} 格式化的日期範圍描述
 */
function formatDateRange(startDate, endDate) {
    // 計算天數差異
    const daysSpan = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    
    if (daysSpan <= 31) {
        return `${daysSpan}天`;
    } else if (daysSpan <= 93) {
        const weeks = Math.ceil(daysSpan / 7);
        return `${weeks}週`;
    } else {
        const months = Math.ceil(daysSpan / 30);
        return `${months}個月`;
    }
}
