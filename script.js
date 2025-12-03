// ==================== عناصر DOM ====================
const gameBoard = document.getElementById("game-board");
const movesEl = document.getElementById("moves");
const timeEl = document.getElementById("time");
const bestEl = document.getElementById("best");
const restartBtn = document.getElementById("restart");
const messageEl = document.getElementById("message");

// ==================== حالة اللعبة ====================
let symbols = ["🍎", "🍌", "🍇", "🍉", "🍔", "🍕", "⚽", "🎧"]; // 8 رموز = 16 كرت
let cards = [];          // كل الكروت بعد التكرار + الشَفَل
let firstCard = null;    // أول كرت ينفتح
let secondCard = null;   // ثاني كرت
let lockBoard = false;   // لمنع الضغط وقت الفتح/الإغلاق
let moves = 0;
let matchedPairs = 0;

// التايمر
let seconds = 0;
let timerInterval = null;

// التخزين
const BEST_MOVES_KEY = "memory_cards_best_moves";

// ==================== دوال المساعدة ====================

// شَفَل للمصفوفة (خوارزمية Fisher-Yates)
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// تشغيل التايمر
function startTimer() {
  if (timerInterval !== null) return; // لو شغّال، لا تعيده
  timerInterval = setInterval(() => {
    seconds++;
    timeEl.textContent = seconds + "s";
  }, 1000);
}

// إيقاف التايمر
function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

// إعادة التايمر
function resetTimer() {
  stopTimer();
  seconds = 0;
  timeEl.textContent = "0s";
}

// تحميل أفضل نتيجة
function loadBest() {
  const best = localStorage.getItem(BEST_MOVES_KEY);
  if (best) {
    bestEl.textContent = best;
  } else {
    bestEl.textContent = "-";
  }
}

// تحديث أفضل نتيجة
function updateBest() {
  const best = localStorage.getItem(BEST_MOVES_KEY);
  if (!best || moves < parseInt(best, 10)) {
    localStorage.setItem(BEST_MOVES_KEY, moves.toString());
    bestEl.textContent = moves;
    showMessage("New best score! 🔥", "success");
  } else {
    showMessage("Well done! Try to beat your best score 😄", "success");
  }
}

// إظهار رسالة
function showMessage(text, type = "info") {
  messageEl.textContent = text;
  messageEl.classList.remove("success", "info");
  messageEl.classList.add(type);
}

// ==================== بناء اللعبة ====================
function createBoard() {
  gameBoard.innerHTML = "";
  cards = [];

  // نكرر الرموز عشان يكون في زوجين من كل رمز
  const doubled = [...symbols, ...symbols];

  // شَفَل
  shuffleArray(doubled);

  // بناء العناصر
  doubled.forEach((symbol, index) => {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.symbol = symbol;
    card.dataset.index = index;

    const inner = document.createElement("div");
    inner.className = "card-inner";

    const front = document.createElement("div");
    front.className = "card-front";
    front.textContent = "?";

    const back = document.createElement("div");
    back.className = "card-back";
    back.textContent = symbol;

    inner.appendChild(front);
    inner.appendChild(back);
    card.appendChild(inner);

    card.addEventListener("click", onCardClick);

    gameBoard.appendChild(card);
    cards.push(card);
  });

  // ====================
  // 📌 ميزة فتح جميع الكروت لمدة ثانيتين في البداية
  // ====================
  cards.forEach((card) => card.classList.add("flipped"));

  setTimeout(() => {
    cards.forEach((card) => card.classList.remove("flipped"));
  }, 2000);
}

// ==================== منطق اللعبة ====================
function onCardClick(e) {
  const card = e.currentTarget;

  if (lockBoard) return;                    
  if (card.classList.contains("flipped")) return; 
  if (card.classList.contains("matched")) return;

  // أول ضغطة تبدأ التايمر
  if (moves === 0 && !firstCard && !secondCard && timerInterval === null) {
    startTimer();
  }

  // قلب الكرت
  card.classList.add("flipped");

  if (!firstCard) {
    firstCard = card;
    return;
  }

  secondCard = card;
  lockBoard = true;

  moves++;
  movesEl.textContent = moves;

  checkForMatch();
}

function checkForMatch() {
  const symbol1 = firstCard.dataset.symbol;
  const symbol2 = secondCard.dataset.symbol;

  if (symbol1 === symbol2) {
    firstCard.classList.add("matched");
    secondCard.classList.add("matched");
    matchedPairs++;

    resetSelection();

    if (matchedPairs === symbols.length) {
      stopTimer();
      updateBest();
    } else {
      lockBoard = false;
    }
  } else {
    setTimeout(() => {
      firstCard.classList.remove("flipped");
      secondCard.classList.remove("flipped");
      resetSelection();
      lockBoard = false;
    }, 700);
  }
}

function resetSelection() {
  firstCard = null;
  secondCard = null;
}

// ==================== إعادة تشغيل اللعبة ====================
function restartGame() {
  firstCard = null;
  secondCard = null;
  lockBoard = false;
  moves = 0;
  matchedPairs = 0;
  movesEl.textContent = "0";
  showMessage("", "info");
  resetTimer();
  createBoard();
}

// ==================== بداية التشغيل ====================
restartBtn.addEventListener("click", restartGame);

loadBest();
restartGame();
