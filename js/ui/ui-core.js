/**
 * ui-core.js - UI 核心功能
 */

const UiCore = {
    /**
     * 初始化 UI
     */
    init: function() {
        // 初始化各模組
        UiDashboard.init();
        UiAccounts.init();
        UiCategories.init();
        UiTransactions.init();
        UiBudget.init();
        UiCharts.init();
        
        // 初始化頁籤切換
        this._initTabNavigation();
        
        // 初始化模態框
        this._initModals();
        
        // 更新財務快照
        this.updateFinancialSnapshot();
        
        // 載入設定
        this._loadSettings();
        
        console.log('UI 核心初始化完成');
    },
    
    /**
     * 初始化頁籤導航
     */
    _initTabNavigation: function() {
        // 頁籤點擊事件
        document.querySelectorAll('.nav-tabs li').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.getAttribute('data-tab');
                this.showTabContent(tabId);
            });
        });
    },
    
    /**
     * 初始化模態框
     */
    _initModals: function() {
        // 關閉模態框按鈕
        document.querySelectorAll('.close-button, .modal-cancel').forEach(button => {
            button.addEventListener('click', event => {
                const modal = event.target.closest('.modal');
                if (modal) {
                    this.closeModal(modal.id);
                }
            });
        });
        
        // 點擊模態框背景關閉模態框
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', event => {
                if (event.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
        
        // 設定模態框
        this._initSettingsModal();
    },
    
    /**
     * 初始化設定模態框
     */
    _initSettingsModal: function() {
        // 保存設定按鈕
        document.getElementById('saveSettingsButton').addEventListener('click', () => {
            this._saveSettings();
            this.closeModal('settingsModal');
        });
        
        // 清除資料按鈕
        document.getElementById('clearDataButton').addEventListener('click', () => {
            App.clearAllData();
            this.closeModal('settingsModal');
        });
        
        // 貨幣管理按鈕
        document.getElementById('manageCurrencyButton').addEventListener('click', () => {
            // 顯示匯率管理介面（待實現）
            alert('匯率管理功能即將推出');
        });
    },
    
    /**
     * 載入設定到設定模態框
     */
    _loadSettings: function() {
        const settings = Store.settings;
        
        // 深色模式
        document.getElementById('darkMode').checked = settings.darkMode;
        
        // 字體大小
        document.querySelector(`input[name="fontSize"][value="${settings.fontSize}"]`).checked = true;
        
        // 雲端同步
        document.getElementById('enableFirebaseSync').checked = settings.enableFirebaseSync;
        
        // 預設貨幣
        document.getElementById('defaultCurrency').value = settings.defaultCurrency;
        
        // 小數點位數
        document.querySelector(`input[name="decimalPlaces"][value="${settings.decimalPlaces}"]`).checked = true;
        
        // 預算提醒
        document.getElementById('enableBudgetAlerts').checked = settings.enableBudgetAlerts;
        document.getElementById('alertThreshold').value = settings.alertThreshold;
    },
    
    /**
     * 儲存設定
     */
    _saveSettings: function() {
        const settings = {
            darkMode: document.getElementById('darkMode').checked,
            fontSize: document.querySelector('input[name="fontSize"]:checked').value,
            enableFirebaseSync: document.getElementById('enableFirebaseSync').checked,
            defaultCurrency: document.getElementById('defaultCurrency').value,
            decimalPlaces: parseInt(document.querySelector('input[name="decimalPlaces"]:checked').value),
            enableBudgetAlerts: document.getElementById('enableBudgetAlerts').checked,
            alertThreshold: parseInt(document.getElementById('alertThreshold').value)
        };
        
        Store.updateSettings(settings);
        Utils.showToast('設定已儲存', 'success');
        
        // 如果啟用/停用同步
        if (settings.enableFirebaseSync !== Store.settings.enableFirebaseSync) {
            if (settings.enableFirebaseSync) {
                SyncManager.init();
                SyncManager.refresh();
                UiCore.showTabContent('sync');
            } else {
                SyncManager.disable();
            }
        }
    },
    
    /**
     * 顯示設定模態框
     */
    showSettingsModal: function() {
        this._loadSettings();
        this.showModal('settingsModal');
    },
    
showModal: function(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error('找不到模態框:', modalId);
        return;
    }
    
    console.log('顯示模態框:', modalId);
    modal.style.display = 'block';
    modal.classList.add('active');  // 添加 active 類
    document.body.style.overflow = 'hidden'; // 防止背景滾動
},

closeModal: function(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.style.display = 'none';  // 設置 display 為 none
    modal.classList.remove('active');
    document.body.style.overflow = '';
},
    
    /**
     * 切換頁籤內容
     */
    showTabContent: function(tabId) {
        // 更新頁籤導航樣式
        document.querySelectorAll('.nav-tabs li').forEach(tab => {
            if (tab.getAttribute('data-tab') === tabId) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // 更新頁籤內容
        document.querySelectorAll('.tab-content').forEach(content => {
            if (content.id === tabId) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
        
        // 發布頁籤變更事件
        EventBus.publish('tabChanged', { tabId });
    },
    
    /**
     * 更新頂部財務快照
     */
    updateFinancialSnapshot: function() {
        // 更新總資產
        const totalAssets = Store.calculateTotalAssets();
        document.getElementById('topTotalAssets').textContent = Utils.formatNumber(totalAssets);
        
        // 更新今日支出
        const todayTransactions = Store.getTodayTransactions();
        const todayExpense = todayTransactions
            .filter(tx => tx.type === 'expense')
            .reduce((total, tx) => total + tx.amount, 0);
        
        document.getElementById('topTodayExpense').textContent = Utils.formatNumber(todayExpense);
        
        // 更新今日收入
        const todayIncome = todayTransactions
            .filter(tx => tx.type === 'income')
            .reduce((total, tx) => total + tx.amount, 0);
        
        document.getElementById('topTodayIncome').textContent = Utils.formatNumber(todayIncome);
    },
    
    /**
     * 創建交易項目 HTML
     */
    createTransactionHTML: function(transaction, includeActions = true) {
        const account = Store.getAccount(transaction.accountId);
        const category = Store.getCategory(transaction.categoryId);
        
        if (!account || !category) return '';
        
        // 格式化金額
        const formattedAmount = transaction.type === 'expense' 
            ? '- ' + Utils.formatCurrency(transaction.amount, transaction.currency)
            : '+ ' + Utils.formatCurrency(transaction.amount, transaction.currency);
        
        // 格式化外幣資訊
        let originalAmount = '';
        if (transaction.originalCurrency !== transaction.currency) {
            originalAmount = `<div class="transaction-original">
                原始金額: ${Utils.formatCurrency(transaction.originalAmount, transaction.originalCurrency)}
            </div>`;
        }
        
        // 建立 HTML
        let html = `
            <div class="transaction-item ${transaction.type}" data-id="${transaction.id}">
                <div class="transaction-date">${DateUtils.formatHumanReadable(transaction.date)}</div>
                <div class="transaction-icon" style="background-color: ${category.color}20; color: ${category.color}">
                    <i class="fas fa-${category.icon}"></i>
                </div>
                <div class="transaction-details">
                    <div class="transaction-category">${category.name}</div>
                    <div class="transaction-account">${account.name}</div>
                    ${transaction.note ? `<div class="transaction-note">${transaction.note}</div>` : ''}
                    ${originalAmount}
                </div>
                <div class="transaction-amount ${transaction.type}">
                    ${formattedAmount}
                </div>
        `;
        
        // 添加操作按鈕
        if (includeActions) {
            html += `
                <div class="transaction-actions">
                    <button class="btn-icon edit-transaction" title="編輯" data-id="${transaction.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete-transaction" title="刪除" data-id="${transaction.id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
        }
        
        html += `</div>`;
        
        return html;
    },
    
    /**
     * 建立戶口 HTML
     */
    createAccountHTML: function(account, viewMode = 'card') {
        if (viewMode === 'card') {
            return `
                <div class="account-card" data-id="${account.id}">
                    <div class="account-card-header" style="background-color: ${this._getAccountColor(account.type)}">
                        <h3>${account.name}</h3>
                        <div class="account-type">${this._getAccountTypeName(account.type)}</div>
                    </div>
                    <div class="account-card-body">
                        <div class="account-balance">
                            ${Utils.formatCurrency(account.balance, account.currency)}
                        </div>
                        <div class="account-currency">
                            ${CurrencyManager.getCurrencyInfo(account.currency).name}
                        </div>
                        ${account.note ? `<div class="account-note">${account.note}</div>` : ''}
                        <div class="account-actions">
                            <button class="btn-icon edit-account" title="編輯" data-id="${account.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon delete-account" title="刪除" data-id="${account.id}">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="account-list-item" data-id="${account.id}">
                    <div class="account-info">
                        <div class="account-name">${account.name}</div>
                        <div class="account-type-currency">
                            ${this._getAccountTypeName(account.type)} · ${CurrencyManager.getCurrencyInfo(account.currency).name}
                        </div>
                    </div>
                    <div class="account-details">
                        <div class="account-balance">
                            ${Utils.formatCurrency(account.balance, account.currency)}
                        </div>
                    </div>
                    <div class="account-actions">
                        <button class="btn-icon edit-account" title="編輯" data-id="${account.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete-account" title="刪除" data-id="${account.id}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;
        }
    },
    
    /**
     * 建立類別 HTML
     */
    createCategoryHTML: function(category, viewMode = 'card') {
        if (viewMode === 'card') {
            return `
                <div class="category-card" data-id="${category.id}">
                    <div class="category-icon" style="background-color: ${category.color}20; color: ${category.color}">
                        <i class="fas fa-${category.icon}"></i>
                    </div>
                    <div class="category-name">${category.name}</div>
                    <div class="category-actions">
                        <button class="btn-icon edit-category" title="編輯" data-id="${category.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete-category" title="刪除" data-id="${category.id}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="category-list-item" data-id="${category.id}">
                    <div class="category-icon" style="background-color: ${category.color}20; color: ${category.color}">
                        <i class="fas fa-${category.icon}"></i>
                    </div>
                    <div class="category-name">${category.name}</div>
                    <div class="category-actions">
                        <button class="btn-icon edit-category" title="編輯" data-id="${category.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete-category" title="刪除" data-id="${category.id}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;
        }
    },
    
    /**
     * 取得戶口類型名稱
     */
    _getAccountTypeName: function(type) {
        const typeNames = {
            'cash': '現金',
            'bank': '銀行戶口',
            'credit': '信用卡',
            'investment': '投資',
            'other': '其他'
        };
        
        return typeNames[type] || '其他';
    },
    
    /**
     * 取得戶口顏色
     */
    _getAccountColor: function(type) {
        const colors = {
            'cash': '#4CAF50',
            'bank': '#2196F3',
            'credit': '#F44336',
            'investment': '#9C27B0',
            'other': '#FF9800'
        };
        
        return colors[type] || '#607D8B';
    },
    
    /**
     * 生成圖標選擇網格
     */
    generateIconGrid: function() {
        const icons = [
            'home', 'utensils', 'shopping-bag', 'tshirt', 'bus', 'car', 'plane',
            'taxi', 'train', 'subway', 'bicycle', 'walking', 'building', 'university',
            'hospital', 'clinic', 'tooth', 'prescription-bottle', 'pills', 'first-aid',
            'briefcase', 'user-md', 'graduation-cap', 'book', 'pen', 'book-open',
            'laptop', 'mobile-alt', 'tv', 'headphones', 'gamepad', 'film', 'ticket-alt',
            'music', 'coffee', 'beer', 'cocktail', 'glass-martini', 'wine-glass', 'pizza-slice',
            'hamburger', 'hotdog', 'ice-cream', 'cookie', 'candy-cane', 'birthday-cake',
            'gift', 'gifts', 'baby', 'baby-carriage', 'paw', 'dog', 'cat',
            'guitar', 'drum', 'dumbbell', 'running', 'swimming-pool', 'table-tennis',
            'basketball-ball', 'football-ball', 'baseball-ball', 'volleyball-ball', 'futbol',
            'paint-brush', 'palette', 'camera', 'image', 'video', 'theater-masks',
            'church', 'mosque', 'synagogue', 'cross', 'star-of-david', 'star-and-crescent',
            'om', 'menorah', 'place-of-worship', 'pray', 'hand-holding-heart', 'hands-helping',
            'hand-holding-usd', 'donate', 'piggy-bank', 'money-bill-wave', 'money-check-alt',
            'credit-card', 'percentage', 'chart-line', 'chart-pie', 'chart-bar', 'coins',
            'dollar-sign', 'euro-sign', 'pound-sign', 'yen-sign', 'ruble-sign', 'won-sign',
            'rupee-sign', 'tag', 'tags', 'shopping-cart', 'store', 'cash-register', 'landmark',
            'umbrella', 'suitcase', 'passport', 'plane-departure', 'plane-arrival', 'globe',
            'globe-americas', 'globe-europe', 'globe-asia', 'globe-africa', 'map-marker-alt',
            'car-side', 'ship', 'truck', 'motorcycle', 'shuttle-van', 'charging-station',
            'gas-pump', 'oil-can', 'tools', 'toolbox', 'wrench', 'screwdriver', 'hammer',
            'toilet-paper', 'soap', 'shower', 'hot-tub', 'bath', 'sink', 'faucet',
            'broom', 'trash', 'trash-alt', 'recycle', 'lightbulb', 'plug', 'fan', 'air-conditioner',
            'fire', 'temperature-high', 'temperature-low', 'snowflake', 'icicles', 'cloud-sun',
            'cloud-moon', 'sun', 'moon', 'cloud', 'cloud-rain', 'cloud-showers-heavy',
            'poop', 'restroom', 'female', 'male', 'genderless', 'transgender', 'venus', 'mars',
            'mercury', 'neuter', 'venus-mars', 'mars-double', 'venus-double', 'transgender-alt',
            'user', 'user-plus', 'user-minus', 'user-edit', 'user-cog', 'user-shield',
            'user-check', 'user-clock', 'user-lock', 'users', 'user-friends', 'user-tie',
            'user-graduate', 'user-injured', 'user-nurse', 'user-astronaut', 'user-secret',
            'user-ninja', 'user-alt', 'user-tag', 'key', 'lock', 'unlock', 'shield-alt',
            'fingerprint', 'id-card', 'id-badge', 'address-card', 'address-book',
            'envelope', 'paper-plane', 'comments', 'comment', 'comment-alt', 'smile',
            'frown', 'meh', 'angry', 'laugh', 'tired', 'surprise', 'sad-tear', 'kiss',
            'bell', 'music', 'phone', 'phone-alt', 'video', 'microphone', 'microchip',
            'wifi', 'broadcast-tower', 'network-wired', 'server', 'hdd', 'database',
            'desktop', 'laptop-code', 'keyboard', 'mouse', 'print', 'scanner', 'save',
            'cloud-upload-alt', 'cloud-download-alt', 'folder', 'folder-open', 'file',
            'file-alt', 'file-pdf', 'file-word', 'file-excel', 'file-powerpoint', 'file-image',
            'file-video', 'file-audio', 'file-archive', 'file-code', 'file-prescription',
            'file-signature', 'file-contract', 'file-medical', 'file-invoice', 'file-invoice-dollar',
            'file-medical-alt', 'clipboard', 'clipboard-list', 'clipboard-check', 'calendar',
            'calendar-alt', 'calendar-plus', 'calendar-minus', 'calendar-times', 'calendar-check',
            'calendar-day', 'calendar-week', 'search', 'filter', 'sort', 'sort-alpha-down',
            'sort-numeric-down', 'sort-amount-down', 'sort-alpha-up', 'sort-numeric-up',
            'sort-amount-up', 'cog', 'cogs', 'wrench', 'tasks', 'check', 'check-circle',
            'check-square', 'times', 'times-circle', 'exclamation', 'exclamation-circle',
            'exclamation-triangle', 'question', 'question-circle', 'info', 'info-circle',
            'ban', 'eye', 'eye-slash', 'toggle-on', 'toggle-off', 'edit', 'pen', 'pencil-alt',
            'highlighter', 'eraser', 'trash', 'undo', 'redo', 'sync', 'sync-alt', 'random',
            'share', 'share-alt', 'reply', 'reply-all', 'forward', 'retweet', 'sign-in-alt',
            'sign-out-alt', 'expand', 'compress', 'expand-alt', 'compress-alt', 'arrows-alt',
            'arrows-alt-h', 'arrows-alt-v', 'plus', 'minus', 'plus-circle', 'minus-circle',
            'plus-square', 'minus-square', 'asterisk', 'at', 'chevron-up', 'chevron-down',
            'chevron-left', 'chevron-right', 'arrow-up', 'arrow-down', 'arrow-left',
            'arrow-right', 'caret-up', 'caret-down', 'caret-left', 'caret-right', 'compress',
            'compress-arrows-alt', 'expand-arrows-alt', 'external-link-alt', 'external-link-square-alt',
            'heart', 'star', 'flag', 'thumbs-up', 'thumbs-down', 'award', 'trophy', 'medal',
            'crown', 'gem', 'cookie', 'birthday-cake', 'candy-cane', 'pepper-hot',
            'apple-alt', 'lemon', 'carrot', 'wheat', 'bone', 'fish', 'drumstick-bite',
            'egg', 'cheese', 'bacon', 'bread-slice', 'leaf', 'seedling', 'tree', 'holly-berry',
            'sun', 'moon', 'cloud', 'rainbow', 'snowflake', 'icicles', 'bolt', 'wind',
            'tornado', 'hurricane', 'temperature-high', 'temperature-low', 'fire', 'fire-alt',
            'meteor', 'fan', 'thermometer-empty', 'thermometer-quarter', 'thermometer-half',
            'thermometer-three-quarters', 'thermometer-full', 'mountain', 'compass', 'map'
        ];
        
        const gridElement = document.getElementById('iconGrid');
        gridElement.innerHTML = '';
        
        icons.forEach(icon => {
            const iconItem = document.createElement('div');
            iconItem.className = 'icon-item';
            iconItem.dataset.icon = icon;
            iconItem.innerHTML = `<i class="fas fa-${icon}"></i>`;
            iconItem.addEventListener('click', () => {
                document.getElementById('selectedIcon').className = `fas fa-${icon}`;
                document.getElementById('iconGrid').style.display = 'none';
            });
            
            gridElement.appendChild(iconItem);
        });
    }
};