// 修改 Google API 配置，適應 GitHub Pages

const GOOGLE_API_CONFIG = {
    apiKey: 'AIzaSyB6Q_qkp0PowjLYXM2hGPwYGXm7RTOgPBQ',
    clientId: '75969942287-bkhslov3f4mi6q8lao4ud19bnid9p14e.apps.googleusercontent.com',
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
let tokenClient; // 用於 OAuth 驗證

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
let tabButtons;
let tabContents;
let newAccountModal;
let newCategoryModal;
let importExportModal;
let settingsModal;
let receiptViewModal;
let dailySummaryModal;
let notification;
let syncReminder;
let searchLoadingIndicator;

document.addEventListener('DOMContentLoaded', function() {
    // 初始化DOM元素引用
    tabButtons = document.querySelectorAll('.tab-btn');
    tabContents = document.querySelectorAll('.tab-content');
    newAccountModal = document.getElementById('newAccountModal');
    newCategoryModal = document.getElementById('newCategoryModal');
    importExportModal = document.getElementById('importExportModal');
    settingsModal = document.getElementById('settingsModal');
    receiptViewModal = document.getElementById('receiptViewModal');
    dailySummaryModal = document.getElementById('dailySummaryModal');
    notification = document.getElementById('notification');
    syncReminder = document.getElementById('syncReminder');
    searchLoadingIndicator = document.getElementById('searchLoadingIndicator');
    
    // Initialize the app
    initApp();
    
    // Setup event listeners
    setupEventListeners();
    
    // Check for dark mode
    applyTheme();
    
    /*// Initialize Google API
    initGoogleApi();*/
    
    // 初始化 Google API (使用延遲確保頁面完全載入)
    setTimeout(initGoogleApi, 500);
});

// Debounce function for performance optimization
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// Initialize the app
function initApp() {
    // Load data from localStorage if available
    loadData();
    
    // 增加汇率初始化
    initExchangeRates();
    
    // Set default transaction date
    const transactionDateInput = document.getElementById('transactionDate');
    if (transactionDateInput) {
        transactionDateInput.value = getTodayFormatted();
    }
    
    const summaryDateInput = document.getElementById('summaryDate');
    if (summaryDateInput) {
        summaryDateInput.value = getTodayFormatted();
    }
    
    // Set default search dates (1 month range)
    const searchStartDateInput = document.getElementById('searchStartDate');
    const searchEndDateInput = document.getElementById('searchEndDate');
    
    if (searchStartDateInput && searchEndDateInput) {
        const today = new Date();
        const monthAgo = new Date();
        monthAgo.setMonth(today.getMonth() - 1);
        
        searchStartDateInput.value = formatDateForInput(monthAgo);
        searchEndDateInput.value = formatDateForInput(today);
    }
    
    // Update currency display
    updateCurrencyDisplay();
    
    // Initialize UI elements
    updateUI();
    
    // Setup budget reset day options
    updateBudgetResetDayOptions();
    
    // Initialize account icons
    initAccountIcons();
    
    // Initialize receipt upload listener
    initReceiptUpload();
    
    // Apply virtualization settings
    applyVirtualizationSettings();
    
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
    
    // 初始化時搜尋交易
    if (document.getElementById('searchBtn')) {
        searchTransactions();
    }
    
    // 生成財務建議
    generateFinancialAdvice();
}

function initGoogleApi() {
    console.log('開始初始化 Google API...');
    
    // 檢查 google 對象是否已載入
    if (typeof google === 'undefined') {
        console.log('Google API 尚未載入，正在嘗試動態載入...');
        
        // 動態載入 Google Identity Services
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = function() {
            console.log('Google API 已動態載入，正在初始化...');
            initGoogleApiAfterLoad();
        };
        script.onerror = function(error) {
            console.error('載入 Google API 失敗:', error);
            updateGoogleSigninStatus('error', '無法載入 Google API，請確保您的網絡連接正常');
            
            // 啟用重試按鈕
            const googleSignInBtn = document.getElementById('googleSignInBtn');
            if (googleSignInBtn) {
                googleSignInBtn.disabled = false;
                googleSignInBtn.innerHTML = '<i class="fas fa-sync mr-2"></i> 重試載入';
            }
        };
        
        document.head.appendChild(script);
        
        // 更新按鈕狀態
        const googleSignInBtn = document.getElementById('googleSignInBtn');
        if (googleSignInBtn) {
            googleSignInBtn.disabled = true;
            googleSignInBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> 載入中...';
        }
        
        updateGoogleSigninStatus('pending', 'Google API 正在載入...');
        return;
    }
    
    // Google API 已載入，直接進行初始化
    initGoogleApiAfterLoad();
}

// 在 Google API 載入後進行初始化
function initGoogleApiAfterLoad() {
    // 重置按鈕狀態和顯示加載中
    const googleSignInBtn = document.getElementById('googleSignInBtn');
    if (!googleSignInBtn) {
        console.log('Google sign in button not found');
        return; // 安全檢查
    }
    
    googleSignInBtn.disabled = true;
    googleSignInBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> 載入中...';
    updateGoogleSigninStatus('pending', 'Google API 正在初始化...');
    
    try {
        // 使用新版 Google Identity Services
        google.accounts.id.initialize({
            client_id: GOOGLE_API_CONFIG.clientId,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
            // 重要：添加這些參數解決第三方 Cookie 問題
            use_third_party_cookies: false,
            itp_support: true
        });
        
        // 初始化 Google API 客戶端
        initGapiClient().then(() => {
            console.log('Google API 客戶端初始化成功');
        }).catch(error => {
            console.error('Google API 客戶端初始化失敗:', error);
        });
        
        // 啟用登入按鈕
        googleSignInBtn.disabled = false;
        googleSignInBtn.innerHTML = '<svg class="google-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg> 使用 Google 帳戶登入';
        
        // 標記為已初始化
        googleApiInitialized = true;
        
        console.log('Google Identity Services 初始化成功');
        updateGoogleSigninStatus('success', 'Google API 已準備就緒，請登入');
    } catch (error) {
        console.error('Google API 初始化錯誤:', error);
        updateGoogleSigninStatus('error', `初始化失敗: ${error.message || '未知錯誤'}`);
        googleSignInBtn.disabled = false;
        googleSignInBtn.innerHTML = '<i class="fas fa-sync mr-2"></i> 重試載入';
    }
}

function initGapiClient() {
    console.log('初始化 gapi client...');
    return new Promise((resolve, reject) => {
        gapi.load('client', async () => {
            try {
                await gapi.client.init({
                    apiKey: GOOGLE_API_CONFIG.apiKey,
                    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
                });
                
                console.log('gapi.client 已初始化');
                
                // 初始化 tokenClient
                if (google.accounts && google.accounts.oauth2) {
                    tokenClient = google.accounts.oauth2.initTokenClient({
                        client_id: GOOGLE_API_CONFIG.clientId,
                        scope: 'https://www.googleapis.com/auth/drive.file',
                        callback: (tokenResponse) => {
                            if (tokenResponse && tokenResponse.access_token) {
                                console.log('獲取到 access token');
                                
                                // 確保 googleUser 對象已存在
                                if (googleUser) {
                                    googleUser.accessToken = tokenResponse.access_token;
                                }
                                
                                gapi.client.setToken({access_token: tokenResponse.access_token});
                            }
                        }
                    });
                    console.log('tokenClient 已初始化');
                } else {
                    console.warn('google.accounts.oauth2 不可用，部分功能可能受限');
                }
                
                resolve();
            } catch (error) {
                console.error('gapi client 初始化失敗:', error);
                reject(error);
            }
        });
    });
}

function requestDriveAccess() {
    if (!tokenClient) {
        console.error('Token client not initialized');
        notify('❌', '存取錯誤', 'Google API 未完全初始化，請重新載入頁面');
        return Promise.reject('Token client not initialized');
    }
    
    return new Promise((resolve) => {
        // 請求用戶授權
        tokenClient.requestAccessToken({prompt: 'consent'});
        // tokenClient 的 callback 會在獲取 token 後被調用
        
        // 由於 callback 是非同步的，我們不能等待它
        // 但我們可以立即 resolve 以繼續流程
        resolve();
    });
}

function loadGapiAndAuthorize() {
    return new Promise((resolve, reject) => {
        console.log('準備載入 Drive API...');
        
        // 動態載入 gapi 腳本
        if (!window.gapi) {
            console.log('載入 gapi 腳本...');
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = function() {
                console.log('gapi 腳本已載入，初始化 client');
                initializeGapiClient().then(resolve).catch(reject);
            };
            script.onerror = function(err) {
                console.error('載入 gapi 腳本失敗:', err);
                notify('❌', 'API 載入失敗', '無法載入 Google API 客戶端庫');
                reject(err);
            };
            document.head.appendChild(script);
        } else if (!window.gapi.client) {
            console.log('gapi 已載入，初始化客戶端...');
            initializeGapiClient().then(resolve).catch(reject);
        } else {
            console.log('gapi 客戶端已初始化，檢查 Drive API...');
            if (!gapi.client.drive) {
                console.log('需要載入 Drive API...');
                gapi.client.load('drive', 'v3')
                    .then(function() {
                        console.log('Drive API 已載入');
                        // 確保設置訪問令牌
                        if (googleUser && googleUser.accessToken) {
                            gapi.client.setToken({
                                access_token: googleUser.accessToken
                            });
                        }
                        resolve();
                    })
                    .catch(function(err) {
                        console.error('載入 Drive API 失敗:', err);
                        reject(err);
                    });
            } else {
                console.log('Drive API 已載入');
                resolve();
            }
        }
    });
}

async function initializeGapiClient() {
    console.log('初始化 gapi 客戶端...');
    
    try {
        await new Promise((resolve, reject) => {
            gapi.load('client', {
                callback: resolve,
                onerror: reject,
                timeout: 10000,
                ontimeout: reject
            });
        });
        
        console.log('gapi client 已載入，初始化配置...');
        
        await gapi.client.init({
            apiKey: GOOGLE_API_CONFIG.apiKey,
            clientId: GOOGLE_API_CONFIG.clientId,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
            scope: 'https://www.googleapis.com/auth/drive.file'
        });
        
        console.log('gapi 客戶端已初始化，載入 Drive API...');
        
        await gapi.client.load('drive', 'v3');
        
        console.log('Drive API 已載入');
        
        // 如果用戶已登入，設置令牌
        if (googleUser && googleUser.accessToken) {
            gapi.client.setToken({
                access_token: googleUser.accessToken
            });
            console.log('已設置訪問令牌');
        }
        
    } catch (error) {
        console.error('初始化 gapi 客戶端失敗:', error);
        notify('❌', 'API 初始化失敗', '無法初始化 Google Drive API');
    }
}

function handleCredentialResponse(response) {
    if (!response.credential) {
        console.error('登入未返回憑證');
        notify('❌', '登入失敗', '無法獲取 Google 帳戶資訊');
        return;
    }
    
    console.log('收到登入憑證，正在處理...');
    
    // 解析 JWT 令牌
    const payload = parseJwt(response.credential);
    
    // 設置用戶資訊
    googleUser = {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        idToken: response.credential,
        accessToken: null // 暫時設為 null，後續會通過 tokenClient 獲取
    };
    
    console.log('用戶資訊已設置:', googleUser.name);
    
    // 更新 UI
    updateGoogleSigninUI(true);
    notify('✅', '登入成功', `已成功登入 Google 帳戶: ${googleUser.name}`);
    
    // 如果 tokenClient 已初始化，可以嘗試預先獲取 drive 權限
    if (tokenClient) {
        console.log('嘗試獲取 Drive API 存取權...');
        // 注意：這僅是預先請求，不會立即觸發 - 會在用戶下一次操作時生效
        requestDriveAccess().catch(err => {
            console.warn('預先獲取 Drive 權限未成功，將在用戶操作時請求', err);
        });
    }
}

// 2. 在 handleCredentialResponse 函數後添加這些新函數
function updateGoogleSigninUI(isSignedIn) {
    const googleAuthStatus = document.getElementById('googleAuthStatus');
    const googleUserName = document.getElementById('googleUserName');
    const googleSignInBtn = document.getElementById('googleSignInBtn');
    const googleSignOutBtn = document.getElementById('googleSignOutBtn');
    const googleDriveActions = document.getElementById('googleDriveActions');
    
    if (isSignedIn) {
        if (googleAuthStatus) googleAuthStatus.style.display = 'flex';
        if (googleUserName) googleUserName.textContent = googleUser.name;
        if (googleSignInBtn) googleSignInBtn.style.display = 'none';
        if (googleSignOutBtn) googleSignOutBtn.style.display = 'block';
        if (googleDriveActions) googleDriveActions.style.display = 'block';
        
        updateGoogleSigninStatus('success', `已登入為 ${googleUser.name}`);
    } else {
        if (googleAuthStatus) googleAuthStatus.style.display = 'none';
        if (googleSignInBtn) googleSignInBtn.style.display = 'block';
        if (googleSignOutBtn) googleSignOutBtn.style.display = 'none';
        if (googleDriveActions) googleDriveActions.style.display = 'none';
        
        updateGoogleSigninStatus('pending', '尚未登入 Google 帳戶');
    }
}

// 3. 在 updateGoogleSigninUI 函數後添加這個新函數
async function exchangeIDTokenForAccessToken(idToken) {
    // 這通常需要一個後端服務來安全地執行
    // 由於我們無法直接從前端執行此操作，這裡提供兩種替代方案
    
    // 方案 1：假設您有一個後端 API 端點可以執行此交換
    // 實際使用時取消註釋這段代碼
    /*
    try {
        const response = await fetch('/api/google/exchange-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken })
        });
        
        if (!response.ok) {
            throw new Error('Token exchange failed');
        }
        
        const data = await response.json();
        return data.accessToken;
    } catch (error) {
        console.error('Token exchange error:', error);
        throw error;
    }
    */
    
    // 方案 2：暫時使用 ID 令牌作為有限的替代方案（不推薦用於生產環境）
    // 某些 Google API 可能接受 ID 令牌，但有限制
    console.warn('警告：使用 ID 令牌代替訪問令牌 - 僅用於測試');
    return idToken;
}

// 4. 在 exchangeIDTokenForAccessToken 函數後添加這個函數
// 如果已有 parseJwt 函數，則不需要添加此函數
function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    return JSON.parse(jsonPayload);
}

// 載入 Google Drive API
function loadGoogleDriveAPI() {
    // 檢查是否已載入
    if (window.gapi && window.gapi.client && window.gapi.client.drive) {
        console.log('Google Drive API 已載入');
        return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
        // 動態載入 gapi 腳本
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
            console.log('gapi 已載入，初始化 client');
            
            gapi.load('client', () => {
                gapi.client.init({
                    apiKey: GOOGLE_API_CONFIG.apiKey,
                    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
                })
                .then(() => {
                    console.log('Google Drive API 初始化成功');
                    resolve();
                })
                .catch(error => {
                    console.error('Google Drive API 初始化失敗:', error);
                    reject(error);
                });
            });
        };
        script.onerror = (error) => {
            console.error('載入 gapi 失敗:', error);
            reject(new Error('無法載入 Google API Client'));
        };
        
        document.head.appendChild(script);
    });
}

    
    // 嘗試初始化的函數
    /*function attemptInitialization() {
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
    }*/
    
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
    //attemptInitialization();


// Update sign-in status
function updateSignInStatus(isSignedIn) {
    if (isSignedIn) {
        const user = gapi.auth2.getAuthInstance().currentUser.get();
        const profile = user.getBasicProfile();
        googleUser = {
            id: profile.getId(),
            name: profile.getName(),
            email: profile.getEmail()
        };
        
        // Update UI
        const googleAuthStatus = document.getElementById('googleAuthStatus');
        const googleUserName = document.getElementById('googleUserName');
        const googleSignInBtn = document.getElementById('googleSignInBtn');
        const googleSignOutBtn = document.getElementById('googleSignOutBtn');
        const googleDriveActions = document.getElementById('googleDriveActions');
        
        if (googleAuthStatus) googleAuthStatus.style.display = 'flex';
        if (googleUserName) googleUserName.textContent = googleUser.name;
        if (googleSignInBtn) googleSignInBtn.style.display = 'none';
        if (googleSignOutBtn) googleSignOutBtn.style.display = 'block';
        if (googleDriveActions) googleDriveActions.style.display = 'block';
        
        updateGoogleSigninStatus('success', `已登入為 ${googleUser.name}`);
    } else {
        googleUser = null;
        
        // Update UI
        const googleAuthStatus = document.getElementById('googleAuthStatus');
        const googleSignInBtn = document.getElementById('googleSignInBtn');
        const googleSignOutBtn = document.getElementById('googleSignOutBtn');
        const googleDriveActions = document.getElementById('googleDriveActions');
        
        if (googleAuthStatus) googleAuthStatus.style.display = 'none';
        if (googleSignInBtn) googleSignInBtn.style.display = 'block';
        if (googleSignOutBtn) googleSignOutBtn.style.display = 'none';
        if (googleDriveActions) googleDriveActions.style.display = 'none';
        
        updateGoogleSigninStatus('pending', '尚未登入 Google 帳戶');
    }
}

// Sign in to Google
function signInToGoogle() {
    if (!googleApiInitialized) {
        notify('❌', 'Google API 尚未初始化', '請稍後再試');
        return;
    }
    
    gapi.auth2.getAuthInstance().signIn().catch(error => {
        console.error('Google Sign-in error:', error);
        notify('❌', '登入失敗', '無法登入到 Google 帳戶');
    });
}

// 替換現有的 signOutFromGoogle 函數
function signOutFromGoogle() {
    // 使用新 API 方式登出
    google.accounts.id.disableAutoSelect();
    
    // 清除 gapi 的授權
    if (window.gapi && window.gapi.client) {
        gapi.client.setToken(null);
    }
    
    // 清除用戶資訊
    googleUser = null;
    
    // 更新 UI
    updateGoogleSigninUI(false);
    
    notify('✅', '已登出', '已成功登出 Google 帳戶');
}

// Update Google signin status in the import/export modal
function updateGoogleSigninStatus(type, message) {
    const statusElement = document.getElementById('googleSigninStatus');
    if (!statusElement) return;
    
    statusElement.style.display = 'flex';
    statusElement.className = `sync-status ${type}`;
    
    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-times-circle';
    
    statusElement.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
}

function saveToGoogleDrive() {
    console.log('開始保存到 Google Drive...');
    
    if (!googleUser) {
        notify('❌', '尚未登入', '請先登入 Google 帳戶');
        return;
    }
    
    updateGoogleSigninStatus('pending', '正在保存到 Google Drive...');
    
    // 如果沒有訪問令牌，先請求權限
    if (!googleUser.accessToken) {
        console.log('嘗試獲取 Google Drive 存取權限...');
        
        if (!tokenClient) {
            updateGoogleSigninStatus('error', 'Google API 未完全初始化，請重新載入頁面');
            notify('❌', '同步失敗', 'Google API 未完全初始化');
            return;
        }
        
        // 請求權限並繼續上傳
        requestDriveAccess()
            .then(() => {
                // 給 Google OAuth 流程一點時間來設置 token
                setTimeout(() => {
                    if (googleUser.accessToken) {
                        // 嘗試上傳
                        performDriveUpload();
                    } else {
                        updateGoogleSigninStatus('error', '無法獲取 Google Drive 存取權限');
                        notify('❌', '同步失敗', '無法獲取 Google Drive 存取權限');
                    }
                }, 1000);
            })
            .catch(error => {
                console.error('獲取 Drive 權限錯誤:', error);
                updateGoogleSigninStatus('error', '無法獲取 Google Drive 權限');
                notify('❌', '同步失敗', '無法獲取 Google Drive 權限');
            });
    } else {
        // 已有訪問令牌，直接上傳
        performDriveUpload();
    }
    
    // 實際執行上傳的函數
    function performDriveUpload() {
        directUploadToDrive()
            .then(fileId => {
                // 保存成功
                appSettings.googleSync = appSettings.googleSync || {};
                appSettings.googleSync.fileId = fileId;
                appSettings.googleSync.lastSync = new Date().toISOString();
                saveData('appSettings');
                
                updateGoogleSigninStatus('success', '數據已成功保存到 Google Drive');
                notify('✅', '同步成功', '數據已成功保存到 Google Drive');
            })
            .catch(error => {
                console.error('Google Drive 上傳錯誤:', error);
                
                // 分析錯誤類型
                let errorMessage = '無法上傳到 Google Drive';
                if (error.message) {
                    if (error.message.includes('token')) {
                        errorMessage = 'Google 認證已過期，請重新登入';
                    } else if (error.message.includes('資料夾')) {
                        errorMessage = '無法存取 Google Drive 資料夾';
                    }
                }
                
                updateGoogleSigninStatus('error', `上傳失敗: ${error.message || '未知錯誤'}`);
                notify('❌', '同步失敗', errorMessage);
            });
    }
}

async function directUploadToDrive() {
    console.log('使用直接上傳方法...');
    
    if (!googleUser) {
        throw new Error('未登入 Google 帳戶');
    }
    
    if (!googleUser.accessToken) {
        throw new Error('缺少訪問令牌，請先授權存取 Google Drive');
    }
    
    const accessToken = googleUser.accessToken;
    const folderName = GOOGLE_API_CONFIG.appFolderName || '進階財務追蹤器';
    const fileName = GOOGLE_API_CONFIG.dataFileName || 'finance_data.json';
    
    console.log(`準備上傳到資料夾 "${folderName}", 文件名: "${fileName}"`);
    
    // 第 1 步: 查找或創建資料夾
    console.log('嘗試查找應用程式資料夾...');
    
    let folderId;
    try {
        const folderResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (!folderResponse.ok) {
            const errorData = await folderResponse.json();
            console.error('資料夾查詢請求失敗:', errorData);
            throw new Error(`搜索資料夾失敗: ${errorData.error?.message || folderResponse.statusText}`);
        }
        
        const folderData = await folderResponse.json();
        console.log('資料夾搜索結果:', folderData);
        
        if (folderData.files && folderData.files.length > 0) {
            folderId = folderData.files[0].id;
            console.log('找到現有資料夾, ID:', folderId);
        } else {
            console.log('資料夾不存在，創建新資料夾...');
            
            const createResponse = await fetch(
                'https://www.googleapis.com/drive/v3/files',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: folderName,
                        mimeType: 'application/vnd.google-apps.folder'
                    })
                }
            );
            
            if (!createResponse.ok) {
                const errorData = await createResponse.json();
                console.error('創建資料夾請求失敗:', errorData);
                throw new Error(`創建資料夾失敗: ${errorData.error?.message || createResponse.statusText}`);
            }
            
            const newFolder = await createResponse.json();
            folderId = newFolder.id;
            console.log('已創建新資料夾, ID:', folderId);
        }
    } catch (error) {
        console.error('處理資料夾時出錯:', error);
        throw new Error(`處理資料夾時出錯: ${error.message}`);
    }
    
    // 第 2 步: 準備上傳數據
    console.log('準備數據和元數據...');
    
    const data = exportData();
    let fileId = appSettings.googleSync?.fileId;
    
    // 第 3 步: 上傳或更新檔案
    try {
        if (fileId) {
            // 嘗試更新現有檔案
            console.log('嘗試更新現有檔案 ID:', fileId);
            
            // 先檢查檔案是否存在
            try {
                const checkResponse = await fetch(
                    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name`,
                    {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`
                        }
                    }
                );
                
                if (!checkResponse.ok) {
                    console.log('檔案不存在或無法訪問，將創建新檔案');
                    fileId = null; // 重置 fileId 以創建新檔案
                }
            } catch (error) {
                console.warn('檢查檔案時出錯，將創建新檔案:', error);
                fileId = null; // 重置 fileId 以創建新檔案
            }
        }
        
        if (fileId) {
            // 更新現有檔案
            console.log('更新檔案內容...');
            
            // 使用 Blob 和 FormData 進行更可靠的上傳
            const blob = new Blob([data], {type: 'application/json'});
            const formData = new FormData();
            formData.append('metadata', new Blob([JSON.stringify({
                name: fileName,
                mimeType: 'application/json'
            })], {type: 'application/json'}));
            formData.append('file', blob);
            
            const updateResponse = await fetch(
                `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    },
                    body: formData
                }
            );
            
            if (!updateResponse.ok) {
                const errorData = await updateResponse.json();
                console.error('更新檔案請求失敗:', errorData);
                throw new Error(`更新檔案失敗: ${errorData.error?.message || updateResponse.statusText}`);
            }
            
            console.log('檔案已成功更新');
            return fileId; // 返回現有檔案的 ID
            
        } else {
            // 創建新檔案
            console.log('創建新檔案...');
            
            // 使用 Blob 和 FormData 進行更可靠的上傳
            const blob = new Blob([data], {type: 'application/json'});
            const formData = new FormData();
            formData.append('metadata', new Blob([JSON.stringify({
                name: fileName,
                mimeType: 'application/json',
                parents: [folderId]
            })], {type: 'application/json'}));
            formData.append('file', blob);
            
            const createResponse = await fetch(
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    },
                    body: formData
                }
            );
            
            if (!createResponse.ok) {
                let errorMessage;
                try {
                    const errorData = await createResponse.json();
                    console.error('創建檔案請求失敗:', errorData);
                    errorMessage = errorData.error?.message || createResponse.statusText;
                } catch (e) {
                    errorMessage = `狀態碼: ${createResponse.status}`;
                }
                throw new Error(`創建檔案失敗: ${errorMessage}`);
            }
            
            const newFile = await createResponse.json();
            console.log('新檔案已創建, ID:', newFile.id);
            return newFile.id; // 返回新檔案的 ID
        }
    } catch (error) {
        console.error('上傳檔案時出錯:', error);
        throw new Error(`上傳檔案時出錯: ${error.message}`);
    }
}

// 檢查 Google API 設置
function checkGoogleApiSettings() {
    if (!googleUser) return;
    
    // 檢查訪問令牌
    if (!googleUser.accessToken) {
        console.warn('沒有有效的訪問令牌，Drive API 可能無法正常工作');
        notify('⚠️', 'API 設置問題', '您的 Google 訪問令牌可能無效，請嘗試重新登入');
        return;
    }
    
    // 檢查 API 密鑰設置
    if (!GOOGLE_API_CONFIG.apiKey) {
        console.warn('未設置 API 密鑰，某些 API 功能可能受限');
        notify('⚠️', 'API 設置問題', '未設置 API 密鑰，請在配置中添加有效的 Google API 密鑰');
    }
    
    console.log('正在檢查 Google API 設置...');
    
    // 嘗試一個簡單的 Drive API 操作來測試權限
    fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
        headers: {
            'Authorization': `Bearer ${googleUser.accessToken}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`API 調用失敗: ${response.status}`);
        }
        return response.json();
    })
    .then(() => {
        console.log('Drive API 權限檢查通過');
    })
    .catch(error => {
        console.error('Drive API 權限檢查失敗:', error);
        
        // 顯示更詳細的配置提示
        notify('ℹ️', 'Drive API 設置說明', '請確保您已在 Google Cloud Console 中啟用 Drive API 並設置了正確的權限', 10000);
        
        // 在控制台輸出詳細指引
        console.info(`
=== Google API 設置檢查清單 ===
1. 訪問 https://console.cloud.google.com/
2. 選擇您的專案
3. 前往「API 和服務」>「啟用的 API 和服務」
4. 確保「Google Drive API」已啟用
5. 前往「API 和服務」>「憑證」
6. 檢查 OAuth 客戶端 ID 設置
7. 前往「API 和服務」>「OAuth 同意畫面」
8. 確保添加了以下範圍：
   - https://www.googleapis.com/auth/drive.file

如需更多幫助，請訪問: https://developers.google.com/identity/sign-in/web/
        `);
    });
}

// 2. 在 saveToGoogleDrive 函數後添加這個新函數
function saveFileToDrive() {
    console.log('開始保存到 Google Drive...');
    
    // 使用 exponential backoff 策略處理可能的網絡問題
    const maxRetries = 3;
    let retries = 0;
    
    function attemptSave() {
        // 資料夾名稱和檔案名稱
        const folderName = GOOGLE_API_CONFIG.appFolderName || '進階財務追蹤器';
        const fileName = GOOGLE_API_CONFIG.dataFileName || 'finance_data.json';
        
        // 獲取數據
        const data = exportData();
        
        // 1. 查找或創建應用程式資料夾
        findOrCreateFolder(folderName)
            .then(folderId => {
                console.log('找到/創建資料夾成功, ID:', folderId);
                
                // 2. 檢查檔案是否存在
                const existingFileId = appSettings.googleSync?.fileId;
                
                if (existingFileId) {
                    // 嘗試更新現有文件
                    updateFile(existingFileId, data)
                        .then(() => {
                            console.log('文件更新成功');
                            handleSaveSuccess();
                        })
                        .catch(error => {
                            console.warn('更新檔案失敗, 嘗試創建新檔案:', error);
                            createNewFile(folderId, fileName, data);
                        });
                } else {
                    // 創建新文件
                    createNewFile(folderId, fileName, data);
                }
            })
            .catch(error => {
                console.error('處理資料夾失敗:', error);
                
                if (retries < maxRetries) {
                    retries++;
                    const delay = Math.pow(2, retries) * 1000;
                    console.log(`重試 (${retries}/${maxRetries}) 將在 ${delay}ms 後進行...`);
                    
                    setTimeout(attemptSave, delay);
                } else {
                    updateGoogleSigninStatus('error', '無法訪問或創建 Google Drive 資料夾');
                    notify('❌', '同步失敗', '無法訪問 Google Drive');
                }
            });
    }
    
    // 處理保存成功
    function handleSaveSuccess() {
        appSettings.googleSync = appSettings.googleSync || {};
        appSettings.googleSync.lastSync = new Date().toISOString();
        saveData('appSettings');
        
        updateGoogleSigninStatus('success', '數據已成功保存到 Google Drive');
        notify('✅', '同步成功', '數據已成功保存到 Google Drive');
    }
    
    // 查找或創建資料夾
    function findOrCreateFolder(folderName) {
        return new Promise((resolve, reject) => {
            // 搜索現有資料夾
            gapi.client.drive.files.list({
                q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                spaces: 'drive',
                fields: 'files(id, name)'
            }).then(response => {
                const folders = response.result.files;
                
                if (folders && folders.length > 0) {
                    // 使用現有資料夾
                    resolve(folders[0].id);
                } else {
                    // 創建新資料夾
                    gapi.client.drive.files.create({
                        resource: {
                            name: folderName,
                            mimeType: 'application/vnd.google-apps.folder'
                        },
                        fields: 'id'
                    }).then(response => {
                        resolve(response.result.id);
                    }).catch(error => {
                        console.error('創建資料夾失敗:', error);
                        reject(error);
                    });
                }
            }).catch(error => {
                console.error('搜索資料夾失敗:', error);
                reject(error);
            });
        });
    }
    
    // 更新檔案
    function updateFile(fileId, data) {
        return new Promise((resolve, reject) => {
            // 先檢查檔案是否存在
            gapi.client.drive.files.get({
                fileId: fileId,
                fields: 'id, name'
            }).then(() => {
                // 檔案存在，更新內容
                const metadata = {
                    mimeType: 'application/json'
                };
                
                const blob = new Blob([data], {type: 'application/json'});
                const form = new FormData();
                form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
                form.append('file', blob);
                
                // 使用 fetch API 更新文件
                fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
                    method: 'PATCH',
                    headers: new Headers({'Authorization': `Bearer ${googleUser.accessToken}`}),
                    body: form
                })
                .then(response => {
                    if (response.ok) {
                        resolve();
                    } else {
                        response.json().then(errorData => {
                            reject(new Error(errorData.error?.message || '更新失敗'));
                        }).catch(() => reject(new Error('更新失敗')));
                    }
                })
                .catch(error => {
                    console.error('更新檔案失敗 (fetch):', error);
                    reject(error);
                });
            }).catch(error => {
                // 檔案不存在或無法訪問
                console.error('檢查檔案時發生錯誤:', error);
                reject(error);
            });
        });
    }
    
    // 創建新檔案
    function createNewFile(folderId, fileName, data) {
        // 使用 multipart 上傳
        const metadata = {
            name: fileName,
            mimeType: 'application/json',
            parents: [folderId]
        };
        
        const blob = new Blob([data], {type: 'application/json'});
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
        form.append('file', blob);
        
        fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: new Headers({'Authorization': `Bearer ${googleUser.accessToken}`}),
            body: form
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(errorData.error?.message || '上傳失敗');
                });
            }
            return response.json();
        })
        .then(result => {
            console.log('檔案創建成功, ID:', result.id);
            
            // 保存檔案 ID
            appSettings.googleSync = appSettings.googleSync || {};
            appSettings.googleSync.fileId = result.id;
            
            handleSaveSuccess();
        })
        .catch(error => {
            console.error('創建檔案失敗:', error);
            updateGoogleSigninStatus('error', `檔案創建失敗: ${error.message || '未知錯誤'}`);
            notify('❌', '同步失敗', '無法保存到 Google Drive');
        });
    }
    
    // 開始嘗試保存
    attemptSave();
}

function loadFromGoogleDrive() {
    if (!googleUser) {
        notify('❌', '尚未登入', '請先登入 Google 帳戶');
        return;
    }
    
    if (!googleUser.accessToken) {
        if (tokenClient) {
            // 請求權限並繼續下載
            requestDriveAccess()
                .then(() => {
                    // 給 OAuth 流程一點時間設置 token
                    setTimeout(() => {
                        if (googleUser.accessToken) {
                            performDriveDownload();
                        } else {
                            updateGoogleSigninStatus('error', '無法獲取存取權限');
                            notify('❌', '同步失敗', '無法獲取 Google Drive 存取權限');
                        }
                    }, 1000);
                })
                .catch(error => {
                    console.error('獲取 Drive 權限錯誤:', error);
                    updateGoogleSigninStatus('error', '無法獲取 Google Drive 權限');
                    notify('❌', '同步失敗', '無法獲取 Google Drive 權限');
                });
            return;
        } else {
            notify('❌', '授權不足', '無法訪問 Google Drive');
            return;
        }
    }
    
    performDriveDownload();
    
    // 實際執行下載的函數
    function performDriveDownload() {
        updateGoogleSigninStatus('pending', '正在從 Google Drive 載入數據...');
        
        // 確保 gapi 已載入
        if (!window.gapi || !window.gapi.client) {
            notify('❌', 'API 未載入', '正在載入 Google API，請稍後再試');
            loadGapiAndAuthorize().then(() => {
                notify('✅', 'API 已載入', '現在可以嘗試從 Google Drive 載入');
            });
            return;
        }
        
        loadFileFromDrive()
            .then(data => {
                console.log("從 Google Drive 獲取的數據:", data.substring(0, 100) + "..."); // 只顯示開頭部分做日誌
                
                // 關鍵修改：確保正確解析 JSON 數據
                try {
                    // 嘗試解析 JSON 數據
                    const parsedData = JSON.parse(data);
                    
                    // 數據有效性檢查
                    if (!parsedData || typeof parsedData !== 'object') {
                        throw new Error('下載的數據格式不正確');
                    }
                    
                    // 使用匯入函數處理數據
                    const importSuccessful = processImportedData(parsedData);
                    
                    if (importSuccessful) {
                        updateGoogleSigninStatus('success', '數據已成功從 Google Drive 載入');
                        notify('✅', '同步成功', '數據已成功從 Google Drive 載入');
                        
                        // 更新所有 UI 元素以反映新數據
                        updateUI();
                    } else {
                        updateGoogleSigninStatus('error', '載入的數據格式不正確');
                        notify('❌', '同步失敗', '無法解析 Google Drive 中的數據');
                    }
                } catch (error) {
                    console.error('解析 Google Drive 數據時出錯:', error);
                    updateGoogleSigninStatus('error', '解析數據失敗: ' + error.message);
                    notify('❌', '同步失敗', '無法解析從 Google Drive 載入的數據');
                }
            })
            .catch(error => {
                console.error('從 Google Drive 載入數據失敗:', error);
                updateGoogleSigninStatus('error', '載入失敗: ' + error.message);
                notify('❌', '同步失敗', '無法從 Google Drive 載入數據');
            });
    }
}

/**
 * 處理從 Google Drive 或匯入的數據
 * @param {Object} data - 已解析的 JSON 數據對象
 * @returns {boolean} - 匯入是否成功
 */
function processImportedData(data) {
    console.log('處理匯入的數據...');
    
    // 數據有效性檢查
    if (!data) {
        console.error('匯入數據為空');
        return false;
    }
    
    try {
        // 檢查數據格式
        let isValid = true;
        let updateCounts = {};
        
        // 匯入戶口數據
        if (Array.isArray(data.accounts)) {
            accounts = data.accounts;
            updateCounts.accounts = accounts.length;
        } else {
            console.warn('匯入數據中缺少有效的 accounts 數組');
            isValid = false;
        }
        
        // 匯入類別數據
        if (data.categories && typeof data.categories === 'object') {
            categories = data.categories;
            updateCounts.categories = {
                income: categories.income?.length || 0,
                expense: categories.expense?.length || 0
            };
        } else {
            console.warn('匯入數據中缺少有效的 categories 對象');
            isValid = false;
        }
        
        // 匯入交易數據
        if (Array.isArray(data.transactions)) {
            transactions = data.transactions;
            updateCounts.transactions = transactions.length;
        } else {
            console.warn('匯入數據中缺少有效的 transactions 數組');
            isValid = false;
        }
        
        // 匯入預算數據
        if (data.budget && typeof data.budget === 'object') {
            budget = data.budget;
            updateCounts.budget = 'updated';
        } else {
            console.warn('匯入數據中缺少有效的 budget 對象');
        }
        
        // 匯入類別預算數據
        if (Array.isArray(data.categoryBudgets)) {
            categoryBudgets = data.categoryBudgets;
            updateCounts.categoryBudgets = categoryBudgets.length;
        }
        
        // 匯入新一天狀態
        if (data.newDayStatus && typeof data.newDayStatus === 'object') {
            newDayStatus = data.newDayStatus;
        }
        
        // 匯入應用設置
        if (data.appSettings && typeof data.appSettings === 'object') {
            // 合併設置，保留當前的 Google 同步設置
            const currentGoogleSync = appSettings.googleSync || {};
            appSettings = data.appSettings;
            appSettings.googleSync = currentGoogleSync;
            updateCounts.appSettings = 'updated';
        }
        
        // 匯入匯率數據
        if (data.exchangeRates && typeof data.exchangeRates === 'object') {
            exchangeRates = data.exchangeRates;
            updateCounts.exchangeRates = 'updated';
        }
        
        // 保存所有數據到 localStorage
        saveData();
        
        // 顯示匯入信息
        console.log('數據匯入成功:', updateCounts);
        
        return isValid;
    } catch (error) {
        console.error('處理匯入數據時出錯:', error);
        return false;
    }
}

function loadFileFromDrive() {
    return new Promise((resolve, reject) => {
        // 檢查是否有保存的檔案 ID
        const fileId = appSettings.googleSync?.fileId;
        
        if (!fileId) {
            reject(new Error('尚未保存文件到 Google Drive'));
            return;
        }
        
        console.log('嘗試從 Google Drive 加載文件, ID:', fileId);
        
        // 設置訪問令牌
        gapi.client.setToken({ access_token: googleUser.accessToken });
        
        // 獲取文件內容
        gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        }).then(response => {
            // 成功獲取文件內容
            console.log('成功從 Google Drive 獲取文件');
            resolve(response.body);
        }).catch(error => {
            console.error('從 Google Drive 獲取檔案失敗:', error);
            
            // 如果找不到文件，清除保存的 ID 並嘗試搜索
            if (error.status === 404) {
                console.log('文件不存在或已被刪除，嘗試搜索...');
                
                // 清除保存的 ID
                appSettings.googleSync.fileId = null;
                saveData('appSettings');
                
                // 搜索文件
                searchForLatestFile().then(fileContent => {
                    resolve(fileContent);
                }).catch(searchError => {
                    reject(searchError);
                });
            } else {
                reject(error);
            }
        });
    });
}

// 搜索最新文件
function searchForLatestFile() {
    return new Promise((resolve, reject) => {
        const folderName = GOOGLE_API_CONFIG.appFolderName || '進階財務追蹤器';
        const fileName = GOOGLE_API_CONFIG.dataFileName || 'finance_data.json';
        
        console.log(`搜索資料夾 "${folderName}" 中的文件 "${fileName}"...`);
        
        // 先搜索資料夾
        gapi.client.drive.files.list({
            q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            spaces: 'drive',
            fields: 'files(id, name)'
        }).then(folderResponse => {
            const folders = folderResponse.result.files;
            
            if (!folders || folders.length === 0) {
                reject(new Error('在 Google Drive 中找不到應用程式資料夾'));
                return;
            }
            
            const folderId = folders[0].id;
            console.log('找到資料夾, ID:', folderId);
            
            // 然後在資料夾中搜索文件
            return gapi.client.drive.files.list({
                q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
                spaces: 'drive',
                fields: 'files(id, name, modifiedTime)',
                orderBy: 'modifiedTime desc'
            });
        }).then(fileResponse => {
            const files = fileResponse.result.files;
            
            if (!files || files.length === 0) {
                reject(new Error('在應用程式資料夾中找不到數據文件'));
                return;
            }
            
            // 使用最新的文件
            const latestFile = files[0];
            console.log('找到最新文件, ID:', latestFile.id);
            
            // 保存文件 ID
            appSettings.googleSync = appSettings.googleSync || {};
            appSettings.googleSync.fileId = latestFile.id;
            saveData('appSettings');
            
            // 獲取文件內容
            return gapi.client.drive.files.get({
                fileId: latestFile.id,
                alt: 'media'
            });
        }).then(contentResponse => {
            // 成功獲取文件內容
            resolve(contentResponse.body);
        }).catch(error => {
            console.error('搜索或獲取檔案時出錯:', error);
            reject(error);
        });
    });
}
    
    // 搜索檔案
    function searchForFile() {
        const folderName = GOOGLE_API_CONFIG.appFolderName || '進階財務追蹤器';
        const fileName = GOOGLE_API_CONFIG.dataFileName || 'finance_data.json';
        
        // 1. 先查找應用資料夾
        gapi.client.drive.files.list({
            q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            spaces: 'drive',
            fields: 'files(id, name)'
        }).then(folderResponse => {
            const folders = folderResponse.result.files;
            
            if (!folders || folders.length === 0) {
                updateGoogleSigninStatus('error', '在 Google Drive 中找不到應用程式資料夾');
                notify('ℹ️', '找不到數據', '在 Google Drive 中找不到應用程式資料夾');
                return;
            }
            
            const folderId = folders[0].id;
            
            // 2. 在資料夾中查找檔案
            gapi.client.drive.files.list({
                q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
                spaces: 'drive',
                fields: 'files(id, name, modifiedTime)'
            }).then(fileResponse => {
                const files = fileResponse.result.files;
                
                if (!files || files.length === 0) {
                    updateGoogleSigninStatus('error', '在 Google Drive 中找不到數據檔案');
                    notify('ℹ️', '找不到數據', '在 Google Drive 中找不到數據檔案');
                    return;
                }
                
                // 按修改時間排序，使用最新的檔案
                files.sort((a, b) => new Date(b.modifiedTime) - new Date(a.modifiedTime));
                const latestFile = files[0];
                
                // 保存檔案 ID
                appSettings.googleSync = appSettings.googleSync || {};
                appSettings.googleSync.fileId = latestFile.id;
                saveData('appSettings');
                
                // 獲取檔案內容
                gapi.client.drive.files.get({
                    fileId: latestFile.id,
                    alt: 'media'
                }).then(response => {
                    const data = response.body;
                    
                    // 匯入數據
                    if (importData(data)) {
                        updateGoogleSigninStatus('success', '數據已成功從 Google Drive 載入');
                        notify('✅', '同步成功', '數據已成功從 Google Drive 載入');
                    } else {
                        updateGoogleSigninStatus('error', '載入的數據格式不正確');
                        notify('❌', '同步失敗', '無法解析 Google Drive 中的數據');
                    }
                }).catch(error => {
                    console.error('獲取檔案內容失敗:', error);
                    updateGoogleSigninStatus('error', '無法讀取檔案內容');
                    notify('❌', '同步失敗', '無法讀取 Google Drive 檔案內容');
                });
            }).catch(error => {
                console.error('搜索檔案失敗:', error);
                updateGoogleSigninStatus('error', '無法搜索 Google Drive 檔案');
                notify('❌', '同步失敗', '無法在 Google Drive 中搜索檔案');
            });
        }).catch(error => {
            console.error('搜索資料夾失敗:', error);
            updateGoogleSigninStatus('error', '無法搜索 Google Drive 資料夾');
            notify('❌', '同步失敗', '無法在 Google Drive 中搜索資料夾');
        });
    }
}

// 直接上傳到 Google Drive 的新方法
async function uploadToGoogleDrive(accessToken) {
    // 準備要上傳的數據
    const data = exportData();
    const fileName = GOOGLE_API_CONFIG.dataFileName || 'finance_data.json';
    const folderName = GOOGLE_API_CONFIG.appFolderName || '進階財務追蹤器';
    
    // 使用 Fetch API 代替 gapi
    try {
        // 步驟 1: 查找或創建資料夾
        let folderId = null;
        
        // 搜索現有資料夾
        const folderSearchResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (!folderSearchResponse.ok) {
            const errorData = await folderSearchResponse.json();
            throw new Error(`搜索資料夾失敗: ${errorData.error?.message || folderSearchResponse.statusText}`);
        }
        
        const folderSearchResult = await folderSearchResponse.json();
        console.log('資料夾搜索結果:', folderSearchResult);
        
        if (folderSearchResult.files && folderSearchResult.files.length > 0) {
            // 使用現有資料夾
            folderId = folderSearchResult.files[0].id;
            console.log('找到現有資料夾, ID:', folderId);
        } else {
            // 創建新資料夾
            console.log('未找到資料夾，正在創建...');
            const createFolderResponse = await fetch(
                'https://www.googleapis.com/drive/v3/files',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: folderName,
                        mimeType: 'application/vnd.google-apps.folder'
                    })
                }
            );
            
            if (!createFolderResponse.ok) {
                const errorData = await createFolderResponse.json();
                throw new Error(`創建資料夾失敗: ${errorData.error?.message || createFolderResponse.statusText}`);
            }
            
            const folder = await createFolderResponse.json();
            folderId = folder.id;
            console.log('已創建新資料夾, ID:', folderId);
        }
        
        // 步驟 2: 查找現有文件
        let fileId = null;
        if (appSettings.googleSync && appSettings.googleSync.fileId) {
            // 檢查文件是否存在
            try {
                const fileCheckResponse = await fetch(
                    `https://www.googleapis.com/drive/v3/files/${appSettings.googleSync.fileId}?fields=id,name,trashed`,
                    {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`
                        }
                    }
                );
                
                if (fileCheckResponse.ok) {
                    const fileInfo = await fileCheckResponse.json();
                    if (!fileInfo.trashed) {
                        fileId = fileInfo.id;
                        console.log('找到現有文件, ID:', fileId);
                    }
                }
            } catch (error) {
                console.warn('檢查文件時發生錯誤, 將創建新文件:', error);
            }
        }
        
        // 步驟 3: 上傳/更新文件
        let uploadResponse;
        
        const metadata = {
            name: fileName,
            mimeType: 'application/json'
        };
        
        if (fileId) {
            // 更新現有文件
            console.log('正在更新現有文件...');
            
            // 首先更新文件元數據
            const metadataResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files/${fileId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(metadata)
                }
            );
            
            if (!metadataResponse.ok) {
                const errorData = await metadataResponse.json();
                throw new Error(`更新文件元數據失敗: ${errorData.error?.message || metadataResponse.statusText}`);
            }
            
            // 然後更新文件內容
            uploadResponse = await fetch(
                `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: data
                }
            );
            
        } else {
            // 創建新文件
            console.log('正在創建新文件...');
            
            // 如果有資料夾，放入資料夾中
            if (folderId) {
                metadata.parents = [folderId];
            }
            
            // 使用 multipart 上傳
            const boundary = '-------314159265358979323846';
            const delimiter = `\r\n--${boundary}\r\n`;
            const closeDelim = `\r\n--${boundary}--`;
            
            const multipartBody = 
                delimiter +
                'Content-Type: application/json\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                'Content-Type: application/json\r\n\r\n' +
                data +
                closeDelim;
            
            uploadResponse = await fetch(
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': `multipart/related; boundary=${boundary}`
                    },
                    body: multipartBody
                }
            );
        }
        
        if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(`上傳文件失敗: ${errorData.error?.message || uploadResponse.statusText}`);
        }
        
        const result = await uploadResponse.json();
        console.log('上傳成功, 文件 ID:', result.id);
        
        // 返回文件 ID
        return fileId || result.id;
        
    } catch (error) {
        console.error('Google Drive 操作錯誤:', error);
        throw error;
    }
}

// 尋找或創建應用程式資料夾
function findOrCreateAppFolder() {
    return new Promise((resolve, reject) => {
        // 使用 OAuth 2.0 身份驗證
        gapi.client.setToken({
            access_token: googleUser.token
        });
        
        // 搜索現有資料夾
        gapi.client.drive.files.list({
            q: `name='${GOOGLE_API_CONFIG.appFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            spaces: 'drive',
            fields: 'files(id, name)'
        }).then(response => {
            const folders = response.result.files;
            
            if (folders && folders.length > 0) {
                // 找到資料夾
                resolve(folders[0].id);
            } else {
                // 創建資料夾
                gapi.client.drive.files.create({
                    resource: {
                        name: GOOGLE_API_CONFIG.appFolderName,
                        mimeType: 'application/vnd.google-apps.folder'
                    },
                    fields: 'id'
                }).then(response => {
                    resolve(response.result.id);
                }).catch(error => {
                    reject(error);
                });
            }
        }).catch(error => {
            reject(error);
        });
    });
}

// 在 Google Drive 中創建檔案
function createDriveFile(folderId, data) {
    // 使用 OAuth 2.0 身份驗證
    gapi.client.setToken({
        access_token: googleUser.token
    });
    
    // 創建檔案 Metadata
    const metadata = {
        name: GOOGLE_API_CONFIG.dataFileName,
        mimeType: 'application/json',
        parents: [folderId]
    };
    
    // 創建多部分請求
    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";
    
    // 構建請求主體
    const contentType = 'application/json';
    let multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: ' + contentType + '\r\n\r\n' +
        data +
        close_delim;
    
    // 執行請求
    const request = gapi.client.request({
        'path': '/upload/drive/v3/files',
        'method': 'POST',
        'params': {'uploadType': 'multipart'},
        'headers': {
            'Content-Type': 'multipart/related; boundary="' + boundary + '"'
        },
        'body': multipartRequestBody
    });
    
    request.execute(function(response) {
        if (response.error) {
            console.error('創建檔案失敗:', response.error);
            updateGoogleSigninStatus('error', '創建檔案失敗');
            notify('❌', '同步失敗', '無法在 Google Drive 中創建檔案');
            return;
        }
        
        appSettings.googleSync.fileId = response.id;
        appSettings.googleSync.lastSync = new Date().toISOString();
        saveData('appSettings');
        
        updateGoogleSigninStatus('success', '數據已成功保存到 Google Drive');
        notify('✅', '同步成功', '數據已成功保存到 Google Drive');
    });
}

// 更新 Google Drive 中的檔案
function updateDriveFile(fileId, data) {
    return new Promise((resolve, reject) => {
        // 使用 OAuth 2.0 身份驗證
        gapi.client.setToken({
            access_token: googleUser.token
        });
        
        // 構建多部份請求
        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";
        
        // 構建請求主體
        const contentType = 'application/json';
        let multipartRequestBody =
            delimiter +
            'Content-Type: ' + contentType + '\r\n\r\n' +
            data +
            close_delim;
        
        // 執行請求
        const request = gapi.client.request({
            'path': '/upload/drive/v3/files/' + fileId,
            'method': 'PATCH',
            'params': {'uploadType': 'multipart'},
            'headers': {
                'Content-Type': 'multipart/related; boundary="' + boundary + '"'
            },
            'body': multipartRequestBody
        });
        
        request.execute(function(response) {
            if (response.error) {
                console.error('更新檔案失敗:', response.error);
                reject(response.error);
                return;
            }
            
            resolve(response);
        });
    });
}

// 從 Google Drive 載入數據
function loadFromGoogleDrive() {
    if (!googleUser || !googleUser.token) {
        notify('❌', '尚未登入', '請先登入 Google 帳戶');
        return;
    }
    
    updateGoogleSigninStatus('pending', '正在從 Google Drive 載入數據...');
    
    // 直接使用新方法下載
    downloadFromGoogleDrive(googleUser.token)
        .then(data => {
            // 匯入數據
            if (importData(data)) {
                updateGoogleSigninStatus('success', '數據已成功從 Google Drive 載入');
                notify('✅', '同步成功', '數據已成功從 Google Drive 載入');
            } else {
                updateGoogleSigninStatus('error', '載入的數據格式不正確');
                notify('❌', '同步失敗', '數據格式不正確或損壞');
            }
        })
        .catch(error => {
            console.error('Google Drive 下載錯誤:', error);
            updateGoogleSigninStatus('error', `下載失敗: ${error.message || '未知錯誤'}`);
            notify('❌', '同步失敗', '無法從 Google Drive 下載數據');
        });
}

// 從 Google Drive 下載的新方法
async function downloadFromGoogleDrive(accessToken) {
    const fileName = GOOGLE_API_CONFIG.dataFileName || 'finance_data.json';
    const folderName = GOOGLE_API_CONFIG.appFolderName || '進階財務追蹤器';
    
    try {
        let fileId = null;
        
        // 如果有保存的文件 ID，直接使用
        if (appSettings.googleSync && appSettings.googleSync.fileId) {
            fileId = appSettings.googleSync.fileId;
            console.log('使用保存的文件 ID:', fileId);
            
            // 嘗試直接獲取文件
            try {
                const response = await fetch(
                    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
                    {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`
                        }
                    }
                );
                
                if (response.ok) {
                    return await response.text();
                } else {
                    console.warn('無法獲取已保存的文件，嘗試搜索文件...');
                    fileId = null; // 重置 fileId，嘗試搜索
                }
            } catch (error) {
                console.warn('獲取已保存文件時發生錯誤:', error);
                fileId = null; // 重置 fileId，嘗試搜索
            }
        }
        
        // 如果沒有文件 ID 或獲取失敗，搜索文件
        if (!fileId) {
            // 搜索資料夾
            const folderSearchResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id)`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            );
            
            if (!folderSearchResponse.ok) {
                throw new Error('搜索資料夾失敗');
            }
            
            const folderData = await folderSearchResponse.json();
            
            if (!folderData.files || folderData.files.length === 0) {
                throw new Error('未找到應用程式資料夾');
            }
            
            const folderId = folderData.files[0].id;
            console.log('找到資料夾 ID:', folderId);
            
            // 搜索文件
            const fileSearchResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and '${folderId}' in parents and trashed=false&fields=files(id,modifiedTime)&orderBy=modifiedTime desc`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            );
            
            if (!fileSearchResponse.ok) {
                throw new Error('搜索文件失敗');
            }
            
            const fileData = await fileSearchResponse.json();
            
            if (!fileData.files || fileData.files.length === 0) {
                throw new Error('未找到數據文件');
            }
            
            // 使用最新修改的文件
            fileId = fileData.files[0].id;
            console.log('找到文件 ID:', fileId);
            
            // 保存文件 ID
            appSettings.googleSync = appSettings.googleSync || {};
            appSettings.googleSync.fileId = fileId;
            saveData('appSettings');
        }
        
        // 獲取文件內容
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );
        
        if (!response.ok) {
            throw new Error(`獲取文件失敗: ${response.statusText}`);
        }
        
        return await response.text();
        
    } catch (error) {
        console.error('下載 Google Drive 數據失敗:', error);
        throw error;
    }
}

// 獲取有效的訪問令牌
function getAccessToken() {
    return new Promise((resolve, reject) => {
        if (!googleUser || !googleUser.token) {
            reject(new Error('尚未登入 Google 帳戶'));
            return;
        }
        
        // 使用當前的 ID 令牌
        resolve(googleUser.token);
    });
}

// 在 Google Drive 中尋找檔案
function findFileInDrive() {
    findOrCreateAppFolder().then(folderId => {
        gapi.client.drive.files.list({
            q: `name='${GOOGLE_API_CONFIG.dataFileName}' and '${folderId}' in parents and trashed=false`,
            spaces: 'drive',
            fields: 'files(id, name, modifiedTime)'
        }).then(response => {
            const files = response.result.files;
            
            if (files && files.length > 0) {
                // 按修改時間排序（最新優先）
                files.sort((a, b) => new Date(b.modifiedTime) - new Date(a.modifiedTime));
                
                // 獲取最新檔案
                const fileId = files[0].id;
                appSettings.googleSync.fileId = fileId;
                saveData('appSettings');
                
                // 載入檔案
                gapi.client.drive.files.get({
                    fileId: fileId,
                    alt: 'media'
                }).then(response => {
                    const data = response.body;
                    
                    // 匯入數據
                    if (importData(data)) {
                        updateGoogleSigninStatus('success', '數據已成功從 Google Drive 載入');
                        notify('✅', '同步成功', '數據已成功從 Google Drive 載入');
                    } else {
                        updateGoogleSigninStatus('error', '載入的數據格式不正確');
                    }
                }).catch(error => {
                    console.error('載入檔案失敗:', error);
                    updateGoogleSigninStatus('error', '無法載入檔案');
                    notify('❌', '同步失敗', '無法載入 Google Drive 檔案');
                });
            } else {
                updateGoogleSigninStatus('error', '在 Google Drive 中找不到數據檔案');
                notify('ℹ️', '找不到數據', '在 Google Drive 中找不到數據檔案');
            }
        }).catch(error => {
            console.error('列出檔案失敗:', error);
            updateGoogleSigninStatus('error', '無法列出 Google Drive 檔案');
            notify('❌', '同步失敗', '無法列出 Google Drive 檔案');
        });
    }).catch(error => {
        console.error('尋找資料夾失敗:', error);
        updateGoogleSigninStatus('error', '無法訪問 Google Drive 資料夾');
        notify('❌', '同步失敗', '無法訪問 Google Drive 資料夾');
    });
}

// Find or create app folder in Google Drive
function findOrCreateAppFolder() {
    return new Promise((resolve, reject) => {
        // Search for existing folder
        gapi.client.drive.files.list({
            q: `name='${GOOGLE_API_CONFIG.appFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            spaces: 'drive',
            fields: 'files(id, name)'
        }).then(response => {
            const folders = response.result.files;
            
            if (folders && folders.length > 0) {
                // Folder found
                resolve(folders[0].id);
            } else {
                // Create folder
                gapi.client.drive.files.create({
                    resource: {
                        name: GOOGLE_API_CONFIG.appFolderName,
                        mimeType: 'application/vnd.google-apps.folder'
                    },
                    fields: 'id'
                }).then(response => {
                    resolve(response.result.id);
                }).catch(error => {
                    reject(error);
                });
            }
        }).catch(error => {
            reject(error);
        });
    });
}

// Create a new file in Google Drive
function createDriveFile(folderId, data) {
    const file = new Blob([data], {type: 'application/json'});
    const metadata = {
        name: GOOGLE_API_CONFIG.dataFileName,
        mimeType: 'application/json',
        parents: [folderId]
    };
    
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
    form.append('file', file);
    
    fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: new Headers({
            'Authorization': 'Bearer ' + gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token
        }),
        body: form
    }).then(response => response.json())
      .then(result => {
          appSettings.googleSync.fileId = result.id;
          appSettings.googleSync.lastSync = new Date().toISOString();
          saveData('appSettings');
          
          updateGoogleSigninStatus('success', '數據已成功保存到 Google Drive');
          notify('✅', '同步成功', '數據已成功保存到 Google Drive');
      })
      .catch(error => {
          console.error('Error creating file:', error);
          updateGoogleSigninStatus('error', '創建文件失敗');
          notify('❌', '同步失敗', '無法在 Google Drive 中創建文件');
      });
}

// Update existing file in Google Drive
function updateDriveFile(fileId, data) {
    return new Promise((resolve, reject) => {
        const file = new Blob([data], {type: 'application/json'});
        
        fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
            method: 'PATCH',
            headers: new Headers({
                'Authorization': 'Bearer ' + gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token,
                'Content-Type': 'application/json'
            }),
            body: file
        }).then(response => {
            if (response.ok) {
                resolve();
            } else {
                reject(new Error('Failed to update file'));
            }
        }).catch(error => {
            reject(error);
        });
    });
}

// Load data from Google Drive
function loadFromGoogleDrive() {
    if (!googleUser) {
        notify('❌', '尚未登入', '請先登入 Google 帳戶');
        return;
    }
    
    updateGoogleSigninStatus('pending', '正在從 Google Drive 載入數據...');
    
    // Check if we have a file ID
    if (appSettings.googleSync.fileId) {
        // Get file content
        gapi.client.drive.files.get({
            fileId: appSettings.googleSync.fileId,
            alt: 'media'
        }).then(response => {
            const data = response.body;
            
            // Import the data
            if (importData(data)) {
                updateGoogleSigninStatus('success', '數據已成功從 Google Drive 載入');
                notify('✅', '同步成功', '數據已成功從 Google Drive 載入');
            } else {
                updateGoogleSigninStatus('error', '載入的數據格式不正確');
            }
        }).catch(error => {
            console.error('Error loading file:', error);
            updateGoogleSigninStatus('error', '無法載入文件，可能已被刪除');
            
            // Clear file ID since it's no longer valid
            appSettings.googleSync.fileId = null;
            saveData('appSettings');
            
            // Try finding the file
            findFileInDrive();
        });
    } else {
        // Find the file in Drive
        findFileInDrive();
    }
}

// Find file in Google Drive
function findFileInDrive() {
    findOrCreateAppFolder().then(folderId => {
        gapi.client.drive.files.list({
            q: `name='${GOOGLE_API_CONFIG.dataFileName}' and '${folderId}' in parents and trashed=false`,
            spaces: 'drive',
            fields: 'files(id, name, modifiedTime)'
        }).then(response => {
            const files = response.result.files;
            
            if (files && files.length > 0) {
                // Sort files by modified time (newest first)
                files.sort((a, b) => new Date(b.modifiedTime) - new Date(a.modifiedTime));
                
                // Get the most recent file
                const fileId = files[0].id;
                appSettings.googleSync.fileId = fileId;
                saveData('appSettings');
                
                // Load the file
                gapi.client.drive.files.get({
                    fileId: fileId,
                    alt: 'media'
                }).then(response => {
                    const data = response.body;
                    
                    // Import the data
                    if (importData(data)) {
                        updateGoogleSigninStatus('success', '數據已成功從 Google Drive 載入');
                        notify('✅', '同步成功', '數據已成功從 Google Drive 載入');
                    } else {
                        updateGoogleSigninStatus('error', '載入的數據格式不正確');
                    }
                }).catch(error => {
                    console.error('Error loading file:', error);
                    updateGoogleSigninStatus('error', '無法載入文件');
                    notify('❌', '同步失敗', '無法載入 Google Drive 文件');
                });
            } else {
                updateGoogleSigninStatus('error', '在 Google Drive 中找不到數據文件');
                notify('ℹ️', '找不到數據', '在 Google Drive 中找不到數據文件');
            }
        }).catch(error => {
            console.error('Error listing files:', error);
            updateGoogleSigninStatus('error', '無法列出 Google Drive 文件');
            notify('❌', '同步失敗', '無法列出 Google Drive 文件');
        });
    }).catch(error => {
        console.error('Error finding folder:', error);
        updateGoogleSigninStatus('error', '無法訪問 Google Drive 文件夾');
        notify('❌', '同步失敗', '無法訪問 Google Drive 文件夾');
    });
}

// Setup auto-sync
function setupAutoSync() {
    const enableAutoSync = document.getElementById('enableAutoSync');
    const autoSyncOptions = document.getElementById('autoSyncOptions');
    
    if (!enableAutoSync || !autoSyncOptions) return;
    
    // Set initial state
    enableAutoSync.checked = appSettings.googleSync.enabled;
    autoSyncOptions.style.display = enableAutoSync.checked ? 'block' : 'none';
    
    // Set frequency
    const frequency = appSettings.googleSync.frequency || 'daily';
    const radioBtn = document.getElementById(`autoSync${frequency.charAt(0).toUpperCase() + frequency.slice(1)}`);
    if (radioBtn) radioBtn.checked = true;
    
    // Add event listeners
    enableAutoSync.addEventListener('change', function() {
        autoSyncOptions.style.display = this.checked ? 'block' : 'none';
        appSettings.googleSync.enabled = this.checked;
        saveData('appSettings');
    });
    
    // Add event listeners for frequency options
    document.querySelectorAll('input[name="autoSyncFreq"]').forEach(radio => {
        radio.addEventListener('change', function() {
            appSettings.googleSync.frequency = this.value;
            saveData('appSettings');
        });
    });
}

// Check for auto-sync
function checkAutoSync() {
    if (!googleApiInitialized || !googleUser || !appSettings.googleSync.enabled) return;
    
    const now = new Date();
    const lastSync = appSettings.googleSync.lastSync ? new Date(appSettings.googleSync.lastSync) : null;
    
    // If never synced, sync now
    if (!lastSync) {
        saveToGoogleDrive();
        return;
    }
    
    let shouldSync = false;
    const daysDiff = (now - lastSync) / (1000 * 60 * 60 * 24);
    
    switch (appSettings.googleSync.frequency) {
        case 'daily':
            shouldSync = daysDiff >= 1;
            break;
        case 'weekly':
            shouldSync = daysDiff >= 7;
            break;
        case 'monthly':
            shouldSync = daysDiff >= 30;
            break;
    }
    
    if (shouldSync && dataModified) {
        saveToGoogleDrive();
    }
}

// Apply virtualization settings
function applyVirtualizationSettings() {
    paginationState.pageSize = parseInt(appSettings.pageSize) || 100;
    const pageSizeSelect = document.getElementById('pageSize');
    if (pageSizeSelect) {
        pageSizeSelect.value = paginationState.pageSize === -1 ? "-1" : paginationState.pageSize.toString();
    }
    
    const virtualizationCheckbox = document.getElementById('enableVirtualization');
    if (virtualizationCheckbox) {
        virtualizationCheckbox.checked = appSettings.enableVirtualization;
    }
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
    const todayTransactions = getTodayTransactions().filter(t => t.type === 'income');
    
    if (!appSettings.exchangeRates.enabled) {
        return todayTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    }
    
    // 基準貨幣
    const baseCurrency = appSettings.currency;
    
    // 轉換每個交易金額至基準貨幣
    return todayTransactions.reduce((sum, t) => {
        const account = getAccount(t.account);
        const accountCurrency = account ? account.currency : baseCurrency;
        const transactionCurrency = t.currency || accountCurrency;
        const convertedAmount = convertCurrency(parseFloat(t.amount), transactionCurrency, baseCurrency);
        return sum + convertedAmount;
    }, 0);
}

function getTodayExpense() {
    const todayTransactions = getTodayTransactions().filter(t => t.type === 'expense');
    
    if (!appSettings.exchangeRates.enabled) {
        return todayTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    }
    
    // 基準貨幣
    const baseCurrency = appSettings.currency;
    
    // 轉換每個交易金額至基準貨幣
    return todayTransactions.reduce((sum, t) => {
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
    
    if (!accountSelect || !categorySelect || !amountInput || !dateInput) {
        notify('❌', '系統錯誤', '無法找到表單元素');
        return;
    }
    
    const accountId = accountSelect.value;
    const selectedCurrency = currencySelect ? currencySelect.value : ''; // 可能為空，表示使用戶口貨幣
    const category = categorySelect.value;
    const amount = parseFloat(amountInput.value);
    const date = dateInput.value;
    const note = noteInput ? noteInput.value.trim() : '';
    
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
    if (enableReceiptUpload && enableReceiptUpload.checked && receiptImage && receiptImage.files && receiptImage.files[0]) {
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
    const categorySelect = document.getElementById('transactionCategory');
    const amountInput = document.getElementById('transactionAmount');
    const noteInput = document.getElementById('transactionNote');
    const currencySelect = document.getElementById('transactionCurrency');
    const enableReceiptUpload = document.getElementById('enableReceiptUpload');
    const receiptUploadContainer = document.getElementById('receiptUploadContainer');
    const receiptImage = document.getElementById('receiptImage');
    const receiptPreview = document.getElementById('receiptPreview');
    
    if (categorySelect) categorySelect.value = '';
    if (amountInput) amountInput.value = '';
    if (noteInput) noteInput.value = '';
    if (currencySelect) currencySelect.value = '';
    
    // Reset receipt upload
    if (enableReceiptUpload) enableReceiptUpload.checked = false;
    if (receiptUploadContainer) receiptUploadContainer.style.display = 'none';
    if (receiptImage) receiptImage.value = '';
    if (receiptPreview) receiptPreview.style.display = 'none';
    
    // 隱藏匯率轉換信息
    const conversionInfo = document.getElementById('currencyConversionInfo');
    if (conversionInfo) {
        conversionInfo.style.display = 'none';
    }
    
    updateAccountsTab();
    updateDashboard();
    searchTransactions();
    generateFinancialAdvice();
    
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
    
    // Close modal buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', event => {
            const modal = event.target.closest('.modal');
            closeModal(modal.id);
        });
    });
    
    // New day button
    const newDayBtn = document.getElementById('newDayBtn');
    if (newDayBtn) {
        newDayBtn.addEventListener('click', startNewDay);
    }
    
    // Settings button
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            updateSettingsModal();
            openModal('settingsModal');
        });
    }
    
    // Import/Export button
    const importExportBtn = document.getElementById('importExportBtn');
    if (importExportBtn) {
        importExportBtn.addEventListener('click', () => {
            const exportDataArea = document.getElementById('exportDataArea');
            const importDataArea = document.getElementById('importDataArea');
            
            if (exportDataArea) exportDataArea.value = exportData();
            if (importDataArea) importDataArea.value = '';
            
            openModal('importExportModal');
        });
        
        // 在 setupEventListeners 函數中添加這段代碼
// 下載數據按鈕
const downloadDataBtn = document.getElementById('downloadDataBtn');
if (downloadDataBtn) {
    downloadDataBtn.addEventListener('click', downloadData);
}


    }

// Google Sign-in button
const googleSignInBtn = document.getElementById('googleSignInBtn');
if (googleSignInBtn) {
    googleSignInBtn.addEventListener('click', function() {
        // 如果顯示的是重試按鈕，則嘗試重新初始化
        if (this.innerHTML.includes('重試')) {
            notify('🔄', '正在重新初始化', 'Google API 正在重新初始化...');
            initGoogleApi(); // 重新初始化
            return;
        }
        
        // 檢查 API 是否已初始化
        if (!googleApiInitialized) {
            notify('ℹ️', 'API 尚未初始化', '正在嘗試初始化 Google API...');
            initGoogleApi();
            return;
        }
        
        // 如果已初始化，則顯示登入提示
        console.log('顯示 Google 登入提示...');
        try {
            // 確保 google 對象存在
            if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
                google.accounts.id.prompt();
            } else {
                notify('❌', 'Google API 未就緒', '請稍後再試，或重新載入頁面');
            }
        } catch (error) {
            console.error('顯示登入提示錯誤:', error);
            notify('❌', 'Google 登入錯誤', error.message || '無法啟動登入流程');
        }
    });
}
    
    // Google Sign-out button
    const googleSignOutBtn = document.getElementById('googleSignOutBtn');
    if (googleSignOutBtn) {
        googleSignOutBtn.addEventListener('click', signOutFromGoogle);
    }
    
    // Save to Google Drive button
    const saveToDriveBtn = document.getElementById('saveToDriveBtn');
    if (saveToDriveBtn) {
        saveToDriveBtn.addEventListener('click', saveToGoogleDrive);
    }
    
    // Load from Google Drive button
    const loadFromDriveBtn = document.getElementById('loadFromDriveBtn');
    if (loadFromDriveBtn) {
        loadFromDriveBtn.addEventListener('click', loadFromGoogleDrive);
    }
    
    // Copy export data button
    const copyExportBtn = document.getElementById('copyExportBtn');
    if (copyExportBtn) {
        copyExportBtn.addEventListener('click', () => {
            const exportArea = document.getElementById('exportDataArea');
            if (exportArea) {
                exportArea.select();
                document.execCommand('copy');
                notify('✅', '已複製', '數據已成功複製到剪貼板');
            }
        });
    }
    
    // Transaction type buttons
    const incomeBtn = document.getElementById('incomeBtn');
    const expenseBtn = document.getElementById('expenseBtn');
    
    if (incomeBtn) {
        incomeBtn.addEventListener('click', () => {
            transactionType = 'income';
            updateTransactionTypeUI();
            updateTransactionCategories();
        });
    }
    
    if (expenseBtn) {
        expenseBtn.addEventListener('click', () => {
            transactionType = 'expense';
            updateTransactionTypeUI();
            updateTransactionCategories();
        });
    }
    
    // Save transaction button
    const saveTransactionBtn = document.getElementById('saveTransactionBtn');
    if (saveTransactionBtn) {
        saveTransactionBtn.addEventListener('click', addTransaction);
    }
    
    // Initial setup for transaction currency
    initTransactionCurrency();
    
    // 其他事件監聽器設置...
    
    // 測試 API 連接按鈕
    const testExchangeRateApiBtn = document.getElementById('testExchangeRateApiBtn');
    if (testExchangeRateApiBtn) {
        testExchangeRateApiBtn.addEventListener('click', testExchangeRateApi);
    }
    
    // 立即更新匯率按鈕
    const updateExchangeRatesBtn = document.getElementById('updateExchangeRatesBtn');
    if (updateExchangeRatesBtn) {
        updateExchangeRatesBtn.addEventListener('click', updateExchangeRates);
    }
    
    // 貨幣標籤點擊查看匯率
    const selectedCurrency = document.querySelector('#selectedCurrency');
    if (selectedCurrency) {
        selectedCurrency.addEventListener('click', function() {
            if (!appSettings.exchangeRates.enabled) {
                notify('ℹ️', '未啟用匯率功能', '請在設定中啟用即時匯率功能');
                return;
            }
            
            if (!exchangeRates.rates || Object.keys(exchangeRates.rates).length === 0) {
                notify('ℹ️', '無匯率數據', '請在設定中更新匯率數據');
                return;
            }
            
            setupExchangeRatesModal();
        });
    }
    
    // 設定頁面的匯率啟用狀態變更
    const enableExchangeRates = document.getElementById('enableExchangeRates');
    if (enableExchangeRates) {
        enableExchangeRates.addEventListener('change', function() {
            const exchangeRateApiSettings = document.getElementById('exchangeRateApiSettings');
            if (exchangeRateApiSettings) {
                exchangeRateApiSettings.style.display = this.checked ? 'block' : 'none';
            }
        });
        
        // 設置初始狀態
        enableExchangeRates.checked = appSettings.exchangeRates.enabled;
        const exchangeRateApiSettings = document.getElementById('exchangeRateApiSettings');
        if (exchangeRateApiSettings) {
            exchangeRateApiSettings.style.display = enableExchangeRates.checked ? 'block' : 'none';
        }
    }
    
    // 頁面內匯率更新按鈕
    const pageUpdateRatesBtn = document.getElementById('pageUpdateRatesBtn');
    if (pageUpdateRatesBtn) {
        pageUpdateRatesBtn.addEventListener('click', function() {
            updateExchangeRates();
            setTimeout(() => {
                updateExchangeRatesContent();
            }, 1000);
        });
    }
}

// 測試匯率 API 連接
function testExchangeRateApi() {
    const apiKeyInput = document.getElementById('exchangeRateApiKey');
    if (!apiKeyInput) return;
    
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
        notify('❌', '未設置 API 金鑰', '請輸入有效的匯率 API 金鑰');
        return;
    }
    
    updateExchangeRateApiStatus('pending', '正在測試 API 連接...');
    
    // 測試 API 連接
    fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`)
        .then(response => response.json())
        .then(data => {
            if (data && data.result === 'success') {
                updateExchangeRateApiStatus('success', 'API 連接成功！');
                notify('✅', 'API 連接成功', '匯率 API 金鑰有效並成功連接');
            } else {
                updateExchangeRateApiStatus('error', `API 錯誤: ${data.error || '未知錯誤'}`);
            }
        })
        .catch(error => {
            console.error('Exchange rate API test error:', error);
            updateExchangeRateApiStatus('error', `API 連接失敗: ${error.message}`);
            notify('❌', 'API 連接失敗', `無法連接匯率 API: ${error.message}`);
        });
}

// 更新匯率 API 狀態
function updateExchangeRateApiStatus(type, message) {
    const statusElement = document.getElementById('exchangeRateApiStatus');
    if (statusElement) {
        statusElement.className = `text-sm ${type === 'success' ? 'text-green-600' : type === 'error' ? 'text-red-600' : 'text-yellow-500'}`;
        statusElement.textContent = message;
    }
    
    // 如果也在匯率模態框中，更新那裡的狀態
    const modalStatusElement = document.getElementById('exchangeRateStatus');
    if (modalStatusElement) {
        modalStatusElement.className = `sync-status ${type}`;
        modalStatusElement.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-times-circle' : 'fa-circle-info'}"></i><span>${message}</span>`;
    }
}

// 修改 switchTab 函數以修復匯率分頁顯示問題
function switchTab(tabId) {
    console.log('Switching to tab:', tabId);

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
            console.log('Activated tab:', content.id);
        } else {
            content.classList.remove('active');
        }
    });
    
    // Specific actions for certain tabs
    if (tabId === 'exchangeRates') {
        console.log('Exchange rates tab activated');
        
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
    } else if (tabId === 'transactions') {
        // Reset new transaction form when switching to transactions tab
        const transactionDateInput = document.getElementById('transactionDate');
        if (transactionDateInput) {
            transactionDateInput.value = getTodayFormatted();
        }
        
        // Keep transaction type
        updateTransactionTypeUI();
        updateTransactionCategories();
    } else if (tabId === 'stats') {
        // Reset pagination state when switching to stats tab
        paginationState.currentPage = 1;
        searchTransactions();
    }
}

// Load data from localStorage
function loadData() {
    if (hasLocalStorage) {
        try {
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
            
            // 載入匯率數據
            const storedExchangeRates = localStorage.getItem('finance_exchange_rates');
            if (storedExchangeRates) {
                exchangeRates = JSON.parse(storedExchangeRates);
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
            
            // If no accounts exist, add a default one
            if (accounts.length === 0) {
                accounts.push({
                    id: generateId(),
                    name: '現金',
                    balance: 0,
                    icon: '💵',
                    currency: 'TWD'
                });
            }
            
            // Add currency property to existing accounts if missing
            let accountsUpdated = false;
            accounts.forEach(account => {
                if (!account.currency) {
                    account.currency = appSettings.currency || 'TWD';
                    accountsUpdated = true;
                }
            });
            
            if (accountsUpdated) {
                saveData('accounts');
            }
            
            // Initialize default categories if empty
            initDefaultCategories();
            
            // Ensure budget.thresholds exists
            if (!budget.thresholds || !Array.isArray(budget.thresholds)) {
                budget.thresholds = [80];
                saveData('budget');
            }
        } catch (error) {
            console.error('Error loading data:', error);
            initDefaultData();
        }
    } else {
        initDefaultData();
    }
}

// Initialize default categories
function initDefaultCategories() {
    if (!categories.income || categories.income.length === 0) {
        categories.income = ['薪資', '獎金', '投資收益', '禮金', '其他收入'];
    }
    
    if (!categories.expense || categories.expense.length === 0) {
        categories.expense = ['飲食', '娛樂', '車資', '日用', '儲錢', '電信', '家用', '應急', '大陸', '還款'];
    }
    
    saveData('categories');
}

// Initialize default data
function initDefaultData() {
    // Reset to defaults
    accounts = [{
        id: generateId(),
        name: '現金',
        balance: 0,
        icon: '💵',
        currency: 'TWD'
    }];
    
    categories = {
        income: ['薪資', '獎金', '投資收益', '禮金', '其他收入'],
        expense: ['飲食', '娛樂', '車資', '日用', '儲錢', '電信', '家用', '應急', '大陸', '還款']
    };
    
    transactions = [];
    
    budget = {
        amount: 0,
        cycle: 'monthly',
        resetDay: 1,
        thresholds: [80],
        lastReset: null
    };
    
    categoryBudgets = [];
    
    newDayStatus = {
        active: false,
        lastActivated: null
    };
    
    appSettings = {
        currency: 'TWD',
        currencySymbol: '$',
        syncRemindersEnabled: true,
        lastSyncReminder: null,
        theme: 'system',
        dailySummaryTiming: 'immediate',
        enableVirtualization: true,
        pageSize: 100,
        googleSync: {
            enabled: false,
            frequency: 'daily',
            lastSync: null,
            fileId: null
        },
        exchangeRates: {
            enabled: false,
            apiKey: '',
            cacheHours: 24,
            lastUpdated: null
        }
    };
    
    exchangeRates = {
        base: 'TWD',
        rates: {},
        lastUpdated: null,
        expiryHours: 24
    };
    
    saveData();
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
    
     // 更嚴格的安全檢查
    if (!baseCurrencySelect || !fromCurrencySelect || !toCurrencySelect || 
        !fromAmountInput || !toAmountInput || !lastUpdatedInfo || !statusElement) {
        console.error('Exchange rate page elements not found');
        return; // 安全检查
    }
    
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
}

// 頁面用的匯率卡片更新
function updatePageExchangeRateCards(baseCurrency) {
    const container = document.getElementById('pageExchangeRatesContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    // 如果沒有匯率數據或基準貨幣匯率不存在
    if (!exchangeRates.rates || !exchangeRates.rates[baseCurrency] && baseCurrency !== exchangeRates.base) {
        container.innerHTML = '<div class="col-span-3 text-center text-gray-500">無法顯示匯率數據</div>';
        return;
    }
    
    // 獲取所有貨幣對基準貨幣的匯率
    const rates = {};
    
    // 如果當前基準貨幣就是API基準貨幣
    if (baseCurrency === exchangeRates.base) {
        Object.entries(exchangeRates.rates).forEach(([currency, rate]) => {
            if (currency !== baseCurrency) {
                rates[currency] = rate;
            }
        });
    } else {
        // 如果不是API基準貨幣，需要轉換
        const baseRate = exchangeRates.rates[baseCurrency];
        if (!baseRate) return;
        
        Object.entries(exchangeRates.rates).forEach(([currency, rate]) => {
            if (currency !== baseCurrency) {
                rates[currency] = rate / baseRate;
            }
        });
        
        // 添加API基準貨幣的匯率
        rates[exchangeRates.base] = 1 / baseRate;
    }
    
    // 添加常用貨幣的卡片
    const popularCurrencies = ['USD', 'EUR', 'JPY', 'CNY', 'HKD', 'GBP', 'TWD', 'AUD', 'CAD', 'SGD'];
    const availableCurrencies = Object.keys(rates);
    
    // 按流行程度排序
    popularCurrencies
        .filter(currency => availableCurrencies.includes(currency) && currency !== baseCurrency)
        .forEach(currency => {
            createPageExchangeRateCard(container, baseCurrency, currency, rates[currency]);
        });
    
    // 添加其他貨幣
    availableCurrencies
        .filter(currency => !popularCurrencies.includes(currency) && currency !== baseCurrency)
        .sort()
        .forEach(currency => {
            createPageExchangeRateCard(container, baseCurrency, currency, rates[currency]);
        });
}

// 創建頁面用的匯率卡片
function createPageExchangeRateCard(container, baseCurrency, targetCurrency, rate) {
    const card = document.createElement('div');
    card.className = 'exchange-rate-card bg-white p-4 rounded-lg shadow';
    
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-2';
    
    const currencyName = document.createElement('span');
    currencyName.className = 'font-bold';
    currencyName.textContent = targetCurrency;
    
    const currencySymbolEl = document.createElement('span');
    currencySymbolEl.className = 'text-gray-500';
    currencySymbolEl.textContent = currencySymbols[targetCurrency] || '';
    
    header.appendChild(currencyName);
    header.appendChild(currencySymbolEl);
    
    const rateDisplay = document.createElement('div');
    rateDisplay.className = 'text-lg font-medium';
    rateDisplay.textContent = `1 ${baseCurrency} = ${rate.toFixed(4)} ${targetCurrency}`;
    
    const inverseRate = 1 / rate;
    const inverseDisplay = document.createElement('div');
    inverseDisplay.className = 'text-sm text-gray-500 exchange-rate-info';
    inverseDisplay.textContent = `1 ${targetCurrency} = ${inverseRate.toFixed(4)} ${baseCurrency}`;
    
    // 添加工具提示
    const tooltip = document.createElement('span');
    tooltip.className = 'exchange-rate-tooltip';
    tooltip.textContent = `點擊複製: ${inverseRate.toFixed(4)}`;
    inverseDisplay.appendChild(tooltip);
    
    // 點擊複製匯率
    inverseDisplay.addEventListener('click', function() {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(inverseRate.toFixed(4)).then(() => {
                notify('✅', '已複製', `匯率 ${inverseRate.toFixed(4)} 已複製到剪貼板`);
            }).catch(err => {
                console.error('无法复制文本: ', err);
            });
        } else {
            // 舊版瀏覽器相容性處理
            const tempInput = document.createElement('textarea');
            tempInput.value = inverseRate.toFixed(4);
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
            notify('✅', '已複製', `匯率 ${inverseRate.toFixed(4)} 已複製到剪貼板`);
        }
    });
    
    card.appendChild(header);
    card.appendChild(rateDisplay);
    card.appendChild(inverseDisplay);
    
    container.appendChild(card);
}

// 更新頁面貨幣計算器
function updatePageCurrencyCalculator() {
    const fromCurrency = document.getElementById('pageFromCurrency').value;
    const toCurrency = document.getElementById('pageToCurrency').value;
    const fromAmount = parseFloat(document.getElementById('pageFromAmount').value) || 0;
    
    if (!fromCurrency || !toCurrency) return;
    
    const convertedAmount = convertCurrency(fromAmount, fromCurrency, toCurrency);
    const toAmountInput = document.getElementById('pageToAmount');
    if (toAmountInput) {
        toAmountInput.value = convertedAmount.toFixed(2);
    }
}

// 設置匯率資訊模態框
function setupExchangeRatesModal() {
    const modal = document.getElementById('exchangeRatesModal');
    if (!modal) return;
    
    const baseCurrencySelect = document.getElementById('baseCurrencySelect');
    const fromCurrencySelect = document.getElementById('fromCurrency');
    const toCurrencySelect = document.getElementById('toCurrency');
    const fromAmountInput = document.getElementById('fromAmount');
    const toAmountInput = document.getElementById('toAmount');
    const lastUpdatedInfo = document.getElementById('lastUpdatedInfo');
    
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
    updateExchangeRateCards(exchangeRates.base);
    
    // 更新計算器初始值
    updateCurrencyCalculator();
    
    // 更新最後更新時間
    if (exchangeRates.lastUpdated) {
        const lastUpdate = new Date(exchangeRates.lastUpdated);
        lastUpdatedInfo.textContent = `匯率更新時間: ${lastUpdate.toLocaleString()}`;
    } else {
        lastUpdatedInfo.textContent = '匯率尚未更新';
    }
    
    // 添加事件監聽器
    baseCurrencySelect.addEventListener('change', function() {
        updateExchangeRateCards(this.value);
    });
    
    fromCurrencySelect.addEventListener('change', updateCurrencyCalculator);
    toCurrencySelect.addEventListener('change', updateCurrencyCalculator);
    fromAmountInput.addEventListener('input', updateCurrencyCalculator);
    
    // 顯示模態框
    modal.style.display = 'block';
}

// 初始化匯率功能
function initExchangeRates() {
    // 如果有緩存的匯率數據，先加載
    if (hasLocalStorage) {
        try {
            const storedRates = localStorage.getItem('finance_exchange_rates');
            if (storedRates) {
                exchangeRates = JSON.parse(storedRates);
            }
        } catch (error) {
            console.error('Error loading exchange rates:', error);
        }
    }
    
    // 如果啟用了匯率功能並且緩存過期，獲取最新匯率
    if (appSettings.exchangeRates.enabled) {
        checkAndUpdateExchangeRates();
    }
    
    // 設置模態框中的匯率設置
    const enableExchangeRates = document.getElementById('enableExchangeRates');
    const exchangeRateApiKey = document.getElementById('exchangeRateApiKey');
    const exchangeRateCacheHours = document.getElementById('exchangeRateCacheHours');
    
    if (enableExchangeRates) enableExchangeRates.checked = appSettings.exchangeRates.enabled;
    if (exchangeRateApiKey) exchangeRateApiKey.value = appSettings.exchangeRates.apiKey || '';
    if (exchangeRateCacheHours) exchangeRateCacheHours.value = appSettings.exchangeRates.cacheHours || 24;
    
    // 設置匯率數據緩存時間
    exchangeRates.expiryHours = appSettings.exchangeRates.cacheHours || 24;
}

// 檢查並更新匯率數據
function checkAndUpdateExchangeRates() {
    if (!appSettings.exchangeRates.enabled || !appSettings.exchangeRates.apiKey) {
        return;
    }
    
    // 檢查是否需要更新
    const now = new Date();
    const lastUpdated = exchangeRates.lastUpdated ? new Date(exchangeRates.lastUpdated) : null;
    
    if (!lastUpdated || ((now - lastUpdated) / (1000 * 60 * 60) >= exchangeRates.expiryHours)) {
        updateExchangeRates();
    }
}

// 更新匯率數據
function updateExchangeRates() {
    if (!appSettings.exchangeRates.apiKey) {
        notify('❌', '未設置 API 金鑰', '請在設定中添加有效的匯率 API 金鑰');
        return;
    }
    
    const apiKey = appSettings.exchangeRates.apiKey;
    const baseCurrency = appSettings.currency;
    
    // 更新狀態
    updateExchangeRateApiStatus('pending', '正在更新匯率數據...');
    
    // 使用 fetch 獲取匯率數據
    fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/${baseCurrency}`)
        .then(response => response.json())
        .then(data => {
            if (data && data.result === 'success') {
                // 更新匯率數據
                exchangeRates.base = data.base_code;
                exchangeRates.rates = data.conversion_rates;
                exchangeRates.lastUpdated = new Date().toISOString();
                
                // 更新 appSettings 中的最後更新時間
                appSettings.exchangeRates.lastUpdated = exchangeRates.lastUpdated;
                
                // 保存到 localStorage
                saveExchangeRates();
                
                // 更新狀態
                updateExchangeRateApiStatus('success', '匯率數據已更新');
                
                // 更新 UI
                updateCurrencyDisplay();
                updateAccountsTab();
                updateDashboard();
                
                notify('✅', '匯率已更新', `已成功更新 ${baseCurrency} 的匯率數據`);
            } else {
                updateExchangeRateApiStatus('error', `API 錯誤: ${data.error || '未知錯誤'}`);
            }
        })
        .catch(error => {
            console.error('Exchange rate API error:', error);
            updateExchangeRateApiStatus('error', `無法連接匯率 API: ${error.message}`);
            notify('❌', '匯率更新失敗', `無法獲取匯率數據: ${error.message}`);
        });
}

// 保存匯率數據到 localStorage
function saveExchangeRates() {
    if (hasLocalStorage) {
        try {
            localStorage.setItem('finance_exchange_rates', JSON.stringify(exchangeRates));
        } catch (error) {
            console.error('Error saving exchange rates:', error);
        }
    }
}

// 更新匯率卡片
function updateExchangeRateCards(baseCurrency) {
    const container = document.getElementById('exchangeRatesContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    // 如果沒有匯率數據或基準貨幣匯率不存在
    if (!exchangeRates.rates || !exchangeRates.rates[baseCurrency] && baseCurrency !== exchangeRates.base) {
        container.innerHTML = '<div class="col-span-3 text-center text-gray-500">無法顯示匯率數據</div>';
        return;
    }
    
    // 獲取所有貨幣對基準貨幣的匯率
    const rates = {};
    
    // 如果當前基準貨幣就是API基準貨幣
    if (baseCurrency === exchangeRates.base) {
        Object.entries(exchangeRates.rates).forEach(([currency, rate]) => {
            if (currency !== baseCurrency) {
                rates[currency] = rate;
            }
        });
    } else {
        // 如果不是API基準貨幣，需要轉換
        const baseRate = exchangeRates.rates[baseCurrency];
        if (!baseRate) return;
        
        Object.entries(exchangeRates.rates).forEach(([currency, rate]) => {
            if (currency !== baseCurrency) {
                rates[currency] = rate / baseRate;
            }
        });
        
        // 添加API基準貨幣的匯率
        rates[exchangeRates.base] = 1 / baseRate;
    }
    
    // 添加常用貨幣的卡片
    const popularCurrencies = ['USD', 'EUR', 'JPY', 'CNY', 'HKD', 'GBP', 'TWD', 'AUD', 'CAD', 'SGD'];
    const availableCurrencies = Object.keys(rates);
    
    // 按流行程度排序
    popularCurrencies
        .filter(currency => availableCurrencies.includes(currency) && currency !== baseCurrency)
        .forEach(currency => {
            createExchangeRateCard(container, baseCurrency, currency, rates[currency]);
        });
    
    // 添加其他貨幣
    availableCurrencies
        .filter(currency => !popularCurrencies.includes(currency) && currency !== baseCurrency)
        .sort()
        .forEach(currency => {
            createExchangeRateCard(container, baseCurrency, currency, rates[currency]);
        });
}

// 創建匯率卡片
function createExchangeRateCard(container, baseCurrency, targetCurrency, rate) {
    const card = document.createElement('div');
    card.className = 'exchange-rate-card bg-white p-4 rounded-lg shadow';
    
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-2';
    
    const currencyName = document.createElement('span');
    currencyName.className = 'font-bold';
    currencyName.textContent = targetCurrency;
    
    const currencySymbolEl = document.createElement('span');
    currencySymbolEl.className = 'text-gray-500';
    currencySymbolEl.textContent = currencySymbols[targetCurrency] || '';
    
    header.appendChild(currencyName);
    header.appendChild(currencySymbolEl);
    
    const rateDisplay = document.createElement('div');
    rateDisplay.className = 'text-lg font-medium';
    rateDisplay.textContent = `1 ${baseCurrency} = ${rate.toFixed(4)} ${targetCurrency}`;
    
    const inverseRate = 1 / rate;
    const inverseDisplay = document.createElement('div');
    inverseDisplay.className = 'text-sm text-gray-500 exchange-rate-info';
    inverseDisplay.textContent = `1 ${targetCurrency} = ${inverseRate.toFixed(4)} ${baseCurrency}`;
    
    // 添加工具提示
    const tooltip = document.createElement('span');
    tooltip.className = 'exchange-rate-tooltip';
    tooltip.textContent = `點擊複製: ${inverseRate.toFixed(4)}`;
    inverseDisplay.appendChild(tooltip);
    
    // 點擊複製匯率
    inverseDisplay.addEventListener('click', function() {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(inverseRate.toFixed(4)).then(() => {
                notify('✅', '已複製', `匯率 ${inverseRate.toFixed(4)} 已複製到剪貼板`);
            }).catch(err => {
                console.error('无法复制文本: ', err);
            });
        } else {
            // 舊版瀏覽器相容性處理
            const tempInput = document.createElement('textarea');
            tempInput.value = inverseRate.toFixed(4);
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
            notify('✅', '已複製', `匯率 ${inverseRate.toFixed(4)} 已複製到剪貼板`);
        }
    });
    
    card.appendChild(header);
    card.appendChild(rateDisplay);
    card.appendChild(inverseDisplay);
    
    container.appendChild(card);
}

// 更新貨幣計算器
function updateCurrencyCalculator() {
    const fromCurrency = document.getElementById('fromCurrency').value;
    const toCurrency = document.getElementById('toCurrency').value;
    const fromAmount = parseFloat(document.getElementById('fromAmount').value) || 0;
    
    if (!fromCurrency || !toCurrency) return;
    
    const convertedAmount = convertCurrency(fromAmount, fromCurrency, toCurrency);
    document.getElementById('toAmount').value = convertedAmount.toFixed(2);
}

// 貨幣轉換函數
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

// 顯示通知訊息
function notify(icon, title, message) {
    const notificationEl = document.getElementById('notification');
    if (!notificationEl) return;
    
    const notificationIcon = document.getElementById('notificationIcon');
    const notificationTitle = document.getElementById('notificationTitle');
    const notificationMessage = document.getElementById('notificationMessage');
    
    if (notificationIcon) notificationIcon.textContent = icon;
    if (notificationTitle) notificationTitle.textContent = title;
    if (notificationMessage) notificationMessage.textContent = message;
    
    notificationEl.style.display = 'block';
    
    // Auto-hide notification after 3 seconds
    setTimeout(() => {
        if (notificationEl) notificationEl.style.display = 'none';
    }, 3000);
}

// 更新 UI
function updateUI() {
    // Update dashboard
    updateDashboard();
    
    // Update accounts tab
    updateAccountsTab();
    
    // Update transaction categories
    updateTransactionCategories();
    
    // Update category budget dropdown
    updateCategoryBudgetDropdown();
    
    // Update category budget items
    updateCategoryBudgetItems();
    
    // Update statistics categories
    updateStatisticsCategories();
    
    // Update account dropdowns
    updateAccountDropdowns();
    
    // Update budget status
    updateBudgetStatus();
    
    // Update currency display
    updateCurrencyDisplay();
}

// 更新貨幣顯示
function updateCurrencyDisplay() {
    // Update currency symbol in header
    const selectedCurrencyEl = document.getElementById('selectedCurrency');
    if (selectedCurrencyEl) selectedCurrencyEl.textContent = appSettings.currency;
    
    // Update all currency symbols in the UI
    const currencyElements = document.querySelectorAll('[id^="currencySymbol"]');
    currencyElements.forEach(element => {
        element.textContent = appSettings.currencySymbol;
    });
    
    // Update currency symbols in summary modal
    const summarySymbols = document.querySelectorAll('[id^="summarySymbol"]');
    summarySymbols.forEach(element => {
        element.textContent = appSettings.currencySymbol;
    });
}

// Update dashboard
function updateDashboard() {
    const totalBalanceEl = document.getElementById('totalBalance');
    const todayIncomeEl = document.getElementById('todayIncome');
    const todayExpenseEl = document.getElementById('todayExpense');
    
    // Update total balance
    if (totalBalanceEl) totalBalanceEl.textContent = formatNumber(getTotalBalance());
    
    // Update today income/expense
    if (todayIncomeEl) todayIncomeEl.textContent = formatNumber(getTodayIncome());
    if (todayExpenseEl) todayExpenseEl.textContent = formatNumber(getTodayExpense());
    
    // Update today transactions
    updateTodayTransactions();
    
    // Update recent transactions
    updateRecentTransactions();
}

// Update accounts tab
function updateAccountsTab() {
    const accountsGrid = document.getElementById('accountsGrid');
    if (!accountsGrid) return;
    
    // Clear previous content
    accountsGrid.innerHTML = '';
    
    // Add each account
    accounts.forEach(account => {
        const accountCard = document.createElement('div');
        accountCard.className = 'bg-white p-6 rounded-lg shadow relative';
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'absolute top-2 right-2 flex space-x-1';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'text-red-500 hover:text-red-700';
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteBtn.addEventListener('click', () => deleteAccount(account.id));
        actionsDiv.appendChild(deleteBtn);
        
        const iconDiv = document.createElement('div');
        iconDiv.className = 'text-3xl mb-2 emoji-btn';
        iconDiv.textContent = account.icon || '💳';
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'flex items-center mb-1';
        
        const nameHeading = document.createElement('h3');
        nameHeading.className = 'text-lg font-bold';
        nameHeading.textContent = account.name;
        
        const currencyBadge = document.createElement('span');
        currencyBadge.className = 'currency-label ml-2';
        currencyBadge.textContent = account.currency || appSettings.currency;
        
        nameDiv.appendChild(nameHeading);
        nameDiv.appendChild(currencyBadge);
        
        const balanceDiv = document.createElement('div');
        balanceDiv.className = 'text-2xl font-bold';
        
        // Get currency symbol for this account
        const currencySymbol = account.currency ? 
            (currencySymbols[account.currency] || appSettings.currencySymbol) : 
            appSettings.currencySymbol;
        
        balanceDiv.textContent = currencySymbol + formatNumber(account.balance);
        
        accountCard.appendChild(actionsDiv);
        accountCard.appendChild(iconDiv);
        accountCard.appendChild(nameDiv);
        accountCard.appendChild(balanceDiv);
        
        accountsGrid.appendChild(accountCard);
    });
    
    // Add the "Add New Account" card
    const addNewCard = document.createElement('div');
    addNewCard.className = 'bg-gray-100 p-6 rounded-lg shadow border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-200 transition';
    addNewCard.innerHTML = `
        <div class="text-3xl mb-2">➕</div>
        <h3 class="text-lg font-medium text-gray-600">新增戶口</h3>
    `;
    addNewCard.addEventListener('click', () => {
        const newAccountNameInput = document.getElementById('newAccountName');
        const newAccountBalanceInput = document.getElementById('newAccountBalance');
        const newAccountCurrencySelect = document.getElementById('newAccountCurrency');
        
        if (newAccountNameInput) newAccountNameInput.value = '';
        if (newAccountBalanceInput) newAccountBalanceInput.value = '';
        if (newAccountCurrencySelect) newAccountCurrencySelect.value = appSettings.currency || 'TWD';
        
        selectedIcon = '💳';
        updateSelectedAccountIcon();
        openModal('newAccountModal');
    });
    
    accountsGrid.appendChild(addNewCard);
}

// Update account dropdowns
function updateAccountDropdowns() {
    const transferFrom = document.getElementById('transferFrom');
    const transferTo = document.getElementById('transferTo');
    const transactionAccount = document.getElementById('transactionAccount');
    
    // Safety checks
    if (!transferFrom && !transferTo && !transactionAccount) return;
    
    // Clear previous options
    if (transferFrom) transferFrom.innerHTML = '<option value="" disabled selected>選擇戶口</option>';
    if (transferTo) transferTo.innerHTML = '<option value="" disabled selected>選擇戶口</option>';
    if (transactionAccount) transactionAccount.innerHTML = '<option value="" disabled selected>選擇戶口</option>';
    
    // Add account options
    accounts.forEach(account => {
        const currencyCode = account.currency || appSettings.currency;
        const displayName = `${account.name} (${currencyCode})`;
        
        if (transferFrom) {
            const option1 = document.createElement('option');
            option1.value = account.id;
            option1.textContent = displayName;
            transferFrom.appendChild(option1);
        }
        
        if (transferTo) {
            const option2 = document.createElement('option');
            option2.value = account.id;
            option2.textContent = displayName;
            transferTo.appendChild(option2);
        }
        
        if (transactionAccount) {
            const option3 = document.createElement('option');
            option3.value = account.id;
            option3.textContent = displayName;
            transactionAccount.appendChild(option3);
        }
    });
}

// Update transaction categories
function updateTransactionCategories() {
    const transactionCategory = document.getElementById('transactionCategory');
    if (!transactionCategory) return;
    
    // Clear previous options
    transactionCategory.innerHTML = '<option value="" disabled selected>選擇類別</option>';
    
    // Add category options based on current transaction type
    const categoriesList = categories[transactionType] || [];
    categoriesList.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        transactionCategory.appendChild(option);
    });
}

// 其他必要函數 (簡化版)
function updateTodayTransactions() {
    // 根據您的代碼實現
}

function updateRecentTransactions() {
    // 根據您的代碼實現
}

function updateCategoryBudgetDropdown() {
    // 根據您的代碼實現
}

function updateCategoryBudgetItems() {
    // 根據您的代碼實現
}

function updateStatisticsCategories() {
    // 根據您的代碼實現
}

function updateBudgetStatus() {
    // 根據您的代碼實現
}

function updateBudgetResetDayOptions() {
    // 根據您的代碼實現
}

function initAccountIcons() {
    // 根據您的代碼實現
}

function updateSelectedAccountIcon() {
    // 根據您的代碼實現
}

function initReceiptUpload() {
    // 根據您的代碼實現
}

function updateSettingsModal() {
    // 根據您的代碼實現
}

function saveData(dataType) {
    if (!hasLocalStorage) return;
    
    try {
        switch (dataType) {
            case 'accounts':
                localStorage.setItem('finance_accounts', JSON.stringify(accounts));
                break;
            case 'categories':
                localStorage.setItem('finance_categories', JSON.stringify(categories));
                break;
            case 'transactions':
                localStorage.setItem('finance_transactions', JSON.stringify(transactions));
                break;
            case 'budget':
                localStorage.setItem('finance_budget', JSON.stringify(budget));
                break;
            case 'categoryBudgets':
                localStorage.setItem('finance_category_budgets', JSON.stringify(categoryBudgets));
                break;
            case 'newDayStatus':
                localStorage.setItem('finance_new_day_status', JSON.stringify(newDayStatus));
                break;
            case 'appSettings':
                localStorage.setItem('finance_app_settings', JSON.stringify(appSettings));
                break;
            default:
                // Save all
                localStorage.setItem('finance_accounts', JSON.stringify(accounts));
                localStorage.setItem('finance_categories', JSON.stringify(categories));
                localStorage.setItem('finance_transactions', JSON.stringify(transactions));
                localStorage.setItem('finance_budget', JSON.stringify(budget));
                localStorage.setItem('finance_category_budgets', JSON.stringify(categoryBudgets));
                localStorage.setItem('finance_new_day_status', JSON.stringify(newDayStatus));
                localStorage.setItem('finance_app_settings', JSON.stringify(appSettings));
        }
        
        // Mark data as modified
        dataModified = true;
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

function exportData() {
    return JSON.stringify({
        accounts: accounts,
        categories: categories,
        transactions: transactions,
        budget: budget,
        categoryBudgets: categoryBudgets,
        newDayStatus: newDayStatus,
        appSettings: appSettings,
        exchangeRates: exchangeRates,
        exportDate: new Date().toISOString(),
        version: '2.2.0'
    }, null, 2);
}

function importData(jsonString) {
    try {
        // 解析 JSON 字符串
        const data = JSON.parse(jsonString);
        
        // 使用通用的處理函數來處理數據
        const importSuccessful = processImportedData(data);
        
        if (importSuccessful) {
            notify('✅', '匯入成功', '數據已成功匯入');
            return true;
        } else {
            notify('⚠️', '部分匯入', '部分數據格式不正確，請檢查');
            return false;
        }
    } catch (error) {
        console.error('Import error:', error);
        notify('❌', '匯入失敗', '匯入的數據格式不正確');
        return false;
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'block';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

function updateTransactionTypeUI() {
    const incomeBtn = document.getElementById('incomeBtn');
    const expenseBtn = document.getElementById('expenseBtn');
    
    if (!incomeBtn || !expenseBtn) return;
    
    if (transactionType === 'income') {
        incomeBtn.classList.remove('bg-gray-200', 'text-gray-700');
        incomeBtn.classList.add('bg-green-500', 'text-white');
        expenseBtn.classList.remove('bg-red-500', 'text-white');
        expenseBtn.classList.add('bg-gray-200', 'text-gray-700');
    } else {
        incomeBtn.classList.remove('bg-green-500', 'text-white');
        incomeBtn.classList.add('bg-gray-200', 'text-gray-700');
        expenseBtn.classList.remove('bg-gray-200', 'text-gray-700');
        expenseBtn.classList.add('bg-red-500', 'text-white');
    }
}

function applyTheme() {
    const theme = appSettings.theme;
    
    if (theme === 'system') {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    } else if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

function searchTransactions() {
    // 根據您的代碼實現
}

function generateFinancialAdvice() {
    // 根據您的代碼實現
}

function checkBudgetReset() {
    // 根據您的代碼實現
}

function checkNewDayStatus() {
    // 根據您的代碼實現
}

function startNewDay() {
    // 根據您的代碼實現
}

function checkSyncReminder() {
    // 根據您的代碼實現
}

function checkBudgetAlert() {
    // 根據您的代碼實現
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function getAccount(accountId) {
    return accounts.find(a => a.id === accountId) || null;
}

function getAccountCurrencySymbol(accountId) {
    const account = getAccount(accountId);
    if (!account) return appSettings.currencySymbol;
    
    const currency = account.currency;
    return currency ? (currencySymbols[currency] || appSettings.currencySymbol) : appSettings.currencySymbol;
}

function getTodayFormatted() {
    return formatDateForInput(new Date());
}

function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
}

function formatNumber(number) {
    if (typeof number !== 'number') {
        number = parseFloat(number) || 0;
    }
    return number.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function getTodayTransactions() {
    const today = getTodayFormatted();
    return transactions.filter(t => t.date === today);
}

function deleteAccount(accountId) {
    // 實現刪除戶口的邏輯
}

// 在文件末尾添加這個新函數
function downloadData() {
    const data = exportData();
    const blob = new Blob([data], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = GOOGLE_API_CONFIG.dataFileName || 'finance_data.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);
}
// 添加到腳本末尾
function diagnoseGoogleApi() {
    console.log('Google API 診斷開始...');
    
    // 檢查 google 對象是否存在
    if (typeof google === 'undefined') {
        console.error('google 對象不存在，API 腳本未載入或載入失敗');
        return;
    }
    
    console.log('google 對象已存在');
    
    // 檢查 google.accounts 是否存在
    if (!google.accounts) {
        console.error('google.accounts 不存在，Identity Services 未載入');
        return;
    }
    
    console.log('google.accounts 已存在');
    
    // 檢查 google.accounts.id 是否存在
    if (!google.accounts.id) {
        console.error('google.accounts.id 不存在，無法進行 OAuth 流程');
        return;
    }
    
    console.log('google.accounts.id 已存在');
    
    // 檢查 gapi 對象
    if (typeof gapi === 'undefined') {
        console.error('gapi 對象不存在，API 腳本未載入');
        return;
    }
    
    console.log('gapi 對象已存在');
    
    // 檢查 gapi.client
    if (!gapi.client) {
        console.error('gapi.client 不存在，client 庫未初始化');
        return;
    }
    
    console.log('gapi.client 已存在');
    
    // 檢查 gapi.client.drive
    if (!gapi.client.drive) {
        console.error('gapi.client.drive 不存在，Drive API 未載入');
        return;
    }
    
    console.log('gapi.client.drive 已存在');
    
    // 檢查用戶狀態
    console.log('googleUser 狀態:', googleUser);
    console.log('googleApiInitialized 狀態:', googleApiInitialized);
    
    console.log('Google API 診斷完成');
}

// 將此診斷函數添加到登入按鈕上的右鍵菜單
document.addEventListener('DOMContentLoaded', function() {
    const googleSignInBtn = document.getElementById('googleSignInBtn');
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            diagnoseGoogleApi();
            return false;
        });
    }
});

// 診斷工具
function diagnoseGoogleApi() {
    console.log('=== Google API 診斷開始 ===');
    
    // 檢查 google 對象
    console.log('1. google 對象:', typeof google !== 'undefined' ? '存在' : '不存在');
    
    // 如果 google 對象存在，檢查子對象
    if (typeof google !== 'undefined') {
        console.log('2. google.accounts:', google.accounts ? '存在' : '不存在');
        console.log('3. google.accounts.id:', google.accounts && google.accounts.id ? '存在' : '不存在');
        console.log('4. google.accounts.oauth2:', google.accounts && google.accounts.oauth2 ? '存在' : '不存在');
    }
    
    // 檢查 gapi 對象
    console.log('5. gapi 對象:', typeof gapi !== 'undefined' ? '存在' : '不存在');
    
    // 如果 gapi 對象存在，檢查子對象
    if (typeof gapi !== 'undefined') {
        console.log('6. gapi.client:', gapi.client ? '存在' : '不存在');
        console.log('7. gapi.client.drive:', gapi.client && gapi.client.drive ? '存在' : '不存在');
    }
    
    // 檢查全局變量
    console.log('8. googleApiInitialized:', googleApiInitialized ? 'true' : 'false');
    console.log('9. googleUser:', googleUser ? '已登入' : '未登入');
    if (googleUser) {
        console.log('10. googleUser.name:', googleUser.name || '未知');
        console.log('11. googleUser.accessToken:', googleUser.accessToken ? '已獲取' : '未獲取');
    }
    console.log('12. tokenClient:', tokenClient ? '已初始化' : '未初始化');
    
    console.log('=== Google API 診斷結束 ===');
    
    // 建議用戶查看主控台輸出
    if (typeof notify === 'function') {
        notify('ℹ️', '診斷完成', '請檢查瀏覽器控制台以獲取詳細信息');
    }
}

// 右鍵點擊 Google 登入按鈕時執行診斷
document.addEventListener('DOMContentLoaded', function() {
    const googleSignInBtn = document.getElementById('googleSignInBtn');
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            diagnoseGoogleApi();
            return false;
        });
    }
});
