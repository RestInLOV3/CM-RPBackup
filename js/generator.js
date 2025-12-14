// 'ㄴ' 뒤의 텍스트에서 언급된 이름 패턴 분석 (빈도 기반)
function analyzeMentionedNamePatterns(samples) {
  const patternFrequency = new Map();

  // 각 샘플에서 가능한 이름 길이를 1~5단어로 시도
  for (const sample of samples) {
    const words = sample.split(/\s+/);

    // 1단어부터 5단어까지 모두 시도
    for (let len = 1; len <= Math.min(5, words.length); len++) {
      const pattern = words.slice(0, len).join(" ");

      // 빈도 증가
      patternFrequency.set(pattern, (patternFrequency.get(pattern) || 0) + 1);
    }
  }

  // 빈도순 정렬
  const sortedPatterns = Array.from(patternFrequency.entries()).sort(
    (a, b) => b[1] - a[1]
  );

  console.log("[MentionedNames] 패턴 빈도:", sortedPatterns);

  // 최소 2회 이상 등장한 패턴 수집
  const candidatePatterns = [];
  const minFrequency = 2;

  for (const [pattern, freq] of sortedPatterns) {
    if (freq >= minFrequency) {
      candidatePatterns.push(pattern);
    }
  }

  // 포함 관계 확인: 한 패턴이 다른 패턴의 시작 부분이면 제거
  // 가장 긴 패턴만 남기기
  const validPatterns = [];

  for (const pattern of candidatePatterns) {
    // 현재 패턴보다 긴 패턴 중에서, 현재 패턴으로 시작하는 것이 있는지 확인
    const hasLongerPattern = candidatePatterns.some((other) => {
      return other.length > pattern.length && other.startsWith(pattern + " ");
    });

    // 더 긴 패턴이 없으면 유효한 패턴으로 추가
    if (!hasLongerPattern) {
      validPatterns.push(pattern);
    }
  }

  console.log("[MentionedNames] 통합 후 패턴:", validPatterns);

  // 가장 긴 것부터 반환 (긴 이름을 우선 매칭하기 위해)
  return validPatterns.sort(
    (a, b) => b.split(/\s+/).length - a.split(/\s+/).length
  );
}

// 언급된 이름과 실제 이름의 매핑 생성
function createMentionToRealNameMapping(mentionedPatterns, allNames) {
  const mapping = {};

  // 각 언급된 패턴에 대해 가장 유사한 실제 이름 찾기
  for (const mentioned of mentionedPatterns) {
    let bestMatch = null;
    let bestScore = 0;

    for (const realName of allNames) {
      // 유사도 점수 계산
      let score = 0;

      // 1. 완전 일치
      if (mentioned === realName) {
        score = 1000;
      }
      // 2. 실제 이름이 언급된 이름으로 시작
      else if (realName.startsWith(mentioned)) {
        score = 100 + mentioned.length;
      }
      // 3. 언급된 이름이 실제 이름으로 시작
      else if (mentioned.startsWith(realName)) {
        score = 90 + realName.length;
      }
      // 4. 언급된 이름에 실제 이름이 포함
      else if (mentioned.includes(realName)) {
        score = 50 + realName.length;
      }
      // 5. 실제 이름에 언급된 이름이 포함
      else if (realName.includes(mentioned)) {
        score = 40 + mentioned.length;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = realName;
      }
    }

    if (bestMatch) {
      mapping[mentioned] = bestMatch;
      console.log(
        `[Mapping] "${mentioned}" → "${bestMatch}" (score: ${bestScore})`
      );
    }
  }

  return mapping;
}

// 대화 쌍 추출 ('ㄴ상대이름' 형식 파싱)
function extractConversationPairs(data) {
  const pairsMap = {};

  // 먼저 모든 이름 목록 추출
  const allNames = [...new Set(data.map((row) => row.name))];

  // 1단계: 'ㄴ' 뒤의 텍스트 샘플 수집 (모든 댓글)
  const mentionSamples = [];

  for (const row of data) {
    const content = row.content;
    if (content.startsWith("ㄴ")) {
      const contentAfterMarker = content.substring(1).trim();
      if (contentAfterMarker) {
        // 인용부호, 괄호 등 메시지 구분자 전까지만 추출
        const separators = /["'`()[\]{}]/;
        const separatorIndex = contentAfterMarker.search(separators);
        const sample = separatorIndex === -1
          ? contentAfterMarker
          : contentAfterMarker.substring(0, separatorIndex).trim();

        if (sample) {
          mentionSamples.push(sample);
        }
      }
    }
  }

  console.log(`[MentionedNames] 수집된 샘플: ${mentionSamples.length}개`);

  // 2단계: 언급된 이름 패턴 분석
  let mentionedPatterns = [];
  let mentionToRealName = {};

  if (mentionSamples.length > 0) {
    mentionedPatterns = analyzeMentionedNamePatterns(mentionSamples);
    console.log("[MentionedNames] 확정된 패턴:", mentionedPatterns);

    // 3단계: 언급된 이름 → 실제 이름 매핑 생성
    mentionToRealName = createMentionToRealNameMapping(
      mentionedPatterns,
      allNames
    );
  }

  // 4단계: 대화 쌍 추출 (언급 패턴 우선, 그 다음 실제 이름)
  for (const row of data) {
    const content = row.content;
    const name = row.name;

    // 'ㄴ'으로 시작하는지 확인
    if (content.startsWith("ㄴ")) {
      const contentAfterMarker = content.substring(1).trim();

      let targetName = null;

      // 먼저 언급된 패턴에서 찾기 (가장 긴 것부터)
      for (const mentionedPattern of mentionedPatterns) {
        if (contentAfterMarker.startsWith(mentionedPattern)) {
          // 매핑된 실제 이름 사용
          targetName = mentionToRealName[mentionedPattern] || mentionedPattern;
          break;
        }
      }

      // 언급 패턴에서 못 찾았으면 실제 이름 목록에서 찾기 (기존 방식)
      if (!targetName) {
        const sortedNames = [...allNames].sort((a, b) => b.length - a.length);
        for (const candidateName of sortedNames) {
          if (contentAfterMarker.startsWith(candidateName)) {
            targetName = candidateName;
            break;
          }
        }
      }

      if (targetName) {
        // 양방향 매핑 추가
        if (!pairsMap[targetName]) {
          pairsMap[targetName] = new Set();
        }
        pairsMap[targetName].add(name);

        if (!pairsMap[name]) {
          pairsMap[name] = new Set();
        }
        pairsMap[name].add(targetName);
      }
    }
  }

  // Set을 배열로 변환
  const result = {};
  for (const [name, partnersSet] of Object.entries(pairsMap)) {
    result[name] = Array.from(partnersSet);
  }

  return result;
}

// 상대방 드롭다운 업데이트
function updatePartnerDropdown(changed, selectedChar) {
  if (!selectedChar) return;

  const partners = AppState.conversationPairsMap[selectedChar] || [];
  const targetSelect =
    changed === "me"
      ? document.getElementById("youCharacter")
      : document.getElementById("meCharacter");

  const currentValue = targetSelect.value;

  targetSelect.innerHTML = '<option value="">선택하세요</option>';

  partners.forEach((partner) => {
    const option = document.createElement("option");
    option.value = partner;
    option.textContent = partner;
    targetSelect.appendChild(option);
  });

  // 이전 선택값이 새 목록에 있으면 유지
  if (partners.includes(currentValue)) {
    targetSelect.value = currentValue;
  }
}

// 데이터로 자동 생성 (CSV, XLSX, TXT 자동 감지)
function generateFromData() {
  if (!AppState.currentFileType) {
    alert("먼저 파일을 불러와주세요.");
    return;
  }

  if (AppState.currentFileType === "csv") {
    generateFromCSV();
  } else if (AppState.currentFileType === "xlsx") {
    generateFromXLSX();
  } else if (AppState.currentFileType === "txt") {
    generateFromTXT();
  }
}

// CSV 데이터로 자동 생성
function generateFromCSV() {
  const meChar = document.getElementById("meCharacter").value;
  const youChars = getAllYouCharacters();

  if (!meChar || youChars.length === 0) {
    alert("ME와 최소 1명의 YOU 캐릭터를 선택해주세요.");
    return;
  }

  if (AppState.csvData.length === 0) {
    alert("먼저 CSV 파일을 불러와주세요.");
    return;
  }

  // 기존 미리보기 초기화
  document.getElementById("preview").innerHTML = "";

  // CSV 데이터 순서대로 말풍선 생성
  AppState.csvData.forEach((row) => {
    const username = row.username;
    const message = row.message;

    if (!username || !message) return;

    let bg, color;
    let classSuffix = "";
    let characterId = "";
    let isMe = false;

    if (username === meChar) {
      const meColors = getMeColors();
      bg = meColors.bg;
      color = meColors.color;
      classSuffix = "me-auto"; // 자동 생성 ME는 별도 클래스
      characterId = "meCharacter_auto";
      isMe = true;
    } else if (youChars.includes(username)) {
      // username으로 YOU ID 찾아서 해당 색상 가져오기
      const youId = getYouIdByUsername(username);
      if (youId) {
        const colors = getYouColors(youId);
        bg = colors.bg;
        color = colors.color;
        classSuffix = getYouClassSuffix(youId);
        characterId = youId;
      } else {
        bg = "#292929";
        color = "#ffffff";
        classSuffix = "you";
        characterId = "youCharacter";
      }
    } else {
      return; // 선택된 캐릭터가 아니면 스킵
    }

    const div = document.createElement("div");
    div.className = "speech-bubble speech-bubble-" + classSuffix;
    div.innerText = message;
    div.contentEditable = true;
    div.style.backgroundColor = bg;
    div.style.color = color;
    div.dataset.source = "auto"; // 자동 생성 표시
    div.addEventListener("input", updateOutputFromPreview);

    // 메시지 컨테이너 생성 (프로필 이미지 + 이름 + 말풍선)
    const container = createMessageContainer(div, username, characterId, isMe);

    document.getElementById("preview").appendChild(container);
  });

  // 연속 메시지 감지 및 프로필 표시 업데이트
  updateMessageContainers();

  updateAfterStyles();
  updateOutputFromPreview();

  // localStorage에 저장
  if (typeof savePreviewHTML === "function") {
    savePreviewHTML();
  }
}

// TXT 데이터로 자동 생성
function generateFromTXT() {
  const meChar = document.getElementById("meCharacter").value;
  const youChars = getAllYouCharacters();

  if (!meChar || youChars.length === 0) {
    alert("ME와 최소 1명의 YOU 캐릭터를 선택해주세요.");
    return;
  }

  if (AppState.txtData.length === 0) {
    alert("먼저 TXT 파일을 불러와주세요.");
    return;
  }

  // 기존 미리보기 초기화
  document.getElementById("preview").innerHTML = "";

  // TXT 데이터 순서대로 말풍선 생성
  AppState.txtData.forEach((row) => {
    const username = row.username;
    const message = row.message;

    if (!username || !message) return;

    let bg, color;
    let classSuffix = "";
    let characterId = "";
    let isMe = false;

    if (username === meChar) {
      const meColors = getMeColors();
      bg = meColors.bg;
      color = meColors.color;
      classSuffix = "me-auto"; // 자동 생성 ME는 별도 클래스
      characterId = "meCharacter_auto";
      isMe = true;
    } else if (youChars.includes(username)) {
      // username으로 YOU ID 찾아서 해당 색상 가져오기
      const youId = getYouIdByUsername(username);
      if (youId) {
        const colors = getYouColors(youId);
        bg = colors.bg;
        color = colors.color;
        classSuffix = getYouClassSuffix(youId);
        characterId = youId;
      } else {
        bg = "#292929";
        color = "#ffffff";
        classSuffix = "you";
        characterId = "youCharacter";
      }
    } else {
      return; // 선택된 캐릭터가 아니면 스킵
    }

    const div = document.createElement("div");
    div.className = "speech-bubble speech-bubble-" + classSuffix;
    div.innerText = message;
    div.contentEditable = true;
    div.style.backgroundColor = bg;
    div.style.color = color;
    div.dataset.source = "auto"; // 자동 생성 표시
    div.addEventListener("input", updateOutputFromPreview);

    // 메시지 컨테이너 생성 (프로필 이미지 + 이름 + 말풍선)
    const container = createMessageContainer(div, username, characterId, isMe);

    document.getElementById("preview").appendChild(container);
  });

  // 연속 메시지 감지 및 프로필 표시 업데이트
  updateMessageContainers();

  updateAfterStyles();
  updateOutputFromPreview();

  // localStorage에 저장
  if (typeof savePreviewHTML === "function") {
    savePreviewHTML();
  }
}

// XLSX 데이터로 자동 생성
function generateFromXLSX() {
  const meChar = document.getElementById("meCharacter").value;
  const youChars = getAllYouCharacters();

  if (!meChar || youChars.length === 0) {
    alert("ME와 최소 1명의 YOU 캐릭터를 선택해주세요.");
    return;
  }

  if (AppState.xlsxData.length === 0) {
    alert("먼저 XLSX 파일을 불러와주세요.");
    return;
  }

  // 기존 미리보기 초기화
  document.getElementById("preview").innerHTML = "";

  // 선택된 캐릭터 쌍
  const pairCharacters = [meChar, ...youChars];

  // 먼저 모든 이름 목록 추출
  const allNames = [...new Set(AppState.xlsxData.map((row) => row.name))];

  // 1단계: 'ㄴ' 뒤의 텍스트 샘플 수집 (모든 댓글)
  const mentionSamples = [];
  for (const row of AppState.xlsxData) {
    const content = row.content;
    if (content.startsWith("ㄴ")) {
      const contentAfterMarker = content.substring(1).trim();
      if (contentAfterMarker) {
        // 인용부호, 괄호 등 메시지 구분자 전까지만 추출
        const separators = /["'`()[\]{}]/;
        const separatorIndex = contentAfterMarker.search(separators);
        const sample = separatorIndex === -1
          ? contentAfterMarker
          : contentAfterMarker.substring(0, separatorIndex).trim();

        if (sample) {
          mentionSamples.push(sample);
        }
      }
    }
  }

  console.log(`[Generator] 수집된 샘플: ${mentionSamples.length}개`);

  // 2단계: 언급된 이름 패턴 분석
  let mentionedPatterns = [];
  let mentionToRealName = {};

  if (mentionSamples.length > 0 && typeof analyzeMentionedNamePatterns === "function") {
    mentionedPatterns = analyzeMentionedNamePatterns(mentionSamples);
    console.log("[Generator] 확정된 패턴:", mentionedPatterns);

    // 3단계: 언급된 이름 → 실제 이름 매핑 생성
    if (typeof createMentionToRealNameMapping === "function") {
      mentionToRealName = createMentionToRealNameMapping(mentionedPatterns, allNames);
    }
  }

  // 대화 구조 만들기
  const conversations = [];
  let currentConversation = null;

  AppState.xlsxData.forEach((row) => {
    const name = row.name;
    const content = row.content;

    // 두 캐릭터 중 하나인지 확인
    if (!pairCharacters.includes(name)) return;

    if (content.startsWith("ㄴ")) {
      const contentAfterMarker = content.substring(1).trim();
      let targetName = null;
      let actualContent = contentAfterMarker;

      // 먼저 언급된 패턴에서 찾기 (가장 긴 것부터)
      for (const mentionedPattern of mentionedPatterns) {
        if (contentAfterMarker.startsWith(mentionedPattern)) {
          // 매핑된 실제 이름 사용
          targetName = mentionToRealName[mentionedPattern] || mentionedPattern;
          actualContent = contentAfterMarker
            .substring(mentionedPattern.length)
            .trim();
          break;
        }
      }

      // 언급 패턴에서 못 찾았으면 실제 이름 목록에서 찾기 (기존 방식)
      if (!targetName) {
        const sortedNames = [...allNames].sort((a, b) => b.length - a.length);
        for (const candidateName of sortedNames) {
          if (contentAfterMarker.startsWith(candidateName)) {
            targetName = candidateName;
            actualContent = contentAfterMarker
              .substring(candidateName.length)
              .trim();
            break;
          }
        }
      }

      // targetName 없으면 위로 올라가서 'ㄴ'으로 시작하지 않는 메시지의 발화자 찾기
      if (!targetName) {
        const currentIndex = AppState.xlsxData.indexOf(row);

        // 위로 올라가면서 'ㄴ'으로 시작하지 않는 메시지 찾기
        for (let i = currentIndex - 1; i >= 0; i--) {
          const prevRow = AppState.xlsxData[i];
          if (!prevRow.content.startsWith("ㄴ")) {
            targetName = prevRow.name;
            actualContent = contentAfterMarker.trim();
            break;
          }
        }
      }

      if (
        currentConversation &&
        targetName &&
        pairCharacters.includes(targetName)
      ) {
        currentConversation.replies.push({
          name: name,
          content: actualContent,
        });
      }
    } else {
      // 새 대화 시작
      currentConversation = {
        name: name,
        content: content,
        replies: [],
      };
      conversations.push(currentConversation);
    }
  });

  // 말풍선 생성
  conversations.forEach((conv) => {
    // 원 댓글
    let who = "";
    if (conv.name === meChar) {
      who = "me";
    } else if (youChars.includes(conv.name)) {
      who = "you";
    }

    if (who) {
      addBubbleToPreview(who, conv.content, conv.name, meChar);
    }

    // 답글들
    conv.replies.forEach((reply) => {
      let replyWho = "";
      if (reply.name === meChar) {
        replyWho = "me";
      } else if (youChars.includes(reply.name)) {
        replyWho = "you";
      }

      if (replyWho) {
        addBubbleToPreview(replyWho, reply.content, reply.name, meChar);
      }
    });
  });

  // 연속 메시지 감지 및 프로필 표시 업데이트
  updateMessageContainers();

  updateAfterStyles();
  updateOutputFromPreview();

  // localStorage에 저장
  if (typeof savePreviewHTML === "function") {
    savePreviewHTML();
  }
}
