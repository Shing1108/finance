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

// 擴展應用狀態，增加新設置
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
        categories: [],
        resetDay: 1, // 新增：預算重設日
        inheritPrevious: false // 新增：是否繼承上月預算
    },
    viewPreferences: {
        accounts: 'card',
        categories: 'card'
    },
    user: null
};


 // 在頁面加載時初始化Firebase
document.addEventListener('DOMContentLoaded', () => {
    const { auth, db } = initializeFirebase();
    window.auth = auth;
    window.db = db;
    
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

    setupConnectionRetryMechanism();
    
    // 初始化當前日期
    const today = new Date();
    document.getElementById('incomeDate').value = formatDate(today);
    document.getElementById('expenseDate').value = formatDate(today);
    
    // 設置默認頁面
    showPage('dashboard');
}

// 正確設置離線持久化，避免使用即將棄用的方法
function setupOfflinePersistence(db) {
    // 使用最新的推薦 API
    db.settings({
        cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
    });
    
    db.enablePersistence({ synchronizeTabs: true })
        .then(() => {
            console.log('離線持久化已啟用');
        })
        .catch((err) => {
            if (err.code === 'failed-precondition') {
                console.warn('無法啟用完整離線功能，可能有多個標籤頁打開');
                showToast('為確保數據一致性，請不要在多個標籤頁打開應用', 'warning');
            } else if (err.code === 'unimplemented') {
                console.warn('當前瀏覽器不支持離線持久化');
                showToast('您的瀏覽器不支持離線功能，應用需要保持網絡連接', 'warning');
            } else {
                console.error('啟用離線持久化時出錯:', err);
            }
        });
}

// Firebase 初始化與配置
function initializeFirebase() {
    console.log('初始化Firebase...');
    
    try {
        // 檢查是否已初始化
        if (firebase.apps.length) {
            console.log('Firebase已經初始化');
            return {
                auth: firebase.auth(),
                db: firebase.firestore()
            };
        }
        
        // 初始化Firebase，使用您的配置
        firebase.initializeApp(firebaseConfig);
        
        const auth = firebase.auth();
        const db = firebase.firestore();
        
        // 配置Firestore
        db.settings({
            cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
        });
        
        // 啟用離線持久性
        enableOfflineCapabilities(db);
        
        // 監聽網絡狀態
        setupNetworkListeners();
        
        console.log('Firebase初始化成功');
        
        return { auth, db };
    } catch (error) {
        console.error('Firebase初始化失敗:', error);
        showToast('連接服務時發生錯誤', 'error');
        
        // 返回模擬服務，避免應用崩潰
        return createOfflineServices();
    }
}

// 啟用離線功能
function enableOfflineCapabilities(db) {
    // 注意：這可能在多個選項卡環境中失敗
    db.enablePersistence({ synchronizeTabs: true })
        .then(() => {
            console.log('離線持久化已啟用');
        })
        .catch((err) => {
            console.warn('無法啟用離線持久化:', err);
            
            // 即使失敗，我們也繼續，因為基本的離線功能仍然可用
            if (err.code == 'failed-precondition') {
                showToast('請不要在多個標籤頁打開應用', 'warning');
            } else if (err.code == 'unimplemented') {
                showToast('您的瀏覽器不支持完整的離線功能', 'warning');
            }
        });
}

// 創建離線服務
function createOfflineServices() {
    console.log('創建離線服務模式');
    
    // 從本地存儲加載數據
    loadFromLocalStorage();
    
    // 返回模擬服務
    return {
        auth: {
            onAuthStateChanged: (callback) => {
                // 模擬未登入狀態
                setTimeout(() => callback(null), 0);
                return () => {};
            },
            signInWithPopup: () => Promise.reject(new Error('無法在離線模式下登入')),
            signOut: () => Promise.resolve()
        },
        db: createMockDbService()
    };
}

// 創建模擬數據庫服務
function createMockDbService() {
    return {
        collection: () => ({
            doc: () => ({
                collection: () => ({
                    get: () => Promise.resolve({
                        empty: true,
                        docs: [],
                        forEach: () => {}
                    }),
                    add: (data) => {
                        // 保存到本地
                        saveToLocalStorage(data);
                        return Promise.resolve({ id: 'local-' + Date.now() });
                    }
                }),
                get: () => Promise.resolve({
                    exists: false,
                    data: () => null
                }),
                set: (data) => {
                    saveToLocalStorage(data);
                    return Promise.resolve();
                }
            })
        }),
        enablePersistence: () => Promise.resolve(),
        settings: () => {}
    };
}

// 設置網絡監聽器
function setupNetworkListeners() {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // 初始檢查網絡狀態
    updateNetworkStatus();
}

// 處理設備上線
function handleOnline() {
    console.log('網絡連接已恢復');
    updateNetworkStatus();
    
    // 如果已登入，嘗試同步
    if (appState.user && appState.settings && appState.settings.autoSync) {
        setTimeout(() => {
            syncData();
        }, 2000); // 延遲2秒後嘗試同步
    }
}

// 處理設備離線
function handleOffline() {
    console.log('網絡連接已斷開');
    updateNetworkStatus();
    showToast('網絡連接已斷開，切換到離線模式', 'warning');
}

// 更新網絡狀態UI
function updateNetworkStatus() {
    const isOnline = navigator.onLine;
    const statusEl = document.getElementById('connectionStatus');
    
    if (statusEl) {
        statusEl.textContent = isOnline ? '在線' : '離線';
        statusEl.className = isOnline ? 'status-online' : 'status-offline';
    }
}

// 從本地存儲加載數據
function loadFromLocalStorage() {
    try {
        // 加載戶口
        const accountsJson = localStorage.getItem('accounts');
        if (accountsJson) {
            appState.accounts = JSON.parse(accountsJson);
        }
        
        // 加載類別
        const categoriesJson = localStorage.getItem('categories');
        if (categoriesJson) {
            appState.categories = JSON.parse(categoriesJson);
        } else {
            // 如果沒有類別，加載默認類別
            loadDefaultCategories();
        }
        
        // 加載交易
        const transactionsJson = localStorage.getItem('transactions');
        if (transactionsJson) {
            appState.transactions = JSON.parse(transactionsJson);
        }
        
        // 加載預算
        const budgetsJson = localStorage.getItem('budgets');
        if (budgetsJson) {
            appState.budgets = JSON.parse(budgetsJson);
        }
        
        console.log('從本地存儲加載了數據');
    } catch (error) {
        console.error('從本地存儲加載數據失敗:', error);
    }
}

// 保存數據到本地存儲
function saveToLocalStorage(data) {
    try {
        // 保存各種數據到localStorage
        localStorage.setItem('accounts', JSON.stringify(appState.accounts));
        localStorage.setItem('categories', JSON.stringify(appState.categories));
        localStorage.setItem('transactions', JSON.stringify(appState.transactions));
        localStorage.setItem('budgets', JSON.stringify(appState.budgets));
        
        // 保存上次更新時間
        localStorage.setItem('lastUpdated', new Date().toISOString());
        
        console.log('數據已保存到本地存儲');
    } catch (error) {
        console.error('保存數據到本地存儲失敗:', error);
        showToast('無法保存數據到本地存儲', 'error');
    }
}

// 改進的網絡連接狀態管理
function updateConnectionStatus() {
    const isOnline = navigator.onLine;
    const connectionStatusElement = document.getElementById('connectionStatus');
    
    if (connectionStatusElement) {
        if (isOnline) {
            connectionStatusElement.textContent = '在線';
            connectionStatusElement.className = 'status-online';
            console.log('網絡連接已恢復');
            
            // 嘗試重新連接到Firebase
            firebase.firestore().terminate()
                .then(() => {
                    return firebase.firestore().clearPersistence();
                })
                .then(() => {
                    console.log('成功重置Firebase連接');
                    // 重新初始化 (可選，視情況而定)
                    // 此時可能需要重新載入頁面以確保一切正常
                    window.location.reload();
                })
                .catch(err => {
                    console.error('重置Firebase連接時出錯:', err);
                    // 輕度錯誤可能不需要重新加載
                });
        } else {
            connectionStatusElement.textContent = '離線';
            connectionStatusElement.className = 'status-offline';
            console.log('網絡連接已斷開');
            showToast('網絡連接已斷開，應用將使用本地數據', 'warning');
        }
    }
}

// 添加新類別函數
function addNewCategory(type) {
    const categoryName = prompt('請輸入新類別名稱：');
    
    if (categoryName !== null && categoryName.trim() !== '') {
        const newCategory = {
            id: 'cat_' + Date.now(), // 生成臨時ID
            name: categoryName.trim(),
            type: type,
            icon: type === 'income' ? 'fa-arrow-down' : 'fa-arrow-up',
            createdAt: new Date().toISOString()
        };
        
        // 添加到相應數組
        appState.categories[type].push(newCategory);
        
        // 更新UI
        updateCategoriesUI();
        
        // 如果用戶已登入，則同步到Firebase
        if (appState.user && document.getElementById('autoSync') && document.getElementById('autoSync').checked) {
            syncData();
        }
        
        showToast('新類別已創建');
    }
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

    // 視圖切換按鈕
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const viewType = this.getAttribute('data-view');
            const container = this.closest('section');
            
            // 更新按鈕狀態
            container.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // 確定是哪個容器
            if (container.id === 'accounts') {
                appState.viewPreferences.accounts = viewType;
                toggleAccountsView(viewType);
            } else if (container.id === 'categories') {
                appState.viewPreferences.categories = viewType;
                toggleCategoriesView(viewType);
            }
            
            // 保存視圖偏好設置
            saveSettings();
        });
    });
    
    // 預算重設日變更
    document.getElementById('budgetResetDay').addEventListener('change', function() {
        const day = parseInt(this.value);
        if (day >= 1 && day <= 31) {
            appState.budgets.resetDay = day;
            saveSettings();
        }
    });
    
    // 繼承上月預算設置變更
    document.getElementById('inheritPreviousBudget').addEventListener('change', function() {
        appState.budgets.inheritPrevious = this.checked;
        saveSettings();
    });

    // 新增類別按鈕
    document.querySelectorAll('.add-category-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.closest('.tab-pane').id;
            const type = tabId === 'incomeCategories' ? 'income' : 'expense';
            addNewCategory(type);
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

// 載入用戶設定 - 修改以包含新設置
function loadUserSettings() {
    try {
        const savedSettings = localStorage.getItem('financeTrackerSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            
            // 合併設定，確保新增的屬性也能被加載
            if (settings.darkMode !== undefined) appState.darkMode = settings.darkMode;
            if (settings.fontSize !== undefined) appState.fontSize = settings.fontSize;
            if (settings.currency !== undefined) appState.currency = settings.currency;
            if (settings.decimalPlaces !== undefined) appState.decimalPlaces = settings.decimalPlaces;
            if (settings.notifications !== undefined) appState.notifications = settings.notifications;
            if (settings.notificationThreshold !== undefined) appState.notificationThreshold = settings.notificationThreshold;
            
            // 新設定
            if (settings.budgets && settings.budgets.resetDay !== undefined) {
                appState.budgets.resetDay = settings.budgets.resetDay;
            }
            if (settings.budgets && settings.budgets.inheritPrevious !== undefined) {
                appState.budgets.inheritPrevious = settings.budgets.inheritPrevious;
            }
            if (settings.viewPreferences) {
                appState.viewPreferences = settings.viewPreferences;
            }
            
            // 應用設定
            applySettings();
            
            // 設置UI元素值
            if (document.getElementById('budgetResetDay')) {
                document.getElementById('budgetResetDay').value = appState.budgets.resetDay;
            }
            if (document.getElementById('inheritPreviousBudget')) {
                document.getElementById('inheritPreviousBudget').checked = appState.budgets.inheritPrevious;
            }
            
            // 應用視圖偏好
            if (appState.viewPreferences.accounts) {
                toggleAccountsView(appState.viewPreferences.accounts);
                const accountsSection = document.getElementById('accounts');
                if (accountsSection) {
                    const btn = accountsSection.querySelector(`.view-btn[data-view="${appState.viewPreferences.accounts}"]`);
                    if (btn) btn.classList.add('active');
                }
            }
            
            if (appState.viewPreferences.categories) {
                toggleCategoriesView(appState.viewPreferences.categories);
                const categoriesSection = document.getElementById('categories');
                if (categoriesSection) {
                    const btn = categoriesSection.querySelector(`.view-btn[data-view="${appState.viewPreferences.categories}"]`);
                    if (btn) btn.classList.add('active');
                }
            }
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

// 保存設定 - 修改以包含新設置
function saveSettings() {
    try {
        const settingsToSave = {
            darkMode: appState.darkMode,
            fontSize: appState.fontSize,
            currency: appState.currency,
            decimalPlaces: appState.decimalPlaces,
            notifications: appState.notifications,
            notificationThreshold: appState.notificationThreshold,
            budgets: {
                resetDay: appState.budgets.resetDay,
                inheritPrevious: appState.budgets.inheritPrevious
            },
            viewPreferences: appState.viewPreferences
        };
        localStorage.setItem('financeTrackerSettings', JSON.stringify(settingsToSave));
    } catch (error) {
        console.error('保存設定時發生錯誤:', error);
        showToast('設定保存失敗，請重試');
    }
}

// 使用Google帳戶登入 (修改此函數)
function loginWithGoogle() {
    try {
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
                
                // 提供更具體的錯誤消息
                let errorMessage = '登入失敗，請重試';
                if (error.code === 'auth/popup-blocked') {
                    errorMessage = '瀏覽器阻止了彈出窗口，請允許彈出窗口後重試';
                } else if (error.code === 'auth/popup-closed-by-user') {
                    errorMessage = '登入窗口被關閉，請重試';
                } else if (error.code === 'auth/cancelled-popup-request') {
                    errorMessage = '登入請求已取消，請重試';
                } else if (error.code === 'auth/network-request-failed') {
                    errorMessage = '網絡連接失敗，請檢查您的網絡連接';
                }
                
                showToast(errorMessage);
            });
    } catch (error) {
        console.error('登入過程中發生錯誤:', error);
        showToast('登入過程中發生錯誤，請重試');
    }
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
    if (!appState.user) {
        console.log('未登入，無法加載用戶數據');
        return;
    }
    
    const userId = appState.user.uid;
    console.log(`嘗試加載用戶 ${userId} 的數據`);
    
    // 顯示加載指示器
    showLoadingIndicator();
    
    // 創建一個標誌，表示是否已完成初始數據加載
    let isDataLoaded = false;
    
    // 首先嘗試從緩存加載以快速顯示內容
    loadAllCollectionsFromCache(userId)
        .then((cachedData) => {
            if (cachedData.hasData) {
                console.log('已從緩存加載數據');
                updateAppStateWithData(cachedData);
                updateAllUI();
                
                // 如果在線，繼續嘗試從服務器獲取最新數據
                if (navigator.onLine) {
                    return loadAllCollectionsFromServer(userId);
                }
            } else if (navigator.onLine) {
                // 緩存中沒有數據，直接從服務器加載
                return loadAllCollectionsFromServer(userId);
            } else {
                // 離線且無緩存數據
                console.log('離線且無緩存數據，使用本地存儲');
                loadFromLocalStorage();
            }
        })
        .then((serverData) => {
            if (serverData) {
                console.log('已從服務器加載最新數據');
                updateAppStateWithData(serverData);
                updateAllUI();
                
                // 保存到本地存儲作為備份
                saveToLocalStorage();
            }
        })
        .catch((error) => {
            console.error('加載數據時出錯:', error);
            
            // 如果還沒有加載數據，從本地存儲加載
            if (!isDataLoaded) {
                console.log('嘗試從本地存儲恢復');
                loadFromLocalStorage();
                updateAllUI();
            }
            
            showToast('無法從雲端加載數據，使用本地數據', 'warning');
        })
        .finally(() => {
            hideLoadingIndicator();
            console.log('數據加載過程完成');
        });
}

// 從緩存加載所有集合
function loadAllCollectionsFromCache(userId) {
    console.log('從緩存加載數據...');
    
    return Promise.all([
        loadCollectionFromCache('accounts', userId),
        loadCollectionFromCache('categories', userId),
        loadCollectionFromCache('transactions', userId),
        loadBudgetsFromCache(userId)
    ])
    .then(([accounts, categories, transactions, budgets]) => {
        const hasData = accounts.length > 0 || categories.income.length > 0 || 
                        categories.expense.length > 0 || transactions.length > 0;
        
        return {
            accounts,
            categories,
            transactions,
            budgets,
            hasData
        };
    })
    .catch((error) => {
        console.error('從緩存加載數據時出錯:', error);
        return { hasData: false };
    });
}

// 從服務器加載所有集合
function loadAllCollectionsFromServer(userId) {
    console.log('從服務器加載數據...');
    showToast('正在從雲端獲取最新數據...', 'info');
    
    return Promise.all([
        loadCollectionFromServer('accounts', userId),
        loadCollectionFromServer('categories', userId),
        loadCollectionFromServer('transactions', userId),
        loadBudgetsFromServer(userId)
    ])
    .then(([accounts, categories, transactions, budgets]) => {
        return {
            accounts,
            categories,
            transactions,
            budgets,
            hasData: true
        };
    });
}

// 從緩存加載集合
function loadCollectionFromCache(collectionName, userId) {
    return db.collection('users').doc(userId).collection(collectionName)
        .get({ source: 'cache' })
        .then((snapshot) => {
            const items = [];
            snapshot.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() });
            });
            return items;
        })
        .catch((error) => {
            console.warn(`從緩存加載${collectionName}失敗:`, error);
            return [];
        });
}

// 從服務器加載集合
function loadCollectionFromServer(collectionName, userId) {
    return db.collection('users').doc(userId).collection(collectionName)
        .get({ source: 'server' })
        .then((snapshot) => {
            const items = [];
            snapshot.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() });
            });
            return items;
        })
        .catch((error) => {
            console.error(`從服務器加載${collectionName}失敗:`, error);
            throw error;
        });
}

// 從緩存加載預算
function loadBudgetsFromCache(userId) {
    return Promise.all([
        db.collection('users').doc(userId).collection('budgets').doc('general').get({ source: 'cache' }),
        db.collection('users').doc(userId).collection('budgets').doc('categories').get({ source: 'cache' })
    ])
    .then(([generalDoc, categoriesDoc]) => {
        const budgets = {
            general: 0,
            autoCalculate: true,
            cycle: 'monthly',
            resetDay: 1,
            inheritPrevious: false,
            categories: []
        };
        
        if (generalDoc.exists) {
            const data = generalDoc.data();
            budgets.general = data.amount || 0;
            budgets.autoCalculate = data.autoCalculate !== undefined ? data.autoCalculate : true;
            budgets.cycle = data.cycle || 'monthly';
            budgets.resetDay = data.resetDay || 1;
            budgets.inheritPrevious = data.inheritPrevious !== undefined ? data.inheritPrevious : false;
        }
        
        if (categoriesDoc.exists) {
            budgets.categories = categoriesDoc.data().items || [];
        }
        
        return budgets;
    })
    .catch((error) => {
        console.warn('從緩存加載預算失敗:', error);
        return {
            general: 0,
            autoCalculate: true,
            cycle: 'monthly',
            resetDay: 1,
            inheritPrevious: false,
            categories: []
        };
    });
}

// 從服務器加載預算
function loadBudgetsFromServer(userId) {
    return Promise.all([
        db.collection('users').doc(userId).collection('budgets').doc('general').get({ source: 'server' }),
        db.collection('users').doc(userId).collection('budgets').doc('categories').get({ source: 'server' })
    ])
    .then(([generalDoc, categoriesDoc]) => {
        const budgets = {
            general: 0,
            autoCalculate: true,
            cycle: 'monthly',
            resetDay: 1,
            inheritPrevious: false,
            categories: []
        };
        
        if (generalDoc.exists) {
            const data = generalDoc.data();
            budgets.general = data.amount || 0;
            budgets.autoCalculate = data.autoCalculate !== undefined ? data.autoCalculate : true;
            budgets.cycle = data.cycle || 'monthly';
            budgets.resetDay = data.resetDay || 1;
            budgets.inheritPrevious = data.inheritPrevious !== undefined ? data.inheritPrevious : false;
        }
        
        if (categoriesDoc.exists) {
            budgets.categories = categoriesDoc.data().items || [];
        }
        
        return budgets;
    })
    .catch((error) => {
        console.error('從服務器加載預算失敗:', error);
        throw error;
    });
}

// 使用加載的數據更新應用狀態
function updateAppStateWithData(data) {
    if (data.accounts && data.accounts.length > 0) {
        appState.accounts = data.accounts;
    }
    
    if (data.categories) {
        // 只有當至少有一個類別時才更新
        if (data.categories.income.length > 0 || data.categories.expense.length > 0) {
            appState.categories = data.categories;
        } else if (appState.categories.income.length === 0 && appState.categories.expense.length === 0) {
            // 如果沒有類別，加載默認類別
            loadDefaultCategories();
        }
    }
    
    if (data.transactions && data.transactions.length > 0) {
        appState.transactions = data.transactions;
    }
    
    if (data.budgets) {
        appState.budgets = data.budgets;
    }
}

// 安全地獲取文檔
function safeGet(docRef) {
    return docRef.get()
        .then(doc => doc)
        .catch(error => {
            console.error(`獲取文檔錯誤 (${docRef.path}):`, error);
            return null;
        });
}

// 加載集合
function loadCollection(collectionRef, onSuccess, onError) {
    collectionRef.get()
        .then((snapshot) => {
            if (!snapshot.empty) {
                const items = [];
                snapshot.forEach((doc) => {
                    items.push({ id: doc.id, ...doc.data() });
                });
                onSuccess(items);
            } else {
                onSuccess([]);
            }
        })
        .catch((error) => {
            onError(error);
            
            // 如果是網絡錯誤，嘗試使用緩存
            if (error.code === 'unavailable') {
                console.log('嘗試從緩存獲取數據...');
                
                // 使用緩存數據
                collectionRef.get({ source: 'cache' })
                    .then((snapshot) => {
                        if (!snapshot.empty) {
                            const items = [];
                            snapshot.forEach((doc) => {
                                items.push({ id: doc.id, ...doc.data() });
                            });
                            console.log('成功從緩存獲取數據');
                            onSuccess(items);
                        } else {
                            onSuccess([]);
                        }
                    })
                    .catch((cacheError) => {
                        console.error('從緩存獲取數據失敗:', cacheError);
                        onSuccess([]);
                    });
            } else {
                onSuccess([]);
            }
        });
}

// 修復進度計算問題
function showLoadingIndicator(message = '加載中...') {
    // 移除現有的加載指示器
    hideLoadingIndicator();
    
    // 創建新的加載指示器
    const indicator = document.createElement('div');
    indicator.className = 'loading-indicator';
    
    // 添加文本
    const textEl = document.createElement('span');
    textEl.textContent = message;
    textEl.className = 'loading-text';
    indicator.appendChild(textEl);
    
    // 添加進度條
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    
    const progressInner = document.createElement('div');
    progressInner.className = 'progress-inner';
    progressBar.appendChild(progressInner);
    
    indicator.appendChild(progressBar);
    
    // 添加到頁面
    document.body.appendChild(indicator);
}

// 隱藏加載指示器
function hideLoadingIndicator() {
    const indicator = document.querySelector('.loading-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// 更新加載進度
function updateLoadingProgress(loadingCounter, errorCounter, totalCollections) {
    // 計算進度
    const progress = Math.floor((loadingCounter / totalCollections) * 100);
    console.log(`數據加載進度: ${progress}%`);
    
    // 當所有集合都嘗試過加載後
    if ((loadingCounter + errorCounter) >= totalCollections) {
        hideLoadingIndicator();
        
        // 檢查是否需要使用默認數據
        if (appState.accounts.length === 0) {
            console.log('無戶口數據');
        }
        
        if (appState.categories.income.length === 0 && appState.categories.expense.length === 0) {
            console.log('無類別數據，加載默認類別');
            loadDefaultCategories();
        }
        
        // 更新所有UI
        updateAllUI();
        
        // 更新同步時間
        document.getElementById('lastSyncTime').textContent = formatDateTime(new Date());
        
        // 顯示適當的消息
        if (errorCounter > 0) {
            if (loadingCounter === 0) {
                showToast('無法加載數據，請檢查網絡連接', 'error');
            } else {
                showToast(`數據部分加載完成，有${errorCounter}項加載失敗`, 'warning');
            }
        } else {
            showToast('數據載入完成', 'success');
        }
    }
}

// 統一更新所有UI元素
function updateAllUI() {
    updateAccountsUI();
    updateCategoriesUI();
    updateTransactionsUI();
    updateBudgetUI();
    updateCategoryBudgetsUI();
    
    try {
        // 更新圖表
        updateCharts();
        // 更新財務健康指數
        updateFinancialHealth();
    } catch (error) {
        console.error('更新圖表或財務健康指數時出錯:', error);
    }
}

// 更新加載進度
function updateLoadingProgress(current, total) {
    const progressInner = document.querySelector('.progress-inner');
    if (progressInner && total > 0) { // 防止除以零
        const percent = Math.min((current / total) * 100, 100); // 防止超過100%
        progressInner.style.width = `${percent}%`;
        
        const loadingText = document.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = `加載中... ${Math.round(percent)}%`;
        }
    }
}

// 保存最後同步時間
function saveLastSyncTime(time) {
    try {
        localStorage.setItem('lastSyncTime', time.toISOString());
    } catch (error) {
        console.error('保存同步時間錯誤:', error);
    }
}


// 同步數據到Firebase - 重寫此函數以更可靠
function syncData() {
    if (!appState.user) {
        showToast('請先登入', 'warning');
        return;
    }
    
    const userId = appState.user.uid;
    
    // 顯示同步指示器
    showToast('正在同步數據...', 'info', 10000);
    
    // 將本地數據上傳到Firebase
    const syncPromises = [];
    
    // 同步戶口
    const accountsPromise = syncAccounts(userId);
    syncPromises.push(accountsPromise);
    
    // 同步類別
    const categoriesPromise = syncCategories(userId);
    syncPromises.push(categoriesPromise);
    
    // 同步交易
    const transactionsPromise = syncTransactions(userId);
    syncPromises.push(transactionsPromise);
    
    // 同步預算
    const budgetsPromise = syncBudgets(userId);
    syncPromises.push(budgetsPromise);
    
    // 等待所有同步操作完成
    Promise.all(syncPromises)
        .then(() => {
            // 更新同步時間
            const now = new Date();
            document.getElementById('lastSyncTime').textContent = formatDateTime(now);
            
            // 保存同步時間到本地存儲
            saveLastSyncTime(now);
            
            // 隱藏同步指示器
            showToast('數據同步完成', 'success');
        })
        .catch((error) => {
            console.error('同步數據錯誤:', error);
            showToast('數據同步失敗: ' + error.message, 'error');
        });
}

// 同步戶口數據
function syncAccounts(userId) {
    return new Promise((resolve, reject) => {
        try {
            const batch = db.batch();
            const accountsRef = db.collection('users').doc(userId).collection('accounts');
            
            // 獲取當前雲端戶口列表
            accountsRef.get()
                .then((snapshot) => {
                    // 建立雲端戶口ID映射，用於檢查哪些需要刪除
                    const cloudAccountIds = new Set();
                    snapshot.forEach(doc => cloudAccountIds.add(doc.id));
                    
                    // 處理本地戶口列表
                    const localAccountIds = new Set();
                    
                    // 更新或添加戶口
                    const accountPromises = appState.accounts.map(account => {
                        const accountData = { ...account };
                        delete accountData.id; // 不保存ID到Firebase
                        
                        if (account.id && account.id.startsWith('acc_')) {
                            // 這是一個本地生成的臨時ID，需要在雲端創建新文檔
                            return accountsRef.add(accountData)
                                .then((docRef) => {
                                    account.id = docRef.id; // 更新本地ID為雲端ID
                                    localAccountIds.add(docRef.id);
                                });
                        } else if (account.id) {
                            // 已有雲端ID，更新現有戶口
                            localAccountIds.add(account.id);
                            return accountsRef.doc(account.id).set(accountData);
                        } else {
                            // 沒有ID的情況，創建新戶口
                            return accountsRef.add(accountData)
                                .then((docRef) => {
                                    account.id = docRef.id; // 更新本地ID為雲端ID
                                    localAccountIds.add(docRef.id);
                                });
                        }
                    });
                    
                    // 執行所有戶口更新
                    Promise.all(accountPromises)
                        .then(() => {
                            // 找出雲端有但本地沒有的戶口（需要刪除的）
                            const toDeleteIds = [...cloudAccountIds].filter(id => !localAccountIds.has(id));
                            
                            // 刪除這些戶口
                            const deletePromises = toDeleteIds.map(id => accountsRef.doc(id).delete());
                            
                            return Promise.all(deletePromises);
                        })
                        .then(() => {
                            console.log('戶口同步完成');
                            resolve();
                        })
                        .catch(reject);
                })
                .catch(reject);
        } catch (error) {
            reject(error);
        }
    });
}

// 同步類別數據 - 類似邏輯
function syncCategories(userId) {
    return new Promise((resolve, reject) => {
        try {
            const categoriesRef = db.collection('users').doc(userId).collection('categories');
            
            // 獲取當前雲端類別列表
            categoriesRef.get()
                .then((snapshot) => {
                    // 建立雲端類別ID映射，用於檢查哪些需要刪除
                    const cloudCategoryIds = new Set();
                    snapshot.forEach(doc => cloudCategoryIds.add(doc.id));
                    
                    // 處理本地類別列表
                    const localCategoryIds = new Set();
                    const allCategories = [...appState.categories.income, ...appState.categories.expense];
                    
                    // 更新或添加類別
                    const categoryPromises = allCategories.map(category => {
                        const categoryData = { ...category };
                        delete categoryData.id; // 不保存ID到Firebase
                        
                        if (category.id && category.id.startsWith('cat_')) {
                            // 這是一個本地生成的臨時ID，需要在雲端創建新文檔
                            return categoriesRef.add(categoryData)
                                .then((docRef) => {
                                    category.id = docRef.id; // 更新本地ID為雲端ID
                                    localCategoryIds.add(docRef.id);
                                });
                        } else if (category.id) {
                            // 已有雲端ID，更新現有類別
                            localCategoryIds.add(category.id);
                            return categoriesRef.doc(category.id).set(categoryData);
                        } else {
                            // 沒有ID的情況，創建新類別
                            return categoriesRef.add(categoryData)
                                .then((docRef) => {
                                    category.id = docRef.id; // 更新本地ID為雲端ID
                                    localCategoryIds.add(docRef.id);
                                });
                        }
                    });
                    
                    // 執行所有類別更新
                    Promise.all(categoryPromises)
                        .then(() => {
                            // 找出雲端有但本地沒有的類別（需要刪除的）
                            const toDeleteIds = [...cloudCategoryIds].filter(id => !localCategoryIds.has(id));
                            
                            // 刪除這些類別
                            const deletePromises = toDeleteIds.map(id => categoriesRef.doc(id).delete());
                            
                            return Promise.all(deletePromises);
                        })
                        .then(() => {
                            console.log('類別同步完成');
                            resolve();
                        })
                        .catch(reject);
                })
                .catch(reject);
        } catch (error) {
            reject(error);
        }
    });
}

// 同步交易數據
function syncTransactions(userId) {
    return new Promise((resolve, reject) => {
        try {
            const transactionsRef = db.collection('users').doc(userId).collection('transactions');
            
            // 獲取當前雲端交易列表
            transactionsRef.get()
                .then((snapshot) => {
                    // 建立雲端交易ID映射，用於檢查哪些需要刪除
                    const cloudTransactionIds = new Set();
                    snapshot.forEach(doc => cloudTransactionIds.add(doc.id));
                    
                    // 處理本地交易列表
                    const localTransactionIds = new Set();
                    
                    // 更新或添加交易
                    const transactionPromises = appState.transactions.map(transaction => {
                        const transactionData = { ...transaction };
                        delete transactionData.id; // 不保存ID到Firebase
                        
                        if (transaction.id && (transaction.id.startsWith('trans_') || transaction.id.startsWith('temp_'))) {
                            // 這是一個本地生成的臨時ID，需要在雲端創建新文檔
                            return transactionsRef.add(transactionData)
                                .then((docRef) => {
                                    transaction.id = docRef.id; // 更新本地ID為雲端ID
                                    localTransactionIds.add(docRef.id);
                                });
                        } else if (transaction.id) {
                            // 已有雲端ID，更新現有交易
                            localTransactionIds.add(transaction.id);
                            return transactionsRef.doc(transaction.id).set(transactionData);
                        } else {
                            // 沒有ID的情況，創建新交易
                            return transactionsRef.add(transactionData)
                                .then((docRef) => {
                                    transaction.id = docRef.id; // 更新本地ID為雲端ID
                                    localTransactionIds.add(docRef.id);
                                });
                        }
                    });
                    
                    // 執行所有交易更新
                    Promise.all(transactionPromises)
                        .then(() => {
                            // 找出雲端有但本地沒有的交易（需要刪除的）
                            const toDeleteIds = [...cloudTransactionIds].filter(id => !localTransactionIds.has(id));
                            
                            // 刪除這些交易
                            const deletePromises = toDeleteIds.map(id => transactionsRef.doc(id).delete());
                            
                            return Promise.all(deletePromises);
                        })
                        .then(() => {
                            console.log('交易同步完成');
                            resolve();
                        })
                        .catch(reject);
                })
                .catch(reject);
        } catch (error) {
            reject(error);
        }
    });
}

// 同步預算數據
function syncBudgets(userId) {
    return new Promise((resolve, reject) => {
        try {
            const budgetsRef = db.collection('users').doc(userId).collection('budgets');
            
            // 更新總預算
            const generalData = {
                amount: appState.budgets.general,
                autoCalculate: appState.budgets.autoCalculate,
                cycle: appState.budgets.cycle,
                resetDay: appState.budgets.resetDay,
                inheritPrevious: appState.budgets.inheritPrevious
            };
            
            const categoriesData = {
                items: appState.budgets.categories
            };
            
            // 同時更新兩個文檔
            Promise.all([
                budgetsRef.doc('general').set(generalData),
                budgetsRef.doc('categories').set(categoriesData)
            ])
            .then(() => {
                console.log('預算同步完成');
                resolve();
            })
            .catch(reject);
        } catch (error) {
            reject(error);
        }
    });
}

// 保存戶口 (修改此函數)
function saveAccount() {
    const accountName = document.getElementById('accountName').value;
    const accountType = document.getElementById('accountType').value;
    const initialBalance = parseFloat(document.getElementById('initialBalance').value) || 0;
    const accountCurrency = document.getElementById('accountCurrency').value;
    const accountNotes = document.getElementById('accountNotes').value;
    
    // 檢查名稱是否為空
    if (!accountName.trim()) {
        showToast('請輸入戶口名稱');
        return;
    }
    
    // 檢查是否為編輯模式
    const editAccountId = document.getElementById('accountForm').getAttribute('data-edit-id');
    
    if (editAccountId) {
        // 更新現有戶口
        const index = appState.accounts.findIndex(a => a.id === editAccountId);
        if (index !== -1) {
            appState.accounts[index].name = accountName;
            appState.accounts[index].type = accountType;
            appState.accounts[index].balance = initialBalance;
            appState.accounts[index].currency = accountCurrency;
            appState.accounts[index].notes = accountNotes;
            // 不更新 createdAt
        } else {
            showToast('找不到該戶口');
            return;
        }
    } else {
        // 添加新戶口
        const newAccount = {
            id: 'acc_' + Date.now(), // 生成臨時ID
            name: accountName,
            type: accountType,
            balance: initialBalance,
            currency: accountCurrency,
            notes: accountNotes,
            createdAt: new Date().toISOString()
        };
        appState.accounts.push(newAccount);
    }
    
    // 重置表單
    document.getElementById('accountForm').reset();
    document.getElementById('accountForm').removeAttribute('data-edit-id');
    
    // 更新UI
    updateAccountsUI();
    
    // 如果用戶已登入，則同步到Firebase
    if (appState.user && document.getElementById('autoSync') && document.getElementById('autoSync').checked) {
        syncData();
    }
    
    // 關閉模態窗口
    accountModal.style.display = 'none';
    
    // 顯示成功消息
    showToast(editAccountId ? '戶口已更新' : '戶口已創建');
}

// 保存交易
// 保存交易函數修改 - 確保同步
function saveTransaction(type) {
    const form = document.getElementById(`${type}Form`);
    const accountId = document.getElementById(`${type}Account`).value;
    const categoryId = document.getElementById(`${type}Category`).value;
    const amount = parseFloat(document.getElementById(`${type}Amount`).value) || 0;
    const date = document.getElementById(`${type}Date`).value;
    const notes = document.getElementById(`${type}Notes`).value;
    
    // 驗證數據
    if (!accountId) {
        showToast('請選擇戶口', 'warning');
        return;
    }
    
    if (!categoryId) {
        showToast('請選擇類別', 'warning');
        return;
    }
    
    if (amount <= 0) {
        showToast('金額必須大於零', 'warning');
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
    
    // 生成臨時ID
    if (!transaction.id) {
        transaction.id = 'trans_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    }
    
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
    updateBudgetUI();
    updateCategoryBudgetsUI();
    updateCharts();
    updateFinancialHealth();
    
    // 如果用戶已登入，則同步到Firebase
    if (appState.user && document.getElementById('autoSync') && document.getElementById('autoSync').checked) {
        syncData();
    }
    
    // 重置表單
    form.reset();
    
    // 設置日期為今天
    document.getElementById(`${type}Date`).value = formatDate(new Date());
    
    // 顯示成功消息
    showToast(editTransactionId ? '交易已更新' : '交易已記錄', 'success');
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
    updateCharts();
    updateFinancialHealth();
    
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

// 更新戶口UI (修改此函數)
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
                    <button class="btn edit-account-btn" data-id="${account.id}">編輯</button>
                    <button class="btn danger delete-account-btn" data-id="${account.id}">刪除</button>
                </div>
            `;
            accountsList.appendChild(accountCard);
        });
        
        // 為新添加的按鈕綁定事件
        document.querySelectorAll('.edit-account-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const accountId = this.getAttribute('data-id');
                editAccount(accountId);
            });
        });
        
        document.querySelectorAll('.delete-account-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const accountId = this.getAttribute('data-id');
                deleteAccount(accountId);
            });
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

// 更新類別UI (修改此函數)
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
                    <button class="btn edit-category-btn" data-id="${category.id}">編輯</button>
                    <button class="btn danger delete-category-btn" data-id="${category.id}">刪除</button>
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
                    <button class="btn edit-category-btn" data-id="${category.id}">編輯</button>
                    <button class="btn danger delete-category-btn" data-id="${category.id}">刪除</button>
                </div>
            `;
            expenseCategoriesList.appendChild(categoryItem);
        });
    }
    
    // 綁定類別按鈕事件
    document.querySelectorAll('.edit-category-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const categoryId = this.getAttribute('data-id');
            editCategory(categoryId);
        });
    });
    
    document.querySelectorAll('.delete-category-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const categoryId = this.getAttribute('data-id');
            deleteCategory(categoryId);
        });
    });
    
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

// 更新預算UI - 修改以修復預算扣減問題
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
        
        // 決定預算狀態顏色和類別
        let statusClass = '';
        if (usedPercentage >= 90) {
            statusClass = 'danger';
        } else if (usedPercentage >= 70) {
            statusClass = 'warning';
        }
        
        budgetStatus.innerHTML = `
            <div class="budget-progress">
                <div class="budget-info">
                    <span>週期: ${getBudgetCycleLabel(appState.budgets.cycle)}</span>
                    <span>重設日: 每月${appState.budgets.resetDay}日</span>
                    <span>預算: ${formatCurrency(totalBudget)}</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar ${statusClass}" style="width: ${Math.min(usedPercentage, 100)}%;"></div>
                </div>
                <div class="budget-summary">
                    <span>已使用: ${formatCurrency(currentPeriodExpenses)} (${usedPercentage.toFixed(1)}%)</span>
                    <span>剩餘: ${formatCurrency(remainingBudget)}</span>
                </div>
            </div>
        `;
        
        // 如果預算即將超過，顯示通知
        if (appState.notifications && usedPercentage >= appState.notificationThreshold && usedPercentage < 100) {
            showToast(`警告：預算已使用 ${usedPercentage.toFixed(1)}%`);
        } else if (appState.notifications && usedPercentage >= 100) {
            showToast(`警告：預算已超支！`, 'error');
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

// 計算當前週期的支出 - 修改以考慮自定義重設日
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
        // 使用自定義重設日
        const resetDay = appState.budgets.resetDay || 1;
        const currentDay = now.getDate();
        
        if (currentDay >= resetDay) {
            // 當前月份的重設日
            startDate = new Date(now.getFullYear(), now.getMonth(), resetDay);
        } else {
            // 上個月的重設日
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, resetDay);
        }
    }
    
    // 格式化日期範圍
    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(now);
    
    // 計算該時間範圍內的支出總額
    return appState.transactions
        .filter(t => t.type === 'expense' && t.date >= startDateStr && t.date <= endDateStr)
        .reduce((sum, t) => sum + t.amount, 0);
}

// 計算當前週期特定類別的支出 - 同樣修改
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
        // 使用自定義重設日
        const resetDay = appState.budgets.resetDay || 1;
        const currentDay = now.getDate();
        
        if (currentDay >= resetDay) {
            // 當前月份的重設日
            startDate = new Date(now.getFullYear(), now.getMonth(), resetDay);
        } else {
            // 上個月的重設日
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, resetDay);
        }
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

// 編輯戶口 (修改此函數)
function editAccount(accountId) {
    const account = appState.accounts.find(a => a.id === accountId);
    if (!account) {
        showToast('找不到該戶口');
        return;
    }
    
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

// 刪除戶口 (修改此函數)
function deleteAccount(accountId) {
    showConfirmDialog('確定要刪除此戶口嗎？相關的交易記錄也將被刪除。', () => {
        // 刪除相關交易
        appState.transactions = appState.transactions.filter(t => t.accountId !== accountId && t.linkedAccountId !== accountId);
        
        // 刪除戶口
        const index = appState.accounts.findIndex(a => a.id === accountId);
        if (index !== -1) {
            appState.accounts.splice(index, 1);
            
            // 更新UI
            updateAccountsUI();
            updateTransactionsUI();
            
            // 如果用戶已登入，則同步到Firebase
            if (appState.user && document.getElementById('autoSync') && document.getElementById('autoSync').checked) {
                syncData();
            }
            
            // 顯示成功消息
            showToast('戶口已刪除');
        } else {
            showToast('找不到該戶口');
        }
    });
}

// 編輯類別 (實現此函數)
function editCategory(categoryId) {
    // 首先查找類別
    let category = appState.categories.income.find(c => c.id === categoryId);
    let type = 'income';
    
    if (!category) {
        category = appState.categories.expense.find(c => c.id === categoryId);
        type = 'expense';
    }
    
    if (!category) {
        showToast('找不到該類別');
        return;
    }
    
    // 顯示新增/編輯類別模態窗口
    let categoryName = prompt('請輸入類別名稱：', category.name);
    
    if (categoryName !== null && categoryName.trim() !== '') {
        // 更新類別名稱
        category.name = categoryName.trim();
        
        // 更新UI
        updateCategoriesUI();
        
        // 如果用戶已登入，則同步到Firebase
        if (appState.user && document.getElementById('autoSync') && document.getElementById('autoSync').checked) {
            syncData();
        }
        
        showToast('類別已更新');
    }
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
// 增強Toast通知，支持不同類型和自定義持續時間
function showToast(message, type = 'info', duration = 3000) {
    // 檢查是否已存在toast
    let toast = document.querySelector('.toast');
    
    if (!toast) {
        // 創建新的toast元素
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    
    // 清除可能的舊類別
    toast.classList.remove('info', 'success', 'warning', 'error');
    
    // 添加類型類別
    toast.classList.add(type);
    
    // 設置消息
    toast.textContent = message;
    toast.classList.add('show');
    
    // 清除任何現有的超時
    if (toast.timeoutId) {
        clearTimeout(toast.timeoutId);
    }
    
    // 定時隱藏
    toast.timeoutId = setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// 加載默認類別
function loadDefaultCategories() {
    // 默認收入類別
    appState.categories.income = [
        { id: 'inc_salary', name: '薪資收入', icon: 'fa-money-bill', type: 'income' },
        { id: 'inc_bonus', name: '獎金', icon: 'fa-gift', type: 'income' },
        { id: 'inc_investment', name: '投資收益', icon: 'fa-chart-line', type: 'income' },
        { id: 'inc_other', name: '其他收入', icon: 'fa-plus-circle', type: 'income' }
    ];
    
    // 默認支出類別
    appState.categories.expense = [
        { id: 'exp_food', name: '餐飲', icon: 'fa-utensils', type: 'expense' },
        { id: 'exp_transport', name: '交通', icon: 'fa-bus', type: 'expense' },
        { id: 'exp_shopping', name: '購物', icon: 'fa-shopping-bag', type: 'expense' },
        { id: 'exp_housing', name: '住宿', icon: 'fa-home', type: 'expense' },
        { id: 'exp_utilities', name: '水電', icon: 'fa-bolt', type: 'expense' },
        { id: 'exp_entertainment', name: '娛樂', icon: 'fa-film', type: 'expense' },
        { id: 'exp_health', name: '醫療健康', icon: 'fa-heartbeat', type: 'expense' },
        { id: 'exp_education', name: '教育', icon: 'fa-graduation-cap', type: 'expense' },
        { id: 'exp_other', name: '其他支出', icon: 'fa-minus-circle', type: 'expense' }
    ];
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

// 切換戶口視圖模式
function toggleAccountsView(viewType) {
    const accountsList = document.getElementById('accountsList');
    
    if (viewType === 'list') {
        accountsList.classList.add('list-view');
    } else {
        accountsList.classList.remove('list-view');
    }
    
    // 重新渲染戶口列表
    updateAccountsUI();
}

// 切換類別視圖模式
function toggleCategoriesView(viewType) {
    const categoriesContainers = [
        document.getElementById('incomeCategoriesList'),
        document.getElementById('expenseCategoriesList')
    ];
    
    categoriesContainers.forEach(container => {
        if (viewType === 'list') {
            container.classList.add('list-view');
        } else {
            container.classList.remove('list-view');
        }
    });
    
    // 重新渲染類別列表
    updateCategoriesUI();
}
// 更新財務健康指數圖表 - 安全版本
function updateHealthScoreChart(score) {
    safelyUseChart(() => {
        // 由於這是一個可選功能，如果沒有相應的canvas元素，我們就跳過繪圖
        const canvas = document.getElementById('healthScoreCanvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // 檢查是否已有圖表實例
        if (window.healthScoreChart) {
            window.healthScoreChart.destroy();
        }
        
        // 創建環形圖
        window.healthScoreChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['得分', ''],
                datasets: [{
                    data: [score, 100 - score],
                    backgroundColor: [
                        score >= 80 ? '#4caf50' : score >= 60 ? '#ff9800' : '#f44336',
                        '#e0e0e0'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                cutout: '80%',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: false
                    }
                }
            }
        });
    });
}


// 新增財務健康指數計算與建議
function updateFinancialHealth() {
    // 獲取需要的DOM元素
    const healthScoreEl = document.getElementById('healthScore');
    const healthStatusEl = document.getElementById('healthStatus');
    const adviceListEl = document.getElementById('financialAdvice');
    
    if (!healthScoreEl || !healthStatusEl || !adviceListEl) return;
    
    // 收集數據
    const totalAssets = appState.accounts.reduce((sum, account) => sum + account.balance, 0);
    const monthlyIncome = calculateMonthlyIncome();
    const monthlyExpenses = calculateMonthlyExpenses();
    const savingsRate = monthlyIncome > 0 ? (monthlyIncome - monthlyExpenses) / monthlyIncome * 100 : 0;
    const budgetAdherence = calculateBudgetAdherence();
    const expensesByCategory = calculateExpensesByCategory();
    const hasBudget = appState.budgets.general > 0 || appState.budgets.categories.length > 0;
    const hasEmergencyFund = checkEmergencyFund(monthlyExpenses);
    
    // 計算健康得分 (0-100)
    let score = 0;
    
    // 基礎得分 (20分)
    score += Math.min(20, appState.accounts.length * 5); // 戶口多樣性
    
    // 存款比例 (30分)
    if (monthlyIncome > 0) {
        if (savingsRate >= 20) score += 30;
        else if (savingsRate >= 15) score += 25;
        else if (savingsRate >= 10) score += 20;
        else if (savingsRate >= 5) score += 15;
        else if (savingsRate > 0) score += 10;
    }
    
    // 預算遵守度 (25分)
    if (hasBudget) {
        if (budgetAdherence >= 90) score += 25;
        else if (budgetAdherence >= 80) score += 20;
        else if (budgetAdherence >= 70) score += 15;
        else if (budgetAdherence >= 60) score += 10;
        else score += 5;
    }
    
    // 應急資金 (15分)
    if (hasEmergencyFund >= 6) score += 15;
    else if (hasEmergencyFund >= 3) score += 10;
    else if (hasEmergencyFund >= 1) score += 5;
    
    // 收支分類完整性 (10分)
    const categoryCompleteness = calculateCategoryCompleteness();
    score += Math.round(categoryCompleteness * 10);
    
    // 更新UI
    healthScoreEl.textContent = Math.round(score);
    
    // 設置狀態描述
    let status;
    if (score >= 90) status = "非常優秀";
    else if (score >= 80) status = "優秀";
    else if (score >= 70) status = "良好";
    else if (score >= 60) status = "一般";
    else if (score >= 50) status = "需要改善";
    else status = "需要注意";
    
    healthStatusEl.textContent = status;
    
    // 產生財務建議
    const advice = generateFinancialAdvice(
        totalAssets, 
        monthlyIncome, 
        monthlyExpenses, 
        savingsRate, 
        budgetAdherence, 
        hasEmergencyFund, 
        expensesByCategory
    );
    
    // 更新建議列表
    adviceListEl.innerHTML = '';
    advice.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        adviceListEl.appendChild(li);
    });
    
    // 更新財務健康指數圖表
    updateHealthScoreChart(score);

    try {
        updateHealthScoreChart(score);
    } catch (error) {
        console.error('更新健康指數圖表時出錯:', error);
    }
}
// 計算每月收入
function calculateMonthlyIncome() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // 獲取本月所有收入
    const monthlyIncome = appState.transactions
        .filter(t => {
            const transDate = new Date(t.date);
            return t.type === 'income' && 
                   transDate.getMonth() === currentMonth && 
                   transDate.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + t.amount, 0);
    
    return monthlyIncome;
}

// 計算每月支出
function calculateMonthlyExpenses() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // 獲取本月所有支出
    const monthlyExpenses = appState.transactions
        .filter(t => {
            const transDate = new Date(t.date);
            return t.type === 'expense' && 
                   transDate.getMonth() === currentMonth && 
                   transDate.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + t.amount, 0);
    
    return monthlyExpenses;
}

// 計算預算遵守度 (0-100%)
function calculateBudgetAdherence() {
    if (!appState.budgets.general && appState.budgets.categories.length === 0) return 100;
    
    const currentPeriodExpenses = calculateCurrentPeriodExpenses();
    
    // 計算總預算
    let totalBudget = appState.budgets.general;
    if (appState.budgets.autoCalculate) {
        totalBudget = appState.budgets.categories.reduce((sum, budget) => sum + budget.amount, 0);
    }
    
    if (totalBudget === 0) return 100;
    
    // 如果花費低於或等於預算，則遵守度為100%
    if (currentPeriodExpenses <= totalBudget) return 100;
    
    // 否則，計算超支的百分比，並轉換為遵守度
    const overBudgetPercent = (currentPeriodExpenses / totalBudget) * 100 - 100;
    const adherence = Math.max(0, 100 - overBudgetPercent);
    
    return adherence;
}

// 檢查應急資金 (返回可支撐的月數)
function checkEmergencyFund(monthlyExpenses) {
    if (monthlyExpenses <= 0) return 0;
    
    // 計算流動資產總額 (現金和銀行戶口)
    const liquidAssets = appState.accounts
        .filter(a => a.type === 'cash' || a.type === 'bank')
        .reduce((sum, account) => sum + account.balance, 0);
    
    // 計算可支撐的月數
    return liquidAssets / monthlyExpenses;
}

// 計算各類別支出佔比
function calculateExpensesByCategory() {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    
    // 獲取最近三個月的支出交易
    const recentExpenses = appState.transactions.filter(t => {
        return t.type === 'expense' && new Date(t.date) >= threeMonthsAgo;
    });
    
    // 按類別分組
    const expensesByCategory = {};
    let totalExpenses = 0;
    
    recentExpenses.forEach(transaction => {
        const categoryId = transaction.categoryId;
        if (!categoryId) return;
        
        if (!expensesByCategory[categoryId]) {
            expensesByCategory[categoryId] = 0;
        }
        
        expensesByCategory[categoryId] += transaction.amount;
        totalExpenses += transaction.amount;
    });
    
    // 計算每個類別的百分比
    const result = [];
    
    for (const categoryId in expensesByCategory) {
        const category = findCategoryById(categoryId);
        if (category) {
            result.push({
                category: category.name,
                amount: expensesByCategory[categoryId],
                percentage: totalExpenses > 0 ? (expensesByCategory[categoryId] / totalExpenses) * 100 : 0
            });
        }
    }
    
    // 按金額從大到小排序
    result.sort((a, b) => b.amount - a.amount);
    
    return result;
}

// 計算類別完整性 (0-1)
function calculateCategoryCompleteness() {
    // 檢查是否有基本類別設置
    if (appState.categories.income.length === 0 || appState.categories.expense.length === 0) {
        return 0;
    }
    
    // 檢查未分類交易的比例
    const totalTransactions = appState.transactions.length;
    if (totalTransactions === 0) return 0;
    
    const categorizedTransactions = appState.transactions.filter(t => t.categoryId).length;
    return categorizedTransactions / totalTransactions;
}

// 產生財務建議
function generateFinancialAdvice(
    totalAssets,
    monthlyIncome, 
    monthlyExpenses, 
    savingsRate, 
    budgetAdherence, 
    emergencyFundMonths, 
    expensesByCategory
) {
    const advice = [];
    
    // 基於儲蓄率的建議
    if (savingsRate < 10) {
        advice.push("考慮增加儲蓄率至少達到收入的10%，這是建立財務安全的基礎。");
    } else if (savingsRate >= 20) {
        advice.push("您的儲蓄率非常優秀！考慮將部分儲蓄投資以獲得更好的長期回報。");
    }
    
    // 基於預算遵守度的建議
    if (budgetAdherence < 70) {
        advice.push("您經常超出預算，建議審查支出模式並調整預算以更符合實際情況。");
    } else if (budgetAdherence >= 95) {
        advice.push("您非常善於遵守預算！可以考慮進一步優化預算分配以提高財務效率。");
    }
    
    // 基於應急資金的建議
    if (emergencyFundMonths < 3) {
        advice.push("您的應急資金不足，建議至少儲備3-6個月的生活費用作為緊急資金。");
    } else if (emergencyFundMonths >= 6) {
        advice.push("您的應急資金充足，可以考慮將超出6個月生活費的部分進行投資。");
    }
    
    // 基於支出類別分析的建議
    if (expensesByCategory.length > 0) {
        const topExpenseCategory = expensesByCategory[0];
        if (topExpenseCategory.percentage > 40) {
            advice.push(`您在${topExpenseCategory.category}上的支出比例較高(${topExpenseCategory.percentage.toFixed(1)}%)，考慮檢視這一領域的支出習慣。`);
        }
    }
    
    // 基於基本財務習慣的建議
    if (appState.categories.expense.length < 5) {
        advice.push("建立更詳細的支出類別可以幫助您更好地追蹤和管理開支。");
    }
    
    if (appState.accounts.length < 2) {
        advice.push("考慮設置多個不同用途的戶口以更好地管理資金(如日常開支、儲蓄、投資等)。");
    }
    
    if (appState.budgets.categories.length === 0) {
        advice.push("為各主要支出類別設置單獨的預算可以提高資金管理的精確度。");
    }
    
    // 如果沒有足夠數據提供具體建議
    if (advice.length === 0) {
        advice.push("繼續保持良好的財務習慣，定期審查您的財務目標和進展。");
        advice.push("考慮設定長期財務目標，如退休計劃、購房或其他重大投資。");
    }
    
    // 添加一些通用建議
    if (advice.length < 3) {
        advice.push("定期審查您的收入來源，並尋找增加收入的機會。");
    }
    
    return advice;
}
// 檢查並動態載入Chart.js
function ensureChartJsLoaded() {
    return new Promise((resolve, reject) => {
        if (window.Chart) {
            resolve(window.Chart);
            return;
        }
        
        // 動態載入Chart.js
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = () => resolve(window.Chart);
        script.onerror = () => {
            console.error('無法載入Chart.js');
            reject(new Error('無法載入Chart.js'));
        };
        document.head.appendChild(script);
    });
}

// 檢查Chart.js是否可用並安全地使用它
function safelyUseChart(callback) {
    // 檢查全局Chart對象是否存在
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js 未載入，跳過圖表渲染');
        return false;
    }
    
    try {
        callback();
        return true;
    } catch (error) {
        console.error('使用Chart.js時出錯:', error);
        return false;
    }
}


// 類似地修改updateCharts函數
function updateCharts() {
    try {
        updateIncomeChart();
        updateExpenseChart();
    } catch (error) {
        console.error('更新圖表時出錯:', error);
    }
}

// 更新收入圖表
function updateIncomeChart() {
    // 獲取最近三個月的收入數據
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    
    // 按類別統計收入
    const incomeByCategory = {};
    let totalIncome = 0;
    
    appState.transactions.forEach(transaction => {
        if (transaction.type !== 'income') return;
        if (new Date(transaction.date) < threeMonthsAgo) return;
        
        const categoryId = transaction.categoryId;
        if (!categoryId) return;
        
        const category = findCategoryById(categoryId);
        if (!category) return;
        
        if (!incomeByCategory[category.name]) {
            incomeByCategory[category.name] = 0;
        }
        
        incomeByCategory[category.name] += transaction.amount;
        totalIncome += transaction.amount;
    });
    
    // 準備圖表數據
    const labels = Object.keys(incomeByCategory);
    const data = Object.values(incomeByCategory);
    const backgroundColors = generateColors(labels.length);
    
    // 如果沒有數據，顯示提示
    if (data.length === 0) {
        document.getElementById('incomeChart').innerHTML = '<p class="no-data">暫無收入數據</p>';
        return;
    }
    
    // 繪製圖表
    const ctx = document.getElementById('incomeChartCanvas').getContext('2d');
    
    // 檢查是否已有圖表實例
    if (window.incomeChart) {
        window.incomeChart.destroy();
    }
    
    window.incomeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
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
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary')
                    }
                },
                title: {
                    display: true,
                    text: '最近三個月收入分佈',
                    color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary'),
                    font: {
                        size: 16
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const percentage = (value / totalIncome * 100).toFixed(1);
                            return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// 更新支出圖表
function updateExpenseChart() {
    // 獲取最近三個月的支出數據
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    
    // 按類別統計支出
    const expenseByCategory = {};
    let totalExpense = 0;
    
    appState.transactions.forEach(transaction => {
        if (transaction.type !== 'expense') return;
        if (new Date(transaction.date) < threeMonthsAgo) return;
        
        const categoryId = transaction.categoryId;
        if (!categoryId) return;
        
        const category = findCategoryById(categoryId);
        if (!category) return;
        
        if (!expenseByCategory[category.name]) {
            expenseByCategory[category.name] = 0;
        }
        
        expenseByCategory[category.name] += transaction.amount;
        totalExpense += transaction.amount;
    });
    
    // 準備圖表數據
    const labels = Object.keys(expenseByCategory);
    const data = Object.values(expenseByCategory);
    const backgroundColors = generateColors(labels.length, true); // 使用不同的顏色方案
    
    // 如果沒有數據，顯示提示
    if (data.length === 0) {
        document.getElementById('expenseChart').innerHTML = '<p class="no-data">暫無支出數據</p>';
        return;
    }
    
    // 繪製圖表
    const ctx = document.getElementById('expenseChartCanvas').getContext('2d');
    
    // 檢查是否已有圖表實例
    if (window.expenseChart) {
        window.expenseChart.destroy();
    }
    
    window.expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
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
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary')
                    }
                },
                title: {
                    display: true,
                    text: '最近三個月支出分佈',
                    color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary'),
                    font: {
                        size: 16
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const percentage = (value / totalExpense * 100).toFixed(1);
                            return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// 生成圖表顏色
function generateColors(count, isExpense = false) {
    const colors = [];
    
    // 收入使用綠色系列，支出使用紅色系列
    const baseHue = isExpense ? 0 : 120; // 紅色=0, 綠色=120
    
    for (let i = 0; i < count; i++) {
        const hue = (baseHue + i * 30) % 360;
        const saturation = 65 + Math.random() * 20;
        const lightness = 45 + Math.random() * 10;
        colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
    }
    
    return colors;
}

// 載入預設數據（如果用戶沒有任何數據）
function loadDefaultData() {
    // 如果還沒有設置類別，添加一些常用類別
    if (appState.categories.income.length === 0) {
        const defaultIncomeCategories = [
            { id: 'inc_salary', name: '薪資收入', icon: 'fa-money-bill', type: 'income' },
            { id: 'inc_bonus', name: '獎金', icon: 'fa-gift', type: 'income' },
            { id: 'inc_investment', name: '投資收益', icon: 'fa-chart-line', type: 'income' },
            { id: 'inc_other', name: '其他收入', icon: 'fa-plus-circle', type: 'income' }
        ];
        
        appState.categories.income = defaultIncomeCategories;
    }
    
    if (appState.categories.expense.length === 0) {
        const defaultExpenseCategories = [
            { id: 'exp_food', name: '餐飲', icon: 'fa-utensils', type: 'expense' },
            { id: 'exp_transport', name: '交通', icon: 'fa-bus', type: 'expense' },
            { id: 'exp_shopping', name: '購物', icon: 'fa-shopping-bag', type: 'expense' },
            { id: 'exp_housing', name: '住宿', icon: 'fa-home', type: 'expense' },
            { id: 'exp_utilities', name: '水電', icon: 'fa-bolt', type: 'expense' },
            { id: 'exp_entertainment', name: '娛樂', icon: 'fa-film', type: 'expense' },
            { id: 'exp_health', name: '醫療健康', icon: 'fa-heartbeat', type: 'expense' },
            { id: 'exp_education', name: '教育', icon: 'fa-graduation-cap', type: 'expense' },
            { id: 'exp_other', name: '其他支出', icon: 'fa-minus-circle', type: 'expense' }
        ];
        
        appState.categories.expense = defaultExpenseCategories;
    }
    
    // 更新UI
    updateCategoriesUI();
}

// 初始化應用程序 - 修改以包含圖表和財務健康指數更新
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

    // 在初始化完數據後，添加這些調用
function afterDataLoaded() {
    updateCharts();
    updateFinancialHealth();
    
    // 綁定圖表相關事件 (如有需要)
    setupChartEvents();
}
    
    // 初始化當前日期
    const today = new Date();
    document.getElementById('incomeDate').value = formatDate(today);
    document.getElementById('expenseDate').value = formatDate(today);
    
    // 設置默認頁面
    showPage('dashboard');
    
    // 加載預設數據（如果需要）
    loadDefaultData();
    
    // 更新圖表
    setTimeout(() => {
        updateCharts();
        updateFinancialHealth();
    }, 500);
}

// 定期檢查Firebase連接狀態
function setupConnectionRetryMechanism() {
    // 每30秒檢查一次連接狀態
    const checkInterval = 30000; // 30秒
    
    // 保存interval ID以便在需要時清除
    window.connectionCheckInterval = setInterval(() => {
        if (navigator.onLine) {
            // 設備在線，檢查Firebase是否連接
            testFirebaseConnection()
                .then(isConnected => {
                    if (!isConnected) {
                        console.log('檢測到Firebase未連接，嘗試重新連接...');
                        // 嘗試重新連接
                        tryReconnectFirebase();
                    }
                })
                .catch(err => {
                    console.error('檢查Firebase連接時出錯:', err);
                });
        }
    }, checkInterval);
    
    // 頁面卸載時清除interval
    window.addEventListener('beforeunload', () => {
        if (window.connectionCheckInterval) {
            clearInterval(window.connectionCheckInterval);
        }
    });
}

// 測試Firebase連接
function testFirebaseConnection() {
    return new Promise((resolve) => {
        // 嘗試獲取一個小文檔以測試連接
        const db = firebase.firestore();
        const testRef = db.collection('connectionTest').doc('testDoc');
        
        // 設置超時以處理長時間無響應的情況
        const timeout = setTimeout(() => {
            resolve(false); // 假設連接失敗
        }, 5000);
        
        testRef.get()
            .then(() => {
                clearTimeout(timeout);
                resolve(true); // 連接成功
            })
            .catch(err => {
                clearTimeout(timeout);
                console.warn('Firebase連接測試失敗:', err);
                resolve(false); // 連接失敗
            });
    });
}

// 嘗試重新連接Firebase
function tryReconnectFirebase() {
    showToast('嘗試重新連接到雲端服務...', 'info');
    
    // 首先終止當前連接
    firebase.firestore().terminate()
        .then(() => {
            console.log('已終止現有連接');
            
            // 短暫延遲後重新初始化
            setTimeout(() => {
                // 重新載入Firebase (作為一個選項)
                // 注意：這會重置整個頁面，可能不是最佳選擇
                // window.location.reload();
                
                // 替代方案：重新初始化Firebase並刷新數據
                if (appState.user) {
                    loadUserData();
                    showToast('已重新連接', 'success');
                }
            }, 1000);
        })
        .catch(err => {
            console.error('重新連接Firebase時出錯:', err);
            showToast('無法重新連接，請稍後再試', 'error');
        });
}
