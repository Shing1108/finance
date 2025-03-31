// app.js - 應用核心邏輯和初始化

// 不使用 let/var 宣告，直接設置 window 屬性
window.currentlyLoading = false;

// 頁面載入完成後的安全機制
window.addEventListener('load', function() {
    console.log("頁面完全載入");
    setTimeout(function() {
        var overlay = document.getElementById('loadingOverlay');
        if (overlay && overlay.style.display !== 'none') {
            console.log('強制關閉載入覆蓋層');
            overlay.style.display = 'none';
        }
    }, 5000); // 5秒後強制關閉
});

// 應用初始化
document.addEventListener('DOMContentLoaded', function() {
    try {
        console.log("應用程序初始化中...");
        
        // 嘗試從localStorage載入設置
        loadSettingsFromStorage();
        
        // 應用設置
        applySettings();
        
        // 載入數據
        loadDataFromStorage();
        
        // 設置預設日期
        setDefaultDates();
        
        // 加載匯率數據
        loadStoredExchangeRates();
        
        // 初始化UI元素
        initUiElements();
        
        // 設置事件監聽器
        setupEventListeners();
        
        // 更新所有UI
        updateAllUI();
        
        // 初始化Firebase (如果已啟用)
        if (typeof enableFirebase !== 'undefined' && enableFirebase) {
            if (typeof initFirebase === 'function') {
                initFirebase()
                    .then(() => {
                        console.log("Firebase初始化成功");
                        if (typeof updateSyncStatus === 'function') {
                            updateSyncStatus();
                        }
                    })
                    .catch(error => {
                        console.error("Firebase初始化失敗:", error);
                        showToast('雲端同步設置失敗: ' + error.message, 'error');
                    });
            } else {
                console.warn("initFirebase 函數未定義");
            }
        } else {
            if (typeof updateSyncStatus === 'function') {
                updateSyncStatus();
            }
        }
        
        console.log("應用程序初始化完成");
        
        // 隱藏載入覆蓋層
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
        
        // 設置定時器，每小時更新匯率
        if (typeof updateExchangeRates === 'function') {
            setInterval(updateExchangeRates, 60 * 60 * 1000);
        }
        
    } catch (error) {
        console.error("初始化時發生錯誤:", error);
        
        // 嘗試顯示一個友好的錯誤消息
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.innerHTML = `
                <div class="error-screen">
                    <h2>初始化失敗</h2>
                    <p>應用程序載入時發生錯誤。請重新載入頁面試試。</p>
                    <p>錯誤詳情: ${error.message}</p>
                    <button onclick="location.reload()" class="btn btn-primary">重新載入</button>
                </div>
            `;
        }
    }
});



// 初始化UI元素
function initUiElements() {
    console.log("初始化UI元素");
    try {
        // 確保類別標籤初始化
        if (typeof initializeCategoryTabs === 'function') {
            initializeCategoryTabs();
        }
        
        // 初始化貨幣管理模態框(如果尚未存在)
        if (typeof createCurrencyManagementModal === 'function' && !document.getElementById('currencyManagementModal')) {
            createCurrencyManagementModal();
        }
    } catch (error) {
        console.error("初始化UI元素時發生錯誤:", error);
    }
}

// 設置默認日期為今天
function setDefaultDates() {
    console.log("設置預設日期");
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const dateInputs = document.querySelectorAll('input[type="date"]');
        dateInputs.forEach(input => {
            if (!input.value) {
                input.value = today;
            }
        });
        
        // 特殊處理起始和結束日期輸入框
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        if (startDateInput && !startDateInput.value) {
            // 設置為本月第一天
            const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            startDateInput.value = firstDay.toISOString().split('T')[0];
        }
        
        if (endDateInput && !endDateInput.value) {
            endDateInput.value = today;
        }
    } catch (error) {
        console.error("設置默認日期時發生錯誤:", error);
    }
}

// 應用設置到界面
function applySettings() {
    console.log("應用設置");
    try {
        // 應用深色模式
        if (darkMode) {
            document.body.setAttribute('data-theme', 'dark');
        } else {
            document.body.removeAttribute('data-theme');
        }

        // 應用字體大小
        document.body.classList.remove('font-small', 'font-medium', 'font-large');
        document.body.classList.add('font-' + fontSize);

        // 更新UI上的設置顯示(如果有相關UI元素)
        const darkModeToggle = document.getElementById('darkMode');
        if (darkModeToggle) {
            darkModeToggle.checked = darkMode;
        }

        const fontSizeSelect = document.getElementById('fontSize');
        if (fontSizeSelect) {
            fontSizeSelect.value = fontSize;
        }

        const defaultCurrencySelect = document.getElementById('defaultCurrency');
        if (defaultCurrencySelect) {
            defaultCurrencySelect.value = defaultCurrency;
        }

        const decimalPlacesSelect = document.getElementById('decimalPlaces');
        if (decimalPlacesSelect) {
            decimalPlacesSelect.value = decimalPlaces;
        }

        const enableBudgetAlertsCheckbox = document.getElementById('enableBudgetAlerts');
        if (enableBudgetAlertsCheckbox) {
            enableBudgetAlertsCheckbox.checked = enableBudgetAlerts;
        }

        const alertThresholdInput = document.getElementById('alertThreshold');
        if (alertThresholdInput) {
            alertThresholdInput.value = alertThreshold;
        }

        const enableFirebaseCheckbox = document.getElementById('enableFirebase');
        if (enableFirebaseCheckbox) {
            enableFirebaseCheckbox.checked = enableFirebase;
        }

        console.log("設置已應用");
    } catch (error) {
        console.error("應用設置時發生錯誤:", error);
    }
}

// 保存設置
function saveSettings() {
    console.log("保存設置");
    try {
        // 獲取設置表單值
        const darkModeElement = document.getElementById('darkMode');
        const fontSizeElement = document.querySelector('input[name="fontSize"]:checked');
        const defaultCurrencyElement = document.getElementById('defaultCurrency');
        const decimalPlacesElement = document.querySelector('input[name="decimalPlaces"]:checked');
        const enableBudgetAlertsElement = document.getElementById('enableBudgetAlerts');
        const alertThresholdElement = document.getElementById('alertThreshold');
        const enableFirebaseElement = document.getElementById('enableFirebase');

        // 檢查元素是否存在
        if (!darkModeElement) {
            console.error("找不到深色模式元素");
            showToast('保存設置失敗: 找不到深色模式選項', 'error');
            return;
        }

        if (!fontSizeElement) {
            console.error("找不到字體大小元素");
            showToast('保存設置失敗: 找不到字體大小選項', 'error');
            return;
        }

        if (!defaultCurrencyElement) {
            console.error("找不到默認貨幣元素");
            showToast('保存設置失敗: 找不到默認貨幣選項', 'error');
            return;
        }

        if (!decimalPlacesElement) {
            console.error("找不到小數點位數元素");
            showToast('保存設置失敗: 找不到小數點位數選項', 'error');
            return;
        }

        if (!enableBudgetAlertsElement) {
            console.error("找不到預算提醒元素");
            showToast('保存設置失敗: 找不到預算提醒選項', 'error');
            return;
        }

        if (!alertThresholdElement) {
            console.error("找不到提醒閾值元素");
            showToast('保存設置失敗: 找不到提醒閾值選項', 'error');
            return;
        }

        if (!enableFirebaseElement) {
            console.error("找不到雲端同步元素");
            showToast('保存設置失敗: 找不到雲端同步選項', 'error');
            return;
        }

        // 獲取值
        const newDarkMode = darkModeElement.checked;
        const newFontSize = fontSizeElement.value;
        const newDefaultCurrency = defaultCurrencyElement.value;
        const newDecimalPlaces = parseInt(decimalPlacesElement.value);
        const newEnableBudgetAlerts = enableBudgetAlertsElement.checked;
        const newAlertThreshold = parseInt(alertThresholdElement.value);
        const newEnableFirebase = enableFirebaseElement.checked;

        // 更新全局變量
        darkMode = newDarkMode;
        fontSize = newFontSize;
        defaultCurrency = newDefaultCurrency;
        decimalPlaces = newDecimalPlaces;
        enableBudgetAlerts = newEnableBudgetAlerts;
        alertThreshold = newAlertThreshold;
        
        // 檢查Firebase是否發生變化
        const firebaseChanged = enableFirebase !== newEnableFirebase;
        enableFirebase = newEnableFirebase;

        // 更新appState
        appState.settings = {
            darkMode: darkMode,
            fontSize: fontSize,
            defaultCurrency: defaultCurrency,
            decimalPlaces: decimalPlaces,
            enableBudgetAlerts: enableBudgetAlerts,
            alertThreshold: alertThreshold,
            enableFirebase: enableFirebase
        };

        // 保存到localStorage
        localStorage.setItem('settings', JSON.stringify(appState.settings));

        // 應用新設置
        applySettings();

        // 如果Firebase設置發生變化
        if (firebaseChanged) {
            if (enableFirebase) {
                // 啟用Firebase
                if (typeof initFirebase === 'function') {
                    initFirebase()
                        .then(() => {
                            showToast('雲端同步已啟用', 'success');
                            updateSyncUI();
                        })
                        .catch(error => {
                            console.error("Firebase初始化失敗:", error);
                            showToast('雲端同步設置失敗: ' + error.message, 'error');
                        });
                }
            } else {
                // 禁用Firebase
                showToast('雲端同步已禁用', 'info');
                updateSyncUI();
            }
        }

        // 關閉設置模態框
        closeCurrentModal();

        // 顯示成功消息
        showToast('設置已保存', 'success');
    } catch (error) {
        console.error("保存設置時發生錯誤:", error);
        console.error("錯誤堆疊:", error.stack);
        showToast('保存設置失敗: ' + error.message, 'error');
    }
}
// 載入設置到表單
function loadSettingsToForm() {
    console.log("載入設置到表單");
    try {
        const darkModeToggle = document.getElementById('darkMode');
        if (darkModeToggle) {
            darkModeToggle.checked = darkMode;
        }

        const fontSizeSelect = document.getElementById('fontSize');
        if (fontSizeSelect) {
            fontSizeSelect.value = fontSize;
        }

        const defaultCurrencySelect = document.getElementById('defaultCurrency');
        if (defaultCurrencySelect) {
            defaultCurrencySelect.value = defaultCurrency;
        }

        const decimalPlacesSelect = document.getElementById('decimalPlaces');
        if (decimalPlacesSelect) {
            decimalPlacesSelect.value = decimalPlaces;
        }

        const enableBudgetAlertsCheckbox = document.getElementById('enableBudgetAlerts');
        if (enableBudgetAlertsCheckbox) {
            enableBudgetAlertsCheckbox.checked = enableBudgetAlerts;
        }

        const alertThresholdInput = document.getElementById('alertThreshold');
        if (alertThresholdInput) {
            alertThresholdInput.value = alertThreshold;
        }

        const enableFirebaseCheckbox = document.getElementById('enableFirebase');
        if (enableFirebaseCheckbox) {
            enableFirebaseCheckbox.checked = enableFirebase;
        }
    } catch (error) {
        console.error("載入設置到表單時發生錯誤:", error);
    }
}

// 設置事件監聽器
function setupEventListeners() {
    console.log("設置事件監聽器...");
    
    try {
        // 側邊欄導航事件
        const navLinks = document.querySelectorAll('.nav-links li');
        if (navLinks && navLinks.length > 0) {
            navLinks.forEach(item => {
                item.addEventListener('click', function() {
                    const tabId = this.getAttribute('data-tab');
                    if (typeof showTabContent === 'function') {
                        showTabContent(tabId);
                    } else {
                        console.error("showTabContent 函數未定義");
                    }
                });
            });
        }
        
        // 獲取各個按鈕和元素
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
        
        console.log("事件監聽器設置完成");
    } catch (error) {
        console.error("設置事件監聽器時發生錯誤:", error);
    }
}

// 綁定所有按鈕
function bindButtons() {
    // 獲取並綁定各個按鈕
    bindButton('addAccountButton', function() {
        if (typeof openModal === 'function') {
            openModal('addAccountModal');
        }
    });
    
    bindButton('saveAccountButton', function() {
        if (typeof saveAccount === 'function') {
            saveAccount();
        }
    });
    
    bindButton('addIncomeCategoryButton', function() {
        const categoryType = document.getElementById('categoryType');
        if (categoryType) categoryType.value = 'income';
        if (typeof openModal === 'function') {
            openModal('addCategoryModal');
        }
    });
    
    bindButton('addExpenseCategoryButton', function() {
        const categoryType = document.getElementById('categoryType');
        if (categoryType) categoryType.value = 'expense';
        if (typeof openModal === 'function') {
            openModal('addCategoryModal');
        }
    });
    
    bindButton('saveCategoryButton', function() {
        if (typeof saveCategory === 'function') {
            saveCategory();
        }
    });
    
    bindButton('saveIncomeButton', function() {
        if (typeof saveTransaction === 'function') {
            saveTransaction('income');
        }
    });
    
    bindButton('saveExpenseButton', function() {
        if (typeof saveTransaction === 'function') {
            saveTransaction('expense');
        }
    });
    
    bindButton('confirmTransferButton', function() {
        if (typeof processTransfer === 'function') {
            processTransfer();
        }
    });
    
    bindButton('settingsButton', function() {
        if (typeof loadSettingsToForm === 'function') {
            loadSettingsToForm();
        }
        if (typeof openModal === 'function') {
            openModal('settingsModal');
        }
    });
    
    bindButton('saveSettingsButton', function() {
        if (typeof saveSettings === 'function') {
            saveSettings();
        }
    });
    
    bindButton('clearDataButton', function() {
        const message = '確定要清除所有數據嗎?此操作無法復原。';
        if (typeof showConfirmDialog === 'function' && typeof clearAllData === 'function') {
            showConfirmDialog(message, clearAllData);
        }
    });
    
    bindButton('saveBudgetSettingsButton', function() {
        if (typeof createNewBudget === 'function') {
            createNewBudget();
        }
    });
    
    bindButton('addCategoryBudgetButton', function() {
        if (typeof addCategoryBudget === 'function') {
            addCategoryBudget();
        }
    });
    
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
    
    bindButton('searchTransactionsButton', function() {
        if (typeof filterTransactions === 'function') {
            filterTransactions();
        }
    });
    
    bindButton('exportDataButton', function() {
        if (typeof exportData === 'function') {
            exportData();
        }
    });
    
    bindButton('importDataButton', function() {
        if (typeof importDataFromText === 'function') {
            importDataFromText();
        }
    });
    
    // 文件導入
    const fileImport = document.getElementById('fileImport');
    if (fileImport) {
        fileImport.addEventListener('change', function() {
            if (typeof importDataFromFile === 'function') {
                importDataFromFile();
            }
        });
    }
    
    bindButton('loginButton', function() {
        if (typeof handleLogin === 'function') {
            handleLogin();
        }
    });
    
    bindButton('logoutButton', function() {
        if (typeof handleLogout === 'function') {
            handleLogout();
        }
    });
    
    bindButton('syncNowButton', function() {
        if (typeof syncNow === 'function') {
            syncNow();
        }
    });
    
    bindButton('manageCurrencyButton', function() {
        if (typeof openCurrencyManagementModal === 'function') {
            openCurrencyManagementModal();
        }
    });
    
    bindButton('mobileSettingsButton', function() {
        if (typeof loadSettingsToForm === 'function') {
            loadSettingsToForm();
        }
        if (typeof openModal === 'function') {
            openModal('settingsModal');
        }
    });
    
    // 所有模態框的關閉按鈕
    const closeButtons = document.querySelectorAll('.close-button, .modal-cancel');
    if (closeButtons.length > 0) {
        closeButtons.forEach(button => {
            button.addEventListener('click', function() {
                if (typeof closeCurrentModal === 'function') {
                    closeCurrentModal();
                }
            });
        });
    }
}

// 綁定單個按鈕
function bindButton(id, callback) {
    const button = document.getElementById(id);
    if (button) {
        button.addEventListener('click', callback);
    }
}

// 設置收入/支出標簽切換
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

// 設置視圖切換
function setupViewSwitching() {
    // 賬戶視圖切換
    setupViewToggle('accountCardView', 'accountListView', 'accountsList', 'accounts-list', updateAccountsUI);
    
    // 收入類別視圖切換
    setupViewToggle('incomeCategoryCardView', 'incomeCategoryListView', 'incomeCategoriesList', 'categories-list', updateCategoriesUI);
    
    // 支出類別視圖切換
    setupViewToggle('expenseCategoryCardView', 'expenseCategoryListView', 'expenseCategoriesList', 'categories-list', updateCategoriesUI);
}

// 設置視圖切換
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

// 設置自動計算預算
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

// 設置重設週期變更事件
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

// 顯示確認對話框
function showConfirmDialog(message, confirmCallback) {
    console.log("顯示確認對話框");
    try {
        // 檢查是否已存在確認對話框
        let confirmDialog = document.getElementById('confirmDialog');
        
        if (!confirmDialog) {
            // 創建確認對話框
            confirmDialog = document.createElement('div');
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

// 顯示提示消息
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
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${getToastIcon(type)}"></i>
            </div>
            <div class="toast-message">${message}</div>
            <button class="toast-close">×</button>
        `;
        
        // 添加關閉按鈕事件
        const closeButton = toast.querySelector('.toast-close');
        if (closeButton) {
            closeButton.addEventListener('click', function() {
                toastContainer.removeChild(toast);
            });
        }
        
        // 添加到容器
        toastContainer.appendChild(toast);
        
        // 自動關閉
        setTimeout(function() {
            if (toast.parentNode === toastContainer) {
                toastContainer.removeChild(toast);
            }
        }, 5000);
    } catch (error) {
        console.error("顯示提示消息時發生錯誤:", error);
        // 降級方案：使用alert
        alert(`${type.toUpperCase()}: ${message}`);
    }
}

// 獲取toast圖標
function getToastIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'warning': return 'fa-exclamation-triangle';
        case 'error': return 'fa-times-circle';
        case 'info':
        default: return 'fa-info-circle';
    }
}

// 生成唯一ID
function generateId() {
    return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

// 格式化貨幣
function formatCurrency(amount, currency) {
    if (typeof amount !== 'number') {
        amount = parseFloat(amount) || 0;
    }
    
    try {
        currency = currency || defaultCurrency || 'HKD';
        const places = typeof decimalPlaces !== 'undefined' ? decimalPlaces : 2;
        
        let symbol = '$';
        
        switch (currency) {
            case 'USD': symbol = '$'; break;
            case 'HKD': symbol = 'HK$'; break;
            case 'CNY': symbol = '¥'; break;
            case 'EUR': symbol = '€'; break;
            case 'GBP': symbol = '£'; break;
            case 'JPY': symbol = '¥'; break;
            default: symbol = currency + ' ';
        }
        
        return symbol + amount.toFixed(places).replace(/\d(?=(\d{3})+\.)/g, '$&,');
    } catch (error) {
        console.error("格式化貨幣時發生錯誤:", error);
        return amount.toFixed(2);
    }
}

// 以數字格式顯示金額
function formatNumber(amount) {
    if (typeof amount !== 'number') {
        amount = parseFloat(amount) || 0;
    }
    
    try {
        const places = typeof decimalPlaces !== 'undefined' ? decimalPlaces : 2;
        return amount.toFixed(places).replace(/\d(?=(\d{3})+\.)/g, '$&,');
    } catch (error) {
        console.error("格式化數字時發生錯誤:", error);
        return amount.toFixed(2);
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

