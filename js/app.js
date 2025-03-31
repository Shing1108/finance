// 應用核心邏輯和初始化

// 應用初始化
document.addEventListener('DOMContentLoaded', function () {
    try {
        console.log("應用程序初始化中...");

        // 嘗試從localStorage載入設置
        loadSettingsFromStorage();

        // 應用設置
        applySettings();

        // 載入數據
        loadDataFromStorage();

        // 設置事件監聽器
        setupEventListeners();

        // 預填充表單日期為今天
        setDefaultDates();

        // 加載匯率數據
        loadStoredExchangeRates();

        // 初始化UI更新
        initUiElements();
        updateAllUI();

        // 初始化Firebase (如果已啟用)
        if (enableFirebase) {
            initFirebase()
                .then(() => {
                    console.log("Firebase初始化成功");
                    updateSyncStatus();
                })
                .catch(error => {
                    console.error("Firebase初始化失敗:", error);
                    showToast('雲端同步設置失敗: ' + error.message, 'error');
                });
        } else {
            updateSyncStatus();
        }

        console.log("應用程序初始化完成");

        // 隱藏載入覆蓋層
        document.getElementById('loadingOverlay').style.display = 'none';

        // 設置定時器,每小時更新匯率
        setInterval(updateExchangeRates, 60 * 60 * 1000);

    } catch (error) {
        console.error("初始化時發生錯誤:", error);

        // 嘗試顯示一個友好的錯誤消息
        document.getElementById('loadingOverlay').innerHTML = `
            <div class="error-screen">
                <h2>初始化失敗</h2>
                <p>應用程序載入時發生錯誤。請重新載入頁面試試。</p>
                <p>錯誤詳情: ${error.message}</p>
                <button onclick="location.reload()" class="btn btn-primary">重新載入</button>
            </div>
        `;
    }
});

// 設置默認日期
function setDefaultDates() {
    console.log("設置默認日期");

    try {
        // 獲取今天的日期
        const today = new Date().toISOString().split('T')[0];

        // 設置收入和支出表單的日期
        const incomeDateInput = document.getElementById('incomeDate');
        const expenseDateInput = document.getElementById('expenseDate');

        if (incomeDateInput) {
            incomeDateInput.value = today;
        }

        if (expenseDateInput) {
            expenseDateInput.value = today;
        }

        // 設置交易過濾器的日期範圍
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');

        if (startDateInput && endDateInput) {
            // 設置開始日期為當月第一天
            const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
            startDateInput.value = firstDay;

            // 設置結束日期為今天
            endDateInput.value = today;
        }

        // 設置預算表單的默認日期
        const budgetStartDateInput = document.getElementById('budgetStartDate');
        const budgetEndDateInput = document.getElementById('budgetEndDate');

        if (budgetStartDateInput && budgetEndDateInput) {
            // 設置開始日期為今天
            budgetStartDateInput.value = today;

            // 設置結束日期為一個月後
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            budgetEndDateInput.value = nextMonth.toISOString().split('T')[0];
        }
    } catch (error) {
        console.error("設置默認日期時發生錯誤:", error);
        // 不拋出異常，因為這只是輔助設置
    }
}

// 應用設置
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
        document.body.className = `font-${fontSize}`;
    } catch (error) {
        console.error("應用設置時發生錯誤:", error);
        // 不拋出異常，因為這只是輔助設置
    }
}

// 加載設置到表單
function loadSettingsToForm() {
    console.log("加載設置到表單");

    try {
        // 深色模式
        document.getElementById('darkMode').checked = darkMode;

        // 字體大小
        const fontSizeRadios = document.querySelectorAll('input[name="fontSize"]');
        fontSizeRadios.forEach(radio => {
            if (radio.value === fontSize) {
                radio.checked = true;
            }
        });

        // 默認貨幣
        document.getElementById('defaultCurrency').value = defaultCurrency;

        // 小數點位數
        const decimalPlacesRadios = document.querySelectorAll('input[name="decimalPlaces"]');
        decimalPlacesRadios.forEach(radio => {
            if (radio.value === decimalPlaces.toString()) {
                radio.checked = true;
            }
        });

        // 啟用預算提醒
        document.getElementById('enableBudgetAlerts').checked = enableBudgetAlerts;

        // 提醒閾值
        document.getElementById('alertThreshold').value = alertThreshold;

        // 啟用雲端同步
        document.getElementById('enableFirebaseSync').checked = enableFirebase;
    } catch (error) {
        console.error("加載設置到表單時發生錯誤:", error);
        showToast('加載設置到表單失敗', 'error');
    }
}

// 保存設置
function saveSettings() {
    console.log("保存設置");

    try {
        // 深色模式
        darkMode = document.getElementById('darkMode').checked;

        // 字體大小
        fontSize = document.querySelector('input[name="fontSize"]:checked').value;

        // 默認貨幣
        defaultCurrency = document.getElementById('defaultCurrency').value;

        // 小數點位數
        decimalPlaces = parseInt(document.querySelector('input[name="decimalPlaces"]:checked').value);

        // 啟用預算提醒
        enableBudgetAlerts = document.getElementById('enableBudgetAlerts').checked;

        // 提醒閾值
        alertThreshold = parseInt(document.getElementById('alertThreshold').value);

        // 啟用雲端同步
        const newEnableFirebase = document.getElementById('enableFirebaseSync').checked;

        // 檢查是否變更了同步設置
        const syncChanged = enableFirebase !== newEnableFirebase;
        enableFirebase = newEnableFirebase;

        // 更新設置對象
        const settings = {
            darkMode,
            fontSize,
            defaultCurrency,
            decimalPlaces,
            enableBudgetAlerts,
            alertThreshold,
            enableFirebase
        };

        // 更新appState中的設置
        appState.settings = settings;

        // 保存到本地存儲
        localStorage.setItem('settings', JSON.stringify(settings));

        // 應用設置
        applySettings();

        // 關閉設置模態框
        closeCurrentModal();

        // 重新加載所有UI
        updateAllUI();

        // 如果變更了同步設置，則進行相應操作
        if (syncChanged) {
            if (enableFirebase) {
                // 啟用同步
                initFirebase()
                    .then(() => {
                        console.log("Firebase初始化成功");
                        updateSyncStatus();
                    })
                    .catch(error => {
                        console.error("Firebase初始化失敗:", error);
                        showToast('雲端同步設置失敗: ' + error.message, 'error');
                    });
            } else {
                // 禁用同步
                updateSyncStatus();
            }
        }

        // 顯示成功消息
        showToast('設置已保存', 'success');
    } catch (error) {
        console.error("保存設置時發生錯誤:", error);
        showToast('保存設置失敗: ' + error.message, 'error');
    }
}

// 檢查預算警告
function checkBudgetAlerts() {
    console.log("檢查預算警告");

    try {
        // 如果未啟用預算提醒，則跳過
        if (!enableBudgetAlerts) {
            return;
        }

        // 如果沒有設置預算，則跳過
        if (!appState.budgets.total || appState.budgets.total <= 0) {
            return;
        }

        // 確定預算週期
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

        // 計算使用率百分比
        const usageRate = (totalSpent / appState.budgets.total) * 100;

        // 如果超過閾值，顯示警告
        if (usageRate >= alertThreshold) {
            // 顯示預算警告
            showToast(`預算使用已達到 ${usageRate.toFixed(1)}%，請注意控制支出`, 'warning', 5000);
        }
    } catch (error) {
        console.error("檢查預算警告時發生錯誤:", error);
    }
}