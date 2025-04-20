/**
 * ui-charts.js - 圖表UI
 */

const UiCharts = {
    /**
     * 收入圖表
     */
    incomeChart: null,
    
    /**
     * 支出圖表
     */
    expenseChart: null,
    
    /**
     * 初始化圖表UI
     */
    init: function() {
        console.log('圖表UI初始化完成');
    },
    
    /**
     * 重新整理統計分析
     */
    refreshStatistics: function() {
        // 初始化收入圖表
        this.initIncomeChart();
        
        // 初始化支出圖表
        this.initExpenseChart();
    },
    
    /**
     * 初始化收入圖表
     */
    initIncomeChart: function() {
        // 取得容器
        const chartContainer = document.getElementById('incomeChart');
        
        // 清除載入中
        chartContainer.innerHTML = '<canvas id="incomeChartCanvas"></canvas>';
        
        // 取得當月收入資料
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        
        // 篩選當月收入交易
        const transactions = Store.getTransactions({
            type: 'income',
            startDate: `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`,
            endDate: `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(new Date(currentYear, currentMonth, 0).getDate()).padStart(2, '0')}`
        });
        
        // 按類別分組
        const categorySums = {};
        const categoryColors = {};
        
        transactions.forEach(tx => {
            const category = Store.getCategory(tx.categoryId);
            if (!category) return;
            
            if (!categorySums[category.name]) {
                categorySums[category.name] = 0;
                categoryColors[category.name] = category.color;
            }
            
            categorySums[category.name] += tx.amount;
        });
        
        // 準備圖表資料
        const labels = Object.keys(categorySums);
        const data = labels.map(label => categorySums[label]);
        const colors = labels.map(label => categoryColors[label]);
        
        // 如果沒有資料，顯示提示訊息
        if (data.length === 0) {
            chartContainer.innerHTML = '<p class="empty-message">本月尚無收入記錄</p>';
            return;
        }
        
        // 建立圖表
        const ctx = document.getElementById('incomeChartCanvas').getContext('2d');
        
        if (this.incomeChart) {
            this.incomeChart.destroy();
        }
        
        this.incomeChart = new Chart(ctx, {
            type: 'doughnut',
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
                            boxWidth: 12,
                            font: {
                                size: 11
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.formattedValue;
                                const total = context.chart.getDatasetMeta(0).total;
                                const percentage = Math.round((context.raw / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    },
    
    /**
     * 初始化支出圖表
     */
    initExpenseChart: function() {
        // 取得容器
        const chartContainer = document.getElementById('expenseChart');
        
        // 清除載入中
        chartContainer.innerHTML = '<canvas id="expenseChartCanvas"></canvas>';
        
        // 取得當月支出資料
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        
        // 篩選當月支出交易
        const transactions = Store.getTransactions({
            type: 'expense',
            startDate: `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`,
            endDate: `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(new Date(currentYear, currentMonth, 0).getDate()).padStart(2, '0')}`
        });
        
        // 按類別分組
        const categorySums = {};
        const categoryColors = {};
        
        transactions.forEach(tx => {
            const category = Store.getCategory(tx.categoryId);
            if (!category) return;
            
            if (!categorySums[category.name]) {
                categorySums[category.name] = 0;
                categoryColors[category.name] = category.color;
            }
            
            categorySums[category.name] += tx.amount;
        });
        
        // 準備圖表資料
        const labels = Object.keys(categorySums);
        const data = labels.map(label => categorySums[label]);
        const colors = labels.map(label => categoryColors[label]);
        
        // 如果沒有資料，顯示提示訊息
        if (data.length === 0) {
            chartContainer.innerHTML = '<p class="empty-message">本月尚無支出記錄</p>';
            return;
        }
        
        // 建立圖表
        const ctx = document.getElementById('expenseChartCanvas').getContext('2d');
        
        if (this.expenseChart) {
            this.expenseChart.destroy();
        }
        
        this.expenseChart = new Chart(ctx, {
            type: 'doughnut',
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
                            boxWidth: 12,
                            font: {
                                size: 11
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.formattedValue;
                                const total = context.chart.getDatasetMeta(0).total;
                                const percentage = Math.round((context.raw / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
};