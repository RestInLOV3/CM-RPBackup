// 모든 YOU 캐릭터 ID 가져오기
function getAllYouCharacterIds() {
  const ids = ["youCharacter"];
  for (let i = 2; i <= AppState.youCount; i++) {
    ids.push(`youCharacter${i}`);
  }
  return ids;
}

// 모든 YOU 캐릭터 값 가져오기
function getAllYouCharacters() {
  const characters = [];
  const ids = getAllYouCharacterIds();

  for (const id of ids) {
    const select = document.getElementById(id);
    if (select && select.value) {
      characters.push(select.value);
    }
  }

  return characters;
}

// 선택된 모든 캐릭터 가져오기 (ME + 모든 YOU)
function getAllSelectedCharacters() {
  const selected = [];

  const meSelect = document.getElementById("meCharacter");
  if (meSelect && meSelect.value) {
    selected.push(meSelect.value);
  }

  const youChars = getAllYouCharacters();
  selected.push(...youChars);

  return selected;
}

// username으로 YOU ID 찾기
function getYouIdByUsername(username) {
  const youIds = getAllYouCharacterIds();
  for (const youId of youIds) {
    const select = document.getElementById(youId);
    if (select && select.value === username) {
      return youId;
    }
  }
  return null;
}

// YOU ID로 색상 가져오기 (색상 input에서 현재 값 가져오기)
function getYouColors(youId) {
  const bgInput = document.getElementById(`youBg_${youId}`);
  const colorInput = document.getElementById(`youColor_${youId}`);

  if (bgInput && colorInput) {
    return {
      bg: bgInput.value,
      color: colorInput.value,
    };
  }

  // 기본값 반환
  return { bg: "#292929", color: "#ffffff" };
}

// ME 색상 가져오기
function getMeColors() {
  const bgInput = document.getElementById("meBg_auto");
  const colorInput = document.getElementById("meColor_auto");

  if (bgInput && colorInput) {
    return {
      bg: bgInput.value,
      color: colorInput.value,
    };
  }

  // 기본값 반환
  return DEFAULT_ME_COLORS;
}

// YOU ID로 클래스 접미사 가져오기
function getYouClassSuffix(youId) {
  // youCharacter일 때 (항상 you1 반환 - 자동 생성은 항상 수동 입력과 분리)
  if (youId === "youCharacter") {
    return "you1";
  }

  // youCharacter2, youCharacter3 등
  const match = youId.match(/^youCharacter(\d+)$/);
  if (match) {
    return `you${match[1]}`;
  }

  // 기본값
  return "you1";
}

// 복사 기능
function copyCode() {
  const ta = document.getElementById("output");
  navigator.clipboard.writeText(ta.value).then(() => {
    const btn = document.querySelector(".copy-btn");
    const original = btn.innerText;
    btn.innerText = "복사 완료!";
    setTimeout(() => (btn.innerText = original), 1500);
  });
}

// 메시지 컨테이너 생성 (프로필 이미지 + 이름 + 말풍선)
function createMessageContainer(bubbleElement, characterName, characterId, isMe) {
  const container = document.createElement('div');
  container.className = 'message-container ' + (isMe ? 'me' : 'you');

  // 프로필 이미지가 있는지 확인
  const profileImage = AppState.profileImages[characterId];

  // 프로필 이미지
  if (profileImage) {
    const img = document.createElement('img');
    img.className = 'profile-image';
    img.src = profileImage;
    img.alt = characterName;
    container.appendChild(img);
  } else {
    // 기본 프로필 원형
    const defaultProfile = document.createElement('div');
    defaultProfile.className = 'profile-image';
    defaultProfile.style.backgroundColor = '#e0e0e0';
    container.appendChild(defaultProfile);
  }

  // 캐릭터 이름
  const nameDiv = document.createElement('div');
  nameDiv.className = 'character-name';
  nameDiv.textContent = characterName;
  container.appendChild(nameDiv);

  // 말풍선
  container.appendChild(bubbleElement);

  // 메타데이터 저장
  container.dataset.characterId = characterId;
  container.dataset.characterName = characterName;
  container.dataset.isMe = isMe ? 'true' : 'false';

  return container;
}

// 연속된 메시지인지 확인하고 프로필 표시 여부 결정
function updateMessageContainers() {
  const preview = document.getElementById('preview');
  const containers = preview.querySelectorAll('.message-container');

  let previousCharacterId = null;

  containers.forEach((container) => {
    const currentCharacterId = container.dataset.characterId;
    const profileImage = container.querySelector('.profile-image');
    const characterName = container.querySelector('.character-name');

    // 이전 메시지와 같은 캐릭터인지 확인
    if (currentCharacterId === previousCharacterId) {
      // 연속된 메시지: 프로필과 이름 숨김
      if (profileImage) profileImage.style.visibility = 'hidden';
      if (characterName) characterName.style.visibility = 'hidden';
      container.classList.remove('show-profile');
    } else {
      // 새로운 캐릭터: 프로필과 이름 표시
      if (profileImage) profileImage.style.visibility = 'visible';
      if (characterName) characterName.style.visibility = 'visible';
      container.classList.add('show-profile');
    }

    previousCharacterId = currentCharacterId;
  });
}
