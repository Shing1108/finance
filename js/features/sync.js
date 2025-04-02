// sync.js - 同步功能

// Firebase同步模塊
window.firebaseSync = {
    /**
     * 初始化Firebase
     */
    initFirebase: async function() {
        console.log("初始化Firebase");
        
        try {
            // 檢查Firebase是否已載入
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase SDK未載入');
            }
            
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
            
            // 初始化Firebase應用
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            
            // 初始化Firestore
            db = firebase.firestore();
            
            // 檢查用戶是否已登錄
            firebase.auth().onAuthStateChanged(function(loggedInUser) {
                if (loggedInUser) {
                    console.log("用戶已登錄:", loggedInUser.email);
                    user = loggedInUser;
                    isLoggedIn = true;
                    
                    // 更新用戶界面
                    updateSyncUI();
                    
                    // 獲取遠程數據
                    if (!syncInProgress) {
                        getDataFromFirebase();
                    }
                } else {
                    console.log("用戶未登錄");
                    user = null;
                    isLoggedIn = false;
                    
                    // 更新用戶界面
                    updateSyncUI();
                }
            });
            
            console.log("Firebase初始化成功");
            return true;
        } catch (error) {
            console.error("初始化Firebase時發生錯誤:", error);
            throw error;
        }
    },
    
    /**
     * 處理用戶登錄
     */
    handleLogin: async function() {
        console.log("處理用戶登錄");
        
        try {
            // 檢查Firebase是否已初始化
            if (!firebase || !firebase.auth) {
                await this.initFirebase();
            }
            
            // 創建Google Auth提供者
            const provider = new firebase.auth.GoogleAuthProvider();
            
            // 顯示登錄視窗
            const result = await firebase.auth().signInWithPopup(provider);
            
            // 獲取用戶信息
            user = result.user;
            isLoggedIn = true;
            
            console.log("用戶登錄成功:", user.email);
            
            // 更新UI
            updateSyncUI();
            
            // 獲取遠程數據
            getDataFromFirebase();
            
            // 顯示成功消息
            showToast(`已登入: ${user.email}`, 'success');
        } catch (error) {
            console.error("登錄時發生錯誤:", error);
            showToast('登錄失敗: ' + error.message, 'error');
        }
    },
    
    /**
     * 處理用戶登出
     */
    handleLogout: async function() {
        console.log("處理用戶登出");
        
        try {
            // 檢查Firebase是否已初始化
            if (!firebase || !firebase.auth) {
                throw new Error('Firebase未初始化');
            }
            
            // 登出
            await firebase.auth().signOut();
            
            // 更新狀態
            user = null;
            isLoggedIn = false;
            
            // 更新UI
            updateSyncUI();
            
            // 顯示成功消息
            showToast('已登出', 'success');
        } catch (error) {
            console.error("登出時發生錯誤:", error);
            showToast('登出失敗: ' + error.message, 'error');
        }
    },
    
    /**
     * 立即同步數據
     */
    syncNow: async function() {
        console.log("立即同步數據");
        
        try {
            // 檢查是否已登錄
            if (!isLoggedIn || !user) {
                showToast('請先登錄以同步數據', 'error');
                return;
            }
            
            // 檢查是否有同步進行中
            if (syncInProgress) {
                showToast('同步已在進行中，請稍後再試', 'warning');
                return;
            }
            
            // 顯示同步指示器
            const syncButton = document.getElementById('syncNowButton');
            if (syncButton) {
                syncButton.innerHTML = '<i class="fas fa-sync fa-spin"></i> 同步中...';
                syncButton.disabled = true;
            }
            
            // 設置同步標誌
            syncInProgress = true;
            
            // 執行同步
            await syncToFirebase();
            
            // 完成同步
            syncInProgress = false;
            
            // 恢復按鈕
            if (syncButton) {
                syncButton.innerHTML = '立即同步';
                syncButton.disabled = false;
            }
            
            // 更新UI
            updateSyncUI();
            
            // 顯示成功消息
            showToast('同步完成', 'success');
        } catch (error) {
            console.error("同步數據時發生錯誤:", error);
            
            // 重置同步標誌
            syncInProgress = false;
            
            // 恢復按鈕
            const syncButton = document.getElementById('syncNowButton');
            if (syncButton) {
                syncButton.innerHTML = '立即同步';
                syncButton.disabled = false;
            }
            
            // 顯示錯誤消息
            showToast('同步失敗: ' + error.message, 'error');
        }
    }
};

/**
 * 將數據同步到Firebase
 */
async function syncToFirebase() {
    console.log("同步數據到Firebase");
    
    try {
        // 檢查是否已登錄
        if (!isLoggedIn || !user) {
            throw new Error('用戶未登錄');
        }
        
        // 檢查Firestore是否已初始化
        if (!db) {
            throw new Error('Firestore未初始化');
        }
        
        // 獲取用戶文檔引用
        const userDocRef = db.collection('users').doc(user.uid);
        
        // 準備要儲存的數據
        const data = {
            accounts: appState.accounts,
            transactions: appState.transactions,
            categories: appState.categories,
            budgets: appState.budgets,
            savingsGoals: appState.savingsGoals,
            lastSync: new Date().toISOString()
        };
        
        // 寫入數據
        await userDocRef.set(data, { merge: true });
        
        console.log("數據已同步到Firebase");
        
        // 更新上次同步時間
        updateLastSyncTime(new Date().toISOString());
        
        return true;
    } catch (error) {
        console.error("同步數據到Firebase時發生錯誤:", error);
        throw error;
    }
}

/**
 * 從Firebase獲取數據
 */
async function getDataFromFirebase() {
    console.log("從Firebase獲取數據");
    
    try {
        // 檢查是否已登錄
        if (!isLoggedIn || !user) {
            throw new Error('用戶未登錄');
        }
        
        // 檢查Firestore是否已初始化
        if (!db) {
            throw new Error('Firestore未初始化');
        }
        
        // 標記為正在同步
        syncInProgress = true;
        
        // 獲取用戶文檔引用
        const userDocRef = db.collection('users').doc(user.uid);
        
        // 獲取數據
        const doc = await userDocRef.get();
        
        if (doc.exists) {
            console.log("從Firebase獲取數據成功");
            
            // 獲取數據
            const data = doc.data();
            
            // 檢查是否有有效數據
            if (data.accounts || data.transactions || data.categories) {
                // 詢問用戶如何處理數據
                const result = await new Promise((resolve) => {
                    showDataMergeDialog(resolve);
                });
                
                if (result === 'remote') {
                    // 使用遠程數據
                    if (data.accounts) appState.accounts = data.accounts;
                    if (data.transactions) appState.transactions = data.transactions;
                    if (data.categories) appState.categories = data.categories;
                    if (data.budgets) appState.budgets = data.budgets;
                    if (data.savingsGoals) appState.savingsGoals = data.savingsGoals;
                    
                    // 保存到本地存儲
                    saveToLocalStorage();
                    
                    // 更新UI
                    updateAllUI();
                    
                    // 顯示成功消息
                    showToast('已從雲端同步數據', 'success');
                } else if (result === 'local') {
                    // 使用本地數據，將其上傳到Firebase
                    await syncToFirebase();
                    
                    // 顯示成功消息
                    showToast('已上傳本地數據到雲端', 'success');
                } else if (result === 'merge') {
                    // 合併數據
                    mergeData(data);
                    
                    // 保存到本地存儲
                    saveToLocalStorage();
                    
                    // 同步回Firebase
                    await syncToFirebase();
                    
                    // 更新UI
                    updateAllUI();
                    
                    // 顯示成功消息
                    showToast('已合併本地和雲端數據', 'success');
                }
            } else {
                // 沒有有效的遠程數據，將本地數據上傳
                await syncToFirebase();
                
                // 顯示成功消息
                showToast('已上傳本地數據到雲端', 'success');
            }
            
            // 更新上次同步時間
            if (data.lastSync) {
                updateLastSyncTime(data.lastSync);
            } else {
                updateLastSyncTime(new Date().toISOString());
            }
        } else {
            console.log("未找到遠程數據，將創建新文檔");
            
            // 上傳本地數據
            await syncToFirebase();
            
            // 顯示成功消息
            showToast('已創建雲端數據', 'success');
        }
    } catch (error) {
        console.error("從Firebase獲取數據時發生錯誤:", error);
        showToast('從雲端獲取數據失敗: ' + error.message, 'error');
    } finally {
        // 取消標記為正在同步
        syncInProgress = false;
        
        // 更新UI
        updateSyncUI();
    }
}

/**
 * 顯示數據合併對話框
 * @param {Function} callback 回調函數
 */
function showDataMergeDialog(callback) {
    // 創建對話框
    const dialogHTML = `
    <div id="dataMergeDialog" class="modal active">
        <div class="modal-content">
            <div class="modal-header">
                <h3>數據同步</h3>
            </div>
            <div class="modal-body">
                <p>檢測到雲端有數據，請選擇如何處理：</p>
                <div class="merge-options">
                    <button id="useRemoteData" class="btn btn-primary">使用雲端數據</button>
                    <button id="useLocalData" class="btn btn-secondary">使用本地數據</button>
                    <button id="mergeData" class="btn">合併數據</button>
                </div>
                <p class="mt-2"><small>使用雲端數據將覆蓋您的本地數據，使用本地數據將覆蓋雲端數據，合併將嘗試保留兩邊的數據。</small></p>
            </div>
        </div>
    </div>
    `;
    
    // 添加對話框到文檔
    document.body.insertAdjacentHTML('beforeend', dialogHTML);
    
    // 獲取對話框和按鈕
    const dialog = document.getElementById('dataMergeDialog');
    const useRemoteButton = document.getElementById('useRemoteData');
    const useLocalButton = document.getElementById('useLocalData');
    const mergeButton = document.getElementById('mergeData');
    
    // 綁定事件
    useRemoteButton.addEventListener('click', function() {
        document.body.removeChild(dialog);
        callback('remote');
    });
    
    useLocalButton.addEventListener('click', function() {
        document.body.removeChild(dialog);
        callback('local');
    });
    
    mergeButton.addEventListener('click', function() {
        document.body.removeChild(dialog);
        callback('merge');
    });
}

/**
 * 合併本地和遠程數據
 * @param {Object} remoteData 遠程數據
 */
function mergeData(remoteData) {
    console.log("合併數據");
    
    try {
        // 合併賬戶
        if (remoteData.accounts && remoteData.accounts.length > 0) {
            const mergedAccounts = [...appState.accounts];
            
            remoteData.accounts.forEach(remoteAccount => {
                const localIndex = mergedAccounts.findIndex(local => local.id === remoteAccount.id);
                
                if (localIndex === -1) {
                    // 本地不存在此賬戶，添加
                    mergedAccounts.push(remoteAccount);
                } else {
                    // 本地存在此賬戶，以最新更新時間為準
                    const localAccount = mergedAccounts[localIndex];
                    
                    if (remoteAccount.updatedAt && (!localAccount.updatedAt || remoteAccount.updatedAt > localAccount.updatedAt)) {
                        mergedAccounts[localIndex] = remoteAccount;
                    }
                }
            });
            
            appState.accounts = mergedAccounts;
        }
        
        // 合併交易
        if (remoteData.transactions && remoteData.transactions.length > 0) {
            const mergedTransactions = [...appState.transactions];
            
            remoteData.transactions.forEach(remoteTransaction => {
                const localIndex = mergedTransactions.findIndex(local => local.id === remoteTransaction.id);
                
                if (localIndex === -1) {
                    // 本地不存在此交易，添加
                    mergedTransactions.push(remoteTransaction);
                } else {
                    // 本地存在此交易，以最新更新時間為準
                    const localTransaction = mergedTransactions[localIndex];
                    
                    if (remoteTransaction.updatedAt && (!localTransaction.updatedAt || remoteTransaction.updatedAt > localTransaction.updatedAt)) {
                        mergedTransactions[localIndex] = remoteTransaction;
                    }
                }
            });
            
            appState.transactions = mergedTransactions;
        }
        
        // 合併類別
        if (remoteData.categories) {
            // 合併收入類別
            if (remoteData.categories.income && remoteData.categories.income.length > 0) {
                const mergedIncomeCategories = [...appState.categories.income];
                
                remoteData.categories.income.forEach(remoteCategory => {
                    const localIndex = mergedIncomeCategories.findIndex(local => local.id === remoteCategory.id);
                    
                    if (localIndex === -1) {
                        // 本地不存在此類別，添加
                        mergedIncomeCategories.push(remoteCategory);
                    } else {
                        // 本地存在此類別，以最新更新時間為準
                        const localCategory = mergedIncomeCategories[localIndex];
                        
                        if (remoteCategory.updatedAt && (!localCategory.updatedAt || remoteCategory.updatedAt > localCategory.updatedAt)) {
                            mergedIncomeCategories[localIndex] = remoteCategory;
                        }
                    }
                });
                
                appState.categories.income = mergedIncomeCategories;
            }
            
            // 合併支出類別
            if (remoteData.categories.expense && remoteData.categories.expense.length > 0) {
                const mergedExpenseCategories = [...appState.categories.expense];
                
                remoteData.categories.expense.forEach(remoteCategory => {
                    const localIndex = mergedExpenseCategories.findIndex(local => local.id === remoteCategory.id);
                    
                    if (localIndex === -1) {
                        // 本地不存在此類別，添加
                        mergedExpenseCategories.push(remoteCategory);
                    } else {
                        // 本地存在此類別，以最新更新時間為準
                        const localCategory = mergedExpenseCategories[localIndex];
                        
                        if (remoteCategory.updatedAt && (!localCategory.updatedAt || remoteCategory.updatedAt > localCategory.updatedAt)) {
                            mergedExpenseCategories[localIndex] = remoteCategory;
                        }
                    }
                });
                
                appState.categories.expense = mergedExpenseCategories;
            }
        }
        
        // 合併預算
        if (remoteData.budgets) {
            // 可以簡單地以最新的預算設置為準
            const localUpdatedAt = appState.budgets.updatedAt || '1970-01-01T00:00:00.000Z';
            const remoteUpdatedAt = remoteData.budgets.updatedAt || '1970-01-01T00:00:00.000Z';
            
            if (remoteUpdatedAt > localUpdatedAt) {
                appState.budgets = remoteData.budgets;
            }
        }
        
        // 合併儲蓄目標
        if (remoteData.savingsGoals && remoteData.savingsGoals.length > 0) {
            const mergedSavingsGoals = [...(appState.savingsGoals || [])];
            
            remoteData.savingsGoals.forEach(remoteGoal => {
                const localIndex = mergedSavingsGoals.findIndex(local => local.id === remoteGoal.id);
                
                if (localIndex === -1) {
                    // 本地不存在此目標，添加
                    mergedSavingsGoals.push(remoteGoal);
                } else {
                    // 本地存在此目標，以最新更新時間為準
                    const localGoal = mergedSavingsGoals[localIndex];
                    
                    if (remoteGoal.updatedAt && (!localGoal.updatedAt || remoteGoal.updatedAt > localGoal.updatedAt)) {
                        mergedSavingsGoals[localIndex] = remoteGoal;
                    } else if (localGoal.updatedAt && remoteGoal.updatedAt && localGoal.updatedAt === remoteGoal.updatedAt) {
                        // 相同的更新時間，合併進度歷史
                        const mergedHistory = [...(localGoal.progressHistory || [])];
                        
                        if (remoteGoal.progressHistory) {
                            remoteGoal.progressHistory.forEach(remoteRecord => {
                                if (!mergedHistory.some(local => local.createdAt === remoteRecord.createdAt)) {
                                    mergedHistory.push(remoteRecord);
                                }
                            });
                        }
                        
                        // 按日期排序
                        mergedHistory.sort((a, b) => 
                            new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt)
                        );
                        
                        // 更新進度歷史和當前金額
                        localGoal.progressHistory = mergedHistory;
                        
                        // 重新計算當前金額
                        localGoal.current = mergedHistory.reduce((sum, record) => sum + record.amount, 0);
                        
                        mergedSavingsGoals[localIndex] = localGoal;
                    }
                }
            });
            
            appState.savingsGoals = mergedSavingsGoals;
        }
    } catch (error) {
        console.error("合併數據時發生錯誤:", error);
        throw error;
    }
}

/**
 * 更新同步狀態UI
 */
function updateSyncUI() {
    console.log("更新同步狀態UI");
    
    try {
        // 更新登錄狀態
        const loginStatus = document.getElementById('loginStatus');
        const loginButton = document.getElementById('loginButton');
        const logoutButton = document.getElementById('logoutButton');
        const autoSyncCheckbox = document.getElementById('autoSync');
        
        if (loginStatus) {
            if (isLoggedIn && user) {
                loginStatus.innerHTML = `已登入: <strong>${user.email}</strong>`;
                loginStatus.className = 'status-connected';
            } else {
                loginStatus.innerHTML = '未登入';
                loginStatus.className = '';
            }
        }
        
        if (loginButton && logoutButton) {
            if (isLoggedIn) {
                loginButton.style.display = 'none';
                logoutButton.style.display = 'block';
            } else {
                loginButton.style.display = 'block';
                logoutButton.style.display = 'none';
            }
        }
        
        // 更新同步按鈕狀態
        const syncNowButton = document.getElementById('syncNowButton');
        if (syncNowButton) {
            syncNowButton.disabled = !isLoggedIn || syncInProgress;
            
            if (syncInProgress) {
                syncNowButton.innerHTML = '<i class="fas fa-sync fa-spin"></i> 同步中...';
            } else {
                syncNowButton.innerHTML = '立即同步';
            }
        }
        
        // 更新自動同步複選框
        if (autoSyncCheckbox) {
            autoSyncCheckbox.disabled = !isLoggedIn;
            autoSyncCheckbox.checked = isLoggedIn && localStorage.getItem('autoSync') === 'true';
        }
    } catch (error) {
        console.error("更新同步狀態UI時發生錯誤:", error);
    }
}

/**
 * 更新同步狀態
 */
function updateSyncStatus() {
    // 更新連接狀態
    const connectionStatus = document.querySelector('.connection-status');
    
    if (connectionStatus) {
        if (isLoggedIn) {
            if (syncInProgress) {
                connectionStatus.innerHTML = '<i class="fas fa-sync fa-spin"></i> 同步中...';
                connectionStatus.className = 'connection-status status-checking';
            } else {
                connectionStatus.innerHTML = '<i class="fas fa-check-circle"></i> 已連接雲端';
                connectionStatus.className = 'connection-status status-connected';
            }
        } else if (enableFirebase) {
            connectionStatus.innerHTML = '<i class="fas fa-times-circle"></i> 未連接雲端';
            connectionStatus.className = 'connection-status status-disconnected';
        } else {
            connectionStatus.innerHTML = '<i class="fas fa-cloud-slash"></i> 未啟用雲端同步';
            connectionStatus.className = 'connection-status status-offline';
        }
    }
}

/**
 * 更新上次同步時間
 * @param {string} timestamp ISO格式的時間戳
 */
function updateLastSyncTime(timestamp) {
    const lastSyncTime = document.getElementById('lastSyncTime');
    
    if (lastSyncTime) {
        if (timestamp) {
            const date = new Date(timestamp);
            lastSyncTime.textContent = date.toLocaleString();
        } else {
            lastSyncTime.textContent = '從未同步';
        }
    }
}

// 導出函數
window.initFirebase = window.firebaseSync.initFirebase;
window.handleLogin = window.firebaseSync.handleLogin;
window.handleLogout = window.firebaseSync.handleLogout;
window.syncNow = window.firebaseSync.syncNow;
window.syncToFirebase = syncToFirebase;
window.getDataFromFirebase = getDataFromFirebase;
window.updateSyncUI = updateSyncUI;
window.updateSyncStatus = updateSyncStatus;
