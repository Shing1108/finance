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
        // 初始化類別頁籤
        this._initCategoryTabs();
        
        // 初始化視圖切換
        this._initViewToggle();
        
        // 初始化新增類別按鈕
        document.getElementById('addIncomeCategoryButton').addEventListener('click', () => {
            this.showAddCategoryModal('income');
        });
        
        document.getElementById('addExpenseCategoryButton').addEventListener('click', () => {
            this.showAddCategoryModal('expense');
        });
        
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
        
        console.log('類別管理UI初始化完成');
    },
    
/**
 * 初始化類別頁籤
 */
_initCategoryTabs: function() {
    document.getElementById('incomeCategoryTabButton').addEventListener('click', () => {
        document.getElementById('incomeCategoryTabButton').classList.add('active');
        document.getElementById('expenseCategoryTabButton').classList.remove('active');
        document.getElementById('incomeCategoryTab').style.display = 'block';
        document.getElementById('expenseCategoryTab').style.display = 'none';
        this.currentType = 'income';
        
        // 如果有打開的編輯模態框，則關閉它
        if (document.getElementById('addCategoryModal').style.display === 'block') {
            UiCore.closeModal('addCategoryModal');
        }
    });
    
    document.getElementById('expenseCategoryTabButton').addEventListener('click', () => {
        document.getElementById('incomeCategoryTabButton').classList.remove('active');
        document.getElementById('expenseCategoryTabButton').classList.add('active');
        document.getElementById('incomeCategoryTab').style.display = 'none';
        document.getElementById('expenseCategoryTab').style.display = 'block';
        this.currentType = 'expense';
        
        // 如果有打開的編輯模態框，則關閉它
        if (document.getElementById('addCategoryModal').style.display === 'block') {
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
        
        // 顯示模態框
        UiCore.showModal('addCategoryModal');
    },
    
    /**
     * 顯示編輯類別模態框
     */
    showEditCategoryModal: function(categoryId) {
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
        
        // 顯示模態框
        UiCore.showModal('addCategoryModal');
    },
    
    /**
     * 保存類別
     */
    saveCategory: function() {
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
        
        // 新增或更新類別
        let result;
        if (editId) {
            result = App.updateCategory(editId, categoryData);
        } else {
            result = App.addCategory(categoryData);
        }
        
        // 處理結果
        if (result) {
            UiCore.closeModal('addCategoryModal');
            this.refresh();
            
            // 同時更新交易頁面的類別下拉框
            UiTransactions.updateCategoryOptions();
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
            this.refresh();
            
            // 同時更新交易頁面的類別下拉框
            UiTransactions.updateCategoryOptions();
        }
    },
    
    /**
     * 重新整理類別清單
     */
    refresh: function() {
        // 顯示收入類別
        this.displayCategories('income');
        
        // 顯示支出類別
        this.displayCategories('expense');
    },
    
    /**
     * 顯示指定類型的類別
     */
    displayCategories: function(type) {
        // 取得類別
        const categories = Store.getCategories(type).sort((a, b) => a.order - b.order);
        
        // 取得容器
        const containerElement = document.getElementById(`${type}CategoriesList`);
        
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
        document.getElementById(`add${type.charAt(0).toUpperCase() + type.slice(1)}CategoryButton`).addEventListener('click', () => {
            this.showAddCategoryModal(type);
        });
        
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
    }
};