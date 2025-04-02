// ui-charts.js - 圖表UI相關

/**
 * 載入Chart.js
 * @returns {Promise} 加載成功的Promise
 */
function loadChartJs() {
    return new Promise((resolve, reject) => {
        if (typeof Chart !== 'undefined') {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Chart.js'));
        document.head.appendChild(script);
    });
}

/**
 * 更新統計UI
 */
function updateStatisticsUI() {
    console.log("更新統計UI");

    try {
        // 顯示加載中
        const incomeChartContainer = document.getElementById('incomeChart');
        const expenseChartContainer = document.getElementById('expenseChart');
        
        if (incomeChartContainer) {
            incomeChartContainer.innerHTML = '<div class="chart-loading"><div class="spinner"></div><p>載入中...</p></div>';
        }
        
        if (expenseChartContainer) {
            expenseChartContainer.innerHTML = '<div class="chart-loading"><div class="spinner"></div><p>載入中...</p></div>';
        }

        // 非阻塞加載圖表
        setTimeout(() => {
            // 檢查 Chart.js 是否已加載
            if (typeof Chart === 'undefined') {
                // 使用動態加載 Chart.js
                loadChartJs().then(() => {
                    // 生成收入統計圖表
                    generateIncomeChart();
                    // 生成支出統計圖表
                    generateExpenseChart();
                }).catch(error => {
                    console.error("載入 Chart.js 時發生錯誤:", error);
                    
                    if (incomeChartContainer) {
                        incomeChartContainer.innerHTML = '<p class="error-message">載入圖表庫失敗，無法顯示統計</p>';
                    }
                    
                    if (expenseChartContainer) {
                        expenseChartContainer.innerHTML = '<p class="error-message">載入圖表庫失敗，無法顯示統計</p>';
                    }
                });
            } else {
                // Chart.js 已載入，直接生成圖表
                generateIncomeChart();
                generateExpenseChart();
            }
            
            // 如果有高級數據分析模塊
            if (typeof window.analytics !== 'undefined' && typeof window.analytics.initAnalytics === 'function') {
                // 檢查是否在數據分析頁面
                if (document.getElementById('dataAnalytics') && 
                    document.getElementById('dataAnalytics').classList.contains('active')) {
                    window.analytics.initAnalytics();
                }
            }
        }, 100);
    } catch (error) {
        console.error("更新統計UI時發生錯誤:", error);
        
        // 錯誤恢復
        const errorMessage = '<p class="error-message">更新統計圖表時發生錯誤，請稍後再試</p>';
        
        if (document.getElementById('incomeChart')) {
            document.getElementById('incomeChart').innerHTML = errorMessage;
        }
        
        if (document.getElementById('expenseChart')) {
            document.getElementById('expenseChart').innerHTML = errorMessage;
        }
    }
}

/**
 * 生成收入統計圖表
 */
function generateIncomeChart() {
    console.log("生成收入統計圖表");
    
    try {
        // 檢查Chart.js是否已加載
        if (typeof Chart === 'undefined') {
            console.error("Chart.js 未正確載入");
            const incomeChartContainer = document.getElementById('incomeChart');
            if (incomeChartContainer) {
                incomeChartContainer.innerHTML = '<p class="error-message">圖表庫未加載，無法顯示統計</p>';
            }
            return;
        }
        
        const incomeChartContainer = document.getElementById('incomeChart');

        if (!incomeChartContainer) {
            console.error("找不到收入圖表容器元素");
            return;
        }

        // 獲取當前月份的交易
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // 月份從0開始，所以+1

        // 構建月份範圍(yyyy-mm-01到yyyy-mm-31)
        const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
        const lastDay = new Date(currentYear, currentMonth, 0).getDate(); // 獲取當月的最後一天
        const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        // 篩選本月的收入交易
        const monthlyIncomeTransactions = appState.transactions.filter(t =>
            t.type === 'income' &&
            t.categoryId !== 'transfer_in' &&
            t.date >= startDate &&
            t.date <= endDate
        );

        // 如果沒有收入交易，顯示提示
        if (monthlyIncomeTransactions.length === 0) {
            incomeChartContainer.innerHTML = '<p class="empty-message">沒有收入分佈數據</p>';
            return;
        }

        // 按類別分組收入
        const incomeByCategory = {};

        monthlyIncomeTransactions.forEach(transaction => {
            const account = appState.accounts.find(a => a.id === transaction.accountId);

            if (!account) {
                return;
            }

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

            // 找到類別名稱
            let categoryName = '未知類別';
            let categoryColor = '#999';

            const category = appState.categories.income.find(c => c.id === transaction.categoryId);

            if (category) {
                categoryName = category.name;
                categoryColor = category.color;
            }

            // 更新分組數據
            if (!incomeByCategory[categoryName]) {
                incomeByCategory[categoryName] = {
                    amount: 0,
                    color: categoryColor
                };
            }

            incomeByCategory[categoryName].amount += amount;
        });

        // 準備圖表數據
        const labels = Object.keys(incomeByCategory);
        const data = labels.map(label => incomeByCategory[label].amount);
        const backgroundColor = labels.map(label => incomeByCategory[label].color);

        // 清除容器
        incomeChartContainer.innerHTML = '<canvas id="incomeChartCanvas"></canvas>';

        // 創建圖表
        const ctx = document.getElementById('incomeChartCanvas').getContext('2d');

        // 檢查是否有先前的圖表實例並銷毀
        if (window.incomeChart instanceof Chart) {
            window.incomeChart.destroy();
        }

        window.incomeChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColor,
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
                            color: darkMode ? '#ecf0f1' : '#333'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${formatCurrency(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error("生成收入統計圖表時發生錯誤:", error);
        const incomeChartContainer = document.getElementById('incomeChart');
        if (incomeChartContainer) {
            incomeChartContainer.innerHTML = '<p class="error-message">生成圖表時出錯</p>';
        }
    }
}

/**
 * 生成支出統計圖表
 */
function generateExpenseChart() {
    console.log("生成支出統計圖表");

    try {
        // 檢查Chart.js是否已加載
        if (typeof Chart === 'undefined') {
            console.error("Chart.js 未正確載入");
            const expenseChartContainer = document.getElementById('expenseChart');
            if (expenseChartContainer) {
                expenseChartContainer.innerHTML = '<p class="error-message">圖表庫未加載，無法顯示統計</p>';
            }
            return;
        }
        
        const expenseChartContainer = document.getElementById('expenseChart');

        if (!expenseChartContainer) {
            console.error("找不到支出圖表容器元素");
            return;
        }

        // 獲取當前月份的交易
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // 月份從0開始，所以+1

        // 構建月份範圍(yyyy-mm-01到yyyy-mm-31)
        const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
        const lastDay = new Date(currentYear, currentMonth, 0).getDate(); // 獲取當月的最後一天
        const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        // 篩選本月的支出交易
        const monthlyExpenseTransactions = appState.transactions.filter(t =>
            t.type === 'expense' &&
            t.categoryId !== 'transfer_out' &&
            t.date >= startDate &&
            t.date <= endDate
        );

        // 如果沒有支出交易，顯示提示
        if (monthlyExpenseTransactions.length === 0) {
            expenseChartContainer.innerHTML = '<p class="empty-message">沒有支出分佈數據</p>';
            return;
        }

        // 按類別分組支出
        const expenseByCategory = {};

        monthlyExpenseTransactions.forEach(transaction => {
            const account = appState.accounts.find(a => a.id === transaction.accountId);

            if (!account) {
                return;
            }

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

            // 找到類別名稱
            let categoryName = '未知類別';
            let categoryColor = '#999';

            const category = appState.categories.expense.find(c => c.id === transaction.categoryId);

            if (category) {
                categoryName = category.name;
                categoryColor = category.color;
            }

            // 更新分組數據
            if (!expenseByCategory[categoryName]) {
                expenseByCategory[categoryName] = {
                    amount: 0,
                    color: categoryColor
                };
            }

            expenseByCategory[categoryName].amount += amount;
        });

        // 準備圖表數據
        const labels = Object.keys(expenseByCategory);
        const data = labels.map(label => expenseByCategory[label].amount);
        const backgroundColor = labels.map(label => expenseByCategory[label].color);

        // 清除容器
        expenseChartContainer.innerHTML = '<canvas id="expenseChartCanvas"></canvas>';

        // 創建圖表
        const ctx = document.getElementById('expenseChartCanvas').getContext('2d');

        // 檢查是否有先前的圖表實例並銷毀
        if (window.expenseChart instanceof Chart) {
            window.expenseChart.destroy();
        }

        window.expenseChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColor,
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
                            color: darkMode ? '#ecf0f1' : '#333'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${formatCurrency(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });

        // 添加額外的分析內容 - 例如最大支出類別
        if (labels.length > 0) {
            // 找出最大支出類別
            let maxCategory = labels[0];
            let maxAmount = data[0];
            
            for (let i = 1; i < labels.length; i++) {
                if (data[i] > maxAmount) {
                    maxCategory = labels[i];
                    maxAmount = data[i];
                }
            }
            
            // 計算總支出
            const totalExpense = data.reduce((a, b) => a + b, 0);
            
            // 添加分析信息
            expenseChartContainer.insertAdjacentHTML('beforeend', `
                <div class="chart-analysis">
                    <p>本月總支出: <strong>${formatCurrency(totalExpense)}</strong></p>
                    <p>最大支出類別: <strong>${maxCategory}</strong> (${formatCurrency(maxAmount)}, 佔總支出的 ${Math.round((maxAmount / totalExpense) * 100)}%)</p>
                </div>
            `);
        }
    } catch (error) {
        console.error("生成支出統計圖表時發生錯誤:", error);
        const expenseChartContainer = document.getElementById('expenseChart');
        if (expenseChartContainer) {
            expenseChartContainer.innerHTML = '<p class="error-message">生成圖表時出錯</p>';
        }
    }
}

/**
 * 生成月度比較圖表
 * @param {HTMLElement} container 圖表容器元素
 * @param {number} months 顯示的月份數
 */
function generateMonthlyComparisonChart(container, months = 6) {
    try {
        // 檢查Chart.js是否已加載
        if (typeof Chart === 'undefined') {
            container.innerHTML = '<p class="error-message">圖表庫未加載，無法顯示統計</p>';
            return;
        }
        
        // 獲取最近幾個月的日期範圍
        const now = new Date();
        const monthLabels = [];
        const monthRanges = [];
        
        for (let i = months - 1; i >= 0; i--) {
            const year = now.getFullYear();
            const month = now.getMonth() - i;
            
            // 處理月份跨年情況
            let adjustedYear = year;
            let adjustedMonth = month;
            
            if (month < 0) {
                adjustedYear = year - 1;
                adjustedMonth = 12 + month;
            }
            
            // 生成月份標籤(例如: 2023年1月)
            const monthLabel = `${adjustedYear}年${adjustedMonth + 1}月`;
            monthLabels.push(monthLabel);
            
            // 生成日期範圍
            const startDate = new Date(adjustedYear, adjustedMonth, 1);
            const endDate = new Date(adjustedYear, adjustedMonth + 1, 0);
            
            const startDateFormatted = startDate.toISOString().split('T')[0];
            const endDateFormatted = endDate.toISOString().split('T')[0];
            
            monthRanges.push({
                start: startDateFormatted,
                end: endDateFormatted
            });
        }
        
        // 計算每月收入和支出
        const incomeData = [];
        const expenseData = [];
        
        monthRanges.forEach(range => {
            const monthTransactions = appState.transactions.filter(t =>
                t.date >= range.start &&
                t.date <= range.end &&
                t.categoryId !== 'transfer_in' &&
                t.categoryId !== 'transfer_out'
            );
            
            let monthlyIncome = 0;
            let monthlyExpense = 0;
            
            monthTransactions.forEach(transaction => {
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
                    monthlyIncome += amount;
                } else {
                    monthlyExpense += amount;
                }
            });
            
            incomeData.push(monthlyIncome);
            expenseData.push(monthlyExpense);
        });
        
        // 清除容器
        container.innerHTML = '<canvas id="monthlyComparisonChart"></canvas>';
        
        // 生成圖表
        const ctx = document.getElementById('monthlyComparisonChart').getContext('2d');
        
        // 檢查是否有先前的圖表實例並銷毀
        if (window.monthlyComparisonChart instanceof Chart) {
            window.monthlyComparisonChart.destroy();
        }
        
        window.monthlyComparisonChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: monthLabels,
                datasets: [
                    {
                        label: '收入',
                        data: incomeData,
                        backgroundColor: 'rgba(46, 204, 113, 0.7)',
                        borderColor: 'rgba(46, 204, 113, 1)',
                        borderWidth: 1
                    },
                    {
                        label: '支出',
                        data: expenseData,
                        backgroundColor: 'rgba(231, 76, 60, 0.7)',
                        borderColor: 'rgba(231, 76, 60, 1)',
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
                            color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            color: darkMode ? '#ecf0f1' : '#333'
                        }
                    },
                    y: {
                        grid: {
                            color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            color: darkMode ? '#ecf0f1' : '#333',
                            callback: function(value) {
                                return formatCurrency(value, defaultCurrency).replace(currencySymbols[defaultCurrency] || defaultCurrency, '');
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: darkMode ? '#ecf0f1' : '#333'
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
        
        // 添加分析
        const totalIncome = incomeData.reduce((a, b) => a + b, 0);
        const totalExpense = expenseData.reduce((a, b) => a + b, 0);
        const savings = totalIncome - totalExpense;
        const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;
        
        // 添加分析信息
        container.insertAdjacentHTML('beforeend', `
            <div class="chart-analysis">
                <p>${months}個月總收入: <strong>${formatCurrency(totalIncome)}</strong></p>
                <p>${months}個月總支出: <strong>${formatCurrency(totalExpense)}</strong></p>
                <p>${months}個月總儲蓄: <strong>${formatCurrency(savings)}</strong> (儲蓄率: ${savingsRate.toFixed(1)}%)</p>
            </div>
        `);
    } catch (error) {
        console.error("生成月度比較圖表時發生錯誤:", error);
        container.innerHTML = '<p class="error-message">生成圖表時出錯</p>';
    }
}

// 導出函數
window.loadChartJs = loadChartJs;
window.updateStatisticsUI = updateStatisticsUI;
window.generateIncomeChart = generateIncomeChart;
window.generateExpenseChart = generateExpenseChart;
window.generateMonthlyComparisonChart = generateMonthlyComparisonChart;