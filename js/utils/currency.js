// currency.js - 貨幣處理功能

// 儲存匯率資料
const exchangeRates = {
    HKD: { USD: 0.13, CNY: 0.84, EUR: 0.11, GBP: 0.1, JPY: 17.8 },
    USD: { HKD: 7.8, CNY: 6.5, EUR: 0.85, GBP: 0.75, JPY: 140 },
    CNY: { HKD: 1.19, USD: 0.15, EUR: 0.13, GBP: 0.11, JPY: 21.5 },
    EUR: { HKD: 9.2, USD: 1.18, CNY: 7.65, GBP: 0.88, JPY: 165 },
    GBP: { HKD: 10.5, USD: 1.34, CNY: 8.7, EUR: 1.14, JPY: 187 },
    JPY: { HKD: 0.056, USD: 0.0071, CNY: 0.047, EUR: 0.0061, GBP: 0.0053 }
};

// 匯率轉換緩存
const rateCache = new Map();

/**
 * 初始化匯率資料
 */
function initExchangeRates() {
    console.log("初始化匯率資料");
    
    try {
        // 嘗試從本地存儲中載入匯率
        const savedRates = localStorage.getItem('exchangeRates');
        if (savedRates) {
            const parsed = JSON.parse(savedRates);
            if (parsed.rates) {
                // 更新匯率資料
                Object.assign(exchangeRates, parsed.rates);
                console.log("已從本地載入匯率數據");
            }
        }
    } catch (error) {
        console.error("初始化匯率資料時發生錯誤:", error);
    }
}

/**
 * 獲取匯率
 * @param {string} fromCurrency 源貨幣
 * @param {string} toCurrency 目標貨幣
 * @returns {number} 匯率
 */
function getExchangeRate(fromCurrency, toCurrency) {
    // 如果是相同貨幣，返回1
    if (fromCurrency === toCurrency) return 1;
    
    // 檢查緩存
    const cacheKey = `${fromCurrency}-${toCurrency}`;
    if (rateCache.has(cacheKey)) {
        return rateCache.get(cacheKey);
    }
    
    let rate;
    
    // 嘗試直接獲取匯率
    if (exchangeRates[fromCurrency] && typeof exchangeRates[fromCurrency][toCurrency] !== 'undefined') {
        rate = exchangeRates[fromCurrency][toCurrency];
    }
    // 嘗試使用反向匯率
    else if (exchangeRates[toCurrency] && typeof exchangeRates[toCurrency][fromCurrency] !== 'undefined') {
        rate = 1 / exchangeRates[toCurrency][fromCurrency];
    }
    // 嘗試通過USD進行轉換
    else if (fromCurrency !== 'USD' && toCurrency !== 'USD') {
        const fromToUSD = getExchangeRate(fromCurrency, 'USD');
        const usdToTo = getExchangeRate('USD', toCurrency);
        rate = fromToUSD * usdToTo;
    } else {
        console.warn(`無法找到匯率: ${fromCurrency} → ${toCurrency}`);
        rate = 1; // 默認返回1
    }
    
    // 存入緩存
    rateCache.set(cacheKey, rate);
    return rate;
}

/**
 * 轉換貨幣
 * @param {number} amount 金額
 * @param {string} fromCurrency 源貨幣
 * @param {string} toCurrency 目標貨幣
 * @returns {number} 轉換後的金額
 */
function convertCurrency(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return amount;
    const rate = getExchangeRate(fromCurrency, toCurrency);
    return amount * rate;
}

/**
 * 保存匯率
 * @param {string} fromCurrency 源貨幣
 * @param {string} toCurrency 目標貨幣
 * @param {number} rate 匯率
 * @returns {boolean} 保存成功返回true
 */
function saveExchangeRate(fromCurrency, toCurrency, rate) {
    if (!fromCurrency || !toCurrency || !rate || rate <= 0) {
        console.error("無效的匯率數據");
        return false;
    }
    
    try {
        // 確保對象結構完整
        if (!exchangeRates[fromCurrency]) {
            exchangeRates[fromCurrency] = {};
        }
        if (!exchangeRates[toCurrency]) {
            exchangeRates[toCurrency] = {};
        }
        
        // 保存正向和反向匯率
        exchangeRates[fromCurrency][toCurrency] = rate;
        exchangeRates[toCurrency][fromCurrency] = 1 / rate;
        
        // 清除緩存
        rateCache.clear();
        
        // 保存到本地存儲
        localStorage.setItem('exchangeRates', JSON.stringify({
            rates: exchangeRates,
            lastUpdated: new Date().toISOString()
        }));
        
        return true;
    } catch (error) {
        console.error("保存匯率時發生錯誤:", error);
        return false;
    }
}

/**
 * 從API更新匯率
 * @returns {Promise<boolean>} 更新成功返回true
 */
async function updateExchangeRatesFromAPI() {
    console.log("從API更新匯率");
    
    try {
        // 檢查網絡連接
        if (!navigator.onLine) {
            throw new Error('沒有網絡連接');
        }
        
        // 嘗試主API (open.er-api.com)
        const response = await fetch('https://open.er-api.com/v6/latest/USD', {
            cache: 'no-cache',
            headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error(`API請求失敗 (${response.status}): ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data && data.rates) {
            updateRatesFromData(data.rates);
            return true;
        }
        
        throw new Error('收到無效的API響應');
    } catch (primaryError) {
        console.error("主API失敗，嘗試備選API:", primaryError);
        
        try {
            // 嘗試備選API (exchangerate.host)
            const response = await fetch('https://api.exchangerate.host/latest?base=USD', {
                cache: 'no-cache',
                headers: { 'Accept': 'application/json' }
            });
            
            if (!response.ok) {
                throw new Error(`備選API請求失敗 (${response.status}): ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data && data.rates) {
                updateRatesFromData(data.rates);
                return true;
            }
            
            throw new Error('收到無效的API響應');
        } catch (secondaryError) {
            console.error("備選API也失敗:", secondaryError);
            
            // 使用基本匯率作為備選
            const basicRates = {
                USD: 1,
                HKD: 7.8,
                CNY: 6.9,
                EUR: 0.92,
                GBP: 0.8,
                JPY: 145
            };
            
            updateRatesFromData(basicRates);
            
            // 雖然使用了備選匯率，但仍然標記為失敗
            throw new Error('無法從API獲取匯率，使用了基本匯率');
        }
    }
}

/**
 * 從API數據更新匯率
 * @param {Object} apiRates API返回的匯率數據
 */
function updateRatesFromData(apiRates) {
    const supportedCurrencies = ['HKD', 'USD', 'CNY', 'EUR', 'GBP', 'JPY'];
    
    // 新的匯率對象
    const newRates = {};
    
    // 構建交叉匯率
    supportedCurrencies.forEach(fromCurrency => {
        newRates[fromCurrency] = {};
        
        supportedCurrencies.forEach(toCurrency => {
            if (fromCurrency !== toCurrency) {
                let rate;
                
                if (fromCurrency === 'USD') {
                    // 直接使用API數據
                    rate = apiRates[toCurrency];
                } else if (toCurrency === 'USD') {
                    // 反向換算
                    rate = 1 / apiRates[fromCurrency];
                } else {
                    // 通過USD換算
                    const fromToUSD = 1 / apiRates[fromCurrency];
                    const usdToTo = apiRates[toCurrency];
                    rate = fromToUSD * usdToTo;
                }
                
                newRates[fromCurrency][toCurrency] = parseFloat(rate.toFixed(6));
            }
        });
    });
    
    // 更新匯率對象
    Object.assign(exchangeRates, newRates);
    
    // 清除緩存
    rateCache.clear();
    
    // 保存到本地存儲
    localStorage.setItem('exchangeRates', JSON.stringify({
        rates: exchangeRates,
        lastUpdated: new Date().toISOString()
    }));
    
    console.log("匯率已更新");
}

/**
 * 顯示匯率表格
 */
function showExchangeRatesTable() {
    // 檢查是否已有匯率表格
    let overlay = document.getElementById('exchangeRatesOverlay');
    if (overlay) {
        return;
    }
    
    // 建立模態框容器
    overlay = document.createElement('div');
    overlay.id = 'exchangeRatesOverlay';
    overlay.className = 'modal active';
    
    // 獲取上次更新時間
    let lastUpdateText = '未知';
    try {
        const savedRates = localStorage.getItem('exchangeRates');
        if (savedRates) {
            const parsed = JSON.parse(savedRates);
            if (parsed.lastUpdated) {
                lastUpdateText = new Date(parsed.lastUpdated).toLocaleString();
            }
        }
    } catch (e) {}
    
    // 支持的貨幣
    const supportedCurrencies = ['HKD', 'USD', 'CNY', 'EUR', 'GBP', 'JPY'];
    
    // 生成表頭
    let tableHead = '<th>貨幣</th>';
    supportedCurrencies.forEach(currency => {
        tableHead += `<th>${currency}</th>`;
    });
    
    // 生成表格數據
    let tableBody = '';
    supportedCurrencies.forEach(fromCurrency => {
        tableBody += `<tr><td>${fromCurrency}</td>`;
        
        supportedCurrencies.forEach(toCurrency => {
            let rate;
            
            if (fromCurrency === toCurrency) {
                rate = '1.000000';
            } else {
                rate = getExchangeRate(fromCurrency, toCurrency).toFixed(6);
            }
            
            tableBody += `<td>${rate}</td>`;
        });
        
        tableBody += '</tr>';
    });
    
    // 生成匯率表格HTML
    overlay.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>匯率表</h3>
                <span class="close-button">&times;</span>
            </div>
            <div class="modal-body">
                <div class="exchange-rates-header">
                    <button id="updateRatesButton" class="btn btn-primary">更新匯率</button>
                    <span>上次更新: ${lastUpdateText}</span>
                </div>
                
                <div class="exchange-rates-table">
                    <table>
                        <thead>
                            <tr>${tableHead}</tr>
                        </thead>
                        <tbody>
                            ${tableBody}
                        </tbody>
                    </table>
                </div>
                
                <div class="exchange-rates-manual">
                    <h4>手動設定匯率</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="fromCurrency">從</label>
                            <select id="fromCurrency" class="form-control">
                                ${supportedCurrencies.map(c => `<option value="${c}">${c}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="toCurrency">至</label>
                            <select id="toCurrency" class="form-control">
                                ${supportedCurrencies.map(c => `<option value="${c}" ${c === 'USD' ? 'selected' : ''}>${c}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="rateValue">匯率</label>
                            <input type="number" id="rateValue" class="form-control" step="0.000001" min="0.000001">
                        </div>
                        <div class="form-group">
                            <button id="saveRateButton" class="btn btn-primary">保存</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 添加到文檔
    document.body.appendChild(overlay);
    
    // 添加關閉事件
    const closeButton = overlay.querySelector('.close-button');
    closeButton.addEventListener('click', function() {
        document.body.removeChild(overlay);
    });
    
    // 點擊背景關閉
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    });
    
    // 更新匯率按鈕
    const updateButton = document.getElementById('updateRatesButton');
    updateButton.addEventListener('click', async function() {
        this.disabled = true;
        this.textContent = '更新中...';
        
        try {
            await updateExchangeRatesFromAPI();
            // 關閉並重新打開模態框以刷新數據
            document.body.removeChild(overlay);
            showExchangeRatesTable();
            showToast('匯率已更新', 'success');
        } catch (error) {
            console.error("更新匯率失敗:", error);
            showToast('更新匯率失敗: ' + error.message, 'error');
            this.disabled = false;
            this.textContent = '更新匯率';
        }
    });
    
    // 設置匯率顯示
    const fromCurrency = document.getElementById('fromCurrency');
    const toCurrency = document.getElementById('toCurrency');
    const rateValue = document.getElementById('rateValue');
    
    function updateRateField() {
        const from = fromCurrency.value;
        const to = toCurrency.value;
        
        if (from === to) {
            rateValue.value = '1.000000';
            rateValue.disabled = true;
        } else {
            rateValue.disabled = false;
            const rate = getExchangeRate(from, to);
            rateValue.value = rate.toFixed(6);
        }
    }
    
    fromCurrency.addEventListener('change', updateRateField);
    toCurrency.addEventListener('change', updateRateField);
    
    // 初始化匯率欄位
    updateRateField();
    
    // 保存匯率按鈕
    const saveRateButton = document.getElementById('saveRateButton');
    saveRateButton.addEventListener('click', function() {
        const from = fromCurrency.value;
        const to = toCurrency.value;
        const rate = parseFloat(rateValue.value);
        
        if (from === to) {
            showToast('相同貨幣的匯率總是1', 'info');
            return;
        }
        
        if (isNaN(rate) || rate <= 0) {
            showToast('請輸入有效的匯率值', 'error');
            return;
        }
        
        if (saveExchangeRate(from, to, rate)) {
            showToast(`已更新匯率: 1 ${from} = ${rate.toFixed(6)} ${to}`, 'success');
            
            // 關閉並重新打開模態框以刷新數據
            document.body.removeChild(overlay);
            showExchangeRatesTable();
        } else {
            showToast('更新匯率失敗', 'error');
        }
    });
}

// 導出函數
window.getExchangeRate = getExchangeRate;
window.convertCurrency = convertCurrency;
window.updateExchangeRatesFromAPI = updateExchangeRatesFromAPI;
window.showExchangeRatesTable = showExchangeRatesTable;
window.initExchangeRates = initExchangeRates;