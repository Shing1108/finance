// ui-budget.js - 預算UI相關

/**
 * 初始化預算標籤頁結構
 */
function initializeBudgetsTab(budgetsTab) {
    console.log("初始化預算標籤頁結構");
    
    // 清空標籤頁
    budgetsTab.innerHTML = '';
    
    // 添加標題
    const header = document.createElement('h2');
    header.textContent = '預算管理';
    budgetsTab.appendChild(header);
    
    // 添加容器
    const container = document.createElement('div');
    container.className = 'budget-container';
    budgetsTab.appendChild(container);
    
    // 1. 預算設置卡片
    const settingsCard = document.createElement('div');
    settingsCard.className = 'card';
    settingsCard.innerHTML = `
        <div class="card-header">
            <h3>預算設置</h3>
        </div>
        <div class="budget-form">
            <form id="budgetSettingsForm">
                <div class="form-row">
                    <div class="form-group">
                        <label for="totalBudget">總預算</label>
                        <input type="number" id="totalBudget" class="form-control" min="0" step="0.01" placeholder="您的總預算" value="${appState.budgets.total || 0}">
                    </div>
                    <div class="form-group">
                        <div class="checkbox-group">
                            <input type="checkbox" id="autoCalculateBudget" class="form-checkbox" ${appState.budgets.autoCalculate ? 'checked' : ''}>
                            <label for="autoCalculateBudget">自動計算總預算 (根據類別預算總和)</label>
                        </div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>重置週期</label>
                    <div class="radio-group">
                        <div class="radio-item">
                            <input type="radio" id="cycleDaily" name="resetCycle" value="daily" ${(appState.budgets.resetCycle || 'monthly') === 'daily' ? 'checked' : ''}>
                            <label for="cycleDaily">每日</label>
                        </div>
                        <div class="radio-item">
                            <input type="radio" id="cycleWeekly" name="resetCycle" value="weekly" ${(appState.budgets.resetCycle || 'monthly') === 'weekly' ? 'checked' : ''}>
                            <label for="cycleWeekly">每週</label>
                        </div>
                        <div class="radio-item">
                            <input type="radio" id="cycleMonthly" name="resetCycle" value="monthly" ${(appState.budgets.resetCycle || 'monthly') === 'monthly' ? 'checked' : ''}>
                            <label for="cycleMonthly">每月</label>
                        </div>
                    </div>
                </div>
                
                <div class="form-group" ${(appState.budgets.resetCycle || 'monthly') === 'monthly' ? '' : 'style="display:none"'}>
                    <label for="monthlyResetDay">每月重置日期</label>
                    <input type="number" id="monthlyResetDay" class="form-control" min="1" max="28" value="${appState.budgets.resetDay || 1}" placeholder="1-28日">
                    <small>為避免問題，請選擇1至28之間的日期</small>
                </div>
                
                <button type="button" id="saveBudgetSettingsButton" class="btn btn-primary">保存設置</button>
            </form>
        </div>
    `;
    container.appendChild(settingsCard);
    
    // 2. 預算進度卡片
    const progressCard = document.createElement('div');
    progressCard.className = 'card';
    progressCard.innerHTML = `
        <div class="card-header">
            <h3>預算進度</h3>
        </div>
        <div id="budgetProgress" class="budget-status">
            <!-- 預算進度內容將透過 JavaScript 生成 -->
        </div>
    `;
    container.appendChild(progressCard);
    
    // 3. 類別預算卡片
    const categoryBudgetCard = document.createElement('div');
    categoryBudgetCard.className = 'card';
    categoryBudgetCard.innerHTML = `
        <div class="card-header">
            <h3>類別預算</h3>
        </div>
        <div class="category-budget-form">
            <form id="categoryBudgetForm">
                <div class="form-row">
                    <div class="form-group">
                        <label for="categoryBudgetSelect">選擇類別</label>
                        <select id="categoryBudgetSelect" class="form-control" required>
                            <option value="" disabled selected>選擇類別</option>
                            <!-- 類別選項將透過 JavaScript 生成 -->
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="categoryBudgetAmount">預算金額</label>
                        <input type="number" id="categoryBudgetAmount" class="form-control" min="0" step="0.01" placeholder="輸入預算金額" required>
                    </div>
                    <div class="form-group">
                        <label>&nbsp;</label>
                        <button type="button" id="addCategoryBudgetButton" class="btn btn-primary">新增</button>
                    </div>
                </div>
            </form>
        </div>
        <div id="categoryBudgetsList" class="category-budgets-list">
            <!-- 類別預算列表將透過 JavaScript 生成 -->
        </div>
    `;
    container.appendChild(categoryBudgetCard);
    
    // 綁定事件
    document.getElementById('saveBudgetSettingsButton').addEventListener('click', createNewBudget);
    document.getElementById('addCategoryBudgetButton').addEventListener('click', addCategoryBudget);
    
    const autoCalculateCheckbox = document.getElementById('autoCalculateBudget');
    if (autoCalculateCheckbox) {
        autoCalculateCheckbox.addEventListener('change', function() {
            const totalBudgetInput = document.getElementById('totalBudget');
            if (this.checked) {
                totalBudgetInput.disabled = true;
                totalBudgetInput.value = calculateTotalCategoryBudget();
            } else {
                totalBudgetInput.disabled = false;
            }
        });
        
        // 初始狀態
        if (autoCalculateCheckbox.checked) {
            const totalBudgetInput = document.getElementById('totalBudget');
            if (totalBudgetInput) {
                totalBudgetInput.disabled = true;
            }
        }
    }
    
    // 重置週期變更事件
    const resetCycleInputs = document.querySelectorAll('input[name="resetCycle"]');
    resetCycleInputs.forEach(input => {
        input.addEventListener('change', function() {
            const monthlyResetDayContainer = document.getElementById('monthlyResetDay').parentElement;
            if (this.value === 'monthly') {
                monthlyResetDayContainer.style.display = 'block';
            } else {
                monthlyResetDayContainer.style.display = 'none';
            }
        });
    });
    
    // 更新類別預算下拉選單
    updateCategoryBudgetSelect();
    
    console.log("預算標籤頁結構初始化完成");
}

/**
 * 更新預算管理UI
 */
function updateBudgetsUI() {
    console.log("更新預算管理UI");
    
    try {
        // 檢查預算管理標籤頁是否存在
        const budgetsTab = document.getElementById('budgets');
        if (!budgetsTab) {
            console.error("找不到預算管理標籤頁");
            return;
        }
        
        // 檢查預算標籤頁是否已初始化
        if (!budgetsTab.querySelector('.budget-container')) {
            // 初始化預算標籤頁結構
            initializeBudgetsTab(budgetsTab);
        }
        
        // 更新預算設置
        updateBudgetSettings();
        
        // 更新類別預算
        updateCategoryBudgets();
        
        // 更新預算進度
        updateBudgetProgress();
        
    } catch (error) {
        console.error("更新預算管理UI時發生錯誤:", error);
        showToast('更新預算管理UI失敗: ' + error.message, 'error');
    }
}

/**
 * 更新預算設置
 */
function updateBudgetSettings() {
    console.log("更新預算設置");
    
    try {
        // 檢查預算設置表單是否存在
        const budgetSettingsForm = document.getElementById('budgetSettingsForm');
        if (!budgetSettingsForm) {
            console.warn("找不到預算設置表單，預算設置部分可能不會顯示");
            return;
        }
        
        // 更新總預算輸入框
        const totalBudgetInput = document.getElementById('totalBudget');
        if (totalBudgetInput) {
            totalBudgetInput.value = appState.budgets.total || 0;
            
            // 如果啟用自動計算，則禁用輸入框
            if (appState.budgets.autoCalculate) {
                totalBudgetInput.disabled = true;
            } else {
                totalBudgetInput.disabled = false;
            }
        }
        
        // 更新自動計算復選框
        const autoCalculateCheckbox = document.getElementById('autoCalculateBudget');
        if (autoCalculateCheckbox) {
            autoCalculateCheckbox.checked = appState.budgets.autoCalculate || false;
        }
        
        // 更新重設週期單選按鈕
        const resetCycleRadios = document.querySelectorAll('input[name="resetCycle"]');
        if (resetCycleRadios.length > 0) {
            resetCycleRadios.forEach(radio => {
                if (radio.value === (appState.budgets.resetCycle || 'monthly')) {
                    radio.checked = true;
                }
            });
        }
        
        // 更新每月重設日期
        const resetDayInput = document.getElementById('monthlyResetDay');
        if (resetDayInput) {
            resetDayInput.value = appState.budgets.resetDay || 1;
            
            // 根據重設週期顯示或隱藏重設日期輸入框
            const resetDayContainer = resetDayInput.parentElement;
            if (resetDayContainer) {
                if ((appState.budgets.resetCycle || 'monthly') === 'monthly') {
                    resetDayContainer.style.display = 'block';
                } else {
                    resetDayContainer.style.display = 'none';
                }
            }
        }
    } catch (error) {
        console.error("更新預算設置時發生錯誤:", error);
    }
}

/**
 * 更新預算進度
 */
function updateBudgetProgress() {
    console.log("更新預算進度");
    
    try {
        // 檢查預算進度容器是否存在
        const budgetProgressContainer = document.getElementById('budgetProgress');
        if (!budgetProgressContainer) {
            console.warn("找不到預算進度容器");
            return;
        }
        
        // 檢查是否有預算
        if (!appState.budgets.total || appState.budgets.total <= 0) {
            budgetProgressContainer.innerHTML = `
                <p class="empty-message">尚未設定預算</p>
            `;
            return;
        }
        
        // 計算總預算和已使用
        const totalBudget = appState.budgets.total || 0;
        const totalSpent = calculateTotalSpent();
        
        // 計算百分比
        const percentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
        
        // 根據百分比確定顏色
        let progressColor = 'var(--primary-color)';
        
        if (percentage > 90) {
            progressColor = 'var(--danger-color)';
        } else if (percentage > 70) {
            progressColor = 'var(--warning-color)';
        }
        
        // 更新UI
        budgetProgressContainer.innerHTML = `
            <div class="budget-header">
                <h4>總預算</h4>
                <span class="budget-amount">${formatCurrency(totalBudget)}</span>
            </div>
            <div class="budget-progress-container">
                <div class="budget-progress-bar" style="width: ${Math.min(100, percentage)}%; background-color: ${progressColor}"></div>
            </div>
            <div class="budget-info">
                <span>已使用 ${formatCurrency(totalSpent)} (${percentage.toFixed(1)}%)</span>
                <span>剩餘 ${formatCurrency(Math.max(0, totalBudget - totalSpent))}</span>
            </div>
        `;
    } catch (error) {
        console.error("更新預算進度時發生錯誤:", error);
        
        // 顯示錯誤消息
        const budgetProgressContainer = document.getElementById('budgetProgress');
        if (budgetProgressContainer) {
            budgetProgressContainer.innerHTML = '<p class="error-message">載入預算進度時出錯</p>';
        }
    }
}

/**
 * 更新類別預算
 */
function updateCategoryBudgets() {
    console.log("更新類別預算");
    
    try {
        // 檢查類別預算列表是否存在
        const categoryBudgetsList = document.getElementById('categoryBudgetsList');
        if (!categoryBudgetsList) {
            console.warn("找不到類別預算列表");
            return;
        }
        
        // 檢查類別預算是否已初始化
        if (!appState.budgets.categories) {
            appState.budgets.categories = [];
        }
        
        // 排序類別預算(按照類別名稱)
        const sortedCategoryBudgets = [...appState.budgets.categories].sort((a, b) => {
            const categoryA = appState.categories.expense.find(c => c.id === a.categoryId);
            const categoryB = appState.categories.expense.find(c => c.id === b.categoryId);
            
            if (!categoryA || !categoryB) return 0;
            return categoryA.name.localeCompare(categoryB.name);
        });
        
        // 生成HTML
        if (sortedCategoryBudgets.length === 0) {
            categoryBudgetsList.innerHTML = '<p class="empty-message">尚未設置類別預算</p>';
            return;
        }
        
        let html = '';
        
        sortedCategoryBudgets.forEach(budget => {
            // 找到類別
            const category = appState.categories.expense.find(c => c.id === budget.categoryId);
            if (!category) return;
            
            // 計算類別支出
            const categorySpent = calculateCategorySpent(budget.categoryId);
            
            // 計算百分比
            const percentage = budget.amount > 0 ? (categorySpent / budget.amount) * 100 : 0;
            
            // 根據百分比確定顏色
            let progressColor = 'var(--primary-color)';
            
            if (percentage > 90) {
                progressColor = 'var(--danger-color)';
            } else if (percentage > 70) {
                progressColor = 'var(--warning-color)';
            }
            
            html += `
                <div class="budget-item" data-id="${budget.categoryId}">
                    <div class="budget-category">
                        <div class="budget-category-icon" style="color: ${category.color || '#666'}">
                            <i class="${category.icon || 'fas fa-tag'}"></i>
                        </div>
                        <div class="budget-category-name">${category.name}</div>
                    </div>
                    <div class="budget-amount">${formatCurrency(budget.amount)}</div>
                    <div class="budget-progress-container">
                        <div class="budget-progress-bar" style="width: ${Math.min(100, percentage)}%; background-color: ${progressColor}"></div>
                    </div>
                    <div class="budget-info">
                        <span>已使用 ${formatCurrency(categorySpent)} (${percentage.toFixed(1)}%)</span>
                        <span>剩餘 ${formatCurrency(Math.max(0, budget.amount - categorySpent))}</span>
                    </div>
                </div>
            `;
        });
        
        categoryBudgetsList.innerHTML = html;
    } catch (error) {
        console.error("更新類別預算時發生錯誤:", error);
        
        // 顯示錯誤消息
        const categoryBudgetsList = document.getElementById('categoryBudgetsList');
        if (categoryBudgetsList) {
            categoryBudgetsList.innerHTML = '<p class="error-message">載入類別預算時出錯</p>';
        }
    }
}

/**
 * 計算類別支出
 * @param {string} categoryId 類別ID
 * @returns {number} 類別支出金額
 */
function calculateCategorySpent(categoryId) {
    try {
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
        
        // 找出週期內該類別的支出交易
        const categoryTransactions = appState.transactions.filter(t =>
            t.type === 'expense' &&
            t.categoryId === categoryId &&
            t.date >= startDateFormatted &&
            t.date <= todayFormatted
        );
        
        // 計算總支出
        let totalSpent = 0;
        
        categoryTransactions.forEach(transaction => {
            const account = appState.accounts.find(a => a.id === transaction.accountId);
            
            if (!account) return;
            
            let amount = transaction.amount || 0;
            
            // 貨幣轉換
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
        
        return totalSpent;
    } catch (error) {
        console.error("計算類別支出時發生錯誤:", error);
        return 0;
    }
}

/**
 * 計算總支出
 * @returns {number} 總支出金額
 */
function calculateTotalSpent() {
    try {
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
        
        // 找出週期內的支出交易
        const periodTransactions = appState.transactions.filter(t =>
            t.type === 'expense' &&
            t.categoryId !== 'transfer_out' && // 排除轉賬
            t.date >= startDateFormatted &&
            t.date <= todayFormatted
        );
        
        // 計算總支出
        let totalSpent = 0;
        
        periodTransactions.forEach(transaction => {
            const account = appState.accounts.find(a => a.id === transaction.accountId);
            
            if (!account) return;
            
            let amount = transaction.amount || 0;
            
            // 貨幣轉換
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
        
        return totalSpent;
    } catch (error) {
        console.error("計算總支出時發生錯誤:", error);
        return 0;
    }
}

/**
 * 計算類別預算總和
 * @returns {number} 類別預算總和
 */
function calculateTotalCategoryBudget() {
    try {
        if (!appState.budgets.categories || appState.budgets.categories.length === 0) {
            return 0;
        }
        
        // 計算所有類別預算的總和
        return appState.budgets.categories.reduce((total, category) => total + (category.amount || 0), 0);
    } catch (error) {
        console.error("計算類別預算總和時發生錯誤:", error);
        return 0;
    }
}

/**
 * 新增類別預算
 */
function addCategoryBudget() {
    console.log("新增類別預算");
    
    try {
        const categoryId = document.getElementById('categoryBudgetSelect').value;
        const amount = parseFloat(document.getElementById('categoryBudgetAmount').value);
        
        // 驗證
        if (!categoryId) {
            showToast('請選擇類別', 'error');
            return;
        }
        
        if (!amount || amount <= 0) {
            showToast('請輸入有效金額', 'error');
            return;
        }
        
        // 檢查是否已存在此類別的預算
        if (appState.budgets.categories && appState.budgets.categories.some(b => b.categoryId === categoryId)) {
            showToast('此類別已設置預算', 'error');
            return;
        }
        
        // 創建類別預算
        const categoryBudget = {
            categoryId: categoryId,
            amount: amount,
            createdAt: new Date().toISOString()
        };
        
        // 添加到預算列表
        if (!appState.budgets.categories) {
            appState.budgets.categories = [];
        }
        
        appState.budgets.categories.push(categoryBudget);
        
        // 如果啟用自動計算，更新總預算
        if (appState.budgets.autoCalculate) {
            appState.budgets.total = calculateTotalCategoryBudget();
        }
        
        // 更新UI
        updateCategoryBudgets();
        updateBudgetProgress();
        
        // 更新預算狀態卡片
        if (typeof updateBudgetStatus === 'function') {
            updateBudgetStatus();
        }
        
        // 保存到本地存儲
        saveToLocalStorage();
        
        // 執行同步(如果啟用)
        if (enableFirebase && isLoggedIn) {
            syncToFirebase();
        }
        
        // 清空表單
        document.getElementById('categoryBudgetAmount').value = '';
        updateCategoryBudgetSelect();
        
        // 顯示成功消息
        showToast('類別預算已添加', 'success');
    } catch (error) {
        console.error("新增類別預算時發生錯誤:", error);
        showToast('新增類別預算失敗: ' + error.message, 'error');
    }
}

/**
 * 創建新預算
 */
function createNewBudget() {
    console.log("創建新預算");
    
    try {
        // 獲取輸入值
        const totalBudget = parseFloat(document.getElementById('totalBudget').value);
        const autoCalculate = document.getElementById('autoCalculateBudget').checked;
        
        // 獲取選中的重置週期
        let resetCycle = 'monthly'; // 默認為月度
        const resetCycleRadios = document.querySelectorAll('input[name="resetCycle"]');
        
        resetCycleRadios.forEach(radio => {
            if (radio.checked) {
                resetCycle = radio.value;
            }
        });
        
        // 僅對月度預算獲取重置日期
        let resetDay = 1; // 默認為1號
        
        if (resetCycle === 'monthly') {
            resetDay = parseInt(document.getElementById('monthlyResetDay').value) || 1;
            
            // 驗證日期在1-28範圍內
            if (resetDay < 1 || resetDay > 28) {
                showToast('重置日需在1至28之間', 'error');
                return;
            }
        }
        
        // 如果非自動計算，驗證總預算
        if (!autoCalculate && (!totalBudget || totalBudget <= 0)) {
            showToast('請輸入有效預算金額', 'error');
            return;
        }
        
        // 更新預算設置
        appState.budgets.resetCycle = resetCycle;
        appState.budgets.resetDay = resetDay;
        appState.budgets.autoCalculate = autoCalculate;
        
        // 根據自動計算設置更新總預算
        if (autoCalculate) {
            appState.budgets.total = calculateTotalCategoryBudget();
        } else {
            appState.budgets.total = totalBudget;
        }
        
        // 更新UI
        updateBudgetSettings();
        updateBudgetProgress();
        
        // 更新預算狀態卡片
        if (typeof updateBudgetStatus === 'function') {
            updateBudgetStatus();
        }
        
        // 保存到本地存儲
        saveToLocalStorage();
        
        // 執行同步(如果啟用)
        if (enableFirebase && isLoggedIn) {
            syncToFirebase();
        }
        
        // 顯示成功消息
        showToast('預算設置已更新', 'success');
    } catch (error) {
        console.error("創建新預算時發生錯誤:", error);
        showToast('創建新預算失敗: ' + error.message, 'error');
    }
}

/**
 * 更新類別預算下拉選單
 */
function updateCategoryBudgetSelect() {
    console.log("更新類別預算下拉選單");
    
    try {
        const categoryBudgetSelect = document.getElementById('categoryBudgetSelect');
        if (!categoryBudgetSelect) {
            console.warn("找不到類別預算下拉選單");
            return;
        }
        
        // 清空下拉選單
        categoryBudgetSelect.innerHTML = '<option value="" disabled selected>選擇類別</option>';
        
        // 獲取已有預算的類別ID
        const existingBudgetCategoryIds = appState.budgets.categories ? 
            appState.budgets.categories.map(b => b.categoryId) : [];
        
        // 獲取支出類別列表(排除已有預算的類別)
        const availableCategories = appState.categories.expense.filter(c => 
            !existingBudgetCategoryIds.includes(c.id)
        );
        
        // 按類別名稱排序
        availableCategories.sort((a, b) => a.name.localeCompare(b.name));
        
        // 填充下拉選單
        availableCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categoryBudgetSelect.appendChild(option);
        });
    } catch (error) {
        console.error("更新類別預算下拉選單時發生錯誤:", error);
    }
}

/**
 * 檢查預算警告
 */
function checkBudgetAlerts() {
    console.log("檢查預算警告");
    
    // 如果未啟用預算警告，直接返回
    if (!enableBudgetAlerts) {
        return;
    }
    
    try {
        // 檢查總預算警告
        const totalBudget = appState.budgets.total || 0;
        const totalSpent = calculateTotalSpent();
        
        // 計算百分比
        const percentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
        
        // 如果超過警告閾值，顯示警告
        if (percentage >= alertThreshold) {
            showToast(`警告: 總支出已達到預算的${percentage.toFixed(1)}%`, 'warning');
        }
        
        // 檢查類別預算警告
        if (appState.budgets.categories && appState.budgets.categories.length > 0) {
            appState.budgets.categories.forEach(budget => {
                // 找到類別
                const category = appState.categories.expense.find(c => c.id === budget.categoryId);
                if (!category) return;
                
                // 計算類別支出
                const categorySpent = calculateCategorySpent(budget.categoryId);
                
                // 計算百分比
                const categoryPercentage = budget.amount > 0 ? (categorySpent / budget.amount) * 100 : 0;
                
                // 如果超過警告閾值，顯示警告
                if (categoryPercentage >= alertThreshold) {
                    showToast(`警告: ${category.name}支出已達到預算的${categoryPercentage.toFixed(1)}%`, 'warning');
                }
            });
        }
    } catch (error) {
        console.error("檢查預算警告時發生錯誤:", error);
    }
}

/**
 * 更新預算狀態(用於儀表板)
 */
function updateBudgetStatus() {
    console.log("更新預算狀態");
    
    try {
        const budgetStatus = document.getElementById('budgetStatus');
        if (!budgetStatus) {
            console.warn("找不到預算狀態元素");
            return;
        }
        
        // 檢查是否有預算
        if (!appState.budgets.total || appState.budgets.total <= 0) {
            budgetStatus.innerHTML = `
                <p class="empty-message">尚未設定預算</p>
                <a href="#" onclick="showTabContent('budgets')" class="action-link">設定預算</a>
            `;
            return;
        }
        
        // 計算總預算和已使用
        const totalBudget = appState.budgets.total || 0;
        const totalSpent = calculateTotalSpent();
        
        // 計算百分比
        const percentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
        
        // 根據百分比確定顏色和狀態
        let progressColor = 'var(--primary-color)';
        let statusText = '預算狀況良好';
        
        if (percentage > 90) {
            progressColor = 'var(--danger-color)';
            statusText = '預算已接近上限';
        } else if (percentage > 70) {
            progressColor = 'var(--warning-color)';
            statusText = '預算使用較多';
        }
        
        // 創建預算週期文本
        const resetCycle = appState.budgets.resetCycle || 'monthly';
        let cycleText = '';
        
        if (resetCycle === 'daily') {
            cycleText = '每日';
        } else if (resetCycle === 'weekly') {
            cycleText = '每週';
        } else {
            const resetDay = appState.budgets.resetDay || 1;
            cycleText = `每月${resetDay}日`;
        }
        
        // 更新UI
        budgetStatus.innerHTML = `
            <div class="budget-header">
                <h4>${cycleText}預算: ${formatCurrency(totalBudget)}</h4>
                <span class="status-text">${statusText}</span>
            </div>
            <div class="budget-progress-container">
                <div class="budget-progress-bar" style="width: ${Math.min(100, percentage)}%; background-color: ${progressColor}"></div>
            </div>
            <div class="budget-info">
                <span>已使用 ${formatCurrency(totalSpent)} (${percentage.toFixed(1)}%)</span>
                <span>剩餘 ${formatCurrency(Math.max(0, totalBudget - totalSpent))}</span>
            </div>
            
            <div class="top-categories mt-2">
                <h4>支出最高的類別</h4>
                <div id="topCategoriesList"></div>
            </div>
        `;
        
        // 更新支出最高的類別
        updateTopCategoriesInBudgetStatus();
    } catch (error) {
        console.error("更新預算狀態時發生錯誤:", error);
        
        // 顯示錯誤消息
        const budgetStatus = document.getElementById('budgetStatus');
        if (budgetStatus) {
            budgetStatus.innerHTML = '<p class="error-message">載入預算狀態時出錯</p>';
        }
    }
}

/**
 * 更新支出最高的類別(用於預算狀態)
 */
function updateTopCategoriesInBudgetStatus() {
    console.log("更新支出最高的類別");
    
    try {
        const topCategoriesList = document.getElementById('topCategoriesList');
        if (!topCategoriesList) {
            console.warn("找不到支出最高類別列表元素");
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
        
        // 取得週期內的所有支出交易
        const periodTransactions = appState.transactions.filter(t =>
            t.type === 'expense' &&
            t.categoryId !== 'transfer_out' && // 排除轉賬
            t.date >= startDateFormatted &&
            t.date <= todayFormatted
        );
        
        // 按類別分組
        const categorySpending = {};
        
        periodTransactions.forEach(transaction => {
            const account = appState.accounts.find(a => a.id === transaction.accountId);
            if (!account) return;
            
            let amount = transaction.amount || 0;
            
            // 貨幣轉換
            if (account.currency !== defaultCurrency) {
                try {
                    const rate = getExchangeRate(account.currency, defaultCurrency);
                    amount = amount * rate;
                } catch (e) {
                    console.error("匯率轉換錯誤:", e);
                }
            }
            
            // 累加類別支出
            if (!categorySpending[transaction.categoryId]) {
                categorySpending[transaction.categoryId] = 0;
            }
            
            categorySpending[transaction.categoryId] += amount;
        });
        
        // 轉換為數組並排序
        const sortedCategories = Object.entries(categorySpending)
            .map(([categoryId, amount]) => {
                // 找到類別信息
                const category = appState.categories.expense.find(c => c.id === categoryId);
                return {
                    id: categoryId,
                    name: category ? category.name : '未知類別',
                    icon: category ? category.icon : 'fas fa-question',
                    color: category ? category.color : '#666',
                    amount: amount
                };
            })
            .sort((a, b) => b.amount - a.amount);
        
        // 取前3名
        const topCategories = sortedCategories.slice(0, 3);
        
        // 生成HTML
        if (topCategories.length === 0) {
            topCategoriesList.innerHTML = '<p class="empty-message">暫無支出記錄</p>';
            return;
        }
        
        let html = '';
        
        topCategories.forEach(category => {
            html += `
                <div class="top-category-item">
                    <div class="top-category-info">
                        <span class="top-category-icon" style="color: ${category.color}">
                            <i class="${category.icon}"></i>
                        </span>
                        <span class="top-category-name">${category.name}</span>
                    </div>
                    <div class="top-category-amount">${formatCurrency(category.amount)}</div>
                </div>
            `;
        });
        
        topCategoriesList.innerHTML = html;
    } catch (error) {
        console.error("更新支出最高類別時發生錯誤:", error);
        
        // 顯示錯誤消息
        const topCategoriesList = document.getElementById('topCategoriesList');
        if (topCategoriesList) {
            topCategoriesList.innerHTML = '<p class="error-message">載入支出類別時出錯</p>';
        }
    }
}

// 導出函數
window.updateBudgetsUI = updateBudgetsUI;
window.addCategoryBudget = addCategoryBudget;
window.createNewBudget = createNewBudget;
window.updateCategoryBudgetSelect = updateCategoryBudgetSelect;
window.checkBudgetAlerts = checkBudgetAlerts;
window.updateBudgetStatus = updateBudgetStatus;
window.calculateTotalCategoryBudget = calculateTotalCategoryBudget;