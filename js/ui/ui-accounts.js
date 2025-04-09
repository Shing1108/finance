/**
 * ui-accounts.js - 戶口管理UI
 */

const UiAccounts = {
    /**
     * 初始化戶口管理UI
     */
    init: function() {
        // 初始化視圖切換
        this._initViewToggle();
        
        // 初始化新增戶口按鈕
        document.getElementById('addAccountButton').addEventListener('click', () => {
            this.showAddAccountModal();
        });
        
        // 初始化保存戶口按鈕
        document.getElementById('saveAccountButton').addEventListener('click', () => {
            this.saveAccount();
        });
        
        // 初始化轉賬功能
        this._initTransfer();
        
        // 綁定戶口操作事件
        this._bindAccountEvents();
        
        console.log('戶口管理UI初始化完成');
    },
    
    /**
     * 初始化視圖切換
     */
    _initViewToggle: function() {
        document.getElementById('accountCardView').addEventListener('click', () => {
            document.getElementById('accountCardView').classList.add('active');
            document.getElementById('accountListView').classList.remove('active');
            document.getElementById('accountsList').className = 'accounts-list card-view';
        });
        
        document.getElementById('accountListView').addEventListener('click', () => {
            document.getElementById('accountCardView').classList.remove('active');
            document.getElementById('accountListView').classList.add('active');
            document.getElementById('accountsList').className = 'accounts-list list-view';
        });
    },
    
    /**
     * 初始化轉賬功能
     */
    _initTransfer: function() {
        // 從戶口下拉框變更事件
        document.getElementById('fromAccount').addEventListener('change', () => {
            this.updateTransferExchangeRate();
        });
        
        // 至戶口下拉框變更事件
        document.getElementById('toAccount').addEventListener('change', () => {
            this.updateTransferExchangeRate();
        });
        
        // 轉賬金額變更事件
        document.getElementById('transferAmount').addEventListener('input', () => {
            this.updateTransferExchangeRate();
        });
        
        // 確認轉賬按鈕
        document.getElementById('confirmTransferButton').addEventListener('click', () => {
            this.processTransfer();
        });
    },
    
/**
 * 綁定戶口操作事件
 */
_bindAccountEvents: function() {
    // 使用事件委派，處理新增的戶口元素
    document.getElementById('accountsList').addEventListener('click', (event) => {
        const editButton = event.target.closest('.edit-account');
        const deleteButton = event.target.closest('.delete-account');
        
        if (editButton) {
            this.showEditAccountModal(editButton.dataset.id);
            return;
        }
        
        if (deleteButton) {
            this.deleteAccount(deleteButton.dataset.id);
            return;
        }
        
        // 如果沒有點擊按鈕，檢查是否點擊了戶口卡片
        const accountCard = event.target.closest('.account-card, .account-row');
        if (accountCard && accountCard.dataset.id) {
            this.showAccountOverview(accountCard.dataset.id);
        }
    });
},

/**
 * 顯示戶口總覽
 */
showAccountOverview: function(accountId) {
    const account = Store.getAccount(accountId);
    if (!account) {
        Utils.showToast('找不到指定戶口', 'error');
        return;
    }
    
    // 獲取與此戶口相關的交易
    const recentTransactions = Store.getTransactions({ accountId: account.id })
        .sort((a, b) => new Date(b.date) - new Date(a.date)) // 按日期倒序
        .slice(0, 5); // 只取最近5筆
    
    // 計算本月收入和支出
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    const thisMonthTransactions = Store.getTransactions({
        accountId: account.id,
        startDate: `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`,
        endDate: DateUtils.lastDayOfMonth()
    });
    
    const monthlyIncome = thisMonthTransactions
        .filter(tx => tx.type === 'income')
        .reduce((sum, tx) => sum + tx.amount, 0);
    
    const monthlyExpense = thisMonthTransactions
        .filter(tx => tx.type === 'expense')
        .reduce((sum, tx) => sum + tx.amount, 0);
    
    // 構建交易列表HTML
    let transactionsHtml = '';
    if (recentTransactions.length > 0) {
        recentTransactions.forEach(tx => {
            transactionsHtml += UiCore.createTransactionHTML(tx, false);
        });
    } else {
        transactionsHtml = '<p class="empty-message">暫無交易記錄</p>';
    }
    
    // 構建總覽模態框HTML
    const modalHtml = `
        <div id="accountOverviewModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${account.name} 總覽</h3>
                    <span class="close-button">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="account-overview">
                        <div class="account-details">
                            <div class="account-balance">
                                <h4>當前餘額</h4>
                                <div class="balance-value">${Utils.formatCurrency(account.balance, account.currency)}</div>
                            </div>
                            
                            <div class="account-info">
                                <div><strong>戶口類型：</strong> ${UiCore.getAccountTypeName(account.type)}</div>
                                <div><strong>貨幣：</strong> ${account.currency}</div>
                                ${account.note ? `<div><strong>備註：</strong> ${account.note}</div>` : ''}
                            </div>
                        </div>
                        
                        <div class="account-stats">
                            <div class="stat-item">
                                <div class="stat-label">本月收入</div>
                                <div class="stat-value income">${Utils.formatCurrency(monthlyIncome, account.currency)}</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-label">本月支出</div>
                                <div class="stat-value expense">${Utils.formatCurrency(monthlyExpense, account.currency)}</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-label">本月結餘</div>
                                <div class="stat-value ${monthlyIncome - monthlyExpense >= 0 ? 'positive' : 'negative'}">
                                    ${Utils.formatCurrency(monthlyIncome - monthlyExpense, account.currency)}
                                </div>
                            </div>
                        </div>
                        
                        <h4>近期交易</h4>
                        <div class="recent-transactions">
                            ${transactionsHtml}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-cancel">關閉</button>
                </div>
            </div>
        </div>
    `;
    
    // 添加模態框到頁面
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // 綁定關閉按鈕事件
    document.querySelector('#accountOverviewModal .close-button').addEventListener('click', () => {
        UiCore.closeModal('accountOverviewModal');
    });
    
    document.querySelector('#accountOverviewModal .modal-cancel').addEventListener('click', () => {
        UiCore.closeModal('accountOverviewModal');
    });
    
    // 顯示模態框
    UiCore.showModal('accountOverviewModal');
},
    
    /**
     * 顯示新增戶口模態框
     */
    showAddAccountModal: function() {
        // 重設表單
        document.getElementById('editAccountId').value = '';
        document.getElementById('accountName').value = '';
        document.getElementById('accountType').value = '';
        document.getElementById('initialBalance').value = '';
        document.getElementById('accountCurrency').value = Store.settings.defaultCurrency;
        document.getElementById('accountNote').value = '';
        
        // 修改標題
        document.querySelector('#addAccountModal .modal-header h3').textContent = '新增戶口';
        
        // 顯示模態框
        UiCore.showModal('addAccountModal');
    },
    
    /**
     * 顯示編輯戶口模態框
     */
    showEditAccountModal: function(accountId) {
        const account = Store.getAccount(accountId);
        if (!account) {
            Utils.showToast('找不到指定戶口', 'error');
            return;
        }
        
        // 填充表單
        document.getElementById('editAccountId').value = account.id;
        document.getElementById('accountName').value = account.name;
        document.getElementById('accountType').value = account.type;
        document.getElementById('initialBalance').value = account.balance;
        document.getElementById('accountCurrency').value = account.currency;
        document.getElementById('accountNote').value = account.note || '';
        
        // 修改標題
        document.querySelector('#addAccountModal .modal-header h3').textContent = '編輯戶口';
        
        // 顯示模態框
        UiCore.showModal('addAccountModal');
    },
    
    /**
     * 保存戶口
     */
    saveAccount: function() {
        // 取得表單資料
        const accountId = document.getElementById('editAccountId').value;
        const name = document.getElementById('accountName').value;
        const type = document.getElementById('accountType').value;
        const balance = parseFloat(document.getElementById('initialBalance').value);
        const currency = document.getElementById('accountCurrency').value;
        const note = document.getElementById('accountNote').value;
        
        // 驗證
        if (!name) {
            Utils.showToast('請輸入戶口名稱', 'error');
            return;
        }
        
        if (!type) {
            Utils.showToast('請選擇戶口類型', 'error');
            return;
        }
        
        if (isNaN(balance)) {
            Utils.showToast('請輸入有效的餘額', 'error');
            return;
        }
        
        // 準備資料
        const accountData = {
            name,
            type,
            balance,
            currency,
            note
        };
        
        // 新增或更新戶口
        let result;
        if (accountId) {
            result = App.updateAccount(accountId, accountData);
        } else {
            result = App.addAccount(accountData);
        }
        
        // 處理結果
        if (result) {
            UiCore.closeModal('addAccountModal');
            this.refresh();
            UiCore.updateFinancialSnapshot();
        }
    },
    
    /**
     * 刪除戶口
     */
    deleteAccount: function(accountId) {
        // 確認刪除
        const account = Store.getAccount(accountId);
        if (!account) {
            Utils.showToast('找不到指定戶口', 'error');
            return;
        }
        
        if (!confirm(`確定要刪除戶口「${account.name}」嗎？此操作無法復原，且會移除所有相關交易記錄。`)) {
            return;
        }
        
        // 執行刪除
        const result = App.deleteAccount(accountId);
        
        // 處理結果
        if (result) {
            this.refresh();
            UiCore.updateFinancialSnapshot();
        }
    },
    
    /**
     * 更新轉賬匯率資訊
     */
    updateTransferExchangeRate: function() {
        const fromAccountId = document.getElementById('fromAccount').value;
        const toAccountId = document.getElementById('toAccount').value;
        const amount = parseFloat(document.getElementById('transferAmount').value);
        
        if (!fromAccountId || !toAccountId || isNaN(amount)) {
            document.getElementById('transferExchangeRate').textContent = '--';
            document.getElementById('receivingAmount').textContent = '--';
            return;
        }
        
        const fromAccount = Store.getAccount(fromAccountId);
        const toAccount = Store.getAccount(toAccountId);
        
        if (!fromAccount || !toAccount) {
            document.getElementById('transferExchangeRate').textContent = '--';
            document.getElementById('receivingAmount').textContent = '--';
            return;
        }
        
        // 計算匯率
        const rate = CurrencyManager.getExchangeRate(fromAccount.currency, toAccount.currency);
        document.getElementById('transferExchangeRate').textContent = 
            `1 ${fromAccount.currency} = ${rate.toFixed(4)} ${toAccount.currency}`;
        
        // 計算收款金額
        const receivingAmount = amount * rate;
        document.getElementById('receivingAmount').textContent = 
            Utils.formatCurrency(receivingAmount, toAccount.currency);
    },
    
/**
 * 處理轉賬
 */
processTransfer: function() {
    const fromAccountId = document.getElementById('fromAccount').value;
    const toAccountId = document.getElementById('toAccount').value;
    const amount = parseFloat(document.getElementById('transferAmount').value);
    
    // 驗證
    if (!fromAccountId) {
        Utils.showToast('請選擇來源戶口', 'error');
        return;
    }
    
    if (!toAccountId) {
        Utils.showToast('請選擇目標戶口', 'error');
        return;
    }
    
    if (fromAccountId === toAccountId) {
        Utils.showToast('來源戶口和目標戶口不能相同', 'error');
        return;
    }
    
    if (isNaN(amount) || amount <= 0) {
        Utils.showToast('請輸入有效的轉賬金額', 'error');
        return;
    }
    
    const fromAccount = Store.getAccount(fromAccountId);
    
    // 檢查餘額
    if (amount > fromAccount.balance) {
        Utils.showToast('餘額不足', 'error');
        return;
    }
    
    // 建立轉賬交易
    const transaction = {
        type: 'transfer',
        accountId: fromAccountId,
        toAccountId: toAccountId,
        amount: amount,
        date: DayManager.getCurrentDate(),
        note: `從 ${fromAccount.name} 轉賬`,
        currency: fromAccount.currency
    };
    
    console.log('執行轉賬交易:', transaction);
    
    // 執行轉賬
    const result = App.addTransaction(transaction);
    
// 處理結果
if (result) {
    console.log('轉賬交易成功，檢查是否涉及儲蓄目標');
    
    // 直接檢查並更新儲蓄目標
    this.updateSavingsGoalForTransfer(toAccountId, amount, fromAccount.currency);
    
    // 重設表單
    document.getElementById('transferAmount').value = '';
    document.getElementById('transferExchangeRate').textContent = '--';
    document.getElementById('receivingAmount').textContent = '--';
    
    // 更新UI
    this.refresh();
    UiCore.updateFinancialSnapshot();
}
},

/**
 * 為轉賬更新儲蓄目標進度
 */
updateSavingsGoalForTransfer: function(toAccountId, amount, fromCurrency) {
    console.log(`檢查轉賬到戶口 ${toAccountId} 是否與儲蓄目標相關`);
    
    // 獲取所有儲蓄目標
    const goals = Store.getSavingsGoals();
    if (!goals || goals.length === 0) {
        console.log('沒有找到儲蓄目標');
        return;
    }
    
    console.log(`找到 ${goals.length} 個儲蓄目標，開始逐一檢查`);
    
    // 檢查是否有匹配的儲蓄目標
    let matchFound = false;
    
    // 找到與目標戶口相關的儲蓄目標
    goals.forEach(goal => {
        console.log(`檢查儲蓄目標: ${goal.name}, 目標戶口ID: ${goal.accountId || '無'}`);
        console.log(`比較: ${goal.accountId === toAccountId ? '匹配' : '不匹配'} (目標戶口ID: ${toAccountId})`);
        
        // 重要：確保字符串比較
        if (String(goal.accountId) === String(toAccountId)) {
            matchFound = true;
            console.log(`找到關聯的儲蓄目標: ${goal.name}`);
            
            // 獲取最新的目標數據（以防數據已更新）
            const currentGoal = Store.getSavingsGoal(goal.id);
            if (!currentGoal) {
                console.error(`無法獲取最新的儲蓄目標數據: ${goal.id}`);
                return;
            }
            
            // 轉換貨幣（如果需要）
            let contributionAmount = amount;
            if (fromCurrency !== currentGoal.currency) {
                const rate = CurrencyManager.getExchangeRate(fromCurrency, currentGoal.currency);
                contributionAmount = amount * rate;
                console.log(`轉換貨幣: ${amount} ${fromCurrency} = ${contributionAmount} ${currentGoal.currency}`);
            }
            
            // 更新儲蓄目標進度
            const newAmount = currentGoal.currentAmount + contributionAmount;
            console.log(`更新儲蓄目標進度: ${currentGoal.currentAmount} + ${contributionAmount} = ${newAmount}`);
            
            // 準備更新的目標數據
            const updatedGoal = {
                ...currentGoal,
                currentAmount: newAmount
            };
            
            // 保存更新
            const updateResult = Store.updateSavingsGoal(currentGoal.id, updatedGoal);
            console.log(`儲蓄目標 ${currentGoal.name} 進度更新結果:`, updateResult);
            
            if (updateResult) {
                Utils.showToast(`已將 ${Utils.formatCurrency(contributionAmount, currentGoal.currency)} 自動添加到儲蓄目標「${currentGoal.name}」`, 'success');
                
                // 如果SavingsManager存在，刷新儲蓄目標列表
                if (typeof SavingsManager !== 'undefined' && SavingsManager.refresh) {
                    console.log('刷新儲蓄目標列表');
                    SavingsManager.refresh();
                }
            } else {
                console.error('更新儲蓄目標失敗');
                Utils.showToast('轉賬成功但無法更新儲蓄目標進度', 'warning');
            }
        }
    });
    
    if (!matchFound) {
        console.log(`沒有找到與戶口 ${toAccountId} 相關的儲蓄目標`);
    }
},
    
    /**
     * 重新整理戶口清單
     */
    refresh: function() {
        // 取得所有戶口
        const accounts = Store.getAccounts();
        const accountsList = document.getElementById('accountsList');
        
        // 決定視圖模式
        const viewMode = document.getElementById('accountCardView').classList.contains('active')
            ? 'card'
            : 'list';
        
        // 清空列表
        accountsList.innerHTML = '';
        
        // 如果沒有戶口，顯示提示訊息
        if (accounts.length === 0) {
            accountsList.innerHTML = '<p class="empty-message">尚未設置任何戶口</p>';
            
            // 停用轉賬功能
            document.getElementById('fromAccount').innerHTML = '<option value="" disabled selected>選擇戶口</option>';
            document.getElementById('toAccount').innerHTML = '<option value="" disabled selected>選擇戶口</option>';
            return;
        }
        
        // 顯示戶口
        accounts.forEach(account => {
            const accountHtml = UiCore.createAccountHTML(account, viewMode);
            accountsList.innerHTML += accountHtml;
        });
        
        // 更新轉賬戶口選擇
        this.updateTransferAccountOptions();
    },
    
    /**
     * 更新轉賬戶口選項
     */
    updateTransferAccountOptions: function() {
        const accounts = Store.getAccounts();
        const fromSelect = document.getElementById('fromAccount');
        const toSelect = document.getElementById('toAccount');
        
        // 清空選項
        fromSelect.innerHTML = '<option value="" disabled selected>選擇戶口</option>';
        toSelect.innerHTML = '<option value="" disabled selected>選擇戶口</option>';
        
        // 添加選項
        accounts.forEach(account => {
            const fromOption = document.createElement('option');
            fromOption.value = account.id;
            fromOption.textContent = `${account.name} (${Utils.formatCurrency(account.balance, account.currency)})`;
            fromSelect.appendChild(fromOption);
            
            const toOption = document.createElement('option');
            toOption.value = account.id;
            toOption.textContent = `${account.name} (${account.currency})`;
            toSelect.appendChild(toOption);
        });
    },

    /**
     * 檢查並更新與轉賬相關的儲蓄目標
     */
    _checkAndUpdateSavingsGoals: function(transaction) {
        // 只處理轉賬交易
        if (transaction.type !== 'transfer') return;
        
        // 獲取所有儲蓄目標
        const goals = Store.getSavingsGoals();
        if (!goals || goals.length === 0) return;
        
        console.log('檢查轉賬是否涉及儲蓄目標連結戶口');
        
        // 檢查每個目標
        goals.forEach(goal => {
            // 只檢查有連結戶口的目標
            if (goal.accountId && goal.accountId === transaction.toAccountId) {
                console.log(`找到轉賬到儲蓄目標「${goal.name}」連結戶口的交易`);
                
                // 計算新的進度
                const newAmount = goal.currentAmount + transaction.amount;
                console.log(`更新儲蓄目標進度: ${goal.currentAmount} + ${transaction.amount} = ${newAmount}`);
                
                // 更新儲蓄目標的進度
                const updatedGoalData = {
                    ...goal,
                    currentAmount: newAmount
                };
                
                // 保存更新後的儲蓄目標
                const updateResult = Store.updateSavingsGoal(goal.id, updatedGoalData);
                console.log(`儲蓄目標進度更新結果: ${updateResult}`);
                
                // 如果 SavingsManager 存在，刷新它的 UI
                if (typeof SavingsManager !== 'undefined' && SavingsManager.refresh) {
                    SavingsManager.refresh();
                }
            }
        });
    }

};