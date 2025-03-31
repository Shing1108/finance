// ui.js - 界面更新和處理相關功能

// 顯示指定的選項卡內容
function showTabContent(tabId) {
    console.log(`切換到${tabId}選項卡`);

    try {
        // 移除所有標簽的激活狀態
        document.querySelectorAll('.nav-links li').forEach(item => {
            item.classList.remove('active');
        });

        // 激活點擊的標簽
        const tabNav = document.querySelector(`.nav-links li[data-tab="${tabId}"]`);
        if (tabNav) {
            tabNav.classList.add('active');
        }

        // 隱藏所有內容
        document.querySelectorAll('.tab-content').forEach(item => {
            item.classList.remove('active');
        });

        // 顯示對應的內容
        const tabElement = document.getElementById(tabId);
        if (tabElement) {
            tabElement.classList.add('active');
        } else {
            console.error(`找不到ID為${tabId}的選項卡元素`);
            return;
        }

        // 根據當前標簽更新UI
        switch (tabId) {
            case 'dashboard':
                updateDashboardUI();
                break;
            case 'accounts':
                updateAccountsUI();
                updateTransferForm();
                break;
            case 'transactions':
                updateTransactionsUI();
                updateTransactionsForms();
                break;
            case 'budgets':
                updateBudgetsUI();
                break;
            case 'categories':
                // 確保類別管理標籤的初始化
                initializeCategoryTabs();
                // 更新類別UI
                updateCategoriesUI();
                break;
            case 'statistics':
                updateStatisticsUI();
                break;
            case 'sync':
                updateSyncUI();
                break;
        }
    } catch (error) {
        console.error("切換選項卡時發生錯誤:", error);
        showToast('切換選項卡失敗: ' + error.message, 'error');
    }
}

// 打開模態框
function openModal(modalId) {
    console.log(`打開模態框: ${modalId}`);

    try {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`找不到ID為${modalId}的模態框`);
            return;
        }

        modal.classList.add('active');

        // 特定模態框的初始化
        if (modalId === 'addAccountModal') {
            resetAccountForm();
        } else if (modalId === 'addCategoryModal') {
            resetCategoryForm();
        }
    } catch (error) {
        console.error("打開模態框時發生錯誤:", error);
        showToast('打開模態框失敗: ' + error.message, 'error');
    }
}

// 重置賬戶表單
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

// 重置類別表單
function resetCategoryForm() {
    console.log("重置類別表單");

    try {
        document.getElementById('categoryName').value = '';
        document.getElementById('selectedIcon').className = 'fas fa-tag';
        document.getElementById('categoryColor').value = '#4CAF50';
        document.getElementById('categoryOrder').value = '0';

        // 清除編輯ID
        document.getElementById('categoryType').dataset.editId = '';

        // 恢復模態框標題和按鈕
        const modalTitle = document.querySelector('#addCategoryModal .modal-title');
        if (modalTitle) {
            modalTitle.textContent = '新增類別';
        }

        const saveButton = document.getElementById('saveCategoryButton');
        if (saveButton) {
            saveButton.textContent = '保存';
        }

        // 隱藏圖標網格
        document.getElementById('iconGrid').style.display = 'none';
    } catch (error) {
        console.error("重置類別表單時發生錯誤:", error);
    }
}

// 關閉當前模態框
function closeCurrentModal() {
    console.log("關閉當前模態框");

    try {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
    } catch (error) {
        console.error("關閉模態框時發生錯誤:", error);
    }
}

// 填充圖標網格
function populateIconGrid() {
    console.log("填充圖標網格");

    try {
        const iconGrid = document.getElementById('iconGrid');
        if (!iconGrid) {
            console.error("找不到圖標網格元素");
            return;
        }

        // 清空網格
        iconGrid.innerHTML = '';

        // 常用圖標數組
        const icons = [
            'fa-money-bill-wave', 'fa-credit-card', 'fa-coins', 'fa-wallet',
            'fa-piggy-bank', 'fa-dollar-sign', 'fa-donate', 'fa-hand-holding-usd',
            'fa-receipt', 'fa-shopping-cart', 'fa-shopping-bag', 'fa-store',
            'fa-utensils', 'fa-hamburger', 'fa-coffee', 'fa-wine-glass-alt',
            'fa-home', 'fa-house-user', 'fa-bed', 'fa-bath',
            'fa-car', 'fa-bus', 'fa-train', 'fa-plane',
            'fa-tshirt', 'fa-socks', 'fa-shoe-prints', 'fa-hat-cowboy',
            'fa-gamepad', 'fa-film', 'fa-music', 'fa-ticket-alt',
            'fa-book', 'fa-graduation-cap', 'fa-laptop', 'fa-mobile-alt',
            'fa-hospital', 'fa-pills', 'fa-first-aid', 'fa-tooth',
            'fa-dog', 'fa-cat', 'fa-paw', 'fa-bone',
            'fa-baby', 'fa-child', 'fa-user', 'fa-users',
            'fa-gift', 'fa-birthday-cake', 'fa-cookie', 'fa-candy-cane',
            'fa-tools', 'fa-hammer', 'fa-screwdriver', 'fa-wrench',
            'fa-briefcase', 'fa-business-time', 'fa-building', 'fa-city',
            'fa-chart-line', 'fa-chart-pie', 'fa-chart-bar', 'fa-percentage',
            'fa-dumbbell', 'fa-running', 'fa-swimming-pool', 'fa-bicycle',
            'fa-sun', 'fa-umbrella-beach', 'fa-mountain', 'fa-tree',
            'fa-globe', 'fa-plane-departure', 'fa-map-marked-alt', 'fa-route',
            'fa-paint-brush', 'fa-palette', 'fa-camera', 'fa-image',
            'fa-cut', 'fa-broom', 'fa-trash', 'fa-recycle'
        ];

        // 為每個圖標創建元素
        icons.forEach(icon => {
            const iconItem = document.createElement('div');
            iconItem.className = 'icon-option';
            iconItem.innerHTML = `<i class="fas ${icon}"></i>`;

            // 點擊事件
            iconItem.addEventListener('click', function () {
                const selectedIcon = document.getElementById('selectedIcon');
                selectedIcon.className = `fas ${icon}`;

                // 標記為選中
                document.querySelectorAll('.icon-option').forEach(item => {
                    item.classList.remove('selected');
                });
                this.classList.add('selected');

                // 隱藏圖標網格
                iconGrid.style.display = 'none';
            });

            iconGrid.appendChild(iconItem);
        });
    } catch (error) {
        console.error("填充圖標網格時發生錯誤:", error);
    }
}

// 保存賬戶
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
            showToast(`已新增帳戶: ${accountName}`, 'success');
        }
    } catch (error) {
        console.error("保存賬戶時發生錯誤:", error);
        showToast('保存賬戶失敗: ' + error.message, 'error');
    }
}

// 保存類別
function saveCategory() {
    console.log("保存類別");

    try {
        const categoryName = document.getElementById('categoryName').value.trim();
        const categoryIcon = document.getElementById('selectedIcon').className;
        const categoryColor = document.getElementById('categoryColor').value;
        const categoryOrder = parseInt(document.getElementById('categoryOrder').value) || 0;
        const categoryType = document.getElementById('categoryType').value;

        // 檢查是否是編輯模式
        const editCategoryId = document.getElementById('categoryType').dataset.editId;

        // 驗證
        if (!categoryName) {
            showToast('請輸入類別名稱', 'error');
            return;
        }

        if (editCategoryId) {
            // 編輯現有類別
            const categoryArray = categoryType === 'income' ? appState.categories.income : appState.categories.expense;
            const categoryIndex = categoryArray.findIndex(c => c.id === editCategoryId);

            if (categoryIndex === -1) {
                showToast('找不到類別', 'error');
                return;
            }

            // 獲取原始類別以保留某些字段
            const originalCategory = categoryArray[categoryIndex];

            // 創建更新後的類別對象
            const updatedCategory = {
                ...originalCategory,
                name: categoryName,
                icon: categoryIcon,
                color: categoryColor,
                order: categoryOrder,
                updatedAt: new Date().toISOString()
            };

            // 更新類別數組
            categoryArray[categoryIndex] = updatedCategory;

            // 更新UI
            updateCategoriesUI();
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
            showToast(`已更新${categoryType === 'income' ? '收入' : '支出'}類別: ${categoryName}`, 'success');

            // 重置編輯模式
            document.getElementById('categoryType').dataset.editId = '';

            // 恢復模態框標題和按鈕
            const modalTitle = document.querySelector('#addCategoryModal .modal-title');
            if (modalTitle) {
                modalTitle.textContent = '新增類別';
            }

            const saveButton = document.getElementById('saveCategoryButton');
            if (saveButton) {
                saveButton.textContent = '保存';
            }
        } else {
            // 創建新類別
            // 創建類別對象
            const newCategory = {
                id: generateId(),
                name: categoryName,
                icon: categoryIcon,
                color: categoryColor,
                order: categoryOrder,
                createdAt: new Date().toISOString()
            };

            // 添加到相應的類別數組
            if (categoryType === 'income') {
                appState.categories.income.push(newCategory);
            } else {
                appState.categories.expense.push(newCategory);
            }

            // 更新UI
            updateCategoriesUI();
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
            showToast(`已新增${categoryType === 'income' ? '收入' : '支出'}類別: ${categoryName}`, 'success');
        }
    } catch (error) {
        console.error("保存類別時發生錯誤:", error);
        showToast('保存類別失敗: ' + error.message, 'error');
    }
}

// 編輯類別
function editCategory(categoryId, categoryType) {
    console.log(`編輯${categoryType}類別: ${categoryId}`);

    try {
        // 找到要編輯的類別
        const categoryArray = categoryType === 'income' ? appState.categories.income : appState.categories.expense;
        const category = categoryArray.find(c => c.id === categoryId);

        if (!category) {
            showToast('找不到類別', 'error');
            return;
        }

        // 填充表單
        document.getElementById('categoryName').value = category.name;
        document.getElementById('selectedIcon').className = category.icon;
        document.getElementById('categoryColor').value = category.color;
        document.getElementById('categoryOrder').value = category.order || 0;

        // 設置類別類型
        document.getElementById('categoryType').value = categoryType;

        // 設置編輯模式
        document.getElementById('categoryType').dataset.editId = categoryId;

        // 修改模態框標題和按鈕
        const modalTitle = document.querySelector('#addCategoryModal .modal-title');
        if (modalTitle) {
            modalTitle.textContent = '編輯類別';
        }

        const saveButton = document.getElementById('saveCategoryButton');
        if (saveButton) {
            saveButton.textContent = '更新';
        }

        // 打開編輯類別模態框
        openModal('addCategoryModal');
    } catch (error) {
        console.error("編輯類別時發生錯誤:", error);
        showToast('編輯類別失敗: ' + error.message, 'error');
    }
}

// 刪除類別
function deleteCategory(categoryId, categoryType) {
    console.log(`刪除${categoryType}類別: ${categoryId}`);

    try {
        // 檢查是否有與該類別相關的交易
        const hasTransactions = appState.transactions.some(t => t.categoryId === categoryId);

        // 檢查是否有與該類別相關的預算(如果是支出類別)
        const hasBudget = categoryType === 'expense' &&
            appState.budgets.categories &&
            appState.budgets.categories.some(b => b.categoryId === categoryId);

        if (hasTransactions || hasBudget) {
            // 提示用戶並確認
            let message = '此類別有關聯的';

            if (hasTransactions && hasBudget) {
                message += '交易記錄和預算';
            } else if (hasTransactions) {
                message += '交易記錄';
            } else {
                message += '預算';
            }

            message += '，刪除類別可能會影響這些數據的顯示。確定要繼續嗎?';

            showConfirmDialog(message, () => {
                // 找到並刪除類別
                const categoryArray = categoryType === 'income' ? appState.categories.income : appState.categories.expense;
                const categoryIndex = categoryArray.findIndex(c => c.id === categoryId);

                if (categoryIndex !== -1) {
                    // 記住類別名稱用於顯示消息
                    const categoryName = categoryArray[categoryIndex].name;

                    // 刪除類別
                    categoryArray.splice(categoryIndex, 1);

                    // 如果是支出類別且有相關預算，也一併刪除
                    if (categoryType === 'expense' && hasBudget) {
                        appState.budgets.categories = appState.budgets.categories.filter(b => b.categoryId !== categoryId);

                        // 如果啟用自動計算，更新總預算
                        if (appState.budgets.autoCalculate) {
                            appState.budgets.total = calculateTotalCategoryBudget();
                        }
                    }

                    // 更新UI
                    updateCategoriesUI();
                    updateAllDropdowns();
                    updateBudgetsUI();

                    // 保存到本地存儲
                    saveToLocalStorage();

                    // 執行同步(如果啟用)
                    if (enableFirebase && isLoggedIn) {
                        syncToFirebase();
                    }

                    // 顯示成功消息
                    showToast(`已刪除${categoryType === 'income' ? '收入' : '支出'}類別: ${categoryName}`, 'success');
                }
            });
        } else {
            // 沒有關聯數據，直接刪除
            const categoryArray = categoryType === 'income' ? appState.categories.income : appState.categories.expense;
            const categoryIndex = categoryArray.findIndex(c => c.id === categoryId);

            if (categoryIndex !== -1) {
                // 記住類別名稱用於顯示消息
                const categoryName = categoryArray[categoryIndex].name;

                // 刪除類別
                categoryArray.splice(categoryIndex, 1);

                // 更新UI
                updateCategoriesUI();
                updateAllDropdowns();

                // 保存到本地存儲
                saveToLocalStorage();

                // 執行同步(如果啟用)
                if (enableFirebase && isLoggedIn) {
                    syncToFirebase();
                }

                // 顯示成功消息
                showToast(`已刪除${categoryType === 'income' ? '收入' : '支出'}類別: ${categoryName}`, 'success');
            }
        }
    } catch (error) {
        console.error("刪除類別時發生錯誤:", error);
        showToast('刪除類別失敗: ' + error.message, 'error');
    }
}

// 保存交易
function saveTransaction(type) {
    console.log(`保存${type === 'income' ? '收入' : '支出'}交易`);

    try {
        const accountId = document.getElementById(`${type}Account`).value;
        const categoryId = document.getElementById(`${type}Category`).value;
        const amount = parseFloat(document.getElementById(`${type}Amount`).value);
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

        // 創建交易對象
        const newTransaction = {
            id: generateId(),
            type: type,
            accountId: accountId,
            categoryId: categoryId,
            amount: amount,
            date: date,
            note: note,
            createdAt: new Date().toISOString()
        };

        // 更新賬戶餘額
        const account = appState.accounts.find(a => a.id === accountId);
        if (account) {
            if (type === 'income') {
                account.balance += amount;
            } else {
                account.balance -= amount;
            }
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
        checkBudgetAlerts();

        // 執行同步(如果啟用)
        if (enableFirebase && isLoggedIn) {
            syncToFirebase();
        }

        // 顯示成功消息
        showToast(`已記錄${type === 'income' ? '收入' : '支出'}: ${formatCurrency(amount)}`, 'success');
    } catch (error) {
        console.error(`保存${type}交易時發生錯誤:`, error);
        showToast(`保存${type === 'income' ? '收入' : '支出'}交易失敗: ` + error.message, 'error');
    }
}

// 處理轉賬
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

        // 轉出交易
        const outTransaction = {
            id: generateId(),
            type: 'expense',
            accountId: fromAccountId,
            categoryId: 'transfer_out', // 特殊類別
            amount: amount,
            date: today,
            note: `轉賬至 ${toAccount.name}`,
            transferId: transferId, // 關聯ID
            createdAt: new Date().toISOString()
        };

        // 轉入交易
        const inTransaction = {
            id: generateId(),
            type: 'income',
            accountId: toAccountId,
            categoryId: 'transfer_in', // 特殊類別
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

        // 顯示成功消息
        showToast(`已轉賬 ${formatCurrency(amount, fromAccount.currency)} 至 ${toAccount.name}`, 'success');
    } catch (error) {
        console.error("處理轉賬時發生錯誤:", error);
        showToast('轉賬處理失敗: ' + error.message, 'error');
    }
}

// 設置轉賬匯率監聽器
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

// 更新轉賬表單
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
        throw error;
    }
}

// 過濾交易
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

// 更新交易列表
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

// 創建編輯交易模態框
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
                                <div class="form-group">
                                    <label for="editIncomeAmount">金額</label>
                                    <input type="number" id="editIncomeAmount" min="0" step="0.01" required>
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
                                <div class="form-group">
                                    <label for="editExpenseAmount">金額</label>
                                    <input type="number" id="editExpenseAmount" min="0" step="0.01" required>
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
    document.getElementById('editIncomeTabButton').addEventListener('click', function () {
        this.classList.add('active');
        document.getElementById('editExpenseTabButton').classList.remove('active');
        document.getElementById('editIncomeTab').classList.add('active');
        document.getElementById('editExpenseTab').classList.remove('active');
    });

    document.getElementById('editExpenseTabButton').addEventListener('click', function () {
        this.classList.add('active');
        document.getElementById('editIncomeTabButton').classList.remove('active');
        document.getElementById('editExpenseTab').classList.add('active');
        document.getElementById('editIncomeTab').classList.remove('active');
    });

    document.getElementById('updateIncomeButton').addEventListener('click', updateTransaction);
    document.getElementById('updateExpenseButton').addEventListener('click', updateTransaction);

    // 關閉按鈕
    document.querySelector('#editTransactionModal .close-button').addEventListener('click', closeCurrentModal);

    // 填充戶口和類別下拉菜單
    updateEditTransactionForm();
}

// 編輯交易
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

        // 根據交易類型選擇表單
        const formPrefix = transaction.type === 'income' ? 'editIncome' : 'editExpense';

        // 填充表單
        document.getElementById(`${formPrefix}Id`).value = transaction.id;
        document.getElementById(`${formPrefix}Account`).value = transaction.accountId;
        document.getElementById(`${formPrefix}Category`).value = transaction.categoryId;
        document.getElementById(`${formPrefix}Amount`).value = transaction.amount;
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

// 更新編輯交易表單
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

// 更新交易
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

        // 創建更新後的交易
        const updatedTransaction = {
            ...oldTransaction,
            accountId: accountId,
            categoryId: categoryId,
            amount: amount,
            date: date,
            note: note,
            updatedAt: new Date().toISOString()
        };

        // 更新新賬戶餘額
        if (type === 'income') {
            newAccount.balance += amount;
        } else {
            newAccount.balance -= amount;
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
        checkBudgetAlerts();

        // 執行同步(如果啟用)
        if (enableFirebase && isLoggedIn) {
            syncToFirebase();
        }

        // 關閉模態框
        closeCurrentModal();

        // 顯示成功消息
        showToast(`已更新${type === 'income' ? '收入' : '支出'}: ${formatCurrency(amount)}`, 'success');
    } catch (error) {
        console.error("更新交易時發生錯誤:", error);
        showToast('更新交易失敗: ' + error.message, 'error');
    }
}

// 刪除交易
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

        // 顯示成功消息
        showToast('交易已刪除', 'success');
    } catch (error) {
        console.error("刪除交易時發生錯誤:", error);
        showToast('刪除交易失敗: ' + error.message, 'error');
    }
}

// 更新交易表單和類別過濾器
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
        throw error;
    }
}

// 更新類別過濾器
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
        throw error;
    }
}

// 綁定類別相關事件
function bindCategoryEvents() {
    // 添加新增按鈕的事件監聽器
    const addIncomeButton = document.getElementById('addIncomeCategoryButton');
    if (addIncomeButton) {
        addIncomeButton.addEventListener('click', function() {
            document.getElementById('categoryType').value = 'income';
            openModal('addCategoryModal');
        });
    }

    const addExpenseButton = document.getElementById('addExpenseCategoryButton');
    if (addExpenseButton) {
        addExpenseButton.addEventListener('click', function() {
            document.getElementById('categoryType').value = 'expense';
            openModal('addCategoryModal');
        });
    }

    // 添加編輯和刪除按鈕的事件監聽器
    document.querySelectorAll('.edit-category').forEach(button => {
        button.addEventListener('click', function() {
            const categoryId = this.getAttribute('data-id');
            const categoryType = this.getAttribute('data-type');
            editCategory(categoryId, categoryType);
        });
    });

    document.querySelectorAll('.delete-category').forEach(button => {
        button.addEventListener('click', function() {
            const categoryId = this.getAttribute('data-id');
            const categoryType = this.getAttribute('data-type');
            const message = '確定要刪除此類別嗎?相關交易將保留，但類別將顯示為"未知類別"。';
            showConfirmDialog(message, () => deleteCategory(categoryId, categoryType));
        });
    });
}

// 更新類別UI
function updateCategoriesUI() {
    console.log("更新類別UI - 開始");

    try {
        // 確保收入和支出類別數組已初始化
        if (!appState.categories.income) {
            appState.categories.income = [];
        }
        if (!appState.categories.expense) {
            appState.categories.expense = [];
        }

        // 更新收入類別列表
        updateIncomeCategoriesList();

        // 更新支出類別列表
        updateExpenseCategoriesList();
        
        console.log("更新類別UI - 完成");
    } catch (error) {
        console.error("更新類別UI時發生錯誤:", error);
        showToast('更新類別UI時發生錯誤: ' + error.message, 'error');
    }
}

// 更新收入類別列表
function updateIncomeCategoriesList() {
    console.log("更新收入類別列表");

    try {
        const incomeCategoriesList = document.getElementById('incomeCategoriesList');

        if (!incomeCategoriesList) {
            console.error("找不到收入類別列表元素");
            return;
        }

        // 確定視圖類型
        const isCardView = incomeCategoriesList.classList.contains('card-view');

        // 準備添加卡片HTML
        const addCardHtml = '<div class="category-add-card"><button id="addIncomeCategoryButton" class="btn btn-add">+ 新增</button></div>';

        // 檢查是否有收入類別
        if (!appState.categories.income || appState.categories.income.length === 0) {
            incomeCategoriesList.innerHTML = addCardHtml + '<p class="empty-message">尚未設置收入類別</p>';
            
            // 重新綁定添加按鈕事件
            const addButton = document.getElementById('addIncomeCategoryButton');
            if (addButton) {
                addButton.addEventListener('click', function() {
                    document.getElementById('categoryType').value = 'income';
                    openModal('addCategoryModal');
                });
            }
            return;
        }

        // 排序類別(按照order)
        const sortedCategories = [...appState.categories.income].sort((a, b) => (a.order || 0) - (b.order || 0));

        let html = addCardHtml;

        if (isCardView) {
            // 卡片視圖
            sortedCategories.forEach(category => {
                html += `
                    <div class="category-card" data-id="${category.id}">
                        <div class="category-icon" style="color: ${category.color || '#4CAF50'}">
                            <i class="${category.icon || 'fas fa-tag'}"></i>
                        </div>
                        <div class="category-name">${category.name}</div>
                        <div class="category-actions">
                            <button class="btn btn-sm edit-category" data-id="${category.id}" data-type="income">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger delete-category" data-id="${category.id}" data-type="income">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
        } else {
            // 列表視圖
            sortedCategories.forEach(category => {
                html += `
                    <div class="category-list-item" data-id="${category.id}">
                        <div class="category-list-icon" style="color: ${category.color || '#4CAF50'}">
                            <i class="${category.icon || 'fas fa-tag'}"></i>
                        </div>
                        <div class="category-name">${category.name}</div>
                        <div class="category-actions">
                            <button class="btn btn-sm edit-category" data-id="${category.id}" data-type="income">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger delete-category" data-id="${category.id}" data-type="income">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
        }

        incomeCategoriesList.innerHTML = html;
        
        // 綁定事件
        bindCategoryEvents();
    } catch (error) {
        console.error("更新收入類別列表時發生錯誤:", error);
        const incomeCategoriesList = document.getElementById('incomeCategoriesList');
        if (incomeCategoriesList) {
            incomeCategoriesList.innerHTML = '<div class="category-add-card"><button id="addIncomeCategoryButton" class="btn btn-add">+ 新增</button></div><p class="error-message">載入收入類別時出錯</p>';
            
            // 緊急修復 - 至少綁定添加按鈕
            const addButton = document.getElementById('addIncomeCategoryButton');
            if (addButton) {
                addButton.addEventListener('click', function() {
                    document.getElementById('categoryType').value = 'income';
                    openModal('addCategoryModal');
                });
            }
        }
    }
}

// 更新支出類別列表
function updateExpenseCategoriesList() {
    console.log("更新支出類別列表");

    try {
        const expenseCategoriesList = document.getElementById('expenseCategoriesList');

        if (!expenseCategoriesList) {
            console.error("找不到支出類別列表元素");
            return;
        }

        // 確定視圖類型
        const isCardView = expenseCategoriesList.classList.contains('card-view');

        // 準備添加卡片HTML
        const addCardHtml = '<div class="category-add-card"><button id="addExpenseCategoryButton" class="btn btn-add">+ 新增</button></div>';

        // 檢查是否有支出類別
        if (!appState.categories.expense || appState.categories.expense.length === 0) {
            expenseCategoriesList.innerHTML = addCardHtml + '<p class="empty-message">尚未設置支出類別</p>';
            
            // 重新綁定添加按鈕事件
            const addButton = document.getElementById('addExpenseCategoryButton');
            if (addButton) {
                addButton.addEventListener('click', function() {
                    document.getElementById('categoryType').value = 'expense';
                    openModal('addCategoryModal');
                });
            }
            return;
        }

        // 排序類別(按照order)
        const sortedCategories = [...appState.categories.expense].sort((a, b) => (a.order || 0) - (b.order || 0));

        let html = addCardHtml;

        if (isCardView) {
            // 卡片視圖
            sortedCategories.forEach(category => {
                html += `
                    <div class="category-card" data-id="${category.id}">
                        <div class="category-icon" style="color: ${category.color || '#e74c3c'}">
                            <i class="${category.icon || 'fas fa-tag'}"></i>
                        </div>
                        <div class="category-name">${category.name}</div>
                        <div class="category-actions">
                            <button class="btn btn-sm edit-category" data-id="${category.id}" data-type="expense">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger delete-category" data-id="${category.id}" data-type="expense">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
        } else {
            // 列表視圖
            sortedCategories.forEach(category => {
                html += `
                    <div class="category-list-item" data-id="${category.id}">
                        <div class="category-list-icon" style="color: ${category.color || '#e74c3c'}">
                            <i class="${category.icon || 'fas fa-tag'}"></i>
                        </div>
                        <div class="category-name">${category.name}</div>
                        <div class="category-actions">
                            <button class="btn btn-sm edit-category" data-id="${category.id}" data-type="expense">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger delete-category" data-id="${category.id}" data-type="expense">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
        }

        expenseCategoriesList.innerHTML = html;
        
        // 綁定事件
        bindCategoryEvents();
    } catch (error) {
        console.error("更新支出類別列表時發生錯誤:", error);
        const expenseCategoriesList = document.getElementById('expenseCategoriesList');
        if (expenseCategoriesList) {
            expenseCategoriesList.innerHTML = '<div class="category-add-card"><button id="addExpenseCategoryButton" class="btn btn-add">+ 新增</button></div><p class="error-message">載入支出類別時出錯</p>';
            
            // 緊急修復 - 至少綁定添加按鈕
            const addButton = document.getElementById('addExpenseCategoryButton');
            if (addButton) {
                addButton.addEventListener('click', function() {
                    document.getElementById('categoryType').value = 'expense';
                    openModal('addCategoryModal');
                });
            }
        }
    }
}

// 頁面載入指示器
function showPageLoading(tabId) {
    const tab = document.getElementById(tabId);
    if (tab) {
        tab.innerHTML = '<div class="page-loading"><div class="spinner"></div><p>載入中...</p></div>';
    }
}

// 安全更新UI - 在出錯時嘗試最低限度的UI更新
function safeUpdateUI() {
    console.log("執行安全UI更新");

    try {
        // 嘗試更新各個部分
        // 1. 更新賬戶列表
        try {
            const accountsList = document.getElementById('accountsList');
            if (accountsList) {
                if (appState.accounts.length === 0) {
                    accountsList.innerHTML = '<p class="empty-message">尚未設置任何戶口</p>';
                } else {
                    let html = '';
                    appState.accounts.forEach(account => {
                        html += `
                            <div class="account-list-item">
                                <div class="account-info">
                                    <div class="account-name">${account.name}</div>
                                </div>
                                <div class="account-details">
                                    <div class="account-balance">${formatCurrency(account.balance, account.currency)}</div>
                                </div>
                            </div>
                        `;
                    });
                    accountsList.innerHTML = html;
                }
            }
        } catch (e) {
            console.error("安全更新賬戶列表失敗:", e);
        }

        // 2. 嘗試更新交易列表
        try {
            const transactionsList = document.getElementById('transactionsList');
            if (transactionsList) {
                if (appState.transactions.length === 0) {
                    transactionsList.innerHTML = '<p class="empty-message">尚無交易記錄</p>';
                } else {
                    transactionsList.innerHTML = '<p>有交易記錄，但無法顯示詳情</p>';
                }
            }
        } catch (e) {
            console.error("安全更新交易列表失敗:", e);
        }

        // 3. 嘗試更新類別列表
        try {
            const incomeCategoriesList = document.getElementById('incomeCategoriesList');
            const expenseCategoriesList = document.getElementById('expenseCategoriesList');
            
            if (incomeCategoriesList) {
                const addCardHtml = '<div class="category-add-card"><button id="addIncomeCategoryButton" class="btn btn-add">+ 新增</button></div>';
                incomeCategoriesList.innerHTML = addCardHtml + '<p class="empty-message">無法顯示收入類別</p>';
            }
            
            if (expenseCategoriesList) {
                const addCardHtml = '<div class="category-add-card"><button id="addExpenseCategoryButton" class="btn btn-add">+ 新增</button></div>';
                expenseCategoriesList.innerHTML = addCardHtml + '<p class="empty-message">無法顯示支出類別</p>';
            }
        } catch (e) {
            console.error("安全更新類別列表失敗:", e);
        }
        
    } catch (error) {
        console.error("安全更新UI時發生錯誤:", error);
    }
}

// 更新所有下拉菜單
function updateAllDropdowns() {
    console.log("更新所有下拉菜單");

    try {
        // 更新交易表單的下拉菜單
        updateTransactionsForms();

        // 更新轉賬表單的下拉菜單
        updateTransferForm();

        // 更新類別過濾器
        updateCategoryFilter();

        // 更新類別預算下拉菜單
        if (typeof updateCategoryBudgetSelect === 'function') {
            updateCategoryBudgetSelect();
        }
    } catch (error) {
        console.error("更新所有下拉菜單時發生錯誤:", error);
        // 不拋出異常，因為這只是輔助更新
    }
}

// 更新所有UI
function updateAllUI() {
    console.log("更新所有UI");

    try {
        // 更新儀表板
        updateDashboardUI();

        // 更新賬戶管理
        updateAccountsUI();
        updateTransferForm();

        // 更新類別管理
        updateCategoriesUI();

        // 更新交易管理
        updateTransactionsUI();

        // 更新預算管理
        if (typeof updateBudgetsUI === 'function') {
            updateBudgetsUI();
        }

        // 更新統計分析
        updateStatisticsUI();

        // 更新同步頁面
        updateSyncUI();

        // 更新連接狀態
        updateSyncStatus();
    } catch (error) {
        console.error("更新所有UI時發生錯誤:", error);
        showToast('更新界面失敗，請嘗試重新加載頁面', 'error');
        
        // 嘗試安全更新
        safeUpdateUI();
    }
}

// 更新儀表板UI和相關模塊由charts.js處理，此處只提供接口
function updateDashboardUI() {
    console.log("更新儀表板UI");

    try {
        // 更新總資產
        updateTotalAssets();

        // 更新今日收支
        updateTodayTransactions();

        // 更新預算狀態
        if (typeof updateBudgetStatus === 'function') {
            updateBudgetStatus();
        }

        // 更新近期交易
        updateRecentTransactions();

        // 更新財務健康指數
        if (typeof updateFinancialHealthIndex === 'function') {
            updateFinancialHealthIndex();
        }
    } catch (error) {
        console.error("更新儀表板UI時發生錯誤:", error);
        showToast('更新儀表板UI失敗', 'error');

        // 嘗試安全更新
        safeUpdateUI();
    }
}

// 更新總資產
function updateTotalAssets() {
    console.log("更新總資產");

    try {
        // 計算所有賬戶的餘額總和(考慮匯率轉換)
        let totalAssets = 0;

        appState.accounts.forEach(account => {
            let balance = account.balance || 0;

            // 如果賬戶貨幣與默認貨幣不同，則轉換
            if (account.currency !== defaultCurrency) {
                try {
                    const rate = getExchangeRate(account.currency, defaultCurrency) || 1;
                    balance = balance * rate;
                } catch (e) {
                    console.error("匯率轉換錯誤:", e);
                }
            }

            totalAssets += balance;
        });

        // 更新UI
        const totalAssetsElement = document.getElementById('totalAssets');
        if (totalAssetsElement) {
            totalAssetsElement.textContent = formatNumber(totalAssets);
        }
    } catch (error) {
        console.error("更新總資產時發生錯誤:", error);
        throw error;
    }
}

// 更新今日交易
function updateTodayTransactions() {
    console.log("更新今日交易");

    try {
        // 獲取今天的日期
        const today = new Date().toISOString().split('T')[0];

        // 篩選今日交易
        const todayTransactions = appState.transactions.filter(t => t.date === today);

        // 計算今日收入和支出
        let todayIncome = 0;
        let todayExpense = 0;

        todayTransactions.forEach(transaction => {
            const account = appState.accounts.find(a => a.id === transaction.accountId);

            if (!account) {
                return;
            }

            let amount = transaction.amount || 0;

            // 如果賬戶貨幣與默認貨幣不同，則轉換
            if (account.currency !== defaultCurrency) {
                try {
                    const rate = getExchangeRate(account.currency, defaultCurrency) || 1;
                    amount = amount * rate;
                } catch (e) {
                    console.error("匯率轉換錯誤:", e);
                }
            }

            if (transaction.type === 'income') {
                todayIncome += amount;
            } else {
                todayExpense += amount;
            }
        });

        // 更新UI
        const todayIncomeElement = document.getElementById('todayIncome');
        const todayExpenseElement = document.getElementById('todayExpense');

        if (todayIncomeElement) {
            todayIncomeElement.textContent = formatNumber(todayIncome);
        }

        if (todayExpenseElement) {
            todayExpenseElement.textContent = formatNumber(todayExpense);
        }

        // 更新今日交易列表
        const todayTransactionsList = document.getElementById('todayTransactionsList');

        if (todayTransactionsList) {
            if (todayTransactions.length === 0) {
                todayTransactionsList.innerHTML = '<p class="empty-message">今日尚無交易記錄</p>';
                return;
            }

            // 排序交易(最新的在前)
            todayTransactions.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

            let html = '';

            // 最多顯示5筆
            const displayTransactions = todayTransactions.slice(0, 5);

            displayTransactions.forEach(transaction => {
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

                html += `
                <div class="transaction-item ${transaction.type}">
                    <div class="transaction-icon" style="color: ${categoryColor}">
                        <i class="${categoryIcon}"></i>
                    </div>
                    <div class="transaction-details">
                        <div class="transaction-category">${categoryName}</div>
                        <div class="transaction-account">${account ? account.name : '未知賬戶'}</div>
                    </div>
                    <div class="transaction-amount">${formatCurrency(transaction.amount, account ? account.currency : defaultCurrency)}</div>
                </div>
            `;
            });

            todayTransactionsList.innerHTML = html;
        }
    } catch (error) {
        console.error("更新今日交易時發生錯誤:", error);
        throw error;
    }
}

// 更新近期交易
function updateRecentTransactions() {
    console.log("更新近期交易");

    try {
        const recentTransactionsListElement = document.getElementById('recentTransactionsList');

        if (!recentTransactionsListElement) {
            console.error("找不到近期交易列表元素");
            return;
        }

        if (appState.transactions.length === 0) {
            recentTransactionsListElement.innerHTML = '<p class="empty-message">尚無交易記錄</p>';
            return;
        }

        // 按日期排序(最新的在前)
        const sortedTransactions = [...appState.transactions].sort((a, b) => {
            if (a.date !== b.date) {
                return b.date.localeCompare(a.date);
            }
            return (b.createdAt || '').localeCompare(a.createdAt || '');
        });

        // 獲取最近10筆交易
        const recentTransactions = sortedTransactions.slice(0, 10);

        let html = '';

        recentTransactions.forEach(transaction => {
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
                <div class="transaction-item ${transaction.type}">
                    <div class="transaction-date">${formattedDate}</div>
                    <div class="transaction-icon" style="color: ${categoryColor}">
                        <i class="${categoryIcon}"></i>
                    </div>
                    <div class="transaction-details">
                        <div class="transaction-category">${categoryName}</div>
                        <div class="transaction-account">${account ? account.name : '未知賬戶'}</div>
                        ${transaction.note ? `<div class="transaction-note">${transaction.note}</div>` : ''}
                    </div>
                    <div class="transaction-amount">${formatCurrency(transaction.amount, account ? account.currency : defaultCurrency)}</div>
                </div>
            `;
        });

        recentTransactionsListElement.innerHTML = html;
    } catch (error) {
        console.error("更新近期交易時發生錯誤:", error);
        throw error;
    }
}

// 更新賬戶UI
function updateAccountsUI() {
    console.log("更新賬戶UI");

    try {
        const accountsList = document.getElementById('accountsList');

        if (!accountsList) {
            console.error("找不到賬戶列表元素");
            return;
        }

        // 檢查是否有賬戶
        if (appState.accounts.length === 0) {
            accountsList.innerHTML = '<p class="empty-message">尚未設置任何戶口</p>';
            return;
        }

        // 確定視圖類型
        const isCardView = accountsList.classList.contains('card-view');

        let html = '';

        appState.accounts.forEach(account => {
            if (isCardView) {
                // 根據賬戶類型設置不同的顏色
                let headerColor;

                switch (account.type) {
                    case 'cash':
                        headerColor = '#27ae60';
                        break;
                    case 'bank':
                        headerColor = '#3498db';
                        break;
                    case 'credit':
                        headerColor = '#e74c3c';
                        break;
                    case 'investment':
                        headerColor = '#f39c12';
                        break;
                    default:
                        headerColor = '#95a5a6';
                }

                // 獲取賬戶類型的中文名稱
                let accountTypeName;

                switch (account.type) {
                    case 'cash':
                        accountTypeName = '現金';
                        break;
                    case 'bank':
                        accountTypeName = '銀行戶口';
                        break;
                    case 'credit':
                        accountTypeName = '信用卡';
                        break;
                    case 'investment':
                        accountTypeName = '投資';
                        break;
                    default:
                        accountTypeName = '其他';
                }

                html += `
                    <div class="account-card" data-id="${account.id}">
                        <div class="account-card-header" style="background-color: ${headerColor}">
                            <h3>${account.name}</h3>
                            <div class="account-type">${accountTypeName}</div>
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
                    </div>
                `;
            } else {
                // 列表視圖
                html += `
                    <div class="account-list-item" data-id="${account.id}">
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
                    </div>
                `;
            }
        });

        accountsList.innerHTML = html;

        // 添加編輯和刪除按鈕的事件監聽器
        accountsList.querySelectorAll('.edit-account').forEach(button => {
            button.addEventListener('click', function () {
                const accountId = this.getAttribute('data-id');
                editAccount(accountId);
            });
        });

        accountsList.querySelectorAll('.delete-account').forEach(button => {
            button.addEventListener('click', function () {
                const accountId = this.getAttribute('data-id');
                const message = '確定要刪除此戶口嗎?相關交易將保留，但匯入金額將不再計入總資產。';
                showConfirmDialog(message, () => deleteAccount(accountId));
            });
        });
    } catch (error) {
        console.error("更新賬戶UI時發生錯誤:", error);
        throw error;
    }
}

// 編輯賬戶
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

// 刪除賬戶
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

// 創建預算詳情模態框
function createBudgetDetailsModal() {
    // 創建模態框HTML
    const modalHTML = `
    <div id="budgetDetailsModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>預算詳情</h3>
                <button class="close-button">&times;</button>
            </div>
            <div class="modal-body">
                <div class="budget-details-header">
                    <h2 id="budgetDetailName">預算名稱</h2>
                    <div id="budgetDetailPeriod" class="budget-period">日期範圍</div>
                </div>
                <div class="budget-details-summary">
                    <div class="budget-detail-row">
                        <div class="detail-label">總預算:</div>
                        <div id="budgetDetailTotal" class="detail-value">$0.00</div>
                    </div>
                    <div class="budget-detail-row">
                        <div class="detail-label">實際支出:</div>
                        <div id="budgetDetailSpent" class="detail-value">$0.00</div>
                    </div>
                    <div class="budget-detail-row">
                        <div class="detail-label">結餘:</div>
                        <div id="budgetDetailRemaining" class="detail-value">$0.00</div>
                    </div>
                </div>
                <div class="budget-details-categories">
                    <h4>類別預算</h4>
                    <div id="budgetDetailCategories" class="category-budgets-list">
                        <!-- 類別預算將在這裡填充 -->
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary modal-close">關閉</button>
            </div>
        </div>
    </div>`;

    // 添加到文檔
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // 添加關閉按鈕事件
    document.querySelector('#budgetDetailsModal .close-button').addEventListener('click', closeCurrentModal);
    document.querySelector('#budgetDetailsModal .modal-close').addEventListener('click', closeCurrentModal);
}

// 更新預算狀態
function updateBudgetStatus() {
    console.log("更新預算狀態");

    try {
        const budgetStatusElement = document.getElementById('budgetStatus');

        if (!budgetStatusElement) {
            console.error("找不到預算狀態元素");
            return;
        }

        // 檢查是否有預算
        if (!appState.budgets.total || appState.budgets.total <= 0) {
            budgetStatusElement.innerHTML = `
                <p class="empty-message">尚未設定預算</p>
                <a href="#" onclick="showTabContent('budgets')" class="action-link">設定預算</a>
            `;
            return;
        }

        // 確定預算週期
        const today = new Date();
        const resetCycle = appState.budgets.resetCycle || 'monthly';
        const resetDay = parseInt(appState.budgets.resetDay || 1, 10);

        let startDate;
        let cycleName;

        if (resetCycle === 'daily') {
            startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            cycleName = '今日';
        } else if (resetCycle === 'weekly') {
            const day = today.getDay(); // 0 = 週日, 1 = 週一, ...
            const diff = day === 0 ? 6 : day - 1; // 調整為週一作為一週的開始
            startDate = new Date(today);
            startDate.setDate(today.getDate() - diff);
            startDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
            cycleName = '本週';
        } else { // monthly
            const currentDay = today.getDate();

            if (currentDay >= resetDay) {
                // 本月的重設日
                startDate = new Date(today.getFullYear(), today.getMonth(), resetDay);
            } else {
                // 上月的重設日
                startDate = new Date(today.getFullYear(), today.getMonth() - 1, resetDay);
            }

            cycleName = '本月';
        }

        // 將日期格式化為 YYYY-MM-DD
        const startDateFormatted = startDate.toISOString().split('T')[0];
        const todayFormatted = today.toISOString().split('T')[0];

        // 獲取週期內的支出交易
        const cycleTransactions = appState.transactions.filter(t =>
            t.type === 'expense' &&
            t.date >= startDateFormatted &&
            t.date <= todayFormatted &&
            t.categoryId !== 'transfer_out' // 排除轉賬
        );

        // 計算總支出
        let totalSpent = 0;

        cycleTransactions.forEach(transaction => {
            const account = appState.accounts.find(a => a.id === transaction.accountId);

            if (!account) {
                return;
            }

            let amount = transaction.amount || 0;

            // 如果賬戶貨幣與默認貨幣不同，則轉換
            if (account.currency !== defaultCurrency) {
                try {
                    const rate = getExchangeRate(account.currency, defaultCurrency);
                    amount = amount * rate;
                } catch (e) {
                    console.error("匯率轉換錯誤:", e);
                }
            }

            totalSpent += amount;
        });

        // 計算百分比和剩餘預算
        const percentage = (totalSpent / appState.budgets.total) * 100;
        const remaining = Math.max(0, appState.budgets.total - totalSpent);

        // 根據百分比確定顏色
        let progressColor = 'var(--primary-color)';

        if (percentage > 90) {
            progressColor = 'var(--danger-color)';
        } else if (percentage > 70) {
            progressColor = 'var(--warning-color)';
        }

        // 更新UI
        budgetStatusElement.innerHTML = `
            <div class="budget-header">
                <h4>${cycleName}預算</h4>
                <span class="budget-amount">${formatCurrency(appState.budgets.total)}</span>
            </div>
            <div class="budget-progress-container">
                <div class="budget-progress-bar" style="width: ${Math.min(100, percentage)}%; background-color: ${progressColor}"></div>
            </div>
            <div class="budget-info">
                <span>已使用 ${formatCurrency(totalSpent)} (${percentage.toFixed(1)}%)</span>
                <span>剩餘 ${formatCurrency(remaining)}</span>
            </div>
        `;
    } catch (error) {
        console.error("更新預算狀態時發生錯誤:", error);
        throw error;
    }
}

// 更新財務健康指數
function updateFinancialHealthIndex() {
    console.log("更新財務健康指數");

    try {
        const healthIndexElement = document.getElementById('financialHealthIndex');
        const financialAdviceElement = document.getElementById('financialAdvice');

        if (!healthIndexElement || !financialAdviceElement) {
            console.error("找不到財務健康指數元素");
            return;
        }

        // 檢查是否有足夠數據計算
        if (appState.transactions.length === 0) {
            healthIndexElement.textContent = 'N/A';
            financialAdviceElement.textContent = '需要記錄交易以計算財務健康指數。開始記錄您的收入和支出，獲取個性化財務建議。';
            return;
        }

        // 計算最近3個月的數據
        const now = new Date();
        const threeMonthsAgo = new Date(now);
        threeMonthsAgo.setMonth(now.getMonth() - 3);

        const startDate = threeMonthsAgo.toISOString().split('T')[0];
        const endDate = now.toISOString().split('T')[0];

        // 獲取最近3個月的交易
        const recentTransactions = appState.transactions.filter(t =>
            t.date >= startDate && t.date <= endDate
        );

        if (recentTransactions.length === 0) {
            healthIndexElement.textContent = 'N/A';
            financialAdviceElement.textContent = '需要最近3個月的交易記錄來計算準確的財務健康指數。繼續記錄您的收入和支出。';
            return;
        }

        // 計算總收入和支出
        let totalIncome = 0;
        let totalExpense = 0;

        recentTransactions.forEach(transaction => {
            const account = appState.accounts.find(a => a.id === transaction.accountId);

            if (!account) return;

            let amount = transaction.amount || 0;

            // 匯率轉換
            if (account.currency !== defaultCurrency) {
                try {
                    const rate = getExchangeRate(account.currency, defaultCurrency);
                    amount = amount * rate;
                } catch (e) {
                    console.error("匯率轉換錯誤:", e);
                }
            }

            if (transaction.type === 'income' && transaction.categoryId !== 'transfer_in') {
                totalIncome += amount;
            } else if (transaction.type === 'expense' && transaction.categoryId !== 'transfer_out') {
                totalExpense += amount;
            }
        });

        // 各項指標計算
        let healthIndex = 0;
        const savingsScore = calculateSavingsScore(totalIncome, totalExpense);
        const budgetScore = calculateBudgetScore();
        const diversityScore = calculateDiversityScore();
        const consistencyScore = calculateConsistencyScore();

        // 權重計算最終指數
        healthIndex = Math.round(
            savingsScore * 0.4 +
            budgetScore * 0.25 +
            diversityScore * 0.15 +
            consistencyScore * 0.2
        );

        // 確保指數在0-100範圍內
        healthIndex = Math.max(0, Math.min(100, healthIndex));

        // 顯示指數
        healthIndexElement.textContent = healthIndex;

        // 根據健康指數提供不同的建議
        let advice;

        if (healthIndex >= 90) {
            advice = '您的財務狀況非常健康！繼續保持良好的理財習慣，可考慮增加投資比例，獲取更高的資產回報。';
        } else if (healthIndex >= 80) {
            advice = '您的財務狀況良好。建議檢視每月支出，尋找更多節省的空間，並確保有足夠的緊急資金。';
        } else if (healthIndex >= 70) {
            advice = '您的財務狀況尚可。建議關注預算管理，減少非必要支出，並嘗試增加收入來源。';
        } else if (healthIndex >= 60) {
            advice = '您的財務狀況需要改善。建議制定嚴格的預算計劃，減少非必要支出，並開始建立緊急資金。';
        } else if (healthIndex >= 40) {
            advice = '您的財務狀況值得關注。建議審視所有支出，削減非必要開支，優先償還高利息債務，並制定緊急儲蓄計劃。';
        } else {
            advice = '您的財務狀況需要立即關注。建議尋求專業財務顧問的幫助，制定債務管理計劃，大幅削減開支，並積極尋找增加收入的方式。';
        }

        // 添加具體建議
        if (savingsScore < 60) {
            advice += ' 您的儲蓄率偏低，建議將收入的20-30%用於儲蓄。';
        }

        if (budgetScore < 60) {
            advice += ' 您可能超支或沒有合理的預算計劃，設定適當的預算目標能更好地控制支出。';
        }

        if (diversityScore < 60) {
            advice += ' 您的收入或支出類別較為單一，可考慮多元化收入來源和平衡各類支出。';
        }

        if (consistencyScore < 60) {
            advice += ' 您的財務行為不夠一致或規律，養成定期記賬和管理財務的習慣很重要。';
        }

        financialAdviceElement.textContent = advice;
    } catch (error) {
        console.error("更新財務健康指數時發生錯誤:", error);
        // 顯示友好的錯誤信息，而不是永久的"載入中..."
        const healthIndexElement = document.getElementById('financialHealthIndex');
        const financialAdviceElement = document.getElementById('financialAdvice');

        if (healthIndexElement) healthIndexElement.textContent = '--';
        if (financialAdviceElement) financialAdviceElement.textContent = '計算財務健康指數時遇到問題，請稍後再試。';
    }
}

// 計算儲蓄得分 (0-100)
function calculateSavingsScore(income, expense) {
    if (income <= 0) return 0;

    const savingsRate = (income - expense) / income * 100;

    // 儲蓄率20%以上得滿分，0%或負數得0分，線性計算中間值
    if (savingsRate >= 20) return 100;
    if (savingsRate <= 0) return 0;

    return savingsRate * 5; // 0-20% 線性映射到 0-100分
}

// 計算預算得分 (0-100)
function calculateBudgetScore() {
    // 如果沒有設置預算，給予較低分數
    if (!appState.budgets.total || appState.budgets.total <= 0) {
        return 40;
    }

    // 獲取當前預算週期內的支出
    const today = new Date();
    const resetCycle = appState.budgets.resetCycle || 'monthly';
    const resetDay = parseInt(appState.budgets.resetDay || 1, 10);

    let startDate;

    if (resetCycle === 'daily') {
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    } else if (resetCycle === 'weekly') {
        const day = today.getDay(); // 0 = 週日, 1 = 週一, ...
        const diff = day === 0 ? 6 : day - 1; // 調整為週一作為一週的開始
        startDate = new Date(today);
        startDate.setDate(today.getDate() - diff);
    } else { // monthly
        const currentDay = today.getDate();

        if (currentDay >= resetDay) {
            // 本月的重設日
            startDate = new Date(today.getFullYear(), today.getMonth(), resetDay);
        } else {
            // 上月的重設日
            startDate = new Date(today.getFullYear(), today.getMonth() - 1, resetDay);
        }
    }

    // 格式化日期
    const startDateString = startDate.toISOString().split('T')[0];
    const todayString = today.toISOString().split('T')[0];

    // 查找週期內的支出
    const cycleExpenses = appState.transactions.filter(t =>
        t.type === 'expense' &&
        t.categoryId !== 'transfer_out' &&
        t.date >= startDateString &&
        t.date <= todayString
    );

    // 計算已使用預算百分比
    let totalSpent = 0;

    cycleExpenses.forEach(transaction => {
        const account = appState.accounts.find(a => a.id === transaction.accountId);

        if (!account) return;

        let amount = transaction.amount || 0;

        // 匯率轉換
        if (account.currency !== defaultCurrency) {
            try {
                const rate = getExchangeRate(account.currency, defaultCurrency);
                amount = amount * rate;
            } catch (e) {
                console.error("匯率轉換錯誤:", e);
            }
        }

        totalSpent += amount;
    });

    // 計算預算使用率
    const budgetUsageRate = (totalSpent / appState.budgets.total) * 100;

    // 判斷預算周期已經過去的比例
    let cycleElapsedRate;

    if (resetCycle === 'daily') {
        // 這天已過去的小時百分比
        const hours = today.getHours();
        cycleElapsedRate = (hours / 24) * 100;
    } else if (resetCycle === 'weekly') {
        // 這週已過去的天數百分比
        const daysPassed = today.getDay() === 0 ? 6 : today.getDay() - 1;
        cycleElapsedRate = (daysPassed / 7) * 100;
    } else { // monthly
        // 這月已過去的天數百分比
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        let daysPassed;

        if (today.getDate() >= resetDay) {
            daysPassed = today.getDate() - resetDay;
        } else {
            const daysInPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
            daysPassed = (daysInPrevMonth - resetDay) + today.getDate();
        }

        const totalDays = resetCycle === 'monthly' ? daysInMonth : 30;
        cycleElapsedRate = (daysPassed / totalDays) * 100;
    }

    // 如果預算使用率低於周期已過去的比例，表示控制良好
    if (budgetUsageRate <= cycleElapsedRate) {
        // 根據差距給分，最高100分
        const difference = cycleElapsedRate - budgetUsageRate;
        return Math.min(100, 80 + difference);
    } else {
        // 超支了，根據超支程度扣分
        const overspentRate = budgetUsageRate - cycleElapsedRate;
        return Math.max(0, 80 - overspentRate);
    }
}

// 計算多樣性得分 (0-100)
function calculateDiversityScore() {
    // 檢查收入和支出類別的多樣性
    const incomeCategories = new Set();
    const expenseCategories = new Set();

    // 獲取最近3個月的交易
    const now = new Date();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(now.getMonth() - 3);

    const startDate = threeMonthsAgo.toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];

    const recentTransactions = appState.transactions.filter(t =>
        t.date >= startDate && t.date <= endDate &&
        t.categoryId !== 'transfer_in' &&
        t.categoryId !== 'transfer_out'
    );

    recentTransactions.forEach(transaction => {
        if (transaction.type === 'income') {
            incomeCategories.add(transaction.categoryId);
        } else {
            expenseCategories.add(transaction.categoryId);
        }
    });

    // 收入來源多樣性 (最高50分)
    let incomeScore = 0;
    if (incomeCategories.size >= 3) {
        incomeScore = 50;
    } else if (incomeCategories.size === 2) {
        incomeScore = 40;
    } else if (incomeCategories.size === 1) {
        incomeScore = 25;
    }

    // 支出類別多樣性 (最高50分)
    let expenseScore = 0;
    if (expenseCategories.size >= 5) {
        expenseScore = 50;
    } else if (expenseCategories.size >= 3) {
        expenseScore = 40;
    } else if (expenseCategories.size >= 1) {
        expenseScore = 25;
    }

    return incomeScore + expenseScore;
}

// 計算一致性得分 (0-100)
function calculateConsistencyScore() {
    // 檢查用戶記賬的規律性
    const transactions = appState.transactions;

    if (transactions.length < 5) {
        return 50; // 交易太少，給予中等分數
    }

    // 獲取不同日期的記錄次數
    const recordDates = new Set();
    transactions.forEach(t => {
        if (t.date) recordDates.add(t.date);
    });

    // 計算記賬頻率
    const sortedTransactions = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    const firstTransaction = new Date(sortedTransactions[0].date);
    const lastTransaction = new Date();

    const totalDays = Math.ceil((lastTransaction - firstTransaction) / (1000 * 60 * 60 * 24));

    if (totalDays <= 0) {
        return 80; // 所有交易都在同一天，給予較高分數
    }

    const recordFrequency = recordDates.size / totalDays;

    // 一致性得分計算
    if (recordFrequency >= 0.7) {
        return 100;
    } else if (recordFrequency >= 0.3) {
        return 90;
    } else if (recordFrequency >= 0.15) {
        return 80;
    } else if (recordFrequency >= 0.07) {
        return 60;
    } else if (recordFrequency >= 0.03) {
        return 40;
    } else {
        return 20;
    }
}