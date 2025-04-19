const gridSize = 15;
const numMines = 30;
const maxHideRate = 0.15;
const minHideRate = 0;
const maxOddEvenRate = 0.05;
const maxAreaValueRate = 0.10; // 0~10%に変更

let board = [];
let minesLeft = numMines;
let gameOver = false;
let hiddenCount = 0;
let timerInterval;
let seconds = 0;
let enableHide = true;
let enableOddEven = true;
let enableAreaValue = true;

let boardElement = document.getElementById('board');
const resetButton = document.getElementById('reset-button');
const messageBox = document.getElementById('message-box');
const timerDisplay = document.getElementById('timer');
const body = document.body;

const hideSwitch = document.getElementById('hide-switch');
const oddEvenSwitch = document.getElementById('odd-even-switch');
const areaValueSwitch = document.getElementById('area-value-switch');
const revealNonMinesButton = document.getElementById('reveal-non-mines');
const revealAllButton = document.getElementById('reveal-all');

hideSwitch.addEventListener('change', () => {
    enableHide = hideSwitch.checked;
    createBoard();
});
oddEvenSwitch.addEventListener('change', () => {
    enableOddEven = oddEvenSwitch.checked;
    createBoard();
});
areaValueSwitch.addEventListener('change', () => {
    enableAreaValue = areaValueSwitch.checked;
    createBoard();
});

resetButton.addEventListener('click', createBoard);
revealNonMinesButton.addEventListener('click', revealNonMines);
revealAllButton.addEventListener('click', revealAll);

function createBoard() {
    board = [];
    minesLeft = numMines;
    gameOver = false;
    hiddenCount = 0;
    seconds = 0;
    updateTimerDisplay();
    clearInterval(timerInterval);
    boardElement.innerHTML = '';
    messageBox.textContent = '';
    body.classList.remove('game-over');
    body.style.backgroundColor = '#f0f0f0';

    for (let i = 0; i < gridSize; i++) {
        board[i] = [];
        for (let j = 0; j < gridSize; j++) {
            board[i][j] = {
                isMine: false,
                isRevealed: false,
                isFlagged: false,
                isHide: false,
                isOddEven: false,
                isAreaValue: false,
                oddEvenValue: null,
                areaValue: null,
                adjacentMines: 0,
                element: document.createElement('div')
            };
            const squareElement = board[i][j].element;
            squareElement.classList.add('square');
            squareElement.classList.add('hidden');
            squareElement.addEventListener('click', () => handleSquareClick(i, j));
            squareElement.addEventListener('contextmenu', (event) => {
                event.preventDefault();
                handleRightClick(i, j);
            });
            boardElement.appendChild(squareElement);
        }
    }
    plantMines();
    calculateAdjacentMines();
    setHideSquares();
    setOddEvenSquares();
    setAreaValueSquares();
    updateDisplay();
    clearInterval(timerInterval); // Reset timer
    seconds = 0;
    updateTimerDisplay();
    timerInterval = setInterval(updateTimer, 1000);
}

function plantMines() {
    let minesPlanted = 0;
    while (minesPlanted < numMines) {
        const row = Math.floor(Math.random() * gridSize);
        const col = Math.floor(Math.random() * gridSize);
        if (!board[row][col].isMine) {
            board[row][col].isMine = true;
            minesPlanted++;
        }
    }
}

function calculateAdjacentMines() {
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            if (board[i][j].isMine) {
                continue;
            }
            let count = 0;
            for (let x = -1; x <= 1; x++) {
                for (let y = -1; y <= 1; y++) {
                    if (x === 0 && y === 0) {
                        continue;
                    }
                    const newRow = i + x;
                    const newCol = j + y;
                    if (newRow >= 0 && newRow < gridSize && newCol >= 0 && newCol < gridSize && board[newRow][newCol].isMine) {
                        count++;
                    }
                }
            }
            board[i][j].adjacentMines = count;
        }
    }
}

function setHideSquares() {
    if (!enableHide) return;
    const totalSquares = gridSize * gridSize;
    const hideRate = Math.random() * (maxHideRate - minHideRate) + minHideRate;
    const numHideSquares = Math.floor(totalSquares * hideRate);
    let hideSquaresSet = 0;
    let potentialHideSquares = [];

    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            if (!board[i][j].isMine && board[i][j].adjacentMines > 0) { // Changed to > 0
                potentialHideSquares.push({ row: i, col: j });
            }
        }
    }

    while (hideSquaresSet < numHideSquares && potentialHideSquares.length > 0) {
        const randomIndex = Math.floor(Math.random() * potentialHideSquares.length);
        const { row, col } = potentialHideSquares[randomIndex];
        potentialHideSquares.splice(randomIndex, 1);

        board[row][col].isHide = true;
        board[row][col].element.classList.add('hidden');
        hiddenCount++;
        hideSquaresSet++;
    }
}

function setOddEvenSquares() {
    if (!enableOddEven) return;
    const totalSquares = gridSize * gridSize;
    const oddEvenRate = Math.random() * maxOddEvenRate;
    const numOddEvenSquares = Math.floor(totalSquares * oddEvenRate);
    let oddEvenSquaresSet = 0;
    let potentialOddEvenSquares = [];

    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            if (!board[i][j].isMine && board[i][j].adjacentMines > 1) { // Only 2 or more adjacent mines
                potentialOddEvenSquares.push({ row: i, col: j });
            }
        }
    }

    while (oddEvenSquaresSet < numOddEvenSquares && potentialOddEvenSquares.length > 0) {
        const randomIndex = Math.floor(Math.random() * potentialOddEvenSquares.length);
        const { row, col } = potentialOddEvenSquares[randomIndex];
        potentialOddEvenSquares.splice(randomIndex, 1);

        let isValid = true;
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                if (x === 0 && y === 0) continue;
                const newRow = row + x;
                const newCol = col + y;
                if (newRow >= 0 && newRow < gridSize && newCol >= 0 && newCol < gridSize && board[newRow][newCol].isOddEven) {
                    isValid = false;
                    break;
                }
            }
            if (!isValid) break;
        }

        if (isValid) {
            board[row][col].isOddEven = true;
            board[row][col].isHide = true;
            board[row][col].element.classList.add('hidden');
            hiddenCount++;
            board[row][col].oddEvenValue = board[row][col].adjacentMines % 2 === 0 ? 'Ev' : 'Od';
            oddEvenSquaresSet++;
        }
    }
}

function setAreaValueSquares() {
    if (!enableAreaValue) return;
    const totalSquares = gridSize * gridSize;
    const areaValueRate = Math.random() * maxAreaValueRate; // 変更
    const numAreaValueSquares = Math.floor(totalSquares * areaValueRate);
    let areaValueSquaresSet = 0;
    let potentialAreaValueSquares = [];

    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            if (!board[i][j].isMine && board[i][j].adjacentMines > 0) {
                potentialAreaValueSquares.push({ row: i, col: j });
            }
        }
    }

    while (areaValueSquaresSet < numAreaValueSquares && potentialAreaValueSquares.length > 0) {
        const randomIndex = Math.floor(Math.random() * potentialAreaValueSquares.length);
        const { row, col } = potentialAreaValueSquares[randomIndex];
        potentialAreaValueSquares.splice(randomIndex, 1);

        let isValid = true;
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                if (x === 0 && y === 0) continue;
                const newRow = row + x;
                const newCol = col + y;
                if (newRow >= 0 && newRow < gridSize && newCol >= 0 && newCol < gridSize && board[newRow][newCol].isAreaValue) {
                    isValid = false;
                    break;
                }
            }
            if (!isValid) break;
        }

        if (isValid) {
            board[row][col].isAreaValue = true;
            board[row][col].isHide = true;
            board[row][col].element.classList.add('hidden');
            hiddenCount++;
            if (board[row][col].adjacentMines <= 3) {
                board[row][col].areaValue = '-3';
            } else if (board[row][col].adjacentMines <= 6) {
                board[row][col].areaValue = '4-6';
            } else {
                board[row][col].areaValue = '7+';
            }
            areaValueSquaresSet++;
        }
    }
}

function handleSquareClick(row, col) {
    if (gameOver || board[row][col].isRevealed || board[row][col].isFlagged) {
        return;
    }

    if (board[row][col].isMine) {
        gameOver = true;
        clearInterval(timerInterval);
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                if (board[i][j].isMine) {
                    board[i][j].isRevealed = true;
                    board[i][j].element.classList.remove('hidden');
                    board[i][j].element.classList.add('revealed');
                    board[i][j].element.classList.add('mine');
                    board[i][j].element.textContent = '💣';
                }
            }
        }
        messageBox.textContent = 'Game Over! You hit a mine.';
    } else {
        revealSquare(row, col);

        let squaresRevealed = 0;
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                if (board[i][j].isRevealed && !board[i][j].isMine) {
                    squaresRevealed++;
                }
            }
        }
        if (squaresRevealed === gridSize * gridSize - numMines - hiddenCount) {
            gameOver = true;
            clearInterval(timerInterval);
            messageBox.textContent = 'Game Clear!';
        }
    }
    updateDisplay();
}

function revealSquare(row, col) {
    if (row < 0 || row >= gridSize || col < 0 || col >= gridSize || board[row][col].isRevealed) return;

    board[row][col].isRevealed = true;
    board[row][col].element.classList.remove('hidden');
    board[row][col].element.classList.add('revealed');

    if (board[row][col].adjacentMines > 0) {
        if (board[row][col].isHide) {
            if (board[row][col].isOddEven) {
                board[row][col].element.textContent = board[row][col].oddEvenValue;
                board[row][col].element.classList.add('special-square');
            } else if (board[row][col].isAreaValue) {
                board[row][col].element.textContent = board[row][col].areaValue;
                board[row][col].element.classList.add('special-square');
            } else {
                board[row][col].element.textContent = '・';
            }
        } else {
            board[row][col].element.textContent = board[row][col].adjacentMines;
        }
        return;
    }

    for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
            if (x === 0 && y === 0) continue;
            revealSquare(row + x, col + y);
        }
    }
}

function handleRightClick(row, col) {
    if (gameOver || board[row][col].isRevealed) {
        return;
    }

    if (board[row][col].isFlagged) {
        board[row][col].isFlagged = false;
        board[row][col].element.textContent = '';
        minesLeft++;
    } else {
        if (minesLeft === 0) {
            return;
        }
        board[row][col].isFlagged = true;
        board[row][col].element.textContent = '🚩';
        minesLeft--;
    }
    updateDisplay();
}

function updateDisplay() {
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const square = board[i][j];
            const element = square.element;
            if (square.isRevealed) {
                element.classList.remove('hidden');
                element.classList.add('revealed');
                if (square.isMine) {
                    element.textContent = '💣';
                } else if (square.adjacentMines > 0) {
                    if (square.isHide) {
                        if (square.isOddEven) {
                            element.textContent = square.oddEvenValue;
                            element.classList.add('special-square');
                        } else if (square.isAreaValue) {
                            element.textContent = square.areaValue;
                            element.classList.add('special-square');
                        } else {
                            element.textContent = '・';
                        }
                    } else {
                        element.textContent = square.adjacentMines;
                    }

                } else {
                    element.textContent = '';
                }
            } else {
                if (square.isFlagged) {
                    element.textContent = '🚩';
                } else {
                    element.textContent = '';
                    element.classList.add('hidden');
                    element.classList.remove('revealed');
                }
            }
        }
    }
    if (gameOver) {
        messageBox.textContent = 'Game Over!';
        messageBox.classList.add('game-over-message');
        body.classList.add('game-over');
    } else {
        messageBox.textContent = `Mines Left: ${minesLeft}`;
        messageBox.classList.remove('game-over-message');
        body.classList.remove('game-over');
    }
}

function updateTimer() {
    seconds++;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    const formattedTime = `<span class="math-inline">\{hours\}\:</span>{String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    timerDisplay.textContent = formattedTime;
}

function revealNonMines() {
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            if (!board[i][j].isMine) {
                revealSquare(i, j);
            }
        }
    }
    gameOver = true;
    clearInterval(timerInterval);
    messageBox.textContent = 'Game Clear!';
    updateDisplay();
}

function revealAll() {
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            board[i][j].isRevealed = true;
            }
        }
    }
    gameOver = true;
    clearInterval(timerInterval);
    messageBox.textContent = 'All squares revealed!';
    updateDisplay();
}

createBoard();
