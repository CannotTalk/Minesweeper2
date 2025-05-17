// --- Constants ---
const gridSize = 20;
const MINE_PENALTY_MS = 15000;
const BASKETBALL_INTERVAL_MS = 10000;
const GHOST_CLOSE_DELAY_MS = 30000;
const BLACK_HOLE_COUNT = 3;
const TENKOMORI_CHANCE = 0.05; // 5% chance for Tenkomori
const defaultSettings = {
    numMines: 50,
    enableNoFlags: false,
    enableTimeBomb: false,
    timeLimitRandom: true,
    timeLimitMinMs: 180000,
    timeLimitMaxMs: 480000,
    timeLimitFixedMs: 300000,
    gameOverOnTimeOnly: false,
    enableNumbers: true,
    enableHide: true,
    hideRateMax: 0.10,
    enableDirectional: true,
    enableOddEven: true,
    enableAreaValue: true,
    enableNaturalNumber: true,
    enableBlind: false,
    enableMegamori: false // Added Megamori default
};

// Blind Mode Constants
const BLIND_MINE_MIN = 60;
const BLIND_MINE_MAX = 120;
const BLIND_HIDE_RATE = 0.20;
const BLIND_DIRECTIONAL_RATE = 0.10;
const BLIND_ODDEVEN_RATE = 0.10;
const BLIND_AREAVALUE_RATE = 0.05;
const BLIND_NATURALNUMBER_RATE = 0.05;
const MIN_ERROR_RATE = 0.10;

// --- Blind Rules Definition ---
const blindRules = [{
        id: 'basketball',
        title: 'バスケットボール',
        description: '10秒に1回は安全なマスを開けなければならない',
    },
    {
        id: 'error',
        title: '過失誤差',
        description: '数字マスが±1されることがある',
    },
    {
        id: 'anomaly',
        title: '異常発生',
        description: '特定の特殊マスの生成率が増加する',
    },
    {
        id: 'noChain',
        title: '隠密',
        description: '0マスでの連鎖が発生しない',
    },
    {
        id: 'torus',
        title: 'トーラス',
        description: '盤面の上下左右の端がつながる',
    },
    {
        id: 'abekobe',
        title: 'あべこべ',
        description: '数字マスは安全地帯の数を示すようになる',
    },
    {
        id: 'ghost', // New Rule
        title: '亡霊',
        description: '数字マスを開けても30秒後に再び閉じる',
    },
    {
        id: 'myopia', // New Rule
        title: '近視眼',
        description: '数字マスは隣接した上下左右4マスの地雷の数を表示する',
    },
    {
        id: 'blackHole', // New Rule
        title: 'ブラックホール',
        description: '3個あるブラックホールマスを開けると周囲のマスが強制的に開く',
    },
    {
        id: 'tenkomori',
        title: 'てんこ盛り！',
        description: '全てのブラインドが適用される！',
    }
];

const allBlindRuleIds = blindRules.filter(r => r.id !== 'tenkomori').map(r => r.id);

const specialSquareTypes = ['hide', 'directional', 'oddEven', 'areaValue', 'naturalNumber'];

const specialSquareNamesJP = {
    hide: 'ハイドマス',
    directional: 'ディレクションマス',
    oddEven: 'オッドイーブンマス',
    areaValue: 'エリアバリューマス',
    naturalNumber: 'ナチュラルナンバーマス'
};
let numMines = defaultSettings.numMines;
let currentMaxHideRate = defaultSettings.hideRateMax;
let currentMaxOddEvenRate = 0.10;
let currentMaxAreaValueRate = 0.03;
let currentMaxDirectionalRate = 0.05;
let currentMaxNaturalNumberRate = 0.05;

// --- Board State ---
let board = [];
let minesLeft = numMines;
let revealedNonMineCount = 0;
let clickedMineCount = 0;
let gameOver = false;
let firstClickDone = false;
let timerInterval = null;
let elapsedMilliseconds = 0;
let remainingMilliseconds = 0;
let timeLimitMilliseconds = 0;
const timerUpdateInterval = 50;
let gameStarted = false;
let startTime = 0;
let penaltyOffsetMs = 0;
let activeGhostTimers = {}; // To manage Ghost rule timers { "r-c": timerId }

// --- Interaction Mode State ---
let currentInteractionMode = 'dig';
let pcOperationMode = 'mouse';
let isTouch = false;
let justFlagged = false;

// --- Blind Mode State ---
let activeBlindRule = null
let isTenkomoriActive = false;
let basketballTimerInterval = null;
let basketballRemainingMs = BASKETBALL_INTERVAL_MS;
let basketballStartTime = 0;
let anomalyTargetType = null;
let currentAnomalyRate = 0;

// --- Theme State ---
let currentTheme = localStorage.getItem('minesweeperTheme') || 'light';

// --- Get DOM Elements ---
const boardElement = document.getElementById('board');
const resetButton = document.getElementById('reset-button');
const messageBox = document.getElementById('message-box');
const timerContainer = document.getElementById('timer-container');
const timerSpan = document.getElementById('timer-value');
const body = document.body;
const debugButtonsContainer = document.getElementById('debug-buttons');
const revealNonMinesButton = document.getElementById('reveal-non-mines');
const revealAllButton = document.getElementById('reveal-all');
const rulesButton = document.getElementById('rules-button');
const rulesPopup = document.getElementById('rules-popup');
const closePopupButton = document.getElementById('close-popup-button');
const popupOverlay = document.getElementById('popup-overlay');
const numberSwitch = document.getElementById('number-switch');
const hideSwitch = document.getElementById('hide-switch');
const directionalSwitch = document.getElementById('directional-switch');
const oddEvenSwitch = document.getElementById('odd-even-switch');
const areaValueSwitch = document.getElementById('area-value-switch');
const mineSlider = document.getElementById('mine-slider');
const mineCountDisplay = document.getElementById('mine-count-display');
const modeToggleButtonsContainer = document.getElementById('mode-toggle-buttons');
const digModeButton = document.getElementById('dig-mode-button');
const flagModeButton = document.getElementById('flag-mode-button');
const pcOpModeRadios = document.querySelectorAll('input[name="pc-op-mode"]');
const pcOpModeSection = document.getElementById('pc-op-mode-section');
const saveSettingsButton = document.getElementById('save-settings-button');
const activeRulesDisplay = document.getElementById('active-rules-display');
const hideRateSlider = document.getElementById('hide-rate-slider');
const hideRateDisplay = document.getElementById('hide-rate-display');
const hideRateControl = document.getElementById('hide-rate-control');
const resetRuleButtons = document.querySelectorAll('.reset-rule-button');
const noFlagsSwitch = document.getElementById('no-flags-switch');
const naturalNumberSwitch = document.getElementById('natural-number-switch');
const timeBombSwitch = document.getElementById('time-bomb-switch');
const timeBombDetails = document.getElementById('time-bomb-details');
const timeBombRandomSwitch = document.getElementById('time-bomb-random-switch');
const timeBombRandomSettings = document.getElementById('time-bomb-random-settings');
const timeBombFixedSettings = document.getElementById('time-bomb-fixed-settings');
const timeBombMinHoursInput = document.getElementById('time-bomb-min-hours');
const timeBombMinMinutesInput = document.getElementById('time-bomb-min-minutes');
const timeBombMinSecondsInput = document.getElementById('time-bomb-min-seconds');
const timeBombMaxHoursInput = document.getElementById('time-bomb-max-hours');
const timeBombMaxMinutesInput = document.getElementById('time-bomb-max-minutes');
const timeBombMaxSecondsInput = document.getElementById('time-bomb-max-seconds');
const timeBombFixedHoursInput = document.getElementById('time-bomb-fixed-hours');
const timeBombFixedMinutesInput = document.getElementById('time-bomb-fixed-minutes');
const timeBombFixedSecondsInput = document.getElementById('time-bomb-fixed-seconds');
const gameOverOnTimeOnlySwitch = document.getElementById('game-over-on-time-only-switch');
const timerStartDisplay = document.getElementById('timer-start-display');
const blindSwitch = document.getElementById('blind-switch');
const megamoriSwitch = document.getElementById('megamori-switch');
const megamoriSettingSection = document.getElementById('megamori-setting-section');
const blindRuleDisplay = document.getElementById('blind-rule-display');
const minesSettingSection = document.querySelector('.setting-section[data-rule-id="mines"]');
const noFlagsSettingSection = document.querySelector('.setting-section[data-rule-id="noFlags"]');
const timeBombSettingSection = document.querySelector('.setting-section[data-rule-id="timeBomb"]');
const numbersSettingSection = document.querySelector('.setting-section[data-rule-id="numbers"]');
const hideSettingSection = document.querySelector('.setting-section[data-rule-id="hide"]');
const directionalSettingSection = document.querySelector('.setting-section[data-rule-id="directional"]');
const oddEvenSettingSection = document.querySelector('.setting-section[data-rule-id="oddEven"]');
const areaValueSettingSection = document.querySelector('.setting-section[data-rule-id="areaValue"]');
const naturalNumberSettingSection = document.querySelector('.setting-section[data-rule-id="naturalNumber"]');
const blindSettingSection = document.querySelector('.setting-section[data-rule-id="blind"]');
const themeToggleSwitch = document.getElementById('theme-toggle-switch');
const resetAllSettingsButton = document.getElementById('reset-all-settings-button');

// --- Settings (Current Applied) --
let enableNoFlags = defaultSettings.enableNoFlags;
let enableTimeBomb = defaultSettings.enableTimeBomb;
let timeLimitRandom = defaultSettings.timeLimitRandom;
let timeLimitMinMs = defaultSettings.timeLimitMinMs;
let timeLimitMaxMs = defaultSettings.timeLimitMaxMs;
let timeLimitFixedMs = defaultSettings.timeLimitFixedMs;
let gameOverOnTimeOnly = defaultSettings.gameOverOnTimeOnly;
let enableNumbers = defaultSettings.enableNumbers;
let enableHide = defaultSettings.enableHide;
let hideRateMax = defaultSettings.hideRateMax;
let enableDirectional = defaultSettings.enableDirectional;
let enableOddEven = defaultSettings.enableOddEven;
let enableAreaValue = defaultSettings.enableAreaValue;
let enableNaturalNumber = defaultSettings.enableNaturalNumber;
let enableBlind = defaultSettings.enableBlind;
let enableMegamori = defaultSettings.enableMegamori;

let pendingSettings = { ...defaultSettings
};


// --- Helper Functions ---
function parseInputsToMs(hoursInput, minutesInput, secondsInput) {
    const h = parseInt(hoursInput?.value, 10) || 0;
    const m = parseInt(minutesInput?.value, 10) || 0;
    const s = parseInt(secondsInput?.value, 10) || 0;
    if (h < 0 || m < 0 || m > 59 || s < 0 || s > 59) {
        return null;
    }
    return (h * 3600 + m * 60 + s) * 1000;
}


function formatMsToInputs(ms, hoursInput, minutesInput, secondsInput) {
    if (typeof ms !== 'number' || ms < 0) {
        ms = 0;
    }
    const totalSeconds = Math.floor(ms / 1000);
    const seconds = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    const hours = Math.floor(totalMinutes / 60);
    
    if (hoursInput) {
        hoursInput.value = String(hours);
    }
    if (minutesInput) {
        minutesInput.value = String(minutes);
    }
    if (secondsInput) {
        secondsInput.value = String(seconds);
    }
}


function formatMsToDisplayTime(ms, includeHoursForce = false) {
    if (typeof ms !== 'number' || ms < 0) {
        return '00:00';
    }
    const totalSeconds = Math.floor(ms / 1000);
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = String(totalMinutes % 60).padStart(2, '0');
    const hours = Math.floor(totalMinutes / 60);
    
    if (includeHoursForce || hours > 0) {
        return `${String(hours).padStart(2, '0')}:${minutes}:${seconds}`;
    } else {
        return `${minutes}:${seconds}`;
    }
}


function initializeSliders() {
    const maxMines = gridSize * gridSize;
    if (mineSlider) {
        mineSlider.max = maxMines;
        let currentMineValue = pendingSettings.numMines;
        if (currentMineValue < 0) currentMineValue = 0;
        if (currentMineValue > maxMines) currentMineValue = maxMines;
        mineSlider.value = currentMineValue;
        if (mineCountDisplay) mineCountDisplay.textContent = currentMineValue;
    }
    if (hideRateSlider) {
        let currentHideRate = pendingSettings.hideRateMax * 100;
        const minHide = parseInt(hideRateSlider.min, 10);
        const maxHide = parseInt(hideRateSlider.max, 10);
        if (currentHideRate < minHide) currentHideRate = minHide;
        if (currentHideRate > maxHide) currentHideRate = maxHide;
        hideRateSlider.value = currentHideRate;
        if (hideRateDisplay) hideRateDisplay.textContent = `${Math.round(currentHideRate)}%`;
        if (hideRateControl) hideRateControl.classList.toggle('enabled', pendingSettings.enableHide && !pendingSettings.enableBlind);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    applyTheme(currentTheme);
    if (themeToggleSwitch) themeToggleSwitch.checked = (currentTheme === 'dark');
    pendingSettings = { ...getCurrentSettings()
    };
    initializeSliders();
});


// --- Device Detection and UI Initialization ---
function detectTouch() {
    isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (isTouch) {
        document.body.classList.add('touch-device');
        pcOperationMode = 'button';
        const buttonRadio = document.querySelector('input[name="pc-op-mode"][value="button"]');
        if (buttonRadio) buttonRadio.checked = true;
        if (pcOpModeSection) pcOpModeSection.style.display = 'none'; // Hide PC mode section on touch
    } else {
        document.body.classList.remove('touch-device');
        const currentPcOpRadio = document.querySelector(`input[name="pc-op-mode"][value="${pcOperationMode}"]`);
        if (!currentPcOpRadio) {
            pcOperationMode = 'mouse';
        }
        const targetRadio = document.querySelector(`input[name="pc-op-mode"][value="${pcOperationMode}"]`);
        if (targetRadio) targetRadio.checked = true;
        document.body.dataset.pcOpMode = pcOperationMode;
        if (pcOpModeSection) pcOpModeSection.style.display = 'block'; // Show PC mode section on non-touch
    }
    updateModeButtonsVisibility();
}

function updateModeButtonsVisibility() {
    modeToggleButtonsContainer.classList.toggle('visible', isTouch || pcOperationMode === 'button');
    if (flagModeButton) flagModeButton.disabled = enableNoFlags;
}


// --- Theme Functions ---
function applyTheme(theme) {
    document.body.dataset.theme = theme;
    localStorage.setItem('minesweeperTheme', theme);
    currentTheme = theme;
}

function toggleTheme() {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
}


// --- Blind Mode Helper ---
function isRuleActive(ruleId) {
    if (!enableBlind) return false;
    if (isTenkomoriActive) {
        // Tenkomori activates all *other* blind rules
        return allBlindRuleIds.includes(ruleId);
    }
    return activeBlindRule?.id === ruleId;
}


// --- Helper: hasNeighborOfType ---
function hasNeighborOfType(r, c, key) {
    const checkTorus = isRuleActive('torus');
    for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
            if (x === 0 && y === 0) continue;
            let ni = r + x;
            let nj = c + y;
            let checkSquare = null;
            if (checkTorus) {
                ni = (ni + gridSize) % gridSize;
                nj = (nj + gridSize) % gridSize;
                checkSquare = board[ni]?.[nj];
            } else {
                if (ni >= 0 && ni < gridSize && nj >= 0 && nj < gridSize) {
                    checkSquare = board[ni]?.[nj];
                }
            }
            if (checkSquare && checkSquare[key]) return true;
        }
    }
    return false;
}



// --- Event Listeners ---
if (resetButton) resetButton.addEventListener('click', resetGame);
if (revealNonMinesButton) revealNonMinesButton.addEventListener('click', revealNonMines);
if (revealAllButton) revealAllButton.addEventListener('click', revealAll);
if (rulesButton) rulesButton.addEventListener('click', openPopup);
if (closePopupButton) closePopupButton.addEventListener('click', closePopup);
if (popupOverlay) popupOverlay.addEventListener('click', closePopup);
if (numberSwitch) numberSwitch.addEventListener('change', () => {
    pendingSettings.enableNumbers = numberSwitch.checked;
});
if (hideSwitch) hideSwitch.addEventListener('change', () => {
    pendingSettings.enableHide = hideSwitch.checked;
    hideRateControl.classList.toggle('enabled', pendingSettings.enableHide && !pendingSettings.enableBlind);
});
if (directionalSwitch) directionalSwitch.addEventListener('change', () => {
    pendingSettings.enableDirectional = directionalSwitch.checked;
});

if (oddEvenSwitch) oddEvenSwitch.addEventListener('change', () => {
    pendingSettings.enableOddEven = oddEvenSwitch.checked;
});
if (areaValueSwitch) areaValueSwitch.addEventListener('change', () => {
    pendingSettings.enableAreaValue = areaValueSwitch.checked;
});
if (noFlagsSwitch) noFlagsSwitch.addEventListener('change', () => {
    pendingSettings.enableNoFlags = noFlagsSwitch.checked;
    updateSettingsUI(pendingSettings);
});
if (naturalNumberSwitch) naturalNumberSwitch.addEventListener('change', () => {
    pendingSettings.enableNaturalNumber = naturalNumberSwitch.checked;
});
if (timeBombSwitch) timeBombSwitch.addEventListener('change', () => {
    pendingSettings.enableTimeBomb = timeBombSwitch.checked;
    updateSettingsUI(pendingSettings);
    updateTimeBombDetailsVisibility();
});
if (timeBombRandomSwitch) timeBombRandomSwitch.addEventListener('change', () => {
    pendingSettings.timeLimitRandom = timeBombRandomSwitch.checked;
    updateTimeBombInputVisibility();
});
if (gameOverOnTimeOnlySwitch) gameOverOnTimeOnlySwitch.addEventListener('change', () => {
    pendingSettings.gameOverOnTimeOnly = gameOverOnTimeOnlySwitch.checked;
});
if (blindSwitch) blindSwitch.addEventListener('change', () => {
    pendingSettings.enableBlind = blindSwitch.checked;
    updateSettingsUI(pendingSettings);
});
if (megamoriSwitch) megamoriSwitch.addEventListener('change', () => {
    pendingSettings.enableMegamori = megamoriSwitch.checked;
});
if (mineSlider) mineSlider.addEventListener('input', () => {
    const maxMines = gridSize * gridSize;
    let val = parseInt(mineSlider.value, 10);
    if (val > maxMines) val = maxMines;
    if (val < 0) val = 0;
    pendingSettings.numMines = val;
    if (mineCountDisplay) mineCountDisplay.textContent = pendingSettings.numMines;
});
if (hideRateSlider) hideRateSlider.addEventListener('input', () => {
    pendingSettings.hideRateMax = parseInt(hideRateSlider.value, 10) / 100;
    if (hideRateDisplay) hideRateDisplay.textContent = `${hideRateSlider.value}%`;
});
if (digModeButton) digModeButton.addEventListener('click', () => switchMode('dig'));
if (flagModeButton) flagModeButton.addEventListener('click', () => switchMode('flag'));
if (pcOpModeRadios) pcOpModeRadios.forEach(radio => radio.addEventListener('change', handlePcOperationModeChange));
if (saveSettingsButton) saveSettingsButton.addEventListener('click', saveSettingsAndReset);
if (resetRuleButtons) resetRuleButtons.forEach(button => button.addEventListener('click', handleResetRule));
if (themeToggleSwitch) themeToggleSwitch.addEventListener('change', toggleTheme);
if (resetAllSettingsButton) resetAllSettingsButton.addEventListener('click', handleResetAllSettings);


function handleTimeInputChange() {
    let minMs = parseInputsToMs(timeBombMinHoursInput, timeBombMinMinutesInput, timeBombMinSecondsInput);
    let maxMs = parseInputsToMs(timeBombMaxHoursInput, timeBombMaxMinutesInput, timeBombMaxSecondsInput);
    let fixedMs = parseInputsToMs(timeBombFixedHoursInput, timeBombFixedMinutesInput, timeBombFixedSecondsInput);
    if (minMs !== null) {
        if (maxMs !== null && minMs > maxMs) {
            maxMs = minMs;
            formatMsToInputs(maxMs, timeBombMaxHoursInput, timeBombMaxMinutesInput, timeBombMaxSecondsInput);
        } pendingSettings.timeLimitMinMs = minMs;
    } else {
        formatMsToInputs(pendingSettings.timeLimitMinMs, timeBombMinHoursInput, timeBombMinMinutesInput, timeBombMinSecondsInput);
    }
    if (maxMs !== null) {
        if (minMs !== null && maxMs < minMs) {
            minMs = maxMs;
            formatMsToInputs(minMs, timeBombMinHoursInput, timeBombMinMinutesInput, timeBombMinSecondsInput);
            pendingSettings.timeLimitMinMs = minMs;
        } pendingSettings.timeLimitMaxMs = maxMs;
    } else {
        formatMsToInputs(pendingSettings.timeLimitMaxMs, timeBombMaxHoursInput, timeBombMaxMinutesInput, timeBombMaxSecondsInput);
    }
    if (fixedMs !== null) {
        if (fixedMs <= 0) {
            fixedMs = defaultSettings.timeLimitFixedMs;
            formatMsToInputs(fixedMs, timeBombFixedHoursInput, timeBombFixedMinutesInput, timeBombFixedSecondsInput);
        } pendingSettings.timeLimitFixedMs = fixedMs;
    } else {
        formatMsToInputs(pendingSettings.timeLimitFixedMs, timeBombFixedHoursInput, timeBombFixedMinutesInput, timeBombFixedSecondsInput);
    }
}

[timeBombMinHoursInput, timeBombMinMinutesInput, timeBombMinSecondsInput, timeBombMaxHoursInput, timeBombMaxMinutesInput, timeBombMaxSecondsInput, timeBombFixedHoursInput, timeBombFixedMinutesInput, timeBombFixedSecondsInput].forEach(input => {
    if (input) {
        input.addEventListener('change', handleTimeInputChange);
    }
});



// --- Popup Functions ---
function updateTimeBombDetailsVisibility() {
    const showDetails = pendingSettings.enableTimeBomb && !pendingSettings.enableBlind;
    if (timeBombDetails) timeBombDetails.classList.toggle('hidden-setting', !showDetails);
    if (showDetails) {
        updateTimeBombInputVisibility();
    }
}

function updateTimeBombInputVisibility() {
    if (timeBombRandomSettings && timeBombFixedSettings) {
        timeBombRandomSettings.classList.toggle('hidden-setting', !pendingSettings.timeLimitRandom);
        timeBombFixedSettings.classList.toggle('hidden-setting', pendingSettings.timeLimitRandom);
    }
}

function updateSettingsUI(settingsToUpdate) {
    const isBlindEnabled = settingsToUpdate.enableBlind;
    const isNoFlagsActive = settingsToUpdate.enableNoFlags;
    const isTimeBombActive = settingsToUpdate.enableTimeBomb;

    // Disable non-blind settings if blind mode is active
    const nonBlindSections = [minesSettingSection, noFlagsSettingSection, timeBombSettingSection, numbersSettingSection, hideSettingSection, directionalSettingSection, oddEvenSettingSection, areaValueSettingSection, naturalNumberSettingSection];
    nonBlindSections.forEach(section => section?.classList.toggle('disabled-setting', isBlindEnabled));

    // Disable Blind section if NoFlags or TimeBomb is active
    const disableBlindToggle = isNoFlagsActive || isTimeBombActive;
    if (blindSettingSection) blindSettingSection.classList.toggle('disabled-setting', disableBlindToggle);

    // Automatically disable Blind mode if prerequisites are met
    if (disableBlindToggle && settingsToUpdate.enableBlind) {
        settingsToUpdate.enableBlind = false;
        if (blindSwitch) blindSwitch.checked = false;
        // Also disable Megamori if Blind is disabled
        settingsToUpdate.enableMegamori = false;
        if (megamoriSwitch) megamoriSwitch.checked = false;
    }
    // Disable Megamori section if Blind mode itself is disabled
    if (megamoriSettingSection) megamoriSettingSection.classList.toggle('disabled-setting', !settingsToUpdate.enableBlind);

    // Disable NoFlags/TimeBomb if Blind is active
    if (isBlindEnabled) {
        if (noFlagsSettingSection) noFlagsSettingSection.classList.add('disabled-setting');
        if (timeBombSettingSection) timeBombSettingSection.classList.add('disabled-setting');
        if (settingsToUpdate.enableNoFlags) {
            settingsToUpdate.enableNoFlags = false;
            if (noFlagsSwitch) noFlagsSwitch.checked = false;
        }
        if (settingsToUpdate.enableTimeBomb) {
            settingsToUpdate.enableTimeBomb = false;
            if (timeBombSwitch) timeBombSwitch.checked = false;
        }
    } else {
        if (noFlagsSettingSection) noFlagsSettingSection.classList.remove('disabled-setting');
        if (timeBombSettingSection) timeBombSettingSection.classList.remove('disabled-setting');
    }
    if (hideRateControl) hideRateControl.classList.toggle('enabled', settingsToUpdate.enableHide && !isBlindEnabled);
    updateTimeBombDetailsVisibility(); // Update time bomb specific UI
}

function getCurrentSettings() {
    return {
        numMines: numMines,
        enableNoFlags: enableNoFlags,
        enableTimeBomb: enableTimeBomb,
        timeLimitRandom: timeLimitRandom,
        timeLimitMinMs: timeLimitMinMs,
        timeLimitMaxMs: timeLimitMaxMs,
        timeLimitFixedMs: timeLimitFixedMs,
        gameOverOnTimeOnly: gameOverOnTimeOnly,
        enableNumbers: enableNumbers,
        enableHide: enableHide,
        hideRateMax: hideRateMax,
        enableDirectional: enableDirectional,
        enableOddEven: enableOddEven,
        enableAreaValue: enableAreaValue,
        enableNaturalNumber: enableNaturalNumber,
        enableBlind: enableBlind,
        enableMegamori: enableMegamori
    };
}

function updatePopupUIFromSettings(settings) {
    pendingSettings = { ...settings
    };
    if (noFlagsSwitch) noFlagsSwitch.checked = settings.enableNoFlags;
    if (numberSwitch) numberSwitch.checked = settings.enableNumbers;
    if (hideSwitch) hideSwitch.checked = settings.enableHide;
    if (directionalSwitch) directionalSwitch.checked = settings.enableDirectional;
    if (oddEvenSwitch) oddEvenSwitch.checked = settings.enableOddEven;
    if (areaValueSwitch) areaValueSwitch.checked = settings.enableAreaValue;
    if (naturalNumberSwitch) naturalNumberSwitch.checked = settings.enableNaturalNumber;
    if (blindSwitch) blindSwitch.checked = settings.enableBlind;
    if (megamoriSwitch) megamoriSwitch.checked = settings.enableMegamori;
    if (timeBombSwitch) timeBombSwitch.checked = settings.enableTimeBomb;
    if (timeBombRandomSwitch) timeBombRandomSwitch.checked = settings.timeLimitRandom;
    if (gameOverOnTimeOnlySwitch) gameOverOnTimeOnlySwitch.checked = settings.gameOverOnTimeOnly;
    if (mineSlider) initializeSliders();
    if (timeBombMinHoursInput) {
        formatMsToInputs(settings.timeLimitMinMs, timeBombMinHoursInput, timeBombMinMinutesInput, timeBombMinSecondsInput);
        formatMsToInputs(settings.timeLimitMaxMs, timeBombMaxHoursInput, timeBombMaxMinutesInput, timeBombMaxSecondsInput);
        formatMsToInputs(settings.timeLimitFixedMs, timeBombFixedHoursInput, timeBombFixedMinutesInput, timeBombFixedSecondsInput);
    }
    const targetPcOpRadio = document.querySelector(`input[name="pc-op-mode"][value="${pcOperationMode}"]`);
    if (targetPcOpRadio) targetPcOpRadio.checked = true;
    updateSettingsUI(pendingSettings); // Update UI based on dependencies
}

function openPopup() {
    updatePopupUIFromSettings(getCurrentSettings());
    if (themeToggleSwitch) themeToggleSwitch.checked = (currentTheme === 'dark');
    if (rulesPopup && popupOverlay) {
        rulesPopup.classList.add('visible');
        popupOverlay.classList.add('visible');
    }
}

function closePopup() {
    if (rulesPopup && popupOverlay) {
        rulesPopup.classList.remove('visible');
        popupOverlay.classList.remove('visible');
    }
}

function handleResetRule(event) {
    const rule = event.target.dataset.rule;
    if (!rule) {
        return;
    }
    switch (rule) {
        case 'mines':
            pendingSettings.numMines = defaultSettings.numMines;
            break;
        case 'noFlags':
            pendingSettings.enableNoFlags = defaultSettings.enableNoFlags;
            break;
        case 'timeBomb':
            pendingSettings.enableTimeBomb = defaultSettings.enableTimeBomb;
            pendingSettings.timeLimitRandom = defaultSettings.timeLimitRandom;
            pendingSettings.timeLimitMinMs = defaultSettings.timeLimitMinMs;
            pendingSettings.timeLimitMaxMs = defaultSettings.timeLimitMaxMs;
            pendingSettings.timeLimitFixedMs = defaultSettings.timeLimitFixedMs;
            pendingSettings.gameOverOnTimeOnly = defaultSettings.gameOverOnTimeOnly;
            break;
        case 'numbers':
            pendingSettings.enableNumbers = defaultSettings.enableNumbers;
            break;
        case 'hide':
            pendingSettings.enableHide = defaultSettings.enableHide;
            pendingSettings.hideRateMax = defaultSettings.hideRateMax;
            break;
        case 'directional':
            pendingSettings.enableDirectional = defaultSettings.enableDirectional;
            break;
        case 'oddEven':
            pendingSettings.enableOddEven = defaultSettings.enableOddEven;
            break;
        case 'areaValue':
            pendingSettings.enableAreaValue = defaultSettings.enableAreaValue;
            break;
        case 'naturalNumber':
            pendingSettings.enableNaturalNumber = defaultSettings.enableNaturalNumber;
            break;
        case 'blind':
            pendingSettings.enableBlind = defaultSettings.enableBlind;
            pendingSettings.enableMegamori = defaultSettings.enableMegamori; // Also reset Megamori
            break;
    }
    updatePopupUIFromSettings(pendingSettings);
}

function handleResetAllSettings() {
    updatePopupUIFromSettings(defaultSettings);
}

function saveSettingsAndReset() {
    if (pendingSettings.enableTimeBomb && !pendingSettings.enableBlind) {
        handleTimeInputChange(); // Ensure time inputs are parsed if TimeBomb is active
    }
    // Apply settings from pendingSettings to active settings
    enableBlind = pendingSettings.enableBlind;
    enableMegamori = pendingSettings.enableMegamori; // Apply Megamori

    if (enableBlind) {
        // Blind Mode Specific Settings
        numMines = Math.floor(Math.random() * (BLIND_MINE_MAX - BLIND_MINE_MIN + 1)) + BLIND_MINE_MIN;
        enableNoFlags = false;
        enableTimeBomb = false;
        gameOverOnTimeOnly = false;
        enableNumbers = true;
        enableHide = true;
        hideRateMax = BLIND_HIDE_RATE;
        enableDirectional = true;
        enableOddEven = true;
        enableAreaValue = true;
        enableNaturalNumber = true;
        // Megamori setting is already applied above
    } else {
        // Normal Mode Settings
        numMines = pendingSettings.numMines;
        enableNoFlags = pendingSettings.enableNoFlags;
        enableTimeBomb = pendingSettings.enableTimeBomb;
        timeLimitRandom = pendingSettings.timeLimitRandom;
        timeLimitMinMs = pendingSettings.timeLimitMinMs;
        timeLimitMaxMs = pendingSettings.timeLimitMaxMs;
        timeLimitFixedMs = pendingSettings.timeLimitFixedMs;
        gameOverOnTimeOnly = pendingSettings.gameOverOnTimeOnly;
        enableNumbers = pendingSettings.enableNumbers;
        enableHide = pendingSettings.enableHide;
        hideRateMax = pendingSettings.hideRateMax;
        enableDirectional = pendingSettings.enableDirectional;
        enableOddEven = pendingSettings.enableOddEven;
        enableAreaValue = pendingSettings.enableAreaValue;
        enableNaturalNumber = pendingSettings.enableNaturalNumber;
        enableMegamori = false; // Megamori only makes sense with Blind mode
    }

    // Validate mine count
    const maxMines = gridSize * gridSize;
    if (numMines > maxMines) numMines = maxMines;
    if (numMines < 0) numMines = 0;

    updateNoFlagsUI(); // Update UI based on final flag setting
    resetGame();
    closePopup();
}

function handlePcOperationModeChange(event) {
    pcOperationMode = event.target.value;
    document.body.dataset.pcOpMode = pcOperationMode;
    updateModeButtonsVisibility();
    switchMode('dig');
}


function switchMode(newMode) {
    if ((enableNoFlags && newMode === 'flag') || newMode === currentInteractionMode) {
        return;
    }
    currentInteractionMode = newMode;
    if (digModeButton) digModeButton.classList.toggle('active', newMode === 'dig');
    if (flagModeButton) flagModeButton.classList.toggle('active', newMode === 'flag');
}


function updateActiveRulesDisplay() {
    let rulesHtml = '';
    if (enableBlind) {
        if (isTenkomoriActive || enableMegamori) { // Check if Tenkomori/Megamori is active
            rulesHtml += `<div class="rule-display-tenkomori">Megamix</div>`; // Display Megamix
        } else if (activeBlindRule) {
            // Display "Blind Mode: [Rule ID]" e.g., "Blind Mode: ghost"
            rulesHtml += `<div class="rule-display-blind">Blind Mode: ${activeBlindRule.id}</div>`;
        } else {
            rulesHtml += `<div class="rule-display-blind">Blind Mode Active!</div>`; // Fallback
        }
        // No separate Megamori indicator needed here
    } else {
        // Non-blind rule display (uses English names)
        if (enableNoFlags) { rulesHtml += `<div class="rule-display-noFlags">No Flags</div>`; }
        if (enableTimeBomb) {
            const timeDesc = timeLimitMilliseconds > 0 ? formatMsToDisplayTime(timeLimitMilliseconds, true) : 'Setting...';
            rulesHtml += `<div class="rule-display-timeBomb">Time Bomb (${timeDesc})</div>`;
            if (gameOverOnTimeOnly) { rulesHtml += `<div class="rule-display-gameOverOnTimeOnly">Game Over on Time Only</div>`; }
        }
        if (!enableNumbers) { rulesHtml += `<div class="rule-display-noNumbers">No Numbers</div>`; }
        if (enableHide) { rulesHtml += `<div class="rule-display-hide">Concealment Sq. (${Math.round(hideRateMax*100)}% Max)</div>`; }
        if (enableDirectional) { rulesHtml += `<div class="rule-display-directional">Directional Squares</div>`; }
        if (enableOddEven) { rulesHtml += `<div class="rule-display-oddEven">OddEven Squares</div>`; }
        if (enableAreaValue) { rulesHtml += `<div class="rule-display-areaValue">Range Value Squares</div>`; }
        if (enableNaturalNumber) { rulesHtml += `<div class="rule-display-naturalNumber">Natural Number Squares</div>`; }
        if (!rulesHtml) { rulesHtml = '<div class="rule-display-standard">Standard Rules</div>'; }
    }
    if (activeRulesDisplay) activeRulesDisplay.innerHTML = rulesHtml;
}

function updateBlindRuleDisplay() {
    if (blindRuleDisplay) blindRuleDisplay.classList.remove('tenkomori');
    if (enableBlind && activeBlindRule) {
        let description = activeBlindRule.description;
        let title = activeBlindRule.title;

        if (isTenkomoriActive) {
            title = "てんこ盛り！";
            // Updated description for Tenkomori to include Anomaly target JP name
            let anomalyDesc = "";
            if(anomalyTargetType) {
                const targetNameJP = specialSquareNamesJP[anomalyTargetType] || anomalyTargetType;
                anomalyDesc = ` (異常発生: ${targetNameJP})`; // Use JP name here
            }
            description = `全てのブラインドが適用される！<br>${anomalyDesc}`;

            if (blindRuleDisplay) blindRuleDisplay.classList.add('tenkomori');
        } else if (isRuleActive('anomaly') && anomalyTargetType) {
            const targetNameJP = specialSquareNamesJP[anomalyTargetType] || anomalyTargetType;
            description = `${targetNameJP}の最大生成率が${Math.round(currentAnomalyRate * 100)}%になる`;
        }
        if (blindRuleDisplay) {
            blindRuleDisplay.innerHTML = `<strong>Blind: ${title}</strong><span>${description}</span>`;
            blindRuleDisplay.classList.add('visible');
            blindRuleDisplay.style.borderColor = isTenkomoriActive ? 'var(--rule-tenkomori-color)' : activeBlindRule.borderColor || 'var(--blind-rule-border)';
            const bgColorMix = isTenkomoriActive ? 'var(--rule-tenkomori-color)' : activeBlindRule.bgColor || 'var(--blind-rule-bg)';
            blindRuleDisplay.style.backgroundColor = `color-mix(in srgb, var(--blind-rule-bg) 80%, ${bgColorMix} 20%)`;
            const strongEl = blindRuleDisplay.querySelector('strong');
            if (strongEl) {
                strongEl.style.color = isTenkomoriActive ? 'var(--rule-tenkomori-color)' : '';
            }
        }
    } else {
        if (blindRuleDisplay) {
            blindRuleDisplay.classList.remove('visible');
            blindRuleDisplay.innerHTML = '';
            blindRuleDisplay.style.borderColor = '';
            blindRuleDisplay.style.backgroundColor = '';
            const strongEl = blindRuleDisplay.querySelector('strong');
            if (strongEl) strongEl.style.color = '';
        }
    }
}

function updateNoFlagsUI() {
    const flagsAllowed = !enableNoFlags;
    body.setAttribute('data-flags-enabled', String(flagsAllowed));
    if (flagModeButton) flagModeButton.disabled = !flagsAllowed;
    if (!flagsAllowed && currentInteractionMode === 'flag') {
        switchMode('dig');
    }
    updateModeButtonsVisibility();
}

// --- Game Logic Functions ---

function resetGame() {
    gameOver = true;
    firstClickDone = false;
    clearInterval(timerInterval);
    timerInterval = null;
    clearInterval(basketballTimerInterval);
    basketballTimerInterval = null;
    // Clear all active Ghost timers
    Object.values(activeGhostTimers).forEach(clearTimeout);
    activeGhostTimers = {};

    elapsedMilliseconds = 0;
    remainingMilliseconds = 0;
    timeLimitMilliseconds = 0;
    basketballRemainingMs = BASKETBALL_INTERVAL_MS;
    startTime = 0;
    basketballStartTime = 0;
    gameStarted = false;
    revealedNonMineCount = 0;
    clickedMineCount = 0;
    penaltyOffsetMs = 0;
    minesLeft = numMines; // Use current numMines value
    switchMode('dig');
    activeBlindRule = null;
    isTenkomoriActive = false;
    anomalyTargetType = null;
    currentAnomalyRate = 0;
    body.classList.remove('game-over', 'low-time', 'timer-intro-active', 'game-clear');
    timerContainer.classList.remove('blinking-black', 'blinking-red', 'blinking-basketball', 'hide-during-intro');
    timerStartDisplay.classList.remove('visible', 'move-to-corner');
    timerStartDisplay.style.animation = 'none';
    debugButtonsContainer.classList.remove('visible');
    
    updateBlindRuleDisplay();
    updateTimerDisplay();
    updateActiveRulesDisplay();
    updateNoFlagsUI();
    updateMinesLeftDisplay(); // Show initial mine count
    setTimeout(createBoard, 50);
}

function createBoard() {
    board = [];
    gameOver = false;
    firstClickDone = false;
    revealedNonMineCount = 0;
    clickedMineCount = 0;
    penaltyOffsetMs = 0;
    boardElement.innerHTML = '';
    activeBlindRule = null;
    isTenkomoriActive = false;
    anomalyTargetType = null;
    currentAnomalyRate = 0;
    minesLeft = numMines;
    // Clear ghost timers from previous game state if any lingered
    Object.values(activeGhostTimers).forEach(clearTimeout);
    activeGhostTimers = {};

    if (enableBlind) {
        if (enableMegamori) { // Check Megamori first
            activeBlindRule = blindRules.find(r => r.id === 'tenkomori');
            isTenkomoriActive = true;
            anomalyTargetType = specialSquareTypes[Math.floor(Math.random() * specialSquareTypes.length)];
            currentAnomalyRate = Math.random() * (0.75 - 0.50) + 0.50;
            console.log(`Megamori Active! Forced Tenkomori. Anomaly Target: ${anomalyTargetType}, Rate: ${currentAnomalyRate}`);
        } else {
            // Normal Blind rule selection
            const rand = Math.random();
            if (rand < TENKOMORI_CHANCE) {
                activeBlindRule = blindRules.find(r => r.id === 'tenkomori');
                isTenkomoriActive = true;
                anomalyTargetType = specialSquareTypes[Math.floor(Math.random() * specialSquareTypes.length)];
                currentAnomalyRate = Math.random() * (0.75 - 0.50) + 0.50;
                console.log(`Tenkomori Active (Random)! Anomaly Target: ${anomalyTargetType}, Rate: ${currentAnomalyRate}`);
            } else {
                const availableRules = blindRules.filter(r => r.id !== 'tenkomori');
                activeBlindRule = availableRules[Math.floor(Math.random() * availableRules.length)];
                isTenkomoriActive = false;
                if (isRuleActive('anomaly')) {
                    anomalyTargetType = specialSquareTypes[Math.floor(Math.random() * specialSquareTypes.length)];
                    currentAnomalyRate = Math.random() * (0.75 - 0.50) + 0.50;
                    console.log(`Anomaly Target: ${anomalyTargetType}, Rate: ${currentAnomalyRate}`);
                }
            }
        }
        minesLeft = numMines;
        currentMaxHideRate = BLIND_HIDE_RATE;
        currentMaxDirectionalRate = BLIND_DIRECTIONAL_RATE;
        currentMaxOddEvenRate = BLIND_ODDEVEN_RATE;
        currentMaxAreaValueRate = BLIND_AREAVALUE_RATE;
        currentMaxNaturalNumberRate = BLIND_NATURALNUMBER_RATE;
    } else {
        isTenkomoriActive = false;
        activeBlindRule = null;
        currentMaxHideRate = hideRateMax;
        currentMaxOddEvenRate = 0.10;
        currentMaxAreaValueRate = 0.03;
        currentMaxDirectionalRate = 0.05;
        currentMaxNaturalNumberRate = 0.05;
        if (enableTimeBomb) {
            timeLimitMilliseconds = timeLimitRandom ? Math.floor(Math.random() * (Math.max(0, timeLimitMaxMs) - Math.max(0, timeLimitMinMs) + 1)) + Math.max(0, timeLimitMinMs) : Math.max(1000, timeLimitFixedMs);
            remainingMilliseconds = timeLimitMilliseconds;
        } else {
            timeLimitMilliseconds = 0;
            elapsedMilliseconds = 0;
        }
        updateTimerDisplay();
    }
    updateBlindRuleDisplay();

    for (let i = 0;
        i < gridSize; i++) {
        board[i] = [];

        for (let j = 0; j < gridSize; j++) {
            // Add new properties for rules
            board[i][j] = {
                isMine: false,
                isRevealed: false,
                isFlagged: false,
                adjacentMines: 0,        // Final count displayed (potentially modified)
                originalAdjacentMines: 0,// Count from all 8 neighbors (unmodified)
                adjacentSafe: 0,         // Safe count from all 8 neighbors
                adjacentMines4Dir: 0,    // Count for Myopia (4 directions)
                adjacentSafe4Dir: 0,     // Safe count for Myopia (4 directions)
                isHide: false,
                isOddEven: false,
                isAreaValue: false,
                isDirectional: false,
                isNaturalNumber: false,
                isBlackHole: false,      // Black Hole flag
                ghostTimerId: null,      // Ghost timer ID
                oddEvenValue: null,
                areaValue: null,
                direction: null,
                directionalCount: null,
                directionalSymbol: null,
                naturalNumberValue: null,
                isAdjusted: false,       // Flag for Error rule adjustment
                element: document.createElement('div')
            };
            
            const sq = board[i][j];
            const el = sq.element;
            el.classList.add('square', 'hidden');
            el.dataset.row = i;
            el.dataset.col = j;
            el.addEventListener('click', () => handleSquareInteraction(i, j));
            el.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (!isTouch && pcOperationMode === 'mouse' && !enableNoFlags && !gameOver) {
                    handleFlagAction(i, j);
                }
            });
            let pt;
            el.addEventListener('touchstart', (e) => {
                if (isTouch && !enableNoFlags && !gameOver) {
                    clearTimeout(pt);
                    pt = setTimeout(() => {
                        e.preventDefault();
                        handleFlagAction(i, j);
                        justFlagged = true;
                        setTimeout(() => {
                            justFlagged = false;
                        }, 50);
                    }, 500);
                }
            }, {
                passive: false
            });
            el.addEventListener('touchend', () => clearTimeout(pt));
            el.addEventListener('touchmove', () => clearTimeout(pt));
            boardElement.appendChild(el);
        }
    }
    updateMinesLeftDisplay();
    updateActiveRulesDisplay();
    updateNoFlagsUI();
    if (enableTimeBomb && !enableBlind && timeLimitMilliseconds > 0) {
        timerContainer.classList.add('hide-during-intro');
        setTimeout(startTimerAnimation, 100);
    } else {
        timerContainer.classList.remove('hide-during-intro');
    }
    detectTouch();
}

function startTimerAnimation() {
    /* ... (no changes) ... */
    if (!enableTimeBomb || enableBlind || timeLimitMilliseconds <= 0) {
        return;
    }
    const includeHours = timeLimitMilliseconds >= 3600000;
    timerStartDisplay.textContent = formatMsToDisplayTime(timeLimitMilliseconds, includeHours);
    timerStartDisplay.style.animation = 'start-blink 1s infinite';
    timerStartDisplay.classList.add('visible');
    body.classList.add('timer-intro-active');
    setTimeout(() => {
        if (body.classList.contains('timer-intro-active')) {
            timerStartDisplay.classList.add('move-to-corner');
        }
    }, 1200);
    setTimeout(() => {
        if (body.classList.contains('timer-intro-active')) {
            timerStartDisplay.classList.remove('visible', 'move-to-corner');
            timerStartDisplay.style.animation = 'none';
            timerContainer.classList.remove('hide-during-intro');
            body.classList.remove('timer-intro-active');
        }
    }, 1600);

}

function initializeBoardAfterFirstClick(firstClickRow, firstClickCol) {
    plantMines(firstClickRow, firstClickCol);
    // Plant Black Holes *after* mines, ensuring they are on safe squares
    plantBlackHoles(firstClickRow, firstClickCol);
    calculateAdjacentMines(); // Calculate counts *after* mines & BH are placed
    applySpecialSquares();
    updateMinesLeftDisplay();
    debugButtonsContainer.classList.add('visible');
}

function plantMines(avoidRow, avoidCol) {
    /* ... (No changes needed) ... */
    let minesPlanted = 0;
    const maxPossible = gridSize * gridSize;
    let currentNumMines = numMines; // Use the potentially modified numMines
    const forbidden = new Set();
    for (let x = -1;
        x <= 1; x++) {
        for (let y = -1;
            y <= 1; y++) {
            const nr = avoidRow + x;
            const nc = avoidCol + y;
            if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize) {
                forbidden.add(`${nr}-${nc}`);
            }
        }
    }
    const availableSquares = maxPossible - forbidden.size;
    if (currentNumMines > availableSquares) {
        console.warn(`Mine count reduced from ${currentNumMines} to ${availableSquares} due to safe start area.`);
        currentNumMines = availableSquares;
        numMines = currentNumMines; // Update the global numMines
        minesLeft = currentNumMines; // Update minesLeft immediately
        // Update UI if popup is open and not in blind mode
        if (rulesPopup.classList.contains('visible') && !enableBlind && mineSlider) {
            mineSlider.value = numMines;
            if (mineCountDisplay) mineCountDisplay.textContent = numMines;
            pendingSettings.numMines = numMines; // Also update pending setting
        }
    } else {
        minesLeft = currentNumMines; // Set minesLeft based on final mine count
    }
    if (currentNumMines < 0) currentNumMines = 0;
    // Allow placing mine on every square except the first clicked 9
    if (currentNumMines > availableSquares) currentNumMines = availableSquares;
    while (minesPlanted < currentNumMines) {
        const r = Math.floor(Math.random() * gridSize);
        const c = Math.floor(Math.random() * gridSize);
        const posKey = `${r}-${c}`;

        if (board[r]?.[c] && !board[r][c].isMine && !forbidden.has(posKey)) {
            board[r][c].isMine = true;
            minesPlanted++;
        }
    }
    updateMinesLeftDisplay(); // Update display after planting
}

function plantBlackHoles(avoidRow, avoidCol) {
    if (!isRuleActive('blackHole')) return;

    const safeSquares = [];
    const forbidden = new Set();
    for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
            const nr = avoidRow + x;
            const nc = avoidCol + y;
            if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize) {
                forbidden.add(`${nr}-${nc}`);
            }
        }
    }
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
             const posKey = `${r}-${c}`;
            if (board[r]?.[c] && !board[r][c].isMine && !forbidden.has(posKey)) {
                safeSquares.push({ r, c });
            }
        }
    }
    safeSquares.sort(() => Math.random() - 0.5); // Shuffle
    let plantedCount = 0;
    for (let i = 0; i < safeSquares.length && plantedCount < BLACK_HOLE_COUNT; i++) {
        const { r, c } = safeSquares[i];
        if (board[r]?.[c] && !board[r][c].isBlackHole) { // Double check just in case
             board[r][c].isBlackHole = true;
             plantedCount++;
             console.log(`Black hole planted at ${r}, ${c}`);
        }
    }
    if (plantedCount < BLACK_HOLE_COUNT) {
         console.warn(`Could only plant ${plantedCount} black holes.`);
    }
}

function calculateAdjacentMines() {
    const checkTorus = isRuleActive('torus');
    const checkMyopia = isRuleActive('myopia');

    for (let i = 0;
        i < gridSize; i++) {
        for (let j = 0;
            j < gridSize; j++) {
            const currentSquare = board[i]?.[j];
            if (!currentSquare || currentSquare.isMine) continue;
            let mineCount8 = 0;
            let safeCount8 = 0;
            let mineCount4 = 0;
            let safeCount4 = 0;

            for (let x = -1; x <= 1; x++) {
                for (let y = -1; y <= 1; y++) {
                    if (x === 0 && y === 0) continue;
                    let ni = i + x;
                    let nj = j + y;
                    let isValidNeighbor = false;
                    let neighborSquare = null;

                    if (checkTorus) {
                        ni = (ni + gridSize) % gridSize;
                        nj = (nj + gridSize) % gridSize;
                        isValidNeighbor = true;
                        neighborSquare = board[ni]?.[nj];
                    } else {
                        isValidNeighbor = ni >= 0 && ni < gridSize && nj >= 0 && nj < gridSize;
                        if (isValidNeighbor) {
                            neighborSquare = board[ni]?.[nj];
                        }
                    }

                    if (isValidNeighbor && neighborSquare) {
                        const isMineNeighbor = neighborSquare.isMine;
                        // Count for 8 directions
                        if (isMineNeighbor) {
                            mineCount8++;
                        } else {
                            safeCount8++;
                        }

                        // Count for 4 directions (Myopia)
                        if (Math.abs(x) + Math.abs(y) === 1) {
                            if (isMineNeighbor) {
                                mineCount4++;
                            } else {
                                safeCount4++;
                            }
                        }
                    }
                }
            }
            currentSquare.originalAdjacentMines = mineCount8;
            currentSquare.adjacentSafe = safeCount8;
            currentSquare.adjacentMines4Dir = mineCount4;
            currentSquare.adjacentSafe4Dir = safeCount4;

            // Set initial adjacentMines based on Myopia (Abekobe handled later in applySpecialSquares)
            currentSquare.adjacentMines = checkMyopia ? mineCount4 : mineCount8;
            currentSquare.isAdjusted = false;
        }
    }
}


function countSafeInDirection(r, c, dx, dy) {
    const checkTorus = isRuleActive('torus');
    let count = 0;
    let cr = r + dx;
    let cc = c + dy;
    let steps = 0;
    const maxSteps = gridSize * 2;

    while (steps < maxSteps) {
        let checkR = cr;
        let checkC = cc;
        let inBounds = false;
        if (checkTorus) {
            checkR = (cr + gridSize) % gridSize;
            checkC = (cc + gridSize) % gridSize;
            if (steps > 0 && checkR === r && checkC === c) break;
            inBounds = true;
        } else {
            inBounds = checkR >= 0 && checkR < gridSize && checkC >= 0 && checkC < gridSize;
        }
        if (!inBounds) break;
        // Exclude black holes from safe count for directional squares
        if (board[checkR]?.[checkC] && !board[checkR][checkC].isMine && !board[checkR][checkC].isBlackHole) {
             count++;
        }
        cr += dx;
        cc += dy;
        steps++;
    }
    return count;
}


function countMinesInDirection(r, c, dx, dy) {
    const checkTorus = isRuleActive('torus');
    let count = 0;
    let cr = r + dx;
    let cc = c + dy;
    let steps = 0;
    const maxSteps = gridSize * 2;
    while (steps < maxSteps) {
        let checkR = cr;
        let checkC = cc;
        let inBounds = false;
        if (checkTorus) {
            checkR = (cr + gridSize) % gridSize;
            checkC = (cc + gridSize) % gridSize;
            if (steps > 0 && checkR === r && checkC === c) break;
            inBounds = true;
        } else {
            inBounds = checkR >= 0 && checkR < gridSize && checkC >= 0 && checkC < gridSize;
        }
        if (!inBounds) break;
        if (board[checkR]?.[checkC] && board[checkR][checkC].isMine) count++;
        cr += dx;
        cc += dy;
        steps++;
    }
    return count;
}

function calculateNaturalNumberValue(n) {
    /* ... (no changes) ... */
    const p = [2, 3, 5, 7];
    if (typeof n !== 'number' || n < 0 || n > 8) {
        console.warn(`Unexpected value passed to calculateNaturalNumberValue: ${n}`);
        return '・';
    }
    if (p.includes(n)) return String(n);
    switch (n) {
        case 0:
            return '・';
        case 1:
            return "-1";
        case 4:
            return "±1";
        case 6:
            return "±1";
        case 8:
            return "+1";
        default:
            return '・';
    }
}


function applySpecialSquares() {
    const potentialSquares = [];
    const errorTargetSquares = [];
    const checkAbekobe = isRuleActive('abekobe');
    const checkMyopia = isRuleActive('myopia');

    for (let i = 0;
        i < gridSize; i++) {
        for (let j = 0;
            j < gridSize; j++) {
            const square = board[i]?.[j];
            if (!square || square.isMine || square.isBlackHole) continue; // Exclude mines and BH

            // Reset flags
            square.isHide = square.isOddEven = square.isAreaValue = square.isDirectional = square.isNaturalNumber = false;
            square.oddEvenValue = square.areaValue = square.direction = square.directionalCount = square.directionalSymbol = square.naturalNumberValue = null;
            square.isAdjusted = false;


            // Determine the relevant count based on Abekobe and Myopia FIRST
            const baseMineCount = checkMyopia ? square.adjacentMines4Dir : square.originalAdjacentMines;
            const baseSafeCount = checkMyopia ? square.adjacentSafe4Dir : square.adjacentSafe;
            square.adjacentMines = checkAbekobe ? baseSafeCount : baseMineCount;
            const relevantCount = square.adjacentMines;

            // Determine if the square is a potential candidate for special types
            if (relevantCount >= 0) {
                if (relevantCount > 0 || checkAbekobe || enableHide || enableOddEven || enableNaturalNumber) {
                     // Check if it has neighbors (relevant for some types like directional)
                     let hasNeighbors = false;
                     for (let x = -1; x <= 1; x++) {
                         for (let y = -1; y <= 1; y++) {
                             if (x === 0 && y === 0) continue;
                              let ni = i + x;
                              let nj = j + y;
                              const checkTorus = isRuleActive('torus'); // Check torus here
                              if (checkTorus) {
                                    ni = (ni + gridSize) % gridSize;
                                    nj = (nj + gridSize) % gridSize;
                                    hasNeighbors = true; break; // Torus implies neighbors
                              } else {
                                   if (ni >= 0 && ni < gridSize && nj >= 0 && nj < gridSize) {
                                        hasNeighbors = true; break;
                                   }
                              }
                         }
                        if (hasNeighbors) break;
                     }
                     if(hasNeighbors) { // Only add if it has neighbors
                          potentialSquares.push({ r: i, c: j });
                     }
                }
            }

            // Error target squares are based on original 8-dir mine count, unaffected by Abekobe/Myopia
            if (square.originalAdjacentMines > 0) {
                errorTargetSquares.push({ r: i, c: j });
            }
        }
    }

    potentialSquares.sort(() => Math.random() - 0.5);
    errorTargetSquares.sort(() => Math.random() - 0.5);

    const assignedCoordinates = new Set();
    const numPotential = potentialSquares.length;
    const checkAnomaly = isRuleActive('anomaly');


    let rateHide = currentMaxHideRate,
        rateDirectional = currentMaxDirectionalRate,
        rateOddEven = currentMaxOddEvenRate,
        rateAreaValue = currentMaxAreaValueRate,
        rateNaturalNumber = currentMaxNaturalNumberRate;


    // Apply anomaly rate increase
    if (checkAnomaly && anomalyTargetType) {
        switch (anomalyTargetType) {
            case 'hide': rateHide = currentAnomalyRate; break;
            case 'directional': rateDirectional = currentAnomalyRate; break;
            case 'oddEven': rateOddEven = currentAnomalyRate; break;
            case 'areaValue': rateAreaValue = currentAnomalyRate; break;
            case 'naturalNumber': rateNaturalNumber = currentAnomalyRate; break;
        }
    }
    const baseDirections = [{ dx: -1, dy: 0, s: 'T', n: 'up' }, { dx: 1, dy: 0, s: 'B', n: 'down' }, { dx: 0, dy: -1, s: 'L', n: 'left' }, { dx: 0, dy: 1, s: 'R', n: 'right' }];


    function hasDirChain(r, c, dx, dy) { /* ... (no changes) ... */
        const checkTorus = isRuleActive('torus');
        let nr = r + dx;
        let nc = c + dy;

        if (checkTorus) {
            nr = (nr + gridSize) % gridSize;
            nc = (nc + gridSize) % gridSize;
        }
        if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize) {
            const nextSquare = board[nr]?.[nc];
            return nextSquare?.isDirectional && nextSquare.direction?.dx === dx && nextSquare.direction?.dy === dy;
        }
        return false;
     }

    function getValidDirs(r, c) { /* ... (no changes) ... */
        const checkTorus = isRuleActive('torus');

        return baseDirections.filter(dir => {
            const nr = r + dir.dx;
            const nc = c + dir.dy;

            if (checkTorus) return true;
            return nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize;
        });
     }

    const ruleOrder = [ /* ... (no changes) ... */
        { t: 'areaValue', e: enableAreaValue, r: rateAreaValue, c: (s, r, c) => !hasNeighborOfType(r, c, 'isAreaValue') },
        { t: 'naturalNumber', e: enableNaturalNumber, r: rateNaturalNumber, c: (s, r, c) => !hasNeighborOfType(r, c, 'isNaturalNumber') },
        { t: 'directional', e: enableDirectional, r: rateDirectional, c: (s, r, c) => !hasNeighborOfType(r, c, 'isDirectional') },
        { t: 'oddEven', e: enableOddEven, r: rateOddEven, c: (s, r, c) => !hasNeighborOfType(r, c, 'isOddEven') },
        { t: 'hide', e: enableHide, r: rateHide, c: () => true }
    ];


    for (const rule of ruleOrder) {
        const ruleEnabled = enableBlind || rule.e;
        const isActiveSetting = (rule.t === 'hide' && enableHide) || (rule.t === 'directional' && enableDirectional) || (rule.t === 'oddEven' && enableOddEven) || (rule.t === 'areaValue' && enableAreaValue) || (rule.t === 'naturalNumber' && enableNaturalNumber);

        if (ruleEnabled && isActiveSetting && numPotential > 0) {
            const currentRate = rule.r;
            const maxCount = Math.floor(numPotential * currentRate);
            let currentCount = 0;
            for (const {
                    r,
                    c
                } of potentialSquares) {
                if (currentCount >= maxCount) break;
                const coordKey = `${r}-${c}`;
                const square = board[r]?.[c];
                if (!square || assignedCoordinates.has(coordKey)) continue;
                const neighborCheckPassed = (enableBlind && !isTenkomoriActive) || rule.c(square, r, c);
                if (neighborCheckPassed) {
                    // Use the already calculated adjacentMines (respects Abekobe/Myopia)
                    const countForCalc = square.adjacentMines;
                    let applied = false;
                    if (rule.t === 'directional') {
                        const validDirs = getValidDirs(r, c);
                        if (validDirs.length > 0) {
                            const shuffledDirs = [...validDirs].sort(() => Math.random() - 0.5);
                            for (const dir of shuffledDirs) {
                                if (!hasDirChain(r, c, dir.dx, dir.dy)) {
                                     // Directional count always uses 8 neighbors, respecting Abekobe if active
                                    const dirCount = checkAbekobe ? countSafeInDirection(r, c, dir.dx, dir.dy) : countMinesInDirection(r, c, dir.dx, dir.dy);
                                    if (dirCount > 0) {
                                        square.isDirectional = true;
                                        square.isHide = true; // Directional hides the number
                                        square.direction = { dx: dir.dx, dy: dir.dy, name: dir.n };
                                        square.directionalCount = dirCount;
                                        square.directionalSymbol = dir.s;
                                        applied = true;
                                        break;
                                    }
                                }
                            }
                        }
                    } else if (rule.t === 'areaValue' && countForCalc > 0) {
                        square.isAreaValue = true;
                        square.isHide = true;
                        if (countForCalc <= 3) square.areaValue = '~3';
                        else if (countForCalc <= 6) square.areaValue = '4~6';
                        else square.areaValue = '7~';
                        applied = true;
                    } else if (rule.t === 'oddEven') {
                        square.isOddEven = true;
                        square.isHide = true;
                        square.oddEvenValue = countForCalc % 2 === 0 ? 'Ev' : 'Od';
                        applied = true;
                    } else if (rule.t === 'naturalNumber' && countForCalc >= 0) {
                        const nnValue = calculateNaturalNumberValue(countForCalc);
                        if (nnValue !== '・') {
                            square.isNaturalNumber = true;
                            square.isHide = true;
                            square.naturalNumberValue = nnValue;
                            applied = true;
                        } else if (enableHide) {
                            square.isHide = true;
                            square.isNaturalNumber = false;
                            applied = true;
                        }
                    } else if (rule.t === 'hide') {
                        square.isHide = true;
                        applied = true;
                    }
                    if (applied) {
                        assignedCoordinates.add(coordKey);
                        currentCount++;
                    }
                }
            }
        }
    }

    // Apply Error rule
    const checkError = isRuleActive('error');
    if (checkError) {
        const numErrorTargets = errorTargetSquares.length;
        const minAffectedCount = Math.ceil(numErrorTargets * MIN_ERROR_RATE);
        let affectedCount = 0;

        // First pass: guarantee minimum
        for (let i = 0; i < numErrorTargets && affectedCount < minAffectedCount; i++) {
            const { r, c } = errorTargetSquares[i];
            const square = board[r]?.[c];
            // Apply error only if it's a standard number square (not special)
            // AND Abekobe is NOT active (Error doesn't affect safe count)
            if (square && !square.isHide && !square.isDirectional && !square.isAreaValue && !square.isOddEven && !square.isNaturalNumber && !square.isAdjusted && !checkAbekobe) {
                const adjustUp = Math.random() < 0.5;
                // Error is based on the original 8-dir mine count
                const originalMineCount = square.originalAdjacentMines;
                if (adjustUp && originalMineCount < 8) {
                    square.adjacentMines++; // Adjust the current count (which might be 4-dir or 8-dir)
                    square.isAdjusted = true;
                    affectedCount++;
                } else if (!adjustUp && originalMineCount > 0) {
                    square.adjacentMines--;
                    square.isAdjusted = true;
                    affectedCount++;
                }
            }
        }
        // Second pass: random adjustments
        for (let i = 0; i < numErrorTargets; i++) {
             const { r, c } = errorTargetSquares[i];
             const square = board[r]?.[c];
             if (square && !square.isHide && !square.isDirectional && !square.isAreaValue && !square.isOddEven && !square.isNaturalNumber && !square.isAdjusted && !checkAbekobe) {
                 const rand = Math.random();
                 const originalMineCount = square.originalAdjacentMines;
                 if (rand < 0.25 && originalMineCount < 8) {
                     square.adjacentMines++;
                     square.isAdjusted = true;
                 } else if (rand < 0.50 && originalMineCount > 0) {
                     square.adjacentMines--;
                     square.isAdjusted = true;
                 }
             }
        }
    }
}



function handleSquareInteraction(r, c) {
    const targetSquare = board[r]?.[c];

    if (gameOver || !targetSquare || targetSquare.isRevealed || justFlagged) {
        return;
    }
    if (!firstClickDone) {
        firstClickDone = true;
        initializeBoardAfterFirstClick(r, c);
        startGameTimer();
        messageBox.textContent = `Mines: ${minesLeft}`; // Update message box after init

        // First click reveals normally, no black hole check needed here
        revealSquare(r, c);
        checkWinCondition();
        return;
    }
    const square = targetSquare;


    if (currentInteractionMode === 'flag') {
        if (!enableNoFlags) {
            handleFlagAction(r, c);
        }
    } else { // Dig mode
        if (square.isFlagged && !enableNoFlags) {
            return; // Cannot dig flagged squares unless No Flags mode
        }

        // Handle Black Hole first
        if (square.isBlackHole && isRuleActive('blackHole')) {
             console.log(`Black Hole activated at ${r}, ${c}`);
             // Reveal the black hole square itself (as a 0)
              // Clear ghost timer *before* revealing
              clearGhostTimer(r, c);
             square.isRevealed = true;
             revealedNonMineCount++;
             renderSquareContent(square); // Render it (will show as 0 or blank)

             resetBasketballTimer(); // Count as an action

             // Reveal surrounding squares
             const checkTorus = isRuleActive('torus');
             let hitMine = false; // Flag to stop if a mine is hit

             for (let x = -1; x <= 1; x++) {
                 for (let y = -1; y <= 1; y++) {
                     if (x === 0 && y === 0) continue;

                     let nr = r + x;
                     let nc = c + y;

                    if (checkTorus) {
                         nr = (nr + gridSize) % gridSize;
                         nc = (nc + gridSize) % gridSize;
                         if(nr < 0) nr += gridSize; // Ensure positive index
                         if(nc < 0) nc += gridSize; // Ensure positive index
                    }

                    const neighbor = board[nr]?.[nc];
                    // Reveal if neighbor exists, is not revealed, and not flagged
                     if (neighbor && !neighbor.isRevealed && !neighbor.isFlagged) {
                         // Directly reveal mine for immediate game over, otherwise use revealSquare
                         if (neighbor.isMine) {
                              revealMine(nr, nc); // Show the clicked mine
                              hitMine = true; // Set flag
                              break; // Stop revealing neighbors
                         } else {
                             // Use revealSquare for safe neighbors (handles Ghost, chaining etc.)
                              revealSquare(nr, nc);
                         }

                         // Check if revealSquare itself caused game over (e.g., Ghost closing last square)
                          if (gameOver) { hitMine = true; break; } // Treat as hitting a mine conceptually
                     }
                 }
                 if (hitMine || gameOver) break; // Stop outer loop too
             }

             if (hitMine) {
                  if (!gameOver) endGame(false); // Ensure game ends if mine was hit
             } else {
                 checkWinCondition(); // Check win only if no mine was hit
             }
             return; // Black hole action is complete
        }


        // Normal dig action
        if (square.isMine) {
            if (!square.isRevealed) {
                revealMine(r, c); // Also clears ghost timer
                clickedMineCount++;
                if (enableTimeBomb && !enableBlind && gameOverOnTimeOnly) {
                    penaltyOffsetMs += MINE_PENALTY_MS;
                    body.style.transition = 'background-color 0.1s ease-out';
                    body.style.backgroundColor = '#ffdddd';
                    setTimeout(() => {
                        body.style.transition = 'background-color 0.3s ease';
                        body.style.backgroundColor = '';
                        const currentRemainingAfterPenalty = timeLimitMilliseconds - (Date.now() - startTime) - penaltyOffsetMs;
                        const isStillLowTime = currentRemainingAfterPenalty < 60000 && currentRemainingAfterPenalty > 0;
                        body.classList.toggle('low-time', isStillLowTime);
                        updateTimerDisplay();
                    }, 150);
                    setTimeout(() => {
                        const currentRemaining = timeLimitMilliseconds - (Date.now() - startTime) - penaltyOffsetMs;
                        if ((clickedMineCount >= numMines || currentRemaining <= 0) && !gameOver) {
                            endGame(false);
                        }
                    }, timerUpdateInterval + 10);
                } else {
                    endGame(false);
                }
            }
        } else { // Safe square (and not black hole)
            revealSquare(r, c);
            checkWinCondition();
        }
    }
}


function startGameTimer() {
    if (gameStarted) {
        return;
    }
    gameStarted = true;
    startTime = Date.now();
    penaltyOffsetMs = 0;

    if (enableTimeBomb && !enableBlind) {
        if (timeLimitMilliseconds <= 0) {
            console.warn("Time Bomb enabled but time limit is zero.");
        }
    } else {
        elapsedMilliseconds = 0;
    }
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    if (basketballTimerInterval) {
        clearInterval(basketballTimerInterval);
    }
    timerInterval = setInterval(updateTimer, timerUpdateInterval);
    if (isRuleActive('basketball')) { // Use isRuleActive
        basketballStartTime = Date.now();
        basketballRemainingMs = BASKETBALL_INTERVAL_MS;
        basketballTimerInterval = setInterval(updateBasketballTimer, timerUpdateInterval);
        timerContainer.classList.add('blinking-basketball');
    }
    updateTimerDisplay();
}


function resetBasketballTimer() {
    if (isRuleActive('basketball') && gameStarted && !gameOver) { // Use isRuleActive
        basketballStartTime = Date.now();
        basketballRemainingMs = BASKETBALL_INTERVAL_MS;
        timerContainer.classList.add('blinking-basketball');
        updateTimerDisplay();
    }
}

function handleFlagAction(r, c) {
    /* ... (no changes) ... */
    const sq = board[r]?.[c];

    if (enableNoFlags || gameOver || !firstClickDone || !sq || sq.isRevealed) {
        return;
    }
     // Prevent flagging squares that are about to close (Ghost)
    const key = `${r}-${c}`;
    if (activeGhostTimers[key]) return;
    sq.isFlagged = !sq.isFlagged;
    if (sq.isFlagged) {
        minesLeft--;
    } else {
        minesLeft++;
    }
    renderSquareContent(sq);
    updateMinesLeftDisplay();
}


function revealMine(r, c) {
     // Clear ghost timer if revealing a mine that was closing
    clearGhostTimer(r, c);
    const sq = board[r]?.[c];
    if (sq && !sq.isRevealed) {
        sq.isRevealed = true;
        sq.element.classList.add('mine-clicked');
        renderSquareContent(sq);
    }
}


// Helper function to clear a ghost timer
function clearGhostTimer(r, c) {
     const key = `${r}-${c}`;
     if (activeGhostTimers[key]) {
         clearTimeout(activeGhostTimers[key]);
         delete activeGhostTimers[key];
         // console.log(`Cleared ghost timer for ${r}, ${c}`);
     }
}

// Function to handle closing a square due to Ghost rule
function closeSquareGhost(r, c) {
    const key = `${r}-${c}`;

    if (gameOver || !board[r]?.[c] || !board[r][c].isRevealed) {
         // Game ended or square was already closed/modified, clean up timer reference
         if (activeGhostTimers[key]) delete activeGhostTimers[key];
         return;
    }
    const sq = board[r][c];
    // console.log(`Ghost closing square ${r}, ${c}`);
    sq.isRevealed = false;
    revealedNonMineCount--; // Decrement revealed count
    delete activeGhostTimers[key]; // Remove timer reference *before* rendering

    // Apply closing animation before rendering as hidden
     if (sq.element) {
         sq.element.classList.add('closing');
         // Render as hidden *after* animation (or short delay)
         setTimeout(() => {
            if(sq.element) sq.element.classList.remove('closing'); // Clean up animation class
            renderSquareContent(sq); // Now render as hidden
         }, 50); // Adjust delay slightly less than animation duration if needed
     } else {
          renderSquareContent(sq); // Render immediately if no element somehow
     }
     updateMinesLeftDisplay(); // Update mine count display as revealed count changed

}


function revealSquare(r, c) {
    const checkTorus = isRuleActive('torus');
    let checkR = r;
    let checkC = c;

    if (checkTorus) {
        checkR = (r + gridSize) % gridSize;
        checkC = (c + gridSize) % gridSize;
        if (checkR < 0) checkR += gridSize;
        if (checkC < 0) checkC += gridSize;

    }
    if (checkR < 0 || checkR >= gridSize || checkC < 0 || checkC >= gridSize || gameOver) {
        return;
    }

    const sq = board[checkR]?.[checkC];

    // Do not reveal if already revealed, is a mine, or is flagged (unless no flags mode)
     // Also, do not reveal black holes directly via chaining (they are handled by clicking them)
    if (!sq || sq.isRevealed || sq.isMine || (sq.isFlagged && !enableNoFlags) || sq.isBlackHole) {
        return;
    }

     // Clear any existing ghost timer for this square *before* revealing
     clearGhostTimer(checkR, checkC);

    sq.isRevealed = true;

    revealedNonMineCount++;

    resetBasketballTimer(); // Count as an action
    renderSquareContent(sq);


    // Check if Ghost rule applies to this square
     const isGhostActive = isRuleActive('ghost');
     const isNumberedNonSpecialSquare = sq.adjacentMines > 0 && !sq.isHide && !sq.isDirectional && !sq.isAreaValue && !sq.isOddEven && !sq.isNaturalNumber;


     if (isGhostActive && isNumberedNonSpecialSquare) {
         const key = `${checkR}-${checkC}`;

         // console.log(`Setting ghost timer for ${checkR}, ${checkC}`);
         activeGhostTimers[key] = setTimeout(() => {
             closeSquareGhost(checkR, checkC);
         }, GHOST_CLOSE_DELAY_MS);
     }

    // Chain reaction logic, considering NoChain (Hidden) rule
    const canChain = !isRuleActive('noChain');


     // Chain only if original 8-dir count is 0 (unaffected by myopia/abekobe/error)
     // AND chaining is allowed
     // AND it's not a special square type
     if (sq.originalAdjacentMines === 0 && canChain && !sq.isHide && !sq.isDirectional && !sq.isAreaValue && !sq.isOddEven && !sq.isNaturalNumber) {
        for (let x = -1;
            x <= 1; x++) {
            for (let y = -1;
                y <= 1; y++) {
                if (x !== 0 || y !== 0) {
                    // Pass the *potentially wrapped* coordinates for recursion
                    revealSquare(checkR + x, checkC + y);
                }
            }
        }
    }
}


function renderSquareContent(sq) {
    /* ... (no changes needed, black hole handled here) ... */
    const el = sq.element;

    if (!el) return;

    const keepClasses = ['mine-clicked', 'flag-wrong'].filter(cls => el.classList.contains(cls));

    el.className = 'square'; // Reset base classes

    keepClasses.forEach(cls => el.classList.add(cls));

    el.textContent = '';
    el.innerHTML = '';
    el.style.fontSize = '';
    el.style.lineHeight = '';
    el.classList.remove('number-adjusted', 'closing'); // Remove dynamic classes


    if (!sq.isRevealed) {
        el.classList.add('hidden');

        const flagsAllowed = !enableNoFlags;

        if (sq.isFlagged && flagsAllowed) {
            el.textContent = '🚩';
            el.classList.add('flagged');
        }
    } else {
        el.classList.add('revealed');
        if (sq.isMine) {
            el.classList.add('mine');
            el.textContent = el.classList.contains('mine-clicked') ? '💥' : '💣';
        } else if (sq.isBlackHole && isRuleActive('blackHole')) { // Render revealed Black Hole as blank
             el.textContent = '';
             // el.classList.add('black-hole-revealed'); // Optional styling
        } else {
            if (el.classList.contains('flag-wrong')) {
                el.textContent = '❌';
            } else if (sq.isDirectional) {
                el.classList.add('directional-square', 'special-square');
                el.textContent = sq.directionalSymbol + sq.directionalCount;
            } else if (sq.isAreaValue) {
                el.classList.add('area-value-square', 'special-square');
                if (sq.areaValue === '4~6') {
                    el.innerHTML = '4~<br>6';
                    el.style.lineHeight = '0.9';
                } else {
                    el.textContent = sq.areaValue;
                }
            } else if (sq.isOddEven) {
                el.classList.add('odd-even-square', 'special-square');
                el.textContent = sq.oddEvenValue;
            } else if (sq.isNaturalNumber) {
                el.classList.add('natural-number-square', 'special-square');
                el.textContent = sq.naturalNumberValue;
            } else if (sq.isHide) {
                el.classList.add('special-square');
                el.textContent = '・';
            } else if (sq.adjacentMines >= 0) {
                // Display the potentially adjusted adjacentMines value
                el.textContent = sq.adjacentMines > 0 ? sq.adjacentMines : '';
                if (sq.adjacentMines > 0) {
                    el.classList.add(`number-${sq.adjacentMines}`);
                }
                // Indicate if the number was adjusted by the Error rule
                if (sq.isAdjusted && isRuleActive('error')) {
                    el.classList.add('number-adjusted');
                    // el.style.outline = '1px dashed red'; // Example
                }
            } else {
                el.textContent = ''; // Should not happen for safe squares?
                el.classList.add('revealed');
            }
        }
    }
}


function updateMinesLeftDisplay() {
    if (messageBox) {
        messageBox.textContent = `Mines: ${minesLeft}`;
    }
}


function checkWinCondition() {
     // Check if game is already over or not started
    if (gameOver || !firstClickDone) {
        return;
    }

     // Check if all non-mine, non-blackhole squares are revealed
     let revealedCount = 0;
     let totalSafeSquares = 0;

    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            const sq = board[r]?.[c];
            if (sq && !sq.isMine && !sq.isBlackHole) { // Exclude mines AND black holes
                 totalSafeSquares++;
                 if (sq.isRevealed) {
                     revealedCount++;
                 }
            }
        }
    }


     // Win condition: all safe (non-mine, non-BH) squares are currently revealed
    if (revealedCount >= totalSafeSquares) {
        // Double-check time limits if game has started
        if (gameStarted) {
            if (enableTimeBomb && !enableBlind && remainingMilliseconds <= 0) {
                return; // Lost due to time
            }
            if (isRuleActive('basketball') && basketballRemainingMs <= 0) {
                return; // Lost due to basketball timer
            }
             // Check if any Ghost timers are still active (player hasn't won yet)
             if (isRuleActive('ghost') && Object.keys(activeGhostTimers).length > 0) {
                 return; // Not won yet, squares are still closing
             }
        }
        endGame(true);
    }
}


function endGame(isWin) {
    if (gameOver) {
        return;
    }
    gameOver = true;

    clearInterval(timerInterval);

    timerInterval = null;

    clearInterval(basketballTimerInterval);

    basketballTimerInterval = null;

    // Clear all Ghost timers on game end
     Object.values(activeGhostTimers).forEach(clearTimeout);

     activeGhostTimers = {};


    body.classList.remove('low-time', 'timer-intro-active');

    timerContainer.classList.remove('blinking-black', 'blinking-red', 'blinking-basketball');

    debugButtonsContainer.classList.remove('visible');

    let finalDisplayMillis = 0;

    if (gameStarted) {
        if (enableBlind || !enableTimeBomb) {
            elapsedMilliseconds = Date.now() - startTime;
            finalDisplayMillis = elapsedMilliseconds;
        } else {
            remainingMilliseconds = Math.max(0, timeLimitMilliseconds - (Date.now() - startTime) - penaltyOffsetMs);
            finalDisplayMillis = remainingMilliseconds;
        }
    } else {
        finalDisplayMillis = (enableTimeBomb && !enableBlind) ? timeLimitMilliseconds : 0;
    }
    if (isWin) {
        messageBox.textContent = 'Game Clear!';

        body.classList.add('game-clear');

        const flagsAllowed = !enableNoFlags;

        if (flagsAllowed) {
            let minesToFlag = 0;

            for (let i = 0;
                i < gridSize; i++) {
                for (let j = 0;
                    j < gridSize; j++) {
                    const sq = board[i]?.[j];

                    if (sq && sq.isMine && !sq.isFlagged) {
                        sq.isFlagged = true;
                        renderSquareContent(sq);
                        minesToFlag++;
                    }
                }
            }
            minesLeft -= minesToFlag;
            if (minesLeft < 0) minesLeft = 0;
            updateMinesLeftDisplay();
        }
        if (gameStarted) {
            if (enableTimeBomb && !enableBlind) {
                const h = Math.floor(finalDisplayMillis / 3600000);
                const m = Math.floor((finalDisplayMillis % 3600000) / 60000);
                const s = Math.floor((finalDisplayMillis % 60000) / 1000);
                const cs = Math.floor((finalDisplayMillis % 1000) / 10);

                if (finalDisplayMillis < 3600000) {
                    timerSpan.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
                } else {
                    timerSpan.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
                }
            } else {
                updateTimerDisplay(finalDisplayMillis, true); // Force hundredths display
            }
        } else {
            timerSpan.textContent = (enableTimeBomb && !enableBlind) ? formatMsToDisplayTime(timeLimitMilliseconds, true) : '00.00';
        }
    } else {
        if (messageBox.textContent !== 'Game Clear!') {
            if (isRuleActive('basketball') && basketballRemainingMs <= 0 && gameStarted) {
                messageBox.textContent = 'Time Up! (Basketball)';
            } else if (enableTimeBomb && !enableBlind && gameOverOnTimeOnly && clickedMineCount >= numMines) {
                messageBox.textContent = 'All Mines Hit!';
            } else if (enableTimeBomb && !enableBlind && remainingMilliseconds <= 0 && gameStarted) {
                messageBox.textContent = 'Time Up!';
            } else {
                messageBox.textContent = 'Game Over!';
            }
        }
        body.classList.add('game-over');
        revealAllMines(true);
        updateTimerDisplay(finalDisplayMillis); // Update timer display for loss
    }
}


function revealAllMines(showIncorrectFlags) {
    /* ... (no changes needed) ... */
    const flagsAllowed = !enableNoFlags;

    for (let i = 0;
        i < gridSize; i++) {
        for (let j = 0;
            j < gridSize; j++) {
            const sq = board[i]?.[j];

            if (!sq) continue;

            const el = sq.element;

            if (sq.isMine) {
                // Only reveal if not flagged correctly or not the clicked mine
                if (!(sq.isFlagged && flagsAllowed) && !el.classList.contains('mine-clicked')) {
                     // Also clear ghost timer if revealing closing mine
                      clearGhostTimer(i, j);
                    sq.isRevealed = true;
                    renderSquareContent(sq); // Will show '💣'
                }
            } else {
                if (showIncorrectFlags && sq.isFlagged && flagsAllowed) {
                     clearGhostTimer(i, j); // Clear timer before marking wrong
                    sq.isRevealed = true; // Reveal to show the X
                    el.className = 'square revealed flag-wrong';
                    el.textContent = '❌';
                } else if (showIncorrectFlags && !sq.isRevealed && !sq.isFlagged) {
                     // Option: Reveal unopened safe squares on loss?
                      // clearGhostTimer(i, j); // Clear timer if revealing
                     // sq.isRevealed = true;
                     // renderSquareContent(sq);
                }
            }
        }
    }
}


function updateTimer() {
    /* ... (no changes needed) ... */
    if (!gameStarted || gameOver) {
        if (timerInterval && gameOver) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        return;
    }
    const now = Date.now();

    if (enableTimeBomb && !enableBlind) {
        const elapsed = now - startTime;

        remainingMilliseconds = timeLimitMilliseconds - elapsed - penaltyOffsetMs;

        if (remainingMilliseconds <= 0) {
            remainingMilliseconds = 0;
            updateTimerDisplay();
            clearInterval(timerInterval);
            timerInterval = null;
            if (!gameOver) {
                endGame(false);
            }
        } else {
            updateTimerDisplay();

            const isLowTime = remainingMilliseconds < 60000;

            body.classList.toggle('low-time', isLowTime);
            timerContainer.classList.toggle('blinking-red', isLowTime);
            timerContainer.classList.toggle('blinking-black', !isLowTime);
        }
    } else {
        elapsedMilliseconds = now - startTime;
        updateTimerDisplay();
        body.classList.remove('low-time');
        timerContainer.classList.remove('blinking-red', 'blinking-black');
    }
}


function updateBasketballTimer() {
    /* ... (no changes needed, uses isRuleActive) ... */
    // Check if Basketball rule is active
    if (!gameStarted || gameOver || !isRuleActive('basketball')) {
        if (basketballTimerInterval) {
            clearInterval(basketballTimerInterval);
            basketballTimerInterval = null;
            timerContainer.classList.remove('blinking-basketball'); // Ensure blinking stops

        }
        return;
    }
    const elapsedBasketball = Date.now() - basketballStartTime;

    basketballRemainingMs = BASKETBALL_INTERVAL_MS - elapsedBasketball;

    if (basketballRemainingMs <= 0) {
        basketballRemainingMs = 0;

        updateTimerDisplay();
        clearInterval(basketballTimerInterval);

        basketballTimerInterval = null;

        if (!gameOver) {
            endGame(false);
        }
    } else {
        updateTimerDisplay(); // Update display which will handle basketball time format
        timerContainer.classList.toggle('blinking-basketball', basketballRemainingMs <= 3000);
    }
}


function updateTimerDisplay(forceMillis = null, forceHundredths = false) {
    /* ... (no changes needed, uses isRuleActive) ... */
    // Prevent timer update if game won and time bomb isn't active or blind mode isn't active
    if (gameOver && messageBox.textContent === 'Game Clear!' && !(enableTimeBomb && !enableBlind) && !enableBlind && forceMillis === null) {
        return;
    }

    let displayMillis;
    let isBasketballDisplay = isRuleActive('basketball') && gameStarted && !gameOver;
    let isTimeBombDisplay = enableTimeBomb && !enableBlind && gameStarted && !gameOver;


    if (forceMillis !== null) {
        displayMillis = forceMillis;

        // If forcing millis, determine context based on active rules or assume elapsed
        isBasketballDisplay = isRuleActive('basketball') && !gameOver; // Check if basketball *would* be active
        isTimeBombDisplay = enableTimeBomb && !enableBlind && !gameOver; // Check if timebomb *would* be active

    } else if (isBasketballDisplay) {
        displayMillis = basketballRemainingMs;
    } else if (isTimeBombDisplay) {
        displayMillis = remainingMilliseconds;
    } else {
        displayMillis = elapsedMilliseconds; // Default to elapsed time
    }

    const safeMillis = Math.max(0, displayMillis);

    let formattedTime;


    // Determine format based on context
    if (isBasketballDisplay) {
        const s = Math.floor(safeMillis / 1000);
        const cs = Math.floor((safeMillis % 1000) / 10);

        formattedTime = `${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;

    } else if ((isTimeBombDisplay && safeMillis < 60000) || forceHundredths) {
        const s = Math.floor(safeMillis / 1000);
        const cs = Math.floor((safeMillis % 1000) / 10);

        // Show MM:SS.ss if under 1 min or forced
        const m_cs = Math.floor(safeMillis / 60000);
        const s_cs = Math.floor((safeMillis % 60000) / 1000);

        if (safeMillis < 60000 || forceHundredths) {
            formattedTime = `${String(m_cs).padStart(2,'0')}:${String(s_cs).padStart(2,'0')}.${String(cs).padStart(2, '0')}`;
        } else {
            formattedTime = `${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`; // Fallback if logic error
        }

    } else if (safeMillis < 3600000) { // Less than an hour
        const m = Math.floor(safeMillis / 60000);
        const s = Math.floor((safeMillis % 60000) / 1000);

        formattedTime = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    } else { // Hour or more
        const h = Math.floor(safeMillis / 3600000);
        const m = Math.floor((safeMillis % 3600000) / 60000);
        const s = Math.floor((safeMillis % 60000) / 1000);

        formattedTime = `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    }

    // Handle initial state before game starts
    if (!gameStarted && !(enableTimeBomb && !enableBlind)) {
        formattedTime = "00.00";
    } else if (!gameStarted && (enableTimeBomb && !enableBlind)) {
        // Show initial time limit if game not started
        formattedTime = formatMsToDisplayTime(timeLimitMilliseconds, timeLimitMilliseconds >= 3600000);
    }

    if (timerSpan) timerSpan.textContent = formattedTime;


    // Manage blinking classes (remove basketball blink if not active)
    if (!isBasketballDisplay) {
        if (timerContainer) timerContainer.classList.remove('blinking-basketball');
    }
    // Other blinking handled in updateTimer/updateBasketballTimer
    if (!isTimeBombDisplay && !isBasketballDisplay) {
        body.classList.remove('low-time');
        if (timerContainer) timerContainer.classList.remove('blinking-red', 'blinking-black');
    }
}


function revealNonMines() {
    /* ... (no changes needed) ... */
    if (gameOver || !firstClickDone) {
        return;
    }
    if (!gameStarted) {
        startGameTimer();
    }
    for (let i = 0;
        i < gridSize; i++) {
        for (let j = 0;
            j < gridSize; j++) {
            const sq = board[i]?.[j];

            if (sq && !sq.isMine && !sq.isRevealed) {
                // Use revealSquare to handle chaining and rule logic correctly
                revealSquare(i, j);
            }
        }
    }
    // Check win condition after revealing non-mines
    // endGame(true) might be called automatically by checkWinCondition if all safe squares revealed
    checkWinCondition();

    if (!gameOver) { // If checkWinCondition didn't end the game (e.g., time ran out simultaneously)
        messageBox.textContent = 'All non-mines revealed!';
    }
}


function revealAll() {
    /* ... (no changes needed) ... */
    if (gameOver || !firstClickDone) {
        return;
    }
    if (!gameStarted) {
        startGameTimer();
    }
    // Reveal all mines and incorrect flags first
    revealAllMines(true);

    // Then reveal remaining safe squares
    for (let i = 0;
        i < gridSize; i++) {
        for (let j = 0;
            j < gridSize; j++) {
            const sq = board[i]?.[j];

            if (sq && !sq.isMine && !sq.isRevealed) {
                // Directly reveal without chaining or win checks
                 // Also clear ghost timer if revealing a closing square
                 clearGhostTimer(i, j);
                sq.isRevealed = true;
                renderSquareContent(sq);

            }
        }
    }
    // Force game over as loss since revealAll is a debug action
    if (!gameOver) {endGame(false)};
    messageBox.textContent = 'All squares revealed!';

}



// --- Initial Setup ---
applyTheme(currentTheme);

if (themeToggleSwitch) themeToggleSwitch.checked = (currentTheme === 'dark');

updateTimerDisplay();
updateActiveRulesDisplay();
updateNoFlagsUI();
detectTouch();
createBoard();
