/**
 * ui-categories.js - 類別管理UI
 */

const UiCategories = {
    /**
     * 當前類別類型 (income/expense)
     */
    currentType: 'income',
    
    /**
     * 初始化類別管理UI
     */
    init: function() {
        console.log('開始初始化類別管理UI');
        
        // 初始化類別頁籤
        this._initCategoryTabs();
        
        // 初始化視圖切換
        this._initViewToggle();
        
        // 初始化新增類別按鈕
        this._bindAddCategoryButtons();
        
        // 初始化保存類別按鈕
        document.getElementById('saveCategoryButton').addEventListener('click', () => {
            this.saveCategory();
        });
        
        // 初始化圖標選擇
        this._initIconSelector();
        
        // 綁定類別操作事件
        this._bindCategoryEvents();
        
        // 產生圖標網格
        UiCore.generateIconGrid();
        
        // 確保初始狀態下正確顯示類別頁籤
        this._ensureCategoryTabsVisibility();
        
        console.log('類別管理UI初始化完成');
    },
    
    /**
     * 確保類別頁籤正確顯示
     */
    _ensureCategoryTabsVisibility: function() {
        // 獲取頁籤元素
        const incomeCategoryTab = document.getElementById('incomeCategoryTab');
        const expenseCategoryTab = document.getElementById('expenseCategoryTab');
        
        if (!incomeCategoryTab || !expenseCategoryTab) {
            console.error('找不到類別頁籤元素');
            return;
        }
        
        // 根據當前選擇的類型顯示相應頁籤
        if (this.currentType === 'income') {
            incomeCategoryTab.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important;';
            expenseCategoryTab.style.cssText = 'display: none !important;';
            
            document.getElementById('incomeCategoryTabButton').classList.add('active');
            document.getElementById('expenseCategoryTabButton').classList.remove('active');
        } else {
            expenseCategoryTab.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important;';
            incomeCategoryTab.style.cssText = 'display: none !important;';
            
            document.getElementById('incomeCategoryTabButton').classList.remove('active');
            document.getElementById('expenseCategoryTabButton').classList.add('active');
        }
        
        console.log('已設置初始類別頁籤可見性');
    },
    
    /**
     * 綁定添加類別按鈕
     */
    _bindAddCategoryButtons: function() {
        console.log('綁定添加類別按鈕');
        
        // 收入類別添加按鈕
        const addIncomeBtn = document.getElementById('addIncomeCategoryButton');
        if (addIncomeBtn) {
            // 移除可能的舊事件 (通過克隆替換)
            const newAddIncomeBtn = addIncomeBtn.cloneNode(true);
            addIncomeBtn.parentNode.replaceChild(newAddIncomeBtn, addIncomeBtn);
            
            newAddIncomeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('點擊添加收入類別按鈕');
                this.showAddCategoryModal('income');
            });
        } else {
            console.error('找不到收入類別添加按鈕');
        }
        
        // 支出類別添加按鈕
        const addExpenseBtn = document.getElementById('addExpenseCategoryButton');
        if (addExpenseBtn) {
            // 移除可能的舊事件 (通過克隆替換)
            const newAddExpenseBtn = addExpenseBtn.cloneNode(true);
            addExpenseBtn.parentNode.replaceChild(newAddExpenseBtn, addExpenseBtn);
            
            newAddExpenseBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('點擊添加支出類別按鈕');
                this.showAddCategoryModal('expense');
            });
        } else {
            console.error('找不到支出類別添加按鈕');
        }
    },
    
    /**
     * 初始化類別頁籤
     */
    _initCategoryTabs: function() {
        console.log('初始化類別頁籤');
        
        // 獲取頁籤按鈕
        const incomeCatBtn = document.getElementById('incomeCategoryTabButton');
        const expenseCatBtn = document.getElementById('expenseCategoryTabButton');
        
        if (!incomeCatBtn || !expenseCatBtn) {
            console.error('找不到類別頁籤按鈕');
            return;
        }
        
        // 移除可能的舊事件監聽器 (通過克隆替換)
        const newIncomeCatBtn = incomeCatBtn.cloneNode(true);
        const newExpenseCatBtn = expenseCatBtn.cloneNode(true);
        
        incomeCatBtn.parentNode.replaceChild(newIncomeCatBtn, incomeCatBtn);
        expenseCatBtn.parentNode.replaceChild(newExpenseCatBtn, expenseCatBtn);
        
        // 重新添加事件監聽器
        newIncomeCatBtn.addEventListener('click', () => {
            console.log('切換到收入類別頁籤');
            newIncomeCatBtn.classList.add('active');
            newExpenseCatBtn.classList.remove('active');
            
            const incomeCatTab = document.getElementById('incomeCategoryTab');
            const expenseCatTab = document.getElementById('expenseCategoryTab');
            
            if (incomeCatTab && expenseCatTab) {
                incomeCatTab.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important;';
                expenseCatTab.style.cssText = 'display: none !important;';
            }
            
            this.currentType = 'income';
            
            // 如果有打開的編輯模態框，則關閉它
            const modal = document.getElementById('addCategoryModal');
            if (modal && modal.style.display === 'block') {
                UiCore.closeModal('addCategoryModal');
            }
        });
        
        newExpenseCatBtn.addEventListener('click', () => {
            console.log('切換到支出類別頁籤');
            newIncomeCatBtn.classList.remove('active');
            newExpenseCatBtn.classList.add('active');
            
            const incomeCatTab = document.getElementById('incomeCategoryTab');
            const expenseCatTab = document.getElementById('expenseCategoryTab');
            
            if (incomeCatTab && expenseCatTab) {
                incomeCatTab.style.cssText = 'display: none !important;';
                expenseCatTab.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important;';
            }
            
            this.currentType = 'expense';
            
            // 如果有打開的編輯模態框，則關閉它
            const modal = document.getElementById('addCategoryModal');
            if (modal && modal.style.display === 'block') {
                UiCore.closeModal('addCategoryModal');
            }
        });
    },
    
    /**
     * 初始化視圖切換
     */
    _initViewToggle: function() {
        // 收入類別視圖切換
        document.getElementById('incomeCategoryCardView').addEventListener('click', () => {
            document.getElementById('incomeCategoryCardView').classList.add('active');
            document.getElementById('incomeCategoryListView').classList.remove('active');
            document.getElementById('incomeCategoriesList').className = 'categories-list card-view';
        });
        
        document.getElementById('incomeCategoryListView').addEventListener('click', () => {
            document.getElementById('incomeCategoryCardView').classList.remove('active');
            document.getElementById('incomeCategoryListView').classList.add('active');
            document.getElementById('incomeCategoriesList').className = 'categories-list list-view';
        });
        
        // 支出類別視圖切換
        document.getElementById('expenseCategoryCardView').addEventListener('click', () => {
            document.getElementById('expenseCategoryCardView').classList.add('active');
            document.getElementById('expenseCategoryListView').classList.remove('active');
            document.getElementById('expenseCategoriesList').className = 'categories-list card-view';
        });
        
        document.getElementById('expenseCategoryListView').addEventListener('click', () => {
            document.getElementById('expenseCategoryCardView').classList.remove('active');
            document.getElementById('expenseCategoryListView').classList.add('active');
            document.getElementById('expenseCategoriesList').className = 'categories-list list-view';
        });
    },
    
    /**
     * 初始化圖標選擇
     */
    _initIconSelector: function() {
        document.getElementById('selectIconButton').addEventListener('click', () => {
            const iconGrid = document.getElementById('iconGrid');
            if (iconGrid.style.display === 'none' || iconGrid.style.display === '') {
                iconGrid.style.display = 'grid';
            } else {
                iconGrid.style.display = 'none';
            }
        });
    },
    
    /**
     * 綁定類別操作事件
     */
    _bindCategoryEvents: function() {
        // 使用事件委派，處理新增的類別元素
        document.getElementById('incomeCategoriesList').addEventListener('click', (event) => {
            const target = event.target.closest('.edit-category, .delete-category');
            if (!target) return;
            
            const categoryId = target.dataset.id;
            
            if (target.classList.contains('edit-category')) {
                this.showEditCategoryModal(categoryId);
            } else if (target.classList.contains('delete-category')) {
                this.deleteCategory(categoryId);
            }
        });
        
        document.getElementById('expenseCategoriesList').addEventListener('click', (event) => {
            const target = event.target.closest('.edit-category, .delete-category');
            if (!target) return;
            
            const categoryId = target.dataset.id;
            
            if (target.classList.contains('edit-category')) {
                this.showEditCategoryModal(categoryId);
            } else if (target.classList.contains('delete-category')) {
                this.deleteCategory(categoryId);
            }
        });
    },
    
    /**
     * 顯示新增類別模態框
     */
    showAddCategoryModal: function(type) {
        console.log('顯示新增類別模態框，類型:', type);
        
        // 獲取模態框元素
        const modal = document.getElementById('addCategoryModal');
        if (!modal) {
            console.error('找不到類別添加模態框');
            alert('找不到類別添加模態框，請檢查HTML結構');
            return;
        }
        
        // 重設表單
        document.getElementById('categoryType').value = type;
        document.getElementById('categoryType').dataset.editId = '';
        document.getElementById('categoryName').value = '';
        document.getElementById('selectedIcon').className = 'fas fa-tag';
        document.getElementById('categoryColor').value = '#4CAF50';
        document.getElementById('categoryOrder').value = '0';
        document.getElementById('iconGrid').style.display = 'none';
        
        // 修改標題
        document.querySelector('#addCategoryModal .modal-header h3').textContent = 
            type === 'income' ? '新增收入類別' : '新增支出類別';
        
        // 確保模態框可見
        modal.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important;';
        
        // 使用UiCore顯示模態框
        UiCore.showModal('addCategoryModal');
        
        console.log('類別添加模態框已顯示');
    },
    
    /**
     * 顯示編輯類別模態框
     */
    showEditCategoryModal: function(categoryId) {
        console.log('顯示編輯類別模態框:', categoryId);
        
        const category = Store.getCategory(categoryId);
        if (!category) {
            Utils.showToast('找不到指定類別', 'error');
            return;
        }
        
        // 填充表單
        document.getElementById('categoryType').value = category.type;
        document.getElementById('categoryType').dataset.editId = category.id;
        document.getElementById('categoryName').value = category.name;
        document.getElementById('selectedIcon').className = `fas fa-${category.icon}`;
        document.getElementById('categoryColor').value = category.color;
        document.getElementById('categoryOrder').value = category.order;
        document.getElementById('iconGrid').style.display = 'none';
        
        // 修改標題
        document.querySelector('#addCategoryModal .modal-header h3').textContent = '編輯類別';
        
        // 確保模態框可見
        const modal = document.getElementById('addCategoryModal');
        if (modal) {
            modal.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important;';
        }
        
        // 顯示模態框
        UiCore.showModal('addCategoryModal');
    },
    
    /**
     * 保存類別
     */
    saveCategory: function() {
        console.log('正在保存類別');
        
        try {
            // 取得表單資料
            const type = document.getElementById('categoryType').value;
            const editId = document.getElementById('categoryType').dataset.editId;
            const name = document.getElementById('categoryName').value;
            const icon = document.getElementById('selectedIcon').className.replace('fas fa-', '');
            const color = document.getElementById('categoryColor').value;
            const order = parseInt(document.getElementById('categoryOrder').value);
            
            // 驗證
            if (!name) {
                Utils.showToast('請輸入類別名稱', 'error');
                return;
            }
            
            // 準備資料
            const categoryData = {
                name,
                type,
                icon,
                color,
                order: isNaN(order) ? 0 : order
            };
            
            console.log('保存類別數據:', categoryData);
            
            // 新增或更新類別
            let result;
            if (editId) {
                result = App.updateCategory(editId, categoryData);
            } else {
                result = App.addCategory(categoryData);
            }
            
            // 處理結果
            if (result) {
                // 關閉模態框
                UiCore.closeModal('addCategoryModal');
                
                // 刷新UI
                this.refresh();
                
                // 更新交易頁面的類別下拉框
                if (typeof UiTransactions !== 'undefined') {
                    UiTransactions.updateCategoryOptions();
                }
                
                // 顯示成功訊息
                Utils.showToast(editId ? '類別已更新' : '類別已添加', 'success');
            } else {
                Utils.showToast('保存類別失敗', 'error');
            }
        } catch (error) {
            console.error('保存類別時出錯:', error);
            Utils.showToast('發生錯誤: ' + error.message, 'error');
        }
    },
    
    /**
     * 刪除類別
     */
    deleteCategory: function(categoryId) {
        // 確認刪除
        const category = Store.getCategory(categoryId);
        if (!category) {
            Utils.showToast('找不到指定類別', 'error');
            return;
        }
        
        if (!confirm(`確定要刪除類別「${category.name}」嗎？此操作無法復原。`)) {
            return;
        }
        
        // 執行刪除
        const result = App.deleteCategory(categoryId);
        
        // 處理結果
        if (result) {
            // 刷新UI
            this.refresh();
            
            // 更新交易頁面的類別下拉框
            if (typeof UiTransactions !== 'undefined') {
                UiTransactions.updateCategoryOptions();
            }
            
            Utils.showToast('類別已刪除', 'success');
        } else {
            Utils.showToast('刪除類別失敗', 'error');
        }
    },
    
    /**
     * 重新整理類別清單
     */
    refresh: function() {
        console.log('重新整理類別清單');
        
        // 顯示收入類別
        this.displayCategories('income');
        
        // 顯示支出類別
        this.displayCategories('expense');
        
        // 重新綁定按鈕
        this._bindAddCategoryButtons();
    },
    
    /**
     * 顯示指定類型的類別
     */
    displayCategories: function(type) {
        console.log('顯示類別:', type);
        
        // 取得類別
        const categories = Store.getCategories(type).sort((a, b) => a.order - b.order);
        
        // 取得容器
        const containerElement = document.getElementById(`${type}CategoriesList`);
        if (!containerElement) {
            console.error(`找不到容器: ${type}CategoriesList`);
            return;
        }
        
        // 決定視圖模式
        const viewMode = document.getElementById(`${type}CategoryCardView`).classList.contains('active')
            ? 'card'
            : 'list';
        
        // 清空容器，保留新增按鈕
        containerElement.innerHTML = `
            <div class="category-add-card">
                <button id="add${type.charAt(0).toUpperCase() + type.slice(1)}CategoryButton" class="btn btn-add">+ 新增</button>
            </div>
        `;
        
        // 重新綁定新增按鈕事件
        const addButton = document.getElementById(`add${type.charAt(0).toUpperCase() + type.slice(1)}CategoryButton`);
        if (addButton) {
            addButton.addEventListener('click', () => {
                this.showAddCategoryModal(type);
            });
        }
        
        // 如果沒有類別，顯示提示訊息
        if (categories.length === 0) {
            containerElement.innerHTML += `<p class="empty-message">尚未設置${type === 'income' ? '收入' : '支出'}類別</p>`;
            return;
        }
        
        // 顯示類別
        categories.forEach(category => {
            const categoryHtml = UiCore.createCategoryHTML(category, viewMode);
            containerElement.innerHTML += categoryHtml;
        });
        
        console.log(`已顯示 ${categories.length} 個${type}類別`);
    }
};