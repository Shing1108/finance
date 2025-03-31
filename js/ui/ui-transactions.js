// ui-transactions.js - 交易UI相關

/**
 * 創建編輯交易模態框
 */
function createEditTransactionModal() {
    // 創建模態框HTML
    const modalHTML = `
    <div id="editTransactionModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>編輯交易</h3>
                <button class="close-button">&times;</button>
            </div>
            <div class="modal-body">
                <div class="tabs">
                    <div class="tab-buttons">
                        <button id="editIncomeTabButton" class="tab-button active">收入</button>
                        <button id="editExpenseTabButton" class="tab-button">支出</button>
                    </div>
                    <div class="tab-content">
                        <div id="editIncomeTab" class="tab-pane active">
                            <form id="editIncomeForm">
                                <input type="hidden" id="editIncomeId">
                                <div class="form-group">
                                    <label for="editIncomeAccount">選擇戶口</label>
                                    <select id="editIncomeAccount" required>
                                        <option value="" disabled selected>選擇戶口</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="editIncomeCategory">選擇類別</label>
                                    <select id="editIncomeCategory" required>
                                        <option value="" disabled selected>選擇類別</option>
                                    </select>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="editIncomeAmount">金額</label>
                                        <input type="number" id="editIncomeAmount" min="0" step="0.01" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="editIncomeCurrency">貨幣</label>
                                        <select id="editIncomeCurrency" required>
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
                                    <label for="editIncomeDate">日期</label>
                                    <input type="date" id="editIncomeDate" required>
                                </div>
                                <div class="form-group">
                                    <label for="editIncomeNote">備註 (可選)</label>
                                    <textarea id="editIncomeNote"></textarea>
                                </div>
                                <button type="button" id="updateIncomeButton" class="btn btn-primary">更新</button>
                            </form>
                        </div>
                        <div id="editExpenseTab" class="tab-pane">
                            <form id="editExpenseForm">
                                <input type="hidden" id="editExpenseId">
                                <div class="form-group">
                                    <label for="editExpenseAccount">選擇戶口</label>
                                    <select id="editExpenseAccount" required>
                                        <option value="" disabled selected>選擇戶口</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="editExpenseCategory">選擇類別</label>
                                    <select id="editExpenseCategory" required>
                                        <option value="" disabled selected>選擇類別</option>
                                    </select>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="editExpenseAmount">金額</label>
                                        <input type="number" id="editExpenseAmount" min="0" step="0.01" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="editExpenseCurrency">貨幣</label>
                                        <select id="editExpenseCurrency" required>
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
                                    <label for="editExpenseDate">日期</label>
                                    <input type="date" id="editExpenseDate" required>
                                </div>
                                <div class="form-group">
                                    <label for="editExpenseNote">備註 (可選)</label>
                                    <textarea id="editExpenseNote"></textarea>
                                </div>
                                <button type="button" id="updateExpenseButton" class="btn btn-primary">更新</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    // 添加到文檔
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // 設置事件監聽器
    document.querySelector('#editTransactionModal .close-button').addEventListener('click', closeCurrentModal);
    
    // 標籤切換
    document.getElementById('editIncomeTabButton').addEventListener('click', function() {
        this.classList.add('active');
        document.getElementById('editExpenseTabButton').classList.remove('active');
        document.getElementById('editIncomeTab').classList.add('active');
        document.getElementById('editExpenseTab').classList.remove('active');
    });
    
    document.getElementById('editExpenseTabButton').addEventListener('click', function() {
        this.classList.add('active');
        document.getElementById('editIncomeTabButton').classList.remove('active');
        document.getElementById('editExpenseTab').classList.add('active');
        document.getElementById('editIncomeTab').classList.remove('active');
    });
    
    // 更新按鈕
    document.getElementById('updateIncomeButton').addEventListener('click', updateTransaction);
    document.getElementById('updateExpenseButton').addEventListener('click', updateTransaction);

    // 綁定賬戶變更事件
    document.getElementById('editIncomeAccount').addEventListener('change', function() {
        const accountId = this.value;
        if (!accountId) return;
        
        const account = appState.accounts.find(a => a.id === accountId);
        if (account) {
            document.getElementById('editIncomeCurrency').value = account.currency;
        }
    });

    document.getElementById('editExpenseAccount').addEventListener('change', function() {
        const accountId = this.value;
        if (!accountId) return;
        
        const account = appState.accounts.find(a => a.id === accountId);
        if (account) {
            document.getElementById('editExpenseCurrency').value = account.currency;
        }
    });
}

/**
 * 保存交易
 * @param {string} type 交易類型 (income或expense)
 */
function saveTransaction(type) {
    console.log(`保存${type === 'income' ? '收入' : '支出'}交易`);

    try {
        const accountId = document.getElementById(`${type}Account`).value;
        const categoryId = document.getElementById(`${type}Category`).value;
        const amount = parseFloat(document.getElementById(`${type}Amount`).value);
        const currency = document.getElementById(`${type}Currency`).value; 
        const date = document.getElementById(`${type}Date`).value;
        const note = document.getElementById(`${type}Note`).value.trim();

        // 驗證
        if (!accountId) {
            showToast('請選擇賬戶', 'error');
            return;
        }

        if (!categoryId) {
            showToast('請選擇類別', 'error');
            return;
        }

        if (!amount || amount <= 0) {
            showToast('請輸入有效金額', 'error');
            return;
        }

        if (!date) {
            showToast('請選擇日期', 'error');
            return;
        }

        // 獲取賬戶信息
        const account = appState.accounts.find(a => a.id === accountId);
        if (!account) {
            showToast('找不到賬戶', 'error');
            return;
        }

        // 計算貨幣轉換（如果選擇的貨幣與賬戶貨幣不同）
        let convertedAmount = amount;
        if (currency !== account.currency) {
            try {
                const rate = getExchangeRate(currency, account.currency);
                convertedAmount = amount * rate;
                console.log(`貨幣轉換: ${amount} ${currency} => ${convertedAmount} ${account.currency}`);
            } catch (e) {
                console.error("貨幣轉換錯誤:", e);
                showToast('貨幣轉換錯誤，請檢查匯率設置', 'error');
                return;
            }
        }

        // 創建交易對象
        const newTransaction = {
            id: generateId(),
            type: type,
            accountId: accountId,
            categoryId: categoryId,
            amount: convertedAmount, // 使用轉換後的金額
            originalAmount: amount, // 保存原始金額
            originalCurrency: currency, // 保存原始貨幣
            date: date,
            note: note,
            createdAt: new Date().toISOString()
        };

        // 更新賬戶餘額
        if (type === 'income') {
            account.balance += convertedAmount;
            updateBudgetWithIncome(convertedAmount);
        } else {
            account.balance -= convertedAmount;
        }

        // 添加到交易數組
        appState.transactions.push(newTransaction);

        // 更新UI
        updateTransactionsUI();
        updateAccountsUI();
        updateDashboardUI();

        // 清空表單
        document.getElementById(`${type}Amount`).value = '';
        document.getElementById(`${type}Note`).value = '';

        // 保存到本地存儲
        saveToLocalStorage();

        // 檢查預算警告
        if (typeof checkBudgetAlerts === 'function') {
            checkBudgetAlerts();
        }

        // 執行同步(如果啟用)
        if (enableFirebase && isLoggedIn) {
            syncToFirebase();
        }

        // 更新頂部狀態欄
        if (window.dayManager) {
            window.dayManager.onTransactionAdded();
        }

        // 顯示成功消息
        if (currency !== account.currency) {
            showToast(`已記錄${type === 'income' ? '收入' : '支出'}: ${formatCurrency(amount, currency)} (${formatCurrency(convertedAmount, account.currency)})`, 'success');
        } else {
            showToast(`已記錄${type === 'income' ? '收入' : '支出'}: ${formatCurrency(amount, currency)}`, 'success');
        }
    } catch (error) {
        console.error(`保存${type}交易時發生錯誤:`, error);
        showToast(`保存${type === 'income' ? '收入' : '支出'}交易失敗: ` + error.message, 'error');
    }
}

/**
 * 過濾交易
 */
function filterTransactions() {
    console.log("過濾交易");

    try {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const typeFilter = document.getElementById('transactionTypeFilter').value;
        const categoryFilter = document.getElementById('categoryFilter').value;

        // 構建過濾條件
        const filters = {};

        if (startDate) {
            filters.startDate = startDate;
        }

        if (endDate) {
            filters.endDate = endDate;
        }

        if (typeFilter && typeFilter !== 'all') {
            filters.type = typeFilter;
        }

        if (categoryFilter && categoryFilter !== 'all') {
            filters.categoryId = categoryFilter;
        }

        // 應用過濾器並更新UI
        updateTransactionsList(filters);
    } catch (error) {
        console.error("過濾交易時發生錯誤:", error);
        showToast('過濾交易失敗: ' + error.message, 'error');
    }
}

/**
 * 更新交易列表
 * @param {Object} filters 過濾條件
 */
function updateTransactionsList(filters = {}) {
    console.log("更新交易列表", filters);

    try {
        const transactionsList = document.getElementById('transactionsList');
        if (!transactionsList) {
            console.error("找不到交易列表元素");
            return;
        }

        // 過濾交易
        let filteredTransactions = [...appState.transactions];

        if (filters.startDate) {
            filteredTransactions = filteredTransactions.filter(t => t.date >= filters.startDate);
        }

        if (filters.endDate) {
            filteredTransactions = filteredTransactions.filter(t => t.date <= filters.endDate);
        }

        if (filters.type) {
            filteredTransactions = filteredTransactions.filter(t => t.type === filters.type);
        }

        if (filters.categoryId) {
            filteredTransactions = filteredTransactions.filter(t => t.categoryId === filters.categoryId);
        }

        // 按日期排序(降序)
        filteredTransactions.sort((a, b) => {
            if (a.date !== b.date) {
                return b.date.localeCompare(a.date);
            }
            return (b.createdAt || '').localeCompare(a.createdAt || '');
        });

        // 生成HTML
        if (filteredTransactions.length === 0) {
            transactionsList.innerHTML = '<p class="empty-message">無符合條件的交易記錄</p>';
            return;
        }

        let html = '';

        filteredTransactions.forEach(transaction => {
            const account = appState.accounts.find(a => a.id === transaction.accountId);

            // 確定類別
            let categoryName = '';
            let categoryIcon = 'fas fa-exchange-alt';
            let categoryColor = '#777';

            if (transaction.categoryId === 'transfer_out') {
                categoryName = '轉賬支出';
                categoryIcon = 'fas fa-arrow-right';
                categoryColor = '#e67e22';
            } else if (transaction.categoryId === 'transfer_in') {
                categoryName = '轉賬收入';
                categoryIcon = 'fas fa-arrow-left';
                categoryColor = '#27ae60';
            } else {
                const categoryArray = transaction.type === 'income' ? appState.categories.income : appState.categories.expense;
                const category = categoryArray.find(c => c.id === transaction.categoryId);

                if (category) {
                    categoryName = category.name;
                    categoryIcon = category.icon;
                    categoryColor = category.color;
                }
            }

            // 格式化日期
            let formattedDate = transaction.date;
            try {
                const [year, month, day] = transaction.date.split('-');
                formattedDate = `${day}/${month}/${year}`;
            } catch (e) {
                console.error("格式化日期出錯:", e);
            }

            html += `
            <div class="transaction-item ${transaction.type}" data-id="${transaction.id}">
                <div class="transaction-date">${formattedDate}</div>
                <div class="transaction-icon" style="color: ${categoryColor}">
                    <i class="${categoryIcon}"></i>
                </div>
                <div class="transaction-details">
                    <div class="transaction-category">${categoryName}</div>
                    <div class="transaction-account">${account ? account.name : '未知賬戶'}</div>
                    ${transaction.note ? `<div class="transaction-note">${transaction.note}</div>` : ''}
                    ${transaction.originalCurrency && transaction.originalCurrency !== account?.currency ? 
                        `<div class="transaction-original">原始金額: ${formatCurrency(transaction.originalAmount, transaction.originalCurrency)}</div>` : ''}
                </div>
                <div class="transaction-amount">${formatCurrency(transaction.amount, account ? account.currency : defaultCurrency)}</div>
                <div class="transaction-actions">
                    <button class="btn-icon edit-transaction" data-id="${transaction.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete-transaction" data-id="${transaction.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            `;
        });

        transactionsList.innerHTML = html;

        // 添加編輯和刪除按鈕的事件監聽器
        transactionsList.querySelectorAll('.edit-transaction').forEach(button => {
            button.addEventListener('click', function () {
                const transactionId = this.getAttribute('data-id');
                editTransaction(transactionId);
            });
        });

        transactionsList.querySelectorAll('.delete-transaction').forEach(button => {
            button.addEventListener('click', function () {
                const transactionId = this.getAttribute('data-id');
                const message = '確定要刪除這筆交易嗎?';
                showConfirmDialog(message, () => deleteTransaction(transactionId));
            });
        });
    } catch (error) {
        console.error("更新交易列表時發生錯誤:", error);
        
        // 安全顯示一個錯誤信息
        const transactionsList = document.getElementById('transactionsList');
        if (transactionsList) {
            transactionsList.innerHTML = '<p class="error-message">載入交易失敗，請重新載入頁面</p>';
        }
    }
}

/**
 * 編輯交易
 * @param {string} transactionId 交易ID
 */
function editTransaction(transactionId) {
    console.log(`編輯交易: ${transactionId}`);

    try {
        // 找到要編輯的交易
        const transaction = appState.transactions.find(t => t.id === transactionId);

        if (!transaction) {
            showToast('找不到交易', 'error');
            return;
        }

        // 創建編輯交易模態框(如果尚未存在)
        if (!document.getElementById('editTransactionModal')) {
            createEditTransactionModal();
        }

        // 更新編輯表單
        updateEditTransactionForm();

        // 根據交易類型選擇表單
        const formPrefix = transaction.type === 'income' ? 'editIncome' : 'editExpense';

        // 填充表單
        document.getElementById(`${formPrefix}Id`).value = transaction.id;
        document.getElementById(`${formPrefix}Account`).value = transaction.accountId;
        document.getElementById(`${formPrefix}Category`).value = transaction.categoryId;
        document.getElementById(`${formPrefix}Amount`).value = transaction.originalAmount || transaction.amount;
        document.getElementById(`${formPrefix}Currency`).value = transaction.originalCurrency || defaultCurrency;
        document.getElementById(`${formPrefix}Date`).value = transaction.date;
        document.getElementById(`${formPrefix}Note`).value = transaction.note || '';

        // 顯示相應的選項卡
        if (transaction.type === 'income') {
            document.getElementById('editIncomeTabButton').click();
        } else {
            document.getElementById('editExpenseTabButton').click();
        }

        // 打開模態框
        openModal('editTransactionModal');
    } catch (error) {
        console.error("編輯交易時發生錯誤:", error);
        showToast('編輯交易失敗: ' + error.message, 'error');
    }
}

/**
 * 更新編輯交易表單
 */
function updateEditTransactionForm() {
    try {
        // 更新戶口下拉菜單
        const editIncomeAccount = document.getElementById('editIncomeAccount');
        const editExpenseAccount = document.getElementById('editExpenseAccount');

        if (editIncomeAccount && editExpenseAccount) {
            // 清空下拉菜單
            editIncomeAccount.innerHTML = '<option value="" disabled selected>選擇戶口</option>';
            editExpenseAccount.innerHTML = '<option value="" disabled selected>選擇戶口</option>';

            // 填充下拉菜單
            appState.accounts.forEach(account => {
                const incomeOption = document.createElement('option');
                incomeOption.value = account.id;
                incomeOption.textContent = `${account.name} (${formatCurrency(account.balance, account.currency)})`;

                const expenseOption = document.createElement('option');
                expenseOption.value = account.id;
                expenseOption.textContent = `${account.name} (${formatCurrency(account.balance, account.currency)})`;

                editIncomeAccount.appendChild(incomeOption);
                editExpenseAccount.appendChild(expenseOption);
            });
        }

        // 更新收入類別下拉菜單
        const editIncomeCategory = document.getElementById('editIncomeCategory');
        if (editIncomeCategory) {
            // 清空下拉菜單
            editIncomeCategory.innerHTML = '<option value="" disabled selected>選擇類別</option>';

            // 排序類別
            const sortedIncomeCategories = [...appState.categories.income].sort((a, b) => a.order - b.order);

            // 填充下拉菜單
            sortedIncomeCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                editIncomeCategory.appendChild(option);
            });
        }

        // 更新支出類別下拉菜單
        const editExpenseCategory = document.getElementById('editExpenseCategory');
        if (editExpenseCategory) {
            // 清空下拉菜單
            editExpenseCategory.innerHTML = '<option value="" disabled selected>選擇類別</option>';

            // 排序類別
            const sortedExpenseCategories = [...appState.categories.expense].sort((a, b) => a.order - b.order);

            // 填充下拉菜單
            sortedExpenseCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                editExpenseCategory.appendChild(option);
            });
        }
    } catch (error) {
        console.error("更新編輯交易表單時發生錯誤:", error);
    }
}

/**
 * 更新交易
 */
function updateTransaction() {
    console.log("更新交易");

    try {
        // 確定當前活動的標籤
        const isIncomeTab = document.getElementById('editIncomeTab').classList.contains('active');
        const type = isIncomeTab ? 'income' : 'expense';
        const formPrefix = `edit${type.charAt(0).toUpperCase() + type.slice(1)}`;

        // 獲取表單數據
        const transactionId = document.getElementById(`${formPrefix}Id`).value;
        const accountId = document.getElementById(`${formPrefix}Account`).value;
        const categoryId = document.getElementById(`${formPrefix}Category`).value;
        const amount = parseFloat(document.getElementById(`${formPrefix}Amount`).value);
        const currency = document.getElementById(`${formPrefix}Currency`).value;
        const date = document.getElementById(`${formPrefix}Date`).value;
        const note = document.getElementById(`${formPrefix}Note`).value.trim();

        // 驗證
        if (!accountId) {
            showToast('請選擇賬戶', 'error');
            return;
        }

        if (!categoryId) {
            showToast('請選擇類別', 'error');
            return;
        }

        if (!amount || amount <= 0) {
            showToast('請輸入有效金額', 'error');
            return;
        }

        if (!date) {
            showToast('請選擇日期', 'error');
            return;
        }

        // 找到交易和相關賬戶
        const transactionIndex = appState.transactions.findIndex(t => t.id === transactionId);
        if (transactionIndex === -1) {
            showToast('找不到交易', 'error');
            return;
        }

        const oldTransaction = appState.transactions[transactionIndex];
        const oldAccount = appState.accounts.find(a => a.id === oldTransaction.accountId);
        const newAccount = appState.accounts.find(a => a.id === accountId);

        if (!oldAccount || !newAccount) {
            showToast('找不到賬戶', 'error');
            return;
        }

        // 恢復原始賬戶餘額
        if (oldTransaction.type === 'income') {
            oldAccount.balance -= oldTransaction.amount;
        } else {
            oldAccount.balance += oldTransaction.amount;
        }

        // 計算貨幣轉換（如果選擇的貨幣與賬戶貨幣不同）
        let convertedAmount = amount;
        if (currency !== newAccount.currency) {
            try {
                const rate = getExchangeRate(currency, newAccount.currency);
                convertedAmount = amount * rate;
            } catch (e) {
                console.error("貨幣轉換錯誤:", e);
                showToast('貨幣轉換錯誤，請檢查匯率設置', 'error');
                return;
            }
        }

        // 創建更新後的交易
        const updatedTransaction = {
            ...oldTransaction,
            accountId: accountId,
            categoryId: categoryId,
            amount: convertedAmount,
            originalAmount: amount,
            originalCurrency: currency,
            date: date,
            note: note,
            updatedAt: new Date().toISOString()
        };

        // 更新新賬戶餘額
        if (type === 'income') {
            newAccount.balance += convertedAmount;
        } else {
            newAccount.balance -= convertedAmount;
        }

        // 更新交易
        appState.transactions[transactionIndex] = updatedTransaction;

        // 更新UI
        updateTransactionsUI();
        updateAccountsUI();
        updateDashboardUI();

        // 保存到本地存儲
        saveToLocalStorage();

        // 檢查預算警告
        if (typeof checkBudgetAlerts === 'function') {
            checkBudgetAlerts();
        }

        // 執行同步(如果啟用)
        if (enableFirebase && isLoggedIn) {
            syncToFirebase();
        }

        // 關閉模態框
        closeCurrentModal();

        // 顯示成功消息
        if (currency !== newAccount.currency) {
            showToast(`已更新${type === 'income' ? '收入' : '支出'}: ${formatCurrency(amount, currency)} (${formatCurrency(convertedAmount, newAccount.currency)})`, 'success');
        } else {
            showToast(`已更新${type === 'income' ? '收入' : '支出'}: ${formatCurrency(amount, currency)}`, 'success');
        }
    } catch (error) {
        console.error("更新交易時發生錯誤:", error);
        showToast('更新交易失敗: ' + error.message, 'error');
    }
}

/**
 * 刪除交易
 * @param {string} transactionId 交易ID
 */
function deleteTransaction(transactionId) {
    console.log(`刪除交易: ${transactionId}`);

    try {
        // 找到交易
        const transactionIndex = appState.transactions.findIndex(t => t.id === transactionId);

        if (transactionIndex === -1) {
            showToast('找不到交易', 'error');
            return;
        }

        const transaction = appState.transactions[transactionIndex];

        // 如果是轉賬交易，也需要刪除關聯的交易
        if (transaction.transferId) {
            const relatedTransactionIndex = appState.transactions.findIndex(t =>
                t.transferId === transaction.transferId && t.id !== transactionId
            );

            if (relatedTransactionIndex !== -1) {
                const relatedTransaction = appState.transactions[relatedTransactionIndex];

                // 恢復賬戶餘額(關聯交易)
                const relatedAccount = appState.accounts.find(a => a.id === relatedTransaction.accountId);
                if (relatedAccount) {
                    if (relatedTransaction.type === 'income') {
                        relatedAccount.balance -= relatedTransaction.amount;
                    } else {
                        relatedAccount.balance += relatedTransaction.amount;
                    }
                }

                // 刪除關聯交易
                appState.transactions.splice(relatedTransactionIndex, 1);
            }
        }

        // 恢復賬戶餘額(主交易)
        const account = appState.accounts.find(a => a.id === transaction.accountId);
        if (account) {
            if (transaction.type === 'income') {
                account.balance -= transaction.amount;
            } else {
                account.balance += transaction.amount;
            }
        }

        // 刪除交易
        appState.transactions.splice(transactionIndex, 1);

        // 更新UI
        updateTransactionsUI();
        updateAccountsUI();
        updateDashboardUI();

        // 保存到本地存儲
        saveToLocalStorage();

        // 執行同步(如果啟用)
        if (enableFirebase && isLoggedIn) {
            syncToFirebase();
        }

        // 更新頂部狀態欄
        if (window.dayManager && typeof window.dayManager.updateTopStatusBar === 'function') {
            window.dayManager.updateTopStatusBar();
        }

        // 顯示成功消息
        showToast('交易已刪除', 'success');
    } catch (error) {
        console.error("刪除交易時發生錯誤:", error);
        showToast('刪除交易失敗: ' + error.message, 'error');
    }
}

/**
 * 更新交易表單和類別過濾器
 */
function updateTransactionsUI() {
    console.log("更新交易UI");

    try {
        // 更新交易表單
        updateTransactionsForms();

        // 更新交易列表(顯示所有交易)
        updateTransactionsList();

        // 更新類別過濾器
        updateCategoryFilter();
    } catch (error) {
        console.error("更新交易UI時發生錯誤:", error);
    }
}

/**
 * 更新交易表單
 */
function updateTransactionsForms() {
    console.log("更新交易表單");
    try {
        // 更新收入賬戶下拉菜單
        const incomeAccountSelect = document.getElementById('incomeAccount');
        if (incomeAccountSelect) {
            incomeAccountSelect.innerHTML = '<option value="" disabled selected>選擇戶口</option>';
            appState.accounts.forEach(account => {
                const option = document.createElement('option');
                option.value = account.id;
                option.textContent = `${account.name} (${formatCurrency(account.balance, account.currency)})`;
                incomeAccountSelect.appendChild(option);
            });
        }
        
        // 更新支出賬戶下拉菜單
        const expenseAccountSelect = document.getElementById('expenseAccount');
        if (expenseAccountSelect) {
            expenseAccountSelect.innerHTML = '<option value="" disabled selected>選擇戶口</option>';
            appState.accounts.forEach(account => {
                const option = document.createElement('option');
                option.value = account.id;
                option.textContent = `${account.name} (${formatCurrency(account.balance, account.currency)})`;
                expenseAccountSelect.appendChild(option);
            });
        }
        
        // 更新收入類別下拉菜單
        const incomeCategorySelect = document.getElementById('incomeCategory');
        if (incomeCategorySelect) {
            incomeCategorySelect.innerHTML = '<option value="" disabled selected>選擇類別</option>';
            
            // 排序類別
            const sortedIncomeCategories = [...appState.categories.income].sort((a, b) => a.order - b.order);
            
            sortedIncomeCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                incomeCategorySelect.appendChild(option);
            });
        }
        
        // 更新支出類別下拉菜單
        const expenseCategorySelect = document.getElementById('expenseCategory');
        if (expenseCategorySelect) {
            expenseCategorySelect.innerHTML = '<option value="" disabled selected>選擇類別</option>';
            
            // 排序類別
            const sortedExpenseCategories = [...appState.categories.expense].sort((a, b) => a.order - b.order);
            
            sortedExpenseCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                expenseCategorySelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error("更新交易表單時發生錯誤:", error);
    }
}

/**
 * 更新類別過濾器
 */
function updateCategoryFilter() {
    console.log("更新類別過濾器");

    try {
        const categoryFilter = document.getElementById('categoryFilter');

        if (!categoryFilter) {
            console.error("找不到類別過濾器元素");
            return;
        }

        // 保存當前選中的值
        const currentValue = categoryFilter.value;

        // 清空下拉菜單
        categoryFilter.innerHTML = '<option value="all">全部類別</option>';

        // 收入類別
        if (appState.categories.income.length > 0) {
            const incomeOptgroup = document.createElement('optgroup');
            incomeOptgroup.label = '收入類別';

            // 排序類別(按照order)
            const sortedIncomeCategories = [...appState.categories.income].sort((a, b) => a.order - b.order);

            sortedIncomeCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                incomeOptgroup.appendChild(option);
            });

            categoryFilter.appendChild(incomeOptgroup);
        }

        // 支出類別
        if (appState.categories.expense.length > 0) {
            const expenseOptgroup = document.createElement('optgroup');
            expenseOptgroup.label = '支出類別';

            // 排序類別(按照order)
            const sortedExpenseCategories = [...appState.categories.expense].sort((a, b) => a.order - b.order);

            sortedExpenseCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                expenseOptgroup.appendChild(option);
            });

            categoryFilter.appendChild(expenseOptgroup);
        }

        // 添加轉賬類別
        const transferOptgroup = document.createElement('optgroup');
        transferOptgroup.label = '轉賬';

        const transferInOption = document.createElement('option');
        transferInOption.value = 'transfer_in';
        transferInOption.textContent = '轉賬收入';

        const transferOutOption = document.createElement('option');
        transferOutOption.value = 'transfer_out';
        transferOutOption.textContent = '轉賬支出';

        transferOptgroup.appendChild(transferInOption);
        transferOptgroup.appendChild(transferOutOption);

        categoryFilter.appendChild(transferOptgroup);

        // 恢復選中的值
        if (currentValue && currentValue !== 'all') {
            categoryFilter.value = currentValue;
        }
    } catch (error) {
        console.error("更新類別過濾器時發生錯誤:", error);
    }
}

// 導出函數
window.createEditTransactionModal = createEditTransactionModal;
window.saveTransaction = saveTransaction;
window.filterTransactions = filterTransactions;
window.updateTransactionsList = updateTransactionsList;
window.editTransaction = editTransaction;
window.updateEditTransactionForm = updateEditTransactionForm;
window.updateTransaction = updateTransaction;
window.deleteTransaction = deleteTransaction;
window.updateTransactionsUI = updateTransactionsUI;
window.updateTransactionsForms = updateTransactionsForms;
window.updateCategoryFilter = updateCategoryFilter;