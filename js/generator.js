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

  // 대화 구조 만들기
  const conversations = [];
  let currentConversation = null;

  AppState.xlsxData.forEach((row) => {
    const name = row.name;
    const content = row.content;

    // 두 캐릭터 중 하나인지 확인
    if (!pairCharacters.includes(name)) return;

    if (content.startsWith("ㄴ")) {
      const contentAfterMarker = content.substring(1); // 'ㄴ' 제거
      let targetName = null;
      let actualContent = contentAfterMarker;

      // 이름 목록에서 가장 긴 매칭부터 시도
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

      // targetName 없으면 현재 대화의 원 발화자를 기본으로
      if (!targetName && currentConversation) {
        targetName = currentConversation.name;
        actualContent = contentAfterMarker.trim(); // 이름 없이 바로 내용
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
