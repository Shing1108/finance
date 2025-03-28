// 應用全局狀態
const appState = {
    accounts: [],
    categories: {
        income: [],
        expense: []
    },
    transactions: [],
    budgets: {
        general: 0,
        categories: [],
        cycle: 'monthly',
        resetDay: 1
    },
    settings: {
        darkMode: false,
        fontSize: 'medium',
        currency: 'HKD',
        currencySymbol: '$',
        decimalPlaces: 2,
        enableBudgetAlerts: true,
        budgetAlertThreshold: 80
    },
    user: null,
    isOnline: navigator.onLine,
    lastSyncTime: null
};

// Firebase 配置
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "finance-d8f9e.firebaseapp.com",
    projectId: "finance-d8f9e",
    storageBucket: "finance-d8f9e.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// 初始化 Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// DOM 加載完成後初始化應用
document.addEventListener('DOMContentLoaded', initApp);

// 網絡狀態監控
window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);

// 初始化應用
function initApp() {
    // 設置初始UI狀態
    setupUI();
    
    // 加載設置
    loadSettings();
    
    // 更新連接狀態
    updateConnectionStatus();
    
    // 檢查認證狀態
    checkAuthState();
    
    // 從本地存儲加載數據作為初始數據
    loadFromLocalStorage();
    
    // 添加事件監聽器
    setupEventListeners();
}

// 設置UI初始狀態
function setupUI() {
    hideAllSections();
    showSection('dashboard');
    updateNavActiveState('dashboard');
    
    // 設置模態框關閉按鈕
    const closeButtons = document.querySelectorAll('.modal .close-btn, .modal .cancel-btn');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            if (modal) {
                closeModal(modal.id);
            }
        });
    });
}

// 添加事件監聽器
function setupEventListeners() {
    // 導航選項點擊
    document.querySelectorAll('nav a').forEach(navLink => {
        navLink.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('data-target');
            if (target) {
                showSection(target);
                updateNavActiveState(target);
            }
        });
    });
    
    // 設定按鈕點擊
    document.getElementById('settingsBtn').addEventListener('click', () => {
        openModal('settingsModal');
        populateSettingsForm();
    });
    
    // 新增戶口按鈕點擊
    document.getElementById('addAccountBtn').addEventListener('click', () => {
        openModal('addAccountModal');
        resetAccountForm();
    });
    
    // 保存戶口按鈕點擊
    document.getElementById('saveAccountBtn').addEventListener('click', saveAccount);
    
    // 記賬表單提交
    document.getElementById('incomeForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveTransaction('income');
    });
    
    document.getElementById('expenseForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveTransaction('expense');
    });
    
    // 轉賬按鈕點擊
    document.getElementById('confirmTransferBtn').addEventListener('click', processTransfer);
    
    // 預算保存按鈕點擊
    document.getElementById('saveBudgetSettingsBtn').addEventListener('click', saveBudgetSettings);
    
    // 添加類別預算按鈕點擊
    document.getElementById('addCategoryBudgetBtn').addEventListener('click', addCategoryBudget);
    
    // 新增類別按鈕點擊
    document.getElementById('addIncomeCategory').addEventListener('click', () => {
        openAddCategoryModal('income');
    });
    
    document.getElementById('addExpenseCategory').addEventListener('click', () => {
        openAddCategoryModal('expense');
    });
    
    // 設置保存按鈕點擊
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
    
    // 清除數據按鈕點擊
    document.getElementById('clearDataBtn').addEventListener('click', () => {
        openModal('confirmModal');
        document.getElementById('confirmYesBtn').onclick = clearAllData;
    });
    
    // 登入按鈕點擊
    document.getElementById('loginBtn').addEventListener('click', signInWithGoogle);
    
    // 登出按鈕點擊
    document.getElementById('logoutBtn').addEventListener('click', signOut);
    
    // 立即同步按鈕點擊
    document.getElementById('syncNowBtn').addEventListener('click', syncData);
    
    // 數據匯出按鈕點擊
    document.getElementById('exportDataBtn').addEventListener('click', exportData);
    
    // 數據匯入按鈕點擊
    document.getElementById('importDataBtn').addEventListener('click', importData);
    
    // 從文件上傳按鈕點擊
    document.getElementById('uploadFileBtn').addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });
    
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);
}

// 更新連接狀態
function updateConnectionStatus() {
    const isOnline = navigator.onLine;
    appState.isOnline = isOnline;
    
    const statusElement = document.getElementById('connectionStatus');
    if (statusElement) {
        statusElement.textContent = isOnline ? '在線' : '離線';
        statusElement.className = isOnline ? 'status-online' : 'status-offline';
    }
    
    // 如果恢復在線並且用戶已登入，嘗試同步
    if (isOnline && appState.user) {
        syncData();
    }
}

// 檢查認證狀態
function checkAuthState() {
    auth.onAuthStateChanged(user => {
        if (user) {
            // 用戶已登入
            appState.user = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL
            };
            updateAuthUI(true);
            
            // 嘗試從Firebase加載數據
            loadDataFromFirestore(user.uid);
        } else {
            // 用戶未登入
            appState.user = null;
            updateAuthUI(false);
            
            // 從本地存儲加載數據
            loadFromLocalStorage();
        }
    });
}

// 更新認證UI
function updateAuthUI(isLoggedIn) {
    document.getElementById('loginStatus').textContent = isLoggedIn ? appState.user.displayName : '未登入';
    document.getElementById('loginBtn').style.display = isLoggedIn ? 'none' : 'block';
    document.getElementById('logoutBtn').style.display = isLoggedIn ? 'block' : 'none';
    document.getElementById('syncStatus').textContent = isLoggedIn ? '已連接' : '未登入';
    
    if (isLoggedIn && appState.lastSyncTime) {
        document.getElementById('lastSyncTime').textContent = formatDate(appState.lastSyncTime);
    } else {
        document.getElementById('lastSyncTime').textContent = '從未同步';
    }
}

// 使用Google登入
function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then(result => {
            showToast('登入成功', 'success');
        })
        .catch(error => {
            console.error('登入失敗:', error);
            showToast('登入失敗: ' + error.message, 'error');
        });
}

// 登出
function signOut() {
    auth.signOut()
        .then(() => {
            showToast('已登出', 'info');
        })
        .catch(error => {
            console.error('登出失敗:', error);
            showToast('登出失敗: ' + error.message, 'error');
        });
}

// 從Firebase加載數據
function loadDataFromFirestore(userId) {
    console.log('嘗試從Firestore加載數據...');
    
    // 首先檢查網絡連接
    if (!navigator.onLine) {
        console.log('設備處於離線狀態，將從本地存儲加載數據');
        loadFromLocalStorage();
        return Promise.resolve();
    }
    
    // 顯示加載指示器
    showLoadingMessage('正在連接Firebase...');
    
    // 預設空數據結構
    const defaultData = {
        accounts: [],
        categories: { income: [], expense: [] },
        transactions: [],
        budgets: {
            general: 0,
            categories: [],
            cycle: 'monthly',
            resetDay: 1
        }
    };
    
    // 確保有效的用戶ID
    if (!userId) {
        console.warn('未提供用戶ID，無法加載數據');
        updateAppState(defaultData);
        showLoadingMessage('未登入，使用本地數據');
        loadFromLocalStorage();
        return Promise.resolve();
    }
    
    // 參考用戶文檔
    const userRef = db.collection('users').doc(userId);
    
    // 加載戶口數據
    const loadAccounts = userRef.collection('accounts').get()
        .then(snapshot => {
            showLoadingMessage('加載戶口數據...');
            const accounts = [];
            if (!snapshot.empty) {
                snapshot.forEach(doc => {
                    accounts.push({ id: doc.id, ...doc.data() });
                });
            }
            return accounts;
        })
        .catch(error => {
            console.error('加載戶口數據失敗:', error);
            // 嘗試從緩存加載
            return userRef.collection('accounts').get({ source: 'cache' })
                .then(snapshot => {
                    const accounts = [];
                    if (!snapshot.empty) {
                        snapshot.forEach(doc => {
                            accounts.push({ id: doc.id, ...doc.data() });
                        });
                    }
                    return accounts;
                })
                .catch(cacheError => {
                    console.warn('無法從緩存加載戶口:', cacheError);
                    return [];
                });
        });
    
    // 加載類別數據
    const loadCategories = userRef.collection('categories').doc('all').get()
        .then(doc => {
            showLoadingMessage('加載類別數據...');
            if (doc.exists) {
                return doc.data();
            } else {
                // 創建默認類別
                return loadDefaultCategories();
            }
        })
        .catch(error => {
            console.error('加載類別數據失敗:', error);
            // 嘗試從緩存加載
            return userRef.collection('categories').doc('all').get({ source: 'cache' })
                .then(doc => {
                    if (doc.exists) {
                        return doc.data();
                    } else {
                        return loadDefaultCategories();
                    }
                })
                .catch(cacheError => {
                    console.warn('無法從緩存加載類別:', cacheError);
                    return loadDefaultCategories();
                });
        });
    
    // 加載交易數據
    const loadTransactions = userRef.collection('transactions').get()
        .then(snapshot => {
            showLoadingMessage('加載交易數據...');
            const transactions = [];
            if (!snapshot.empty) {
                snapshot.forEach(doc => {
                    // 添加日期轉換
                    const data = doc.data();
                    if (data.date && data.date.toDate) {
                        data.date = data.date.toDate();
                    }
                    transactions.push({ id: doc.id, ...data });
                });
            }
            return transactions;
        })
        .catch(error => {
            console.error('加載交易數據失敗:', error);
            // 嘗試從緩存加載
            return userRef.collection('transactions').get({ source: 'cache' })
                .then(snapshot => {
                    const transactions = [];
                    if (!snapshot.empty) {
                        snapshot.forEach(doc => {
                            const data = doc.data();
                            if (data.date && data.date.toDate) {
                                data.date = data.date.toDate();
                            }
                            transactions.push({ id: doc.id, ...data });
                        });
                    }
                    return transactions;
                })
                .catch(cacheError => {
                    console.warn('無法從緩存加載交易:', cacheError);
                    return [];
                });
        });
    
    // 加載預算數據
    const loadBudgets = userRef.collection('budgets').doc('current').get()
        .then(doc => {
            showLoadingMessage('加載預算數據...');
            if (doc.exists) {
                return doc.data();
            } else {
                return {
                    general: 0,
                    categories: [],
                    cycle: 'monthly',
                    resetDay: 1
                };
            }
        })
        .catch(error => {
            console.error('加載預算數據失敗:', error);
            // 嘗試從緩存加載
            return userRef.collection('budgets').doc('current').get({ source: 'cache' })
                .then(doc => {
                    if (doc.exists) {
                        return doc.data();
                    } else {
                        return {
                            general: 0,
                            categories: [],
                            cycle: 'monthly',
                            resetDay: 1
                        };
                    }
                })
                .catch(cacheError => {
                    console.warn('無法從緩存加載預算:', cacheError);
                    return {
                        general: 0,
                        categories: [],
                        cycle: 'monthly',
                        resetDay: 1
                    };
                });
        });
    
    // 組合所有數據加載操作
    return Promise.all([loadAccounts, loadCategories, loadTransactions, loadBudgets])
        .then(([accounts, categories, transactions, budgets]) => {
            const appData = {
                accounts: accounts || [],
                categories: categories || { income: [], expense: [] },
                transactions: transactions || [],
                budgets: budgets || {
                    general: 0,
                    categories: [],
                    cycle: 'monthly',
                    resetDay: 1
                }
            };
            
            updateAppState(appData);
            saveToLocalStorage(appData);  // 保存到本地存儲作為備份
            
            // 更新最後同步時間
            appState.lastSyncTime = new Date();
            localStorage.setItem('lastSyncTime', appState.lastSyncTime.toString());
            document.getElementById('lastSyncTime').textContent = formatDate(appState.lastSyncTime);
            
            showLoadingMessage('數據加載完成');
            setTimeout(hideLoadingMessage, 500);
            return appData;
        })
        .catch(error => {
            console.error('加載數據過程中出錯:', error);
            showToast('從Firebase加載數據失敗，將使用本地數據', 'error');
            loadFromLocalStorage();
            hideLoadingMessage();
            return defaultData;
        });
}

// 從本地存儲加載數據
function loadFromLocalStorage() {
    try {
        console.log('嘗試從本地存儲加載數據...');
        
        // 加載戶口
        const accountsJson = localStorage.getItem('accounts');
        if (accountsJson) {
            try {
                appState.accounts = JSON.parse(accountsJson) || [];
            } catch (e) {
                console.error('解析戶口數據失敗:', e);
                appState.accounts = [];
            }
        } else {
            appState.accounts = [];
        }
        
        // 加載類別
        const categoriesJson = localStorage.getItem('categories');
        if (categoriesJson) {
            try {
                const parsedCategories = JSON.parse(categoriesJson);
                if (parsedCategories && typeof parsedCategories === 'object') {
                    appState.categories = {
                        income: Array.isArray(parsedCategories.income) ? parsedCategories.income : [],
                        expense: Array.isArray(parsedCategories.expense) ? parsedCategories.expense : []
                    };
                } else {
                    throw new Error('類別數據格式無效');
                }
            } catch (e) {
                console.error('解析類別數據失敗:', e);
                // 載入默認類別
                appState.categories = loadDefaultCategories();
            }
        } else {
            // 載入默認類別
            appState.categories = loadDefaultCategories();
        }
        
        // 加載交易
        const transactionsJson = localStorage.getItem('transactions');
        if (transactionsJson) {
            try {
                let transactions = JSON.parse(transactionsJson) || [];
                // 確保日期對象正確
                transactions = transactions.map(t => {
                    if (t.date && typeof t.date === 'string') {
                        t.date = new Date(t.date);
                    }
                    return t;
                });
                appState.transactions = transactions;
            } catch (e) {
                console.error('解析交易數據失敗:', e);
                appState.transactions = [];
            }
        } else {
            appState.transactions = [];
        }
        
        // 加載預算
        const budgetsJson = localStorage.getItem('budgets');
        if (budgetsJson) {
            try {
                appState.budgets = JSON.parse(budgetsJson) || {
                    general: 0,
                    categories: [],
                    cycle: 'monthly',
                    resetDay: 1
                };
            } catch (e) {
                console.error('解析預算數據失敗:', e);
                appState.budgets = {
                    general: 0,
                    categories: [],
                    cycle: 'monthly',
                    resetDay: 1
                };
            }
        } else {
            appState.budgets = {
                general: 0,
                categories: [],
                cycle: 'monthly',
                resetDay: 1
            };
        }
        
        // 加載設置
        loadSettings();
        
        // 加載最後同步時間
        const lastSyncTimeStr = localStorage.getItem('lastSyncTime');
        if (lastSyncTimeStr) {
            appState.lastSyncTime = new Date(lastSyncTimeStr);
        }
        
        // 更新UI
        updateAllUI();
        console.log('已從本地存儲加載數據');
    } catch (error) {
        console.error('從本地存儲加載數據時出錯:', error);
        showToast('無法從本地存儲加載數據，重設為默認值', 'error');
        
        // 重設為空狀態
        resetAppState();
    }
}

// 加載默認類別
function loadDefaultCategories() {
    const defaultCategories = {
        income: [
            { id: 'salary', name: '薪資', icon: '💰', color: '#4CAF50' },
            { id: 'investment', name: '投資', icon: '📈', color: '#2196F3' },
            { id: 'bonus', name: '獎金', icon: '🎁', color: '#9C27B0' },
            { id: 'other_income', name: '其他收入', icon: '💵', color: '#607D8B' }
        ],
        expense: [
            { id: 'food', name: '餐飲', icon: '🍴', color: '#F44336' },
            { id: 'transport', name: '交通', icon: '🚌', color: '#FF9800' },
            { id: 'shopping', name: '購物', icon: '🛍️', color: '#E91E63' },
            { id: 'housing', name: '住房', icon: '🏠', color: '#795548' },
            { id: 'utilities', name: '水電', icon: '💡', color: '#FFC107' },
            { id: 'entertainment', name: '娛樂', icon: '🎬', color: '#673AB7' },
            { id: 'health', name: '醫療', icon: '🏥', color: '#00BCD4' },
            { id: 'education', name: '教育', icon: '📚', color: '#3F51B5' },
            { id: 'other_expense', name: '其他支出', icon: '💸', color: '#9E9E9E' }
        ]
    };
    
    // 保存到本地存儲
    localStorage.setItem('categories', JSON.stringify(defaultCategories));
    return defaultCategories;
}

// 保存到本地存儲
function saveToLocalStorage(data) {
    if (!data) data = appState;
    
    try {
        localStorage.setItem('accounts', JSON.stringify(data.accounts));
        localStorage.setItem('categories', JSON.stringify(data.categories));
        localStorage.setItem('transactions', JSON.stringify(data.transactions));
        localStorage.setItem('budgets', JSON.stringify(data.budgets));
        localStorage.setItem('settings', JSON.stringify(appState.settings));
        
        if (appState.lastSyncTime) {
            localStorage.setItem('lastSyncTime', appState.lastSyncTime.toString());
        }
    } catch (error) {
        console.error('保存到本地存儲失敗:', error);
        showToast('保存到本地存儲失敗', 'error');
    }
}

// 更新應用狀態
function updateAppState(data) {
    if (!data) return;
    
    // 更新戶口
    if (Array.isArray(data.accounts)) {
        appState.accounts = data.accounts;
    }
    
    // 更新類別
    if (data.categories && typeof data.categories === 'object') {
        appState.categories = {
            income: Array.isArray(data.categories.income) ? data.categories.income : [],
            expense: Array.isArray(data.categories.expense) ? data.categories.expense : []
        };
    }
    
    // 更新交易
    if (Array.isArray(data.transactions)) {
        appState.transactions = data.transactions;
    }
    
    // 更新預算
    if (data.budgets && typeof data.budgets === 'object') {
        appState.budgets = data.budgets;
    }
    
    // 更新UI
    updateAllUI();
}

// 重設應用狀態
function resetAppState() {
    appState.accounts = [];
    appState.categories = loadDefaultCategories();
    appState.transactions = [];
    appState.budgets = {
        general: 0,
        categories: [],
        cycle: 'monthly',
        resetDay: 1
    };
    
    // 更新UI
    updateAllUI();
}

// 更新所有UI元素
function updateAllUI() {
    // 更新戶口列表
    updateAccountsList();
    
    // 更新戶口選項
    updateAccountOptions();
    
    // 更新類別選項
    updateCategoryOptions();
    
    // 更新交易記錄
    updateTransactionsList();
    
    // 更新今日交易
    updateTodayTransactions();
    
    // 更新預算狀態
    updateBudgetStatus();
    
    // 更新儀表板摘要
    updateDashboardSummary();
    
    // 更新統計圖表
    updateCharts();
    
    // 更新財務健康指數
    updateFinancialHealthIndex();
    
    // 更新個人化建議
    updatePersonalizedAdvice();
    
    // 應用設置
    applySettings();
}

// 更新戶口列表
function updateAccountsList() {
    const accountsContainer = document.getElementById('accountsList');
    if (!accountsContainer) return;
    
    if (appState.accounts.length === 0) {
        accountsContainer.innerHTML = '<p class="empty-state">尚未設置任何戶口</p>';
        return;
    }
    
    // 確定視圖模式
    const viewMode = document.querySelector('.view-toggle .active')?.dataset.view || 'card';
    
    if (viewMode === 'card') {
        let html = '';
        appState.accounts.forEach(account => {
            html += `
                <div class="account-card" data-id="${account.id}">
                    <div class="account-card-header">
                        <h3>${account.name}</h3>
                        <span class="account-type">${account.type}</span>
                    </div>
                    <div class="account-card-balance">
                        <span class="currency">${getCurrencySymbol(account.currency)}</span>
                        <span class="amount">${formatNumber(account.balance)}</span>
                    </div>
                    <div class="account-card-actions">
                        <button class="edit-btn" onclick="editAccount('${account.id}')">編輯</button>
                        <button class="delete-btn" onclick="deleteAccount('${account.id}')">刪除</button>
                    </div>
                </div>
            `;
        });
        accountsContainer.innerHTML = html;
    } else {
        // 列表視圖
        let html = `
            <table class="accounts-table">
                <thead>
                    <tr>
                        <th>戶口名稱</th>
                        <th>類型</th>
                        <th>貨幣</th>
                        <th>餘額</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        appState.accounts.forEach(account => {
            html += `
                <tr data-id="${account.id}">
                    <td>${account.name}</td>
                    <td>${account.type}</td>
                    <td>${account.currency}</td>
                    <td>${getCurrencySymbol(account.currency)}${formatNumber(account.balance)}</td>
                    <td>
                        <button class="edit-btn small" onclick="editAccount('${account.id}')">編輯</button>
                        <button class="delete-btn small" onclick="deleteAccount('${account.id}')">刪除</button>
                    </td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
        accountsContainer.innerHTML = html;
    }
}

// 更新戶口選項
function updateAccountOptions() {
    const accountSelects = document.querySelectorAll('.account-select');
    
    accountSelects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">選擇戶口</option>';
        
        appState.accounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account.id;
            option.textContent = `${account.name} (${getCurrencySymbol(account.currency)}${formatNumber(account.balance)})`;
            select.appendChild(option);
        });
        
        // 還原之前選擇的值
        if (currentValue && appState.accounts.some(a => a.id === currentValue)) {
            select.value = currentValue;
        }
    });
}

// 更新類別選項
function updateCategoryOptions() {
    // 更新收入類別選項
    const incomeCategorySelect = document.getElementById('incomeCategory');
    if (incomeCategorySelect) {
        const currentValue = incomeCategorySelect.value;
        incomeCategorySelect.innerHTML = '<option value="">選擇類別</option>';
        
        appState.categories.income.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = `${category.icon} ${category.name}`;
            option.style.color = category.color;
            incomeCategorySelect.appendChild(option);
        });
        
        // 還原之前選擇的值
        if (currentValue && appState.categories.income.some(c => c.id === currentValue)) {
            incomeCategorySelect.value = currentValue;
        }
    }
    
    // 更新支出類別選項
    const expenseCategorySelect = document.getElementById('expenseCategory');
    if (expenseCategorySelect) {
        const currentValue = expenseCategorySelect.value;
        expenseCategorySelect.innerHTML = '<option value="">選擇類別</option>';
        
        appState.categories.expense.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = `${category.icon} ${category.name}`;
            option.style.color = category.color;
            expenseCategorySelect.appendChild(option);
        });
        
        // 還原之前選擇的值
        if (currentValue && appState.categories.expense.some(c => c.id === currentValue)) {
            expenseCategorySelect.value = currentValue;
        }
    }
    
    // 更新預算類別選項
    const budgetCategorySelect = document.getElementById('budgetCategory');
    if (budgetCategorySelect) {
        budgetCategorySelect.innerHTML = '<option value="">選擇類別</option>';
        
        appState.categories.expense.forEach(category => {
            // 檢查此類別是否已經有預算
            const hasExistingBudget = appState.budgets.categories.some(b => b.categoryId === category.id);
            if (!hasExistingBudget) {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = `${category.icon} ${category.name}`;
                budgetCategorySelect.appendChild(option);
            }
        });
    }
    
    // 更新類別管理列表
    updateCategoriesList();
}

// 更新類別管理列表
function updateCategoriesList() {
    const incomeCategoriesList = document.getElementById('incomeCategoriesList');
    const expenseCategoriesList = document.getElementById('expenseCategoriesList');
    
    if (!incomeCategoriesList || !expenseCategoriesList) return;
    
    // 確定視圖模式
    const viewMode = document.querySelector('.categories-view-toggle .active')?.dataset.view || 'card';
    
    // 收入類別
    if (appState.categories.income.length === 0) {
        incomeCategoriesList.innerHTML = '<p class="empty-state">尚未設置收入類別</p>';
    } else {
        if (viewMode === 'card') {
            let html = '';
            appState.categories.income.forEach(category => {
                html += `
                    <div class="category-card" data-id="${category.id}" style="border-color: ${category.color}">
                        <div class="category-icon" style="background-color: ${category.color}">${category.icon}</div>
                        <div class="category-name">${category.name}</div>
                        <div class="category-actions">
                            <button class="edit-btn small" onclick="editCategory('income', '${category.id}')">編輯</button>
                            <button class="delete-btn small" onclick="deleteCategory('income', '${category.id}')">刪除</button>
                        </div>
                    </div>
                `;
            });
            incomeCategoriesList.innerHTML = html;
        } else {
            // 列表視圖
            let html = `
                <table class="categories-table">
                    <thead>
                        <tr>
                            <th>圖標</th>
                            <th>名稱</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            appState.categories.income.forEach(category => {
                html += `
                    <tr data-id="${category.id}">
                        <td><span class="category-icon-small" style="background-color: ${category.color}">${category.icon}</span></td>
                        <td>${category.name}</td>
                        <td>
                            <button class="edit-btn small" onclick="editCategory('income', '${category.id}')">編輯</button>
                            <button class="delete-btn small" onclick="deleteCategory('income', '${category.id}')">刪除</button>
                        </td>
                    </tr>
                `;
            });
            
            html += `
                    </tbody>
                </table>
            `;
            incomeCategoriesList.innerHTML = html;
        }
    }
    
    // 支出類別
    if (appState.categories.expense.length === 0) {
        expenseCategoriesList.innerHTML = '<p class="empty-state">尚未設置支出類別</p>';
    } else {
        if (viewMode === 'card') {
            let html = '';
            appState.categories.expense.forEach(category => {
                html += `
                    <div class="category-card" data-id="${category.id}" style="border-color: ${category.color}">
                        <div class="category-icon" style="background-color: ${category.color}">${category.icon}</div>
                        <div class="category-name">${category.name}</div>
                        <div class="category-actions">
                            <button class="edit-btn small" onclick="editCategory('expense', '${category.id}')">編輯</button>
                            <button class="delete-btn small" onclick="deleteCategory('expense', '${category.id}')">刪除</button>
                        </div>
                    </div>
                `;
            });
            expenseCategoriesList.innerHTML = html;
        } else {
            // 列表視圖
            let html = `
                <table class="categories-table">
                    <thead>
                        <tr>
                            <th>圖標</th>
                            <th>名稱</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            appState.categories.expense.forEach(category => {
                html += `
                    <tr data-id="${category.id}">
                        <td><span class="category-icon-small" style="background-color: ${category.color}">${category.icon}</span></td>
                        <td>${category.name}</td>
                        <td>
                            <button class="edit-btn small" onclick="editCategory('expense', '${category.id}')">編輯</button>
                            <button class="delete-btn small" onclick="deleteCategory('expense', '${category.id}')">刪除</button>
                        </td>
                    </tr>
                `;
            });
            
            html += `
                    </tbody>
                </table>
            `;
            expenseCategoriesList.innerHTML = html;
        }
    }
}

// 更新交易記錄
function updateTransactionsList() {
    const transactionsContainer = document.getElementById('transactionsList');
    if (!transactionsContainer) return;
    
    // 獲取篩選條件
    const dateFrom = document.getElementById('dateFrom')?.value;
    const dateTo = document.getElementById('dateTo')?.value;
    const typeFilter = document.getElementById('typeFilter')?.value;
    const categoryFilter = document.getElementById('categoryFilter')?.value;
    
    // 篩選交易
    let filteredTransactions = appState.transactions.slice();
    
    if (dateFrom) {
        const fromDate = new Date(dateFrom);
        filteredTransactions = filteredTransactions.filter(t => new Date(t.date) >= fromDate);
    }
    
    if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);  // 設置為當天的最後一毫秒
        filteredTransactions = filteredTransactions.filter(t => new Date(t.date) <= toDate);
    }
    
    if (typeFilter && typeFilter !== 'all') {
        filteredTransactions = filteredTransactions.filter(t => t.type === typeFilter);
    }
    
    if (categoryFilter && categoryFilter !== 'all') {
        filteredTransactions = filteredTransactions.filter(t => t.categoryId === categoryFilter);
    }
    
    // 排序：最新的交易在前
    filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (filteredTransactions.length === 0) {
        transactionsContainer.innerHTML = '<p class="empty-state">無符合條件的交易記錄</p>';
        return;
    }
    
    // 生成交易列表HTML
    let html = `
        <table class="transactions-table">
            <thead>
                <tr>
                    <th>日期</th>
                    <th>類型</th>
                    <th>類別</th>
                    <th>戶口</th>
                    <th>金額</th>
                    <th>備註</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    filteredTransactions.forEach(transaction => {
        const account = appState.accounts.find(a => a.id === transaction.accountId) || { name: '未知戶口', currency: 'HKD' };
        const category = (transaction.type === 'income' 
            ? appState.categories.income 
            : appState.categories.expense).find(c => c.id === transaction.categoryId) || { name: '未知類別', icon: '❓', color: '#999' };
        
        html += `
            <tr class="${transaction.type}-transaction" data-id="${transaction.id}">
                <td>${formatDate(transaction.date)}</td>
                <td>${transaction.type === 'income' ? '收入' : '支出'}</td>
                <td>
                    <span class="category-icon-small" style="background-color: ${category.color}">${category.icon}</span>
                    ${category.name}
                </td>
                <td>${account.name}</td>
                <td class="${transaction.type}-amount">${getCurrencySymbol(account.currency)}${formatNumber(transaction.amount)}</td>
                <td>${transaction.note || '-'}</td>
                <td>
                    <button class="edit-btn small" onclick="editTransaction('${transaction.id}')">編輯</button>
                    <button class="delete-btn small" onclick="deleteTransaction('${transaction.id}')">刪除</button>
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    transactionsContainer.innerHTML = html;
}

// 更新今日交易
function updateTodayTransactions() {
    const todayTransactionsContainer = document.getElementById('todayTransactionsList');
    if (!todayTransactionsContainer) return;
    
    // 獲取今天的日期
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 篩選今天的交易
    const todayTransactions = appState.transactions.filter(t => {
        const transactionDate = new Date(t.date);
        transactionDate.setHours(0, 0, 0, 0);
        return transactionDate.getTime() === today.getTime();
    });
    
    if (todayTransactions.length === 0) {
        todayTransactionsContainer.innerHTML = '<p class="empty-state">今日尚無交易記錄</p>';
        return;
    }
    
    // 按時間排序，最新的在前
    todayTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // 生成今日交易列表
    let html = '';
    
    todayTransactions.forEach(transaction => {
        const account = appState.accounts.find(a => a.id === transaction.accountId) || { name: '未知戶口', currency: 'HKD' };
        const category = (transaction.type === 'income' 
            ? appState.categories.income 
            : appState.categories.expense).find(c => c.id === transaction.categoryId) || { name: '未知類別', icon: '❓', color: '#999' };
        
        html += `
            <div class="transaction-item ${transaction.type}" data-id="${transaction.id}">
                <div class="transaction-category" style="background-color: ${category.color}">
                    ${category.icon}
                </div>
                <div class="transaction-details">
                    <div class="transaction-title">${category.name}</div>
                    <div class="transaction-account">${account.name}</div>
                    ${transaction.note ? `<div class="transaction-note">${transaction.note}</div>` : ''}
                </div>
                <div class="transaction-amount ${transaction.type}">
                    ${transaction.type === 'income' ? '+' : '-'}${getCurrencySymbol(account.currency)}${formatNumber(transaction.amount)}
                </div>
            </div>
        `;
    });
    
    todayTransactionsContainer.innerHTML = html;
}

// 更新儀表板摘要
function updateDashboardSummary() {
    // 計算總資產
    let totalAssets = 0;
    appState.accounts.forEach(account => {
        // 簡單處理：所有貨幣金額直接相加(實際應用中應該考慮匯率轉換)
        totalAssets += parseFloat(account.balance);
    });
    
    // 獲取今天的日期
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 計算今日收入和支出
    let todayIncome = 0;
    let todayExpense = 0;
    
    appState.transactions.forEach(transaction => {
        const transactionDate = new Date(transaction.date);
        transactionDate.setHours(0, 0, 0, 0);
        
        if (transactionDate.getTime() === today.getTime()) {
            if (transaction.type === 'income') {
                todayIncome += parseFloat(transaction.amount);
            } else {
                todayExpense += parseFloat(transaction.amount);
            }
        }
    });
    
    // 更新UI
    document.getElementById('totalAssets').textContent = formatNumber(totalAssets);
    document.getElementById('todayIncome').textContent = formatNumber(todayIncome);
    document.getElementById('todayExpense').textContent = formatNumber(todayExpense);
}

// 更新預算狀態
function updateBudgetStatus() {
    const budgetStatusContainer = document.getElementById('budgetStatus');
    if (!budgetStatusContainer) return;
    
    if (!appState.budgets.general && (!appState.budgets.categories || appState.budgets.categories.length === 0)) {
        budgetStatusContainer.innerHTML = `
            <p class="empty-state">尚未設定預算</p>
            <button class="action-btn" onclick="showSection('budget')">設定預算</button>
        `;
        return;
    }
    
    // 獲取當前預算週期內的交易
    const currentPeriodTransactions = getCurrentPeriodTransactions();
    
    // 計算總支出
    let totalExpense = 0;
    currentPeriodTransactions.forEach(transaction => {
        if (transaction.type === 'expense') {
            totalExpense += parseFloat(transaction.amount);
        }
    });
    
    // 計算總預算和用量
    const totalBudget = parseFloat(appState.budgets.general) || calculateTotalCategoryBudgets();
    const usagePercentage = totalBudget > 0 ? (totalExpense / totalBudget) * 100 : 0;
    
    // 生成總預算狀態
    let html = `
        <div class="budget-overview">
            <div class="budget-progress-container">
                <div class="budget-label">總預算用量</div>
                <div class="budget-values">
                    <span class="spent">${appState.settings.currencySymbol}${formatNumber(totalExpense)}</span> / 
                    <span class="budget">${appState.settings.currencySymbol}${formatNumber(totalBudget)}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress" style="width: ${Math.min(usagePercentage, 100)}%; background-color: ${getBudgetColor(usagePercentage)}"></div>
                </div>
                <div class="budget-percentage">${formatNumber(usagePercentage)}%</div>
            </div>
        </div>
    `;
    
    // 添加類別預算狀態
    if (appState.budgets.categories && appState.budgets.categories.length > 0) {
        html += '<div class="category-budgets">';
        
        appState.budgets.categories.forEach(categoryBudget => {
            const category = appState.categories.expense.find(c => c.id === categoryBudget.categoryId);
            if (!category) return;
            
            // 計算此類別的支出
            let categoryExpense = 0;
            currentPeriodTransactions.forEach(transaction => {
                if (transaction.type === 'expense' && transaction.categoryId === categoryBudget.categoryId) {
                    categoryExpense += parseFloat(transaction.amount);
                }
            });
            
            const categoryUsagePercentage = parseFloat(categoryBudget.amount) > 0 
                ? (categoryExpense / parseFloat(categoryBudget.amount)) * 100 
                : 0;
            
            html += `
                <div class="category-budget-item">
                    <div class="category-budget-header">
                        <span class="category-icon" style="background-color: ${category.color}">${category.icon}</span>
                        <span class="category-name">${category.name}</span>
                    </div>
                    <div class="budget-values">
                        <span class="spent">${appState.settings.currencySymbol}${formatNumber(categoryExpense)}</span> / 
                        <span class="budget">${appState.settings.currencySymbol}${formatNumber(categoryBudget.amount)}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress" style="width: ${Math.min(categoryUsagePercentage, 100)}%; background-color: ${getBudgetColor(categoryUsagePercentage)}"></div>
                    </div>
                    <div class="budget-percentage">${formatNumber(categoryUsagePercentage)}%</div>
                </div>
            `;
        });
        
        html += '</div>';
    }
    
    budgetStatusContainer.innerHTML = html;
}

// 獲取當前預算週期內的交易
function getCurrentPeriodTransactions() {
    const cycle = appState.budgets.cycle || 'monthly';
    const now = new Date();
    let startDate;
    
    switch (cycle) {
        case 'daily':
            startDate = new Date(now);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'weekly':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - now.getDay()); // 從本週日開始
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'monthly':
            const resetDay = parseInt(appState.budgets.resetDay) || 1;
            startDate = new Date(now);
            if (now.getDate() >= resetDay) {
                // 如果當前日期已經過了重設日，則從本月的重設日開始
                startDate.setDate(resetDay);
            } else {
                // 否則從上個月的重設日開始
                startDate.setMonth(startDate.getMonth() - 1);
                startDate.setDate(resetDay);
            }
            startDate.setHours(0, 0, 0, 0);
            break;
    }
    
    // 篩選在預算週期內的交易
    return appState.transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate >= startDate;
    });
}

// 計算類別預算總和
function calculateTotalCategoryBudgets() {
    if (!appState.budgets.categories || !Array.isArray(appState.budgets.categories)) {
        return 0;
    }
    
    return appState.budgets.categories.reduce((total, budget) => {
        return total + parseFloat(budget.amount || 0);
    }, 0);
}

// 獲取預算顏色
function getBudgetColor(percentage) {
    if (percentage >= 100) {
        return '#F44336'; // 紅色：超出預算
    } else if (percentage >= 80) {
        return '#FF9800'; // 橙色：接近預算
    } else {
        return '#4CAF50'; // 綠色：正常
    }
}

// 更新統計圖表
function updateCharts() {
    // 獲取當前月份
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // 本月開始和結束日期
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0);
    
    // 篩選本月交易
    const monthTransactions = appState.transactions.filter(t => {
        const date = new Date(t.date);
        return date >= monthStart && date <= monthEnd;
    });
    
    // 按類別分組交易
    const incomeByCategory = {};
    const expenseByCategory = {};
    
    monthTransactions.forEach(transaction => {
        if (transaction.type === 'income') {
            const categoryId = transaction.categoryId;
            if (!incomeByCategory[categoryId]) {
                incomeByCategory[categoryId] = 0;
            }
            incomeByCategory[categoryId] += parseFloat(transaction.amount);
        } else {
            const categoryId = transaction.categoryId;
            if (!expenseByCategory[categoryId]) {
                expenseByCategory[categoryId] = 0;
            }
            expenseByCategory[categoryId] += parseFloat(transaction.amount);
        }
    });
    
    // 創建圖表數據
    const incomeData = [];
    for (const categoryId in incomeByCategory) {
        const category = appState.categories.income.find(c => c.id === categoryId);
        if (category) {
            incomeData.push({
                label: category.name,
                value: incomeByCategory[categoryId],
                color: category.color
            });
        }
    }
    
    const expenseData = [];
    for (const categoryId in expenseByCategory) {
        const category = appState.categories.expense.find(c => c.id === categoryId);
        if (category) {
            expenseData.push({
                label: category.name,
                value: expenseByCategory[categoryId],
                color: category.color
            });
        }
    }
    
    // 排序數據：金額從大到小
    incomeData.sort((a, b) => b.value - a.value);
    expenseData.sort((a, b) => b.value - a.value);
    
    // 更新圖表
    updateChart('incomeChart', incomeData, '收入分佈');
    updateChart('expenseChart', expenseData, '支出分佈');
}

// 更新單個圖表
function updateChart(chartId, data, title) {
    const chartContainer = document.getElementById(chartId);
    if (!chartContainer) return;
    
    if (data.length === 0) {
        chartContainer.innerHTML = `<p class="empty-state">沒有${title}數據</p>`;
        return;
    }
    
    // 計算總額
    const total = data.reduce((sum, item) => sum + item.value, 0);
    
    // 生成餅圖和圖例
    let html = `
        <h3>${title}</h3>
        <div class="chart-container">
            <div class="pie-chart">
                <svg viewBox="0 0 100 100">
    `;
    
    let startAngle = 0;
    data.forEach(item => {
        const percentage = (item.value / total) * 100;
        const angle = (percentage / 100) * 360;
        const endAngle = startAngle + angle;
        
        // 轉換角度為弧度，然後計算SVG路徑
        const startRadians = (startAngle - 90) * Math.PI / 180;
        const endRadians = (endAngle - 90) * Math.PI / 180;
        
        const startX = 50 + 50 * Math.cos(startRadians);
        const startY = 50 + 50 * Math.sin(startRadians);
        const endX = 50 + 50 * Math.cos(endRadians);
        const endY = 50 + 50 * Math.sin(endRadians);
        
        const largeArcFlag = angle > 180 ? 1 : 0;
        
        const pathData = [
            `M 50 50`,
            `L ${startX} ${startY}`,
            `A 50 50 0 ${largeArcFlag} 1 ${endX} ${endY}`,
            `Z`
        ].join(' ');
        
        html += `<path d="${pathData}" fill="${item.color}"></path>`;
        
        startAngle = endAngle;
    });
    
    html += `
                </svg>
            </div>
            <div class="chart-legend">
    `;
    
    data.forEach(item => {
        const percentage = ((item.value / total) * 100).toFixed(1);
        html += `
            <div class="legend-item">
                <span class="legend-color" style="background-color: ${item.color}"></span>
                <span class="legend-label">${item.label}</span>
                <span class="legend-value">${formatNumber(item.value)} (${percentage}%)</span>
            </div>
        `;
    });
    
    html += `
            </div>
        </div>
    `;
    
    chartContainer.innerHTML = html;
}

// 更新財務健康指數
function updateFinancialHealthIndex() {
    const healthIndexContainer = document.getElementById('financialHealthIndex');
    const adviceContainer = document.getElementById('personalizedAdvice');
    
    if (!healthIndexContainer || !adviceContainer) return;
    
    // 如果沒有足夠數據，顯示計算中
    if (appState.accounts.length === 0 || appState.transactions.length < 3) {
        healthIndexContainer.innerHTML = `
            <span class="health-score">--</span>
            <p>計算中...</p>
        `;
        adviceContainer.innerHTML = `<p class="loading-text">載入中...</p>`;
        return;
    }
    
    // 計算財務指標
    
    // 1. 儲蓄率
    const last3Months = getLastMonthsData(3);
    let totalIncome = 0;
    let totalExpense = 0;
    
    last3Months.forEach(transaction => {
        if (transaction.type === 'income') {
            totalIncome += parseFloat(transaction.amount);
        } else {
            totalExpense += parseFloat(transaction.amount);
        }
    });
    
    const savingsRate = totalIncome > 0 ? (totalIncome - totalExpense) / totalIncome * 100 : 0;
    
    // 2. 預算遵守率
    const budgetAdherence = calculateBudgetAdherence();
    
    // 3. 資產多樣性
    const assetDiversity = calculateAssetDiversity();
    
    // 4. 支出類別分佈
    const expenseDiversity = calculateExpenseDiversity();
    
    // 綜合評分 (0-100)
    let healthScore = 0;
    healthScore += savingsRate > 20 ? 30 : (savingsRate > 10 ? 20 : (savingsRate > 0 ? 10 : 0));
    healthScore += budgetAdherence > 90 ? 30 : (budgetAdherence > 70 ? 20 : (budgetAdherence > 50 ? 10 : 0));
    healthScore += assetDiversity > 3 ? 20 : (assetDiversity > 1 ? 10 : 0);
    healthScore += expenseDiversity > 0.7 ? 20 : (expenseDiversity > 0.5 ? 10 : 0);
    
    // 顯示分數
    healthIndexContainer.innerHTML = `
        <span class="health-score">${healthScore}</span>
        <p class="health-level">${getHealthLevel(healthScore)}</p>
    `;
    
    // 生成個人化建議
    const advice = generateFinancialAdvice(healthScore, savingsRate, budgetAdherence, assetDiversity, expenseDiversity);
    adviceContainer.innerHTML = advice;
}

// 獲取健康等級
function getHealthLevel(score) {
    if (score >= 80) return '優秀';
    if (score >= 60) return '良好';
    if (score >= 40) return '一般';
    return '需改進';
}

// 計算預算遵守率
function calculateBudgetAdherence() {
    if (!appState.budgets.general && (!appState.budgets.categories || appState.budgets.categories.length === 0)) {
        return 100; // 沒有設置預算，默認100%遵守
    }
    
    const currentPeriodTransactions = getCurrentPeriodTransactions();
    
    // 計算總支出
    let totalExpense = 0;
    currentPeriodTransactions.forEach(transaction => {
        if (transaction.type === 'expense') {
            totalExpense += parseFloat(transaction.amount);
        }
    });
    
    // 總預算
    const totalBudget = parseFloat(appState.budgets.general) || calculateTotalCategoryBudgets();
    
    // 預算遵守率
    return totalBudget > 0 ? Math.min(100, (1 - Math.max(0, totalExpense - totalBudget) / totalBudget) * 100) : 100;
}

// 計算資產多樣性
function calculateAssetDiversity() {
    return appState.accounts.length;
}

// 計算支出多樣性 (使用香農熵的簡化版本)
function calculateExpenseDiversity() {
    const categories = {};
    let totalExpense = 0;
    
    // 獲取過去3個月的數據
    const transactions = getLastMonthsData(3);
    
    transactions.forEach(transaction => {
        if (transaction.type === 'expense') {
            const categoryId = transaction.categoryId;
            if (!categories[categoryId]) {
                categories[categoryId] = 0;
            }
            categories[categoryId] += parseFloat(transaction.amount);
            totalExpense += parseFloat(transaction.amount);
        }
    });
    
    if (totalExpense === 0) return 0;
    
    // 計算香農熵
    let entropy = 0;
    for (const categoryId in categories) {
        const p = categories[categoryId] / totalExpense;
        entropy -= p * Math.log(p);
    }
    
    // 歸一化熵 (0-1)
    const maxEntropy = Math.log(Object.keys(categories).length || 1);
    return maxEntropy > 0 ? entropy / maxEntropy : 0;
}

// 獲取過去n個月的交易數據
function getLastMonthsData(months) {
    const now = new Date();
    const startDate = new Date();
    startDate.setMonth(now.getMonth() - months);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
    
    return appState.transactions.filter(transaction => {
        const date = new Date(transaction.date);
        return date >= startDate;
    });
}

// 生成財務建議
function generateFinancialAdvice(score, savingsRate, budgetAdherence, assetDiversity, expenseDiversity) {
    let advice = '<ul class="advice-list">';
    
    // 儲蓄建議
    if (savingsRate < 10) {
        advice += '<li class="advice-item important">儲蓄率過低，建議減少非必要支出，提高儲蓄比例至收入的15-20%。</li>';
    } else if (savingsRate < 20) {
        advice += '<li class="advice-item">儲蓄率一般，可考慮再提高一些，建議目標為收入的20%以上。</li>';
    } else {
        advice += '<li class="advice-item positive">儲蓄率良好，建議考慮將部分儲蓄用於投資以獲取更高回報。</li>';
    }
    
    // 預算建議
    if (budgetAdherence < 70) {
        advice += '<li class="advice-item important">預算遵守率較低，建議更嚴格控制支出，確保不超出預算。</li>';
    } else if (budgetAdherence < 90) {
        advice += '<li class="advice-item">預算遵守較好，仍有提升空間，可嘗試更細化預算分類。</li>';
    } else {
        advice += '<li class="advice-item positive">預算遵守率極佳，若時常有結餘，可考慮適度調整預算以更符合實際情況。</li>';
    }
    
    // 資產多樣性建議
    if (assetDiversity <= 1) {
        advice += '<li class="advice-item important">只使用單一戶口，建議考慮增加至少一個其他類型的戶口以分散風險。</li>';
    } else if (assetDiversity <= 3) {
        advice += '<li class="advice-item">戶口多樣性一般，可考慮增加投資類戶口以提高資產增值能力。</li>';
    } else {
        advice += '<li class="advice-item positive">戶口多樣性良好，建議定期檢視各戶口餘額分配是否合理。</li>';
    }
    
    // 支出多樣性建議
    if (expenseDiversity < 0.5) {
        advice += '<li class="advice-item important">支出過於集中在少數類別，建議檢查是否有被忽略的必要支出。</li>';
    } else {
        advice += '<li class="advice-item positive">支出分佈較為均衡，繼續保持良好的消費習慣。</li>';
    }
    
    // 總體建議
    if (score < 40) {
        advice += '<li class="advice-item summary important">總體財務健康狀況需要改進，建議首先專注於增加儲蓄和嚴格執行預算計劃。</li>';
    } else if (score < 60) {
        advice += '<li class="advice-item summary">總體財務健康狀況一般，建議平衡改善儲蓄率和支出結構。</li>';
    } else if (score < 80) {
        advice += '<li class="advice-item summary positive">總體財務健康狀況良好，可考慮更多投資選項以增加資產增值能力。</li>';
    } else {
        advice += '<li class="advice-item summary positive">總體財務健康狀況優秀，建議專注於長期財富積累和資產配置優化。</li>';
    }
    
    advice += '</ul>';
    return advice;
}

// 更新個人化建議
function updatePersonalizedAdvice() {
    // 實現已包含在updateFinancialHealthIndex函數中
}

// 顯示加載訊息
function showLoadingMessage(message) {
    const loadingEl = document.getElementById('loadingMessage');
    if (!loadingEl) {
        // 如果元素不存在，創建一個
        const newLoadingEl = document.createElement('div');
        newLoadingEl.id = 'loadingMessage';
        newLoadingEl.className = 'loading-message';
        document.body.appendChild(newLoadingEl);
    }
    
    document.getElementById('loadingMessage').textContent = message;
    document.getElementById('loadingMessage').style.display = 'block';
}

// 隱藏加載訊息
function hideLoadingMessage() {
    const loadingEl = document.getElementById('loadingMessage');
    if (loadingEl) {
        loadingEl.style.display = 'none';
    }
}

// 顯示通知Toast
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.getElementById('toastContainer').appendChild(toast);
    
    // 3秒後自動移除
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// 顯示指定選項卡
function showSection(sectionId) {
    // 隱藏所有選項卡
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // 顯示指定選項卡
    const targetSection = document.getElementById(sectionId + 'Section');
    if (targetSection) {
        targetSection.style.display = 'block';
    }
    
    // 更新導航狀態
    updateNavActiveState(sectionId);
}

// 隱藏所有選項卡
function hideAllSections() {
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
}

// 更新導航活動狀態
function updateNavActiveState(activeId) {
    document.querySelectorAll('nav a').forEach(link => {
        if (link.getAttribute('data-target') === activeId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// 打開模態框
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

// 關閉模態框
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// 重置戶口表單
function resetAccountForm() {
    document.getElementById('accountForm').reset();
    document.getElementById('accountId').value = '';
}

// 保存戶口
function saveAccount() {
    const accountId = document.getElementById('accountId').value;
    const name = document.getElementById('accountName').value.trim();
    const type = document.getElementById('accountType').value;
    const initialBalance = parseFloat(document.getElementById('initialBalance').value) || 0;
    const currency = document.getElementById('accountCurrency').value;
    const note = document.getElementById('accountNote').value.trim();
    
    // 驗證
    if (!name) {
        showToast('請輸入戶口名稱', 'warning');
        return;
    }
    
    if (!type) {
        showToast('請選擇戶口類型', 'warning');
        return;
    }
    
    // 創建戶口對象
    const account = {
        name,
        type,
        balance: initialBalance,
        currency: currency || 'HKD',
        note
    };
    
    // 如果是編輯現有戶口
    if (accountId) {
        const index = appState.accounts.findIndex(a => a.id === accountId);
        if (index !== -1) {
            account.id = accountId;
            appState.accounts[index] = account;
            showToast('戶口已更新', 'success');
        }
    } else {
        // 創建新戶口
        account.id = generateId();
        account.createdAt = new Date();
        appState.accounts.push(account);
        showToast('已添加新戶口', 'success');
    }
    
    // 保存數據並更新UI
    saveToLocalStorage();
    if (appState.user && navigator.onLine) {
        syncAccount(account);
    }
    updateAllUI();
    
    // 關閉模態框
    closeModal('addAccountModal');
}

// 編輯戶口
function editAccount(accountId) {
    const account = appState.accounts.find(a => a.id === accountId);
    if (!account) {
        showToast('找不到指定戶口', 'error');
        return;
    }
    
    // 填充表單
    document.getElementById('accountId').value = account.id;
    document.getElementById('accountName').value = account.name;
    document.getElementById('accountType').value = account.type;
    document.getElementById('initialBalance').value = account.balance;
    document.getElementById('accountCurrency').value = account.currency;
    document.getElementById('accountNote').value = account.note || '';
    
    // 打開模態框
    openModal('addAccountModal');
}

// 刪除戶口
function deleteAccount(accountId) {
    // 確認刪除
    openModal('confirmModal');
    document.getElementById('confirmYesBtn').onclick = () => {
        const index = appState.accounts.findIndex(a => a.id === accountId);
        if (index !== -1) {
            const account = appState.accounts[index];
            
            // 檢查是否有與此戶口關聯的交易
            const relatedTransactions = appState.transactions.filter(t => t.accountId === accountId);
            if (relatedTransactions.length > 0) {
                showToast(`無法刪除：此戶口有${relatedTransactions.length}筆相關交易記錄`, 'error');
                closeModal('confirmModal');
                return;
            }
            
            // 刪除戶口
            appState.accounts.splice(index, 1);
            showToast('戶口已刪除', 'success');
            
            // 保存數據並更新UI
            saveToLocalStorage();
            if (appState.user && navigator.onLine) {
                deleteAccountFromFirestore(accountId);
            }
            updateAllUI();
            closeModal('confirmModal');
        }
    };
}

// 處理轉賬
function processTransfer() {
    const fromAccountId = document.getElementById('fromAccount').value;
    const toAccountId = document.getElementById('toAccount').value;
    const amount = parseFloat(document.getElementById('transferAmount').value);
    
    // 驗證
    if (!fromAccountId || !toAccountId) {
        showToast('請選擇源戶口和目標戶口', 'warning');
        return;
    }
    
    if (fromAccountId === toAccountId) {
        showToast('源戶口和目標戶口不能相同', 'warning');
        return;
    }
    
    if (!amount || amount <= 0) {
        showToast('請輸入有效的轉賬金額', 'warning');
        return;
    }
    
    // 查找戶口
    const fromAccount = appState.accounts.find(a => a.id === fromAccountId);
    const toAccount = appState.accounts.find(a => a.id === toAccountId);
    
    if (parseFloat(fromAccount.balance) < amount) {
        showToast('餘額不足', 'error');
        return;
    }
    
    // 更新餘額
    fromAccount.balance = (parseFloat(fromAccount.balance) - amount).toFixed(2);
    toAccount.balance = (parseFloat(toAccount.balance) + amount).toFixed(2);
    
    // 創建轉賬交易記錄
    const now = new Date();
    const transferOut = {
        id: generateId(),
        type: 'expense',
        categoryId: 'transfer_out',
        accountId: fromAccountId,
        amount: amount,
        date: now,
        note: `轉賬至${toAccount.name}`,
        transferPair: true
    };
    
    const transferIn = {
        id: generateId(),
        type: 'income',
        categoryId: 'transfer_in',
        accountId: toAccountId,
        amount: amount,
        date: now,
        note: `從${fromAccount.name}轉入`,
        transferPair: true
    };
    
    appState.transactions.push(transferOut, transferIn);
    
    // 保存數據並更新UI
    saveToLocalStorage();
    if (appState.user && navigator.onLine) {
        syncAccount(fromAccount);
        syncAccount(toAccount);
        syncTransaction(transferOut);
        syncTransaction(transferIn);
    }
    updateAllUI();
    
    // 重置表單
    document.getElementById('transferForm').reset();
    showToast('轉賬完成', 'success');
}

// 保存交易
function saveTransaction(type) {
    const form = document.getElementById(`${type}Form`);
    const accountId = document.getElementById(`${type}Account`).value;
    const categoryId = document.getElementById(`${type}Category`).value;
    const amount = parseFloat(document.getElementById(`${type}Amount`).value);
    const dateStr = document.getElementById(`${type}Date`).value;
    const note = document.getElementById(`${type}Note`).value.trim();
    
    // 驗證
    if (!accountId) {
        showToast('請選擇戶口', 'warning');
        return;
    }
    
    if (!categoryId) {
        showToast('請選擇類別', 'warning');
        return;
    }
    
    if (!amount || amount <= 0) {
        showToast('請輸入有效金額', 'warning');
        return;
    }
    
    if (!dateStr) {
        showToast('請選擇日期', 'warning');
        return;
    }
    
    // 查找戶口
    const account = appState.accounts.find(a => a.id === accountId);
    if (!account) {
        showToast('找不到指定戶口', 'error');
        return;
    }
    
    // 創建交易對象
    const transaction = {
        id: generateId(),
        type,
        categoryId,
        accountId,
        amount,
        date: new Date(dateStr),
        note
    };
    
    // 更新戶口餘額
    if (type === 'income') {
        account.balance = (parseFloat(account.balance) + amount).toFixed(2);
    } else {
        account.balance = (parseFloat(account.balance) - amount).toFixed(2);
    }
    
    // 保存交易和更新戶口
    appState.transactions.push(transaction);
    
    // 保存數據並更新UI
    saveToLocalStorage();
    if (appState.user && navigator.onLine) {
        syncAccount(account);
        syncTransaction(transaction);
    }
    updateAllUI();
    
    // 重置表單
    form.reset();
    showToast(`已記錄${type === 'income' ? '收入' : '支出'}`, 'success');
}

// 編輯交易
function editTransaction(transactionId) {
    // 此函數將在未來實現
    showToast('編輯交易功能即將推出', 'info');
}

// 刪除交易
function deleteTransaction(transactionId) {
    // 確認刪除
    openModal('confirmModal');
    document.getElementById('confirmYesBtn').onclick = () => {
        const index = appState.transactions.findIndex(t => t.id === transactionId);
        if (index !== -1) {
            const transaction = appState.transactions[index];
            
            // 更新相關戶口餘額
            const account = appState.accounts.find(a => a.id === transaction.accountId);
            if (account) {
                if (transaction.type === 'income') {
                    account.balance = (parseFloat(account.balance) - parseFloat(transaction.amount)).toFixed(2);
                } else {
                    account.balance = (parseFloat(account.balance) + parseFloat(transaction.amount)).toFixed(2);
                }
            }
            
            // 刪除交易
            appState.transactions.splice(index, 1);
            
            // 保存數據並更新UI
            saveToLocalStorage();
            if (appState.user && navigator.onLine) {
                if (account) syncAccount(account);
                deleteTransactionFromFirestore(transactionId);
            }
            updateAllUI();
            
            showToast('交易已刪除', 'success');
            closeModal('confirmModal');
        }
    };
}

// 保存預算設置
function saveBudgetSettings() {
    const generalBudget = parseFloat(document.getElementById('generalBudget').value) || 0;
    const cycle = document.querySelector('input[name="budgetCycle"]:checked')?.value || 'monthly';
    const resetDay = parseInt(document.getElementById('budgetResetDay').value) || 1;
    const inheritPrevious = document.getElementById('inheritPrevious').checked;
    
    appState.budgets.general = generalBudget;
    appState.budgets.cycle = cycle;
    appState.budgets.resetDay = resetDay;
    appState.budgets.inheritPrevious = inheritPrevious;
    
    saveToLocalStorage();
    if (appState.user && navigator.onLine) {
        syncBudgets();
    }
    updateBudgetStatus();
    showToast('預算設置已保存', 'success');
}

// 添加類別預算
function addCategoryBudget() {
    const categoryId = document.getElementById('budgetCategory').value;
    const amount = parseFloat(document.getElementById('categoryBudgetAmount').value);
    
    if (!categoryId) {
        showToast('請選擇類別', 'warning');
        return;
    }
    
    if (!amount || amount <= 0) {
        showToast('請輸入有效的預算金額', 'warning');
        return;
    }
    
    // 查找類別
    const category = appState.categories.expense.find(c => c.id === categoryId);
    if (!category) {
        showToast('找不到指定類別', 'error');
        return;
    }
    
    // 檢查此類別是否已有預算
    if (appState.budgets.categories.some(b => b.categoryId === categoryId)) {
        showToast('此類別已設置預算', 'warning');
        return;
    }
    
    // 添加類別預算
    appState.budgets.categories.push({
        categoryId,
        amount
    });
    
    // 保存數據並更新UI
    saveToLocalStorage();
    if (appState.user && navigator.onLine) {
        syncBudgets();
    }
    updateBudgetStatus();
    
    // 更新類別預算選項
    updateCategoryOptions();
    
    // 重置表單
    document.getElementById('categoryBudgetForm').reset();
    showToast('類別預算已添加', 'success');
}

// 打開添加類別模態框
function openAddCategoryModal(type) {
    // 此函數將在未來實現
    showToast('添加類別功能即將推出', 'info');
}

// 編輯類別
function editCategory(type, categoryId) {
    // 此函數將在未來實現
    showToast('編輯類別功能即將推出', 'info');
}

// 刪除類別
function deleteCategory(type, categoryId) {
    // 確認刪除
    openModal('confirmModal');
    document.getElementById('confirmYesBtn').onclick = () => {
        // 檢查是否有與此類別關聯的交易
        const relatedTransactions = appState.transactions.filter(t => t.categoryId === categoryId);
        if (relatedTransactions.length > 0) {
            showToast(`無法刪除：此類別有${relatedTransactions.length}筆相關交易記錄`, 'error');
            closeModal('confirmModal');
            return;
        }
        
        // 檢查是否有與此類別關聯的預算
        if (appState.budgets.categories.some(b => b.categoryId === categoryId)) {
            const index = appState.budgets.categories.findIndex(b => b.categoryId === categoryId);
            if (index !== -1) {
                appState.budgets.categories.splice(index, 1);
            }
        }
        
        // 刪除類別
        if (type === 'income') {
            const index = appState.categories.income.findIndex(c => c.id === categoryId);
            if (index !== -1) {
                appState.categories.income.splice(index, 1);
            }
        } else {
            const index = appState.categories.expense.findIndex(c => c.id === categoryId);
            if (index !== -1) {
                appState.categories.expense.splice(index, 1);
            }
        }
        
        // 保存數據並更新UI
        saveToLocalStorage();
        if (appState.user && navigator.onLine) {
            syncCategories();
            syncBudgets();
        }
        updateAllUI();
        
        showToast('類別已刪除', 'success');
        closeModal('confirmModal');
    };
}

// 加載設置
function loadSettings() {
    try {
        const settingsJson = localStorage.getItem('settings');
        if (settingsJson) {
            const savedSettings = JSON.parse(settingsJson);
            // 合併保存的設置與默認設置
            appState.settings = { ...appState.settings, ...savedSettings };
        }
    } catch (error) {
        console.error('加載設置失敗:', error);
    }
    
    // 應用設置
    applySettings();
}

// 填充設置表單
function populateSettingsForm() {
    // 界面設置
    document.getElementById('darkMode').checked = appState.settings.darkMode;
    document.querySelector(`input[name="fontSize"][value="${appState.settings.fontSize}"]`).checked = true;
    
    // 貨幣設置
    document.getElementById('defaultCurrency').value = appState.settings.currency;
    document.querySelector(`input[name="decimalPlaces"][value="${appState.settings.decimalPlaces}"]`).checked = true;
    
    // 通知設置
    document.getElementById('enableBudgetAlerts').checked = appState.settings.enableBudgetAlerts;
    document.getElementById('budgetAlertThreshold').value = appState.settings.budgetAlertThreshold;
}

// 保存設置
function saveSettings() {
    // 收集表單數據
    const darkMode = document.getElementById('darkMode').checked;
    const fontSize = document.querySelector('input[name="fontSize"]:checked')?.value || 'medium';
    const currency = document.getElementById('defaultCurrency').value;
    const decimalPlaces = parseInt(document.querySelector('input[name="decimalPlaces"]:checked')?.value || '2');
    const enableBudgetAlerts = document.getElementById('enableBudgetAlerts').checked;
    const budgetAlertThreshold = parseInt(document.getElementById('budgetAlertThreshold').value) || 80;
    
    // 更新設置
    appState.settings.darkMode = darkMode;
    appState.settings.fontSize = fontSize;
    appState.settings.currency = currency;
    appState.settings.currencySymbol = getCurrencySymbol(currency);
    appState.settings.decimalPlaces = decimalPlaces;
    appState.settings.enableBudgetAlerts = enableBudgetAlerts;
    appState.settings.budgetAlertThreshold = budgetAlertThreshold;
    
    // 保存設置
    localStorage.setItem('settings', JSON.stringify(appState.settings));
    
    // 應用設置
    applySettings();
    
    // 關閉模態框
    closeModal('settingsModal');
    
    showToast('設置已保存', 'success');
}

// 應用設置
function applySettings() {
    // 應用深色模式
    if (appState.settings.darkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    
    // 應用字體大小
    document.body.classList.remove('font-small', 'font-medium', 'font-large');
    document.body.classList.add(`font-${appState.settings.fontSize}`);
    
    // 更新貨幣符號顯示
    document.querySelectorAll('.currency-symbol').forEach(el => {
        el.textContent = appState.settings.currencySymbol;
    });
}

// 清除所有數據
function clearAllData() {
    appState.accounts = [];
    appState.categories = loadDefaultCategories();
    appState.transactions = [];
    appState.budgets = {
        general: 0,
        categories: [],
        cycle: 'monthly',
        resetDay: 1
    };
    
    saveToLocalStorage();
    
    // 如果用戶已登入且在線，也清除Firebase數據
    if (appState.user && navigator.onLine) {
        clearFirestoreData();
    }
    
    updateAllUI();
    
    closeModal('confirmModal');
    showToast('所有數據已清除', 'info');
}

// 同步數據
function syncData() {
    if (!appState.user) {
        showToast('請先登入', 'warning');
        return;
    }
    
    if (!navigator.onLine) {
        showToast('離線狀態無法同步', 'warning');
        return;
    }
    
    showLoadingMessage('同步中...');
    
    // 同步所有數據
    Promise.all([
        syncAccounts(),
        syncCategories(),
        syncTransactions(),
        syncBudgets()
    ])
    .then(() => {
        appState.lastSyncTime = new Date();
        localStorage.setItem('lastSyncTime', appState.lastSyncTime.toString());
        document.getElementById('lastSyncTime').textContent = formatDate(appState.lastSyncTime);
        
        hideLoadingMessage();
        showToast('數據同步完成', 'success');
    })
    .catch(error => {
        console.error('同步失敗:', error);
        hideLoadingMessage();
        showToast('同步失敗: ' + error.message, 'error');
    });
}

// 同步所有戶口
function syncAccounts() {
    if (!appState.user) return Promise.reject(new Error('未登入'));
    
    const userId = appState.user.uid;
    const userRef = db.collection('users').doc(userId);
    const accountsRef = userRef.collection('accounts');
    
    // 獲取服務器上所有戶口
    return accountsRef.get()
        .then(snapshot => {
            // 創建一個從ID到服務器數據的映射
            const serverAccounts = {};
            snapshot.forEach(doc => {
                serverAccounts[doc.id] = doc.data();
            });
            
            const batch = db.batch();
            
            // 處理本地戶口
            appState.accounts.forEach(account => {
                const accountRef = accountsRef.doc(account.id);
                // 如果服務器上沒有此戶口或數據不同，則上傳
                if (!serverAccounts[account.id] || 
                    JSON.stringify(serverAccounts[account.id]) !== JSON.stringify(account)) {
                    batch.set(accountRef, account);
                }
                // 刪除處理過的戶口，剩下的就是需要刪除的
                delete serverAccounts[account.id];
            });
            
            // 處理那些需要從本地刪除的戶口
            for (const id in serverAccounts) {
                // 檢查是否有與此戶口關聯的交易，如果有，暫時不删除該戶口
                if (!appState.transactions.some(t => t.accountId === id)) {
                    batch.delete(accountsRef.doc(id));
                }
            }
            
            return batch.commit();
        });
}

// 同步單個戶口
function syncAccount(account) {
    if (!appState.user || !navigator.onLine) return;
    
    const userId = appState.user.uid;
    const accountRef = db.collection('users').doc(userId).collection('accounts').doc(account.id);
    
    accountRef.set(account)
        .catch(error => {
            console.error('同步戶口失敗:', error);
        });
}

// 從Firestore刪除戶口
function deleteAccountFromFirestore(accountId) {
    if (!appState.user || !navigator.onLine) return;
    
    const userId = appState.user.uid;
    const accountRef = db.collection('users').doc(userId).collection('accounts').doc(accountId);
    
    accountRef.delete()
        .catch(error => {
            console.error('刪除Firestore戶口失敗:', error);
        });
}

// 同步所有類別
function syncCategories() {
    if (!appState.user) return Promise.reject(new Error('未登入'));
    
    const userId = appState.user.uid;
    const categoriesRef = db.collection('users').doc(userId).collection('categories').doc('all');
    
    return categoriesRef.set(appState.categories);
}

// 同步所有交易
function syncTransactions() {
    if (!appState.user) return Promise.reject(new Error('未登入'));
    
    const userId = appState.user.uid;
    const userRef = db.collection('users').doc(userId);
    const transactionsRef = userRef.collection('transactions');
    
    // 獲取服務器上所有交易
    return transactionsRef.get()
        .then(snapshot => {
            // 創建一個從ID到服務器數據的映射
            const serverTransactions = {};
            snapshot.forEach(doc => {
                serverTransactions[doc.id] = doc.data();
            });
            
            const batch = db.batch();
            
            // 處理本地交易
            appState.transactions.forEach(transaction => {
                const transactionRef = transactionsRef.doc(transaction.id);
                // 準備要存儲的數據
                const dataToStore = { ...transaction };
                // 確保日期是Firestore時間戳
                if (dataToStore.date instanceof Date) {
                    dataToStore.date = firebase.firestore.Timestamp.fromDate(dataToStore.date);
                }
                
                // 如果服務器上沒有此交易或數據不同，則上傳
                if (!serverTransactions[transaction.id]) {
                    batch.set(transactionRef, dataToStore);
                }
                // 刪除處理過的交易，剩下的就是需要刪除的
                delete serverTransactions[transaction.id];
            });
            
            // 處理那些需要從本地刪除的交易
            for (const id in serverTransactions) {
                batch.delete(transactionsRef.doc(id));
            }
            
            return batch.commit();
        });
}

// 同步單個交易
function syncTransaction(transaction) {
    if (!appState.user || !navigator.onLine) return;
    
    const userId = appState.user.uid;
    const transactionRef = db.collection('users').doc(userId).collection('transactions').doc(transaction.id);
    
    // 準備要存儲的數據
    const dataToStore = { ...transaction };
    // 確保日期是Firestore時間戳
    if (dataToStore.date instanceof Date) {
        dataToStore.date = firebase.firestore.Timestamp.fromDate(dataToStore.date);
    }
    
    transactionRef.set(dataToStore)
        .catch(error => {
            console.error('同步交易失敗:', error);
        });
}

// 從Firestore刪除交易
function deleteTransactionFromFirestore(transactionId) {
    if (!appState.user || !navigator.onLine) return;
    
    const userId = appState.user.uid;
    const transactionRef = db.collection('users').doc(userId).collection('transactions').doc(transactionId);
    
    transactionRef.delete()
        .catch(error => {
            console.error('刪除Firestore交易失敗:', error);
        });
}

// 同步所有預算
function syncBudgets() {
    if (!appState.user) return Promise.reject(new Error('未登入'));
    
    const userId = appState.user.uid;
    const budgetsRef = db.collection('users').doc(userId).collection('budgets').doc('current');
    
    return budgetsRef.set(appState.budgets);
}

// 清除Firestore數據
function clearFirestoreData() {
    if (!appState.user || !navigator.onLine) return Promise.reject(new Error('未登入或離線'));
    
    const userId = appState.user.uid;
    const userRef = db.collection('users').doc(userId);
    
    // 由於Firestore不支持直接刪除集合，我們需要批量刪除文檔
    return Promise.all([
        deleteCollection(userRef.collection('accounts')),
        deleteCollection(userRef.collection('transactions')),
        userRef.collection('categories').doc('all').delete(),
        userRef.collection('budgets').doc('current').delete()
    ]);
}

// 刪除集合中的所有文檔
function deleteCollection(collectionRef) {
    return collectionRef.get()
        .then(snapshot => {
            if (snapshot.empty) return;
            
            const batch = db.batch();
            snapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            return batch.commit();
        });
}

// 匯出數據
function exportData() {
    const exportData = {
        accounts: appState.accounts,
        categories: appState.categories,
        transactions: appState.transactions,
        budgets: appState.budgets,
        version: '1.0'
    };
    
    const jsonData = JSON.stringify(exportData, null, 2);
    
    // 創建一個Blob對象
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // 創建一個下載鏈接
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance_export_${formatDateForFile(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    
    // 清理
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);
    
    // 顯示在文本框中
    document.getElementById('importData').value = jsonData;
    
    showToast('數據已匯出', 'success');
}

// 處理文件上傳
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('importData').value = e.target.result;
    };
    reader.readAsText(file);
}

// 匯入數據
function importData() {
    try {
        const jsonData = document.getElementById('importData').value;
        if (!jsonData) {
            showToast('請先選擇文件或輸入數據', 'warning');
            return;
        }
        
        const importedData = JSON.parse(jsonData);
        
        // 驗證數據
        if (!importedData.accounts || !importedData.categories || 
            !importedData.transactions || !importedData.budgets) {
            showToast('無效的數據格式', 'error');
            return;
        }
        
        // 確認匯入
        openModal('confirmModal');
        document.getElementById('confirmYesBtn').onclick = () => {
            // 更新應用狀態
            appState.accounts = importedData.accounts;
            appState.categories = importedData.categories;
            appState.transactions = importedData.transactions.map(t => {
                // 確保交易日期是Date對象
                if (t.date && typeof t.date === 'string') {
                    t.date = new Date(t.date);
                }
                return t;
            });
            appState.budgets = importedData.budgets;
            
            // 保存到本地存儲
            saveToLocalStorage();
            
            // 如果用戶已登入且在線，同步到Firebase
            if (appState.user && navigator.onLine) {
                syncData();
            }
            
            // 更新UI
            updateAllUI();
            
            closeModal('confirmModal');
            showToast('數據匯入成功', 'success');
        };
    } catch (error) {
        console.error('匯入數據失敗:', error);
        showToast('匯入失敗: ' + error.message, 'error');
    }
}

// 生成唯一ID
function generateId() {
    return Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

// 格式化數字
function formatNumber(number) {
    if (number === undefined || number === null) return '0';
    
    const decimalPlaces = appState.settings.decimalPlaces || 2;
    return parseFloat(number).toFixed(decimalPlaces);
}

// 格式化日期
function formatDate(date) {
    if (!date) return '';
    
    if (typeof date === 'string') {
        date = new Date(date);
    }
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (dateOnly.getTime() === today.getTime()) {
        return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else if (dateOnly.getTime() === yesterday.getTime()) {
        return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else {
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    }
}

// 格式化日期為文件名
function formatDateForFile(date) {
    return `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}`;
}

// 獲取貨幣符號
function getCurrencySymbol(currencyCode) {
    const symbols = {
        'HKD': '$',
        'USD': '$',
        'CNY': '¥',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥'
    };
    
    return symbols[currencyCode] || '$';
}

// 設置今天的日期作為默認值
document.addEventListener('DOMContentLoaded', function() {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    const datePickers = document.querySelectorAll('input[type="date"]');
    datePickers.forEach(picker => {
        if (picker.id === 'incomeDate' || picker.id === 'expenseDate') {
            picker.value = dateStr;
        }
    });
    
    // 初始化預算週期選擇
    document.querySelector('input[name="budgetCycle"][value="monthly"]').checked = true;
    
    // 初始化類別預算列表容器
    const categoryBudgetsList = document.getElementById('categoryBudgetsList');
    if (categoryBudgetsList) {
        categoryBudgetsList.innerHTML = '<p class="empty-state">尚未設置類別預算</p>';
    }
});

// 啟用視圖切換功能
document.addEventListener('DOMContentLoaded', function() {
    const viewToggles = document.querySelectorAll('.view-toggle span');
    viewToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const viewType = this.dataset.view;
            const container = this.closest('.view-toggle-container');
            
            // 更新active狀態
            container.querySelectorAll('.view-toggle span').forEach(span => {
                span.classList.remove('active');
            });
            this.classList.add('active');
            
            // 根據不同容器執行不同更新
            if (container.closest('#accountsSection')) {
                updateAccountsList();
            } else if (container.closest('#categoriesSection')) {
                updateCategoriesList();
            }
        });
    });
});

// 初始化日期過濾器
document.addEventListener('DOMContentLoaded', function() {
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    
    if (dateFrom && dateTo) {
        // 設置默認日期範圍為本月
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        dateFrom.valueAsDate = firstDayOfMonth;
        dateTo.valueAsDate = lastDayOfMonth;
        
        // 添加變更事件處理
        dateFrom.addEventListener('change', updateTransactionsList);
        dateTo.addEventListener('change', updateTransactionsList);
    }
    
    // 初始化類型和類別過濾器
    const typeFilter = document.getElementById('typeFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    
    if (typeFilter) {
        typeFilter.addEventListener('change', updateTransactionsList);
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', updateTransactionsList);
    }
});

// 全局錯誤處理
window.addEventListener('error', function(event) {
    console.error('全局錯誤:', event.error);
    showToast('發生錯誤: ' + (event.error?.message || '未知錯誤'), 'error');
});

// 導出核心功能為全局函數，以便HTML中的onclick調用
window.showSection = showSection;
window.openModal = openModal;
window.closeModal = closeModal;
window.editAccount = editAccount;
window.deleteAccount = deleteAccount;
window.editTransaction = editTransaction;
window.deleteTransaction = deleteTransaction;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
