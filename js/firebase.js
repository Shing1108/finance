// firebase.js - Firebase 集成功能

// 全局變量用於跟踪同步過程
let syncInProgress = false;

// 創建全局對象來存放所有Firebase集成功能
window.firebaseIntegration = {};

// 初始化Firebase
window.firebaseIntegration.initFirebase = function () {
    console.log("初始化Firebase...");

    const firebaseConfig = {
        apiKey: "AIzaSyAaqadmDSgQ-huvY7uNNrPtjFSOl93jVEE",
        authDomain: "finance-d8f9e.firebaseapp.com",
        projectId: "finance-d8f9e",
        storageBucket: "finance-d8f9e.firebasestorage.app",
        messagingSenderId: "122645255279",
        appId: "1:122645255279:web:25d577b6365c819ffbe99a"
    };

    // 初始化Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    db = firebase.firestore();

    // 設置離線持久化
    db.enablePersistence()
        .catch((err) => {
            if (err.code == 'failed-precondition') {
                console.warn('Firebase持久化需要單一標籤頁');
            } else if (err.code == 'unimplemented') {
                console.warn('您的瀏覽器不支持所需的功能');
            }
        });

    // 檢查登入狀態
    return new Promise((resolve, reject) => {
        firebase.auth().onAuthStateChanged((userObj) => {
            if (userObj) {
                isLoggedIn = true;
                user = userObj;
                console.log("用戶已登入:", user.email);

                // 獲取用戶的最新數據
                window.firebaseIntegration.fetchUserData();
            } else {
                isLoggedIn = false;
                user = null;
                console.log("用戶未登入");
            }
            updateSyncStatus();
            resolve();
        }, reject);
    });
};

// 使用Google登入
window.firebaseIntegration.handleLogin = function () {
    console.log("嘗試Google登入...");
    currentlyLoading = true;
    document.getElementById('loadingOverlay').style.display = 'flex';

    const provider = new firebase.auth.GoogleAuthProvider();

    firebase.auth().signInWithPopup(provider)
        .then((result) => {
            user = result.user;
            isLoggedIn = true;
            console.log("登入成功:", user.email);

            // 檢查用戶是否是新用戶
            return db.collection('users').doc(user.uid).get();
        })
        .then((doc) => {
            if (doc.exists) {
                // 從Firebase加載數據
                return window.firebaseIntegration.fetchUserData();
            } else {
                // 新用戶：將本地數據上傳到Firebase
                return window.firebaseIntegration.createNewUserProfile();
            }
        })
        .then(() => {
            updateSyncUI();
            showToast('登入成功', 'success');

            // 設置實時同步
            const autoSync = localStorage.getItem('autoSync') === 'true';
            if (autoSync) {
                window.firebaseIntegration.setupRealtimeSync();
            }
        })
        .catch((error) => {
            console.error("登入失敗:", error);
            showToast('登入失敗: ' + error.message, 'error');
            isLoggedIn = false;
            user = null;
        })
        .finally(() => {
            currentlyLoading = false;
            document.getElementById('loadingOverlay').style.display = 'none';
        });
};

// 登出功能
window.firebaseIntegration.handleLogout = function () {
    console.log("嘗試登出...");

    // 如果有實時同步訂閱，先取消
    if (window.realtimeSyncUnsubscribe) {
        window.realtimeSyncUnsubscribe();
        window.realtimeSyncUnsubscribe = null;
    }

    firebase.auth().signOut()
        .then(() => {
            isLoggedIn = false;
            user = null;
            updateSyncUI();
            showToast('已成功登出', 'success');
        })
        .catch((error) => {
            console.error("登出失敗:", error);
            showToast('登出失敗: ' + error.message, 'error');
        });
};

// 創建新用戶檔案
window.firebaseIntegration.createNewUserProfile = function () {
    console.log("創建新用戶檔案...");

    if (!user) return Promise.reject("未登入");

    const userData = {
        accounts: appState.accounts,
        transactions: appState.transactions,
        categories: appState.categories,
        budgets: appState.budgets,
        settings: appState.settings,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    return db.collection('users').doc(user.uid).set(userData)
        .then(() => {
            console.log("新用戶檔案創建成功");
            localStorage.setItem('lastSyncTime', new Date().toISOString());
        });
};

// 從Firebase獲取用戶數據
window.firebaseIntegration.fetchUserData = function () {
    console.log("從Firebase獲取數據...");

    if (!user) return Promise.reject("未登入");

    return db.collection('users').doc(user.uid).get()
        .then((doc) => {
            if (doc.exists) {
                const data = doc.data();

                // 資料合併策略：檢查本地資料與雲端資料的時間戳
                const lastSyncTime = localStorage.getItem('lastSyncTime');

                if (lastSyncTime) {
                    const lastSync = new Date(lastSyncTime);
                    const cloudUpdated = data.updatedAt ? new Date(data.updatedAt.toDate()) : new Date(0);

                    if (cloudUpdated > lastSync) {
                        // 雲端資料較新，覆蓋本地資料
                        console.log("使用雲端資料 (較新)");
                        window.firebaseIntegration.importDataFromCloud(data);
                    } else {
                        // 本地資料較新，上傳到雲端
                        console.log("使用本地資料 (較新)");
                        window.firebaseIntegration.syncToFirebase();
                    }
                } else {
                    // 從未同步過，使用雲端資料
                    console.log("從未同步過，使用雲端資料");
                    window.firebaseIntegration.importDataFromCloud(data);
                }
            } else {
                // 文檔不存在，創建新檔案
                return window.firebaseIntegration.createNewUserProfile();
            }
        });
};

// 從雲端導入數據
window.firebaseIntegration.importDataFromCloud = function (data) {
    console.log("從雲端導入數據...");

    // 避免在同步過程中導入（避免循環）
    if (syncInProgress) {
        console.log("同步進行中，跳過導入");
        return;
    }

    try {
        // 更新本地資料
        if (data.accounts) appState.accounts = data.accounts;
        if (data.transactions) appState.transactions = data.transactions;
        if (data.categories) {
            // 確保類別對象有正確的結構
            if (!data.categories.income) data.categories.income = [];
            if (!data.categories.expense) data.categories.expense = [];
            appState.categories = data.categories;
        }
        if (data.budgets) appState.budgets = data.budgets;
        if (data.settings) {
            // 保留本地設定的Firebase啟用狀態
            const enableFirebaseBackup = appState.settings.enableFirebase;
            appState.settings = data.settings;
            appState.settings.enableFirebase = enableFirebaseBackup;

            // 更新全局設置變量
            darkMode = appState.settings.darkMode || false;
            fontSize = appState.settings.fontSize || 'medium';
            defaultCurrency = appState.settings.defaultCurrency || 'HKD';
            decimalPlaces = appState.settings.decimalPlaces || 2;
            enableBudgetAlerts = appState.settings.enableBudgetAlerts || false;
            alertThreshold = appState.settings.alertThreshold || 80;

            // 應用設置
            applySettings();
        }

        // 更新UI和本地存儲
        updateAllUI();
        saveToLocalStorage();

        // 更新最後同步時間
        localStorage.setItem('lastSyncTime', new Date().toISOString());
    } catch (error) {
        console.error("導入雲端數據時出錯:", error);
        showToast('導入雲端數據時出錯: ' + error.message, 'error');
    }
};

// 同步到Firebase
window.firebaseIntegration.syncToFirebase = function () {
    console.log("同步數據到Firebase...");

    if (!enableFirebase) {
        console.log("Firebase同步未啟用");
        return Promise.resolve();
    }

    if (!isLoggedIn || !user) {
        console.error("同步失敗: 未登入");
        return Promise.reject("未登入");
    }

    // 防止重複同步
    if (syncInProgress) {
        console.log("同步已在進行中");
        return Promise.resolve();
    }

    syncInProgress = true;

    // 準備要同步的數據
    const syncData = {
        accounts: appState.accounts,
        transactions: appState.transactions,
        categories: appState.categories,
        budgets: appState.budgets,
        settings: appState.settings,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    // 使用批量寫入減少網絡請求
    return db.collection('users').doc(user.uid).set(syncData, { merge: true })
        .then(() => {
            console.log("數據同步成功");
            localStorage.setItem('lastSyncTime', new Date().toISOString());
            updateSyncUI();
            return true;
        })
        .catch((error) => {
            console.error("同步失敗:", error);
            throw error;
        })
        .finally(() => {
            syncInProgress = false;
        });
};

// 立即同步按鈕處理函數
window.firebaseIntegration.syncNow = function () {
    console.log("執行立即同步...");

    if (!enableFirebase) {
        showToast('請先在設定中啟用雲端同步', 'error');
        return;
    }

    if (!isLoggedIn) {
        showToast('請先登入以同步數據', 'error');
        return;
    }

    // 顯示載入動畫
    document.getElementById('loadingOverlay').style.display = 'flex';
    currentlyLoading = true;

    window.firebaseIntegration.syncToFirebase()
        .then(() => {
            showToast('數據同步成功', 'success');
        })
        .catch((error) => {
            showToast('同步失敗: ' + error.message, 'error');
        })
        .finally(() => {
            document.getElementById('loadingOverlay').style.display = 'none';
            currentlyLoading = false;
        });
};

// 設置實時數據監聽
window.firebaseIntegration.setupRealtimeSync = function () {
    if (!isLoggedIn || !user || !enableFirebase) return;

    console.log("設置實時數據監聽...");

    // 獲取自動同步設置
    const autoSync = localStorage.getItem('autoSync') === 'true';

    if (!autoSync) {
        console.log("自動同步未啟用");
        return;
    }

    // 如果已經有訂閱，先取消
    if (window.realtimeSyncUnsubscribe) {
        window.realtimeSyncUnsubscribe();
    }

    // 監聽雲端數據變化
    const unsubscribe = db.collection('users').doc(user.uid)
        .onSnapshot((doc) => {
            if (!doc.exists) return;

            const data = doc.data();
            const lastSyncTime = localStorage.getItem('lastSyncTime');

            if (lastSyncTime) {
                const lastSync = new Date(lastSyncTime);
                const cloudUpdated = data.updatedAt ? new Date(data.updatedAt.toDate()) : new Date(0);

                // 只有當雲端更新時間比本地同步時間新，且不是由當前設備更新時，才更新本地數據
                if (cloudUpdated > lastSync && !syncInProgress && !currentlyLoading) {
                    console.log("檢測到雲端數據更新，自動同步中...");
                    window.firebaseIntegration.importDataFromCloud(data);
                    showToast('已從雲端同步最新數據', 'info');
                }
            }
        }, (error) => {
            console.error("實時同步錯誤:", error);
        });

    // 存儲取消訂閱函數
    window.realtimeSyncUnsubscribe = unsubscribe;
};

// 處理實時數據衝突
window.firebaseIntegration.handleDataConflict = function (localData, cloudData) {
    console.log("處理數據衝突...");

    // 這個函數可以實現更複雜的衝突解決策略
    // 目前簡單地選擇較新的數據

    // 獲取最後更新時間
    const localUpdated = localData.updatedAt ? new Date(localData.updatedAt) : new Date(0);
    const cloudUpdated = cloudData.updatedAt ? new Date(cloudData.updatedAt.toDate()) : new Date(0);

    if (cloudUpdated > localUpdated) {
        console.log("使用雲端數據 (較新)");
        window.firebaseIntegration.importDataFromCloud(cloudData);
        return true;
    } else {
        console.log("使用本地數據 (較新)");
        window.firebaseIntegration.syncToFirebase();
        return false;
    }
};

// 真實匯率API整合
window.firebaseIntegration.updateExchangeRates = async function () {
    try {
        // 顯示載入中提示
        showToast('正在更新匯率...', 'info');

        // 這裡使用真實的匯率API
        const apiKey = '7c54ea3dee46895c929cfeb0'; // 您的匯率API密鑰
        const response = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`);

        if (!response.ok) {
            throw new Error(`API請求失敗: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.result !== 'success') {
            throw new Error(`API錯誤: ${data.error || '未知錯誤'}`);
        }

        // 處理API返回的數據
        const rates = data.conversion_rates;
        const currencies = ['HKD', 'USD', 'CNY', 'EUR', 'GBP', 'JPY'];
        const updatedRates = {};

        // 構建我們需要的匯率格式
        currencies.forEach(fromCurrency => {
            updatedRates[fromCurrency] = {};

            currencies.forEach(toCurrency => {
                if (fromCurrency === toCurrency) continue;

                // 使用交叉匯率計算（通過USD中轉）
                const fromRate = fromCurrency === 'USD' ? 1 : rates[fromCurrency];
                const toRate = toCurrency === 'USD' ? 1 : rates[toCurrency];

                // 計算從 fromCurrency 到 toCurrency 的匯率
                updatedRates[fromCurrency][toCurrency] = toRate / fromRate;
            });
        });

        // 更新本地匯率
        exchangeRates = updatedRates;

        // 保存到本地存儲
        localStorage.setItem('exchangeRates', JSON.stringify({
            rates: updatedRates,
            lastUpdated: new Date().toISOString()
        }));

        // 更新UI
        if (typeof updateExchangeRateTable === 'function') {
            updateExchangeRateTable();
        }

        // 同步匯率到雲端
        if (enableFirebase && isLoggedIn) {
            db.collection('users').doc(user.uid).update({
                exchangeRates: {
                    rates: updatedRates,
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                }
            }).catch(err => {
                console.error("同步匯率到雲端失敗:", err);
            });
        }

        showToast('匯率已更新', 'success');
        return true;
    } catch (error) {
        console.error("更新匯率時發生錯誤:", error);
        showToast('更新匯率失敗: ' + error.message, 'error');
        return false;
    }
};

// 從Firebase獲取匯率
window.firebaseIntegration.fetchExchangeRates = function () {
    if (!enableFirebase || !isLoggedIn || !user) return Promise.resolve(false);

    console.log("從Firebase獲取匯率...");

    return db.collection('users').doc(user.uid).get()
        .then((doc) => {
            if (doc.exists && doc.data().exchangeRates) {
                const cloudRates = doc.data().exchangeRates;

                // 檢查本地匯率是否需要更新
                const localRatesJson = localStorage.getItem('exchangeRates');
                if (localRatesJson) {
                    try {
                        const localRates = JSON.parse(localRatesJson);
                        const localUpdated = new Date(localRates.lastUpdated);
                        const cloudUpdated = cloudRates.lastUpdated ? new Date(cloudRates.lastUpdated.toDate()) : new Date(0);

                        if (cloudUpdated > localUpdated) {
                            // 雲端匯率較新，使用雲端匯率
                            console.log("使用雲端匯率 (較新)");
                            exchangeRates = cloudRates.rates;

                            // 保存到本地
                            localStorage.setItem('exchangeRates', JSON.stringify({
                                rates: cloudRates.rates,
                                lastUpdated: cloudUpdated.toISOString()
                            }));

                            return true;
                        }
                    } catch (e) {
                        console.error("解析本地匯率時出錯:", e);
                    }
                } else {
                    // 沒有本地匯率，使用雲端匯率
                    exchangeRates = cloudRates.rates;

                    // 保存到本地
                    localStorage.setItem('exchangeRates', JSON.stringify({
                        rates: cloudRates.rates,
                        lastUpdated: new Date().toISOString()
                    }));

                    return true;
                }
            }

            return false;
        })
        .catch((error) => {
            console.error("獲取雲端匯率失敗:", error);
            return false;
        });
};

// 自動備份功能
window.firebaseIntegration.createBackup = function (manual = false) {
    if (!enableFirebase || !isLoggedIn || !user) {
        if (manual) {
            showToast('備份失敗: 請先啟用雲端同步並登入', 'error');
        }
        return Promise.resolve(false);
    }

    console.log("創建數據備份...");

    // 準備備份數據
    const backupData = {
        accounts: appState.accounts,
        transactions: appState.transactions,
        categories: appState.categories,
        budgets: appState.budgets,
        settings: appState.settings,
        exchangeRates: exchangeRates,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    // 創建備份名稱
    const now = new Date();
    const backupName = `backup_${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;

    // 保存備份
    return db.collection('users').doc(user.uid)
        .collection('backups').doc(backupName)
        .set(backupData)
        .then(() => {
            console.log("備份創建成功");
            if (manual) {
                showToast('備份創建成功', 'success');
            }
            return true;
        })
        .catch((error) => {
            console.error("備份創建失敗:", error);
            if (manual) {
                showToast('備份創建失敗: ' + error.message, 'error');
            }
            return false;
        });
};

// 獲取備份列表
window.firebaseIntegration.getBackupsList = function () {
    if (!enableFirebase || !isLoggedIn || !user) {
        return Promise.resolve([]);
    }

    console.log("獲取備份列表...");

    return db.collection('users').doc(user.uid)
        .collection('backups')
        .orderBy('createdAt', 'desc')
        .get()
        .then((snapshot) => {
            const backups = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                backups.push({
                    id: doc.id,
                    createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
                    size: JSON.stringify(data).length
                });
            });
            return backups;
        })
        .catch((error) => {
            console.error("獲取備份列表失敗:", error);
            return [];
        });
};

// 還原備份
window.firebaseIntegration.restoreBackup = function (backupId) {
    if (!enableFirebase || !isLoggedIn || !user) {
        showToast('還原失敗: 請先啟用雲端同步並登入', 'error');
        return Promise.resolve(false);
    }

    console.log(`還原備份: ${backupId}`);

    // 顯示載入動畫
    document.getElementById('loadingOverlay').style.display = 'flex';
    currentlyLoading = true;

    return db.collection('users').doc(user.uid)
        .collection('backups').doc(backupId)
        .get()
        .then((doc) => {
            if (doc.exists) {
                const backupData = doc.data();

                // 還原數據
                if (backupData.accounts) appState.accounts = backupData.accounts;
                if (backupData.transactions) appState.transactions = backupData.transactions;
                if (backupData.categories) appState.categories = backupData.categories;
                if (backupData.budgets) appState.budgets = backupData.budgets;
                if (backupData.settings) {
                    // 保留Firebase啟用狀態
                    const enableFirebaseBackup = appState.settings.enableFirebase;
                    appState.settings = backupData.settings;
                    appState.settings.enableFirebase = enableFirebaseBackup;
                }
                if (backupData.exchangeRates) exchangeRates = backupData.exchangeRates;

                // 更新UI和本地存儲
                updateAllUI();
                saveToLocalStorage();

                // 同步回Firebase
                return window.firebaseIntegration.syncToFirebase();
            } else {
                throw new Error("找不到備份");
            }
        })
        .then(() => {
            showToast('備份還原成功', 'success');
            return true;
        })
        .catch((error) => {
            console.error("還原備份失敗:", error);
            showToast('還原備份失敗: ' + error.message, 'error');
            return false;
        })
        .finally(() => {
            document.getElementById('loadingOverlay').style.display = 'none';
            currentlyLoading = false;
        });
};

// 刪除備份
window.firebaseIntegration.deleteBackup = function (backupId) {
    if (!enableFirebase || !isLoggedIn || !user) {
        showToast('刪除失敗: 請先啟用雲端同步並登入', 'error');
        return Promise.resolve(false);
    }

    console.log(`刪除備份: ${backupId}`);

    return db.collection('users').doc(user.uid)
        .collection('backups').doc(backupId)
        .delete()
        .then(() => {
            showToast('備份已刪除', 'success');
            return true;
        })
        .catch((error) => {
            console.error("刪除備份失敗:", error);
            showToast('刪除備份失敗: ' + error.message, 'error');
            return false;
        });
};

// 對外公開的函數
function initFirebase() {
    return window.firebaseIntegration.initFirebase();
}

function handleLogin() {
    return window.firebaseIntegration.handleLogin();
}

function handleLogout() {
    return window.firebaseIntegration.handleLogout();
}

function syncToFirebase() {
    return window.firebaseIntegration.syncToFirebase();
}

function syncNow() {
    return window.firebaseIntegration.syncNow();
}

async function updateExchangeRates() {
    return window.firebaseIntegration.updateExchangeRates();
}

// 更新連接狀態
function updateSyncStatus() {
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

// 添加DOMContentLoaded事件監聽器
document.addEventListener('DOMContentLoaded', function () {
    console.log("Firebase整合初始化完成");

    // 監聽自動同步切換
    const autoSyncCheckbox = document.getElementById('autoSync');
    if (autoSyncCheckbox) {
        autoSyncCheckbox.addEventListener('change', function () {
            localStorage.setItem('autoSync', this.checked);

            if (this.checked && isLoggedIn && enableFirebase) {
                window.firebaseIntegration.setupRealtimeSync();
            } else if (window.realtimeSyncUnsubscribe) {
                window.realtimeSyncUnsubscribe();
                window.realtimeSyncUnsubscribe = null;
            }
        });

        // 設置初始狀態
        autoSyncCheckbox.checked = localStorage.getItem('autoSync') === 'true';
    }

    // 初始化成功後獲取Cloud匯率
    if (enableFirebase && isLoggedIn) {
        window.firebaseIntegration.fetchExchangeRates();
    }

    // 添加備份按鈕事件（如果存在）
    const createBackupButton = document.getElementById('createBackupButton');
    if (createBackupButton) {
        createBackupButton.addEventListener('click', function () {
            window.firebaseIntegration.createBackup(true);
        });
    }

    // 設置自動備份（每天）
    const lastBackupDate = localStorage.getItem('lastBackupDate');
    const today = new Date().toISOString().split('T')[0];

    if ((!lastBackupDate || lastBackupDate !== today) && enableFirebase && isLoggedIn) {
        // 執行自動備份
        window.firebaseIntegration.createBackup(false).then((success) => {
            if (success) {
                localStorage.setItem('lastBackupDate', today);
            }
        });
    }

    // 初始設置實時同步
    if (enableFirebase && isLoggedIn) {
        window.firebaseIntegration.setupRealtimeSync();
    }
});