// models.js - 數據模型定義

/**
 * 應用狀態對象 - 集中存儲所有應用數據
 */
const appState = {
    // 戶口數據
    accounts: [],
    
    // 交易記錄
    transactions: [],
    
    // 儲蓄目標
    savingsGoals: [],
    
    // 收入和支出類別
    categories: { 
        income: [], 
        expense: [] 
    },


    budgets = {
    // 全局預算設置
    resetCycle: 'monthly',  // 預算重置週期
    resetDay: 1,            // 月度重置日
    autoCalculate: true,    // 是否自動根據類別預算計算總預算
    
    // 當前活動預算
    current: {
        total: 0,           // 總預算
        startDate: null,    // 開始日期
        endDate: null,      // 結束日期
        categories: []      // 類別預算列表
    },
    
    // 月度預算設置 - 關鍵部分，每個月都有獨立的預算
    monthly: {
        // 格式: '2025-04': { total: 1000, categories: [{...}], startDate: '2025-04-01', endDate: '2025-04-30' }
    },
    
    // 預算歷史記錄
    history: []
},
    
    // 數據分析設定
    analytics: {
        lastUsedPeriod: 'month', // 'week', 'month', 'quarter', 'year', 'custom'
        customPeriod: {
            start: null,
            end: null
        }
    },
    
    // 應用設置
    settings: {
        darkMode: false,         // 深色模式
        fontSize: 'medium',      // 'small', 'medium', 'large'
        defaultCurrency: 'HKD',  // 默認貨幣
        decimalPlaces: 2,        // 小數位數
        enableBudgetAlerts: false, // 啟用預算提醒
        alertThreshold: 80,      // 預算提醒閾值
        enableFirebase: false    // 啟用Firebase同步
    }
};

/**
 * 賬戶模型:
 * {
 *   id: String,
 *   name: String,
 *   type: String,          // 'cash', 'bank', 'credit', 'investment', 'other'
 *   balance: Number,
 *   currency: String,      // 'HKD', 'USD', 'CNY', 'EUR', 'GBP', 'JPY'
 *   note: String,
 *   createdAt: String,     // ISO日期字符串
 *   updatedAt: String      // ISO日期字符串
 * }
 */

/**
 * 交易模型:
 * {
 *   id: String,
 *   type: String,          // 'income', 'expense'
 *   accountId: String,     // 關聯賬戶ID
 *   categoryId: String,    // 關聯類別ID
 *   amount: Number,        // 交易金額(已換算為賬戶貨幣)
 *   originalAmount: Number, // 原始金額(輸入的金額)
 *   originalCurrency: String, // 原始貨幣
 *   date: String,          // YYYY-MM-DD格式日期
 *   note: String,
 *   transferId: String,    // 轉賬關聯ID(轉賬交易用)
 *   createdAt: String,     // ISO日期字符串
 *   updatedAt: String      // ISO日期字符串
 * }
 */

/**
 * 類別模型:
 * {
 *   id: String,
 *   name: String,
 *   icon: String,          // Font Awesome 圖標類名
 *   color: String,         // 顏色(HEX格式)
 *   order: Number,         // 排序值
 *   createdAt: String,     // ISO日期字符串
 *   updatedAt: String      // ISO日期字符串
 * }
 */

/**
 * 儲蓄目標模型:
 * {
 *   id: String,
 *   name: String,
 *   target: Number,        // 目標金額
 *   current: Number,       // 當前進度
 *   deadline: String,      // YYYY-MM-DD格式日期
 *   note: String,
 *   progressHistory: [     // 進度歷史記錄
 *     {
 *       amount: Number,
 *       date: String,      // YYYY-MM-DD格式日期
 *       note: String,
 *       createdAt: String  // ISO日期字符串
 *     }
 *   ],
 *   createdAt: String,     // ISO日期字符串
 *   updatedAt: String      // ISO日期字符串
 * }
 */

// 全局設置變量 - 使用解構賦值簡化
let { 
    darkMode, 
    fontSize, 
    defaultCurrency, 
    decimalPlaces, 
    enableBudgetAlerts, 
    alertThreshold, 
    enableFirebase 
} = appState.settings;

// Firebase相關狀態變量
let db = null;
let isLoggedIn = false;
let user = null;
let currentlyLoading = false;
let syncInProgress = false;

// 導出模型
window.appState = appState;