/**
 * store.js - 資料存儲管理
 */

const Store = {
    // 預設設定
    defaultSettings: {
        darkMode: false,
        fontSize: 'medium',
        defaultCurrency: 'HKD',
        decimalPlaces: 2,
        enableFirebaseSync: false,
        enableBudgetAlerts: true,
        alertThreshold: 80
    },
    
    // 初始化
    init: async function() {
        // 載入設定
        this.settings = Utils.getFromLocalStorage('settings', this.defaultSettings);
        
        // 初始化匯率管理
        await CurrencyManager.init();
        
        // 初始化日期管理
        DayManager.init();
        
        // 初始化各種資料集合
        this._initCollections();
        
        // 設定深色模式
        if (this.settings.darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
        
        console.log('資料存儲初始化完成');
        
        // 發布初始化完成事件
        EventBus.publish('storeInitialized', { store: this });
        
        return this;
    },
    
    // 初始化資料集合
    _initCollections: function() {
        // 載入資料集合
        this.accounts = this._loadCollection('accounts', []);
        this.categories = this._loadCollection('categories', []);
        this.transactions = this._loadCollection('transactions', []);
        
        // 明確確保 budgets 是數組，並確保每次都是從 localStorage 加載最新數據
        this.budgets = this._loadCollection('budgets', []);
        if (!Array.isArray(this.budgets)) {
            console.warn('警告: budgets 不是數組，已初始化為空數組');
            this.budgets = [];
            this._saveCollection('budgets', this.budgets);
        }
        
        this.savingsGoals = this._loadCollection('savingsGoals', []);
        this.recurringItems = this._loadCollection('recurringItems', []);
        
        // 初始化備註建議存儲
        this.noteSuggestions = this._loadCollection('noteSuggestions', {});
        
        // 如果類別為空，創建預設類別
        if (this.categories.length === 0) {
            this._createDefaultCategories();
        }
    },
    
    // 載入集合
    _loadCollection: function(name, defaultValue = []) {
        return Utils.getFromLocalStorage(name, defaultValue);
    },
    
    // 儲存集合
    _saveCollection: function(name, data) {
        return Utils.saveToLocalStorage(name, data);
    },
    
    // 創建預設類別
    _createDefaultCategories: function() {
        // 收入類別
        const incomeCategories = [
            { name: '薪資', type: 'income', icon: 'money-bill-wave', color: '#4CAF50', order: 0 },
            { name: '獎金', type: 'income', icon: 'gift', color: '#9C27B0', order: 1 },
            { name: '投資收益', type: 'income', icon: 'chart-line', color: '#2196F3', order: 2 },
            { name: '利息', type: 'income', icon: 'percentage', color: '#3F51B5', order: 3 },
            { name: '租金', type: 'income', icon: 'home', color: '#009688', order: 4 },
            { name: '其他收入', type: 'income', icon: 'plus-circle', color: '#FF9800', order: 5 }
        ];
        
        // 支出類別
        const expenseCategories = [
            { name: '餐飲', type: 'expense', icon: 'utensils', color: '#F44336', order: 0 },
            { name: '交通', type: 'expense', icon: 'bus', color: '#FF9800', order: 1 },
            { name: '購物', type: 'expense', icon: 'shopping-bag', color: '#E91E63', order: 2 },
            { name: '住房', type: 'expense', icon: 'home', color: '#795548', order: 3 },
            { name: '娛樂', type: 'expense', icon: 'film', color: '#9C27B0', order: 4 },
            { name: '醫療', type: 'expense', icon: 'hospital', color: '#2196F3', order: 5 },
            { name: '教育', type: 'expense', icon: 'book', color: '#3F51B5', order: 6 },
            { name: '通訊', type: 'expense', icon: 'mobile-alt', color: '#009688', order: 7 },
            { name: '服裝', type: 'expense', icon: 'tshirt', color: '#673AB7', order: 8 },
            { name: '保險', type: 'expense', icon: 'shield-alt', color: '#607D8B', order: 9 },
            { name: '其他支出', type: 'expense', icon: 'minus-circle', color: '#FF5722', order: 10 }
        ];
        
        // 創建類別
        [...incomeCategories, ...expenseCategories].forEach(categoryData => {
            const category = new Category(categoryData);
            this.categories.push(category.toJSON());
        });
        
        // 儲存類別
        this._saveCollection('categories', this.categories);
        
        console.log('已創建預設類別');
    },
    
    // 更新設定
    updateSettings: function(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        Utils.saveToLocalStorage('settings', this.settings);
        
        // 如果深色模式設定變更
        if (newSettings.hasOwnProperty('darkMode')) {
            if (newSettings.darkMode) {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
        }
        
        // 發布設定更改事件
        EventBus.publish('settingsChanged', { settings: this.settings });
        
        return this.settings;
    },
    
    // 戶口管理方法
    
    // 取得所有戶口
    getAccounts: function() {
        return this.accounts;
    },
    
    // 取得指定戶口
    getAccount: function(id) {
        return this.accounts.find(account => account.id === id);
    },
    
    // 新增戶口
    addAccount: function(accountData) {
        const account = new Account(accountData);
        this.accounts.push(account.toJSON());
        this._saveCollection('accounts', this.accounts);
        
        // 發布戶口新增事件
        EventBus.publish('accountAdded', { account: account.toJSON() });
        
        return account.toJSON();
    },
    
    // 更新戶口
    updateAccount: function(id, accountData) {
        const index = this.accounts.findIndex(account => account.id === id);
        if (index === -1) return null;
        
        const currentData = this.accounts[index];
        const updatedData = { ...currentData, ...accountData, updatedAt: new Date().toISOString() };
        const account = new Account(updatedData);
        
        this.accounts[index] = account.toJSON();
        this._saveCollection('accounts', this.accounts);
        
        // 發布戶口更新事件
        EventBus.publish('accountUpdated', { account: account.toJSON() });
        
        return account.toJSON();
    },
    
    // 刪除戶口
    deleteAccount: function(id) {
        const index = this.accounts.findIndex(account => account.id === id);
        if (index === -1) return false;
        
        const account = this.accounts[index];
        this.accounts.splice(index, 1);
        this._saveCollection('accounts', this.accounts);
        
        // 發布戶口刪除事件
        EventBus.publish('accountDeleted', { account });
        
        return true;
    },
    
    // 更新戶口餘額
    updateAccountBalance: function(id, amount, operation = 'add') {
        const index = this.accounts.findIndex(account => account.id === id);
        if (index === -1) return null;
        
        const accountData = this.accounts[index];
        const account = new Account(accountData);
        
        account.updateBalance(amount, operation);
        this.accounts[index] = account.toJSON();
        this._saveCollection('accounts', this.accounts);
        
        // 發布戶口餘額更新事件
        EventBus.publish('accountBalanceUpdated', { account: account.toJSON() });
        
        return account.toJSON();
    },
    
    // 計算總資產
    calculateTotalAssets: function(currency = this.settings.defaultCurrency) {
        return this.accounts.reduce((total, account) => {
            const accountObj = new Account(account);
            return total + accountObj.getBalanceInDefaultCurrency(currency);
        }, 0);
    },
    
    // 類別管理方法
    
    // 取得所有類別
    getCategories: function(type) {
        if (type) {
            return this.categories.filter(category => category.type === type);
        }
        return this.categories;
    },
    
    // 取得指定類別
    getCategory: function(id) {
        return this.categories.find(category => category.id === id);
    },
    
    // 新增類別
    addCategory: function(categoryData) {
        const category = new Category(categoryData);
        this.categories.push(category.toJSON());
        this._saveCollection('categories', this.categories);
        
        // 發布類別新增事件
        EventBus.publish('categoryAdded', { category: category.toJSON() });
        
        return category.toJSON();
    },
    
    // 更新類別
    updateCategory: function(id, categoryData) {
        const index = this.categories.findIndex(category => category.id === id);
        if (index === -1) return null;
        
        const currentData = this.categories[index];
        const updatedData = { ...currentData, ...categoryData, updatedAt: new Date().toISOString() };
        const category = new Category(updatedData);
        
        this.categories[index] = category.toJSON();
        this._saveCollection('categories', this.categories);
        
        // 發布類別更新事件
        EventBus.publish('categoryUpdated', { category: category.toJSON() });
        
        return category.toJSON();
    },
    
    // 刪除類別
    deleteCategory: function(id) {
        const index = this.categories.findIndex(category => category.id === id);
        if (index === -1) return false;
        
        const category = this.categories[index];
        this.categories.splice(index, 1);
        this._saveCollection('categories', this.categories);
        
        // 發布類別刪除事件
        EventBus.publish('categoryDeleted', { category });
        
        return true;
    },
    
    // 交易管理方法
    
    // 取得所有交易
    getTransactions: function(filters = {}) {
        let filteredTransactions = [...this.transactions];
        
        // 套用過濾條件
        if (filters.type) {
            filteredTransactions = filteredTransactions.filter(tx => tx.type === filters.type);
        }
        
        if (filters.accountId) {
            filteredTransactions = filteredTransactions.filter(tx => 
                tx.accountId === filters.accountId || tx.toAccountId === filters.accountId
            );
        }
        
        if (filters.categoryId) {
            filteredTransactions = filteredTransactions.filter(tx => tx.categoryId === filters.categoryId);
        }
        
        if (filters.startDate) {
            filteredTransactions = filteredTransactions.filter(tx => tx.date >= filters.startDate);
        }
        
        if (filters.endDate) {
            filteredTransactions = filteredTransactions.filter(tx => tx.date <= filters.endDate);
        }
        
        // 預設按日期排序（最新的在前）
        return filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    
    // 取得今日交易
    getTodayTransactions: function() {
        const today = DayManager.getCurrentDate();
        return this.getTransactions({ startDate: today, endDate: today });
    },
    
    // 取得指定交易
    getTransaction: function(id) {
        return this.transactions.find(tx => tx.id === id);
    },
    
    // 新增交易
    addTransaction: function(transactionData) {
        const transaction = new Transaction(transactionData);
        
        // 處理餘額變更
        this._processBalanceChange(transaction.toJSON());
        
        // 儲存交易
        this.transactions.push(transaction.toJSON());
        this._saveCollection('transactions', this.transactions);
        
        // 發布交易新增事件
        EventBus.publish('transactionAdded', { transaction: transaction.toJSON() });
        
        return transaction.toJSON();
    },
    
    // 更新交易
    updateTransaction: function(id, transactionData) {
        const index = this.transactions.findIndex(tx => tx.id === id);
        if (index === -1) return null;
        
        const oldTransaction = this.transactions[index];
        
        // 先還原舊交易對餘額的影響
        this._reverseBalanceChange(oldTransaction);
        
        // 更新交易資料
        const currentData = this.transactions[index];
        const updatedData = { ...currentData, ...transactionData, updatedAt: new Date().toISOString() };
        const transaction = new Transaction(updatedData);
        
        // 處理新交易對餘額的影響
        this._processBalanceChange(transaction.toJSON());
        
        // 儲存更新後的交易
        this.transactions[index] = transaction.toJSON();
        this._saveCollection('transactions', this.transactions);
        
        // 發布交易更新事件
        EventBus.publish('transactionUpdated', { 
            transaction: transaction.toJSON(),
            oldTransaction
        });
        
        return transaction.toJSON();
    },
    
    // 刪除交易
    deleteTransaction: function(id) {
        const index = this.transactions.findIndex(tx => tx.id === id);
        if (index === -1) return false;
        
        const transaction = this.transactions[index];
        
        // 還原對餘額的影響
        this._reverseBalanceChange(transaction);
        
        // 刪除交易
        this.transactions.splice(index, 1);
        this._saveCollection('transactions', this.transactions);
        
        // 發布交易刪除事件
        EventBus.publish('transactionDeleted', { transaction });
        
        return true;
    },
    
    // 處理交易對餘額的影響
    _processBalanceChange: function(transaction) {
        if (transaction.type === 'income') {
            // 收入增加戶口餘額
            this.updateAccountBalance(transaction.accountId, transaction.amount, 'add');
        } else if (transaction.type === 'expense') {
            // 支出減少戶口餘額
            this.updateAccountBalance(transaction.accountId, transaction.amount, 'subtract');
        } else if (transaction.type === 'transfer') {
            // 轉賬從一個戶口減少，另一個增加
            this.updateAccountBalance(transaction.accountId, transaction.amount, 'subtract');
            
            // 取得兩個戶口的貨幣資訊
            const fromAccount = this.getAccount(transaction.accountId);
            const toAccount = this.getAccount(transaction.toAccountId);
            
            if (fromAccount && toAccount) {
                // 計算轉換後的金額
                let convertedAmount = transaction.amount;
                
                if (fromAccount.currency !== toAccount.currency) {
                    convertedAmount = CurrencyManager.convert(
                        transaction.amount,
                        fromAccount.currency,
                        toAccount.currency
                    );
                }
                
                // 增加目標戶口餘額
                this.updateAccountBalance(transaction.toAccountId, convertedAmount, 'add');
            }
        }
    },
    
    // 還原交易對餘額的影響
    _reverseBalanceChange: function(transaction) {
        if (transaction.type === 'income') {
            // 還原收入
            this.updateAccountBalance(transaction.accountId, transaction.amount, 'subtract');
        } else if (transaction.type === 'expense') {
            // 還原支出
            this.updateAccountBalance(transaction.accountId, transaction.amount, 'add');
        } else if (transaction.type === 'transfer') {
            // 還原轉賬
            this.updateAccountBalance(transaction.accountId, transaction.amount, 'add');
            
            // 取得兩個戶口的貨幣資訊
            const fromAccount = this.getAccount(transaction.accountId);
            const toAccount = this.getAccount(transaction.toAccountId);
            
            if (fromAccount && toAccount) {
                // 計算轉換後的金額
                let convertedAmount = transaction.amount;
                
                if (fromAccount.currency !== toAccount.currency) {
                    convertedAmount = CurrencyManager.convert(
                        transaction.amount,
                        fromAccount.currency,
                        toAccount.currency
                    );
                }
                
                // 減少目標戶口餘額
                this.updateAccountBalance(transaction.toAccountId, convertedAmount, 'subtract');
            }
        }
    },
    
    // 儲蓄目標方法
    
    // 取得所有儲蓄目標
    getSavingsGoals: function() {
        return this.savingsGoals;
    },
    
    // 取得指定儲蓄目標
    getSavingsGoal: function(id) {
        return this.savingsGoals.find(goal => goal.id === id);
    },
    
    // 新增儲蓄目標
    addSavingsGoal: function(goalData) {
        const goal = new SavingsGoal(goalData);
        this.savingsGoals.push(goal.toJSON());
        this._saveCollection('savingsGoals', this.savingsGoals);
        
        // 發布儲蓄目標新增事件
        EventBus.publish('savingsGoalAdded', { goal: goal.toJSON() });
        
        return goal.toJSON();
    },
    
    // 更新儲蓄目標
    updateSavingsGoal: function(id, goalData) {
        const index = this.savingsGoals.findIndex(goal => goal.id === id);
        if (index === -1) return null;
        
        const currentData = this.savingsGoals[index];
        const updatedData = { ...currentData, ...goalData, updatedAt: new Date().toISOString() };
        const goal = new SavingsGoal(updatedData);
        
        this.savingsGoals[index] = goal.toJSON();
        this._saveCollection('savingsGoals', this.savingsGoals);
        
        // 發布儲蓄目標更新事件
        EventBus.publish('savingsGoalUpdated', { goal: goal.toJSON() });
        
        return goal.toJSON();
    },
    
    // 刪除儲蓄目標
    deleteSavingsGoal: function(id) {
        const index = this.savingsGoals.findIndex(goal => goal.id === id);
        if (index === -1) return false;
        
        const goal = this.savingsGoals[index];
        this.savingsGoals.splice(index, 1);
        this._saveCollection('savingsGoals', this.savingsGoals);
        
        // 發布儲蓄目標刪除事件
        EventBus.publish('savingsGoalDeleted', { goal });
        
        return true;
    },
    
    // 更新儲蓄目標進度
    updateSavingsGoalProgress: function(id, amount, operation = 'add') {
        const index = this.savingsGoals.findIndex(goal => goal.id === id);
        if (index === -1) return null;
        
        const goalData = this.savingsGoals[index];
        const goal = new SavingsGoal(goalData);
        
        goal.updateAmount(amount, operation);
        this.savingsGoals[index] = goal.toJSON();
        this._saveCollection('savingsGoals', this.savingsGoals);
        
        // 發布儲蓄目標進度更新事件
        EventBus.publish('savingsGoalProgressUpdated', { goal: goal.toJSON() });
        
        return goal.toJSON();
    },
    
    // 預算方法
    
    // 取得所有預算
    getBudgets: function(period = 'monthly', year, month, quarter) {
        // 確保 this.budgets 是數組 - 從 localStorage 重新載入以確保數據始終最新
        if (!this.budgets || !Array.isArray(this.budgets)) {
            console.warn('警告: budgets 不是數組，從 localStorage 重新加載');
            this.budgets = this._loadCollection('budgets', []);
            
            // 二次確認確保是數組
            if (!Array.isArray(this.budgets)) {
                console.warn('警告: 從 localStorage 加載後仍然不是數組，初始化為空數組');
                this.budgets = [];
                this._saveCollection('budgets', this.budgets);
            }
        }
        
        let filteredBudgets = this.budgets.filter(budget => budget.period === period);
        
        if (year) {
            filteredBudgets = filteredBudgets.filter(budget => budget.year === year);
        }
        
        if (period === 'monthly' && month) {
            filteredBudgets = filteredBudgets.filter(budget => budget.month === month);
        } else if (period === 'quarterly' && quarter) {
            filteredBudgets = filteredBudgets.filter(budget => budget.quarter === quarter);
        }
        
        return filteredBudgets;
    },
    
    // 取得指定預算
    getBudget: function(id) {
        return this.budgets.find(budget => budget.id === id);
    },
    
    // 新增預算
    addBudget: function(budgetData) {
        try {
            // 確保預算數據有效
            if (!budgetData || !budgetData.amount || !budgetData.categoryId) {
                console.warn('警告: 嘗試添加無效的預算數據');
                return null;
            }
            
            const budget = new Budget(budgetData);
            
            // 確保 this.budgets 是數組
            if (!Array.isArray(this.budgets)) {
                console.warn('警告: addBudget 中 budgets 不是數組，初始化為空數組');
                this.budgets = [];
            }
            
            this.budgets.push(budget.toJSON());
            this._saveCollection('budgets', this.budgets);
            
            // 發布預算新增事件
            EventBus.publish('budgetAdded', { budget: budget.toJSON() });
            
            return budget.toJSON();
        } catch (error) {
            console.error('添加預算時出錯:', error);
            return null;
        }
    },
    
    // 更新預算
    updateBudget: function(id, budgetData) {
        try {
            // 確保 this.budgets 是數組
            if (!Array.isArray(this.budgets)) {
                console.warn('警告: updateBudget 中 budgets 不是數組，從 localStorage 重新加載');
                this.budgets = this._loadCollection('budgets', []);
                if (!Array.isArray(this.budgets)) {
                    console.warn('警告: 加載後仍然不是數組，初始化為空數組');
                    this.budgets = [];
                    this._saveCollection('budgets', this.budgets);
                    return null;
                }
            }
            
            const index = this.budgets.findIndex(budget => budget.id === id);
            if (index === -1) return null;
            
            const currentData = this.budgets[index];
            const updatedData = { ...currentData, ...budgetData, updatedAt: new Date().toISOString() };
            const budget = new Budget(updatedData);
            
            this.budgets[index] = budget.toJSON();
            this._saveCollection('budgets', this.budgets);
            
            // 發布預算更新事件
            EventBus.publish('budgetUpdated', { budget: budget.toJSON() });
            
            return budget.toJSON();
        } catch (error) {
            console.error(`更新預算 ${id} 時出錯:`, error);
            return null;
        }
    },
    
    // 刪除預算
    deleteBudget: function(id) {
        try {
            // 確保 this.budgets 是數組
            if (!Array.isArray(this.budgets)) {
                console.warn('警告: deleteBudget 中 budgets 不是數組，從 localStorage 重新加載');
                this.budgets = this._loadCollection('budgets', []);
                if (!Array.isArray(this.budgets)) {
                    console.warn('警告: 加載後仍然不是數組，初始化為空數組');
                    this.budgets = [];
                    this._saveCollection('budgets', this.budgets);
                    return false;
                }
            }
            
            const index = this.budgets.findIndex(budget => budget.id === id);
            if (index === -1) return false;
            
            const budget = this.budgets[index];
            this.budgets.splice(index, 1);
            this._saveCollection('budgets', this.budgets);
            
            // 發布預算刪除事件
            EventBus.publish('budgetDeleted', { budget });
            
            return true;
        } catch (error) {
            console.error(`刪除預算 ${id} 時出錯:`, error);
            return false;
        }
    },
    
    // 取得預算使用狀況
    getBudgetUsage: function(budgetId) {
        const budget = this.getBudget(budgetId);
        if (!budget) return null;
        
        // 取得類別
        const category = this.getCategory(budget.categoryId);
        if (!category) return null;
        
        // 取得該預算期間內的所有交易
        let startDate, endDate;
        
        if (budget.period === 'monthly') {
            startDate = `${budget.year}-${String(budget.month).padStart(2, '0')}-01`;
            const lastDay = new Date(budget.year, budget.month, 0).getDate();
            endDate = `${budget.year}-${String(budget.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        } else if (budget.period === 'quarterly') {
            const startMonth = (budget.quarter - 1) * 3 + 1;
            startDate = `${budget.year}-${String(startMonth).padStart(2, '0')}-01`;
            const endMonth = startMonth + 2;
            const lastDay = new Date(budget.year, endMonth, 0).getDate();
            endDate = `${budget.year}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        } else if (budget.period === 'yearly') {
            startDate = `${budget.year}-01-01`;
            endDate = `${budget.year}-12-31`;
        }
        
        // 篩選該類別在該期間內的支出交易
        const transactions = this.getTransactions({
            type: 'expense',
            categoryId: budget.categoryId,
            startDate,
            endDate
        });
        
        // 計算總支出
        const totalExpense = transactions.reduce((sum, tx) => sum + tx.amount, 0);
        
        // 計算使用百分比
        const percentage = (totalExpense / budget.amount) * 100;
        
        return {
            budget,
            category,
            totalExpense,
            percentage: Math.min(Math.max(percentage, 0), 100),
            remaining: Math.max(budget.amount - totalExpense, 0),
            transactions
        };
    },
    
    // 在getAllBudgetUsage方法中添加更多的安全檢查
getAllBudgetUsage: function(period = 'monthly', year = new Date().getFullYear(), month, quarter) {
    try {
        // 確保 this.budgets 是數組
        if (!this.budgets || !Array.isArray(this.budgets)) {
            console.warn('警告: getAllBudgetUsage 中 budgets 不是數組，初始化為空數組');
            this.budgets = [];
            this._saveCollection('budgets', this.budgets);
        }
        
        const currentMonth = month || new Date().getMonth() + 1;
        const currentQuarter = quarter || Math.ceil(currentMonth / 3);
        
        const budgets = this.getBudgets(period, year, currentMonth, currentQuarter);
        
        return budgets.map(budget => {
            try {
                return this.getBudgetUsage(budget.id);
            } catch (err) {
                console.error(`處理預算 ${budget.id} 時出錯:`, err);
                return null;
            }
        }).filter(Boolean); // 過濾掉null值
    } catch (error) {
        console.error('獲取所有預算使用狀況時出錯:', error);
        return [];
    }
},
    
    // 備註建議相關方法
    
    // 獲取類別相關的備註建議
    getNotesByCategory: function(categoryId) {
        const noteSuggestions = Utils.getFromLocalStorage('noteSuggestions', {});
        return noteSuggestions[categoryId] || [];
    },
    
    // 添加備註建議
    addNoteSuggestion: function(categoryId, note) {
        if (!note || note.trim() === '') return; // 不保存空備註
        
        // 獲取現有備註建議
        const noteSuggestions = Utils.getFromLocalStorage('noteSuggestions', {});
        
        // 初始化該類別的備註陣列（如果不存在）
        if (!noteSuggestions[categoryId]) {
            noteSuggestions[categoryId] = [];
        }
        
        // 檢查備註是否已存在（忽略大小寫）
        const noteExists = noteSuggestions[categoryId].some(
            existingNote => existingNote.toLowerCase() === note.toLowerCase()
        );
        
        // 如果不存在，添加到陣列
        if (!noteExists) {
            // 將新備註添加到陣列前面，這樣最新的備註會排在前面
            noteSuggestions[categoryId].unshift(note);
            
            // 限制每個類別最多存儲10個備註建議
            if (noteSuggestions[categoryId].length > 10) {
                noteSuggestions[categoryId].pop();
            }
            
            // 保存更新後的備註建議
            Utils.saveToLocalStorage('noteSuggestions', noteSuggestions);
        }
    },
    
    // 匯出資料
    exportData: function() {
        return {
            accounts: this.accounts,
            categories: this.categories,
            transactions: this.transactions,
            budgets: this.budgets,
            savingsGoals: this.savingsGoals,
            recurringItems: this.recurringItems,
            settings: this.settings,
            noteSuggestions: Utils.getFromLocalStorage('noteSuggestions', {}),
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
    },
    
    // 匯入資料
    importData: function(data) {
        if (!data || !data.version) {
            throw new Error('無效的資料格式');
        }
        
        try {
            // 匯入各集合
            if (data.accounts) this.accounts = data.accounts;
            if (data.categories) this.categories = data.categories;
            if (data.transactions) this.transactions = data.transactions;
            if (data.budgets) this.budgets = data.budgets;
            if (data.savingsGoals) this.savingsGoals = data.savingsGoals;
            if (data.recurringItems) this.recurringItems = data.recurringItems;
            if (data.settings) this.settings = { ...this.settings, ...data.settings };
            if (data.noteSuggestions) Utils.saveToLocalStorage('noteSuggestions', data.noteSuggestions);
            
            // 儲存到 localStorage
            this._saveCollection('accounts', this.accounts);
            this._saveCollection('categories', this.categories);
            this._saveCollection('transactions', this.transactions);
            this._saveCollection('budgets', this.budgets);
            this._saveCollection('savingsGoals', this.savingsGoals);
            this._saveCollection('recurringItems', this.recurringItems);
            this._saveCollection('settings', this.settings);
            
            // 套用設定
            if (this.settings.darkMode) {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
            
            // 發布資料匯入事件
            EventBus.publish('dataImported', { importDate: new Date().toISOString() });
            
            return true;
        } catch (error) {
            console.error('匯入資料失敗', error);
            throw error;
        }
    },
    
    // 清除所有資料
    clearAllData: function() {
        // 確認使用者真的要清除資料
        const confirmation = confirm('確定要清除所有資料嗎？此操作無法復原！');
        if (!confirmation) return false;
        
        // 清除集合
        this.accounts = [];
        this.categories = [];
        this.transactions = [];
        this.budgets = [];
        this.savingsGoals = [];
        this.recurringItems = [];
        
        // 重設設定為預設值
        this.settings = { ...this.defaultSettings };
        
        // 儲存到 localStorage
        this._saveCollection('accounts', this.accounts);
        this._saveCollection('categories', this.categories);
        this._saveCollection('transactions', this.transactions);
        this._saveCollection('budgets', this.budgets);
        this._saveCollection('savingsGoals', this.savingsGoals);
        this._saveCollection('recurringItems', this.recurringItems);
        this._saveCollection('settings', this.settings);
        
        // 創建預設類別
        this._createDefaultCategories();
        
        // 套用設定
        document.documentElement.removeAttribute('data-theme');
        
        // 發布資料清除事件
        EventBus.publish('dataCleared', {});
        
        return true;
    }
};
