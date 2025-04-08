/**
 * savings.js - 儲蓄目標功能
 */

const SavingsManager = {
    /**
     * 初始化儲蓄目標功能
     */
    init: function() {
        console.log('正在初始化儲蓄目標功能...');
        this._bindEvents();
        this.refresh();
        
        // 添加戶口轉賬監聽器
        this._setupTransferListener();
        
        console.log('儲蓄目標功能初始化完成');
    },
    
    /**
     * 設置轉賬監聽器
     * 監聽所有轉賬交易，檢查是否涉及儲蓄目標連結戶口
     */
    _setupTransferListener: function() {
        // 監聽自定義轉賬完成事件
        document.addEventListener('transactionUpdated', (event) => {
            if (event.detail && event.detail.transaction) {
                console.log('檢測到交易更新:', event.detail.transaction);
                this._checkAndUpdateGoalForTransaction(event.detail.transaction);
            }
        });
        
        console.log('轉賬監聽器設置完成');
    },

    _checkAndUpdateGoalForTransaction: function(transaction) {
        if (!transaction || !transaction.accountId) return;
        
        // 獲取所有儲蓄目標
        const goals = Store.getSavingsGoals();
        
        // 檢查是否有儲蓄目標連結到這個戶口
        goals.forEach(goal => {
            if (goal.accountId === transaction.accountId) {
                console.log(`交易涉及儲蓄目標連結戶口: ${goal.name}`);
                
                // 如果是收入交易，更新儲蓄目標進度
                if (transaction.type === 'income') {
                    this.refresh(); // 刷新儲蓄目標列表
                }
            }
        });
    },
    
    /**
     * 檢查轉賬是否涉及儲蓄目標並更新進度
     */
    _checkAndUpdateGoalForTransfer: function(transaction) {
        if (!transaction || transaction.type !== 'transfer') return;
        
        const toAccountId = transaction.toAccountId;
        console.log(`檢查轉賬到戶口 ${toAccountId} 是否與儲蓄目標相關`);
        
        // 獲取所有儲蓄目標
        const goals = Store.getSavingsGoals();
        if (!goals || goals.length === 0) {
            console.log('沒有找到儲蓄目標');
            return;
        }
        
        console.log(`找到 ${goals.length} 個儲蓄目標，開始逐一檢查`);
        
        // 找到與目標戶口相關的儲蓄目標
        goals.forEach(goal => {
            console.log(`檢查儲蓄目標: ${goal.name}, 目標戶口ID: ${goal.accountId || '無'}`);
            
            // 確保字符串比較
            const goalAccountId = String(goal.accountId || '');
            const transferToAccountId = String(toAccountId || '');
            
            console.log(`比較: ${goalAccountId === transferToAccountId ? '匹配' : '不匹配'} 
                        (目標戶口ID: ${transferToAccountId}, 儲蓄目標戶口ID: ${goalAccountId})`);
            
            if (goalAccountId && goalAccountId === transferToAccountId) {
                console.log(`找到與轉賬目標戶口相關的儲蓄目標: ${goal.name}`);
                
                // 獲取最新數據
                const currentGoal = Store.getSavingsGoal(goal.id);
                if (!currentGoal) {
                    console.error(`找不到儲蓄目標: ${goal.id}`);
                    return;
                }
                
                // 處理貨幣轉換（如果需要）
                let contributionAmount = transaction.amount;
                const fromAccount = Store.getAccount(transaction.accountId);
                
                if (fromAccount && fromAccount.currency !== currentGoal.currency) {
                    const rate = CurrencyManager.getExchangeRate(fromAccount.currency, currentGoal.currency);
                    contributionAmount = transaction.amount * rate;
                    console.log(`貨幣轉換: ${transaction.amount} ${fromAccount.currency} = ${contributionAmount} ${currentGoal.currency}`);
                }
                
                // 更新儲蓄目標進度
                const newAmount = currentGoal.currentAmount + contributionAmount;
                console.log(`更新儲蓄目標進度: ${currentGoal.currentAmount} + ${contributionAmount} = ${newAmount}`);
                
                // 準備更新的目標數據
                const updatedGoal = {
                    ...currentGoal,
                    currentAmount: newAmount
                };
                
                // 保存更新
                const updateResult = Store.updateSavingsGoal(currentGoal.id, updatedGoal);
                console.log(`儲蓄目標 ${currentGoal.name} 進度更新結果:`, updateResult);
                
                if (updateResult) {
                    Utils.showToast(`已將 ${Utils.formatCurrency(contributionAmount, currentGoal.currency)} 自動添加到儲蓄目標「${currentGoal.name}」`, 'success');
                    this.refresh();
                } else {
                    console.error('更新儲蓄目標失敗');
                    Utils.showToast('轉賬成功但無法更新儲蓄目標進度', 'warning');
                }
            }
        });
    },
    
    /**
     * 綁定事件
     */
    _bindEvents: function() {
        console.log('綁定儲蓄目標按鈕事件');
        // 新增儲蓄目標按鈕
        const addButton = document.getElementById('addSavingsGoalButton');
        if (addButton) {
            addButton.addEventListener('click', () => {
                console.log('按下了新增儲蓄目標按鈕');
                this.showAddSavingsGoalModal();
            });
        } else {
            console.error('找不到新增儲蓄目標按鈕元素');
        }
        
        // 儲蓄目標列表事件委派
        const goalsList = document.getElementById('savingsGoalsList');
        if (goalsList) {
            goalsList.addEventListener('click', (event) => {
                const target = event.target.closest('.edit-goal, .delete-goal, .contribute-goal');
                if (!target) return;
                
                const goalId = target.dataset.id;
                
                if (target.classList.contains('edit-goal')) {
                    this.showEditSavingsGoalModal(goalId);
                } else if (target.classList.contains('delete-goal')) {
                    this.deleteSavingsGoal(goalId);
                } else if (target.classList.contains('contribute-goal')) {
                    this.showContributeModal(goalId);
                }
            });
        } else {
            console.error('找不到儲蓄目標列表元素');
        }
    },
    
    /**
     * 顯示新增儲蓄目標模態框
     */
    showAddSavingsGoalModal: function() {
        console.log('顯示新增儲蓄目標模態框');
        
        // 建立模態框 HTML
        const modalHtml = `
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
                            <input type="text" id="savingsGoalName" class="form-control">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="savingsGoalAmount">目標金額</label>
                                <input type="number" id="savingsGoalAmount" class="form-control" min="0" step="0.01">
                            </div>
                            <div class="form-group">
                                <label for="savingsGoalCurrency">貨幣</label>
                                <select id="savingsGoalCurrency" class="form-control">
                                    <option value="HKD">港幣 (HKD)</option>
                                    <option value="USD">美元 (USD)</option>
                                    <option value="CNY">人民幣 (CNY)</option>
                                    <option value="EUR">歐元 (EUR)</option>
                                    <option value="GBP">英鎊 (GBP)</option>
                                    <option value="JPY">日圓 (JPY)</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="savingsGoalAccount">連結戶口</label>
                            <select id="savingsGoalAccount" class="form-control">
                                <option value="">不連結戶口</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="savingsGoalCurrent">當前金額</label>
                                <input type="number" id="savingsGoalCurrent" class="form-control" min="0" step="0.01" value="0">
                            </div>
                            <div class="form-group">
                                <label for="savingsGoalDeadline">目標日期 (可選)</label>
                                <input type="date" id="savingsGoalDeadline" class="form-control">
                            </div>
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
        
        // 如果模態框已存在，則移除
        const existingModal = document.getElementById('savingsGoalModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // 添加模態框到頁面
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // 綁定事件
        document.getElementById('saveSavingsGoalButton').addEventListener('click', () => {
            this.saveSavingsGoal();
        });
        
        document.querySelector('#savingsGoalModal .close-button').addEventListener('click', () => {
            UiCore.closeModal('savingsGoalModal');
        });
        
        document.querySelector('#savingsGoalModal .modal-cancel').addEventListener('click', () => {
            UiCore.closeModal('savingsGoalModal');
        });
        
        // 填充戶口選擇下拉框
        const accounts = Store.getAccounts();
        const accountSelect = document.getElementById('savingsGoalAccount');
        accountSelect.innerHTML = '<option value="">不連結戶口</option>';
        
        // 記錄可用戶口
        console.log('可用戶口列表:', accounts);
        
        accounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account.id;
            option.textContent = `${account.name} (${account.currency})`;
            accountSelect.appendChild(option);
        });
        
        // 設定預設貨幣
        document.getElementById('savingsGoalCurrency').value = Store.settings.defaultCurrency;
        
        // 當戶口選擇變更時自動更新貨幣
        document.getElementById('savingsGoalAccount').addEventListener('change', function() {
            const selectedAccountId = this.value;
            console.log('選擇的戶口變更為:', selectedAccountId);
            
            if (selectedAccountId) {
                const account = Store.getAccount(selectedAccountId);
                if (account) {
                    document.getElementById('savingsGoalCurrency').value = account.currency;
                    console.log('根據選擇的戶口更新貨幣為:', account.currency);
                }
            }
        });
        
        // 顯示模態框
        UiCore.showModal('savingsGoalModal');
    },
    
    /**
     * 顯示編輯儲蓄目標模態框
     */
    showEditSavingsGoalModal: function(goalId) {
        // 先顯示新增模態框
        this.showAddSavingsGoalModal();
        
        // 取得儲蓄目標
        const goal = Store.getSavingsGoal(goalId);
        if (!goal) {
            Utils.showToast('找不到指定儲蓄目標', 'error');
            return;
        }
        
        console.log('編輯儲蓄目標:', goal);
        console.log('目標連結戶口ID:', goal.accountId);
        
        // 修改標題
        document.querySelector('#savingsGoalModal .modal-header h3').textContent = '編輯儲蓄目標';
        
        // 填充表單
        document.getElementById('editSavingsGoalId').value = goal.id;
        document.getElementById('savingsGoalName').value = goal.name;
        document.getElementById('savingsGoalAmount').value = goal.targetAmount;
        document.getElementById('savingsGoalCurrency').value = goal.currency;
        document.getElementById('savingsGoalCurrent').value = goal.currentAmount;
        document.getElementById('savingsGoalDeadline').value = goal.deadline || '';
        document.getElementById('savingsGoalNote').value = goal.note || '';
        
        // 設置連結戶口
        const accountSelect = document.getElementById('savingsGoalAccount');
        if (goal.accountId) {
            console.log('嘗試選擇目標戶口:', goal.accountId);
            accountSelect.value = goal.accountId;
            console.log('設置戶口選擇器值後:', accountSelect.value);
        } else {
            accountSelect.value = '';
            console.log('目標沒有連結戶口，戶口選擇器設為空');
        }
    },
    
    /**
     * 保存儲蓄目標
     */
    saveSavingsGoal: function() {
        // 取得表單資料
        const goalId = document.getElementById('editSavingsGoalId').value;
        const name = document.getElementById('savingsGoalName').value;
        const targetAmount = parseFloat(document.getElementById('savingsGoalAmount').value);
        const currency = document.getElementById('savingsGoalCurrency').value;
        const currentAmount = parseFloat(document.getElementById('savingsGoalCurrent').value);
        const deadline = document.getElementById('savingsGoalDeadline').value;
        const note = document.getElementById('savingsGoalNote').value;
        const accountId = document.getElementById('savingsGoalAccount').value; // 獲取連結戶口 ID
        
        console.log('保存儲蓄目標 - 表單數據:', {
            goalId,
            name,
            targetAmount,
            currency,
            currentAmount,
            deadline,
            note,
            accountId
        });
        
        // 驗證
        if (!name) {
            Utils.showToast('請輸入目標名稱', 'error');
            return;
        }
        
        if (isNaN(targetAmount) || targetAmount <= 0) {
            Utils.showToast('請輸入有效的目標金額', 'error');
            return;
        }
        
        // 如果選擇了戶口，確保貨幣匹配
        if (accountId) {
            const account = Store.getAccount(accountId);
            if (account && account.currency !== currency) {
                Utils.showToast('儲蓄目標貨幣必須與連結戶口貨幣一致', 'error');
                return;
            }
        }
        
        // 準備資料 - 特別注意處理 accountId
        const goalData = {
            name,
            targetAmount,
            currency,
            currentAmount: isNaN(currentAmount) ? 0 : currentAmount,
            deadline,
            note,
            accountId: accountId || null // 確保 accountId 為 null 而不是空字符串
        };
        
        console.log('準備保存的目標數據:', goalData);
        
  // 新增或更新目標
  let result;
  if (goalId) {
      console.log(`更新現有儲蓄目標: ${goalId}`);
      // 嘗試使用 App.updateSavingsGoal
      result = App.updateSavingsGoal(goalId, goalData);
      
      // 檢查保存後 accountId 是否正確保存
      const updatedGoal = Store.getSavingsGoal(goalId);
      const accountIdSaved = updatedGoal && updatedGoal.accountId === goalData.accountId;
      console.log(`戶口 ID 是否正確保存: ${accountIdSaved}`);
      
      // 如果 accountId 未正確保存，使用直接方法重新保存
      if (!accountIdSaved) {
          console.log('檢測到 accountId 未正確保存，使用直接方法重新保存');
          // 使用我們新添加的直接更新方法
          const directResult = this.directUpdateSavingsGoal(goalId, {
              ...updatedGoal,
              accountId: goalData.accountId
          });
          
          if (directResult) {
              console.log('使用直接方法保存成功');
              result = true;
          }
      }
  } else {
      console.log('建立新儲蓄目標');
      result = App.addSavingsGoal(goalData);
  }
        
        console.log('保存結果:', result);
        
        // 處理結果
        if (result) {
            UiCore.closeModal('savingsGoalModal');
            
            // 驗證保存結果
            if (goalId) {
                const updatedGoal = Store.getSavingsGoal(goalId);
                console.log('保存後的目標數據:', updatedGoal);
                
                // 特別檢查戶口 ID 是否正確保存
                console.log(`戶口 ID 是否正確保存: ${updatedGoal.accountId === goalData.accountId}`);
            }
            
            Utils.showToast(goalId ? '儲蓄目標已更新' : '儲蓄目標已建立', 'success');
            this.refresh();
        } else {
            Utils.showToast(goalId ? '更新儲蓄目標失敗' : '建立儲蓄目標失敗', 'error');
        }
    },
    
    /**
     * 刪除儲蓄目標
     */
    deleteSavingsGoal: function(goalId) {
        // 確認刪除
        const goal = Store.getSavingsGoal(goalId);
        if (!goal) {
            Utils.showToast('找不到指定儲蓄目標', 'error');
            return;
        }
        
        if (!confirm(`確定要刪除儲蓄目標「${goal.name}」嗎？此操作無法復原。`)) {
            return;
        }
        
        // 執行刪除
        const result = App.deleteSavingsGoal(goalId);
        
        // 處理結果
        if (result) {
            Utils.showToast('儲蓄目標已刪除', 'success');
            this.refresh();
        } else {
            Utils.showToast('刪除儲蓄目標失敗', 'error');
        }
    },
    
    /**
     * 保存編輯後的儲蓄目標
     * 注意：此方法已被 saveSavingsGoal 取代，僅作參考
     */
    saveEditedGoal: function() {
        const goalId = document.getElementById('editGoalId').value;
        
        if (!goalId) {
            Utils.showToast('無效的儲蓄目標ID', 'error');
            return;
        }
        
        // 獲取現有目標
        const existingGoal = Store.getSavingsGoal(goalId);
        if (!existingGoal) {
            Utils.showToast('找不到儲蓄目標', 'error');
            return;
        }
        
        // 獲取編輯表單中的值
        const name = document.getElementById('editGoalName').value;
        const targetAmount = parseFloat(document.getElementById('editGoalTarget').value);
        const currency = document.getElementById('editGoalCurrency').value;
        const deadline = document.getElementById('editGoalDeadline').value;
        
        // 獲取連結戶口
        const accountId = document.getElementById('editGoalAccount').value;
        
        // 記錄用於診斷
        console.log('保存儲蓄目標連結戶口:', accountId);
        console.log('選擇的戶口ID:', accountId);
        console.log('編輯表單值:', {
            goalId,
            name,
            targetAmount,
            currency,
            deadline,
            accountId
        });
        
        // 驗證
        if (!name) {
            Utils.showToast('請輸入名稱', 'error');
            return;
        }
        
        if (isNaN(targetAmount) || targetAmount <= 0) {
            Utils.showToast('請輸入有效的目標金額', 'error');
            return;
        }
        
        // 準備更新的數據
        const updatedGoal = {
            ...existingGoal,
            name,
            targetAmount,
            currency,
            deadline: deadline || null,
            // 明確設置 accountId，即使是空字符串也要設置
            accountId: accountId || null
        };
        
        console.log('更新前的目標:', existingGoal);
        console.log('更新後的目標數據:', updatedGoal);
        
        // 保存更新
        const result = Store.updateSavingsGoal(goalId, updatedGoal);
        
        console.log('保存結果:', result);
        
        if (result) {
            Utils.showToast('儲蓄目標已更新', 'success');
            UiCore.closeModal('editGoalModal');
            this.refresh();
        } else {
            Utils.showToast('更新儲蓄目標失敗', 'error');
        }
    },
    
    /**
     * 顯示儲蓄貢獻模態框
     */
    showContributeModal: function(goalId) {
        // 取得儲蓄目標
        const goal = Store.getSavingsGoal(goalId);
        if (!goal) {
            Utils.showToast('找不到指定儲蓄目標', 'error');
            return;
        }
        
        console.log('顯示貢獻模態框，目標:', goal);
        console.log('目標連結戶口:', goal.accountId);
        
        // 獲取連結戶口信息
        let linkedAccountHtml = '';
        if (goal.accountId) {
            const account = Store.getAccount(goal.accountId);
            if (account) {
                linkedAccountHtml = `
                    <div class="form-group">
                        <label>連結戶口</label>
                        <div class="linked-account-info">${account.name} (${Utils.formatCurrency(account.balance, account.currency)})</div>
                    </div>
                `;
                console.log('連結戶口信息:', account.name, account.id);
            } else {
                console.log('找不到連結戶口:', goal.accountId);
            }
        } else {
            console.log('目標沒有連結戶口');
        }
        
        // 建立模態框 HTML
        const modalHtml = `
            <div id="contributeModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>為「${goal.name}」增加進度</h3>
                        <span class="close-button">&times;</span>
                    </div>
                    <div class="modal-body">
                        <input type="hidden" id="contributeSavingsGoalId" value="${goal.id}">
                        
                        ${linkedAccountHtml}
                        
                        <div class="form-group">
                            <label for="contributeType">貢獻方式</label>
                            <select id="contributeType" class="form-control">
                                <option value="manual">手動輸入</option>
                                ${goal.accountId ? '<option value="direct">直接存入連結戶口</option>' : ''}
                                <option value="transfer">從其他戶口轉入</option>
                            </select>
                        </div>
                        
                        <div id="manualContributionSection">
                            <div class="form-group">
                                <label for="contributeAmount">金額</label>
                                <input type="number" id="contributeAmount" class="form-control" min="0" step="0.01">
                            </div>
                        </div>
                        
                        <div id="transferContributionSection" style="display:none;">
                            <div class="form-group">
                                <label for="fromAccount">來源戶口</label>
                                <select id="fromAccount" class="form-control">
                                    <option value="" disabled selected>選擇戶口</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="transferAmount">轉賬金額</label>
                                <input type="number" id="transferAmount" class="form-control" min="0" step="0.01">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>當前進度</label>
                            <div class="progress-info">
                                <p>${Utils.formatCurrency(goal.currentAmount, goal.currency)} / ${Utils.formatCurrency(goal.targetAmount, goal.currency)}</p>
                                <p>${Math.round((goal.currentAmount / goal.targetAmount) * 100)}%</p>
                            </div>
                            <div class="budget-progress-container">
                                <div class="budget-progress-bar" style="width: ${Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)}%"></div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button id="saveContributionButton" class="btn btn-primary">增加進度</button>
                        <button class="btn btn-secondary modal-cancel">取消</button>
                    </div>
                </div>
            </div>
        `;
        
        // 如果模態框已存在，則移除
        const existingModal = document.getElementById('contributeModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // 添加模態框到頁面
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // 綁定事件
        document.getElementById('saveContributionButton').addEventListener('click', () => {
            this.saveContribution();
        });
        
        document.querySelector('#contributeModal .close-button').addEventListener('click', () => {
            UiCore.closeModal('contributeModal');
        });
        
        document.querySelector('#contributeModal .modal-cancel').addEventListener('click', () => {
            UiCore.closeModal('contributeModal');
        });
        
        // 處理貢獻方式切換
        document.getElementById('contributeType').addEventListener('change', function() {
            const contributeType = this.value;
            console.log('貢獻方式變更為:', contributeType);
            
            if (contributeType === 'manual' || contributeType === 'direct') {
                document.getElementById('manualContributionSection').style.display = 'block';
                document.getElementById('transferContributionSection').style.display = 'none';
            } else if (contributeType === 'transfer') {
                document.getElementById('manualContributionSection').style.display = 'none';
                document.getElementById('transferContributionSection').style.display = 'block';
            }
        });
        
        // 填充來源戶口下拉框
        const accounts = Store.getAccounts();
        const fromAccountSelect = document.getElementById('fromAccount');
        
        accounts.forEach(account => {
            // 如果有連結戶口且當前遍歷的戶口與連結戶口相同，則跳過
            if (goal.accountId && account.id === goal.accountId) {
                return;
            }
            
            // 只顯示與目標貨幣相同的戶口
            if (account.currency === goal.currency) {
                const option = document.createElement('option');
                option.value = account.id;
                option.textContent = `${account.name} (${Utils.formatCurrency(account.balance, account.currency)})`;
                fromAccountSelect.appendChild(option);
            }
        });
        
        // 顯示模態框
        UiCore.showModal('contributeModal');
    },
    
    /**
     * 保存儲蓄貢獻
     */
    saveContribution: function() {
        // 取得目標 ID
        const goalId = document.getElementById('contributeSavingsGoalId').value;
        const goal = Store.getSavingsGoal(goalId);
        
        if (!goal) {
            Utils.showToast('找不到指定儲蓄目標', 'error');
            return;
        }
        
        console.log(`處理儲蓄目標 ${goal.name} 的貢獻`);
        console.log('目標連結戶口:', goal.accountId);
        
        // 取得貢獻方式
        const contributeType = document.getElementById('contributeType').value;
        let amount = 0;
        
        console.log('選擇的貢獻方式:', contributeType);
        
        // 根據貢獻方式處理
        if (contributeType === 'manual') {
            // 手動輸入方式
            amount = parseFloat(document.getElementById('contributeAmount').value);
            
            if (isNaN(amount) || amount <= 0) {
                Utils.showToast('請輸入有效的金額', 'error');
                return;
            }
            
            console.log(`手動輸入金額: ${amount} ${goal.currency}`);
            
            // 更新儲蓄目標進度
            const updatedGoal = {
                ...goal,
                currentAmount: goal.currentAmount + amount
            };
            
            console.log('更新前進度:', goal.currentAmount);
            console.log('更新後進度:', updatedGoal.currentAmount);
            
            // 使用 Store API 直接更新
            const result = Store.updateSavingsGoal(goalId, updatedGoal);
            
            console.log('手動更新結果:', result);
            
            if (result) {
                Utils.showToast(`已添加 ${Utils.formatCurrency(amount, goal.currency)} 到儲蓄目標`, 'success');
            } else {
                Utils.showToast('更新儲蓄目標進度失敗', 'error');
                return;
            }
        } else if (contributeType === 'direct' && goal.accountId) {
            // 直接存入連結戶口
            amount = parseFloat(document.getElementById('contributeAmount').value);
            
            if (isNaN(amount) || amount <= 0) {
                Utils.showToast('請輸入有效的金額', 'error');
                return;
            }
            
            console.log(`直接存入連結戶口: ${amount} ${goal.currency}`);
            
            // 建立向連結戶口存款的交易
            const linkedAccount = Store.getAccount(goal.accountId);
            
            if (!linkedAccount) {
                Utils.showToast('連結戶口不存在', 'error');
                return;
            }
            
            // 建立存款交易
            const transaction = {
                type: 'income',
                accountId: goal.accountId,
                amount: amount,
                date: DayManager.getCurrentDate(),
                note: `儲蓄目標「${goal.name}」的貢獻`,
                currency: goal.currency,
                category: 'savings' // 假設有一個儲蓄類別
            };
            
            console.log('建立存款交易:', transaction);
            
            // 執行交易
            const transactionResult = App.addTransaction(transaction);
            
            console.log('交易結果:', transactionResult);
            
            if (!transactionResult) {
                Utils.showToast('交易失敗', 'error');
                return;
            }
            
            // 更新儲蓄目標進度
            const updatedGoal = {
                ...goal,
                currentAmount: goal.currentAmount + amount
            };
            
            console.log('更新前進度:', goal.currentAmount);
            console.log('更新後進度:', updatedGoal.currentAmount);
            
            // 使用 Store API 直接更新
            const goalResult = Store.updateSavingsGoal(goalId, updatedGoal);
            
            console.log('目標更新結果:', goalResult);
            
            if (goalResult) {
                Utils.showToast(`已存入 ${Utils.formatCurrency(amount, goal.currency)} 並更新儲蓄目標進度`, 'success');
            } else {
                Utils.showToast('交易成功但更新儲蓄目標進度失敗', 'warning');
                return;
            }
        } else if (contributeType === 'transfer') {
            // 從其他戶口轉賬
            const fromAccountId = document.getElementById('fromAccount').value;
            amount = parseFloat(document.getElementById('transferAmount').value);
            
            if (!fromAccountId) {
                Utils.showToast('請選擇來源戶口', 'error');
                return;
            }
            
            if (isNaN(amount) || amount <= 0) {
                Utils.showToast('請輸入有效的轉賬金額', 'error');
                return;
            }
            
            console.log(`從戶口 ${fromAccountId} 轉賬 ${amount} ${goal.currency}`);
            
            const fromAccount = Store.getAccount(fromAccountId);
            
            if (!fromAccount) {
                Utils.showToast('來源戶口不存在', 'error');
                return;
            }
            
            // 檢查餘額
            if (amount > fromAccount.balance) {
                Utils.showToast('餘額不足', 'error');
                return;
            }
            
            // 如果有連結戶口，則建立轉賬交易
            if (goal.accountId) {
                const transaction = {
                    type: 'transfer',
                    accountId: fromAccountId,
                    toAccountId: goal.accountId,
                    amount: amount,
                    date: DayManager.getCurrentDate(),
                    note: `儲蓄目標「${goal.name}」的貢獻`,
                    currency: fromAccount.currency
                };
                
                console.log(`執行轉賬交易: ${JSON.stringify(transaction)}`);
                
                // 執行轉賬
                const transactionResult = App.addTransaction(transaction);
                
                if (!transactionResult) {
                    Utils.showToast('執行轉賬失敗', 'error');
                    return;
                }
                
                // 直接更新儲蓄目標進度（不依賴事件機制）
                try {
                    // 重新獲取最新的目標數據
                    const updatedGoal = Store.getSavingsGoal(goalId);
                    if (!updatedGoal) {
                        Utils.showToast('找不到儲蓄目標', 'error');
                        return;
                    }
                    
                    // 計算新的進度
                    const newAmount = updatedGoal.currentAmount + amount;
                    console.log(`手動更新儲蓄目標進度: ${updatedGoal.currentAmount} + ${amount} = ${newAmount}`);
                    
                    // 直接更新儲蓄目標的進度
                    const updatedGoalData = {
                        ...updatedGoal,
                        currentAmount: newAmount
                    };
                    
                    // 保存更新後的儲蓄目標
                    const updateResult = Store.updateSavingsGoal(goalId, updatedGoalData);
                    console.log(`儲蓄目標進度手動更新結果: ${updateResult}`);
                    
                    if (!updateResult) {
                        Utils.showToast('轉賬成功但更新儲蓄目標進度失敗', 'warning');
                    } else {
                        Utils.showToast(`成功轉賬 ${Utils.formatCurrency(amount, fromAccount.currency)} 到儲蓄目標`, 'success');
                    }
                } catch (error) {
                    console.error('更新儲蓄目標進度時發生錯誤:', error);
                    Utils.showToast('更新儲蓄目標進度時發生錯誤', 'error');
                }
                
                // 觸發轉賬完成事件 - 通知其他模塊
                const event = new CustomEvent('transferCompleted', {
                    detail: {
                        transaction: transaction,
                        success: true
                    }
                });
                document.dispatchEvent(event);
            } else {
                // 如果沒有連結戶口，則只從來源戶口扣款
                const transaction = {
                    type: 'expense',
                    accountId: fromAccountId,
                    amount: amount,
                    date: DayManager.getCurrentDate(),
                    note: `儲蓄目標「${goal.name}」的貢獻`,
                    currency: fromAccount.currency,
                    category: 'savings' // 假設有一個儲蓄類別
                };
                
                console.log('執行支出交易:', transaction);
                
                // 執行交易
                const transactionResult = App.addTransaction(transaction);
                
                if (!transactionResult) {
                    Utils.showToast('交易失敗', 'error');
                    return;
                }
                
                // 直接更新儲蓄目標進度（不使用 App.updateSavingsGoalProgress）
                try {
                    // 重新獲取最新的目標數據
                    const updatedGoal = Store.getSavingsGoal(goalId);
                    if (!updatedGoal) {
                        Utils.showToast('找不到儲蓄目標', 'error');
                        return;
                    }
                    
                    // 計算新的進度
                    const newAmount = updatedGoal.currentAmount + amount;
                    console.log(`更新儲蓄目標進度: ${updatedGoal.currentAmount} + ${amount} = ${newAmount}`);
                    
                    // 直接更新儲蓄目標的進度
                    const updatedGoalData = {
                        ...updatedGoal,
                        currentAmount: newAmount
                    };
                    
                    // 保存更新後的儲蓄目標
                    const updateResult = Store.updateSavingsGoal(goalId, updatedGoalData);
                    console.log(`儲蓄目標進度更新結果: ${updateResult}`);
                    
                    if (!updateResult) {
                        Utils.showToast('交易成功但更新儲蓄目標進度失敗', 'warning');
                    } else {
                        Utils.showToast(`已從 ${fromAccount.name} 轉出 ${Utils.formatCurrency(amount, fromAccount.currency)} 到儲蓄目標`, 'success');
                    }
                } catch (error) {
                    console.error('更新儲蓄目標進度時發生錯誤:', error);
                    Utils.showToast('更新儲蓄目標進度時發生錯誤', 'error');
                }
            }
        }
        
        // 關閉模態框
        UiCore.closeModal('contributeModal');
        
        // 重新整理儲蓄目標列表
        this.refresh();
        
        // 更新財務概覽
        UiCore.updateFinancialSnapshot();
    },
    
    /**
     * 重新整理儲蓄目標列表
     */
    refresh: function() {
        console.log('刷新儲蓄目標列表');
        // 取得所有儲蓄目標
        const goals = Store.getSavingsGoals();
        const goalsList = document.getElementById('savingsGoalsList');
        
        if (!goalsList) {
            console.error('找不到儲蓄目標列表容器元素');
            return;
        }
        
        // 清空列表
        goalsList.innerHTML = '';
        
        // 如果沒有目標，顯示提示訊息
        if (!goals || goals.length === 0) {
            goalsList.innerHTML = '<p class="empty-message">尚未設置儲蓄目標</p>';
            return;
        }
        
        console.log(`找到 ${goals.length} 個儲蓄目標`);
        
        // 顯示目標
        goals.forEach(goal => {
            // 計算進度百分比
            const progress = (goal.currentAmount / goal.targetAmount) * 100;
            const percentage = Math.min(Math.max(progress, 0), 100);
            
            // 計算剩餘天數
            let deadlineInfo = '';
            if (goal.deadline) {
                const deadline = new Date(goal.deadline);
                const today = new Date();
                
                const timeDiff = deadline.getTime() - today.getTime();
                const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
                
                if (daysDiff > 0) {
                    deadlineInfo = `距目標日期還有 ${daysDiff} 天`;
                } else if (daysDiff === 0) {
                    deadlineInfo = '今天是目標日期';
                } else {
                    deadlineInfo = `已超過目標日期 ${Math.abs(daysDiff)} 天`;
                }
            }
            
            // 獲取連結戶口信息
            let accountInfo = '';
            if (goal.accountId) {
                const account = Store.getAccount(goal.accountId);
                if (account) {
                    accountInfo = `
                    <div class="savings-goal-account">
                        <i class="fas fa-link"></i> 連結戶口: ${account.name}
                    </div>`;
                }
            }
            
            // 構建 HTML
            const goalHtml = `
                <div class="savings-goal-card" data-id="${goal.id}">
                    <div class="savings-goal-header">
                        <div class="savings-goal-title">${goal.name}</div>
                        <div class="savings-goal-target">${Utils.formatCurrency(goal.targetAmount, goal.currency)}</div>
                    </div>
                    <div class="savings-goal-progress-bar">
                        <div class="savings-goal-progress-fill" style="width: ${percentage}%"></div>
                    </div>
                    <div class="savings-goal-stats">
                        <div>已儲蓄: ${Utils.formatCurrency(goal.currentAmount, goal.currency)}</div>
                        <div>${Math.round(percentage)}%</div>
                    </div>
                    ${accountInfo}
                    ${goal.deadline ? `
                    <div class="savings-goal-deadline">
                        <div>目標日期: ${goal.deadline}</div>
                        <div class="deadline-info">${deadlineInfo}</div>
                    </div>
                    ` : ''}
                    ${goal.note ? `<div class="savings-goal-note">${goal.note}</div>` : ''}
                    <div class="savings-goal-actions">
                        <button class="btn btn-primary contribute-goal" data-id="${goal.id}">
                            <i class="fas fa-plus"></i> 增加進度
                        </button>
                        <button class="btn-icon edit-goal" title="編輯" data-id="${goal.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete-goal" title="刪除" data-id="${goal.id}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;
            
            goalsList.innerHTML += goalHtml;
        });
        
        // 添加診斷按鈕
        const diagnosticButton = document.createElement('button');
        diagnosticButton.className = 'btn btn-info';
        diagnosticButton.style.marginTop = '20px';
        diagnosticButton.textContent = '診斷儲蓄目標資料';
        diagnosticButton.onclick = () => this.showDiagnostics();
        
        goalsList.appendChild(diagnosticButton);
    },
    
    /**
     * 顯示診斷信息
     */
    showDiagnostics: function() {
        // 獲取所有儲蓄目標
        const goals = Store.getSavingsGoals();
        
        // 構建診斷訊息
        let message = '<h3>儲蓄目標詳細信息</h3>';
        
        goals.forEach(goal => {
            const accountInfo = goal.accountId ? 
                `<span style="color:green">已連結戶口: ${goal.accountId}</span>` : 
                '<span style="color:red">無連結戶口</span>';
                
            message += `
                <div style="margin-bottom:10px; padding:10px; border:1px solid #ccc;">
                    <p><strong>${goal.name}</strong></p>
                    <p>目標ID: ${goal.id}</p>
                    <p>${accountInfo}</p>
                    <p>進度: ${Utils.formatCurrency(goal.currentAmount, goal.currency)} / ${Utils.formatCurrency(goal.targetAmount, goal.currency)}</p>
                    <p>資料: ${JSON.stringify(goal)}</p>
                </div>
            `;
        });
        
        // 顯示診斷信息
        alert(message);
    },
    
    /**
     * 測試更新儲蓄目標進度
     */
    testUpdateGoalProgress: function(goalId, amount) {
        if (!goalId) {
            const goals = Store.getSavingsGoals();
            if (goals && goals.length > 0) {
                goalId = goals[0].id;
            } else {
                Utils.showToast('沒有找到任何儲蓄目標', 'error');
                return;
            }
        }
        
        // 取得目標
        const goal = Store.getSavingsGoal(goalId);
        if (!goal) {
            Utils.showToast('找不到指定儲蓄目標', 'error');
            return;
        }
        
        // 測試金額
        const testAmount = amount || 100;
        
        console.log(`測試更新儲蓄目標 ${goal.name}，當前進度: ${goal.currentAmount}`);
        
        // 直接更新
        const newAmount = goal.currentAmount + testAmount;
        
        // 準備更新的數據
        const updatedGoal = {
            ...goal,
            currentAmount: newAmount
        };
        
        // 直接使用 Store API 更新
        console.log(`嘗試更新儲蓄目標進度: ${goal.currentAmount} -> ${newAmount}`);
        const updateResult = Store.updateSavingsGoal(goalId, updatedGoal);
        
        console.log(`測試更新結果: ${updateResult}`);
        
        if (updateResult) {
            Utils.showToast(`測試成功！儲蓄目標進度已更新為 ${Utils.formatCurrency(newAmount, goal.currency)}`, 'success');
            this.refresh();
        } else {
            Utils.showToast('測試失敗！無法更新儲蓄目標進度', 'error');
        }
    },
    /**
 * 直接更新儲蓄目標（臨時方案）
 * 繞過可能有問題的 Store.updateSavingsGoal 方法
 */
directUpdateSavingsGoal: function(goalId, updatedGoal) {
    try {
        console.log('使用直接更新方法保存儲蓄目標:', goalId);
        console.log('更新數據:', updatedGoal);
        
        // 從 localStorage 直接獲取所有儲蓄目標
        let goals = [];
        try {
            goals = JSON.parse(localStorage.getItem('savingsGoals') || '[]');
        } catch (e) {
            console.error('解析本地存儲的儲蓄目標失敗:', e);
            goals = [];
        }
        
        // 找到要更新的目標索引
        const index = goals.findIndex(goal => goal.id === goalId);
        if (index === -1) {
            console.error('找不到要更新的儲蓄目標:', goalId);
            return false;
        }
        
        // 確保 accountId 正確設置
        if (updatedGoal.accountId === '') {
            updatedGoal.accountId = null;
        }
        
        // 更新目標
        goals[index] = {
            ...updatedGoal,
            id: goalId // 確保 ID 不變
        };
        
        console.log('更新後的目標數據:', goals[index]);
        
        // 直接保存到 localStorage
        localStorage.setItem('savingsGoals', JSON.stringify(goals));
        
        // 驗證保存結果
        const savedGoals = JSON.parse(localStorage.getItem('savingsGoals') || '[]');
        const savedGoal = savedGoals.find(goal => goal.id === goalId);
        
        console.log('保存後檢查目標數據:', savedGoal);
        console.log('accountId 是否正確保存:', 
                   savedGoal && savedGoal.accountId === updatedGoal.accountId);
        
        return true;
    } catch (error) {
        console.error('直接更新儲蓄目標失敗:', error);
        return false;
    }
},
};

// 確保在DOM加載完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM已加載，準備初始化SavingsManager');
    setTimeout(() => {
        if (typeof SavingsManager !== 'undefined') {
            SavingsManager.init();
        } else {
            console.error('SavingsManager未定義');
        }
    }, 500);
});