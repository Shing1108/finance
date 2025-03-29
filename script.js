// 全局變量
let appState = {
    accounts: [],
    transactions: [],
    categories: {
        income: [],
        expense: []
    },
    budgets: {
        total: 0,
        resetCycle: 'monthly',
        resetDay: 1,
        categories: []
    },
    settings: {
        darkMode: false,
        fontSize: 'medium',
        defaultCurrency: 'HKD',
        decimalPlaces: 2,
        enableBudgetAlerts: false,
        alertThreshold: 80,
        enableFirebase: false
    }
};

let darkMode = false;
let fontSize = 'medium';
let defaultCurrency = 'HKD';
let decimalPlaces = 2;
let enableBudgetAlerts = false;
let alertThreshold = 80;
let enableFirebase = false;

// Firebase 相關變量
let firebase;
let db;
let isLoggedIn = false;
let user = null;
let currentlyLoading = false;

// 匯率數據
let exchangeRates = {
    HKD: { USD: 0.13, CNY: 0.84, EUR: 0.11, GBP: 0.1, JPY: 17.8 },
    USD: { HKD: 7.8, CNY: 6.5, EUR: 0.85, GBP: 0.75, JPY: 140 },
    CNY: { HKD: 1.19, USD: 0.15, EUR: 0.13, GBP: 0.11, JPY: 21.5 },
    EUR: { HKD: 9.2, USD: 1.18, CNY: 7.65, GBP: 0.88, JPY: 165 },
    GBP: { HKD: 10.5, USD: 1.34, CNY: 8.7, EUR: 1.14, JPY: 187 },
    JPY: { HKD: 0.056, USD: 0.0071, CNY: 0.047, EUR: 0.0061, GBP: 0.0053 }
};

// 貨幣符號
const currencySymbols = {
    HKD: "HK$",
    USD: "$",
    CNY: "¥",
    EUR: "€",
    GBP: "£",
    JPY: "¥"
};

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    try {
        console.log("應用程序初始化中...");
        
        // 嘗試從localStorage載入設置
        loadSettingsFromStorage();
        
        // 應用設置
        applySettings();
        
        // 載入數據
        loadDataFromStorage();
        
        // 設置事件監聽器
        setupEventListeners();
        
        // 預填充表單日期為今天
        setDefaultDates();
        
        // 初始化UI更新
        updateAllUI();
        
        // 初始化Firebase (如果已啟用)
        if (enableFirebase) {
            initFirebase()
                .then(() => {
                    console.log("Firebase初始化成功");
                    updateSyncStatus();
                })
                .catch(error => {
                    console.error("Firebase初始化失敗:", error);
                    showToast('雲端同步設置失敗: ' + error.message, 'error');
                });
        } else {
            updateSyncStatus();
        }
        
        console.log("應用程序初始化完成");
        
        // 隱藏載入覆蓋層
        document.getElementById('loadingOverlay').style.display = 'none';
    } catch (error) {
        console.error("初始化時發生錯誤:", error);
        
        // 嘗試顯示一個友好的錯誤消息
        document.getElementById('loadingOverlay').innerHTML = `
            <div class="error-screen">
                <h2>初始化失敗</h2>
                <p>應用程序載入時發生錯誤。請重新載入頁面試試。</p>
                <p>錯誤詳情: ${error.message}</p>
                <button onclick="location.reload()" class="btn btn-primary">重新載入</button>
            </div>
        `;
    }
});

// 設置事件監聽器
function setupEventListeners() {
    console.log("設置事件監聽器...");
    
    // 側邊欄導航事件
    document.querySelectorAll('.nav-links li').forEach(item => {
        item.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            showTabContent(tabId);
        });
    });
    
    // 獲取各個按鈕和元素
    const addAccountButton = document.getElementById('addAccountButton');
    const addIncomeCategoryButton = document.getElementById('addIncomeCategoryButton');
    const addExpenseCategoryButton = document.getElementById('addExpenseCategoryButton');
    const saveAccountButton = document.getElementById('saveAccountButton');
    const saveCategoryButton = document.getElementById('saveCategoryButton');
    const saveIncomeButton = document.getElementById('saveIncomeButton');
    const saveExpenseButton = document.getElementById('saveExpenseButton');
    const confirmTransferButton = document.getElementById('confirmTransferButton');
    const settingsButton = document.getElementById('settingsButton');
    const saveSettingsButton = document.getElementById('saveSettingsButton');
    const clearDataButton = document.getElementById('clearDataButton');
    const saveBudgetSettingsButton = document.getElementById('saveBudgetSettingsButton');
    const addCategoryBudgetButton = document.getElementById('addCategoryBudgetButton');
    const selectIconButton = document.getElementById('selectIconButton');
    const searchTransactionsButton = document.getElementById('searchTransactionsButton');
    const exportDataButton = document.getElementById('exportDataButton');
    const importDataButton = document.getElementById('importDataButton');
    const manageCurrencyButton = document.getElementById('manageCurrencyButton');
    const fileImport = document.getElementById('fileImport');
    const loginButton = document.getElementById('loginButton');
    const logoutButton = document.getElementById('logoutButton');
    const syncNowButton = document.getElementById('syncNowButton');
    
    // 收入/支出標簽切換
    const incomeTabButton = document.getElementById('incomeTabButton');
    const expenseTabButton = document.getElementById('expenseTabButton');
    
    // 收入/支出類別標簽切換
    const incomeCategoryTabButton = document.getElementById('incomeCategoryTabButton');
    const expenseCategoryTabButton = document.getElementById('expenseCategoryTabButton');
    
    // 賬戶視圖切換
    const accountCardView = document.getElementById('accountCardView');
    const accountListView = document.getElementById('accountListView');
    
    // 類別視圖切換
    const incomeCategoryCardView = document.getElementById('incomeCategoryCardView');
    const incomeCategoryListView = document.getElementById('incomeCategoryListView');
    const expenseCategoryCardView = document.getElementById('expenseCategoryCardView');
    const expenseCategoryListView = document.getElementById('expenseCategoryListView');
    
    // 所有模態框的關閉按鈕
    document.querySelectorAll('.close-button, .modal-cancel').forEach(button => {
        button.addEventListener('click', closeCurrentModal);
    });
    
    // 添加帳戶點擊事件
    if (addAccountButton) {
        addAccountButton.addEventListener('click', function() {
            openModal('addAccountModal');
        });
    }
    
    // 保存帳戶點擊事件
    if (saveAccountButton) {
        saveAccountButton.addEventListener('click', saveAccount);
    }
    
    // 添加收入類別點擊事件
    if (addIncomeCategoryButton) {
        addIncomeCategoryButton.addEventListener('click', function() {
            document.getElementById('categoryType').value = 'income';
            openModal('addCategoryModal');
        });
    }
    
    // 添加支出類別點擊事件
    if (addExpenseCategoryButton) {
        addExpenseCategoryButton.addEventListener('click', function() {
            document.getElementById('categoryType').value = 'expense';
            openModal('addCategoryModal');
        });
    }
    
    // 保存類別點擊事件
    if (saveCategoryButton) {
        saveCategoryButton.addEventListener('click', saveCategory);
    }
    
    // 保存收入點擊事件
    if (saveIncomeButton) {
        saveIncomeButton.addEventListener('click', function() {
            saveTransaction('income');
        });
    }
    
    // 保存支出點擊事件
    if (saveExpenseButton) {
        saveExpenseButton.addEventListener('click', function() {
            saveTransaction('expense');
        });
    }
    
    // 確認轉賬點擊事件
    if (confirmTransferButton) {
        confirmTransferButton.addEventListener('click', processTransfer);
    }
    
    // 設定按鈕點擊事件
    if (settingsButton) {
        settingsButton.addEventListener('click', function() {
            loadSettingsToForm();
            openModal('settingsModal');
        });
    }
    
    // 保存設定點擊事件
    if (saveSettingsButton) {
        saveSettingsButton.addEventListener('click', saveSettings);
    }
    
    // 清除數據按鈕點擊事件
    if (clearDataButton) {
        clearDataButton.addEventListener('click', function() {
            const message = '確定要清除所有數據嗎？此操作無法復原。';
            showConfirmDialog(message, clearAllData);
        });
    }
    
    // 保存預算設定按鈕點擊事件
    if (saveBudgetSettingsButton) {
        saveBudgetSettingsButton.addEventListener('click', saveBudgetSettings);
    }
    
    // 添加類別預算點擊事件
    if (addCategoryBudgetButton) {
        addCategoryBudgetButton.addEventListener('click', addCategoryBudget);
    }
    
    // 選擇圖標按鈕點擊事件
    if (selectIconButton) {
        selectIconButton.addEventListener('click', function() {
            const iconGrid = document.getElementById('iconGrid');
            if (iconGrid.style.display === 'none') {
                populateIconGrid();
                iconGrid.style.display = 'grid';
            } else {
                iconGrid.style.display = 'none';
            }
        });
    }
    
    // 搜索交易按鈕點擊事件
    if (searchTransactionsButton) {
        searchTransactionsButton.addEventListener('click', filterTransactions);
    }
    
    // 導出數據按鈕點擊事件
    if (exportDataButton) {
        exportDataButton.addEventListener('click', exportData);
    }
    
    // 導入數據按鈕點擊事件
    if (importDataButton) {
        importDataButton.addEventListener('click', importDataFromText);
    }
    
    // 文件導入點擊事件
    if (fileImport) {
        fileImport.addEventListener('change', importDataFromFile);
    }
    
    // 登入按鈕點擊事件
    if (loginButton) {
        loginButton.addEventListener('click', handleLogin);
    }
    
    // 登出按鈕點擊事件
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
    
    // 立即同步按鈕點擊事件
    if (syncNowButton) {
        syncNowButton.addEventListener('click', syncNow);
    }
    
    // 貨幣管理按鈕點擊事件
    if (manageCurrencyButton) {
        manageCurrencyButton.addEventListener('click', function() {
            openCurrencyManagementModal();
        });
    }
    
    // 收入/支出標簽切換事件
    if (incomeTabButton && expenseTabButton) {
        incomeTabButton.addEventListener('click', function() {
            this.classList.add('active');
            expenseTabButton.classList.remove('active');
            document.getElementById('incomeTab').classList.add('active');
            document.getElementById('expenseTab').classList.remove('active');
        });
        
        expenseTabButton.addEventListener('click', function() {
            this.classList.add('active');
            incomeTabButton.classList.remove('active');
            document.getElementById('expenseTab').classList.add('active');
            document.getElementById('incomeTab').classList.remove('active');
        });
    }
    
    // 收入/支出類別標簽切換事件
    if (incomeCategoryTabButton && expenseCategoryTabButton) {
        incomeCategoryTabButton.addEventListener('click', function() {
            this.classList.add('active');
            expenseCategoryTabButton.classList.remove('active');
            document.getElementById('incomeCategoryTab').classList.add('active');
            document.getElementById('expenseCategoryTab').classList.remove('active');
        });
        
        expenseCategoryTabButton.addEventListener('click', function() {
            this.classList.add('active');
            incomeCategoryTabButton.classList.remove('active');
            document.getElementById('expenseCategoryTab').classList.add('active');
            document.getElementById('incomeCategoryTab').classList.remove('active');
        });
    }
    
    // 賬戶視圖切換事件
    if (accountCardView && accountListView) {
        accountCardView.addEventListener('click', function() {
            this.classList.add('active');
            accountListView.classList.remove('active');
            document.getElementById('accountsList').className = 'accounts-list card-view';
        });
        
        accountListView.addEventListener('click', function() {
            this.classList.add('active');
            accountCardView.classList.remove('active');
            document.getElementById('accountsList').className = 'accounts-list list-view';
        });
    }
    
    // 收入類別視圖切換事件
    if (incomeCategoryCardView && incomeCategoryListView) {
        incomeCategoryCardView.addEventListener('click', function() {
            this.classList.add('active');
            incomeCategoryListView.classList.remove('active');
            document.getElementById('incomeCategoriesList').className = 'categories-list card-view';
        });
        
        incomeCategoryListView.addEventListener('click', function() {
            this.classList.add('active');
            incomeCategoryCardView.classList.remove('active');
            document.getElementById('incomeCategoriesList').className = 'categories-list list-view';
        });
    }
    
    // 支出類別視圖切換事件
    if (expenseCategoryCardView && expenseCategoryListView) {
        expenseCategoryCardView.addEventListener('click', function() {
            this.classList.add('active');
            expenseCategoryListView.classList.remove('active');
            document.getElementById('expenseCategoriesList').className = 'categories-list card-view';
        });
        
        expenseCategoryListView.addEventListener('click', function() {
            this.classList.add('active');
            expenseCategoryCardView.classList.remove('active');
            document.getElementById('expenseCategoriesList').className = 'categories-list list-view';
        });
    }
    
    // 轉賬匯率監聽
    setupTransferExchangeRateListener();
    
    // 自動計算預算切換
    const autoCalculateBudget = document.getElementById('autoCalculateBudget');
    if (autoCalculateBudget) {
        autoCalculateBudget.addEventListener('change', function() {
            const totalBudgetInput = document.getElementById('totalBudget');
            if (this.checked) {
                totalBudgetInput.disabled = true;
                totalBudgetInput.value = calculateTotalCategoryBudget();
            } else {
                totalBudgetInput.disabled = false;
            }
        });
    }
    
    // 重設週期變更事件
    document.querySelectorAll('input[name="resetCycle"]').forEach(input => {
        input.addEventListener('change', function() {
            const monthlyResetDayInput = document.getElementById('monthlyResetDay');
            const monthlyResetDayContainer = monthlyResetDayInput.parentElement;
            
            if (this.value === 'monthly') {
                monthlyResetDayContainer.style.display = 'block';
            } else {
                monthlyResetDayContainer.style.display = 'none';
            }
        });
    });
    
    console.log("事件監聽器設置完成");
}

// 顯示指定的選項卡內容
function showTabContent(tabId) {
    console.log(`切換到${tabId}選項卡`);
    
    // 移除所有標簽的激活狀態
    document.querySelectorAll('.nav-links li').forEach(item => {
        item.classList.remove('active');
    });
    
    // 激活點擊的標簽
    document.querySelector(`.nav-links li[data-tab="${tabId}"]`).classList.add('active');
    
    // 隱藏所有內容
    document.querySelectorAll('.tab-content').forEach(item => {
        item.classList.remove('active');
    });
    
    // 顯示對應的內容
    const tabElement = document.getElementById(tabId);
    if (tabElement) {
        tabElement.classList.add('active');
    } else {
        console.error(`找不到ID為${tabId}的選項卡元素`);
    }
    
    // 根據當前標簽更新UI
    switch (tabId) {
        case 'dashboard':
            updateDashboardUI();
            break;
        case 'accounts':
            updateAccountsUI();
            updateTransferForm();
            break;
        case 'transactions':
            updateTransactionsUI();
            updateTransactionsForms();
            break;
        case 'budgets':
            updateBudgetsUI();
            break;
        case 'categories':
            updateCategoriesUI();
            break;
        case 'statistics':
            updateStatisticsUI();
            break;
        case 'sync':
            updateSyncUI();
            break;
    }
}

// 打開模態框
function openModal(modalId) {
    console.log(`打開模態框: ${modalId}`);
    
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error(`找不到ID為${modalId}的模態框`);
        return;
    }
    
    modal.classList.add('active');
    
    // 特定模態框的初始化
    if (modalId === 'addAccountModal') {
        resetAccountForm();
    } else if (modalId === 'addCategoryModal') {
        resetCategoryForm();
    }
}

// 關閉當前打開的模態框
function closeCurrentModal() {
    console.log("關閉當前模態框");
    
    document.querySelectorAll('.modal.active').forEach(modal => {
        modal.classList.remove('active');
    });
}

// 重置賬戶表單
function resetAccountForm() {
    console.log("重置賬戶表單");
    
    document.getElementById('accountName').value = '';
    document.getElementById('accountType').value = '';
    document.getElementById('initialBalance').value = '';
    document.getElementById('accountCurrency').value = defaultCurrency;
    document.getElementById('accountNote').value = '';
}

// 重置類別表單
function resetCategoryForm() {
    console.log("重置類別表單");
    
    document.getElementById('categoryName').value = '';
    document.getElementById('selectedIcon').className = 'fas fa-tag';
    document.getElementById('categoryColor').value = '#4CAF50';
    document.getElementById('categoryOrder').value = '0';
    
    // 隱藏圖標網格
    document.getElementById('iconGrid').style.display = 'none';
}

// 保存賬戶
function saveAccount() {
    console.log("保存賬戶");
    
    try {
        const accountName = document.getElementById('accountName').value.trim();
        const accountType = document.getElementById('accountType').value;
        const initialBalance = parseFloat(document.getElementById('initialBalance').value) || 0;
        const accountCurrency = document.getElementById('accountCurrency').value;
        const accountNote = document.getElementById('accountNote').value.trim();
        
        // 驗證
        if (!accountName) {
            showToast('請輸入賬戶名稱', 'error');
            return;
        }
        
        if (!accountType) {
            showToast('請選擇賬戶類型', 'error');
            return;
        }
        
        // 創建賬戶對象
        const newAccount = {
            id: generateId(),
            name: accountName,
            type: accountType,
            balance: initialBalance,
            currency: accountCurrency,
            note: accountNote,
            createdAt: new Date().toISOString()
        };
        
        // 添加到賬戶數組
        appState.accounts.push(newAccount);
        
        // 更新UI
        updateAccountsUI();
        updateAllDropdowns();
        
        // 保存到本地存儲
        saveToLocalStorage();
        
        // 執行同步（如果啟用）
        if (enableFirebase && isLoggedIn) {
            syncToFirebase();
        }
        
        // 關閉模態框
        closeCurrentModal();
        
        // 顯示成功消息
        showToast(`已新增帳戶: ${accountName}`, 'success');
    } catch (error) {
        console.error("保存賬戶時發生錯誤:", error);
        showToast('保存賬戶失敗: ' + error.message, 'error');
    }
}

// 保存類別
function saveCategory() {
    console.log("保存類別");
    
    try {
        const categoryName = document.getElementById('categoryName').value.trim();
        const categoryIcon = document.getElementById('selectedIcon').className;
        const categoryColor = document.getElementById('categoryColor').value;
        const categoryOrder = parseInt(document.getElementById('categoryOrder').value) || 0;
        const categoryType = document.getElementById('categoryType').value;
        
        // 驗證
        if (!categoryName) {
            showToast('請輸入類別名稱', 'error');
            return;
        }
        
        // 創建類別對象
        const newCategory = {
            id: generateId(),
            name: categoryName,
            icon: categoryIcon,
            color: categoryColor,
            order: categoryOrder,
            createdAt: new Date().toISOString()
        };
        
        // 添加到相應的類別數組
        if (categoryType === 'income') {
            appState.categories.income.push(newCategory);
        } else {
            appState.categories.expense.push(newCategory);
        }
        
        // 更新UI
        updateCategoriesUI();
        updateAllDropdowns();
        
        // 保存到本地存儲
        saveToLocalStorage();
        
        // 執行同步（如果啟用）
        if (enableFirebase && isLoggedIn) {
            syncToFirebase();
        }
        
        // 關閉模態框
        closeCurrentModal();
        
        // 顯示成功消息
        showToast(`已新增${categoryType === 'income' ? '收入' : '支出'}類別: ${categoryName}`, 'success');
    } catch (error) {
        console.error("保存類別時發生錯誤:", error);
        showToast('保存類別失敗: ' + error.message, 'error');
    }
}

// 保存交易
function saveTransaction(type) {
    console.log(`保存${type === 'income' ? '收入' : '支出'}交易`);
    
    try {
        const accountId = document.getElementById(`${type}Account`).value;
        const categoryId = document.getElementById(`${type}Category`).value;
        const amount = parseFloat(document.getElementById(`${type}Amount`).value);
        const date = document.getElementById(`${type}Date`).value;
        const note = document.getElementById(`${type}Note`).value.trim();
        
        // 驗證
        if (!accountId) {
            showToast('請選擇賬戶', 'error');
            return;
        }
        
        if (!categoryId) {
            showToast('請選擇類別', 'error');
            return;
        }
        
        if (!amount || amount <= 0) {
            showToast('請輸入有效金額', 'error');
            return;
        }
        
        if (!date) {
            showToast('請選擇日期', 'error');
            return;
        }
        
        // 創建交易對象
        const newTransaction = {
            id: generateId(),
            type: type,
            accountId: accountId,
            categoryId: categoryId,
            amount: amount,
            date: date,
            note: note,
            createdAt: new Date().toISOString()
        };
        
        // 更新賬戶餘額
        const account = appState.accounts.find(a => a.id === accountId);
        if (account) {
            if (type === 'income') {
                account.balance += amount;
            } else {
                account.balance -= amount;
            }
        }
        
        // 添加到交易數組
        appState.transactions.push(newTransaction);
        
        // 更新UI
        updateTransactionsUI();
        updateAccountsUI();
        updateDashboardUI();
        
        // 清空表單
        document.getElementById(`${type}Amount`).value = '';
        document.getElementById(`${type}Note`).value = '';
        
        // 保存到本地存儲
        saveToLocalStorage();
        
        // 檢查預算警告
        checkBudgetAlerts();
        
        // 執行同步（如果啟用）
        if (enableFirebase && isLoggedIn) {
            syncToFirebase();
        }
        
        // 顯示成功消息
        showToast(`已記錄${type === 'income' ? '收入' : '支出'}: ${formatCurrency(amount)}`, 'success');
    } catch (error) {
        console.error(`保存${type}交易時發生錯誤:`, error);
        showToast(`保存${type === 'income' ? '收入' : '支出'}交易失敗: ` + error.message, 'error');
    }
}

// 處理轉賬
function processTransfer() {
    console.log("處理轉賬");
    
    try {
        const fromAccountId = document.getElementById('fromAccount').value;
        const toAccountId = document.getElementById('toAccount').value;
        const amount = parseFloat(document.getElementById('transferAmount').value);
        
        // 驗證
        if (!fromAccountId) {
            showToast('請選擇轉出賬戶', 'error');
            return;
        }
        
        if (!toAccountId) {
            showToast('請選擇轉入賬戶', 'error');
            return;
        }
        
        if (fromAccountId === toAccountId) {
            showToast('轉出和轉入賬戶不能相同', 'error');
            return;
        }
        
        if (!amount || amount <= 0) {
            showToast('請輸入有效金額', 'error');
            return;
        }
        
        // 獲取賬戶
        const fromAccount = appState.accounts.find(a => a.id === fromAccountId);
        const toAccount = appState.accounts.find(a => a.id === toAccountId);
        
        if (!fromAccount || !toAccount) {
            showToast('賬戶找不到', 'error');
            return;
        }
        
        // 檢查餘額
        if (fromAccount.balance < amount) {
            showToast('餘額不足', 'error');
            return;
        }
        
        // 計算匯率（如果貨幣不同）
        let exchangeRate = 1;
        let receivingAmount = amount;
        
        if (fromAccount.currency !== toAccount.currency) {
            exchangeRate = getExchangeRate(fromAccount.currency, toAccount.currency);
            receivingAmount = amount * exchangeRate;
        }
        
        // 更新賬戶餘額
        fromAccount.balance -= amount;
        toAccount.balance += receivingAmount;
        
        // 記錄轉賬交易
        const today = new Date().toISOString().split('T')[0];
        
        // 轉出交易
        const outTransaction = {
            id: generateId(),
            type: 'expense',
            accountId: fromAccountId,
            categoryId: 'transfer_out', // 特殊類別
            amount: amount,
            date: today,
            note: `轉賬至 ${toAccount.name}`,
            transferId: generateId(), // 關聯ID
            createdAt: new Date().toISOString()
        };
        
        // 轉入交易
        const inTransaction = {
            id: generateId(),
            type: 'income',
            accountId: toAccountId,
            categoryId: 'transfer_in', // 特殊類別
            amount: receivingAmount,
            date: today,
            note: `來自 ${fromAccount.name} 的轉賬`,
            transferId: outTransaction.transferId, // 關聯ID
            createdAt: new Date().toISOString()
        };
        
        // 添加到交易數組
        appState.transactions.push(outTransaction);
        appState.transactions.push(inTransaction);
        
        // 更新UI
        updateAccountsUI();
        updateTransferForm();
        updateTransactionsUI();
        updateDashboardUI();
        
        // 清空表單
        document.getElementById('transferAmount').value = '';
        
        // 保存到本地存儲
        saveToLocalStorage();
        
        // 執行同步（如果啟用）
        if (enableFirebase && isLoggedIn) {
            syncToFirebase();
        }
        
        // 顯示成功消息
        showToast(`已轉賬 ${formatCurrency(amount, fromAccount.currency)} 至 ${toAccount.name}`, 'success');
    } catch (error) {
        console.error("處理轉賬時發生錯誤:", error);
        showToast('轉賬處理失敗: ' + error.message, 'error');
    }
}

// 設置轉賬匯率監聽器
function setupTransferExchangeRateListener() {
    console.log("設置轉賬匯率監聽器");
    
    const fromAccountSelect = document.getElementById('fromAccount');
    const toAccountSelect = document.getElementById('toAccount');
    const transferAmountInput = document.getElementById('transferAmount');
    
    if (!fromAccountSelect || !toAccountSelect || !transferAmountInput) {
        console.error("找不到轉賬表單元素");
        return;
    }
    
    const updateExchangeRateInfo = function() {
        const fromAccountId = fromAccountSelect.value;
        const toAccountId = toAccountSelect.value;
        const amount = parseFloat(transferAmountInput.value) || 0;
        
        if (!fromAccountId || !toAccountId) {
            document.getElementById('transferExchangeRate').textContent = '--';
            document.getElementById('receivingAmount').textContent = '--';
            return;
        }
        
        const fromAccount = appState.accounts.find(a => a.id === fromAccountId);
        const toAccount = appState.accounts.find(a => a.id === toAccountId);
        
        if (!fromAccount || !toAccount) {
            return;
        }
        
        if (fromAccount.currency === toAccount.currency) {
            document.getElementById('transferExchangeRate').textContent = '1:1';
            document.getElementById('receivingAmount').textContent = formatCurrency(amount, toAccount.currency);
        } else {
            const rate = getExchangeRate(fromAccount.currency, toAccount.currency);
            document.getElementById('transferExchangeRate').textContent = `1 ${fromAccount.currency} = ${rate.toFixed(6)} ${toAccount.currency}`;
            document.getElementById('receivingAmount').textContent = formatCurrency(amount * rate, toAccount.currency);
        }
    };
    
    fromAccountSelect.addEventListener('change', updateExchangeRateInfo);
    toAccountSelect.addEventListener('change', updateExchangeRateInfo);
    transferAmountInput.addEventListener('input', updateExchangeRateInfo);
}

// 保存預算設置
function saveBudgetSettings() {
    console.log("保存預算設置");
    
    try {
        // 獲取表單值
        const autoCalculate = document.getElementById('autoCalculateBudget').checked;
        
        let totalBudget = 0;
        if (autoCalculate) {
            totalBudget = calculateTotalCategoryBudget();
        } else {
            totalBudget = parseFloat(document.getElementById('totalBudget').value) || 0;
        }
        
        const resetCycle = document.querySelector('input[name="resetCycle"]:checked')?.value || 'monthly';
        const resetDay = parseInt(document.getElementById('monthlyResetDay').value) || 1;
        const inheritPrevious = document.getElementById('inheritPreviousBudget').checked;
        
        // 更新預算設置
        appState.budgets.total = totalBudget;
        appState.budgets.resetCycle = resetCycle;
        appState.budgets.resetDay = resetDay;
        appState.budgets.inheritPrevious = inheritPrevious;
        appState.budgets.autoCalculate = autoCalculate;
        
        // 更新UI
        updateBudgetsUI();
        updateDashboardUI();
        
        // 保存到本地存儲
        saveToLocalStorage();
        
        // 執行同步（如果啟用）
        if (enableFirebase && isLoggedIn) {
            syncToFirebase();
        }
        
        // 顯示成功消息
        showToast('預算設置已保存', 'success');
    } catch (error) {
        console.error("保存預算設置時發生錯誤:", error);
        showToast('保存預算設置失敗: ' + error.message, 'error');
    }
}

// 添加類別預算
function addCategoryBudget() {
    console.log("添加類別預算");
    
    try {
        const categoryId = document.getElementById('categoryBudgetSelect').value;
        const budgetAmount = parseFloat(document.getElementById('categoryBudgetAmount').value);
        
        // 驗證
        if (!categoryId) {
            showToast('請選擇類別', 'error');
            return;
        }
        
        if (!budgetAmount || budgetAmount <= 0) {
            showToast('請輸入有效金額', 'error');
            return;
        }
        
        // 檢查類別是否已有預算
        const existingIndex = appState.budgets.categories.findIndex(b => b.categoryId === categoryId);
        
        if (existingIndex !== -1) {
            // 更新現有預算
            appState.budgets.categories[existingIndex].amount = budgetAmount;
        } else {
            // 添加新預算
            appState.budgets.categories.push({
                id: generateId(),
                categoryId: categoryId,
                amount: budgetAmount
            });
        }
        
        // 如果啟用自動計算，更新總預算
        if (appState.budgets.autoCalculate) {
            appState.budgets.total = calculateTotalCategoryBudget();
        }
        
        // 更新UI
        updateBudgetsUI();
        updateDashboardUI();
        
        // 清空表單
        document.getElementById('categoryBudgetAmount').value = '';
        
        // 保存到本地存儲
        saveToLocalStorage();
        
        // 執行同步（如果啟用）
        if (enableFirebase && isLoggedIn) {
            syncToFirebase();
        }
        
        // 顯示成功消息
        showToast('類別預算已添加', 'success');
    } catch (error) {
        console.error("添加類別預算時發生錯誤:", error);
        showToast('添加類別預算失敗: ' + error.message, 'error');
    }
}

// 計算總類別預算
function calculateTotalCategoryBudget() {
    if (!appState.budgets || !appState.budgets.categories) {
        return 0;
    }
    
    return appState.budgets.categories.reduce((sum, budget) => sum + budget.amount, 0);
}

// 填充圖標網格
function populateIconGrid() {
    console.log("填充圖標網格");
    
    const iconGrid = document.getElementById('iconGrid');
    if (!iconGrid) {
        console.error("找不到圖標網格元素");
        return;
    }
    
    // 清空網格
    iconGrid.innerHTML = '';
    
    // 常用圖標數組
    const icons = [
        'fa-money-bill-wave', 'fa-credit-card', 'fa-coins', 'fa-wallet',
        'fa-piggy-bank', 'fa-dollar-sign', 'fa-donate', 'fa-hand-holding-usd',
        'fa-receipt', 'fa-shopping-cart', 'fa-shopping-bag', 'fa-store',
        'fa-utensils', 'fa-hamburger', 'fa-coffee', 'fa-wine-glass-alt',
        'fa-home', 'fa-house-user', 'fa-bed', 'fa-bath',
        'fa-car', 'fa-bus', 'fa-train', 'fa-plane',
        'fa-tshirt', 'fa-socks', 'fa-shoe-prints', 'fa-hat-cowboy',
        'fa-gamepad', 'fa-film', 'fa-music', 'fa-ticket-alt',
        'fa-book', 'fa-graduation-cap', 'fa-laptop', 'fa-mobile-alt',
        'fa-hospital', 'fa-pills', 'fa-first-aid', 'fa-tooth',
        'fa-dog', 'fa-cat', 'fa-paw', 'fa-bone',
        'fa-baby', 'fa-child', 'fa-user', 'fa-users',
        'fa-gift', 'fa-birthday-cake', 'fa-cookie', 'fa-candy-cane',
        'fa-tools', 'fa-hammer', 'fa-screwdriver', 'fa-wrench',
        'fa-briefcase', 'fa-business-time', 'fa-building', 'fa-city',
        'fa-chart-line', 'fa-chart-pie', 'fa-chart-bar', 'fa-percentage',
        'fa-dumbbell', 'fa-running', 'fa-swimming-pool', 'fa-bicycle',
        'fa-sun', 'fa-umbrella-beach', 'fa-mountain', 'fa-tree',
        'fa-globe', 'fa-plane-departure', 'fa-map-marked-alt', 'fa-route',
        'fa-paint-brush', 'fa-palette', 'fa-camera', 'fa-image',
        'fa-cut', 'fa-broom', 'fa-trash', 'fa-recycle'
    ];
    
    // 為每個圖標創建元素
    icons.forEach(icon => {
        const iconItem = document.createElement('div');
        iconItem.className = 'icon-option';
        iconItem.innerHTML = `<i class="fas ${icon}"></i>`;
        
        // 點擊事件
        iconItem.addEventListener('click', function() {
            const selectedIcon = document.getElementById('selectedIcon');
            selectedIcon.className = `fas ${icon}`;
            
            // 標記為選中
            document.querySelectorAll('.icon-option').forEach(item => {
                item.classList.remove('selected');
            });
            this.classList.add('selected');
        });
        
        iconGrid.appendChild(iconItem);
    });
}

// 過濾交易
function filterTransactions() {
    console.log("過濾交易");
    
    try {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const typeFilter = document.getElementById('transactionTypeFilter').value;
        const categoryFilter = document.getElementById('categoryFilter').value;
        
        // 構建過濾條件
        const filters = {};
        
        if (startDate) {
            filters.startDate = startDate;
        }
        
        if (endDate) {
            filters.endDate = endDate;
        }
        
        if (typeFilter && typeFilter !== 'all') {
            filters.type = typeFilter;
        }
        
        if (categoryFilter && categoryFilter !== 'all') {
            filters.categoryId = categoryFilter;
        }
        
        // 應用過濾器並更新UI
        updateTransactionsList(filters);
    } catch (error) {
        console.error("過濾交易時發生錯誤:", error);
        showToast('過濾交易失敗: ' + error.message, 'error');
    }
}

// 更新交易列表
function updateTransactionsList(filters = {}) {
    console.log("更新交易列表", filters);
    
    const transactionsList = document.getElementById('transactionsList');
    if (!transactionsList) {
        console.error("找不到交易列表元素");
        return;
    }
    
    // 過濾交易
    let filteredTransactions = [...appState.transactions];
    
    if (filters.startDate) {
        filteredTransactions = filteredTransactions.filter(t => t.date >= filters.startDate);
    }
    
    if (filters.endDate) {
        filteredTransactions = filteredTransactions.filter(t => t.date <= filters.endDate);
    }
    
    if (filters.type) {
        filteredTransactions = filteredTransactions.filter(t => t.type === filters.type);
    }
    
    if (filters.categoryId) {
        filteredTransactions = filteredTransactions.filter(t => t.categoryId === filters.categoryId);
    }
    
    // 按日期排序（降序）
    filteredTransactions.sort((a, b) => {
        if (a.date !== b.date) {
            return b.date.localeCompare(a.date);
        }
        return b.createdAt.localeCompare(a.createdAt);
    });
    
    // 生成HTML
    if (filteredTransactions.length === 0) {
        transactionsList.innerHTML = '<p class="empty-message">無符合條件的交易記錄</p>';
        return;
    }
    
    let html = '';
    
    filteredTransactions.forEach(transaction => {
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
        const [year, month, day] = transaction.date.split('-');
        const formattedDate = `${day}/${month}/${year}`;
        
        html += `
            <div class="transaction-item ${transaction.type}" data-id="${transaction.id}">
                <div class="transaction-date">${formattedDate}</div>
                <div class="transaction-icon" style="color: ${categoryColor}">
                    <i class="${categoryIcon}"></i>
                </div>
                <div class="transaction-details">
                    <div class="transaction-category">${categoryName}</div>
                    <div class="transaction-account">${account ? account.name : '未知賬戶'}</div>
                    ${transaction.note ? `<div class="transaction-note">${transaction.note}</div>` : ''}
                </div>
                <div class="transaction-amount">${formatCurrency(transaction.amount, account ? account.currency : defaultCurrency)}</div>
                <div class="transaction-actions">
                    <button class="btn-icon edit-transaction" data-id="${transaction.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete-transaction" data-id="${transaction.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    transactionsList.innerHTML = html;
    
    // 添加編輯和刪除按鈕的事件監聽器
    transactionsList.querySelectorAll('.edit-transaction').forEach(button => {
        button.addEventListener('click', function() {
            const transactionId = this.getAttribute('data-id');
            editTransaction(transactionId);
        });
    });
    
    transactionsList.querySelectorAll('.delete-transaction').forEach(button => {
        button.addEventListener('click', function() {
            const transactionId = this.getAttribute('data-id');
            const message = '確定要刪除這筆交易嗎？';
            showConfirmDialog(message, () => deleteTransaction(transactionId));
        });
    });
}

// 編輯交易
function editTransaction(transactionId) {
    // 具體實現待完成，這裡只是一個示例
    console.log(`編輯交易: ${transactionId}`);
    showToast('編輯交易功能開發中', 'info');
}

// 刪除交易
function deleteTransaction(transactionId) {
    console.log(`刪除交易: ${transactionId}`);
    
    try {
        // 找到交易
        const transactionIndex = appState.transactions.findIndex(t => t.id === transactionId);
        
        if (transactionIndex === -1) {
            showToast('找不到交易', 'error');
            return;
        }
        
        const transaction = appState.transactions[transactionIndex];
        
        // 如果是轉賬交易，也需要刪除關聯的交易
        if (transaction.transferId) {
            const relatedTransactionIndex = appState.transactions.findIndex(t => 
                t.transferId === transaction.transferId && t.id !== transactionId
            );
            
            if (relatedTransactionIndex !== -1) {
                const relatedTransaction = appState.transactions[relatedTransactionIndex];
                
                // 恢復賬戶餘額（關聯交易）
                const relatedAccount = appState.accounts.find(a => a.id === relatedTransaction.accountId);
                if (relatedAccount) {
                    if (relatedTransaction.type === 'income') {
                        relatedAccount.balance -= relatedTransaction.amount;
                    } else {
                        relatedAccount.balance += relatedTransaction.amount;
                    }
                }
                
                // 刪除關聯交易
                appState.transactions.splice(relatedTransactionIndex, 1);
            }
        }
        
        // 恢復賬戶餘額（主交易）
        const account = appState.accounts.find(a => a.id === transaction.accountId);
        if (account) {
            if (transaction.type === 'income') {
                account.balance -= transaction.amount;
            } else {
                account.balance += transaction.amount;
            }
        }
        
        // 刪除交易
        appState.transactions.splice(transactionIndex, 1);
        
        // 更新UI
        updateTransactionsUI();
        updateAccountsUI();
        updateDashboardUI();
        
        // 保存到本地存儲
        saveToLocalStorage();
        
        // 執行同步（如果啟用）
        if (enableFirebase && isLoggedIn) {
            syncToFirebase();
        }
        
        // 顯示成功消息
        showToast('交易已刪除', 'success');
    } catch (error) {
        console.error("刪除交易時發生錯誤:", error);
        showToast('刪除交易失敗: ' + error.message, 'error');
    }
}

// 更新儀表板UI
function updateDashboardUI() {
    console.log("更新儀表板UI");
    
    try {
        // 更新總資產
        updateTotalAssets();
        
        // 更新今日收支
        updateTodayTransactions();
        
        // 更新預算狀態
        updateBudgetStatus();
        
        // 更新近期交易
        updateRecentTransactions();
        
        // 更新財務健康指數
        updateFinancialHealthIndex();
    } catch (error) {
        console.error("更新儀表板UI時發生錯誤:", error);
        showToast('更新儀表板UI失敗', 'error');
        
        // 嘗試安全更新
        safeUpdateUI();
    }
}

// 更新總資產
function updateTotalAssets() {
    console.log("更新總資產");
    
    try {
        // 計算所有賬戶的餘額總和（考慮匯率轉換）
        let totalAssets = 0;
        
        appState.accounts.forEach(account => {
            let balance = account.balance;
            
            // 如果賬戶貨幣與默認貨幣不同，則轉換
            if (account.currency !== defaultCurrency) {
                const rate = getExchangeRate(account.currency, defaultCurrency);
                balance = balance * rate;
            }
            
            totalAssets += balance;
        });
        
        // 更新UI
        const totalAssetsElement = document.getElementById('totalAssets');
        if (totalAssetsElement) {
            totalAssetsElement.textContent = formatNumber(totalAssets);
        }
    } catch (error) {
        console.error("更新總資產時發生錯誤:", error);
        throw error;
    }
}

// 更新今日交易
function updateTodayTransactions() {
    console.log("更新今日交易");
    
    try {
        // 獲取今天的日期
        const today = new Date().toISOString().split('T')[0];
        
        // 篩選今日交易
        const todayTransactions = appState.transactions.filter(t => t.date === today);
        
        // 計算今日收入和支出
        let todayIncome = 0;
        let todayExpense = 0;
        
        todayTransactions.forEach(transaction => {
            const account = appState.accounts.find(a => a.id === transaction.accountId);
            
            if (!account) {
                return;
            }
            
            let amount = transaction.amount;
            
            // 如果賬戶貨幣與默認貨幣不同，則轉換
            if (account.currency !== defaultCurrency) {
                const rate = getExchangeRate(account.currency, defaultCurrency);
                amount = amount * rate;
            }
            
            if (transaction.type === 'income') {
                todayIncome += amount;
            } else {
                todayExpense += amount;
            }
        });
        
        // 更新UI
        const todayIncomeElement = document.getElementById('todayIncome');
        const todayExpenseElement = document.getElementById('todayExpense');
        
        if (todayIncomeElement) {
            todayIncomeElement.textContent = formatNumber(todayIncome);
        }
        
        if (todayExpenseElement) {
            todayExpenseElement.textContent = formatNumber(todayExpense);
        }
        
        // 更新今日交易列表
        const todayTransactionsList = document.getElementById('todayTransactionsList');
        
        if (todayTransactionsList) {
            if (todayTransactions.length === 0) {
                todayTransactionsList.innerHTML = '<p class="empty-message">今日尚無交易記錄</p>';
                return;
            }
            
            // 排序交易（最新的在前）
            todayTransactions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            
            let html = '';
            
            // 最多顯示5筆
            const displayTransactions = todayTransactions.slice(0, 5);
            
            displayTransactions.forEach(transaction => {
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
    } catch (error) {
        console.error("更新今日交易時發生錯誤:", error);
        throw error;
    }
}

// 更新預算狀態
function updateBudgetStatus() {
    console.log("更新預算狀態");
    
    try {
        const budgetStatusElement = document.getElementById('budgetStatus');
        
        if (!budgetStatusElement) {
            console.error("找不到預算狀態元素");
            return;
        }
        
        // 檢查是否有預算
        if (!appState.budgets.total || appState.budgets.total <= 0) {
            budgetStatusElement.innerHTML = `
                <p class="empty-message">尚未設定預算</p>
                <a href="#" onclick="showTabContent('budgets')" class="action-link">設定預算</a>
            `;
            return;
        }
        
        // 確定預算週期
        const today = new Date();
        const resetCycle = appState.budgets.resetCycle || 'monthly';
        const resetDay = parseInt(appState.budgets.resetDay || 1, 10);
        
        let startDate;
        let cycleName;
        
        if (resetCycle === 'daily') {
            startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            cycleName = '今日';
        } else if (resetCycle === 'weekly') {
            const day = today.getDay(); // 0 = 週日, 1 = 週一, ...
            const diff = day === 0 ? 6 : day - 1; // 調整為週一作為一週的開始
            startDate = new Date(today);
            startDate.setDate(today.getDate() - diff);
            startDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
            cycleName = '本週';
        } else { // monthly
            const currentDay = today.getDate();
            
            if (currentDay >= resetDay) {
                // 本月的重設日
                startDate = new Date(today.getFullYear(), today.getMonth(), resetDay);
            } else {
                // 上月的重設日
                startDate = new Date(today.getFullYear(), today.getMonth() - 1, resetDay);
            }
            
            cycleName = '本月';
        }
        
        // 將日期格式化為 YYYY-MM-DD
        const startDateFormatted = startDate.toISOString().split('T')[0];
        const todayFormatted = today.toISOString().split('T')[0];
        
        // 獲取週期內的支出交易
        const cycleTransactions = appState.transactions.filter(t => 
            t.type === 'expense' && 
            t.date >= startDateFormatted && 
            t.date <= todayFormatted &&
            t.categoryId !== 'transfer_out' // 排除轉賬
        );
        
        // 計算總支出
        let totalSpent = 0;
        
        cycleTransactions.forEach(transaction => {
            const account = appState.accounts.find(a => a.id === transaction.accountId);
            
            if (!account) {
                return;
            }
            
            let amount = transaction.amount;
            
            // 如果賬戶貨幣與默認貨幣不同，則轉換
            if (account.currency !== defaultCurrency) {
                const rate = getExchangeRate(account.currency, defaultCurrency);
                amount = amount * rate;
            }
            
            totalSpent += amount;
        });
        
        // 計算百分比和剩餘預算
        const percentage = (totalSpent / appState.budgets.total) * 100;
        const remaining = Math.max(0, appState.budgets.total - totalSpent);
        
        // 根據百分比確定顏色
        let progressColor = 'var(--primary-color)';
        
        if (percentage > 90) {
            progressColor = 'var(--danger-color)';
        } else if (percentage > 70) {
            progressColor = 'var(--warning-color)';
        }
        
        // 更新UI
        budgetStatusElement.innerHTML = `
            <div class="budget-header">
                <h4>${cycleName}預算</h4>
                <span class="budget-amount">${formatCurrency(appState.budgets.total)}</span>
            </div>
            <div class="budget-progress-container">
                <div class="budget-progress-bar" style="width: ${Math.min(100, percentage)}%; background-color: ${progressColor}"></div>
            </div>
            <div class="budget-info">
                <span>已使用 ${formatCurrency(totalSpent)} (${percentage.toFixed(1)}%)</span>
                <span>剩餘 ${formatCurrency(remaining)}</span>
            </div>
        `;
    } catch (error) {
        console.error("更新預算狀態時發生錯誤:", error);
        throw error;
    }
}

// 更新近期交易
function updateRecentTransactions() {
    console.log("更新近期交易");
    
    try {
        const recentTransactionsListElement = document.getElementById('recentTransactionsList');
        
        if (!recentTransactionsListElement) {
            console.error("找不到近期交易列表元素");
            return;
        }
        
        if (appState.transactions.length === 0) {
            recentTransactionsListElement.innerHTML = '<p class="empty-message">尚無交易記錄</p>';
            return;
        }
        
        // 按日期排序（最新的在前）
        const sortedTransactions = [...appState.transactions].sort((a, b) => {
            if (a.date !== b.date) {
                return b.date.localeCompare(a.date);
            }
            return b.createdAt.localeCompare(a.createdAt);
        });
        
        // 獲取最近10筆交易
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
            const [year, month, day] = transaction.date.split('-');
            const formattedDate = `${day}/${month}/${year}`;
            
            html += `
                <div class="transaction-item ${transaction.type}">
                    <div class="transaction-date">${formattedDate}</div>
                    <div class="transaction-icon" style="color: ${categoryColor}">
                        <i class="${categoryIcon}"></i>
                    </div>
                    <div class="transaction-details">
                        <div class="transaction-category">${categoryName}</div>
                        <div class="transaction-account">${account ? account.name : '未知賬戶'}</div>
                        ${transaction.note ? `<div class="transaction-note">${transaction.note}</div>` : ''}
                    </div>
                    <div class="transaction-amount">${formatCurrency(transaction.amount, account ? account.currency : defaultCurrency)}</div>
                </div>
            `;
        });
        
        recentTransactionsListElement.innerHTML = html;
    } catch (error) {
        console.error("更新近期交易時發生錯誤:", error);
        throw error;
    }
}

// 更新財務健康指數（這只是一個示例實現）
function updateFinancialHealthIndex() {
    console.log("更新財務健康指數");
    
    try {
        // 模擬計算中，實際應用中可能會有更複雜的評分系統
        setTimeout(() => {
            const healthIndexElement = document.getElementById('financialHealthIndex');
            const financialAdviceElement = document.getElementById('financialAdvice');
            
            if (!healthIndexElement || !financialAdviceElement) {
                return;
            }
            
            // 示例：隨機計算一個財務健康指數(60-95)
            const healthIndex = Math.floor(Math.random() * 36) + 60;
            
            healthIndexElement.textContent = healthIndex;
            
            // 根據健康指數提供不同的建議
            let advice = '';
            
            if (healthIndex >= 90) {
                advice = '你的財務狀況非常健康！繼續保持良好的理財習慣，可考慮增加投資比例，獲取更高的資產回報。';
            } else if (healthIndex >= 80) {
                advice = '你的財務狀況良好。建議檢視每月支出，尋找更多節省的空間，並確保有足夠的緊急資金。';
            } else if (healthIndex >= 70) {
                advice = '你的財務狀況尚可。建議關注預算管理，減少非必要支出，並嘗試增加收入來源。';
            } else {
                advice = '你的財務狀況需要改善。建議制定嚴格的預算計劃，積極償還債務，並開始建立緊急資金。';
            }
            
            financialAdviceElement.textContent = advice;
        }, 1000);
    } catch (error) {
        console.error("更新財務健康指數時發生錯誤:", error);
        // 這個功能不是核心功能，錯誤不需要拋出
    }
}

// 更新賬戶UI
function updateAccountsUI() {
    console.log("更新賬戶UI");
    
    try {
        const accountsList = document.getElementById('accountsList');
        
        if (!accountsList) {
            console.error("找不到賬戶列表元素");
            return;
        }
        
        // 檢查是否有賬戶
        if (appState.accounts.length === 0) {
            accountsList.innerHTML = '<p class="empty-message">尚未設置任何戶口</p>';
            return;
        }
        
        // 確定視圖類型
        const isCardView = accountsList.classList.contains('card-view');
        
        let html = '';
        
        appState.accounts.forEach(account => {
            if (isCardView) {
                // 根據賬戶類型設置不同的顏色
                let headerColor;
                
                switch (account.type) {
                    case 'cash':
                        headerColor = '#27ae60';
                        break;
                    case 'bank':
                        headerColor = '#3498db';
                        break;
                    case 'credit':
                        headerColor = '#e74c3c';
                        break;
                    case 'investment':
                        headerColor = '#f39c12';
                        break;
                    default:
                        headerColor = '#95a5a6';
                }
                
                // 獲取賬戶類型的中文名稱
                let accountTypeName;
                
                switch (account.type) {
                    case 'cash':
                        accountTypeName = '現金';
                        break;
                    case 'bank':
                        accountTypeName = '銀行戶口';
                        break;
                    case 'credit':
                        accountTypeName = '信用卡';
                        break;
                    case 'investment':
                        accountTypeName = '投資';
                        break;
                    default:
                        accountTypeName = '其他';
                }
                
                html += `
                    <div class="account-card" data-id="${account.id}">
                        <div class="account-card-header" style="background-color: ${headerColor}">
                            <h3>${account.name}</h3>
                            <div class="account-type">${accountTypeName}</div>
                        </div>
                        <div class="account-card-body">
                            <div class="account-balance">${formatCurrency(account.balance, account.currency)}</div>
                            <div class="account-currency">${getCurrencyName(account.currency)}</div>
                            ${account.note ? `<div class="account-note">${account.note}</div>` : ''}
                            <div class="account-actions">
                                <button class="btn btn-sm edit-account" data-id="${account.id}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-danger delete-account" data-id="${account.id}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                // 列表視圖
                html += `
                    <div class="account-list-item" data-id="${account.id}">
                        <div class="account-info">
                            <div class="account-name">${account.name}</div>
                            <div class="account-type-currency">${getAccountTypeName(account.type)} | ${getCurrencyName(account.currency)}</div>
                        </div>
                        <div class="account-details">
                            <div class="account-balance">${formatCurrency(account.balance, account.currency)}</div>
                        </div>
                        <div class="account-actions">
                            <button class="btn btn-sm edit-account" data-id="${account.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger delete-account" data-id="${account.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            }
        });
        
        accountsList.innerHTML = html;
        
        // 添加編輯和刪除按鈕的事件監聽器
        accountsList.querySelectorAll('.edit-account').forEach(button => {
            button.addEventListener('click', function() {
                const accountId = this.getAttribute('data-id');
                editAccount(accountId);
            });
        });
        
        accountsList.querySelectorAll('.delete-account').forEach(button => {
            button.addEventListener('click', function() {
                const accountId = this.getAttribute('data-id');
                const message = '確定要刪除此戶口嗎？相關交易將保留，但匯入金額將不再計入總資產。';
                showConfirmDialog(message, () => deleteAccount(accountId));
            });
        });
    } catch (error) {
        console.error("更新賬戶UI時發生錯誤:", error);
        throw error;
    }
}

// 更新轉賬表單
function updateTransferForm() {
    console.log("更新轉賬表單");
    
    try {
        const fromAccountSelect = document.getElementById('fromAccount');
        const toAccountSelect = document.getElementById('toAccount');
        
        if (!fromAccountSelect || !toAccountSelect) {
            console.error("找不到轉賬表單元素");
            return;
        }
        
        // 清空選擇器
        fromAccountSelect.innerHTML = '<option value="" disabled selected>選擇戶口</option>';
        toAccountSelect.innerHTML = '<option value="" disabled selected>選擇戶口</option>';
        
        // 填充選擇器
        appState.accounts.forEach(account => {
            const fromOption = document.createElement('option');
            fromOption.value = account.id;
            fromOption.textContent = `${account.name} (${formatCurrency(account.balance, account.currency)})`;
            
            const toOption = document.createElement('option');
            toOption.value = account.id;
            toOption.textContent = `${account.name} (${formatCurrency(account.balance, account.currency)})`;
            
            fromAccountSelect.appendChild(fromOption);
            toAccountSelect.appendChild(toOption);
        });
        
        // 重置匯率和接收金額顯示
        document.getElementById('transferExchangeRate').textContent = '--';
        document.getElementById('receivingAmount').textContent = '--';
    } catch (error) {
        console.error("更新轉賬表單時發生錯誤:", error);
        throw error;
    }
}

// 編輯賬戶
function editAccount(accountId) {
    // 具體實現待完成，這裡只是一個示例
    console.log(`編輯賬戶: ${accountId}`);
    showToast('編輯賬戶功能開發中', 'info');
}

// 刪除賬戶
function deleteAccount(accountId) {
    console.log(`刪除賬戶: ${accountId}`);
    
    try {
        // 檢查是否有與該賬戶相關的交易
        const hasTransactions = appState.transactions.some(t => t.accountId === accountId);
        
        if (hasTransactions) {
            // 提示用戶並確認
            const message = '此賬戶有關聯的交易記錄，刪除賬戶將會保留這些交易，但不再計入總資產。確定要繼續嗎？';
            
            showConfirmDialog(message, () => {
                // 找到並刪除賬戶
                const accountIndex = appState.accounts.findIndex(a => a.id === accountId);
                
                if (accountIndex !== -1) {
                    // 記住賬戶名稱用於顯示消息
                    const accountName = appState.accounts[accountIndex].name;
                    
                    // 刪除賬戶
                    appState.accounts.splice(accountIndex, 1);
                    
                    // 更新UI
                    updateAccountsUI();
                    updateTransferForm();
                    updateAllDropdowns();
                    updateDashboardUI();
                    
                    // 保存到本地存儲
                    saveToLocalStorage();
                    
                    // 執行同步（如果啟用）
                    if (enableFirebase && isLoggedIn) {
                        syncToFirebase();
                    }
                    
                    // 顯示成功消息
                    showToast(`已刪除戶口: ${accountName}`, 'success');
                }
            });
        } else {
            // 沒有關聯交易，直接刪除
            const accountIndex = appState.accounts.findIndex(a => a.id === accountId);
            
            if (accountIndex !== -1) {
                // 記住賬戶名稱用於顯示消息
                const accountName = appState.accounts[accountIndex].name;
                
                // 刪除賬戶
                appState.accounts.splice(accountIndex, 1);
                
                // 更新UI
                updateAccountsUI();
                updateTransferForm();
                updateAllDropdowns();
                updateDashboardUI();
                
                // 保存到本地存儲
                saveToLocalStorage();
                
                // 執行同步（如果啟用）
                if (enableFirebase && isLoggedIn) {
                    syncToFirebase();
                }
                
                // 顯示成功消息
                showToast(`已刪除戶口: ${accountName}`, 'success');
            }
        }
    } catch (error) {
        console.error("刪除賬戶時發生錯誤:", error);
        showToast('刪除賬戶失敗: ' + error.message, 'error');
    }
}

// 更新交易UI
function updateTransactionsUI() {
    console.log("更新交易UI");
    
    try {
        // 更新交易表單
        updateTransactionsForms();
        
        // 更新交易列表（顯示所有交易）
        updateTransactionsList();
        
        // 更新類別過濾器
        updateCategoryFilter();
    } catch (error) {
        console.error("更新交易UI時發生錯誤:", error);
        throw error;
    }
}

// 更新交易表單
function updateTransactionsForms() {
    console.log("更新交易表單");
    
    try {
        // 賬戶下拉菜單
        const incomeAccountSelect = document.getElementById('incomeAccount');
        const expenseAccountSelect = document.getElementById('expenseAccount');
        
        if (incomeAccountSelect && expenseAccountSelect) {
            // 清空下拉菜單
            incomeAccountSelect.innerHTML = '<option value="" disabled selected>選擇戶口</option>';
            expenseAccountSelect.innerHTML = '<option value="" disabled selected>選擇戶口</option>';
            
            // 填充下拉菜單
            appState.accounts.forEach(account => {
                const incomeOption = document.createElement('option');
                incomeOption.value = account.id;
                incomeOption.textContent = `${account.name} (${formatCurrency(account.balance, account.currency)})`;
                
                const expenseOption = document.createElement('option');
                expenseOption.value = account.id;
                expenseOption.textContent = `${account.name} (${formatCurrency(account.balance, account.currency)})`;
                
                incomeAccountSelect.appendChild(incomeOption);
                expenseAccountSelect.appendChild(expenseOption);
            });
        }
        
        // 收入類別下拉菜單
        const incomeCategorySelect = document.getElementById('incomeCategory');
        
        if (incomeCategorySelect) {
            // 清空下拉菜單
            incomeCategorySelect.innerHTML = '<option value="" disabled selected>選擇類別</option>';
            
            // 排序類別（按照order）
            const sortedIncomeCategories = [...appState.categories.income].sort((a, b) => a.order - b.order);
            
            // 填充下拉菜單
            sortedIncomeCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                incomeCategorySelect.appendChild(option);
            });
        }
        
        // 支出類別下拉菜單
        const expenseCategorySelect = document.getElementById('expenseCategory');
        
        if (expenseCategorySelect) {
            // 清空下拉菜單
            expenseCategorySelect.innerHTML = '<option value="" disabled selected>選擇類別</option>';
            
            // 排序類別（按照order）
            const sortedExpenseCategories = [...appState.categories.expense].sort((a, b) => a.order - b.order);
            
            // 填充下拉菜單
            sortedExpenseCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                expenseCategorySelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error("更新交易表單時發生錯誤:", error);
        throw error;
    }
}

// 更新類別過濾器
function updateCategoryFilter() {
    console.log("更新類別過濾器");
    
    try {
        const categoryFilter = document.getElementById('categoryFilter');
        
        if (!categoryFilter) {
            console.error("找不到類別過濾器元素");
            return;
        }
        
        // 保存當前選中的值
        const currentValue = categoryFilter.value;
        
        // 清空下拉菜單
        categoryFilter.innerHTML = '<option value="all">全部類別</option>';
        
        // 收入類別
        if (appState.categories.income.length > 0) {
            const incomeOptgroup = document.createElement('optgroup');
            incomeOptgroup.label = '收入類別';
            
            // 排序類別（按照order）
            const sortedIncomeCategories = [...appState.categories.income].sort((a, b) => a.order - b.order);
            
            sortedIncomeCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                incomeOptgroup.appendChild(option);
            });
            
            categoryFilter.appendChild(incomeOptgroup);
        }
        
        // 支出類別
        if (appState.categories.expense.length > 0) {
            const expenseOptgroup = document.createElement('optgroup');
            expenseOptgroup.label = '支出類別';
            
            // 排序類別（按照order）
            const sortedExpenseCategories = [...appState.categories.expense].sort((a, b) => a.order - b.order);
            
            sortedExpenseCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                expenseOptgroup.appendChild(option);
            });
            
            categoryFilter.appendChild(expenseOptgroup);
        }
        
        // 添加轉賬類別
        const transferOptgroup = document.createElement('optgroup');
        transferOptgroup.label = '轉賬';
        
        const transferInOption = document.createElement('option');
        transferInOption.value = 'transfer_in';
        transferInOption.textContent = '轉賬收入';
        
        const transferOutOption = document.createElement('option');
        transferOutOption.value = 'transfer_out';
        transferOutOption.textContent = '轉賬支出';
        
        transferOptgroup.appendChild(transferInOption);
        transferOptgroup.appendChild(transferOutOption);
        
        categoryFilter.appendChild(transferOptgroup);
        
        // 恢復選中的值
        if (currentValue && currentValue !== 'all') {
            categoryFilter.value = currentValue;
        }
    } catch (error) {
        console.error("更新類別過濾器時發生錯誤:", error);
        throw error;
    }
}

// 更新預算UI
function updateBudgetsUI() {
    console.log("更新預算UI");
    
    try {
        // 更新總預算表單
        updateBudgetForm();
        
        // 更新類別預算列表
        updateCategoryBudgetsList();
        
        // 更新類別預算下拉菜單
        updateCategoryBudgetSelect();
    } catch (error) {
        console.error("更新預算UI時發生錯誤:", error);
        throw error;
    }
}

// 更新預算表單
function updateBudgetForm() {
    console.log("更新預算表單");
    
    try {
        // 總預算金額
        const totalBudgetInput = document.getElementById('totalBudget');
        
        if (totalBudgetInput) {
            totalBudgetInput.value = appState.budgets.total || '';
        }
        
        // 自動計算預算
        const autoCalculateBudget = document.getElementById('autoCalculateBudget');
        
        if (autoCalculateBudget) {
            autoCalculateBudget.checked = appState.budgets.autoCalculate || false;
            
            // 如果啟用自動計算，禁用總預算輸入
            if (autoCalculateBudget.checked) {
                totalBudgetInput.disabled = true;
            } else {
                totalBudgetInput.disabled = false;
            }
        }
        
        // 預算重設週期
        const resetCycleInputs = document.querySelectorAll('input[name="resetCycle"]');
        
        if (resetCycleInputs.length > 0) {
            const resetCycle = appState.budgets.resetCycle || 'monthly';
            
            resetCycleInputs.forEach(input => {
                if (input.value === resetCycle) {
                    input.checked = true;
                } else {
                    input.checked = false;
                }
            });
            
            // 顯示或隱藏每月重設日輸入框
            const monthlyResetDayInput = document.getElementById('monthlyResetDay');
            const monthlyResetDayContainer = monthlyResetDayInput.parentElement;
            
            if (resetCycle === 'monthly') {
                monthlyResetDayContainer.style.display = 'block';
            } else {
                monthlyResetDayContainer.style.display = 'none';
            }
        }
        
        // 每月重設日
        const monthlyResetDayInput = document.getElementById('monthlyResetDay');
        
        if (monthlyResetDayInput) {
            monthlyResetDayInput.value = appState.budgets.resetDay || 1;
        }
        
        // 繼承上月預算設定
        const inheritPreviousBudget = document.getElementById('inheritPreviousBudget');
        
        if (inheritPreviousBudget) {
            inheritPreviousBudget.checked = appState.budgets.inheritPrevious !== false; // 默認為true
        }
    } catch (error) {
        console.error("更新預算表單時發生錯誤:", error);
        throw error;
    }
}

// 更新類別預算列表
function updateCategoryBudgetsList() {
    console.log("更新類別預算列表");
    
    try {
        const categoryBudgetsList = document.getElementById('categoryBudgetsList');
        
        if (!categoryBudgetsList) {
            console.error("找不到類別預算列表元素");
            return;
        }
        
        // 檢查是否有類別預算
        if (!appState.budgets.categories || appState.budgets.categories.length === 0) {
            categoryBudgetsList.innerHTML = '<p class="empty-message">尚未設置類別預算</p>';
            return;
        }
        
        let html = '';
        
        appState.budgets.categories.forEach(budget => {
            // 找到對應的類別
            const category = appState.categories.expense.find(c => c.id === budget.categoryId);
            
            if (!category) {
                return;
            }
            
            html += `
                <div class="budget-item" data-id="${budget.id}">
                    <div class="budget-category">
                        <div class="budget-category-icon" style="color: ${category.color}">
                            <i class="${category.icon}"></i>
                        </div>
                        <div class="budget-category-name">${category.name}</div>
                    </div>
                    <div class="budget-amount">${formatCurrency(budget.amount)}</div>
                    <div class="budget-actions">
                        <button class="btn btn-sm edit-budget" data-id="${budget.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-budget" data-id="${budget.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        categoryBudgetsList.innerHTML = html;
        
        // 添加編輯和刪除按鈕的事件監聽器
        categoryBudgetsList.querySelectorAll('.edit-budget').forEach(button => {
            button.addEventListener('click', function() {
                const budgetId = this.getAttribute('data-id');
                editCategoryBudget(budgetId);
            });
        });
        
        categoryBudgetsList.querySelectorAll('.delete-budget').forEach(button => {
            button.addEventListener('click', function() {
                const budgetId = this.getAttribute('data-id');
                const message = '確定要刪除此類別預算嗎？';
                showConfirmDialog(message, () => deleteCategoryBudget(budgetId));
            });
        });
    } catch (error) {
        console.error("更新類別預算列表時發生錯誤:", error);
        throw error;
    }
}

// 更新類別預算下拉菜單
function updateCategoryBudgetSelect() {
    console.log("更新類別預算下拉菜單");
    
    try {
        const categoryBudgetSelect = document.getElementById('categoryBudgetSelect');
        
        if (!categoryBudgetSelect) {
            console.error("找不到類別預算下拉菜單元素");
            return;
        }
        
        // 清空下拉菜單
        categoryBudgetSelect.innerHTML = '<option value="" disabled selected>選擇類別</option>';
        
        // 獲取已有預算的類別ID
        const budgetCategoryIds = (appState.budgets.categories || []).map(b => b.categoryId);
        
        // 篩選出支出類別並排序
        const availableCategories = appState.categories.expense
            .filter(c => !budgetCategoryIds.includes(c.id))
            .sort((a, b) => a.order - b.order);
        
        // 填充下拉菜單
        availableCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categoryBudgetSelect.appendChild(option);
        });
        
        // 如果沒有可用類別，顯示提示
        if (availableCategories.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.disabled = true;
            option.textContent = '所有支出類別已設置預算';
            categoryBudgetSelect.appendChild(option);
        }
    } catch (error) {
        console.error("更新類別預算下拉菜單時發生錯誤:", error);
        throw error;
    }
}

// 編輯類別預算
function editCategoryBudget(budgetId) {
    // 具體實現待完成，這裡只是一個示例
    console.log(`編輯類別預算: ${budgetId}`);
    showToast('編輯類別預算功能開發中', 'info');
}

// 刪除類別預算
function deleteCategoryBudget(budgetId) {
    console.log(`刪除類別預算: ${budgetId}`);
    
    try {
        // 找到並刪除類別預算
        const budgetIndex = appState.budgets.categories.findIndex(b => b.id === budgetId);
        
        if (budgetIndex !== -1) {
            // 記住類別名稱用於顯示消息
            const categoryId = appState.budgets.categories[budgetIndex].categoryId;
            const category = appState.categories.expense.find(c => c.id === categoryId);
            const categoryName = category ? category.name : '未知類別';
            
            // 刪除類別預算
            appState.budgets.categories.splice(budgetIndex, 1);
            
            // 如果啟用自動計算，更新總預算
            if (appState.budgets.autoCalculate) {
                appState.budgets.total = calculateTotalCategoryBudget();
            }
            
            // 更新UI
            updateBudgetsUI();
            updateDashboardUI();
            
            // 保存到本地存儲
            saveToLocalStorage();
            
            // 執行同步（如果啟用）
            if (enableFirebase && isLoggedIn) {
                syncToFirebase();
            }
            
            // 顯示成功消息
            showToast(`已刪除類別預算: ${categoryName}`, 'success');
        }
    } catch (error) {
        console.error("刪除類別預算時發生錯誤:", error);
        showToast('刪除類別預算失敗: ' + error.message, 'error');
    }
}

// 更新類別UI
function updateCategoriesUI() {
    console.log("更新類別UI");
    
    try {
        // 更新收入類別列表
        updateIncomeCategoriesList();
        
        // 更新支出類別列表
        updateExpenseCategoriesList();
    } catch (error) {
        console.error("更新類別UI時發生錯誤:", error);
        throw error;
    }
}

// 更新收入類別列表
function updateIncomeCategoriesList() {
    console.log("更新收入類別列表");
    
    try {
        const incomeCategoriesList = document.getElementById('incomeCategoriesList');
        
        if (!incomeCategoriesList) {
            console.error("找不到收入類別列表元素");
            return;
        }
        
        // 確定視圖類型
        const isCardView = incomeCategoriesList.classList.contains('card-view');
        
        // 檢查是否有收入類別（排除添加卡片）
        const addCardHtml = '<div class="category-add-card"><button id="addIncomeCategoryButton" class="btn btn-add">+ 新增</button></div>';
        
        if (appState.categories.income.length === 0) {
            incomeCategoriesList.innerHTML = addCardHtml + '<p class="empty-message">尚未設置收入類別</p>';
            
            // 重新添加點擊事件
            document.getElementById('addIncomeCategoryButton').addEventListener('click', function() {
                document.getElementById('categoryType').value = 'income';
                openModal('addCategoryModal');
            });
            
            return;
        }
        
        // 排序類別（按照order）
        const sortedCategories = [...appState.categories.income].sort((a, b) => a.order - b.order);
        
        let html = addCardHtml;
        
        if (isCardView) {
            // 卡片視圖
            sortedCategories.forEach(category => {
                html += `
                    <div class="category-card" data-id="${category.id}">
                        <div class="category-icon" style="color: ${category.color}">
                            <i class="${category.icon}"></i>
                        </div>
                        <div class="category-name">${category.name}</div>
                        <div class="category-actions">
                            <button class="btn btn-sm edit-category" data-id="${category.id}" data-type="income">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger delete-category" data-id="${category.id}" data-type="income">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
        } else {
            // 列表視圖
            sortedCategories.forEach(category => {
                html += `
                    <div class="category-list-item" data-id="${category.id}">
                        <div class="category-list-icon" style="color: ${category.color}">
                            <i class="${category.icon}"></i>
                        </div>
                        <div class="category-name">${category.name}</div>
                        <div class="category-actions">
                            <button class="btn btn-sm edit-category" data-id="${category.id}" data-type="income">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger delete-category" data-id="${category.id}" data-type="income">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
        }
        
        incomeCategoriesList.innerHTML = html;
        
        // 添加新增按鈕的事件監聽器
        document.getElementById('addIncomeCategoryButton').addEventListener('click', function() {
            document.getElementById('categoryType').value = 'income';
            openModal('addCategoryModal');
        });
        
        // 添加編輯和刪除按鈕的事件監聽器
        incomeCategoriesList.querySelectorAll('.edit-category').forEach(button => {
            button.addEventListener('click', function() {
                const categoryId = this.getAttribute('data-id');
                const categoryType = this.getAttribute('data-type');
                editCategory(categoryId, categoryType);
            });
        });
        
        incomeCategoriesList.querySelectorAll('.delete-category').forEach(button => {
            button.addEventListener('click', function() {
                const categoryId = this.getAttribute('data-id');
                const categoryType = this.getAttribute('data-type');
                const message = '確定要刪除此類別嗎？相關交易將保留，但類別將顯示為"未知類別"。';
                showConfirmDialog(message, () => deleteCategory(categoryId, categoryType));
            });
        });
    } catch (error) {
        console.error("更新收入類別列表時發生錯誤:", error);
        throw error;
    }
}

// 更新支出類別列表
function updateExpenseCategoriesList() {
    console.log("更新支出類別列表");
    
    try {
        const expenseCategoriesList = document.getElementById('expenseCategoriesList');
        
        if (!expenseCategoriesList) {
            console.error("找不到支出類別列表元素");
            return;
        }
        
        // 確定視圖類型
        const isCardView = expenseCategoriesList.classList.contains('card-view');
        
        // 檢查是否有支出類別（排除添加卡片）
        const addCardHtml = '<div class="category-add-card"><button id="addExpenseCategoryButton" class="btn btn-add">+ 新增</button></div>';
        
        if (appState.categories.expense.length === 0) {
            expenseCategoriesList.innerHTML = addCardHtml + '<p class="empty-message">尚未設置支出類別</p>';
            
            // 重新添加點擊事件
            document.getElementById('addExpenseCategoryButton').addEventListener('click', function() {
                document.getElementById('categoryType').value = 'expense';
                openModal('addCategoryModal');
            });
            
            return;
        }
        
        // 排序類別（按照order）
        const sortedCategories = [...appState.categories.expense].sort((a, b) => a.order - b.order);
        
        let html = addCardHtml;
        
        if (isCardView) {
            // 卡片視圖
            sortedCategories.forEach(category => {
                html += `
                    <div class="category-card" data-id="${category.id}">
                        <div class="category-icon" style="color: ${category.color}">
                            <i class="${category.icon}"></i>
                        </div>
                        <div class="category-name">${category.name}</div>
                        <div class="category-actions">
                            <button class="btn btn-sm edit-category" data-id="${category.id}" data-type="expense">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger delete-category" data-id="${category.id}" data-type="expense">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
        } else {
            // 列表視圖
            sortedCategories.forEach(category => {
                html += `
                    <div class="category-list-item" data-id="${category.id}">
                        <div class="category-list-icon" style="color: ${category.color}">
                            <i class="${category.icon}"></i>
                        </div>
                        <div class="category-name">${category.name}</div>
                        <div class="category-actions">
                            <button class="btn btn-sm edit-category" data-id="${category.id}" data-type="expense">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger delete-category" data-id="${category.id}" data-type="expense">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
        }
        
        expenseCategoriesList.innerHTML = html;
        
        // 添加新增按鈕的事件監聽器
        document.getElementById('addExpenseCategoryButton').addEventListener('click', function() {
            document.getElementById('categoryType').value = 'expense';
            openModal('addCategoryModal');
        });
        
        // 添加編輯和刪除按鈕的事件監聽器
        expenseCategoriesList.querySelectorAll('.edit-category').forEach(button => {
            button.addEventListener('click', function() {
                const categoryId = this.getAttribute('data-id');
                const categoryType = this.getAttribute('data-type');
                editCategory(categoryId, categoryType);
            });
        });
        
        expenseCategoriesList.querySelectorAll('.delete-category').forEach(button => {
            button.addEventListener('click', function() {
                const categoryId = this.getAttribute('data-id');
                const categoryType = this.getAttribute('data-type');
                const message = '確定要刪除此類別嗎？相關交易將保留，但類別將顯示為"未知類別"。';
                showConfirmDialog(message, () => deleteCategory(categoryId, categoryType));
            });
        });
    } catch (error) {
        console.error("更新支出類別列表時發生錯誤:", error);
        throw error;
    }
}

// 編輯類別
function editCategory(categoryId, categoryType) {
    // 具體實現待完成，這裡只是一個示例
    console.log(`編輯${categoryType}類別: ${categoryId}`);
    showToast('編輯類別功能開發中', 'info');
}

// 刪除類別
function deleteCategory(categoryId, categoryType) {
    console.log(`刪除${categoryType}類別: ${categoryId}`);
    
    try {
        // 檢查是否有與該類別相關的交易
        const hasTransactions = appState.transactions.some(t => t.categoryId === categoryId);
        
        // 檢查是否有與該類別相關的預算（如果是支出類別）
        const hasBudget = categoryType === 'expense' && 
                          appState.budgets.categories && 
                          appState.budgets.categories.some(b => b.categoryId === categoryId);
        
        if (hasTransactions || hasBudget) {
            // 提示用戶並確認
            let message = '此類別有關聯的';
            
            if (hasTransactions && hasBudget) {
                message += '交易記錄和預算';
            } else if (hasTransactions) {
                message += '交易記錄';
            } else {
                message += '預算';
            }
            
            message += '，刪除類別可能會影響這些數據的顯示。確定要繼續嗎？';
            
            showConfirmDialog(message, () => {
                // 找到並刪除類別
                const categoryArray = categoryType === 'income' ? appState.categories.income : appState.categories.expense;
                const categoryIndex = categoryArray.findIndex(c => c.id === categoryId);
                
                if (categoryIndex !== -1) {
                    // 記住類別名稱用於顯示消息
                    const categoryName = categoryArray[categoryIndex].name;
                    
                    // 刪除類別
                    categoryArray.splice(categoryIndex, 1);
                    
                    // 如果是支出類別且有相關預算，也一併刪除
                    if (categoryType === 'expense' && hasBudget) {
                        appState.budgets.categories = appState.budgets.categories.filter(b => b.categoryId !== categoryId);
                        
                        // 如果啟用自動計算，更新總預算
                        if (appState.budgets.autoCalculate) {
                            appState.budgets.total = calculateTotalCategoryBudget();
                        }
                    }
                    
                    // 更新UI
                    updateCategoriesUI();
                    updateAllDropdowns();
                    updateBudgetsUI();
                    
                    // 保存到本地存儲
                    saveToLocalStorage();
                    
                    // 執行同步（如果啟用）
                    if (enableFirebase && isLoggedIn) {
                        syncToFirebase();
                    }
                    
                    // 顯示成功消息
                    showToast(`已刪除${categoryType === 'income' ? '收入' : '支出'}類別: ${categoryName}`, 'success');
                }
            });
        } else {
            // 沒有關聯數據，直接刪除
            const categoryArray = categoryType === 'income' ? appState.categories.income : appState.categories.expense;
            const categoryIndex = categoryArray.findIndex(c => c.id === categoryId);
            
            if (categoryIndex !== -1) {
                // 記住類別名稱用於顯示消息
                const categoryName = categoryArray[categoryIndex].name;
                
                // 刪除類別
                categoryArray.splice(categoryIndex, 1);
                
                // 更新UI
                updateCategoriesUI();
                updateAllDropdowns();
                
                // 保存到本地存儲
                saveToLocalStorage();
                
                // 執行同步（如果啟用）
                if (enableFirebase && isLoggedIn) {
                    syncToFirebase();
                }
                
                // 顯示成功消息
                showToast(`已刪除${categoryType === 'income' ? '收入' : '支出'}類別: ${categoryName}`, 'success');
            }
        }
    } catch (error) {
        console.error("刪除類別時發生錯誤:", error);
        showToast('刪除類別失敗: ' + error.message, 'error');
    }
}

// 更新統計UI
function updateStatisticsUI() {
    console.log("更新統計UI");
    
    try {
        // 生成收入統計圖表
        generateIncomeChart();
        
        // 生成支出統計圖表
        generateExpenseChart();
    } catch (error) {
        console.error("更新統計UI時發生錯誤:", error);
        throw error;
    }
}

// 生成收入統計圖表
function generateIncomeChart() {
    console.log("生成收入統計圖表");
    
    try {
        const incomeChartContainer = document.getElementById('incomeChart');
        
        if (!incomeChartContainer) {
            console.error("找不到收入圖表容器元素");
            return;
        }
        
        // 獲取當前月份的交易
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // 月份從0開始，所以+1
        
        // 構建月份範圍（yyyy-mm-01到yyyy-mm-31）
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
            
            let amount = transaction.amount;
            
            // 如果賬戶貨幣與默認貨幣不同，則轉換
            if (account.currency !== defaultCurrency) {
                const rate = getExchangeRate(account.currency, defaultCurrency);
                amount = amount * rate;
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
        
        new Chart(ctx, {
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
                            label: function(context) {
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
        throw error;
    }
}

// 生成支出統計圖表
function generateExpenseChart() {
    console.log("生成支出統計圖表");
    
    try {
        const expenseChartContainer = document.getElementById('expenseChart');
        
        if (!expenseChartContainer) {
            console.error("找不到支出圖表容器元素");
            return;
        }
        
        // 獲取當前月份的交易
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // 月份從0開始，所以+1
        
        // 構建月份範圍（yyyy-mm-01到yyyy-mm-31）
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
            
            let amount = transaction.amount;
            
            // 如果賬戶貨幣與默認貨幣不同，則轉換
            if (account.currency !== defaultCurrency) {
                const rate = getExchangeRate(account.currency, defaultCurrency);
                amount = amount * rate;
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
        
        new Chart(ctx, {
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
                            label: function(context) {
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
        throw error;
    }
}

// 更新同步UI
function updateSyncUI() {
    console.log("更新同步UI");
    
    try {
        const loginStatus = document.getElementById('loginStatus');
        const loginButton = document.getElementById('loginButton');
        const logoutButton = document.getElementById('logoutButton');
        const lastSyncTime = document.getElementById('lastSyncTime');
        const autoSync = document.getElementById('autoSync');
        
        if (!loginStatus || !loginButton || !logoutButton || !lastSyncTime || !autoSync) {
            console.error("找不到同步UI元素");
            return;
        }
        
        // 更新登入狀態
        if (!enableFirebase) {
            loginStatus.textContent = '同步未啟用 (請在設定中啟用)';
            loginButton.style.display = 'none';
            logoutButton.style.display = 'none';
        } else if (isLoggedIn) {
            loginStatus.textContent = `已登入: ${user ? user.email : '匿名用戶'}`;
            loginButton.style.display = 'none';
            logoutButton.style.display = 'inline-block';
        } else {
            loginStatus.textContent = '未登入';
            loginButton.style.display = 'inline-block';
            logoutButton.style.display = 'none';
        }
        
        // 更新最後同步時間
        const lastSync = localStorage.getItem('lastSyncTime');
        
        if (lastSync) {
            const lastSyncDate = new Date(lastSync);
            lastSyncTime.textContent = lastSyncDate.toLocaleString();
        } else {
            lastSyncTime.textContent = '從未同步';
        }
        
        // 更新自動同步設置
        autoSync.checked = localStorage.getItem('autoSync') === 'true';
        
        // 同步按鈕狀態
        const syncNowButton = document.getElementById('syncNowButton');
        
        if (syncNowButton) {
            if (!enableFirebase || !isLoggedIn) {
                syncNowButton.disabled = true;
            } else {
                syncNowButton.disabled = false;
            }
        }
    } catch (error) {
        console.error("更新同步UI時發生錯誤:", error);
        throw error;
    }
}

// 更新所有下拉菜單
function updateAllDropdowns() {
    console.log("更新所有下拉菜單");
    
    try {
        // 更新交易表單的下拉菜單
        updateTransactionsForms();
        
        // 更新轉賬表單的下拉菜單
        updateTransferForm();
        
        // 更新類別過濾器
        updateCategoryFilter();
        
        // 更新類別預算下拉菜單
        updateCategoryBudgetSelect();
    } catch (error) {
        console.error("更新所有下拉菜單時發生錯誤:", error);
        // 不拋出異常，因為這只是輔助更新
    }
}

// 設置默認日期
function setDefaultDates() {
    console.log("設置默認日期");
    
    try {
        // 獲取今天的日期
        const today = new Date().toISOString().split('T')[0];
        
        // 設置收入和支出表單的日期
        const incomeDateInput = document.getElementById('incomeDate');
        const expenseDateInput = document.getElementById('expenseDate');
        
        if (incomeDateInput) {
            incomeDateInput.value = today;
        }
        
        if (expenseDateInput) {
            expenseDateInput.value = today;
        }
        
        // 設置交易過濾器的日期範圍
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        if (startDateInput && endDateInput) {
            // 設置開始日期為當月第一天
            const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
            startDateInput.value = firstDay;
            
            // 設置結束日期為今天
            endDateInput.value = today;
        }
    } catch (error) {
        console.error("設置默認日期時發生錯誤:", error);
        // 不拋出異常，因為這只是輔助設置
    }
}

// 更新連接狀態
function updateConnectionStatus() {
    console.log("更新連接狀態");
    
    try {
        const connectionStatus = document.getElementById('connectionStatus');
        
        if (!connectionStatus) {
            console.error("找不到連接狀態元素");
            return;
        }
        
        if (!enableFirebase) {
            connectionStatus.innerHTML = '<span class="status-offline">離線模式</span>';
        } else if (isLoggedIn) {
            connectionStatus.innerHTML = '<span class="status-connected">已登入</span>';
        } else {
            connectionStatus.innerHTML = '<span class="status-disconnected">未登入</span>';
        }
    } catch (error) {
        console.error("更新連接狀態時發生錯誤:", error);
        // 不拋出異常，因為這只是輔助更新
    }
}

// 格式化貨幣
function formatCurrency(amount, currency = defaultCurrency) {
    try {
        // 使用默認貨幣符號
        const symbol = currencySymbols[currency] || currency;
        
        // 格式化為指定小數位數
        const formattedAmount = formatNumber(amount);
        
        // 如果是JPY，不顯示小數點
        if (currency === 'JPY') {
            return `${symbol} ${Math.round(amount)}`;
        }
        
        return `${symbol} ${formattedAmount}`;
    } catch (error) {
        console.error("格式化貨幣時發生錯誤:", error);
        return `${currency} ${amount}`;
    }
}

// 格式化數字
function formatNumber(number) {
    try {
        return number.toFixed(decimalPlaces);
    } catch (error) {
        console.error("格式化數字時發生錯誤:", error);
        return number.toString();
    }
}

// 獲取匯率
function getExchangeRate(fromCurrency, toCurrency) {
    try {
        // 如果是相同貨幣，匯率為1
        if (fromCurrency === toCurrency) {
            return 1;
        }
        
        // 如果有直接匯率，則使用
        if (exchangeRates[fromCurrency] && exchangeRates[fromCurrency][toCurrency] !== undefined) {
            return exchangeRates[fromCurrency][toCurrency];
        }
        
        // 如果有反向匯率，則使用其倒數
        if (exchangeRates[toCurrency] && exchangeRates[toCurrency][fromCurrency] !== undefined) {
            return 1 / exchangeRates[toCurrency][fromCurrency];
        }
        
        // 如果都沒有，則通過USD進行轉換
        if (fromCurrency !== 'USD' && toCurrency !== 'USD') {
            const fromToUSD = getExchangeRate(fromCurrency, 'USD');
            const usdToTo = getExchangeRate('USD', toCurrency);
            return fromToUSD * usdToTo;
        }
        
        // 如果還是無法轉換，則返回1
        console.error(`無法找到匯率: ${fromCurrency} 至 ${toCurrency}`);
        return 1;
    } catch (error) {
        console.error("獲取匯率時發生錯誤:", error);
        return 1;
    }
}

// 獲取貨幣名稱
function getCurrencyName(currencyCode) {
    try {
        const currencyNames = {
            'HKD': '港幣 (HKD)',
            'USD': '美元 (USD)',
            'CNY': '人民幣 (CNY)',
            'EUR': '歐元 (EUR)',
            'GBP': '英鎊 (GBP)',
            'JPY': '日元 (JPY)'
        };
        
        return currencyNames[currencyCode] || currencyCode;
    } catch (error) {
        console.error("獲取貨幣名稱時發生錯誤:", error);
        return currencyCode;
    }
}

// 獲取賬戶類型名稱
function getAccountTypeName(accountType) {
    try {
        const accountTypeNames = {
            'cash': '現金',
            'bank': '銀行戶口',
            'credit': '信用卡',
            'investment': '投資',
            'other': '其他'
        };
        
        return accountTypeNames[accountType] || '其他';
    } catch (error) {
        console.error("獲取賬戶類型名稱時發生錯誤:", error);
        return '其他';
    }
}

// 生成唯一ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// 顯示確認對話框
function showConfirmDialog(message, onConfirm) {
    console.log("顯示確認對話框:", message);
    
    try {
        const confirmModal = document.getElementById('confirmModal');
        const confirmMessage = document.getElementById('confirmMessage');
        const confirmYesButton = document.getElementById('confirmYesButton');
        const confirmNoButton = document.getElementById('confirmNoButton');
        
        if (!confirmModal || !confirmMessage || !confirmYesButton || !confirmNoButton) {
            console.error("找不到確認對話框元素");
            return;
        }
        
        // 設置確認消息
        confirmMessage.textContent = message;
        
        // 設置確認按鈕事件
        confirmYesButton.onclick = function() {
            closeCurrentModal();
            if (typeof onConfirm === 'function') {
                onConfirm();
            }
        };
        
        // 設置取消按鈕事件
        confirmNoButton.onclick = function() {
            closeCurrentModal();
        };
        
        // 顯示確認對話框
        confirmModal.classList.add('active');
    } catch (error) {
        console.error("顯示確認對話框時發生錯誤:", error);
        // 如果顯示確認對話框失敗，則直接執行確認操作
        if (typeof onConfirm === 'function') {
            onConfirm();
        }
    }
}

// 顯示提示消息
function showToast(message, type = 'info', duration = 3000) {
    console.log(`顯示提示消息 (${type}):`, message);
    
    try {
        const toast = document.getElementById('toast');
        
        if (!toast) {
            console.error("找不到提示消息元素");
            return;
        }
        
        // 設置消息
        toast.textContent = message;
        
        // 設置類型
        toast.className = 'toast';
        toast.classList.add(type);
        
        // 顯示提示消息
        toast.classList.remove('hidden');
        
        // 設置定時器，自動隱藏提示消息
        setTimeout(() => {
            toast.classList.add('hidden');
        }, duration);
    } catch (error) {
        console.error("顯示提示消息時發生錯誤:", error);
        // 使用alert作為備用
        alert(`${type.toUpperCase()}: ${message}`);
    }
}

// 加載設置
function loadSettingsFromStorage() {
    console.log("從本地存儲加載設置");
    
    try {
        // 加載設置
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

// 應用設置
function applySettings() {
    console.log("應用設置");
    
    try {
        // 應用深色模式
        if (darkMode) {
            document.body.setAttribute('data-theme', 'dark');
        } else {
            document.body.removeAttribute('data-theme');
        }
        
        // 應用字體大小
        document.body.className = `font-${fontSize}`;
    } catch (error) {
        console.error("應用設置時發生錯誤:", error);
        // 不拋出異常，因為這只是輔助設置
    }
}

// 加載設置到表單
function loadSettingsToForm() {
    console.log("加載設置到表單");
    
    try {
        // 深色模式
        document.getElementById('darkMode').checked = darkMode;
        
        // 字體大小
        const fontSizeRadios = document.querySelectorAll('input[name="fontSize"]');
        fontSizeRadios.forEach(radio => {
            if (radio.value === fontSize) {
                radio.checked = true;
            }
        });
        
        // 默認貨幣
        document.getElementById('defaultCurrency').value = defaultCurrency;
        
        // 小數點位數
        const decimalPlacesRadios = document.querySelectorAll('input[name="decimalPlaces"]');
        decimalPlacesRadios.forEach(radio => {
            if (radio.value === decimalPlaces.toString()) {
                radio.checked = true;
            }
        });
        
        // 啟用預算提醒
        document.getElementById('enableBudgetAlerts').checked = enableBudgetAlerts;
        
        // 提醒閾值
        document.getElementById('alertThreshold').value = alertThreshold;
        
        // 啟用雲端同步
        document.getElementById('enableFirebaseSync').checked = enableFirebase;
    } catch (error) {
        console.error("加載設置到表單時發生錯誤:", error);
        showToast('加載設置到表單失敗', 'error');
    }
}

// 保存設置
function saveSettings() {
    console.log("保存設置");
    
    try {
        // 深色模式
        darkMode = document.getElementById('darkMode').checked;
        
        // 字體大小
        fontSize = document.querySelector('input[name="fontSize"]:checked').value;
        
        // 默認貨幣
        defaultCurrency = document.getElementById('defaultCurrency').value;
        
        // 小數點位數
        decimalPlaces = parseInt(document.querySelector('input[name="decimalPlaces"]:checked').value);
        
        // 啟用預算提醒
        enableBudgetAlerts = document.getElementById('enableBudgetAlerts').checked;
        
        // 提醒閾值
        alertThreshold = parseInt(document.getElementById('alertThreshold').value);
        
        // 啟用雲端同步
        const newEnableFirebase = document.getElementById('enableFirebaseSync').checked;
        
        // 檢查是否變更了同步設置
        const syncChanged = enableFirebase !== newEnableFirebase;
        enableFirebase = newEnableFirebase;
        
        // 更新設置對象
        const settings = {
            darkMode,
            fontSize,
            defaultCurrency,
            decimalPlaces,
            enableBudgetAlerts,
            alertThreshold,
            enableFirebase
        };
        
        // 更新appState中的設置
        appState.settings = settings;
        
        // 保存到本地存儲
        localStorage.setItem('settings', JSON.stringify(settings));
        
        // 應用設置
        applySettings();
        
        // 關閉設置模態框
        closeCurrentModal();
        
        // 重新加載所有UI
        updateAllUI();
        
        // 如果變更了同步設置，則進行相應操作
        if (syncChanged) {
            if (enableFirebase) {
                // 啟用同步
                initFirebase()
                    .then(() => {
                        console.log("Firebase初始化成功");
                        updateSyncStatus();
                    })
                    .catch(error => {
                        console.error("Firebase初始化失敗:", error);
                        showToast('雲端同步設置失敗: ' + error.message, 'error');
                    });
            } else {
                // 禁用同步
                updateSyncStatus();
            }
        }
        
        // 顯示成功消息
        showToast('設置已保存', 'success');
    } catch (error) {
        console.error("保存設置時發生錯誤:", error);
        showToast('保存設置失敗: ' + error.message, 'error');
    }
}

// 清除所有數據
function clearAllData() {
    console.log("清除所有數據");
    
    try {
        // 重置appState
        appState = {
            accounts: [],
            transactions: [],
            categories: {
                income: [],
                expense: []
            },
            budgets: {
                total: 0,
                resetCycle: 'monthly',
                resetDay: 1,
                categories: []
            },
            settings: appState.settings // 保留設置
        };
        
        // 保存到本地存儲
        saveToLocalStorage();
        
        // 執行同步（如果啟用）
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

// 導出數據
function exportData() {
    console.log("導出數據");
    
    try {
        // 創建導出對象
        const exportData = {
            accounts: appState.accounts,
            transactions: appState.transactions,
            categories: appState.categories,
            budgets: appState.budgets,
            version: '1.2.0',
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
        a.download = `finance-tracker-export-${new Date().toISOString().slice(0, 10)}.json`;
        
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

// 從文件導入數據
function importDataFromFile(event) {
    console.log("從文件導入數據");
    
    try {
        const file = event.target.files[0];
        
        if (!file) {
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
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

// 從文本導入數據
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

// 從對象導入數據
function importDataFromObject(importData) {
    console.log("從對象導入數據");
    
    try {
        // 檢查是否是有效的導入數據
        if (!importData.accounts || !importData.transactions || !importData.categories) {
            showToast('導入數據無效，缺少必要字段', 'error');
            return;
        }
        
        // 確認導入
        const message = '確定要導入這些數據嗎？這將覆蓋當前的所有數據。';
        
        showConfirmDialog(message, () => {
            try {
                // 更新appState
                appState.accounts = importData.accounts;
                appState.transactions = importData.transactions;
                appState.categories = importData.categories;
                
                // 導入預算（如果有）
                if (importData.budgets) {
                    appState.budgets = importData.budgets;
                }
                
                // 保存到本地存儲
                saveToLocalStorage();
                
                // 執行同步（如果啟用）
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

// 打開貨幣管理模態框
function openCurrencyManagementModal() {
    // 具體實現待完成，這裡只是一個示例
    console.log("打開貨幣管理模態框");
    showToast('貨幣管理功能開發中', 'info');
}

// 從本地存儲加載數據
function loadDataFromStorage() {
    console.log("從本地存儲加載數據");
    
    try {
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
            appState.categories = JSON.parse(categoriesJson);
        }
        
        // 加載預算
        const budgetsJson = localStorage.getItem('budgets');
        if (budgetsJson) {
            appState.budgets = JSON.parse(budgetsJson);
        }
        
        console.log("從本地存儲加載數據成功");
    } catch (error) {
        console.error("從本地存儲加載數據時發生錯誤:", error);
        showToast('加載數據失敗: ' + error.message, 'error');
    }
}

// 保存到本地存儲
function saveToLocalStorage() {
    console.log("保存到本地存儲");
    
    try {
        // 保存賬戶
        localStorage.setItem('accounts', JSON.stringify(appState.accounts));
        
        // 保存交易
        localStorage.setItem('transactions', JSON.stringify(appState.transactions));
        
        // 保存類別
        localStorage.setItem('categories', JSON.stringify(appState.categories));
        
        // 保存預算
        localStorage.setItem('budgets', JSON.stringify(appState.budgets));
        
        console.log("保存到本地存儲成功");
    } catch (error) {
        console.error("保存到本地存儲時發生錯誤:", error);
        showToast('保存數據失敗: ' + error.message, 'error');
    }
}

// 檢查預算警告
function checkBudgetAlerts() {
    console.log("檢查預算警告");
    
    try {
        // 如果未啟用預算提醒，則跳過
        if (!enableBudgetAlerts) {
            return;
        }
        
        // 如果沒有設置預算，則跳過
        if (!appState.budgets.total || appState.budgets.total <= 0) {
            return;
        }
        
        // 確定預算週期
        const today = new Date();
        const resetCycle = appState.budgets.resetCycle || 'monthly';
        const resetDay = parseInt(appState.budgets.resetDay || 1, 10);
        
        let startDate;
        let cycleName;
        
        if (resetCycle === 'daily') {
            startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            cycleName = '今日';
        } else if (resetCycle === 'weekly') {
            const day = today.getDay(); // 0 = 週日, 1 = 週一, ...
            const diff = day === 0 ? 6 : day - 1; // 調整為週一作為一週的開始
            startDate = new Date(today);
            startDate.setDate(today.getDate() - diff);
            startDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
            cycleName = '本週';
        } else { // monthly
            const currentDay = today.getDate();
            
            if (currentDay >= resetDay) {
                // 本月的重設日
                startDate = new Date(today.getFullYear(), today.getMonth(), resetDay);
            } else {
                // 上月的重設日
                startDate = new Date(today.getFullYear(), today.getMonth() - 1, resetDay);
            }
            
            cycleName = '本月';
        }
        
        // 將日期格式化為 YYYY-MM-DD
        const startDateFormatted = startDate.toISOString().split('T')[0];
        const todayFormatted = today.toISOString().split('T')[0];
        
        // 獲取週期內的支出交易
        const cycleTransactions = appState.transactions.filter(t => 
            t.type === 'expense' && 
            t.date >= startDateFormatted && 
            t.date <= todayFormatted &&
            t.categoryId !== 'transfer_out' // 排除轉賬
        );
        
        // 計算總支出
        let totalSpent = 0;
        
        cycleTransactions.forEach(transaction => {
            const account = appState.accounts.find(a => a.id === transaction.accountId);
            
            if (!account) {
                return;
            }
            
            let amount = transaction.amount;
            
            // 如果賬戶貨幣與默認貨幣不同，則轉換
            if (account.currency !== defaultCurrency) {
                const rate = getExchangeRate(account.currency, defaultCurrency);
                amount = amount * rate;
            }
            
            totalSpent += amount;
        });
        
        // 計算百分比
        const percentage = (totalSpent / appState.budgets.total) * 100;
        
        // 檢查是否超過閾值
        if (percentage >= alertThreshold) {
            // 顯示預算警告
            showToast(`注意: ${cycleName}預算已使用 ${percentage.toFixed(1)}%`, 'warning');
        }
    } catch (error) {
        console.error("檢查預算警告時發生錯誤:", error);
        // 不拋出異常，因為這只是輔助功能
    }
}

// 初始化Firebase
async function initFirebase() {
    console.log("初始化Firebase");
    
    try {
        // 如果沒有啟用Firebase，則跳過
        if (!enableFirebase) {
            console.log("Firebase未啟用");
            return;
        }
        
        // 如果已經初始化，則跳過
        if (firebase && firebase.apps.length > 0) {
            console.log("Firebase已初始化");
            return;
        }
        
        // Firebase配置（這裡使用示例配置，實際應用中應使用自己的配置）
        const firebaseConfig = {
            apiKey: "AIzaSyAaqadmDSgQ-huvY7uNNrPtjFSOl93jVEE",
            authDomain: "finance-d8f9e.firebaseapp.com",
            projectId: "finance-d8f9e",
            storageBucket: "finance-d8f9e.firebasestorage.app",
            messagingSenderId: "1:122645255279:web:25d577b6365c819ffbe99a",
            appId: "1:122645255279:web:25d577b6365c819ffbe99a"
        };
        
        // 初始化Firebase
        firebase.initializeApp(firebaseConfig);
        
        // 初始化Firestore
        db = firebase.firestore();
        
        // 檢查登錄狀態
        firebase.auth().onAuthStateChanged(function(user) {
            if (user) {
                // 用戶已登入
                isLoggedIn = true;
                user = user;
                console.log("用戶已登入:", user.email);
                
                // 更新UI
                updateSyncStatus();
                
                // 檢查是否需要同步數據
                checkAndSyncData();
            } else {
                // 用戶未登入
                isLoggedIn = false;
                user = null;
                console.log("用戶未登入");
                
                // 更新UI
                updateSyncStatus();
            }
        });
        
        console.log("Firebase初始化成功");
    } catch (error) {
        console.error("初始化Firebase時發生錯誤:", error);
        throw error;
    }
}

// 更新同步狀態
function updateSyncStatus() {
    console.log("更新同步狀態");
    
    try {
        // 更新連接狀態
        updateConnectionStatus();
        
        // 更新同步UI
        updateSyncUI();
    } catch (error) {
        console.error("更新同步狀態時發生錯誤:", error);
        // 不拋出異常，因為這只是輔助更新
    }
}

// 處理登入
async function handleLogin() {
    console.log("處理登入");
    
    try {
        // 如果沒有啟用Firebase，則提示用戶
        if (!enableFirebase) {
            showToast('請先在設定中啟用雲端同步', 'error');
            return;
        }
        
        // 如果已經登入，則跳過
        if (isLoggedIn) {
            console.log("用戶已登入");
            return;
        }
        
        // 顯示載入覆蓋層
        document.getElementById('loadingOverlay').style.display = 'flex';
        
        // 使用Google登入
        const provider = new firebase.auth.GoogleAuthProvider();
        
        try {
            // 等待登入完成
            await firebase.auth().signInWithPopup(provider);
            
            // 更新同步狀態
            updateSyncStatus();
            
            // 顯示成功消息
            showToast('登入成功', 'success');
        } catch (error) {
            console.error("登入失敗:", error);
            showToast('登入失敗: ' + error.message, 'error');
        } finally {
            // 隱藏載入覆蓋層
            document.getElementById('loadingOverlay').style.display = 'none';
        }
    } catch (error) {
        console.error("處理登入時發生錯誤:", error);
        showToast('登入處理失敗: ' + error.message, 'error');
        
        // 隱藏載入覆蓋層
        document.getElementById('loadingOverlay').style.display = 'none';
    }
}

// 處理登出
async function handleLogout() {
    console.log("處理登出");
    
    try {
        // 如果沒有啟用Firebase，則跳過
        if (!enableFirebase) {
            return;
        }
        
        // 如果未登入，則跳過
        if (!isLoggedIn) {
            console.log("用戶未登入");
            return;
        }
        
        // 顯示載入覆蓋層
        document.getElementById('loadingOverlay').style.display = 'flex';
        
        try {
            // 等待登出完成
            await firebase.auth().signOut();
            
            // 更新同步狀態
            updateSyncStatus();
            
            // 顯示成功消息
            showToast('已登出', 'success');
        } catch (error) {
            console.error("登出失敗:", error);
            showToast('登出失敗: ' + error.message, 'error');
        } finally {
            // 隱藏載入覆蓋層
            document.getElementById('loadingOverlay').style.display = 'none';
        }
    } catch (error) {
        console.error("處理登出時發生錯誤:", error);
        showToast('登出處理失敗: ' + error.message, 'error');
        
        // 隱藏載入覆蓋層
        document.getElementById('loadingOverlay').style.display = 'none';
    }
}

// 立即同步
async function syncNow() {
    console.log("立即同步");
    
    try {
        // 如果沒有啟用Firebase，則提示用戶
        if (!enableFirebase) {
            showToast('請先在設定中啟用雲端同步', 'error');
            return;
        }
        
        // 如果未登入，則提示用戶
        if (!isLoggedIn) {
            showToast('請先登入', 'error');
            return;
        }
        
        // 防止重複同步
        if (currentlyLoading) {
            showToast('同步進行中，請稍後再試', 'info');
            return;
        }
        
        // 顯示載入覆蓋層
        currentlyLoading = true;
        document.getElementById('loadingOverlay').style.display = 'flex';
        
        try {
            // 執行同步
            await syncToFirebase();
            
            // 記錄同步時間
            localStorage.setItem('lastSyncTime', new Date().toISOString());
            
            // 更新同步UI
            updateSyncUI();
            
            // 顯示成功消息
            showToast('同步成功', 'success');
        } catch (error) {
            console.error("同步失敗:", error);
            showToast('同步失敗: ' + error.message, 'error');
        } finally {
            // 隱藏載入覆蓋層
            currentlyLoading = false;
            document.getElementById('loadingOverlay').style.display = 'none';
        }
    } catch (error) {
        console.error("立即同步時發生錯誤:", error);
        showToast('同步處理失敗: ' + error.message, 'error');
        
        // 隱藏載入覆蓋層
        currentlyLoading = false;
        document.getElementById('loadingOverlay').style.display = 'none';
    }
}

// 檢查並同步數據
async function checkAndSyncData() {
    console.log("檢查並同步數據");
    
    try {
        // 如果沒有啟用Firebase或未登入，則跳過
        if (!enableFirebase || !isLoggedIn) {
            return;
        }
        
        // 防止重複同步
        if (currentlyLoading) {
            return;
        }
        
        // 顯示載入覆蓋層
        currentlyLoading = true;
        document.getElementById('loadingOverlay').style.display = 'flex';
        
        try {
            // 從Firestore獲取數據
            const snapshot = await db.collection('users').doc(user.uid).get();
            
            if (snapshot.exists) {
                // 服務器上有數據
                const serverData = snapshot.data();
                
                // 確認用戶是否要使用服務器上的數據還是本地數據
                if (appState.accounts.length > 0 || appState.transactions.length > 0) {
                    // 本地有數據，詢問用戶
                    const serverTime = new Date(serverData.lastUpdated || 0);
                    const localTime = new Date(Math.max(
                        ...appState.accounts.map(a => new Date(a.createdAt || 0)),
                        ...appState.transactions.map(t => new Date(t.createdAt || 0))
                    ));
                    
                    if (serverTime > localTime) {
                        // 服務器數據更新，詢問用戶
                        const message = `發現雲端數據 (${serverTime.toLocaleString()}) 比本地數據 (${localTime.toLocaleString()}) 更新。要使用雲端數據覆蓋本地數據嗎？`;
                        
                        showConfirmDialog(message, async () => {
                            // 使用服務器數據
                            if (serverData.accounts) {
                                appState.accounts = serverData.accounts;
                            }
                            
                            if (serverData.transactions) {
                                appState.transactions = serverData.transactions;
                            }
                            
                            if (serverData.categories) {
                                appState.categories = serverData.categories;
                            }
                            
                            if (serverData.budgets) {
                                appState.budgets = serverData.budgets;
                            }
                            
                            // 保存到本地存儲
                            saveToLocalStorage();
                            
                            // 更新所有UI
                            updateAllUI();
                            
                            // 記錄同步時間
                            localStorage.setItem('lastSyncTime', new Date().toISOString());
                            
                            // 更新同步UI
                            updateSyncUI();
                            
                            // 顯示成功消息
                            showToast('已同步雲端數據', 'success');
                        });
                    } else {
                        // 本地數據更新，詢問用戶
                        const message = `本地數據 (${localTime.toLocaleString()}) 比雲端數據 (${serverTime.toLocaleString()}) 更新。要上傳本地數據到雲端嗎？`;
                        
                        showConfirmDialog(message, async () => {
                            // 上傳本地數據
                            await syncToFirebase();
                            
                            // 記錄同步時間
                            localStorage.setItem('lastSyncTime', new Date().toISOString());
                            
                            // 更新同步UI
                            updateSyncUI();
                            
                            // 顯示成功消息
                            showToast('已上傳本地數據到雲端', 'success');
                        });
                    }
                } else {
                    // 本地沒有數據，直接使用服務器數據
                    if (serverData.accounts) {
                        appState.accounts = serverData.accounts;
                    }
                    
                    if (serverData.transactions) {
                        appState.transactions = serverData.transactions;
                    }
                    
                    if (serverData.categories) {
                        appState.categories = serverData.categories;
                    }
                    
                    if (serverData.budgets) {
                        appState.budgets = serverData.budgets;
                    }
                    
                    // 保存到本地存儲
                    saveToLocalStorage();
                    
                    // 更新所有UI
                    updateAllUI();
                    
                    // 記錄同步時間
                    localStorage.setItem('lastSyncTime', new Date().toISOString());
                    
                    // 更新同步UI
                    updateSyncUI();
                    
                    // 顯示成功消息
                    showToast('已同步雲端數據', 'success');
                }
            } else {
                // 服務器上沒有數據，上傳本地數據
                if (appState.accounts.length > 0 || appState.transactions.length > 0) {
                    await syncToFirebase();
                    
                    // 記錄同步時間
                    localStorage.setItem('lastSyncTime', new Date().toISOString());
                    
                    // 更新同步UI
                    updateSyncUI();
                    
                    // 顯示成功消息
                    showToast('已上傳本地數據到雲端', 'success');
                }
            }
        } catch (error) {
            console.error("檢查同步數據時發生錯誤:", error);
            showToast('檢查同步數據失敗: ' + error.message, 'error');
        } finally {
            // 隱藏載入覆蓋層
            currentlyLoading = false;
            document.getElementById('loadingOverlay').style.display = 'none';
        }
    } catch (error) {
        console.error("檢查並同步數據時發生錯誤:", error);
        
        // 隱藏載入覆蓋層
        currentlyLoading = false;
        document.getElementById('loadingOverlay').style.display = 'none';
    }
}

// 同步到Firebase
async function syncToFirebase() {
    console.log("同步到Firebase");
    
    try {
        // 如果沒有啟用Firebase或未登入，則跳過
        if (!enableFirebase || !isLoggedIn) {
            console.log("Firebase未啟用或未登入，跳過同步");
            return;
        }
        
        // 創建同步數據
        const syncData = {
            accounts: appState.accounts,
            transactions: appState.transactions,
            categories: appState.categories,
            budgets: appState.budgets,
            lastUpdated: new Date().toISOString()
        };
        
        // 上傳到Firestore
        await db.collection('users').doc(user.uid).set(syncData);
        
        console.log("同步到Firebase成功");
    } catch (error) {
        console.error("同步到Firebase時發生錯誤:", error);
        throw error;
    }
}

// 更新所有UI
function updateAllUI() {
    console.log("更新所有UI");
    
    try {
        // 更新儀表板UI
        updateDashboardUI();
        
        // 更新賬戶UI
        updateAccountsUI();
        
        // 更新交易UI
        updateTransactionsUI();
        
        // 更新預算UI
        updateBudgetsUI();
        
        // 更新類別UI
        updateCategoriesUI();
        
        // 更新轉賬表單
        updateTransferForm();
        
        // 更新連接狀態
        updateConnectionStatus();
        
        // 當前標簽內容
        const currentTab = document.querySelector('.nav-links li.active');
        if (currentTab) {
            showTabContent(currentTab.getAttribute('data-tab'));
        }
    } catch (error) {
        console.error("更新所有UI時發生錯誤:", error);
        showToast('更新UI失敗: ' + error.message, 'error');
        
        // 嘗試安全更新
        safeUpdateUI();
    }
}

// 安全更新UI
function safeUpdateUI() {
    console.log("執行安全UI更新流程...");
    
    // 更新儀表板卡片
    try {
        // 更新總資產顯示
        const totalAssetsElement = document.getElementById('totalAssets');
        if (totalAssetsElement) {
            // 嘗試獲取真實數據，失敗則顯示0
            let totalAssets = 0;
            try {
                if (appState && appState.accounts) {
                    totalAssets = appState.accounts.reduce((sum, account) => {
                        // 考慮匯率轉換
                        let balance = account.balance || 0;
                        if (account.currency !== defaultCurrency) {
                            try {
                                const rate = getExchangeRate(account.currency, defaultCurrency) || 1;
                                balance = balance * rate;
                            } catch (e) {
                                console.error("匯率轉換錯誤:", e);
                            }
                        }
                        return sum + balance;
                    }, 0);
                }
            } catch (e) {
                console.error("計算總資產時出錯:", e);
            }
            
            // 安全地格式化貨幣
            try {
                totalAssetsElement.textContent = formatCurrency(totalAssets);
            } catch (e) {
                totalAssetsElement.textContent = defaultCurrency + " " + totalAssets.toFixed(2);
            }
        }
    } catch (e) {
        console.error("更新總資產顯示出錯:", e);
    }
    
    // 更新今日收支
    try {
        const todayIncomeElement = document.getElementById('todayIncome');
        const todayExpenseElement = document.getElementById('todayExpense');
        
        if (todayIncomeElement && todayExpenseElement) {
            // 獲取今日日期
            const today = new Date();
            const todayString = today.toISOString().split('T')[0]; // 格式為YYYY-MM-DD
            
            // 嘗試計算今日收支
            let todayIncome = 0;
            let todayExpense = 0;
            
            try {
                if (appState && appState.transactions) {
                    appState.transactions.forEach(transaction => {
                        if (transaction.date === todayString) {
                            // 找到對應的戶口以獲取貨幣信息
                            const account = appState.accounts.find(acc => acc.id === transaction.accountId);
                            if (account) {
                                let amount = transaction.amount || 0;
                                
                                // 考慮匯率轉換
                                if (account.currency !== defaultCurrency) {
                                    try {
                                        const rate = getExchangeRate(account.currency, defaultCurrency) || 1;
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
                            }
                        }
                    });
                }
            } catch (e) {
                console.error("計算今日收支時出錯:", e);
            }
            
            // 安全地格式化並顯示
            try {
                todayIncomeElement.textContent = formatCurrency(todayIncome);
                todayExpenseElement.textContent = formatCurrency(todayExpense);
            } catch (e) {
                todayIncomeElement.textContent = defaultCurrency + " " + todayIncome.toFixed(2);
                todayExpenseElement.textContent = defaultCurrency + " " + todayExpense.toFixed(2);
            }
        }
    } catch (e) {
        console.error("更新今日收支顯示出錯:", e);
    }
    
    // 更新今日交易列表
    try {
        const todayTransactionsListElement = document.getElementById('todayTransactionsList');
        if (todayTransactionsListElement) {
            // 獲取今日日期
            const today = new Date();
            const todayString = today.toISOString().split('T')[0]; // 格式為YYYY-MM-DD
            
            let todayTransactions = [];
            try {
                if (appState && appState.transactions) {
                    todayTransactions = appState.transactions.filter(t => t.date === todayString);
                }
            } catch (e) {
                console.error("獲取今日交易時出錯:", e);
            }
            
            if (todayTransactions.length > 0) {
                let html = '';
                
                try {
                    // 限制顯示最多5筆交易
                    const displayTransactions = todayTransactions.slice(0, 5);
                    
                    for (const transaction of displayTransactions) {
                        try {
                            // 獲取相關數據
                            const account = appState.accounts.find(a => a.id === transaction.accountId);
                            const category = transaction.type === 'income' 
                                ? appState.categories.income.find(c => c.id === transaction.categoryId)
                                : appState.categories.expense.find(c => c.id === transaction.categoryId);
                            
                            const accountName = account ? account.name : '未知戶口';
                            const categoryName = category ? category.name : '未知類別';
                            const categoryIcon = category ? category.icon : 'fas fa-question';
                            const categoryColor = category ? category.color : '#999';
                            
                            // 安全格式化金額
                            let formattedAmount;
                            try {
                                formattedAmount = formatCurrency(transaction.amount, account ? account.currency : defaultCurrency);
                            } catch (e) {
                                formattedAmount = (account ? account.currency : defaultCurrency) + " " + (transaction.amount || 0).toFixed(2);
                            }
                            
                            // 構建HTML
                            html += `
                                <div class="transaction-item ${transaction.type}">
                                    <div class="transaction-icon" style="color: ${categoryColor}">
                                        <i class="${categoryIcon}"></i>
                                    </div>
                                    <div class="transaction-details">
                                        <div class="transaction-category">${categoryName}</div>
                                        <div class="transaction-account">${accountName}</div>
                                    </div>
                                    <div class="transaction-amount">${formattedAmount}</div>
                                </div>
                            `;
                        } catch (itemError) {
                            console.error("處理交易項目時出錯:", itemError);
                            // 提供簡化的後備顯示
                            html += `
                                <div class="transaction-item">
                                    <div class="transaction-icon"><i class="fas fa-circle"></i></div>
                                    <div class="transaction-details">
                                        <div class="transaction-category">交易</div>
                                        <div class="transaction-account">戶口</div>
                                    </div>
                                    <div class="transaction-amount">${transaction.amount || 0}</div>
                                </div>
                            `;
                        }
                    }
                } catch (renderError) {
                    console.error("渲染交易列表時出錯:", renderError);
                    html = '<p class="error-message">載入交易時出錯</p>';
                }
                
                todayTransactionsListElement.innerHTML = html;
            } else {
                todayTransactionsListElement.innerHTML = '<p class="empty-message">今日尚無交易記錄</p>';
            }
        }
    } catch (e) {
        console.error("更新今日交易列表出錯:", e);
        // 確保列表至少有一個空消息
        try {
            const element = document.getElementById('todayTransactionsList');
            if (element) {
                element.innerHTML = '<p class="empty-message">無法載入今日交易</p>';
            }
        } catch (backupError) {}
    }
    
    // 更新預算狀態
    try {
        const budgetStatusElement = document.getElementById('budgetStatus');
        if (budgetStatusElement) {
            let hasBudget = false;
            
            try {
                hasBudget = appState && appState.budgets && 
                            ((appState.budgets.total && appState.budgets.total > 0) || 
                             (appState.budgets.categories && appState.budgets.categories.length > 0));
            } catch (e) {
                console.error("檢查預算狀態時出錯:", e);
            }
            
            if (hasBudget) {
                try {
                    // 計算總預算和已使用金額
                    let totalBudget = appState.budgets.total || 0;
                    let totalUsed = 0;
                    
                    // 獲取今日日期計算當前預算週期
                    const today = new Date();
                    const resetCycle = appState.budgets.resetCycle || 'monthly';
                    const resetDay = parseInt(appState.budgets.resetDay || 1, 10);
                    
                    // 確定預算期間的開始日期
                    let startDate;
                    if (resetCycle === 'monthly') {
                        const currentDay = today.getDate();
                        if (currentDay >= resetDay) {
                            // 本月的重設日
                            startDate = new Date(today.getFullYear(), today.getMonth(), resetDay);
                        } else {
                            // 上月的重設日
                            startDate = new Date(today.getFullYear(), today.getMonth() - 1, resetDay);
                        }
                    } else if (resetCycle === 'weekly') {
                        // 計算7天前
                        startDate = new Date(today);
                        startDate.setDate(today.getDate() - 7);
                    } else { // daily
                        // 今天開始
                        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    }
                    
                    // 格式化日期為YYYY-MM-DD
                    const startDateStr = startDate.toISOString().split('T')[0];
                    const endDateStr = today.toISOString().split('T')[0];
                    
                    // 計算已使用預算
                    if (appState.transactions) {
                        appState.transactions.forEach(transaction => {
                            if (transaction.type === 'expense' && 
                                transaction.date >= startDateStr && 
                                transaction.date <= endDateStr) {
                                
                                const account = appState.accounts.find(a => a.id === transaction.accountId);
                                if (account) {
                                    let amount = transaction.amount || 0;
                                    
                                    // 考慮匯率轉換
                                    if (account.currency !== defaultCurrency) {
                                        try {
                                            const rate = getExchangeRate(account.currency, defaultCurrency) || 1;
                                            amount = amount * rate;
                                        } catch (e) {
                                            console.error("匯率轉換錯誤:", e);
                                        }
                                    }
                                    
                                    totalUsed += amount;
                                }
                            }
                        });
                    }
                    
                    // 計算百分比和剩餘預算
                    const usedPercentage = totalBudget > 0 ? (totalUsed / totalBudget * 100) : 0;
                    const remainingBudget = Math.max(0, totalBudget - totalUsed);
                    
                    // 獲取預算週期描述
                    let cycleDescription = '本月';
                    if (resetCycle === 'weekly') {
                        cycleDescription = '本週';
                    } else if (resetCycle === 'daily') {
                        cycleDescription = '今日';
                    }
                    
                    // 構建預算狀態HTML
                    let progressColor = 'var(--primary-color)';
                    if (usedPercentage > 90) {
                        progressColor = 'var(--danger-color)';
                    } else if (usedPercentage > 70) {
                        progressColor = 'var(--warning-color)';
                    }
                    
                    budgetStatusElement.innerHTML = `
                        <div class="budget-header">
                            <h4>${cycleDescription}預算</h4>
                            <span class="budget-amount">${formatCurrency(totalBudget)}</span>
                        </div>
                        <div class="budget-progress-container">
                            <div class="budget-progress-bar" style="width: ${Math.min(100, usedPercentage)}%; background-color: ${progressColor}"></div>
                        </div>
                        <div class="budget-info">
                            <span>已使用 ${formatCurrency(totalUsed)} (${usedPercentage.toFixed(1)}%)</span>
                            <span>剩餘 ${formatCurrency(remainingBudget)}</span>
                        </div>
                    `;
                } catch (budgetError) {
                    console.error("渲染預算狀態時出錯:", budgetError);
                    budgetStatusElement.innerHTML = '<p class="error-message">無法載入預算資訊</p>';
                }
            } else {
                budgetStatusElement.innerHTML = '<p class="empty-message">尚未設定預算</p><a href="#" onclick="showTabContent(\'budgets\')" class="action-link">設定預算</a>';
            }
        }
    } catch (e) {
        console.error("更新預算狀態出錯:", e);
        try {
            const element = document.getElementById('budgetStatus');
            if (element) {
                element.innerHTML = '<p class="empty-message">無法載入預算資訊</p>';
            }
        } catch (backupError) {}
    }
    
    // 更新近期交易
    try {
        const recentTransactionsListElement = document.getElementById('recentTransactionsList');
        if (recentTransactionsListElement) {
            let recentTransactions = [];
            
            try {
                if (appState && appState.transactions) {
                    // 獲取最近10筆交易
                    recentTransactions = [...appState.transactions]
                        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
                        .slice(0, 10);
                }
            } catch (e) {
                console.error("獲取近期交易時出錯:", e);
            }
            
            if (recentTransactions.length > 0) {
                let html = '';
                
                try {
                    for (const transaction of recentTransactions) {
                        try {
                            // 獲取相關數據
                            const account = appState.accounts.find(a => a.id === transaction.accountId);
                            const category = transaction.type === 'income' 
                                ? appState.categories.income.find(c => c.id === transaction.categoryId)
                                : appState.categories.expense.find(c => c.id === transaction.categoryId);
                            
                            const accountName = account ? account.name : '未知戶口';
                            const categoryName = category ? category.name : '未知類別';
                            const categoryIcon = category ? category.icon : 'fas fa-question';
                            const categoryColor = category ? category.color : '#999';
                            
                            // 安全格式化金額和日期
                            let formattedAmount, formattedDate;
                            try {
                                formattedAmount = formatCurrency(transaction.amount, account ? account.currency : defaultCurrency);
                                
                                const [year, month, day] = transaction.date.split('-');
                                formattedDate = `${day}/${month}/${year}`;
                            } catch (e) {
                                formattedAmount = (account ? account.currency : defaultCurrency) + " " + (transaction.amount || 0).toFixed(2);
                                formattedDate = transaction.date || '未知日期';
                            }
                            
                            // 構建HTML
                            html += `
                                <div class="transaction-item ${transaction.type}">
                                    <div class="transaction-date">${formattedDate}</div>
                                    <div class="transaction-icon" style="color: ${categoryColor}">
                                        <i class="${categoryIcon}"></i>
                                    </div>
                                    <div class="transaction-details">
                                        <div class="transaction-category">${categoryName}</div>
                                        <div class="transaction-account">${accountName}</div>
                                        ${transaction.note ? `<div class="transaction-note">${transaction.note}</div>` : ''}
                                    </div>
                                    <div class="transaction-amount">${formattedAmount}</div>
                                </div>
                            `;
                        } catch (itemError) {
                            console.error("處理交易項目時出錯:", itemError);
                            // 提供簡化的後備顯示
                            html += `
                                <div class="transaction-item">
                                    <div class="transaction-date">${transaction.date || '未知日期'}</div>
                                    <div class="transaction-icon"><i class="fas fa-circle"></i></div>
                                    <div class="transaction-details">
                                        <div class="transaction-category">交易</div>
                                        <div class="transaction-account">戶口</div>
                                    </div>
                                    <div class="transaction-amount">${transaction.amount || 0}</div>
                                </div>
                            `;
                        }
                    }
                } catch (renderError) {
                    console.error("渲染近期交易時出錯:", renderError);
                    html = '<p class="error-message">載入交易時出錯</p>';
                }
                
                recentTransactionsListElement.innerHTML = html;
            } else {
                recentTransactionsListElement.innerHTML = '<p class="empty-message">尚無交易記錄</p>';
            }
        }
    } catch (e) {
        console.error("更新近期交易列表出錯:", e);
        try {
            const element = document.getElementById('recentTransactionsList');
            if (element) {
                element.innerHTML = '<p class="empty-message">無法載入近期交易</p>';
            }
        } catch (backupError) {}
    }
    
    // 更新財務健康指數
    try {
        const financialHealthIndexElement = document.getElementById('financialHealthIndex');
        const financialAdviceElement = document.getElementById('financialAdvice');
        
        if (financialHealthIndexElement) {
            financialHealthIndexElement.textContent = '--';
        }
        
        if (financialAdviceElement) {
            financialAdviceElement.textContent = '無法計算財務建議';
        }
    } catch (e) {
        console.error("更新財務健康指數出錯:", e);
    }
    
    // 更新連接狀態
    try {
        const connectionStatusElement = document.getElementById('connectionStatus');
        if (connectionStatusElement) {
            if (enableFirebase) {
                if (isLoggedIn) {
                    connectionStatusElement.innerHTML = '<span class="status-connected">已登入</span>';
                } else {
                    connectionStatusElement.innerHTML = '<span class="status-disconnected">未登入</span>';
                }
            } else {
                connectionStatusElement.innerHTML = '<span class="status-offline">離線模式</span>';
            }
        }
    } catch (e) {
        console.error("更新連接狀態出錯:", e);
    }
    
    console.log("安全UI更新完成");
}
