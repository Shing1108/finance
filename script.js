// Firebase 配置
const firebaseConfig = {
    apiKey: "AIzaSyAaqadmDSgQ-huvY7uNNrPtjFSOl93jVEE",
    authDomain: "finance-d8f9e.firebaseapp.com",
    projectId: "finance-d8f9e",
    storageBucket: "finance-d8f9e.firebasestorage.app",
    messagingSenderId: "122645255279",
    appId: "1:122645255279:web:25d577b6365c819ffbe99a",
    measurementId: "G-ZCGNG1DRJS"
};

// 初始化 Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM 元素
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const accountModal = document.getElementById('accountModal');
const confirmModal = document.getElementById('confirmModal');
const closeBtns = document.querySelectorAll('.close');
const darkModeToggle = document.getElementById('darkModeToggle');
const fontSizeSelector = document.getElementById('fontSizeSelector');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
const loginStatus = document.getElementById('loginStatus');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');

// 應用狀態
let appState = {
    darkMode: false,
    fontSize: 'medium',
    currency: 'HKD',
    decimalPlaces: 2,
    notifications: true,
    notificationThreshold: 80,
    accounts: [],
    categories: {
        income: [],
        expense: []
    },
    transactions: [],
    budgets: {
        general: 0,
        autoCalculate: true,
        cycle: 'monthly',
        categories: []
    },
    user: null
};

// 頁面初始化
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    loadUserSettings();
});

// 初始化應用程序
function initializeApp() {
    // 檢查認證狀態
    auth.onAuthStateChanged(user => {
        if (user) {
            appState.user = user;
            loginStatus.textContent = user.displayName || user.email;
            googleLoginBtn.style.display = 'none';
            logoutBtn.style.display = 'inline-block';
            document.getElementById('syncNowBtn').disabled = false;
            document.getElementById('autoSync').disabled = false;
            loadUserData();
        } else {
            appState.user = null;
            loginStatus.textContent = '未登入';
            googleLoginBtn.style.display = 'inline-block';
            logoutBtn.style.display = 'none';
            document.getElementById('syncNowBtn').disabled = true;
            document.getElementById('autoSync').disabled = true;
        }
    });
    
    // 初始化當前日期
    const today = new Date();
    document.getElementById('incomeDate').value = formatDate(today);
    document.getElementById('expenseDate').value = formatDate(today);
    
    // 設置默認頁面
    showPage('dashboard');
}

// 設置事件監聽器
function setupEventListeners() {
    // 側邊欄導航
    document.querySelectorAll('.sidebar a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = e.currentTarget.getAttribute('href').substring(1);
            showPage(target);
        });
    });
    
    // 設定按鈕點擊
    settingsBtn.addEventListener('click', () => {
        // 在打開設定模態窗口前，先更新UI元素反映當前設定
        darkModeToggle.checked = appState.darkMode;
        fontSizeSelector.value = appState.fontSize;
        document.getElementById('currencySelector').value = appState.currency;
        document.getElementById('decimalPlaces').value = appState.decimalPlaces;
        document.getElementById('enableNotifications').checked = appState.notifications;
        document.getElementById('notificationThreshold').value = appState.notificationThreshold;
        
        settingsModal.style.display = 'block';
    });
    
    // 關閉按鈕
    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            settingsModal.style.display = 'none';
            accountModal.style.display = 'none';
        });
    });
    
    // 點擊模態窗口外部關閉
    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
        if (e.target === accountModal) {
            accountModal.style.display = 'none';
        }
        if (e.target === confirmModal) {
            confirmModal.style.display = 'none';
        }
    });
    
    // 保存設定
    saveSettingsBtn.addEventListener('click', () => {
        // 獲取設定值
        appState.darkMode = darkModeToggle.checked;
        appState.fontSize = fontSizeSelector.value;
        appState.currency = document.getElementById('currencySelector').value;
        appState.decimalPlaces = document.getElementById('decimalPlaces').value;
        appState.notifications = document.getElementById('enableNotifications').checked;
        appState.notificationThreshold = document.getElementById('notificationThreshold').value;
        
        // 應用設定
        applySettings();
        
        // 保存設定到本地存儲
        saveSettings();
        
        // 關閉模態窗口
        settingsModal.style.display = 'none';
    });
    
    // 取消設定
    cancelSettingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });
    
    // 清除數據按鈕
    document.getElementById('clearDataBtn').addEventListener('click', () => {
        showConfirmDialog('確定要清除所有數據嗎？此操作不可恢復！', () => {
            clearAllData();
            settingsModal.style.display = 'none';
        });
    });
    
    // 新增戶口按鈕
    document.getElementById('addAccountBtn').addEventListener('click', () => {
        document.getElementById('accountModalTitle').textContent = '新增戶口';
        document.getElementById('accountForm').reset();
        accountModal.style.display = 'block';
    });
    
    // 保存戶口表單
    document.getElementById('accountForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveAccount();
    });
    
    // 取消戶口按鈕
    document.getElementById('cancelAccountBtn').addEventListener('click', () => {
        accountModal.style.display = 'none';
    });
    
    // 標籤切換
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget.getAttribute('data-tab');
            activateTab(e.currentTarget.parentElement, target);
        });
    });
    
    // 收入表單提交
    document.getElementById('incomeForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveTransaction('income');
    });
    
    // 支出表單提交
    document.getElementById('expenseForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveTransaction('expense');
    });
    
    // 轉賬表單提交
    document.getElementById('transferForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveTransfer();
    });
    
    // 預算表單提交
    document.getElementById('generalBudgetForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveGeneralBudget();
    });
    
    // 添加類別預算
    document.getElementById('addCategoryBudgetBtn').addEventListener('click', () => {
        addCategoryBudget();
    });
    
    // 登入按鈕
    googleLoginBtn.addEventListener('click', loginWithGoogle);
    
    // 登出按鈕
    logoutBtn.addEventListener('click', logout);
    
    // 數據同步按鈕
    document.getElementById('syncNowBtn').addEventListener('click', syncData);
    
    // 數據導出按鈕
    document.getElementById('exportDataBtn').addEventListener('click', exportData);
    
    // 數據導入按鈕
    document.getElementById('importDataBtn').addEventListener('click', importData);
}

// 顯示確認對話框
function showConfirmDialog(message, yesCallback) {
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmYesBtn').onclick = () => {
        yesCallback();
        confirmModal.style.display = 'none';
    };
    document.getElementById('confirmNoBtn').onclick = () => {
        confirmModal.style.display = 'none';
    };
    confirmModal.style.display = 'block';
}

// 顯示頁面
function showPage(pageId) {
    // 隱藏所有頁面
    document.querySelectorAll('section.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // 顯示選定頁面
    const page = document.getElementById(pageId);
    if (page) {
        page.classList.add('active');
    }
    
    // 更新側邊欄選中狀態
    document.querySelectorAll('.sidebar li').forEach(item => {
        item.classList.remove('active');
    });
    
    const sidebarItem = document.querySelector(`.sidebar a[href="#${pageId}"]`);
    if (sidebarItem) {
        sidebarItem.parentElement.classList.add('active');
    }
}

// 激活標籤
function activateTab(tabsContainer, tabId) {
    // 取消激活所有標籤按鈕
    tabsContainer.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 激活選定標籤按鈕
    const btn = tabsContainer.querySelector(`[data-tab="${tabId}"]`);
    if (btn) {
        btn.classList.add('active');
    }
    
    // 隱藏所有標籤內容
    const tabsPanel = tabsContainer.nextElementSibling;
    tabsPanel.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    
    // 顯示選定標籤內容
    const pane = tabsPanel.querySelector(`#${tabId}`);
    if (pane) {
        pane.classList.add('active');
    }
}

// 載入用戶設定
function loadUserSettings() {
    try {
        const savedSettings = localStorage.getItem('financeTrackerSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            appState = { ...appState, ...settings };
            applySettings();
        }
    } catch (error) {
        console.error('載入設定時發生錯誤:', error);
    }
}

// 應用設定
function applySettings() {
    // 套用深色模式
    if (appState.darkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    
    // 套用字體大小
    document.body.classList.remove('font-small', 'font-medium', 'font-large');
    document.body.classList.add(`font-${appState.fontSize}`);
}

// 保存設定
function saveSettings() {
    try {
        const settingsToSave = {
            darkMode: appState.darkMode,
            fontSize: appState.fontSize,
            currency: appState.currency,
            decimalPlaces: appState.decimalPlaces,
            notifications: appState.notifications,
            notificationThreshold: appState.notificationThreshold
        };
        localStorage.setItem('financeTrackerSettings', JSON.stringify(settingsToSave));
    } catch (error) {
        console.error('保存設定時發生錯誤:', error);
        showToast('設定保存失敗，請重試');
    }
}

// 使用Google帳戶登入
function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => {
            // 登入成功
            appState.user = result.user;
            showToast('登入成功！');
            loadUserData();
        })
        .catch((error) => {
            console.error('登入錯誤:', error);
            showToast('登入失敗，請重試');
        });
}

// 登出
function logout() {
    auth.signOut()
        .then(() => {
            appState.user = null;
            showToast('已登出');
        })
        .catch((error) => {
            console.error('登出錯誤:', error);
            showToast('登出失敗，請重試');
        });
}

// 從Firebase加載用戶數據
function loadUserData() {
    if (!appState.user) return;
    
    const userId = appState.user.uid;
    
    // 顯示加載指示器
    showToast('正在加載數據...');
    
    // 載入戶口
    db.collection('users').doc(userId).collection('accounts').get()
        .then((snapshot) => {
            appState.accounts = [];
            snapshot.forEach((doc) => {
                appState.accounts.push({ id: doc.id, ...doc.data() });
            });
            updateAccountsUI();
        })
        .catch((error) => {
            console.error('載入戶口錯誤:', error);
        });
    
    // 載入類別
    db.collection('users').doc(userId).collection('categories').get()
        .then((snapshot) => {
            appState.categories = { income: [], expense: [] };
            snapshot.forEach((doc) => {
                const category = doc.data();
                if (category.type === 'income') {
                    appState.categories.income.push({ id: doc.id, ...category });
                } else {
                    appState.categories.expense.push({ id: doc.id, ...category });
                }
            });
            updateCategoriesUI();
        })
        .catch((error) => {
            console.error('載入類別錯誤:', error);
        });
    
    // 載入交易
    db.collection('users').doc(userId).collection('transactions').get()
        .then((snapshot) => {
            appState.transactions = [];
            snapshot.forEach((doc) => {
                appState.transactions.push({ id: doc.id, ...doc.data() });
            });
            updateTransactionsUI();
        })
        .catch((error) => {
            console.error('載入交易錯誤:', error);
        });
    
    // 載入預算
    db.collection('users').doc(userId).collection('budgets').doc('general').get()
        .then((doc) => {
            if (doc.exists) {
                appState.budgets.general = doc.data().amount || 0;
                appState.budgets.autoCalculate = doc.data().autoCalculate || true;
                appState.budgets.cycle = doc.data().cycle || 'monthly';
            }
            updateBudgetUI();
        })
        .catch((error) => {
            console.error('載入預算錯誤:', error);
        });
    
    // 載入類別預算
    db.collection('users').doc(userId).collection('budgets').doc('categories').get()
        .then((doc) => {
            if (doc.exists) {
                appState.budgets.categories = doc.data().items || [];
            }
            updateCategoryBudgetsUI();
        })
        .catch((error) => {
            console.error('載入類別預算錯誤:', error);
        });
    
    // 更新同步時間
    document.getElementById('lastSyncTime').textContent = formatDateTime(new Date());
    
    // 隱藏加載指示器
    setTimeout(() => showToast('數據載入完成'), 1000);
}

// 同步數據到Firebase
function syncData() {
    if (!appState.user) {
        showToast('請先登入');
        return;
    }
    
    const userId = appState.user.uid;
    
    // 顯示同步指示器
    showToast('正在同步數據...');
    
    // 同步戶口
    appState.accounts.forEach(account => {
        const accountData = { ...account };
        delete accountData.id; // 不保存ID到Firebase
        
        if (account.id) {
            // 更新現有戶口
            db.collection('users').doc(userId).collection('accounts').doc(account.id).set(accountData);
        } else {
            // 新增戶口
            db.collection('users').doc(userId).collection('accounts').add(accountData)
                .then((docRef) => {
                    account.id = docRef.id;
                });
        }
    });
    
    // 同步類別
    [...appState.categories.income, ...appState.categories.expense].forEach(category => {
        const categoryData = { ...category };
        delete categoryData.id;
        
        if (category.id) {
            // 更新現有類別
            db.collection('users').doc(userId).collection('categories').doc(category.id).set(categoryData);
        } else {
            // 新增類別
            db.collection('users').doc(userId).collection('categories').add(categoryData)
                .then((docRef) => {
                    category.id = docRef.id;
                });
        }
    });
    
    // 同步交易
    appState.transactions.forEach(transaction => {
        const transactionData = { ...transaction };
        delete transactionData.id;
        
        if (transaction.id) {
            // 更新現有交易
            db.collection('users').doc(userId).collection('transactions').doc(transaction.id).set(transactionData);
        } else {
            // 新增交易
            db.collection('users').doc(userId).collection('transactions').add(transactionData)
                .then((docRef) => {
                    transaction.id = docRef.id;
                });
        }
    });
    
    // 同步預算
    db.collection('users').doc(userId).collection('budgets').doc('general').set({
        amount: appState.budgets.general,
        autoCalculate: appState.budgets.autoCalculate,
        cycle: appState.budgets.cycle
    });
    
    // 同步類別預算
    db.collection('users').doc(userId).collection('budgets').doc('categories').set({
        items: appState.budgets.categories
    });
    
    // 更新同步時間
    const now = new Date();
    document.getElementById('lastSyncTime').textContent = formatDateTime(now);
    
    // 保存同步時間到本地存儲
    const settings = JSON.parse(localStorage.getItem('financeTrackerSettings') || '{}');
    settings.lastSyncTime = now.toISOString();
    localStorage.setItem('financeTrackerSettings', JSON.stringify(settings));
    
    // 隱藏同步指示器
    setTimeout(() => showToast('數據同步完成'), 1000);
}

// 保存戶口
function saveAccount() {
    const accountName = document.getElementById('accountName').value;
    const accountType = document.getElementById('accountType').value;
    const initialBalance = parseFloat(document.getElementById('initialBalance').value) || 0;
    const accountCurrency = document.getElementById('accountCurrency').value;
    const accountNotes = document.getElementById('accountNotes').value;
    
    const account = {
        name: accountName,
        type: accountType,
        balance: initialBalance,
        currency: accountCurrency,
        notes: accountNotes,
        createdAt: new Date().toISOString()
    };
    
    // 檢查是否為編輯模式
    const editAccountId = document.getElementById('accountForm').getAttribute('data-edit-id');
    
    if (editAccountId) {
        // 更新現有戶口
        const index = appState.accounts.findIndex(a => a.id === editAccountId);
        if (index !== -1) {
            account.id = editAccountId;
            appState.accounts[index] = account;
        }
    } else {
        // 添加新戶口
        appState.accounts.push(account);
    }
    
    // 更新UI
    updateAccountsUI();
    
    // 如果用戶已登入，則同步到Firebase
    if (appState.user && document.getElementById('autoSync').checked) {
        syncData();
    }
    
    // 關閉模態窗口
    accountModal.style.display = 'none';
    
    // 顯示成功消息
    showToast(editAccountId ? '戶口已更新' : '戶口已創建');
}

// 保存交易
function saveTransaction(type) {
    const form = document.getElementById(`${type}Form`);
    const accountId = document.getElementById(`${type}Account`).value;
    const categoryId = document.getElementById(`${type}Category`).value;
    const amount = parseFloat(document.getElementById(`${type}Amount`).value) || 0;
    const date = document.getElementById(`${type}Date`).value;
    const notes = document.getElementById(`${type}Notes`).value;
    
    // 驗證數據
    if (!accountId) {
        showToast('請選擇戶口');
        return;
    }
    
    if (!categoryId) {
        showToast('請選擇類別');
        return;
    }
    
    if (amount <= 0) {
        showToast('金額必須大於零');
        return;
    }
    
    // 創建交易對象
    const transaction = {
        type: type,
        accountId: accountId,
        categoryId: categoryId,
        amount: amount,
        date: date,
        notes: notes,
        createdAt: new Date().toISOString()
    };
    
    // 檢查是否為編輯模式
    const editTransactionId = form.getAttribute('data-edit-id');
    
    if (editTransactionId) {
        // 更新現有交易
        const index = appState.transactions.findIndex(t => t.id === editTransactionId);
        if (index !== -1) {
            // 更新戶口餘額
            const oldTransaction = appState.transactions[index];
            updateAccountBalance(oldTransaction.accountId, oldTransaction.type === 'income' ? -oldTransaction.amount : oldTransaction.amount);
            
            transaction.id = editTransactionId;
            appState.transactions[index] = transaction;
        }
    } else {
        // 添加新交易
        appState.transactions.push(transaction);
    }
    
    // 更新戶口餘額
    updateAccountBalance(accountId, type === 'income' ? amount : -amount);
    
    // 更新UI
    updateTransactionsUI();
    updateAccountsUI();
    
    // 如果用戶已登入，則同步到Firebase
    if (appState.user && document.getElementById('autoSync').checked) {
        syncData();
    }
    
    // 重置表單
    form.reset();
    
    // 設置日期為今天
    document.getElementById(`${type}Date`).value = formatDate(new Date());
    
    // 顯示成功消息
    showToast(editTransactionId ? '交易已更新' : '交易已記錄');
}

// 保存轉賬
function saveTransfer() {
    const fromAccountId = document.getElementById('fromAccount').value;
    const toAccountId = document.getElementById('toAccount').value;
    const transferAmount = parseFloat(document.getElementById('transferAmount').value) || 0;
    
    // 驗證數據
    if (!fromAccountId) {
        showToast('請選擇轉出戶口');
        return;
    }
    
    if (!toAccountId) {
        showToast('請選擇轉入戶口');
        return;
    }
    
    if (fromAccountId === toAccountId) {
        showToast('轉出和轉入戶口不能相同');
        return;
    }
    
    if (transferAmount <= 0) {
        showToast('轉賬金額必須大於零');
        return;
    }
    
    // 更新戶口餘額
    updateAccountBalance(fromAccountId, -transferAmount);
    updateAccountBalance(toAccountId, transferAmount);
    
    // 創建轉賬交易記錄
    const now = new Date().toISOString();
    const transferDate = formatDate(new Date());
    
    // 轉出交易
    const outTransaction = {
        type: 'transfer_out',
        accountId: fromAccountId,
        linkedAccountId: toAccountId,
        amount: transferAmount,
        date: transferDate,
        notes: `轉賬至 ${getAccountNameById(toAccountId)}`,
        createdAt: now
    };
    
    // 轉入交易
    const inTransaction = {
        type: 'transfer_in',
        accountId: toAccountId,
        linkedAccountId: fromAccountId,
        amount: transferAmount,
        date: transferDate,
        notes: `來自 ${getAccountNameById(fromAccountId)} 的轉賬`,
        createdAt: now
    };
    
    // 添加交易
    appState.transactions.push(outTransaction);
    appState.transactions.push(inTransaction);
    
    // 更新UI
    updateTransactionsUI();
    updateAccountsUI();
    
    // 如果用戶已登入，則同步到Firebase
    if (appState.user && document.getElementById('autoSync').checked) {
        syncData();
    }
    
    // 重置表單
    document.getElementById('transferForm').reset();
    
    // 顯示成功消息
    showToast('轉賬已完成');
}

// 保存總預算
function saveGeneralBudget() {
    const budgetAmount = parseFloat(document.getElementById('budgetAmount').value) || 0;
    const autoCalculate = document.getElementById('autoCalculate').checked;
    const cycle = document.querySelector('input[name="budgetCycle"]:checked').value;
    
    appState.budgets.general = budgetAmount;
    appState.budgets.autoCalculate = autoCalculate;
    appState.budgets.cycle = cycle;
    
    // 更新UI
    updateBudgetUI();
    
    // 如果用戶已登入，則同步到Firebase
    if (appState.user && document.getElementById('autoSync').checked) {
        syncData();
    }
    
    // 顯示成功消息
    showToast('預算設定已保存');
}

// 添加類別預算
function addCategoryBudget() {
    const categoryId = document.getElementById('budgetCategory').value;
    
    if (!categoryId) {
        showToast('請選擇類別');
        return;
    }
    
    // 檢查該類別是否已有預算
    const existingBudget = appState.budgets.categories.find(b => b.categoryId === categoryId);
    if (existingBudget) {
        showToast('該類別已有預算');
        return;
    }
    
    // 獲取類別信息
    const category = findCategoryById(categoryId);
    if (!category) {
        showToast('類別不存在');
        return;
    }
    
    // 只為支出類別設置預算
    if (category.type !== 'expense') {
        showToast('只能為支出類別設置預算');
        return;
    }
    
    // 添加新預算
    const categoryBudget = {
        categoryId: categoryId,
        amount: 0
    };
    
    appState.budgets.categories.push(categoryBudget);
    
    // 更新UI
    updateCategoryBudgetsUI();
    
    // 清空選擇
    document.getElementById('budgetCategory').value = '';
    
    // 如果用戶已登入，則同步到Firebase
    if (appState.user && document.getElementById('autoSync').checked) {
        syncData();
    }
}

// 更新戶口餘額
function updateAccountBalance(accountId, amount) {
    const account = appState.accounts.find(a => a.id === accountId);
    if (account) {
        account.balance += amount;
    }
}

// 更新戶口UI
function updateAccountsUI() {
    // 更新戶口列表
    const accountsList = document.getElementById('accountsList');
    
    if (appState.accounts.length === 0) {
        accountsList.innerHTML = '<p class="no-data">尚未設置任何戶口</p>';
    } else {
        accountsList.innerHTML = '';
        
        appState.accounts.forEach(account => {
            const accountCard = document.createElement('div');
            accountCard.className = 'account-card';
            accountCard.innerHTML = `
                <h4>
                    ${account.name}
                    <span class="account-type">${getAccountTypeLabel(account.type)}</span>
                </h4>
                <p class="account-balance">${formatCurrency(account.balance, account.currency)}</p>
                <div class="account-actions">
                    <button class="btn" onclick="editAccount('${account.id}')">編輯</button>
                    <button class="btn danger" onclick="deleteAccount('${account.id}')">刪除</button>
                </div>
            `;
            accountsList.appendChild(accountCard);
        });
    }
    
    // 更新戶口選擇框
    const accountSelects = [
        'fromAccount', 'toAccount', 
        'incomeAccount', 'expenseAccount'
    ];
    
    accountSelects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            // 保存當前選擇
            const currentValue = select.value;
            
            // 清空選項
            select.innerHTML = '<option value="">選擇戶口</option>';
            
            // 添加戶口選項
            appState.accounts.forEach(account => {
                const option = document.createElement('option');
                option.value = account.id;
                option.textContent = `${account.name} (${formatCurrency(account.balance, account.currency)})`;
                select.appendChild(option);
            });
            
            // 恢復之前的選擇
            if (currentValue) {
                select.value = currentValue;
            }
        }
    });
    
    // 更新總資產
    updateTotalAssets();
}

// 更新類別UI
function updateCategoriesUI() {
    // 更新收入類別列表
    const incomeCategoriesList = document.getElementById('incomeCategoriesList');
    
    if (appState.categories.income.length === 0) {
        incomeCategoriesList.innerHTML = '<p class="no-data">尚未設置收入類別</p>';
    } else {
        incomeCategoriesList.innerHTML = '';
        
        appState.categories.income.forEach(category => {
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item';
            categoryItem.innerHTML = `
                <span><i class="fas ${category.icon || 'fa-tag'}"></i> ${category.name}</span>
                <div class="category-actions">
                    <button class="btn" onclick="editCategory('${category.id}')">編輯</button>
                    <button class="btn danger" onclick="deleteCategory('${category.id}')">刪除</button>
                </div>
            `;
            incomeCategoriesList.appendChild(categoryItem);
        });
    }
    
    // 更新支出類別列表
    const expenseCategoriesList = document.getElementById('expenseCategoriesList');
    
    if (appState.categories.expense.length === 0) {
        expenseCategoriesList.innerHTML = '<p class="no-data">尚未設置支出類別</p>';
    } else {
        expenseCategoriesList.innerHTML = '';
        
        appState.categories.expense.forEach(category => {
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item';
            categoryItem.innerHTML = `
                <span><i class="fas ${category.icon || 'fa-tag'}"></i> ${category.name}</span>
                <div class="category-actions">
                    <button class="btn" onclick="editCategory('${category.id}')">編輯</button>
                    <button class="btn danger" onclick="deleteCategory('${category.id}')">刪除</button>
                </div>
            `;
            expenseCategoriesList.appendChild(categoryItem);
        });
    }
    
    // 更新類別選擇框
    updateCategorySelectOptions('incomeCategory', 'income');
    updateCategorySelectOptions('expenseCategory', 'expense');
    updateCategorySelectOptions('budgetCategory', 'expense');
    updateCategorySelectOptions('transactionCategory', 'all');
}

// 更新類別選擇框選項
function updateCategorySelectOptions(selectId, type) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    // 保存當前選擇
    const currentValue = select.value;
    
    // 清空選項
    select.innerHTML = '<option value="">選擇類別</option>';
    
    if (type === 'all' || type === 'income') {
        // 添加收入類別選項
        if (appState.categories.income.length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = '收入';
            
            appState.categories.income.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                optgroup.appendChild(option);
            });
            
            select.appendChild(optgroup);
        }
    }
    
    if (type === 'all' || type === 'expense') {
        // 添加支出類別選項
        if (appState.categories.expense.length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = '支出';
            
            appState.categories.expense.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                optgroup.appendChild(option);
            });
            
            select.appendChild(optgroup);
        }
    }
    
    // 恢復之前的選擇
    if (currentValue) {
        select.value = currentValue;
    }
}

// 更新交易UI
function updateTransactionsUI() {
    // 按日期排序交易，最近的排在前面
    const sortedTransactions = [...appState.transactions].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });
    
    // 獲取今天的交易
    const today = formatDate(new Date());
    const todayTransactions = sortedTransactions.filter(t => t.date === today);
    
    // 更新今日交易列表
    const todayTransactionsList = document.getElementById('todayTransactions');
    
    if (todayTransactions.length === 0) {
        todayTransactionsList.innerHTML = '<p class="no-data">今日尚無交易記錄</p>';
    } else {
        todayTransactionsList.innerHTML = '';
        
        todayTransactions.slice(0, 5).forEach(transaction => {
            const transactionItem = createTransactionElement(transaction);
            todayTransactionsList.appendChild(transactionItem);
        });
    }
    
    // 更新近期交易列表
    const recentTransactionsList = document.getElementById('recentTransactions');
    
    if (sortedTransactions.length === 0) {
        recentTransactionsList.innerHTML = '<p class="no-data">尚無交易記錄</p>';
    } else {
        recentTransactionsList.innerHTML = '';
        
        sortedTransactions.slice(0, 10).forEach(transaction => {
            const transactionItem = createTransactionElement(transaction);
            recentTransactionsList.appendChild(transactionItem);
        });
    }
    
    // 更新今日收入和支出
    updateTodayFinancialSummary();
}

// 更新預算UI
function updateBudgetUI() {
    // 更新預算表單
    document.getElementById('budgetAmount').value = appState.budgets.general;
    document.getElementById('autoCalculate').checked = appState.budgets.autoCalculate;
    document.querySelector(`input[name="budgetCycle"][value="${appState.budgets.cycle}"]`).checked = true;
    
    // 更新儀表板上的預算狀態
    const budgetStatus = document.getElementById('budgetStatus');
    
    if (appState.budgets.general <= 0 && !appState.budgets.autoCalculate) {
        budgetStatus.innerHTML = `
            <p class="no-data">尚未設定預算</p>
            <button class="btn primary" id="setBudgetBtn">設定預算</button>
        `;
        
        // 設定預算按鈕點擊事件
        document.getElementById('setBudgetBtn').addEventListener('click', () => {
            showPage('budget');
        });
    } else {
        // 計算當前週期的支出總額
        const currentPeriodExpenses = calculateCurrentPeriodExpenses();
        
        // 計算預算總額
        let totalBudget = appState.budgets.general;
        if (appState.budgets.autoCalculate) {
            totalBudget = appState.budgets.categories.reduce((sum, budget) => sum + budget.amount, 0);
        }
        
        // 計算剩餘預算
        const remainingBudget = totalBudget - currentPeriodExpenses;
        
        // 計算使用百分比
        const usedPercentage = totalBudget > 0 ? (currentPeriodExpenses / totalBudget) * 100 : 0;
        
        // 決定預算狀態顏色
        let statusColor = '#4caf50'; // 綠色
        if (usedPercentage >= 90) {
            statusColor = '#f44336'; // 紅色
        } else if (usedPercentage >= 70) {
            statusColor = '#ff9800'; // 橙色
        }
        
        budgetStatus.innerHTML = `
            <div class="budget-progress">
                <div class="budget-info">
                    <span>週期: ${getBudgetCycleLabel(appState.budgets.cycle)}</span>
                    <span>預算: ${formatCurrency(totalBudget)}</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${Math.min(usedPercentage, 100)}%; background-color: ${statusColor};"></div>
                </div>
                <div class="budget-summary">
                    <span>已使用: ${formatCurrency(currentPeriodExpenses)} (${usedPercentage.toFixed(1)}%)</span>
                    <span>剩餘: ${formatCurrency(remainingBudget)}</span>
                </div>
            </div>
        `;
        
        // 如果預算即將超過，顯示通知
        if (appState.notifications && usedPercentage >= appState.notificationThreshold) {
            showToast(`警告：預算已使用 ${usedPercentage.toFixed(1)}%`);
        }
    }
}

// 更新類別預算UI
function updateCategoryBudgetsUI() {
    const categoryBudgetsList = document.getElementById('categoryBudgetsList');
    
    if (appState.budgets.categories.length === 0) {
        categoryBudgetsList.innerHTML = '<p class="no-data">尚未設置類別預算</p>';
    } else {
        categoryBudgetsList.innerHTML = '';
        
        appState.budgets.categories.forEach(budget => {
            const category = findCategoryById(budget.categoryId);
            if (!category) return;
            
            // 計算當前週期此類別的支出
            const currentPeriodCategoryExpenses = calculateCurrentPeriodCategoryExpenses(budget.categoryId);
            
            // 計算使用百分比
            const usedPercentage = budget.amount > 0 ? (currentPeriodCategoryExpenses / budget.amount) * 100 : 0;
            
            // 決定預算狀態顏色
            let statusColor = '#4caf50'; // 綠色
            if (usedPercentage >= 90) {
                statusColor = '#f44336'; // 紅色
            } else if (usedPercentage >= 70) {
                statusColor = '#ff9800'; // 橙色
            }
            
            const budgetItem = document.createElement('div');
            budgetItem.className = 'budget-item';
            budgetItem.innerHTML = `
                <div class="budget-item-header">
                    <h4><i class="fas ${category.icon || 'fa-tag'}"></i> ${category.name}</h4>
                    <input type="number" class="category-budget-amount" value="${budget.amount}" 
                           min="0" step="0.01" onchange="updateCategoryBudget('${budget.categoryId}', this.value)">
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${Math.min(usedPercentage, 100)}%; background-color: ${statusColor};"></div>
                </div>
                <div class="budget-item-footer">
                    <span>已使用: ${formatCurrency(currentPeriodCategoryExpenses)} (${usedPercentage.toFixed(1)}%)</span>
                    <button class="btn danger" onclick="deleteCategoryBudget('${budget.categoryId}')">移除</button>
                </div>
            `;
            categoryBudgetsList.appendChild(budgetItem);
        });
    }
}

// 更新今日財務摘要
function updateTodayFinancialSummary() {
    const today = formatDate(new Date());
    
    // 計算今日收入
    const todayIncome = appState.transactions
        .filter(t => t.date === today && t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    // 計算今日支出
    const todayExpense = appState.transactions
        .filter(t => t.date === today && t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    // 更新UI
    document.getElementById('todayIncome').textContent = formatNumber(todayIncome);
    document.getElementById('todayExpense').textContent = formatNumber(todayExpense);
}

// 更新總資產
function updateTotalAssets() {
    const totalAssets = appState.accounts.reduce((sum, account) => sum + account.balance, 0);
    document.getElementById('totalAssets').textContent = formatNumber(totalAssets);
}

// 創建交易元素
function createTransactionElement(transaction) {
    const transactionItem = document.createElement('div');
    transactionItem.className = 'transaction-item';
    
    // 獲取相關戶口和類別信息
    const account = getAccountById(transaction.accountId);
    let category = null;
    let amountClass = '';
    let amountPrefix = '';
    
    if (transaction.type === 'income') {
        category = findCategoryById(transaction.categoryId);
        amountClass = 'income';
        amountPrefix = '+';
    } else if (transaction.type === 'expense') {
        category = findCategoryById(transaction.categoryId);
        amountClass = 'expense';
        amountPrefix = '-';
    } else if (transaction.type === 'transfer_out') {
        amountClass = 'expense';
        amountPrefix = '-';
    } else if (transaction.type === 'transfer_in') {
        amountClass = 'income';
        amountPrefix = '+';
    }
    
    // 生成交易信息HTML
    let infoHTML = '';
    if (account) {
        if (category) {
            infoHTML = `
                <div class="transaction-info">
                    <div class="transaction-title">${category.name}</div>
                    <div class="transaction-category">${account.name} | ${formatDate(new Date(transaction.date))}</div>
                </div>
            `;
        } else {
            infoHTML = `
                <div class="transaction-info">
                    <div class="transaction-title">${transaction.notes || '交易'}</div>
                    <div class="transaction-category">${account.name} | ${formatDate(new Date(transaction.date))}</div>
                </div>
            `;
        }
    } else {
        infoHTML = `
            <div class="transaction-info">
                <div class="transaction-title">未知交易</div>
                <div class="transaction-category">${formatDate(new Date(transaction.date))}</div>
            </div>
        `;
    }
    
    transactionItem.innerHTML = `
        ${infoHTML}
        <div class="transaction-amount ${amountClass}">${amountPrefix}${formatCurrency(transaction.amount)}</div>
    `;
    
    return transactionItem;
}

// 獲取戶口類型標籤
function getAccountTypeLabel(type) {
    const labels = {
        'cash': '現金',
        'bank': '銀行',
        'credit': '信用卡',
        'investment': '投資',
        'other': '其他'
    };
    return labels[type] || '未知';
}

// 獲取預算週期標籤
function getBudgetCycleLabel(cycle) {
    const labels = {
        'daily': '每日',
        'weekly': '每週',
        'monthly': '每月'
    };
    return labels[cycle] || '未知';
}

// 根據ID獲取戶口名稱
function getAccountNameById(accountId) {
    const account = appState.accounts.find(a => a.id === accountId);
    return account ? account.name : '未知戶口';
}

// 根據ID獲取戶口
function getAccountById(accountId) {
    return appState.accounts.find(a => a.id === accountId);
}

// 根據ID查找類別
function findCategoryById(categoryId) {
    return [...appState.categories.income, ...appState.categories.expense].find(c => c.id === categoryId);
}

// 計算當前週期的支出
function calculateCurrentPeriodExpenses() {
    const now = new Date();
    let startDate;
    
    // 根據預算週期計算開始日期
    if (appState.budgets.cycle === 'daily') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (appState.budgets.cycle === 'weekly') {
        const day = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    } else if (appState.budgets.cycle === 'monthly') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    // 格式化日期範圍
    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(now);
    
    // 計算該時間範圍內的支出總額
    return appState.transactions
        .filter(t => t.type === 'expense' && t.date >= startDateStr && t.date <= endDateStr)
        .reduce((sum, t) => sum + t.amount, 0);
}

// 計算當前週期特定類別的支出
function calculateCurrentPeriodCategoryExpenses(categoryId) {
    const now = new Date();
    let startDate;
    
    // 根據預算週期計算開始日期
    if (appState.budgets.cycle === 'daily') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (appState.budgets.cycle === 'weekly') {
        const day = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    } else if (appState.budgets.cycle === 'monthly') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    // 格式化日期範圍
    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(now);
    
    // 計算該時間範圍內特定類別的支出總額
    return appState.transactions
        .filter(t => t.type === 'expense' && t.categoryId === categoryId && t.date >= startDateStr && t.date <= endDateStr)
        .reduce((sum, t) => sum + t.amount, 0);
}

// 更新類別預算金額
function updateCategoryBudget(categoryId, amount) {
    const budget = appState.budgets.categories.find(b => b.categoryId === categoryId);
    if (budget) {
        budget.amount = parseFloat(amount) || 0;
        
        // 如果啟用了自動計算，更新總預算
        if (appState.budgets.autoCalculate) {
            appState.budgets.general = appState.budgets.categories.reduce((sum, b) => sum + b.amount, 0);
            document.getElementById('budgetAmount').value = appState.budgets.general;
        }
        
        // 更新UI
        updateBudgetUI();
        
        // 如果用戶已登入，則同步到Firebase
        if (appState.user && document.getElementById('autoSync').checked) {
            syncData();
        }
    }
}

// 刪除類別預算
function deleteCategoryBudget(categoryId) {
    showConfirmDialog('確定要刪除此預算嗎？', () => {
        const index = appState.budgets.categories.findIndex(b => b.categoryId === categoryId);
        if (index !== -1) {
            appState.budgets.categories.splice(index, 1);
            
            // 如果啟用了自動計算，更新總預算
            if (appState.budgets.autoCalculate) {
                appState.budgets.general = appState.budgets.categories.reduce((sum, b) => sum + b.amount, 0);
                document.getElementById('budgetAmount').value = appState.budgets.general;
            }
            
            // 更新UI
            updateCategoryBudgetsUI();
            updateBudgetUI();
            
            // 如果用戶已登入，則同步到Firebase
            if (appState.user && document.getElementById('autoSync').checked) {
                syncData();
            }
        }
    });
}

// 編輯戶口
function editAccount(accountId) {
    const account = appState.accounts.find(a => a.id === accountId);
    if (!account) return;
    
    // 設置表單數據
    document.getElementById('accountModalTitle').textContent = '編輯戶口';
    document.getElementById('accountName').value = account.name;
    document.getElementById('accountType').value = account.type;
    document.getElementById('initialBalance').value = account.balance;
    document.getElementById('accountCurrency').value = account.currency;
    document.getElementById('accountNotes').value = account.notes || '';
    
    // 設置編輯模式
    document.getElementById('accountForm').setAttribute('data-edit-id', accountId);
    
    // 顯示模態窗口
    accountModal.style.display = 'block';
}

// 刪除戶口
function deleteAccount(accountId) {
    showConfirmDialog('確定要刪除此戶口嗎？相關的交易記錄也將被刪除。', () => {
        // 刪除相關交易
        appState.transactions = appState.transactions.filter(t => t.accountId !== accountId);
        
        // 刪除戶口
        const index = appState.accounts.findIndex(a => a.id === accountId);
        if (index !== -1) {
            appState.accounts.splice(index, 1);
        }
        
        // 更新UI
        updateAccountsUI();
        updateTransactionsUI();
        
        // 如果用戶已登入，則同步到Firebase
        if (appState.user && document.getElementById('autoSync').checked) {
            syncData();
        }
        
        // 顯示成功消息
        showToast('戶口已刪除');
    });
}

// 編輯類別
function editCategory(categoryId) {
    // 實現編輯類別功能
}

// 刪除類別
function deleteCategory(categoryId) {
    showConfirmDialog('確定要刪除此類別嗎？相關的交易記錄將被重置為未分類。', () => {
        // 更新相關交易的類別
        appState.transactions.forEach(t => {
            if (t.categoryId === categoryId) {
                t.categoryId = null;
            }
        });
        
        // 刪除類別預算
        const budgetIndex = appState.budgets.categories.findIndex(b => b.categoryId === categoryId);
        if (budgetIndex !== -1) {
            appState.budgets.categories.splice(budgetIndex, 1);
        }
        
        // 刪除類別
        const incomeIndex = appState.categories.income.findIndex(c => c.id === categoryId);
        if (incomeIndex !== -1) {
            appState.categories.income.splice(incomeIndex, 1);
        } else {
            const expenseIndex = appState.categories.expense.findIndex(c => c.id === categoryId);
            if (expenseIndex !== -1) {
                appState.categories.expense.splice(expenseIndex, 1);
            }
        }
        
        // 更新UI
        updateCategoriesUI();
        updateTransactionsUI();
        updateCategoryBudgetsUI();
        
        // 如果啟用了自動計算，更新總預算
        if (appState.budgets.autoCalculate) {
            appState.budgets.general = appState.budgets.categories.reduce((sum, b) => sum + b.amount, 0);
            updateBudgetUI();
        }
        
        // 如果用戶已登入，則同步到Firebase
        if (appState.user && document.getElementById('autoSync').checked) {
            syncData();
        }
        
        // 顯示成功消息
        showToast('類別已刪除');
    });
}

// 導出數據
function exportData() {
    try {
        const dataToExport = {
            accounts: appState.accounts,
            categories: appState.categories,
            transactions: appState.transactions,
            budgets: appState.budgets,
            exportDate: new Date().toISOString()
        };
        
        const jsonStr = JSON.stringify(dataToExport, null, 2);
        
        // 創建下載鏈接
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonStr);
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "finance_data_" + formatDateForFilename(new Date()) + ".json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        
        showToast('數據導出成功');
    } catch (error) {
        console.error('導出數據錯誤:', error);
        showToast('數據導出失敗');
    }
}

// 導入數據
function importData() {
    try {
        let jsonData;
        const fileInput = document.getElementById('importFile');
        const textInput = document.getElementById('importData');
        
        if (fileInput.files.length > 0) {
            // 從文件讀取
            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    jsonData = JSON.parse(event.target.result);
                    processImportedData(jsonData);
                } catch (error) {
                    console.error('解析導入數據錯誤:', error);
                    showToast('數據格式錯誤，無法導入');
                }
            };
            reader.readAsText(fileInput.files[0]);
        } else if (textInput.value.trim()) {
            // 從文本框讀取
            try {
                jsonData = JSON.parse(textInput.value);
                processImportedData(jsonData);
            } catch (error) {
                console.error('解析導入數據錯誤:', error);
                showToast('數據格式錯誤，無法導入');
            }
        } else {
            showToast('請選擇文件或輸入數據');
        }
    } catch (error) {
        console.error('導入數據錯誤:', error);
        showToast('數據導入失敗');
    }
}

// 處理導入的數據
function processImportedData(data) {
    showConfirmDialog('確定要導入數據嗎？當前數據將被替換。', () => {
        try {
            // 驗證數據格式
            if (!data.accounts || !data.categories || !data.transactions || !data.budgets) {
                showToast('數據格式不完整，無法導入');
                return;
            }
            
            // 更新應用狀態
            appState.accounts = data.accounts;
            appState.categories = data.categories;
            appState.transactions = data.transactions;
            appState.budgets = data.budgets;
            
            // 更新UI
            updateAccountsUI();
            updateCategoriesUI();
            updateTransactionsUI();
            updateBudgetUI();
            updateCategoryBudgetsUI();
            
            // 重置表單
            document.getElementById('importFile').value = '';
            document.getElementById('importData').value = '';
            
            // 如果用戶已登入，則同步到Firebase
            if (appState.user && document.getElementById('autoSync').checked) {
                syncData();
            }
            
            showToast('數據導入成功');
        } catch (error) {
            console.error('處理導入數據錯誤:', error);
            showToast('處理數據時出錯，導入失敗');
        }
    });
}

// 清除所有數據
function clearAllData() {
    // 重置應用狀態
    appState.accounts = [];
    appState.categories = {
        income: [],
        expense: []
    };
    appState.transactions = [];
    appState.budgets = {
        general: 0,
        autoCalculate: true,
        cycle: 'monthly',
        categories: []
    };
    
    // 更新UI
    updateAccountsUI();
    updateCategoriesUI();
    updateTransactionsUI();
    updateBudgetUI();
    updateCategoryBudgetsUI();
    
    // 如果用戶已登入，則同步到Firebase
    if (appState.user && document.getElementById('autoSync').checked) {
        syncData();
    }
    
    showToast('所有數據已清除');
}

// 顯示通知
function showToast(message) {
    // 檢查是否已存在toast
    let toast = document.querySelector('.toast');
    
    if (!toast) {
        // 創建新的toast元素
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    
    // 設置消息
    toast.textContent = message;
    toast.classList.add('show');
    
    // 定時隱藏
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// 日期格式化為YYYY-MM-DD
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 日期時間格式化
function formatDateTime(date) {
    return `${formatDate(date)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// 為文件名格式化日期
function formatDateForFilename(date) {
    return formatDate(date).replace(/-/g, '') + '_' + 
           String(date.getHours()).padStart(2, '0') + 
           String(date.getMinutes()).padStart(2, '0');
}

// 格式化貨幣
function formatCurrency(amount, currency) {
    const currencySymbol = getCurrencySymbol(currency || appState.currency);
    return `${currencySymbol} ${formatNumber(amount)}`;
}

// 格式化數字
function formatNumber(number) {
    return number.toFixed(appState.decimalPlaces).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// 獲取貨幣符號
function getCurrencySymbol(currency) {
    const symbols = {
        'HKD': '$',
        'USD': '$',
        'CNY': '¥',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥'
    };
    return symbols[currency] || '$';
}

// 添加自定義事件處理，例如編輯和刪除交易
window.editAccount = editAccount;
window.deleteAccount = deleteAccount;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.updateCategoryBudget = updateCategoryBudget;
window.deleteCategoryBudget = deleteCategoryBudget;

// 為toast添加樣式
const style = document.createElement('style');
style.textContent = `
.toast {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 12px 20px;
    border-radius: 4px;
    z-index: 1000;
    opacity: 0;
    transition: opacity 0.3s;
    max-width: 80%;
    text-align: center;
}

.toast.show {
    opacity: 1;
}

.budget-progress {
    padding: 10px 0;
}

.budget-info, .budget-summary {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
}

.budget-summary {
    margin-top: 5px;
}

.progress-bar-container {
    width: 100%;
    height: 10px;
    background-color: var(--border-color);
    border-radius: 5px;
    overflow: hidden;
}

.progress-bar {
    height: 100%;
    background-color: var(--primary-color);
    transition: width 0.3s ease;
}

.budget-item {
    background-color: var(--bg-color);
    border-radius: var(--radius);
    padding: 15px;
    margin-bottom: 10px;
}

.budget-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.budget-item-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 5px;
}

.category-budget-amount {
    width: 100px;
    padding: 5px;
    text-align: right;
}
`;
document.head.appendChild(style);
