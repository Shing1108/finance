/**
 * models.js - 資料模型定義
 */

// 戶口模型
class Account {
    constructor(data = {}) {
        this.id = data.id || Utils.generateId();
        this.name = data.name || '';
        this.type = data.type || 'cash'; // cash, bank, credit, investment, other
        this.balance = parseFloat(data.balance || 0);
        this.currency = data.currency || 'HKD';
        this.note = data.note || '';
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
        this.order = data.order || 0;
    }

    // 取得戶口餘額（轉換為預設貨幣）
    getBalanceInDefaultCurrency(defaultCurrency) {
        if (this.currency === defaultCurrency) {
            return this.balance;
        }
        return CurrencyManager.convert(this.balance, this.currency, defaultCurrency);
    }

    // 更新餘額
    updateBalance(amount, operation = 'add') {
        if (operation === 'add') {
            this.balance += parseFloat(amount);
        } else if (operation === 'subtract') {
            this.balance -= parseFloat(amount);
        } else if (operation === 'set') {
            this.balance = parseFloat(amount);
        }
        this.updatedAt = new Date().toISOString();
        return this.balance;
    }

    // 轉為JSON
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            balance: this.balance,
            currency: this.currency,
            note: this.note,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            order: this.order
        };
    }
}

// 類別模型
class Category {
    constructor(data = {}) {
        this.id = data.id || Utils.generateId();
        this.name = data.name || '';
        this.type = data.type || 'expense'; // expense, income
        this.icon = data.icon || 'tag';
        this.color = data.color || '#4CAF50';
        this.order = data.order || 0;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    // 轉為JSON
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            icon: this.icon,
            color: this.color,
            order: this.order,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

// 交易模型
class Transaction {
    constructor(data = {}) {
        this.id = data.id || Utils.generateId();
        this.type = data.type || 'expense'; // expense, income, transfer
        this.amount = parseFloat(data.amount || 0);
        this.originalAmount = parseFloat(data.originalAmount || this.amount);
        this.accountId = data.accountId || '';
        this.toAccountId = data.toAccountId || ''; // 用於轉賬
        this.categoryId = data.categoryId || '';
        this.date = data.date || DateUtils.today();
        this.note = data.note || '';
        this.currency = data.currency || 'HKD';
        this.originalCurrency = data.originalCurrency || this.currency;
        this.exchangeRate = parseFloat(data.exchangeRate || 1);
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    // 轉為JSON
    toJSON() {
        return {
            id: this.id,
            type: this.type,
            amount: this.amount,
            originalAmount: this.originalAmount,
            accountId: this.accountId,
            toAccountId: this.toAccountId,
            categoryId: this.categoryId,
            date: this.date,
            note: this.note,
            currency: this.currency,
            originalCurrency: this.originalCurrency,
            exchangeRate: this.exchangeRate,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

// 預算模型
class Budget {
    constructor(data = {}) {
        this.id = data.id || Utils.generateId();
        this.categoryId = data.categoryId || '';
        this.amount = parseFloat(data.amount || 0);
        this.period = data.period || 'monthly'; // monthly, quarterly, yearly
        this.year = data.year || new Date().getFullYear();
        this.month = data.month || (new Date().getMonth() + 1);
        this.quarter = data.quarter || Math.ceil((new Date().getMonth() + 1) / 3);
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    // 檢查指定日期是否在預算週期內
    isDateInPeriod(date) {
        const dateObj = new Date(date);
        const year = dateObj.getFullYear();
        const month = dateObj.getMonth() + 1;
        
        if (this.year !== year) return false;
        
        if (this.period === 'monthly') {
            return month === this.month;
        } else if (this.period === 'quarterly') {
            const quarter = Math.ceil(month / 3);
            return quarter === this.quarter;
        } else if (this.period === 'yearly') {
            return true;
        }
        
        return false;
    }

    // 轉為JSON
    toJSON() {
        return {
            id: this.id,
            categoryId: this.categoryId,
            amount: this.amount,
            period: this.period,
            year: this.year,
            month: this.month,
            quarter: this.quarter,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

// 目標儲蓄模型
class SavingsGoal {
    constructor(data = {}) {
        this.id = data.id || Utils.generateId();
        this.name = data.name || '';
        this.targetAmount = parseFloat(data.targetAmount || 0);
        this.currentAmount = parseFloat(data.currentAmount || 0);
        this.currency = data.currency || 'HKD';
        this.deadline = data.deadline || '';
        this.note = data.note || '';
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
        this.completed = data.completed || false;
    }

    // 計算進度百分比
    getProgress() {
        if (this.targetAmount <= 0) return 0;
        const progress = (this.currentAmount / this.targetAmount) * 100;
        return Math.min(Math.max(progress, 0), 100);
    }

    // 更新進度
    updateAmount(amount, operation = 'add') {
        if (operation === 'add') {
            this.currentAmount += parseFloat(amount);
        } else if (operation === 'subtract') {
            this.currentAmount -= parseFloat(amount);
            this.currentAmount = Math.max(0, this.currentAmount);
        } else if (operation === 'set') {
            this.currentAmount = parseFloat(amount);
        }
        
        // 檢查是否達成目標
        if (this.currentAmount >= this.targetAmount) {
            this.completed = true;
        } else {
            this.completed = false;
        }
        
        this.updatedAt = new Date().toISOString();
        return this.currentAmount;
    }

    // 計算剩餘天數
    getRemainingDays() {
        if (!this.deadline) return null;
        
        const today = new Date();
        const deadline = new Date(this.deadline);
        
        // 如果已過期，返回負數
        if (today > deadline) {
            return -DateUtils.daysBetween(today, deadline);
        }
        
        return DateUtils.daysBetween(today, deadline);
    }

    // 轉為JSON
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            targetAmount: this.targetAmount,
            currentAmount: this.currentAmount,
            currency: this.currency,
            deadline: this.deadline,
            note: this.note,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            completed: this.completed
        };
    }
}

// 週期性項目模型
class RecurringItem {
    constructor(data = {}) {
        this.id = data.id || Utils.generateId();
        this.name = data.name || '';
        this.type = data.type || 'expense'; // expense, income
        this.amount = parseFloat(data.amount || 0);
        this.accountId = data.accountId || '';
        this.categoryId = data.categoryId || '';
        this.frequency = data.frequency || 'monthly'; // daily, weekly, monthly, yearly
        this.dayOfWeek = data.dayOfWeek || 1; // 1-7, 1=星期一
        this.dayOfMonth = data.dayOfMonth || 1; // 1-31
        this.month = data.month || 1; // 1-12
        this.note = data.note || '';
        this.active = data.active !== undefined ? data.active : true;
        this.autoProcess = data.autoProcess !== undefined ? data.autoProcess : false;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    // 判斷今天是否需要處理
    isToday() {
        const today = new Date();
        
        if (this.frequency === 'daily') {
            return true;
        } else if (this.frequency === 'weekly') {
            // 注意 JavaScript 的 getDay() 是 0-6，其中 0 是星期日
            // 而我們的 dayOfWeek 是 1-7，其中 1 是星期一
            const dayOfWeek = today.getDay() || 7; // 將星期日的 0 轉換為 7
            return dayOfWeek === this.dayOfWeek;
        } else if (this.frequency === 'monthly') {
            return today.getDate() === this.dayOfMonth;
        } else if (this.frequency === 'yearly') {
            return today.getMonth() + 1 === this.month && today.getDate() === this.dayOfMonth;
        }
        
        return false;
    }

    // 取得下次執行日期
    getNextDate() {
        const today = new Date();
        let nextDate = new Date(today);
        
        if (this.frequency === 'daily') {
            nextDate.setDate(today.getDate() + 1);
        } else if (this.frequency === 'weekly') {
            const dayOfWeek = today.getDay() || 7; // 將星期日的 0 轉換為 7
            const daysToAdd = (this.dayOfWeek - dayOfWeek + 7) % 7;
            nextDate.setDate(today.getDate() + (daysToAdd === 0 ? 7 : daysToAdd));
        } else if (this.frequency === 'monthly') {
            // 先嘗試設定為當月的指定日期
            nextDate.setDate(this.dayOfMonth);
            
            // 如果已經過了當月的該日期，則設定為下月
            if (nextDate < today) {
                nextDate.setMonth(today.getMonth() + 1);
            }
        } else if (this.frequency === 'yearly') {
            nextDate.setMonth(this.month - 1);
            nextDate.setDate(this.dayOfMonth);
            
            // 如果已經過了當年的該日期，則設定為明年
            if (nextDate < today) {
                nextDate.setFullYear(today.getFullYear() + 1);
            }
        }
        
        return Utils.formatDate(nextDate);
    }

    // 轉為JSON
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            amount: this.amount,
            accountId: this.accountId,
            categoryId: this.categoryId,
            frequency: this.frequency,
            dayOfWeek: this.dayOfWeek,
            dayOfMonth: this.dayOfMonth,
            month: this.month,
            note: this.note,
            active: this.active,
            autoProcess: this.autoProcess,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}