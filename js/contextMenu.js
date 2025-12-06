// 컨텍스트 메뉴 변수
let contextMenu = null;
let currentTargetBubble = null;

// 컨텍스트 메뉴 초기화
function initContextMenu() {
  // 컨텍스트 메뉴 생성
  contextMenu = document.createElement('div');
  contextMenu.id = 'bubble-context-menu';
  contextMenu.style.cssText = `
    position: fixed;
    background: white;
    border: 1px solid #ccc;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    padding: 8px 0;
    z-index: 10000;
    display: none;
    min-width: 180px;
  `;

  // 메뉴 아이템들
  const menuItems = [
    { text: '위에 말풍선 추가하기', action: 'insertAbove' },
    { text: '아래에 말풍선 추가하기', action: 'insertBelow' },
    { text: '말풍선 삭제하기', action: 'delete' }
  ];

  menuItems.forEach(item => {
    const menuItem = document.createElement('div');
    menuItem.className = 'context-menu-item';
    menuItem.textContent = item.text;
    menuItem.style.cssText = `
      padding: 10px 20px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    `;

    menuItem.addEventListener('mouseenter', () => {
      menuItem.style.background = '#f0f0f0';
    });

    menuItem.addEventListener('mouseleave', () => {
      menuItem.style.background = 'white';
    });

    menuItem.addEventListener('click', () => {
      handleMenuAction(item.action);
    });

    contextMenu.appendChild(menuItem);
  });

  document.body.appendChild(contextMenu);

  // 미리보기 영역에 우클릭 이벤트 리스너 추가
  const preview = document.getElementById('preview');
  preview.addEventListener('contextmenu', handleContextMenu);

  // 다른 곳 클릭 시 메뉴 닫기
  document.addEventListener('click', hideContextMenu);
}

// 우클릭 핸들러
function handleContextMenu(e) {
  // 말풍선이 아닌 곳을 우클릭하면 기본 동작
  if (!e.target.classList.contains('speech-bubble')) {
    return;
  }

  e.preventDefault();

  currentTargetBubble = e.target;

  // 메뉴 위치 설정 (clientX/Y를 사용하여 뷰포트 기준으로 표시)
  contextMenu.style.display = 'block';
  contextMenu.style.left = e.clientX + 'px';
  contextMenu.style.top = e.clientY + 'px';
}

// 메뉴 숨기기
function hideContextMenu() {
  if (contextMenu) {
    contextMenu.style.display = 'none';
  }
}

// 메뉴 액션 처리
function handleMenuAction(action) {
  if (!currentTargetBubble) return;

  switch(action) {
    case 'insertAbove':
      insertBubble(currentTargetBubble, 'before');
      break;
    case 'insertBelow':
      insertBubble(currentTargetBubble, 'after');
      break;
    case 'delete':
      deleteBubble(currentTargetBubble);
      break;
  }

  hideContextMenu();
  currentTargetBubble = null;
}

// 말풍선 추가
function insertBubble(targetBubble, position) {
  // 타겟 말풍선의 클래스 복사 (speech-bubble-me, speech-bubble-you1 등)
  const targetClasses = targetBubble.className;
  const targetBg = targetBubble.style.backgroundColor;
  const targetColor = targetBubble.style.color;
  const targetSource = targetBubble.dataset.source;

  // 새 말풍선 생성
  const newBubble = document.createElement('div');
  newBubble.className = targetClasses;
  newBubble.innerText = '새 메시지를 입력하세요';
  newBubble.contentEditable = true;
  newBubble.style.backgroundColor = targetBg;
  newBubble.style.color = targetColor;
  newBubble.dataset.source = targetSource || 'manual';
  newBubble.addEventListener('input', updateOutputFromPreview);

  // 위치에 따라 삽입
  if (position === 'before') {
    targetBubble.parentNode.insertBefore(newBubble, targetBubble);
  } else {
    targetBubble.parentNode.insertBefore(newBubble, targetBubble.nextSibling);
  }

  // 스타일 및 출력 업데이트
  updateAfterStyles();
  updateOutputFromPreview();

  // 새 말풍선에 포커스 및 텍스트 선택
  newBubble.focus();

  // 텍스트 전체 선택 (contenteditable)
  const range = document.createRange();
  range.selectNodeContents(newBubble);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

// 말풍선 삭제
function deleteBubble(targetBubble) {
  if (confirm('이 말풍선을 삭제하시겠습니까?')) {
    targetBubble.remove();

    // 스타일 및 출력 업데이트
    updateAfterStyles();
    updateOutputFromPreview();
  }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
  initContextMenu();
});
