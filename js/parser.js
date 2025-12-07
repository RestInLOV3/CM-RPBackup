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

  AppState.csvData = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    AppState.csvData.push(row);
  }

  // 캐릭터 이름 추출
  const characters = [
    ...new Set(AppState.csvData.map((row) => row.username)),
  ].filter((char) => char && char.trim() !== "");

  // 모든 캐릭터가 서로 대화할 수 있도록 전체 매핑 생성
  AppState.conversationPairsMap = {};
  for (const char of characters) {
    AppState.conversationPairsMap[char] = characters.filter((c) => c !== char);
  }

  // 캐릭터 드롭다운 채우기
  populateInitialCharacterDropdowns();

  // localStorage에 저장
  if (typeof saveFileData === 'function') {
    saveFileData();
  }

  alert(
    `CSV 파일을 불러왔습니다. ${AppState.csvData.length}개의 대화가 있습니다.`
  );
}

// XLSX 파싱
function parseXLSX(jsonData) {
  if (jsonData.length === 0) {
    alert("XLSX 파일이 비어있습니다.");
    return;
  }

  // 데이터 파싱 (첫 번째 행은 헤더이므로 스킵)
  AppState.xlsxData = [];
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!row || row.length === 0) continue;

    const commentNumber = row[0];
    const name = row[1];
    const content = row[2];

    if (!name || !content) continue;

    AppState.xlsxData.push({
      commentNumber,
      name: String(name).trim(),
      content: String(content).trim(),
    });
  }

  // 대화 쌍 추출
  AppState.conversationPairsMap = extractConversationPairs(AppState.xlsxData);

  // 캐릭터 드롭다운 채우기
  populateInitialCharacterDropdowns();

  // localStorage에 저장
  if (typeof saveFileData === 'function') {
    saveFileData();
  }

  alert(
    `XLSX 파일을 불러왔습니다. ${AppState.xlsxData.length}개의 댓글이 있습니다.`
  );
}

// TXT 파싱
function parseTXT(text) {
  const lines = text.split("\n");

  if (lines.length === 0) {
    alert("TXT 파일이 비어있습니다.");
    return;
  }

  AppState.txtData = [];
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
        AppState.txtData.push({
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
        AppState.txtData.push({
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
    AppState.txtData.push({
      username: currentMessage.username,
      message: currentMessage.message.trim(),
    });
  }

  // 캐릭터 이름 추출
  const characters = [
    ...new Set(AppState.txtData.map((row) => row.username)),
  ].filter((char) => char && char.trim() !== "");

  // 모든 캐릭터가 서로 대화할 수 있도록 전체 매핑 생성
  AppState.conversationPairsMap = {};
  for (const char of characters) {
    AppState.conversationPairsMap[char] = characters.filter((c) => c !== char);
  }

  // 캐릭터 드롭다운 채우기
  populateInitialCharacterDropdowns();

  // localStorage에 저장
  if (typeof saveFileData === 'function') {
    saveFileData();
  }

  alert(
    `TXT 파일을 불러왔습니다. ${AppState.txtData.length}개의 대화가 있습니다.`
  );
}
