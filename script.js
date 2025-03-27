// 全局變量
let accounts = [];
let transactions = [];
let categories = {
    income: [],
    expense: []
};
let budgets = {
    main: {
        amount: 0,
        cycle: 'monthly',
        autoCalculate: false
    },
    categories: []
};
let settings = {
    currency: 'TWD',
    currencySymbol: '$',
    autoSync: false
};
let isLoggedIn = false;
let currentUser = null;
let lastSyncTime = null;

// Firebase相關函數
function loginWithGoogle() {
    const auth = window.firebaseAuth;
    const provider = new firebase.auth.GoogleAuthProvider();
    
    auth.signInWithPopup(provider)
        .then((result) => {
            // 登入成功
            currentUser = result.user;
            isLoggedIn = true;
            updateLoginStatus();
            loadUserData();
        }).catch((error) => {
            console.error("登入失敗:", error);
            alert("登入失敗，請稍後再試");
        });
}

function logoutFromFirebase() {
    const auth = window.firebaseAuth;
    
    auth.signOut()
        .then(() => {
            currentUser = null;
            isLoggedIn = false;
            updateLoginStatus();
        }).catch((error) => {
            console.error("登出失敗:", error);
        });
}

function updateLoginStatus() {
    const loginStatus = document.getElementById('login-status');
    const firebaseLoginStatus = document.getElementById('sync-status-message');
    const loginBtn = document.getElementById('firebase-login-btn');
    const logoutBtn = document.getElementById('firebase-logout-btn');
    const manualSyncBtn = document.getElementById('manual-sync');
    const autoSyncCheckbox = document.getElementById('auto-sync');
    
    if (isLoggedIn && currentUser) {
        loginStatus.textContent = `已登入: ${currentUser.email}`;
        firebaseLoginStatus.textContent = `已登入: ${currentUser.email}`;
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
        manualSyncBtn.disabled = false;
        autoSyncCheckbox.disabled = false;
    } else {
        loginStatus.textContent = '未登入';
        firebaseLoginStatus.textContent = '未登入';
        loginBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
        manualSyncBtn.disabled = true;
        autoSyncCheckbox.disabled = true;
    }
}

function saveToFirebase() {
    if (!isLoggedIn || !currentUser) {
        alert("請先登入");
        return;
    }
    
    const db = window.firebaseDb;
    const userId = currentUser.uid;
    
    // 獲取本地數據
    const userData = {
        accounts: accounts,
        transactions: transactions,
        categories: categories,
        budgets: budgets,
        settings: settings,
        lastUpdated: new Date().toISOString()
    };
    
    // 保存到Firebase
    const userRef = window.firebase.database.ref(db, 'users/' + userId);
    window.firebase.database.set(userRef, userData)
        .then(() => {
            console.log("數據已同步到Firebase");
            lastSyncTime = new Date();
            updateLastSyncTime();
        })
        .catch((error) => {
            console.error("同步失敗:", error);
            alert("同步失敗，請稍後再試");
        });
}   

function loadUserData() {
    if (!isLoggedIn || !currentUser) return;
    
    const db = window.firebaseDb;
    const userId = currentUser.uid;
    const userRef = window.firebase.database.ref(db, 'users/' + userId);
    
    // 一次性讀取當前數據
    window.firebase.database.get(userRef)
        .then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                // 更新本地數據
                accounts = data.accounts || [];
                transactions = data.transactions || [];
                categories = data.categories || { income: [], expense: [] };
                budgets = data.budgets || {
                    main: { amount: 0, cycle: 'monthly', autoCalculate: false },
                    categories: []
                };
                settings = data.settings || {
                    currency: 'TWD',
                    currencySymbol: '$',
                    autoSync: false
                };
                
                lastSyncTime = new Date();
                updateLastSyncTime();
                
                // 保存到本地存儲
                saveToLocalStorage();
                
                // 刷新UI顯示
                refreshUI();
            }
        })
        .catch((error) => {
            console.error("載入數據失敗:", error);
        });
    
    // 如果啟用了自動同步，設置實時監聽
    if (settings.autoSync) {
        setupRealtimeSync(userRef);
    }
}

function setupRealtimeSync(userRef) {
    window.firebase.database.onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            // 檢查數據時間戳，避免覆蓋更新的本地數據
            const localLastUpdated = localStorage.getItem('lastUpdated');
            if (!localLastUpdated || new Date(data.lastUpdated) > new Date(localLastUpdated)) {
                // 更新本地數據
                accounts = data.accounts || [];
                transactions = data.transactions || [];
                categories = data.categories || { income: [], expense: [] };
                budgets = data.budgets || {
                    main: { amount: 0, cycle: 'monthly', autoCalculate: false },
                    categories: []
                };
                settings = data.settings || {
                    currency: 'TWD',
                    currencySymbol: '$',
                    autoSync: false
                };
                
                lastSyncTime = new Date();
                updateLastSyncTime();
                
                // 保存到本地存儲
                saveToLocalStorage();
                
                // 刷新UI顯示
                refreshUI();
            }
        }
    });
}

function updateLastSyncTime() {
    const lastSyncElement = document.getElementById('last-sync-time');
    if (lastSyncTime) {
        lastSyncElement.textContent = lastSyncTime.toLocaleString();
    } else {
        lastSyncElement.textContent = '從未同步';
    }
}

// 本地存儲函數
function saveToLocalStorage() {
    localStorage.setItem('accounts', JSON.stringify(accounts));
    localStorage.setItem('transactions', JSON.stringify(transactions));
    localStorage.setItem('categories', JSON.stringify(categories));
    localStorage.setItem('budgets', JSON.stringify(budgets));
    localStorage.setItem('settings', JSON.stringify(settings));
    localStorage.setItem('lastUpdated', new Date().toISOString());
}

function loadFromLocalStorage() {
    const storedAccounts = localStorage.getItem('accounts');
    const storedTransactions = localStorage.getItem('transactions');
    const storedCategories = localStorage.getItem('categories');
    const storedBudgets = localStorage.getItem('budgets');
    const storedSettings = localStorage.getItem('settings');
    
    if (storedAccounts) accounts = JSON.parse(storedAccounts);
    if (storedTransactions) transactions = JSON.parse(storedTransactions);
    if (storedCategories) categories = JSON.parse(storedCategories);
    if (storedBudgets) budgets = JSON.parse(storedBudgets);
    if (storedSettings) settings = JSON.parse(storedSettings);
}

// 基本數據操作函數
function addAccount(accountData) {
    const newAccount = {
        id: generateUniqueId(),
        name: accountData.name,
        balance: parseFloat(accountData.balance) || 0,
        currency: accountData.currency || settings.currency,
        icon: accountData.icon || '💰'
    };
    
    accounts.push(newAccount);
    saveToLocalStorage();
    
    if (settings.autoSync && isLoggedIn) {
        saveToFirebase();
    }
    
    return newAccount;
}

function updateAccount(accountId, newData) {
    const index = accounts.findIndex(account => account.id === accountId);
    if (index !== -1) {
        accounts[index] = { ...accounts[index], ...newData };
        saveToLocalStorage();
        
        if (settings.autoSync && isLoggedIn) {
            saveToFirebase();
        }
        
        return accounts[index];
    }
    return null;
}

function deleteAccount(accountId) {
    const index = accounts.findIndex(account => account.id === accountId);
    if (index !== -1) {
        accounts.splice(index, 1);
        saveToLocalStorage();
        
        if (settings.autoSync && isLoggedIn) {
            saveToFirebase();
        }
        
        return true;
    }
    return false;
}

function addCategory(categoryData) {
    const newCategory = {
        id: generateUniqueId(),
        name: categoryData.name,
        type: categoryData.type, // 'income' or 'expense'
        icon: categoryData.icon || (categoryData.type === 'income' ? '💹' : '💸')
    };
    
    if (categoryData.type === 'income') {
        categories.income.push(newCategory);
    } else {
        categories.expense.push(newCategory);
    }
    
    saveToLocalStorage();
    
    if (settings.autoSync && isLoggedIn) {
        saveToFirebase();
    }
    
    return newCategory;
}

function updateCategory(categoryId, newData) {
    let found = false;
    
    // 檢查收入類別
    const incomeIndex = categories.income.findIndex(cat => cat.id === categoryId);
    if (incomeIndex !== -1) {
        categories.income[incomeIndex] = { ...categories.income[incomeIndex], ...newData };
        found = true;
    }
    
    // 如果未找到，檢查支出類別
    if (!found) {
        const expenseIndex = categories.expense.findIndex(cat => cat.id === categoryId);
        if (expenseIndex !== -1) {
            categories.expense[expenseIndex] = { ...categories.expense[expenseIndex], ...newData };
            found = true;
        }
    }
    
    if (found) {
        saveToLocalStorage();
        
        if (settings.autoSync && isLoggedIn) {
            saveToFirebase();
        }
        
        return true;
    }
    
    return false;
}

function deleteCategory(categoryId) {
    let found = false;
    
    // 檢查收入類別
    const incomeIndex = categories.income.findIndex(cat => cat.id === categoryId);
    if (incomeIndex !== -1) {
        categories.income.splice(incomeIndex, 1);
        found = true;
    }
    
    // 如果未找到，檢查支出類別
    if (!found) {
        const expenseIndex = categories.expense.findIndex(cat => cat.id === categoryId);
        if (expenseIndex !== -1) {
            categories.expense.splice(expenseIndex, 1);
            found = true;
        }
    }
    
    if (found) {
        saveToLocalStorage();
        
        if (settings.autoSync && isLoggedIn) {
            saveToFirebase();
        }
        
        return true;
    }
    
    return false;
}

function addTransaction(transactionData) {
    const newTransaction = {
        id: generateUniqueId(),
        type: transactionData.type, // 'income' or 'expense'
        accountId: transactionData.accountId,
        categoryId: transactionData.categoryId,
        amount: parseFloat(transactionData.amount) || 0,
        date: transactionData.date || new Date().toISOString().split('T')[0],
        notes: transactionData.notes || '',
        receipt: transactionData.receipt || null,
        timestamp: new Date().toISOString()
    };
    
    transactions.push(newTransaction);
    
    // 更新戶口餘額
    updateAccountBalance(newTransaction.accountId, newTransaction.type, newTransaction.amount);
    
    saveToLocalStorage();
    
    if (settings.autoSync && isLoggedIn) {
        saveToFirebase();
    }
    
    return newTransaction;
}

function updateAccountBalance(accountId, transactionType, amount) {
    const account = accounts.find(acc => acc.id === accountId);
    if (account) {
        if (transactionType === 'income') {
            account.balance += amount;
        } else {
            account.balance -= amount;
        }
    }
}

function updateTransaction(transactionId, newData) {
    const index = transactions.findIndex(t => t.id === transactionId);
    if (index !== -1) {
        // 如果金額或類型改變，需要更新戶口餘額
        const oldTransaction = transactions[index];
        if (newData.amount !== undefined || newData.type !== undefined) {
            // 回滾原交易的影響
            if (oldTransaction.type === 'income') {
                updateAccountBalance(oldTransaction.accountId, 'expense', oldTransaction.amount);
            } else {
                updateAccountBalance(oldTransaction.accountId, 'income', oldTransaction.amount);
            }
            
            // 應用新交易的影響
            const newAmount = newData.amount !== undefined ? newData.amount : oldTransaction.amount;
            const newType = newData.type !== undefined ? newData.type : oldTransaction.type;
            const newAccountId = newData.accountId !== undefined ? newData.accountId : oldTransaction.accountId;
            
            updateAccountBalance(newAccountId, newType, newAmount);
        }
        
        transactions[index] = { ...oldTransaction, ...newData };
        saveToLocalStorage();
        
        if (settings.autoSync && isLoggedIn) {
            saveToFirebase();
        }
        
        return transactions[index];
    }
    return null;
}

function deleteTransaction(transactionId) {
    const index = transactions.findIndex(t => t.id === transactionId);
    if (index !== -1) {
        const transaction = transactions[index];
        
        // 回滾交易對戶口餘額的影響
        if (transaction.type === 'income') {
            updateAccountBalance(transaction.accountId, 'expense', transaction.amount);
        } else {
            updateAccountBalance(transaction.accountId, 'income', transaction.amount);
        }
        
        transactions.splice(index, 1);
        saveToLocalStorage();
        
        if (settings.autoSync && isLoggedIn) {
            saveToFirebase();
        }
        
        return true;
    }
    return false;
}

function updateBudget(budgetData) {
    budgets.main = {
        amount: parseFloat(budgetData.amount) || 0,
        cycle: budgetData.cycle || 'monthly',
        autoCalculate: budgetData.autoCalculate || false
    };
    
    saveToLocalStorage();
    
    if (settings.autoSync && isLoggedIn) {
        saveToFirebase();
    }
    
    return budgets.main;
}

function addCategoryBudget(categoryId, amount) {
    const existingIndex = budgets.categories.findIndex(b => b.categoryId === categoryId);
    
    if (existingIndex !== -1) {
        budgets.categories[existingIndex].amount = parseFloat(amount) || 0;
    } else {
        budgets.categories.push({
            categoryId: categoryId,
            amount: parseFloat(amount) || 0
        });
    }
    
    saveToLocalStorage();
    
    if (settings.autoSync && isLoggedIn) {
        saveToFirebase();
    }
    
    return budgets.categories;
}

function deleteCategoryBudget(categoryId) {
    const index = budgets.categories.findIndex(b => b.categoryId === categoryId);
    if (index !== -1) {
        budgets.categories.splice(index, 1);
        saveToLocalStorage();
        
        if (settings.autoSync && isLoggedIn) {
            saveToFirebase();
        }
        
        return true;
    }
    return false;
}

// 輔助函數
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function formatCurrency(amount, currency = settings.currency) {
    return settings.currencySymbol + ' ' + amount.toFixed(2);
}

function getTodayTransactions() {
    const today = new Date().toISOString().split('T')[0];
    return transactions.filter(t => t.date === today);
}

function getRecentTransactions(limit = 5) {
    // 按日期降序排序
    return [...transactions]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, limit);
}

function calculateTotalAssets() {
    return accounts.reduce((total, account) => total + account.balance, 0);
}

function calculateTodayIncome() {
    const todayTransactions = getTodayTransactions();
    return todayTransactions
        .filter(t => t.type === 'income')
        .reduce((total, t) => total + t.amount, 0);
}

function calculateTodayExpense() {
    const todayTransactions = getTodayTransactions();
    return todayTransactions
        .filter(t => t.type === 'expense')
        .reduce((total, t) => total + t.amount, 0);
}

function calculateBudgetStatus() {
    // 獲取當前預算週期內的支出交易
    const currentCycleTransactions = getTransactionsInCurrentBudgetCycle();
    const totalExpenses = currentCycleTransactions
        .filter(t => t.type === 'expense')
        .reduce((total, t) => total + t.amount, 0);
    
    // 計算預算餘額
    const remainingBudget = budgets.main.amount - totalExpenses;
    
    return {
        total: budgets.main.amount,
        spent: totalExpenses,
        remaining: remainingBudget,
        percentage: budgets.main.amount ? (totalExpenses / budgets.main.amount) * 100 : 0
    };
}

function getTransactionsInCurrentBudgetCycle() {
    const now = new Date();
    let startDate;
    
    switch (budgets.main.cycle) {
        case 'daily':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case 'weekly':
            const day = now.getDay() || 7; // 把星期日視為7，其餘不變
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
            break;
        case 'monthly':
        default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
    }
    
    return transactions.filter(t => new Date(t.date) >= startDate);
}

// UI交互函數
function switchTab(tabId) {
    // 隱藏所有內容
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // 去除所有標籤的活動狀態
    document.querySelectorAll('.tabs > .tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // 顯示選定的內容
    document.getElementById(tabId).classList.add('active');
    
    // 激活對應的標籤
    document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add('active');
}

function refreshUI() {
    // 更新儀表板摘要數據
    document.getElementById('total-assets').textContent = formatCurrency(calculateTotalAssets());
    document.getElementById('today-income').textContent = formatCurrency(calculateTodayIncome());
    document.getElementById('today-expense').textContent = formatCurrency(calculateTodayExpense());
    
    // 更新今日交易列表
    refreshTodayTransactions();
    
    // 更新近期交易列表
    refreshRecentTransactions();
    
    // 更新預算狀態
    refreshBudgetStatus();
    
    // 更新戶口列表
    refreshAccountsList();
    
    // 更新轉賬表單的戶口選項
    refreshAccountOptions();
    
    // 更新類別列表
    refreshCategoriesList();
    
    // 更新交易表單的類別選項
    refreshCategoryOptions();
    
    // 更新交易記錄列表
    refreshTransactionsList();
    
    // 更新統計圖表
    refreshCharts();
}

function refreshTodayTransactions() {
    const todayTransactionsContainer = document.getElementById('today-transactions');
    const todayTrans = getTodayTransactions();
    
    if (todayTrans.length === 0) {
        todayTransactionsContainer.innerHTML = '<div class="empty-state">今日尚無交易記錄</div>';
        return;
    }
    
    todayTransactionsContainer.innerHTML = '';
    
    todayTrans.forEach(transaction => {
        const account = accounts.find(a => a.id === transaction.accountId);
        const category = transaction.type === 'income' 
            ? categories.income.find(c => c.id === transaction.categoryId)
            : categories.expense.find(c => c.id === transaction.categoryId);
        
        const transactionElement = document.createElement('div');
        transactionElement.className = 'transaction-item';
        transactionElement.innerHTML = `
            <div class="transaction-details">
                <div>${account ? account.name : '未知戶口'} - ${category ? category.name : '未知類別'}</div>
                <div class="transaction-category">${transaction.notes}</div>
            </div>
            <div class="transaction-amount ${transaction.type === 'income' ? 'positive' : 'negative'}">
                ${transaction.type === 'income' ? '+' : '-'} ${formatCurrency(transaction.amount)}
            </div>
            <div class="transaction-actions">
                <span class="action-icon" onclick="editTransaction('${transaction.id}')">✏️</span>
                <span class="action-icon" onclick="deleteTransactionWithConfirm('${transaction.id}')">🗑️</span>
            </div>
        `;
        
        todayTransactionsContainer.appendChild(transactionElement);
    });
}

function refreshRecentTransactions() {
    const recentTransactionsContainer = document.getElementById('recent-transactions');
    const recentTrans = getRecentTransactions();
    
    if (recentTrans.length === 0) {
        recentTransactionsContainer.innerHTML = '<div class="empty-state">尚無交易記錄</div>';
        return;
    }
    
    recentTransactionsContainer.innerHTML = '';
    
    recentTrans.forEach(transaction => {
        const account = accounts.find(a => a.id === transaction.accountId);
        const category = transaction.type === 'income' 
            ? categories.income.find(c => c.id === transaction.categoryId)
            : categories.expense.find(c => c.id === transaction.categoryId);
        
        const transactionElement = document.createElement('div');
        transactionElement.className = 'transaction-item';
        transactionElement.innerHTML = `
            <div class="transaction-details">
                <div>${transaction.date} | ${account ? account.name : '未知戶口'} - ${category ? category.name : '未知類別'}</div>
                <div class="transaction-category">${transaction.notes}</div>
            </div>
            <div class="transaction-amount ${transaction.type === 'income' ? 'positive' : 'negative'}">
                ${transaction.type === 'income' ? '+' : '-'} ${formatCurrency(transaction.amount)}
            </div>
        `;
        
        recentTransactionsContainer.appendChild(transactionElement);
    });
}

function refreshBudgetStatus() {
    const budgetStatusContainer = document.getElementById('budget-status');
    
    if (!budgets.main.amount) {
        budgetStatusContainer.innerHTML = `
            <div class="empty-state">尚未設定預算</div>
            <button id="setup-budget-btn" class="btn btn-primary">設定預算</button>
        `;
        document.getElementById('setup-budget-btn').addEventListener('click', () => {
            switchTab('budgets');
        });
        return;
    }
    
    const status = calculateBudgetStatus();
    const progressPercentage = Math.min(100, status.percentage);
    const progressClass = progressPercentage > 90 ? 'danger' : progressPercentage > 70 ? 'warning' : 'success';
    
    budgetStatusContainer.innerHTML = `
        <div class="budget-info">
            <div class="budget-label">預算週期:</div>
            <div class="budget-value">${budgets.main.cycle === 'daily' ? '每日' : budgets.main.cycle === 'weekly' ? '每週' : '每月'}</div>
        </div>
        <div class="budget-info">
            <div class="budget-label">總預算:</div>
            <div class="budget-value">${formatCurrency(status.total)}</div>
        </div>
        <div class="budget-info">
            <div class="budget-label">已消費:</div>
            <div class="budget-value">${formatCurrency(status.spent)}</div>
        </div>
        <div class="budget-info">
            <div class="budget-label">剩餘預算:</div>
            <div class="budget-value ${status.remaining < 0 ? 'negative' : 'positive'}">${formatCurrency(status.remaining)}</div>
        </div>
        <div class="budget-progress">
            <div class="progress-bar">
                <div class="progress-fill ${progressClass}" style="width: ${progressPercentage}%"></div>
            </div>
            <div class="progress-text">${progressPercentage.toFixed(1)}%</div>
        </div>
    `;
}

function refreshAccountsList() {
    const accountsListContainer = document.getElementById('accounts-list');
    
    if (accounts.length === 0) {
        accountsListContainer.innerHTML = '<div class="empty-state">尚未設置任何戶口</div>';
        return;
    }
    
    accountsListContainer.innerHTML = '';
    
    accounts.forEach(account => {
        const accountElement = document.createElement('div');
        accountElement.className = 'account-item';
        accountElement.innerHTML = `
            <div class="account-icon">${account.icon}</div>
            <div class="account-details">
                <div class="account-name">${account.name}</div>
                <div class="account-currency">${account.currency}</div>
            </div>
            <div class="account-balance">${formatCurrency(account.balance, account.currency)}</div>
            <div class="account-actions">
                <span class="action-icon" onclick="editAccount('${account.id}')">✏️</span>
                <span class="action-icon" onclick="deleteAccountWithConfirm('${account.id}')">🗑️</span>
            </div>
        `;
        
        accountsListContainer.appendChild(accountElement);
    });
}

function refreshAccountOptions() {
    const accountSelects = document.querySelectorAll('#from-account, #to-account, #transaction-account');
    
    accountSelects.forEach(select => {
        // 保存當前選中的值
        const currentValue = select.value;
        
        // 清空選項
        select.innerHTML = '<option value="">選擇戶口</option>';
        
        // 添加戶口選項
        accounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account.id;
            option.textContent = `${account.name} (${formatCurrency(account.balance, account.currency)})`;
            select.appendChild(option);
        });
        
        // 如果之前有選中的值，恢復選中狀態
        if (currentValue) {
            select.value = currentValue;
        }
    });
}

function refreshCategoriesList() {
    const incomeCategoriesContainer = document.getElementById('income-categories-list');
    const expenseCategoriesContainer = document.getElementById('expense-categories-list');
    
    // 收入類別
    if (categories.income.length === 0) {
        incomeCategoriesContainer.innerHTML = '<div class="empty-state">尚未設置收入類別</div>';
    } else {
        incomeCategoriesContainer.innerHTML = '';
        
        categories.income.forEach(category => {
            const categoryElement = document.createElement('div');
            categoryElement.className = 'category-item';
            categoryElement.innerHTML = `
                <div class="category-icon">${category.icon}</div>
                <div class="category-name">${category.name}</div>
                <div class="category-actions">
                    <span class="action-icon" onclick="editCategory('${category.id}')">✏️</span>
                    <span class="action-icon" onclick="deleteCategoryWithConfirm('${category.id}')">🗑️</span>
                </div>
            `;
            
            incomeCategoriesContainer.appendChild(categoryElement);
        });
    }
    
    // 支出類別
    if (categories.expense.length === 0) {
        expenseCategoriesContainer.innerHTML = '<div class="empty-state">尚未設置支出類別</div>';
    } else {
        expenseCategoriesContainer.innerHTML = '';
        
        categories.expense.forEach(category => {
            const categoryElement = document.createElement('div');
            categoryElement.className = 'category-item';
            categoryElement.innerHTML = `
                <div class="category-icon">${category.icon}</div>
                <div class="category-name">${category.name}</div>
                <div class="category-actions">
                    <span class="action-icon" onclick="editCategory('${category.id}')">✏️</span>
                    <span class="action-icon" onclick="deleteCategoryWithConfirm('${category.id}')">🗑️</span>
                </div>
            `;
            
            expenseCategoriesContainer.appendChild(categoryElement);
        });
    }
}

function refreshCategoryOptions() {
    const categorySelect = document.getElementById('transaction-category');
    const transactionType = document.getElementById('transaction-type').value;
    
    // 保存當前選中的值
    const currentValue = categorySelect.value;
    
    // 清空選項
    categorySelect.innerHTML = '<option value="">選擇類別</option>';
    
    // 添加類別選項
    const categoryList = transactionType === 'income' ? categories.income : categories.expense;
    
    categoryList.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = `${category.icon} ${category.name}`;
        categorySelect.appendChild(option);
    });
    
    // 如果之前有選中的值，恢復選中狀態
    if (currentValue) {
        categorySelect.value = currentValue;
    }
}

function refreshTransactionsList() {
    const transactionsListContainer = document.getElementById('transactions-list');
    
    if (transactions.length === 0) {
        transactionsListContainer.innerHTML = '<div class="empty-state">無符合條件的交易記錄</div>';
        return;
    }
    
    // 獲取篩選條件
    const dateFrom = document.getElementById('filter-date-from').value;
    const dateTo = document.getElementById('filter-date-to').value;
    const typeFilter = document.getElementById('filter-type').value;
    const categoryFilter = document.getElementById('filter-category').value;
    
    // 篩選交易
    let filteredTransactions = [...transactions];
    
    if (dateFrom) {
        filteredTransactions = filteredTransactions.filter(t => t.date >= dateFrom);
    }
    
    if (dateTo) {
        filteredTransactions = filteredTransactions.filter(t => t.date <= dateTo);
    }
    
    if (typeFilter && typeFilter !== 'all') {
        filteredTransactions = filteredTransactions.filter(t => t.type === typeFilter);
    }
    
    if (categoryFilter && categoryFilter !== 'all') {
        filteredTransactions = filteredTransactions.filter(t => t.categoryId === categoryFilter);
    }
    
    // 按日期降序排序
    filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (filteredTransactions.length === 0) {
        transactionsListContainer.innerHTML = '<div class="empty-state">無符合條件的交易記錄</div>';
        return;
    }
    
    // 創建表格
    transactionsListContainer.innerHTML = `
        <table class="transactions-table">
            <thead>
                <tr>
                    <th>日期</th>
                    <th>類型</th>
                    <th>戶口</th>
                    <th>類別</th>
                    <th>金額</th>
                    <th>備註</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody id="transactions-table-body"></tbody>
        </table>
    `;
    
    const tableBody = document.getElementById('transactions-table-body');
    
    filteredTransactions.forEach(transaction => {
        const account = accounts.find(a => a.id === transaction.accountId);
        const category = transaction.type === 'income' 
            ? categories.income.find(c => c.id === transaction.categoryId)
            : categories.expense.find(c => c.id === transaction.categoryId);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${transaction.date}</td>
            <td>${transaction.type === 'income' ? '收入' : '支出'}</td>
            <td>${account ? account.name : '未知戶口'}</td>
            <td>${category ? `${category.icon} ${category.name}` : '未知類別'}</td>
            <td class="${transaction.type === 'income' ? 'positive' : 'negative'}">
                ${transaction.type === 'income' ? '+' : '-'} ${formatCurrency(transaction.amount)}
            </td>
            <td>${transaction.notes}</td>
            <td>
                <span class="action-icon" onclick="editTransaction('${transaction.id}')">✏️</span>
                <span class="action-icon" onclick="deleteTransactionWithConfirm('${transaction.id}')">🗑️</span>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

function refreshCharts() {
    // 獲取當月數據
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0);
    
    const monthlyTransactions = transactions.filter(t => {
        const transDate = new Date(t.date);
        return transDate >= monthStart && transDate <= monthEnd;
    });
    
    // 每月收支統計圖
    refreshMonthlyChart(monthlyTransactions);
    
    // 收入分佈餅圖
    refreshIncomePieChart(monthlyTransactions);
    
    // 支出分佈餅圖
    refreshExpensePieChart(monthlyTransactions);
}

function refreshMonthlyChart(monthlyTransactions) {
    const ctx = document.getElementById('monthly-chart').getContext('2d');
    
    // 按日期分組
    const dailyData = {};
    
    monthlyTransactions.forEach(transaction => {
        if (!dailyData[transaction.date]) {
            dailyData[transaction.date] = { income: 0, expense: 0 };
        }
        
        if (transaction.type === 'income') {
            dailyData[transaction.date].income += transaction.amount;
        } else {
            dailyData[transaction.date].expense += transaction.amount;
        }
    });
    
    // 準備圖表數據
    const dates = Object.keys(dailyData).sort();
    const incomeData = dates.map(date => dailyData[date].income);
    const expenseData = dates.map(date => dailyData[date].expense);
    
    // 格式化日期標籤
    const labels = dates.map(date => {
        const parts = date.split('-');
        return `${parts[1]}/${parts[2]}`;
    });
    
    // 如果已經存在圖表實例，摧毀它
    if (window.monthlyChart) {
        window.monthlyChart.destroy();
    }
    
    // 創建新圖表
    window.monthlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '收入',
                data: incomeData,
                backgroundColor: 'rgba(40, 167, 69, 0.5)',
                borderColor: 'rgba(40, 167, 69, 1)',
                borderWidth: 1
            }, {
                label: '支出',
                data: expenseData,
                backgroundColor: 'rgba(220, 53, 69, 0.5)',
                borderColor: 'rgba(220, 53, 69, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function refreshIncomePieChart(monthlyTransactions) {
    const ctx = document.getElementById('income-pie-chart').getContext('2d');
    
    // 按類別分組
    const categoryData = {};
    
    monthlyTransactions.filter(t => t.type === 'income').forEach(transaction => {
        const category = categories.income.find(c => c.id === transaction.categoryId);
        const categoryName = category ? category.name : '未知類別';
        
        if (!categoryData[categoryName]) {
            categoryData[categoryName] = 0;
        }
        
        categoryData[categoryName] += transaction.amount;
    });
    
    // 準備圖表數據
    const categoryNames = Object.keys(categoryData);
    const amounts = categoryNames.map(name => categoryData[name]);
    
    // 生成顏色
    const backgroundColors = [
        'rgba(75, 192, 192, 0.5)',
        'rgba(54, 162, 235, 0.5)',
        'rgba(153, 102, 255, 0.5)',
        'rgba(255, 159, 64, 0.5)',
        'rgba(255, 99, 132, 0.5)',
        'rgba(255, 205, 86, 0.5)'
    ];
    
    // 如果已經存在圖表實例，摧毀它
    if (window.incomePieChart) {
        window.incomePieChart.destroy();
    }
    
    // 創建新圖表
    window.incomePieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: categoryNames,
            datasets: [{
                data: amounts,
                backgroundColor: backgroundColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function refreshExpensePieChart(monthlyTransactions) {
    const ctx = document.getElementById('expense-pie-chart').getContext('2d');
    
    // 按類別分組
    const categoryData = {};
    
    monthlyTransactions.filter(t => t.type === 'expense').forEach(transaction => {
        const category = categories.expense.find(c => c.id === transaction.categoryId);
        const categoryName = category ? category.name : '未知類別';
        
        if (!categoryData[categoryName]) {
            categoryData[categoryName] = 0;
        }
        
        categoryData[categoryName] += transaction.amount;
    });
    
    // 準備圖表數據
    const categoryNames = Object.keys(categoryData);
    const amounts = categoryNames.map(name => categoryData[name]);
    
    // 生成顏色
    const backgroundColors = [
        'rgba(255, 99, 132, 0.5)',
        'rgba(255, 159, 64, 0.5)',
        'rgba(255, 205, 86, 0.5)',
        'rgba(75, 192, 192, 0.5)',
        'rgba(54, 162, 235, 0.5)',
        'rgba(153, 102, 255, 0.5)'
    ];
    
    // 如果已經存在圖表實例，摧毀它
    if (window.expensePieChart) {
        window.expensePieChart.destroy();
    }
    
    // 創建新圖表
    window.expensePieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: categoryNames,
            datasets: [{
                data: amounts,
                backgroundColor: backgroundColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// 初始化函數和事件監聽器
document.addEventListener('DOMContentLoaded', function() {
    // 載入本地存儲的數據
    loadFromLocalStorage();
    
    // 檢查Firebase登入狀態
    if (window.firebaseAuth) {
        window.firebaseAuth.onAuthStateChanged((user) => {
            if (user) {
                // 用戶已登入
                currentUser = user;
                isLoggedIn = true;
                updateLoginStatus();
                loadUserData();
            } else {
                // 用戶未登入
                currentUser = null;
                isLoggedIn = false;
                updateLoginStatus();
            }
        });
    }
    
    // 刷新界面
    refreshUI();
    
    // 標籤切換事件
    document.querySelectorAll('.tabs > .tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
    
    // 子標籤切換事件
    document.querySelectorAll('.transaction-tabs > .tab').forEach(tab => {
        tab.addEventListener('click', function() {
            // 切換活動狀態
            document.querySelectorAll('.transaction-tabs > .tab').forEach(t => {
                t.classList.remove('active');
            });
            this.classList.add('active');
            
            // 更新交易類型
            const type = this.getAttribute('data-tab');
            document.getElementById('transaction-type').value = type;
            
            // 更新類別下拉選項
            refreshCategoryOptions();
        });
    });
    
    // 類別標籤切換事件
    document.querySelectorAll('.category-tabs > .tab').forEach(tab => {
        tab.addEventListener('click', function() {
            // 切換活動狀態
            document.querySelectorAll('.category-tabs > .tab').forEach(t => {
                t.classList.remove('active');
            });
            this.classList.add('active');
            
            // 切換類別內容
            const tabId = this.getAttribute('data-tab');
            document.querySelectorAll('.category-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // 添加戶口按鈕事件
    document.getElementById('add-account-btn').addEventListener('click', function() {
        showAddAccountModal();
    });
    
    // 添加類別按鈕事件
    document.getElementById('add-category-btn').addEventListener('click', function() {
        showAddCategoryModal();
    });
    
    // 轉賬表單提交事件
    document.getElementById('transfer-form').addEventListener('submit', function(e) {
        e.preventDefault();
        handleTransfer();
    });
    
    // 交易表單提交事件
    document.getElementById('transaction-form').addEventListener('submit', function(e) {
        e.preventDefault();
        handleAddTransaction();
    });
    
    // 主預算表單提交事件
    document.getElementById('main-budget-form').addEventListener('submit', function(e) {
        e.preventDefault();
        handleUpdateMainBudget();
    });
    
    // 添加類別預算按鈕事件
    document.getElementById('add-category-budget').addEventListener('click', function() {
        showAddCategoryBudgetModal();
    });
    
    // 篩選交易按鈕事件
    document.getElementById('filter-submit').addEventListener('click', function() {
        refreshTransactionsList();
    });
    
    // Firebase登入按鈕事件
    document.getElementById('firebase-login-btn').addEventListener('click', function() {
        loginWithGoogle();
    });
    
    // Firebase登出按鈕事件
    document.getElementById('firebase-logout-btn').addEventListener('click', function() {
        logoutFromFirebase();
    });
    
    // 手動同步按鈕事件
    document.getElementById('manual-sync').addEventListener('click', function() {
        saveToFirebase();
    });
    
    // 自動同步選項事件
    document.getElementById('auto-sync').addEventListener('change', function() {
        settings.autoSync = this.checked;
        saveToLocalStorage();
        
        if (this.checked && isLoggedIn) {
            const userRef = firebase.database().ref('users/' + currentUser.uid);
            setupRealtimeSync(userRef);
        }
    });
    
    // 匯出數據按鈕事件
    document.getElementById('export-data').addEventListener('click', function() {
        exportData();
    });
    
    // 下載數據按鈕事件
    document.getElementById('download-data').addEventListener('click', function() {
        downloadData();
    });
    
    // 匯入數據按鈕事件
    document.getElementById('import-data').addEventListener('click', function() {
        importData();
    });
    
    // 模態框關閉按鈕事件
    document.querySelector('.close').addEventListener('click', function() {
        closeModal();
    });
    
    // 當點擊模態框背景時關閉
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('modal');
        if (event.target === modal) {
            closeModal();
        }
    });
    
    // 初始化日期選擇器默認值
    document.getElementById('transaction-date').valueAsDate = new Date();
});

// 模態框函數
function showModal(content) {
    document.getElementById('modal-content').innerHTML = content;
    document.getElementById('modal').style.display = 'block';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

// 戶口相關模態框
function showAddAccountModal() {
    const content = `
        <h2>新增戶口</h2>
        <form id="add-account-form">
            <div class="form-group">
                <label for="account-name">戶口名稱</label>
                <input type="text" id="account-name" required>
            </div>
            <div class="form-group">
                <label for="account-balance">初始餘額</label>
                <div class="currency-input">
                    <input type="number" id="account-balance" min="0" step="0.01" value="0">
                </div>
            </div>
            <div class="form-group">
                <label for="account-currency">選擇貨幣</label>
                <select id="account-currency">
                    <option value="TWD" selected>新台幣 (TWD)</option>
                    <option value="USD">美元 (USD)</option>
                    <option value="EUR">歐元 (EUR)</option>
                    <option value="JPY">日元 (JPY)</option>
                    <option value="CNY">人民幣 (CNY)</option>
                    <option value="HKD">港幣 (HKD)</option>
                </select>
            </div>
            <div class="form-group">
                <label for="account-icon">選擇圖標</label>
                <select id="account-icon">
                    <option value="💰" selected>💰 錢袋</option>
                    <option value="💳">💳 信用卡</option>
                    <option value="🏦">🏦 銀行</option>
                    <option value="💵">💵 現金</option>
                    <option value="💹">💹 股票</option>
                    <option value="🏠">🏠 房產</option>
                </select>
            </div>
            <button type="submit" class="btn btn-primary">新增戶口</button>
        </form>
    `;
    
    showModal(content);
    
    document.getElementById('add-account-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const accountData = {
            name: document.getElementById('account-name').value,
            balance: parseFloat(document.getElementById('account-balance').value) || 0,
            currency: document.getElementById('account-currency').value,
            icon: document.getElementById('account-icon').value
        };
        
        addAccount(accountData);
        refreshUI();
        closeModal();
    });
}

function editAccount(accountId) {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;
    
    const content = `
        <h2>編輯戶口</h2>
        <form id="edit-account-form">
            <input type="hidden" id="account-id" value="${accountId}">
            <div class="form-group">
                <label for="account-name">戶口名稱</label>
                <input type="text" id="account-name" value="${account.name}" required>
            </div>
            <div class="form-group">
                <label for="account-balance">餘額</label>
                <div class="currency-input">
                    <input type="number" id="account-balance" min="0" step="0.01" value="${account.balance}">
                </div>
            </div>
            <div class="form-group">
                <label for="account-currency">貨幣</label>
                <select id="account-currency">
                    <option value="TWD" ${account.currency === 'TWD' ? 'selected' : ''}>新台幣 (TWD)</option>
                    <option value="USD" ${account.currency === 'USD' ? 'selected' : ''}>美元 (USD)</option>
                    <option value="EUR" ${account.currency === 'EUR' ? 'selected' : ''}>歐元 (EUR)</option>
                    <option value="JPY" ${account.currency === 'JPY' ? 'selected' : ''}>日元 (JPY)</option>
                    <option value="CNY" ${account.currency === 'CNY' ? 'selected' : ''}>人民幣 (CNY)</option>
                    <option value="HKD" ${account.currency === 'HKD' ? 'selected' : ''}>港幣 (HKD)</option>
                </select>
            </div>
            <div class="form-group">
                <label for="account-icon">圖標</label>
                <select id="account-icon">
                    <option value="💰" ${account.icon === '💰' ? 'selected' : ''}>💰 錢袋</option>
                    <option value="💳" ${account.icon === '💳' ? 'selected' : ''}>💳 信用卡</option>
                    <option value="🏦" ${account.icon === '🏦' ? 'selected' : ''}>🏦 銀行</option>
                    <option value="💵" ${account.icon === '💵' ? 'selected' : ''}>💵 現金</option>
                    <option value="💹" ${account.icon === '💹' ? 'selected' : ''}>💹 股票</option>
                    <option value="🏠" ${account.icon === '🏠' ? 'selected' : ''}>🏠 房產</option>
                </select>
            </div>
            <button type="submit" class="btn btn-primary">保存更改</button>
        </form>
    `;
    
    showModal(content);
    
    document.getElementById('edit-account-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const accountData = {
            name: document.getElementById('account-name').value,
            balance: parseFloat(document.getElementById('account-balance').value) || 0,
            currency: document.getElementById('account-currency').value,
            icon: document.getElementById('account-icon').value
        };
        
        updateAccount(accountId, accountData);
        refreshUI();
        closeModal();
    });
}

function deleteAccountWithConfirm(accountId) {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;
    
    const content = `
        <h2>刪除戶口</h2>
        <p>您確定要刪除戶口 "${account.name}" 嗎？這將刪除所有與此戶口相關的交易記錄。</p>
        <div class="modal-buttons">
            <button id="confirm-delete" class="btn btn-danger">刪除</button>
            <button id="cancel-delete" class="btn">取消</button>
        </div>
    `;
    
    showModal(content);
    
    document.getElementById('confirm-delete').addEventListener('click', function() {
        deleteAccount(accountId);
        refreshUI();
        closeModal();
    });
    
    document.getElementById('cancel-delete').addEventListener('click', function() {
        closeModal();
    });
}

// 類別相關模態框
function showAddCategoryModal() {
    const content = `
        <h2>新增類別</h2>
        <form id="add-category-form">
            <div class="form-group">
                <label for="category-name">類別名稱</label>
                <input type="text" id="category-name" required>
            </div>
            <div class="form-group">
                <label>類型</label>
                <div class="radio-group">
                    <div class="radio-item">
                        <input type="radio" id="type-income" name="category-type" value="income" checked>
                        <label for="type-income">💹 收入</label>
                    </div>
                    <div class="radio-item">
                        <input type="radio" id="type-expense" name="category-type" value="expense">
                        <label for="type-expense">💸 支出</label>
                    </div>
                </div>
            </div>
            <div class="form-group">
                <label for="category-icon">選擇圖標</label>
                <select id="category-icon">
                    <option value="💹">💹 收入</option>
                    <option value="💸">💸 支出</option>
                    <option value="🍔">🍔 食物</option>
                    <option value="🏠">🏠 住房</option>
                    <option value="🚗">🚗 交通</option>
                    <option value="👕">👕 服裝</option>
                    <option value="💊">💊 醫療</option>
                    <option value="📚">📚 教育</option>
                    <option value="🎮">🎮 娛樂</option>
                    <option value="💼">💼 工作</option>
                    <option value="🎁">🎁 禮物</option>
                    <option value="💰">💰 投資</option>
                </select>
            </div>
            <button type="submit" class="btn btn-primary">新增類別</button>
        </form>
    `;
    
    showModal(content);
    
    // 根據類型自動更新默認圖標
    document.querySelectorAll('input[name="category-type"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const iconSelect = document.getElementById('category-icon');
            if (this.value === 'income') {
                iconSelect.value = '💹';
            } else {
                iconSelect.value = '💸';
            }
        });
    });
    
    document.getElementById('add-category-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const categoryData = {
            name: document.getElementById('category-name').value,
            type: document.querySelector('input[name="category-type"]:checked').value,
            icon: document.getElementById('category-icon').value
        };
        
        addCategory(categoryData);
        refreshUI();
        closeModal();
    });
}

function editCategory(categoryId) {
    // 查找類別
    let category = categories.income.find(c => c.id === categoryId);
    let type = 'income';
    
    if (!category) {
        category = categories.expense.find(c => c.id === categoryId);
        type = 'expense';
    }
    
    if (!category) return;
    
    const content = `
        <h2>編輯類別</h2>
        <form id="edit-category-form">
            <input type="hidden" id="category-id" value="${categoryId}">
            <div class="form-group">
                <label for="category-name">類別名稱</label>
                <input type="text" id="category-name" value="${category.name}" required>
            </div>
            <div class="form-group">
                <label>類型</label>
                <div class="radio-group">
                    <div class="radio-item">
                        <input type="radio" id="type-income" name="category-type" value="income" ${type === 'income' ? 'checked' : ''}>
                        <label for="type-income">💹 收入</label>
                    </div>
                    <div class="radio-item">
                        <input type="radio" id="type-expense" name="category-type" value="expense" ${type === 'expense' ? 'checked' : ''}>
                        <label for="type-expense">💸 支出</label>
                    </div>
                </div>
            </div>
            <div class="form-group">
                <label for="category-icon">圖標</label>
                <select id="category-icon">
                    <option value="💹" ${category.icon === '💹' ? 'selected' : ''}>💹 收入</option>
                    <option value="💸" ${category.icon === '💸' ? 'selected' : ''}>💸 支出</option>
                    <option value="🍔" ${category.icon === '🍔' ? 'selected' : ''}>🍔 食物</option>
                    <option value="🏠" ${category.icon === '🏠' ? 'selected' : ''}>🏠 住房</option>
                    <option value="🚗" ${category.icon === '🚗' ? 'selected' : ''}>🚗 交通</option>
                    <option value="👕" ${category.icon === '👕' ? 'selected' : ''}>👕 服裝</option>
                    <option value="💊" ${category.icon === '💊' ? 'selected' : ''}>💊 醫療</option>
                    <option value="📚" ${category.icon === '📚' ? 'selected' : ''}>📚 教育</option>
                    <option value="🎮" ${category.icon === '🎮' ? 'selected' : ''}>🎮 娛樂</option>
                    <option value="💼" ${category.icon === '💼' ? 'selected' : ''}>💼 工作</option>
                    <option value="🎁" ${category.icon === '🎁' ? 'selected' : ''}>🎁 禮物</option>
                    <option value="💰" ${category.icon === '💰' ? 'selected' : ''}>💰 投資</option>
                </select>
            </div>
            <button type="submit" class="btn btn-primary">保存更改</button>
        </form>
    `;
    
    showModal(content);
    
    document.getElementById('edit-category-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const newData = {
            name: document.getElementById('category-name').value,
            type: document.querySelector('input[name="category-type"]:checked').value,
            icon: document.getElementById('category-icon').value
        };
        
        // 如果類型發生變化，需要從一個列表移到另一個列表
        const newType = newData.type;
        if (newType !== type) {
            // 從原類型列表刪除
            if (type === 'income') {
                const index = categories.income.findIndex(c => c.id === categoryId);
                if (index !== -1) {
                    categories.income.splice(index, 1);
                }
            } else {
                const index = categories.expense.findIndex(c => c.id === categoryId);
                if (index !== -1) {
                    categories.expense.splice(index, 1);
                }
            }
            
            // 添加到新類型列表
            const newCategory = {
                id: categoryId,
                name: newData.name,
                type: newType,
                icon: newData.icon
            };
            
            if (newType === 'income') {
                categories.income.push(newCategory);
            } else {
                categories.expense.push(newCategory);
            }
        } else {
            // 類型未變，直接更新
            updateCategory(categoryId, newData);
        }
        
        saveToLocalStorage();
        
        if (settings.autoSync && isLoggedIn) {
            saveToFirebase();
        }
        
        refreshUI();
        closeModal();
    });
}

function deleteCategoryWithConfirm(categoryId) {
    // 查找類別
    let category = categories.income.find(c => c.id === categoryId);
    let type = 'income';
    
    if (!category) {
        category = categories.expense.find(c => c.id === categoryId);
        type = 'expense';
    }
    
    if (!category) return;
    
    const content = `
        <h2>刪除類別</h2>
        <p>您確定要刪除類別 "${category.name}" 嗎？這將影響所有使用此類別的交易記錄。</p>
        <div class="modal-buttons">
            <button id="confirm-delete" class="btn btn-danger">刪除</button>
            <button id="cancel-delete" class="btn">取消</button>
        </div>
    `;
    
    showModal(content);
    
    document.getElementById('confirm-delete').addEventListener('click', function() {
        deleteCategory(categoryId);
        refreshUI();
        closeModal();
    });
    
    document.getElementById('cancel-delete').addEventListener('click', function() {
        closeModal();
    });
}

// 交易相關函數
function handleAddTransaction() {
    const transactionData = {
        type: document.getElementById('transaction-type').value,
        accountId: document.getElementById('transaction-account').value,
        categoryId: document.getElementById('transaction-category').value,
        amount: parseFloat(document.getElementById('transaction-amount').value) || 0,
        date: document.getElementById('transaction-date').value,
        notes: document.getElementById('transaction-notes').value
    };
    
    addTransaction(transactionData);
    refreshUI();
    
    // 清空表單
    document.getElementById('transaction-amount').value = '';
    document.getElementById('transaction-notes').value = '';
    document.getElementById('transaction-date').valueAsDate = new Date();
}

function editTransaction(transactionId) {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;
    
    const content = `
        <h2>編輯交易</h2>
        <form id="edit-transaction-form">
            <input type="hidden" id="transaction-id" value="${transactionId}">
            <div class="form-group">
                <label>類型</label>
                <div class="radio-group">
                    <div class="radio-item">
                        <input type="radio" id="edit-type-income" name="edit-transaction-type" value="income" ${transaction.type === 'income' ? 'checked' : ''}>
                        <label for="edit-type-income">💹 收入</label>
                    </div>
                    <div class="radio-item">
                        <input type="radio" id="edit-type-expense" name="edit-transaction-type" value="expense" ${transaction.type === 'expense' ? 'checked' : ''}>
                        <label for="edit-type-expense">💸 支出</label>
                    </div>
                </div>
            </div>
            <div class="form-group">
                <label for="edit-transaction-account">戶口</label>
                <select id="edit-transaction-account" required>
                    <option value="">選擇戶口</option>
                    ${accounts.map(account => `
                        <option value="${account.id}" ${transaction.accountId === account.id ? 'selected' : ''}>
                            ${account.name} (${formatCurrency(account.balance, account.currency)})
                        </option>
                    `).join('')}
                </select>
            </div>
            <div class="form-group">
                <label for="edit-transaction-category">類別</label>
                <select id="edit-transaction-category" required>
                    <option value="">選擇類別</option>
                    ${(transaction.type === 'income' ? categories.income : categories.expense).map(category => `
                        <option value="${category.id}" ${transaction.categoryId === category.id ? 'selected' : ''}>
                            ${category.icon} ${category.name}
                        </option>
                    `).join('')}
                </select>
            </div>
            <div class="form-group">
                <label for="edit-transaction-amount">金額</label>
                <div class="currency-input">
                    <input type="number" id="edit-transaction-amount" min="0" step="0.01" value="${transaction.amount}" required>
                </div>
            </div>
            <div class="form-group">
                <label for="edit-transaction-date">日期</label>
                <input type="date" id="edit-transaction-date" value="${transaction.date}" required>
            </div>
            <div class="form-group">
                <label for="edit-transaction-notes">備註 (可選)</label>
                <textarea id="edit-transaction-notes">${transaction.notes}</textarea>
            </div>
            <button type="submit" class="btn btn-primary">保存更改</button>
        </form>
    `;
    
    showModal(content);
    
    // 類型變化時更新類別選項
    document.querySelectorAll('input[name="edit-transaction-type"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const categorySelect = document.getElementById('edit-transaction-category');
            const type = this.value;
            
            // 清空選項
            categorySelect.innerHTML = '<option value="">選擇類別</option>';
            
            // 添加類別選項
            const categoryList = type === 'income' ? categories.income : categories.expense;
            
            categoryList.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = `${category.icon} ${category.name}`;
                categorySelect.appendChild(option);
            });
        });
    });
    
    document.getElementById('edit-transaction-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const newData = {
            type: document.querySelector('input[name="edit-transaction-type"]:checked').value,
            accountId: document.getElementById('edit-transaction-account').value,
            categoryId: document.getElementById('edit-transaction-category').value,
            amount: parseFloat(document.getElementById('edit-transaction-amount').value) || 0,
            date: document.getElementById('edit-transaction-date').value,
            notes: document.getElementById('edit-transaction-notes').value
        };
        
        updateTransaction(transactionId, newData);
        refreshUI();
        closeModal();
    });
}

function deleteTransactionWithConfirm(transactionId) {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;
    
    const account = accounts.find(a => a.id === transaction.accountId);
    const category = transaction.type === 'income' 
        ? categories.income.find(c => c.id === transaction.categoryId)
        : categories.expense.find(c => c.id === transaction.categoryId);
    
    const content = `
        <h2>刪除交易</h2>
        <p>您確定要刪除此交易記錄嗎？</p>
        <div class="transaction-details-preview">
            <div><strong>日期:</strong> ${transaction.date}</div>
            <div><strong>類型:</strong> ${transaction.type === 'income' ? '收入' : '支出'}</div>
            <div><strong>戶口:</strong> ${account ? account.name : '未知戶口'}</div>
            <div><strong>類別:</strong> ${category ? category.name : '未知類別'}</div>
            <div><strong>金額:</strong> ${formatCurrency(transaction.amount)}</div>
            <div><strong>備註:</strong> ${transaction.notes}</div>
        </div>
        <div class="modal-buttons">
            <button id="confirm-delete" class="btn btn-danger">刪除</button>
            <button id="cancel-delete" class="btn">取消</button>
        </div>
    `;
    
    showModal(content);
    
    document.getElementById('confirm-delete').addEventListener('click', function() {
        deleteTransaction(transactionId);
        refreshUI();
        closeModal();
    });
    
    document.getElementById('cancel-delete').addEventListener('click', function() {
        closeModal();
    });
}

// 轉賬相關函數
function handleTransfer() {
    const fromAccountId = document.getElementById('from-account').value;
    const toAccountId = document.getElementById('to-account').value;
    const amount = parseFloat(document.getElementById('transfer-amount').value) || 0;
    
    if (fromAccountId === toAccountId) {
        alert('請選擇不同的戶口進行轉賬');
        return;
    }
    
    if (amount <= 0) {
        alert('請輸入有效的轉賬金額');
        return;
    }
    
    const fromAccount = accounts.find(a => a.id === fromAccountId);
    if (fromAccount.balance < amount) {
        alert('餘額不足，無法完成轉賬');
        return;
    }
    
    // 從源戶口扣除金額
    updateAccountBalance(fromAccountId, 'expense', amount);
    
    // 向目標戶口添加金額
    updateAccountBalance(toAccountId, 'income', amount);
    
    // 創建兩筆交易記錄
    const transferCategory = findOrCreateTransferCategory();
    
    // 支出交易
    addTransaction({
        type: 'expense',
        accountId: fromAccountId,
        categoryId: transferCategory.id,
        amount: amount,
        date: new Date().toISOString().split('T')[0],
        notes: `轉賬至 ${accounts.find(a => a.id === toAccountId).name}`
    });
    
    // 收入交易
    addTransaction({
        type: 'income',
        accountId: toAccountId,
        categoryId: transferCategory.id,
        amount: amount,
        date: new Date().toISOString().split('T')[0],
        notes: `來自 ${accounts.find(a => a.id === fromAccountId).name} 的轉賬`
    });
    
    // 清空表單
    document.getElementById('transfer-amount').value = '';
    
    // 刷新界面
    refreshUI();
}

function findOrCreateTransferCategory() {
    // 查找或創建轉賬類別
    let transferCategory = categories.expense.find(c => c.name === '轉賬');
    
    if (!transferCategory) {
        transferCategory = addCategory({
            name: '轉賬',
            type: 'expense',
            icon: '🔄'
        });
    }
    
    // 確保也有對應的收入類別
    let incomeTransferCategory = categories.income.find(c => c.name === '轉賬');
    
    if (!incomeTransferCategory) {
        incomeTransferCategory = addCategory({
            name: '轉賬',
            type: 'income',
            icon: '🔄'
        });
    }
    
    return transferCategory;
}

// 預算相關函數
function handleUpdateMainBudget() {
    const budgetAmount = parseFloat(document.getElementById('budget-amount').value) || 0;
    const autoCalculate = document.getElementById('auto-calculate').checked;
    const cycle = document.querySelector('input[name="budget-cycle"]:checked').value;
    
    updateBudget({
        amount: budgetAmount,
        cycle: cycle,
        autoCalculate: autoCalculate
    });
    
    refreshUI();
}

function showAddCategoryBudgetModal() {
    const categoryId = document.getElementById('budget-category').value;
    if (!categoryId) {
        alert('請選擇類別');
        return;
    }
    
    // 查找類別
    const category = categories.expense.find(c => c.id === categoryId);
    if (!category) return;
    
    // 查找現有預算
    const existingBudget = budgets.categories.find(b => b.categoryId === categoryId);
    
    const content = `
        <h2>設置類別預算</h2>
        <form id="category-budget-form">
            <input type="hidden" id="budget-category-id" value="${categoryId}">
            <div class="category-info">
                <div class="category-icon">${category.icon}</div>
                <div class="category-name">${category.name}</div>
            </div>
            <div class="form-group">
                <label for="category-budget-amount">預算金額</label>
                <div class="currency-input">
                    <input type="number" id="category-budget-amount" min="0" step="0.01" value="${existingBudget ? existingBudget.amount : '0'}" required>
                </div>
            </div>
            <button type="submit" class="btn btn-primary">保存</button>
        </form>
    `;
    
    showModal(content);
    
    document.getElementById('category-budget-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const amount = parseFloat(document.getElementById('category-budget-amount').value) || 0;
        
        addCategoryBudget(categoryId, amount);
        refreshUI();
        closeModal();
    });
}

// 數據導入/導出函數
function exportData() {
    const data = {
        accounts: accounts,
        transactions: transactions,
        categories: categories,
        budgets: budgets,
        settings: settings,
        exportDate: new Date().toISOString(),
        version: '1.0'
    };
    
    const jsonData = JSON.stringify(data);
    
    // 創建一個臨時的textarea來複製數據
    const textArea = document.createElement('textarea');
    textArea.value = jsonData;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    
    alert('數據已複製到剪貼板');
}

function downloadData() {
    const data = {
        accounts: accounts,
        transactions: transactions,
        categories: categories,
        budgets: budgets,
        settings: settings,
        exportDate: new Date().toISOString(),
        version: '1.0'
    };
    
    const jsonData = JSON.stringify(data);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `財務追蹤器數據_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 0);
}

function importData() {
    const importFile = document.getElementById('import-file');
    const importText = document.getElementById('import-text');
    
    let jsonData;
    
    if (importFile.files.length > 0) {
        // 從文件導入
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                jsonData = JSON.parse(e.target.result);
                processImportedData(jsonData);
            } catch (error) {
                alert('無法解析導入的文件: ' + error.message);
            }
        };
        reader.readAsText(importFile.files[0]);
    } else if (importText.value.trim()) {
        // 從文本導入
        try {
            jsonData = JSON.parse(importText.value);
            processImportedData(jsonData);
        } catch (error) {
            alert('無法解析導入的數據: ' + error.message);
        }
    } else {
        alert('請選擇文件或輸入數據');
    }
}

function processImportedData(data) {
    // 檢查數據有效性
    if (!data.accounts || !data.transactions || !data.categories || !data.budgets || !data.settings) {
        alert('導入的數據格式無效');
        return;
    }
    
    // 確認導入
    if (confirm('將用導入的數據替換現有數據，確定繼續？')) {
        accounts = data.accounts;
        transactions = data.transactions;
        categories = data.categories;
        budgets = data.budgets;
        settings = data.settings;
        
        saveToLocalStorage();
        
        if (settings.autoSync && isLoggedIn) {
            saveToFirebase();
        }
        
        refreshUI();
        
        alert('數據導入成功');
    }
}

// 將關鍵函數暴露到全局，以便在HTML中調用
window.loginWithGoogle = loginWithGoogle;
window.logoutFromFirebase = logoutFromFirebase;
window.editAccount = editAccount;
window.deleteAccountWithConfirm = deleteAccountWithConfirm;
window.editCategory = editCategory;
window.deleteCategoryWithConfirm = deleteCategoryWithConfirm;
window.editTransaction = editTransaction;
window.deleteTransactionWithConfirm = deleteTransactionWithConfirm;
