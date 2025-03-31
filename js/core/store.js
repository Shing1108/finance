// store.js - 數據存儲和管理

/**
 * 從localStorage加載設置
 */
function loadSettingsFromStorage() {
    console.log("從本地存儲加載設置");

    try {
        const settingsJson = localStorage.getItem('settings');

        if (settingsJson) {
            const loadedSettings = JSON.parse(settingsJson);

            // 更新全局設置變量
            darkMode = loadedSettings.darkMode || false;
            fontSize = loadedSettings.fontSize || 'medium';
            defaultCurrency = loadedSettings.defaultCurrency || 'HKD';
            decimalPlaces = loadedSettings.decimalPlaces || 2;
            enableBudgetAlerts = loadedSettings.enableBudgetAlerts || false;
            alertThreshold = loadedSettings.alertThreshold || 80;
            enableFirebase = loadedSettings.enableFirebase || false;

            // 更新appState中的設置
            appState.settings = loadedSettings;
        }
    } catch (error) {
        console.error("加載設置時發生錯誤:", error);
        showToast('加載設置失敗，使用默認設置', 'error');
    }
}

/**
 * 從localStorage加載數據
 */
function loadDataFromStorage() {
    console.log("從本地存儲加載數據");

    try {
        // 初始化類別對象，確保始終有收入和支出數組
        if (!appState.categories) {
            appState.categories = { income: [], expense: [] };
        } else {
            if (!appState.categories.income) appState.categories.income = [];
            if (!appState.categories.expense) appState.categories.expense = [];
        }

        // 加載設置
        loadSettingsFromStorage();

        // 加載賬戶
        const accountsJson = localStorage.getItem('accounts');
        if (accountsJson) {
            appState.accounts = JSON.parse(accountsJson);
        }

        // 加載交易
        const transactionsJson = localStorage.getItem('transactions');
        if (transactionsJson) {
            appState.transactions = JSON.parse(transactionsJson);
        }

        // 加載類別
        const categoriesJson = localStorage.getItem('categories');
        if (categoriesJson) {
            const loadedCategories = JSON.parse(categoriesJson);
            appState.categories.income = loadedCategories.income || [];
            appState.categories.expense = loadedCategories.expense || [];
        }

        // 加載預算
        const budgetsJson = localStorage.getItem('budgets');
        if (budgetsJson) {
            appState.budgets = JSON.parse(budgetsJson);
        }

        // 加載儲蓄目標
        const savingsGoalsJson = localStorage.getItem('savingsGoals');
        if (savingsGoalsJson) {
            appState.savingsGoals = JSON.parse(savingsGoalsJson);
        }

        // 加載分析設置
        const analyticsJson = localStorage.getItem('analytics');
        if (analyticsJson) {
            appState.analytics = JSON.parse(analyticsJson);
        }

        console.log("從本地存儲加載數據成功");
    } catch (error) {
        console.error("從本地存儲加載數據時發生錯誤:", error);
        showToast('加載數據失敗: ' + error.message, 'error');
    }
}

/**
 * 保存數據到localStorage
 */
function saveToLocalStorage() {
    console.log("保存數據到本地存儲");

    try {
        // 保存賬戶
        localStorage.setItem('accounts', JSON.stringify(appState.accounts));

        // 保存交易
        localStorage.setItem('transactions', JSON.stringify(appState.transactions));

        // 保存類別
        localStorage.setItem('categories', JSON.stringify(appState.categories));

        // 保存預算
        localStorage.setItem('budgets', JSON.stringify(appState.budgets));

        // 保存儲蓄目標
        localStorage.setItem('savingsGoals', JSON.stringify(appState.savingsGoals));

        // 保存分析設置
        localStorage.setItem('analytics', JSON.stringify(appState.analytics));
        
        // 保存設置
        localStorage.setItem('settings', JSON.stringify(appState.settings));

        console.log("保存到本地存儲成功");
    } catch (error) {
        console.error("保存到本地存儲時發生錯誤:", error);
        showToast('保存數據失敗: ' + error.message, 'error');
    }
}

/**
 * 導出數據為JSON文件
 */
function exportData() {
    console.log("導出數據");

    try {
        // 創建導出對象
        const exportData = {
            accounts: appState.accounts,
            transactions: appState.transactions,
            categories: appState.categories,
            budgets: appState.budgets,
            savingsGoals: appState.savingsGoals,
            analytics: appState.analytics,
            version: '1.3.0',
            exportDate: new Date().toISOString()
        };

        // 轉換為JSON
        const exportJson = JSON.stringify(exportData, null, 2);

        // 創建下載鏈接
        const blob = new Blob([exportJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // 創建下載鏈接
        const a = document.createElement('a');
        a.href = url;
        a.download = `finance-tracker-export-${new Date().toISOString().split('T')[0]}.json`;

        // 觸發下載
        document.body.appendChild(a);
        a.click();

        // 清理
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // 顯示成功消息
        showToast('數據已導出', 'success');
    } catch (error) {
        console.error("導出數據時發生錯誤:", error);
        showToast('導出數據失敗: ' + error.message, 'error');
    }
}

/**
 * 從文件導入數據
 */
function importDataFromFile(event) {
    console.log("從文件導入數據");

    try {
        const file = document.getElementById('fileImport').files[0];

        if (!file) {
            return;
        }

        const reader = new FileReader();

        reader.onload = function (e) {
            try {
                const importData = JSON.parse(e.target.result);
                importDataFromObject(importData);
            } catch (error) {
                console.error("解析導入文件時發生錯誤:", error);
                showToast('導入文件格式不正確', 'error');
            }
        };

        reader.readAsText(file);
    } catch (error) {
        console.error("從文件導入數據時發生錯誤:", error);
        showToast('導入數據失敗: ' + error.message, 'error');
    }
}

/**
 * 從文本導入數據
 */
function importDataFromText() {
    console.log("從文本導入數據");

    try {
        const jsonText = document.getElementById('jsonImport').value;

        if (!jsonText) {
            showToast('請輸入要導入的數據', 'error');
            return;
        }

        try {
            const importData = JSON.parse(jsonText);
            importDataFromObject(importData);
        } catch (error) {
            console.error("解析導入文本時發生錯誤:", error);
            showToast('導入文本格式不正確', 'error');
        }
    } catch (error) {
        console.error("從文本導入數據時發生錯誤:", error);
        showToast('導入數據失敗: ' + error.message, 'error');
    }
}

/**
 * 從對象導入數據
 */
function importDataFromObject(importData) {
    console.log("從對象導入數據");

    try {
        // 檢查是否是有效的導入數據
        if (!importData.accounts || !importData.transactions || !importData.categories) {
            showToast('導入數據無效，缺少必要字段', 'error');
            return;
        }

        // 確認導入
        const message = '確定要導入這些數據嗎?這將覆蓋當前的所有數據。';

        showConfirmDialog(message, () => {
            try {
                // 更新appState
                appState.accounts = importData.accounts || [];
                appState.transactions = importData.transactions || [];
                appState.categories = importData.categories || { income: [], expense: [] };

                // 導入預算(如果有)
                if (importData.budgets) {
                    appState.budgets = importData.budgets;
                }
                
                // 導入儲蓄目標(如果有)
                if (importData.savingsGoals) {
                    appState.savingsGoals = importData.savingsGoals;
                }
                
                // 導入分析設置(如果有)
                if (importData.analytics) {
                    appState.analytics = importData.analytics;
                }

                // 保存到本地存儲
                saveToLocalStorage();

                // 執行同步(如果啟用)
                if (enableFirebase && isLoggedIn) {
                    syncToFirebase();
                }

                // 更新所有UI
                updateAllUI();

                // 清空導入文本
                const jsonImport = document.getElementById('jsonImport');
                if (jsonImport) {
                    jsonImport.value = '';
                }

                // 清空文件選擇器
                const fileImport = document.getElementById('fileImport');
                if (fileImport) {
                    fileImport.value = '';
                }

                // 顯示成功消息
                showToast('數據已成功導入', 'success');
            } catch (error) {
                console.error("導入數據時發生錯誤:", error);
                showToast('導入數據失敗: ' + error.message, 'error');
            }
        });
    } catch (error) {
        console.error("從對象導入數據時發生錯誤:", error);
        showToast('導入數據失敗: ' + error.message, 'error');
    }
}

/**
 * 清除所有數據
 */
function clearAllData() {
    console.log("清除所有數據");

    try {
        // 備份當前設置
        const currentSettings = {...appState.settings};
        
        // 重置appState
        appState.accounts = [];
        appState.transactions = [];
        appState.savingsGoals = [];
        appState.categories = {
            income: [],
            expense: []
        };
        appState.budgets = {
            total: 0,
            resetCycle: 'monthly',
            resetDay: 1,
            categories: []
        };
        appState.analytics = {
            lastUsedPeriod: 'month',
            customPeriod: {
                start: null,
                end: null
            }
        };
        
        // 恢復設置
        appState.settings = currentSettings;
        
        // 更新全局設置變量
        darkMode = currentSettings.darkMode || false;
        fontSize = currentSettings.fontSize || 'medium';
        defaultCurrency = currentSettings.defaultCurrency || 'HKD';
        decimalPlaces = currentSettings.decimalPlaces || 2;
        enableBudgetAlerts = currentSettings.enableBudgetAlerts || false;
        alertThreshold = currentSettings.alertThreshold || 80;
        enableFirebase = currentSettings.enableFirebase || false;

        // 保存到本地存儲
        saveToLocalStorage();

        // 執行同步(如果啟用)
        if (enableFirebase && isLoggedIn) {
            syncToFirebase();
        }

        // 更新所有UI
        updateAllUI();

        // 顯示成功消息
        showToast('所有數據已清除', 'success');
    } catch (error) {
        console.error("清除所有數據時發生錯誤:", error);
        showToast('清除數據失敗: ' + error.message, 'error');
    }
}

// 導出函數
window.loadDataFromStorage = loadDataFromStorage;
window.saveToLocalStorage = saveToLocalStorage;
window.exportData = exportData;
window.importDataFromFile = importDataFromFile;
window.importDataFromText = importDataFromText;
window.clearAllData = clearAllData;