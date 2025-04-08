/**
 * sync.js - 同步功能實現
 */

const SyncManager = {
    /**
     * Firebase 配置
     */
    firebaseConfig: {
        apiKey: "YOUR_API_KEY",
        authDomain: "your-app-name.firebaseapp.com",
        projectId: "your-app-name",
        storageBucket: "your-app-name.appspot.com",
        messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
        appId: "YOUR_APP_ID"
    },
    
    /**
     * Firebase 引用
     */
    firebase: null,
    
    /**
     * 當前使用者
     */
    currentUser: null,
    
    /**
     * 上次同步時間
     */
    lastSyncTime: null,
    
    /**
     * 初始化同步管理器
     */
    init: function() {
        // 如果已經初始化，則返回
        if (this.firebase) {
            return;
        }
        
        try {
            // 初始化 Firebase
            this.firebase = firebase.initializeApp(this.firebaseConfig);
            
            // 取得上次同步時間
            this.lastSyncTime = Utils.getFromLocalStorage('lastSyncTime');
            
            // 檢查登入狀態
            this._checkAuthState();
            
            // 綁定按鈕事件
            this._bindEvents();
            
            // 自動同步設定
            this._setupAutoSync();
            
            console.log('同步管理器初始化完成');
        } catch (error) {
            console.error('初始化同步管理器失敗', error);
            Utils.showToast('初始化同步服務失敗', 'error');
        }
    },
    
    /**
     * 檢查登入狀態
     */
    _checkAuthState: function() {
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                // 使用者已登入
                this.currentUser = user;
                document.getElementById('loginStatus').textContent = `已登入: ${user.email}`;
                document.getElementById('loginButton').style.display = 'none';
                document.getElementById('logoutButton').style.display = 'inline-block';
                
                // 自動同步資料
                if (Utils.getFromLocalStorage('autoSync', false)) {
                    this.syncData();
                }
            } else {
                // 使用者未登入
                this.currentUser = null;
                document.getElementById('loginStatus').textContent = '未登入';
                document.getElementById('loginButton').style.display = 'inline-block';
                document.getElementById('logoutButton').style.display = 'none';
            }
        });
    },
    
    /**
     * 綁定按鈕事件
     */
    _bindEvents: function() {
        // 登入按鈕
        document.getElementById('loginButton').addEventListener('click', () => {
            this.login();
        });
        
        // 登出按鈕
        document.getElementById('logoutButton').addEventListener('click', () => {
            this.logout();
        });
        
        // 立即同步按鈕
        document.getElementById('syncNowButton').addEventListener('click', () => {
            this.syncData();
        });
        
        // 自動同步複選框
        document.getElementById('autoSync').addEventListener('change', event => {
            Utils.saveToLocalStorage('autoSync', event.target.checked);
        });
        
        // 匯出資料按鈕
        document.getElementById('exportDataButton').addEventListener('click', () => {
            App.exportData();
        });
        
        // 匯入資料按鈕
        document.getElementById('importDataButton').addEventListener('click', () => {
            const jsonData = document.getElementById('jsonImport').value;
            if (!jsonData) {
                Utils.showToast('請先貼上資料', 'error');
                return;
            }
            
            App.importData(jsonData);
        });
        
        // 檔案上傳
        document.getElementById('fileImport').addEventListener('change', event => {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const jsonData = e.target.result;
                    App.importData(jsonData);
                } catch (error) {
                    Utils.showToast('讀取檔案失敗', 'error');
                }
            };
            
            reader.readAsText(file);
        });
    },
    
    /**
     * 設定自動同步
     */
    _setupAutoSync: function() {
        // 設定複選框狀態
        document.getElementById('autoSync').checked = Utils.getFromLocalStorage('autoSync', false);
        
        // 監聽資料變更事件
        const events = [
            'accountAdded', 'accountUpdated', 'accountDeleted',
            'categoryAdded', 'categoryUpdated', 'categoryDeleted',
            'transactionAdded', 'transactionUpdated', 'transactionDeleted',
            'budgetAdded', 'budgetUpdated', 'budgetDeleted',
            'savingsGoalAdded', 'savingsGoalUpdated', 'savingsGoalDeleted',
            'settingsChanged'
        ];
        
        events.forEach(event => {
            EventBus.subscribe(event, () => {
                if (Utils.getFromLocalStorage('autoSync', false) && this.currentUser) {
                    // 延遲同步，避免頻繁操作導致的多次同步
                    clearTimeout(this.autoSyncTimeout);
                    this.autoSyncTimeout = setTimeout(() => {
                        this.syncData();
                    }, 2000);
                }
            });
        });
    },
    
    /**
     * 使用 Google 登入
     */
    login: function() {
        if (!this.firebase) {
            Utils.showToast('同步服務尚未初始化', 'error');
            return;
        }
        
        Utils.showLoading();
        
        const provider = new firebase.auth.GoogleAuthProvider();
        
        firebase.auth().signInWithPopup(provider)
            .then(result => {
                // 登入成功
                this.currentUser = result.user;
                Utils.showToast('登入成功', 'success');
                
                // 取得雲端資料
                this.fetchData();
            })
            .catch(error => {
                console.error('登入失敗', error);
                Utils.showToast('登入失敗: ' + error.message, 'error');
            })
            .finally(() => {
                Utils.hideLoading();
            });
    },
    
    /**
     * 登出
     */
    logout: function() {
        if (!this.firebase) {
            return;
        }
        
        Utils.showLoading();
        
        firebase.auth().signOut()
            .then(() => {
                this.currentUser = null;
                Utils.showToast('已登出', 'success');
            })
            .catch(error => {
                console.error('登出失敗', error);
                Utils.showToast('登出失敗: ' + error.message, 'error');
            })
            .finally(() => {
                Utils.hideLoading();
            });
    },
    
    /**
     * 同步資料
     */
    syncData: function() {
        if (!this.firebase || !this.currentUser) {
            Utils.showToast('請先登入', 'error');
            return;
        }
        
        Utils.showLoading();
        
        // 取得本地資料
        const localData = Store.exportData();
        
        // 上傳到雲端
        const db = firebase.firestore();
        const userRef = db.collection('users').doc(this.currentUser.uid);
        
        userRef.set({
            data: localData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            this.lastSyncTime = new Date();
            Utils.saveToLocalStorage('lastSyncTime', this.lastSyncTime);
            document.getElementById('lastSyncTime').textContent = this.lastSyncTime.toLocaleString();
            
            Utils.showToast('資料同步成功', 'success');
        })
        .catch(error => {
            console.error('同步資料失敗', error);
            Utils.showToast('同步資料失敗: ' + error.message, 'error');
        })
        .finally(() => {
            Utils.hideLoading();
        });
    },
    
    /**
     * 取得雲端資料
     */
    fetchData: function() {
        if (!this.firebase || !this.currentUser) {
            return;
        }
        
        Utils.showLoading();
        
        const db = firebase.firestore();
        const userRef = db.collection('users').doc(this.currentUser.uid);
        
        userRef.get()
            .then(doc => {
                if (doc.exists && doc.data().data) {
                    // 確認是否要合併資料
                    const cloudData = doc.data().data;
                    const cloudUpdateTime = doc.data().updatedAt?.toDate() || new Date();
                    
                    if (this.lastSyncTime && new Date(this.lastSyncTime) >= cloudUpdateTime) {
                        // 本地資料較新，上傳本地資料
                        Utils.showToast('本地資料較新，已上傳至雲端', 'info');
                        this.syncData();
                    } else {
                        // 雲端資料較新，詢問使用者是否替換
                        if (confirm('發現雲端資料，是否要加載？這將替換本地資料。')) {
                            // 載入雲端資料
                            Store.importData(cloudData);
                            
                            this.lastSyncTime = new Date();
                            Utils.saveToLocalStorage('lastSyncTime', this.lastSyncTime);
                            document.getElementById('lastSyncTime').textContent = this.lastSyncTime.toLocaleString();
                            
                            Utils.showToast('已加載雲端資料', 'success');
                        } else {
                            // 使用者選擇保留本地資料，上傳本地資料
                            this.syncData();
                        }
                    }
                } else {
                    // 雲端無資料，上傳本地資料
                    this.syncData();
                }
            })
            .catch(error => {
                console.error('取得雲端資料失敗', error);
                Utils.showToast('取得雲端資料失敗: ' + error.message, 'error');
            })
            .finally(() => {
                Utils.hideLoading();
            });
    },
    
    /**
     * 停用同步
     */
    disable: function() {
        // 登出
        if (this.currentUser) {
            this.logout();
        }
        
        // 停用自動同步
        Utils.saveToLocalStorage('autoSync', false);
        document.getElementById('autoSync').checked = false;
        
        Utils.showToast('已停用同步服務', 'info');
    },
    
    /**
     * 重新整理同步頁面
     */
    refresh: function() {
        // 更新上次同步時間
        if (this.lastSyncTime) {
            document.getElementById('lastSyncTime').textContent = new Date(this.lastSyncTime).toLocaleString();
        } else {
            document.getElementById('lastSyncTime').textContent = '從未同步';
        }
        
        // 更新複選框狀態
        document.getElementById('autoSync').checked = Utils.getFromLocalStorage('autoSync', false);
    }
};