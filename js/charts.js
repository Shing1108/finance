// 統計圖表生成相關功能

// 加載Chart.js
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

// 生成收入統計圖表
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

            if (transaction.categoryId === 'transfer_in') {
                categoryName = '轉賬收入';
                categoryColor = '#27ae60';
            } else {
                const category = appState.categories.income.find(c => c.id === transaction.categoryId);

                if (category) {
                    categoryName = category.name;
                    categoryColor = category.color;
                }
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

// 生成支出統計圖表
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

            if (transaction.categoryId === 'transfer_out') {
                categoryName = '轉賬支出';
                categoryColor = '#e67e22';
            } else {
                const category = appState.categories.expense.find(c => c.id === transaction.categoryId);

                if (category) {
                    categoryName = category.name;
                    categoryColor = category.color;
                }
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
    } catch (error) {
        console.error("生成支出統計圖表時發生錯誤:", error);
        const expenseChartContainer = document.getElementById('expenseChart');
        if (expenseChartContainer) {
            expenseChartContainer.innerHTML = '<p class="error-message">生成圖表時出錯</p>';
        }
    }
}

// 更新統計UI
function updateStatisticsUI() {
    console.log("更新統計UI");

    try {
        // 如果Chart.js尚未載入，嘗試載入
        if (typeof Chart === 'undefined') {
            loadChartJs().then(() => {
                // 生成收入統計圖表
                generateIncomeChart();
                // 生成支出統計圖表
                generateExpenseChart();
            }).catch(error => {
                console.error("載入Chart.js時發生錯誤:", error);
                showToast('載入統計圖表庫失敗', 'error');
            });
        } else {
            // 生成收入統計圖表
            generateIncomeChart();
            // 生成支出統計圖表
            generateExpenseChart();
        }
    } catch (error) {
        console.error("更新統計UI時發生錯誤:", error);
        throw error;
    }
}