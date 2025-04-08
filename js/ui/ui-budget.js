/**
 * ui-budget.js - 預算管理UI
 */

const UiBudget = {
    /**
     * 當前預算週期
     */
    currentPeriod: 'monthly',
    
    /**
     * 當前年份
     */
    currentYear: new Date().getFullYear(),
    
    /**
     * 當前月份
     */
    currentMonth: new Date().getMonth() + 1,
    
    /**
     * 當前季度
     */
    currentQuarter: Math.ceil((new Date().getMonth() + 1) / 3),
    
    /**
     * 初始化預算管理UI
     */
    init: function() {
        // 初始化預算頁籤
        this._initBudgetContent();
        
        console.log('預算管理UI初始化完成');
    },
    
    /**
     * 初始化預算頁面內容
     */
    _initBudgetContent: function() {
        const budgetTab = document.getElementById('budgets');
        
        // 建立頁面結構
        budgetTab.innerHTML = `
            <h2>預算設定</h2>
            
            <div class="budget-controls">
                <div class="budget-period-selector">
                    <button id="monthlyBudgetBtn" class="btn btn-sm active" data-period="monthly">月度預算</button>
                    <button id="quarterlyBudgetBtn" class="btn btn-sm" data-period="quarterly">季度預算</button>
                    <button id="yearlyBudgetBtn" class="btn btn-sm" data-period="yearly">年度預算</button>
                </div>
                
                <div class="budget-date-selector">
                    <button id="prevPeriodBtn" class="btn btn-sm"><i class="fas fa-chevron-left"></i></button>
                    <span id="currentPeriodText">2025年4月</span>
                    <button id="nextPeriodBtn" class="btn btn-sm"><i class="fas fa-chevron-right"></i></button>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3>新增預算</h3>
                </div>
                <div class="card-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="budgetCategory">類別</label>
                            <select id="budgetCategory" class="form-control">
                                <option value="" disabled selected>選擇類別</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="budgetAmount">預算金額</label>
                            <input type="number" id="budgetAmount" class="form-control" min="0" step="0.01">
                        </div>
                    </div>
                    <button id="saveBudgetButton" class="btn btn-primary">新增預算</button>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3>當前預算</h3>
                </div>
                <div id="budgetList" class="card-body">
                    <p class="empty-message">尚未設定預算</p>
                </div>
            </div>
        `;
        
        // 綁定事件
        this._bindBudgetEvents();
        
        // 更新類別下拉框
        this._updateCategoryOptions();
        
        // 更新期間文字
        this._updatePeriodText();
    },
    
    /**
     * 綁定預算事件
     */
    _bindBudgetEvents: function() {
        // 預算週期按鈕
        document.getElementById('monthlyBudgetBtn').addEventListener('click', () => {
            this._changePeriod('monthly');
        });
        
        document.getElementById('quarterlyBudgetBtn').addEventListener('click', () => {
            this._changePeriod('quarterly');
        });
        
        document.getElementById('yearlyBudgetBtn').addEventListener('click', () => {
            this._changePeriod('yearly');
        });
        
        // 上/下期按鈕
        document.getElementById('prevPeriodBtn').addEventListener('click', () => {
            this._navigatePeriod('prev');
        });
        
        document.getElementById('nextPeriodBtn').addEventListener('click', () => {
            this._navigatePeriod('next');
        });
        
        // 保存預算按鈕
        document.getElementById('saveBudgetButton').addEventListener('click', () => {
            this._saveBudget();
        });
        
        // 預算列表事件委派
        document.getElementById('budgetList').addEventListener('click', (event) => {
            const target = event.target.closest('.edit-budget, .delete-budget');
            if (!target) return;
            
            const budgetId = target.dataset.id;
            
            if (target.classList.contains('edit-budget')) {
                this._showEditBudgetModal(budgetId);
            } else if (target.classList.contains('delete-budget')) {
                this._deleteBudget(budgetId);
            }
        });
    },
    
    /**
     * 更新類別下拉框
     */
    _updateCategoryOptions: function() {
        // 取得支出類別
        const categories = Store.getCategories('expense');
        const categorySelect = document.getElementById('budgetCategory');
        
        // 清空選項
        categorySelect.innerHTML = '<option value="" disabled selected>選擇類別</option>';
        
        // 如果沒有類別，顯示提示訊息
        if (categories.length === 0) {
            categorySelect.innerHTML += '<option value="" disabled>請先新增支出類別</option>';
            return;
        }
        
        // 添加選項
        categories.sort((a, b) => a.order - b.order).forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
    },
    
    /**
     * 更新期間文字
     */
    _updatePeriodText: function() {
        const textElement = document.getElementById('currentPeriodText');
        
        if (this.currentPeriod === 'monthly') {
            textElement.textContent = `${this.currentYear}年${this.currentMonth}月`;
        } else if (this.currentPeriod === 'quarterly') {
            textElement.textContent = `${this.currentYear}年第${this.currentQuarter}季度`;
        } else if (this.currentPeriod === 'yearly') {
            textElement.textContent = `${this.currentYear}年`;
        }
    },
    
    /**
     * 切換預算週期
     */
    _changePeriod: function(period) {
        this.currentPeriod = period;
        
        // 更新按鈕樣式
        document.getElementById('monthlyBudgetBtn').classList.toggle('active', period === 'monthly');
        document.getElementById('quarterlyBudgetBtn').classList.toggle('active', period === 'quarterly');
        document.getElementById('yearlyBudgetBtn').classList.toggle('active', period === 'yearly');
        
        // 更新期間文字
        this._updatePeriodText();
        
        // 重新整理預算清單
        this._refreshBudgetList();
    },
    
    /**
     * 導航至上/下期
     */
    _navigatePeriod: function(direction) {
        if (this.currentPeriod === 'monthly') {
            if (direction === 'prev') {
                this.currentMonth--;
                if (this.currentMonth < 1) {
                    this.currentMonth = 12;
                    this.currentYear--;
                }
            } else {
                this.currentMonth++;
                if (this.currentMonth > 12) {
                    this.currentMonth = 1;
                    this.currentYear++;
                }
            }
        } else if (this.currentPeriod === 'quarterly') {
            if (direction === 'prev') {
                this.currentQuarter--;
                if (this.currentQuarter < 1) {
                    this.currentQuarter = 4;
                    this.currentYear--;
                }
            } else {
                this.currentQuarter++;
                if (this.currentQuarter > 4) {
                    this.currentQuarter = 1;
                    this.currentYear++;
                }
            }
        } else if (this.currentPeriod === 'yearly') {
            if (direction === 'prev') {
                this.currentYear--;
            } else {
                this.currentYear++;
            }
        }
        
        // 更新期間文字
        this._updatePeriodText();
        
        // 重新整理預算清單
        this._refreshBudgetList();
    },
    
    /**
     * 保存預算
     */
    _saveBudget: function() {
        // 取得表單資料
        const categoryId = document.getElementById('budgetCategory').value;
        const amount = parseFloat(document.getElementById('budgetAmount').value);
        
        // 驗證
        if (!categoryId) {
            Utils.showToast('請選擇類別', 'error');
            return;
        }
        
        if (isNaN(amount) || amount <= 0) {
            Utils.showToast('請輸入有效的預算金額', 'error');
            return;
        }
        
        // 準備預算資料
        const budgetData = {
            categoryId,
            amount,
            period: this.currentPeriod,
            year: this.currentYear
        };
        
        // 添加特定週期資料
        if (this.currentPeriod === 'monthly') {
            budgetData.month = this.currentMonth;
        } else if (this.currentPeriod === 'quarterly') {
            budgetData.quarter = this.currentQuarter;
        }
        
        // 儲存預算
        const result = App.addBudget(budgetData);
        
        // 處理結果
        if (result) {
            // 重設表單
            document.getElementById('budgetCategory').value = '';
            document.getElementById('budgetAmount').value = '';
            
            // 重新整理預算清單
            this._refreshBudgetList();
            
            // 更新儀表板
            UiDashboard.refreshBudgetStatus();
        }
    },
    
    /**
     * 顯示編輯預算模態框
     */
    _showEditBudgetModal: function(budgetId) {
        // 尚未實現
        alert('編輯預算功能即將推出');
    },
    
    /**
     * 刪除預算
     */
    _deleteBudget: function(budgetId) {
        // 確認刪除
        if (!confirm('確定要刪除此預算嗎？此操作無法復原。')) {
            return;
        }
        
        // 執行刪除
        const result = App.deleteBudget(budgetId);
        
        // 處理結果
        if (result) {
            this._refreshBudgetList();
            
            // 更新儀表板
            UiDashboard.refreshBudgetStatus();
        }
    },
    
    /**
     * 重新整理預算清單
     */
    _refreshBudgetList: function() {
        // 取得當前週期的預算
        let budgets;
        
        if (this.currentPeriod === 'monthly') {
            budgets = Store.getBudgets('monthly', this.currentYear, this.currentMonth);
        } else if (this.currentPeriod === 'quarterly') {
            budgets = Store.getBudgets('quarterly', this.currentYear, null, this.currentQuarter);
        } else if (this.currentPeriod === 'yearly') {
            budgets = Store.getBudgets('yearly', this.currentYear);
        }
        
        // 取得使用狀態
        const budgetUsages = budgets.map(budget => Store.getBudgetUsage(budget.id));
        
        // 顯示預算
        this._displayBudgets(budgetUsages);
    },
    
    /**
     * 顯示預算清單
     */
    _displayBudgets: function(budgetUsages) {
        const budgetList = document.getElementById('budgetList');
        
        // 清空列表
        budgetList.innerHTML = '';
        
        // 如果沒有預算，顯示提示訊息
        if (budgetUsages.length === 0) {
            budgetList.innerHTML = '<p class="empty-message">尚未設定預算</p>';
            return;
        }
        
        // 顯示預算
        budgetUsages.forEach(usage => {
            if (!usage.category) return;
            
            // 計算進度條顏色
            let progressColor = 'var(--primary-color)';
            if (usage.percentage >= 90) {
                progressColor = 'var(--danger-color)';
            } else if (usage.percentage >= 70) {
                progressColor = 'var(--warning-color)';
            }
            
            const budgetHtml = `
                <div class="budget-item" data-id="${usage.budget.id}">
                    <div class="budget-category">
                        <div class="budget-category-icon" style="background-color: ${usage.category.color}20; color: ${usage.category.color}">
                            <i class="fas fa-${usage.category.icon}"></i>
                        </div>
                        <div class="budget-category-name">${usage.category.name}</div>
                    </div>
                    <div class="budget-amount">
                        已使用 ${Utils.formatCurrency(usage.totalExpense, Store.settings.defaultCurrency)} / ${Utils.formatCurrency(usage.budget.amount, Store.settings.defaultCurrency)}
                    </div>
                    <div class="budget-progress-container">
                        <div class="budget-progress-bar" style="width: ${usage.percentage}%; background-color: ${progressColor}"></div>
                    </div>
                    <div class="budget-info">
                        <div>剩餘: ${Utils.formatCurrency(usage.remaining, Store.settings.defaultCurrency)}</div>
                        <div>${Math.round(usage.percentage)}%</div>
                    </div>
                    <div class="budget-actions">
                        <button class="btn-icon edit-budget" title="編輯" data-id="${usage.budget.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete-budget" title="刪除" data-id="${usage.budget.id}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;
            
            budgetList.innerHTML += budgetHtml;
        });
    },
    
    /**
     * 重新整理 UI
     */
    refresh: function() {
        this._updateCategoryOptions();
        this._refreshBudgetList();
    }
};