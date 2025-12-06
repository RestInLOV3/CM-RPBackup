// XLSX용 초기 캐릭터 드롭다운 채우기
function populateInitialCharacterDropdowns() {
  // YOU 카운터 초기화
  AppState.youCount = 1;

  // ME 색상 입력 필드 추가 (기존에 없으면)
  const meCharacterSelect = document.getElementById("meCharacter");
  const meContainer = meCharacterSelect.parentElement;

  // 기존 색상 입력 필드가 없으면 추가
  if (!document.getElementById("meBg_auto")) {
    const meColorDiv = document.createElement("div");
    meColorDiv.style.display = "flex";
    meColorDiv.style.alignItems = "center";
    meColorDiv.style.gap = "5px";
    meColorDiv.style.marginTop = "5px";
    meColorDiv.innerHTML = `
      <label style="margin: 0; font-size: 12px;">ME 배경: <input type="color" id="meBg_auto" value="#f0f0f0" style="width: 40px; height: 25px;" /></label>
      <label style="margin: 0; font-size: 12px;">ME 글자: <input type="color" id="meColor_auto" value="#333333" style="width: 40px; height: 25px;" /></label>
    `;
    meContainer.appendChild(meColorDiv);
  }

  // YOU 컨테이너 초기화
  const container = document.getElementById("youCharactersContainer");
  container.innerHTML = `<div style="display: flex; align-items: center; gap: 5px; margin-bottom: 5px;">
    <label style="margin: 0;">
      YOU:
      <select id="youCharacter">
        <option value="">선택하세요</option>
      </select>
    </label>
    <label style="margin: 0; font-size: 12px;">배경: <input type="color" id="youBg_youCharacter" value="#292929" style="width: 40px; height: 25px;" /></label>
    <label style="margin: 0; font-size: 12px;">글자: <input type="color" id="youColor_youCharacter" value="#ffffff" style="width: 40px; height: 25px;" /></label>
  </div>`;

  // 초기 YOU 색상 저장
  AppState.youColors = {
    youCharacter: { bg: "#292929", color: "#ffffff" },
  };

  const meSelect = document.getElementById("meCharacter");
  const youSelect = document.getElementById("youCharacter");

  // 모든 캐릭터 이름 추출
  const allCharacters = Object.keys(AppState.conversationPairsMap).sort();

  meSelect.innerHTML = '<option value="">선택하세요</option>';
  youSelect.innerHTML = '<option value="">선택하세요</option>';

  allCharacters.forEach((char) => {
    const option1 = document.createElement("option");
    option1.value = char;
    option1.textContent = char;
    meSelect.appendChild(option1);

    const option2 = document.createElement("option");
    option2.value = char;
    option2.textContent = char;
    youSelect.appendChild(option2);
  });

  // 기존 이벤트 리스너 제거를 위해 복제
  const newMeSelect = meSelect.cloneNode(true);
  const newYouSelect = youSelect.cloneNode(true);
  meSelect.parentNode.replaceChild(newMeSelect, meSelect);
  youSelect.parentNode.replaceChild(newYouSelect, youSelect);

  // ME 선택 시 YOU 드롭다운 업데이트
  document
    .getElementById("meCharacter")
    .addEventListener("change", function () {
      updatePartnerDropdown("me", this.value);
      updateAllDropdowns();
    });

  // YOU 선택 시 ME 드롭다운 업데이트
  document
    .getElementById("youCharacter")
    .addEventListener("change", function () {
      updatePartnerDropdown("you", this.value);
      updateAllDropdowns();
    });

  // 자동 생성 색상 입력 필드에 이벤트 리스너 추가
  attachAutoColorListeners();
}

// 드롭다운에 캐릭터 이름 추가
function populateCharacterDropdowns(characters) {
  const meSelect = document.getElementById("meCharacter");
  const youSelect = document.getElementById("youCharacter");

  // 이벤트 리스너 제거를 위해 요소 복제
  const newMeSelect = meSelect.cloneNode(false);
  const newYouSelect = youSelect.cloneNode(false);

  meSelect.parentNode.replaceChild(newMeSelect, meSelect);
  youSelect.parentNode.replaceChild(newYouSelect, youSelect);

  // 기존 옵션 제거 (첫 번째 "선택하세요" 제외)
  newMeSelect.innerHTML = '<option value="">선택하세요</option>';
  newYouSelect.innerHTML = '<option value="">선택하세요</option>';

  // ID 유지
  newMeSelect.id = "meCharacter";
  newYouSelect.id = "youCharacter";

  characters.forEach((char) => {
    const option1 = document.createElement("option");
    option1.value = char;
    option1.textContent = char;
    newMeSelect.appendChild(option1);

    const option2 = document.createElement("option");
    option2.value = char;
    option2.textContent = char;
    newYouSelect.appendChild(option2);
  });
}

// 모든 드롭다운 업데이트 (이미 선택된 캐릭터 비활성화)
function updateAllDropdowns() {
  const selectedChars = getAllSelectedCharacters();

  // ME 드롭다운 업데이트
  const meSelect = document.getElementById("meCharacter");
  const currentMeValue = meSelect.value;

  for (const option of meSelect.options) {
    if (option.value === "") continue;
    // 현재 선택된 값이 아니고, 다른 곳에서 선택된 값이면 비활성화
    option.disabled =
      option.value !== currentMeValue && selectedChars.includes(option.value);
  }

  // 모든 YOU 드롭다운 업데이트
  const youIds = getAllYouCharacterIds();
  for (const youId of youIds) {
    const youSelect = document.getElementById(youId);
    if (!youSelect) continue;

    const currentYouValue = youSelect.value;

    for (const option of youSelect.options) {
      if (option.value === "") continue;
      // 현재 선택된 값이 아니고, 다른 곳에서 선택된 값이면 비활성화
      option.disabled =
        option.value !== currentYouValue &&
        selectedChars.includes(option.value);
    }
  }
}

// YOU 캐릭터 추가
function addYouCharacter() {
  const meChar = document.getElementById("meCharacter").value;
  if (!meChar) {
    alert("먼저 ME 캐릭터를 선택해주세요.");
    return;
  }

  // 이미 선택된 모든 YOU 캐릭터 가져오기
  const selectedYouChars = getAllYouCharacters();

  // 새로운 YOU로 추가 가능한 캐릭터 계산
  // 조건: ME의 파트너이면서, 이미 선택된 모든 YOU들의 파트너여야 함
  let availablePartners = AppState.conversationPairsMap[meChar] || [];

  // 이미 선택된 YOU들과 모두 연결되어 있는 파트너만 필터링
  for (const youChar of selectedYouChars) {
    const youPartners = AppState.conversationPairsMap[youChar] || [];
    availablePartners = availablePartners.filter((partner) =>
      youPartners.includes(partner)
    );
  }

  // 이미 선택된 캐릭터 제외
  availablePartners = availablePartners.filter(
    (partner) => !selectedYouChars.includes(partner)
  );

  // 추가 가능한 파트너가 없으면 알림
  if (availablePartners.length === 0) {
    alert("추가할 수 있는 대화 상대가 없습니다.");
    return;
  }

  const container = document.getElementById("youCharactersContainer");

  // 첫 번째 클릭: YOU를 YOU1로 변경
  if (AppState.youCount === 1) {
    const firstDiv = container.querySelector("div");
    const firstLabel = firstDiv.querySelector("label");
    firstLabel.childNodes[0].textContent = "YOU1: ";
  }

  // 새로운 YOU 추가
  AppState.youCount++;
  const newDiv = document.createElement("div");
  newDiv.style.display = "flex";
  newDiv.style.alignItems = "center";
  newDiv.style.gap = "5px";
  newDiv.style.marginBottom = "5px";

  // 기본 색상 설정 (이전 YOU와 다른 색상)
  const colorIndex = (AppState.youCount - 1) % DEFAULT_YOU_COLORS.length;
  const defaultColor = DEFAULT_YOU_COLORS[colorIndex];

  newDiv.innerHTML = `<label style="margin: 0;">
    YOU${AppState.youCount}:
    <select id="youCharacter${AppState.youCount}">
      <option value="">선택하세요</option>
    </select>
  </label>
  <label style="margin: 0; font-size: 12px;">배경: <input type="color" id="youBg_youCharacter${AppState.youCount}" value="${defaultColor.bg}" style="width: 40px; height: 25px;" /></label>
  <label style="margin: 0; font-size: 12px;">글자: <input type="color" id="youColor_youCharacter${AppState.youCount}" value="${defaultColor.color}" style="width: 40px; height: 25px;" /></label>`;

  container.appendChild(newDiv);

  // 색상 저장
  AppState.youColors[`youCharacter${AppState.youCount}`] = {
    bg: defaultColor.bg,
    color: defaultColor.color,
  };

  // 새로운 드롭다운에 옵션 추가 (완전 연결된 파트너만)
  const newSelect = document.getElementById(`youCharacter${AppState.youCount}`);
  availablePartners.forEach((partner) => {
    const option = document.createElement("option");
    option.value = partner;
    option.textContent = partner;
    newSelect.appendChild(option);
  });

  // 새로운 드롭다운에 이벤트 리스너 추가
  newSelect.addEventListener("change", function () {
    updatePartnerDropdown("you", this.value);
    updateAllDropdowns();
  });

  // 이미 선택된 캐릭터 비활성화
  updateAllDropdowns();

  // 새로운 YOU 색상 입력 필드에 이벤트 리스너 추가
  attachAutoColorListeners();
}

// 말풍선 추가 (수동 입력)
function addBubble(who) {
  let text = document.getElementById(who + "Text").value.trim();
  if (!text) return;
  let bg = document.getElementById(who + "Bg").value;
  let color = document.getElementById(who + "Color").value;

  let div = document.createElement("div");
  div.className = "speech-bubble speech-bubble-" + who;
  div.innerText = text;
  div.contentEditable = true;
  div.style.backgroundColor = bg;
  div.style.color = color;
  div.dataset.source = "manual"; // 수동 입력 표시
  div.addEventListener("input", updateOutputFromPreview);

  document.getElementById("preview").appendChild(div);
  updateAfterStyles();
  updateOutputFromPreview();
  document.getElementById(who + "Text").value = "";
}

// 미리보기에 말풍선 추가 (헬퍼 함수)
function addBubbleToPreview(who, text, username, meChar) {
  let bg, color;
  let classSuffix = "";

  if (who === "me") {
    const meColors = getMeColors();
    bg = meColors.bg;
    color = meColors.color;
    classSuffix = "me-auto"; // 자동 생성 ME는 별도 클래스
  } else if (who === "you") {
    // username으로 YOU ID 찾아서 해당 색상 가져오기
    const youId = getYouIdByUsername(username);
    if (youId) {
      const colors = getYouColors(youId);
      bg = colors.bg;
      color = colors.color;
      classSuffix = getYouClassSuffix(youId);
    } else {
      bg = "#292929";
      color = "#ffffff";
      classSuffix = "you";
    }
  }

  const div = document.createElement("div");
  div.className = "speech-bubble speech-bubble-" + classSuffix;
  div.innerText = text;
  div.contentEditable = true;
  div.style.backgroundColor = bg;
  div.style.color = color;
  div.dataset.source = "auto"; // 자동 생성 표시
  div.addEventListener("input", updateOutputFromPreview);

  document.getElementById("preview").appendChild(div);
}
