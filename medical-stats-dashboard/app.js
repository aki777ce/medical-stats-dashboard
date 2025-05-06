document.addEventListener('DOMContentLoaded', function() {
    // グローバル変数
    let originalData = [];
    let processedData = [];
    let filteredData = [];
    let charts = {};
    let chartDisplayMode = 'all'; // 'all', 'workday', 'combined'
    
    // フィルターボタンのイベントリスナーを追加
    document.getElementById('apply-filters').addEventListener('click', function() {
        applyFilters();
        updateCharts();
    });
    
    // リセットボタンのイベントリスナーを追加
    document.getElementById('reset-filters').addEventListener('click', function() {
        document.getElementById('month-filter').value = 'all';
        document.getElementById('department-filter').value = 'all';
        applyFilters();
        updateCharts();
    });

    // チャート表示切り替えボタンのイベントリスナーを追加
    document.getElementById('show-all-data').addEventListener('click', function() {
        setActiveButton('show-all-data');
        chartDisplayMode = 'all';
        updateCombinedMonthlyChart();
    });
    
    document.getElementById('show-workday-data').addEventListener('click', function() {
        setActiveButton('show-workday-data');
        chartDisplayMode = 'workday';
        updateCombinedMonthlyChart();
    });
    
    document.getElementById('show-combined-data').addEventListener('click', function() {
        setActiveButton('show-combined-data');
        chartDisplayMode = 'combined';
        updateCombinedMonthlyChart();
    });
    
    // ボタンのactiveクラスを切り替える関数
    function setActiveButton(activeButtonId) {
        const buttons = ['show-all-data', 'show-workday-data', 'show-combined-data'];
        buttons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (buttonId === activeButtonId) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }

    // 日本語ロケールを設定
    moment.locale('ja');

    // フォーム送信イベントリスナー
    document.getElementById('upload-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const fileInput = document.getElementById('file-upload');
        if (fileInput.files.length === 0) {
            alert('ファイルを選択してください');
            return;
        }
        
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // すべてのシートからデータを読み込む
                let allData = [];
                
                // シート選択用のUIを表示
                const sheetSelector = document.createElement('div');
                sheetSelector.className = 'mb-3';
                sheetSelector.innerHTML = `
                    <label class="form-label">シートを選択</label>
                    <select class="form-select" id="sheet-selector">
                        <option value="all">すべてのシート</option>
                        ${workbook.SheetNames.map((name, index) => 
                            `<option value="${index}">${name}</option>`).join('')}
                    </select>
                `;
                
                // フォームの前に挿入
                const form = document.getElementById('upload-form');
                form.parentNode.insertBefore(sheetSelector, form.nextSibling);
                
                // シート選択イベントリスナー
                document.getElementById('sheet-selector').addEventListener('change', function() {
                    const selectedSheet = this.value;
                    
                    if (selectedSheet === 'all') {
                        // すべてのシートのデータを処理
                        processData(allData);
                    } else {
                        // 選択されたシートのデータを処理
                        const sheetName = workbook.SheetNames[selectedSheet];
                        const worksheet = workbook.Sheets[sheetName];
                        const jsonData = XLSX.utils.sheet_to_json(worksheet);
                        
                        // シート名をデータに追加
                        const sheetData = jsonData.map(row => ({
                            ...row,
                            _sheetName: sheetName,
                            _selectedSheet: true // 選択されたシートであることを示すフラグ
                        }));
                        
                        processData(sheetData);
                    }
                });
                
                // すべてのシートからデータを収集
                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    
                    if (jsonData.length > 0) {
                        // シート名をデータに追加
                        const sheetData = jsonData.map(row => ({
                            ...row,
                            _sheetName: sheetName
                        }));
                        allData = [...allData, ...sheetData];
                    }
                });
                
                if (allData.length === 0) {
                    alert('データが見つかりませんでした');
                    return;
                }
                
                // デフォルトですべてのシートのデータを処理
                processData(allData);
                
            } catch (error) {
                console.error('ファイル処理エラー:', error);
                alert('ファイルの処理中にエラーが発生しました');
            }
        };
        
        reader.readAsArrayBuffer(file);
    });

    // データ処理関数
    function processData(jsonData) {
        // データ形式を確認
        const firstRow = jsonData[0];
        const requiredColumns = ['日付', 'ストップ科', '停止時間', '理由'];
        
        // カラム名をチェック
        const columns = Object.keys(firstRow);
        const missingColumns = requiredColumns.filter(col => !columns.includes(col));
        
        if (missingColumns.length > 0) {
            alert(`必要なカラムがありません: ${missingColumns.join(', ')}`);
            return;
        }
        
        // データを処理
        originalData = jsonData.map(row => {
            // 日付を処理
            let date;
            let rawDate = row['日付'];
            
            // シート名から年を抽出
            let extractedYear = null;
            if (row._sheetName) {
                const yearMatch = row._sheetName.match(/(20\d{2})/);
                if (yearMatch) {
                    extractedYear = parseInt(yearMatch[1]);
                }
            }
            
            // 日付が数値（Excelシリアル値）の場合
            if (typeof rawDate === 'number') {
                // Excelのシリアル値を日付に変換
                const excelDate = XLSX.SSF.parse_date_code(rawDate);
                if (excelDate) {
                    // デバッグ: 生の Excel シリアル値を確認
                    console.log('生の Excel シリアル値:', {
                        rawDate,
                        excelDate,
                        month: excelDate.m, // Excelの月は1-indexed
                        day: excelDate.d
                    });
                    
                    // シート名から抽出した年を使用
                    if (extractedYear) {
                        // 正しい月を保持するために文字列形式で日付を作成
                        date = moment(`${extractedYear}-${excelDate.m}-${excelDate.d}`, 'YYYY-M-D');
                    } else {
                        // Excel日付から年を使用
                        date = moment(`${excelDate.y}-${excelDate.m}-${excelDate.d}`, 'YYYY-M-D');
                    }
                    
                    // デバッグ: 変換後の日付を確認
                    console.log('変換後の日付:', {
                        rawDate,
                        momentDate: date.format('YYYY-MM-DD'),
                        year: date.year(),
                        month: date.month() + 1, // 0-indexedから1-indexedに変換
                        day: date.date()
                    });
                }
            }
            // 日付が文字列の場合
            else if (typeof rawDate === 'string') {
                // 日付形式を判別して処理
                if (rawDate.includes('/') || rawDate.includes('-')) {
                    // スラッシュまたはハイフン区切りの日付
                    date = moment(rawDate, ['YYYY/M/D', 'YYYY-M-D', 'YYYY/MM/DD', 'YYYY-MM-DD', 'M/D', 'MM/DD']);
                } else if (rawDate.includes('月') && rawDate.includes('日')) {
                    // 日本語形式の日付（例: 1月15日）
                    const monthMatch = rawDate.match(/(\d{1,2})月/);
                    const dayMatch = rawDate.match(/(\d{1,2})日/);
                    
                    if (monthMatch && dayMatch) {
                        const month = parseInt(monthMatch[1]);
                        const day = parseInt(dayMatch[1]);
                        date = moment(`${extractedYear}-${month}-${day}`, 'YYYY-M-D');
                    }
                } else {
                    // その他の形式を試行
                    date = moment(rawDate);
                }
            }
            
            // 日付が無効な場合、デフォルト値を設定
            if (!date || !date.isValid()) {
                console.warn('無効な日付:', rawDate);
                
                // 行のインデックスから月を推測
                const rowIndex = jsonData.indexOf(row);
                const month = (rowIndex % 12) + 1; // 1～12の範囲
                
                if (extractedYear) {
                    date = moment(`${extractedYear}-${month}-15`, 'YYYY-M-D');
                    console.log('行番号から月を推測:', { rowIndex, month, date: date.format('YYYY-MM-DD') });
                } else {
                    // 現在の年を使用
                    const currentYear = moment().year();
                    date = moment(`${currentYear}-${month}-15`, 'YYYY-M-D');
                    console.warn('年が特定できないため現在の年を使用:', date.format('YYYY-MM-DD'));
                }
            }
            
            // デバッグ情報
            console.log('日付処理結果:', {
                rawDate,
                date: date.format('YYYY-MM-DD'),
                year: date.year(),
                month: date.month() + 1, // 0-indexed to 1-indexed
                day: date.date()
            });
            
            // 1月のデータが正しく処理されているか確認
            if (date.month() === 0) { // 0 = 1月
                console.log('1月データを処理:', {
                    rawDate,
                    date: date.format('YYYY-MM-DD'),
                    month: date.month() + 1
                });
            }
            
            // 特定の月のデータが正しく処理されているか確認
            if (typeof rawDate === 'number' && date && extractedYear) {
                // Excelのシリアル値を再度取得
                const excelDate = XLSX.SSF.parse_date_code(rawDate);
                if (excelDate) {
                    // Excelの生の月とmomentの月を比較
                    const excelMonth = excelDate.m; // 1-indexed
                    const momentMonth = date.month() + 1; // 0-indexedから1-indexedに変換
                    
                    // 月が一致しない場合、Excelの月を使用して再設定
                    if (excelMonth !== momentMonth) {
                        console.log('月の不一致を修正:', {
                            rawDate,
                            excelMonth,
                            momentMonth,
                            oldDate: date.format('YYYY-MM-DD')
                        });
                        
                        // 正しい月で日付を再設定
                        date = moment(`${extractedYear}-${excelMonth}-${excelDate.d}`, 'YYYY-M-D');
                        
                        console.log('修正後の日付:', {
                            newDate: date.format('YYYY-MM-DD'),
                            newMonth: date.month() + 1
                        });
                    }
                }
                
                // 2月のデータを特別にチェック
                if (date.month() + 1 === 2) {
                    console.log('2月データを処理:', {
                        rawDate,
                        date: date.format('YYYY-MM-DD'),
                        month: date.month() + 1
                    });
                }
            }
            
            // 停止時間を処理
            let timeRange = [];
            let startTime, endTime;
            
            // 停止時間フィールドの型をチェック
            if (row['停止時間'] !== undefined) {
                if (typeof row['停止時間'] === 'string') {
                    // 文字列の場合は分割
                    timeRange = row['停止時間'].split(/[～~-]/);
                } else if (typeof row['停止時間'] === 'number') {
                    // 数値の場合はそのまま使用（時間として）
                    const hours = Math.floor(row['停止時間']);
                    const minutes = Math.round((row['停止時間'] - hours) * 60);
                    timeRange = [
                        `${hours}:${minutes.toString().padStart(2, '0')}`,
                        `${hours + 1}:${minutes.toString().padStart(2, '0')}`
                    ];
                }
            } else if (row['開始時間'] !== undefined && row['終了時間'] !== undefined) {
                // 開始時間と終了時間が別フィールドの場合
                timeRange = [row['開始時間'], row['終了時間']];
            }
            
            // デバッグ情報を追加
            console.log('日付データ:', {
                rawDate: row['日付'],
                date: date ? date.format('YYYY-MM-DD') : null,
                month: date ? date.month() + 1 : null,
                sheetName: row._sheetName
            });
            
            // 時間範囲の処理
            if (timeRange.length >= 2) {
                startTime = moment(timeRange[0].toString().trim(), ['H:mm', 'HH:mm']);
                endTime = moment(timeRange[1].toString().trim(), ['H:mm', 'HH:mm']);
                
                // 有効な時間かチェック
                if (!startTime.isValid() || !endTime.isValid()) {
                    console.warn('無効な時間形式:', timeRange);
                    startTime = null;
                    endTime = null;
                } else {
                    // 終了時間が開始時間より前の場合（日をまたぐ場合）
                    if (endTime.isBefore(startTime)) {
                        endTime.add(1, 'day');
                    }
                }
            }
            
            // 平日日勤帯（8:00-17:00）の時間を計算
            const isWorkday = isBusinessDay(date);
            let workdayHours = 0;
            
            if (isWorkday && startTime && endTime) {
                const workdayStart = moment(startTime).hour(8).minute(0);
                const workdayEnd = moment(startTime).hour(17).minute(0);
                
                // 停止時間が日勤帯と重なる場合
                if (!(endTime.isBefore(workdayStart) || startTime.isAfter(workdayEnd))) {
                    const overlapStart = moment.max(startTime, workdayStart);
                    const overlapEnd = moment.min(endTime, workdayEnd);
                    workdayHours = overlapEnd.diff(overlapStart, 'hours', true);
                }
            }
            
            // 停止時間の合計を計算
            const totalHours = startTime && endTime ? endTime.diff(startTime, 'hours', true) : 0;
            
            return {
                date: date.format('YYYY/MM/DD'),
                year: date.year(),
                month: date.month() + 1, // 0-indexed to 1-indexed
                department: row['ストップ科'],
                timeRange: row['停止時間'],
                startTime: startTime ? startTime.format('HH:mm') : '',
                endTime: endTime ? endTime.format('HH:mm') : '',
                reason: row['理由'],
                isWorkday: isWorkday,
                totalHours: totalHours,
                workdayHours: workdayHours
            };
        });
        
        processedData = [...originalData];
        filteredData = [...processedData];
        
        // フィルターの選択肢を更新
        updateFilterOptions();
        
        // データを表示
        applyFilters();
        
        // データの月別分布を確認
        const monthsWithData = new Set(processedData.map(item => item.month));
        console.log('データが存在する月:', [...monthsWithData].sort());
        console.log('処理されたデータ数:', processedData.length);
        
        // 各月のデータ数を確認
        const monthCounts = {};
        processedData.forEach(item => {
            const month = item.month;
            monthCounts[month] = (monthCounts[month] || 0) + 1;
        });
        console.log('月別データ数:', monthCounts);
    }
    
    // シミュレーションデータを追加
    function addSimulationData() {
        console.log('シミュレーションデータを追加します');
        
        // 現在のデータをバックアップ
        const originalDataBackup = [...originalData];
        
        // 既存のデータから年を抽出
        const existingYears = [...new Set(originalData.map(item => item.year))];
        const yearsToAdd = existingYears.length > 0 ? existingYears : [2021, 2022, 2023, 2024, 2025];
        
        // 既存のデータから月を確認
        const existingMonths = {};
        originalData.forEach(item => {
            if (!existingMonths[item.year]) {
                existingMonths[item.year] = new Set();
            }
            existingMonths[item.year].add(item.month);
        });
        
        // 各年の不足している月にデータを追加
        yearsToAdd.forEach(year => {
            // この年の既存の月を取得
            const monthsForYear = existingMonths[year] ? [...existingMonths[year]] : [];
            console.log(`${year}年の既存データ月:`, monthsForYear);
            
            // 不足している月を特定
            for (let month = 1; month <= 12; month++) {
                if (!monthsForYear.includes(month)) {
                    console.log(`${year}年${month}月のデータを追加します`);
                    
                    // 各月に5件のデータを追加
                    for (let i = 1; i <= 5; i++) {
                        const day = Math.min(i * 5, 28);
                        const dateStr = `${year}/${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}`;
                        const date = moment(dateStr, 'YYYY/MM/DD');
                        
                        // 診療科のサンプル
                        const departments = ['内科', '外科', '小児科', '整形外科', '産婦人科'];
                        const department = departments[i - 1];
                        
                        // 理由のサンプル
                        const reasons = ['病床満床', '人員不足', '手術対応', 'ICU満床', 'カテーテル対応'];
                        const reason = reasons[i - 1];
                        
                        // 停止時間
                        const startHour = 8 + Math.floor(Math.random() * 12);
                        const endHour = startHour + 1 + Math.floor(Math.random() * 5);
                        const timeRange = `${startHour}:00-${endHour}:00`;
                        
                        // 時間計算
                        const startTime = moment(date).hour(startHour).minute(0);
                        const endTime = moment(date).hour(endHour).minute(0);
                        const totalHours = endTime.diff(startTime, 'hours', true);
                        
                        // 平日日勤帯の時間計算
                        const isWorkday = date.day() > 0 && date.day() < 6;
                        let workdayHours = 0;
                        
                        if (isWorkday) {
                            const workdayStart = moment(date).hour(8).minute(0);
                            const workdayEnd = moment(date).hour(17).minute(0);
                            
                            if (!(endTime.isBefore(workdayStart) || startTime.isAfter(workdayEnd))) {
                                const overlapStart = moment.max(startTime, workdayStart);
                                const overlapEnd = moment.min(endTime, workdayEnd);
                                workdayHours = overlapEnd.diff(overlapStart, 'hours', true);
                            }
                        }
                        
                        // データを追加
                        originalData.push({
                            date: date.format('YYYY/MM/DD'),
                            year: year,
                            month: month,
                            department: department,
                            timeRange: timeRange,
                            startTime: startTime.format('HH:mm'),
                            endTime: endTime.format('HH:mm'),
                            reason: reason,
                            isWorkday: isWorkday,
                            totalHours: totalHours,
                            workdayHours: workdayHours,
                            _isSimulated: true // シミュレーションデータのフラグ
                        });
                    }
                }
            }
        });
        
        // フィルターを更新
        processedData = [...originalData];
        updateFilterOptions();
        applyFilters();
    }
    
    // 営業日（平日）判定関数
    function isBusinessDay(date) {
        const day = date.day();
        // 土日チェック (0:日曜, 6:土曜)
        if (day === 0 || day === 6) {
            return false;
        }
        
        // 祝日チェック (JapaneseHolidays ライブラリを使用)
        const dateStr = date.format('YYYY-MM-DD');
        if (JapaneseHolidays.isHoliday(new Date(dateStr))) {
            return false;
        }
        
        return true;
    }
    
    // フィルターオプションを更新
    function updateFilterOptions() {
        // 月フィルター
        const monthFilter = document.getElementById('month-filter');
        // すべての月を取得
        const allMonths = [];
        for (let i = 1; i <= 12; i++) {
            allMonths.push(i);
        }
        
        monthFilter.innerHTML = '<option value="all">すべての月</option>';
        allMonths.forEach(month => {
            const option = document.createElement('option');
            option.value = month;
            option.textContent = `${month}月`;
            monthFilter.appendChild(option);
        });
        
        // 診療科フィルター
        const departmentFilter = document.getElementById('department-filter');
        const departments = [...new Set(processedData.map(item => item.department))].sort();
        departmentFilter.innerHTML = '<option value="all">すべて</option>';
        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept;
            option.textContent = dept;
            departmentFilter.appendChild(option);
        });
    }
    
    // フィルター適用
    function applyFilters() {
        const monthFilter = document.getElementById('month-filter').value;
        const departmentFilter = document.getElementById('department-filter').value;
        
        console.log('フィルター適用:', { monthFilter, departmentFilter });
        
        filteredData = processedData.filter(item => {
            const monthMatch = monthFilter === 'all' || parseInt(item.month) === parseInt(monthFilter);
            const departmentMatch = departmentFilter === 'all' || item.department === departmentFilter;
            
            return monthMatch && departmentMatch;
        });
        
        console.log('フィルター後のデータ数:', filteredData.length);
        
        updateStatistics();
        updateCharts();
        updateTable();
    }
    
    // 統計情報の更新
    function updateStatistics() {
        const totalStops = filteredData.length;
        const workdayStops = filteredData.filter(item => item.workdayHours > 0).length;
        const totalWorkdayHours = filteredData.reduce((sum, item) => sum + item.workdayHours, 0);
        const workdayPercentage = totalStops > 0 ? (workdayStops / totalStops * 100).toFixed(1) : 0;
        
        document.getElementById('total-stops').textContent = totalStops;
        document.getElementById('workday-stops').textContent = workdayStops;
        document.getElementById('workday-hours').textContent = totalWorkdayHours.toFixed(1);
        document.getElementById('workday-percentage').textContent = `${workdayPercentage}%`;
    }
    
    // チャートの更新
    function updateCharts() {
        console.log('チャート更新開始');
        
        // 月別平日日動帯ストップ時間チャート
        updateMonthlyHoursChart();
        
        // 診療科別チャート
        updateDepartmentChart();
        
        // 理由別チャート
    }
    
    // 月別平日日動帯ストップ時間チャート
    function updateMonthlyHoursChart() {
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
    
    // 診療科別チャート
    function updateDepartmentChart() {
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
    
    // 理由別チャート
    function updateReasonChart() {
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
    
    // 統合された月別チャートを表示
    function updateCombinedMonthlyChart() {
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
    
    // 外部モジュールのイベントハンドラーを設定
    window.EventHandlers.setupWorkdayToggleHandler(filteredData);
    window.EventHandlers.setupExportHandler(filteredData);
    

});
