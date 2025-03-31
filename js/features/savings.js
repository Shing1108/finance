// savings.js - 儲蓄目標功能

/**
 * 儲蓄目標模塊
 */
window.savingsGoals = {

    /**
     * 初始化儲蓄目標
     */
    initSavingsGoals: function() {
        console.log("初始化儲蓄目標功能");
        
        try {
            // 確保數據結構存在
            if (!appState.savingsGoals) {
                appState.savingsGoals = [];
            }
            
            // 綁定新增目標按鈕
            const addButton = document.getElementById('addSavingsGoalButton');
            if (addButton) {
                addButton.addEventListener('click', this.openAddSavingsGoalModal);
            }
            
            // 更新目標列表
            this.updateSavingsGoalsList();
        } catch (error) {
            console.error("初始化儲蓄目標功能時發生錯誤:", error);
        }
    },

    /**
     * 打開添加目標模態框
     */
    openAddSavingsGoalModal: function() {
        // 檢查模態框是否已經存在
        let modal = document.getElementById('savingsGoalModal');
        
        if (!modal) {
            // 創建模態框HTML
            const modalHTML = `
            <div id="savingsGoalModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>新增儲蓄目標</h3>
                        <span class="close-button">&times;</span>
                    </div>
                    <div class="modal-body">
                        <input type="hidden" id="editSavingsGoalId" value="">
                        <div class="form-group">
                            <label for="savingsGoalName">目標名稱</label>
                            <input type="text" id="savingsGoalName" class="form-control" placeholder="例如：買新車、旅行基金">
                        </div>
                        <div class="form-group">
                            <label for="savingsGoalTarget">目標金額</label>
                            <input type="number" id="savingsGoalTarget" class="form-control" min="0" step="0.01">
                        </div>
                        <div class="form-group">
                            <label for="savingsGoalCurrent">目前已儲蓄</label>
                            <input type="number" id="savingsGoalCurrent" class="form-control" min="0" step="0.01" value="0">
                        </div>
                        <div class="form-group">
                            <label for="savingsGoalDeadline">目標日期 (可選)</label>
                            <input type="date" id="savingsGoalDeadline" class="form-control">
                        </div>
                        <div class="form-group">
                            <label for="savingsGoalNote">備註 (可選)</label>
                            <textarea id="savingsGoalNote" class="form-control"></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button id="saveSavingsGoalButton" class="btn btn-primary">保存</button>
                        <button class="btn btn-secondary modal-cancel">取消</button>
                    </div>
                </div>
            </div>
            `;
            
            // 添加到文檔
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            // 獲取創建的模態框
            modal = document.getElementById('savingsGoalModal');
            
            // 綁定事件
            modal.querySelector('.close-button').addEventListener('click', closeCurrentModal);
            modal.querySelector('.modal-cancel').addEventListener('click', closeCurrentModal);
            document.getElementById('saveSavingsGoalButton').addEventListener('click', window.savingsGoals.saveSavingsGoal);
        }
        
        // 重置表單
        document.getElementById('editSavingsGoalId').value = '';
        document.getElementById('savingsGoalName').value = '';
        document.getElementById('savingsGoalTarget').value = '';
        document.getElementById('savingsGoalCurrent').value = '0';
        document.getElementById('savingsGoalNote').value = '';
        
        // 設置默認日期為一年後
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        document.getElementById('savingsGoalDeadline').value = oneYearLater.toISOString().split('T')[0];
        
        // 修改模態框標題
        const modalTitle = modal.querySelector('.modal-header h3');
        if (modalTitle) {
            modalTitle.textContent = '新增儲蓄目標';
        }
        
        // 打開模態框
        openModal('savingsGoalModal');
    },

    /**
     * 保存儲蓄目標
     */
    saveSavingsGoal: function() {
        try {
            const name = document.getElementById('savingsGoalName').value.trim();
            const target = parseFloat(document.getElementById('savingsGoalTarget').value);
            const current = parseFloat(document.getElementById('savingsGoalCurrent').value) || 0;
            const deadline = document.getElementById('savingsGoalDeadline').value;
            const note = document.getElementById('savingsGoalNote').value.trim();
            const editId = document.getElementById('editSavingsGoalId').value;
            
            // 驗證
            if (!name) {
                showToast('請輸入目標名稱', 'error');
                return;
            }
            
            if (!target || target <= 0) {
                showToast('請輸入有效的目標金額', 'error');
                return;
            }
            
            if (current < 0 || current > target) {
                showToast('當前儲蓄金額應在0到目標金額之間', 'error');
                return;
            }
            
            // 創建或更新目標
            if (editId) {
                // 更新現有目標
                const goalIndex = appState.savingsGoals.findIndex(g => g.id === editId);
                if (goalIndex === -1) {
                    showToast('找不到要編輯的目標', 'error');
                    return;
                }
                
                // 獲取原始目標以保留某些字段
                const originalGoal = appState.savingsGoals[goalIndex];
                
                appState.savingsGoals[goalIndex] = {
                    ...originalGoal,
                    name,
                    target,
                    current,
                    deadline,
                    note,
                    updatedAt: new Date().toISOString()
                };
                
                showToast('儲蓄目標已更新', 'success');
            } else {
                // 創建新目標
                const newGoal = {
                    id: generateId(),
                    name,
                    target,
                    current,
                    deadline,
                    note,
                    progressHistory: [],
                    createdAt: new Date().toISOString()
                };
                
                appState.savingsGoals.push(newGoal);
                showToast('儲蓄目標已創建', 'success');
            }
            
            // 保存到本地存儲
            saveToLocalStorage();
            
            // 更新UI
            window.savingsGoals.updateSavingsGoalsList();
            
            // 如果啟用同步，同步到Firebase
            if (enableFirebase && isLoggedIn) {
                syncToFirebase();
            }
            
            // 關閉模態框
            closeCurrentModal();
        } catch (error) {
            console.error("保存儲蓄目標時發生錯誤:", error);
            showToast('保存儲蓄目標失敗: ' + error.message, 'error');
        }
    },

    /**
     * 更新儲蓄目標列表
     */
    updateSavingsGoalsList: function() {
        console.log("更新儲蓄目標列表");
        
        try {
            const listContainer = document.getElementById('savingsGoalsList');
            if (!listContainer) {
                console.warn("找不到儲蓄目標列表容器");
                return;
            }
            
            // 檢查是否有儲蓄目標
            if (!appState.savingsGoals || appState.savingsGoals.length === 0) {
                listContainer.innerHTML = '<p class="empty-message">尚未設置儲蓄目標</p>';
                return;
            }
            
            // 排序目標(按照完成百分比)
            const sortedGoals = [...appState.savingsGoals].sort((a, b) => {
                const progressA = (a.current / a.target) * 100;
                const progressB = (b.current / b.target) * 100;
                return progressB - progressA; // 完成度高的排在前面
            });
            
            let html = '';
            
            sortedGoals.forEach(goal => {
                // 計算進度百分比
                const progress = Math.min(100, (goal.current / goal.target) * 100);
                
                // 計算剩餘金額
                const remaining = goal.target - goal.current;
                
                // 格式化目標日期
                let deadlineText = '';
                let deadlineInfo = '';
                
                if (goal.deadline) {
                    const deadlineDate = new Date(goal.deadline);
                    deadlineText = deadlineDate.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
                    
                    // 計算剩餘天數
                    const today = new Date();
                    const daysRemaining = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
                    
                    if (daysRemaining > 0) {
                        deadlineInfo = `還有 ${daysRemaining} 天`;
                    } else if (daysRemaining === 0) {
                        deadlineInfo = "今天到期";
                    } else {
                        deadlineInfo = `已逾期 ${Math.abs(daysRemaining)} 天`;
                    }
                }
                
                // 確定進度條顏色
                let progressColor = 'var(--primary-color)';
                
                if (progress >= 90) {
                    progressColor = 'var(--secondary-color)';
                } else if (progress <= 30) {
                    progressColor = 'var(--warning-color)';
                }
                
                html += `
                <div class="savings-goal-card" data-id="${goal.id}">
                    <div class="savings-goal-header">
                        <div class="savings-goal-title">${goal.name}</div>
                        <div class="savings-goal-target">${formatCurrency(goal.target)}</div>
                    </div>
                    <div class="savings-goal-body">
                        <div class="savings-goal-progress">
                            <div class="savings-goal-progress-bar">
                                <div class="savings-goal-progress-fill" style="width: ${progress}%; background-color: ${progressColor}"></div>
                            </div>
                            <div class="savings-goal-stats">
                                <span>已儲蓄: ${formatCurrency(goal.current)} (${Math.round(progress)}%)</span>
                                <span>還需: ${formatCurrency(remaining)}</span>
                            </div>
                        </div>
                        ${goal.deadline ? `
                        <div class="savings-goal-deadline">
                            <span>目標日期: ${deadlineText}</span>
                            <span class="deadline-info">${deadlineInfo}</span>
                        </div>` : ''}
                        ${goal.note ? `<div class="savings-goal-note">${goal.note}</div>` : ''}
                    </div>
                    <div class="savings-goal-actions">
                        <button class="btn btn-sm update-savings-goal" data-id="${goal.id}">
                            <i class="fas fa-plus-circle"></i> 更新進度
                        </button>
                        <button class="btn btn-sm edit-savings-goal" data-id="${goal.id}">
                            <i class="fas fa-edit"></i> 編輯
                        </button>
                        <button class="btn btn-sm btn-danger delete-savings-goal" data-id="${goal.id}">
                            <i class="fas fa-trash"></i> 刪除
                        </button>
                    </div>
                </div>
                `;
            });
            
            // 更新容器HTML
            listContainer.innerHTML = html;
            
            // 綁定按鈕事件
            this.bindSavingsGoalEvents();
        } catch (error) {
            console.error("更新儲蓄目標列表時發生錯誤:", error);
            
            // 顯示錯誤消息
            const listContainer = document.getElementById('savingsGoalsList');
            if (listContainer) {
                listContainer.innerHTML = '<p class="error-message">載入儲蓄目標時發生錯誤</p>';
            }
        }
    },

    /**
     * 綁定儲蓄目標相關事件
     */
    bindSavingsGoalEvents: function() {
        // 更新進度按鈕
        document.querySelectorAll('.update-savings-goal').forEach(button => {
            button.addEventListener('click', function() {
                const goalId = this.getAttribute('data-id');
                window.savingsGoals.openUpdateGoalProgressModal(goalId);
            });
        });
        
        // 編輯按鈕
        document.querySelectorAll('.edit-savings-goal').forEach(button => {
            button.addEventListener('click', function() {
                const goalId = this.getAttribute('data-id');
                window.savingsGoals.editSavingsGoal(goalId);
            });
        });
        
        // 刪除按鈕
        document.querySelectorAll('.delete-savings-goal').forEach(button => {
            button.addEventListener('click', function() {
                const goalId = this.getAttribute('data-id');
                window.savingsGoals.deleteSavingsGoal(goalId);
            });
        });
    },

    /**
     * 打開更新進度模態框
     * @param {string} goalId 目標ID
     */
    openUpdateGoalProgressModal: function(goalId) {
        try {
            // 查找目標
            const goal = appState.savingsGoals.find(g => g.id === goalId);
            if (!goal) {
                showToast('找不到儲蓄目標', 'error');
                return;
            }
            
            // 檢查模態框是否已經存在
            let modal = document.getElementById('updateGoalProgressModal');
            
            if (!modal) {
                // 創建模態框HTML
                const modalHTML = `
                <div id="updateGoalProgressModal" class="modal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>更新儲蓄進度</h3>
                            <span class="close-button">&times;</span>
                        </div>
                        <div class="modal-body">
                            <input type="hidden" id="updateGoalId" value="">
                            <div class="goal-info">
                                <p><strong>目標:</strong> <span id="updateGoalName"></span></p>
                                <p><strong>目標金額:</strong> <span id="updateGoalTarget"></span></p>
                                <p><strong>當前已儲蓄:</strong> <span id="updateGoalCurrent"></span></p>
                                <p><strong>剩餘金額:</strong> <span id="updateGoalRemaining"></span></p>
                            </div>
                            
                            <div class="form-group">
                                <label for="goalProgressAmount">新增儲蓄金額</label>
                                <input type="number" id="goalProgressAmount" class="form-control" min="0" step="0.01">
                            </div>
                            <div class="form-group">
                                <label for="goalProgressDate">日期</label>
                                <input type="date" id="goalProgressDate" class="form-control">
                            </div>
                            <div class="form-group">
                                <label for="goalProgressNote">備註 (可選)</label>
                                <input type="text" id="goalProgressNote" class="form-control">
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button id="saveGoalProgressButton" class="btn btn-primary">保存</button>
                            <button class="btn btn-secondary modal-cancel">取消</button>
                        </div>
                    </div>
                </div>
                `;
                
                // 添加到文檔
                document.body.insertAdjacentHTML('beforeend', modalHTML);
                
                // 獲取創建的模態框
                modal = document.getElementById('updateGoalProgressModal');
                
                // 綁定事件
                modal.querySelector('.close-button').addEventListener('click', closeCurrentModal);
                modal.querySelector('.modal-cancel').addEventListener('click', closeCurrentModal);
                document.getElementById('saveGoalProgressButton').addEventListener('click', window.savingsGoals.saveGoalProgress);
            }
            
            // 填充目標信息
            document.getElementById('updateGoalId').value = goalId;
            document.getElementById('updateGoalName').textContent = goal.name;
            document.getElementById('updateGoalTarget').textContent = formatCurrency(goal.target);
            document.getElementById('updateGoalCurrent').textContent = formatCurrency(goal.current);
            document.getElementById('updateGoalRemaining').textContent = formatCurrency(goal.target - goal.current);
            
            // 設置預設值
            document.getElementById('goalProgressAmount').value = '';
            document.getElementById('goalProgressDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('goalProgressNote').value = '';
            
            // 打開模態框
            openModal('updateGoalProgressModal');
        } catch (error) {
            console.error("打開更新進度模態框時發生錯誤:", error);
            showToast('無法打開更新進度視窗: ' + error.message, 'error');
        }
    },

    /**
     * 保存目標進度
     */
    saveGoalProgress: function() {
        try {
            const goalId = document.getElementById('updateGoalId').value;
            const amount = parseFloat(document.getElementById('goalProgressAmount').value);
            const date = document.getElementById('goalProgressDate').value;
            const note = document.getElementById('goalProgressNote').value.trim();
            
            // 驗證
            if (!amount || amount <= 0) {
                showToast('請輸入有效的儲蓄金額', 'error');
                return;
            }
            
            if (!date) {
                showToast('請選擇日期', 'error');
                return;
            }
            
            // 查找目標
            const goalIndex = appState.savingsGoals.findIndex(g => g.id === goalId);
            if (goalIndex === -1) {
                showToast('找不到儲蓄目標', 'error');
                return;
            }
            
            // 更新當前儲蓄金額
            const newTotal = appState.savingsGoals[goalIndex].current + amount;
            
            // 檢查是否超過目標
            if (newTotal > appState.savingsGoals[goalIndex].target) {
                if (!confirm(`新增金額將使儲蓄超過目標金額，是否繼續？`)) {
                    return;
                }
            }
            
            // 創建進度記錄
            if (!appState.savingsGoals[goalIndex].progressHistory) {
                appState.savingsGoals[goalIndex].progressHistory = [];
            }
            
            // 添加進度記錄
            appState.savingsGoals[goalIndex].progressHistory.push({
                amount: amount,
                date: date,
                note: note,
                createdAt: new Date().toISOString()
            });
            
            // 更新當前總額
            appState.savingsGoals[goalIndex].current = newTotal;
            appState.savingsGoals[goalIndex].updatedAt = new Date().toISOString();
            
            // 保存到本地存儲
            saveToLocalStorage();
            
            // 更新UI
            window.savingsGoals.updateSavingsGoalsList();
            
            // 如果啟用同步，同步到Firebase
            if (enableFirebase && isLoggedIn) {
                syncToFirebase();
            }
            
            // 檢查是否達到目標
            if (newTotal >= appState.savingsGoals[goalIndex].target) {
                showToast(`恭喜！您已達成「${appState.savingsGoals[goalIndex].name}」的儲蓄目標！`, 'success');
            } else {
                showToast('儲蓄進度已更新', 'success');
            }
            
            // 關閉模態框
            closeCurrentModal();
        } catch (error) {
            console.error("保存目標進度時發生錯誤:", error);
            showToast('保存目標進度失敗: ' + error.message, 'error');
        }
    },

    /**
     * 編輯儲蓄目標
     * @param {string} goalId 目標ID
     */
    editSavingsGoal: function(goalId) {
        try {
            // 查找目標
            const goal = appState.savingsGoals.find(g => g.id === goalId);
            if (!goal) {
                showToast('找不到儲蓄目標', 'error');
                return;
            }
            
            // 檢查模態框是否已經存在
            let modal = document.getElementById('savingsGoalModal');
            
            if (!modal) {
                // 創建模態框
                this.openAddSavingsGoalModal();
                modal = document.getElementById('savingsGoalModal');
            }
            
            // 填充表單
            document.getElementById('editSavingsGoalId').value = goal.id;
            document.getElementById('savingsGoalName').value = goal.name;
            document.getElementById('savingsGoalTarget').value = goal.target;
            document.getElementById('savingsGoalCurrent').value = goal.current;
            
            if (goal.deadline) {
                document.getElementById('savingsGoalDeadline').value = goal.deadline;
            }
            
            if (goal.note) {
                document.getElementById('savingsGoalNote').value = goal.note;
            }
            
            // 修改模態框標題
            const modalTitle = modal.querySelector('.modal-header h3');
            if (modalTitle) {
                modalTitle.textContent = '編輯儲蓄目標';
            }
            
            // 打開模態框
            openModal('savingsGoalModal');
        } catch (error) {
            console.error("編輯儲蓄目標時發生錯誤:", error);
            showToast('編輯儲蓄目標失敗: ' + error.message, 'error');
        }
    },

    /**
     * 刪除儲蓄目標
     * @param {string} goalId 目標ID
     */
    deleteSavingsGoal: function(goalId) {
        try {
            // 查找目標
            const goal = appState.savingsGoals.find(g => g.id === goalId);
            if (!goal) {
                showToast('找不到儲蓄目標', 'error');
                return;
            }
            
            // 確認刪除
            showConfirmDialog(`確定要刪除「${goal.name}」這個儲蓄目標嗎？`, () => {
                // 刪除目標
                appState.savingsGoals = appState.savingsGoals.filter(g => g.id !== goalId);
                
                // 保存到本地存儲
                saveToLocalStorage();
                
                // 更新UI
                window.savingsGoals.updateSavingsGoalsList();
                
                // 如果啟用同步，同步到Firebase
                if (enableFirebase && isLoggedIn) {
                    syncToFirebase();
                }
                
                showToast('儲蓄目標已刪除', 'success');
            });
        } catch (error) {
            console.error("刪除儲蓄目標時發生錯誤:", error);
            showToast('刪除儲蓄目標失敗: ' + error.message, 'error');
        }
    },

    /**
     * 查看目標進度歷史
     * @param {string} goalId 目標ID
     */
    viewGoalHistory: function(goalId) {
        try {
            // 查找目標
            const goal = appState.savingsGoals.find(g => g.id === goalId);
            if (!goal) {
                showToast('找不到儲蓄目標', 'error');
                return;
            }
            
            // 檢查是否有進度歷史
            if (!goal.progressHistory || goal.progressHistory.length === 0) {
                showToast('此目標沒有進度更新記錄', 'info');
                return;
            }
            
            // 檢查模態框是否已經存在
            let modal = document.getElementById('goalHistoryModal');
            
            if (!modal) {
                // 創建模態框HTML
                const modalHTML = `
                <div id="goalHistoryModal" class="modal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>儲蓄進度歷史</h3>
                            <span class="close-button">&times;</span>
                        </div>
                        <div class="modal-body">
                            <h4 id="historyGoalName"></h4>
                            <div id="goalHistoryList" class="goal-history-list"></div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary modal-cancel">關閉</button>
                        </div>
                    </div>
                </div>
                `;
                
                // 添加到文檔
                document.body.insertAdjacentHTML('beforeend', modalHTML);
                
                // 獲取創建的模態框
                modal = document.getElementById('goalHistoryModal');
                
                // 綁定事件
                modal.querySelector('.close-button').addEventListener('click', closeCurrentModal);
                modal.querySelector('.modal-cancel').addEventListener('click', closeCurrentModal);
            }
            
            // 填充目標名稱
            document.getElementById('historyGoalName').textContent = goal.name;
            
            // 排序歷史記錄(最新的在前面)
            const sortedHistory = [...goal.progressHistory].sort((a, b) => 
                new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
            );
            
            // 生成歷史記錄列表HTML
            let historyHTML = '';
            
            sortedHistory.forEach(record => {
                // 格式化日期
                const date = record.date ? new Date(record.date) : new Date(record.createdAt);
                const formattedDate = date.toLocaleDateString('zh-TW', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
                
                historyHTML += `
                <div class="history-item">
                    <div class="history-date">${formattedDate}</div>
                    <div class="history-amount">+${formatCurrency(record.amount)}</div>
                    ${record.note ? `<div class="history-note">${record.note}</div>` : ''}
                </div>
                `;
            });
            
            // 更新歷史記錄列表
            document.getElementById('goalHistoryList').innerHTML = historyHTML;
            
            // 打開模態框
            openModal('goalHistoryModal');
        } catch (error) {
            console.error("查看目標進度歷史時發生錯誤:", error);
            showToast('無法查看進度歷史: ' + error.message, 'error');
        }
    }
};