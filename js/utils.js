// 通用工具函數

// 生成唯一ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// 顯示確認對話框
function showConfirmDialog(message, onConfirm) {
    console.log("顯示確認對話框:", message);

    try {
        const confirmModal = document.getElementById('confirmModal');
        const confirmMessage = document.getElementById('confirmMessage');
        const confirmYesButton = document.getElementById('confirmYesButton');
        const confirmNoButton = document.getElementById('confirmNoButton');

        if (!confirmModal || !confirmMessage || !confirmYesButton || !confirmNoButton) {
            console.error("找不到確認對話框元素");
            return;
        }

        // 設置確認消息
        confirmMessage.textContent = message;

        // 設置確認按鈕事件
        confirmYesButton.onclick = function () {
            closeCurrentModal();
            if (typeof onConfirm === 'function') {
                onConfirm();
            }
        };

        // 設置取消按鈕事件
        confirmNoButton.onclick = function () {
            closeCurrentModal();
        };

        // 顯示確認對話框
        confirmModal.classList.add('active');
    } catch (error) {
        console.error("顯示確認對話框時發生錯誤:", error);
        // 如果顯示確認對話框失敗，則直接執行確認操作
        if (typeof onConfirm === 'function') {
            onConfirm();
        }
    }
}

// 顯示提示消息
function showToast(message, type = 'info', duration = 3000) {
    console.log(`顯示提示消息 (${type}):`, message);

    try {
        const toast = document.getElementById('toast');

        if (!toast) {
            console.error("找不到提示消息元素");
            return;
        }

        // 設置消息
        toast.textContent = message;

        // 設置類型
        toast.className = 'toast';
        toast.classList.add(type);

        // 顯示提示消息
        toast.classList.remove('hidden');

        // 設置定時器，自動隱藏提示消息
        setTimeout(() => {
            toast.classList.add('hidden');
        }, duration);
    } catch (error) {
        console.error("顯示提示消息時發生錯誤:", error);
        // 使用alert作為備用
        alert(`${type.toUpperCase()}: ${message}`);
    }
}

// 獲取賬戶類型名稱
function getAccountTypeName(accountType) {
    try {
        const accountTypeNames = {
            'cash': '現金',
            'bank': '銀行戶口',
            'credit': '信用卡',
            'investment': '投資',
            'other': '其他'
        };

        return accountTypeNames[accountType] || '其他';
    } catch (error) {
        console.error("獲取賬戶類型名稱時發生錯誤:", error);
        return '其他';
    }
}

// 格式化日期
function formatDate(dateString) {
    try {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    } catch (error) {
        console.error("格式化日期時發生錯誤:", error);
        return dateString;
    }
}