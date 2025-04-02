// ui-categories.js - 類別UI相關

/**
 * 重置類別表單
 */
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


/**
 * 填充圖標網格
 */
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

/**
 * 編輯類別
 */
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

/**
 * 保存類別
 */
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

/**
 * 刪除類別
 */
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

/**
 * 初始化類別管理標籤
 */
function initializeCategoryTabs() {
    console.log("初始化類別管理標籤");
    
    try {
        // 獲取標籤按鈕和內容
        const incomeCategoryTabButton = document.getElementById('incomeCategoryTabButton');
        const expenseCategoryTabButton = document.getElementById('expenseCategoryTabButton');
        const incomeCategoryTab = document.getElementById('incomeCategoryTab');
        const expenseCategoryTab = document.getElementById('expenseCategoryTab');
        
        if (!incomeCategoryTabButton || !expenseCategoryTabButton || !incomeCategoryTab || !expenseCategoryTab) {
            console.error("找不到類別標籤元素");
            return;
        }
        
        // 移除現有事件監聽器
        incomeCategoryTabButton.removeEventListener('click', handleIncomeCategoryTabClick);
        expenseCategoryTabButton.removeEventListener('click', handleExpenseCategoryTabClick);
        
        // 添加事件監聽器
        incomeCategoryTabButton.addEventListener('click', handleIncomeCategoryTabClick);
        expenseCategoryTabButton.addEventListener('click', handleExpenseCategoryTabClick);
        
        // 確保初始狀態正確
        if (incomeCategoryTabButton.classList.contains('active')) {
            incomeCategoryTab.classList.add('active');
            expenseCategoryTab.classList.remove('active');
        } else if (expenseCategoryTabButton.classList.contains('active')) {
            expenseCategoryTab.classList.add('active');
            incomeCategoryTab.classList.remove('active');
        } else {
            // 默認顯示收入類別標籤
            incomeCategoryTabButton.classList.add('active');
            incomeCategoryTab.classList.add('active');
            expenseCategoryTabButton.classList.remove('active');
            expenseCategoryTab.classList.remove('active');
        }
    } catch (error) {
        console.error("初始化類別管理標籤時發生錯誤:", error);
    }
}

/**
 * 處理收入類別標籤點擊
 */
function handleIncomeCategoryTabClick() {
    console.log("切換到收入類別標籤");
    
    const incomeCategoryTabButton = document.getElementById('incomeCategoryTabButton');
    const expenseCategoryTabButton = document.getElementById('expenseCategoryTabButton');
    const incomeCategoryTab = document.getElementById('incomeCategoryTab');
    const expenseCategoryTab = document.getElementById('expenseCategoryTab');
    
    if (!incomeCategoryTabButton || !expenseCategoryTabButton || !incomeCategoryTab || !expenseCategoryTab) {
        console.error("找不到類別標籤元素");
        return;
    }
    
    incomeCategoryTabButton.classList.add('active');
    expenseCategoryTabButton.classList.remove('active');
    incomeCategoryTab.classList.add('active');
    expenseCategoryTab.classList.remove('active');
}

/**
 * 處理支出類別標籤點擊
 */
function handleExpenseCategoryTabClick() {
    console.log("切換到支出類別標籤");
    
    const incomeCategoryTabButton = document.getElementById('incomeCategoryTabButton');
    const expenseCategoryTabButton = document.getElementById('expenseCategoryTabButton');
    const incomeCategoryTab = document.getElementById('incomeCategoryTab');
    const expenseCategoryTab = document.getElementById('expenseCategoryTab');
    
    if (!incomeCategoryTabButton || !expenseCategoryTabButton || !incomeCategoryTab || !expenseCategoryTab) {
        console.error("找不到類別標籤元素");
        return;
    }
    
    expenseCategoryTabButton.classList.add('active');
    incomeCategoryTabButton.classList.remove('active');
    expenseCategoryTab.classList.add('active');
    incomeCategoryTab.classList.remove('active');
}

/**
 * 為類別添加拖拽排序功能
 */
function enableCategoryDragAndDrop() {
    console.log("啟用類別拖拽排序功能");
    
    // 獲取類別列表容器
    const incomeCategoriesList = document.getElementById('incomeCategoriesList');
    const expenseCategoriesList = document.getElementById('expenseCategoriesList');
    
    if (incomeCategoriesList) enableDragForContainer(incomeCategoriesList, 'income');
    if (expenseCategoriesList) enableDragForContainer(expenseCategoriesList, 'expense');
    
    function enableDragForContainer(container, type) {
        console.log(`為${type}類別啟用拖拽功能`);
        
        // 獲取所有類別卡片或列表項
        const isCardView = container.classList.contains('card-view');
        const selector = isCardView ? '.category-card' : '.category-list-item';
        const items = container.querySelectorAll(selector);
        
        // 跳過如果沒有找到項目
        if (items.length === 0) {
            console.log(`沒有找到${type}類別項目`);
            return;
        }
        
        // 為每個項目添加拖拽屬性
        items.forEach(item => {
            if (item.classList.contains('category-add-card')) return; // 跳過添加按鈕卡片
            
            // 添加拖拽屬性
            item.setAttribute('draggable', 'true');
            
            // 添加視覺指示
            item.style.cursor = 'grab';
            
            // 拖拽開始事件
            item.addEventListener('dragstart', function(e) {
                e.dataTransfer.setData('text/plain', item.dataset.id);
                item.classList.add('dragging');
                
                // 延遲添加半透明效果以改善使用者體驗
                setTimeout(() => {
                    item.style.opacity = '0.5';
                }, 0);
            });
            
            // 拖拽結束事件
            item.addEventListener('dragend', function() {
                item.classList.remove('dragging');
                item.style.opacity = '1';
            });
        });
        
        // 設置放置區域
        container.addEventListener('dragover', function(e) {
            e.preventDefault(); // 允許放置
            
            const draggable = document.querySelector('.dragging');
            if (!draggable) return;
            
            // 獲取鼠標位置的最近元素
            const afterElement = getDragAfterElement(container, e.clientY);
            
            // 根據位置插入拖動元素
            if (afterElement == null) {
                container.appendChild(draggable);
            } else {
                container.insertBefore(draggable, afterElement);
            }
        });
        
        // 放置事件
        container.addEventListener('drop', function(e) {
            e.preventDefault();
            
            // 更新順序值
            updateCategoryOrders(container, type);
        });
    }
    
    // 幫助函數：獲取鼠標位置下方的元素
    function getDragAfterElement(container, y) {
        const isCardView = container.classList.contains('card-view');
        const selector = isCardView ? '.category-card:not(.category-add-card)' : '.category-list-item';
        const draggableElements = [...container.querySelectorAll(selector + ':not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    
    // 更新類別順序值
    function updateCategoryOrders(container, type) {
        console.log(`更新${type}類別順序`);
        
        const isCardView = container.classList.contains('card-view');
        const selector = isCardView ? '.category-card:not(.category-add-card)' : '.category-list-item';
        const items = container.querySelectorAll(selector);
        
        // 獲取對應的類別數組
        const categories = type === 'income' ? appState.categories.income : appState.categories.expense;
        
        // 更新順序值
        let order = 0;
        items.forEach(item => {
            const id = item.dataset.id;
            const category = categories.find(c => c.id === id);
            
            if (category) {
                category.order = order++;
                
                // 更新順序顯示（如果有）
                const orderDisplay = item.querySelector('.category-order');
                if (orderDisplay) {
                    orderDisplay.textContent = category.order;
                }
            }
        });
        
        // 保存到本地存儲
        saveToLocalStorage();
        
        // 執行同步(如果啟用)
        if (enableFirebase && isLoggedIn && typeof syncToFirebase === 'function') {
            syncToFirebase();
        }
        
        showToast(`類別順序已更新`, 'success');
    }
}

/**
 * 更新類別UI
 */
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
        
        // 啟用拖拽排序功能
        setTimeout(enableCategoryDragAndDrop, 100);
        
        // 綁定類別事件
        bindCategoryEvents();
        
        console.log("更新類別UI - 完成");
    } catch (error) {
        console.error("更新類別UI時發生錯誤:", error);
        showToast('更新類別UI時發生錯誤: ' + error.message, 'error');
    }
}

/**
 * 更新收入類別列表
 */
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
    } catch (error) {
        console.error("更新收入類別列表時發生錯誤:", error);
        const incomeCategoriesList = document.getElementById('incomeCategoriesList');
        if (incomeCategoriesList) {
            incomeCategoriesList.innerHTML = '<div class="category-add-card"><button id="addIncomeCategoryButton" class="btn btn-add">+ 新增</button></div><p class="error-message">載入收入類別時出錯</p>';
        }
    }
}

/**
 * 更新支出類別列表
 */
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
    } catch (error) {
        console.error("更新支出類別列表時發生錯誤:", error);
        const expenseCategoriesList = document.getElementById('expenseCategoriesList');
        if (expenseCategoriesList) {
            expenseCategoriesList.innerHTML = '<div class="category-add-card"><button id="addExpenseCategoryButton" class="btn btn-add">+ 新增</button></div><p class="error-message">載入支出類別時出錯</p>';
        }
    }
}

/**
 * 綁定類別相關事件
 */
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

// 導出函數
// 導出函數
window.resetCategoryForm = resetCategoryForm;
window.populateIconGrid = populateIconGrid;
window.editCategory = editCategory;
window.saveCategory = saveCategory;
window.deleteCategory = deleteCategory;
window.initializeCategoryTabs = initializeCategoryTabs;
window.updateCategoriesUI = updateCategoriesUI;
window.bindCategoryEvents = bindCategoryEvents;
window.handleIncomeCategoryTabClick = handleIncomeCategoryTabClick;
window.handleExpenseCategoryTabClick = handleExpenseCategoryTabClick;