// Throttle 함수: 일정 시간마다 최대 한 번만 실행 (성능 개선)
function throttle(func, delay) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func.apply(this, args);
    }
  };
}

// 드래그 앤 드롭 상태 관리
const DragState = {
  draggedElement: null,
  pressTimer: null,
  isDragging: false,
  startY: 0,
  currentY: 0,
  placeholder: null,
};

// 드래그 앤 드롭 초기화
function initializeDragAndDrop() {
  const preview = document.getElementById("preview");

  // 이벤트 위임 방식으로 처리
  preview.addEventListener("mousedown", handleDragStart);
  preview.addEventListener("touchstart", handleDragStart, { passive: false });

  document.addEventListener("mousemove", handleDragMove);
  document.addEventListener("touchmove", handleDragMove, { passive: false });

  document.addEventListener("mouseup", handleDragEnd);
  document.addEventListener("touchend", handleDragEnd);
}

// 드래그 시작 (길게 누르기 감지)
function handleDragStart(e) {
  // message-container 찾기
  const target = e.target.closest(".message-container");
  if (!target) return;

  // 터치 이벤트 처리
  const clientY = e.type.includes("touch") ? e.touches[0].clientY : e.clientY;

  // 2초 길게 누르기 타이머 시작
  DragState.pressTimer = setTimeout(() => {
    startDragging(target, clientY);
  }, 500); // 500ms (0.5초)로 조정 - 2초는 너무 길 수 있음

  // 마우스/터치를 떼면 타이머 취소
  const cancelPress = () => {
    clearTimeout(DragState.pressTimer);
    document.removeEventListener("mouseup", cancelPress);
    document.removeEventListener("touchend", cancelPress);
  };

  document.addEventListener("mouseup", cancelPress, { once: true });
  document.addEventListener("touchend", cancelPress, { once: true });
}

// 드래그 시작
function startDragging(element, startY) {
  DragState.isDragging = true;
  DragState.draggedElement = element;
  DragState.startY = startY;

  // 드래그 중인 요소 스타일
  element.style.opacity = "0.5";
  element.style.cursor = "grabbing";
  element.style.transition = "none";

  // 플레이스홀더 생성
  DragState.placeholder = document.createElement("div");
  DragState.placeholder.className = "drag-placeholder";
  DragState.placeholder.style.height = element.offsetHeight + "px";
  DragState.placeholder.style.border = "2px dashed #999";
  DragState.placeholder.style.borderRadius = "10px";
  DragState.placeholder.style.margin = "5px 0";
  DragState.placeholder.style.backgroundColor = "rgba(0, 0, 0, 0.05)";

  element.parentNode.insertBefore(DragState.placeholder, element);

  // 진동 피드백 (모바일)
  if (navigator.vibrate) {
    navigator.vibrate(50);
  }
}

// 드래그 중
function handleDragMove(e) {
  if (!DragState.isDragging || !DragState.draggedElement) return;

  e.preventDefault();

  const clientY = e.type.includes("touch") ? e.touches[0].clientY : e.clientY;
  DragState.currentY = clientY;

  // 드래그 중인 요소 이동
  const deltaY = clientY - DragState.startY;
  DragState.draggedElement.style.transform = `translateY(${deltaY}px)`;

  // 다른 요소들과의 위치 비교
  const preview = document.getElementById("preview");
  const containers = Array.from(preview.children).filter(
    (child) =>
      child !== DragState.draggedElement && child !== DragState.placeholder
  );

  let targetElement = null;
  let insertBefore = true;

  for (const container of containers) {
    const rect = container.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;

    if (clientY < midpoint && clientY > rect.top) {
      targetElement = container;
      insertBefore = true;
      break;
    } else if (clientY > midpoint && clientY < rect.bottom) {
      targetElement = container;
      insertBefore = false;
      break;
    }
  }

  // 플레이스홀더 위치 업데이트
  if (targetElement) {
    if (insertBefore) {
      preview.insertBefore(DragState.placeholder, targetElement);
    } else {
      preview.insertBefore(DragState.placeholder, targetElement.nextSibling);
    }
  }
}

// 드래그 종료
function handleDragEnd(e) {
  clearTimeout(DragState.pressTimer);

  if (!DragState.isDragging || !DragState.draggedElement) {
    return;
  }

  e.preventDefault();

  const draggedElement = DragState.draggedElement;
  const placeholder = DragState.placeholder;

  // 원래 스타일 복원
  draggedElement.style.opacity = "";
  draggedElement.style.cursor = "";
  draggedElement.style.transform = "";
  draggedElement.style.transition = "";

  // 플레이스홀더 위치에 요소 삽입
  if (placeholder && placeholder.parentNode) {
    placeholder.parentNode.insertBefore(draggedElement, placeholder);
    placeholder.remove();
  }

  // 상태 초기화
  DragState.isDragging = false;
  DragState.draggedElement = null;
  DragState.placeholder = null;
  DragState.startY = 0;
  DragState.currentY = 0;

  // 출력 업데이트
  updateAfterStyles();
  updateOutputFromPreview();

  // localStorage 저장
  if (typeof savePreviewHTML === "function") {
    savePreviewHTML();
  }
}

// 스타일 업데이트
function updateAfterStyles() {
  let styleTag = document.getElementById("dynamicArrowStyle");
  if (!styleTag) {
    styleTag = document.createElement("style");
    styleTag.id = "dynamicArrowStyle";
    document.head.appendChild(styleTag);
  }

  // ME 색상 (수동 입력용)
  const meBgManual = document.getElementById("meBg").value;
  const youBgManual = document.getElementById("youBg").value;

  // ME 색상 (자동 생성용)
  const meColors = getMeColors();

  // 전역 스타일 가져오기
  const globalStyles = getGlobalStyles();

  let css = `
.body-container {
  background-color: ${globalStyles.bgColor};${
    globalStyles.bgImage && globalStyles.bgImage.trim() !== ""
      ? `
  background-image: url('${globalStyles.bgImage}');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;`
      : ""
  }
  padding: 20px;
  min-height: 100vh;
}
.profile-image{
  grid-row: 1 / 3;
  grid-column: 1;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #e0e0e0;
  object-fit: cover;
  align-self: start;
  pointer-events: none;
}
.character-name{
  margin:2px 5px !important;
  pointer-events: none;
}
.speech-bubble-me {
  border-radius: 20px 0px 20px 20px;
}
.speech-bubble-me:after {
  content:"";
  position:absolute;
  right:-8px;
  top:0px;
  width:0; height:0;
  border:9px solid transparent;
  border-top-color: ${meBgManual};
}
.speech-bubble-me-auto {
  background: ${meColors.bg};
  color: ${meColors.color};
  margin-left: auto;
  margin-right: 15px;
  border-radius: 20px 0px 20px 20px;
}
.speech-bubble-me-auto:after {
  content:"";
  position:absolute;
  right:-8px;
  top:0px;
  width:0; height:0;
  border:9px solid transparent;
  border-top-color: ${meColors.bg};
}
.speech-bubble-you {
  border-radius: 0px 20px 20px 20px;
}
.speech-bubble-you:after {
  content:"";
  position:absolute;
  left:-8px;
  top:0px;
  width:0; height:0;
  border:9px solid transparent;
  border-top-color: ${youBgManual};
}`;

  // 자동 생성 YOU 클래스 CSS 생성 (항상 생성)
  const youIds = getAllYouCharacterIds();

  // 디버깅: youIds 확인
  console.log("[updateAfterStyles] youIds:", youIds);
  console.log("[updateAfterStyles] AppState.youCount:", AppState.youCount);

  youIds.forEach((youId) => {
    const colors = getYouColors(youId);
    const suffix = getYouClassSuffix(youId);

    // 디버깅: 각 YOU의 색상 확인
    const bgInput = document.getElementById(`youBg_${youId}`);
    const colorInput = document.getElementById(`youColor_${youId}`);
    console.log(`[updateAfterStyles] ${youId} (${suffix}):`, {
      bgInputExists: !!bgInput,
      bgInputValue: bgInput?.value,
      colorInputExists: !!colorInput,
      colorInputValue: colorInput?.value,
      colors: colors,
    });

    css += `
.speech-bubble-${suffix} {
  background: ${colors.bg};
  color: ${colors.color};
  margin-left: 15px;
  border-radius: 0px 20px 20px 20px;
}
.speech-bubble-${suffix}:after {
  content:"";
  position:absolute;
  left:-8px;
  top:0px;
  width:0; height:0;
  border:9px solid transparent;
  border-top-color: ${colors.bg};
}`;
  });

  // 서로 다른 사람 간 대화 간격 추가
  css += `
.speech-bubble-me-auto + .speech-bubble-you1,
.speech-bubble-you1 + .speech-bubble-me-auto {
  margin-top: 20px;
}`;

  // 다중 YOU 간 간격
  if (youIds.length > 1) {
    for (let i = 0; i < youIds.length; i++) {
      for (let j = 0; j < youIds.length; j++) {
        if (i !== j) {
          const suffix1 = getYouClassSuffix(youIds[i]);
          const suffix2 = getYouClassSuffix(youIds[j]);
          css += `
.speech-bubble-${suffix1} + .speech-bubble-${suffix2} {
  margin-top: 20px;
}`;
        }
      }
    }

    // ME-auto와 YOU2, YOU3 등의 간격
    for (let i = 1; i < youIds.length; i++) {
      const suffix = getYouClassSuffix(youIds[i]);
      css += `
.speech-bubble-me-auto + .speech-bubble-${suffix},
.speech-bubble-${suffix} + .speech-bubble-me-auto {
  margin-top: 20px;
}`;
    }
  }

  styleTag.innerHTML = css;
}

// 디바운싱을 위한 타이머
let savePreviewTimer = null;

// 출력 업데이트
function updateOutputFromPreview() {
  const meBg = document.getElementById("meBg").value;
  const meColor = document.getElementById("meColor").value;
  const youBg = document.getElementById("youBg").value;
  const youColor = document.getElementById("youColor").value;

  // ME 색상 (자동 생성용)
  const meColors = getMeColors();

  // 전역 스타일 가져오기
  const globalStyles = getGlobalStyles();
  const shadowCSS = getShadowCSS();

  let styleBlock = `
<style>
.body-container {
  background-color: ${globalStyles.bgColor};${
    globalStyles.bgImage && globalStyles.bgImage.trim() !== ""
      ? `
  background-image: url('${globalStyles.bgImage}');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;`
      : ""
  }
  padding: 20px;
  min-height: 100vh;
}
.message-container.show-profile {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto;
  gap: 5px 10px;
  padding-left: 15px;
}
.message-container {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto;
  gap: 0px 10px;
  padding-left: 15px;
}
.message-container.me {
  grid-template-columns: 1fr auto;
  padding-left: 0;
  padding-right: 15px;
}
.message-container .character-name {
  height: 0;
  margin:2px 5px !important;
}
.message-container.show-profile .character-name {
  height: auto;
}
.profile-image {
  grid-row: 1 / 3;
  grid-column: 1;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #e0e0e0;
  object-fit: cover;
  align-self: start;
}
.message-container.me .profile-image {
  grid-column: 2;
}
.character-name {
  grid-row: 1;
  grid-column: 2;
  font-size: 14.5px;
  color: #666;
  font-family: "";
  font-weight: 500;
  white-space: nowrap;
  align-self: center;
}
.message-container.me .character-name {
  grid-column: 1;
  text-align: right;
}
.message-container .speech-bubble {
  grid-row: 2;
  grid-column: 2;
}
.message-container.me .speech-bubble {
  grid-column: 1;
  justify-self: end;
}
.message-container + .message-container {
  margin-top: 2px;
}
.message-container.show-profile {
  margin-top: 15px;
}
.speech-bubble {
  position: relative;
  padding: 15px 20px;
  box-shadow: ${shadowCSS};
  line-height: ${globalStyles.lineHeight};
  display: block;
  width: fit-content;
  max-width: 60%;
  word-wrap: break-word;
  white-space: normal;
  margin-bottom: 5px;
  text-align: ${globalStyles.textAlign};
  font-family: kopub돋움L;
  letter-spacing: ${globalStyles.letterSpacing}px;
  word-break: ${globalStyles.wordBreak};
}
.speech-bubble-me {
  background: ${meBg};
  color: ${meColor};
  margin-left: auto;
  margin-right: 30px;
  border-radius: 20px 0px 20px 20px;
}
.speech-bubble-me:after {
  content: "";
  position: absolute;
  right: -8px;
  top: 0px;
  width: 0; height: 0;
  border: 9px solid transparent;
  border-top-color: ${meBg};
}
.speech-bubble-me-auto {
  background: ${meColors.bg};
  color: ${meColors.color};
  margin-left: auto;
  margin-right: 30px;
  border-radius: 20px 0px 20px 20px;
}
.speech-bubble-me-auto:after {
  content: "";
  position: absolute;
  right: -8px;
  top: 0px;
  width: 0; height: 0;
  border: 9px solid transparent;
  border-top-color: ${meColors.bg};
}
.speech-bubble-you {
  background: ${youBg};
  color: ${youColor};
  margin-left: 30px;
  border-radius: 0px 20px 20px 20px;
}
.speech-bubble-you:after {
  content: "";
  position: absolute;
  left: -8px;
  top: 0px;
  width: 0; height: 0;
  border: 9px solid transparent;
  border-top-color: ${youBg};
}`;

  // 자동 생성 YOU 클래스 CSS 추가 (항상 생성)
  const youIds = getAllYouCharacterIds();
  youIds.forEach((youId) => {
    const colors = getYouColors(youId);
    const suffix = getYouClassSuffix(youId);

    styleBlock += `
.speech-bubble-${suffix} {
  background: ${colors.bg};
  color: ${colors.color};
  margin-left: 15px;
  border-radius: 0px 20px 20px 20px;
}
.speech-bubble-${suffix}:after {
  content: "";
  position: absolute;
  left: -8px;
  top: 0px;
  width: 0; height: 0;
  border: 9px solid transparent;
  border-top-color: ${colors.bg};
}`;
  });

  styleBlock += `
.speech-bubble-you + .speech-bubble-me,
.speech-bubble-me + .speech-bubble-you {
  margin-top: 20px;
}`;

  // 서로 다른 사람 간 대화 간격 추가
  styleBlock += `
.speech-bubble-me-auto + .speech-bubble-you1,
.speech-bubble-you1 + .speech-bubble-me-auto {
  margin-top: 20px;
}`;

  // 다중 YOU 간 간격
  if (youIds.length > 1) {
    for (let i = 0; i < youIds.length; i++) {
      for (let j = 0; j < youIds.length; j++) {
        if (i !== j) {
          const suffix1 = getYouClassSuffix(youIds[i]);
          const suffix2 = getYouClassSuffix(youIds[j]);
          styleBlock += `
.speech-bubble-${suffix1} + .speech-bubble-${suffix2} {
  margin-top: 20px;
}`;
        }
      }
    }

    // ME-auto와 YOU2, YOU3 등의 간격
    for (let i = 1; i < youIds.length; i++) {
      const suffix = getYouClassSuffix(youIds[i]);
      styleBlock += `
.speech-bubble-me-auto + .speech-bubble-${suffix},
.speech-bubble-${suffix} + .speech-bubble-me-auto {
  margin-top: 20px;
}`;
    }
  }

  styleBlock += `
</style>
`;

  const previewHTML = Array.from(document.getElementById("preview").children)
    .map((d) => {
      const clone = d.cloneNode(true); // 원본 건드리지 않는 복제본

      // contenteditable 속성 제거
      const bubbles = clone.querySelectorAll("[contenteditable]");
      bubbles.forEach((bubble) => bubble.removeAttribute("contenteditable"));

      return clone.outerHTML;
    })
    .join("\n");

  // body-container로 감싸기
  const wrappedHTML = `<div class="body-container">\n${previewHTML}\n</div>`;

  document.getElementById("output").value = styleBlock + wrappedHTML + "\n";

  // localStorage에 저장 (디바운싱: 500ms 후에 저장)
  if (typeof savePreviewHTML === "function") {
    clearTimeout(savePreviewTimer);
    savePreviewTimer = setTimeout(() => {
      savePreviewHTML();
    }, 500);
  }
}

// 자동 생성된 말풍선 색상 실시간 업데이트
function updateAutoGeneratedColors() {
  const meColors = getMeColors();

  Array.from(document.getElementById("preview").children).forEach((div) => {
    // 자동 생성 말풍선만 업데이트
    if (div.dataset.source !== "auto") return;

    // ME 말풍선 업데이트 (me-auto 클래스)
    if (div.classList.contains("speech-bubble-me-auto")) {
      div.style.backgroundColor = meColors.bg;
      div.style.color = meColors.color;
    }

    // YOU 말풍선 업데이트 (you1, you2, you3 등)
    const youIds = getAllYouCharacterIds();
    for (const youId of youIds) {
      const suffix = getYouClassSuffix(youId);
      if (div.classList.contains(`speech-bubble-${suffix}`)) {
        const youColors = getYouColors(youId);

        div.style.backgroundColor = youColors.bg;
        div.style.color = youColors.color;
        break;
      }
    }
  });

  updateAfterStyles();
  updateOutputFromPreview();

  // localStorage에 저장
  if (typeof saveFileData === "function") {
    saveFileData();
  }
}

// 자동 생성 색상 입력 필드에 실시간 업데이트 리스너 추가
function attachAutoColorListeners() {
  // ME 자동 생성 색상 리스너
  const meBgAuto = document.getElementById("meBg_auto");
  const meColorAuto = document.getElementById("meColor_auto");

  if (meBgAuto && meColorAuto) {
    // 기존 리스너 제거를 위해 복제
    const newMeBgAuto = meBgAuto.cloneNode(true);
    const newMeColorAuto = meColorAuto.cloneNode(true);
    meBgAuto.parentNode.replaceChild(newMeBgAuto, meBgAuto);
    meColorAuto.parentNode.replaceChild(newMeColorAuto, meColorAuto);

    // 새 리스너 추가 (throttle로 성능 개선: 100ms마다 최대 1회)
    const throttledUpdate = throttle(updateAutoGeneratedColors, 100);
    document
      .getElementById("meBg_auto")
      .addEventListener("input", throttledUpdate);
    document
      .getElementById("meColor_auto")
      .addEventListener("input", throttledUpdate);
  }

  // 모든 YOU 색상 리스너
  const youIds = getAllYouCharacterIds();
  for (const youId of youIds) {
    const bgInput = document.getElementById(`youBg_${youId}`);
    const colorInput = document.getElementById(`youColor_${youId}`);

    if (bgInput && colorInput) {
      // 기존 리스너 제거를 위해 복제
      const newBgInput = bgInput.cloneNode(true);
      const newColorInput = colorInput.cloneNode(true);
      bgInput.parentNode.replaceChild(newBgInput, bgInput);
      colorInput.parentNode.replaceChild(newColorInput, colorInput);

      // 새 리스너 추가 (throttle로 성능 개선: 100ms마다 최대 1회)
      const throttledUpdate = throttle(updateAutoGeneratedColors, 100);
      document
        .getElementById(`youBg_${youId}`)
        .addEventListener("input", throttledUpdate);
      document
        .getElementById(`youColor_${youId}`)
        .addEventListener("input", throttledUpdate);
    }
  }
}

// 페이지 로드 시 드래그 앤 드롭 초기화
document.addEventListener("DOMContentLoaded", () => {
  initializeDragAndDrop();
});
