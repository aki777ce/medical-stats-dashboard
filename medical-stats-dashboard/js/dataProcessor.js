/**
 * データ処理関連の機能
 */

/**
 * データを処理する関数
 * @param {Array} jsonData - 元のJSONデータ
 * @returns {Object} 処理結果（originalData, processedData, filteredData）
 */
function processData(jsonData) {
    // グローバル変数
    let originalData = [];
    let processedData = [];
    
    // データ形式を確認
    const firstRow = jsonData[0];
    const requiredColumns = ['日付', 'ストップ科', '停止時間', '理由'];
    
    // カラム名をチェック
    const columns = Object.keys(firstRow);
    const missingColumns = requiredColumns.filter(col => !columns.includes(col));
    
    if (missingColumns.length > 0) {
        alert(`必要なカラムがありません: ${missingColumns.join(', ')}`);
        return { originalData: [], processedData: [], filteredData: [] };
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
                
                console.log('変換後の日付:', date.format('YYYY-MM-DD'));
            } else {
                console.error('Excel日付の変換に失敗:', rawDate);
                date = moment(); // 現在の日付をフォールバックとして使用
            }
        } else if (typeof rawDate === 'string') {
            // 文字列形式の日付
            // 日付フォーマットを推測
            if (rawDate.includes('/')) {
                // YYYY/MM/DD または MM/DD/YYYY 形式
                const parts = rawDate.split('/');
                if (parts.length === 3) {
                    if (parts[0].length === 4) {
                        // YYYY/MM/DD
                        date = moment(rawDate, 'YYYY/MM/DD');
                    } else {
                        // MM/DD/YYYY
                        if (extractedYear) {
                            // シート名から抽出した年を使用
                            date = moment(`${extractedYear}/${parts[0]}/${parts[1]}`, 'YYYY/MM/DD');
                        } else {
                            date = moment(rawDate, 'MM/DD/YYYY');
                        }
                    }
                } else {
                    console.error('不正な日付形式:', rawDate);
                    date = moment(); // 現在の日付をフォールバックとして使用
                }
            } else if (rawDate.includes('-')) {
                // YYYY-MM-DD 形式
                date = moment(rawDate, 'YYYY-MM-DD');
            } else {
                console.error('不明な日付形式:', rawDate);
                date = moment(); // 現在の日付をフォールバックとして使用
            }
        } else {
            console.error('不明な日付タイプ:', typeof rawDate, rawDate);
            date = moment(); // 現在の日付をフォールバックとして使用
        }
        
        // 日付が無効な場合のフォールバック
        if (!date.isValid()) {
            console.error('無効な日付:', rawDate);
            date = moment(); // 現在の日付をフォールバックとして使用
        }
        
        // 年と月を抽出
        const year = date.year();
        const month = date.month() + 1; // momentは0-indexedの月を使用
        
        // 停止時間を処理
        const timeRange = row['停止時間'] || '';
        let startTime = null;
        let endTime = null;
        
        // 時間範囲をパース（例: "9:00-12:00", "4:37-9:40", "9:00~12:00", "9:00～12:00"）
        if (timeRange && typeof timeRange === 'string') {
            console.log('時間範囲解析開始:', timeRange);
            
            // 区切り文字を正規化（'-', '~', '～' のいずれかに対応）
            let normalizedTimeRange = timeRange;
            // 余分な文字を削除（「翌」や「4/25」など）
            normalizedTimeRange = normalizedTimeRange.replace(/翌|翌日|\d+\/\d+|（.*?）|\(.*?\)|継続中/g, '');
            // 全角文字を半角に変換
            normalizedTimeRange = normalizedTimeRange.replace(/：/g, ':');
            // 区切り文字を正規化
            normalizedTimeRange = normalizedTimeRange.replace(/[~～〜]/g, '-');
            
            console.log('正規化された時間範囲:', normalizedTimeRange);
            
            const timeParts = normalizedTimeRange.split('-');
            if (timeParts.length === 2) {
                // 時間形式を正規化する関数
                const normalizeTimeFormat = (timeStr) => {
                    // 時間形式を正規化（例: "4:37" → "04:37"）
                    const parts = timeStr.trim().split(':');
                    if (parts.length === 2) {
                        const hour = parts[0].padStart(2, '0');
                        const minute = parts[1].padStart(2, '0');
                        return `${hour}:${minute}`;
                    }
                    return timeStr.trim();
                };
                
                const normalizedStartTime = normalizeTimeFormat(timeParts[0]);
                const normalizedEndTime = normalizeTimeFormat(timeParts[1]);
                
                console.log('正規化された時間:', {
                    original: timeRange,
                    normalizedStart: normalizedStartTime,
                    normalizedEnd: normalizedEndTime
                });
                
                startTime = moment(date.format('YYYY-MM-DD') + ' ' + normalizedStartTime, 'YYYY-MM-DD HH:mm');
                endTime = moment(date.format('YYYY-MM-DD') + ' ' + normalizedEndTime, 'YYYY-MM-DD HH:mm');
                
                if (!startTime.isValid() || !endTime.isValid()) {
                    console.error('時間解析エラー:', {
                        timeRange,
                        normalizedStart: normalizedStartTime,
                        normalizedEnd: normalizedEndTime,
                        startTimeValid: startTime.isValid(),
                        endTimeValid: endTime.isValid()
                    });
                } else {
                    console.log('時間解析成功:', {
                        startTime: startTime.format('YYYY-MM-DD HH:mm'),
                        endTime: endTime.format('YYYY-MM-DD HH:mm')
                    });
                    
                    // 終了時間が開始時間より前の場合（例: 23:00-2:00）、翌日として処理
                    if (endTime.isBefore(startTime)) {
                        endTime.add(1, 'day');
                        console.log('翌日に調整:', endTime.format('YYYY-MM-DD HH:mm'));
                    }
                }
            } else {
                console.error('時間範囲形式エラー:', timeRange);
            }
        } else {
            console.log('時間範囲が無いか無効:', timeRange);
        }
        
        // 平日かどうかを判定
        const isWorkday = isBusinessDay(date);
        
        // 平日日勤帯の時間を計算
        let workdayHours = 0;
        
        // デバッグ情報
        console.log('日付と時間範囲:', JSON.stringify({
            date: date.format('YYYY/MM/DD'),
            timeRange,
            isWorkday,
            hasStartTime: !!startTime,
            hasEndTime: !!endTime,
            startTimeStr: startTime ? startTime.format('YYYY-MM-DD HH:mm') : 'null',
            endTimeStr: endTime ? endTime.format('YYYY-MM-DD HH:mm') : 'null'
        }));
        
        if (isWorkday && startTime && endTime) {
            // 日勤帯の時間範囲（8:00-17:00）
            const workdayStart = moment(date).hour(8).minute(0);
            const workdayEnd = moment(date).hour(17).minute(0);
            
            console.log('日勤帯時間範囲:', JSON.stringify({
                workdayStart: workdayStart.format('YYYY-MM-DD HH:mm'),
                workdayEnd: workdayEnd.format('YYYY-MM-DD HH:mm'),
                beforeWorkday: endTime.isBefore(workdayStart),
                afterWorkday: startTime.isAfter(workdayEnd)
            }));
            
            // 停止時間が日勤帯と重なるかチェック
            if (!(endTime.isBefore(workdayStart) || startTime.isAfter(workdayEnd))) {
                // 重なる部分の開始時間と終了時間を計算
                const overlapStart = moment.max(startTime, workdayStart);
                const overlapEnd = moment.min(endTime, workdayEnd);
                
                // 重なる時間（時間単位）を計算
                workdayHours = overlapEnd.diff(overlapStart, 'hours', true);
                
                console.log('重なり計算結果:', JSON.stringify({
                    overlapStart: overlapStart.format('YYYY-MM-DD HH:mm'),
                    overlapEnd: overlapEnd.format('YYYY-MM-DD HH:mm'),
                    workdayHours
                }));
            } else {
                console.log('日勤帯と重なりなし');
            }
        } else {
            console.log('平日日勤帯時間計算条件不満:', { isWorkday, hasStartTime: !!startTime, hasEndTime: !!endTime });
        }
        
        return {
            date: date.format('YYYY/MM/DD'),
            year: year,
            month: month,
            department: row['ストップ科'] || '',
            timeRange: timeRange,
            startTime: startTime ? startTime.format('HH:mm') : '',
            endTime: endTime ? endTime.format('HH:mm') : '',
            reason: row['理由'] || '',
            isWorkday: isWorkday,
            workdayHours: workdayHours,
            _sheetName: row._sheetName || ''
        };
    });
    
    // 処理済みデータを設定
    processedData = [...originalData];
    
    // 各月のデータ数を確認
    const monthCounts = {};
    processedData.forEach(item => {
        const month = item.month;
        monthCounts[month] = (monthCounts[month] || 0) + 1;
    });
    console.log('月別データ数:', monthCounts);
    
    return { originalData, processedData, filteredData: processedData };
}

/**
 * シミュレーションデータを追加
 * @param {Array} originalData - 元のデータ
 * @returns {Array} 更新されたデータ
 */
function addSimulationData(originalData) {
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
    
    return originalData;
}

/**
 * 営業日（平日）判定関数
 * @param {moment} date - 日付
 * @returns {boolean} 平日かどうか
 */
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

/**
 * フィルターオプションを更新
 * @param {Array} processedData - 処理済みデータ
 */
function updateFilterOptions(processedData) {
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

/**
 * フィルター適用
 * @param {Array} processedData - 処理済みデータ
 * @returns {Array} フィルター後のデータ
 */
function applyFilters(processedData) {
    const monthFilter = document.getElementById('month-filter').value;
    const departmentFilter = document.getElementById('department-filter').value;
    
    console.log('フィルター適用:', { monthFilter, departmentFilter });
    
    const filteredData = processedData.filter(item => {
        const monthMatch = monthFilter === 'all' || parseInt(item.month) === parseInt(monthFilter);
        const departmentMatch = departmentFilter === 'all' || item.department === departmentFilter;
        
        return monthMatch && departmentMatch;
    });
    
    console.log('フィルター後のデータ数:', filteredData.length);
    
    return filteredData;
}

/**
 * 統計情報の更新
 * @param {Array} filteredData - フィルタリングされたデータ
 */
function updateStatistics(filteredData) {
    const totalStops = filteredData.length;
    const workdayStops = filteredData.filter(item => item.workdayHours > 0).length;
    const totalWorkdayHours = filteredData.reduce((sum, item) => sum + item.workdayHours, 0);
    const workdayPercentage = totalStops > 0 ? (workdayStops / totalStops * 100).toFixed(1) : 0;
    
    document.getElementById('total-stops').textContent = totalStops;
    document.getElementById('workday-stops').textContent = workdayStops;
    document.getElementById('workday-hours').textContent = totalWorkdayHours.toFixed(1);
    document.getElementById('workday-percentage').textContent = `${workdayPercentage}%`;
}

// グローバルスコープに関数をエクスポート
window.DataProcessor = {
    processData,
    addSimulationData,
    isBusinessDay,
    updateFilterOptions,
    applyFilters,
    updateStatistics
};
