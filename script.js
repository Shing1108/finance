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

// 使用純本地模式開關
const enableFirebase = localStorage.getItem('enableFirebase') !== 'false';  // 默認啟用

// Firebase 配置
const firebaseConfig = {
    apiKey: "AIzaSyAaqadmDSgQ-huvY7uNNrPtjFSOl93jVEE",
    authDomain: "finance-d8f9e.firebaseapp.com",
  databaseURL: "https://finance-d8f9e-default-rtdb.firebaseio.com",
  projectId: "finance-d8f9e",
  storageBucket: "finance-d8f9e.firebasestorage.app",
  messagingSenderId: "122645255279",
  appId: "1:122645255279:web:25d577b6365c819ffbe99a",
  measurementId: "G-ZCGNG1DRJS"
};

// 初始化 Firebase（完全禁用 WebChannel）
let db, auth;
if (enableFirebase) {
    try {
        if (typeof firebase !== 'undefined') {
            firebase.initializeApp(firebaseConfig);
            
            // 完全禁用 WebChannel，使用HTTP長輪詢
            firebase.firestore().settings({
                experimentalForceLongPolling: true,
                experimentalAutoDetectLongPolling: false,
                useFetchStreams: false,
                ignoreUndefinedProperties: true,
                cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
                merge: true
            });
            
            db = firebase.firestore();
            auth = firebase.auth();
            console.log("Firebase 初始化成功");
            
            // 設置全局錯誤處理
            firebase.firestore.setLogLevel('debug');
        } else {
            console.warn("Firebase SDK 未載入");
        }
    } catch (e) {
        console.error("Firebase 初始化失敗:", e);
        enableFirebase = false;
    }
}

// DOM 加載完成後初始化應用
document.addEventListener('DOMContentLoaded', initApp);

// 網絡狀態監控
window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);

// 安全獲取DOM元素的輔助函數
function getElement(selector) {
    const element = document.querySelector(selector);
    return element;
}

// 安全地添加事件監聽器
function safeAddEventListener(selector, event, handler) {
    const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (element) {
        element.addEventListener(event, handler);
        return true;
    } else {
        console.warn(`找不到元素: ${selector}`);
        return false;
    }
}

// 安全獲取所有指定選擇器的元素
function getAllElements(selector) {
    return Array.from(document.querySelectorAll(selector) || []);
}

// 初始化應用
function initApp() {
    console.log("初始化應用...");
    
    try {
        // 設置初始UI狀態
        setupUI();
        
        // 加載設置
        loadSettings();
        
        // 更新連接狀態
        updateConnectionStatus();
        
        // 從本地存儲加載數據作為初始數據
        loadFromLocalStorage();
        
        // 檢查是否可以使用 Firebase 認證
        if (enableFirebase && typeof auth !== 'undefined' && auth) {
            // 使用安全的Firebase操作
            safeFirebaseOperation(() => {
                if (!db) return Promise.reject(new Error('DB不可用'));
                return db.collection('users').doc('test').set({
                    testTime: firebase.firestore.FieldValue.serverTimestamp()
                });
            }).then(() => {
                console.log("Firebase連接測試成功");
            });
            
            // 檢查認證狀態
            checkAuthState();
        } else {
            console.log("Firebase 認證不可用，使用本地模式");
            updateAuthUI(false);
        }
        
        // 添加事件監聽器
        setTimeout(() => {
            try {
                setupEventListeners();
            } catch (e) {
                console.error("設置事件監聽器失敗:", e);
                // 嘗試後續設置
                setTimeout(setupEventListeners, 1000);
            }
        }, 100);
        
        console.log("應用初始化完成");
    } catch (e) {
        console.error("應用初始化過程中發生錯誤:", e);
    }
}

// 設置UI初始狀態
function setupUI() {
    try {
        hideAllSections();
        showSection('dashboard');
        updateNavActiveState('dashboard');
        
        // 設置模態框關閉按鈕
        getAllElements('.modal .close-btn, .modal .cancel-btn').forEach(button => {
            if (button) {
                button.addEventListener('click', () => {
                    const modal = button.closest('.modal');
                    if (modal) {
                        closeModal(modal.id);
                    }
                });
            }
        });
    } catch (e) {
        console.error("UI設置失敗:", e);
    }
}

// 添加事件監聽器
function setupEventListeners() {
    console.log("設置事件監聽器...");

    try {
        // 導航選項點擊
        getAllElements('nav a').forEach(navLink => {
            if (navLink) {
                navLink.addEventListener('click', function(e) {
                    e.preventDefault();
                    const target = this.getAttribute('data-target');
                    if (target) {
                        showSection(target);
                        updateNavActiveState(target);
                    }
                });
            }
        });
        
        // 設定按鈕點擊
        safeAddEventListener('#settingsBtn', 'click', () => {
            openModal('settingsModal');
            populateSettingsForm();
        });
        
        // 新增戶口按鈕點擊
        safeAddEventListener('#addAccountBtn', 'click', () => {
            openModal('addAccountModal');
            resetAccountForm();
        });
        
        // 保存戶口按鈕點擊
        safeAddEventListener('#saveAccountBtn', 'click', saveAccount);
        
        // 記賬表單提交
        const incomeForm = getElement('#incomeForm');
        if (incomeForm) {
            incomeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                saveTransaction('income');
            });
        }
        
        const expenseForm = getElement('#expenseForm');
        if (expenseForm) {
            expenseForm.addEventListener('submit', (e) => {
                e.preventDefault();
                saveTransaction('expense');
            });
        }
        
        // 轉賬按鈕點擊
        safeAddEventListener('#confirmTransferBtn', 'click', processTransfer);
        
        // 預算保存按鈕點擊
        safeAddEventListener('#saveBudgetSettingsBtn', 'click', saveBudgetSettings);
        
        // 添加類別預算按鈕點擊
        safeAddEventListener('#addCategoryBudgetBtn', 'click', addCategoryBudget);
        
        // 新增類別按鈕點擊
        safeAddEventListener('#addIncomeCategory', 'click', () => {
            openAddCategoryModal('income');
        });
        
        safeAddEventListener('#addExpenseCategory', 'click', () => {
            openAddCategoryModal('expense');
        });
        
        // 設置保存按鈕點擊
        safeAddEventListener('#saveSettingsBtn', 'click', saveSettings);
        
        // 清除數據按鈕點擊
        safeAddEventListener('#clearDataBtn', 'click', () => {
            openModal('confirmModal');
            const confirmYesBtn = getElement('#confirmYesBtn');
            if (confirmYesBtn) {
                confirmYesBtn.onclick = clearAllData;
            }
        });
        
        // 登入按鈕點擊
        safeAddEventListener('#loginBtn', 'click', signInWithGoogle);
        
        // 登出按鈕點擊
        safeAddEventListener('#logoutBtn', 'click', signOut);
        
        // 立即同步按鈕點擊
        safeAddEventListener('#syncNowBtn', 'click', syncData);
        
        // 數據匯出按鈕點擊
        safeAddEventListener('#exportDataBtn', 'click', exportData);
        
        // 數據匯入按鈕點擊
        safeAddEventListener('#importDataBtn', 'click', importData);
        
        // 從文件上傳按鈕點擊
        safeAddEventListener('#uploadFileBtn', 'click', () => {
            const fileInput = getElement('#fileInput');
            if (fileInput) {
                fileInput.click();
            }
        });
        
        const fileInput = getElement('#fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', handleFileUpload);
        }
        
        // 搜尋按鈕
        safeAddEventListener('#searchBtn', 'click', updateTransactionsList);
        
        // 視圖切換按鈕
        setupViewToggles();
        
        // 設置日期選擇器
        setupDatePickers();
        
        console.log("事件監聽器設置完成");
    } catch (e) {
        console.error("設置事件監聽器時發生錯誤:", e, e.stack);
    }
}

// 設置視圖切換
function setupViewToggles() {
    try {
        getAllElements('.view-toggle span').forEach(toggle => {
            if (toggle) {
                toggle.addEventListener('click', function() {
                    const viewType = this.dataset.view;
                    const container = this.closest('.view-toggle-container');
                    if (!container) return;
                    
                    // 更新active狀態
                    getAllElements('.view-toggle span', container).forEach(span => {
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
            }
        });
    } catch (e) {
        console.error("設置視圖切換失敗:", e);
    }
}

// 設置日期選擇器
function setupDatePickers() {
    try {
        const dateFrom = getElement('#dateFrom');
        const dateTo = getElement('#dateTo');
        
        if (dateFrom && dateTo) {
            // 設置默認日期範圍為本月
            const now = new Date();
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            
            try {
                dateFrom.valueAsDate = firstDayOfMonth;
                dateTo.valueAsDate = lastDayOfMonth;
            } catch (e) {
                console.warn("設置日期默認值失敗:", e);
                
                // 使用字符串格式嘗試
                const formatDate = (date) => {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                };
                
                dateFrom.value = formatDate(firstDayOfMonth);
                dateTo.value = formatDate(lastDayOfMonth);
            }
            
            // 添加變更事件處理
            dateFrom.addEventListener('change', updateTransactionsList);
            dateTo.addEventListener('change', updateTransactionsList);
        }
        
        // 初始化類型和類別過濾器
        const typeFilter = getElement('#typeFilter');
        const categoryFilter = getElement('#categoryFilter');
        
        if (typeFilter) {
            typeFilter.addEventListener('change', updateTransactionsList);
        }
        
        if (categoryFilter) {
            categoryFilter.addEventListener('change', updateTransactionsList);
        }
        
        // 設置交易表單日期為今天
        const today = new Date().toISOString().split('T')[0];
        
        const incomeDateInput = getElement('#incomeDate');
        const expenseDateInput = getElement('#expenseDate');
        
        if (incomeDateInput) incomeDateInput.value = today;
        if (expenseDateInput) expenseDateInput.value = today;
    } catch (e) {
        console.error("設置日期選擇器失敗:", e);
    }
}

// 更新連接狀態
function updateConnectionStatus() {
    try {
        const isOnline = navigator.onLine;
        appState.isOnline = isOnline;
        
        const statusElement = getElement('#connectionStatus');
        if (statusElement) {
            statusElement.textContent = isOnline ? '在線' : '離線';
            statusElement.className = isOnline ? 'status-online' : 'status-offline';
        }
        
        // 如果恢復在線並且用戶已登入，嘗試同步
        if (isOnline && appState.user && enableFirebase && typeof db !== 'undefined' && db) {
            syncData();
        }
    } catch (e) {
        console.error("更新連接狀態失敗:", e);
    }
}

// 檢查認證狀態
function checkAuthState() {
    try {
        if (!auth) {
            console.warn("Firebase 認證不可用");
            updateAuthUI(false);
            return;
        }
        
        auth.onAuthStateChanged(user => {
            try {
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
                    if (enableFirebase && typeof db !== 'undefined' && db) {
                        loadDataFromFirestore(user.uid);
                    }
                } else {
                    // 用戶未登入
                    appState.user = null;
                    updateAuthUI(false);
                    
                    // 從本地存儲加載數據
                    loadFromLocalStorage();
                }
            } catch (e) {
                console.error("處理認證狀態變更時出錯:", e);
                appState.user = null;
                updateAuthUI(false);
                loadFromLocalStorage();
            }
        });
    } catch (e) {
        console.error("檢查認證狀態失敗:", e);
        updateAuthUI(false);
    }
}

// 更新認證UI
function updateAuthUI(isLoggedIn) {
    try {
        const loginStatus = getElement('#loginStatus');
        const loginBtn = getElement('#loginBtn');
        const logoutBtn = getElement('#logoutBtn');
        const syncStatus = getElement('#syncStatus');
        const lastSyncTime = getElement('#lastSyncTime');
        
        if (loginStatus) {
            loginStatus.textContent = isLoggedIn ? (appState.user?.displayName || '已登入') : '未登入';
        }
        
        if (loginBtn) {
            loginBtn.style.display = isLoggedIn ? 'none' : 'block';
        }
        
        if (logoutBtn) {
            logoutBtn.style.display = isLoggedIn ? 'block' : 'none';
        }
        
        if (syncStatus) {
            syncStatus.textContent = isLoggedIn ? '已連接' : '未登入';
        }
        
        if (lastSyncTime) {
            if (isLoggedIn && appState.lastSyncTime) {
                lastSyncTime.textContent = formatDate(appState.lastSyncTime);
            } else {
                lastSyncTime.textContent = '從未同步';
            }
        }
    } catch (e) {
        console.error("更新認證UI失敗:", e);
    }
}

// 使用Google登入
function signInWithGoogle() {
    try {
        if (!enableFirebase || !auth) {
            showToast('Firebase 認證不可用，使用本地模式', 'warning');
            return;
        }
        
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider)
            .then(result => {
                showToast('登入成功', 'success');
            })
            .catch(error => {
                console.error('登入失敗:', error);
                showToast('登入失敗: ' + error.message, 'error');
            });
    } catch (e) {
        console.error("Google登入失敗:", e);
        showToast('登入過程發生錯誤', 'error');
    }
}

// 登出
function signOut() {
    try {
        if (!enableFirebase || !auth) {
            showToast('Firebase 認證不可用', 'error');
            return;
        }
        
        auth.signOut()
            .then(() => {
                showToast('已登出', 'info');
            })
            .catch(error => {
                console.error('登出失敗:', error);
                showToast('登出失敗: ' + error.message, 'error');
            });
    } catch (e) {
        console.error("登出失敗:", e);
        showToast('登出過程發生錯誤', 'error');
    }
}

// 從Firebase加載數據
function loadDataFromFirestore(userId) {
    try {
        if (!enableFirebase || !db) {
            console.warn("Firestore 不可用，使用本地模式");
            loadFromLocalStorage();
            return Promise.resolve();
        }
        
        // 檢查上次同步時間，避免頻繁同步
        const lastSyncStr = localStorage.getItem('lastSyncTime');
        const now = new Date();
        if (lastSyncStr) {
            const lastSync = new Date(lastSyncStr);
            const timeDiff = now - lastSync;
            // 如果上次同步在30分鐘內，直接使用本地數據
            if (timeDiff < 30 * 60 * 1000) {
                console.log('上次同步時間在30分鐘內，使用本地緩存');
                loadFromLocalStorage();
                return Promise.resolve();
            }
        }
        
        console.log('嘗試從Firestore加載數據...');
        
        // 檢查網絡連接
        if (!navigator.onLine) {
            console.log('設備處於離線狀態，使用本地數據');
            loadFromLocalStorage();
            return Promise.resolve();
        }
        
        // 顯示加載指示器
        showLoadingMessage('正在連接Firebase...');
        
        // 安全地嘗試匿名登入
        return safeFirebaseOperation(() => {
            if (!auth) return Promise.reject(new Error('Auth不可用'));
            
            // 如果用戶未登入，嘗試匿名登入
            if (!userId && auth) {
                return auth.signInAnonymously()
                    .then(userCred => userCred.user.uid);
            }
            return Promise.resolve(userId);
        }, userId)
        .then(confirmedUserId => {
            if (!confirmedUserId) {
                console.log('無法獲取用戶ID，使用本地數據');
                loadFromLocalStorage();
                hideLoadingMessage();
                return;
            }
            
            // 接下來使用確認過的用戶ID獲取數據
            return safeFirebaseOperation(() => {
                if (!db) return Promise.reject(new Error('DB不可用'));
                
                // 使用簡單的獲取方法，避免複雜查詢
                return db.collection('users').doc(confirmedUserId).get();
            })
            .then(doc => {
                if (doc && doc.exists) {
                    const userData = doc.data() || {};
                    
                    // 更新應用狀態
                    if (userData.accounts) appState.accounts = userData.accounts;
                    if (userData.categories) appState.categories = userData.categories;
                    if (userData.budgets) appState.budgets = userData.budgets;
                    
                    // 保存交易數據
                    if (userData.transactions) {
                        appState.transactions = userData.transactions.map(t => {
                            // 確保日期對象正確
                            if (t.date && typeof t.date !== 'object') {
                                t.date = new Date(t.date);
                            }
                            return t;
                        });
                    }
                    
                    // 保存到本地存儲
                    saveToLocalStorage();
                    
                    // 更新同步時間
                    appState.lastSyncTime = now;
                    localStorage.setItem('lastSyncTime', now.toString());
                } else {
                    console.log('用戶數據不存在，使用本地數據');
                    // 創建新用戶數據
                    loadFromLocalStorage();
                    syncData();
                }
                
                // 更新UI
                updateAllUI();
                hideLoadingMessage();
            });
        })
        .catch(error => {
            console.error('從Firebase加載數據失敗:', error);
            loadFromLocalStorage();
            hideLoadingMessage();
            return;
        });
    } catch (e) {
        console.error("從Firebase加載數據失敗:", e);
        loadFromLocalStorage();
        hideLoadingMessage();
        return Promise.resolve();
    }
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
    try {
        localStorage.setItem('categories', JSON.stringify(defaultCategories));
    } catch (e) {
        console.error('保存默認類別到本地失敗:', e);
    }
    return defaultCategories;
}

// 保存到本地存儲
function saveToLocalStorage(data) {
    try {
        if (!data) data = appState;
        
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
    try {
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
    } catch (e) {
        console.error("更新應用狀態失敗:", e);
    }
}

// 重設應用狀態
function resetAppState() {
    try {
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
    } catch (e) {
        console.error("重設應用狀態失敗:", e);
    }
}

// 更新所有UI元素
function updateAllUI() {
    try {
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
    } catch (e) {
        console.error("更新UI元素失敗:", e);
    }
}

// 更新戶口列表
function updateAccountsList() {
    try {
        const accountsContainer = getElement('#accountsList');
        if (!accountsContainer) return;
        
        if (appState.accounts.length === 0) {
            accountsContainer.innerHTML = '<p class="empty-state">尚未設置任何戶口</p>';
            return;
        }
        
        // 確定視圖模式
        const activeViewToggle = getElement('.view-toggle .active');
        const viewMode = activeViewToggle ? activeViewToggle.dataset.view : 'card';
        
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
    } catch (e) {
        console.error("更新戶口列表失敗:", e);
    }
}

// 更新戶口選項
function updateAccountOptions() {
    try {
        const accountSelects = getAllElements('.account-select');
        
        accountSelects.forEach(select => {
            if (!select) return;
            
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
    } catch (e) {
        console.error("更新戶口選項失敗:", e);
    }
}

// 更新類別選項
function updateCategoryOptions() {
    try {
        // 更新收入類別選項
        const incomeCategorySelect = getElement('#incomeCategory');
        if (incomeCategorySelect) {
            const currentValue = incomeCategorySelect.value;
            incomeCategorySelect.innerHTML = '<option value="">選擇類別</option>';
            
            appState.categories.income.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = `${category.icon || ''} ${category.name}`;
                option.style.color = category.color;
                incomeCategorySelect.appendChild(option);
            });
            
            // 還原之前選擇的值
            if (currentValue && appState.categories.income.some(c => c.id === currentValue)) {
                incomeCategorySelect.value = currentValue;
            }
        }
        
        // 更新支出類別選項
        const expenseCategorySelect = getElement('#expenseCategory');
        if (expenseCategorySelect) {
            const currentValue = expenseCategorySelect.value;
            expenseCategorySelect.innerHTML = '<option value="">選擇類別</option>';
            
            appState.categories.expense.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = `${category.icon || ''} ${category.name}`;
                option.style.color = category.color;
                expenseCategorySelect.appendChild(option);
            });
            
            // 還原之前選擇的值
            if (currentValue && appState.categories.expense.some(c => c.id === currentValue)) {
                expenseCategorySelect.value = currentValue;
            }
        }
        
        // 更新預算類別選項
        const budgetCategorySelect = getElement('#budgetCategory');
        if (budgetCategorySelect) {
            budgetCategorySelect.innerHTML = '<option value="">選擇類別</option>';
            
            appState.categories.expense.forEach(category => {
                // 檢查此類別是否已經有預算
                const hasExistingBudget = appState.budgets.categories && 
                    Array.isArray(appState.budgets.categories) && 
                    appState.budgets.categories.some(b => b.categoryId === category.id);
                
                if (!hasExistingBudget) {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = `${category.icon || ''} ${category.name}`;
                    budgetCategorySelect.appendChild(option);
                }
            });
        }
        
        // 更新類別管理列表
        updateCategoriesList();
    } catch (e) {
        console.error("更新類別選項失敗:", e);
    }
}

// 更新類別管理列表
function updateCategoriesList() {
    try {
        const incomeCategoriesList = getElement('#incomeCategoriesList');
        const expenseCategoriesList = getElement('#expenseCategoriesList');
        
        if (!incomeCategoriesList || !expenseCategoriesList) return;
        
        // 確定視圖模式
        const activeViewToggle = getElement('.categories-view-toggle .active');
        const viewMode = activeViewToggle ? activeViewToggle.dataset.view : 'card';
        
        // 收入類別
        if (!Array.isArray(appState.categories.income) || appState.categories.income.length === 0) {
            incomeCategoriesList.innerHTML = '<p class="empty-state">尚未設置收入類別</p>';
        } else {
            if (viewMode === 'card') {
                let html = '';
                appState.categories.income.forEach(category => {
                    html += `
                        <div class="category-card" data-id="${category.id}" style="border-color: ${category.color}">
                            <div class="category-icon" style="background-color: ${category.color}">${category.icon || '💰'}</div>
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
                            <td><span class="category-icon-small" style="background-color: ${category.color}">${category.icon || '💰'}</span></td>
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
        if (!Array.isArray(appState.categories.expense) || appState.categories.expense.length === 0) {
            expenseCategoriesList.innerHTML = '<p class="empty-state">尚未設置支出類別</p>';
        } else {
            if (viewMode === 'card') {
                let html = '';
                appState.categories.expense.forEach(category => {
                    html += `
                        <div class="category-card" data-id="${category.id}" style="border-color: ${category.color}">
                            <div class="category-icon" style="background-color: ${category.color}">${category.icon || '💸'}</div>
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
                            <td><span class="category-icon-small" style="background-color: ${category.color}">${category.icon || '💸'}</span></td>
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
    } catch (e) {
        console.error("更新類別列表失敗:", e);
    }
}

// 更新交易記錄
function updateTransactionsList() {
    try {
        const transactionsContainer = getElement('#transactionsList');
        if (!transactionsContainer) return;
        
        // 獲取篩選條件
        const dateFrom = getElement('#dateFrom')?.value;
        const dateTo = getElement('#dateTo')?.value;
        const typeFilter = getElement('#typeFilter')?.value;
        const categoryFilter = getElement('#categoryFilter')?.value;
        
        // 篩選交易
        let filteredTransactions = appState.transactions.slice();
        
        if (dateFrom) {
            const fromDate = new Date(dateFrom);
            filteredTransactions = filteredTransactions.filter(t => {
                const tDate = t.date instanceof Date ? t.date : new Date(t.date);
                return tDate >= fromDate;
            });
        }
        
        if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);  // 設置為當天的最後一毫秒
            filteredTransactions = filteredTransactions.filter(t => {
                const tDate = t.date instanceof Date ? t.date : new Date(t.date);
                return tDate <= toDate;
            });
        }
        
        if (typeFilter && typeFilter !== 'all') {
            filteredTransactions = filteredTransactions.filter(t => t.type === typeFilter);
        }
        
        if (categoryFilter && categoryFilter !== 'all') {
            filteredTransactions = filteredTransactions.filter(t => t.categoryId === categoryFilter);
        }
        
        // 排序：最新的交易在前
        filteredTransactions.sort((a, b) => {
            const dateA = a.date instanceof Date ? a.date : new Date(a.date);
            const dateB = b.date instanceof Date ? b.date : new Date(b.date);
            return dateB - dateA;
        });
        
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
            
            let category;
            if (transaction.type === 'income') {
                category = Array.isArray(appState.categories.income) ? 
                    appState.categories.income.find(c => c.id === transaction.categoryId) : null;
            } else {
                category = Array.isArray(appState.categories.expense) ? 
                    appState.categories.expense.find(c => c.id === transaction.categoryId) : null;
            }
            
            if (!category) {
                category = { name: '未知類別', icon: '❓', color: '#999' };
            }
            
            html += `
                <tr class="${transaction.type}-transaction" data-id="${transaction.id}">
                    <td>${formatDate(transaction.date)}</td>
                    <td>${transaction.type === 'income' ? '收入' : '支出'}</td>
                    <td>
                        <span class="category-icon-small" style="background-color: ${category.color}">${category.icon || '❓'}</span>
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
    } catch (e) {
        console.error("更新交易列表失敗:", e);
    }
}

// 更新今日交易
function updateTodayTransactions() {
    try {
        const todayTransactionsContainer = getElement('#todayTransactionsList');
        if (!todayTransactionsContainer) return;
        
        // 獲取今天的日期
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // 篩選今天的交易
        const todayTransactions = appState.transactions.filter(t => {
            const transactionDate = t.date instanceof Date ? t.date : new Date(t.date);
            transactionDate.setHours(0, 0, 0, 0);
            return transactionDate.getTime() === today.getTime();
        });
        
        if (todayTransactions.length === 0) {
            todayTransactionsContainer.innerHTML = '<p class="empty-state">今日尚無交易記錄</p>';
            return;
        }
        
        // 按時間排序，最新的在前
        todayTransactions.sort((a, b) => {
            const dateA = a.date instanceof Date ? a.date : new Date(a.date);
            const dateB = b.date instanceof Date ? b.date : new Date(b.date);
            return dateB - dateA;
        });
        
        // 生成今日交易列表
        let html = '';
        
        todayTransactions.forEach(transaction => {
            const account = appState.accounts.find(a => a.id === transaction.accountId) || { name: '未知戶口', currency: 'HKD' };
            
            let category;
            if (transaction.type === 'income') {
                category = Array.isArray(appState.categories.income) ? 
                    appState.categories.income.find(c => c.id === transaction.categoryId) : null;
            } else {
                category = Array.isArray(appState.categories.expense) ? 
                    appState.categories.expense.find(c => c.id === transaction.categoryId) : null;
            }
            
            if (!category) {
                category = { name: '未知類別', icon: '❓', color: '#999' };
            }
            
            html += `
                <div class="transaction-item ${transaction.type}" data-id="${transaction.id}">
                    <div class="transaction-category" style="background-color: ${category.color}">
                        ${category.icon || '❓'}
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
    } catch (e) {
        console.error("更新今日交易失敗:", e);
    }
}

// 更新儀表板摘要
function updateDashboardSummary() {
    try {
        // 計算總資產
        let totalAssets = 0;
        appState.accounts.forEach(account => {
            // 簡單處理：所有貨幣金額直接相加(實際應用中應該考慮匯率轉換)
            totalAssets += parseFloat(account.balance || 0);
        });
        
        // 獲取今天的日期
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // 計算今日收入和支出
        let todayIncome = 0;
        let todayExpense = 0;
        
        appState.transactions.forEach(transaction => {
            const transactionDate = transaction.date instanceof Date ? transaction.date : new Date(transaction.date);
            transactionDate.setHours(0, 0, 0, 0);
            
            if (transactionDate.getTime() === today.getTime()) {
                if (transaction.type === 'income') {
                    todayIncome += parseFloat(transaction.amount || 0);
                } else {
                    todayExpense += parseFloat(transaction.amount || 0);
                }
            }
        });
        
        // 更新UI
        const totalAssetsEl = getElement('#totalAssets');
        const todayIncomeEl = getElement('#todayIncome');
        const todayExpenseEl = getElement('#todayExpense');
        
        if (totalAssetsEl) totalAssetsEl.textContent = formatNumber(totalAssets);
        if (todayIncomeEl) todayIncomeEl.textContent = formatNumber(todayIncome);
        if (todayExpenseEl) todayExpenseEl.textContent = formatNumber(todayExpense);
    } catch (e) {
        console.error("更新儀表板摘要失敗:", e);
    }
}

// 更新預算狀態
function updateBudgetStatus() {
    try {
        const budgetStatusContainer = getElement('#budgetStatus');
        if (!budgetStatusContainer) return;
        
        // 檢查是否設置了預算
        const hasBudget = (appState.budgets.general > 0) || 
            (Array.isArray(appState.budgets.categories) && appState.budgets.categories.length > 0);
        
        if (!hasBudget) {
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
                totalExpense += parseFloat(transaction.amount || 0);
            }
        });
        
        // 計算總預算和用量
        const totalBudget = parseFloat(appState.budgets.general || 0) || calculateTotalCategoryBudgets();
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
        if (Array.isArray(appState.budgets.categories) && appState.budgets.categories.length > 0) {
            html += '<div class="category-budgets">';
            
            appState.budgets.categories.forEach(categoryBudget => {
                const category = Array.isArray(appState.categories.expense) ? 
                    appState.categories.expense.find(c => c.id === categoryBudget.categoryId) : null;
                
                if (!category) return;
                
                // 計算此類別的支出
                let categoryExpense = 0;
                currentPeriodTransactions.forEach(transaction => {
                    if (transaction.type === 'expense' && transaction.categoryId === categoryBudget.categoryId) {
                        categoryExpense += parseFloat(transaction.amount || 0);
                    }
                });
                
                const categoryUsagePercentage = parseFloat(categoryBudget.amount) > 0 
                    ? (categoryExpense / parseFloat(categoryBudget.amount)) * 100 
                    : 0;
                
                html += `
                    <div class="category-budget-item">
                        <div class="category-budget-header">
                            <span class="category-icon" style="background-color: ${category.color}">${category.icon || '❓'}</span>
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
    } catch (e) {
        console.error("更新預算狀態失敗:", e);
    }
}

// 獲取當前預算週期內的交易
function getCurrentPeriodTransactions() {
    try {
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
            const transactionDate = transaction.date instanceof Date ? 
                transaction.date : new Date(transaction.date);
            return transactionDate >= startDate;
        });
    } catch (e) {
        console.error("獲取當前預算週期內的交易失敗:", e);
        return [];
    }
}

// 計算類別預算總和
function calculateTotalCategoryBudgets() {
    try {
        if (!Array.isArray(appState.budgets.categories)) {
            return 0;
        }
        
        return appState.budgets.categories.reduce((total, budget) => {
            return total + parseFloat(budget.amount || 0);
        }, 0);
    } catch (e) {
        console.error("計算類別預算總和失敗:", e);
        return 0;
    }
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
    try {
        // 獲取當前月份
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        // 本月開始和結束日期
        const monthStart = new Date(currentYear, currentMonth, 1);
        const monthEnd = new Date(currentYear, currentMonth + 1, 0);
        
        // 篩選本月交易
        const monthTransactions = appState.transactions.filter(t => {
            const date = t.date instanceof Date ? t.date : new Date(t.date);
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
                incomeByCategory[categoryId] += parseFloat(transaction.amount || 0);
            } else {
                const categoryId = transaction.categoryId;
                if (!expenseByCategory[categoryId]) {
                    expenseByCategory[categoryId] = 0;
                }
                expenseByCategory[categoryId] += parseFloat(transaction.amount || 0);
            }
        });
        
        // 創建圖表數據
        const incomeData = [];
        for (const categoryId in incomeByCategory) {
            const category = Array.isArray(appState.categories.income) ? 
                appState.categories.income.find(c => c.id === categoryId) : null;
            
            if (category) {
                incomeData.push({
                    label: category.name,
                    value: incomeByCategory[categoryId],
                    color: category.color
                });
            } else {
                incomeData.push({
                    label: '未知類別',
                    value: incomeByCategory[categoryId],
                    color: '#999'
                });
            }
        }
        
        const expenseData = [];
        for (const categoryId in expenseByCategory) {
            const category = Array.isArray(appState.categories.expense) ? 
                appState.categories.expense.find(c => c.id === categoryId) : null;
            
            if (category) {
                expenseData.push({
                    label: category.name,
                    value: expenseByCategory[categoryId],
                    color: category.color
                });
            } else {
                expenseData.push({
                    label: '未知類別',
                    value: expenseByCategory[categoryId],
                    color: '#999'
                });
            }
        }
        
        // 排序數據：金額從大到小
        incomeData.sort((a, b) => b.value - a.value);
        expenseData.sort((a, b) => b.value - a.value);
        
        // 更新圖表
        updateChart('incomeChart', incomeData, '收入分佈');
        updateChart('expenseChart', expenseData, '支出分佈');
    } catch (e) {
        console.error("更新統計圖表失敗:", e);
    }
}

// 更新單個圖表
function updateChart(chartId, data, title) {
    try {
        const chartContainer = getElement(`#${chartId}`);
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
            
            html += `<path d="${pathData}" fill="${item.color || '#ccc'}"></path>`;
            
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
                    <span class="legend-color" style="background-color: ${item.color || '#ccc'}"></span>
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
    } catch (e) {
        console.error("更新圖表失敗:", e, "chartId:", chartId);
    }
}

// 更新財務健康指數
function updateFinancialHealthIndex() {
    try {
        const healthIndexContainer = getElement('#financialHealthIndex');
        const adviceContainer = getElement('#personalizedAdvice');
        
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
                totalIncome += parseFloat(transaction.amount || 0);
            } else {
                totalExpense += parseFloat(transaction.amount || 0);
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
            <span class="health-score">${Math.round(healthScore)}</span>
            <p class="health-level">${getHealthLevel(healthScore)}</p>
        `;
        
        // 生成個人化建議
        const advice = generateFinancialAdvice(healthScore, savingsRate, budgetAdherence, assetDiversity, expenseDiversity);
        adviceContainer.innerHTML = advice;
    } catch (e) {
        console.error("更新財務健康指數失敗:", e);
    }
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
    try {
        const hasBudget = (appState.budgets.general > 0) || 
            (Array.isArray(appState.budgets.categories) && appState.budgets.categories.length > 0);
            
        if (!hasBudget) {
            return 100; // 沒有設置預算，默認100%遵守
        }
        
        const currentPeriodTransactions = getCurrentPeriodTransactions();
        
        // 計算總支出
        let totalExpense = 0;
        currentPeriodTransactions.forEach(transaction => {
            if (transaction.type === 'expense') {
                totalExpense += parseFloat(transaction.amount || 0);
            }
        });
        
        // 總預算
        const totalBudget = parseFloat(appState.budgets.general || 0) || calculateTotalCategoryBudgets();
        
        // 預算遵守率
        return totalBudget > 0 ? Math.min(100, (1 - Math.max(0, totalExpense - totalBudget) / totalBudget) * 100) : 100;
    } catch (e) {
        console.error("計算預算遵守率失敗:", e);
        return 100;
    }
}

// 計算資產多樣性
function calculateAssetDiversity() {
    return appState.accounts.length;
}

// 計算支出多樣性 (使用香農熵的簡化版本)
function calculateExpenseDiversity() {
    try {
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
                categories[categoryId] += parseFloat(transaction.amount || 0);
                totalExpense += parseFloat(transaction.amount || 0);
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
        const categoryCount = Object.keys(categories).length || 1;
        const maxEntropy = Math.log(categoryCount);
        return maxEntropy > 0 ? entropy / maxEntropy : 0;
    } catch (e) {
        console.error("計算支出多樣性失敗:", e);
        return 0;
    }
}

// 獲取過去n個月的交易數據
function getLastMonthsData(months) {
    try {
        const now = new Date();
        const startDate = new Date();
        startDate.setMonth(now.getMonth() - months);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        
        return appState.transactions.filter(transaction => {
            const date = transaction.date instanceof Date ? 
                transaction.date : new Date(transaction.date);
            return date >= startDate;
        });
    } catch (e) {
        console.error("獲取過去月份數據失敗:", e);
        return [];
    }
}

// 生成財務建議
function generateFinancialAdvice(score, savingsRate, budgetAdherence, assetDiversity, expenseDiversity) {
    try {
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
    } catch (e) {
        console.error("生成財務建議失敗:", e);
        return '<p class="error">無法生成建議</p>';
    }
}

// 更新個人化建議
function updatePersonalizedAdvice() {
    // 實現已包含在updateFinancialHealthIndex函數中
}

// 顯示加載訊息
function showLoadingMessage(message) {
    try {
        let loadingEl = getElement('#loadingMessage');
        if (!loadingEl) {
            // 如果元素不存在，創建一個
            const newLoadingEl = document.createElement('div');
            newLoadingEl.id = 'loadingMessage';
            newLoadingEl.className = 'loading-message';
            document.body.appendChild(newLoadingEl);
            loadingEl = newLoadingEl;
        }
        
        loadingEl.textContent = message;
        loadingEl.style.display = 'block';
    } catch (e) {
        console.error("顯示加載訊息失敗:", e);
    }
}

// 隱藏加載訊息
function hideLoadingMessage() {
    try {
        const loadingEl = getElement('#loadingMessage');
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }
    } catch (e) {
        console.error("隱藏加載訊息失敗:", e);
    }
}

// 顯示通知Toast
function showToast(message, type = 'info') {
    try {
        let toastContainer = getElement('#toastContainer');
        if (!toastContainer) {
            const container = document.createElement('div');
            container.id = 'toastContainer';
            document.body.appendChild(container);
            toastContainer = container;
        }
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
        // 3秒後自動移除
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 3000);
    } catch (e) {
        console.error("顯示通知失敗:", e);
    }
}

// 顯示指定選項卡
function showSection(sectionId) {
    try {
        // 隱藏所有選項卡
        getAllElements('.content-section').forEach(section => {
            if (section) {
                section.style.display = 'none';
            }
        });
        
        // 顯示指定選項卡
        const targetSection = getElement(`#${sectionId}Section`);
        if (targetSection) {
            targetSection.style.display = 'block';
        } else {
            console.warn(`找不到選項卡: #${sectionId}Section`);
        }
        
        // 更新導航狀態
        updateNavActiveState(sectionId);
    } catch (e) {
        console.error("顯示選項卡失敗:", e);
    }
}

// 隱藏所有選項卡
function hideAllSections() {
    try {
        getAllElements('.content-section').forEach(section => {
            if (section) {
                section.style.display = 'none';
            }
        });
    } catch (e) {
        console.error("隱藏所有選項卡失敗:", e);
    }
}

// 更新導航活動狀態
function updateNavActiveState(activeId) {
    try {
        getAllElements('nav a').forEach(link => {
            if (!link) return;
            
            if (link.getAttribute('data-target') === activeId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    } catch (e) {
        console.error("更新導航活動狀態失敗:", e);
    }
}

// 打開模態框
function openModal(modalId) {
    try {
        const modal = getElement(`#${modalId}`);
        if (modal) {
            modal.style.display = 'flex';
        } else {
            console.warn(`找不到模態框: #${modalId}`);
        }
    } catch (e) {
        console.error("打開模態框失敗:", e);
    }
}

// 關閉模態框
function closeModal(modalId) {
    try {
        const modal = getElement(`#${modalId}`);
        if (modal) {
            modal.style.display = 'none';
        }
    } catch (e) {
        console.error("關閉模態框失敗:", e);
    }
}

// 重置戶口表單
function resetAccountForm() {
    try {
        const accountForm = getElement('#accountForm');
        if (accountForm) {
            accountForm.reset();
        }
        
        const accountIdField = getElement('#accountId');
        if (accountIdField) {
            accountIdField.value = '';
        }
    } catch (e) {
        console.error("重置戶口表單失敗:", e);
    }
}

// 保存戶口
function saveAccount() {
    try {
        const accountId = getElement('#accountId')?.value;
        const name = getElement('#accountName')?.value.trim();
        const type = getElement('#accountType')?.value;
        const initialBalance = parseFloat(getElement('#initialBalance')?.value) || 0;
        const currency = getElement('#accountCurrency')?.value;
        const note = getElement('#accountNote')?.value.trim();
        
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
        if (enableFirebase && appState.user && navigator.onLine && db) {
            syncAccount(account);
        }
        updateAllUI();
        
        // 關閉模態框
        closeModal('addAccountModal');
    } catch (e) {
        console.error("保存戶口失敗:", e);
        showToast('保存戶口時發生錯誤', 'error');
    }
}

// 編輯戶口
function editAccount(accountId) {
    try {
        const account = appState.accounts.find(a => a.id === accountId);
        if (!account) {
            showToast('找不到指定戶口', 'error');
            return;
        }
        
        // 填充表單
        const accountIdField = getElement('#accountId');
        const accountNameField = getElement('#accountName');
        const accountTypeField = getElement('#accountType');
        const initialBalanceField = getElement('#initialBalance');
        const accountCurrencyField = getElement('#accountCurrency');
        const accountNoteField = getElement('#accountNote');
        
        if (accountIdField) accountIdField.value = account.id;
        if (accountNameField) accountNameField.value = account.name;
        if (accountTypeField) accountTypeField.value = account.type;
        if (initialBalanceField) initialBalanceField.value = account.balance;
        if (accountCurrencyField) accountCurrencyField.value = account.currency;
        if (accountNoteField) accountNoteField.value = account.note || '';
        
        // 打開模態框
        openModal('addAccountModal');
    } catch (e) {
        console.error("編輯戶口失敗:", e);
        showToast('編輯戶口時發生錯誤', 'error');
    }
}

// 刪除戶口
function deleteAccount(accountId) {
    try {
        // 確認刪除
        openModal('confirmModal');
        const confirmYesBtn = getElement('#confirmYesBtn');
        if (confirmYesBtn) {
            confirmYesBtn.onclick = () => {
                try {
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
                        if (enableFirebase && appState.user && navigator.onLine && db) {
                            deleteAccountFromFirestore(accountId);
                        }
                        updateAllUI();
                    }
                    closeModal('confirmModal');
                } catch (e) {
                    console.error("刪除戶口處理失敗:", e);
                    showToast('刪除戶口時發生錯誤', 'error');
                    closeModal('confirmModal');
                }
            };
        }
    } catch (e) {
        console.error("刪除戶口失敗:", e);
        showToast('刪除戶口時發生錯誤', 'error');
    }
}

// 處理轉賬
function processTransfer() {
    try {
        const fromAccountId = getElement('#fromAccount')?.value;
        const toAccountId = getElement('#toAccount')?.value;
        const amount = parseFloat(getElement('#transferAmount')?.value);
        
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
        
        if (!fromAccount || !toAccount) {
            showToast('找不到指定戶口', 'error');
            return;
        }
        
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
        if (enableFirebase && appState.user && navigator.onLine && db) {
            syncAccount(fromAccount);
            syncAccount(toAccount);
            syncTransaction(transferOut);
            syncTransaction(transferIn);
        }
        updateAllUI();
        
        // 重置表單
        const transferForm = getElement('#transferForm');
        if (transferForm) transferForm.reset();
        
        showToast('轉賬完成', 'success');
    } catch (e) {
        console.error("處理轉賬失敗:", e);
        showToast('處理轉賬時發生錯誤', 'error');
    }
}

// 保存交易
function saveTransaction(type) {
    try {
        const form = getElement(`#${type}Form`);
        const accountId = getElement(`#${type}Account`)?.value;
        const categoryId = getElement(`#${type}Category`)?.value;
        const amount = parseFloat(getElement(`#${type}Amount`)?.value);
        const dateStr = getElement(`#${type}Date`)?.value;
        const note = getElement(`#${type}Note`)?.value.trim();
        
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
        if (enableFirebase && appState.user && navigator.onLine && db) {
            syncAccount(account);
            syncTransaction(transaction);
        }
        updateAllUI();
        
        // 重置表單
        if (form) form.reset();
        
        // 重設為今天的日期
        const today = new Date().toISOString().split('T')[0];
        const dateInput = getElement(`#${type}Date`);
        if (dateInput) dateInput.value = today;
        
        showToast(`已記錄${type === 'income' ? '收入' : '支出'}`, 'success');
    } catch (e) {
        console.error("保存交易失敗:", e);
        showToast('保存交易時發生錯誤', 'error');
    }
}

// 編輯交易
function editTransaction(transactionId) {
    // 此函數將在未來實現
    showToast('編輯交易功能即將推出', 'info');
}

// 刪除交易
function deleteTransaction(transactionId) {
    try {
        // 確認刪除
        openModal('confirmModal');
        const confirmYesBtn = getElement('#confirmYesBtn');
        if (confirmYesBtn) {
            confirmYesBtn.onclick = () => {
                try {
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
                        if (enableFirebase && appState.user && navigator.onLine && db) {
                            if (account) syncAccount(account);
                            deleteTransactionFromFirestore(transactionId);
                        }
                        updateAllUI();
                        
                        showToast('交易已刪除', 'success');
                    }
                    closeModal('confirmModal');
                } catch (e) {
                    console.error("刪除交易處理失敗:", e);
                    showToast('刪除交易時發生錯誤', 'error');
                    closeModal('confirmModal');
                }
            };
        }
    } catch (e) {
        console.error("刪除交易失敗:", e);
        showToast('刪除交易時發生錯誤', 'error');
    }
}

// 保存預算設置
function saveBudgetSettings() {
    try {
        const generalBudget = parseFloat(getElement('#generalBudget')?.value) || 0;
        const cycleRadios = document.getElementsByName('budgetCycle');
        let cycle = 'monthly';
        for (let i = 0; i < cycleRadios.length; i++) {
            if (cycleRadios[i].checked) {
                cycle = cycleRadios[i].value;
                break;
            }
        }
        
        const resetDay = parseInt(getElement('#budgetResetDay')?.value) || 1;
        const inheritPrevious = getElement('#inheritPrevious')?.checked || false;
        
        appState.budgets.general = generalBudget;
        appState.budgets.cycle = cycle;
        appState.budgets.resetDay = resetDay;
        appState.budgets.inheritPrevious = inheritPrevious;
        
        saveToLocalStorage();
        if (enableFirebase && appState.user && navigator.onLine && db) {
            syncBudgets();
        }
        updateBudgetStatus();
        showToast('預算設置已保存', 'success');
    } catch (e) {
        console.error("保存預算設置失敗:", e);
        showToast('保存預算設置時發生錯誤', 'error');
    }
}

// 添加類別預算
function addCategoryBudget() {
    try {
        const categoryId = getElement('#budgetCategory')?.value;
        const amount = parseFloat(getElement('#categoryBudgetAmount')?.value);
        
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
        
        // 確保類別預算陣列存在
        if (!Array.isArray(appState.budgets.categories)) {
            appState.budgets.categories = [];
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
        if (enableFirebase && appState.user && navigator.onLine && db) {
            syncBudgets();
        }
        updateBudgetStatus();
        
        // 更新類別預算選項
        updateCategoryOptions();
        
        // 重置表單
        const categoryBudgetForm = getElement('#categoryBudgetForm');
        if (categoryBudgetForm) categoryBudgetForm.reset();
        
        showToast('類別預算已添加', 'success');
    } catch (e) {
        console.error("添加類別預算失敗:", e);
        showToast('添加類別預算時發生錯誤', 'error');
    }
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
    try {
        // 確認刪除
        openModal('confirmModal');
        const confirmYesBtn = getElement('#confirmYesBtn');
        if (confirmYesBtn) {
            confirmYesBtn.onclick = () => {
                try {
                    // 檢查是否有與此類別關聯的交易
                    const relatedTransactions = appState.transactions.filter(t => t.categoryId === categoryId);
                    if (relatedTransactions.length > 0) {
                        showToast(`無法刪除：此類別有${relatedTransactions.length}筆相關交易記錄`, 'error');
                        closeModal('confirmModal');
                        return;
                    }
                    
                    // 檢查是否有與此類別關聯的預算
                    if (Array.isArray(appState.budgets.categories) && 
                        appState.budgets.categories.some(b => b.categoryId === categoryId)) {
                        const index = appState.budgets.categories.findIndex(b => b.categoryId === categoryId);
                        if (index !== -1) {
                            appState.budgets.categories.splice(index, 1);
                        }
                    }
                    
                    // 刪除類別
                    if (type === 'income' && Array.isArray(appState.categories.income)) {
                        const index = appState.categories.income.findIndex(c => c.id === categoryId);
                        if (index !== -1) {
                            appState.categories.income.splice(index, 1);
                        }
                    } else if (type === 'expense' && Array.isArray(appState.categories.expense)) {
                        const index = appState.categories.expense.findIndex(c => c.id === categoryId);
                        if (index !== -1) {
                            appState.categories.expense.splice(index, 1);
                        }
                    }
                    
                    // 保存數據並更新UI
                    saveToLocalStorage();
                    if (enableFirebase && appState.user && navigator.onLine && db) {
                        syncCategories();
                        syncBudgets();
                    }
                    updateAllUI();
                    
                    showToast('類別已刪除', 'success');
                    closeModal('confirmModal');
                } catch (e) {
                    console.error("刪除類別處理失敗:", e);
                    showToast('刪除類別時發生錯誤', 'error');
                    closeModal('confirmModal');
                }
            };
        }
    } catch (e) {
        console.error("刪除類別失敗:", e);
        showToast('刪除類別時發生錯誤', 'error');
    }
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
    try {
        // 界面設置
        const darkModeCheckbox = getElement('#darkMode');
        if (darkModeCheckbox) darkModeCheckbox.checked = appState.settings.darkMode;
        
        // 字體大小
        const fontSizeRadios = document.getElementsByName('fontSize');
        for (let i = 0; i < fontSizeRadios.length; i++) {
            if (fontSizeRadios[i].value === appState.settings.fontSize) {
                fontSizeRadios[i].checked = true;
                break;
            }
        }
        
        const enableFirebaseSyncCheckbox = getElement('#enableFirebaseSync');
        if (enableFirebaseSyncCheckbox) enableFirebaseSyncCheckbox.checked = enableFirebase;
        
        // 貨幣設置
        const currencySelect = getElement('#defaultCurrency');
        if (currencySelect) currencySelect.value = appState.settings.currency;
        
        // 小數點位數
        const decimalPlacesRadios = document.getElementsByName('decimalPlaces');
        for (let i = 0; i < decimalPlacesRadios.length; i++) {
            if (parseInt(decimalPlacesRadios[i].value) === appState.settings.decimalPlaces) {
                decimalPlacesRadios[i].checked = true;
                break;
            }
        }
        
        // 通知設置
        const enableBudgetAlertsCheckbox = getElement('#enableBudgetAlerts');
        if (enableBudgetAlertsCheckbox) enableBudgetAlertsCheckbox.checked = appState.settings.enableBudgetAlerts;
        
        const budgetAlertThresholdInput = getElement('#budgetAlertThreshold');
        if (budgetAlertThresholdInput) budgetAlertThresholdInput.value = appState.settings.budgetAlertThreshold;
    } catch (e) {
        console.error("填充設置表單失敗:", e);
    }
}

// 保存設置
function saveSettings() {
    try {
        // 收集表單數據
        const darkMode = getElement('#darkMode')?.checked || false;
        
        // 獲取選中的字體大小
        let fontSize = 'medium';
        const fontSizeRadios = document.getElementsByName('fontSize');
        for (let i = 0; i < fontSizeRadios.length; i++) {
            if (fontSizeRadios[i].checked) {
                fontSize = fontSizeRadios[i].value;
                break;
            }
        }
        
        const currency = getElement('#defaultCurrency')?.value || 'HKD';
        
        // 獲取選中的小數點位數
        let decimalPlaces = 2;
        const decimalPlacesRadios = document.getElementsByName('decimalPlaces');
        for (let i = 0; i < decimalPlacesRadios.length; i++) {
            if (decimalPlacesRadios[i].checked) {
                decimalPlaces = parseInt(decimalPlacesRadios[i].value);
                break;
            }
        }
        const newEnableFirebase = getElement('#enableFirebaseSync')?.checked || false;
if (newEnableFirebase !== enableFirebase) {
    enableFirebase = newEnableFirebase;
    localStorage.setItem('enableFirebase', enableFirebase.toString());
    // 如果啟用了 Firebase，嘗試重新初始化
    if (enableFirebase && !db && typeof firebase !== 'undefined') {
        try {
            firebase.initializeApp(firebaseConfig);
            firebase.firestore().settings({
                experimentalForceLongPolling: true,
                experimentalAutoDetectLongPolling: false,
                useFetchStreams: false,
                ignoreUndefinedProperties: true,
                cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
                merge: true
            });
            db = firebase.firestore();
            auth = firebase.auth();
            console.log("Firebase 重新初始化成功");
        } catch (e) {
            console.error("Firebase 重新初始化失敗:", e);
        }
    }
}
        
        const enableBudgetAlerts = getElement('#enableBudgetAlerts')?.checked || false;
        const budgetAlertThreshold = parseInt(getElement('#budgetAlertThreshold')?.value) || 80;
        
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
    } catch (e) {
        console.error("保存設置失敗:", e);
        showToast('保存設置時發生錯誤', 'error');
    }
}

// 應用設置
function applySettings() {
    try {
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
        getAllElements('.currency-symbol').forEach(el => {
            if (el) el.textContent = appState.settings.currencySymbol;
        });
    } catch (e) {
        console.error("應用設置失敗:", e);
    }
}

// 清除所有數據
function clearAllData() {
    try {
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
        if (enableFirebase && appState.user && navigator.onLine && db) {
            clearFirestoreData();
        }
        
        updateAllUI();
        
        closeModal('confirmModal');
        showToast('所有數據已清除', 'info');
    } catch (e) {
        console.error("清除所有數據失敗:", e);
        showToast('清除數據時發生錯誤', 'error');
    }
}

// 同步數據
function syncData() {
    try {
        if (!enableFirebase) {
            showToast('Firebase功能已禁用，使用本地模式', 'warning');
            return;
        }
        
        if (!navigator.onLine) {
            showToast('離線狀態無法同步', 'warning');
            return;
        }
        
        if (!auth || !db) {
            showToast('Firebase 未初始化或不可用，使用本地模式', 'warning');
            return;
        }
        
        showLoadingMessage('同步中...');
        
        // 確保用戶已登入
        safeFirebaseOperation(() => {
            if (!auth.currentUser) {
                return auth.signInAnonymously();
            }
            return Promise.resolve({ user: auth.currentUser });
        })
        .then(result => {
            if (!result || !result.user) {
                throw new Error('用戶未登入');
            }
            
            const userId = result.user.uid;
            
            // 簡化同步，將所有數據合併到一個文檔
            return safeFirebaseOperation(() => {
                return db.collection('users').doc(userId).set({
                    accounts: appState.accounts,
                    categories: appState.categories,
                    transactions: appState.transactions,
                    budgets: appState.budgets,
                    lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            });
        })
        .then(() => {
            appState.lastSyncTime = new Date();
            localStorage.setItem('lastSyncTime', appState.lastSyncTime.toString());
            
            const lastSyncTimeEl = getElement('#lastSyncTime');
            if (lastSyncTimeEl) {
                lastSyncTimeEl.textContent = formatDate(appState.lastSyncTime);
            }
            
            hideLoadingMessage();
            showToast('數據同步完成', 'success');
        })
        .catch(error => {
            console.error('同步失敗:', error);
            hideLoadingMessage();
            showToast('同步失敗: ' + (error.message || '未知錯誤') + '，使用本地模式', 'error');
        });
    } catch (e) {
        console.error("同步數據失敗:", e);
        hideLoadingMessage();
        showToast('同步數據時發生錯誤，使用本地模式', 'error');
    }
}

// 同步所有戶口
function syncAccounts() {
    try {
        if (!enableFirebase || !appState.user || !db) return Promise.reject(new Error('未登入或Firebase未初始化'));
        
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
    } catch (e) {
        console.error("同步所有戶口失敗:", e);
        return Promise.reject(e);
    }
}

// 同步單個戶口
function syncAccount(account) {
    try {
        if (!enableFirebase || !appState.user || !navigator.onLine || !db) return;
        
        const userId = appState.user.uid;
        const accountRef = db.collection('users').doc(userId).collection('accounts').doc(account.id);
        
        accountRef.set(account)
            .catch(error => {
                console.error('同步戶口失敗:', error);
            });
    } catch (e) {
        console.error("同步單個戶口失敗:", e);
    }
}

// 從Firestore刪除戶口
function deleteAccountFromFirestore(accountId) {
    try {
        if (!enableFirebase || !appState.user || !navigator.onLine || !db) return;
        
        const userId = appState.user.uid;
        const accountRef = db.collection('users').doc(userId).collection('accounts').doc(accountId);
        
        accountRef.delete()
            .catch(error => {
                console.error('刪除Firestore戶口失敗:', error);
            });
    } catch (e) {
        console.error("從Firestore刪除戶口失敗:", e);
    }
}

// 同步所有類別
function syncCategories() {
    try {
        if (!enableFirebase || !appState.user || !db) return Promise.reject(new Error('未登入或Firebase未初始化'));
        
        const userId = appState.user.uid;
        const categoriesRef = db.collection('users').doc(userId).collection('categories').doc('all');
        
        return categoriesRef.set(appState.categories);
    } catch (e) {
        console.error("同步所有類別失敗:", e);
        return Promise.reject(e);
    }
}

// 同步所有交易
function syncTransactions() {
    try {
        if (!enableFirebase || !appState.user || !db) return Promise.reject(new Error('未登入或Firebase未初始化'));
        
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
                let batchCount = 0;
                const batchLimit = 500; // Firestore的批量寫入限制
                let batchPromises = [];
                
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
                        batchCount++;
                    }
                    
                    // 當達到批量寫入限制時，提交當前批次並創建新批次
                    if (batchCount >= batchLimit) {
                        batchPromises.push(batch.commit());
                        batch = db.batch();
                        batchCount = 0;
                    }
                    
                    // 刪除處理過的交易，剩下的就是需要刪除的
                    delete serverTransactions[transaction.id];
                });
                
                // 處理那些需要從本地刪除的交易
                for (const id in serverTransactions) {
                    batch.delete(transactionsRef.doc(id));
                    batchCount++;
                    
                    // 當達到批量寫入限制時，提交當前批次並創建新批次
                    if (batchCount >= batchLimit) {
                        batchPromises.push(batch.commit());
                        batch = db.batch();
                        batchCount = 0;
                    }
                }
                
                // 提交最後的批次
                if (batchCount > 0) {
                    batchPromises.push(batch.commit());
                }
                
                return Promise.all(batchPromises);
            });
    } catch (e) {
        console.error("同步所有交易失敗:", e);
        return Promise.reject(e);
    }
}

// 同步單個交易
function syncTransaction(transaction) {
    try {
        if (!enableFirebase || !appState.user || !navigator.onLine || !db) return;
        
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
    } catch (e) {
        console.error("同步單個交易失敗:", e);
    }
}

// 從Firestore刪除交易
function deleteTransactionFromFirestore(transactionId) {
    try {
        if (!enableFirebase || !appState.user || !navigator.onLine || !db) return;
        
        const userId = appState.user.uid;
        const transactionRef = db.collection('users').doc(userId).collection('transactions').doc(transactionId);
        
        transactionRef.delete()
            .catch(error => {
                console.error('刪除Firestore交易失敗:', error);
            });
    } catch (e) {
        console.error("從Firestore刪除交易失敗:", e);
    }
}

// 同步所有預算
function syncBudgets() {
    try {
        if (!enableFirebase || !appState.user || !db) return Promise.reject(new Error('未登入或Firebase未初始化'));
        
        const userId = appState.user.uid;
        const budgetsRef = db.collection('users').doc(userId).collection('budgets').doc('current');
        
        return budgetsRef.set(appState.budgets);
    } catch (e) {
        console.error("同步所有預算失敗:", e);
        return Promise.reject(e);
    }
}

// 清除Firestore數據
function clearFirestoreData() {
    try {
        if (!enableFirebase || !appState.user || !navigator.onLine || !db) return Promise.reject(new Error('未登入或離線'));
        
        const userId = appState.user.uid;
        const userRef = db.collection('users').doc(userId);
        
        // 由於Firestore不支持直接刪除集合，我們需要批量刪除文檔
        return Promise.all([
            deleteCollection(userRef.collection('accounts')),
            deleteCollection(userRef.collection('transactions')),
            userRef.collection('categories').doc('all').delete(),
            userRef.collection('budgets').doc('current').delete()
        ]);
    } catch (e) {
        console.error("清除Firestore數據失敗:", e);
        return Promise.reject(e);
    }
}

// 刪除集合中的所有文檔
function deleteCollection(collectionRef) {
    try {
        return collectionRef.get()
            .then(snapshot => {
                if (snapshot.empty) return;
                
                const batch = db.batch();
                let batchCount = 0;
                const batchLimit = 500; // Firestore的批量寫入限制
                let batchPromises = [];
                
                snapshot.forEach(doc => {
                    batch.delete(doc.ref);
                    batchCount++;
                    
                    // 當達到批量寫入限制時，提交當前批次並創建新批次
                    if (batchCount >= batchLimit) {
                        batchPromises.push(batch.commit());
                        batch = db.batch();
                        batchCount = 0;
                    }
                });
                
                // 提交最後的批次
                if (batchCount > 0) {
                    batchPromises.push(batch.commit());
                }
                
                return Promise.all(batchPromises);
            });
    } catch (e) {
        console.error("刪除集合中的所有文檔失敗:", e);
        return Promise.reject(e);
    }
}

// 匯出數據
function exportData() {
    try {
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
        const importDataEl = getElement('#importData');
        if (importDataEl) {
            importDataEl.value = jsonData;
        }
        
        showToast('數據已匯出', 'success');
    } catch (e) {
        console.error("匯出數據失敗:", e);
        showToast('匯出數據時發生錯誤', 'error');
    }
}

// 處理文件上傳
function handleFileUpload(event) {
    try {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const importDataEl = getElement('#importData');
            if (importDataEl) {
                importDataEl.value = e.target.result;
            }
        };
        reader.readAsText(file);
    } catch (e) {
        console.error("處理文件上傳失敗:", e);
        showToast('處理文件上傳時發生錯誤', 'error');
    }
}

// 匯入數據
function importData() {
    try {
        const importDataEl = getElement('#importData');
        const jsonData = importDataEl ? importDataEl.value : '';
        
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
        const confirmYesBtn = getElement('#confirmYesBtn');
        if (confirmYesBtn) {
            confirmYesBtn.onclick = () => {
                try {
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
                    if (enableFirebase && appState.user && navigator.onLine && db) {
                        syncData();
                    }
                    
                    // 更新UI
                    updateAllUI();
                    
                    closeModal('confirmModal');
                    showToast('數據匯入成功', 'success');
                } catch (e) {
                    console.error("處理匯入數據失敗:", e);
                    showToast('處理匯入數據時發生錯誤', 'error');
                    closeModal('confirmModal');
                }
            };
        }
    } catch (error) {
        console.error('匯入數據失敗:', error);
        showToast('匯入失敗: ' + (error.message || '數據格式不正確'), 'error');
    }
}

// 生成唯一ID
function generateId() {
    try {
        return Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    } catch (e) {
        console.error("生成唯一ID失敗:", e);
        // 備用ID生成方法
        return 'id_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    }
}

// 格式化數字
function formatNumber(number) {
    try {
        if (number === undefined || number === null) return '0';
        
        const decimalPlaces = appState.settings.decimalPlaces || 2;
        return parseFloat(number).toFixed(decimalPlaces);
    } catch (e) {
        console.error("格式化數字失敗:", e);
        return '0';
    }
}

// 格式化日期
function formatDate(date) {
    try {
        if (!date) return '';
        
        if (typeof date === 'string') {
            date = new Date(date);
        }
        
        // 確保date是有效的Date對象
        if (!(date instanceof Date) || isNaN(date.getTime())) {
            return '';
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
    } catch (e) {
        console.error("格式化日期失敗:", e);
        return '';
    }
}

// 格式化日期為文件名
function formatDateForFile(date) {
    try {
        return `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}`;
    } catch (e) {
        console.error("格式化日期為文件名失敗:", e);
        return Date.now().toString();
    }
}

// 獲取貨幣符號
function getCurrencySymbol(currencyCode) {
    try {
        const symbols = {
            'HKD': '$',
            'USD': '$',
            'CNY': '¥',
            'EUR': '€',
            'GBP': '£',
            'JPY': '¥'
        };
        
        return symbols[currencyCode] || '$';
    } catch (e) {
        console.error("獲取貨幣符號失敗:", e);
        return '$';
    }
}

// 為所有Firebase操作添加全局錯誤處理
function safeFirebaseOperation(operation, fallback) {
    if (!enableFirebase || !navigator.onLine || !db) {
        return Promise.resolve(fallback || null);
    }
    
    return new Promise((resolve, reject) => {
        // 設置超時處理
        const timeout = setTimeout(() => {
            console.warn('Firebase操作超時');
            resolve(fallback || null);
        }, 10000); // 10秒超時
        
        try {
            operation()
                .then(result => {
                    clearTimeout(timeout);
                    resolve(result);
                })
                .catch(error => {
                    clearTimeout(timeout);
                    console.error('Firebase操作失敗:', error);
                    // 嘗試繼續處理
                    resolve(fallback || null);
                });
        } catch (e) {
            clearTimeout(timeout);
            console.error('Firebase操作發生異常:', e);
            resolve(fallback || null);
        }
    });
}

// 添加錯誤處理
window.addEventListener('error', function(event) {
    console.error('全局錯誤:', event.error);
    showToast('發生錯誤: ' + (event.error?.message || '未知錯誤'), 'error');
});

// 添加未處理的Promise拒絕處理
window.addEventListener('unhandledrejection', function(event) {
    console.error('未處理的Promise拒絕:', event.reason);
    showToast('操作失敗: ' + (event.reason?.message || '未知原因'), 'error');
});

// 檢測網絡恢復，自動嘗試同步
window.addEventListener('online', function() {
    showToast('網絡已恢復', 'info');
    if (enableFirebase && appState.user && db) {
        setTimeout(() => {
            syncData();
        }, 2000);
    }
});

// 檢測網絡中斷
window.addEventListener('offline', function() {
    showToast('網絡已斷開，將使用離線模式', 'warning');
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
window.saveAccount = saveAccount;
window.saveTransaction = saveTransaction;
window.processTransfer = processTransfer;
window.saveBudgetSettings = saveBudgetSettings;
window.addCategoryBudget = addCategoryBudget;
window.clearAllData = clearAllData;
window.syncData = syncData;
window.exportData = exportData;
window.importData = importData;
window.signInWithGoogle = signInWithGoogle;
window.signOut = signOut;
window.openAddCategoryModal = openAddCategoryModal;
window.updateAllUI = updateAllUI;

// 添加控制台消息
console.log("%c進階個人財務追蹤器已加載", "color: #4CAF50; font-weight: bold; font-size: 16px;");
console.log("%c開發者: shing1108", "color: #2196F3;");


