/**
 * チャート描画関連の機能
 */

/**
 * 月別平日日動帯ストップ時間チャートを更新
 * @param {Array} filteredData - フィルタリングされたデータ
 * @param {Object} charts - チャートオブジェクトの格納先
 */
function updateMonthlyHoursChart(filteredData, charts) {
    // 年ごとにデータセットを作成
    const yearDatasets = {};
    
    // 年ごとの色マップ
    const yearColors = {
        2021: { bg: 'rgba(255, 99, 132, 0.2)', border: 'rgba(255, 99, 132, 1)' },
        2022: { bg: 'rgba(54, 162, 235, 0.2)', border: 'rgba(54, 162, 235, 1)' },
        2023: { bg: 'rgba(255, 206, 86, 0.2)', border: 'rgba(255, 206, 86, 1)' },
        2024: { bg: 'rgba(75, 192, 192, 0.2)', border: 'rgba(75, 192, 192, 1)' },
        2025: { bg: 'rgba(153, 102, 255, 0.2)', border: 'rgba(153, 102, 255, 1)' }
    };
    
    // 年ごとにデータを収集
    filteredData.forEach(item => {
        const year = item.year;
        const month = item.month;
        
        if (!yearDatasets[year]) {
            yearDatasets[year] = Array(12).fill(0);
        }
        
        // 平日日勤帯の時間を加算
        if (item.workdayHours > 0) {
            yearDatasets[year][month - 1] += item.workdayHours;
        }
    });
    
    // データセットを準備
    const datasets = [];
    const years = Object.keys(yearDatasets).sort();
    
    years.forEach(year => {
        // 小数点以下1桁に丸める
        const roundedData = yearDatasets[year].map(val => Math.round(val * 10) / 10);
        
        datasets.push({
            label: `${year}年`,
            data: roundedData,
            backgroundColor: yearColors[year]?.bg || 'rgba(75, 192, 192, 0.2)',
            borderColor: yearColors[year]?.border || 'rgba(75, 192, 192, 1)',
            borderWidth: 2,
            tension: 0.1,
            fill: true
        });
    });
    
    // 月のラベル
    const monthLabels = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    
    if (charts.monthlyHoursChart) {
        charts.monthlyHoursChart.destroy();
    }
    
    const ctx = document.getElementById('monthly-hours-chart').getContext('2d');
    charts.monthlyHoursChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: monthLabels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '時間'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: '年別・月別平日日勤帯ストップ時間',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        title: function(tooltipItems) {
                            return tooltipItems[0].label;
                        },
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw} 時間`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * 診療科別チャートを更新
 * @param {Array} filteredData - フィルタリングされたデータ
 * @param {Object} charts - チャートオブジェクトの格納先
 */
function updateDepartmentChart(filteredData, charts) {
    const departmentCounts = {};
    filteredData.forEach(item => {
        departmentCounts[item.department] = (departmentCounts[item.department] || 0) + 1;
    });
    
    const labels = Object.keys(departmentCounts);
    const data = Object.values(departmentCounts);
    
    if (charts.departmentChart) {
        charts.departmentChart.destroy();
    }
    
    const ctx = document.getElementById('department-chart').getContext('2d');
    charts.departmentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'ストップ件数',
                data: data,
                backgroundColor: 'rgba(54, 162, 235, 0.7)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

/**
 * 理由別チャートを更新
 * @param {Array} filteredData - フィルタリングされたデータ
 * @param {Object} charts - チャートオブジェクトの格納先
 */
function updateReasonChart(filteredData, charts) {
    const reasonCounts = {};
    filteredData.forEach(item => {
        reasonCounts[item.reason] = (reasonCounts[item.reason] || 0) + 1;
    });
    
    const labels = Object.keys(reasonCounts);
    const data = Object.values(reasonCounts);
    
    if (charts.reasonChart) {
        charts.reasonChart.destroy();
    }
    
    const ctx = document.getElementById('reason-chart').getContext('2d');
    charts.reasonChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)',
                    'rgba(255, 159, 64, 0.7)',
                    'rgba(199, 199, 199, 0.7)',
                    'rgba(83, 102, 255, 0.7)',
                    'rgba(40, 159, 64, 0.7)',
                    'rgba(210, 199, 199, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)',
                    'rgba(199, 199, 199, 1)',
                    'rgba(83, 102, 255, 1)',
                    'rgba(40, 159, 64, 1)',
                    'rgba(210, 199, 199, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

/**
 * 統合された月別チャートを更新
 * @param {Array} filteredData - フィルタリングされたデータ
 * @param {Object} charts - チャートオブジェクトの格納先
 * @param {string} chartDisplayMode - チャート表示モード ('all', 'workday', 'combined')
 */
function updateCombinedMonthlyChart(filteredData, charts, chartDisplayMode) {
    console.log('統合月別チャート更新開始');
    console.log('フィルター済みデータ数:', filteredData.length);
    
    // 選択されたシートかどうか確認
    const isSpecificSheetSelected = document.getElementById('sheet-selector').value !== 'all';
    
    // データの月別分布を確認
    const monthDistribution = {};
    filteredData.forEach(item => {
        const month = item.month;
        monthDistribution[month] = (monthDistribution[month] || 0) + 1;
    });
    console.log('月別データ分布:', monthDistribution);
    
    // 年ごとにデータセットを作成
    const yearDatasets = {};
    
    // 年ごとの色マップ
    const yearColors = {
        2021: { bg: 'rgba(75, 192, 192, 0.2)', border: 'rgba(75, 192, 192, 1)' },
        2022: { bg: 'rgba(54, 162, 235, 0.2)', border: 'rgba(54, 162, 235, 1)' },
        2023: { bg: 'rgba(255, 206, 86, 0.2)', border: 'rgba(255, 206, 86, 1)' },
        2024: { bg: 'rgba(255, 99, 132, 0.2)', border: 'rgba(255, 99, 132, 1)' },
        2025: { bg: 'rgba(153, 102, 255, 0.2)', border: 'rgba(153, 102, 255, 1)' }
    };
    
    // 表示する年を取得
    let yearsToDisplay = [];
    
    if (isSpecificSheetSelected) {
        // 特定のシートが選択されている場合、そのシートの年のみを表示
        const selectedSheetName = document.getElementById('sheet-selector').options[
            document.getElementById('sheet-selector').selectedIndex
        ].text;
        
        // シート名から年を抽出
        const yearMatch = selectedSheetName.match(/(20\d{2})/);
        if (yearMatch) {
            const year = parseInt(yearMatch[1]);
            yearsToDisplay = [year];
        } else {
            // 年が抽出できない場合は、データから年を取得
            yearsToDisplay = [...new Set(filteredData.map(item => item.year))].sort();
        }
    } else {
        // すべてのシートが選択されている場合、すべての年を表示
        yearsToDisplay = [...new Set(filteredData.map(item => item.year))].sort();
    }
    
    console.log('表示する年:', yearsToDisplay);
    
    // 各年に対して1月から12月までの配列を初期化
    yearsToDisplay.forEach(year => {
        yearDatasets[year] = Array(12).fill(0);
    });
    
    // データの月情報を確認
    const monthCheck = {};
    
    // 年ごとにデータを収集
    filteredData.forEach(item => {
        const year = item.year;
        const month = item.month;
        
        // 選択された年のデータのみ処理
        if (!yearsToDisplay.includes(year)) {
            return;
        }
        
        // 月情報の確認
        if (!monthCheck[year]) {
            monthCheck[year] = {};
        }
        monthCheck[year][month] = (monthCheck[year][month] || 0) + 1;
        
        // 有効な月データか確認
        if (month >= 1 && month <= 12 && yearDatasets[year]) {
            yearDatasets[year][month - 1]++;
        } else {
            console.warn('無効な月データ:', { year, month });
        }
    });
    
    console.log('年別月別データ確認:', monthCheck);
    console.log('年別データセット:', yearDatasets);
    
    // データセットを準備
    const datasets = [];
    
    yearsToDisplay.forEach(year => {
        datasets.push({
            label: `${year}年`,
            data: yearDatasets[year],
            backgroundColor: yearColors[year]?.bg || 'rgba(75, 192, 192, 0.2)',
            borderColor: yearColors[year]?.border || 'rgba(75, 192, 192, 1)',
            borderWidth: 2,
            tension: 0.1,
            fill: false
        });
    });
    
    // 月のラベル
    const monthLabels = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    
    // 平日日動帯のデータセットを作成
    const workdayDatasets = [];
    
    yearsToDisplay.forEach(year => {
        // 平日日動帯のデータを取得
        const workdayData = Array(12).fill(0);
        
        filteredData.filter(item => item.year === year && item.workdayHours > 0).forEach(item => {
            const month = item.month;
            if (month >= 1 && month <= 12) {
                workdayData[month - 1]++;
            }
        });
        
        // 年ごとの色を設定
        const yearColor = yearColors[year] || { bg: 'rgba(75, 192, 192, 0.2)', border: 'rgba(75, 192, 192, 1)' };
        
        workdayDatasets.push({
            label: `${year}年（平日日動帯）`,
            data: workdayData,
            backgroundColor: 'rgba(0, 0, 0, 0)', // 透明
            borderColor: yearColor.border,
            borderWidth: 2,
            borderDash: [5, 5], // 点線
            tension: 0.1,
            fill: false
        });
    });
    
    // 表示するデータセットを決定
    let displayDatasets = [];
    
    if (chartDisplayMode === 'all') {
        // 全データのみ表示
        displayDatasets = datasets;
    } else if (chartDisplayMode === 'workday') {
        // 平日日動帯のみ表示
        displayDatasets = workdayDatasets;
    } else if (chartDisplayMode === 'combined') {
        // 両方表示
        displayDatasets = [...datasets, ...workdayDatasets];
    }
    
    // 既存のチャートを破棄
    if (charts.combinedMonthlyChart) {
        charts.combinedMonthlyChart.destroy();
    }
    
    // 新しいチャートを作成
    const ctx = document.getElementById('combined-monthly-chart').getContext('2d');
    charts.combinedMonthlyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: monthLabels,
            datasets: displayDatasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: '年別・月別ストップ件数',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        title: function(tooltipItems) {
                            return tooltipItems[0].label;
                        },
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw} 件`;
                        }
                    }
                }
            }
        }
    });
    
    console.log('統合月別チャート更新完了', { モード: chartDisplayMode });
}

/**
 * すべてのチャートを更新
 * @param {Array} filteredData - フィルタリングされたデータ
 * @param {Object} charts - チャートオブジェクトの格納先
 * @param {string} chartDisplayMode - チャート表示モード
 */
function updateCharts(filteredData, charts, chartDisplayMode) {
    console.log('チャート更新開始');
    
    // 月別平日日動帯ストップ時間チャート
    updateMonthlyHoursChart(filteredData, charts);
    
    // 診療科別チャート
    updateDepartmentChart(filteredData, charts);
    
    // 理由別チャート
    updateReasonChart(filteredData, charts);
    
    // 統合された月別チャート
    updateCombinedMonthlyChart(filteredData, charts, chartDisplayMode);
    
    console.log('チャート更新完了');
}

// グローバルスコープに関数をエクスポート
window.ChartRenderer = {
    updateMonthlyHoursChart,
    updateDepartmentChart,
    updateReasonChart,
    updateCombinedMonthlyChart,
    updateCharts
};
