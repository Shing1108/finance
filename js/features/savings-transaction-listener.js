/**
 * savings-transaction-listener.js - 儲蓄目標交易監聽器
 * 這個文件負責監聽所有交易，並更新相關的儲蓄目標進度
 */

const SavingsTransactionListener = {
    init: function() {
        console.log('初始化儲蓄目標交易監聽器...');
        
        // 監聽交易完成事件
        document.addEventListener('transactionCompleted', (event) => {
            console.log('檢測到交易完成事件，檢查是否需要更新儲蓄目標');
            this.checkAndUpdateSavingsGoals(event.detail);
        });
        
        // 直接監聽轉賬按鈕點擊
        const transferButton = document.getElementById('confirmTransferButton');
        if (transferButton) {
            transferButton.addEventListener('click', () => {
                setTimeout(() => {
                    this.checkAccountTransfers();
                }, 500); // 給交易處理一些時間
            });
        }
        
        console.log('儲蓄目標交易監聽器初始化完成');
    },
    
    // 檢查最近的轉賬交易並更新儲蓄目標
    checkAccountTransfers: function() {
        const fromAccountId = document.getElementById('fromAccount')?.value;
        const toAccountId = document.getElementById('toAccount')?.value;
        const amount = parseFloat(document.getElementById('transferAmount')?.value || 0);
        
        if (!fromAccountId || !toAccountId || amount <= 0) return;
        
        console.log(`檢測到從戶口 ${fromAccountId} 轉賬 ${amount} 到戶口 ${toAccountId}`);
        
        // 構建一個模擬的交易對象
        const transaction = {
            type: 'transfer',
            accountId: fromAccountId,
            toAccountId: toAccountId,
            amount: amount,
            date: new Date().toISOString().split('T')[0]
        };
        
        this.checkAndUpdateSavingsGoals(transaction);
    },
    
    // 檢查並更新與交易相關的儲蓄目標
    checkAndUpdateSavingsGoals: function(transaction) {
        if (!transaction) {
            console.error('無效的交易數據');
            return;
        }
        
        console.log(`檢查交易: ${JSON.stringify(transaction)}`);
        
        // 獲取所有儲蓄目標
        const goals = Store.getSavingsGoals();
        if (!goals || goals.length === 0) {
            console.log('沒有找到儲蓄目標');
            return;
        }
        
        console.log(`找到 ${goals.length} 個儲蓄目標，開始檢查`);
        
        // 檢查每個目標
        goals.forEach(goal => {
            // 只檢查有連結戶口的目標
            if (goal.accountId) {
                console.log(`檢查儲蓄目標 "${goal.name}"，連結戶口: ${goal.accountId}`);
                
                // 如果是轉賬到目標連結的戶口
                if (transaction.type === 'transfer' && transaction.toAccountId === goal.accountId) {
                    console.log(`找到轉賬到儲蓄目標 "${goal.name}" 連結戶口的交易`);
                    
                    // 獲取最新的目標數據（以防數據已經變更）
                    const currentGoal = Store.getSavingsGoal(goal.id);
                    if (!currentGoal) {
                        console.error(`找不到儲蓄目標 ${goal.id}`);
                        return;
                    }
                    
                    // 處理可能的貨幣轉換
                    let contributionAmount = transaction.amount;
                    const fromAccount = Store.getAccount(transaction.accountId);
                    
                    if (fromAccount && fromAccount.currency !== currentGoal.currency) {
                        const rate = CurrencyManager.getExchangeRate(fromAccount.currency, currentGoal.currency);
                        contributionAmount = transaction.amount * rate;
                        console.log(`貨幣轉換: ${transaction.amount} ${fromAccount.currency} = ${contributionAmount} ${currentGoal.currency}`);
                    }
                    
                    // 計算新的進度
                    const newAmount = currentGoal.currentAmount + contributionAmount;
                    console.log(`更新儲蓄目標進度: ${currentGoal.currentAmount} + ${contributionAmount} = ${newAmount}`);
                    
                    // 更新儲蓄目標的進度
                    const updatedGoalData = {
                        ...currentGoal,
                        currentAmount: newAmount
                    };
                    
                    // 保存更新後的儲蓄目標
                    const updateResult = Store.updateSavingsGoal(currentGoal.id, updatedGoalData);
                    console.log(`儲蓄目標進度更新結果: ${updateResult}`);
                    
                    // 顯示提示
                    Utils.showToast(`已將 ${Utils.formatCurrency(contributionAmount, currentGoal.currency)} 貢獻到儲蓄目標「${currentGoal.name}」`, 'success');
                    
                    // 刷新儲蓄目標UI
                    if (typeof SavingsManager !== 'undefined' && SavingsManager.refresh) {
                        console.log('刷新儲蓄目標UI');
                        SavingsManager.refresh();
                    }
                } 
                // 如果是直接收入到目標連結的戶口
                else if (transaction.type === 'income' && transaction.accountId === goal.accountId) {
                    console.log(`找到收入到儲蓄目標 "${goal.name}" 連結戶口的交易`);
                    
                    // 如果交易備註包含目標名稱，則更新進度
                    if (transaction.note && transaction.note.includes(goal.name)) {
                        // 獲取最新的目標數據
                        const currentGoal = Store.getSavingsGoal(goal.id);
                        if (!currentGoal) {
                            console.error(`找不到儲蓄目標 ${goal.id}`);
                            return;
                        }
                        
                        // 計算新的進度
                        const newAmount = currentGoal.currentAmount + transaction.amount;
                        console.log(`更新儲蓄目標進度: ${currentGoal.currentAmount} + ${transaction.amount} = ${newAmount}`);
                        
                        // 更新儲蓄目標的進度
                        const updatedGoalData = {
                            ...currentGoal,
                            currentAmount: newAmount
                        };
                        
                        // 保存更新後的儲蓄目標
                        const updateResult = Store.updateSavingsGoal(currentGoal.id, updatedGoalData);
                        console.log(`儲蓄目標進度更新結果: ${updateResult}`);
                        
                        // 刷新儲蓄目標UI
                        if (typeof SavingsManager !== 'undefined' && SavingsManager.refresh) {
                            console.log('刷新儲蓄目標UI');
                            SavingsManager.refresh();
                        }
                    }
                }
            }
        });
    }
};

// 在DOM加載完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM已加載，準備初始化SavingsTransactionListener');
    setTimeout(() => {
        if (typeof SavingsTransactionListener !== 'undefined') {
            SavingsTransactionListener.init();
        } else {
            console.error('SavingsTransactionListener未定義');
        }
    }, 800); // 給其他組件足夠的初始化時間
});