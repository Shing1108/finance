// app.js - 應用核心邏輯和初始化

/**
 * 頁面載入完成後的安全機制
 */
window.addEventListener('load', function() {
    console.log("頁面完全載入");
    
    // 使用更可靠的載入檢測方法
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        // 嘗試立即隱藏
        hideLoadingOverlay(overlay);
        
        // 添加備份計時器在5秒後強制隱藏
        setTimeout(() => hideLoadingOverlay(overlay), 5000);
    }
});

/**
 * 隱藏載入覆蓋層
 * @param {HTMLElement} overlay 覆蓋層元素
 */
function hideLoadingOverlay(overlay) {
    if (overlay && overlay.style.display !== 'none') {
        console.log('關閉載入覆蓋層');
        
        // 淡出動畫
        overlay.style.opacity = '0';
        
        // 完全隱藏
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }
}

/**
 * 應用初始化 - 使用Promise鏈優化
 */
function initializeApp() {
    console.log("初始化應用程序...");
    
    // 顯示載入覆蓋層
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
        loadingOverlay.style.opacity = '1';
    }
    
    // 使用Promise鏈來組織初始化流程
    Promise.resolve()
        // 步驟1: 載入基本數據
        .then(() => {
            console.log("載入數據和設置日期...");
            loadDataFromStorage();
            setDefaultDates();
            applySettings();
            return true;
        })
        // 步驟2: 初始化基本UI
        .then(() => {
            console.log("初始化UI元素...");
            initUiElements();
            setupEventListeners();
            
            // 日期管理器初始化
            if (window.dayManager && typeof window.dayManager.initDayManager === 'function') {
                window.dayManager.initDayManager();
            }
            return true;
        })
        // 步驟3: 初始化進階功能
        .then(() => {
            console.log("初始化進階功能...");
            updateAllUI();
            
            // 非關鍵功能可以延遲初始化以提高初始載入速度
            setTimeout(() => {
                // 初始化匯率
                if (typeof initExchangeRates === 'function') {
                    initExchangeRates();
                }
                
                // 初始化儲蓄目標功能
                if (window.savingsGoals && typeof window.savingsGoals.initSavingsGoals === 'function') {
                    window.savingsGoals.initSavingsGoals();
                }

            }, 100);
            
            return true;
        })
        // 步驟4: 初始化Firebase (如果已啟用)
        .then(() => {
            if (enableFirebase && typeof initFirebase === 'function') {
                return initFirebase()
                    .then(() => {
                        console.log("Firebase初始化成功");
                        if (typeof updateSyncStatus === 'function') {
                            updateSyncStatus();
                        }
                        return true;
                    })
                    .catch(error => {
                        console.error("Firebase初始化失敗:", error);
                        showToast('雲端同步設置失敗', 'error');
                        return true; // 即使Firebase失敗也繼續
                    });
            }
            return true;
        })
        // 步驟5: 完成初始化
        .then(() => {
            console.log("應用程序初始化完成", new Date().toLocaleTimeString());
            
            // 隱藏載入覆蓋層
            if (loadingOverlay) {
                hideLoadingOverlay(loadingOverlay);
            }
        })
        .catch(error => {
            console.error("應用初始化失敗:", error);
            handleInitializationFailure(error);
        });
}

/**
 * 初始化UI元素
 */
function initUiElements() {
    console.log("初始化UI元素");
    try {
        // 確保類別標籤初始化
        if (typeof initializeCategoryTabs === 'function') {
            initializeCategoryTabs();
        }
        
        // 初始化圖標選擇器
        if (typeof populateIconGrid === 'function') {
            populateIconGrid();
        }
        
        // 初始化確認對話框
        if (!document.getElementById('confirmModal')) {
            createConfirmDialog();
        }
        
        // 初始化編輯交易模態框
        if (typeof createEditTransactionModal === 'function' && !document.getElementById('editTransactionModal')) {
            createEditTransactionModal();
        }
    } catch (error) {
        console.error("初始化UI元素時發生錯誤:", error);
    }
}

/**
 * 設置默認日期為今天
 */
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

/**
 * 應用設置到界面
 */
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

/**
 * 保存設置
 */
function saveSettings() {
    console.log("保存設置");
    try {
        // 獲取設置表單值
        const darkModeElement = document.getElementById('darkMode');
        // 字體大小可能是單選按鈕組或下拉菜單
        let newFontSize;
        const fontSizeRadio = document.querySelector('input[name="fontSize"]:checked');
        const fontSizeSelect = document.getElementById('fontSize');
        
        if (fontSizeRadio) {
            newFontSize = fontSizeRadio.value;
        } else if (fontSizeSelect) {
            newFontSize = fontSizeSelect.value;
        } else {
            // 使用當前值作為默認
            newFontSize = fontSize || 'medium';
        }
        
        const defaultCurrencyElement = document.getElementById('defaultCurrency');
        
        // 小數點位數可能是單選按鈕組或下拉菜單
        let newDecimalPlaces;
        const decimalPlacesRadio = document.querySelector('input[name="decimalPlaces"]:checked');
        const decimalPlacesSelect = document.getElementById('decimalPlaces');
        
        if (decimalPlacesRadio) {
            newDecimalPlaces = parseInt(decimalPlacesRadio.value);
        } else if (decimalPlacesSelect) {
            newDecimalPlaces = parseInt(decimalPlacesSelect.value);
        } else {
            // 使用當前值作為默認
            newDecimalPlaces = decimalPlaces || 2;
        }
        
        const enableBudgetAlertsElement = document.getElementById('enableBudgetAlerts');
        const alertThresholdElement = document.getElementById('alertThreshold');
        
        // 雲端同步選項可能有不同的ID
        let newEnableFirebase = enableFirebase; // 默認保持當前值
        // 嘗試所有可能的ID
        const firebaseOptions = [
            document.getElementById('enableFirebase'),
            document.getElementById('enableFirebaseSync'),
            document.querySelector('input[name="enableFirebase"]'),
            document.querySelector('input[name="enableFirebaseSync"]')
        ];
        
        // 使用找到的第一個有效元素
        for (const option of firebaseOptions) {
            if (option) {
                newEnableFirebase = option.checked;
                console.log("找到雲端同步選項:", option.id);
                break;
            }
        }

        // 更新全局變量
        if (darkModeElement) {
            darkMode = darkModeElement.checked;
        }
        fontSize = newFontSize;
        
        if (defaultCurrencyElement) {
            defaultCurrency = defaultCurrencyElement.value;
        }
        
        decimalPlaces = newDecimalPlaces;
        
        if (enableBudgetAlertsElement) {
            enableBudgetAlerts = enableBudgetAlertsElement.checked;
        }
        
        if (alertThresholdElement) {
            alertThreshold = parseInt(alertThresholdElement.value);
        }
        
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
        saveToLocalStorage();

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
                            if (typeof updateSyncUI === 'function') {
                                updateSyncUI();
                            }
                        })
                        .catch(error => {
                            console.error("Firebase初始化失敗:", error);
                            showToast('雲端同步設置失敗: ' + error.message, 'error');
                        });
                }
            } else {
                // 禁用Firebase
                showToast('雲端同步已禁用', 'info');
                if (typeof updateSyncUI === 'function') {
                    updateSyncUI();
                }
            }
        }

        // 關閉設置模態框
        if (typeof closeCurrentModal === 'function') {
            closeCurrentModal();
        }

        // 顯示成功消息
        showToast('設置已保存', 'success');
        return true;
    } catch (error) {
        console.error("保存設置時發生錯誤:", error);
        console.error("錯誤堆疊:", error.stack);
        showToast('保存設置失敗: ' + error.message, 'error');
        return false;
    }
}

/**
 * 載入設置到表單
 */
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

/**
 * 處理應用加載失敗
 */
function handleInitializationFailure(error) {
    console.error("應用初始化失敗:", error);
    
    // 隱藏載入覆蓋層
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
    
    // 顯示友好的錯誤信息
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.innerHTML = `
            <div class="error-screen">
                <h2>啟動失敗</h2>
                <p>應用程序載入時發生錯誤。</p>
                <p>錯誤信息: ${error.message}</p>
                <button onclick="location.reload()" class="btn btn-primary">重新載入應用</button>
            </div>
        `;
    }
    
    showToast('應用程序載入失敗，請嘗試重新載入頁面', 'error');
}

// DOM載入完成時初始化應用
document.addEventListener('DOMContentLoaded', function() {
    // 初始化應用
    initializeApp();
    
    // 添加超時保護
    setTimeout(() => {
        if (document.getElementById('loadingOverlay').style.display !== 'none') {
            console.warn('強制關閉載入覆蓋層');
            document.getElementById('loadingOverlay').style.display = 'none';
            showToast('載入時間過長，部分功能可能不可用', 'warning');
        }
    }, 8000);
});

// 導出函數
window.applySettings = applySettings;
window.saveSettings = saveSettings;
window.loadSettingsToForm = loadSettingsToForm;
window.handleInitializationFailure = handleInitializationFailure;
window.initializeApp = initializeApp;