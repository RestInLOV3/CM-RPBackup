// 전역 스타일 상태 (config.js의 AppState에 추가될 내용)
// 페이지 로드 시 AppState.globalStyles 초기화
if (!AppState.globalStyles) {
  AppState.globalStyles = {
    bgColor: '#ffffff',
    bgImage: '',
    shadowBlur: 8,
    shadowColor: '#000000',
    shadowOpacity: 20,
    fontSize: 16,
    letterSpacing: 0,
    lineHeight: 1.5,
    wordBreak: 'normal',
    textAlign: 'justify'
  };
}

// 전역 스타일 입력 요소 가져오기
function getGlobalStyleElements() {
  return {
    bgColor: document.getElementById('globalBgColor'),
    bgImage: document.getElementById('globalBgImage'),
    shadowBlur: document.getElementById('shadowBlur'),
    shadowBlurValue: document.getElementById('shadowBlurValue'),
    shadowColor: document.getElementById('shadowColor'),
    shadowOpacity: document.getElementById('shadowOpacity'),
    shadowOpacityValue: document.getElementById('shadowOpacityValue'),
    fontSize: document.getElementById('fontSize'),
    fontSizeValue: document.getElementById('fontSizeValue'),
    letterSpacing: document.getElementById('letterSpacing'),
    letterSpacingValue: document.getElementById('letterSpacingValue'),
    lineHeight: document.getElementById('lineHeight'),
    lineHeightValue: document.getElementById('lineHeightValue'),
    wordBreak: document.getElementById('wordBreak'),
    textAlign: document.getElementById('textAlign')
  };
}

// 전역 스타일을 AppState에서 가져오기
function getGlobalStyles() {
  return {
    bgColor: AppState.globalStyles.bgColor,
    bgImage: AppState.globalStyles.bgImage,
    shadowBlur: AppState.globalStyles.shadowBlur,
    shadowColor: AppState.globalStyles.shadowColor,
    shadowOpacity: AppState.globalStyles.shadowOpacity,
    fontSize: AppState.globalStyles.fontSize,
    letterSpacing: AppState.globalStyles.letterSpacing,
    lineHeight: AppState.globalStyles.lineHeight,
    wordBreak: AppState.globalStyles.wordBreak,
    textAlign: AppState.globalStyles.textAlign
  };
}

// 그림자 CSS 생성
function getShadowCSS() {
  const styles = getGlobalStyles();
  const opacity = styles.shadowOpacity / 100;

  // shadowColor를 rgba로 변환
  const hex = styles.shadowColor;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  return `0 4px ${styles.shadowBlur}px rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// 미리보기 영역에 전역 스타일 적용
function applyGlobalStylesToPreview() {
  const preview = document.getElementById('preview');
  const styles = getGlobalStyles();

  // 배경 색
  preview.style.backgroundColor = styles.bgColor;

  // 배경 이미지
  if (styles.bgImage && styles.bgImage.trim() !== '') {
    preview.style.backgroundImage = `url('${styles.bgImage}')`;
    preview.style.backgroundSize = 'cover';
    preview.style.backgroundPosition = 'center';
    preview.style.backgroundRepeat = 'no-repeat';
  } else {
    preview.style.backgroundImage = 'none';
  }

  // 모든 말풍선에 스타일 적용
  const bubbles = preview.querySelectorAll('.speech-bubble');
  bubbles.forEach(bubble => {
    bubble.style.boxShadow = getShadowCSS();
    bubble.style.fontSize = `${styles.fontSize}px`;
    bubble.style.letterSpacing = `${styles.letterSpacing}px`;
    bubble.style.lineHeight = styles.lineHeight;
    bubble.style.wordBreak = styles.wordBreak;
    bubble.style.textAlign = styles.textAlign;
  });

  // HTML 코드 업데이트
  updateOutputFromPreview();
}

// 슬라이더 값 표시 업데이트
function updateSliderDisplays() {
  const elements = getGlobalStyleElements();

  if (elements.shadowBlur && elements.shadowBlurValue) {
    elements.shadowBlurValue.textContent = elements.shadowBlur.value;
  }

  if (elements.shadowOpacity && elements.shadowOpacityValue) {
    elements.shadowOpacityValue.textContent = elements.shadowOpacity.value;
  }

  if (elements.fontSize && elements.fontSizeValue) {
    elements.fontSizeValue.textContent = elements.fontSize.value;
  }

  if (elements.letterSpacing && elements.letterSpacingValue) {
    elements.letterSpacingValue.textContent = elements.letterSpacing.value;
  }

  if (elements.lineHeight && elements.lineHeightValue) {
    elements.lineHeightValue.textContent = elements.lineHeight.value;
  }
}

// 전역 스타일 변경 핸들러
function handleGlobalStyleChange() {
  const elements = getGlobalStyleElements();

  // AppState 업데이트
  AppState.globalStyles.bgColor = elements.bgColor.value;
  AppState.globalStyles.bgImage = elements.bgImage.value;
  AppState.globalStyles.shadowBlur = parseFloat(elements.shadowBlur.value);
  AppState.globalStyles.shadowColor = elements.shadowColor.value;
  AppState.globalStyles.shadowOpacity = parseFloat(elements.shadowOpacity.value);
  AppState.globalStyles.fontSize = parseFloat(elements.fontSize.value);
  AppState.globalStyles.letterSpacing = parseFloat(elements.letterSpacing.value);
  AppState.globalStyles.lineHeight = parseFloat(elements.lineHeight.value);
  AppState.globalStyles.wordBreak = elements.wordBreak.value;
  AppState.globalStyles.textAlign = elements.textAlign.value;

  // 슬라이더 값 표시 업데이트
  updateSliderDisplays();

  // 미리보기에 스타일 적용
  applyGlobalStylesToPreview();

  // localStorage에 저장
  if (typeof saveGlobalStyles === 'function') {
    saveGlobalStyles();
  }
}

// 배경 이미지 초기화 함수
function resetBackgroundImage() {
  const bgImageElement = document.getElementById('globalBgImage');
  if (bgImageElement) {
    bgImageElement.value = '';
    AppState.globalStyles.bgImage = '';
    applyGlobalStylesToPreview();

    // localStorage에 저장
    if (typeof saveGlobalStyles === 'function') {
      saveGlobalStyles();
    }
  }
}

// 전역 스타일 입력 필드에 이벤트 리스너 추가
function initGlobalStyleListeners() {
  const elements = getGlobalStyleElements();

  // 모든 입력 필드에 change/input 이벤트 리스너 추가
  if (elements.bgColor) elements.bgColor.addEventListener('input', handleGlobalStyleChange);
  if (elements.bgImage) elements.bgImage.addEventListener('input', handleGlobalStyleChange);
  if (elements.shadowBlur) elements.shadowBlur.addEventListener('input', handleGlobalStyleChange);
  if (elements.shadowColor) elements.shadowColor.addEventListener('input', handleGlobalStyleChange);
  if (elements.shadowOpacity) elements.shadowOpacity.addEventListener('input', handleGlobalStyleChange);
  if (elements.fontSize) elements.fontSize.addEventListener('input', handleGlobalStyleChange);
  if (elements.letterSpacing) elements.letterSpacing.addEventListener('input', handleGlobalStyleChange);
  if (elements.lineHeight) elements.lineHeight.addEventListener('input', handleGlobalStyleChange);
  if (elements.wordBreak) elements.wordBreak.addEventListener('change', handleGlobalStyleChange);
  if (elements.textAlign) elements.textAlign.addEventListener('change', handleGlobalStyleChange);

  // 배경 이미지 초기화 버튼 이벤트 리스너
  const bgResetBtn = document.getElementById('bgimg-reset');
  if (bgResetBtn) {
    bgResetBtn.addEventListener('click', resetBackgroundImage);
  }

  // 초기 슬라이더 값 표시
  updateSliderDisplays();
}

// 설정 초기화 함수
function resetGlobalSettings() {
  // 기본값 정의
  const defaultSettings = {
    bgColor: '#ffffff',
    bgImage: '',
    shadowBlur: 8,
    shadowColor: '#000000',
    shadowOpacity: 20,
    fontSize: 16,
    letterSpacing: 0,
    lineHeight: 1.5,
    wordBreak: 'normal',
    textAlign: 'justify'
  };

  // AppState 업데이트
  AppState.globalStyles = { ...defaultSettings };

  // UI 요소에 초기값 적용
  const elements = getGlobalStyleElements();
  if (elements.bgColor) elements.bgColor.value = defaultSettings.bgColor;
  if (elements.bgImage) elements.bgImage.value = defaultSettings.bgImage;
  if (elements.shadowBlur) elements.shadowBlur.value = defaultSettings.shadowBlur;
  if (elements.shadowColor) elements.shadowColor.value = defaultSettings.shadowColor;
  if (elements.shadowOpacity) elements.shadowOpacity.value = defaultSettings.shadowOpacity;
  if (elements.fontSize) elements.fontSize.value = defaultSettings.fontSize;
  if (elements.letterSpacing) elements.letterSpacing.value = defaultSettings.letterSpacing;
  if (elements.lineHeight) elements.lineHeight.value = defaultSettings.lineHeight;
  if (elements.wordBreak) elements.wordBreak.value = defaultSettings.wordBreak;
  if (elements.textAlign) elements.textAlign.value = defaultSettings.textAlign;

  // 슬라이더 값 표시 업데이트
  updateSliderDisplays();

  // 미리보기에 스타일 적용
  applyGlobalStylesToPreview();

  // localStorage에 저장
  if (typeof saveGlobalStyles === 'function') {
    saveGlobalStyles();
  }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
  initGlobalStyleListeners();

  // 초기 스타일 적용
  applyGlobalStylesToPreview();
});
