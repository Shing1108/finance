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
            <button id="viewBudgetHistoryBtn" class="btn btn-sm">
                <i class="fas fa-history"></i> 查看歷史
            </button>
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
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="budgetStartDate">預算開始日期</label>
                        <input type="date" id="budgetStartDate" class="form-control" value="${appState.budgets.startDate || ''}">
                    </div>
                    <div class="form-group">
                        <label for="budgetEndDate">預算結束日期 (可選)</label>
                        <input type="date" id="budgetEndDate" class="form-control" value="${appState.budgets.endDate || ''}">
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
                
                <div class="form-actions">
                    <button type="button" id="saveBudgetSettingsButton" class="btn btn-primary">保存設置</button>
                    <button type="button" id="saveBudgetHistoryButton" class="btn btn-secondary">
                        <i class="fas fa-save"></i> 保存為歷史記錄
                    </button>
                </div>
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
    
    // 3. 月度預算設置卡片（新增）
    const monthlyBudgetCard = document.createElement('div');
    monthlyBudgetCard.className = 'card';
    monthlyBudgetCard.innerHTML = `
        <div class="card-header">
            <h3>月度預算設置</h3>
        </div>
        <div class="monthly-budget-form">
            <div class="form-row">
                <div class="form-group">
                    <label for="budgetMonth">選擇月份</label>
                    <input type="month" id="budgetMonth" class="form-control" value="${getCurrentYearMonth()}">
                </div>
                <div class="form-group">
                    <label for="monthlyTotalBudget">該月總預算</label>
                    <input type="number" id="monthlyTotalBudget" class="form-control" min="0" step="0.01" placeholder="該月總預算">
                </div>
                <div class="form-group">
                    <label>&nbsp;</label>
                    <button type="button" id="loadMonthlyBudgetButton" class="btn btn-secondary">
                        <i class="fas fa-search"></i> 載入該月預算
                    </button>
                </div>
            </div>
            <p class="note">注意：月度預算設置會覆蓋默認預算設置，僅對選定月份有效。</p>
        </div>
        <div id="monthlyBudgetsList" class="monthly-budgets-list">
            <!-- 月度預算列表將透過 JavaScript 生成 -->
        </div>
    `;
    container.appendChild(monthlyBudgetCard);
    
    // 4. 類別預算卡片
    const categoryBudgetCard = document.createElement('div');
    categoryBudgetCard.className = 'card';
    categoryBudgetCard.innerHTML = `
        <div class="card-header">
            <h3>類別預算</h3>
            <div class="header-controls">
                <label for="budgetCategoryMonth">月份：</label>
                <input type="month" id="budgetCategoryMonth" class="form-control-sm" value="${getCurrentYearMonth()}">
            </div>
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
    document.getElementById('addCategoryBudgetButton').addEventListener('click', function() {
        // 使用當前選擇的月份
        const selectedMonth = document.getElementById('budgetCategoryMonth').value;
        addCategoryBudget(selectedMonth);
    });
    document.getElementById('viewBudgetHistoryBtn').addEventListener('click', viewBudgetHistory);
    document.getElementById('saveBudgetHistoryButton').addEventListener('click', saveBudgetHistory);
    document.getElementById('loadMonthlyBudgetButton').addEventListener('click', loadMonthlyBudget);
    
    // 當月份選擇變化時，重新載入類別預算
    document.getElementById('budgetCategoryMonth').addEventListener('change', function() {
        updateCategoryBudgetsList(this.value);
    });
    
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
    
    // 添加月度預算選擇器
const monthSelector = document.createElement('div');
monthSelector.className = 'budget-month-selector';
monthSelector.innerHTML = `
    <div class="form-row">
        <div class="form-group">
            <label for="budgetMonth">選擇預算月份</label>
            <input type="month" id="budgetMonth" class="form-control" value="${getCurrentYearMonth()}">
        </div>
        <div class="form-group">
            <label>&nbsp;</label>
            <button type="button" id="loadMonthlyBudgetButton" class="btn btn-secondary">
                <i class="fas fa-search"></i> 載入該月預算
            </button>
        </div>
        <div class="form-group">
            <label>&nbsp;</label>
            <button type="button" id="saveBudgetHistoryButton" class="btn btn-secondary">
                <i class="fas fa-save"></i> 保存為歷史記錄
            </button>
        </div>
    </div>
`;
budgetsTab.appendChild(monthSelector);
    
    // 更新類別預算下拉選單
    updateCategoryBudgetSelect();
    
    // 更新當前選擇月份的類別預算列表
    updateCategoryBudgetsList(document.getElementById('budgetCategoryMonth').value);
    
    // 更新月度預算列表
    updateMonthlyBudgetsList();

    // 添加未來預算設置按鈕
    addFutureBudgetButtons();
    
    console.log("預算標籤頁結構初始化完成");
}

/**
 * 快速複製上一個月的預算設置
 * @param {string} targetMonth 目標月份 (YYYY-MM 格式)
 */
function copyPreviousMonthBudget(targetMonth) {
    console.log(`複製上一個月預算到 ${targetMonth}`);
    
    try {
        // 解析目標月份
        const [targetYear, targetMonthNum] = targetMonth.split('-').map(Number);
        
        // 計算上一個月
        let previousMonthNum = targetMonthNum - 1;
        let previousYear = targetYear;
        
        if (previousMonthNum === 0) {
            previousMonthNum = 12;
            previousYear -= 1;
        }
        
        const previousMonth = `${previousYear}-${String(previousMonthNum).padStart(2, '0')}`;
        
        // 檢查上一個月是否有預算設置
        if (!appState.budgets.monthlySettings || !appState.budgets.monthlySettings[previousMonth]) {
            showToast(`找不到 ${formatYearMonth(previousMonth)} 的預算設置`, 'error');
            return;
        }
        
        // 確認複製
        showConfirmDialog(`確定要將 ${formatYearMonth(previousMonth)} 的預算設置複製到 ${formatYearMonth(targetMonth)} 嗎？`, () => {
            // 獲取上一個月的預算設置
            const previousBudget = appState.budgets.monthlySettings[previousMonth];
            
            // 創建深拷貝
            const newBudget = JSON.parse(JSON.stringify(previousBudget));
            
            // 更新創建時間
            if (newBudget.categories) {
                newBudget.categories.forEach(category => {
                    category.createdAt = new Date().toISOString();
                });
            }
            
            // 保存到目標月份
            if (!appState.budgets.monthlySettings) {
                appState.budgets.monthlySettings = {};
            }
            
            appState.budgets.monthlySettings[targetMonth] = newBudget;
            
            // 保存到本地存儲
            saveToLocalStorage();
            
            // 更新UI
            updateMonthlyBudgetsList();
            
            // 執行同步(如果啟用)
            if (enableFirebase && isLoggedIn) {
                syncToFirebase();
            }
            
            showToast(`已複製 ${formatYearMonth(previousMonth)} 的預算設置到 ${formatYearMonth(targetMonth)}`, 'success');
            
            // 載入該月預算
            const monthInput = document.getElementById('budgetMonth');
            if (monthInput) {
                monthInput.value = targetMonth;
                loadMonthlyBudget();
            }
        });
    } catch (error) {
        console.error("複製預算設置時發生錯誤:", error);
        showToast('複製預算設置失敗: ' + error.message, 'error');
    }
}

/**
 * 獲取當前年月 (YYYY-MM 格式)
 */
function getCurrentYearMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
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
        
        // 獲取當前活動日期
        const activeDay = window.dayManager ? window.dayManager.getActiveDay() : new Date().toISOString().split('T')[0];
        
        // 從活動日期中提取年月
        const activeDateParts = activeDay.split('-');
        const activeYearMonth = `${activeDateParts[0]}-${activeDateParts[1]}`;
        
        // 檢查該月是否有特定預算
        const monthlyBudget = appState.budgets.monthlySettings && 
                               appState.budgets.monthlySettings[activeYearMonth];
        
        // 確定要顯示的預算信息
        let totalBudget = 0;
        let isMonthlySpecific = false;
        
        if (monthlyBudget) {
            totalBudget = monthlyBudget.total || 0;
            isMonthlySpecific = true;
        } else {
            totalBudget = appState.budgets.total || 0;
        }
        
        // 檢查是否有預算
        if (totalBudget <= 0) {
            budgetProgressContainer.innerHTML = `
                <p class="empty-message">尚未設定預算</p>
            `;
            return;
        }
        
        // 檢查預算是否已經結束
        const budgetEnded = appState.budgets.endDate && activeDay > appState.budgets.endDate;
        
        // 計算總支出
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
        
        // 生成預算狀態文本
        let statusText = '';
        if (budgetEnded) {
            statusText = '<span class="budget-ended">預算已結束</span>';
        }
        
        // 生成預算時間範圍文本
        let dateRangeText = '';
        if (isMonthlySpecific) {
            dateRangeText = `<div class="budget-date-range">當前使用 ${formatYearMonth(activeYearMonth)} 的月度特定預算</div>`;
        } else if (appState.budgets.startDate) {
            if (appState.budgets.endDate) {
                dateRangeText = `<div class="budget-date-range">預算期間: ${formatDate(appState.budgets.startDate)} ~ ${formatDate(appState.budgets.endDate)}</div>`;
            } else {
                dateRangeText = `<div class="budget-date-range">預算開始日期: ${formatDate(appState.budgets.startDate)}</div>`;
            }
        }
        
        // 更新UI
        budgetProgressContainer.innerHTML = `
            <div class="budget-header">
                <h4>總預算</h4>
                <span class="budget-amount">${formatCurrency(totalBudget)}</span>
            </div>
            ${dateRangeText}
            ${statusText}
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
        // 確定預算週期與日期範圍
        const activeDay = window.dayManager ? window.dayManager.getActiveDay() : new Date().toISOString().split('T')[0];
        const resetCycle = appState.budgets.resetCycle || 'monthly';
        const resetDay = parseInt(appState.budgets.resetDay || 1, 10);
        
        // 考慮預算的開始和結束日期
        const budgetStartDate = appState.budgets.startDate;
        const budgetEndDate = appState.budgets.endDate;
        
        // 檢查是否有月度預算設置
        // 從活動日期中提取年月
        const activeDateParts = activeDay.split('-');
        const activeYearMonth = `${activeDateParts[0]}-${activeDateParts[1]}`;
        
        // 檢查該月是否有特定預算
        const hasMonthlyBudget = appState.budgets.monthlySettings && 
                                 appState.budgets.monthlySettings[activeYearMonth] &&
                                 appState.budgets.monthlySettings[activeYearMonth].categories &&
                                 appState.budgets.monthlySettings[activeYearMonth].categories.some(b => b.categoryId === categoryId);
        
        // 如果有月度特定預算，使用月份時間範圍
        if (hasMonthlyBudget) {
            return calculateMonthlyCategorySpent(categoryId, activeYearMonth);
        }
        
        // 否則使用普通預算計算
        let startDate;
        
        // 如果設置了預算開始日期，使用預算開始日期
        if (budgetStartDate) {
            startDate = new Date(budgetStartDate);
        } else {
            // 否則使用基於重置週期的開始日期
            if (resetCycle === 'daily') {
                startDate = new Date(activeDay);
            } else if (resetCycle === 'weekly') {
                const activeDayObj = new Date(activeDay);
                const day = activeDayObj.getDay(); // 0 = 週日, 1 = 週一, ...
                const diff = day === 0 ? 6 : day - 1; // 調整為週一作為一週的開始
                startDate = new Date(activeDayObj);
                startDate.setDate(activeDayObj.getDate() - diff);
            } else { // monthly
                const activeDayObj = new Date(activeDay);
                const currentDay = activeDayObj.getDate();
                
                if (currentDay >= resetDay) {
                    // 本月的重設日
                    startDate = new Date(activeDayObj.getFullYear(), activeDayObj.getMonth(), resetDay);
                } else {
                    // 上月的重設日
                    startDate = new Date(activeDayObj.getFullYear(), activeDayObj.getMonth() - 1, resetDay);
                }
            }
        }
        
        // 確定結束日期
        let endDate;
        if (budgetEndDate && activeDay > budgetEndDate) {
            // 如果已經超過預算結束日期，則使用預算結束日期作為結束
            endDate = new Date(budgetEndDate);
        } else {
            // 否則使用當前活動日期
            endDate = new Date(activeDay);
        }
        
        // 將日期格式化為 YYYY-MM-DD
        const startDateFormatted = startDate.toISOString().split('T')[0];
        const endDateFormatted = endDate.toISOString().split('T')[0];
        
        // 找出週期內該類別的支出交易
        const categoryTransactions = appState.transactions.filter(t =>
            t.type === 'expense' &&
            t.categoryId === categoryId &&
            t.date >= startDateFormatted &&
            t.date <= endDateFormatted
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
        // 確定預算週期與日期範圍
        const activeDay = window.dayManager ? window.dayManager.getActiveDay() : new Date().toISOString().split('T')[0];
        const resetCycle = appState.budgets.resetCycle || 'monthly';
        const resetDay = parseInt(appState.budgets.resetDay || 1, 10);
        
        // 考慮預算的開始和結束日期
        const budgetStartDate = appState.budgets.startDate;
        const budgetEndDate = appState.budgets.endDate;
        
        // 從活動日期中提取年月
        const activeDateParts = activeDay.split('-');
        const activeYearMonth = `${activeDateParts[0]}-${activeDateParts[1]}`;
        
        // 檢查該月是否有特定預算
        const hasMonthlyBudget = appState.budgets.monthlySettings && 
                                appState.budgets.monthlySettings[activeYearMonth];
        
        // 如果有月度特定預算，計算該月總支出
        if (hasMonthlyBudget) {
            // 解析年月
            const [year, monthNum] = activeYearMonth.split('-');
            const monthStartDate = `${year}-${monthNum}-01`;
            
            // 計算月末日期
            const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
            const monthEndDate = `${year}-${monthNum}-${lastDay}`;
            
            // 使用月初到當前日期作為範圍（或月末，如果當前日期超過月末）
            const startDateFormatted = monthStartDate;
            const endDateFormatted = activeDay <= monthEndDate ? activeDay : monthEndDate;
            
            // 找出月份內的支出交易
            const periodTransactions = appState.transactions.filter(t =>
                t.type === 'expense' &&
                t.categoryId !== 'transfer_out' && // 排除轉賬
                t.date >= startDateFormatted &&
                t.date <= endDateFormatted
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
        }
        
        // 否則使用普通預算計算
        let startDate;
        
        // 如果設置了預算開始日期，使用預算開始日期
        if (budgetStartDate) {
            startDate = new Date(budgetStartDate);
        } else {
            // 否則使用基於重置週期的開始日期
            if (resetCycle === 'daily') {
                startDate = new Date(activeDay);
            } else if (resetCycle === 'weekly') {
                const activeDayObj = new Date(activeDay);
                const day = activeDayObj.getDay(); // 0 = 週日, 1 = 週一, ...
                const diff = day === 0 ? 6 : day - 1; // 調整為週一作為一週的開始
                startDate = new Date(activeDayObj);
                startDate.setDate(activeDayObj.getDate() - diff);
            } else { // monthly
                const activeDayObj = new Date(activeDay);
                const currentDay = activeDayObj.getDate();
                
                if (currentDay >= resetDay) {
                    // 本月的重設日
                    startDate = new Date(activeDayObj.getFullYear(), activeDayObj.getMonth(), resetDay);
                } else {
                    // 上月的重設日
                    startDate = new Date(activeDayObj.getFullYear(), activeDayObj.getMonth() - 1, resetDay);
                }
            }
        }
        
        // 確定結束日期
        let endDate;
        if (budgetEndDate && activeDay > budgetEndDate) {
            // 如果已經超過預算結束日期，則使用預算結束日期作為結束
            endDate = new Date(budgetEndDate);
        } else {
            // 否則使用當前活動日期
            endDate = new Date(activeDay);
        }
        
        // 將日期格式化為 YYYY-MM-DD
        const startDateFormatted = startDate.toISOString().split('T')[0];
        const endDateFormatted = endDate.toISOString().split('T')[0];
        
        // 找出週期內的支出交易
        const periodTransactions = appState.transactions.filter(t =>
            t.type === 'expense' &&
            t.categoryId !== 'transfer_out' && // 排除轉賬
            t.date >= startDateFormatted &&
            t.date <= endDateFormatted
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
 * @param {string} targetMonth 目標月份 (YYYY-MM 格式)
 */
function addCategoryBudget(targetMonth) {
    console.log(`新增類別預算 (月份: ${targetMonth})`);
    
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
        
        // 獲取目標月份 - 如果未指定，使用當前選擇的月份
        if (!targetMonth) {
            targetMonth = document.getElementById('budgetCategoryMonth').value;
        }
        
        // 檢查是否為月度預算
        let targetBudget;
        
        if (targetMonth) {
            // 確保月度設置存在
            if (!appState.budgets.monthlySettings) {
                appState.budgets.monthlySettings = {};
            }
            
            // 確保該月設置存在
            if (!appState.budgets.monthlySettings[targetMonth]) {
                // 如果尚未保存月度總預算，先保存
                if (!saveMonthlyBudget()) {
                    return;
                }
            }
            
            targetBudget = appState.budgets.monthlySettings[targetMonth];
            
            // 確保類別數組存在
            if (!targetBudget.categories) {
                targetBudget.categories = [];
            }
        } else {
            // 使用默認預算
            targetBudget = appState.budgets;
        }
        
        // 檢查是否已存在此類別的預算
        if (targetBudget.categories && targetBudget.categories.some(b => b.categoryId === categoryId)) {
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
        if (!targetBudget.categories) {
            targetBudget.categories = [];
        }
        
        targetBudget.categories.push(categoryBudget);
        
        // 如果啟用自動計算，更新總預算
        if (targetBudget.autoCalculate) {
            if (targetMonth) {
                targetBudget.total = calculateMonthlyTotalCategoryBudget(targetMonth);
            } else {
                targetBudget.total = calculateTotalCategoryBudget();
            }
        }
        
        // 更新UI
        if (targetMonth) {
            updateCategoryBudgetsList(targetMonth);
            updateMonthlyBudgetsList();
        } else {
            updateCategoryBudgetsList();
            updateBudgetProgress();
        }
        
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
        if (targetMonth) {
            showToast(`已添加 ${formatYearMonth(targetMonth)} 的類別預算`, 'success');
        } else {
            showToast('類別預算已添加', 'success');
        }
    } catch (error) {
        console.error("新增類別預算時發生錯誤:", error);
        showToast('新增類別預算失敗: ' + error.message, 'error');
    }
}

/**
 * 更新類別預算列表
 * @param {string} targetMonth 目標月份 (YYYY-MM 格式)
 */
function updateCategoryBudgetsList(targetMonth) {
    console.log(`更新類別預算列表 (月份: ${targetMonth})`);
    
    try {
        // 檢查類別預算列表是否存在
        const categoryBudgetsList = document.getElementById('categoryBudgetsList');
        if (!categoryBudgetsList) {
            console.warn("找不到類別預算列表");
            return;
        }
        
        // 獲取目標預算對象
        let targetBudget;
        let isMonthlyBudget = false;
        
        if (targetMonth && appState.budgets.monthlySettings && appState.budgets.monthlySettings[targetMonth]) {
            targetBudget = appState.budgets.monthlySettings[targetMonth];
            isMonthlyBudget = true;
        } else {
            targetBudget = appState.budgets;
        }
        
        // 檢查類別預算是否已初始化
        if (!targetBudget.categories) {
            targetBudget.categories = [];
        }
        
        // 排序類別預算(按照類別名稱)
        const sortedCategoryBudgets = [...targetBudget.categories].sort((a, b) => {
            const categoryA = appState.categories.expense.find(c => c.id === a.categoryId);
            const categoryB = appState.categories.expense.find(c => c.id === b.categoryId);
            
            if (!categoryA || !categoryB) return 0;
            return categoryA.name.localeCompare(categoryB.name);
        });
        
        // 生成HTML
        if (sortedCategoryBudgets.length === 0) {
            categoryBudgetsList.innerHTML = `<p class="empty-message">${isMonthlyBudget ? '此月尚未設置類別預算' : '尚未設置類別預算'}</p>`;
            return;
        }
        
        let html = '';
        
        sortedCategoryBudgets.forEach(budget => {
            // 找到類別
            const category = appState.categories.expense.find(c => c.id === budget.categoryId);
            if (!category) return;
            
            // 計算類別支出
            let categorySpent = 0;
            
            if (isMonthlyBudget) {
                // 計算該月的類別支出
                categorySpent = calculateMonthlyCategorySpent(budget.categoryId, targetMonth);
            } else {
                categorySpent = calculateCategorySpent(budget.categoryId);
            }
            
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
                <div class="budget-item" data-id="${budget.categoryId}" ${isMonthlyBudget ? `data-month="${targetMonth}"` : ''}>
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
                    <div class="budget-actions">
                        <button class="btn btn-sm edit-category-budget" data-id="${budget.categoryId}" ${isMonthlyBudget ? `data-month="${targetMonth}"` : ''}>
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-category-budget" data-id="${budget.categoryId}" ${isMonthlyBudget ? `data-month="${targetMonth}"` : ''}>
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        categoryBudgetsList.innerHTML = html;
        
        // 綁定編輯和刪除按鈕
        categoryBudgetsList.querySelectorAll('.edit-category-budget').forEach(button => {
            button.addEventListener('click', function() {
                const categoryId = this.getAttribute('data-id');
                const month = this.getAttribute('data-month');
                editCategoryBudget(categoryId, month);
            });
        });
        
        categoryBudgetsList.querySelectorAll('.delete-category-budget').forEach(button => {
            button.addEventListener('click', function() {
                const categoryId = this.getAttribute('data-id');
                const month = this.getAttribute('data-month');
                deleteCategoryBudget(categoryId, month);
            });
        });
    } catch (error) {
        console.error("更新類別預算列表時發生錯誤:", error);
        
        // 顯示錯誤消息
        const categoryBudgetsList = document.getElementById('categoryBudgetsList');
        if (categoryBudgetsList) {
            categoryBudgetsList.innerHTML = '<p class="error-message">載入類別預算時出錯</p>';
        }
    }
}

/**
 * 計算月度類別預算總和
 * @param {string} month 月份 (YYYY-MM 格式)
 * @returns {number} 類別預算總和
 */
function calculateMonthlyTotalCategoryBudget(month) {
    try {
        if (!appState.budgets.monthlySettings || !appState.budgets.monthlySettings[month]) {
            return 0;
        }
        
        const monthlyBudget = appState.budgets.monthlySettings[month];
        
        if (!monthlyBudget.categories || monthlyBudget.categories.length === 0) {
            return 0;
        }
        
        // 計算所有類別預算的總和
        return monthlyBudget.categories.reduce((total, category) => total + (category.amount || 0), 0);
    } catch (error) {
        console.error("計算月度類別預算總和時發生錯誤:", error);
        return 0;
    }
}

/**
 * 計算月度類別支出
 * @param {string} categoryId 類別ID
 * @param {string} month 月份 (YYYY-MM 格式)
 * @returns {number} 類別支出金額
 */
function calculateMonthlyCategorySpent(categoryId, month) {
    try {
        if (!month) return 0;
        
        // 解析年月
        const [year, monthNum] = month.split('-');
        const startDate = `${year}-${monthNum}-01`;
        
        // 計算月末日期
        const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
        const endDate = `${year}-${monthNum}-${lastDay}`;
        
        // 找出月份內該類別的支出交易
        const categoryTransactions = appState.transactions.filter(t =>
            t.type === 'expense' &&
            t.categoryId === categoryId &&
            t.date >= startDate &&
            t.date <= endDate
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
        console.error("計算月度類別支出時發生錯誤:", error);
        return 0;
    }
}

/**
 * 編輯類別預算
 * @param {string} categoryId 類別ID
 * @param {string} month 月份 (YYYY-MM 格式)
 */
function editCategoryBudget(categoryId, month) {
    console.log(`編輯類別預算: ${categoryId}, 月份: ${month}`);
    
    try {
        // 獲取目標預算對象
        let targetBudget;
        
        if (month && appState.budgets.monthlySettings && appState.budgets.monthlySettings[month]) {
            targetBudget = appState.budgets.monthlySettings[month];
        } else {
            targetBudget = appState.budgets;
        }
        
        // 查找類別預算
        const categoryBudget = targetBudget.categories.find(b => b.categoryId === categoryId);
        if (!categoryBudget) {
            showToast('找不到類別預算', 'error');
            return;
        }
        
        // 找到類別
        const category = appState.categories.expense.find(c => c.id === categoryId);
        if (!category) {
            showToast('找不到類別', 'error');
            return;
        }
        
        // 創建編輯模態框
        let editCategoryBudgetModal = document.getElementById('editCategoryBudgetModal');
        
        if (!editCategoryBudgetModal) {
            editCategoryBudgetModal = document.createElement('div');
            editCategoryBudgetModal.id = 'editCategoryBudgetModal';
            editCategoryBudgetModal.className = 'modal';
            
            document.body.appendChild(editCategoryBudgetModal);
        }
        
        // 更新模態框內容
        editCategoryBudgetModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>編輯類別預算</h3>
                    <span class="close-button">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="category-info">
                        <div class="category-icon" style="color: ${category.color}">
                            <i class="${category.icon}"></i>
                        </div>
                        <div class="category-name">${category.name}</div>
                        ${month ? `<div class="category-month">${formatYearMonth(month)}</div>` : ''}
                    </div>
                    
                    <div class="form-group">
                        <label for="editCategoryBudgetAmount">預算金額</label>
                        <input type="number" id="editCategoryBudgetAmount" class="form-control" min="0" step="0.01" value="${categoryBudget.amount}">
                    </div>
                    
                    <input type="hidden" id="editCategoryBudgetId" value="${categoryId}">
                    ${month ? `<input type="hidden" id="editCategoryBudgetMonth" value="${month}">` : ''}
                </div>
                <div class="modal-footer">
                    <button id="updateCategoryBudgetButton" class="btn btn-primary">更新</button>
                    <button class="btn btn-secondary modal-cancel">取消</button>
                </div>
            </div>
        `;
        
        // 綁定關閉按鈕事件
        editCategoryBudgetModal.querySelector('.close-button').addEventListener('click', closeCurrentModal);
        editCategoryBudgetModal.querySelector('.modal-cancel').addEventListener('click', closeCurrentModal);
        
        // 綁定更新按鈕事件
        const updateButton = editCategoryBudgetModal.querySelector('#updateCategoryBudgetButton');
        updateButton.addEventListener('click', function() {
            const newAmount = parseFloat(document.getElementById('editCategoryBudgetAmount').value);
            const categoryId = document.getElementById('editCategoryBudgetId').value;
            const monthElem = document.getElementById('editCategoryBudgetMonth');
            const month = monthElem ? monthElem.value : null;
            
            updateCategoryBudget(categoryId, newAmount, month);
        });
        
        // 顯示模態框
        openModal('editCategoryBudgetModal');
    } catch (error) {
        console.error("編輯類別預算時發生錯誤:", error);
        showToast('編輯類別預算失敗: ' + error.message, 'error');
    }
}

/**
 * 更新類別預算
 * @param {string} categoryId 類別ID
 * @param {number} newAmount 新預算金額
 * @param {string} month 月份 (YYYY-MM 格式)
 */
function updateCategoryBudget(categoryId, newAmount, month) {
    console.log(`更新類別預算: ${categoryId}, 金額: ${newAmount}, 月份: ${month}`);
    
    try {
        // 驗證
        if (!newAmount || newAmount < 0) {
            showToast('請輸入有效金額', 'error');
            return;
        }
        
        // 獲取目標預算對象
        let targetBudget;
        
        if (month && appState.budgets.monthlySettings && appState.budgets.monthlySettings[month]) {
            targetBudget = appState.budgets.monthlySettings[month];
        } else {
            targetBudget = appState.budgets;
        }
        
        // 查找類別預算
        const categoryBudgetIndex = targetBudget.categories.findIndex(b => b.categoryId === categoryId);
        if (categoryBudgetIndex === -1) {
            showToast('找不到類別預算', 'error');
            return;
        }
        
        // 更新預算金額
        targetBudget.categories[categoryBudgetIndex].amount = newAmount;
        targetBudget.categories[categoryBudgetIndex].updatedAt = new Date().toISOString();
        
        // 如果啟用自動計算，更新總預算
        if (targetBudget.autoCalculate) {
            if (month) {
                targetBudget.total = calculateMonthlyTotalCategoryBudget(month);
            } else {
                targetBudget.total = calculateTotalCategoryBudget();
            }
        }
        
        // 更新UI
        if (month) {
            updateCategoryBudgetsList(month);
            updateMonthlyBudgetsList();
        } else {
            updateCategoryBudgetsList();
            updateBudgetProgress();
        }
        
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
        
        // 關閉模態框
        closeCurrentModal();
        
        // 顯示成功消息
        showToast('類別預算已更新', 'success');
    } catch (error) {
        console.error("更新類別預算時發生錯誤:", error);
        showToast('更新類別預算失敗: ' + error.message, 'error');
    }
}

/**
 * 刪除類別預算
 * @param {string} categoryId 類別ID
 * @param {string} month 月份 (YYYY-MM 格式)
 */
function deleteCategoryBudget(categoryId, month) {
    console.log(`刪除類別預算: ${categoryId}, 月份: ${month}`);
    
    try {
        // 獲取目標預算對象
        let targetBudget;
        
        if (month && appState.budgets.monthlySettings && appState.budgets.monthlySettings[month]) {
            targetBudget = appState.budgets.monthlySettings[month];
        } else {
            targetBudget = appState.budgets;
        }
        
        // 查找類別預算
        const categoryBudgetIndex = targetBudget.categories.findIndex(b => b.categoryId === categoryId);
        if (categoryBudgetIndex === -1) {
            showToast('找不到類別預算', 'error');
            return;
        }
        
        // 找到類別
        const category = appState.categories.expense.find(c => c.id === categoryId);
        
        // 確認刪除
        const categoryName = category ? category.name : '未知類別';
        let confirmMessage = `確定要刪除${categoryName}的預算嗎？`;
        if (month) {
            confirmMessage = `確定要刪除${formatYearMonth(month)}${categoryName}的預算嗎？`;
        }
        
        showConfirmDialog(confirmMessage, () => {
            // 刪除類別預算
            targetBudget.categories.splice(categoryBudgetIndex, 1);
            
            // 如果啟用自動計算，更新總預算
            if (targetBudget.autoCalculate) {
                if (month) {
                    targetBudget.total = calculateMonthlyTotalCategoryBudget(month);
                } else {
                    targetBudget.total = calculateTotalCategoryBudget();
                }
            }
            
            // 更新UI
            if (month) {
                updateCategoryBudgetsList(month);
                updateMonthlyBudgetsList();
            } else {
                updateCategoryBudgetsList();
                updateBudgetProgress();
            }
            
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
            
            // 更新類別預算下拉選單
            updateCategoryBudgetSelect();
            
            // 顯示成功消息
            showToast('類別預算已刪除', 'success');
        });
    } catch (error) {
        console.error("刪除類別預算時發生錯誤:", error);
        showToast('刪除類別預算失敗: ' + error.message, 'error');
    }
}

/**
 * 創建新預算
 */
function createNewBudget() {
    console.log("創建新預算");
    
    try {
        // 獲取當前選擇的月份
        const selectedMonth = document.getElementById('budgetMonth').value;
        if (!selectedMonth) {
            showToast('請選擇預算月份', 'error');
            return;
        }
        
        // 獲取輸入值
        const totalBudget = parseFloat(document.getElementById('totalBudget').value);
        const autoCalculate = document.getElementById('autoCalculateBudget').checked;
        const startDate = document.getElementById('budgetStartDate').value;
        const endDate = document.getElementById('budgetEndDate').value;
        
        // 驗證
        if (!autoCalculate && (!totalBudget || totalBudget <= 0)) {
            showToast('請輸入有效預算金額', 'error');
            return;
        }
        
        if (startDate && endDate && endDate < startDate) {
            showToast('結束日期不能早於開始日期', 'error');
            return;
        }
        
        // 初始化月度預算結構
        if (!appState.budgets.monthly) {
            appState.budgets.monthly = {};
        }
        
        // 檢查該月份是否已有預算設置
        if (!appState.budgets.monthly[selectedMonth]) {
            appState.budgets.monthly[selectedMonth] = {
                total: 0,
                categories: [],
                startDate: null,
                endDate: null,
                createdAt: new Date().toISOString()
            };
        }
        
        // 獲取月度預算對象
        const monthlyBudget = appState.budgets.monthly[selectedMonth];
        
        // 更新預算設置
        monthlyBudget.total = autoCalculate ? calculateMonthlyTotalCategoryBudget(selectedMonth) : totalBudget;
        monthlyBudget.autoCalculate = autoCalculate;
        monthlyBudget.startDate = startDate;
        monthlyBudget.endDate = endDate;
        monthlyBudget.updatedAt = new Date().toISOString();
        
        // 如果沒有設置開始和結束日期，自動設為月初和月末
        if (!startDate) {
            const [year, month] = selectedMonth.split('-');
            monthlyBudget.startDate = `${year}-${month}-01`;
        }
        
        if (!endDate) {
            const [year, month] = selectedMonth.split('-');
            const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
            monthlyBudget.endDate = `${year}-${month}-${lastDay}`;
        }
        
        // 更新全局設置
        appState.budgets.autoCalculate = autoCalculate;
        
        // 檢查預算是否已過期
        const today = new Date().toISOString().split('T')[0];
        const isExpired = monthlyBudget.endDate && monthlyBudget.endDate < today;
        
        // 如果預算已過期，保存到歷史記錄
        if (isExpired) {
            // 檢查是否已存在歷史記錄
            const existsInHistory = appState.budgets.history && 
                                   appState.budgets.history.some(h => h.period === selectedMonth);
            
            if (!existsInHistory) {
                // 創建預算快照
                const budgetSnapshot = {
                    id: generateId(),
                    period: selectedMonth,
                    total: monthlyBudget.total,
                    categories: JSON.parse(JSON.stringify(monthlyBudget.categories)),
                    startDate: monthlyBudget.startDate,
                    endDate: monthlyBudget.endDate,
                    createdAt: new Date().toISOString()
                };
                
                // 初始化歷史記錄數組
                if (!appState.budgets.history) {
                    appState.budgets.history = [];
                }
                
                // 添加到歷史記錄
                appState.budgets.history.push(budgetSnapshot);
                
                showToast(`已自動保存${formatYearMonth(selectedMonth)}預算到歷史記錄，因為此預算已過期`, 'info');
            }
        }
        
        // 更新UI
        updateBudgetProgress();
        updateCategoryBudgetsList(selectedMonth);
        updateMonthlyBudgetsList();
        
        // 同步類別預算月份選擇器
        const categoryMonthInput = document.getElementById('budgetCategoryMonth');
        if (categoryMonthInput && categoryMonthInput.value !== selectedMonth) {
            categoryMonthInput.value = selectedMonth;
            // 觸發變更事件
            const event = new Event('change');
            categoryMonthInput.dispatchEvent(event);
        }
        
        // 更新預算狀態卡片（如果在儀表板頁面）
        if (typeof updateBudgetStatus === 'function') {
            updateBudgetStatus();
        }
        
        // 更新未來預算按鈕狀態
        if (typeof updateFutureBudgetButtonStatus === 'function') {
            updateFutureBudgetButtonStatus();
        }
        
        // 保存到本地存儲
        saveToLocalStorage();
        
        // 執行同步(如果啟用)
        if (enableFirebase && isLoggedIn) {
            syncToFirebase();
        }
        
        // 顯示成功消息
        showToast(`${formatYearMonth(selectedMonth)}預算設置已保存`, 'success');
    } catch (error) {
        console.error("創建新預算時發生錯誤:", error);
        showToast('創建預算失敗: ' + error.message, 'error');
    }
}
        
        // 更新預算設置
        appState.budgets.resetCycle = resetCycle;
        appState.budgets.resetDay = resetDay;
        appState.budgets.autoCalculate = autoCalculate;
        appState.budgets.startDate = startDate;
        appState.budgets.endDate = endDate;
        
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
/**
 * 保存預算歷史記錄
 */
function saveBudgetHistory() {
    console.log("保存預算歷史記錄");
    
    try {
        // 獲取當前預算的快照
        const budgetSnapshot = {
            id: generateId(),
            total: appState.budgets.total,
            categories: JSON.parse(JSON.stringify(appState.budgets.categories)),
            resetCycle: appState.budgets.resetCycle,
            resetDay: appState.budgets.resetDay,
            startDate: appState.budgets.startDate || new Date().toISOString().split('T')[0],
            endDate: appState.budgets.endDate,
            createdAt: new Date().toISOString()
        };
        
        // 初始化歷史記錄數組
        if (!appState.budgets.history) {
            appState.budgets.history = [];
        }
        
        // 添加到歷史記錄
        appState.budgets.history.push(budgetSnapshot);
        
        // 限制歷史記錄數量
        if (appState.budgets.history.length > 50) {
            appState.budgets.history = appState.budgets.history.slice(-50);
        }
        
        // 保存到本地存儲
        saveToLocalStorage();
        
        // 執行同步(如果啟用)
        if (enableFirebase && isLoggedIn) {
            syncToFirebase();
        }
        
        showToast('預算歷史已保存', 'success');
        return true;
    } catch (error) {
        console.error("保存預算歷史時發生錯誤:", error);
        showToast('保存預算歷史失敗: ' + error.message, 'error');
        return false;
    }
}

/**
 * 查看預算歷史記錄
 */
function viewBudgetHistory() {
    console.log("查看預算歷史記錄");
    
    try {
        // 檢查是否有預算歷史
        if (!appState.budgets.history || appState.budgets.history.length === 0) {
            showToast('尚無預算歷史記錄', 'info');
            return;
        }
        
        // 創建預算歷史模態框
        let budgetHistoryModal = document.getElementById('budgetHistoryModal');
        
        if (!budgetHistoryModal) {
            budgetHistoryModal = document.createElement('div');
            budgetHistoryModal.id = 'budgetHistoryModal';
            budgetHistoryModal.className = 'modal';
            
            document.body.appendChild(budgetHistoryModal);
        }
        
        // 排序歷史記錄(最新的在前)
        const sortedHistory = [...appState.budgets.history].sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        // 生成歷史記錄列表
        let historyListHTML = '';
        
        sortedHistory.forEach(history => {
            // 格式化日期範圍
            let dateRange = '';
            if (history.startDate && history.endDate) {
                dateRange = `${formatDate(history.startDate)} ~ ${formatDate(history.endDate)}`;
            } else if (history.startDate) {
                dateRange = `${formatDate(history.startDate)}起`;
            } else {
                dateRange = '未設置日期範圍';
            }
            
            // 格式化重置週期
            let resetCycleText = '';
            switch (history.resetCycle) {
                case 'daily': resetCycleText = '每日'; break;
                case 'weekly': resetCycleText = '每週'; break;
                case 'monthly': resetCycleText = `每月${history.resetDay}日`; break;
                default: resetCycleText = '未設置';
            }
            
            // 生成歷史記錄項目
            historyListHTML += `
                <div class="budget-history-item" data-id="${history.id}">
                    <div class="budget-history-header">
                        <div class="budget-history-date">${dateRange}</div>
                        <div class="budget-history-total">總預算: ${formatCurrency(history.total)}</div>
                    </div>
                    <div class="budget-history-details">
                        <div>重置週期: ${resetCycleText}</div>
                        <div>類別預算: ${history.categories.length}個</div>
                        <div>創建時間: ${new Date(history.createdAt).toLocaleString()}</div>
                    </div>
                    <div class="budget-history-actions">
                        <button class="btn btn-sm view-budget-detail" data-id="${history.id}">
                            <i class="fas fa-search"></i> 查看詳情
                        </button>
                        <button class="btn btn-sm btn-danger delete-budget-history" data-id="${history.id}">
                            <i class="fas fa-trash"></i> 刪除
                        </button>
                    </div>
                </div>
            `;
        });
        
        // 更新模態框內容
        budgetHistoryModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>預算歷史記錄</h3>
                    <span class="close-button">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="budget-history-list">
                        ${historyListHTML || '<p class="empty-message">無預算歷史記錄</p>'}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-cancel">關閉</button>
                </div>
            </div>
        `;
        
        // 綁定關閉按鈕事件
        budgetHistoryModal.querySelector('.close-button').addEventListener('click', function() {
            closeCurrentModal();
        });
        
        budgetHistoryModal.querySelector('.modal-cancel').addEventListener('click', function() {
            closeCurrentModal();
        });
        
        // 綁定查看詳情按鈕事件
        budgetHistoryModal.querySelectorAll('.view-budget-detail').forEach(button => {
            button.addEventListener('click', function() {
                const historyId = this.getAttribute('data-id');
                viewBudgetDetail(historyId);
            });
        });
        
        // 綁定刪除按鈕事件
        budgetHistoryModal.querySelectorAll('.delete-budget-history').forEach(button => {
            button.addEventListener('click', function() {
                const historyId = this.getAttribute('data-id');
                deleteBudgetHistory(historyId);
            });
        });
        
        // 顯示模態框
        openModal('budgetHistoryModal');
    } catch (error) {
        console.error("查看預算歷史時發生錯誤:", error);
        showToast('查看預算歷史失敗: ' + error.message, 'error');
    }
}

/**
 * 查看預算詳情
 * @param {string} historyId 歷史記錄ID
 */
function viewBudgetDetail(historyId) {
    console.log(`查看預算詳情: ${historyId}`);
    
    try {
        // 查找預算歷史
        const budgetHistory = appState.budgets.history.find(h => h.id === historyId);
        
        if (!budgetHistory) {
            showToast('找不到預算記錄', 'error');
            return;
        }
        
        // 創建詳情模態框
        let budgetDetailModal = document.getElementById('budgetDetailModal');
        
        if (!budgetDetailModal) {
            budgetDetailModal = document.createElement('div');
            budgetDetailModal.id = 'budgetDetailModal';
            budgetDetailModal.className = 'modal';
            
            document.body.appendChild(budgetDetailModal);
        }
        
        // 生成類別預算列表
        let categoriesHTML = '';
        
        if (budgetHistory.categories && budgetHistory.categories.length > 0) {
            budgetHistory.categories.forEach(budget => {
                // 找到類別
                const category = appState.categories.expense.find(c => c.id === budget.categoryId);
                
                if (!category) {
                    categoriesHTML += `
                        <div class="budget-category-item">
                            <div class="budget-category-name">未知類別</div>
                            <div class="budget-category-amount">${formatCurrency(budget.amount)}</div>
                        </div>
                    `;
                    return;
                }
                
                // 添加類別預算項目
                categoriesHTML += `
                    <div class="budget-category-item">
                        <div class="budget-category-info">
                            <span class="budget-category-icon" style="color: ${category.color}">
                                <i class="${category.icon}"></i>
                            </span>
                            <span class="budget-category-name">${category.name}</span>
                        </div>
                        <div class="budget-category-amount">${formatCurrency(budget.amount)}</div>
                    </div>
                `;
            });
        } else {
            categoriesHTML = '<p class="empty-message">未設置類別預算</p>';
        }
        
        // 格式化日期範圍
        let dateRangeHTML = '';
        if (budgetHistory.startDate && budgetHistory.endDate) {
            dateRangeHTML = `
                <div class="detail-item">
                    <span class="detail-label">預算期間:</span>
                    <span class="detail-value">${formatDate(budgetHistory.startDate)} ~ ${formatDate(budgetHistory.endDate)}</span>
                </div>
            `;
        } else if (budgetHistory.startDate) {
            dateRangeHTML = `
                <div class="detail-item">
                    <span class="detail-label">預算開始日:</span>
                    <span class="detail-value">${formatDate(budgetHistory.startDate)}</span>
                </div>
            `;
        }
        
        // 格式化重置週期
        let resetCycleText = '';
        switch (budgetHistory.resetCycle) {
            case 'daily': resetCycleText = '每日'; break;
            case 'weekly': resetCycleText = '每週'; break;
            case 'monthly': resetCycleText = `每月${budgetHistory.resetDay}日`; break;
            default: resetCycleText = '未設置';
        }
        
        // 更新模態框內容
        budgetDetailModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>預算詳情</h3>
                    <span class="close-button">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="budget-detail-summary">
                        <div class="detail-item">
                            <span class="detail-label">總預算:</span>
                            <span class="detail-value">${formatCurrency(budgetHistory.total)}</span>
                        </div>
                        ${dateRangeHTML}
                        <div class="detail-item">
                            <span class="detail-label">重置週期:</span>
                            <span class="detail-value">${resetCycleText}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">創建時間:</span>
                            <span class="detail-value">${new Date(budgetHistory.createdAt).toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <h4>類別預算</h4>
                    <div class="budget-categories-list">
                        ${categoriesHTML}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary view-transactions" data-id="${historyId}">查看交易記錄</button>
                    <button class="btn btn-primary restore-budget" data-id="${historyId}">恢復此預算</button>
                    <button class="btn btn-secondary modal-cancel">關閉</button>
                </div>
            </div>
        `;
        
        // 綁定關閉按鈕事件
        budgetDetailModal.querySelector('.close-button').addEventListener('click', function() {
            closeCurrentModal();
        });
        
        budgetDetailModal.querySelector('.modal-cancel').addEventListener('click', function() {
            closeCurrentModal();
        });
        
        // 綁定查看交易記錄按鈕
        budgetDetailModal.querySelector('.view-transactions').addEventListener('click', function() {
            const historyId = this.getAttribute('data-id');
            closeCurrentModal(); // 先關閉當前模態框
            viewBudgetTransactions(historyId);
        });
        
        // 綁定恢復預算按鈕事件
        budgetDetailModal.querySelector('.restore-budget').addEventListener('click', function() {
            const historyId = this.getAttribute('data-id');
            restoreBudget(historyId);
        });
        
        // 顯示模態框
        openModal('budgetDetailModal');
    } catch (error) {
        console.error("查看預算詳情時發生錯誤:", error);
        showToast('查看預算詳情失敗: ' + error.message, 'error');
    }
}

/**
 * 恢復歷史預算
 * @param {string} historyId 歷史記錄ID
 */
function restoreBudget(historyId) {
    console.log(`恢復預算: ${historyId}`);
    
    try {
        // 查找預算歷史
        const budgetHistory = appState.budgets.history.find(h => h.id === historyId);
        
        if (!budgetHistory) {
            showToast('找不到預算記錄', 'error');
            return;
        }
        
        // 確認恢復
        showConfirmDialog('確定要恢復此預算嗎？當前預算設置將被覆蓋。', () => {
            // 將歷史預算應用到當前預算
            appState.budgets.total = budgetHistory.total;
            appState.budgets.resetCycle = budgetHistory.resetCycle;
            appState.budgets.resetDay = budgetHistory.resetDay;
            appState.budgets.startDate = budgetHistory.startDate;
            appState.budgets.endDate = budgetHistory.endDate;
            
            // 恢復類別預算
            if (budgetHistory.categories) {
                appState.budgets.categories = JSON.parse(JSON.stringify(budgetHistory.categories));
            }
            
            // 計算是否為自動計算預算
            const calculatedTotal = calculateTotalCategoryBudget();
            appState.budgets.autoCalculate = (calculatedTotal === budgetHistory.total);
            
            // 保存到本地存儲
            saveToLocalStorage();
            
            // 執行同步(如果啟用)
            if (enableFirebase && isLoggedIn) {
                syncToFirebase();
            }
            
            // 更新UI
            updateBudgetsUI();
            
            // 關閉模態框
            closeCurrentModal();
            
            // 顯示成功消息
            showToast('預算已恢復', 'success');
        });
    } catch (error) {
        console.error("恢復預算時發生錯誤:", error);
        showToast('恢復預算失敗: ' + error.message, 'error');
    }
}

/**
 * 刪除預算歷史記錄
 * @param {string} historyId 歷史記錄ID
 */
function deleteBudgetHistory(historyId) {
    console.log(`刪除預算歷史: ${historyId}`);
    
    try {
        // 確認刪除
        showConfirmDialog('確定要刪除此預算歷史記錄嗎？', () => {
            // 刪除歷史記錄
            appState.budgets.history = appState.budgets.history.filter(h => h.id !== historyId);
            
            // 保存到本地存儲
            saveToLocalStorage();
            
            // 執行同步(如果啟用)
            if (enableFirebase && isLoggedIn) {
                syncToFirebase();
            }
            
            // 重新載入預算歷史視圖
            viewBudgetHistory();
            
            // 顯示成功消息
            showToast('預算歷史已刪除', 'success');
        });
    } catch (error) {
        console.error("刪除預算歷史時發生錯誤:", error);
        showToast('刪除預算歷史失敗: ' + error.message, 'error');
    }
}

/**
 * 格式化日期
 * @param {string} dateString YYYY-MM-DD格式日期
 * @returns {string} 格式化後的日期
 */
function formatDate(dateString) {
    try {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    } catch {
        return dateString;
    }
}

/**
 * 查看預算交易記錄
 * @param {string} historyId 歷史記錄ID
 */
function viewBudgetTransactions(historyId) {
    console.log(`查看預算交易記錄: ${historyId}`);
    
    try {
        // 查找預算歷史
        const budgetHistory = appState.budgets.history.find(h => h.id === historyId);
        
        if (!budgetHistory) {
            showToast('找不到預算記錄', 'error');
            return;
        }
        
        // 創建交易記錄模態框
        let budgetTransactionsModal = document.getElementById('budgetTransactionsModal');
        
        if (!budgetTransactionsModal) {
            budgetTransactionsModal = document.createElement('div');
            budgetTransactionsModal.id = 'budgetTransactionsModal';
            budgetTransactionsModal.className = 'modal';
            
            document.body.appendChild(budgetTransactionsModal);
        }
        
        // 獲取預算期間的交易
        const startDate = budgetHistory.startDate;
        const endDate = budgetHistory.endDate || (new Date(budgetHistory.createdAt)).toISOString().split('T')[0];
        
        // 篩選交易記錄
        const budgetTransactions = appState.transactions.filter(t => 
            t.type === 'expense' &&
            t.categoryId !== 'transfer_out' &&
            t.date >= startDate &&
            t.date <= endDate
        );
        
        // 排序交易記錄（按日期降序）
        budgetTransactions.sort((a, b) => b.date.localeCompare(a.date));
        
        // 生成交易記錄HTML
        let transactionsHTML = '';
        
        if (budgetTransactions.length > 0) {
            budgetTransactions.forEach(transaction => {
                // 獲取賬戶
                const account = appState.accounts.find(a => a.id === transaction.accountId);
                
                // 獲取類別
                const category = appState.categories.expense.find(c => c.id === transaction.categoryId);
                
                // 格式化日期
                const formattedDate = formatDate(transaction.date);
                
                // 添加交易項目
                transactionsHTML += `
                    <div class="budget-transaction-item">
                        <div class="transaction-date">${formattedDate}</div>
                        <div class="transaction-category" style="color: ${category ? category.color : '#666'}">
                            <i class="${category ? category.icon : 'fas fa-question-circle'}"></i>
                            ${category ? category.name : '未知類別'}
                        </div>
                        <div class="transaction-account">${account ? account.name : '未知賬戶'}</div>
                        <div class="transaction-amount">${formatCurrency(transaction.amount, account ? account.currency : defaultCurrency)}</div>
                        ${transaction.note ? `<div class="transaction-note">${transaction.note}</div>` : ''}
                    </div>
                `;
            });
        } else {
            transactionsHTML = '<p class="empty-message">此預算期間沒有交易記錄</p>';
        }
        
        // 更新模態框內容
        budgetTransactionsModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>預算交易記錄</h3>
                    <span class="close-button">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="budget-period-info">
                        <p>預算期間: ${startDate ? formatDate(startDate) : '無開始日期'} ~ ${endDate ? formatDate(endDate) : '無結束日期'}</p>
                        <p>交易記錄總數: ${budgetTransactions.length}</p>
                    </div>
                    <div class="budget-transactions-list">
                        ${transactionsHTML}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-cancel">關閉</button>
                </div>
            </div>
        `;
        
        // 綁定關閉按鈕事件
        budgetTransactionsModal.querySelector('.close-button').addEventListener('click', function() {
            closeCurrentModal();
        });
        
        budgetTransactionsModal.querySelector('.modal-cancel').addEventListener('click', function() {
            closeCurrentModal();
        });
        
        // 顯示模態框
        openModal('budgetTransactionsModal');
    } catch (error) {
        console.error("查看預算交易記錄時發生錯誤:", error);
        showToast('查看交易記錄失敗: ' + error.message, 'error');
    }
}

/**
 * 載入指定月份的預算
 */
function loadMonthlyBudget() {
    console.log("載入月度預算");
    
    try {
        const selectedMonth = document.getElementById('budgetMonth').value;
        if (!selectedMonth) {
            showToast('請選擇月份', 'error');
            return;
        }
        
        // 初始化月度預算結構
        if (!appState.budgets.monthly) {
            appState.budgets.monthly = {};
        }
        
        // 檢查是否已有該月預算
        if (appState.budgets.monthly[selectedMonth]) {
            // 填充表單
            const monthlyBudget = appState.budgets.monthly[selectedMonth];
            document.getElementById('totalBudget').value = monthlyBudget.total || 0;
            document.getElementById('autoCalculateBudget').checked = monthlyBudget.autoCalculate || false;
            
            if (monthlyBudget.startDate) {
                document.getElementById('budgetStartDate').value = monthlyBudget.startDate;
            }
            
            if (monthlyBudget.endDate) {
                document.getElementById('budgetEndDate').value = monthlyBudget.endDate;
            }
            
            // 更新類別預算的月份選擇
            const categoryMonthInput = document.getElementById('budgetCategoryMonth');
            if (categoryMonthInput) {
                categoryMonthInput.value = selectedMonth;
                // 觸發變更事件以更新類別預算列表
                const event = new Event('change');
                categoryMonthInput.dispatchEvent(event);
            }
            
            showToast(`已載入 ${formatYearMonth(selectedMonth)} 的預算設置`, 'success');
        } else {
            // 創建新的月度預算
            appState.budgets.monthly[selectedMonth] = {
                total: 0,
                categories: [],
                autoCalculate: appState.budgets.autoCalculate,
                startDate: null,
                endDate: null,
                createdAt: new Date().toISOString()
            };
            
            // 自動設置默認的開始和結束日期（當月第一天到最後一天）
            const [year, month] = selectedMonth.split('-');
            const firstDay = `${year}-${month}-01`;
            const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
            const lastDate = `${year}-${month}-${lastDay}`;
            
            appState.budgets.monthly[selectedMonth].startDate = firstDay;
            appState.budgets.monthly[selectedMonth].endDate = lastDate;
            
            // 更新表單
            document.getElementById('totalBudget').value = 0;
            document.getElementById('budgetStartDate').value = firstDay;
            document.getElementById('budgetEndDate').value = lastDate;
            
            // 更新類別預算的月份選擇
            const categoryMonthInput = document.getElementById('budgetCategoryMonth');
            if (categoryMonthInput) {
                categoryMonthInput.value = selectedMonth;
                // 觸發變更事件以更新類別預算列表
                const event = new Event('change');
                categoryMonthInput.dispatchEvent(event);
            }
            
            // 保存到本地存儲
            saveToLocalStorage();
            
            showToast(`已創建 ${formatYearMonth(selectedMonth)} 的新預算設置`, 'success');
        }
        
        // 更新預算進度和類別預算列表
        updateBudgetProgress();
    } catch (error) {
        console.error("載入月度預算時發生錯誤:", error);
        showToast('載入月度預算失敗: ' + error.message, 'error');
    }
}

/**
 * 更新月度預算列表
 */
function updateMonthlyBudgetsList() {
    console.log("更新月度預算列表");
    
    try {
        const container = document.getElementById('monthlyBudgetsList');
        if (!container) return;
        
        // 檢查是否有月度預算設置
        if (!appState.budgets.monthlySettings || Object.keys(appState.budgets.monthlySettings).length === 0) {
            container.innerHTML = '<p class="empty-message">尚未設置月度預算</p>';
            return;
        }
        
        // 獲取所有月份設置並排序 (最新的在前)
        const months = Object.keys(appState.budgets.monthlySettings).sort().reverse();
        let html = '<div class="monthly-budgets-grid">';
        
        months.forEach(month => {
            const budget = appState.budgets.monthlySettings[month];
            const categoryCount = budget.categories ? budget.categories.length : 0;
            
            html += `
                <div class="monthly-budget-item" data-month="${month}">
                    <div class="monthly-budget-header">
                        <div class="monthly-budget-month">${formatYearMonth(month)}</div>
                        <div class="monthly-budget-total">${formatCurrency(budget.total || 0)}</div>
                    </div>
                    <div class="monthly-budget-info">
                        <div>類別預算: ${categoryCount}個</div>
                    </div>
                    <div class="monthly-budget-actions">
                        <button class="btn btn-sm edit-monthly-budget" data-month="${month}">
                            <i class="fas fa-edit"></i> 設置
                        </button>
                        <button class="btn btn-sm btn-danger delete-monthly-budget" data-month="${month}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
        
        // 綁定按鈕事件
        container.querySelectorAll('.edit-monthly-budget').forEach(button => {
            button.addEventListener('click', function() {
                const month = this.getAttribute('data-month');
                editMonthlyBudget(month);
            });
        });
        
        container.querySelectorAll('.delete-monthly-budget').forEach(button => {
            button.addEventListener('click', function() {
                const month = this.getAttribute('data-month');
                deleteMonthlyBudget(month);
            });
        });
    } catch (error) {
        console.error("更新月度預算列表時發生錯誤:", error);
        const container = document.getElementById('monthlyBudgetsList');
        if (container) {
            container.innerHTML = '<p class="error-message">載入月度預算列表失敗</p>';
        }
    }
}

/**
 * 編輯月度預算
 * @param {string} month 月份 (YYYY-MM 格式)
 */
function editMonthlyBudget(month) {
    console.log(`編輯月度預算: ${month}`);
    
    try {
        // 設置月份選擇
        const monthInput = document.getElementById('budgetMonth');
        if (monthInput) {
            monthInput.value = month;
        }
        
        // 載入該月預算
        loadMonthlyBudget();
        
        // 滾動到月度預算設置區域
        const monthlyBudgetCard = document.querySelector('.monthly-budget-form');
        if (monthlyBudgetCard) {
            monthlyBudgetCard.scrollIntoView({ behavior: 'smooth' });
        }
    } catch (error) {
        console.error("編輯月度預算時發生錯誤:", error);
        showToast('編輯月度預算失敗: ' + error.message, 'error');
    }
}

/**
 * 刪除月度預算
 * @param {string} month 月份 (YYYY-MM 格式)
 */
function deleteMonthlyBudget(month) {
    console.log(`刪除月度預算: ${month}`);
    
    try {
        showConfirmDialog(`確定要刪除 ${formatYearMonth(month)} 的預算設置嗎？`, () => {
            // 刪除該月預算
            if (appState.budgets.monthlySettings && appState.budgets.monthlySettings[month]) {
                delete appState.budgets.monthlySettings[month];
                
                // 保存到本地存儲
                saveToLocalStorage();
                
                // 更新月度預算列表
                updateMonthlyBudgetsList();
                
                // 更新類別預算列表
                updateCategoryBudgetsList(document.getElementById('budgetCategoryMonth').value);
                
                // 執行同步(如果啟用)
                if (enableFirebase && isLoggedIn) {
                    syncToFirebase();
                }
                
                showToast(`已刪除 ${formatYearMonth(month)} 的預算設置`, 'success');
            }
        });
    } catch (error) {
        console.error("刪除月度預算時發生錯誤:", error);
        showToast('刪除月度預算失敗: ' + error.message, 'error');
    }
}

/**
 * 保存月度預算設置
 */
function saveMonthlyBudget() {
    console.log("保存月度預算設置");
    
    try {
        const selectedMonth = document.getElementById('budgetMonth').value;
        if (!selectedMonth) {
            showToast('請選擇月份', 'error');
            return false;
        }
        
        const monthlyTotal = parseFloat(document.getElementById('monthlyTotalBudget').value);
        if (isNaN(monthlyTotal) || monthlyTotal < 0) {
            showToast('請輸入有效的預算金額', 'error');
            return false;
        }
        
        // 初始化月度設置對象
        if (!appState.budgets.monthlySettings) {
            appState.budgets.monthlySettings = {};
        }
        
        // 檢查是否已有該月設置
        if (!appState.budgets.monthlySettings[selectedMonth]) {
            appState.budgets.monthlySettings[selectedMonth] = {
                total: monthlyTotal,
                categories: []
            };
        } else {
            // 更新總預算
            appState.budgets.monthlySettings[selectedMonth].total = monthlyTotal;
        }
        
        // 保存到本地存儲
        saveToLocalStorage();
        
        // 更新月度預算列表
        updateMonthlyBudgetsList();
        
        // 執行同步(如果啟用)
        if (enableFirebase && isLoggedIn) {
            syncToFirebase();
        }
        
        showToast(`已保存 ${formatYearMonth(selectedMonth)} 的預算設置`, 'success');
        return true;
    } catch (error) {
        console.error("保存月度預算設置時發生錯誤:", error);
        showToast('保存月度預算設置失敗: ' + error.message, 'error');
        return false;
    }
}

/**
 * 格式化年月顯示
 * @param {string} yearMonth YYYY-MM 格式的年月
 * @returns {string} 格式化後的年月字符串
 */
function formatYearMonth(yearMonth) {
    try {
        const [year, month] = yearMonth.split('-');
        return `${year}年${month}月`;
    } catch (e) {
        return yearMonth;
    }
}

/**
 * 添加未來預算設置按鈕
 */
function addFutureBudgetButtons() {
    const monthlyBudgetFormContainer = document.querySelector('.monthly-budget-form');
    if (!monthlyBudgetFormContainer) return;
    
    // 創建未來月份按鈕容器
    const futureBudgetContainer = document.createElement('div');
    futureBudgetContainer.className = 'future-budget-container';
    futureBudgetContainer.innerHTML = `
        <div class="future-budget-header">
            <h4>快速設置未來預算</h4>
        </div>
        <div class="future-budget-buttons">
            <!-- 未來月份按鈕將在這裡生成 -->
        </div>
    `;
    
    // 添加到表單之後
    monthlyBudgetFormContainer.insertAdjacentElement('afterend', futureBudgetContainer);
    
    // 生成未來3個月的按鈕
    const buttonsContainer = futureBudgetContainer.querySelector('.future-budget-buttons');
    const now = new Date();
    
    for (let i = 1; i <= 3; i++) {
        const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const yearMonth = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`;
        const monthName = formatYearMonth(yearMonth);
        
        const button = document.createElement('button');
        button.className = 'btn future-month-btn';
        button.setAttribute('data-month', yearMonth);
        button.innerHTML = `<i class="fas fa-calendar-plus"></i> ${monthName}`;
        
        button.addEventListener('click', function() {
            const month = this.getAttribute('data-month');
            setupFutureMonth(month);
        });
        
        buttonsContainer.appendChild(button);
    }
    
    // 添加自定義月份按鈕
    const customButton = document.createElement('button');
    customButton.className = 'btn future-month-btn custom';
    customButton.innerHTML = `<i class="fas fa-calendar-alt"></i> 選擇其他月份`;
    
    customButton.addEventListener('click', function() {
        openCustomMonthPicker();
    });
    
    buttonsContainer.appendChild(customButton);
}

/**
 * 設置未來月份預算
 * @param {string} month 月份 (YYYY-MM 格式)
 */
function setupFutureMonth(month) {
    console.log(`設置未來月份預算: ${month}`);
    
    // 設置月份選擇
    const monthInput = document.getElementById('budgetMonth');
    if (monthInput) {
        monthInput.value = month;
    }
    
    // 滾動到月度預算設置區域
    const monthlyBudgetCard = document.querySelector('.monthly-budget-form');
    if (monthlyBudgetCard) {
        monthlyBudgetCard.scrollIntoView({ behavior: 'smooth' });
    }
    
    // 檢查該月是否已有預算設置
    if (appState.budgets.monthlySettings && appState.budgets.monthlySettings[month]) {
        // 載入該月預算
        loadMonthlyBudget();
        showToast(`正在編輯 ${formatYearMonth(month)} 的預算`, 'info');
    } else {
        // 提示是否要複製上一個月的預算設置
        const buttons = [
            {
                text: '複製上一個月',
                action: () => copyPreviousMonthBudget(month),
                type: 'primary'
            },
            {
                text: '建立新預算',
                action: () => {
                    // 清空預算表單
                    document.getElementById('monthlyTotalBudget').value = '';
                    showToast(`正在設置 ${formatYearMonth(month)} 的預算`, 'info');
                },
                type: 'secondary'
            }
        ];
        
        showOptionsDialog(`設置 ${formatYearMonth(month)} 預算`, '請選擇如何設置此月預算：', buttons);
    }
}

/**
 * 打開自定義月份選擇器
 */
function openCustomMonthPicker() {
    console.log("打開自定義月份選擇器");
    
    // 創建一個模態框，使用月份選擇器
    let customMonthModal = document.getElementById('customMonthModal');
    
    if (!customMonthModal) {
        customMonthModal = document.createElement('div');
        customMonthModal.id = 'customMonthModal';
        customMonthModal.className = 'modal';
        
        document.body.appendChild(customMonthModal);
    }
    
    // 獲取當前日期
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // 設置月份選擇範圍
    const startYear = currentYear;
    const endYear = currentYear + 2;
    
    // 生成年月選擇HTML
    let yearOptionsHTML = '';
    for (let year = startYear; year <= endYear; year++) {
        yearOptionsHTML += `<option value="${year}">${year}年</option>`;
    }
    
    let monthOptionsHTML = '';
    for (let month = 1; month <= 12; month++) {
        monthOptionsHTML += `<option value="${String(month).padStart(2, '0')}">${month}月</option>`;
    }
    
    // 更新模態框內容
    customMonthModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>選擇月份</h3>
                <span class="close-button">&times;</span>
            </div>
            <div class="modal-body">
                <div class="form-row">
                    <div class="form-group">
                        <label for="customYear">年份</label>
                        <select id="customYear" class="form-control">
                            ${yearOptionsHTML}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="customMonth">月份</label>
                        <select id="customMonth" class="form-control">
                            ${monthOptionsHTML}
                        </select>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button id="confirmCustomMonth" class="btn btn-primary">確認</button>
                <button class="btn btn-secondary modal-cancel">取消</button>
            </div>
        </div>
    `;
    
    // 綁定關閉按鈕事件
    customMonthModal.querySelector('.close-button').addEventListener('click', closeCurrentModal);
    customMonthModal.querySelector('.modal-cancel').addEventListener('click', closeCurrentModal);
    
    // 綁定確認按鈕事件
    const confirmButton = customMonthModal.querySelector('#confirmCustomMonth');
    confirmButton.addEventListener('click', function() {
        const year = document.getElementById('customYear').value;
        const month = document.getElementById('customMonth').value;
        const yearMonth = `${year}-${month}`;
        
        // 關閉模態框
        closeCurrentModal();
        
        // 設置該月預算
        setupFutureMonth(yearMonth);
    });
    
    // 設置默認值為下個月
    setTimeout(() => {
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        document.getElementById('customYear').value = nextMonth.getFullYear();
        document.getElementById('customMonth').value = String(nextMonth.getMonth() + 1).padStart(2, '0');
    }, 100);
    
    // 顯示模態框
    openModal('customMonthModal');
}

/**
 * 使用收入更新預算
 * @param {number} incomeAmount 收入金額
 */
function updateBudgetWithIncome(incomeAmount) {
    console.log(`使用收入更新預算: ${incomeAmount}`);
    
    try {
        // 獲取當前日期的年月
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        // 檢查是否有月度預算設置
        let targetBudget;
        let isMonthlyBudget = false;
        
        if (appState.budgets.monthlySettings && appState.budgets.monthlySettings[currentMonth]) {
            targetBudget = appState.budgets.monthlySettings[currentMonth];
            isMonthlyBudget = true;
        } else {
            targetBudget = appState.budgets;
        }
        
        // 更新總預算（如果非自動計算）
        if (!targetBudget.autoCalculate) {
            targetBudget.total += incomeAmount;
            
            // 保存到本地存儲
            saveToLocalStorage();
            
            // 更新UI (如在預算頁面)
            if (document.getElementById('budgets') && document.getElementById('budgets').classList.contains('active')) {
                if (isMonthlyBudget) {
                    updateMonthlyBudgetsList();
                    
                    // 如果當前顯示的是本月預算，更新顯示
                    const budgetMonthInput = document.getElementById('budgetMonth');
                    if (budgetMonthInput && budgetMonthInput.value === currentMonth) {
                        document.getElementById('monthlyTotalBudget').value = targetBudget.total;
                    }
                }
                
                updateBudgetProgress();
            }
            
            // 更新預算狀態卡片
            if (typeof updateBudgetStatus === 'function') {
                updateBudgetStatus();
            }
            
            // 執行同步(如果啟用)
            if (enableFirebase && isLoggedIn) {
                syncToFirebase();
            }
            
            console.log(`預算已更新: ${isMonthlyBudget ? '月度預算' : '總預算'} +${incomeAmount}`);
        } else {
            console.log("預算使用自動計算，不更新總預算");
        }
    } catch (error) {
        console.error("使用收入更新預算時發生錯誤:", error);
        // 不顯示錯誤通知，因為這是自動操作
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
window.saveBudgetHistory = saveBudgetHistory;
window.viewBudgetHistory = viewBudgetHistory;
window.viewBudgetDetail = viewBudgetDetail;
window.restoreBudget = restoreBudget;
window.deleteBudgetHistory = deleteBudgetHistory;
window.viewBudgetTransactions = viewBudgetTransactions;
window.getCurrentYearMonth = getCurrentYearMonth;
window.formatYearMonth = formatYearMonth;
window.loadMonthlyBudget = loadMonthlyBudget;
window.saveMonthlyBudget = saveMonthlyBudget;
window.updateMonthlyBudgetsList = updateMonthlyBudgetsList;
window.editMonthlyBudget = editMonthlyBudget;
window.deleteMonthlyBudget = deleteMonthlyBudget;
window.calculateMonthlyCategorySpent = calculateMonthlyCategorySpent;
window.calculateMonthlyTotalCategoryBudget = calculateMonthlyTotalCategoryBudget;
window.editCategoryBudget = editCategoryBudget;
window.updateCategoryBudget = updateCategoryBudget;
window.deleteCategoryBudget = deleteCategoryBudget;