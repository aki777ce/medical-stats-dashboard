/**
 * メインのエントリーポイント
 */
document.addEventListener('DOMContentLoaded', function() {
    // グローバル変数
    let originalData = [];
    let processedData = [];
    let filteredData = [];
    let charts = {};
    let chartDisplayMode = 'all'; // 'all', 'workday', 'combined'
    let fileInput = document.getElementById('file-upload');
    
    // デフォルトファイル自動ロード機能は削除されました
    
    // フィルターボタンのイベントリスナーを追加
    document.getElementById('apply-filters').addEventListener('click', function() {
        filteredData = window.DataProcessor.applyFilters(processedData);
        window.DataProcessor.updateStatistics(filteredData);
        window.ChartRenderer.updateCharts(filteredData, charts, chartDisplayMode);
        window.TableManager.updateTable(filteredData);
    });
    
    // リセットボタンのイベントリスナーを追加
    document.getElementById('reset-filters').addEventListener('click', function() {
        document.getElementById('month-filter').value = 'all';
        document.getElementById('department-filter').value = 'all';
        filteredData = window.DataProcessor.applyFilters(processedData);
        window.DataProcessor.updateStatistics(filteredData);
        window.ChartRenderer.updateCharts(filteredData, charts, chartDisplayMode);
        window.TableManager.updateTable(filteredData);
    });
    
    // クリアボタンのイベントリスナーを追加
    document.getElementById('clear-data').addEventListener('click', function() {
        // 確認メッセージを表示
        if (confirm('データをクリアしてページをリロードします。よろしいですか？')) {
            // ページをリロード
            window.location.reload();
        }
    });

    // チャート表示切り替えボタンのイベントリスナーを追加
    document.getElementById('show-all-data').addEventListener('click', function() {
        setActiveButton('show-all-data');
        chartDisplayMode = 'all';
        window.ChartRenderer.updateCombinedMonthlyChart(filteredData, charts, chartDisplayMode);
    });
    
    document.getElementById('show-workday-data').addEventListener('click', function() {
        setActiveButton('show-workday-data');
        chartDisplayMode = 'workday';
        window.ChartRenderer.updateCombinedMonthlyChart(filteredData, charts, chartDisplayMode);
    });
    
    document.getElementById('show-combined-data').addEventListener('click', function() {
        setActiveButton('show-combined-data');
        chartDisplayMode = 'combined';
        window.ChartRenderer.updateCombinedMonthlyChart(filteredData, charts, chartDisplayMode);
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
                        processDataAndUpdate(allData);
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
                        
                        processDataAndUpdate(sheetData);
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
                processDataAndUpdate(allData);
                
            } catch (error) {
                console.error('ファイル処理エラー:', error);
                alert('ファイルの処理中にエラーが発生しました');
            }
        };
        
        reader.readAsArrayBuffer(file);
    });

    // データを処理して画面を更新する関数
    function processDataAndUpdate(jsonData) {
        // データを処理
        const result = window.DataProcessor.processData(jsonData);
        originalData = result.originalData;
        processedData = result.processedData;
        
        // シミュレーションデータを追加（必要に応じて）
        // originalData = window.DataProcessor.addSimulationData(originalData);
        // processedData = [...originalData];
        
        // フィルターオプションを更新
        window.DataProcessor.updateFilterOptions(processedData);
        
        // フィルターを適用
        filteredData = window.DataProcessor.applyFilters(processedData);
        
        // 統計情報を更新
        window.DataProcessor.updateStatistics(filteredData);
        
        // チャートを更新
        window.ChartRenderer.updateCharts(filteredData, charts, chartDisplayMode);
        
        // テーブルを更新
        window.TableManager.updateTable(filteredData);
        
        // 最新のfilteredDataを取得する関数を作成
        const getFilteredData = () => filteredData;
        
        // イベントハンドラーを設定
        window.EventHandlers.setupWorkdayToggleHandler(getFilteredData);
        window.EventHandlers.setupExportHandler(getFilteredData);
    }
});
