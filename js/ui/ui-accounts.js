// ui-accounts.js - 賬戶UI相關函數

/**
 * 重置賬戶表單
 */
function resetAccountForm() {
    console.log("重置賬戶表單");

    try {
        document.getElementById('accountName').value = '';
        document.getElementById('accountType').value = '';
        document.getElementById('initialBalance').value = '';
        document.getElementById('accountCurrency').value = defaultCurrency;
        document.getElementById('accountNote').value = '';
        
        // 恢復模態框標題和按鈕
        const modalTitle = document.querySelector('#addAccountModal .modal-title');
        if (modalTitle) {
            modalTitle.textContent = '新增戶口';
        }

        const saveButton = document.getElementById('saveAccountButton');
        if (saveButton) {
            saveButton.textContent = '保存';
        }

        // 清除編輯ID
        const editAccountId = document.getElementById('editAccountId');
        if (editAccountId) {
            editAccountId.value = '';
        }
    } catch (error) {
        console.error("重置賬戶表單時發生錯誤:", error);
    }
}

/**
 * 保存賬戶 
 */
function saveAccount() {
    console.log("保存賬戶");

    try {
        const accountName = document.getElementById('accountName').value.trim();
        const accountType = document.getElementById('accountType').value;
        const initialBalance = parseFloat(document.getElementById('initialBalance').value) || 0;
        const accountCurrency = document.getElementById('accountCurrency').value;
        const accountNote = document.getElementById('accountNote').value.trim();

        // 驗證
        if (!accountName) {
            showToast('請輸入賬戶名稱', 'error');
            return;
        }

        if (!accountType) {
            showToast('請選擇賬戶類型', 'error');
            return;
        }

        // 檢查是否是編輯模式
        const editAccountId = document.getElementById('editAccountId')?.value;

        if (editAccountId) {
            // 編輯現有賬戶
            const accountIndex = appState.accounts.findIndex(a => a.id === editAccountId);

            if (accountIndex === -1) {
                showToast('找不到賬戶', 'error');
                return;
            }

            // 獲取原始賬戶
            const originalAccount = appState.accounts[accountIndex];

            // 創建更新後的賬戶對象
            const updatedAccount = {
                ...originalAccount, // 保留原始字段如createdAt
                id: editAccountId,
                name: accountName,
                type: accountType,
                balance: initialBalance,
                currency: accountCurrency,
                note: accountNote,
                updatedAt: new Date().toISOString()
            };

            // 更新賬戶數組
            appState.accounts[accountIndex] = updatedAccount;
            
            // 更新UI
            updateAccountsUI();
            updateAllDropdowns();

            // 保存到本地存儲
            saveToLocalStorage();

            // 執行同步(如果啟用)
            if (enableFirebase && isLoggedIn) {
                syncToFirebase();
            }

            // 關閉模態框
            closeCurrentModal();

            // 顯示成功消息
            showToast(`已更新帳戶: ${accountName}`, 'success');
        } else {
            // 創建新賬戶
            const newAccount = {
                id: generateId(),
                name: accountName,
                type: accountType,
                balance: initialBalance,
                currency: accountCurrency,
                note: accountNote,
                createdAt: new Date().toISOString()
            };

            // 添加到賬戶數組
            appState.accounts.push(newAccount);

            // 更新UI
            updateAccountsUI();
            updateAllDropdowns();

            // 保存到本地存儲
            saveToLocalStorage();

            // 執行同步(如果啟用)
            if (enableFirebase && isLoggedIn) {
                syncToFirebase();
            }

            // 關閉模態框
            closeCurrentModal();

            // 顯示成功消息
            showToast(`已新增賬戶: ${accountName}`, 'success');
        }
    } catch (error) {
        console.error("保存賬戶時發生錯誤:", error);
        showToast('保存賬戶失敗: ' + error.message, 'error');
    }
}

/**
 * 編輯賬戶
 */
function editAccount(accountId) {
    console.log(`編輯賬戶: ${accountId}`);

    try {
        // 找到要編輯的賬戶
        const account = appState.accounts.find(a => a.id === accountId);

        if (!account) {
            showToast('找不到賬戶', 'error');
            return;
        }

        //.將賬戶數據填充到表單中
        document.getElementById('accountName').value = account.name;
        document.getElementById('accountType').value = account.type;
        document.getElementById('initialBalance').value = account.balance;
        document.getElementById('accountCurrency').value = account.currency;
        document.getElementById('accountNote').value = account.note || '';

        // 將賬戶ID添加到隱藏字段
        const accountIdField = document.getElementById('editAccountId');
        if (accountIdField) {
            accountIdField.value = accountId;
        } else {
            const hiddenField = document.createElement('input');
            hiddenField.type = 'hidden';
            hiddenField.id = 'editAccountId';
            hiddenField.value = accountId;
            document.getElementById('addAccountModal').querySelector('.modal-body').appendChild(hiddenField);
        }

        // 修改模態框標題和按鈕
        const modalTitle = document.querySelector('#addAccountModal .modal-header h3');
        if (modalTitle) {
            modalTitle.textContent = '編輯戶口';
        }

        const saveButton = document.getElementById('saveAccountButton');
        if (saveButton) {
            saveButton.textContent = '更新';
        }

        // 打開編輯賬戶模態框
        openModal('addAccountModal');
    } catch (error) {
        console.error("編輯賬戶時發生錯誤:", error);
        showToast('編輯賬戶失敗: ' + error.message, 'error');
    }
}

/**
 * 刪除賬戶
 */
function deleteAccount(accountId) {
    console.log(`刪除賬戶: ${accountId}`);

    try {
        // 檢查是否有與該賬戶相關的交易
        const hasTransactions = appState.transactions.some(t => t.accountId === accountId);

        if (hasTransactions) {
            // 提示用戶並確認
            const message = '此賬戶有關聯的交易記錄，刪除賬戶將會保留這些交易，但不再計入總資產。確定要繼續嗎?';

            showConfirmDialog(message, () => {
                // 找到並刪除賬戶
                const accountIndex = appState.accounts.findIndex(a => a.id === accountId);

                if (accountIndex !== -1) {
                    // 記住賬戶名稱用於顯示消息
                    const accountName = appState.accounts[accountIndex].name;

                    // 刪除賬戶
                    appState.accounts.splice(accountIndex, 1);

                    // 更新UI
                    updateAccountsUI();
                    updateTransferForm();
                    updateAllDropdowns();
                    updateDashboardUI();

                    // 保存到本地存儲
                    saveToLocalStorage();

                    // 執行同步(如果啟用)
                    if (enableFirebase && isLoggedIn) {
                        syncToFirebase();
                    }

                    // 顯示成功消息
                    showToast(`已刪除戶口: ${accountName}`, 'success');
                }
            });
        } else {
            // 沒有關聯交易，直接刪除
            const accountIndex = appState.accounts.findIndex(a => a.id === accountId);

            if (accountIndex !== -1) {
                // 記住賬戶名稱用於顯示消息
                const accountName = appState.accounts[accountIndex].name;

                // 刪除賬戶
                appState.accounts.splice(accountIndex, 1);

                // 更新UI
                updateAccountsUI();
                updateTransferForm();
                updateAllDropdowns();
                updateDashboardUI();

                // 保存到本地存儲
                saveToLocalStorage();

                // 執行同步(如果啟用)
                if (enableFirebase && isLoggedIn) {
                    syncToFirebase();
                }

                // 顯示成功消息
                showToast(`已刪除戶口: ${accountName}`, 'success');
            }
        }
    } catch (error) {
        console.error("刪除賬戶時發生錯誤:", error);
        showToast('刪除賬戶失敗: ' + error.message, 'error');
    }
}

/**
 * 更新賬戶UI
 */
function updateAccountsUI() {
    console.log("更新賬戶UI");
  
    try {
        const accountsList = document.getElementById('accountsList');
        if (!accountsList) return;
  
        // 使用文檔片段減少回流
        const fragment = document.createDocumentFragment();
        const isCardView = accountsList.classList.contains('card-view');
  
        // 清空列表
        accountsList.innerHTML = '';
  
        // 檢查是否有賬戶
        if (appState.accounts.length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.className = 'empty-message';
            emptyMessage.textContent = '尚未設置任何戶口';
            fragment.appendChild(emptyMessage);
        } else {
            // 按餘額排序(可選)
            const sortedAccounts = [...appState.accounts].sort((a, b) => {
                // 將不同貨幣轉換為默認貨幣進行比較
                const balanceA = a.currency === defaultCurrency ? 
                                a.balance : 
                                a.balance * getExchangeRate(a.currency, defaultCurrency);
                const balanceB = b.currency === defaultCurrency ? 
                                b.balance : 
                                b.balance * getExchangeRate(b.currency, defaultCurrency);
                return balanceB - balanceA; // 降序排列
            });
  
            // 渲染賬戶
            sortedAccounts.forEach(account => {
                const accountElement = document.createElement('div');
                
                if (isCardView) {
                    let headerColor;
                    switch (account.type) {
                        case 'cash': headerColor = '#27ae60'; break;
                        case 'bank': headerColor = '#3498db'; break;
                        case 'credit': headerColor = '#e74c3c'; break;
                        case 'investment': headerColor = '#f39c12'; break;
                        default: headerColor = '#95a5a6';
                    }
                    
                    accountElement.className = 'account-card';
                    accountElement.setAttribute('data-id', account.id);
                    
                    // 使用模板字符串一次性設置內容，避免多次DOM操作
                    accountElement.innerHTML = `
                        <div class="account-card-header" style="background-color: ${headerColor}">
                            <h3>${account.name}</h3>
                            <div class="account-type">${getAccountTypeName(account.type)}</div>
                        </div>
                        <div class="account-card-body">
                            <div class="account-balance">${formatCurrency(account.balance, account.currency)}</div>
                            <div class="account-currency">${getCurrencyName(account.currency)}</div>
                            ${account.note ? `<div class="account-note">${account.note}</div>` : ''}
                            <div class="account-actions">
                                <button class="btn btn-sm edit-account" data-id="${account.id}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-danger delete-account" data-id="${account.id}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `;
                } else {
                    // 列表視圖
                    accountElement.className = 'account-list-item';
                    accountElement.setAttribute('data-id', account.id);
                    
                    accountElement.innerHTML = `
                        <div class="account-info">
                            <div class="account-name">${account.name}</div>
                            <div class="account-type-currency">${getAccountTypeName(account.type)} | ${getCurrencyName(account.currency)}</div>
                        </div>
                        <div class="account-details">
                            <div class="account-balance">${formatCurrency(account.balance, account.currency)}</div>
                        </div>
                        <div class="account-actions">
                            <button class="btn btn-sm edit-account" data-id="${account.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger delete-account" data-id="${account.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                }
                
                fragment.appendChild(accountElement);
            });
        }
  
        // 一次性添加所有元素
        accountsList.appendChild(fragment);
  
        // 添加事件監聽器 - 使用事件委派減少監聽器數量
        accountsList.addEventListener('click', function(e) {
            const target = e.target.closest('.edit-account, .delete-account');
            if (!target) return;
            
            const accountId = target.getAttribute('data-id');
            
            if (target.classList.contains('edit-account')) {
                editAccount(accountId);
            } else if (target.classList.contains('delete-account')) {
                const message = '確定要刪除此戶口嗎?相關交易將保留，但匯入金額將不再計入總資產。';
                showConfirmDialog(message, () => deleteAccount(accountId));
            }
        });
    } catch (error) {
        console.error("更新賬戶UI出錯:", error);
        
        // 簡化錯誤處理
        const accountsList = document.getElementById('accountsList');
        if (accountsList) {
            accountsList.innerHTML = '<p class="error-message">載入賬戶列表失敗</p>';
        }
    }
}

// 取得賬戶類型名稱
function getAccountTypeName(type) {
    switch (type) {
        case 'cash': return '現金';
        case 'bank': return '銀行戶口';
        case 'credit': return '信用卡';
        case 'investment': return '投資';
        default: return '其他';
    }
}

// 取得貨幣名稱
function getCurrencyName(code) {
    switch (code) {
        case 'USD': return '美元';
        case 'HKD': return '港幣';
        case 'CNY': return '人民幣';
        case 'EUR': return '歐元';
        case 'GBP': return '英鎊';
        case 'JPY': return '日圓';
        default: return code;
    }
}

/**
 * 更新轉賬表單
 */
function updateTransferForm() {
    console.log("更新轉賬表單");

    try {
        const fromAccountSelect = document.getElementById('fromAccount');
        const toAccountSelect = document.getElementById('toAccount');

        if (!fromAccountSelect || !toAccountSelect) {
            console.error("找不到轉賬表單元素");
            return;
        }

        // 清空選擇器
        fromAccountSelect.innerHTML = '<option value="" disabled selected>選擇戶口</option>';
        toAccountSelect.innerHTML = '<option value="" disabled selected>選擇戶口</option>';

        // 填充選擇器
        appState.accounts.forEach(account => {
            const fromOption = document.createElement('option');
            fromOption.value = account.id;
            fromOption.textContent = `${account.name} (${formatCurrency(account.balance, account.currency)})`;

            const toOption = document.createElement('option');
            toOption.value = account.id;
            toOption.textContent = `${account.name} (${formatCurrency(account.balance, account.currency)})`;

            fromAccountSelect.appendChild(fromOption);
            toAccountSelect.appendChild(toOption);
        });

        // 重置匯率和接收金額顯示
        document.getElementById('transferExchangeRate').textContent = '--';
        document.getElementById('receivingAmount').textContent = '--';
    } catch (error) {
        console.error("更新轉賬表單時發生錯誤:", error);
    }
}

/**
 * 設置轉賬匯率監聽器
 */
function setupTransferExchangeRateListener() {
    console.log("設置轉賬匯率監聽器");

    try {
        const fromAccountSelect = document.getElementById('fromAccount');
        const toAccountSelect = document.getElementById('toAccount');
        const transferAmountInput = document.getElementById('transferAmount');

        if (!fromAccountSelect || !toAccountSelect || !transferAmountInput) {
            console.error("找不到轉賬表單元素");
            return;
        }

        const updateExchangeRateInfo = function () {
            const fromAccountId = fromAccountSelect.value;
            const toAccountId = toAccountSelect.value;
            const amount = parseFloat(transferAmountInput.value) || 0;

            if (!fromAccountId || !toAccountId) {
                document.getElementById('transferExchangeRate').textContent = '--';
                document.getElementById('receivingAmount').textContent = '--';
                return;
            }

            const fromAccount = appState.accounts.find(a => a.id === fromAccountId);
            const toAccount = appState.accounts.find(a => a.id === toAccountId);

            if (!fromAccount || !toAccount) {
                return;
            }

            if (fromAccount.currency === toAccount.currency) {
                document.getElementById('transferExchangeRate').textContent = '1:1';
                document.getElementById('receivingAmount').textContent = formatCurrency(amount, toAccount.currency);
            } else {
                const rate = getExchangeRate(fromAccount.currency, toAccount.currency);
                document.getElementById('transferExchangeRate').textContent = `1 ${fromAccount.currency} = ${rate.toFixed(6)} ${toAccount.currency}`;
                document.getElementById('receivingAmount').textContent = formatCurrency(amount * rate, toAccount.currency);
            }
        };

        fromAccountSelect.addEventListener('change', updateExchangeRateInfo);
        toAccountSelect.addEventListener('change', updateExchangeRateInfo);
        transferAmountInput.addEventListener('input', updateExchangeRateInfo);
    } catch (error) {
        console.error("設置轉賬匯率監聽器時發生錯誤:", error);
    }
}

/**
 * 處理轉賬
 */
function processTransfer() {
    console.log("處理轉賬");

    try {
        const fromAccountId = document.getElementById('fromAccount').value;
        const toAccountId = document.getElementById('toAccount').value;
        const amount = parseFloat(document.getElementById('transferAmount').value);

        // 驗證
        if (!fromAccountId) {
            showToast('請選擇轉出賬戶', 'error');
            return;
        }

        if (!toAccountId) {
            showToast('請選擇轉入賬戶', 'error');
            return;
        }

        if (fromAccountId === toAccountId) {
            showToast('轉出和轉入賬戶不能相同', 'error');
            return;
        }

        if (!amount || amount <= 0) {
            showToast('請輸入有效金額', 'error');
            return;
        }

        // 獲取賬戶
        const fromAccount = appState.accounts.find(a => a.id === fromAccountId);
        const toAccount = appState.accounts.find(a => a.id === toAccountId);

        if (!fromAccount || !toAccount) {
            showToast('賬戶找不到', 'error');
            return;
        }

        // 檢查餘額
        if (fromAccount.balance < amount) {
            showToast('餘額不足', 'error');
            return;
        }

        // 計算匯率(如果貨幣不同)
        let exchangeRate = 1;
        let receivingAmount = amount;

        if (fromAccount.currency !== toAccount.currency) {
            exchangeRate = getExchangeRate(fromAccount.currency, toAccount.currency);
            receivingAmount = amount * exchangeRate;
        }

        // 更新賬戶餘額
        fromAccount.balance -= amount;
        toAccount.balance += receivingAmount;

        // 記錄轉賬交易
        const today = new Date().toISOString().split('T')[0];
        const transferId = generateId();

        // 轉出交易 - 確保使用正確的類別ID
        const outTransaction = {
            id: generateId(),
            type: 'expense',
            accountId: fromAccountId,
            categoryId: 'transfer_out', // 使用特定的轉賬類別
            amount: amount,
            date: today,
            note: `轉賬至 ${toAccount.name}`,
            transferId: transferId, // 關聯ID
            createdAt: new Date().toISOString()
        };

        // 轉入交易 - 確保使用正確的類別ID
        const inTransaction = {
            id: generateId(),
            type: 'income',
            accountId: toAccountId,
            categoryId: 'transfer_in', // 使用特定的轉賬類別
            amount: receivingAmount,
            date: today,
            note: `來自 ${fromAccount.name} 的轉賬`,
            transferId: transferId, // 關聯ID
            createdAt: new Date().toISOString()
        };

        // 添加到交易數組
        appState.transactions.push(outTransaction);
        appState.transactions.push(inTransaction);

        // 更新UI
        updateAccountsUI();
        updateTransferForm();
        updateTransactionsUI();
        updateDashboardUI();

        // 清空表單
        document.getElementById('transferAmount').value = '';

        // 保存到本地存儲
        saveToLocalStorage();

        // 執行同步(如果啟用)
        if (enableFirebase && isLoggedIn) {
            syncToFirebase();
        }

        // 更新頂部狀態欄
        if (window.dayManager && typeof window.dayManager.onTransactionAdded === 'function') {
            window.dayManager.onTransactionAdded();
        }

        // 顯示成功消息
        showToast(`已轉賬 ${formatCurrency(amount, fromAccount.currency)} 至 ${toAccount.name}`, 'success');
    } catch (error) {
        console.error("處理轉賬時發生錯誤:", error);
        showToast('轉賬處理失敗: ' + error.message, 'error');
    }
}

// 導出函數
window.resetAccountForm = resetAccountForm;
window.saveAccount = saveAccount;
window.editAccount = editAccount;
window.deleteAccount = deleteAccount;
window.updateAccountsUI = updateAccountsUI;
window.getAccountTypeName = getAccountTypeName;
window.getCurrencyName = getCurrencyName;
window.updateTransferForm = updateTransferForm;
window.setupTransferExchangeRateListener = setupTransferExchangeRateListener;
window.processTransfer = processTransfer;