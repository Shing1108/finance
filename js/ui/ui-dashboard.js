/**
 * ui-dashboard.js - 儀表板UI
 */

const UiDashboard = {
    /**
     * 初始化儀表板UI
     */
    init: function() {
        console.log('儀表板UI初始化完成');
    },
    
    /**
     * 重新整理儀表板資料
     */
    refresh: function() {
        // 更新今日交易
        this.refreshTodayTransactions();
        
        // 更新預算狀態
        this.refreshBudgetStatus();
        
        // 更新近期交易
        this.refreshRecentTransactions();
        
        // 更新財務健康指數
        this.refreshFinancialHealth();
        
        // 更新頂部財務概覽
        UiCore.updateFinancialSnapshot();
    },
    
    /**
     * 更新今日交易清單
     */
    refreshTodayTransactions: function() {
        const todayTransactions = Store.getTodayTransactions();
        const todayTransactionsList = document.getElementById('todayTransactionsList');
        
        // 清空列表
        todayTransactionsList.innerHTML = '';
        
        // 如果沒有交易，顯示提示訊息
        if (todayTransactions.length === 0) {
            todayTransactionsList.innerHTML = '<p class="empty-message">今日尚無交易記錄</p>';
            return;
        }
        
        // 顯示交易
        todayTransactions.forEach(transaction => {
            const transactionHtml = UiCore.createTransactionHTML(transaction, false);
            todayTransactionsList.innerHTML += transactionHtml;
        });
    },
    
    /**
     * 更新預算狀態
     */
    refreshBudgetStatus: function() {
        // 取得當前月份的預算使用狀態
        const budgetUsages = Store.getAllBudgetUsage('monthly');
        const budgetStatus = document.getElementById('budgetStatus');
        
        // 清空列表
        budgetStatus.innerHTML = '';
        
        // 如果沒有預算，顯示提示訊息
        if (budgetUsages.length === 0) {
            budgetStatus.innerHTML = `
                <p class="empty-message">尚未設定預算</p>
                <a href="#" onclick="showTabContent('budgets')" class="action-link">設定預算</a>
            `;
            return;
        }
        
        // 只顯示前 3 個預算
        const topBudgets = budgetUsages
            .filter(usage => usage.category) // 過濾掉無效的類別
            .sort((a, b) => b.percentage - a.percentage) // 按百分比降序排序
            .slice(0, 3);
        
        // 顯示預算
        topBudgets.forEach(usage => {
            // 計算進度條顏色
            let progressColor = 'var(--primary-color)';
            if (usage.percentage >= 90) {
                progressColor = 'var(--danger-color)';
            } else if (usage.percentage >= 70) {
                progressColor = 'var(--warning-color)';
            }
            
            const budgetHtml = `
                <div class="budget-item-small">
                    <div class="budget-item-header">
                        <div class="budget-category-icon" style="background-color: ${usage.category.color}20; color: ${usage.category.color}">
                            <i class="fas fa-${usage.category.icon}"></i>
                        </div>
                        <div class="budget-category-name">${usage.category.name}</div>
                        <div class="budget-percentage">${Math.round(usage.percentage)}%</div>
                    </div>
                    <div class="budget-progress-container">
                        <div class="budget-progress-bar" style="width: ${usage.percentage}%; background-color: ${progressColor}"></div>
                    </div>
                    <div class="budget-info">
                        <div>${Utils.formatCurrency(usage.totalExpense, Store.settings.defaultCurrency)} / ${Utils.formatCurrency(usage.budget.amount, Store.settings.defaultCurrency)}</div>
                    </div>
                </div>
            `;
            
            budgetStatus.innerHTML += budgetHtml;
        });
        
        // 添加查看全部按鈕
        if (budgetUsages.length > 3) {
            budgetStatus.innerHTML += `
                <a href="#" onclick="showTabContent('budgets')" class="view-all">查看全部預算</a>
            `;
        }
    },
    
    /**
     * 更新近期交易
     */
    refreshRecentTransactions: function() {
        // 取得最近 5 筆交易
        const recentTransactions = Store.getTransactions().slice(0, 5);
        const recentTransactionsList = document.getElementById('recentTransactionsList');
        
        // 清空列表
        recentTransactionsList.innerHTML = '';
        
        // 如果沒有交易，顯示提示訊息
        if (recentTransactions.length === 0) {
            recentTransactionsList.innerHTML = '<p class="empty-message">尚無交易記錄</p>';
            return;
        }
        
        // 顯示交易
        recentTransactions.forEach(transaction => {
            const transactionHtml = UiCore.createTransactionHTML(transaction, false);
            recentTransactionsList.innerHTML += transactionHtml;
        });
    },
    
    /**
     * 更新財務健康指數
     */
    refreshFinancialHealth: function() {
        // 計算財務健康指數
        const healthIndex = this._calculateFinancialHealth();
        const healthElement = document.getElementById('financialHealthIndex');
        const adviceElement = document.getElementById('financialAdvice');
        
        // 更新健康指數
        healthElement.textContent = healthIndex.score;
        healthElement.className = `health-score-value ${healthIndex.level}`;
        
        // 更新健康指數狀態文字
        const statusElement = healthElement.nextElementSibling;
        statusElement.textContent = healthIndex.status;
        statusElement.className = `status ${healthIndex.level}`;
        
        // 更新建議
        adviceElement.textContent = healthIndex.advice;
    },
    
    /**
     * 計算財務健康指數
     */
    _calculateFinancialHealth: function() {
        // 1. 收入與支出比率
        const transactions = Store.getTransactions();
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        
        // 篩選當月交易
        const thisMonthTransactions = transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate.getMonth() + 1 === currentMonth && 
                   txDate.getFullYear() === currentYear;
        });
        
        // 計算當月收入和支出
        const monthlyIncome = thisMonthTransactions
            .filter(tx => tx.type === 'income')
            .reduce((sum, tx) => sum + tx.amount, 0);
        
        const monthlyExpense = thisMonthTransactions
            .filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + tx.amount, 0);
        
        // 2. 預算管理
        const budgetUsages = Store.getAllBudgetUsage('monthly');
        const overBudgetCount = budgetUsages.filter(usage => usage.percentage > 100).length;
        const nearBudgetCount = budgetUsages.filter(usage => usage.percentage >= 80 && usage.percentage <= 100).length;
        
        // 3. 儲蓄率
        const savingsRate = monthlyIncome > 0 ? 1 - (monthlyExpense / monthlyIncome) : 0;
        
        // 4. 資產多樣化
        const accounts = Store.getAccounts();
        const accountTypeCount = new Set(accounts.map(acc => acc.type)).size;
        
        // 5. 總資產
        const totalAssets = Store.calculateTotalAssets();
        
        // 計算指數
        let score = 0;
        
        // 收入支出比率分數 (最高 30 分)
        if (monthlyIncome > 0) {
            const incomeExpenseRatio = monthlyExpense / monthlyIncome;
            if (incomeExpenseRatio <= 0.6) {
                score += 30;
            } else if (incomeExpenseRatio <= 0.7) {
                score += 25;
            } else if (incomeExpenseRatio <= 0.8) {
                score += 20;
            } else if (incomeExpenseRatio <= 0.9) {
                score += 15;
            } else if (incomeExpenseRatio <= 1) {
                score += 10;
            } else {
                score += 5;
            }
        }
        
        // 預算管理分數 (最高 25 分)
        if (budgetUsages.length > 0) {
            if (overBudgetCount === 0) {
                score += 25;
            } else if (overBudgetCount === 1) {
                score += 20;
            } else if (overBudgetCount === 2) {
                score += 15;
            } else {
                score += 10;
            }
        }
        
        // 儲蓄率分數 (最高 25 分)
        if (savingsRate >= 0.3) {
            score += 25;
        } else if (savingsRate >= 0.2) {
            score += 20;
        } else if (savingsRate >= 0.1) {
            score += 15;
        } else if (savingsRate >= 0.05) {
            score += 10;
        } else if (savingsRate >= 0) {
            score += 5;
        }
        
        // 資產多樣化分數 (最高 10 分)
        if (accountTypeCount >= 4) {
            score += 10;
        } else if (accountTypeCount >= 3) {
            score += 8;
        } else if (accountTypeCount >= 2) {
            score += 5;
        } else if (accountTypeCount >= 1) {
            score += 3;
        }
        
        // 總資產分數 (最高 10 分)
        if (totalAssets >= 100000) {
            score += 10;
        } else if (totalAssets >= 50000) {
            score += 8;
        } else if (totalAssets >= 20000) {
            score += 5;
        } else if (totalAssets >= 10000) {
            score += 3;
        } else if (totalAssets > 0) {
            score += 1;
        }
        
        // 決定健康等級和建議
        let level, status, advice;
        
        if (score >= 85) {
            level = 'excellent';
            status = '優秀';
            advice = '你的財務狀況非常健康！持續保持良好的儲蓄習慣，考慮增加投資比例以讓資產增值。';
        } else if (score >= 70) {
            level = 'good';
            status = '良好';
            advice = '你的財務狀況良好，可以考慮進一步優化預算，增加儲蓄比例，並分散投資風險。';
        } else if (score >= 50) {
            level = 'fair';
            status = '一般';
            advice = '你的財務狀況尚可，建議檢視並削減不必要的支出，增加儲蓄，並建立緊急資金。';
        } else if (score >= 30) {
            level = 'poor';
            status = '欠佳';
            advice = '你的財務狀況需要改善，建議嚴格控制支出，避免非必要購物，優先償還高利率債務。';
        } else {
            level = 'critical';
            status = '危險';
            advice = '你的財務狀況存在風險，需要立即採取行動。專注於增加收入、大幅削減支出，並制定債務償還計劃。';
        }
        
        return {
            score,
            level,
            status,
            advice
        };
    }
};