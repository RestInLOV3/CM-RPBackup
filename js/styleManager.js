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

  let css = `
.profile-image{
  grid-row: 1 / 3;
  grid-column: 1;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #e0e0e0;
  object-fit: cover;
  align-self: start;
}
.character-name{
  margin:2px 5px !important;
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
body {
  background-color: ${globalStyles.bgColor};${
    globalStyles.bgImage && globalStyles.bgImage.trim() !== ""
      ? `
  background-image: url('${globalStyles.bgImage}');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;`
      : ""
  }
}
#preview {
  min-height: 200px;
  max-height: 1100px;
  padding: 15px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.08);
  overflow-y: auto;
  overflow-x: hidden;
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
<br><br>
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

  document.getElementById("output").value = styleBlock + previewHTML + "\n";

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
