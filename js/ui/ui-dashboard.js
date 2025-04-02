// ui-dashboard.js - 儀表板UI相關

/**
 * 更新儀表板UI
 */
function updateDashboardUI() {
    console.log("更新儀表板UI");

    try {
        // 更新總資產
        updateTotalAssets();

        // 更新今日收入和支出
        updateTodaySummary();

        // 更新最近交易列表
        updateRecentTransactions();

        // 更新預算狀態
        updateBudgetStatus();

        // 更新財務健康指數
        updateFinancialHealthIndex();

        // 更新頂部狀態欄
        if (window.dayManager && typeof window.dayManager.updateTopStatusBar === 'function') {
            window.dayManager.updateTopStatusBar();
        }
    } catch (error) {
        console.error("更新儀表板UI時發生錯誤:", error);
        showToast('更新儀表板失敗: ' + error.message, 'error');
    }
}

/**
 * 更新總資產
 */
function updateTotalAssets() {
    console.log("更新總資產");

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

        // 更新頁面顯示
        const totalAssetsElements = document.querySelectorAll('#totalAssets, #topTotalAssets');
        
        totalAssetsElements.forEach(element => {
            if (element) {
                element.textContent = formatNumber(totalAssets);
            }
        });
    } catch (error) {
        console.error("更新總資產時發生錯誤:", error);
    }
}

/**
 * 更新今日收支摘要
 */
function updateTodaySummary() {
    console.log("更新今日收支摘要");

    try {
        // 使用當前活動日期或今天
        const today = window.dayManager ? window.dayManager.getActiveDay() : new Date().toISOString().split('T')[0];

        // 篩選當天的交易
        const todayTransactions = appState.transactions.filter(t => t.date === today);

        // 計算今日收入和支出
        let todayIncome = 0;
        let todayExpense = 0;

        todayTransactions.forEach(transaction => {
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

            if (transaction.type === 'income') {
                todayIncome += amount;
            } else if (transaction.type === 'expense') {
                todayExpense += amount;
            }
        });

        // 更新頁面顯示
        const todayIncomeElements = document.querySelectorAll('#todayIncome, #topTodayIncome');
        const todayExpenseElements = document.querySelectorAll('#todayExpense, #topTodayExpense');
        
        todayIncomeElements.forEach(element => {
            if (element) {
                element.textContent = formatNumber(todayIncome);
            }
        });
        
        todayExpenseElements.forEach(element => {
            if (element) {
                element.textContent = formatNumber(todayExpense);
            }
        });
    } catch (error) {
        console.error("更新今日收支摘要時發生錯誤:", error);
    }
}

/**
 * 更新最近交易列表
 */
function updateRecentTransactions() {
    console.log("更新最近交易列表");

    try {
        const recentTransactionsList = document.getElementById('recentTransactionsList');
        const todayTransactionsList = document.getElementById('todayTransactionsList');

        if (!recentTransactionsList && !todayTransactionsList) {
            console.warn("找不到交易列表元素");
            return;
        }

        // 複製交易數組並按日期排序(最新優先)
        const sortedTransactions = [...appState.transactions].sort((a, b) => {
            // 先按日期
            const dateDiff = b.date.localeCompare(a.date);
            if (dateDiff !== 0) {
                return dateDiff;
            }
            // 再按創建時間
            return (b.createdAt || '').localeCompare(a.createdAt || '');
        });

        // 最近交易(最多10筆)
        if (recentTransactionsList) {
            if (sortedTransactions.length === 0) {
                recentTransactionsList.innerHTML = '<p class="empty-message">尚無交易記錄</p>';
            } else {
                // 取前10筆交易
                const recentTransactions = sortedTransactions.slice(0, 10);
                let html = '';

                recentTransactions.forEach(transaction => {
                    const account = appState.accounts.find(a => a.id === transaction.accountId);

                    // 確定類別
                    let categoryName = '';
                    let categoryIcon = 'fas fa-exchange-alt';
                    let categoryColor = '#777';

                    if (transaction.categoryId === 'transfer_out') {
                        categoryName = '轉賬支出';
                        categoryIcon = 'fas fa-arrow-right';
                        categoryColor = '#e67e22';
                    } else if (transaction.categoryId === 'transfer_in') {
                        categoryName = '轉賬收入';
                        categoryIcon = 'fas fa-arrow-left';
                        categoryColor = '#27ae60';
                    } else {
                        const categoryArray = transaction.type === 'income' ? appState.categories.income : appState.categories.expense;
                        const category = categoryArray.find(c => c.id === transaction.categoryId);

                        if (category) {
                            categoryName = category.name;
                            categoryIcon = category.icon;
                            categoryColor = category.color;
                        }
                    }

                    // 格式化日期
                    let formattedDate = transaction.date;
                    try {
                        const [year, month, day] = transaction.date.split('-');
                        formattedDate = `${day}/${month}/${year}`;
                    } catch (e) {
                        console.error("格式化日期出錯:", e);
                    }

                    html += `
                        <div class="transaction-item ${transaction.type}">
                            <div class="transaction-date">${formattedDate}</div>
                            <div class="transaction-icon" style="color: ${categoryColor}">
                                <i class="${categoryIcon}"></i>
                            </div>
                            <div class="transaction-details">
                                <div class="transaction-category">${categoryName}</div>
                                <div class="transaction-account">${account ? account.name : '未知賬戶'}</div>
                            </div>
                            <div class="transaction-amount">${formatCurrency(transaction.amount, account ? account.currency : defaultCurrency)}</div>
                        </div>
                    `;
                });

                recentTransactionsList.innerHTML = html;
            }
        }

        // 今日交易列表
        if (todayTransactionsList) {
            const today = window.dayManager ? window.dayManager.getActiveDay() : new Date().toISOString().split('T')[0];
            const todayTransactions = sortedTransactions.filter(t => t.date === today);

            if (todayTransactions.length === 0) {
                todayTransactionsList.innerHTML = '<p class="empty-message">今日尚無交易記錄</p>';
            } else {
                let html = '';

                todayTransactions.forEach(transaction => {
                    const account = appState.accounts.find(a => a.id === transaction.accountId);

                    // 確定類別
                    let categoryName = '';
                    let categoryIcon = 'fas fa-exchange-alt';
                    let categoryColor = '#777';

                    if (transaction.categoryId === 'transfer_out') {
                        categoryName = '轉賬支出';
                        categoryIcon = 'fas fa-arrow-right';
                        categoryColor = '#e67e22';
                    } else if (transaction.categoryId === 'transfer_in') {
                        categoryName = '轉賬收入';
                        categoryIcon = 'fas fa-arrow-left';
                        categoryColor = '#27ae60';
                    } else {
                        const categoryArray = transaction.type === 'income' ? appState.categories.income : appState.categories.expense;
                        const category = categoryArray.find(c => c.id === transaction.categoryId);

                        if (category) {
                            categoryName = category.name;
                            categoryIcon = category.icon;
                            categoryColor = category.color;
                        }
                    }

                    html += `
                        <div class="transaction-item ${transaction.type}">
                            <div class="transaction-icon" style="color: ${categoryColor}">
                                <i class="${categoryIcon}"></i>
                            </div>
                            <div class="transaction-details">
                                <div class="transaction-category">${categoryName}</div>
                                <div class="transaction-account">${account ? account.name : '未知賬戶'}</div>
                            </div>
                            <div class="transaction-amount">${formatCurrency(transaction.amount, account ? account.currency : defaultCurrency)}</div>
                        </div>
                    `;
                });

                todayTransactionsList.innerHTML = html;
            }
        }
    } catch (error) {
        console.error("更新最近交易列表時發生錯誤:", error);
        
        // 安全地顯示錯誤消息
        if (document.getElementById('recentTransactionsList')) {
            document.getElementById('recentTransactionsList').innerHTML = '<p class="error-message">載入交易失敗</p>';
        }
        
        if (document.getElementById('todayTransactionsList')) {
            document.getElementById('todayTransactionsList').innerHTML = '<p class="error-message">載入交易失敗</p>';
        }
    }
}

/**
 * 更新財務健康指數
 */
function updateFinancialHealthIndex() {
    console.log("更新財務健康指數");

    try {
        const indexElement = document.getElementById('financialHealthIndex');
        const adviceElement = document.getElementById('financialAdvice');
        const statusElement = document.querySelector('#financialHealthIndex + .status');

        if (!indexElement || !adviceElement || !statusElement) {
            console.warn("找不到財務健康指數元素");
            return;
        }

        // 計算財務健康指數(0-100)
        let healthIndex = calculateFinancialHealthIndex();
        
        // 更新指數顯示
        indexElement.textContent = healthIndex;
        
        // 更新狀態文字
        let statusText = '';
        let adviceText = '';
        
        if (healthIndex >= 90) {
            statusText = '極佳';
            adviceText = '您的財務健康狀況極佳！繼續保持良好的消費和儲蓄習慣，考慮投資以獲取更多收益。';
        } else if (healthIndex >= 80) {
            statusText = '優良';
            adviceText = '您的財務狀況相當健康。考慮增加儲蓄或投資，進一步提升財務安全。';
        } else if (healthIndex >= 70) {
            statusText = '良好';
            adviceText = '您的財務狀況良好，但仍有改進空間。考慮降低不必要的開支，增加應急資金。';
        } else if (healthIndex >= 60) {
            statusText = '一般';
            adviceText = '您的財務狀況一般。建議檢視預算，減少非必要支出，增加儲蓄率。';
        } else if (healthIndex >= 40) {
            statusText = '需注意';
            adviceText = '您的財務狀況需要關注。建議重新審視支出模式，設定更為嚴格的預算，並考慮增加收入來源。';
        } else {
            statusText = '需警惕';
            adviceText = '您的財務狀況需要立即關注！建議緊縮支出，制定嚴格的預算計劃，避免任何不必要的消費。';
        }
        
        statusElement.textContent = statusText;
        adviceElement.textContent = adviceText;
        
        // 根據指數設置顏色
        let indexColor = '';
        
        if (healthIndex >= 80) {
            indexColor = 'var(--secondary-color)';
        } else if (healthIndex >= 60) {
            indexColor = 'var(--primary-color)';
        } else if (healthIndex >= 40) {
            indexColor = 'var(--warning-color)';
        } else {
            indexColor = 'var(--danger-color)';
        }
        
        indexElement.style.color = indexColor;
    } catch (error) {
        console.error("更新財務健康指數時發生錯誤:", error);
        
        // 顯示錯誤消息
        if (document.getElementById('financialHealthIndex')) {
            document.getElementById('financialHealthIndex').textContent = '--';
        }
        
        if (document.querySelector('#financialHealthIndex + .status')) {
            document.querySelector('#financialHealthIndex + .status').textContent = '計算失敗';
        }
        
        if (document.getElementById('financialAdvice')) {
            document.getElementById('financialAdvice').textContent = '無法計算財務健康指數。請檢查您的數據。';
        }
    }
}

/**
 * 計算財務健康指數
 * @returns {number} 財務健康指數(0-100)
 */
function calculateFinancialHealthIndex() {
    try {
        // 計算指標
        
        // 1. 收支比率(收入/支出) - 最近30天
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        
        const thirtyDaysAgoFormatted = thirtyDaysAgo.toISOString().split('T')[0];
        const todayFormatted = today.toISOString().split('T')[0];
        
        const recentTransactions = appState.transactions.filter(t => 
            t.date >= thirtyDaysAgoFormatted && 
            t.date <= todayFormatted && 
            t.categoryId !== 'transfer_in' && 
            t.categoryId !== 'transfer_out'
        );
        
        let recentIncome = 0;
        let recentExpense = 0;
        
        recentTransactions.forEach(transaction => {
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
                recentIncome += amount;
            } else {
                recentExpense += amount;
            }
        });
        
        // 收支比率分數(0-25分)
        let incomeExpenseRatio = recentExpense > 0 ? recentIncome / recentExpense : 1;
        let incomeExpenseScore = Math.min(25, Math.round(incomeExpenseRatio * 12.5));
        
        // 2. 預算遵循度(1 - 已使用/總預算)(0-25分)
        let budgetAdherenceScore = 0;
        
        if (appState.budgets.total > 0) {
            const totalBudget = appState.budgets.total || 0;
            const totalSpent = calculateTotalSpent();
            const percentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
            
            if (percentage <= 100) {
                budgetAdherenceScore = Math.round(25 * (1 - (percentage / 100)));
            }
        } else {
            // 如果未設定預算，給予較低分數
            budgetAdherenceScore = 10;
        }
        
        // 3. 儲蓄率(儲蓄目標進度)(0-25分)
        let savingsScore = 0;
        
        if (appState.savingsGoals && appState.savingsGoals.length > 0) {
            // 計算所有儲蓄目標的進度百分比平均值
            let totalProgress = 0;
            
            appState.savingsGoals.forEach(goal => {
                const progress = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
                totalProgress += progress;
            });
            
            const averageProgress = totalProgress / appState.savingsGoals.length;
            savingsScore = Math.min(25, Math.round(averageProgress / 4));
        } else {
            // 如果未設定儲蓄目標，給予較低分數
            savingsScore = 10;
        }
        
        // 4. 資產多樣性(不同類型賬戶的數量)(0-25分)
        const accountTypes = new Set();
        
        appState.accounts.forEach(account => {
            accountTypes.add(account.type);
        });
        
        let diversityScore = Math.min(25, accountTypes.size * 7);
        
        // 計算總分
        let totalScore = incomeExpenseScore + budgetAdherenceScore + savingsScore + diversityScore;
        
        // 最終分數(0-100)
        return Math.max(0, Math.min(100, Math.round(totalScore)));
    } catch (error) {
        console.error("計算財務健康指數時發生錯誤:", error);
        return 50; // 默認中等分數
    }
}

/**
 * 更新頂部財務快照
 */
function updateFinancesSnapshot() {
    console.log("更新頂部財務快照");

    try {
        // 更新總資產
        updateTotalAssets();

        // 更新今日收入和支出
        updateTodaySummary();
    } catch (error) {
        console.error("更新頂部財務快照時發生錯誤:", error);
    }
}

// 導出函數
window.updateDashboardUI = updateDashboardUI;
window.updateTotalAssets = updateTotalAssets;
window.updateTodaySummary = updateTodaySummary;
window.updateRecentTransactions = updateRecentTransactions;
window.updateFinancialHealthIndex = updateFinancialHealthIndex;
window.updateFinancesSnapshot = updateFinancesSnapshot;