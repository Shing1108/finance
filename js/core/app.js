/**
 * app.js - 應用程式核心
 */

const App = {
    // 初始化
    init: async function() {
        try {
            console.log('應用程式初始化中...');
            Utils.showLoading();
            
            // 初始化資料存儲
            await Store.init();
            
            // 初始化 UI 元件
            UiCore.init();
            
            // 綁定事件
            this._bindEvents();
            
            // 啟動同步服務（如果有啟用）
            if (Store.settings.enableFirebaseSync) {
                SyncManager.init();
            }
            
            // 顯示初始頁籤
            UiCore.showTabContent('dashboard');
            
            // 檢查是否需要開始新的一天
            this._checkNewDay();
            
            console.log('應用程式初始化完成');
            Utils.hideLoading();
            
            // 發布應用程式初始化完成事件
            EventBus.publish('appInitialized', {});
        } catch (error) {
            console.error('應用程式初始化失敗', error);
            Utils.hideLoading();
            Utils.showToast('應用程式初始化失敗，請刷新頁面重試', 'error');
        }
    },
    
    // 檢查是否需要開始新的一天
    _checkNewDay: function() {
        const today = DateUtils.today();
        const currentDate = DayManager.getCurrentDate();
        
        // 如果不是今天，顯示開始新一天的提示
        if (currentDate !== today) {
            Utils.showToast(`您現在正在查看 ${currentDate} 的資料。點擊下方按鈕開始新的一天`, 'info', 0);
            
            // 高亮開始新一天的按鈕
            document.getElementById('startNewDayButton').classList.add('highlight');
        }
    },
    
    // 綁定事件
    _bindEvents: function() {
        // 頁籤切換
        document.querySelectorAll('.nav-tabs li').forEach(tab => {
            tab.addEventListener('click', function() {
                const tabId = this.getAttribute('data-tab');
                UiCore.showTabContent(tabId);
            });
        });
        
        // 開始新一天
        document.getElementById('startNewDayButton').addEventListener('click', () => {
            const started = DayManager.startNewDay();
            if (started) {
                // 更新 UI
                UiDashboard.refresh();
                // 關閉 toast
                document.querySelectorAll('.toast').forEach(toast => toast.remove());
            }
        });
        
        // 設定按鈕
        document.getElementById('settingsButton').addEventListener('click', () => {
            UiCore.showSettingsModal();
        });
        
        // 監聽 Tab 變更事件
        EventBus.subscribe('tabChanged', ({ tabId }) => {
            this._handleTabChange(tabId);
        });
        
        // 監聽新一天開始事件
        EventBus.subscribe('newDayStarted', () => {
            // 更新 UI
            UiDashboard.refresh();
            
            // 移除高亮
            document.getElementById('startNewDayButton').classList.remove('highlight');
        });
        
        // 監聽預算警告事件
        EventBus.subscribe('budgetWarnings', ({ warnings }) => {
            warnings.forEach(warning => {
                const category = Store.getCategory(warning.category);
                if (!category) return;
                
                const message = `預算警告：${category.name} 已使用 ${Math.round(warning.percentage * 100)}%（${Utils.formatCurrency(warning.spent, Store.settings.defaultCurrency)}/${Utils.formatCurrency(warning.budget, Store.settings.defaultCurrency)}）`;
                const type = warning.severity === 'critical' ? 'error' : 'warning';
                
                Utils.showToast(message, type, 5000);
            });
        });
        
        // 監聽每日提示事件
        EventBus.subscribe('dailyTip', ({ tip }) => {
            setTimeout(() => {
                Utils.showToast(tip, 'info', 8000);
            }, 1000);
        });
    },
    
    // 處理頁籤變更
    _handleTabChange: function(tabId) {
        // 根據不同頁籤進行相應處理
        switch (tabId) {
            case 'dashboard':
                UiDashboard.refresh();
                break;
                
            case 'accounts':
                UiAccounts.refresh();
                break;
                
            case 'transactions':
                UiTransactions.refresh();
                break;
                
            case 'budgets':
                UiBudget.refresh();
                break;
                
            case 'categories':
                UiCategories.refresh();
                break;
                
            case 'statistics':
                UiCharts.refreshStatistics();
                break;
                
            case 'savingsGoals':
                SavingsManager.refresh();
                break;
                
            case 'dataAnalytics':
                AnalyticsManager.refresh();
                break;
                
            case 'sync':
                SyncManager.refresh();
                break;
        }
    },
    
    // 添加戶口
    addAccount: function(accountData) {
        try {
            const account = Store.addAccount(accountData);
            Utils.showToast(`戶口 ${account.name} 已新增`, 'success');
            return account;
        } catch (error) {
            console.error('新增戶口失敗', error);
            Utils.showToast('新增戶口失敗', 'error');
            return null;
        }
    },
    
    // 更新戶口
    updateAccount: function(id, accountData) {
        try {
            const account = Store.updateAccount(id, accountData);
            if (!account) {
                Utils.showToast('找不到指定戶口', 'error');
                return null;
            }
            
            Utils.showToast(`戶口 ${account.name} 已更新`, 'success');
            return account;
        } catch (error) {
            console.error('更新戶口失敗', error);
            Utils.showToast('更新戶口失敗', 'error');
            return null;
        }
    },
    
    // 刪除戶口
    deleteAccount: function(id) {
        try {
            // 檢查戶口是否有關聯交易
            const transactions = Store.getTransactions({ accountId: id });
            if (transactions.length > 0) {
                Utils.showToast('無法刪除戶口，有關聯的交易記錄', 'error');
                return false;
            }
            
            const account = Store.getAccount(id);
            if (!account) {
                Utils.showToast('找不到指定戶口', 'error');
                return false;
            }
            
            const result = Store.deleteAccount(id);
            if (result) {
                Utils.showToast(`戶口 ${account.name} 已刪除`, 'success');
            } else {
                Utils.showToast('刪除戶口失敗', 'error');
            }

            // 在 app.js 的 deleteAccount 函數中添加
// 檢查戶口是否有關聯儲蓄目標
const goals = Store.getSavingsGoals().filter(goal => goal.accountId === id);
if (goals.length > 0) {
    const goalNames = goals.map(goal => goal.name).join('、');
    Utils.showToast(`無法刪除戶口，有關聯的儲蓄目標: ${goalNames}`, 'error');
    return false;
}
            
            return result;
        } catch (error) {
            console.error('刪除戶口失敗', error);
            Utils.showToast('刪除戶口失敗', 'error');
            return false;
        }
    },
    
    // 添加類別
    addCategory: function(categoryData) {
        try {
            const category = Store.addCategory(categoryData);
            Utils.showToast(`類別 ${category.name} 已新增`, 'success');
            return category;
        } catch (error) {
            console.error('新增類別失敗', error);
            Utils.showToast('新增類別失敗', 'error');
            return null;
        }
    },
    
    // 更新類別
    updateCategory: function(id, categoryData) {
        try {
            const category = Store.updateCategory(id, categoryData);
            if (!category) {
                Utils.showToast('找不到指定類別', 'error');
                return null;
            }
            
            Utils.showToast(`類別 ${category.name} 已更新`, 'success');
            return category;
        } catch (error) {
            console.error('更新類別失敗', error);
            Utils.showToast('更新類別失敗', 'error');
            return null;
        }
    },
    
    // 刪除類別
    deleteCategory: function(id) {
        try {
            // 檢查類別是否有關聯交易
            const transactions = Store.getTransactions({ categoryId: id });
            if (transactions.length > 0) {
                Utils.showToast('無法刪除類別，有關聯的交易記錄', 'error');
                return false;
            }
            
            // 檢查類別是否有關聯預算
            const budgets = Store.budgets.filter(budget => budget.categoryId === id);
            if (budgets.length > 0) {
                Utils.showToast('無法刪除類別，有關聯的預算設定', 'error');
                return false;
            }
            
            const category = Store.getCategory(id);
            if (!category) {
                Utils.showToast('找不到指定類別', 'error');
                return false;
            }
            
            const result = Store.deleteCategory(id);
            if (result) {
                Utils.showToast(`類別 ${category.name} 已刪除`, 'success');
            } else {
                Utils.showToast('刪除類別失敗', 'error');
            }
            
            return result;
        } catch (error) {
            console.error('刪除類別失敗', error);
            Utils.showToast('刪除類別失敗', 'error');
            return false;
        }
    },
    
    // 添加交易
    addTransaction: function(transactionData) {
        try {
            const transaction = Store.addTransaction(transactionData);
            
            if (transaction.type === 'income') {
                // 在 App.addTransaction 函數的成功處理部分
// 觸發交易完成事件
const event = new CustomEvent('transactionCompleted', { detail: transaction });
document.dispatchEvent(event);
                Utils.showToast('收入已記錄', 'success');
            } else if (transaction.type === 'expense') {
                Utils.showToast('支出已記錄', 'success');
            } else if (transaction.type === 'transfer') {
                Utils.showToast('轉賬已記錄', 'success');
            }
            
            return transaction;
        } catch (error) {
            console.error('新增交易失敗', error);
            Utils.showToast('新增交易失敗', 'error');
            return null;
        }
    },
    
    // 更新交易
    updateTransaction: function(id, transactionData) {
        try {
            const transaction = Store.updateTransaction(id, transactionData);
            if (!transaction) {
                Utils.showToast('找不到指定交易', 'error');
                return null;
            }
            
            Utils.showToast('交易已更新', 'success');
            return transaction;
        } catch (error) {
            console.error('更新交易失敗', error);
            Utils.showToast('更新交易失敗', 'error');
            return null;
        }
    },
    
    // 刪除交易
    deleteTransaction: function(id) {
        try {
            const transaction = Store.getTransaction(id);
            if (!transaction) {
                Utils.showToast('找不到指定交易', 'error');
                return false;
            }
            
            const result = Store.deleteTransaction(id);
            if (result) {
                Utils.showToast('交易已刪除', 'success');
            } else {
                Utils.showToast('刪除交易失敗', 'error');
            }
            
            return result;
        } catch (error) {
            console.error('刪除交易失敗', error);
            Utils.showToast('刪除交易失敗', 'error');
            return false;
        }
    },
    
    // 添加預算
    addBudget: function(budgetData) {
        try {
            // 檢查是否已有同類別同期間的預算
            const existingBudgets = Store.getBudgets(
                budgetData.period,
                budgetData.year,
                budgetData.month,
                budgetData.quarter
            );
            
            const duplicate = existingBudgets.find(b => b.categoryId === budgetData.categoryId);
            if (duplicate) {
                Utils.showToast('此類別在此期間已有預算設定', 'error');
                return null;
            }
            
            const budget = Store.addBudget(budgetData);
            Utils.showToast('預算已設定', 'success');
            return budget;
        } catch (error) {
            console.error('新增預算失敗', error);
            Utils.showToast('新增預算失敗', 'error');
            return null;
        }
    },
    
    // 更新預算
    updateBudget: function(id, budgetData) {
        try {
            const budget = Store.updateBudget(id, budgetData);
            if (!budget) {
                Utils.showToast('找不到指定預算', 'error');
                return null;
            }
            
            Utils.showToast('預算已更新', 'success');
            return budget;
        } catch (error) {
            console.error('更新預算失敗', error);
            Utils.showToast('更新預算失敗', 'error');
            return null;
        }
    },
    
    // 刪除預算
    deleteBudget: function(id) {
        try {
            const budget = Store.getBudget(id);
            if (!budget) {
                Utils.showToast('找不到指定預算', 'error');
                return false;
            }
            
            const result = Store.deleteBudget(id);
            if (result) {
                Utils.showToast('預算已刪除', 'success');
            } else {
                Utils.showToast('刪除預算失敗', 'error');
            }
            
            return result;
        } catch (error) {
            console.error('刪除預算失敗', error);
            Utils.showToast('刪除預算失敗', 'error');
            return false;
        }
    },
    
    // 添加儲蓄目標
    addSavingsGoal: function(goalData) {
        try {
            const goal = Store.addSavingsGoal(goalData);
            Utils.showToast(`儲蓄目標「${goal.name}」已新增`, 'success');
            return goal;
        } catch (error) {
            console.error('新增儲蓄目標失敗', error);
            Utils.showToast('新增儲蓄目標失敗', 'error');
            return null;
        }
    },
    
/**
 * 更新儲蓄目標
 * @param {string} goalId - 目標ID
 * @param {object} goalData - 更新的目標數據
 * @returns {boolean} - 是否成功
 */
updateSavingsGoal: function(goalId, goalData) {
    try {
        console.log(`App: 嘗試更新儲蓄目標 ${goalId}`);
        console.log('更新數據:', goalData);
        
        // 使用 Store 而不是 this
        const existingGoal = Store.getSavingsGoal(goalId);
        
        if (!existingGoal) {
            console.error(`找不到ID為 ${goalId} 的儲蓄目標`);
            return false;
        }
        
        // 確保 accountId 正確處理
        if (goalData.accountId === '') {
            goalData.accountId = null;
        }
        
        // 合併數據並確保 ID 不變
        const updatedGoal = {
            ...existingGoal,
            ...goalData,
            id: goalId
        };
        
        console.log('準備保存的最終數據:', updatedGoal);
        
        // 直接使用 Store API 更新儲蓄目標
        const result = Store.updateSavingsGoal(goalId, updatedGoal);
        
        return result;
    } catch (error) {
        console.error('更新儲蓄目標時發生錯誤:', error);
        return false;
    }
},
    
    // 刪除儲蓄目標
    deleteSavingsGoal: function(id) {
        try {
            const goal = Store.getSavingsGoal(id);
            if (!goal) {
                Utils.showToast('找不到指定儲蓄目標', 'error');
                return false;
            }
            
            const result = Store.deleteSavingsGoal(id);
            if (result) {
                Utils.showToast(`儲蓄目標「${goal.name}」已刪除`, 'success');
            } else {
                Utils.showToast('刪除儲蓄目標失敗', 'error');
            }
            
            return result;
        } catch (error) {
            console.error('刪除儲蓄目標失敗', error);
            Utils.showToast('刪除儲蓄目標失敗', 'error');
            return false;
        }
    },
    
    // 更新儲蓄目標進度
    updateSavingsGoalProgress: function(id, amount, operation = 'add') {
        try {
            const goal = Store.updateSavingsGoalProgress(id, amount, operation);
            if (!goal) {
                Utils.showToast('找不到指定儲蓄目標', 'error');
                return null;
            }
            
            if (goal.completed) {
                Utils.showToast(`恭喜！儲蓄目標「${goal.name}」已達成 🎉`, 'success');
            } else {
                Utils.showToast(`儲蓄目標「${goal.name}」進度已更新`, 'success');
            }
            
            return goal;
        } catch (error) {
            console.error('更新儲蓄目標進度失敗', error);
            Utils.showToast('更新儲蓄目標進度失敗', 'error');
            return null;
        }
    },
    
    // 匯出資料
    exportData: function() {
        try {
            const data = Store.exportData();
            const jsonString = JSON.stringify(data, null, 2);
            
            // 建立下載檔案
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `financial_data_${DateUtils.today()}.json`;
            link.click();
            
            URL.revokeObjectURL(url);
            
            Utils.showToast('資料已匯出', 'success');
            return true;
        } catch (error) {
            console.error('匯出資料失敗', error);
            Utils.showToast('匯出資料失敗', 'error');
            return false;
        }
    },
    
    // 匯入資料
    importData: function(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            const result = Store.importData(data);
            
            if (result) {
                Utils.showToast('資料已成功匯入', 'success');
                // 重新整理 UI
                UiCore.showTabContent('dashboard');
            }
            
            return result;
        } catch (error) {
            console.error('匯入資料失敗', error);
            Utils.showToast('匯入資料失敗：' + (error.message || '無效的資料格式'), 'error');
            return false;
        }
    },
    
    // 清除所有資料
    clearAllData: function() {
        try {
            const result = Store.clearAllData();
            if (result) {
                Utils.showToast('所有資料已清除', 'success');
                // 重新整理 UI
                UiCore.showTabContent('dashboard');
            }
            return result;
        } catch (error) {
            console.error('清除資料失敗', error);
            Utils.showToast('清除資料失敗', 'error');
            return false;
        }
    }
};

// 當 DOM 載入完成後初始化應用程式
document.addEventListener('DOMContentLoaded', function() {
    App.init();
});