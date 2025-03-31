// 貨幣管理和匯率相關功能

// 匯率數據初始化
let exchangeRates = {
    HKD: { USD: 0.13, CNY: 0.84, EUR: 0.11, GBP: 0.1, JPY: 17.8 },
    USD: { HKD: 7.8, CNY: 6.5, EUR: 0.85, GBP: 0.75, JPY: 140 },
    CNY: { HKD: 1.19, USD: 0.15, EUR: 0.13, GBP: 0.11, JPY: 21.5 },
    EUR: { HKD: 9.2, USD: 1.18, CNY: 7.65, GBP: 0.88, JPY: 165 },
    GBP: { HKD: 10.5, USD: 1.34, CNY: 8.7, EUR: 1.14, JPY: 187 },
    JPY: { HKD: 0.056, USD: 0.0071, CNY: 0.047, EUR: 0.0061, GBP: 0.0053 }
};

// 載入已儲存的匯率
function loadStoredExchangeRates() {
    console.log("載入已儲存的匯率");

    try {
        const storedRates = localStorage.getItem('exchangeRates');

        if (storedRates) {
            const parsedRates = JSON.parse(storedRates);
            if (parsedRates.rates) {
                exchangeRates = parsedRates.rates;
                console.log("已載入儲存的匯率");
            }
        }
    } catch (error) {
        console.error("載入儲存的匯率時發生錯誤:", error);
    }
}

// 格式化貨幣
function formatCurrency(amount, currency = defaultCurrency) {
    try {
        // 使用默認貨幣符號
        const symbol = currencySymbols[currency] || currency;

        // 格式化為指定小數位數
        const formattedAmount = formatNumber(amount);

        // 如果是JPY，不顯示小數點
        if (currency === 'JPY') {
            return `${symbol} ${Math.round(amount)}`;
        }

        return `${symbol} ${formattedAmount}`;
    } catch (error) {
        console.error("格式化貨幣時發生錯誤:", error);
        return `${currency} ${amount}`;
    }
}

// 格式化數字
function formatNumber(number) {
    try {
        return Number(number).toFixed(decimalPlaces);
    } catch (error) {
        console.error("格式化數字時發生錯誤:", error);
        return number.toString();
    }
}

// 獲取匯率
function getExchangeRate(fromCurrency, toCurrency) {
    try {
        // 如果是相同貨幣，匯率為1
        if (fromCurrency === toCurrency) {
            return 1;
        }

        // 如果有直接匯率，則使用
        if (exchangeRates[fromCurrency] && exchangeRates[fromCurrency][toCurrency] !== undefined) {
            return exchangeRates[fromCurrency][toCurrency];
        }

        // 如果有反向匯率，則使用其倒數
        if (exchangeRates[toCurrency] && exchangeRates[toCurrency][fromCurrency] !== undefined) {
            return 1 / exchangeRates[toCurrency][fromCurrency];
        }

        // 如果都沒有，則通過USD進行轉換
        if (fromCurrency !== 'USD' && toCurrency !== 'USD') {
            const fromToUSD = getExchangeRate(fromCurrency, 'USD');
            const usdToTo = getExchangeRate('USD', toCurrency);
            return fromToUSD * usdToTo;
        }

        // 如果還是無法轉換，則返回1
        console.error(`無法找到匯率: ${fromCurrency} 至 ${toCurrency}`);
        return 1;
    } catch (error) {
        console.error("獲取匯率時發生錯誤:", error);
        return 1;
    }
}

// 獲取貨幣名稱
function getCurrencyName(currencyCode) {
    try {
        const currencyNames = {
            'HKD': '港幣 (HKD)',
            'USD': '美元 (USD)',
            'CNY': '人民幣 (CNY)',
            'EUR': '歐元 (EUR)',
            'GBP': '英鎊 (GBP)',
            'JPY': '日元 (JPY)'
        };

        return currencyNames[currencyCode] || currencyCode;
    } catch (error) {
        console.error("獲取貨幣名稱時發生錯誤:", error);
        return currencyCode;
    }
}

// 創建貨幣管理模態框
function createCurrencyManagementModal() {
    console.log("創建貨幣管理模態框");
    
    // 檢查是否已經存在
    if (document.getElementById('currencyManagementModal')) {
        console.log("貨幣管理模態框已存在");
        return;
    }
    
    // 創建模態框HTML
    const modalHTML = `
    <div id="currencyManagementModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>匯率與貨幣管理</h3>
                <button class="close-button">&times;</button>
            </div>
            <div class="modal-body">
                <div class="tabs">
                    <div class="tab-buttons">
                        <button id="exchangeRatesTabButton" class="tab-button active">匯率</button>
                        <button id="currencySettingsTabButton" class="tab-button">貨幣設置</button>
                    </div>
                    <div class="tab-content">
                        <div id="exchangeRatesTab" class="tab-pane active">
                            <div class="exchange-rate-controls">
                                <button id="updateRatesNowButton" class="btn btn-primary">立即更新匯率</button>
                                <span id="lastRateUpdateTime">上次更新: 未知</span>
                            </div>
                            <div class="exchange-rate-table-container">
                                <table id="exchangeRateTable" class="data-table">
                                    <thead>
                                        <tr>
                                            <th>貨幣</th>
                                            <th>HKD</th>
                                            <th>USD</th>
                                            <th>CNY</th>
                                            <th>EUR</th>
                                            <th>GBP</th>
                                            <th>JPY</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <!-- 匯率數據將在這裡填充 -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div id="currencySettingsTab" class="tab-pane">
                            <form id="currencySettingsForm">
                                <div class="form-group">
                                    <label for="manualExchangeFromCurrency">從</label>
                                    <select id="manualExchangeFromCurrency">
                                        <option value="HKD">港幣 (HKD)</option>
                                        <option value="USD">美元 (USD)</option>
                                        <option value="CNY">人民幣 (CNY)</option>
                                        <option value="EUR">歐元 (EUR)</option>
                                        <option value="GBP">英鎊 (GBP)</option>
                                        <option value="JPY">日元 (JPY)</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="manualExchangeToCurrency">至</label>
                                    <select id="manualExchangeToCurrency">
                                        <option value="HKD">港幣 (HKD)</option>
                                        <option value="USD">美元 (USD)</option>
                                        <option value="CNY">人民幣 (CNY)</option>
                                        <option value="EUR">歐元 (EUR)</option>
                                        <option value="GBP">英鎊 (GBP)</option>
                                        <option value="JPY">日元 (JPY)</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="manualExchangeRate">匯率</label>
                                    <input type="number" id="manualExchangeRate" min="0" step="0.000001">
                                </div>
                                <button type="button" id="saveManualRateButton" class="btn btn-primary">保存匯率</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    // 添加到文檔
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    console.log("貨幣管理模態框HTML已添加到文檔");

    // 設置事件監聽器
    document.getElementById('exchangeRatesTabButton').addEventListener('click', function () {
        this.classList.add('active');
        document.getElementById('currencySettingsTabButton').classList.remove('active');
        document.getElementById('exchangeRatesTab').classList.add('active');
        document.getElementById('currencySettingsTab').classList.remove('active');
    });

    document.getElementById('currencySettingsTabButton').addEventListener('click', function () {
        this.classList.add('active');
        document.getElementById('exchangeRatesTabButton').classList.remove('active');
        document.getElementById('currencySettingsTab').classList.add('active');
        document.getElementById('exchangeRatesTab').classList.remove('active');
    });

    // 立即更新匯率按鈕
    document.getElementById('updateRatesNowButton').addEventListener('click', async function () {
        this.disabled = true;
        this.textContent = '更新中...';

        try {
            if (typeof updateExchangeRates === 'function') {
                const success = await updateExchangeRates();
                if (success) {
                    updateExchangeRateTable();
                    showToast('匯率已成功更新', 'success');
                }
            } else {
                console.error('updateExchangeRates 函數未定義');
                showToast('匯率更新失敗: 找不到更新函數', 'error');
            }
        } catch (error) {
            console.error('更新匯率時發生錯誤:', error);
            showToast('匯率更新失敗: ' + error.message, 'error');
        }

        this.disabled = false;
        this.textContent = '立即更新匯率';
    });

    // 保存手動匯率按鈕
    const saveManualRateButton = document.getElementById('saveManualRateButton');
    if (saveManualRateButton) {
        saveManualRateButton.addEventListener('click', saveManualExchangeRate);
    }

    // 預覽匯率
    const fromCurrencySelect = document.getElementById('manualExchangeFromCurrency');
    const toCurrencySelect = document.getElementById('manualExchangeToCurrency');
    
    if (fromCurrencySelect && toCurrencySelect) {
        fromCurrencySelect.addEventListener('change', previewExchangeRate);
        toCurrencySelect.addEventListener('change', previewExchangeRate);
        
        // 初始預覽
        setTimeout(previewExchangeRate, 100);
    }

    // 關閉按鈕
    const closeButton = document.querySelector('#currencyManagementModal .close-button');
    if (closeButton) {
        closeButton.addEventListener('click', closeCurrentModal);
    }
    
    console.log("貨幣管理模態框事件綁定完成");
}

// 更新匯率表格
function updateExchangeRateTable() {
    console.log("更新匯率表格");
    
    const table = document.getElementById('exchangeRateTable');
    if (!table) {
        console.error('找不到匯率表格元素');
        return;
    }
    
    const tbody = table.querySelector('tbody');
    if (!tbody) {
        console.error('找不到匯率表格的tbody元素');
        return;
    }
    
    // 清空表格
    tbody.innerHTML = '';
    
    const currencies = ['HKD', 'USD', 'CNY', 'EUR', 'GBP', 'JPY'];
    
    // 填充表格
    currencies.forEach(fromCurrency => {
        const row = document.createElement('tr');
        const nameCell = document.createElement('td');
        nameCell.textContent = fromCurrency;
        row.appendChild(nameCell);
        
        currencies.forEach(toCurrency => {
            const cell = document.createElement('td');
            
            if (fromCurrency === toCurrency) {
                cell.textContent = '1';
                cell.classList.add('same-currency');
            } else {
                try {
                    const rate = getExchangeRate(fromCurrency, toCurrency);
                    cell.textContent = rate.toFixed(6);
                } catch (e) {
                    console.error(`計算匯率出錯:`, e);
                    cell.textContent = 'N/A';
                }
            }
            
            row.appendChild(cell);
        });
        
        tbody.appendChild(row);
    });
    
    // 更新最後更新時間
    const storedRates = localStorage.getItem('exchangeRates');
    const lastRateUpdateTime = document.getElementById('lastRateUpdateTime');
    if (storedRates && lastRateUpdateTime) {
        try {
            const parsedRates = JSON.parse(storedRates);
            if (parsedRates.lastUpdated) {
                const lastUpdateTime = new Date(parsedRates.lastUpdated);
                lastRateUpdateTime.textContent = `上次更新: ${lastUpdateTime.toLocaleString()}`;
            } else {
                lastRateUpdateTime.textContent = '上次更新: 未知';
            }
        } catch (e) {
            console.error("解析存儲的匯率時出錯:", e);
            lastRateUpdateTime.textContent = '上次更新: 未知';
        }
    } else if (lastRateUpdateTime) {
        lastRateUpdateTime.textContent = '上次更新: 未知';
    }
    
    console.log("匯率表格更新完成");
}

// 預覽匯率
function previewExchangeRate() {
    try {
        const fromCurrency = document.getElementById('manualExchangeFromCurrency').value;
        const toCurrency = document.getElementById('manualExchangeToCurrency').value;
        const rateInput = document.getElementById('manualExchangeRate');

        if (!fromCurrency || !toCurrency || !rateInput) {
            console.error("找不到匯率預覽所需的元素");
            return;
        }

        if (fromCurrency === toCurrency) {
            rateInput.value = '1';
            rateInput.disabled = true;
        } else {
            const rate = getExchangeRate(fromCurrency, toCurrency);
            rateInput.value = rate.toFixed(6);
            rateInput.disabled = false;
        }
    } catch (error) {
        console.error("預覽匯率時發生錯誤:", error);
    }
}

// 保存手動匯率
function saveManualExchangeRate() {
    try {
        const fromCurrency = document.getElementById('manualExchangeFromCurrency').value;
        const toCurrency = document.getElementById('manualExchangeToCurrency').value;
        const rate = parseFloat(document.getElementById('manualExchangeRate').value);

        if (fromCurrency === toCurrency) {
            showToast('相同貨幣的匯率總是1', 'info');
            return;
        }

        if (!rate || rate <= 0) {
            showToast('請輸入有效的匯率', 'error');
            return;
        }

        // 更新匯率
        if (!exchangeRates[fromCurrency]) {
            exchangeRates[fromCurrency] = {};
        }

        exchangeRates[fromCurrency][toCurrency] = rate;

        // 同時更新反向匯率
        if (!exchangeRates[toCurrency]) {
            exchangeRates[toCurrency] = {};
        }

        exchangeRates[toCurrency][fromCurrency] = 1 / rate;

        // 保存到本地存儲
        const storedRates = localStorage.getItem('exchangeRates');
        let parsedRates = { rates: {}, lastUpdated: new Date().toISOString() };

        if (storedRates) {
            try {
                parsedRates = JSON.parse(storedRates);
            } catch (e) {
                console.error("解析存儲的匯率時出錯:", e);
            }
        }

        parsedRates.rates = exchangeRates;
        parsedRates.lastUpdated = new Date().toISOString();
        localStorage.setItem('exchangeRates', JSON.stringify(parsedRates));

        // 更新UI
        updateExchangeRateTable();
        updateTransferForm();

        // 顯示成功消息
        showToast(`已更新匯率: 1 ${fromCurrency} = ${rate.toFixed(6)} ${toCurrency}`, 'success');
    } catch (error) {
        console.error("保存手動匯率時發生錯誤:", error);
        showToast('保存匯率失敗: ' + error.message, 'error');
    }
}

// 打開貨幣管理模態框
function openCurrencyManagementModal() {
    console.log("打開貨幣管理模態框");

    try {
        // 創建貨幣管理模態框(如果尚未存在)
        if (!document.getElementById('currencyManagementModal')) {
            createCurrencyManagementModal();
        }

        // 立即填充匯率表格
        setTimeout(() => {
            updateExchangeRateTable();
        }, 50);

        // 打開模態框
        const modal = document.getElementById('currencyManagementModal');
        if (modal) {
            modal.classList.add('active');
        } else {
            console.error("找不到貨幣管理模態框");
            return;
        }

        // 預覽初始匯率
        setTimeout(() => {
            if (typeof previewExchangeRate === 'function') {
                previewExchangeRate();
            }
        }, 100);
    } catch (error) {
        console.error("打開貨幣管理模態框時發生錯誤:", error);
        showToast('打開貨幣管理失敗: ' + error.message, 'error');
    }
}