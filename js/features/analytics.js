/**
 * analytics.js - 數據分析功能 (优化版)
 */

const AnalyticsManager = {
    /**
     * 初始化資料分析功能
     */
    init: function() {
        this._bindEvents();
        
        console.log('資料分析功能初始化完成');
    },
    
    /**
     * 綁定事件
     */
    _bindEvents: function() {
        // 期間選擇器 - 添加元素存在检查
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // 移除所有活動狀態
                document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
                
                // 添加活動狀態
                btn.classList.add('active');
                
                // 获取自定义期间元素，并添加存在检查
                const customPeriodElement = document.querySelector('.custom-period');
                
                // 顯示/隱藏自定義期間
                if (btn.dataset.period === 'custom' && customPeriodElement) {
                    customPeriodElement.style.display = 'flex';
                } else if (customPeriodElement) {
                    customPeriodElement.style.display = 'none';
                    
                    // 更新圖表
                    this.updateCharts(btn.dataset.period);
                }
            });
        });
        
        // 應用自定義期間按鈕 - 添加元素存在检查
        const applyCustomBtn = document.getElementById('applyCustomPeriod');
        if (applyCustomBtn) {
            applyCustomBtn.addEventListener('click', () => {
                const startDateElem = document.getElementById('analyticsStartDate');
                const endDateElem = document.getElementById('analyticsEndDate');
                
                if (!startDateElem || !endDateElem) return;
                
                const startDate = startDateElem.value;
                const endDate = endDateElem.value;
                
                if (!startDate || !endDate) {
                    if (typeof Utils !== 'undefined' && Utils.showToast) {
                        Utils.showToast('請選擇起始和結束日期', 'error');
                    } else {
                        alert('請選擇起始和結束日期');
                    }
                    return;
                }
                
                if (new Date(startDate) > new Date(endDate)) {
                    if (typeof Utils !== 'undefined' && Utils.showToast) {
                        Utils.showToast('起始日期不能晚於結束日期', 'error');
                    } else {
                        alert('起始日期不能晚於結束日期');
                    }
                    return;
                }
                
                this.updateCharts('custom', startDate, endDate);
            });
        }
    },
    
    /**
     * 更新所有圖表
     */
    updateCharts: function(period = 'month', startDate, endDate) {
        // 根據期間計算日期範圍
        let dateRange;
        
        switch (period) {
            case 'month':
                dateRange = this._getMonthRange();
                break;
                
            case 'quarter':
                dateRange = this._getQuarterRange();
                break;
                
            case 'year':
                dateRange = this._getYearRange();
                break;
                
            case 'custom':
                dateRange = { start: startDate, end: endDate };
                break;
                
            default:
                dateRange = this._getMonthRange();
        }
        
        // 更新各圖表 - 添加错误处理
        try {
            this.updateTrendChart(dateRange);
        } catch (error) {
            console.error('更新趨勢圖表時出錯:', error);
        }
        
        try {
            this.updateCategoryDistribution(dateRange);
        } catch (error) {
            console.error('更新類別分佈時出錯:', error);
        }
        
        try {
            this.updateComparisonChart(dateRange);
        } catch (error) {
            console.error('更新收支對比時出錯:', error);
        }
        
        try {
            this.updateFinancialInsights(dateRange);
        } catch (error) {
            console.error('更新財務洞察時出錯:', error);
        }
    },
    
    // 其余方法保持不变，但需要添加类似的安全检查...
    
    /**
     * 取得本月日期範圍
     */
    _getMonthRange: function() {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        return {
            start: Utils.formatDate(firstDay),
            end: Utils.formatDate(lastDay)
        };
    },
    
    /**
     * 取得本季日期範圍
     */
    _getQuarterRange: function() {
        const now = new Date();
        const quarter = Math.floor(now.getMonth() / 3);
        const firstDay = new Date(now.getFullYear(), quarter * 3, 1);
        const lastDay = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
        
        return {
            start: Utils.formatDate(firstDay),
            end: Utils.formatDate(lastDay)
        };
    },
    
    /**
     * 取得本年日期範圍
     */
    _getYearRange: function() {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), 0, 1);
        const lastDay = new Date(now.getFullYear(), 11, 31);
        
        return {
            start: Utils.formatDate(firstDay),
            end: Utils.formatDate(lastDay)
        };
    },
    
    /**
     * 更新趨勢圖表
     */
    updateTrendChart: function(dateRange) {
        // 取得容器
        const chartContainer = document.getElementById('trendChart');
        
        // 顯示載入中
        chartContainer.innerHTML = `
            <div class="chart-loading">
                <div class="spinner"></div>
                <p>載入中...</p>
            </div>
        `;
        
        // 取得交易資料
        const transactions = Store.getTransactions({
            startDate: dateRange.start,
            endDate: dateRange.end
        });
        
        // 如果沒有資料，顯示提示訊息
        if (transactions.length === 0) {
            chartContainer.innerHTML = '<p class="empty-message">所選期間內無交易資料</p>';
            return;
        }
        
        // 按日期分組資料
        const dataByDate = {};
        
        // 產生日期序列
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        const dateSequence = [];
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateString = Utils.formatDate(d);
            dateSequence.push(dateString);
            dataByDate[dateString] = { income: 0, expense: 0 };
        }
        
        // 填充資料
        transactions.forEach(tx => {
            if (tx.type === 'income') {
                dataByDate[tx.date].income += tx.amount;
            } else if (tx.type === 'expense') {
                dataByDate[tx.date].expense += tx.amount;
            }
        });
        
        // 準備圖表資料
        const incomeData = [];
        const expenseData = [];
        
        dateSequence.forEach(date => {
            incomeData.push(dataByDate[date].income);
            expenseData.push(dataByDate[date].expense);
        });
        
        // 如果日期過多，進行聚合
        let aggregatedLabels = dateSequence;
        let aggregatedIncome = incomeData;
        let aggregatedExpense = expenseData;
        
        if (dateSequence.length > 30) {
            const aggregated = this._aggregateData(dateSequence, incomeData, expenseData);
            aggregatedLabels = aggregated.labels;
            aggregatedIncome = aggregated.income;
            aggregatedExpense = aggregated.expense;
        }
        
        // 清除載入中
        chartContainer.innerHTML = '<canvas id="trendChartCanvas"></canvas>';
        
        // 建立圖表
        const ctx = document.getElementById('trendChartCanvas').getContext('2d');
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: aggregatedLabels,
                datasets: [
                    {
                        label: '收入',
                        data: aggregatedIncome,
                        backgroundColor: 'rgba(46, 204, 113, 0.2)',
                        borderColor: 'rgba(46, 204, 113, 1)',
                        borderWidth: 2,
                        pointRadius: 3,
                        tension: 0.1
                    },
                    {
                        label: '支出',
                        data: aggregatedExpense,
                        backgroundColor: 'rgba(231, 76, 60, 0.2)',
                        borderColor: 'rgba(231, 76, 60, 1)',
                        borderWidth: 2,
                        pointRadius: 3,
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return Utils.formatCurrency(value, Store.settings.defaultCurrency, 0);
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.parsed.y;
                                return `${label}: ${Utils.formatCurrency(value, Store.settings.defaultCurrency)}`;
                            }
                        }
                    }
                }
            }
        });
    },
    
    /**
     * 更新類別分佈圖表
     */
    updateCategoryDistribution: function(dateRange) {
        // 取得容器
        const chartContainer = document.getElementById('categoryDistribution');
        
        // 顯示載入中
        chartContainer.innerHTML = `
            <div class="chart-loading">
                <div class="spinner"></div>
                <p>載入中...</p>
            </div>
        `;
        
        // 取得交易資料
        const transactions = Store.getTransactions({
            type: 'expense',
            startDate: dateRange.start,
            endDate: dateRange.end
        });
        
        // 如果沒有資料，顯示提示訊息
        if (transactions.length === 0) {
            chartContainer.innerHTML = '<p class="empty-message">所選期間內無支出交易資料</p>';
            return;
        }
        
        // 按類別分組資料
        const dataByCategory = {};
        
        transactions.forEach(tx => {
            const category = Store.getCategory(tx.categoryId);
            if (!category) return;
            
            if (!dataByCategory[category.name]) {
                dataByCategory[category.name] = {
                    amount: 0,
                    color: category.color
                };
            }
            
            dataByCategory[category.name].amount += tx.amount;
        });
        
        // 準備圖表資料
        const labels = Object.keys(dataByCategory);
        const data = labels.map(label => dataByCategory[label].amount);
        const colors = labels.map(label => dataByCategory[label].color);
        
        // 清除載入中
        chartContainer.innerHTML = '<canvas id="categoryDistributionCanvas"></canvas>';
        
        // 建立圖表
        const ctx = document.getElementById('categoryDistributionCanvas').getContext('2d');
        
        new Chart(ctx, {
            type: 'polarArea',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            font: {
                                size: 11
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${Utils.formatCurrency(value, Store.settings.defaultCurrency)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    },
    
    /**
     * 更新收支對比圖表
     */
    updateComparisonChart: function(dateRange) {
        // 取得容器
        const chartContainer = document.getElementById('comparisonChart');
        
        // 顯示載入中
        chartContainer.innerHTML = `
            <div class="chart-loading">
                <div class="spinner"></div>
                <p>載入中...</p>
            </div>
        `;
        
        // 取得交易資料
        const transactions = Store.getTransactions({
            startDate: dateRange.start,
            endDate: dateRange.end
        });
        
        // 如果沒有資料，顯示提示訊息
        if (transactions.length === 0) {
            chartContainer.innerHTML = '<p class="empty-message">所選期間內無交易資料</p>';
            return;
        }
        
        // 計算日期範圍長度
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        const daysDiff = Math.round((end - start) / (1000 * 60 * 60 * 24));
        
        // 根據日期範圍長度決定分組粒度
        let groupBy;
        if (daysDiff <= 31) {
            groupBy = 'day';
        } else if (daysDiff <= 90) {
            groupBy = 'week';
        } else {
            groupBy = 'month';
        }
        
        // 按分組粒度整理資料
        const dataGroups = this._groupTransactionsByTime(transactions, groupBy);
        
        // 準備圖表資料
        const labels = Object.keys(dataGroups);
        const incomeData = [];
        const expenseData = [];
        const balanceData = [];
        
        labels.forEach(label => {
            const group = dataGroups[label];
            incomeData.push(group.income);
            expenseData.push(group.expense);
            balanceData.push(group.income - group.expense);
        });
        
        // 清除載入中
        chartContainer.innerHTML = '<canvas id="comparisonChartCanvas"></canvas>';
        
        // 建立圖表
        const ctx = document.getElementById('comparisonChartCanvas').getContext('2d');
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '收入',
                        data: incomeData,
                        backgroundColor: 'rgba(46, 204, 113, 0.6)',
                        borderColor: 'rgba(46, 204, 113, 1)',
                        borderWidth: 1
                    },
                    {
                        label: '支出',
                        data: expenseData,
                        backgroundColor: 'rgba(231, 76, 60, 0.6)',
                        borderColor: 'rgba(231, 76, 60, 1)',
                        borderWidth: 1
                    },
                    {
                        label: '結餘',
                        data: balanceData,
                        type: 'line',
                        fill: false,
                        backgroundColor: 'rgba(52, 152, 219, 0.6)',
                        borderColor: 'rgba(52, 152, 219, 1)',
                        borderWidth: 2,
                        pointRadius: 3,
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return Utils.formatCurrency(value, Store.settings.defaultCurrency, 0);
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.parsed.y;
                                return `${label}: ${Utils.formatCurrency(value, Store.settings.defaultCurrency)}`;
                            }
                        }
                    }
                }
            }
        });
    },
    
    /**
     * 更新財務洞察
     */
    updateFinancialInsights: function(dateRange) {
        // 取得容器
        const insightsContainer = document.getElementById('financialInsights');
        
        // 顯示載入中
        insightsContainer.innerHTML = '<div class="insight-loading">載入中...</div>';
        
        // 取得交易資料
        const transactions = Store.getTransactions({
            startDate: dateRange.start,
            endDate: dateRange.end
        });
        
        // 如果沒有資料，顯示提示訊息
        if (transactions.length === 0) {
            insightsContainer.innerHTML = '<p class="empty-message">所選期間內無交易資料</p>';
            return;
        }
        
        // 計算分析指標
        const totalIncome = transactions
            .filter(tx => tx.type === 'income')
            .reduce((sum, tx) => sum + tx.amount, 0);
        
        const totalExpense = transactions
            .filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + tx.amount, 0);
        
        const balance = totalIncome - totalExpense;
        const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;
        
        // 取得支出類別分析
        const expenseByCategory = {};
        
        transactions.filter(tx => tx.type === 'expense').forEach(tx => {
            const category = Store.getCategory(tx.categoryId);
            if (!category) return;
            
            if (!expenseByCategory[category.name]) {
                expenseByCategory[category.name] = 0;
            }
            
            expenseByCategory[category.name] += tx.amount;
        });
        
        // 找出前三大支出類別
        const topExpenseCategories = Object.entries(expenseByCategory)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
        
        // 分析收支趨勢
        const incomeByDay = {};
        const expenseByDay = {};
        
        transactions.forEach(tx => {
            if (!incomeByDay[tx.date]) {
                incomeByDay[tx.date] = 0;
                expenseByDay[tx.date] = 0;
            }
            
            if (tx.type === 'income') {
                incomeByDay[tx.date] += tx.amount;
            } else if (tx.type === 'expense') {
                expenseByDay[tx.date] += tx.amount;
            }
        });
        
        // 計算平均每日收支
        const dayCount = Object.keys(incomeByDay).length;
        const avgDailyIncome = totalIncome / dayCount;
        const avgDailyExpense = totalExpense / dayCount;
        
        // 生成洞察
        let insights = '';
        
        // 總覽
        insights += `
            <div class="insight-section">
                <h4>期間總覽 (${dateRange.start} 至 ${dateRange.end})</h4>
                <div class="insight-stats">
                    <div class="insight-stat-item">
                        <div class="stat-label">總收入</div>
                        <div class="stat-value income">${Utils.formatCurrency(totalIncome, Store.settings.defaultCurrency)}</div>
                    </div>
                    <div class="insight-stat-item">
                        <div class="stat-label">總支出</div>
                        <div class="stat-value expense">${Utils.formatCurrency(totalExpense, Store.settings.defaultCurrency)}</div>
                    </div>
                    <div class="insight-stat-item">
                        <div class="stat-label">結餘</div>
                        <div class="stat-value ${balance >= 0 ? 'income' : 'expense'}">${Utils.formatCurrency(balance, Store.settings.defaultCurrency)}</div>
                    </div>
                </div>
            </div>
        `;
        
        // 儲蓄率
        insights += `
            <div class="insight-section">
                <h4>儲蓄分析</h4>
                <p>期間儲蓄率: <strong>${savingsRate.toFixed(1)}%</strong></p>
                <p>${this._getSavingsRateComment(savingsRate)}</p>
            </div>
        `;
        
        // 支出分析
        if (topExpenseCategories.length > 0) {
            insights += `
                <div class="insight-section">
                    <h4>支出分析</h4>
                    <p>前三大支出類別:</p>
                    <ul>
            `;
            
            topExpenseCategories.forEach(([category, amount]) => {
                const percentage = (amount / totalExpense) * 100;
                insights += `<li><strong>${category}</strong>: ${Utils.formatCurrency(amount, Store.settings.defaultCurrency)} (${percentage.toFixed(1)}%)</li>`;
            });
            
            insights += `
                    </ul>
                </div>
            `;
        }
        
        // 每日平均
        insights += `
            <div class="insight-section">
                <h4>每日平均</h4>
                <p>平均每日收入: <strong>${Utils.formatCurrency(avgDailyIncome, Store.settings.defaultCurrency)}</strong></p>
                <p>平均每日支出: <strong>${Utils.formatCurrency(avgDailyExpense, Store.settings.defaultCurrency)}</strong></p>
            </div>
        `;
        
        // 建議
        insights += `
            <div class="insight-section">
                <h4>財務建議</h4>
                <ul>
                    ${this._getFinancialAdvice(savingsRate, topExpenseCategories, totalExpense)}
                </ul>
            </div>
        `;
        
        // 更新洞察內容
        insightsContainer.innerHTML = insights;
    },
    
    /**
     * 聚合資料 (用於趨勢圖表)
     */
    _aggregateData: function(dates, incomeData, expenseData) {
        // 根據日期範圍決定聚合方式
        const totalDays = dates.length;
        
        if (totalDays <= 30) {
            // 無需聚合
            return {
                labels: dates,
                income: incomeData,
                expense: expenseData
            };
        } else if (totalDays <= 90) {
            // 按週聚合
            return this._aggregateByWeek(dates, incomeData, expenseData);
        } else {
            // 按月聚合
            return this._aggregateByMonth(dates, incomeData, expenseData);
        }
    },
    
    /**
     * 按週聚合資料
     */
    _aggregateByWeek: function(dates, incomeData, expenseData) {
        const weeklyData = {};
        
        dates.forEach((date, index) => {
            const dateObj = new Date(date);
            const year = dateObj.getFullYear();
            const weekNumber = this._getWeekNumber(dateObj);
            const weekKey = `${year}-W${weekNumber}`;
            
            if (!weeklyData[weekKey]) {
                weeklyData[weekKey] = { income: 0, expense: 0 };
            }
            
            weeklyData[weekKey].income += incomeData[index] || 0;
            weeklyData[weekKey].expense += expenseData[index] || 0;
        });
        
        const sortedKeys = Object.keys(weeklyData).sort();
        
        return {
            labels: sortedKeys,
            income: sortedKeys.map(key => weeklyData[key].income),
            expense: sortedKeys.map(key => weeklyData[key].expense)
        };
    },
    
    /**
     * 按月聚合資料
     */
    _aggregateByMonth: function(dates, incomeData, expenseData) {
        const monthlyData = {};
        
        dates.forEach((date, index) => {
            const yearMonth = date.substring(0, 7); // YYYY-MM
            
            if (!monthlyData[yearMonth]) {
                monthlyData[yearMonth] = { income: 0, expense: 0 };
            }
            
            monthlyData[yearMonth].income += incomeData[index] || 0;
            monthlyData[yearMonth].expense += expenseData[index] || 0;
        });
        
        const sortedKeys = Object.keys(monthlyData).sort();
        
        return {
            labels: sortedKeys,
            income: sortedKeys.map(key => monthlyData[key].income),
            expense: sortedKeys.map(key => monthlyData[key].expense)
        };
    },
    
    /**
     * 取得週數
     */
    _getWeekNumber: function(date) {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    },
    
    /**
     * 按時間分組交易
     */
    _groupTransactionsByTime: function(transactions, groupBy) {
        const groups = {};
        
        transactions.forEach(tx => {
            let groupKey;
            const txDate = new Date(tx.date);
            
            if (groupBy === 'day') {
                groupKey = tx.date;
            } else if (groupBy === 'week') {
                const year = txDate.getFullYear();
                const weekNumber = this._getWeekNumber(txDate);
                groupKey = `${year}-W${weekNumber}`;
            } else if (groupBy === 'month') {
                groupKey = tx.date.substring(0, 7); // YYYY-MM
            }
            
            if (!groups[groupKey]) {
                groups[groupKey] = { income: 0, expense: 0 };
            }
            
            if (tx.type === 'income') {
                groups[groupKey].income += tx.amount;
            } else if (tx.type === 'expense') {
                groups[groupKey].expense += tx.amount;
            }
        });
        
        return groups;
    },
    
    /**
     * 取得儲蓄率評論
     */
    _getSavingsRateComment: function(savingsRate) {
        if (savingsRate >= 50) {
            return '極高的儲蓄率！維持這個水平，長期財務自由指日可待。';
        } else if (savingsRate >= 30) {
            return '優秀的儲蓄率，這個水平可以快速累積財富。';
        } else if (savingsRate >= 20) {
            return '良好的儲蓄率，超過了建議的15-20%目標。';
        } else if (savingsRate >= 15) {
            return '健康的儲蓄率，符合財務專家建議的15-20%目標。';
        } else if (savingsRate >= 10) {
            return '一般的儲蓄率，但還有提升空間。嘗試增加至15-20%。';
        } else if (savingsRate >= 0) {
            return '儲蓄率偏低，建議檢視支出並增加儲蓄比例至少達到10-15%。';
        } else {
            return '期間支出超過收入，這不是可持續的財務狀態。建議立即審視支出。';
        }
    },
    
    /**
     * 取得財務建議
     */
    _getFinancialAdvice: function(savingsRate, topExpenseCategories, totalExpense) {
        let advice = '';
        
        // 儲蓄率建議
        if (savingsRate < 10) {
            advice += '<li>考慮增加儲蓄率至少達到10%，理想目標是15-20%。</li>';
        }
        
        // 支出分析建議
        if (topExpenseCategories.length > 0) {
            const [topCategory, topAmount] = topExpenseCategories[0];
            const topPercentage = (topAmount / totalExpense) * 100;
            
            if (topPercentage > 40) {
                advice += `<li>你的${topCategory}支出佔總支出的${topPercentage.toFixed(1)}%，比例較高。嘗試尋找節省的空間。</li>`;
            }
        }
        
        // 預算建議
        const budgetCount = Store.budgets.length;
        if (budgetCount === 0) {
            advice += '<li>你還沒有設置預算，建立預算有助於控制支出。</li>';
        }
        
        // 資產配置建議
        const accounts = Store.getAccounts();
        const accountTypes = new Set(accounts.map(account => account.type));
        
        if (accountTypes.size < 3) {
            advice += '<li>考慮多元化你的資產配置，包括現金、投資和應急資金。</li>';
        }
        
        // 一般建議
        if (advice === '') {
            advice += '<li>繼續保持良好的財務習慣，考慮增加投資比例以加速財富增長。</li>';
        }
        
        advice += '<li>定期檢視你的財務狀況，至少每月一次。</li>';
        
        return advice;
    },
    
    /**
     * 重新整理資料分析
     */
    refresh: function() {
        // 設定預設日期
        const defaultRange = this._getMonthRange();
        document.getElementById('analyticsStartDate').value = defaultRange.start;
        document.getElementById('analyticsEndDate').value = defaultRange.end;
        
        // 更新圖表
        this.updateCharts('month');
    }
};