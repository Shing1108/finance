// ui-core.js - UI核心函數

/**
 * 切換到指定標籤頁
 * @param {string} tabId 標籤頁ID
 */
function showTabContent(tabId) {
    console.log(`切換到${tabId}選項卡`);

    try {
        // 先設置導航標籤的激活狀態
        document.querySelectorAll('.nav-tabs li').forEach(item => {
            item.classList.remove('active');
        });

        // 激活點擊的標籤
        const tabNav = document.querySelector(`.nav-tabs li[data-tab="${tabId}"]`);
        if (tabNav) {
            tabNav.classList.add('active');
        }

        // 創建一個平滑過渡
        const activeTab = document.querySelector('.tab-content.active');
        const newTab = document.getElementById(tabId);

        if (!newTab) {
            console.error(`找不到ID為${tabId}的選項卡元素`);
            return;
        }

        // 如果有當前活動的標籤，先對其進行過渡
        if (activeTab && activeTab !== newTab) {
            // 先讓當前標籤淡出
            activeTab.style.opacity = '0';
            activeTab.style.transform = 'translateY(10px)';
            
            // 設置延遲，讓淡出動畫完成
            setTimeout(() => {
                activeTab.classList.remove('active');
                
                // 然後顯示新標籤
                newTab.classList.add('active');
                setTimeout(() => {
                    newTab.style.opacity = '1';
                    newTab.style.transform = 'translateY(0)';
                    
                    // 更新UI
                    updateTabContent(tabId);
                }, 50);
            }, 200);
        } else {
            // 如果沒有當前活動標籤，直接顯示新標籤
            newTab.classList.add('active');
            setTimeout(() => {
                newTab.style.opacity = '1';
                newTab.style.transform = 'translateY(0)';
                
                // 更新UI
                updateTabContent(tabId);
            }, 50);
        }
    } catch (error) {
        console.error("切換選項卡時發生錯誤:", error);
        showToast('切換選項卡失敗: ' + error.message, 'error');
    }
}

/**
 * 根據標籤ID更新內容
 * @param {string} tabId 標籤頁ID
 */
function updateTabContent(tabId) {
    try {
        switch (tabId) {
            case 'dashboard':
                if (typeof updateDashboardUI === 'function') {
                    updateDashboardUI();
                }
                break;
            case 'accounts':
                if (typeof updateAccountsUI === 'function') {
                    updateAccountsUI();
                }
                if (typeof updateTransferForm === 'function') {
                    updateTransferForm();
                }
                break;
            case 'transactions':
                if (typeof updateTransactionsUI === 'function') {
                    updateTransactionsUI();
                }
                break;
            case 'budgets':
                if (typeof updateBudgetsUI === 'function') {
                    updateBudgetsUI();
                }
                break;
            case 'categories':
                if (typeof initializeCategoryTabs === 'function') {
                    initializeCategoryTabs();
                }
                if (typeof updateCategoriesUI === 'function') {
                    updateCategoriesUI();
                }
                break;
            case 'statistics':
                if (typeof updateStatisticsUI === 'function') {
                    updateStatisticsUI();
                }
                break;
            case 'sync':
                if (typeof updateSyncUI === 'function') {
                    updateSyncUI();
                }
                break;
            case 'savingsGoals':
                if (window.savingsGoals && typeof window.savingsGoals.updateSavingsGoalsList === 'function') {
                    window.savingsGoals.updateSavingsGoalsList();
                }
                break;
            case 'dataAnalytics':
                if (window.analytics && typeof window.analytics.initAnalytics === 'function') {
                    window.analytics.initAnalytics();
                }
                break;
        }
    } catch (error) {
        console.error(`更新${tabId}標籤內容時出錯:`, error);
    }
}

/**
 * 打開模態框 - 修改確保正確顯示
 * @param {string} modalId 模態框ID
 */
function openModal(modalId) {
    console.log(`打開模態框: ${modalId}`);

    try {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`找不到ID為${modalId}的模態框`);
            return;
        }

        // 重置樣式
        modal.style.pointerEvents = 'auto';
        modal.style.display = 'flex';
        modal.style.opacity = '0';
        
        setTimeout(() => {
            modal.classList.add('active');
            modal.style.opacity = '1';
        }, 10);

        // 特定模態框的初始化
        if (modalId === 'addAccountModal') {
            resetAccountForm();
        } else if (modalId === 'addCategoryModal') {
            resetCategoryForm();
        } else if (modalId === 'settingsModal') {
            loadSettingsToForm();
        }
    } catch (error) {
        console.error("打開模態框時發生錯誤:", error);
        showToast('打開模態框失敗: ' + error.message, 'error');
    }
}

/**
 * 關閉當前模態框 - 修復無法完全關閉的問題
 */
function closeCurrentModal() {
    console.log("關閉當前模態框");

    try {
        document.querySelectorAll('.modal.active').forEach(modal => {
            // 添加淡出動畫
            modal.style.opacity = '0';
            
            setTimeout(() => {
                modal.classList.remove('active');
                modal.style.opacity = '';
                modal.style.display = 'none'; // 確保隱藏
                
                // 確保點擊事件能夠穿透
                modal.style.pointerEvents = 'none';
                
                // 200ms 後重置 pointer-events，以便下次能夠打開
                setTimeout(() => {
                    modal.style.pointerEvents = '';
                }, 200);
            }, 200);
        });
    } catch (error) {
        console.error("關閉模態框時發生錯誤:", error);
        
        // 緊急關閉
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
            modal.style.display = 'none'; // 確保隱藏
            modal.style.pointerEvents = 'none'; // 確保點擊事件能夠穿透
            
            // 重置 pointer-events
            setTimeout(() => {
                modal.style.pointerEvents = '';
            }, 200);
        });
    }
}

/**
 * 創建確認對話框
 */
function createConfirmDialog() {
    // 創建確認對話框
    const confirmDialog = document.createElement('div');
    confirmDialog.id = 'confirmDialog';
    confirmDialog.className = 'modal';
    
    confirmDialog.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>確認操作</h3>
                <button class="close-button">&times;</button>
            </div>
            <div class="modal-body">
                <p id="confirmMessage"></p>
            </div>
            <div class="modal-footer">
                <button id="confirmYes" class="btn btn-danger">確認</button>
                <button id="confirmNo" class="btn btn-secondary">取消</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(confirmDialog);
    
    // 設置關閉按鈕事件
    const closeButton = confirmDialog.querySelector('.close-button');
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            confirmDialog.classList.remove('active');
        });
    }
    
    const cancelButton = document.getElementById('confirmNo');
    if (cancelButton) {
        cancelButton.addEventListener('click', function() {
            confirmDialog.classList.remove('active');
        });
    }
}

/**
 * 顯示確認對話框
 * @param {string} message 顯示訊息
 * @param {Function} confirmCallback 確認按鈕回調函數
 */
function showConfirmDialog(message, confirmCallback) {
    console.log("顯示確認對話框");
    try {
        // 檢查是否已存在確認對話框
        let confirmDialog = document.getElementById('confirmDialog');
        
        if (!confirmDialog) {
            createConfirmDialog();
            confirmDialog = document.getElementById('confirmDialog');
        }
        
        // 設置消息
        const confirmMessage = document.getElementById('confirmMessage');
        if (confirmMessage) {
            confirmMessage.textContent = message;
        }
        
        // 設置確認按鈕事件
        const confirmYes = document.getElementById('confirmYes');
        if (confirmYes) {
            // 移除之前的事件監聽器
            const newConfirmYes = confirmYes.cloneNode(true);
            confirmYes.parentNode.replaceChild(newConfirmYes, confirmYes);
            
            newConfirmYes.addEventListener('click', function() {
                if (typeof confirmCallback === 'function') {
                    confirmCallback();
                }
                confirmDialog.classList.remove('active');
            });
        }
        
        // 顯示對話框
        confirmDialog.classList.add('active');
    } catch (error) {
        console.error("顯示確認對話框時發生錯誤:", error);
        
        // 降級方案：使用瀏覽器內置的confirm
        if (confirm(message) && typeof confirmCallback === 'function') {
            confirmCallback();
        }
    }
}

/**
 * 顯示提示消息
 * @param {string} message 顯示訊息
 * @param {string} type 提示類型 (success, error, warning, info)
 */
function showToast(message, type = 'info') {
    console.log(`顯示提示消息: ${message} (${type})`);
    try {
        // 創建toast容器(如果不存在)
        let toastContainer = document.getElementById('toast-container');
        
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        
        // 創建toast元素
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.style.opacity = '0';
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${getToastIcon(type)}"></i>
            </div>
            <div class="toast-message">${message}</div>
            <button class="toast-close">×</button>
        `;
        
        // 添加到容器
        toastContainer.appendChild(toast);
        
        // 添加顯示動畫
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        }, 10);
        
        // 添加關閉按鈕事件
        const closeButton = toast.querySelector('.toast-close');
        if (closeButton) {
            closeButton.addEventListener('click', function() {
                fadeOutToast(toast, toastContainer);
            });
        }
        
        // 自動關閉
        setTimeout(function() {
            if (toast.parentNode === toastContainer) {
                fadeOutToast(toast, toastContainer);
            }
        }, 5000);
    } catch (error) {
        console.error("顯示提示消息時發生錯誤:", error);
        // 降級方案：使用alert
        alert(`${type.toUpperCase()}: ${message}`);
    }
}

/**
 * 平滑淡出Toast提示
 */
function fadeOutToast(toast, container) {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        if (toast.parentNode === container) {
            container.removeChild(toast);
        }
    }, 300);
}

/**
 * 獲取toast圖標
 */
function getToastIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'warning': return 'fa-exclamation-triangle';
        case 'error': return 'fa-times-circle';
        case 'info':
        default: return 'fa-info-circle';
    }
}

/**
 * 設置事件監聽器
 */
function setupEventListeners() {
    console.log("設置事件監聽器...");
    
    try {
        // 頂部導航標籤事件
        const navTabs = document.querySelectorAll('.nav-tabs li');
        navTabs.forEach(item => {
            item.addEventListener('click', function() {
                const tabId = this.getAttribute('data-tab');
                showTabContent(tabId);
            });
        });
        
        // 綁定各個按鈕和元素
        bindButtons();
        
        // 收入/支出標簽切換
        setupTabSwitching();
        
        // 視圖切換
        setupViewSwitching();
        
        // 轉賬匯率監聽
        if (typeof setupTransferExchangeRateListener === 'function') {
            setupTransferExchangeRateListener();
        }
        
        // 自動計算預算切換
        setupBudgetCalculation();
        
        // 重設週期變更事件
        setupResetCycleChange();
        
        // 添加賬戶選擇變更事件
        setupAccountCurrencySync();
        
        console.log("事件監聽器設置完成");
    } catch (error) {
        console.error("設置事件監聽器時發生錯誤:", error);
    }
}

/**
 * 同步賬戶貨幣到表單
 */
function setupAccountCurrencySync() {
    const incomeAccountSelect = document.getElementById('incomeAccount');
    const expenseAccountSelect = document.getElementById('expenseAccount');
    const incomeCurrencySelect = document.getElementById('incomeCurrency');
    const expenseCurrencySelect = document.getElementById('expenseCurrency');
    
    if (incomeAccountSelect && incomeCurrencySelect) {
        incomeAccountSelect.addEventListener('change', function() {
            const accountId = this.value;
            if (!accountId) return;
            
            const account = appState.accounts.find(a => a.id === accountId);
            if (account) {
                incomeCurrencySelect.value = account.currency;
            }
        });
    }
    
    if (expenseAccountSelect && expenseCurrencySelect) {
        expenseAccountSelect.addEventListener('change', function() {
            const accountId = this.value;
            if (!accountId) return;
            
            const account = appState.accounts.find(a => a.id === accountId);
            if (account) {
                expenseCurrencySelect.value = account.currency;
            }
        });
    }
}

/**
 * 綁定所有按鈕
 */
function bindButtons() {
    // 新增戶口按鈕
    bindButton('addAccountButton', function() {
        openModal('addAccountModal');
    });
    
    // 保存戶口按鈕
    bindButton('saveAccountButton', function() {
        if (typeof saveAccount === 'function') {
            saveAccount();
        }
    });
    
    // 新增收入類別按鈕
    bindButton('addIncomeCategoryButton', function() {
        const categoryType = document.getElementById('categoryType');
        if (categoryType) categoryType.value = 'income';
        openModal('addCategoryModal');
    });
    
    // 新增支出類別按鈕
    bindButton('addExpenseCategoryButton', function() {
        const categoryType = document.getElementById('categoryType');
        if (categoryType) categoryType.value = 'expense';
        openModal('addCategoryModal');
    });
    
    // 保存類別按鈕
    bindButton('saveCategoryButton', function() {
        if (typeof saveCategory === 'function') {
            saveCategory();
        }
    });
    
    // 保存收入交易按鈕
    bindButton('saveIncomeButton', function() {
        if (typeof saveTransaction === 'function') {
            saveTransaction('income');
        }
    });
    
    // 保存支出交易按鈕
    bindButton('saveExpenseButton', function() {
        if (typeof saveTransaction === 'function') {
            saveTransaction('expense');
        }
    });
    
    // 確認轉賬按鈕
    bindButton('confirmTransferButton', function() {
        if (typeof processTransfer === 'function') {
            processTransfer();
        }
    });
    
    // 設定按鈕
    bindButton('settingsButton', function() {
        openModal('settingsModal');
    });
    
    // 保存設定按鈕
    bindButton('saveSettingsButton', function() {
        saveSettings();
    });
    
    // 清除數據按鈕
    bindButton('clearDataButton', function() {
        const message = '確定要清除所有數據嗎?此操作無法復原。';
        showConfirmDialog(message, clearAllData);
    });
    
    // 創建預算按鈕
    bindButton('saveBudgetSettingsButton', function() {
        if (typeof createNewBudget === 'function') {
            createNewBudget();
        }
    });
    
    // 添加類別預算按鈕
    bindButton('addCategoryBudgetButton', function() {
        if (typeof addCategoryBudget === 'function') {
            addCategoryBudget();
        }
    });
    
    // 選擇圖標按鈕
    bindButton('selectIconButton', function() {
        const iconGrid = document.getElementById('iconGrid');
        if (iconGrid) {
            if (iconGrid.style.display === 'none') {
                if (typeof populateIconGrid === 'function') {
                    populateIconGrid();
                }
                iconGrid.style.display = 'grid';
            } else {
                iconGrid.style.display = 'none';
            }
        }
    });
    
    // 搜尋交易按鈕
    bindButton('searchTransactionsButton', function() {
        if (typeof filterTransactions === 'function') {
            filterTransactions();
        }
    });
    
    // 匯出數據按鈕
    bindButton('exportDataButton', function() {
        exportData();
    });
    
    // 匯入數據按鈕
    bindButton('importDataButton', function() {
        importDataFromText();
    });
    
    // 文件導入
    const fileImport = document.getElementById('fileImport');
    if (fileImport) {
        fileImport.addEventListener('change', importDataFromFile);
    }
    
    // 登入按鈕
    bindButton('loginButton', function() {
        if (typeof handleLogin === 'function') {
            handleLogin();
        }
    });
    
    // 登出按鈕
    bindButton('logoutButton', function() {
        if (typeof handleLogout === 'function') {
            handleLogout();
        }
    });
    
    // 同步按鈕
    bindButton('syncNowButton', function() {
        if (typeof syncNow === 'function') {
            syncNow();
        }
    });
    
    // 管理匯率按鈕
    bindButton('manageCurrencyButton', function() {
        if (typeof showExchangeRatesTable === 'function') {
            showExchangeRatesTable();
        }
    });
    
    // 移動版設定按鈕
    bindButton('mobileSettingsButton', function() {
        openModal('settingsModal');
    });
    
    // 新的一天按鈕
    bindButton('startNewDayButton', function() {
        if (window.dayManager && typeof window.dayManager.startNewDay === 'function') {
            window.dayManager.startNewDay();
        }
    });
    
    // 所有模態框的關閉按鈕
    const closeButtons = document.querySelectorAll('.close-button, .modal-cancel');
    closeButtons.forEach(button => {
        button.addEventListener('click', closeCurrentModal);
    });
}

/**
 * 綁定單個按鈕
 */
function bindButton(id, callback) {
    const button = document.getElementById(id);
    if (button) {
        button.addEventListener('click', callback);
    }
}

/**
 * 設置收入/支出標簽切換
 */
function setupTabSwitching() {
    const incomeTabButton = document.getElementById('incomeTabButton');
    const expenseTabButton = document.getElementById('expenseTabButton');
    const incomeCategoryTabButton = document.getElementById('incomeCategoryTabButton');
    const expenseCategoryTabButton = document.getElementById('expenseCategoryTabButton');
    
    // 收入/支出標簽切換
    if (incomeTabButton && expenseTabButton) {
        incomeTabButton.addEventListener('click', function() {
            this.classList.add('active');
            expenseTabButton.classList.remove('active');
            const incomeTab = document.getElementById('incomeTab');
            const expenseTab = document.getElementById('expenseTab');
            if (incomeTab && expenseTab) {
                incomeTab.classList.add('active');
                expenseTab.classList.remove('active');
            }
        });
        
        expenseTabButton.addEventListener('click', function() {
            this.classList.add('active');
            incomeTabButton.classList.remove('active');
            const incomeTab = document.getElementById('incomeTab');
            const expenseTab = document.getElementById('expenseTab');
            if (incomeTab && expenseTab) {
                expenseTab.classList.add('active');
                incomeTab.classList.remove('active');
            }
        });
    }
    
    // 類別標簽切換
    if (incomeCategoryTabButton && expenseCategoryTabButton) {
        incomeCategoryTabButton.addEventListener('click', function() {
            this.classList.add('active');
            expenseCategoryTabButton.classList.remove('active');
            const incomeCategoryTab = document.getElementById('incomeCategoryTab');
            const expenseCategoryTab = document.getElementById('expenseCategoryTab');
            if (incomeCategoryTab && expenseCategoryTab) {
                incomeCategoryTab.classList.add('active');
                expenseCategoryTab.classList.remove('active');
            }
        });
        
        expenseCategoryTabButton.addEventListener('click', function() {
            this.classList.add('active');
            incomeCategoryTabButton.classList.remove('active');
            const incomeCategoryTab = document.getElementById('incomeCategoryTab');
            const expenseCategoryTab = document.getElementById('expenseCategoryTab');
            if (incomeCategoryTab && expenseCategoryTab) {
                expenseCategoryTab.classList.add('active');
                incomeCategoryTab.classList.remove('active');
            }
        });
    }
}

/**
 * 設置視圖切換
 */
function setupViewSwitching() {
    // 賬戶視圖切換
    setupViewToggle('accountCardView', 'accountListView', 'accountsList', 'accounts-list', updateAccountsUI);
    
    // 收入類別視圖切換
    setupViewToggle('incomeCategoryCardView', 'incomeCategoryListView', 'incomeCategoriesList', 'categories-list', updateCategoriesUI);
    
    // 支出類別視圖切換
    setupViewToggle('expenseCategoryCardView', 'expenseCategoryListView', 'expenseCategoriesList', 'categories-list', updateCategoriesUI);
}

/**
 * 設置視圖切換
 */
function setupViewToggle(cardViewId, listViewId, listId, className, updateCallback) {
    const cardView = document.getElementById(cardViewId);
    const listView = document.getElementById(listViewId);
    const list = document.getElementById(listId);
    
    if (cardView && listView && list) {
        cardView.addEventListener('click', function() {
            this.classList.add('active');
            listView.classList.remove('active');
            list.className = `${className} card-view`;
            if (typeof updateCallback === 'function') {
                updateCallback();
            }
        });
        
        listView.addEventListener('click', function() {
            this.classList.add('active');
            cardView.classList.remove('active');
            list.className = `${className} list-view`;
            if (typeof updateCallback === 'function') {
                updateCallback();
            }
        });
    }
}

/**
 * 設置自動計算預算
 */
function setupBudgetCalculation() {
    const autoCalculateBudget = document.getElementById('autoCalculateBudget');
    if (autoCalculateBudget) {
        autoCalculateBudget.addEventListener('change', function() {
            const totalBudgetInput = document.getElementById('totalBudget');
            if (totalBudgetInput) {
                if (this.checked) {
                    totalBudgetInput.disabled = true;
                    if (typeof calculateTotalCategoryBudget === 'function') {
                        totalBudgetInput.value = calculateTotalCategoryBudget();
                    }
                } else {
                    totalBudgetInput.disabled = false;
                }
            }
        });
    }
}

/**
 * 設置重設週期變更事件
 */
function setupResetCycleChange() {
    const resetCycleInputs = document.querySelectorAll('input[name="resetCycle"]');
    if (resetCycleInputs.length > 0) {
        resetCycleInputs.forEach(input => {
            input.addEventListener('change', function() {
                const monthlyResetDayInput = document.getElementById('monthlyResetDay');
                if (monthlyResetDayInput) {
                    const monthlyResetDayContainer = monthlyResetDayInput.parentElement;
                    if (monthlyResetDayContainer) {
                        if (this.value === 'monthly') {
                            monthlyResetDayContainer.style.display = 'block';
                        } else {
                            monthlyResetDayContainer.style.display = 'none';
                        }
                    }
                }
            });
        });
    }
}

/**
 * 更新所有UI
 */
function updateAllUI() {
    console.log("更新所有UI");

    try {
        // 更新儀表板
        if (typeof updateDashboardUI === 'function') {
            try {
                updateDashboardUI();
            } catch (e) {
                console.error("更新儀表板UI時出錯:", e);
            }
        }

        // 更新賬戶管理
        if (typeof updateAccountsUI === 'function') {
            try {
                updateAccountsUI();
            } catch (e) {
                console.error("更新賬戶管理UI時出錯:", e);
            }
        }
        
        if (typeof updateTransferForm === 'function') {
            try {
                updateTransferForm();
            } catch (e) {
                console.error("更新轉賬表單時出錯:", e);
            }
        }

        // 更新類別管理
        if (typeof updateCategoriesUI === 'function') {
            try {
                updateCategoriesUI();
            } catch (e) {
                console.error("更新類別管理UI時出錯:", e);
            }
        }

        // 更新交易管理
        if (typeof updateTransactionsUI === 'function') {
            try {
                updateTransactionsUI();
            } catch (e) {
                console.error("更新交易管理UI時出錯:", e);
            }
        }

        // 更新預算管理
        if (typeof updateBudgetsUI === 'function') {
            try {
                updateBudgetsUI();
            } catch (e) {
                console.error("更新預算管理UI時出錯:", e);
            }
        }

        // 更新統計分析
        if (typeof updateStatisticsUI === 'function') {
            try {
                updateStatisticsUI();
            } catch (e) {
                console.error("更新統計分析UI時出錯:", e);
            }
        }

        // 更新同步頁面
        if (typeof updateSyncUI === 'function') {
            try {
                updateSyncUI();
            } catch (e) {
                console.error("更新同步頁面時出錯:", e);
            }
        }

        // 更新連接狀態
        if (typeof updateSyncStatus === 'function') {
            try {
                updateSyncStatus();
            } catch (e) {
                console.error("更新連接狀態時出錯:", e);
            }
        }
        
        // 更新儲蓄目標
        if (window.savingsGoals && typeof window.savingsGoals.updateSavingsGoalsList === 'function') {
            try {
                window.savingsGoals.updateSavingsGoalsList();
            } catch (e) {
                console.error("更新儲蓄目標UI時出錯:", e);
            }
        }
        
        // 更新分析
        if (window.analytics && typeof window.analytics.initAnalytics === 'function') {
            try {
                window.analytics.initAnalytics();
            } catch (e) {
                console.error("更新數據分析UI時出錯:", e);
            }
        }
    } catch (error) {
        console.error("更新所有UI時發生錯誤:", error);
        showToast('更新界面失敗，請嘗試重新載入頁面', 'error');
        
        // 嘗試安全更新
        safeUpdateUI();
    }
}

/**
 * 安全更新UI - 在出錯時嘗試最低限度的UI更新
 */
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

/**
 * 更新所有下拉菜單
 */
function updateAllDropdowns() {
    console.log("更新所有下拉菜單");

    try {
        // 更新交易表單的下拉菜單
        if (typeof updateTransactionsForms === 'function') {
            updateTransactionsForms();
        }

        // 更新頂部財務快照
        if (typeof updateFinancesSnapshot === 'function') {
            updateFinancesSnapshot();
        }

        // 更新轉賬表單的下拉菜單
        if (typeof updateTransferForm === 'function') {
            updateTransferForm();
        }

        // 更新類別過濾器
        if (typeof updateCategoryFilter === 'function') {
            updateCategoryFilter();
        }

        // 更新類別預算下拉菜單
        if (typeof updateCategoryBudgetSelect === 'function') {
            updateCategoryBudgetSelect();
        }
    } catch (error) {
        console.error("更新所有下拉菜單時發生錯誤:", error);
        // 不拋出異常，因為這只是輔助更新
    }
}

// 頁面載入指示器
function showPageLoading(tabId) {
    const tab = document.getElementById(tabId);
    if (tab) {
        tab.innerHTML = '<div class="page-loading"><div class="spinner"></div><p>載入中...</p></div>';
    }
}

// 生成唯一ID
function generateId() {
    return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

/**
 * 顯示選項對話框
 * @param {string} title 對話框標題
 * @param {string} message 對話框消息
 * @param {Array} buttons 按鈕數組，格式：[{text: '按鈕文字', action: Function, type: 'primary'|'secondary'|'danger'}]
 */
function showOptionsDialog(title, message, buttons) {
    console.log("顯示選項對話框");
    try {
        // 檢查是否已存在選項對話框
        let optionsDialog = document.getElementById('optionsDialog');
        
        if (!optionsDialog) {
            optionsDialog = document.createElement('div');
            optionsDialog.id = 'optionsDialog';
            optionsDialog.className = 'modal';
            
            document.body.appendChild(optionsDialog);
        }
        
        // 生成按鈕HTML
        let buttonsHTML = '';
        buttons.forEach(button => {
            const buttonType = button.type || 'secondary';
            buttonsHTML += `
                <button class="btn btn-${buttonType} options-button">${button.text}</button>
            `;
        });
        
        // 更新對話框內容
        optionsDialog.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <span class="close-button">&times;</span>
                </div>
                <div class="modal-body">
                    <p>${message}</p>
                    <div class="options-buttons">
                        ${buttonsHTML}
                    </div>
                </div>
            </div>
        `;
        
        // 綁定關閉按鈕事件
        optionsDialog.querySelector('.close-button').addEventListener('click', function() {
            optionsDialog.classList.remove('active');
        });
        
        // 綁定按鈕事件
        const optionButtons = optionsDialog.querySelectorAll('.options-button');
        optionButtons.forEach((button, index) => {
            button.addEventListener('click', function() {
                optionsDialog.classList.remove('active');
                if (buttons[index] && typeof buttons[index].action === 'function') {
                    buttons[index].action();
                }
            });
        });
        
        // 顯示對話框
        optionsDialog.classList.add('active');
    } catch (error) {
        console.error("顯示選項對話框時發生錯誤:", error);
        
        // 降級方案：使用confirm
        if (confirm(message) && buttons.length > 0 && typeof buttons[0].action === 'function') {
            buttons[0].action();
        }
    }
}

// 導出函數
window.showTabContent = showTabContent;
window.updateTabContent = updateTabContent;
window.openModal = openModal;
window.closeCurrentModal = closeCurrentModal;
window.showConfirmDialog = showConfirmDialog;
window.showToast = showToast;
window.setupEventListeners = setupEventListeners;
window.updateAllUI = updateAllUI;
window.updateAllDropdowns = updateAllDropdowns;
window.showPageLoading = showPageLoading;
window.generateId = generateId;
window.safeUpdateUI = safeUpdateUI;
window.showOptionsDialog = showOptionsDialog;