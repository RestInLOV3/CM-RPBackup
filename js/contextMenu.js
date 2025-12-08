// 컨텍스트 메뉴 변수
let contextMenu = null;
let currentTargetBubble = null;

// 컨텍스트 메뉴 초기화
function initContextMenu() {
  // 컨텍스트 메뉴 생성
  contextMenu = document.createElement("div");
  contextMenu.id = "bubble-context-menu";
  contextMenu.className = "bubble-context-menu-theme";
  contextMenu.style.cssText = `
    position: fixed;
    display: none;
    z-index: 10000;
  `;

  // 메뉴 아이템들
  const menuItems = [
    { text: "위에 말풍선 추가하기", action: "insertAbove" },
    { text: "아래에 말풍선 추가하기", action: "insertBelow" },
    { text: "말풍선 삭제하기", action: "delete" },
  ];

  menuItems.forEach((item) => {
    const menuItem = document.createElement("div");
    menuItem.className = "context-menu-item";
    menuItem.textContent = item.text;

    menuItem.addEventListener("click", () => {
      handleMenuAction(item.action);
    });

    contextMenu.appendChild(menuItem);
  });

  document.body.appendChild(contextMenu);

  // 미리보기 영역에 우클릭 이벤트 리스너 추가
  const preview = document.getElementById("preview");
  preview.addEventListener("contextmenu", handleContextMenu);

  // 다른 곳 클릭 시 메뉴 닫기
  document.addEventListener("click", hideContextMenu);
}

// 우클릭 핸들러
function handleContextMenu(e) {
  // 말풍선이 아닌 곳을 우클릭하면 기본 동작
  if (!e.target.classList.contains("speech-bubble")) {
    return;
  }

  e.preventDefault();

  // 타겟은 말풍선 자체가 아니라 부모 message-container로 저장
  currentTargetBubble = e.target.closest('.message-container');

  // 메뉴를 먼저 표시해서 크기를 측정
  contextMenu.style.display = "block";

  // 마우스 위치
  let menuX = e.pageX;
  let menuY = e.pageY;

  // 최종 위치 설정 (뷰포트 기준)
  contextMenu.style.left = menuX + "px";
  contextMenu.style.top = menuY + "px";
}

// 메뉴 숨기기
function hideContextMenu() {
  if (contextMenu) {
    contextMenu.style.display = "none";
  }
}

// 메뉴 액션 처리
function handleMenuAction(action) {
  if (!currentTargetBubble) return;

  switch (action) {
    case "insertAbove":
      insertBubble(currentTargetBubble, "before");
      break;
    case "insertBelow":
      insertBubble(currentTargetBubble, "after");
      break;
    case "delete":
      deleteBubble(currentTargetBubble);
      break;
  }

  hideContextMenu();
  currentTargetBubble = null;
}

// 말풍선 추가
function insertBubble(targetContainer, position) {
  // 타겟 컨테이너에서 정보 추출
  const characterId = targetContainer.dataset.characterId;
  const characterName = targetContainer.dataset.characterName;
  const isMe = targetContainer.dataset.isMe === 'true';

  // 타겟 컨테이너의 말풍선 찾기
  const targetBubble = targetContainer.querySelector('.speech-bubble');
  const targetClasses = targetBubble.className;
  const targetBg = targetBubble.style.backgroundColor;
  const targetColor = targetBubble.style.color;

  // 새 말풍선 생성
  const newBubble = document.createElement("div");
  newBubble.className = targetClasses;
  newBubble.innerText = "새 메시지를 입력하세요";
  newBubble.contentEditable = true;
  newBubble.style.backgroundColor = targetBg;
  newBubble.style.color = targetColor;
  newBubble.dataset.source = "manual";
  newBubble.addEventListener("input", updateOutputFromPreview);

  // 새 메시지 컨테이너 생성 (프로필 이미지 + 이름 + 말풍선)
  const newContainer = createMessageContainer(newBubble, characterName, characterId, isMe);

  // 위치에 따라 컨테이너 삽입
  if (position === "before") {
    targetContainer.parentNode.insertBefore(newContainer, targetContainer);
  } else {
    targetContainer.parentNode.insertBefore(newContainer, targetContainer.nextSibling);
  }

  // 스타일 및 출력 업데이트
  updateAfterStyles();
  updateOutputFromPreview();

  // 메시지 컨테이너 업데이트 (프로필 갱신)
  if (typeof updateMessageContainers === "function") {
    updateMessageContainers();
  }

  // localStorage에 저장
  if (typeof savePreviewHTML === "function") {
    savePreviewHTML();
  }

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
function deleteBubble(targetContainer) {
  if (confirm("이 말풍선을 삭제하시겠습니까?")) {
    targetContainer.remove();

    // 스타일 및 출력 업데이트
    updateAfterStyles();
    updateOutputFromPreview();

    // 메시지 컨테이너 업데이트 (프로필 갱신)
    if (typeof updateMessageContainers === "function") {
      updateMessageContainers();
    }

    // localStorage에 저장
    if (typeof savePreviewHTML === "function") {
      savePreviewHTML();
    }
  }
}

// 페이지 로드 시 초기화
document.addEventListener("DOMContentLoaded", function () {
  initContextMenu();
});
