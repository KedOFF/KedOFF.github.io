// Game state variables
let mode = 0;
let timerMode = true;
let clicks = 0;
let sclicks = 0;
let timerTime = 5;
let streamClicks = 20;
let clicksLeft = streamClicks;
let passed = 0;
let streamStart = 0;
let freqs = [];
let bindNum = 0;
let countdown, finish;
let history = [];
let lastClickTime = 0;
let currentCps = 0;

// BPM and graph
let clickTimes = [];
let intervals = [];
let averageBpms = []; // Среднее BPM на момент каждого клика
let deviations = [];
let currentChartType = 'bpm';
let bpmChart = null;
let chartData = {
    bpm: [],
    interval: [],
    deviation: []
};

// DOM elements
const counter = document.getElementById("counter");
const cpsCounter = document.getElementById("cps-counter");
const startButton = document.getElementById("start-button");
const clearButton = document.getElementById("clear-button");
const scoreMetric = document.getElementById("score");
const timeMetric = document.getElementById("time");
const freqMetric = document.getElementById("freq");
const levelMetric = document.getElementById("level");
const bpmMetric = document.getElementById("bpm");
const urMetric = document.getElementById("ur");
const maxMetric = document.getElementById("max");
const minMetric = document.getElementById("min");
const avgMetric = document.getElementById("avg");
const timerSet = document.getElementById("timer-set");
const clicksSet = document.getElementById("clicks-set");
const modeSwitch = document.getElementById("mode-switch");
const modeLabel = document.getElementById("mode-label");
const key1 = document.getElementById("key1");
const key2 = document.getElementById("key2");
const historyBody = document.getElementById("history-body");
const timeControl = document.getElementById("time-control");
const clicksControl = document.getElementById("clicks-control");
const notification = document.getElementById("notification");
const referenceBody = document.getElementById("reference-body");
const chartButtons = document.querySelectorAll('.chart-btn');

// Key bindings
let binds = {
    1: 'KeyZ',
    2: 'KeyX'
};

// Player skill levels based on realistic Osu! rankings
const skillLevels = [
    { min: 0, max: 5, rank: "F", name: "Beginner", stars: "⭐ 1.0 - 2.0", desc: "Just starting out, learning basics" },
    { min: 5, max: 7, rank: "E", name: "Novice", stars: "⭐ 2.0 - 3.5", desc: "Can complete easier maps, improving fundamentals" },
    { min: 7, max: 9, rank: "D", name: "Average", stars: "⭐ 3.5 - 4.5", desc: "Comfortable with moderate tempo maps" },
    { min: 9, max: 11, rank: "C", name: "Intermediate", stars: "⭐ 4.5 - 5.5", desc: "Can handle faster patterns with consistency" },
    { min: 11, max: 13, rank: "B", name: "Skilled", stars: "⭐ 5.5 - 6.5", desc: "Good speed and accuracy, can play challenging maps" },
    { min: 13, max: 15, rank: "A", name: "Advanced", stars: "⭐ 6.5 - 7.5", desc: "High speed, good accuracy, expert-level maps" },
    { min: 15, max: 17, rank: "S", name: "Expert", stars: "⭐ 7.5 - 8.5", desc: "Exceptional speed and precision, top-tier player" },
    { min: 17, max: 999, rank: "SS", name: "Elite", stars: "⭐ 8.5+", desc: " Extreme speed, tournament-level performance" }
];

// chart init
function initChart() {
    const ctx = document.getElementById('bpmChart').getContext('2d');
    
    if (bpmChart) {
        bpmChart.destroy();
    }
    
    bpmChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'BPM',
                data: [],
                borderColor: '#ff66aa',
                backgroundColor: 'rgba(255, 102, 170, 0.1)',
                borderWidth: 2,
                pointRadius: 3,
                pointBackgroundColor: '#ff66aa',
                fill: false,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#f2f2f2'
                    }
                },
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: 'Click Number',
                        color: '#f2f2f2'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#f2f2f2'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#f2f2f2'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw.y.toFixed(1)}`;
                        }
                    }
                }
            }
        }
    });
}

// chart update
function updateChart() {
    if (!bpmChart) return;
    
    // use the saved data instead of recalculating
    bpmChart.data.datasets[0].data = chartData[currentChartType];
    
    // Updating labels and colors depending on the chart type
    switch(currentChartType) {
        case 'bpm':
            bpmChart.data.datasets[0].label = 'BPM';
            bpmChart.data.datasets[0].borderColor = '#ff66aa';
            bpmChart.data.datasets[0].pointBackgroundColor = '#ff66aa';
            break;
            
        case 'interval':
            bpmChart.data.datasets[0].label = 'Interval (ms)';
            bpmChart.data.datasets[0].borderColor = '#a366ff';
            bpmChart.data.datasets[0].pointBackgroundColor = '#a366ff';
            break;
            
        case 'deviation':
            bpmChart.data.datasets[0].label = 'Deviation (ms)';
            bpmChart.data.datasets[0].borderColor = '#66b2ff';
            bpmChart.data.datasets[0].pointBackgroundColor = '#66b2ff';
            break;
    }
    
    bpmChart.update();
}

// Switching chart type
function switchChartType(type) {
    currentChartType = type;
    updateChart();
    
    // Обновляем активную кнопку
    chartButtons.forEach(btn => {
        if (btn.dataset.chart === type) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// calculating BPM and Unstable Rate
function calculateBpmAndUr() {
    if (intervals.length === 0) {
        bpmMetric.textContent = '0 bpm';
        urMetric.textContent = '0 ms';
        return { bpm: 0, ur: 0 };
    }
    
    // Calculation of the average interval
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    
// BPM calculation (beats per minute)
// 4 clicks per circle in osu!, so we divide by 4
    const bpm = (60000 / avgInterval) / 4;
    
    // Calculation of Unstable Rate (standard deviation of intervals * 10)
    const squaredDiffs = intervals.map(interval => Math.pow(interval - avgInterval, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    const ur = stdDev * 10;
    
    return { bpm: bpm.toFixed(1), ur: ur.toFixed(1) };
}

// Get skill level based on CPS
function getSkillLevel(cps) {
    for (const level of skillLevels) {
        if (cps >= level.min && cps < level.max) {
            return level;
        }
    }
    return skillLevels[skillLevels.length - 1];
}

// Update reference table highlighting
function updateReferenceTable(cps) {
    const rows = referenceBody.querySelectorAll('tr');
    rows.forEach((row, index) => {
        const level = skillLevels[index];
        if (cps >= level.min && cps < level.max) {
            row.classList.add('current-level');
        } else {
            row.classList.remove('current-level');
        }
    });
}

// Get color based on CPS value
function getColorForCps(cps) {
    if (cps < 5) return '#4CAF50'; // Green
    if (cps < 10) return '#FFC107'; // Yellow
    if (cps < 15) return '#FF9800'; // Orange
    if (cps < 20) return '#F44336'; // Red
    return '#9C27B0'; // Purple for extreme speeds
}

// Update CPS indicator appearance
function updateCpsIndicator(cps) {
    const color = getColorForCps(cps);
    cpsCounter.style.color = color;
    cpsCounter.style.textShadow = `0 0 10px ${color}40`;
    
    // Scale based on CPS (up to 1.5x for very high CPS)
    const scale = 1 + Math.min(cps * 0.03, 0.5);
    cpsCounter.style.transform = `scale(${scale})`;
}

// Show notification
function showNotification(message) {
    notification.textContent = message;
    notification.classList.add('show');
    setTimeout(() => {
        notification.classList.remove('show');
    }, 2000);
}

// Load history from localStorage
function loadHistory() {
    const savedHistory = localStorage.getItem('tpsHistory');
    if (savedHistory) {
        history = JSON.parse(savedHistory);
        updateHistoryTable();
    }
}

// Save history to localStorage
function saveHistory() {
    localStorage.setItem('tpsHistory', JSON.stringify(history));
}

// Update history table (new results on top)
function updateHistoryTable() {
    historyBody.innerHTML = '';
    
    // Show only last 10 results, with newest first
    const displayHistory = history.slice(-10).reverse();
    
    displayHistory.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${displayHistory.length - index}</td>
            <td>${item.score} clicks</td>
            <td>${item.time} sec</td>
            <td>${item.cps} cps</td>
            <td>${item.bpm} bpm</td>
            <td>${item.ur} ms</td>
            <td>${new Date(item.date).toLocaleTimeString()}</td>
        `;
        historyBody.appendChild(row);
    });
}

// Add result to history
function addToHistory(score, time, cps, rank, bpm, ur) {
    history.push({
        score,
        time,
        cps,
        rank,
        bpm,
        ur,
        date: new Date().toISOString()
    });
    
    // Keep only last 10 results
    if (history.length > 10) {
        history = history.slice(-10);
    }
    
    saveHistory();
    updateHistoryTable();
}

// Calculate max, min, average
function maxMinAvg(arr) {
    if (arr.length === 0) return [0, 0, 0];
    
    let max = arr[0];
    let min = arr[0];
    let sum = arr[0];
    
    for (let i = 1; i < arr.length; i++) {
        if (arr[i] > max) max = arr[i];
        if (arr[i] < min) min = arr[i];
        sum += arr[i];
    }
    
    return [max, min, sum / arr.length];
}

// Switch between timer and clicks mode
function switchMode() {
    timerMode = modeSwitch.checked;
    
    if (timerMode) {
        timerSet.style.display = 'block';
        clicksSet.style.display = 'none';
        modeLabel.textContent = 'Timer Mode';
    } else {
        timerSet.style.display = 'none';
        clicksSet.style.display = 'block';
        modeLabel.textContent = 'Clicks Mode';
    }
}

// Clear results
function clearResults(clearGlobal) {
    scoreMetric.textContent = '0 clicks';
    timeMetric.textContent = '0 sec';
    freqMetric.textContent = '0 cps';
    levelMetric.textContent = '-';
    bpmMetric.textContent = '0 bpm';
    urMetric.textContent = '0 ms';
    
    // Reset CPS indicator
    cpsCounter.textContent = '0 cps';
    cpsCounter.style.color = '';
    cpsCounter.style.textShadow = '';
    cpsCounter.style.transform = '';
    
    // Reset reference table highlighting
    const rows = referenceBody.querySelectorAll('tr');
    rows.forEach(row => row.classList.remove('current-level'));
    
    // Reset BPM chart and stats
    chartData = {
        bpm: [],
        interval: [],
        deviation: []
    };
    updateChart();
    
    if (clearGlobal) {
        freqs = [];
        maxMetric.textContent = '0 cps';
        minMetric.textContent = '0 cps';
        avgMetric.textContent = '0 cps';
        history = [];
        saveHistory();
        updateHistoryTable();
    }
}

// Update time setting
function updateTime() {
    const value = parseInt(timeControl.value);
    if (value > 0 && value <= 3600) {
        timerTime = value;
    } else if (value <= 0) {
        timerTime = 1;
        timeControl.value = 1;
    } else if (value > 3600) {
        timerTime = 3600;
        timeControl.value = 3600;
    }
}

// Update clicks setting
function updateClicks() {
    const value = parseInt(clicksControl.value);
    if (value > 0 && value <= 9999) {
        streamClicks = value;
    } else if (value <= 0) {
        streamClicks = 1;
        clicksControl.value = 1;
    } else if (value > 9999) {
        streamClicks = 9999;
        clicksControl.value = 9999;
    }
}

// Key binding change
function changeBinding(e) {
    e.preventDefault();
    if (bindNum && e.code) {
        binds[bindNum] = e.code;
        
        const keyName = e.code.startsWith('Key') ? e.code.substring(3) : e.code;
        
        if (bindNum === 1) {
            key1.textContent = keyName;
            key1.classList.remove('rebinding');
            showNotification("Primary key bound to: " + keyName);
        } else {
            key2.textContent = keyName;
            key2.classList.remove('rebinding');
            showNotification("Secondary key bound to: " + keyName);
        }
        
        document.removeEventListener('keydown', changeBinding);
        bindNum = 0;
    }
}

// Initiate key rebinding
function rebind(keyNum) {
    if (!mode && !bindNum) {
        bindNum = keyNum;
        
        if (keyNum === 1) {
            key1.textContent = 'Press any key';
            key1.classList.add('rebinding');
        } else {
            key2.textContent = 'Press any key';
            key2.classList.add('rebinding');
        }
        
        document.addEventListener('keydown', changeBinding);
    }
}

// Handle key press
function handleKeyPress(e) {
    if (timerMode) {
        if (e.code === binds[1] || e.code === binds[2]) {
            const now = Date.now();
            clicks++;
            sclicks++;
            scoreMetric.textContent = `${clicks} clicks`;
            
            // Записываем время клика для расчета BPM
            clickTimes.push(now);
            
            // Calculate intervals and BPM
            if (clickTimes.length > 1) {
                const interval = now - clickTimes[clickTimes.length - 2];
                intervals.push(interval);
                
                // Calculate average interval up to this point
                const avgInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
                
                // Calculate average BPM (4 clicks per beat in osu!)
                const avgBpm = (60000 / avgInterval) / 4;
                averageBpms.push(avgBpm);
                
                // Calculate deviation from average
                const deviation = Math.abs(interval - avgInterval);
                deviations.push(deviation);
                
                // Сохраняем данные для графиков
                chartData.bpm.push({ x: intervals.length, y: avgBpm });
                chartData.interval.push({ x: intervals.length, y: interval });
                chartData.deviation.push({ x: intervals.length, y: deviation });
                
                // Update chart in real-time
                updateChart();
            }
            
            // Calculate current CPS for visual feedback
            const elapsed = (now - streamStart) / 1000;
            currentCps = elapsed > 0 ? (clicks / elapsed) : clicks;
            
            // Update CPS indicator
            cpsCounter.textContent = `${currentCps.toFixed(1)} cps`;
            updateCpsIndicator(currentCps);
            
            // Add visual feedback to keys
            if (e.code === binds[1]) {
                key1.classList.add('active');
            } else {
                key2.classList.add('active');
            }
        }
    } else {
        if (e.code === binds[1] || e.code === binds[2]) {
            const now = Date.now();
            clicks++;
            clicksLeft--;
            scoreMetric.textContent = `${clicks} clicks`;
            counter.textContent = `${clicksLeft} left`;
            
            // Recording click time for BPM calculation
            clickTimes.push(now);
            
            // Calculate intervals and BPM
            if (clickTimes.length > 1) {
                const interval = now - clickTimes[clickTimes.length - 2];
                intervals.push(interval);
                
                // Calculate average interval up to this point
                const avgInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
                
                // Calculate average BPM (4 clicks per beat in osu!)
                const avgBpm = (60000 / avgInterval) / 4;
                averageBpms.push(avgBpm);
                
                // Calculate deviation from average
                const deviation = Math.abs(interval - avgInterval);
                deviations.push(deviation);
                
                // Сохраняем данные для графиков
                chartData.bpm.push({ x: intervals.length, y: avgBpm });
                chartData.interval.push({ x: intervals.length, y: interval });
                chartData.deviation.push({ x: intervals.length, y: deviation });
                
                // Update chart in real-time
                updateChart();
            }
            
            const cps = (clicks / ((now - streamStart) / 1000)).toFixed(1);
            currentCps = parseFloat(cps);
            cpsCounter.textContent = `${cps} cps`;
            
            // Update CPS indicator
            updateCpsIndicator(currentCps);
            
            // Add visual feedback
            if (e.code === binds[1]) {
                key1.classList.add('active');
            } else {
                key2.classList.add('active');
            }
            
            if (clicksLeft <= 0) {
                stopTracking();
            }
        }
    }
}

// Handle key release
function handleKeyRelease(e) {
    if (e.code === binds[1]) {
        key1.classList.remove('active');
    } else if (e.code === binds[2]) {
        key2.classList.remove('active');
    }
}

// Stop tracking
function stopTracking() {
    if (mode) {
        const streamEnd = Date.now();
        
        if (timerMode) {
            clearInterval(countdown);
            clearTimeout(finish);
        }
        
        document.removeEventListener('keydown', handleKeyPress);
        document.removeEventListener('keyup', handleKeyRelease);
        
        // Calculate results
        let resultTime, resultCps, resultLevel;
        
        if (timerMode) {
            resultTime = timerTime;
            resultCps = resultTime > 0 ? (clicks / resultTime).toFixed(1) : clicks;
            resultLevel = getSkillLevel(resultCps);
        } else {
            resultTime = ((streamEnd - streamStart) / 1000).toFixed(1);
            resultCps = resultTime > 0 ? (clicks / resultTime).toFixed(1) : 0;
            resultLevel = getSkillLevel(resultCps);
        }
        
        // Calculate BPM and Unstable Rate
        const { bpm, ur } = calculateBpmAndUr();
        
        // Update metrics
        timeMetric.textContent = `${resultTime} sec`;
        freqMetric.textContent = `${resultCps} cps`;
        levelMetric.textContent = `${resultLevel.rank} - ${resultLevel.name}`;
        bpmMetric.textContent = `${bpm} bpm`;
        urMetric.textContent = `${ur} ms`;
        
        // Update reference table
        updateReferenceTable(parseFloat(resultCps));
        
        // Add to history
        addToHistory(clicks, resultTime, resultCps, resultLevel.rank, bpm, ur);
        
        // Update global stats if we have valid results
        if (clicks > 0) {
            freqs.push(parseFloat(resultCps));
            
            const [maxCps, minCps, avgCps] = maxMinAvg(freqs);
            
            maxMetric.textContent = `${maxCps.toFixed(1)} cps`;
            minMetric.textContent = `${minCps.toFixed(1)} cps`;
            avgMetric.textContent = `${avgCps.toFixed(1)} cps`;
        }
        
        // Reset state
        clicks = 0;
        passed = 0;
        currentCps = 0;
        clickTimes = [];
        intervals = [];
        averageBpms = [];
        deviations = [];
        counter.textContent = 'idle';
        counter.classList.add('idle-animation');
        cpsCounter.textContent = '0 cps';
        cpsCounter.style.color = '';
        cpsCounter.style.textShadow = '';
        cpsCounter.style.transform = '';
        startButton.textContent = 'Start';
        startButton.classList.remove('btn-secondary');
        startButton.classList.add('btn-primary');
        mode = 0;
    }
}

// Start tracking
function startTracking() {
    if (!mode && !bindNum) {
        // Update settings from inputs
        updateTime();
        updateClicks();
        
        clearResults(false);
        mode = 1;
        counter.classList.remove('idle-animation');
        clickTimes = [];
        intervals = [];
        averageBpms = [];
        deviations = [];
        chartData = {
            bpm: [],
            interval: [],
            deviation: []
        };
        
        if (timerMode) {
            document.addEventListener('keydown', handleKeyPress);
            document.addEventListener('keyup', handleKeyRelease);
            
            counter.textContent = `${timerTime} sec`;
            startButton.textContent = 'Stop';
            startButton.classList.remove('btn-primary');
            startButton.classList.add('btn-secondary');
            
            let timeLeft = timerTime;
            passed = 0;
            streamStart = Date.now();
            
            countdown = setInterval(() => {
                timeLeft--;
                passed = timerTime - timeLeft;
                
                timeMetric.textContent = `${passed} sec`;
                cpsCounter.textContent = `${sclicks} cps`;
                updateCpsIndicator(sclicks);
                sclicks = 0;
                
                counter.textContent = `${timeLeft} sec`;
                
                if (timeLeft <= 0) {
                    clearInterval(countdown);
                }
            }, 1000);
            
            finish = setTimeout(stopTracking, timerTime * 1000);
        } else {
            document.addEventListener('keydown', handleKeyPress);
            document.addEventListener('keyup', handleKeyRelease);
            
            streamStart = Date.now();
            clicksLeft = streamClicks;
            
            counter.textContent = `${clicksLeft} left`;
            startButton.textContent = 'Stop';
            startButton.classList.remove('btn-primary');
            startButton.classList.add('btn-secondary');
        }
    } else {
        stopTracking();
    }
}

// Initialize the application
function init() {
    // Load history
    loadHistory();
    
    // Initialize chart
    initChart();
    
    // Set up event listeners
    startButton.addEventListener('click', startTracking);
    clearButton.addEventListener('click', () => clearResults(true));
    
    modeSwitch.addEventListener('change', switchMode);
    switchMode(); // Initialize mode
    
    timeControl.addEventListener('change', updateTime);
    timeControl.addEventListener('input', updateTime);
    
    clicksControl.addEventListener('change', updateClicks);
    clicksControl.addEventListener('input', updateClicks);
    
    key1.addEventListener('click', () => rebind(1));
    key2.addEventListener('click', () => rebind(2));
    
    // Chart type switcher
    chartButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            switchChartType(btn.dataset.chart);
        });
    });
    
    // Initialize values
    updateTime();
    updateClicks();
}

// Start the application when the page loads
window.addEventListener('load', init);