/**
 * currency.js - 貨幣與匯率功能
 */

const CurrencyManager = {
    // 支援的貨幣
    supportedCurrencies: [
        { code: 'HKD', name: '港幣', symbol: 'HK$' },
        { code: 'USD', name: '美元', symbol: '$' },
        { code: 'CNY', name: '人民幣', symbol: '¥' },
        { code: 'EUR', name: '歐元', symbol: '€' },
        { code: 'GBP', name: '英鎊', symbol: '£' },
        { code: 'JPY', name: '日圓', symbol: '¥' }
    ],
    
    // 匯率資料
    exchangeRates: {},
    
    // 最後更新時間
    lastUpdated: null,
    
    // 初始化
    init: async function() {
        // 嘗試從 localStorage 取得匯率資料
        const savedRates = Utils.getFromLocalStorage('exchangeRates');
        const savedTime = Utils.getFromLocalStorage('exchangeRatesUpdated');
        
        // 檢查是否需要更新匯率（超過一天或無資料）
        const needUpdate = !savedRates || !savedTime || 
                           (Date.now() - savedTime > 24 * 60 * 60 * 1000);
        
        if (needUpdate) {
            // 更新匯率
            await this.updateExchangeRates();
        } else {
            // 使用儲存的匯率
            this.exchangeRates = savedRates;
            this.lastUpdated = new Date(savedTime);
            console.log('使用本地儲存的匯率資料');
        }
        
        return this.exchangeRates;
    },
    
    // 更新匯率
    updateExchangeRates: async function() {
        try {
            Utils.showLoading();
            
            // 使用免費的匯率 API
            const response = await fetch('https://open.er-api.com/v6/latest/USD');
            const data = await response.json();
            
            if (data && data.rates) {
                this.exchangeRates = data.rates;
                this.lastUpdated = new Date();
                
                // 儲存到 localStorage
                Utils.saveToLocalStorage('exchangeRates', this.exchangeRates);
                Utils.saveToLocalStorage('exchangeRatesUpdated', Date.now());
                
                console.log('匯率已更新', this.exchangeRates);
                Utils.showToast('匯率資料已更新', 'success');
            } else {
                throw new Error('無法取得匯率資料');
            }
        } catch (error) {
            console.error('更新匯率失敗', error);
            Utils.showToast('更新匯率失敗，使用最後可用的資料', 'warning');
            
            // 使用備用匯率（如果有）
            if (!this.exchangeRates || Object.keys(this.exchangeRates).length === 0) {
                // 基本備用匯率
                this.exchangeRates = {
                    'USD': 1,
                    'HKD': 7.8,
                    'CNY': 6.5,
                    'EUR': 0.85,
                    'GBP': 0.75,
                    'JPY': 110
                };
            }
        } finally {
            Utils.hideLoading();
        }
        
        return this.exchangeRates;
    },
    
    // 取得特定貨幣對之間的匯率
    getExchangeRate: function(fromCurrency, toCurrency) {
        if (!this.exchangeRates || Object.keys(this.exchangeRates).length === 0) {
            console.warn('匯率資料不可用');
            return 1;
        }
        
        // 相同貨幣
        if (fromCurrency === toCurrency) return 1;
        
        // 計算匯率（通過美元作為中介）
        const fromRate = this.exchangeRates[fromCurrency] || 1;
        const toRate = this.exchangeRates[toCurrency] || 1;
        
        return toRate / fromRate;
    },
    
    // 貨幣轉換
    convert: function(amount, fromCurrency, toCurrency) {
        const rate = this.getExchangeRate(fromCurrency, toCurrency);
        return amount * rate;
    },
    
    // 格式化貨幣顯示
    format: function(amount, currencyCode, decimals = 2) {
        return Utils.formatCurrency(amount, currencyCode, decimals);
    },
    
    // 取得貨幣資訊
    getCurrencyInfo: function(currencyCode) {
        return this.supportedCurrencies.find(c => c.code === currencyCode) || 
               { code: currencyCode, name: currencyCode, symbol: currencyCode };
    },
    
    // 取得貨幣符號
    getCurrencySymbol: function(currencyCode) {
        const currency = this.getCurrencyInfo(currencyCode);
        return currency.symbol;
    }
};