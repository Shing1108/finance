// 定義全局數據結構
const appState = {
    // 賬戶數組
    accounts: [],
    // 交易數組
    transactions: [],
    // 類別對象
    categories: {
        income: [],
        expense: []
    },
    // 預算系統
    budgets: {
        current: null,
        history: [],
        categories: [],
        total: 0,
        resetCycle: 'monthly',
        resetDay: 1,
        inheritPrevious: true,
        autoCalculate: false,
        settings: {
            defaultDuration: 30,
            autoCreateNext: true,
            notifyThreshold: 90
        }
    },
    // 應用設置
    settings: {
        darkMode: false,
        fontSize: 'medium',
        defaultCurrency: 'HKD',
        decimalPlaces: 2,
        enableBudgetAlerts: false,
        alertThreshold: 80,
        enableFirebase: false
    }
};

// 全局設置變量
let darkMode = false;
let fontSize = 'medium';
let defaultCurrency = 'HKD';
let decimalPlaces = 2;
let enableBudgetAlerts = false;
let alertThreshold = 80;
let enableFirebase = false;

// Firebase 相關變量
let db = null;
let isLoggedIn = false;
let user = null;
let currentlyLoading = false;

// 貨幣符號
const currencySymbols = {
    HKD: "HK$",
    USD: "$",
    CNY: "¥",
    EUR: "€",
    GBP: "£",
    JPY: "¥"
};