// 데이터 저장 변수
let csvData = [];
let xlsxData = [];
let txtData = [];
let conversationPairsMap = {}; // 캐릭터 이름 -> 대화 상대 목록
let currentFileType = null; // 현재 로드된 파일 타입 ('csv', 'xlsx', 'txt')
let youCount = 1; // YOU 캐릭터 개수 (1부터 시작)
let maxCharacters = 0; // 최대 캐릭터 수 (파일 로드 시 설정)
let youColors = {}; // YOU별 색상 저장 { youCharacter: {bg: '#...', color: '#...'}, ... }

const styleBlock = `<style>
.speech-bubble { position: relative; padding: 15px 20px; border-radius: 20px; box-shadow: 0 4px 8px rgba(0,0,0,0.2); line-height:1.5; display:block; width:fit-content; max-width:60%; word-wrap:break-word; white-space:normal; margin-bottom:5px; text-align:justify; font-family:kopub돋움L; }
.speech-bubble-you { background:#292929; color:#fff; margin-left:30px; }
.speech-bubble-you:after { content:""; position:absolute; left:-16px; top:50%; transform:translateY(-50%); width:0; height:0; border:9px solid transparent; border-right-color:#292929; }
.speech-bubble-me { background:#f0f0f0; color:#333; margin-left:auto; margin-right:30px; }
.speech-bubble-me:after { content:""; position:absolute; right:-16px; top:50%; transform:translateY(-50%); width:0; height:0; border:9px solid transparent; border-left-color:#f0f0f0; }
.speech-bubble-you + .speech-bubble-me, .speech-bubble-me + .speech-bubble-you { margin-top:20px; }
</style><br><br>`;

// 파일 로드 (CSV, XLSX, TXT 자동 감지)
function loadFile() {
  const fileInput = document.getElementById("dataFile");
  const file = fileInput.files[0];

  if (!file) {
    alert("파일을 선택해주세요.");
    return;
  }

  // 파일 확장자로 타입 감지
  const fileName = file.name.toLowerCase();
  if (fileName.endsWith(".csv")) {
    currentFileType = "csv";
    loadCSV(file);
  } else if (fileName.endsWith(".xlsx")) {
    currentFileType = "xlsx";
    loadXLSX(file);
  } else if (fileName.endsWith(".txt") || fileName.endsWith(".eml")) {
    currentFileType = "txt";
    loadTXT(file);
  } else {
    alert(
      "지원하지 않는 파일 형식입니다. CSV, XLSX, TXT, EML 파일을 선택해주세요."
    );
  }
}

// CSV 파일 로드 및 파싱
function loadCSV(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    parseCSV(text);
  };
  reader.readAsText(file);
}

// XLSX 파일 로드 및 파싱
function loadXLSX(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });

    // 첫 번째 시트 읽기
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // JSON으로 변환
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    parseXLSX(jsonData);
  };
  reader.readAsArrayBuffer(file);
}

// TXT 파일 로드 및 파싱
function loadTXT(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    parseTXT(text);
  };
  reader.readAsText(file, "UTF-8");
}

// CSV 한 줄 파싱 (따옴표 처리 포함)
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // 이스케이프된 따옴표 ("")
        current += '"';
        i++; // 다음 따옴표 건너뛰기
      } else {
        // 따옴표 시작/종료
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // 따옴표 밖의 쉼표 = 필드 구분자
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  // 마지막 필드 추가
  result.push(current.trim());

  // 필드 양쪽의 따옴표 제거
  return result.map((field) => {
    if (field.startsWith('"') && field.endsWith('"')) {
      return field.slice(1, -1);
    }
    return field;
  });
}

// CSV 파싱
function parseCSV(text) {
  const lines = text.split("\n").filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    alert("CSV 파일이 비어있습니다.");
    return;
  }

  const headers = parseCSVLine(lines[0]);

  csvData = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    csvData.push(row);
  }

  // 캐릭터 이름 추출
  const characters = [...new Set(csvData.map((row) => row.username))].filter(
    (char) => char && char.trim() !== ""
  );

  // 모든 캐릭터가 서로 대화할 수 있도록 전체 매핑 생성
  conversationPairsMap = {};
  for (const char of characters) {
    conversationPairsMap[char] = characters.filter((c) => c !== char);
  }

  // 캐릭터 드롭다운 채우기
  populateInitialCharacterDropdowns();

  alert(`CSV 파일을 불러왔습니다. ${csvData.length}개의 대화가 있습니다.`);
}

// XLSX 파싱
function parseXLSX(jsonData) {
  if (jsonData.length === 0) {
    alert("XLSX 파일이 비어있습니다.");
    return;
  }

  // 데이터 파싱 (첫 번째 행은 헤더이므로 스킵)
  xlsxData = [];
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!row || row.length === 0) continue;

    const commentNumber = row[0];
    const name = row[1];
    const content = row[2];

    if (!name || !content) continue;

    xlsxData.push({
      commentNumber,
      name: String(name).trim(),
      content: String(content).trim(),
    });
  }

  // 대화 쌍 추출
  conversationPairsMap = extractConversationPairs(xlsxData);

  // 캐릭터 드롭다운 채우기
  populateInitialCharacterDropdowns();

  alert(`XLSX 파일을 불러왔습니다. ${xlsxData.length}개의 댓글이 있습니다.`);
}

// TXT 파싱
function parseTXT(text) {
  const lines = text.split("\n");

  if (lines.length === 0) {
    alert("TXT 파일이 비어있습니다.");
    return;
  }

  txtData = [];
  let currentMessage = null;
  let hasOperationPolicy = false;
  let startParsing = false;

  // 먼저 '운영정책 보기'가 있는지 확인
  for (const line of lines) {
    if (line.includes("운영정책 보기")) {
      hasOperationPolicy = true;
      break;
    }
  }

  for (const line of lines) {
    const trimmedLine = line.trim();

    // 빈 줄은 스킵
    if (trimmedLine === "") {
      continue;
    }

    // URL 라인은 스킵
    if (
      trimmedLine.startsWith("http://") ||
      trimmedLine.startsWith("https://")
    ) {
      continue;
    }

    // '운영정책 보기' 이후부터 파싱 시작 (카카오톡 .eml/.txt 형식)
    if (trimmedLine.includes("운영정책 보기")) {
      startParsing = true;
      continue;
    }

    // 카카오톡 대화 헤더 부분은 무시
    if (hasOperationPolicy && !startParsing) {
      if (
        trimmedLine.includes("님과 카카오톡 대화") ||
        trimmedLine.includes("저장한 날짜") ||
        trimmedLine.includes("타인, 기관 등의 사칭") ||
        trimmedLine.includes("운영정책을 위반한")
      ) {
        continue;
      }
    }

    // 날짜 구분선: 2024년 12월 9일 오전 12:39 (메시지 없음)
    const dateSeparatorMatch = trimmedLine.match(
      /^\d+년 \d+월 \d+일\s+(오전|오후)\s+\d+:\d+$/
    );
    if (dateSeparatorMatch) {
      continue; // 날짜 구분선은 무시
    }

    // 시스템 메시지 필터링
    if (
      trimmedLine.includes("채팅방 관리자가") ||
      trimmedLine.includes("님이 들어왔습니다") ||
      trimmedLine.includes("님이 나갔습니다") ||
      trimmedLine.includes("내보냈습니다") ||
      trimmedLine.includes("초대했습니다") ||
      trimmedLine.includes("삭제된 메시지입니다")
    ) {
      continue; // 시스템 메시지는 무시
    }

    // 새 형식: 2024년 8월 28일 오전 12:06, 릴 : 좋은 저녁이에요
    const newFormatMatch = trimmedLine.match(
      /^\d+년 \d+월 \d+일\s+(오전|오후)\s+\d+:\d+,\s*(.+?)\s*:\s*(.*)$/
    );

    // 기존 형식: 2025년 3월 25일 오전 9:09:닉네임:내용
    const oldFormatMatch = trimmedLine.match(
      /^\d+년 \d+월 \d+일\s+(오전|오후)\s+\d+:\d+:(.*)$/
    );

    if (newFormatMatch) {
      // 이전 메시지가 있으면 저장
      if (currentMessage && currentMessage.username && currentMessage.message) {
        txtData.push({
          username: currentMessage.username,
          message: currentMessage.message.trim(),
        });
      }

      // 새 메시지 시작 (새 형식)
      const username = newFormatMatch[2].trim();
      const message = newFormatMatch[3].trim();

      currentMessage = { username, message };
    } else if (oldFormatMatch && !hasOperationPolicy) {
      // 기존 형식은 '운영정책 보기'가 없는 파일에서만
      // 이전 메시지가 있으면 저장
      if (currentMessage && currentMessage.username && currentMessage.message) {
        txtData.push({
          username: currentMessage.username,
          message: currentMessage.message.trim(),
        });
      }

      // 새 메시지 시작 (기존 형식)
      const rest = oldFormatMatch[2]; // "닉네임:내용"
      const colonIndex = rest.indexOf(":");

      if (colonIndex !== -1) {
        const username = rest.substring(0, colonIndex).trim();
        const message = rest.substring(colonIndex + 1).trim();

        currentMessage = { username, message };
      } else {
        currentMessage = null;
      }
    } else {
      // 날짜 패턴이 없으면 이전 메시지에 추가 (줄바꿈 포함)
      if (currentMessage && trimmedLine !== "") {
        currentMessage.message += "\n" + trimmedLine;
      }
    }
  }

  // 마지막 메시지 저장
  if (currentMessage && currentMessage.username && currentMessage.message) {
    txtData.push({
      username: currentMessage.username,
      message: currentMessage.message.trim(),
    });
  }

  // 캐릭터 이름 추출
  const characters = [...new Set(txtData.map((row) => row.username))].filter(
    (char) => char && char.trim() !== ""
  );

  // 모든 캐릭터가 서로 대화할 수 있도록 전체 매핑 생성
  conversationPairsMap = {};
  for (const char of characters) {
    conversationPairsMap[char] = characters.filter((c) => c !== char);
  }

  // 캐릭터 드롭다운 채우기
  populateInitialCharacterDropdowns();

  alert(`TXT 파일을 불러왔습니다. ${txtData.length}개의 대화가 있습니다.`);
}

// 대화 쌍 추출 ('ㄴ상대이름' 형식 파싱)
function extractConversationPairs(data) {
  const pairsMap = {};

  // 먼저 모든 이름 목록 추출
  const allNames = [...new Set(data.map((row) => row.name))];

  for (const row of data) {
    const content = row.content;
    const name = row.name;

    // 'ㄴ'으로 시작하는지 확인
    if (content.startsWith("ㄴ")) {
      // 'ㄴ' 다음 문자열에서 이름 목록에 있는 이름 찾기
      const contentAfterMarker = content.substring(1); // 'ㄴ' 제거

      let targetName = null;
      // 이름 목록에서 가장 긴 매칭부터 시도 (긴 이름이 짧은 이름을 포함할 수 있으므로)
      const sortedNames = [...allNames].sort((a, b) => b.length - a.length);

      for (const candidateName of sortedNames) {
        if (contentAfterMarker.startsWith(candidateName)) {
          targetName = candidateName;
          break;
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

// XLSX용 초기 캐릭터 드롭다운 채우기
function populateInitialCharacterDropdowns() {
  // YOU 카운터 초기화
  youCount = 1;

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
  youColors = {
    youCharacter: { bg: "#292929", color: "#ffffff" },
  };

  const meSelect = document.getElementById("meCharacter");
  const youSelect = document.getElementById("youCharacter");

  // 모든 캐릭터 이름 추출
  const allCharacters = Object.keys(conversationPairsMap).sort();

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

// 상대방 드롭다운 업데이트
function updatePartnerDropdown(changed, selectedChar) {
  if (!selectedChar) return;

  const partners = conversationPairsMap[selectedChar] || [];
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

// 데이터로 자동 생성 (CSV, XLSX, TXT 자동 감지)
function generateFromData() {
  if (!currentFileType) {
    alert("먼저 파일을 불러와주세요.");
    return;
  }

  if (currentFileType === "csv") {
    generateFromCSV();
  } else if (currentFileType === "xlsx") {
    generateFromXLSX();
  } else if (currentFileType === "txt") {
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

  if (csvData.length === 0) {
    alert("먼저 CSV 파일을 불러와주세요.");
    return;
  }

  // 기존 미리보기 초기화
  document.getElementById("preview").innerHTML = "";

  // CSV 데이터 순서대로 말풍선 생성
  csvData.forEach((row) => {
    const username = row.username;
    const message = row.message;

    if (!username || !message) return;

    let bg, color;
    let classSuffix = "";

    if (username === meChar) {
      const meColors = getMeColors();
      bg = meColors.bg;
      color = meColors.color;
      classSuffix = "me-auto"; // 자동 생성 ME는 별도 클래스
    } else if (youChars.includes(username)) {
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

    document.getElementById("preview").appendChild(div);
  });

  updateAfterStyles();
  updateOutputFromPreview();
}

// TXT 데이터로 자동 생성
function generateFromTXT() {
  const meChar = document.getElementById("meCharacter").value;
  const youChars = getAllYouCharacters();

  if (!meChar || youChars.length === 0) {
    alert("ME와 최소 1명의 YOU 캐릭터를 선택해주세요.");
    return;
  }

  if (txtData.length === 0) {
    alert("먼저 TXT 파일을 불러와주세요.");
    return;
  }

  // 기존 미리보기 초기화
  document.getElementById("preview").innerHTML = "";

  // TXT 데이터 순서대로 말풍선 생성
  txtData.forEach((row) => {
    const username = row.username;
    const message = row.message;

    if (!username || !message) return;

    let bg, color;
    let classSuffix = "";

    if (username === meChar) {
      const meColors = getMeColors();
      bg = meColors.bg;
      color = meColors.color;
      classSuffix = "me-auto"; // 자동 생성 ME는 별도 클래스
    } else if (youChars.includes(username)) {
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

    document.getElementById("preview").appendChild(div);
  });

  updateAfterStyles();
  updateOutputFromPreview();
}

// XLSX 데이터로 자동 생성
function generateFromXLSX() {
  const meChar = document.getElementById("meCharacter").value;
  const youChars = getAllYouCharacters();

  if (!meChar || youChars.length === 0) {
    alert("ME와 최소 1명의 YOU 캐릭터를 선택해주세요.");
    return;
  }

  if (xlsxData.length === 0) {
    alert("먼저 XLSX 파일을 불러와주세요.");
    return;
  }

  // 기존 미리보기 초기화
  document.getElementById("preview").innerHTML = "";

  // 선택된 캐릭터 쌍
  const pairCharacters = [meChar, ...youChars];

  // 먼저 모든 이름 목록 추출
  const allNames = [...new Set(xlsxData.map((row) => row.name))];

  // 대화 구조 만들기
  const conversations = [];
  let currentConversation = null;

  xlsxData.forEach((row) => {
    const name = row.name;
    const content = row.content;

    // 두 캐릭터 중 하나인지 확인
    if (!pairCharacters.includes(name)) return;

    // 'ㄴ'으로 시작하면 reply
    if (content.startsWith("ㄴ")) {
      // 'ㄴ' 다음 문자열에서 이름 목록에 있는 이름 찾기
      const contentAfterMarker = content.substring(1); // 'ㄴ' 제거

      let targetName = null;
      let actualContent = content;

      // 이름 목록에서 가장 긴 매칭부터 시도
      const sortedNames = [...allNames].sort((a, b) => b.length - a.length);

      for (const candidateName of sortedNames) {
        if (contentAfterMarker.startsWith(candidateName)) {
          targetName = candidateName;
          // 이름 이후의 실제 내용 추출 (이름 다음의 공백 포함 제거)
          actualContent = contentAfterMarker
            .substring(candidateName.length)
            .trim();
          break;
        }
      }

      // 현재 대화에 reply 추가
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

  updateAfterStyles();
  updateOutputFromPreview();
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
.speech-bubble-me:after {
  content:"";
  position:absolute;
  right:-16px;
  top:50%;
  transform:translateY(-50%);
  width:0; height:0;
  border:9px solid transparent;
  border-left-color: ${meBgManual};
}
.speech-bubble-me-auto {
  background: ${meColors.bg};
  color: ${meColors.color};
  margin-left: auto;
  margin-right: 30px;
}
.speech-bubble-me-auto:after {
  content:"";
  position:absolute;
  right:-16px;
  top:50%;
  transform:translateY(-50%);
  width:0; height:0;
  border:9px solid transparent;
  border-left-color: ${meColors.bg};
}
.speech-bubble-you:after {
  content:"";
  position:absolute;
  left:-16px;
  top:50%;
  transform:translateY(-50%);
  width:0; height:0;
  border:9px solid transparent;
  border-right-color: ${youBgManual};
}`;

  // 자동 생성 YOU 클래스 CSS 생성 (항상 생성)

  const youIds = getAllYouCharacterIds();

  youIds.forEach((youId) => {
    const colors = getYouColors(youId);
    const suffix = getYouClassSuffix(youId);

    css += `
.speech-bubble-${suffix} {
  background: ${colors.bg};
  color: ${colors.color};
  margin-left: 30px;
}
.speech-bubble-${suffix}:after {
  content:"";
  position:absolute;
  left:-16px;
  top:50%;
  transform:translateY(-50%);
  width:0; height:0;
  border:9px solid transparent;
  border-right-color: ${colors.bg};
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

// Enter 키 처리
["me", "you"].forEach((who) => {
  document.getElementById(who + "Text").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addBubble(who);
    }
  });
});

function updateOutputFromPreview() {
  const meBg = document.getElementById("meBg").value;
  const meColor = document.getElementById("meColor").value;
  const youBg = document.getElementById("youBg").value;
  const youColor = document.getElementById("youColor").value;

  // ME 색상 (자동 생성용)
  const meColors = getMeColors();

  let styleBlock = `
<style>
.speech-bubble {
  position: relative;
  padding: 15px 20px;
  border-radius: 20px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  line-height: 1.5;
  display: block;
  width: fit-content;
  max-width: 60%;
  word-wrap: break-word;
  white-space: normal;
  margin-bottom: 5px;
  text-align: justify;
  font-family: kopub돋움L;
}
.speech-bubble-me {
  background: ${meBg};
  color: ${meColor};
  margin-left: auto;
  margin-right: 30px;
}
.speech-bubble-me:after {
  content: "";
  position: absolute;
  right: -16px;
  top: 50%;
  transform: translateY(-50%);
  width: 0; height: 0;
  border: 9px solid transparent;
  border-left-color: ${meBg};
}
.speech-bubble-me-auto {
  background: ${meColors.bg};
  color: ${meColors.color};
  margin-left: auto;
  margin-right: 30px;
}
.speech-bubble-me-auto:after {
  content: "";
  position: absolute;
  right: -16px;
  top: 50%;
  transform: translateY(-50%);
  width: 0; height: 0;
  border: 9px solid transparent;
  border-left-color: ${meColors.bg};
}
.speech-bubble-you {
  background: ${youBg};
  color: ${youColor};
  margin-left: 30px;
}
.speech-bubble-you:after {
  content: "";
  position: absolute;
  left: -16px;
  top: 50%;
  transform: translateY(-50%);
  width: 0; height: 0;
  border: 9px solid transparent;
  border-right-color: ${youBg};
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
  margin-left: 30px;
}
.speech-bubble-${suffix}:after {
  content: "";
  position: absolute;
  left: -16px;
  top: 50%;
  transform: translateY(-50%);
  width: 0; height: 0;
  border: 9px solid transparent;
  border-right-color: ${colors.bg};
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
    .map((d) => d.outerHTML)
    .join("\n");

  document.getElementById("output").value = styleBlock + previewHTML + "\n";
}

// 색상 즉시 반영 (수동 입력용 - manual 소스만)
["meBg", "meColor", "youBg", "youColor"].forEach((id) => {
  document.getElementById(id).addEventListener("input", () => {
    Array.from(document.getElementById("preview").children).forEach((div) => {
      // 수동 입력 말풍선만 업데이트
      if (div.dataset.source !== "manual") return;

      if (div.classList.contains("speech-bubble-me")) {
        div.style.backgroundColor = document.getElementById("meBg").value;
        div.style.color = document.getElementById("meColor").value;
      } else if (div.classList.contains("speech-bubble-you")) {
        div.style.backgroundColor = document.getElementById("youBg").value;
        div.style.color = document.getElementById("youColor").value;
      }
    });
    updateAfterStyles();
    updateOutputFromPreview();
  });
});

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

    // 새 리스너 추가
    document
      .getElementById("meBg_auto")
      .addEventListener("input", updateAutoGeneratedColors);
    document
      .getElementById("meColor_auto")
      .addEventListener("input", updateAutoGeneratedColors);
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

      // 새 리스너 추가
      document
        .getElementById(`youBg_${youId}`)
        .addEventListener("input", updateAutoGeneratedColors);
      document
        .getElementById(`youColor_${youId}`)
        .addEventListener("input", updateAutoGeneratedColors);
    }
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
}

// 복사
function copyCode() {
  const ta = document.getElementById("output");
  ta.select();
  ta.setSelectionRange(0, 99999);
  document.execCommand("copy");
  const btn = document.querySelector(".copy-btn");
  const original = btn.innerText;
  btn.innerText = "복사 완료!";
  setTimeout(() => (btn.innerText = original), 1500);
}

// YOU 캐릭터 추가
function addYouCharacter() {
  const meChar = document.getElementById("meCharacter").value;
  if (!meChar) {
    alert("먼저 ME 캐릭터를 선택해주세요.");
    return;
  }

  const availablePartners = conversationPairsMap[meChar] || [];

  // ME를 제외한 최대 인원 수 체크
  if (youCount >= availablePartners.length) {
    alert(
      `최대 ${availablePartners.length}명의 대화 상대까지만 추가할 수 있습니다.`
    );
    return;
  }

  const container = document.getElementById("youCharactersContainer");

  // 첫 번째 클릭: YOU를 YOU1로 변경
  if (youCount === 1) {
    const firstDiv = container.querySelector("div");
    const firstLabel = firstDiv.querySelector("label");
    firstLabel.childNodes[0].textContent = "YOU1: ";
  }

  // 새로운 YOU 추가
  youCount++;
  const newDiv = document.createElement("div");
  newDiv.style.display = "flex";
  newDiv.style.alignItems = "center";
  newDiv.style.gap = "5px";
  newDiv.style.marginBottom = "5px";

  // 기본 색상 설정 (이전 YOU와 다른 색상)
  const defaultColors = [
    { bg: "#292929", color: "#ffffff" }, // 검정
    { bg: "#4a5568", color: "#ffffff" }, // 진회색
    { bg: "#2d3748", color: "#ffffff" }, // 어두운 회색
    { bg: "#1a365d", color: "#ffffff" }, // 어두운 파랑
    { bg: "#22543d", color: "#ffffff" }, // 어두운 초록
  ];
  const colorIndex = (youCount - 1) % defaultColors.length;
  const defaultColor = defaultColors[colorIndex];

  newDiv.innerHTML = `<label style="margin: 0;">
    YOU${youCount}:
    <select id="youCharacter${youCount}">
      <option value="">선택하세요</option>
    </select>
  </label>
  <label style="margin: 0; font-size: 12px;">배경: <input type="color" id="youBg_youCharacter${youCount}" value="${defaultColor.bg}" style="width: 40px; height: 25px;" /></label>
  <label style="margin: 0; font-size: 12px;">글자: <input type="color" id="youColor_youCharacter${youCount}" value="${defaultColor.color}" style="width: 40px; height: 25px;" /></label>`;

  container.appendChild(newDiv);

  // 색상 저장
  youColors[`youCharacter${youCount}`] = {
    bg: defaultColor.bg,
    color: defaultColor.color,
  };

  // 새로운 드롭다운에 옵션 추가
  const newSelect = document.getElementById(`youCharacter${youCount}`);
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

// 모든 YOU 캐릭터 ID 가져오기
function getAllYouCharacterIds() {
  const ids = ["youCharacter"];
  for (let i = 2; i <= youCount; i++) {
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
  return { bg: "#f0f0f0", color: "#333333" };
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
