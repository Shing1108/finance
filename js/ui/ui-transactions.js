/**
 * ui-transactions.js - 交易記錄UI
 */

const UiTransactions = {
    /**
     * 初始化交易記錄UI
     */
    init: function() {
        // 初始化收入/支出頁籤
        this._initTransactionTabs();
        
        // 初始化表單日期
        this._initFormDates();
        
        // 初始化戶口和類別選項
        this.updateAccountOptions();
        this.updateCategoryOptions();
        
        // 初始化保存按鈕
        document.getElementById('saveIncomeButton').addEventListener('click', () => {
            this.saveIncome();
        });
        
        document.getElementById('saveExpenseButton').addEventListener('click', () => {
            this.saveExpense();
        });
        
        // 初始化交易列表
        this._initTransactionList();
        
        // 初始化搜尋按鈕
        document.getElementById('searchTransactionsButton').addEventListener('click', () => {
            this.searchTransactions();
        });
        
        // 監聽戶口和類別變更事件
        EventBus.subscribe('accountAdded', () => this.updateAccountOptions());
        EventBus.subscribe('accountUpdated', () => this.updateAccountOptions());
        EventBus.subscribe('accountDeleted', () => this.updateAccountOptions());
        
        EventBus.subscribe('categoryAdded', () => this.updateCategoryOptions());
        EventBus.subscribe('categoryUpdated', () => this.updateCategoryOptions());
        EventBus.subscribe('categoryDeleted', () => this.updateCategoryOptions());
        
        EventBus.subscribe('transactionAdded', () => this.refreshTransactionList());
        EventBus.subscribe('transactionUpdated', () => this.refreshTransactionList());
        EventBus.subscribe('transactionDeleted', () => this.refreshTransactionList());
        
        console.log('交易記錄UI初始化完成');
    },
    
  /**
 * 初始化收入/支出頁籤
 */
_initTransactionTabs: function() {
    document.getElementById('incomeTabButton').addEventListener('click', () => {
        document.getElementById('incomeTabButton').classList.add('active');
        document.getElementById('expenseTabButton').classList.remove('active');
        document.getElementById('incomeTab').style.display = 'block;visibility: visible; opacity: 1;';
        document.getElementById('expenseTab').style.display = 'none;visibility: visible; opacity: 1;';
        
        // 重置支出表單
        this._resetExpenseForm();
    });
    
    document.getElementById('expenseTabButton').addEventListener('click', () => {
        document.getElementById('incomeTabButton').classList.remove('active');
        document.getElementById('expenseTabButton').classList.add('active');
        document.getElementById('incomeTab').style.display = 'none';
        document.getElementById('expenseTab').style.display = 'block';
        
        // 重置收入表單
        this._resetIncomeForm();
    });
},

/**
 * 重置收入表單
 */
_resetIncomeForm: function() {
    document.getElementById('incomeAccount').selectedIndex = 0;
    document.getElementById('incomeCategory').selectedIndex = 0;
    document.getElementById('incomeAmount').value = '';
    document.getElementById('incomeCurrency').value = Store.settings.defaultCurrency;
    document.getElementById('incomeDate').value = DayManager.getCurrentDate();
    document.getElementById('incomeNote').value = '';
},

/**
 * 重置支出表單
 */
_resetExpenseForm: function() {
    document.getElementById('expenseAccount').selectedIndex = 0;
    document.getElementById('expenseCategory').selectedIndex = 0;
    document.getElementById('expenseAmount').value = '';
    document.getElementById('expenseCurrency').value = Store.settings.defaultCurrency;
    document.getElementById('expenseDate').value = DayManager.getCurrentDate();
    document.getElementById('expenseNote').value = '';
},
    
    /**
     * 初始化表單日期
     */
    _initFormDates: function() {
        const today = DayManager.getCurrentDate();
        
        document.getElementById('incomeDate').value = today;
        document.getElementById('expenseDate').value = today;
        
        // 設定搜尋日期範圍（預設為本月）
        const firstDayOfMonth = DateUtils.firstDayOfMonth();
        const lastDayOfMonth = DateUtils.lastDayOfMonth();
        
        document.getElementById('startDate').value = firstDayOfMonth;
        document.getElementById('endDate').value = lastDayOfMonth;
    },
    
    /**
     * 初始化交易列表
     */
    _initTransactionList: function() {
        // 交易編輯和刪除按鈕事件委派
        document.getElementById('transactionsList').addEventListener('click', (event) => {
            const target = event.target.closest('.edit-transaction, .delete-transaction');
            if (!target) return;
            
            const transactionId = target.dataset.id;
            
            if (target.classList.contains('edit-transaction')) {
                this.showEditTransactionModal(transactionId);
            } else if (target.classList.contains('delete-transaction')) {
                this.deleteTransaction(transactionId);
            }
        });
        
        // 載入初始交易列表
        this.searchTransactions();
    },
    
    /**
     * 更新戶口選項
     */
    updateAccountOptions: function() {
        const accounts = Store.getAccounts();
        
        // 收入戶口
        const incomeAccountSelect = document.getElementById('incomeAccount');
        incomeAccountSelect.innerHTML = '<option value="" disabled selected>選擇戶口</option>';
        
        // 支出戶口
        const expenseAccountSelect = document.getElementById('expenseAccount');
        expenseAccountSelect.innerHTML = '<option value="" disabled selected>選擇戶口</option>';
        
        // 添加選項
        accounts.forEach(account => {
            // 收入選項
            const incomeOption = document.createElement('option');
            incomeOption.value = account.id;
            incomeOption.textContent = `${account.name} (${account.currency})`;
            incomeAccountSelect.appendChild(incomeOption);
            
            // 支出選項
            const expenseOption = document.createElement('option');
            expenseOption.value = account.id;
            expenseOption.textContent = `${account.name} (${account.currency})`;
            expenseAccountSelect.appendChild(expenseOption);
        });
    },
    
    /**
     * 更新類別選項
     */
    updateCategoryOptions: function() {
        // 收入類別
        const incomeCategories = Store.getCategories('income');
        const incomeCategorySelect = document.getElementById('incomeCategory');
        incomeCategorySelect.innerHTML = '<option value="" disabled selected>選擇類別</option>';
        
        incomeCategories.sort((a, b) => a.order - b.order).forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            incomeCategorySelect.appendChild(option);
        });
        
        // 支出類別
        const expenseCategories = Store.getCategories('expense');
        const expenseCategorySelect = document.getElementById('expenseCategory');
        expenseCategorySelect.innerHTML = '<option value="" disabled selected>選擇類別</option>';
        
        expenseCategories.sort((a, b) => a.order - b.order).forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            expenseCategorySelect.appendChild(option);
        });
        
        // 搜尋類別
        const categoryFilter = document.getElementById('categoryFilter');
        categoryFilter.innerHTML = '<option value="all">全部類別</option>';
        
        // 添加收入類別
        if (incomeCategories.length > 0) {
            const incomeOptgroup = document.createElement('optgroup');
            incomeOptgroup.label = '收入類別';
            
            incomeCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                incomeOptgroup.appendChild(option);
            });
            
            categoryFilter.appendChild(incomeOptgroup);
        }
        
        // 添加支出類別
        if (expenseCategories.length > 0) {
            const expenseOptgroup = document.createElement('optgroup');
            expenseOptgroup.label = '支出類別';
            
            expenseCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                expenseOptgroup.appendChild(option);
            });
            
            categoryFilter.appendChild(expenseOptgroup);
        }
    },
    
    /**
     * 保存收入
     */
    saveIncome: function() {
        // 取得表單資料
        const accountId = document.getElementById('incomeAccount').value;
        const categoryId = document.getElementById('incomeCategory').value;
        const amount = parseFloat(document.getElementById('incomeAmount').value);
        const currency = document.getElementById('incomeCurrency').value;
        const date = document.getElementById('incomeDate').value;
        const note = document.getElementById('incomeNote').value;
        
        // 驗證
        if (!accountId) {
            Utils.showToast('請選擇戶口', 'error');
            return;
        }
        
        if (!categoryId) {
            Utils.showToast('請選擇類別', 'error');
            return;
        }
        
        if (isNaN(amount) || amount <= 0) {
            Utils.showToast('請輸入有效的金額', 'error');
            return;
        }
        
        if (!date) {
            Utils.showToast('請選擇日期', 'error');
            return;
        }
        
        // 取得戶口資訊
        const account = Store.getAccount(accountId);
        
        // 準備交易資料
        const transactionData = {
            type: 'income',
            accountId,
            categoryId,
            amount,
            date,
            note,
            currency: currency,
            
            // 如果貨幣與戶口不同，記錄原始金額和兌換
            originalAmount: amount,
            originalCurrency: currency,
            exchangeRate: 1
        };
        
        // 如果選擇的貨幣與戶口貨幣不同，進行兌換
        if (currency !== account.currency) {
            const exchangeRate = CurrencyManager.getExchangeRate(currency, account.currency);
            const convertedAmount = amount * exchangeRate;
            
            transactionData.amount = convertedAmount;
            transactionData.currency = account.currency;
            transactionData.exchangeRate = exchangeRate;
        }
        
        // 儲存交易
        const result = App.addTransaction(transactionData);
        
        // 處理結果
        if (result) {
            // 重設表單
            document.getElementById('incomeAmount').value = '';
            document.getElementById('incomeNote').value = '';
            
            // 更新UI
            UiCore.updateFinancialSnapshot();
            this.refreshTransactionList();
            const event = new CustomEvent('transactionCompleted', {
                detail: {
                    transaction: result,
                    type: 'income' // 或 'expense'
                }
            });
            document.dispatchEvent(event);
        }
    },
    
    /**
     * 保存支出
     */
    saveExpense: function() {
        // 取得表單資料
        const accountId = document.getElementById('expenseAccount').value;
        const categoryId = document.getElementById('expenseCategory').value;
        const amount = parseFloat(document.getElementById('expenseAmount').value);
        const currency = document.getElementById('expenseCurrency').value;
        const date = document.getElementById('expenseDate').value;
        const note = document.getElementById('expenseNote').value;
        
        // 驗證
        if (!accountId) {
            Utils.showToast('請選擇戶口', 'error');
            return;
        }
        
        if (!categoryId) {
            Utils.showToast('請選擇類別', 'error');
            return;
        }
        
        if (isNaN(amount) || amount <= 0) {
            Utils.showToast('請輸入有效的金額', 'error');
            return;
        }
        
        if (!date) {
            Utils.showToast('請選擇日期', 'error');
            return;
        }
        
        // 取得戶口資訊
        const account = Store.getAccount(accountId);
        
        // 準備交易資料
        const transactionData = {
            type: 'expense',
            accountId,
            categoryId,
            amount,
            date,
            note,
            currency: currency,
            
            // 如果貨幣與戶口不同，記錄原始金額和兌換
            originalAmount: amount,
            originalCurrency: currency,
            exchangeRate: 1
        };
        
        // 如果選擇的貨幣與戶口貨幣不同，進行兌換
        if (currency !== account.currency) {
            const exchangeRate = CurrencyManager.getExchangeRate(currency, account.currency);
            const convertedAmount = amount * exchangeRate;
            
            transactionData.amount = convertedAmount;
            transactionData.currency = account.currency;
            transactionData.exchangeRate = exchangeRate;
        }
        
        // 儲存交易
        const result = App.addTransaction(transactionData);
        
        // 處理結果
        if (result) {
            // 重設表單
            document.getElementById('expenseAmount').value = '';
            document.getElementById('expenseNote').value = '';
            
            // 更新UI
            UiCore.updateFinancialSnapshot();
            this.refreshTransactionList();

            const event = new CustomEvent('transactionCompleted', {
                detail: {
                    transaction: result,
                    type: 'expense' // 或 'expense'
                }
            });
            document.dispatchEvent(event);
        }
    },
    
/**
 * 顯示編輯交易模態框
 */
showEditTransactionModal: function(transactionId) {
    // 獲取交易資料
    const transaction = Store.getTransaction(transactionId);
    if (!transaction) {
        Utils.showToast('找不到指定交易', 'error');
        return;
    }
    
    console.log('編輯交易:', transaction);
    
    // 構建模態框 HTML
    const modalHtml = `
        <div id="editTransactionModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>編輯${transaction.type === 'income' ? '收入' : transaction.type === 'expense' ? '支出' : '轉賬'}</h3>
                    <span class="close-button">&times;</span>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="editTransactionId" value="${transaction.id}">
                    <input type="hidden" id="editTransactionType" value="${transaction.type}">
                    
                    ${transaction.type !== 'transfer' ? `
                    <div class="form-group">
                        <label for="editTransactionAccount">戶口</label>
                        <select id="editTransactionAccount" class="form-control">
                            <option value="" disabled>選擇戶口</option>
                        </select>
                    </div>
                    ` : `
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editTransactionFromAccount">來源戶口</label>
                            <select id="editTransactionFromAccount" class="form-control">
                                <option value="" disabled>選擇戶口</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="editTransactionToAccount">目標戶口</label>
                            <select id="editTransactionToAccount" class="form-control">
                                <option value="" disabled>選擇戶口</option>
                            </select>
                        </div>
                    </div>
                    `}
                    
                    ${transaction.type !== 'transfer' ? `
                    <div class="form-group">
                        <label for="editTransactionCategory">類別</label>
                        <select id="editTransactionCategory" class="form-control">
                            <option value="" disabled>選擇類別</option>
                        </select>
                    </div>
                    ` : ''}
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editTransactionAmount">金額</label>
                            <input type="number" id="editTransactionAmount" class="form-control" min="0" step="0.01" value="${transaction.originalAmount || transaction.amount}">
                        </div>
                        <div class="form-group">
                            <label for="editTransactionCurrency">貨幣</label>
                            <select id="editTransactionCurrency" class="form-control">
                                <option value="HKD">港幣 (HKD)</option>
                                <option value="USD">美元 (USD)</option>
                                <option value="CNY">人民幣 (CNY)</option>
                                <option value="EUR">歐元 (EUR)</option>
                                <option value="GBP">英鎊 (GBP)</option>
                                <option value="JPY">日圓 (JPY)</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="editTransactionDate">日期</label>
                        <input type="date" id="editTransactionDate" class="form-control" value="${transaction.date}">
                    </div>
                    
                    <div class="form-group">
                        <label for="editTransactionNote">備註</label>
                        <textarea id="editTransactionNote" class="form-control">${transaction.note || ''}</textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="saveEditTransactionButton" class="btn btn-primary">保存</button>
                    <button class="btn btn-secondary modal-cancel">取消</button>
                </div>
            </div>
        </div>
    `;
    
    // 如果模態框已存在，則移除
    const existingModal = document.getElementById('editTransactionModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 添加模態框到頁面
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // 填充戶口選項
    const accounts = Store.getAccounts();
    
    if (transaction.type !== 'transfer') {
        // 收入或支出交易
        const accountSelect = document.getElementById('editTransactionAccount');
        accounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account.id;
            option.textContent = `${account.name} (${account.currency})`;
            accountSelect.appendChild(option);
        });
        
        // 選中當前戶口
        accountSelect.value = transaction.accountId;
        
        // 填充類別選項
        const categories = Store.getCategories(transaction.type);
        const categorySelect = document.getElementById('editTransactionCategory');
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
        
        // 選中當前類別
        categorySelect.value = transaction.categoryId;
    } else {
        // 轉賬交易
        const fromAccountSelect = document.getElementById('editTransactionFromAccount');
        const toAccountSelect = document.getElementById('editTransactionToAccount');
        
        accounts.forEach(account => {
            // 來源戶口選項
            const fromOption = document.createElement('option');
            fromOption.value = account.id;
            fromOption.textContent = `${account.name} (${account.currency})`;
            fromAccountSelect.appendChild(fromOption);
            
            // 目標戶口選項
            const toOption = document.createElement('option');
            toOption.value = account.id;
            toOption.textContent = `${account.name} (${account.currency})`;
            toAccountSelect.appendChild(toOption);
        });
        
        // 選中當前來源和目標戶口
        fromAccountSelect.value = transaction.accountId;
        toAccountSelect.value = transaction.toAccountId;
    }
    
    // 設置貨幣
    document.getElementById('editTransactionCurrency').value = transaction.originalCurrency || transaction.currency;
    
    // 綁定保存按鈕事件
    document.getElementById('saveEditTransactionButton').addEventListener('click', () => {
        this.saveEditTransaction();
    });
    
    // 綁定關閉按鈕事件
    document.querySelector('#editTransactionModal .close-button').addEventListener('click', () => {
        UiCore.closeModal('editTransactionModal');
    });
    
    document.querySelector('#editTransactionModal .modal-cancel').addEventListener('click', () => {
        UiCore.closeModal('editTransactionModal');
    });
    
    // 顯示模態框
    UiCore.showModal('editTransactionModal');
},

/**
 * 保存編輯後的交易
 */
saveEditTransaction: function() {
    // 獲取交易 ID 和類型
    const transactionId = document.getElementById('editTransactionId').value;
    const type = document.getElementById('editTransactionType').value;
    
    try {
        // 獲取表單數據
        let transactionData = {
            type,
            date: document.getElementById('editTransactionDate').value,
            note: document.getElementById('editTransactionNote').value
        };
        
        // 根據交易類型獲取不同的字段
        if (type !== 'transfer') {
            // 收入或支出
            const accountId = document.getElementById('editTransactionAccount').value;
            const categoryId = document.getElementById('editTransactionCategory').value;
            const amount = parseFloat(document.getElementById('editTransactionAmount').value);
            const currency = document.getElementById('editTransactionCurrency').value;
            
            if (!accountId || !categoryId || isNaN(amount) || amount <= 0 || !currency) {
                Utils.showToast('請填寫所有必要的欄位', 'error');
                return;
            }
            
            // 獲取戶口資訊
            const account = Store.getAccount(accountId);
            
            // 設置基本資料
            transactionData = {
                ...transactionData,
                accountId,
                categoryId,
                amount,
                currency,
                originalAmount: amount,
                originalCurrency: currency,
                exchangeRate: 1
            };
            
            // 處理貨幣轉換
            if (currency !== account.currency) {
                const exchangeRate = CurrencyManager.getExchangeRate(currency, account.currency);
                transactionData.amount = amount * exchangeRate;
                transactionData.currency = account.currency;
                transactionData.exchangeRate = exchangeRate;
            }
        } else {
            // 轉賬
            const fromAccountId = document.getElementById('editTransactionFromAccount').value;
            const toAccountId = document.getElementById('editTransactionToAccount').value;
            const amount = parseFloat(document.getElementById('editTransactionAmount').value);
            const currency = document.getElementById('editTransactionCurrency').value;
            
            if (!fromAccountId || !toAccountId || isNaN(amount) || amount <= 0) {
                Utils.showToast('請填寫所有必要的欄位', 'error');
                return;
            }
            
            if (fromAccountId === toAccountId) {
                Utils.showToast('來源和目標戶口不能相同', 'error');
                return;
            }
            
            // 獲取戶口資訊
            const fromAccount = Store.getAccount(fromAccountId);
            const toAccount = Store.getAccount(toAccountId);
            
            // 設置基本資料
            transactionData = {
                ...transactionData,
                accountId: fromAccountId,
                toAccountId,
                amount,
                currency: fromAccount.currency,
                originalAmount: amount,
                originalCurrency: currency,
                exchangeRate: 1
            };
            
            // 處理貨幣轉換
            if (currency !== fromAccount.currency) {
                const exchangeRate = CurrencyManager.getExchangeRate(currency, fromAccount.currency);
                transactionData.amount = amount * exchangeRate;
                transactionData.exchangeRate = exchangeRate;
            }
        }
        
        console.log('更新交易資料:', transactionData);
        
        // 保存更新
        const result = App.updateTransaction(transactionId, transactionData);
        
        if (result) {
            UiCore.closeModal('editTransactionModal');
            this.refreshTransactionList();
            UiCore.updateFinancialSnapshot();
            
            // 觸發交易更新事件，通知其他模塊(如儲蓄目標)
            const event = new CustomEvent('transactionUpdated', {
                detail: {
                    transaction: result
                }
            });
            document.dispatchEvent(event);
        }
    } catch (error) {
        console.error('保存編輯交易時發生錯誤:', error);
        Utils.showToast('保存失敗，請檢查輸入', 'error');
    }
},
    
    /**
     * 刪除交易
     */
    deleteTransaction: function(transactionId) {
        // 確認刪除
        if (!confirm('確定要刪除此交易嗎？此操作無法復原。')) {
            return;
        }
        
        // 執行刪除
        const result = App.deleteTransaction(transactionId);
        
        // 處理結果
        if (result) {
            UiCore.updateFinancialSnapshot();
            this.refreshTransactionList();
        }
    },
    
    /**
     * 搜尋交易
     */
    searchTransactions: function() {
        // 取得搜尋條件
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const type = document.getElementById('transactionTypeFilter').value;
        const categoryId = document.getElementById('categoryFilter').value;
        
        // 準備過濾條件
        const filters = {
            startDate,
            endDate
        };
        
        if (type !== 'all') {
            filters.type = type;
        }
        
        if (categoryId !== 'all') {
            filters.categoryId = categoryId;
        }
        
        // 取得交易
        const transactions = Store.getTransactions(filters);
        
        // 顯示交易
        this.displayTransactions(transactions);
    },
    
    /**
     * 重新整理交易列表
     */
    refreshTransactionList: function() {
        // 重新執行當前搜尋
        this.searchTransactions();
    },
    
    /**
     * 顯示交易列表
     */
    displayTransactions: function(transactions) {
        const transactionsList = document.getElementById('transactionsList');
        
        // 清空列表
        transactionsList.innerHTML = '';
        
        // 如果沒有交易，顯示提示訊息
        if (transactions.length === 0) {
            transactionsList.innerHTML = '<p class="empty-message">無符合條件的交易記錄</p>';
            return;
        }
        
        // 顯示交易
        transactions.forEach(transaction => {
            const transactionHtml = UiCore.createTransactionHTML(transaction);
            transactionsList.innerHTML += transactionHtml;
        });
    },
    
    /**
     * 重新整理 UI
     */
    refresh: function() {
        this.updateAccountOptions();
        this.updateCategoryOptions();
        this.refreshTransactionList();
        this._initFormDates();
    }
};