let currentInput = '';
let expression = '';
let shouldResetOnNext = false;

const resultEl = document.getElementById('result');
const expressionEl = document.getElementById('expression');

function updateDisplay(value) {
  resultEl.textContent = value;
}

function updateExpression(value) {
  expressionEl.textContent = value;
}

function inputNumber(num) {
  if (shouldResetOnNext) {
    currentInput = '';
    shouldResetOnNext = false;
  }

  if (currentInput.length >= 12) return;

  currentInput += num;
  updateDisplay(currentInput);
}

function inputDot() {
  if (shouldResetOnNext) {
    currentInput = '0';
    shouldResetOnNext = false;
  }
  if (currentInput.includes('.')) return;
  if (currentInput === '') currentInput = '0';
  currentInput += '.';
  updateDisplay(currentInput);
}

function inputOperator(op) {
  if (currentInput === '' && expression === '') return;

  if (currentInput !== '') {
    expression += currentInput;
    currentInput = '';
  } else if (expression !== '') {
    // 마지막 연산자 교체
    expression = expression.replace(/[\+\-\*\/%]$/, '');
  }

  expression += op;
  shouldResetOnNext = false;

  const displayOp = { '+': '+', '-': '−', '*': '×', '/': '÷', '%': '%' }[op];
  updateExpression(expression.replace(/\*/g, '×').replace(/\//g, '÷'));
}

function calculate() {
  if (currentInput === '' && expression === '') return;

  const fullExpr = expression + currentInput;
  if (fullExpr === '') return;

  try {
    updateExpression(fullExpr.replace(/\*/g, '×').replace(/\//g, '÷') + ' =');

    // 안전한 계산 (eval 대신 Function 사용)
    const result = Function('"use strict"; return (' + fullExpr + ')')();

    if (!isFinite(result)) {
      updateDisplay('오류');
    } else {
      const formatted = parseFloat(result.toPrecision(10)).toString();
      updateDisplay(formatted);
      currentInput = formatted;
    }
  } catch {
    updateDisplay('오류');
  }

  expression = '';
  shouldResetOnNext = true;
}

function clearAll() {
  currentInput = '';
  expression = '';
  shouldResetOnNext = false;
  updateDisplay('0');
  updateExpression('');
}

function toggleSign() {
  if (currentInput === '' || currentInput === '0') return;
  if (currentInput.startsWith('-')) {
    currentInput = currentInput.slice(1);
  } else {
    currentInput = '-' + currentInput;
  }
  updateDisplay(currentInput);
}

// 키보드 지원
document.addEventListener('keydown', (e) => {
  if (e.key >= '0' && e.key <= '9') inputNumber(e.key);
  else if (e.key === '.') inputDot();
  else if (e.key === '+') inputOperator('+');
  else if (e.key === '-') inputOperator('-');
  else if (e.key === '*') inputOperator('*');
  else if (e.key === '/') { e.preventDefault(); inputOperator('/'); }
  else if (e.key === '%') inputOperator('%');
  else if (e.key === 'Enter' || e.key === '=') calculate();
  else if (e.key === 'Escape') clearAll();
  else if (e.key === 'Backspace') {
    currentInput = currentInput.slice(0, -1);
    updateDisplay(currentInput || '0');
  }
});
