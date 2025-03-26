// 修改 Google API 配置，適應 GitHub Pages
const GOOGLE_API_CONFIG = {
    apiKey: 'AIzaSyB6Q_qkp0PowjLYXM2hGPwYGXm7RTOgPBQ',
    clientId: '75969942287-bkhslov3f4mi6q8lao4ud19bnid9p14e.apps.googleusercontent.com',
    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
    scopes: 'https://www.googleapis.com/auth/drive.file',
    appFolderName: '進階財務追蹤器',
    dataFileName: 'finance_data.json'
};

// Global variables to store data
let accounts = [];
let categories = {
    income: [],
    expense: []
};
let transactions = [];
let budget = {
    amount: 0,
    cycle: 'monthly',
    resetDay: 1,
    thresholds: [80],
    lastReset: null
};
let categoryBudgets = [];
let newDayStatus = {
    active: false,
    lastActivated: null
};
// 新增汇率相关全局变量
let exchangeRates = {
    base: 'TWD',
    rates: {},
    lastUpdated: null,
    expiryHours: 24 // 默认缓存24小时
};
let appSettings = {
    currency: 'TWD',
    currencySymbol: '$',
    syncRemindersEnabled: true,
    lastSyncReminder: null,
    theme: 'system',
    dailySummaryTiming: 'immediate',
    enableVirtualization: true,
    pageSize: 100,
    // Google Drive 同步設定
    googleSync: {
        enabled: false,
        frequency: 'daily', // daily, weekly, monthly
        lastSync: null,
        fileId: null
     },
    // 匯率設定
    exchangeRates: {
        enabled: false,
        apiKey: '',
        cacheHours: 24,
        lastUpdated: null
    }
};
let dataModified = false; // Track if data has been modified since last sync
let paginationState = {
    currentPage: 1,
    totalPages: 1,
    pageSize: 100,
    totalItems: 0,
    currentItems: []
};

// Google Drive API 狀態
let googleApiInitialized = false;
let googleUser = null;

// Selected values
let selectedIcon = '💳';
let selectedCategoryType = 'expense';
let transactionType = 'expense';

// Currency symbols
const currencySymbols = {
    'TWD': '$',
    'USD': '$',
    'EUR': '€',
    'JPY': '¥',
    'CNY': '¥',
    'HKD': 'HK$',
    'GBP': '£',
    'AUD': 'A$',
    'CAD': 'C$',
    'SGD': 'S$'
};

// Check if localStorage is available
let hasLocalStorage = false;
try {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        hasLocalStorage = true;
    }
} catch (e) {
    hasLocalStorage = false;
    console.log('localStorage not available:', e);
}

// DOM Elements
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const newAccountModal = document.getElementById('newAccountModal');
const newCategoryModal = document.getElementById('newCategoryModal');
const importExportModal = document.getElementById('importExportModal');
const settingsModal = document.getElementById('settingsModal');
const receiptViewModal = document.getElementById('receiptViewModal');
const dailySummaryModal = document.getElementById('dailySummaryModal');
const notification = document.getElementById('notification');
const syncReminder = document.getElementById('syncReminder');
const searchLoadingIndicator = document.getElementById('searchLoadingIndicator');

// Debounce function for performance optimization
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the app
    initApp();
    
    // Setup event listeners
    setupEventListeners();
    
    // Check for dark mode
    applyTheme();
    
    // Initialize Google API
    initGoogleApi();
});

// Initialize the app
function initApp() {
    // Load data from localStorage if available
    loadData();
    
    // 增加汇率初始化
    initExchangeRates();
    
    // Set default transaction date
    document.getElementById('transactionDate').value = getTodayFormatted();
    
    // Update currency display
    updateCurrencyDisplay();
    
    // Initialize UI elements
    updateUI();
    
    // Check for budget reset
    checkBudgetReset();
    
    // Check new day status
    checkNewDayStatus();
    
    // Check if sync reminder should be shown
    checkSyncReminder();
    
    // 確保匯率Tab被正確初始化為可見
    const exchangeRatesTab = document.getElementById('exchangeRates');
    if (exchangeRatesTab) {
        exchangeRatesTab.classList.add('tab-content'); // 確保有正確的基本類別
    }
}

// 初始化 Google API - 優化版本
function initGoogleApi() {
    console.log('開始初始化 Google API...');
    
    // 重置按鈕狀態和顯示加載中
    const googleSignInBtn = document.getElementById('googleSignInBtn');
    if (!googleSignInBtn) return; // 安全檢查
    
    googleSignInBtn.disabled = true;
    googleSignInBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> 載入中...';
    updateGoogleSigninStatus('pending', 'Google API 正在初始化...');
    
    // 清除之前的超時計時器
    if (window.gapiInitTimeout) {
        clearTimeout(window.gapiInitTimeout);
    }
    
    // 設置 domain hint 以解決域名問題
    const meta = document.createElement('meta');
    meta.name = 'google-signin-client_id';
    meta.content = GOOGLE_API_CONFIG.clientId;
    document.head.appendChild(meta);
    
    // 設置 domain hint 以解決域名問題
    const hintMeta = document.createElement('meta');
    hintMeta.name = 'google-signin-hosted_domain';
    hintMeta.content = window.location.hostname;
    document.head.appendChild(hintMeta);
    
    // 最大重試次數和當前重試次數
    const MAX_RETRIES = 2;
    let currentRetry = 0;
    
    // 檢查配置是否有效
    if (!GOOGLE_API_CONFIG.apiKey || GOOGLE_API_CONFIG.apiKey === 'YOUR_API_KEY' || 
        !GOOGLE_API_CONFIG.clientId || GOOGLE_API_CONFIG.clientId === 'YOUR_CLIENT_ID') {
        console.error('Google API 配置缺少 API Key 或 Client ID');
        updateGoogleSigninStatus('error', 'Google API 配置錯誤: 需要有效的 API Key 和 Client ID');
        googleSignInBtn.disabled = false;
        googleSignInBtn.innerHTML = '<svg class="google-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg> 設定 API Key';
        return;
    }
    
    // 檢查 gapi 是否已載入
    if (typeof gapi === 'undefined') {
        console.error('Google API (gapi) 未載入');
        updateGoogleSigninStatus('error', 'Google API 未載入，請檢查網絡連接並重新整理頁面');
        googleSignInBtn.disabled = false;
        googleSignInBtn.innerHTML = '<i class="fas fa-sync mr-2"></i> 重試載入';
        return;
    }
    
    // 嘗試初始化的函數
    function attemptInitialization() {
        console.log(`嘗試 Google API 初始化... (嘗試 ${currentRetry + 1}/${MAX_RETRIES + 1})`);
        
        // 設置超時定時器
        const timeoutId = setTimeout(() => {
            console.warn(`Google API 初始化超時 (嘗試 ${currentRetry + 1})`);
            if (currentRetry < MAX_RETRIES) {
                currentRetry++;
                attemptInitialization();
            } else {
                updateGoogleSigninStatus('error', 'Google API 初始化超時，請檢查網絡連接並稍後重試');
                googleSignInBtn.disabled = false;
                googleSignInBtn.innerHTML = '<i class="fas fa-sync mr-2"></i> 重試載入';
            }
        }, 10000);  // 10秒超時
        
        try {
            // 使用簡單直接的方法載入 client 庫
            gapi.load('client:auth2', () => {
                console.log('gapi.client:auth2 已載入，初始化中...');
                
                // 初始化客戶端
                gapi.client.init({
                    apiKey: GOOGLE_API_CONFIG.apiKey,
                    clientId: GOOGLE_API_CONFIG.clientId,
                    scope: GOOGLE_API_CONFIG.scopes || 'https://www.googleapis.com/auth/drive.file',
                    // 添加允許的域名（GitHub Pages）
                    hosted_domain: window.location.hostname,
                    redirect_uri: window.location.origin + window.location.pathname
                })
                .then(() => {
                    clearTimeout(timeoutId);
                    console.log('Google API 初始化成功');
                    
                    // 標記為已初始化
                    googleApiInitialized = true;
                    
                    // 更新 UI 和狀態
                    googleSignInBtn.disabled = false;
                    googleSignInBtn.innerHTML = '<svg class="google-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg> 使用 Google 帳戶登入';
                    updateGoogleSigninStatus('success', 'Google API 已準備就緒，請登入');
                    
                    try {
                        // 設置認證狀態監聽
                        const authInstance = gapi.auth2.getAuthInstance();
                        if (authInstance) {
                            authInstance.isSignedIn.listen(updateSignInStatus);
                            updateSignInStatus(authInstance.isSignedIn.get());
                        }
                        
                        // 檢查自動同步
                        checkAutoSync();
                    } catch (err) {
                        console.warn('設置認證監聽器時發生非嚴重錯誤:', err);
                        // 這裡不將整個初始化標記為失敗，因為主要功能已經初始化成功
                    }
                })
                .catch(error => {
                    clearTimeout(timeoutId);
                    console.error('Google API 初始化錯誤:', error);
                    
                    if (currentRetry < MAX_RETRIES) {
                        // 重試
                        currentRetry++;
                        console.log(`初始化失敗，正在重試 (${currentRetry}/${MAX_RETRIES})...`);
                        setTimeout(() => attemptInitialization(), 1000); // 延遲 1 秒後重試
                    } else {
                        // 所有重試都失敗
                        processInitError(error);
                    }
                });
            }, error => {
                clearTimeout(timeoutId);
                console.error('無法載入 gapi.client:auth2:', error);
                
                if (currentRetry < MAX_RETRIES) {
                    // 重試
                    currentRetry++;
                    console.log(`載入失敗，正在重試 (${currentRetry}/${MAX_RETRIES})...`);
                    setTimeout(() => attemptInitialization(), 1000); // 延遲 1 秒後重試
                } else {
                    // 所有重試都失敗
                    updateGoogleSigninStatus('error', '無法載入 Google API 客戶端庫，請稍後重試');
                    googleSignInBtn.disabled = false;
                    googleSignInBtn.innerHTML = '<i class="fas fa-sync mr-2"></i> 重試載入';
                }
            });
        } catch (error) {
            clearTimeout(timeoutId);
            console.error('初始化過程中發生嚴重錯誤:', error);
            
            if (currentRetry < MAX_RETRIES) {
                // 重試
                currentRetry++;
                console.log(`發生錯誤，正在重試 (${currentRetry}/${MAX_RETRIES})...`);
                setTimeout(() => attemptInitialization(), 1000); // 延遲 1 秒後重試
            } else {
                // 所有重試都失敗
                processInitError(error);
            }
        }
    }
    
    // 處理初始化錯誤
    function processInitError(error) {
        let errorMessage = '初始化失敗';
        
        if (error) {
            if (error.message) {
                if (error.message.includes('idpiframe_initialization_failed')) {
                    errorMessage = '第三方 Cookie 被阻止，請在瀏覽器設置中允許';
                } else if (error.message.includes('Missing required parameter')) {
                    errorMessage = 'API 參數錯誤，請確認 API Key 和 Client ID';
                } else if (error.message.includes('Not a valid origin')) {
                    errorMessage = '網站來源未授權，請在 Google Cloud Console 添加網站域名: ' + window.location.origin;
                } else if (error.message.includes('disable_third_party_cookies')) {
                    errorMessage = '瀏覽器禁止第三方 Cookie，請在設置中允許';
                } else if (error.message.includes('network') || error.message.includes('Failed to fetch')) {
                    errorMessage = '網絡連接錯誤，請檢查網絡';
                } else if (error.message.includes('The API key or OAuth client is restricted')) {
                    errorMessage = 'API Key 使用受限，請確認域名限制設置包含: ' + window.location.hostname;
                }
            }
        }
        
        updateGoogleSigninStatus('error', `Google API 初始化失敗: ${errorMessage}`);
        googleSignInBtn.disabled = false;
        googleSignInBtn.innerHTML = '<i class="fas fa-sync mr-2"></i> 重試載入';
        
        // 顯示更詳細的錯誤通知，但保持簡潔
        notify('❌', '初始化失敗', `Google API 初始化失敗: ${errorMessage}`);
    }
    
    // 開始第一次嘗試初始化
    attemptInitialization();
}

// 更新 getTotalBalance 方法，正確處理匯率轉換
function getTotalBalance() {
    // 如果未启用汇率转换，直接相加所有账户余额
    if (!appSettings.exchangeRates.enabled) {
        return accounts.reduce((sum, account) => sum + account.balance, 0);
    }
    
    // 基准货币
    const baseCurrency = appSettings.currency;
    
    // 转换每个账户的余额至基准货币
    return accounts.reduce((sum, account) => {
        const accountCurrency = account.currency || baseCurrency;
        const convertedBalance = convertCurrency(account.balance, accountCurrency, baseCurrency);
        return sum + convertedBalance;
    }, 0);
}

// 修改 getTodayIncome 和 getTodayExpense 方法，支持匯率轉換
function getTodayIncome() {
    const transactions = getTodayTransactions().filter(t => t.type === 'income');
    
    if (!appSettings.exchangeRates.enabled) {
        return transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    }
    
    // 基準貨幣
    const baseCurrency = appSettings.currency;
    
    // 轉換每個交易金額至基準貨幣
    return transactions.reduce((sum, t) => {
        const account = getAccount(t.account);
        const accountCurrency = account ? account.currency : baseCurrency;
        const transactionCurrency = t.currency || accountCurrency;
        const convertedAmount = convertCurrency(parseFloat(t.amount), transactionCurrency, baseCurrency);
        return sum + convertedAmount;
    }, 0);
}

function getTodayExpense() {
    const transactions = getTodayTransactions().filter(t => t.type === 'expense');
    
    if (!appSettings.exchangeRates.enabled) {
        return transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    }
    
    // 基準貨幣
    const baseCurrency = appSettings.currency;
    
    // 轉換每個交易金額至基準貨幣
    return transactions.reduce((sum, t) => {
        const account = getAccount(t.account);
        const accountCurrency = account ? account.currency : baseCurrency;
        const transactionCurrency = t.currency || accountCurrency;
        const convertedAmount = convertCurrency(parseFloat(t.amount), transactionCurrency, baseCurrency);
        return sum + convertedAmount;
    }, 0);
}

// 添加交易貨幣選擇功能的相關方法
// 初始化交易貨幣選擇
function initTransactionCurrency() {
    const transactionAccount = document.getElementById('transactionAccount');
    const transactionCurrency = document.getElementById('transactionCurrency');
    
    if (!transactionAccount || !transactionCurrency) return; // 安全檢查
    
    // 監聽戶口變更，自動更新貨幣
    transactionAccount.addEventListener('change', function() {
        const accountId = this.value;
        if (accountId) {
            const account = getAccount(accountId);
            if (account && account.currency) {
                // 將交易貨幣選擇器設為空，表示跟隨戶口貨幣
                transactionCurrency.value = '';
                
                // 顯示當前選定的戶口貨幣
                const currencyInfoEl = document.querySelector('.currency-info');
                if (currencyInfoEl) {
                    currencyInfoEl.textContent = `使用戶口貨幣: ${account.currency}`;
                }
            }
        }
    });
    
    // 將交易貨幣選擇器包裝在一個具有附加信息的div中
    const currencySelectWrapper = document.createElement('div');
    currencySelectWrapper.className = 'currency-select-wrapper relative';
    
    // 創建一個用於顯示當前貨幣的信息元素
    const currencyInfo = document.createElement('div');
    currencyInfo.className = 'currency-info';
    currencyInfo.textContent = '使用戶口貨幣';
    
    // 創建一個用於顯示匯率轉換信息的元素
    const conversionInfo = document.createElement('div');
    conversionInfo.className = 'currency-conversion-info';
    conversionInfo.id = 'currencyConversionInfo';
    
    // 獲取 transactionCurrency 的父元素
    const currencyParent = transactionCurrency.parentNode;
    
    // 替換 select 元素為包裝的 div
    transactionCurrency.parentNode.removeChild(transactionCurrency);
    currencySelectWrapper.appendChild(transactionCurrency);
    currencySelectWrapper.appendChild(currencyInfo);
    currencyParent.appendChild(currencySelectWrapper);
    currencyParent.appendChild(conversionInfo);
    
    // 監聽貨幣變更
    transactionCurrency.addEventListener('change', function() {
        const accountId = transactionAccount.value;
        if (accountId && this.value) {
            const account = getAccount(accountId);
            if (account && account.currency && this.value !== account.currency) {
                // 顯示匯率轉換信息
                updateCurrencyConversionInfo(account.currency, this.value);
            } else {
                // 隱藏匯率轉換信息
                conversionInfo.style.display = 'none';
            }
        } else {
            // 隱藏匯率轉換信息
            conversionInfo.style.display = 'none';
        }
    });
}

// 更新貨幣轉換信息
function updateCurrencyConversionInfo(fromCurrency, toCurrency) {
    const conversionInfo = document.getElementById('currencyConversionInfo');
    if (!conversionInfo) return;
    
    if (!appSettings.exchangeRates.enabled || !exchangeRates.rates) {
        conversionInfo.textContent = '匯率功能未啟用，無法轉換貨幣。';
        conversionInfo.style.display = 'block';
        return;
    }
    
    // 計算匯率
    const rate = getExchangeRate(fromCurrency, toCurrency);
    if (!rate) {
        conversionInfo.textContent = `無法獲取 ${fromCurrency} 至 ${toCurrency} 的匯率。`;
        conversionInfo.style.display = 'block';
        return;
    }
    
    conversionInfo.textContent = `匯率: 1 ${fromCurrency} = ${rate.toFixed(4)} ${toCurrency}`;
    conversionInfo.style.display = 'block';
}

// 獲取特定貨幣對的匯率
function getExchangeRate(fromCurrency, toCurrency) {
    if (!exchangeRates.rates) return null;
    
    // 如果是相同貨幣，匯率為1
    if (fromCurrency === toCurrency) return 1;
    
    // 如果基準貨幣就是 fromCurrency
    if (exchangeRates.base === fromCurrency) {
        return exchangeRates.rates[toCurrency] || null;
    }
    
    // 如果基準貨幣就是 toCurrency
    if (exchangeRates.base === toCurrency) {
        const fromRate = exchangeRates.rates[fromCurrency];
        return fromRate ? 1 / fromRate : null;
    }
    
    // 通過基準貨幣進行轉換
    const fromRate = exchangeRates.rates[fromCurrency];
    const toRate = exchangeRates.rates[toCurrency];
    
    if (!fromRate || !toRate) return null;
    
    return toRate / fromRate;
}

// 修改 addTransaction 方法以支持貨幣選擇
function addTransaction() {
    const accountSelect = document.getElementById('transactionAccount');
    const currencySelect = document.getElementById('transactionCurrency');
    const categorySelect = document.getElementById('transactionCategory');
    const amountInput = document.getElementById('transactionAmount');
    const dateInput = document.getElementById('transactionDate');
    const noteInput = document.getElementById('transactionNote');
    const enableReceiptUpload = document.getElementById('enableReceiptUpload');
    const receiptImage = document.getElementById('receiptImage');
    
    const accountId = accountSelect.value;
    const selectedCurrency = currencySelect.value; // 可能為空，表示使用戶口貨幣
    const category = categorySelect.value;
    const amount = parseFloat(amountInput.value);
    const date = dateInput.value;
    const note = noteInput.value.trim();
    
    if (!accountId || !category || isNaN(amount) || amount <= 0 || !date) {
        notify('❌', '交易失敗', '請填寫完整的交易資料。');
        return;
    }
    
    const accountIndex = accounts.findIndex(a => a.id === accountId);
    
    if (accountIndex === -1) {
        notify('❌', '交易失敗', '找不到指定的戶口。');
        return;
    }
    
    // 確定交易使用的貨幣
    const account = accounts[accountIndex];
    const transactionCurrency = selectedCurrency || account.currency;
    
    // 處理貨幣轉換（如果需要）
    let convertedAmount = amount;
    if (transactionCurrency !== account.currency && appSettings.exchangeRates.enabled) {
        convertedAmount = convertCurrency(amount, transactionCurrency, account.currency);
        
        // 如果無法轉換，顯示錯誤
        if (isNaN(convertedAmount) || convertedAmount <= 0) {
            notify('❌', '貨幣轉換失敗', '無法轉換貨幣，請檢查匯率設定。');
            return;
        }
    }
    
    // Handle receipt image
    let receipt = null;
    if (enableReceiptUpload.checked && receiptImage.files && receiptImage.files[0]) {
        const file = receiptImage.files[0];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            // Create transaction with receipt
            createTransaction(accountIndex, category, amount, convertedAmount, transactionCurrency, date, note, {
                data: e.target.result,
                type: file.type
            });
        };
        
        reader.readAsDataURL(file);
    } else {
        // Create transaction without receipt
        createTransaction(accountIndex, category, amount, convertedAmount, transactionCurrency, date, note, null);
    }
}

// 修改 createTransaction 方法以支持貨幣轉換
function createTransaction(accountIndex, category, amount, convertedAmount, currency, date, note, receipt) {
    // Update account balance with converted amount
    if (transactionType === 'income') {
        accounts[accountIndex].balance += convertedAmount;
    } else {
        // Check if account has enough balance for expense
        if (accounts[accountIndex].balance < convertedAmount) {
            notify('⚠️', '餘額不足', `「${accounts[accountIndex].name}」戶口餘額不足，但交易仍已記錄。`);
        }
        accounts[accountIndex].balance -= convertedAmount;
    }
    
    // Add transaction with original amount and currency
    transactions.push({
        id: generateId(),
        type: transactionType,
        account: accounts[accountIndex].id,
        category: category,
        amount: amount,
        convertedAmount: convertedAmount,
        currency: currency,
        date: date,
        note: note,
        receipt: receipt
    });
    
    saveData('accounts');
    saveData('transactions');
    
    // Check if budget alert needed
    checkBudgetAlert();
    
    // Reset form except for type and account
    const currentType = transactionType;
    const currentAccount = accounts[accountIndex].id;
    
    document.getElementById('transactionCategory').value = '';
    document.getElementById('transactionAmount').value = '';
    document.getElementById('transactionNote').value = '';
    document.getElementById('transactionCurrency').value = '';
    
    // Reset receipt upload
    document.getElementById('enableReceiptUpload').checked = false;
    document.getElementById('receiptUploadContainer').style.display = 'none';
    document.getElementById('receiptImage').value = '';
    document.getElementById('receiptPreview').style.display = 'none';
    
    // 隱藏匯率轉換信息
    const conversionInfo = document.getElementById('currencyConversionInfo');
    if (conversionInfo) {
        conversionInfo.style.display = 'none';
    }
    
    updateAccountsTab();
    updateDashboard();
    searchTransactions();
    
    // 顯示轉換信息（如果進行了貨幣轉換）
    const accountCurrency = accounts[accountIndex].currency;
    const currencySymbol = currency ? 
        (currencySymbols[currency] || appSettings.currencySymbol) : 
        (currencySymbols[accountCurrency] || appSettings.currencySymbol);
    
    if (currency !== accountCurrency && amount !== convertedAmount) {
        notify('✅', '交易已記錄', `${transactionType === 'income' ? '收入' : '支出'}交易已成功記錄: ${currencySymbol}${formatNumber(amount)} ${currency} (轉換為 ${formatNumber(convertedAmount)} ${accountCurrency})`);
    } else {
        notify('✅', '交易已記錄', `${transactionType === 'income' ? '收入' : '支出'}交易已成功記錄: ${currencySymbol}${formatNumber(amount)}`);
    }
}

// 設定事件監聽器
function setupEventListeners() {
    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
    
    // 初始化交易貨幣選擇
    initTransactionCurrency();
    
    // 其他所有事件監聽器...
}

// 修改 switchTab 函數以修復匯率分頁顯示問題
function switchTab(tabId) {
    // Update tab buttons
    tabButtons.forEach(button => {
        const buttonTabId = button.getAttribute('data-tab');
        if (buttonTabId === tabId) {
            button.classList.add('text-primary', 'border-primary');
            button.classList.remove('text-gray-500', 'hover:text-gray-700', 'border-transparent');
        } else {
            button.classList.remove('text-primary', 'border-primary');
            button.classList.add('text-gray-500', 'hover:text-gray-700', 'border-transparent');
        }
    });
    
    // Update tab contents
    tabContents.forEach(content => {
        if (content.id === tabId) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
    
    // Specific actions for certain tabs
    if (tabId === 'exchangeRates') {
        // 檢查匯率功能是否啟用
        if (!appSettings.exchangeRates.enabled) {
            notify('ℹ️', '未啟用匯率功能', '請在設定中啟用即時匯率功能');
            // 不自動切換回去，讓用戶可以看到匯率頁面
        }
        
        // 檢查是否有匯率數據
        if (!exchangeRates.rates || Object.keys(exchangeRates.rates).length === 0) {
            notify('ℹ️', '無匯率數據', '請在設定中更新匯率數據');
            // 繼續切換到匯率頁面，因為用戶可以在頁面上點擊更新按鈕
        }
        
        // 更新匯率頁面內容
        setTimeout(updateExchangeRatesContent, 100);
    }
    
    // 其他Tab處理保持不變...
}

// 載入數據時，確保讀取交易的貨幣信息
function loadData() {
    if (hasLocalStorage) {
        try {
            // 原有的數據載入...
            const storedAccounts = localStorage.getItem('finance_accounts');
            accounts = storedAccounts ? JSON.parse(storedAccounts) : [];
            
            const storedCategories = localStorage.getItem('finance_categories');
            categories = storedCategories ? JSON.parse(storedCategories) : { income: [], expense: [] };
            
            const storedTransactions = localStorage.getItem('finance_transactions');
            transactions = storedTransactions ? JSON.parse(storedTransactions) : [];
            
            const storedBudget = localStorage.getItem('finance_budget');
            budget = storedBudget ? JSON.parse(storedBudget) : budget;
            
            const storedCategoryBudgets = localStorage.getItem('finance_category_budgets');
            categoryBudgets = storedCategoryBudgets ? JSON.parse(storedCategoryBudgets) : [];
            
            const storedNewDayStatus = localStorage.getItem('finance_new_day_status');
            newDayStatus = storedNewDayStatus ? JSON.parse(storedNewDayStatus) : newDayStatus;
            
            const storedAppSettings = localStorage.getItem('finance_app_settings');
            if (storedAppSettings) {
                appSettings = {...appSettings, ...JSON.parse(storedAppSettings)};
            }
            
            // 確保交易記錄有貨幣信息
            transactions.forEach(transaction => {
                if (!transaction.currency) {
                    // 如果交易沒有貨幣信息，根據戶口設置
                    const account = getAccount(transaction.account);
                    if (account) {
                        transaction.currency = account.currency || appSettings.currency;
                    } else {
                        transaction.currency = appSettings.currency;
                    }
                }
                
                // 確保有轉換金額
                if (!transaction.convertedAmount) {
                    transaction.convertedAmount = transaction.amount;
                }
            });
            
            saveData('transactions');
            
        } catch (error) {
            console.error('Error loading data:', error);
            initDefaultData();
        }
    } else {
        initDefaultData();
    }
    
    // 其他數據載入邏輯...
}

// 其他所有函數和方法...
// 這裡需要包含原始代碼中的所有其他函數

// 確保 convertCurrency 函數存在
function convertCurrency(amount, fromCurrency, toCurrency) {
    if (!appSettings.exchangeRates.enabled || !exchangeRates.rates) {
        return amount; // 如果未启用或没有汇率数据，直接返回原金额
    }
    
    // 如果货币相同，无需转换
    if (fromCurrency === toCurrency) {
        return amount;
    }
    
    // 获取汇率
    const baseRate = exchangeRates.base; // 基准货币
    
    // 如果基准货币就是 fromCurrency，直接使用 toCurrency 的汇率
    if (baseRate === fromCurrency) {
        const rate = exchangeRates.rates[toCurrency];
        return rate ? amount * rate : amount;
    }
    
    // 如果基准货币就是 toCurrency，使用 fromCurrency 的汇率倒数
    if (baseRate === toCurrency) {
        const rate = exchangeRates.rates[fromCurrency];
        return rate ? amount / rate : amount;
    }
    
    // 否则，先转换为基准货币，再转换为目标货币
    const fromRate = exchangeRates.rates[fromCurrency];
    const toRate = exchangeRates.rates[toCurrency];
    
    if (!fromRate || !toRate) {
        return amount; // 如果缺少汇率，返回原金额
    }
    
    // 先转换为基准货币，再转换为目标货币
    const amountInBase = amount / fromRate;
    return amountInBase * toRate;
}

// 匯率頁面更新函數
function updateExchangeRatesContent() {
    const baseCurrencySelect = document.getElementById('pageBaseCurrencySelect');
    const fromCurrencySelect = document.getElementById('pageFromCurrency');
    const toCurrencySelect = document.getElementById('pageToCurrency');
    const fromAmountInput = document.getElementById('pageFromAmount');
    const toAmountInput = document.getElementById('pageToAmount');
    const lastUpdatedInfo = document.getElementById('pageLastUpdatedInfo');
    const statusElement = document.getElementById('exchangeRatePageStatus');
    
    if (!baseCurrencySelect || !statusElement) return; // 安全检查
    
    // 檢查匯率數據
    if (!exchangeRates.rates || Object.keys(exchangeRates.rates).length === 0) {
        statusElement.className = 'sync-status error';
        statusElement.innerHTML = '<i class="fas fa-exclamation-circle"></i><span>尚無匯率數據，請在設定中更新匯率</span>';
        return;
    }
    
    // 更新狀態
    statusElement.className = 'sync-status success';
    statusElement.innerHTML = '<i class="fas fa-check-circle"></i><span>匯率數據已載入</span>';
    
    // 填充貨幣選擇器
    const currencies = Object.keys(exchangeRates.rates);
    currencies.sort(); // 按字母排序
    
    // 添加基準貨幣
    currencies.unshift(exchangeRates.base);
    
    // 清空現有選項
    baseCurrencySelect.innerHTML = '';
    fromCurrencySelect.innerHTML = '';
    toCurrencySelect.innerHTML = '';
    
    // 添加貨幣選項
    currencies.forEach(currency => {
        const optionBase = document.createElement('option');
        optionBase.value = currency;
        optionBase.textContent = currency;
        if (currency === appSettings.currency) {
            optionBase.selected = true;
        }
        baseCurrencySelect.appendChild(optionBase);
        
        const optionFrom = document.createElement('option');
        optionFrom.value = currency;
        optionFrom.textContent = currency;
        if (currency === appSettings.currency) {
            optionFrom.selected = true;
        }
        fromCurrencySelect.appendChild(optionFrom);
        
        const optionTo = document.createElement('option');
        optionTo.value = currency;
        optionTo.textContent = currency;
        toCurrencySelect.appendChild(optionTo);
    });
    
    // 設置默認目標貨幣為美元或第一個非基準貨幣
    if (currencies.includes('USD') && exchangeRates.base !== 'USD') {
        toCurrencySelect.value = 'USD';
    } else if (currencies.length > 1) {
        toCurrencySelect.value = currencies.find(c => c !== exchangeRates.base) || currencies[0];
    }
    
    // 更新匯率卡片
    updatePageExchangeRateCards(exchangeRates.base);
    
    // 更新計算器初始值
    updatePageCurrencyCalculator();
    
    // 更新最後更新時間
    if (exchangeRates.lastUpdated) {
        const lastUpdate = new Date(exchangeRates.lastUpdated);
        lastUpdatedInfo.textContent = `匯率更新時間: ${lastUpdate.toLocaleString()}`;
    } else {
        lastUpdatedInfo.textContent = '匯率尚未更新';
    }
    
    // 添加事件監聽器
    baseCurrencySelect.addEventListener('change', function() {
        updatePageExchangeRateCards(this.value);
    });
    
    fromCurrencySelect.addEventListener('change', updatePageCurrencyCalculator);
    toCurrencySelect.addEventListener('change', updatePageCurrencyCalculator);
    fromAmountInput.addEventListener('input', updatePageCurrencyCalculator);
    
    // 添加更新按鈕事件
    document.getElementById('pageUpdateRatesBtn').addEventListener('click', function() {
        updateExchangeRates();
        setTimeout(() => {
            updateExchangeRatesContent();
        }, 1000);
    });
}

// 這裡需要包含其餘所有必要的函數...

// 匯率頁面的其他必要函數
function updatePageExchangeRateCards(baseCurrency) {
    // 實現詳細內容...
}

function updatePageCurrencyCalculator() {
    // 實現詳細內容...
}

function updateExchangeRates() {
    // 實現詳細內容...
}

// 初始化匯率資料
function initExchangeRates() {
    // 實現詳細內容...
}

// 顯示通知訊息
function notify(icon, title, message) {
    // 實現詳細內容...
}