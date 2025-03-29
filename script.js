const firebaseConfig = {
    apiKey: "AIzaSyAaqadmDSgQ-huvY7uNNrPtjFSOl93jVEE",
    authDomain: "finance-d8f9e.firebaseapp.com",
    projectId: "finance-d8f9e",
    storageBucket: "finance-d8f9e.firebasestorage.app",
    messagingSenderId: "1:122645255279:web:25d577b6365c819ffbe99a",
    appId: "YOUR_APP_ID"
};

// 匯率API配置
const EXCHANGE_RATE_API_KEY = "7c54ea3dee46895c929cfeb0"; // 請替換為您的API密鑰
const EXCHANGE_RATE_API_URL = "https://v6.exchangerate-api.com/v6/";

// 匯率緩存
let rateCache = {};
let lastUpdateTime = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小時的毫秒數

// 備用匯率數據 - 當API不可用時使用
const backupExchangeRates = {
    "HKD": {
        "USD": 0.129,
        "CNY": 0.836,
        "EUR": 0.118,
        "GBP": 0.101,
        "JPY": 14.89
    },
    "USD": {
        "HKD": 7.75,
        "CNY": 6.48,
        "EUR": 0.92,
        "GBP": 0.78,
        "JPY": 115.3
    },
    "CNY": {
        "HKD": 1.196,
        "USD": 0.154,
        "EUR": 0.141,
        "GBP": 0.121,
        "JPY": 17.81
    },
    "EUR": {
        "HKD": 8.47,
        "USD": 1.09,
        "CNY": 7.07,
        "GBP": 0.85,
        "JPY": 126.0
    },
    "GBP": {
        "HKD": 9.95,
        "USD": 1.28,
        "CNY": 8.32,
        "EUR": 1.18,
        "JPY": 148.1
    },
    "JPY": {
        "HKD": 0.067,
        "USD": 0.0087,
        "CNY": 0.056,
        "EUR": 0.0079,
        "GBP": 0.0068
    }
};

// 可用貨幣列表
let availableCurrencies = [
    {code: "HKD", name: "港幣", symbol: "HK$"},
    {code: "USD", name: "美元", symbol: "$"},
    {code: "CNY", name: "人民幣", symbol: "¥"},
    {code: "EUR", name: "歐元", symbol: "€"},
    {code: "GBP", name: "英鎊", symbol: "£"},
    {code: "JPY", name: "日元", symbol: "¥"},
];

// 全域應用狀態
const appState = {
    accounts: [],
    categories: {
        income: [],
        expense: []
    },
    transactions: [],
    budgets: {
        total: 0,
        categories: [],
        resetCycle: 'monthly',
        resetDay: 1,
        inheritLastMonth: true
    },
    lastSyncTime: null,
    currentUser: null,
    exchangeRates: {}, // 用戶自定義匯率
    useRealTimeRates: true // 是否使用實時匯率
};

// 應用設定
let darkMode = false;
let fontSize = 'medium';
let defaultCurrency = 'HKD';
let decimalPlaces = 2;
let enableBudgetAlerts = true;
let alertThreshold = 80;
let enableFirebase = true;
let autoSync = true;

// Firebase 變數
let db, auth, firebaseInitialized = false;

// 模態框狀態跟踪
let modalQueue = [];
let currentModal = null;

// DOM 元素快取
const elements = {};

// 工具函數
function getElement(selector) {
    if (!elements[selector]) {
        elements[selector] = document.querySelector(selector);
    }
    return elements[selector];
}

function formatCurrency(amount, currency = defaultCurrency, places = decimalPlaces) {
    return amount.toFixed(places);
}

function showToast(message, type = 'info') {
    const toast = getElement('#toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.className = toast.className.replace('show', '');
    }, 3000);
}

function showLoadingMessage(message = '處理中...') {
    getElement('#loadingMessage').textContent = message;
    getElement('#loadingOverlay').style.display = 'flex';
}

function hideLoadingMessage() {
    getElement('#loadingOverlay').style.display = 'none';
}

// 顯示模態框
function showModal(modalId) {
    // 將模態框添加到隊列
    modalQueue.push(modalId);
    
    // 如果沒有其他模態框正在顯示，則顯示當前模態框
    if (!currentModal) {
        processModalQueue();
    }
}

// 關閉當前模態框
function closeCurrentModal() {
    if (currentModal) {
        const modal = getElement(currentModal);
        if (modal) {
            modal.style.display = 'none';
        }
        currentModal = null;
        
        // 處理隊列中的下一個模態框
        processModalQueue();
    }
}

// 處理模態框隊列
function processModalQueue() {
    if (modalQueue.length > 0) {
        currentModal = modalQueue.shift();
        const modal = getElement(currentModal);
        if (modal) {
            modal.style.display = 'block';
            document.body.classList.add('modal-active');
        } else {
            // 如果找不到模態框，處理下一個
            currentModal = null;
            processModalQueue();
        }
    } else {
        document.body.classList.remove('modal-active');
    }
}

// 顯示確認模態框
function showConfirmModal(message, onConfirm) {
    const confirmMessage = getElement('#confirmMessage');
    confirmMessage.textContent = message;
    
    getElement('#confirmYesBtn').onclick = () => {
        closeCurrentModal();
        if (typeof onConfirm === 'function') {
            onConfirm();
        }
    };
    
    // 顯示確認模態框
    showModal('#confirmModal');
}

// 獲取日期函數
function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 轉換日期格式
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('zh-HK', options);
}

// 生成唯一ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 初始化Firebase
function initializeFirebase() {
    if (typeof firebase === 'undefined') {
        console.warn('Firebase SDK not loaded');
        updateConnectionStatus('離線 (Firebase未載入)');
        return Promise.resolve(false);
    }
    
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        
        auth = firebase.auth();
        auth.onAuthStateChanged(handleAuthStateChanged);
        
        db = firebase.firestore();
        
        // 使用離線持久化
        db.enablePersistence({ synchronizeTabs: true })
            .catch(err => {
                if (err.code === 'failed-precondition') {
                    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
                } else if (err.code === 'unimplemented') {
                    console.warn('The current browser does not support all of the features required to enable persistence');
                }
            });
        
        // 監聽連接狀態
        try {
            db.collection('status').doc('connection')
                .set({ timestamp: firebase.firestore.FieldValue.serverTimestamp() })
                .then(() => {
                    updateConnectionStatus('已連接');
                    firebaseInitialized = true;
                    return true;
                })
                .catch(error => {
                    console.error('Firebase connection test failed:', error);
                    updateConnectionStatus('連接失敗');
                    return false;
                });
            
            return Promise.resolve(true);
        } catch (connError) {
            console.error('Connection test error:', connError);
            updateConnectionStatus('測試連接失敗');
            return Promise.resolve(false);
        }
    } catch (error) {
        console.error('Firebase initialization error:', error);
        updateConnectionStatus('初始化失敗');
        return Promise.resolve(false);
    }
}

// 更新連接狀態
function updateConnectionStatus(status) {
    const connectionStatus = getElement('#connectionStatus');
    connectionStatus.textContent = status;
}

// 處理Firebase驗證狀態更改
function handleAuthStateChanged(user) {
    appState.currentUser = user;
    
    if (user) {
        // 用戶已登入
        getElement('#loginStatus').textContent = user.email || user.uid.substring(0, 6) + '...';
        getElement('#syncStatus').textContent = '已登入';
        getElement('#loginBtn').style.display = 'none';
        getElement('#logoutBtn').style.display = 'inline-block';
        
        // 第一次登入後立即嘗試加載數據
        loadDataFromFirestore();
    } else {
        // 用戶未登入
        getElement('#loginStatus').textContent = '未登入';
        getElement('#syncStatus').textContent = '未登入';
        getElement('#loginBtn').style.display = 'inline-block';
        getElement('#logoutBtn').style.display = 'none';
    }
}

// 與Firebase同步數據
function syncData() {
    if (!enableFirebase || !firebaseInitialized) {
        showToast('雲端同步已禁用或未初始化，使用本地模式', 'info');
        return Promise.resolve(false);
    }
    
    if (!appState.currentUser) {
        showToast('請先登入再同步數據', 'warning');
        return Promise.resolve(false);
    }
    
    showLoadingMessage('同步數據中...');
    
    try {
        const userId = appState.currentUser.uid;
        const userData = {
            accounts: appState.accounts,
            categories: appState.categories,
            budgets: appState.budgets,
            exchangeRates: appState.exchangeRates,
            useRealTimeRates: appState.useRealTimeRates,
            availableCurrencies: availableCurrencies,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // 使用一個transaction來確保數據一致性
        return db.runTransaction(async (transaction) => {
            // 保存交易記錄
            const batch = db.batch();
            
            // 先清空用戶現有的交易記錄
            const transactionsQuery = await db.collection(`users/${userId}/transactions`).get();
            transactionsQuery.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            // 添加新的交易記錄
            appState.transactions.forEach(transaction => {
                const transactionRef = db.collection(`users/${userId}/transactions`).doc(transaction.id);
                batch.set(transactionRef, transaction);
            });
            
            // 提交批處理
            await batch.commit();
            
            // 保存用戶數據
            await db.collection('users').doc(userId).set(userData, { merge: true });
            
            return true;
        })
        .then(() => {
            appState.lastSyncTime = new Date();
            localStorage.setItem('lastSyncTime', appState.lastSyncTime.toString());
            getElement('#lastSyncTime').textContent = appState.lastSyncTime.toLocaleString();
            hideLoadingMessage();
            showToast('數據同步成功', 'success');
            return true;
        })
        .catch(error => {
            console.error('Transaction failed:', error);
            hideLoadingMessage();
            showToast('數據同步失敗: ' + error.message, 'error');
            return false;
        });
    } catch (error) {
        console.error('Sync data error:', error);
        hideLoadingMessage();
        showToast('同步過程出錯', 'error');
        return Promise.resolve(false);
    }
}

// 從Firebase加載數據
function loadDataFromFirestore() {
    if (!enableFirebase || !firebaseInitialized) {
        loadFromLocalStorage();
        return Promise.resolve(false);
    }
    
    if (!appState.currentUser) {
        loadFromLocalStorage();
        return Promise.resolve(false);
    }
    
    showLoadingMessage('從雲端加載數據...');
    
    try {
        const userId = appState.currentUser.uid;
        
        return db.collection('users').doc(userId).get()
            .then(doc => {
                if (doc.exists) {
                    const userData = doc.data();
                    
                    // 更新應用狀態
                    if (userData.accounts && userData.accounts.length > 0) {
                        appState.accounts = userData.accounts;
                    }
                    
                    if (userData.categories) {
                        appState.categories = userData.categories;
                    }
                    
                    if (userData.budgets) {
                        appState.budgets = userData.budgets;
                    }
                    
                    // 更新匯率設定
                    if (userData.exchangeRates) {
                        appState.exchangeRates = userData.exchangeRates;
                    }
                    
                    if (userData.useRealTimeRates !== undefined) {
                        appState.useRealTimeRates = userData.useRealTimeRates;
                    }
                    
                    // 更新可用貨幣
                    if (userData.availableCurrencies && userData.availableCurrencies.length > 0) {
                        availableCurrencies = userData.availableCurrencies;
                    }
                    
                    // 獲取交易記錄
                    return db.collection(`users/${userId}/transactions`).get();
                } else {
                    // 如果沒有文檔，使用本地數據
                    loadFromLocalStorage();
                    hideLoadingMessage();
                    return Promise.resolve({ empty: true });
                }
            })
            .then(querySnapshot => {
                if (querySnapshot.empty) {
                    // 如果沒有交易記錄，保留本地交易記錄
                    const transactionsJson = localStorage.getItem('transactions');
                    if (transactionsJson) {
                        try {
                            appState.transactions = JSON.parse(transactionsJson) || [];
                        } catch (e) {
                            console.warn('解析本地交易數據失敗', e);
                            appState.transactions = [];
                        }
                    }
                } else {
                    // 處理從Firebase加載的交易記錄
                    const transactions = [];
                    querySnapshot.forEach(doc => {
                        transactions.push(doc.data());
                    });
                    appState.transactions = transactions;
                }
                
                // 保存到localStorage作為備份
                saveToLocalStorage();
                
                // 更新同步時間
                appState.lastSyncTime = new Date();
                localStorage.setItem('lastSyncTime', appState.lastSyncTime.toString());
                getElement('#lastSyncTime').textContent = appState.lastSyncTime.toLocaleString();
                
                // 更新UI
                updateAllUI();
                
                // 初始化匯率數據
                initializeExchangeRates();
                
                hideLoadingMessage();
                showToast('數據加載成功', 'success');
                return true;
            })
            .catch(error => {
                console.error('Error loading data from Firestore:', error);
                loadFromLocalStorage();
                hideLoadingMessage();
                showToast('從雲端加載數據失敗，使用本地數據', 'warning');
                return false;
            });
    } catch (error) {
        console.error('Load data error:', error);
        loadFromLocalStorage();
        hideLoadingMessage();
        showToast('加載數據出錯，使用本地數據', 'error');
        return Promise.resolve(false);
    }
}

// 保存到localStorage
function saveToLocalStorage() {
    localStorage.setItem('accounts', JSON.stringify(appState.accounts));
    localStorage.setItem('categories', JSON.stringify(appState.categories));
    localStorage.setItem('transactions', JSON.stringify(appState.transactions));
    localStorage.setItem('budgets', JSON.stringify(appState.budgets));
    localStorage.setItem('exchangeRates', JSON.stringify(appState.exchangeRates));
    localStorage.setItem('useRealTimeRates', appState.useRealTimeRates.toString());
    localStorage.setItem('availableCurrencies', JSON.stringify(availableCurrencies));
    
    localStorage.setItem('darkMode', darkMode.toString());
    localStorage.setItem('fontSize', fontSize);
    localStorage.setItem('defaultCurrency', defaultCurrency);
    localStorage.setItem('decimalPlaces', decimalPlaces.toString());
    localStorage.setItem('enableBudgetAlerts', enableBudgetAlerts.toString());
    localStorage.setItem('alertThreshold', alertThreshold.toString());
    localStorage.setItem('enableFirebase', enableFirebase.toString());
    localStorage.setItem('autoSync', autoSync.toString());
    
    // 匯率緩存
    localStorage.setItem('rateCache', JSON.stringify(rateCache));
    if (lastUpdateTime) {
        localStorage.setItem('lastRateUpdateTime', lastUpdateTime.toString());
    }
    
    // 如果啟用了自動同步，同步到Firebase
    if (enableFirebase && autoSync && appState.currentUser && firebaseInitialized) {
        syncData().catch(error => {
            console.error('Auto sync failed:', error);
        });
    }
}

// 從localStorage加載
function loadFromLocalStorage() {
    try {
        const accountsJson = localStorage.getItem('accounts');
        if (accountsJson) {
            appState.accounts = JSON.parse(accountsJson) || [];
        }
        
        const categoriesJson = localStorage.getItem('categories');
        if (categoriesJson) {
            appState.categories = JSON.parse(categoriesJson) || { income: [], expense: [] };
        }
        
        const transactionsJson = localStorage.getItem('transactions');
        if (transactionsJson) {
            appState.transactions = JSON.parse(transactionsJson) || [];
        }
        
        const budgetsJson = localStorage.getItem('budgets');
        if (budgetsJson) {
            appState.budgets = JSON.parse(budgetsJson) || {
                total: 0,
                categories: [],
                resetCycle: 'monthly',
                resetDay: 1,
                inheritLastMonth: true
            };
        }
        
        // 加載匯率設定
        const exchangeRatesJson = localStorage.getItem('exchangeRates');
        if (exchangeRatesJson) {
            appState.exchangeRates = JSON.parse(exchangeRatesJson) || {};
        }
        
        const useRealTimeRatesStr = localStorage.getItem('useRealTimeRates');
        if (useRealTimeRatesStr !== null) {
            appState.useRealTimeRates = useRealTimeRatesStr === 'true';
        }
        
        // 加載可用貨幣
        const availableCurrenciesJson = localStorage.getItem('availableCurrencies');
        if (availableCurrenciesJson) {
            const parsed = JSON.parse(availableCurrenciesJson);
            if (parsed && parsed.length > 0) {
                availableCurrencies = parsed;
            }
        }
        
        // 加載匯率緩存
        const rateCacheJson = localStorage.getItem('rateCache');
        if (rateCacheJson) {
            rateCache = JSON.parse(rateCacheJson) || {};
        }
        
        const lastRateUpdateTimeStr = localStorage.getItem('lastRateUpdateTime');
        if (lastRateUpdateTimeStr) {
            lastUpdateTime = new Date(lastRateUpdateTimeStr);
        }
        
        // 加載其他設定
        const darkModeStr = localStorage.getItem('darkMode');
        if (darkModeStr !== null) {
            darkMode = darkModeStr === 'true';
        }
        
        const fontSizeStr = localStorage.getItem('fontSize');
        if (fontSizeStr) {
            fontSize = fontSizeStr;
        }
        
        const defaultCurrencyStr = localStorage.getItem('defaultCurrency');
        if (defaultCurrencyStr) {
            defaultCurrency = defaultCurrencyStr;
        }
        
        const decimalPlacesStr = localStorage.getItem('decimalPlaces');
        if (decimalPlacesStr !== null) {
            decimalPlaces = parseInt(decimalPlacesStr, 10);
        }
        
        const enableBudgetAlertsStr = localStorage.getItem('enableBudgetAlerts');
        if (enableBudgetAlertsStr !== null) {
            enableBudgetAlerts = enableBudgetAlertsStr === 'true';
        }
        
        const alertThresholdStr = localStorage.getItem('alertThreshold');
        if (alertThresholdStr !== null) {
            alertThreshold = parseInt(alertThresholdStr, 10);
        }
        
        const enableFirebaseStr = localStorage.getItem('enableFirebase');
        if (enableFirebaseStr !== null) {
            enableFirebase = enableFirebaseStr === 'true';
        }
        
        const autoSyncStr = localStorage.getItem('autoSync');
        if (autoSyncStr !== null) {
            autoSync = autoSyncStr === 'true';
        }
        
        const lastSyncTimeStr = localStorage.getItem('lastSyncTime');
        if (lastSyncTimeStr) {
            appState.lastSyncTime = new Date(lastSyncTimeStr);
            getElement('#lastSyncTime').textContent = appState.lastSyncTime.toLocaleString();
        } else {
            getElement('#lastSyncTime').textContent = '從未同步';
        }
        
        // 更新UI
        updateAllUI();
        
        // 初始化匯率數據
        initializeExchangeRates();
    } catch (error) {
        console.error('Error loading from local storage:', error);
        showToast('加載本地數據出錯', 'error');
    }
}

// 初始化匯率數據和加載匯率設定
async function initializeExchangeRates() {
    // 如果啟用了實時匯率，嘗試刷新匯率數據
    if (appState.useRealTimeRates) {
        const now = new Date().getTime();
        
        // 如果上次更新時間超過24小時或沒有更新過，則更新匯率
        if (!lastUpdateTime || (now - lastUpdateTime > CACHE_DURATION)) {
            await refreshAllExchangeRates();
        }
    }
}

// 刷新所有匯率
async function refreshAllExchangeRates() {
    try {
        showLoadingMessage('更新匯率數據中...');
        
        // 使用基礎貨幣獲取所有匯率
        const response = await fetch(`${EXCHANGE_RATE_API_URL}${EXCHANGE_RATE_API_KEY}/latest/USD`);
        const data = await response.json();
        
        if (data.result === 'success') {
            const rates = data.conversion_rates;
            
            // 清空緩存
            rateCache = {};
            
            // 為每種貨幣對生成匯率
            for (const fromCurrency of availableCurrencies) {
                for (const toCurrency of availableCurrencies) {
                    if (fromCurrency.code === toCurrency.code) continue;
                    
                    const fromToUSD = fromCurrency.code === 'USD' ? 1 : 1 / rates[fromCurrency.code];
                    const usdToTo = rates[toCurrency.code];
                    const rate = fromToUSD * usdToTo;
                    
                    const cacheKey = `${fromCurrency.code}_${toCurrency.code}`;
                    rateCache[cacheKey] = rate;
                }
            }
            
            lastUpdateTime = new Date().getTime();
            
            // 保存到localStorage
            localStorage.setItem('rateCache', JSON.stringify(rateCache));
            localStorage.setItem('lastRateUpdateTime', lastUpdateTime.toString());
            
            hideLoadingMessage();
            showToast('匯率已更新', 'success');
            return true;
        } else {
            console.error('Exchange rate API error:', data);
            hideLoadingMessage();
            showToast('匯率更新失敗，使用備用匯率', 'warning');
            return false;
        }
    } catch (error) {
        console.error('Failed to refresh exchange rates:', error);
        hideLoadingMessage();
        showToast('無法連接匯率服務，使用備用匯率', 'error');
        return false;
    }
}

// 獲取匯率
async function getExchangeRate(fromCurrency, toCurrency) {
    // 如果相同貨幣，返回1
    if (fromCurrency === toCurrency) {
        return 1;
    }
    
    // 如果不使用實時匯率，使用用戶自定義匯率或備用匯率
    if (!appState.useRealTimeRates) {
        // 使用用戶自定義匯率
        if (appState.exchangeRates[`${fromCurrency}_${toCurrency}`]) {
            return appState.exchangeRates[`${fromCurrency}_${toCurrency}`];
        }
        
        // 使用備用匯率
        if (backupExchangeRates[fromCurrency] && backupExchangeRates[fromCurrency][toCurrency]) {
            return backupExchangeRates[fromCurrency][toCurrency];
        }
        
        // 如果無法找到直接匯率，嘗試通過USD中轉
        if (backupExchangeRates[fromCurrency] && backupExchangeRates[fromCurrency]["USD"] &&
            backupExchangeRates["USD"] && backupExchangeRates["USD"][toCurrency]) {
            return backupExchangeRates[fromCurrency]["USD"] * backupExchangeRates["USD"][toCurrency];
        }
        
        return 1; // 默認匯率
    }
    
    const cacheKey = `${fromCurrency}_${toCurrency}`;
    const now = new Date().getTime();
    
    // 檢查緩存
    if (rateCache[cacheKey] && lastUpdateTime && (now - lastUpdateTime < CACHE_DURATION)) {
        return rateCache[cacheKey];
    }
    
    try {
        // 獲取實時匯率
        const response = await fetch(`${EXCHANGE_RATE_API_URL}${EXCHANGE_RATE_API_KEY}/pair/${fromCurrency}/${toCurrency}`);
        const data = await response.json();
        
        if (data.result === 'success') {
            const rate = data.conversion_rate;
            
            // 更新緩存
            rateCache[cacheKey] = rate;
            lastUpdateTime = now;
            
            // 保存到localStorage
            localStorage.setItem('rateCache', JSON.stringify(rateCache));
            localStorage.setItem('lastRateUpdateTime', lastUpdateTime.toString());
            
            return rate;
        } else {
            console.error('Exchange rate API error:', data);
            return useBackupRate(fromCurrency, toCurrency);
        }
    } catch (error) {
        console.error('Failed to fetch exchange rate:', error);
        return useBackupRate(fromCurrency, toCurrency);
    }
}

// 使用備用匯率
function useBackupRate(fromCurrency, toCurrency) {
    // 使用用戶自定義匯率
    if (appState.exchangeRates[`${fromCurrency}_${toCurrency}`]) {
        return appState.exchangeRates[`${fromCurrency}_${toCurrency}`];
    }
    
    // 使用備用匯率表
    if (backupExchangeRates[fromCurrency] && backupExchangeRates[fromCurrency][toCurrency]) {
        return backupExchangeRates[fromCurrency][toCurrency];
    }
    
    // 如果無法找到直接匯率，嘗試通過USD中轉
    if (backupExchangeRates[fromCurrency] && backupExchangeRates[fromCurrency]["USD"] &&
        backupExchangeRates["USD"] && backupExchangeRates["USD"][toCurrency]) {
        return backupExchangeRates[fromCurrency]["USD"] * backupExchangeRates["USD"][toCurrency];
    }
    
    return 1; // 默認匯率
}

// 計算總資產
async function calculateTotalAssets() {
    let total = 0;
    
    for (const account of appState.accounts) {
        // 將所有貨幣轉換為預設貨幣
        let amount = account.balance;
        if (account.currency !== defaultCurrency) {
            try {
                const rate = await getExchangeRate(account.currency, defaultCurrency);
                amount = account.balance * rate;
            } catch (error) {
                console.error('Exchange rate calculation error:', error);
            }
        }
        total += amount;
    }
    
    return total;
}

// 更新匯率信息UI
async function updateExchangeRateInfo() {
    const fromAccount = getElement('#fromAccount').value;
    const toAccount = getElement('#toAccount').value;
    const amount = parseFloat(getElement('#transferAmount').value) || 0;
    
    if (fromAccount && toAccount) {
        const fromAccountObj = appState.accounts.find(acc => acc.id === fromAccount);
        const toAccountObj = appState.accounts.find(acc => acc.id === toAccount);
        
        if (fromAccountObj && toAccountObj) {
            const fromCurrency = fromAccountObj.currency;
            const toCurrency = toAccountObj.currency;
            
            // 顯示匯率信息區域
            if (fromCurrency !== toCurrency) {
                getElement('#exchangeRateInfo').style.display = 'block';
                // 顯示"正在獲取匯率..."
                getElement('#currentExchangeRate').textContent = "獲取中...";
                
                try {
                    const rate = await getExchangeRate(fromCurrency, toCurrency);
                    const receivingAmount = amount * rate;
                    
                    getElement('#currentExchangeRate').textContent = rate.toFixed(4);
                    getElement('#receivingAmount').textContent = formatCurrency(receivingAmount, toCurrency);
                } catch (error) {
                    console.error('Error updating exchange rate info:', error);
                    getElement('#currentExchangeRate').textContent = "獲取失敗";
                    getElement('#receivingAmount').textContent = "計算失敗";
                }
            } else {
                getElement('#exchangeRateInfo').style.display = 'none';
            }
        }
    }
}

// 計算今日收入
async function calculateTodayIncome() {
    const today = getTodayDate();
    
    // 篩選今日收入交易
    const incomeTransactions = appState.transactions
        .filter(t => t.type === 'income' && t.date === today);
    
    // 使用Promise.all來等待所有匯率轉換完成
    try {
        let total = 0;
        
        for (const transaction of incomeTransactions) {
            const account = appState.accounts.find(acc => acc.id === transaction.accountId);
            if (account) {
                if (account.currency === defaultCurrency) {
                    total += transaction.amount;
                } else {
                    const rate = await getExchangeRate(account.currency, defaultCurrency);
                    total += transaction.amount * rate;
                }
            }
        }
        
        return total;
    } catch (error) {
        console.error('Error calculating income:', error);
        
        // 如果匯率計算失敗，回退到簡單加總
        return incomeTransactions.reduce((total, t) => total + t.amount, 0);
    }
}

// 計算今日支出
async function calculateTodayExpense() {
    const today = getTodayDate();
    
    // 篩選今日支出交易
    const expenseTransactions = appState.transactions
        .filter(t => t.type === 'expense' && t.date === today);
    
    // 使用Promise.all來等待所有匯率轉換完成
    try {
        let total = 0;
        
        for (const transaction of expenseTransactions) {
            const account = appState.accounts.find(acc => acc.id === transaction.accountId);
            if (account) {
                if (account.currency === defaultCurrency) {
                    total += transaction.amount;
                } else {
                    const rate = await getExchangeRate(account.currency, defaultCurrency);
                    total += transaction.amount * rate;
                }
            }
        }
        
        return total;
    } catch (error) {
        console.error('Error calculating expense:', error);
        
        // 如果匯率計算失敗，回退到簡單加總
        return expenseTransactions.reduce((total, t) => total + t.amount, 0);
    }
}

// 獲取今日交易
function getTodayTransactions() {
    const today = getTodayDate();
    return appState.transactions.filter(t => t.date === today);
}

// 獲取近期交易
function getRecentTransactions(limit = 5) {
    return [...appState.transactions]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, limit);
}

// 根據條件搜索交易
function searchTransactions(startDate, endDate, type, categoryId) {
    return appState.transactions.filter(t => {
        const transactionDate = new Date(t.date);
        
        // 日期範圍過濾
        if (startDate && transactionDate < new Date(startDate)) return false;
        if (endDate && transactionDate > new Date(endDate)) return false;
        
        // 類型過濾
        if (type !== 'all' && t.type !== type) return false;
        
        // 類別過濾
        if (categoryId !== 'all' && t.categoryId !== categoryId) return false;
        
        return true;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
}

// 獲取戶口
function getAccount(accountId) {
    return appState.accounts.find(a => a.id === accountId);
}

// 獲取類別
function getCategory(categoryId, type) {
    return appState.categories[type].find(c => c.id === categoryId);
}

// 計算財務健康指數
async function calculateFinancialHealth() {
    if (appState.transactions.length === 0) {
        return {
            score: '--',
            status: '尚無足夠數據'
        };
    }
    
    // 模擬計算財務健康指數
    try {
        let totalIncome = 0;
        let totalExpense = 0;
        
        // 計算總收入
        const incomeTransactions = appState.transactions.filter(t => t.type === 'income');
        for (const transaction of incomeTransactions) {
            const account = appState.accounts.find(acc => acc.id === transaction.accountId);
            if (account) {
                if (account.currency === defaultCurrency) {
                    totalIncome += transaction.amount;
                } else {
                    const rate = await getExchangeRate(account.currency, defaultCurrency);
                    totalIncome += transaction.amount * rate;
                }
            }
        }
        
        // 計算總支出
        const expenseTransactions = appState.transactions.filter(t => t.type === 'expense');
        for (const transaction of expenseTransactions) {
            const account = appState.accounts.find(acc => acc.id === transaction.accountId);
            if (account) {
                if (account.currency === defaultCurrency) {
                    totalExpense += transaction.amount;
                } else {
                    const rate = await getExchangeRate(account.currency, defaultCurrency);
                    totalExpense += transaction.amount * rate;
                }
            }
        }
        
        if (totalIncome === 0) {
            return {
                score: '--',
                status: '尚無收入數據'
            };
        }
        
        // 計算收支比率
        const expenseRatio = totalExpense / totalIncome;
        
        // 計算財務健康指數 (0-100)
        let score = 0;
        let status = '';
        
        if (expenseRatio < 0.3) {
            score = 90 + Math.floor(Math.random() * 11); // 90-100
            status = '優秀';
        } else if (expenseRatio < 0.5) {
            score = 80 + Math.floor(Math.random() * 10); // 80-89
            status = '良好';
        } else if (expenseRatio < 0.7) {
            score = 70 + Math.floor(Math.random() * 10); // 70-79
            status = '一般';
        } else if (expenseRatio < 0.9) {
            score = 60 + Math.floor(Math.random() * 10); // 60-69
            status = '欠佳';
        } else {
            score = 40 + Math.floor(Math.random() * 20); // 40-59
            status = '需注意';
        }
        
        return {
            score,
            status
        };
    } catch (error) {
        console.error('Error calculating financial health:', error);
        
        return {
            score: '--',
            status: '計算錯誤'
        };
    }
}

// 生成財務建議
async function generateFinancialAdvice() {
    // 如果沒有足夠數據，返回一般建議
    if (appState.transactions.length < 5) {
        return '持續記錄您的收入和支出，以獲得更準確的財務建議。';
    }
    
    try {
        const totalAssets = await calculateTotalAssets();
        
        // 計算總支出並按類別分類
        const expensesByCategory = {};
        let totalExpenses = 0;
        
        for (const transaction of appState.transactions.filter(t => t.type === 'expense')) {
            const account = appState.accounts.find(acc => acc.id === transaction.accountId);
            if (account) {
                let amount = transaction.amount;
                
                if (account.currency !== defaultCurrency) {
                    const rate = await getExchangeRate(account.currency, defaultCurrency);
                    amount = transaction.amount * rate;
                }
                
                totalExpenses += amount;
                
                if (!expensesByCategory[transaction.categoryId]) {
                    expensesByCategory[transaction.categoryId] = 0;
                }
                expensesByCategory[transaction.categoryId] += amount;
            }
        }
        
        // 找出最大支出類別
        let maxExpenseCategoryId = null;
        let maxExpenseAmount = 0;
        
        for (const categoryId in expensesByCategory) {
            if (expensesByCategory[categoryId] > maxExpenseAmount) {
                maxExpenseAmount = expensesByCategory[categoryId];
                maxExpenseCategoryId = categoryId;
            }
        }
        
        // 基於數據生成個性化建議
        let advice = '';
        
        if (maxExpenseCategoryId) {
            const maxCategory = appState.categories.expense.find(c => c.id === maxExpenseCategoryId);
            const categoryName = maxCategory ? maxCategory.name : '未知類別';
            
            advice = `您在「${categoryName}」的支出最高，佔總支出的${Math.round((maxExpenseAmount / totalExpenses) * 100)}%。`;
            
            if ((maxExpenseAmount / totalExpenses) > 0.4) {
                advice += ` 建議檢視這方面的支出，尋找節約空間。`;
            }
        }
        
        // 基於總資產提供建議
        if (totalAssets <= 0) {
            advice += ' 您的總資產為負數，建議優先處理債務。';
        } else if (appState.accounts.length === 1) {
            advice += ' 建議考慮建立多個戶口來更好地管理資金。';
        } else if (appState.categories.expense.length < 3) {
            advice += ' 設定更多支出類別可以幫助您更準確地追蹤花費模式。';
        }
        
        return advice || '您的財務狀況良好。繼續追蹤您的收支，以便獲得更個性化的建議。';
    } catch (error) {
        console.error('Error generating financial advice:', error);
        return '無法生成財務建議，請稍後再試。';
    }
}

// 更新儀表板UI
async function updateDashboardUI() {
    try {
        // 更新總資產
        const totalAssets = await calculateTotalAssets();
        getElement('#totalAssets span:last-child').textContent = formatCurrency(totalAssets);
        
        // 更新今日收入
        const todayIncome = await calculateTodayIncome();
        getElement('#todayIncome span:last-child').textContent = formatCurrency(todayIncome);
        
        // 更新今日支出
        const todayExpense = await calculateTodayExpense();
        getElement('#todayExpense span:last-child').textContent = formatCurrency(todayExpense);
        
        // 更新今日交易
        const todayTransactionsList = getElement('#todayTransactions');
        const todayTransactions = getTodayTransactions();
        
        if (todayTransactions.length === 0) {
            todayTransactionsList.innerHTML = '<p class="empty-message">今日尚無交易記錄</p>';
        } else {
            todayTransactionsList.innerHTML = '';
            todayTransactions.forEach(transaction => {
                const account = getAccount(transaction.accountId);
                const category = getCategory(transaction.categoryId, transaction.type);
                
                const transactionElement = document.createElement('div');
                transactionElement.className = 'transaction-item';
                transactionElement.innerHTML = `
                    <div class="transaction-info">
                        <div class="transaction-category">${category ? category.name : '未知類別'}</div>
                        <div class="transaction-details">${account ? account.name : '未知戶口'}</div>
                    </div>
                    <div class="transaction-amount ${transaction.type}">
                        ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount, account ? account.currency : defaultCurrency)}
                    </div>
                `;
                
                todayTransactionsList.appendChild(transactionElement);
            });
        }
        
        // 更新近期交易
        const recentTransactionsList = getElement('#recentTransactions');
        const recentTransactions = getRecentTransactions();
        
        if (recentTransactions.length === 0) {
            recentTransactionsList.innerHTML = '<p class="empty-message">尚無交易記錄</p>';
        } else {
            recentTransactionsList.innerHTML = '';
            recentTransactions.forEach(transaction => {
                const account = getAccount(transaction.accountId);
                const category = getCategory(transaction.categoryId, transaction.type);
                
                const transactionElement = document.createElement('div');
                transactionElement.className = 'transaction-item';
                transactionElement.innerHTML = `
                    <div class="transaction-info">
                        <div class="transaction-category">${category ? category.name : '未知類別'}</div>
                        <div class="transaction-details">
                            ${formatDate(transaction.date)} | ${account ? account.name : '未知戶口'}
                        </div>
                    </div>
                    <div class="transaction-amount ${transaction.type}">
                        ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount, account ? account.currency : defaultCurrency)}
                    </div>
                `;
                
                recentTransactionsList.appendChild(transactionElement);
            });
        }
        
        // 更新預算狀態
        const budgetStatus = getElement('#budgetStatus');
        if (appState.budgets.total <= 0 && (!appState.budgets.categories || appState.budgets.categories.length === 0)) {
            budgetStatus.innerHTML = `
                <p class="empty-message">尚未設定預算</p>
                <button class="button-primary" id="setupBudgetBtn">設定預算</button>
            `;
            
            getElement('#setupBudgetBtn').addEventListener('click', () => {
                navigateTo('#budgets');
            });
        } else {
            // 計算當前預算使用情況
            const today = new Date();
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
            const monthEnd = today.toISOString().split('T')[0];
            
            // 計算當月總支出
            let monthlyExpense = 0;
            for (const transaction of appState.transactions.filter(t => 
                t.type === 'expense' && t.date >= monthStart && t.date <= monthEnd)) {
                
                const account = appState.accounts.find(acc => acc.id === transaction.accountId);
                if (account) {
                    if (account.currency === defaultCurrency) {
                        monthlyExpense += transaction.amount;
                    } else {
                        const rate = await getExchangeRate(account.currency, defaultCurrency);
                        monthlyExpense += transaction.amount * rate;
                    }
                }
            }
            
            const budgetPercentage = (monthlyExpense / appState.budgets.total) * 100;
            
            let statusClass = '';
            if (budgetPercentage > 90) {
                statusClass = 'danger';
            } else if (budgetPercentage > alertThreshold) {
                statusClass = 'warning';
            }
            
            budgetStatus.innerHTML = `
                <div class="budget-progress">
                    <div class="progress-bar">
                        <div class="progress-fill ${statusClass}" style="width: ${Math.min(budgetPercentage, 100)}%"></div>
                    </div>
                    <div class="progress-labels">
                        <span>已使用: ${formatCurrency(monthlyExpense)}</span>
                        <span>預算: ${formatCurrency(appState.budgets.total)}</span>
                    </div>
                </div>
            `;
        }
        
        // 更新財務健康指數
        const healthData = await calculateFinancialHealth();
        getElement('#healthScore').textContent = healthData.score;
        getElement('#healthScore').nextElementSibling.textContent = healthData.status;
        
        // 更新財務建議
        getElement('#financialAdvice').textContent = await generateFinancialAdvice();
    } catch (error) {
        console.error('Error updating dashboard UI:', error);
        showToast('更新儀表板錯誤', 'error');
    }
}

// 更新戶口UI
function updateAccountsUI() {
    const accountsList = getElement('#accountsList');
    if (appState.accounts.length === 0) {
        accountsList.innerHTML = '<p class="empty-message">尚未設置任何戶口</p>';
    } else {
        accountsList.innerHTML = '';
        
        // 根據視圖選項顯示不同的戶口列表
        const isCardView = getElement('#cardViewBtn').classList.contains('active');
        
        if (isCardView) {
            accountsList.className = 'accounts-grid';
            
            appState.accounts.forEach(account => {
                const accountCard = document.createElement('div');
                accountCard.className = 'account-card';
                accountCard.innerHTML = `
                    <div class="account-name">${account.name}</div>
                    <div class="account-balance">${formatCurrency(account.balance, account.currency)}</div>
                    <div class="account-type">${getAccountTypeName(account.type)} · ${account.currency}</div>
                    <div class="account-actions">
                        <button class="edit-account" data-id="${account.id}"><i class="fas fa-edit"></i></button>
                        <button class="delete-account" data-id="${account.id}"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                
                accountsList.appendChild(accountCard);
            });
        } else {
            accountsList.className = 'accounts-list';
            
            appState.accounts.forEach(account => {
                const accountRow = document.createElement('div');
                accountRow.className = 'account-row';
                accountRow.innerHTML = `
                    <div class="account-details">
                        <div class="account-name">${account.name}</div>
                        <div class="account-type">${getAccountTypeName(account.type)} · ${account.currency}</div>
                    </div>
                    <div class="account-balance">${formatCurrency(account.balance, account.currency)}</div>
                    <div class="account-actions">
                        <button class="edit-account" data-id="${account.id}"><i class="fas fa-edit"></i></button>
                        <button class="delete-account" data-id="${account.id}"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                
                accountsList.appendChild(accountRow);
            });
        }
        
        // 添加事件監聽器
        document.querySelectorAll('.edit-account').forEach(button => {
            button.addEventListener('click', e => {
                const accountId = e.currentTarget.getAttribute('data-id');
                editAccount(accountId);
            });
        });
        
        document.querySelectorAll('.delete-account').forEach(button => {
            button.addEventListener('click', e => {
                const accountId = e.currentTarget.getAttribute('data-id');
                deleteAccount(accountId);
            });
        });
    }
    
    // 更新轉賬戶口選擇
    updateAccountSelects();
}

// 更新戶口選擇下拉框
function updateAccountSelects() {
    const selects = [
        '#fromAccount', 
        '#toAccount', 
        '#incomeAccount', 
        '#expenseAccount'
    ];
    
    selects.forEach(selector => {
        const select = getElement(selector);
        if (select) {
            // 保存當前選中的值
            const currentValue = select.value;
            
            // 清空選項
            select.innerHTML = '<option value="" disabled selected>選擇戶口</option>';
            
            // 添加戶口選項
            appState.accounts.forEach(account => {
                const option = document.createElement('option');
                option.value = account.id;
                option.textContent = `${account.name} (${formatCurrency(account.balance, account.currency)})`;
                // 如果是目標戶口，添加貨幣信息
                if (selector === '#toAccount' || selector === '#fromAccount') {
                    option.textContent = `${account.name} (${account.currency})`;
                }
                select.appendChild(option);
            });
            
            // 嘗試恢復之前選中的值
            if (currentValue && appState.accounts.some(acc => acc.id === currentValue)) {
                select.value = currentValue;
            }
        }
    });
    
    // 更新匯率信息
    updateExchangeRateInfo();
}

// 獲取戶口類型名稱
function getAccountTypeName(type) {
    const typeMap = {
        'cash': '現金',
        'bank': '銀行戶口',
        'credit': '信用卡',
        'investment': '投資',
        'other': '其他'
    };
    
    return typeMap[type] || '未知類型';
}

// 新增戶口
function addAccount() {
    // 重置表單
    getElement('#accountName').value = '';
    getElement('#accountType').value = '';
    getElement('#initialBalance').value = '';
    getElement('#currency').value = defaultCurrency;
    getElement('#accountNote').value = '';
    
    // 更新貨幣選擇
    updateCurrencySelect();
    
    // 顯示模態框
    showModal('#accountModal');
    getElement('#accountModal h2').textContent = '新增戶口';
    
    getElement('#saveAccountBtn').onclick = () => {
        const name = getElement('#accountName').value.trim();
        const type = getElement('#accountType').value;
        const initialBalance = parseFloat(getElement('#initialBalance').value) || 0;
        const currency = getElement('#currency').value;
        const note = getElement('#accountNote').value.trim();
        
        if (!name) {
            showToast('請輸入戶口名稱', 'warning');
            return;
        }
        
        if (!type) {
            showToast('請選擇戶口類型', 'warning');
            return;
        }
        
        const newAccount = {
            id: generateId(),
            name,
            type,
            balance: initialBalance,
            currency,
            note,
            createdAt: new Date().toISOString()
        };
        
        appState.accounts.push(newAccount);
        
        // 儲存到本地和Firebase
        saveToLocalStorage();
        
        // 關閉模態框並更新UI
        closeCurrentModal();
        updateAccountsUI();
        
        showToast('已成功新增戶口', 'success');
    };
}

// 更新貨幣選擇下拉框
function updateCurrencySelect() {
    const currencySelect = getElement('#currency');
    if (currencySelect) {
        // 保存當前選中的值
        const currentValue = currencySelect.value;
        
        // 清空選項
        currencySelect.innerHTML = '';
        
        // 添加可用貨幣
        availableCurrencies.forEach(currency => {
            const option = document.createElement('option');
            option.value = currency.code;
            option.textContent = `${currency.name} (${currency.code})`;
            currencySelect.appendChild(option);
        });
        
        // 嘗試恢復之前選中的值或設置默認值
        if (currentValue && availableCurrencies.some(curr => curr.code === currentValue)) {
            currencySelect.value = currentValue;
        } else {
            currencySelect.value = defaultCurrency;
        }
    }
}

// 編輯戶口
function editAccount(accountId) {
    const account = appState.accounts.find(a => a.id === accountId);
    if (!account) {
        showToast('找不到該戶口', 'error');
        return;
    }
    
    // 更新貨幣選擇
    updateCurrencySelect();
    
    // 填充表單
    getElement('#accountName').value = account.name;
    getElement('#accountType').value = account.type;
    getElement('#initialBalance').value = account.balance;
    getElement('#currency').value = account.currency;
    getElement('#accountNote').value = account.note || '';
    
    // 顯示模態框
    showModal('#accountModal');
    getElement('#accountModal h2').textContent = '編輯戶口';
    
    getElement('#saveAccountBtn').onclick = () => {
        const name = getElement('#accountName').value.trim();
        const type = getElement('#accountType').value;
        const newBalance = parseFloat(getElement('#initialBalance').value) || 0;
        const currency = getElement('#currency').value;
        const note = getElement('#accountNote').value.trim();
        
        if (!name) {
            showToast('請輸入戶口名稱', 'warning');
            return;
        }
        
        if (!type) {
            showToast('請選擇戶口類型', 'warning');
            return;
        }
        
        // 更新戶口
        account.name = name;
        account.type = type;
        account.balance = newBalance;
        account.currency = currency;
        account.note = note;
        account.updatedAt = new Date().toISOString();
        
        // 儲存到本地和Firebase
        saveToLocalStorage();
        
        // 關閉模態框並更新UI
        closeCurrentModal();
        updateAccountsUI();
        updateDashboardUI();
        
        showToast('已成功更新戶口', 'success');
    };
}

// 刪除戶口
function deleteAccount(accountId) {
    const account = appState.accounts.find(a => a.id === accountId);
    if (!account) {
        showToast('找不到該戶口', 'error');
        return;
    }
    
    showConfirmModal(`確定要刪除「${account.name}」戶口嗎？此操作無法撤銷，且與該戶口相關的所有交易記錄也將被刪除。`, () => {
        // 刪除與該戶口相關的所有交易
        appState.transactions = appState.transactions.filter(t => t.accountId !== accountId);
        
        // 刪除戶口
        appState.accounts = appState.accounts.filter(a => a.id !== accountId);
        
        // 儲存到本地和Firebase
        saveToLocalStorage();
        
        // 更新UI
        updateAccountsUI();
        updateDashboardUI();
        updateTransactionsUI();
        
        showToast('已成功刪除戶口', 'success');
    });
}

// 處理轉賬
async function handleTransfer() {
    const fromAccountId = getElement('#fromAccount').value;
    const toAccountId = getElement('#toAccount').value;
    const amount = parseFloat(getElement('#transferAmount').value) || 0;
    
    if (!fromAccountId) {
        showToast('請選擇轉出戶口', 'warning');
        return;
    }
    
    if (!toAccountId) {
        showToast('請選擇轉入戶口', 'warning');
        return;
    }
    
    if (fromAccountId === toAccountId) {
        showToast('轉出和轉入戶口不能相同', 'warning');
        return;
    }
    
    if (amount <= 0) {
        showToast('請輸入有效的轉賬金額', 'warning');
        return;
    }
    
    const fromAccount = appState.accounts.find(a => a.id === fromAccountId);
    const toAccount = appState.accounts.find(a => a.id === toAccountId);
    
    if (fromAccount.balance < amount) {
        showToast('餘額不足', 'error');
        return;
    }
    
    showLoadingMessage('處理轉賬中...');
    
    try {
        // 處理匯率轉換
        let receivingAmount = amount;
        if (fromAccount.currency !== toAccount.currency) {
            const rate = await getExchangeRate(fromAccount.currency, toAccount.currency);
            receivingAmount = amount * rate;
        }
        
        // 更新餘額
        fromAccount.balance -= amount;
        toAccount.balance += receivingAmount;
        
        // 創建轉賬交易記錄
        const transferDate = getTodayDate();
        const transferId = generateId();
        
        // 轉出記錄
        appState.transactions.push({
            id: transferId + '-out',
            type: 'expense',
            accountId: fromAccountId,
            categoryId: 'transfer',
            amount: amount,
            date: transferDate,
            note: `轉賬至 ${toAccount.name}`,
            createdAt: new Date().toISOString()
        });
        
        // 轉入記錄
        appState.transactions.push({
            id: transferId + '-in',
            type: 'income',
            accountId: toAccountId,
            categoryId: 'transfer',
            amount: receivingAmount,
            date: transferDate,
            note: `來自 ${fromAccount.name} 的轉賬`,
            createdAt: new Date().toISOString()
        });
        
        // 儲存到本地和Firebase
        saveToLocalStorage();
        
        // 更新UI
        updateAccountsUI();
        updateDashboardUI();
        updateTransactionsUI();
        
        // 清空轉賬表單
        getElement('#transferAmount').value = '';
        
        hideLoadingMessage();
        showToast('轉賬成功', 'success');
    } catch (error) {
        console.error('Transfer error:', error);
        hideLoadingMessage();
        showToast('轉賬處理出錯', 'error');
    }
}

// 更新類別UI
function updateCategoriesUI() {
    // 更新收入類別
    const incomeCategoriesList = getElement('#incomeCategoriesList');
    // 保留添加按鈕
    const addIncomeCategoryBtn = getElement('#addIncomeCategory');
    
    if (appState.categories.income.length === 0) {
        incomeCategoriesList.innerHTML = '<p class="empty-message">尚未設置收入類別</p>';
        incomeCategoriesList.prepend(addIncomeCategoryBtn);
    } else {
        incomeCategoriesList.innerHTML = '';
        incomeCategoriesList.appendChild(addIncomeCategoryBtn);
        
        // 根據視圖選項顯示不同的類別列表
        const isCardView = getElement('#incomeCategoryCardViewBtn').classList.contains('active');
        
        // 對類別進行排序
        const sortedIncomeCategories = [...appState.categories.income].sort((a, b) => {
            return (a.sort || 0) - (b.sort || 0);
        });
        
        sortedIncomeCategories.forEach(category => {
            if (isCardView) {
                const categoryCard = document.createElement('div');
                categoryCard.className = 'category-card';
               categoryCard.innerHTML = `
                    <div class="category-icon" style="color: ${category.color}">
                        <i class="${category.icon || 'fas fa-tag'}"></i>
                    </div>
                    <div class="category-name">${category.name}</div>
                    <div class="category-sort" style="font-size: var(--font-size-small); color: var(--text-light);">順序: ${category.sort || 0}</div>
                    <div class="category-actions">
                        <button class="edit-category" data-id="${category.id}" data-type="income"><i class="fas fa-edit"></i></button>
                        <button class="delete-category" data-id="${category.id}" data-type="income"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                
                incomeCategoriesList.appendChild(categoryCard);
            } else {
                const categoryRow = document.createElement('div');
                categoryRow.className = 'category-row';
                categoryRow.innerHTML = `
                    <div class="category-details">
                        <span class="category-icon" style="color: ${category.color}">
                            <i class="${category.icon || 'fas fa-tag'}"></i>
                        </span>
                        <span class="category-name">${category.name}</span>
                        <span style="font-size: var(--font-size-small); color: var(--text-light); margin-left: 10px;">順序: ${category.sort || 0}</span>
                    </div>
                    <div class="category-actions">
                        <button class="edit-category" data-id="${category.id}" data-type="income"><i class="fas fa-edit"></i></button>
                        <button class="delete-category" data-id="${category.id}" data-type="income"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                
                incomeCategoriesList.appendChild(categoryRow);
            }
        });
    }
    
    // 更新支出類別
    const expenseCategoriesList = getElement('#expenseCategoriesList');
    // 保留添加按鈕
    const addExpenseCategoryBtn = getElement('#addExpenseCategory');
    
    if (appState.categories.expense.length === 0) {
        expenseCategoriesList.innerHTML = '<p class="empty-message">尚未設置支出類別</p>';
        expenseCategoriesList.prepend(addExpenseCategoryBtn);
    } else {
        expenseCategoriesList.innerHTML = '';
        expenseCategoriesList.appendChild(addExpenseCategoryBtn);
        
        // 根據視圖選項顯示不同的類別列表
        const isCardView = getElement('#expenseCategoryCardViewBtn').classList.contains('active');
        
        // 對類別進行排序
        const sortedExpenseCategories = [...appState.categories.expense].sort((a, b) => {
            return (a.sort || 0) - (b.sort || 0);
        });
        
        sortedExpenseCategories.forEach(category => {
            if (isCardView) {
                const categoryCard = document.createElement('div');
                categoryCard.className = 'category-card';
                categoryCard.innerHTML = `
                    <div class="category-icon" style="color: ${category.color}">
                        <i class="${category.icon || 'fas fa-tag'}"></i>
                    </div>
                    <div class="category-name">${category.name}</div>
                    <div class="category-sort" style="font-size: var(--font-size-small); color: var(--text-light);">順序: ${category.sort || 0}</div>
                    <div class="category-actions">
                        <button class="edit-category" data-id="${category.id}" data-type="expense"><i class="fas fa-edit"></i></button>
                        <button class="delete-category" data-id="${category.id}" data-type="expense"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                
                expenseCategoriesList.appendChild(categoryCard);
            } else {
                const categoryRow = document.createElement('div');
                categoryRow.className = 'category-row';
                categoryRow.innerHTML = `
                    <div class="category-details">
                        <span class="category-icon" style="color: ${category.color}">
                            <i class="${category.icon || 'fas fa-tag'}"></i>
                        </span>
                        <span class="category-name">${category.name}</span>
                        <span style="font-size: var(--font-size-small); color: var(--text-light); margin-left: 10px;">順序: ${category.sort || 0}</span>
                    </div>
                    <div class="category-actions">
                        <button class="edit-category" data-id="${category.id}" data-type="expense"><i class="fas fa-edit"></i></button>
                        <button class="delete-category" data-id="${category.id}" data-type="expense"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                
                expenseCategoriesList.appendChild(categoryRow);
            }
        });
    }
    
    // 添加事件監聽器
    document.querySelectorAll('.edit-category').forEach(button => {
        button.addEventListener('click', e => {
            const categoryId = e.currentTarget.getAttribute('data-id');
            const categoryType = e.currentTarget.getAttribute('data-type');
            editCategory(categoryId, categoryType);
        });
    });
    
    document.querySelectorAll('.delete-category').forEach(button => {
        button.addEventListener('click', e => {
            const categoryId = e.currentTarget.getAttribute('data-id');
            const categoryType = e.currentTarget.getAttribute('data-type');
            deleteCategory(categoryId, categoryType);
        });
    });
    
    // 更新類別選擇下拉框
    updateCategorySelects();
}

// 更新類別選擇下拉框
function updateCategorySelects() {
    // 收入類別下拉框
    const incomeCategory = getElement('#incomeCategory');
    if (incomeCategory) {
        // 保存當前選中的值
        const currentValue = incomeCategory.value;
        
        // 清空選項
        incomeCategory.innerHTML = '<option value="" disabled selected>選擇類別</option>';
        
        // 添加轉賬選項
        const transferOption = document.createElement('option');
        transferOption.value = 'transfer';
        transferOption.textContent = '轉賬';
        incomeCategory.appendChild(transferOption);
        
        // 對類別進行排序後添加
        const sortedCategories = [...appState.categories.income].sort((a, b) => (a.sort || 0) - (b.sort || 0));
        
        // 添加類別選項
        sortedCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            incomeCategory.appendChild(option);
        });
        
        // 嘗試恢復之前選中的值
        if (currentValue) {
            incomeCategory.value = currentValue;
        }
    }
    
    // 支出類別下拉框
    const expenseCategory = getElement('#expenseCategory');
    if (expenseCategory) {
        // 保存當前選中的值
        const currentValue = expenseCategory.value;
        
        // 清空選項
        expenseCategory.innerHTML = '<option value="" disabled selected>選擇類別</option>';
        
        // 添加轉賬選項
        const transferOption = document.createElement('option');
        transferOption.value = 'transfer';
        transferOption.textContent = '轉賬';
        expenseCategory.appendChild(transferOption);
        
        // 對類別進行排序後添加
        const sortedCategories = [...appState.categories.expense].sort((a, b) => (a.sort || 0) - (b.sort || 0));
        
        // 添加類別選項
        sortedCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            expenseCategory.appendChild(option);
        });
        
        // 嘗試恢復之前選中的值
        if (currentValue) {
            expenseCategory.value = currentValue;
        }
    }
    
    // 交易過濾器類別下拉框
    const transactionCategory = getElement('#transactionCategory');
    if (transactionCategory) {
        // 保存當前選中的值
        const currentValue = transactionCategory.value;
        
        // 清空選項
        transactionCategory.innerHTML = '<option value="all">全部類別</option>';
        
        // 添加轉賬選項
        const transferOption = document.createElement('option');
        transferOption.value = 'transfer';
        transferOption.textContent = '轉賬';
        transactionCategory.appendChild(transferOption);
        
        // 添加收入類別
        const incomeOptgroup = document.createElement('optgroup');
        incomeOptgroup.label = '收入類別';
        
        // 對收入類別進行排序
        const sortedIncomeCategories = [...appState.categories.income].sort((a, b) => (a.sort || 0) - (b.sort || 0));
        
        sortedIncomeCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = `income-${category.id}`;
            option.textContent = category.name;
            incomeOptgroup.appendChild(option);
        });
        
        transactionCategory.appendChild(incomeOptgroup);
        
        // 添加支出類別
        const expenseOptgroup = document.createElement('optgroup');
        expenseOptgroup.label = '支出類別';
        
        // 對支出類別進行排序
        const sortedExpenseCategories = [...appState.categories.expense].sort((a, b) => (a.sort || 0) - (b.sort || 0));
        
        sortedExpenseCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = `expense-${category.id}`;
            option.textContent = category.name;
            expenseOptgroup.appendChild(option);
        });
        
        transactionCategory.appendChild(expenseOptgroup);
        
        // 嘗試恢復之前選中的值
        if (currentValue) {
            transactionCategory.value = currentValue;
        }
    }
    
    // 預算類別下拉框
    const budgetCategory = getElement('#budgetCategory');
    if (budgetCategory) {
        // 保存當前選中的值
        const currentValue = budgetCategory.value;
        
        // 清空選項
        budgetCategory.innerHTML = '<option value="" disabled selected>選擇類別</option>';
        
        // 對支出類別進行排序
        const sortedExpenseCategories = [...appState.categories.expense].sort((a, b) => (a.sort || 0) - (b.sort || 0));
        
        // 主要添加支出類別
        sortedExpenseCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            budgetCategory.appendChild(option);
        });
        
        // 嘗試恢復之前選中的值
        if (currentValue) {
            budgetCategory.value = currentValue;
        }
    }
}

// 填充圖標選擇器
function populateIconSelector() {
    const iconSelector = getElement('#iconSelector');
    const icons = [
        'fas fa-home', 'fas fa-utensils', 'fas fa-shopping-cart', 'fas fa-bus',
        'fas fa-taxi', 'fas fa-plane', 'fas fa-graduation-cap', 'fas fa-book',
        'fas fa-heart', 'fas fa-medkit', 'fas fa-briefcase', 'fas fa-gift',
        'fas fa-coffee', 'fas fa-glass-martini', 'fas fa-music', 'fas fa-film',
        'fas fa-gamepad', 'fas fa-futbol', 'fas fa-cut', 'fas fa-tshirt',
        'fas fa-dog', 'fas fa-cat', 'fas fa-baby', 'fas fa-user',
        'fas fa-users', 'fas fa-mobile-alt', 'fas fa-laptop', 'fas fa-tv',
        'fas fa-camera', 'fas fa-biking', 'fas fa-running', 'fas fa-swimmer',
        'fas fa-sun', 'fas fa-cloud', 'fas fa-umbrella', 'fas fa-snowflake',
        'fas fa-car', 'fas fa-building', 'fas fa-university', 'fas fa-piggy-bank',
        'fas fa-money-bill-wave', 'fas fa-credit-card', 'fas fa-chart-line', 'fas fa-donate',
        'fas fa-coins', 'fas fa-dollar-sign', 'fas fa-percentage', 'fas fa-donate'
    ];
    
    iconSelector.innerHTML = ''; // 清空圖標選擇器
    
    icons.forEach(icon => {
        const iconOption = document.createElement('div');
        iconOption.className = 'icon-option';
        iconOption.innerHTML = `<i class="${icon}"></i>`;
        iconOption.setAttribute('data-icon', icon);
        
        iconOption.addEventListener('click', () => {
            // 移除所有選中樣式
            document.querySelectorAll('.icon-option').forEach(el => {
                el.classList.remove('selected');
            });
            
            // 添加選中樣式
            iconOption.classList.add('selected');
            
            // 儲存選中的圖標
            const categoryModal = getElement('#categoryModal');
            categoryModal.setAttribute('data-selected-icon', icon);
        });
        
        iconSelector.appendChild(iconOption);
    });
}

// 新增類別
function addCategory(type) {
    // 重置表單
    getElement('#categoryName').value = '';
    getElement('#categoryColor').value = '#4CAF50';
    getElement('#categorySort').value = '0';
    
    // 取消所有圖標的選中狀態
    document.querySelectorAll('.icon-option').forEach(el => {
        el.classList.remove('selected');
    });
    
    // 預設選中第一個圖標
    const firstIcon = document.querySelector('.icon-option');
    if (firstIcon) {
        firstIcon.classList.add('selected');
        getElement('#categoryModal').setAttribute('data-selected-icon', firstIcon.getAttribute('data-icon'));
    }
    
    // 顯示模態框
    showModal('#categoryModal');
    getElement('#categoryModal h2').textContent = `新增${type === 'income' ? '收入' : '支出'}類別`;
    
    getElement('#saveCategoryBtn').onclick = () => {
        const name = getElement('#categoryName').value.trim();
        const color = getElement('#categoryColor').value;
        const icon = getElement('#categoryModal').getAttribute('data-selected-icon') || 'fas fa-tag';
        const sort = parseInt(getElement('#categorySort').value) || 0;
        
        if (!name) {
            showToast('請輸入類別名稱', 'warning');
            return;
        }
        
        const newCategory = {
            id: generateId(),
            name,
            color,
            icon,
            sort,
            createdAt: new Date().toISOString()
        };
        
        appState.categories[type].push(newCategory);
        
        // 儲存到本地和Firebase
        saveToLocalStorage();
        
        // 關閉模態框並更新UI
        closeCurrentModal();
        updateCategoriesUI();
        
        showToast(`已成功新增${type === 'income' ? '收入' : '支出'}類別`, 'success');
    };
}

// 編輯類別
function editCategory(categoryId, type) {
    const category = appState.categories[type].find(c => c.id === categoryId);
    if (!category) {
        showToast('找不到該類別', 'error');
        return;
    }
    
    // 填充表單
    getElement('#categoryName').value = category.name;
    getElement('#categoryColor').value = category.color || '#4CAF50';
    getElement('#categorySort').value = category.sort || 0;
    
    // 取消所有圖標的選中狀態
    document.querySelectorAll('.icon-option').forEach(el => {
        el.classList.remove('selected');
    });
    
    // 選中當前圖標
    const currentIcon = category.icon || 'fas fa-tag';
    const iconOption = document.querySelector(`.icon-option[data-icon="${currentIcon}"]`);
    if (iconOption) {
        iconOption.classList.add('selected');
    }
    
    getElement('#categoryModal').setAttribute('data-selected-icon', currentIcon);
    
    // 顯示模態框
    showModal('#categoryModal');
    getElement('#categoryModal h2').textContent = `編輯${type === 'income' ? '收入' : '支出'}類別`;
    
    getElement('#saveCategoryBtn').onclick = () => {
        const name = getElement('#categoryName').value.trim();
        const color = getElement('#categoryColor').value;
        const icon = getElement('#categoryModal').getAttribute('data-selected-icon') || 'fas fa-tag';
        const sort = parseInt(getElement('#categorySort').value) || 0;
        
        if (!name) {
            showToast('請輸入類別名稱', 'warning');
            return;
        }
        
        // 更新類別
        category.name = name;
        category.color = color;
        category.icon = icon;
        category.sort = sort;
        category.updatedAt = new Date().toISOString();
        
        // 儲存到本地和Firebase
        saveToLocalStorage();
        
        // 關閉模態框並更新UI
        closeCurrentModal();
        updateCategoriesUI();
        
        showToast(`已成功更新${type === 'income' ? '收入' : '支出'}類別`, 'success');
    };
}

// 刪除類別
function deleteCategory(categoryId, type) {
    const category = appState.categories[type].find(c => c.id === categoryId);
    if (!category) {
        showToast('找不到該類別', 'error');
        return;
    }
    
    showConfirmModal(`確定要刪除「${category.name}」類別嗎？此操作無法撤銷，且與該類別相關的所有交易記錄將被標記為「未分類」。`, () => {
        // 將相關交易的類別更新為「未分類」
        appState.transactions.forEach(transaction => {
            if (transaction.type === type && transaction.categoryId === categoryId) {
                transaction.categoryId = 'uncategorized';
            }
        });
        
        // 刪除類別
        appState.categories[type] = appState.categories[type].filter(c => c.id !== categoryId);
        
        // 從預算中刪除該類別
        if (appState.budgets.categories) {
            appState.budgets.categories = appState.budgets.categories.filter(b => b.categoryId !== categoryId);
        }
        
        // 儲存到本地和Firebase
        saveToLocalStorage();
        
        // 更新UI
        updateCategoriesUI();
        updateTransactionsUI();
        updateBudgetsUI();
        
        showToast(`已成功刪除${type === 'income' ? '收入' : '支出'}類別`, 'success');
    });
}

// 更新交易記錄UI
function updateTransactionsUI() {
    // 設置日期選擇器的默認值
    if (!getElement('#startDate').value) {
        // 設置為當月第一天
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        getElement('#startDate').value = firstDay.toISOString().split('T')[0];
    }
    
    if (!getElement('#endDate').value) {
        // 設置為今天
        getElement('#endDate').value = getTodayDate();
    }
    
    // 設置收入/支出表單的日期為今天
    getElement('#incomeDate').value = getTodayDate();
    getElement('#expenseDate').value = getTodayDate();
    
    // 獲取過濾條件
    const startDate = getElement('#startDate').value;
    const endDate = getElement('#endDate').value;
    const type = getElement('#transactionType').value;
    const categoryFilter = getElement('#transactionCategory').value;
    
    let categoryId = 'all';
    let categoryType = null;
    
    if (categoryFilter !== 'all' && categoryFilter !== 'transfer') {
        const parts = categoryFilter.split('-');
        if (parts.length === 2) {
            categoryType = parts[0];
            categoryId = parts[1];
        }
    }
    
    // 過濾交易
    let filteredTransactions;
    
    if (categoryFilter === 'transfer') {
        filteredTransactions = appState.transactions.filter(t => {
            const transactionDate = new Date(t.date);
            
            // 日期範圍過濾
            if (startDate && transactionDate < new Date(startDate)) return false;
            if (endDate && transactionDate > new Date(endDate)) return false;
            
            // 類型過濾
            if (type !== 'all' && t.type !== type) return false;
            
            // 僅轉賬
            return t.categoryId === 'transfer';
        });
    } else if (categoryType) {
        filteredTransactions = appState.transactions.filter(t => {
            const transactionDate = new Date(t.date);
            
            // 日期範圍過濾
            if (startDate && transactionDate < new Date(startDate)) return false;
            if (endDate && transactionDate > new Date(endDate)) return false;
            
            // 類型過濾
            if (type !== 'all' && t.type !== type) return false;
            
            // 類別過濾
            return t.type === categoryType && t.categoryId === categoryId;
        });
    } else {
        filteredTransactions = searchTransactions(startDate, endDate, type, categoryId);
    }
    
    // 排序交易（最新的在前）
    filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // 更新交易記錄列表
    const transactionsList = getElement('#transactionsList');
    
    if (filteredTransactions.length === 0) {
        transactionsList.innerHTML = '<p class="empty-message">無符合條件的交易記錄</p>';
    } else {
        transactionsList.innerHTML = '';
        
        filteredTransactions.forEach(transaction => {
            const account = getAccount(transaction.accountId);
            
            let categoryName = '未分類';
            let categoryIcon = 'fas fa-tag';
            let categoryColor = '#999';
            
            if (transaction.categoryId === 'transfer') {
                categoryName = '轉賬';
                categoryIcon = 'fas fa-exchange-alt';
                categoryColor = '#2196F3';
            } else if (transaction.categoryId === 'uncategorized') {
                categoryName = '未分類';
                categoryIcon = 'fas fa-question';
                categoryColor = '#999';
            } else {
                const category = getCategory(transaction.categoryId, transaction.type);
                if (category) {
                    categoryName = category.name;
                    categoryIcon = category.icon || 'fas fa-tag';
                    categoryColor = category.color || '#999';
                }
            }
            
            const transactionElement = document.createElement('div');
            transactionElement.className = 'transaction-item';
            transactionElement.innerHTML = `
                <div class="transaction-info">
                    <div class="transaction-category">
                        <span class="category-icon" style="color: ${categoryColor}">
                            <i class="${categoryIcon}"></i>
                        </span>
                        ${categoryName}
                    </div>
                    <div class="transaction-details">
                        ${formatDate(transaction.date)} | ${account ? account.name : '未知戶口'}
                        ${transaction.note ? `<br>${transaction.note}` : ''}
                    </div>
                </div>
                <div class="transaction-amount ${transaction.type}">
                    ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount, account ? account.currency : defaultCurrency)}
                </div>
                <div class="transaction-actions">
                    <button class="edit-transaction" data-id="${transaction.id}"><i class="fas fa-edit"></i></button>
                    <button class="delete-transaction" data-id="${transaction.id}"><i class="fas fa-trash"></i></button>
                </div>
            `;
            
            transactionsList.appendChild(transactionElement);
        });
        
        // 添加事件監聽器
        document.querySelectorAll('.edit-transaction').forEach(button => {
            button.addEventListener('click', e => {
                const transactionId = e.currentTarget.getAttribute('data-id');
                editTransaction(transactionId);
            });
        });
        
        document.querySelectorAll('.delete-transaction').forEach(button => {
            button.addEventListener('click', e => {
                const transactionId = e.currentTarget.getAttribute('data-id');
                deleteTransaction(transactionId);
            });
        });
    }
}

// 保存收入記錄
function saveIncome() {
    const accountId = getElement('#incomeAccount').value;
    const categoryId = getElement('#incomeCategory').value;
    const amount = parseFloat(getElement('#incomeAmount').value) || 0;
    const date = getElement('#incomeDate').value;
    const note = getElement('#incomeNote').value.trim();
    
    if (!accountId) {
        showToast('請選擇戶口', 'warning');
        return;
    }
    
    if (!categoryId) {
        showToast('請選擇類別', 'warning');
        return;
    }
    
    if (amount <= 0) {
        showToast('請輸入有效的金額', 'warning');
        return;
    }
    
    if (!date) {
        showToast('請選擇日期', 'warning');
        return;
    }
    
    // 創建新的收入記錄
    const newTransaction = {
        id: generateId(),
        type: 'income',
        accountId,
        categoryId,
        amount,
        date,
        note,
        createdAt: new Date().toISOString()
    };
    
    // 更新戶口餘額
    const account = appState.accounts.find(a => a.id === accountId);
    if (account) {
        account.balance += amount;
    }
    
    // 添加交易記錄
    appState.transactions.push(newTransaction);
    
    // 儲存到本地和Firebase
    saveToLocalStorage();
    
    // 更新UI
    updateAccountsUI();
    updateDashboardUI();
    updateTransactionsUI();
    
    // 清空表單
    getElement('#incomeAmount').value = '';
    getElement('#incomeNote').value = '';
    
    showToast('已成功記錄收入', 'success');
}

// 保存支出記錄
function saveExpense() {
    const accountId = getElement('#expenseAccount').value;
    const categoryId = getElement('#expenseCategory').value;
    const amount = parseFloat(getElement('#expenseAmount').value) || 0;
    const date = getElement('#expenseDate').value;
    const note = getElement('#expenseNote').value.trim();
    
    if (!accountId) {
        showToast('請選擇戶口', 'warning');
        return;
    }
    
    if (!categoryId) {
        showToast('請選擇類別', 'warning');
        return;
    }
    
    if (amount <= 0) {
        showToast('請輸入有效的金額', 'warning');
        return;
    }
    
    if (!date) {
        showToast('請選擇日期', 'warning');
        return;
    }
    
    // 檢查戶口餘額
    const account = appState.accounts.find(a => a.id === accountId);
    if (account && account.balance < amount) {
        showConfirmModal('該戶口餘額不足，是否仍要記錄此支出？', () => {
            proceedSaveExpense(accountId, categoryId, amount, date, note);
        });
    } else {
        proceedSaveExpense(accountId, categoryId, amount, date, note);
    }
}

// 繼續保存支出
function proceedSaveExpense(accountId, categoryId, amount, date, note) {
    // 創建新的支出記錄
    const newTransaction = {
        id: generateId(),
        type: 'expense',
        accountId,
        categoryId,
        amount,
        date,
        note,
        createdAt: new Date().toISOString()
    };
    
    // 更新戶口餘額
    const account = appState.accounts.find(a => a.id === accountId);
    if (account) {
        account.balance -= amount;
    }
    
    // 添加交易記錄
    appState.transactions.push(newTransaction);
    
    // 儲存到本地和Firebase
    saveToLocalStorage();
    
    // 更新UI
    updateAccountsUI();
    updateDashboardUI();
    updateTransactionsUI();
    
    // 清空表單
    getElement('#expenseAmount').value = '';
    getElement('#expenseNote').value = '';
    
    showToast('已成功記錄支出', 'success');
    
    // 檢查預算警告
    checkBudgetWarnings();
}

// 檢查預算警告
async function checkBudgetWarnings() {
    if (!enableBudgetAlerts) {
        return;
    }
    
    try {
        // 檢查總預算
        if (appState.budgets.total > 0) {
            const today = getTodayDate();
            const monthStart = today.substring(0, 8) + '01'; // 當月第一天
            
            // 計算當月總支出
            let monthlyExpense = 0;
            
            for (const transaction of appState.transactions.filter(t => 
                t.type === 'expense' && t.date >= monthStart && t.date <= today)) {
                
                const account = appState.accounts.find(acc => acc.id === transaction.accountId);
                if (account) {
                    if (account.currency === defaultCurrency) {
                        monthlyExpense += transaction.amount;
                    } else {
                        const rate = await getExchangeRate(account.currency, defaultCurrency);
                        monthlyExpense += transaction.amount * rate;
                    }
                }
            }
            
            const usedPercentage = (monthlyExpense / appState.budgets.total) * 100;
            
            if (usedPercentage >= alertThreshold) {
                showToast(`警告：您已使用${usedPercentage.toFixed(1)}%的月度預算！`, 'warning');
            }
        }
        
        // 檢查類別預算
        if (appState.budgets.categories && appState.budgets.categories.length > 0) {
            const today = getTodayDate();
            const monthStart = today.substring(0, 8) + '01'; // 當月第一天
            
            for (const budget of appState.budgets.categories) {
                // 計算該類別的當月支出
                let categoryExpense = 0;
                
                for (const transaction of appState.transactions.filter(t => 
                    t.type === 'expense' && t.categoryId === budget.categoryId && 
                    t.date >= monthStart && t.date <= today)) {
                    
                    const account = appState.accounts.find(acc => acc.id === transaction.accountId);
                    if (account) {
                        if (account.currency === defaultCurrency) {
                            categoryExpense += transaction.amount;
                        } else {
                            const rate = await getExchangeRate(account.currency, defaultCurrency);
                            categoryExpense += transaction.amount * rate;
                        }
                    }
                }
                
                const usedPercentage = (categoryExpense / budget.amount) * 100;
                
                if (usedPercentage >= alertThreshold) {
                    const category = appState.categories.expense.find(c => c.id === budget.categoryId);
                    const categoryName = category ? category.name : '未知類別';
                    
                    showToast(`警告：「${categoryName}」已使用${usedPercentage.toFixed(1)}%的預算！`, 'warning');
                }
            }
        }
    } catch (error) {
        console.error('Error checking budget warnings:', error);
    }
}

// 編輯交易記錄
function editTransaction(transactionId) {
    const transaction = appState.transactions.find(t => t.id === transactionId);
    if (!transaction) {
        showToast('找不到該交易記錄', 'error');
        return;
    }
    
    // 切換到對應的標籤頁
    const tabType = transaction.type === 'income' ? 'income' : 'expense';
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-tab') === tabType) {
            tab.classList.add('active');
        }
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        if (content.id === `${tabType}Tab`) {
            content.classList.add('active');
        }
    });
    
    // 填充表單
    if (transaction.type === 'income') {
        getElement('#incomeAccount').value = transaction.accountId;
        getElement('#incomeCategory').value = transaction.categoryId;
        getElement('#incomeAmount').value = transaction.amount;
        getElement('#incomeDate').value = transaction.date;
        getElement('#incomeNote').value = transaction.note || '';
        
        getElement('#saveIncomeBtn').innerHTML = '<i class="fas fa-check"></i> 更新';
        getElement('#saveIncomeBtn').onclick = () => {
            updateTransaction(transactionId, 'income');
        };
    } else {
        getElement('#expenseAccount').value = transaction.accountId;
        getElement('#expenseCategory').value = transaction.categoryId;
        getElement('#expenseAmount').value = transaction.amount;
        getElement('#expenseDate').value = transaction.date;
        getElement('#expenseNote').value = transaction.note || '';
        
        getElement('#saveExpenseBtn').innerHTML = '<i class="fas fa-check"></i> 更新';
        getElement('#saveExpenseBtn').onclick = () => {
            updateTransaction(transactionId, 'expense');
        };
    }
    
    // 滾動到表單
    const formElement = transaction.type === 'income' ? getElement('#incomeTab') : getElement('#expenseTab');
    formElement.scrollIntoView({ behavior: 'smooth' });
    
    // 導航到交易頁面
    navigateTo('#transactions');
}

// 更新交易記錄
function updateTransaction(transactionId, type) {
    const transaction = appState.transactions.find(t => t.id === transactionId);
    if (!transaction) {
        showToast('找不到該交易記錄', 'error');
        return;
    }
    
    // 獲取新值
    const accountId = getElement(`#${type}Account`).value;
    const categoryId = getElement(`#${type}Category`).value;
    const amount = parseFloat(getElement(`#${type}Amount`).value) || 0;
    const date = getElement(`#${type}Date`).value;
    const note = getElement(`#${type}Note`).value.trim();
    
    if (!accountId) {
        showToast('請選擇戶口', 'warning');
        return;
    }
    
    if (!categoryId) {
        showToast('請選擇類別', 'warning');
        return;
    }
    
    if (amount <= 0) {
        showToast('請輸入有效的金額', 'warning');
        return;
    }
    
    if (!date) {
        showToast('請選擇日期', 'warning');
        return;
    }
    
    // 恢復原戶口餘額
    const oldAccount = appState.accounts.find(a => a.id === transaction.accountId);
    if (oldAccount) {
        if (transaction.type === 'income') {
            oldAccount.balance -= transaction.amount;
        } else {
            oldAccount.balance += transaction.amount;
        }
    }
    
    // 更新新戶口餘額
    const newAccount = appState.accounts.find(a => a.id === accountId);
    if (newAccount) {
        if (type === 'income') {
            newAccount.balance += amount;
        } else {
            newAccount.balance -= amount;
        }
    }
    
    // 更新交易記錄
    transaction.accountId = accountId;
    transaction.categoryId = categoryId;
    transaction.amount = amount;
    transaction.date = date;
    transaction.note = note;
    transaction.updatedAt = new Date().toISOString();
    
    // 儲存到本地和Firebase
    saveToLocalStorage();
    
    // 更新UI
    updateAccountsUI();
    updateDashboardUI();
    updateTransactionsUI();
    
    // 重置表單
    getElement(`#${type}Amount`).value = '';
    getElement(`#${type}Note`).value = '';
    
    // 重置按鈕
    getElement(`#save${type.charAt(0).toUpperCase() + type.slice(1)}Btn`).innerHTML = '<i class="fas fa-check"></i> 保存';
    getElement(`#save${type.charAt(0).toUpperCase() + type.slice(1)}Btn`).onclick = () => {
        if (type === 'income') {
            saveIncome();
        } else {
            saveExpense();
        }
    };
    
    showToast('已成功更新交易記錄', 'success');
}

// 刪除交易記錄
function deleteTransaction(transactionId) {
    const transaction = appState.transactions.find(t => t.id === transactionId);
    if (!transaction) {
        showToast('找不到該交易記錄', 'error');
        return;
    }
    
    showConfirmModal(`確定要刪除這筆${transaction.type === 'income' ? '收入' : '支出'}記錄嗎？此操作無法撤銷。`, () => {
        // 恢復戶口餘額
        const account = appState.accounts.find(a => a.id === transaction.accountId);
        if (account) {
            if (transaction.type === 'income') {
                account.balance -= transaction.amount;
            } else {
                account.balance += transaction.amount;
            }
        }
        
        // 刪除交易記錄
        appState.transactions = appState.transactions.filter(t => t.id !== transactionId);
        
        // 儲存到本地和Firebase
        saveToLocalStorage();
        
        // 更新UI
        updateAccountsUI();
        updateDashboardUI();
        updateTransactionsUI();
        
        showToast('已成功刪除交易記錄', 'success');
    });
}

// 更新預算UI
function updateBudgetsUI() {
    // 填充總預算
    getElement('#totalBudget').value = appState.budgets.total;
    
    // 設置預算重設週期
    document.querySelector(`input[name="resetCycle"][value="${appState.budgets.resetCycle}"]`).checked = true;
    
    // 設置預算繼承選項
    getElement('#inheritLastMonthBudget').checked = appState.budgets.inheritLastMonth;
    
    // 填充月重設日下拉框
    const monthlyResetDay = getElement('#monthlyResetDay');
    if (monthlyResetDay.children.length <= 1) {
        for (let i = 1; i <= 31; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            monthlyResetDay.appendChild(option);
        }
    }
    
    monthlyResetDay.value = appState.budgets.resetDay || 1;
    
    // 更新類別預算列表
    const categoryBudgetsList = getElement('#categoryBudgetsList');
    
    if (!appState.budgets.categories || appState.budgets.categories.length === 0) {
        categoryBudgetsList.innerHTML = '<p class="empty-message">尚未設置類別預算</p>';
    } else {
        categoryBudgetsList.innerHTML = '';
        
        appState.budgets.categories.forEach(budget => {
            const category = appState.categories.expense.find(c => c.id === budget.categoryId);
            
            if (!category) return; // 跳過已刪除的類別
            
            const budgetItem = document.createElement('div');
            budgetItem.className = 'category-budget-item';
            budgetItem.innerHTML = `
                <div class="category-budget-info">
                    <div class="category-budget-name">
                        <span class="category-icon" style="color: ${category.color}">
                            <i class="${category.icon || 'fas fa-tag'}"></i>
                        </span>
                        ${category.name}
                    </div>
                </div>
                <div class="category-budget-amount">
                    ${formatCurrency(budget.amount)}
                </div>
                <div class="category-budget-actions">
                    <button class="edit-budget" data-id="${budget.categoryId}"><i class="fas fa-edit"></i></button>
                    <button class="delete-budget" data-id="${budget.categoryId}"><i class="fas fa-trash"></i></button>
                </div>
            `;
            
            categoryBudgetsList.appendChild(budgetItem);
        });
        
        // 添加事件監聽器
        document.querySelectorAll('.edit-budget').forEach(button => {
            button.addEventListener('click', e => {
                const categoryId = e.currentTarget.getAttribute('data-id');
                editCategoryBudget(categoryId);
            });
        });
        
        document.querySelectorAll('.delete-budget').forEach(button => {
            button.addEventListener('click', e => {
                const categoryId = e.currentTarget.getAttribute('data-id');
                deleteCategoryBudget(categoryId);
            });
        });
    }
}

// 保存預算設定
function saveBudgetSettings() {
    const total = parseFloat(getElement('#totalBudget').value) || 0;
    const resetCycle = document.querySelector('input[name="resetCycle"]:checked').value;
    
    appState.budgets.total = total;
    appState.budgets.resetCycle = resetCycle;
    
    // 儲存到本地和Firebase
    saveToLocalStorage();
    
    updateBudgetsUI();
    updateDashboardUI();
    
    showToast('已成功保存預算設定', 'success');
}

// 添加類別預算
function addCategoryBudget() {
    const categoryId = getElement('#budgetCategory').value;
    const amount = parseFloat(getElement('#categoryBudget').value) || 0;
    
    if (!categoryId) {
        showToast('請選擇類別', 'warning');
        return;
    }
    
    if (amount <= 0) {
        showToast('請輸入有效的預算金額', 'warning');
        return;
    }
    
    // 檢查是否已存在
    if (!appState.budgets.categories) {
        appState.budgets.categories = [];
    }
    
    const existingIndex = appState.budgets.categories.findIndex(b => b.categoryId === categoryId);
    
    if (existingIndex >= 0) {
        // 更新現有預算
        appState.budgets.categories[existingIndex].amount = amount;
    } else {
        // 添加新預算
        appState.budgets.categories.push({
            categoryId,
            amount
        });
    }
    
    // 如果設置為自動計算總預算
    if (getElement('#autoCalculateBudget').checked) {
        appState.budgets.total = appState.budgets.categories.reduce((sum, budget) => sum + budget.amount, 0);
    }
    
    // 儲存到本地和Firebase
    saveToLocalStorage();
    
    // 清空表單
    getElement('#categoryBudget').value = '';
    
    // 更新UI
    updateBudgetsUI();
    updateDashboardUI();
    
    showToast('已成功添加類別預算', 'success');
}

// 編輯類別預算
function editCategoryBudget(categoryId) {
    const budget = appState.budgets.categories.find(b => b.categoryId === categoryId);
    if (!budget) {
        showToast('找不到該預算', 'error');
        return;
    }
    
    // 填充表單
    getElement('#budgetCategory').value = categoryId;
    getElement('#categoryBudget').value = budget.amount;
    
    // 滾動到表單
    getElement('#budgetCategory').scrollIntoView({ behavior: 'smooth' });
}

// 刪除類別預算
function deleteCategoryBudget(categoryId) {
    const budget = appState.budgets.categories.find(b => b.categoryId === categoryId);
    if (!budget) {
        showToast('找不到該預算', 'error');
        return;
    }
    
    const category = appState.categories.expense.find(c => c.id === categoryId);
    const categoryName = category ? category.name : '未知類別';
    
    showConfirmModal(`確定要刪除「${categoryName}」的預算嗎？`, () => {
        // 刪除預算
        appState.budgets.categories = appState.budgets.categories.filter(b => b.categoryId !== categoryId);
        
        // 如果設置為自動計算總預算
        if (getElement('#autoCalculateBudget').checked) {
            appState.budgets.total = appState.budgets.categories.reduce((sum, budget) => sum + budget.amount, 0);
        }
        
        // 儲存到本地和Firebase
        saveToLocalStorage();
        
        // 更新UI
        updateBudgetsUI();
        updateDashboardUI();
        
        showToast('已成功刪除類別預算', 'success');
    });
}

// 更新統計圖表
async function updateStatisticsUI() {
    try {
        // 獲取當月數據
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const monthEnd = today.toISOString().split('T')[0];
        
        // 收入統計
        const incomeData = {};
        let incomeTotal = 0;
        
        // 支出統計
        const expenseData = {};
        let expenseTotal = 0;
        
        // 處理所有交易
        for (const transaction of appState.transactions) {
            // 跳過不在日期範圍內或是轉賬類型的交易
            if (transaction.date < monthStart || transaction.date > monthEnd || transaction.categoryId === 'transfer') {
                continue;
            }
            
            const account = appState.accounts.find(a => a.id === transaction.accountId);
            if (!account) continue;
            
            let amount = transaction.amount;
            
            // 貨幣轉換
            if (account.currency !== defaultCurrency) {
                const rate = await getExchangeRate(account.currency, defaultCurrency);
                amount = transaction.amount * rate;
            }
            
            if (transaction.type === 'income') {
                if (!incomeData[transaction.categoryId]) {
                    incomeData[transaction.categoryId] = 0;
                }
                incomeData[transaction.categoryId] += amount;
                incomeTotal += amount;
            } else { // expense
                if (!expenseData[transaction.categoryId]) {
                    expenseData[transaction.categoryId] = 0;
                }
                expenseData[transaction.categoryId] += amount;
                expenseTotal += amount;
            }
        }
        
        // 繪製收入圖表
        const incomeChart = getElement('#incomeChart');
        
        if (Object.keys(incomeData).length === 0) {
            incomeChart.innerHTML = '<p class="empty-message">沒有收入分佈數據</p>';
        } else {
            incomeChart.innerHTML = '<canvas id="incomeChartCanvas"></canvas>';
            
            const labels = [];
            const data = [];
            const colors = [];
            
            for (const categoryId in incomeData) {
                let category;
                if (categoryId === 'transfer') {
                    category = { name: '轉賬', color: '#2196F3' };
                } else if (categoryId === 'uncategorized') {
                    category = { name: '未分類', color: '#999' };
                } else {
                    category = appState.categories.income.find(c => c.id === categoryId);
                }
                
                const categoryName = category ? category.name : '未知類別';
                const categoryColor = category ? category.color : '#999';
                
                labels.push(categoryName);
                data.push(incomeData[categoryId]);
                colors.push(categoryColor);
            }
            
            const ctx = document.getElementById('incomeChartCanvas').getContext('2d');
            new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: colors
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                color: getComputedStyle(document.body).getPropertyValue('--text-color')
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.raw;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }
        
        // 繪製支出圖表
        const expenseChart = getElement('#expenseChart');
        
        if (Object.keys(expenseData).length === 0) {
            expenseChart.innerHTML = '<p class="empty-message">沒有支出分佈數據</p>';
        } else {
            expenseChart.innerHTML = '<canvas id="expenseChartCanvas"></canvas>';
            
            const labels = [];
            const data = [];
            const colors = [];
            
            for (const categoryId in expenseData) {
                let category;
                if (categoryId === 'transfer') {
                    category = { name: '轉賬', color: '#2196F3' };
                } else if (categoryId === 'uncategorized') {
                    category = { name: '未分類', color: '#999' };
                } else {
                    category = appState.categories.expense.find(c => c.id === categoryId);
                }
                
                const categoryName = category ? category.name : '未知類別';
                const categoryColor = category ? category.color : '#999';
                
                labels.push(categoryName);
                data.push(expenseData[categoryId]);
                colors.push(categoryColor);
            }
            
            const ctx = document.getElementById('expenseChartCanvas').getContext('2d');
            new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: colors
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                color: getComputedStyle(document.body).getPropertyValue('--text-color')
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.raw;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error updating statistics charts:', error);
        
        // 顯示錯誤信息
        getElement('#incomeChart').innerHTML = '<p class="empty-message">圖表加載失敗，請稍後再試</p>';
        getElement('#expenseChart').innerHTML = '<p class="empty-message">圖表加載失敗，請稍後再試</p>';
    }
}

// 更新同步UI
function updateSyncUI() {
    // 更新同步設置
    getElement('#autoSync').checked = autoSync;
    
    // 更新上次同步時間
    if (appState.lastSyncTime) {
        getElement('#lastSyncTime').textContent = appState.lastSyncTime.toLocaleString();
    } else {
        getElement('#lastSyncTime').textContent = '從未同步';
    }
}

// 更新匯率管理UI
function updateCurrencyManagementUI() {
    // 確保匯率管理模態框存在
    if (!getElement('#currencyManagementModal')) {
        createCurrencyManagementModal();
    }
    
    const currencyList = getElement('#currencyList');
    const exchangeRatesList = getElement('#exchangeRatesList');
    
    // 更新貨幣列表
    currencyList.innerHTML = '';
    availableCurrencies.forEach(currency => {
        const currencyItem = document.createElement('div');
        currencyItem.className = 'currency-item';
        currencyItem.innerHTML = `
            <div class="currency-info">
                <span class="currency-code">${currency.code}</span>
                <span class="currency-name">${currency.name}</span>
            </div>
            <div class="currency-actions">
                <button class="edit-currency" data-code="${currency.code}"><i class="fas fa-edit"></i></button>
                <button class="delete-currency" data-code="${currency.code}"><i class="fas fa-trash"></i></button>
            </div>
        `;
        
        currencyList.appendChild(currencyItem);
    });
    
    // 更新匯率列表
    exchangeRatesList.innerHTML = '';
    
    for (const fromCurrency of availableCurrencies) {
        for (const toCurrency of availableCurrencies) {
            if (fromCurrency.code === toCurrency.code) continue;
            
            const rateKey = `${fromCurrency.code}_${toCurrency.code}`;
            const rate = appState.exchangeRates[rateKey] || 
                         (rateCache[rateKey] ? rateCache[rateKey] : 
                          (backupExchangeRates[fromCurrency.code] && backupExchangeRates[fromCurrency.code][toCurrency.code] ? 
                           backupExchangeRates[fromCurrency.code][toCurrency.code] : 1));
            
            const rateItem = document.createElement('div');
            rateItem.className = 'exchange-rate-item';
            rateItem.innerHTML = `
                <div class="rate-pair">
                    <span>${fromCurrency.code} → ${toCurrency.code}</span>
                </div>
                <div class="rate-value">
                    <input type="number" class="rate-input" data-from="${fromCurrency.code}" data-to="${toCurrency.code}" 
                           value="${rate.toFixed(4)}" min="0.0001" step="0.0001" ${appState.useRealTimeRates ? 'disabled' : ''}>
                </div>
            `;
            
            exchangeRatesList.appendChild(rateItem);
        }
    }
    
    // 設置實時匯率開關
    getElement('#useRealTimeRates').checked = appState.useRealTimeRates;
    
    // 更新上次匯率更新時間
    if (lastUpdateTime) {
        getElement('#lastRateUpdateTime').textContent = new Date(lastUpdateTime).toLocaleString();
    } else {
        getElement('#lastRateUpdateTime').textContent = '從未更新';
    }
    
    // 添加事件監聽器
    document.querySelectorAll('.edit-currency').forEach(button => {
        button.addEventListener('click', e => {
            const currencyCode = e.currentTarget.getAttribute('data-code');
            editCurrency(currencyCode);
        });
    });
    
    document.querySelectorAll('.delete-currency').forEach(button => {
        button.addEventListener('click', e => {
            const currencyCode = e.currentTarget.getAttribute('data-code');
            deleteCurrency(currencyCode);
        });
    });
    
    // 匯率輸入框變更事件
    document.querySelectorAll('.rate-input').forEach(input => {
        input.addEventListener('change', e => {
            if (!appState.useRealTimeRates) {
                const fromCurrency = e.target.getAttribute('data-from');
                const toCurrency = e.target.getAttribute('data-to');
                const rate = parseFloat(e.target.value) || 0;
                
                if (rate > 0) {
                    appState.exchangeRates[`${fromCurrency}_${toCurrency}`] = rate;
                    saveToLocalStorage();
                }
            }
        });
    });
    
    // 實時匯率開關事件
    getElement('#useRealTimeRates').addEventListener('change', e => {
        appState.useRealTimeRates = e.target.checked;
        
        // 更新輸入框禁用狀態
        document.querySelectorAll('.rate-input').forEach(input => {
            input.disabled = appState.useRealTimeRates;
        });
        
        // 如果開啟實時匯率，刷新匯率數據
        if (appState.useRealTimeRates) {
            refreshAllExchangeRates();
        }
        
        saveToLocalStorage();
    });
    
    // 刷新匯率按鈕事件
    getElement('#refreshRatesBtn').addEventListener('click', () => {
        refreshAllExchangeRates().then(() => {
            updateCurrencyManagementUI();
        });
    });
}

// 創建匯率管理模態框
function createCurrencyManagementModal() {
    const modal = document.createElement('div');
    modal.id = 'currencyManagementModal';
    modal.className = 'modal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>匯率與貨幣管理</h2>
            
            <div class="settings-section">
                <h3>貨幣設定</h3>
                <div class="form-group">
                    <button id="addCurrencyBtn" class="button-primary">新增貨幣</button>
                </div>
                <div id="currencyList" class="currency-list">
                    <!-- 貨幣列表 -->
                </div>
            </div>
            
            <div class="settings-section">
                <h3>匯率設定</h3>
                <div class="form-group">
                    <label for="useRealTimeRates">使用實時匯率</label>
                    <div class="switch">
                        <input type="checkbox" id="useRealTimeRates">
                        <span class="slider round"></span>
                    </div>
                </div>
                
                <div class="form-group">
                    <button id="refreshRatesBtn" class="button-secondary">刷新匯率數據</button>
                </div>
                
                <p class="help-text">上次更新: <span id="lastRateUpdateTime">${lastUpdateTime ? new Date(lastUpdateTime).toLocaleString() : '從未更新'}</span></p>
                
                <div id="exchangeRatesList" class="exchange-rates-list">
                    <!-- 匯率列表 -->
                </div>
            </div>
            
            <div class="modal-actions">
                <button id="closeCurrencyManagementBtn" class="button-secondary">關閉</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 關閉模態框事件
    getElement('#currencyManagementModal .close').addEventListener('click', () => {
        closeCurrentModal();
    });
    
    getElement('#closeCurrencyManagementBtn').addEventListener('click', () => {
        closeCurrentModal();
    });
    
    // 新增貨幣按鈕事件
    getElement('#addCurrencyBtn').addEventListener('click', addCurrency);
}

// 新增貨幣
function addCurrency() {
    // 創建貨幣編輯模態框（如果不存在）
    if (!getElement('#currencyEditModal')) {
        createCurrencyEditModal();
    }
    
    // 重置表單
    getElement('#currencyCode').value = '';
    getElement('#currencyName').value = '';
    getElement('#currencySymbol').value = '';
    getElement('#currencyCode').disabled = false; // 允許編輯代碼
    
    // 顯示模態框
    showModal('#currencyEditModal');
    getElement('#currencyEditModal h2').textContent = '新增貨幣';
    
    // 設置保存按鈕事件
    getElement('#saveCurrencyBtn').onclick = () => {
        const code = getElement('#currencyCode').value.trim().toUpperCase();
        const name = getElement('#currencyName').value.trim();
        const symbol = getElement('#currencySymbol').value.trim();
        
        if (!code || code.length !== 3) {
            showToast('貨幣代碼必須為3個字符', 'warning');
            return;
        }
        
        if (!name) {
            showToast('請輸入貨幣名稱', 'warning');
            return;
        }
        
        // 檢查是否已存在
        if (availableCurrencies.some(c => c.code === code)) {
            showToast('該貨幣代碼已存在', 'warning');
            return;
        }
        
        // 添加新貨幣
        availableCurrencies.push({
            code,
            name,
            symbol: symbol || code
        });
        
        // 儲存到本地和Firebase
        saveToLocalStorage();
        
        // 關閉模態框
        closeCurrentModal();
        
        // 刷新匯率數據
        refreshAllExchangeRates().then(() => {
            // 更新UI
            updateCurrencyManagementUI();
            updateCurrencySelect();
        });
        
        showToast('已成功添加貨幣', 'success');
    };
}

// 創建貨幣編輯模態框
function createCurrencyEditModal() {
    const modal = document.createElement('div');
    modal.id = 'currencyEditModal';
    modal.className = 'modal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>編輯貨幣</h2>
            
            <div class="form-group">
                <label for="currencyCode">貨幣代碼 (3字符)</label>
                <input type="text" id="currencyCode" maxlength="3" required>
            </div>
            
            <div class="form-group">
                <label for="currencyName">貨幣名稱</label>
                <input type="text" id="currencyName" required>
            </div>
            
            <div class="form-group">
                <label for="currencySymbol">貨幣符號 (可選)</label>
                <input type="text" id="currencySymbol">
            </div>
            
            <div class="modal-actions">
                <button id="saveCurrencyBtn" class="button-primary">保存</button>
                <button id="cancelCurrencyBtn" class="button-secondary">取消</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 關閉模態框事件
    getElement('#currencyEditModal .close').addEventListener('click', () => {
        closeCurrentModal();
    });
    
    getElement('#cancelCurrencyBtn').addEventListener('click', () => {
        closeCurrentModal();
    });
}

// 編輯貨幣
function editCurrency(currencyCode) {
    const currency = availableCurrencies.find(c => c.code === currencyCode);
    if (!currency) {
        showToast('找不到該貨幣', 'error');
        return;
    }
    
    // 創建貨幣編輯模態框（如果不存在）
    if (!getElement('#currencyEditModal')) {
        createCurrencyEditModal();
    }
    
    // 填充表單
    getElement('#currencyCode').value = currency.code;
    getElement('#currencyCode').disabled = true; // 不允許修改代碼
    getElement('#currencyName').value = currency.name;
    getElement('#currencySymbol').value = currency.symbol || '';
    
    // 顯示模態框
    showModal('#currencyEditModal');
    getElement('#currencyEditModal h2').textContent = '編輯貨幣';
    
    // 設置保存按鈕事件
    getElement('#saveCurrencyBtn').onclick = () => {
        const name = getElement('#currencyName').value.trim();
        const symbol = getElement('#currencySymbol').value.trim();
        
        if (!name) {
            showToast('請輸入貨幣名稱', 'warning');
            return;
        }
        
        // 更新貨幣
        currency.name = name;
        currency.symbol = symbol || currency.code;
        
        // 儲存到本地和Firebase
        saveToLocalStorage();
        
        // 關閉模態框
        closeCurrentModal();
        
        // 更新UI
        updateCurrencyManagementUI();
        updateCurrencySelect();
        
        showToast('已成功更新貨幣', 'success');
    };
}

// 刪除貨幣
function deleteCurrency(currencyCode) {
    const currency = availableCurrencies.find(c => c.code === currencyCode);
    if (!currency) {
        showToast('找不到該貨幣', 'error');
        return;
    }
    
    // 檢查是否為默認貨幣
    if (currencyCode === defaultCurrency) {
        showToast('無法刪除默認貨幣', 'error');
        return;
    }
    
    // 檢查是否有使用該貨幣的戶口
    const accountsUsingCurrency = appState.accounts.filter(a => a.currency === currencyCode);
    if (accountsUsingCurrency.length > 0) {
        showToast(`無法刪除：有${accountsUsingCurrency.length}個戶口使用該貨幣`, 'error');
        return;
    }
    
    // 關閉當前模態框，然後顯示確認模態框
    closeCurrentModal();
    
    showConfirmModal(`確定要刪除「${currency.name} (${currency.code})」貨幣嗎？`, () => {
        // 刪除自定義匯率
        for (const key in appState.exchangeRates) {
            if (key.startsWith(`${currencyCode}_`) || key.endsWith(`_${currencyCode}`)) {
                delete appState.exchangeRates[key];
            }
        }
        
        // 刪除緩存匯率
        for (const key in rateCache) {
            if (key.startsWith(`${currencyCode}_`) || key.endsWith(`_${currencyCode}`)) {
                delete rateCache[key];
            }
        }
        
        // 刪除貨幣
        availableCurrencies = availableCurrencies.filter(c => c.code !== currencyCode);
        
        // 儲存到本地和Firebase
        saveToLocalStorage();
        
        // 重新顯示匯率管理模態框
        showModal('#currencyManagementModal');
        
        // 更新UI
        updateCurrencyManagementUI();
        updateCurrencySelect();
        
        showToast('已成功刪除貨幣', 'success');
    });
}

// 更新設定UI
function updateSettingsUI() {
    // 更新深色模式設置
    getElement('#darkMode').checked = darkMode;
    
    // 更新字體大小設置
    document.querySelectorAll(`input[name="fontSize"]`).forEach(radio => {
        radio.checked = (radio.value === fontSize);
    });
    
    // 更新預設貨幣設置
    const defaultCurrencySelect = getElement('#defaultCurrency');
    
    // 清空選項
    defaultCurrencySelect.innerHTML = '';
    
    // 添加可用貨幣
    availableCurrencies.forEach(currency => {
        const option = document.createElement('option');
        option.value = currency.code;
        option.textContent = `${currency.name} (${currency.code})`;
        defaultCurrencySelect.appendChild(option);
    });
    
    // 設置默認貨幣
    defaultCurrencySelect.value = defaultCurrency;
    
    // 更新小數點位數設置
    document.querySelectorAll(`input[name="decimalPlaces"]`).forEach(radio => {
        radio.checked = (parseInt(radio.value) === decimalPlaces);
    });
    
    // 更新預算提醒設置
    getElement('#enableBudgetAlerts').checked = enableBudgetAlerts;
    getElement('#alertThreshold').value = alertThreshold;
    
    // 更新Firebase同步設置
    getElement('#enableFirebaseSync').checked = enableFirebase;
}

// 保存設定
function saveSettings() {
    // 獲取新設定
    darkMode = getElement('#darkMode').checked;
    fontSize = document.querySelector('input[name="fontSize"]:checked').value;
    const newDefaultCurrency = getElement('#defaultCurrency').value;
    decimalPlaces = parseInt(document.querySelector('input[name="decimalPlaces"]:checked').value, 10);
    enableBudgetAlerts = getElement('#enableBudgetAlerts').checked;
    alertThreshold = parseInt(getElement('#alertThreshold').value, 10);
    enableFirebase = getElement('#enableFirebaseSync').checked;
    
    // 應用深色模式
    if (darkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    
    // 應用字體大小
    document.body.className = document.body.className.replace(/font-size-\w+/, '');
    document.body.classList.add(`font-size-${fontSize}`);
    
    // 檢查默認貨幣是否更改
    if (newDefaultCurrency !== defaultCurrency) {
        defaultCurrency = newDefaultCurrency;
        // 更新UI需要重新計算貨幣
        updateDashboardUI();
    } else {
        defaultCurrency = newDefaultCurrency;
    }
    
    // 儲存設定
    saveToLocalStorage();
    
    // 關閉設定模態框
    closeCurrentModal();
    
    // 更新UI
    updateAllUI();
    
    showToast('已成功保存設定', 'success');
}

// 清除所有數據
function clearAllData() {
    showConfirmModal('確定要清除所有數據嗎？此操作無法撤銷！', () => {
        // 備份數據用於開發
        const dataBackup = {
            accounts: appState.accounts,
            categories: appState.categories,
            transactions: appState.transactions,
            budgets: appState.budgets,
            exchangeRates: appState.exchangeRates
        };
        
        console.log('數據備份:', dataBackup);
        
        // 重置應用狀態
        appState.accounts = [];
        appState.categories = { income: [], expense: [] };
        appState.transactions = [];
        appState.budgets = {
            total: 0,
            categories: [],
            resetCycle: 'monthly',
            resetDay: 1,
            inheritLastMonth: true
        };
        appState.exchangeRates = {};
        
        // 清除localStorage
        localStorage.removeItem('accounts');
        localStorage.removeItem('categories');
        localStorage.removeItem('transactions');
        localStorage.removeItem('budgets');
        localStorage.removeItem('exchangeRates');
        
        // 如果已登入，也從Firebase清除
        if (enableFirebase && appState.currentUser) {
            syncData().catch(error => {
                console.error('Clear Firebase data failed:', error);
            });
        }
        
        // 更新UI
        updateAllUI();
        
        showToast('已成功清除所有數據', 'success');
    });
}

// 匯出數據
function exportData() {
    const data = {
        accounts: appState.accounts,
        categories: appState.categories,
        transactions: appState.transactions,
        budgets: appState.budgets,
        exchangeRates: appState.exchangeRates,
        availableCurrencies: availableCurrencies,
        exportedAt: new Date().toISOString(),
        version: '1.1'
    };
    
    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = `finance_tracker_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 從檔案匯入數據
function importDataFromFile() {
    const fileInput = getElement('#importDataFile');
    fileInput.click();
    
    fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const jsonData = e.target.result;
                importDataFromJson(jsonData);
            } catch (error) {
                console.error('Import file error:', error);
                showToast('匯入失敗：文件格式錯誤', 'error');
            }
        };
        
        reader.readAsText(file);
    };
}

// 從JSON匯入數據
function importDataFromJson(jsonData) {
    try {
        const data = JSON.parse(jsonData);
        
        // 驗證數據格式
        if (!data.accounts || !data.categories || !data.transactions || !data.budgets) {
            showToast('匯入失敗：缺少必要數據', 'error');
            return;
        }
        
        showConfirmModal('匯入將覆蓋現有數據，是否繼續？', () => {
            // 更新應用狀態
            appState.accounts = data.accounts;
            appState.categories = data.categories;
            appState.transactions = data.transactions;
            appState.budgets = data.budgets;
            
            // 匯入匯率設定（如果存在）
            if (data.exchangeRates) {
                appState.exchangeRates = data.exchangeRates;
            }
            
            // 匯入可用貨幣（如果存在）
            if (data.availableCurrencies && data.availableCurrencies.length > 0) {
                availableCurrencies = data.availableCurrencies;
            }
            
            // 儲存到本地和Firebase
            saveToLocalStorage();
            
            // 初始化匯率數據
            initializeExchangeRates();
            
            // 更新UI
            updateAllUI();
            
            showToast('數據匯入成功', 'success');
        });
    } catch (error) {
        console.error('Import data error:', error);
        showToast('匯入失敗：JSON格式錯誤', 'error');
    }
}

// 從文本框匯入數據
function importDataFromText() {
    const jsonData = getElement('#importDataText').value.trim();
    if (!jsonData) {
        showToast('請輸入有效的JSON數據', 'warning');
        return;
    }
    
    importDataFromJson(jsonData);
}

// 更新所有UI
function updateAllUI() {
    updateDashboardUI();
    updateAccountsUI();
    updateCategoriesUI();
    updateTransactionsUI();
    updateBudgetsUI();
    updateStatisticsUI();
    updateSyncUI();
    updateSettingsUI();
}

// 導航到指定頁面
function navigateTo(hash) {
    // 移除所有active類
    document.querySelectorAll('nav a').forEach(a => {
        a.classList.remove('active');
    });
    
    document.querySelectorAll('main section').forEach(section => {
        section.classList.remove('active');
    });
    
    // 添加active類到當前頁面
    const link = document.querySelector(`nav a[href="${hash}"]`);
    if (link) {
        link.classList.add('active');
    }
    
    const section = document.querySelector(hash);
    if (section) {
        section.classList.add('active');
    }
    
    // 更新URL
    if (history.pushState) {
        history.pushState(null, null, hash);
    } else {
        location.hash = hash;
    }
}

// 應用初始化
async function initApp() {
    // 初始化UI元素
    const todayDate = getTodayDate();
    if (getElement('#incomeDate')) {
        getElement('#incomeDate').value = todayDate;
    }
    if (getElement('#expenseDate')) {
        getElement('#expenseDate').value = todayDate;
    }
    
    // 檢查是否支持localStorage
    if (typeof Storage === 'undefined') {
        showToast('您的瀏覽器不支持本地存儲，部分功能可能無法使用', 'warning');
    }
    
    // 初始化Firebase
    updateConnectionStatus('正在連接...');
    initializeFirebase()
        .then(initialized => {
            if (initialized) {
                showToast('Firebase已連接', 'success');
            } else {
                showToast('無法連接Firebase，使用本地模式', 'warning');
            }
        })
        .catch(error => {
            console.error('Firebase initialization error:', error);
            showToast('Firebase初始化錯誤，使用本地模式', 'error');
            updateConnectionStatus('連接失敗');
        });
    
    // 從localStorage加載資料
    loadFromLocalStorage();
    
    // 初始化圖標選擇器
    populateIconSelector();
    
    // 設置事件監聽器
    setupEventListeners();
    
    // 應用深色模式
    if (darkMode) {
        document.body.classList.add('dark-mode');
    }
    
    // 應用字體大小
    document.body.classList.add(`font-size-${fontSize}`);
    
    // 處理URL哈希
    if (location.hash) {
        navigateTo(location.hash);
    } else {
        navigateTo('#dashboard');
    }
    
    // 初始化匯率數據
    try {
        await initializeExchangeRates();
    } catch (error) {
        console.error('Error initializing exchange rates:', error);
    }
}

// 設置事件監聽器
function setupEventListeners() {
    // 導航事件
    document.querySelectorAll('nav a').forEach(a => {
        a.addEventListener('click', e => {
            e.preventDefault();
            navigateTo(a.getAttribute('href'));
        });
    });
    
    // 設定按鈕
    getElement('#settingsBtn').addEventListener('click', () => {
        showModal('#settingsModal');
    });
    
    // 匯率管理
    getElement('#settings-currency-management-btn').addEventListener('click', () => {
        if (!getElement('#currencyManagementModal')) {
            createCurrencyManagementModal();
        }
        updateCurrencyManagementUI();
        showModal('#currencyManagementModal');
    });
    
    // 添加戶口
    getElement('#addAccountBtn').addEventListener('click', addAccount);
    
    // 戶口視圖切換
    getElement('#cardViewBtn').addEventListener('click', () => {
        getElement('#cardViewBtn').classList.add('active');
        getElement('#listViewBtn').classList.remove('active');
        updateAccountsUI();
    });
    
    getElement('#listViewBtn').addEventListener('click', () => {
        getElement('#listViewBtn').classList.add('active');
        getElement('#cardViewBtn').classList.remove('active');
        updateAccountsUI();
    });
    
    // 轉賬處理
    getElement('#transferBtn').addEventListener('click', handleTransfer);
    
    // 轉賬金額變化時更新匯率信息
    const transferAmountInput = getElement('#transferAmount');
    const fromAccountSelect = getElement('#fromAccount');
    const toAccountSelect = getElement('#toAccount');
    
    transferAmountInput.addEventListener('input', updateExchangeRateInfo);
    fromAccountSelect.addEventListener('change', updateExchangeRateInfo);
    toAccountSelect.addEventListener('change', updateExchangeRateInfo);
    
    // 標籤頁切換
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            const tabContent = document.getElementById(`${tabId}Tab`);
            
            // 找到父容器，然後處理其中的標籤頁
            const tabContainer = tab.parentElement;
            const contentContainer = tabContent.parentElement;
            
            // 移除所有active類
            tabContainer.querySelectorAll('.tab').forEach(t => {
                t.classList.remove('active');
            });
            
            contentContainer.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // 添加active類到當前標籤頁
            tab.classList.add('active');
            tabContent.classList.add('active');
        });
    });
    
    // 收入支出記錄
    getElement('#saveIncomeBtn').addEventListener('click', saveIncome);
    getElement('#saveExpenseBtn').addEventListener('click', saveExpense);
    
    // 交易搜尋
    getElement('#searchTransactionsBtn').addEventListener('click', updateTransactionsUI);
    
    // 類別視圖切換
    getElement('#incomeCategoryCardViewBtn').addEventListener('click', () => {
        getElement('#incomeCategoryCardViewBtn').classList.add('active');
        getElement('#incomeCategoryListViewBtn').classList.remove('active');
        updateCategoriesUI();
    });
    
    getElement('#incomeCategoryListViewBtn').addEventListener('click', () => {
        getElement('#incomeCategoryListViewBtn').classList.add('active');
        getElement('#incomeCategoryCardViewBtn').classList.remove('active');
        updateCategoriesUI();
    });
    
    getElement('#expenseCategoryCardViewBtn').addEventListener('click', () => {
        getElement('#expenseCategoryCardViewBtn').classList.add('active');
        getElement('#expenseCategoryListViewBtn').classList.remove('active');
        updateCategoriesUI();
    });
    
    getElement('#expenseCategoryListViewBtn').addEventListener('click', () => {
        getElement('#expenseCategoryListViewBtn').classList.add('active');
        getElement('#expenseCategoryCardViewBtn').classList.remove('active');
        updateCategoriesUI();
    });
    
    // 添加類別
    getElement('#addIncomeCategory').addEventListener('click', () => {
        addCategory('income');
    });
    
    getElement('#addExpenseCategory').addEventListener('click', () => {
        addCategory('expense');
    });
    
    // 預算設定
    getElement('#saveBudgetSettingsBtn').addEventListener('click', saveBudgetSettings);
    getElement('#addCategoryBudgetBtn').addEventListener('click', addCategoryBudget);
    
    // 同步功能
    getElement('#loginBtn').addEventListener('click', () => {
        if (!firebaseInitialized) {
            showToast('Firebase未初始化，無法登入', 'error');
            return;
        }
        
        const provider = new firebase.auth.GoogleAuthProvider();
        
        firebase.auth().signInWithPopup(provider)
            .then(() => {
                showToast('登入成功', 'success');
            })
            .catch(error => {
                console.error('Login error:', error);
                showToast(`登入失敗: ${error.message}`, 'error');
            });
    });
    
    getElement('#logoutBtn').addEventListener('click', () => {
        if (!firebaseInitialized) {
            showToast('Firebase未初始化，無法登出', 'error');
            return;
        }
        
        firebase.auth().signOut()
            .then(() => {
                showToast('登出成功', 'success');
            })
            .catch(error => {
                console.error('Logout error:', error);
                showToast(`登出失敗: ${error.message}`, 'error');
            });
    });
    
    getElement('#syncNowBtn').addEventListener('click', () => {
        syncData();
    });
    
    getElement('#autoSync').addEventListener('change', e => {
        autoSync = e.target.checked;
        localStorage.setItem('autoSync', autoSync.toString());
    });
    
    // 數據匯入導出
    getElement('#exportDataBtn').addEventListener('click', exportData);
    getElement('#importFileBtn').addEventListener('click', importDataFromFile);
    getElement('#importDataBtn').addEventListener('click', importDataFromText);
    
    // 設定保存
    getElement('#saveSettingsBtn').addEventListener('click', saveSettings);
    
    // 清除數據
    getElement('#clearDataBtn').addEventListener('click', clearAllData);
    
    // 添加窗口關閉事件處理
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeCurrentModal();
        });
    });
    
    // 點擊模態框外部關閉
    window.addEventListener('click', e => {
        if (e.target.classList.contains('modal')) {
            closeCurrentModal();
        }
    });
}

// 當DOM加載完成後初始化應用
document.addEventListener('DOMContentLoaded', initApp);
