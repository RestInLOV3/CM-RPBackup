// 데이터 저장 변수
let csvData = [];
let xlsxData = [];
let conversationPairs = [];

const styleBlock = `<style>
.speech-bubble { position: relative; padding: 15px 20px; border-radius: 20px; box-shadow: 0 4px 8px rgba(0,0,0,0.2); line-height:1.5; display:block; width:fit-content; max-width:60%; word-wrap:break-word; white-space:normal; margin-bottom:5px; text-align:justify; font-family:kopub돋움L; }
.speech-bubble-you { background:#292929; color:#fff; margin-left:30px; }
.speech-bubble-you:after { content:""; position:absolute; left:-16px; top:50%; transform:translateY(-50%); width:0; height:0; border:9px solid transparent; border-right-color:#292929; }
.speech-bubble-me { background:#f0f0f0; color:#333; margin-left:auto; margin-right:30px; }
.speech-bubble-me:after { content:""; position:absolute; right:-16px; top:50%; transform:translateY(-50%); width:0; height:0; border:9px solid transparent; border-left-color:#f0f0f0; }
.speech-bubble-you + .speech-bubble-me, .speech-bubble-me + .speech-bubble-you { margin-top:20px; }
</style><br><br>`;

// 파일 타입에 따라 accept 속성 변경
function updateFileInput() {
  const fileType = document.getElementById("fileType").value;
  const fileInput = document.getElementById("dataFile");

  if (fileType === "csv") {
    fileInput.accept = ".csv";
  } else if (fileType === "xlsx") {
    fileInput.accept = ".xlsx";
  }

  // 파일 선택 초기화
  fileInput.value = "";

  // 드롭다운 초기화
  document.getElementById("conversationPair").innerHTML = '<option value="">선택하세요</option>';
  document.getElementById("meCharacter").innerHTML = '<option value="">선택하세요</option>';
  document.getElementById("youCharacter").innerHTML = '<option value="">선택하세요</option>';

  // 대화 쌍 선택 섹션 숨기기/보이기
  if (fileType === "xlsx") {
    document.getElementById("conversationPairSection").style.display = "block";
  } else {
    document.getElementById("conversationPairSection").style.display = "none";
  }
}

// 파일 로드 (CSV 또는 XLSX)
function loadFile() {
  const fileType = document.getElementById("fileType").value;
  const fileInput = document.getElementById("dataFile");
  const file = fileInput.files[0];

  if (!file) {
    alert("파일을 선택해주세요.");
    return;
  }

  if (fileType === "csv") {
    loadCSV(file);
  } else if (fileType === "xlsx") {
    loadXLSX(file);
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

  // 캐릭터 이름 추출 및 드롭다운 채우기
  const characters = [...new Set(csvData.map((row) => row.username))].filter(
    (char) => char && char.trim() !== ""
  );
  populateCharacterDropdowns(characters);

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
  conversationPairs = extractConversationPairs(xlsxData);

  // 대화 쌍 드롭다운 채우기
  populateConversationPairDropdown(conversationPairs);

  alert(`XLSX 파일을 불러왔습니다. ${xlsxData.length}개의 댓글이 있습니다.`);
}

// 대화 쌍 추출 ('ㄴ상대이름' 형식 파싱)
function extractConversationPairs(data) {
  const pairs = new Set();

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
        // 쌍 생성 (정렬해서 중복 방지)
        const pairKey = [targetName, name].sort().join("-");
        pairs.add(pairKey);
      }
    }
  }

  return Array.from(pairs);
}

// 대화 쌍 드롭다운 채우기
function populateConversationPairDropdown(pairs) {
  const pairSelect = document.getElementById("conversationPair");
  pairSelect.innerHTML = '<option value="">선택하세요</option>';

  pairs.forEach((pair) => {
    const option = document.createElement("option");
    option.value = pair;
    option.textContent = pair;
    pairSelect.appendChild(option);
  });

  // 대화 쌍 선택 시 캐릭터 드롭다운 업데이트
  pairSelect.addEventListener("change", function () {
    const selectedPair = this.value;
    if (selectedPair) {
      const characters = selectedPair.split("-");
      populateCharacterDropdowns(characters);
    } else {
      populateCharacterDropdowns([]);
    }
  });
}

// 드롭다운에 캐릭터 이름 추가
function populateCharacterDropdowns(characters) {
  const meSelect = document.getElementById("meCharacter");
  const youSelect = document.getElementById("youCharacter");

  // 기존 옵션 제거 (첫 번째 "선택하세요" 제외)
  meSelect.innerHTML = '<option value="">선택하세요</option>';
  youSelect.innerHTML = '<option value="">선택하세요</option>';

  characters.forEach((char) => {
    const option1 = document.createElement("option");
    option1.value = char;
    option1.textContent = char;
    meSelect.appendChild(option1);

    const option2 = document.createElement("option");
    option2.value = char;
    option2.textContent = char;
    youSelect.appendChild(option2);
  });
}

// 데이터로 자동 생성 (CSV 또는 XLSX)
function generateFromData() {
  const fileType = document.getElementById("fileType").value;

  if (fileType === "csv") {
    generateFromCSV();
  } else if (fileType === "xlsx") {
    generateFromXLSX();
  }
}

// CSV 데이터로 자동 생성
function generateFromCSV() {
  const meChar = document.getElementById("meCharacter").value;
  const youChar = document.getElementById("youCharacter").value;

  if (!meChar || !youChar) {
    alert("ME와 YOU 캐릭터를 모두 선택해주세요.");
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

    let who = "";
    if (username === meChar) {
      who = "me";
    } else if (username === youChar) {
      who = "you";
    } else {
      return; // 선택된 캐릭터가 아니면 스킵
    }

    const bg = document.getElementById(who + "Bg").value;
    const color = document.getElementById(who + "Color").value;

    const div = document.createElement("div");
    div.className = "speech-bubble speech-bubble-" + who;
    div.innerText = message;
    div.contentEditable = true;
    div.style.backgroundColor = bg;
    div.style.color = color;
    div.addEventListener("input", updateOutputFromPreview);

    document.getElementById("preview").appendChild(div);
  });

  updateAfterStyles();
  updateOutputFromPreview();
}

// XLSX 데이터로 자동 생성
function generateFromXLSX() {
  const meChar = document.getElementById("meCharacter").value;
  const youChar = document.getElementById("youCharacter").value;
  const selectedPair = document.getElementById("conversationPair").value;

  if (!meChar || !youChar) {
    alert("ME와 YOU 캐릭터를 모두 선택해주세요.");
    return;
  }

  if (!selectedPair) {
    alert("대화 쌍을 선택해주세요.");
    return;
  }

  if (xlsxData.length === 0) {
    alert("먼저 XLSX 파일을 불러와주세요.");
    return;
  }

  // 기존 미리보기 초기화
  document.getElementById("preview").innerHTML = "";

  // 선택된 대화 쌍에 해당하는 데이터만 필터링
  const pairCharacters = selectedPair.split("-");

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
          actualContent = contentAfterMarker.substring(candidateName.length).trim();
          break;
        }
      }

      // 현재 대화에 reply 추가
      if (currentConversation && targetName && pairCharacters.includes(targetName)) {
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
    } else if (conv.name === youChar) {
      who = "you";
    }

    if (who) {
      addBubbleToPreview(who, conv.content);
    }

    // 답글들
    conv.replies.forEach((reply) => {
      let replyWho = "";
      if (reply.name === meChar) {
        replyWho = "me";
      } else if (reply.name === youChar) {
        replyWho = "you";
      }

      if (replyWho) {
        addBubbleToPreview(replyWho, reply.content);
      }
    });
  });

  updateAfterStyles();
  updateOutputFromPreview();
}

// 미리보기에 말풍선 추가 (헬퍼 함수)
function addBubbleToPreview(who, text) {
  const bg = document.getElementById(who + "Bg").value;
  const color = document.getElementById(who + "Color").value;

  const div = document.createElement("div");
  div.className = "speech-bubble speech-bubble-" + who;
  div.innerText = text;
  div.contentEditable = true;
  div.style.backgroundColor = bg;
  div.style.color = color;
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
  styleTag.innerHTML = `
.speech-bubble-me:after {
  content:"";
  position:absolute;
  right:-16px;
  top:50%;
  transform:translateY(-50%);
  width:0; height:0;
  border:9px solid transparent;
  border-left-color: ${document.getElementById("meBg").value};
}
.speech-bubble-you:after {
  content:"";
  position:absolute;
  left:-16px;
  top:50%;
  transform:translateY(-50%);
  width:0; height:0;
  border:9px solid transparent;
  border-right-color: ${document.getElementById("youBg").value};
}`;
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

  const styleBlock = `
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
}
.speech-bubble-you + .speech-bubble-me,
.speech-bubble-me + .speech-bubble-you {
  margin-top: 20px;
}
</style>
<br><br>
`;

  const previewHTML = Array.from(document.getElementById("preview").children)
    .map((d) => d.outerHTML)
    .join("\n");

  document.getElementById("output").value = styleBlock + previewHTML + "\n";
}

// 색상 즉시 반영
["meBg", "meColor", "youBg", "youColor"].forEach((id) => {
  document.getElementById(id).addEventListener("input", () => {
    Array.from(document.getElementById("preview").children).forEach((div) => {
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
