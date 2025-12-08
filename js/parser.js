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
  if (typeof saveFileData === "function") {
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
  if (typeof saveFileData === "function") {
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
  let startParsing = false;

  // 형식 1 이름 추론을 위한 변수
  let format1NameCandidate = null;
  let format1SampleCount = 0;
  const FORMAT1_SAMPLE_LIMIT = 5;

  // 카카오톡 형식 감지: '운영정책 보기'가 있으면 해당 라인 이후부터 파싱
  const hasOperationPolicy = lines.some((line) =>
    line.includes("운영정책 보기")
  );

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

    // 카카오톡 형식: '운영정책 보기' 이후부터 파싱 시작
    if (hasOperationPolicy) {
      if (!startParsing) {
        if (trimmedLine.includes("운영정책 보기")) {
          startParsing = true;
        }
        continue; // '운영정책 보기' 전까지는 모두 스킵
      }
    }

    // 시스템 메시지 및 날짜 구분선 필터링
    if (isSystemMessage(trimmedLine)) {
      continue;
    }

    // 각 형식 매칭 시도 (우선순위 순서)
    const parsed =
      tryParseFormat3(trimmedLine) || // [이름] [시간] 내용
      tryParseFormat2(trimmedLine) || // 2025. 7. 18. 오후 9:07, 이름 : 내용
      tryParseNewFormat(trimmedLine) || // 2024년 8월 28일 오전 12:06, 릴 : 내용
      tryParseOldFormat(trimmedLine) || // 2025년 3월 25일 오전 9:09:닉네임:내용
      tryParseFormat1(trimmedLine, format1NameCandidate, format1SampleCount); // 2025년 8월 14일 오전 9:35 이름 내용

    if (parsed) {
      // 형식 1의 경우 이름 후보 업데이트
      if (parsed.isFormat1) {
        const result = updateFormat1NameCandidate(
          parsed.restAfterDate,
          format1NameCandidate,
          format1SampleCount
        );
        format1NameCandidate = result.candidate;
        format1SampleCount = result.count;

        // 확정된 이름으로 파싱
        if (
          format1SampleCount >= FORMAT1_SAMPLE_LIMIT &&
          format1NameCandidate &&
          format1NameCandidate.length > 0
        ) {
          const nameLength = format1NameCandidate.length;
          const words = parsed.restAfterDate.split(/\s+/);
          parsed.username = format1NameCandidate.join(" ");
          parsed.message = words.slice(nameLength).join(" ");
        }
      }

      // 이전 메시지 저장
      if (currentMessage && currentMessage.username && currentMessage.message) {
        AppState.txtData.push({
          username: currentMessage.username,
          message: currentMessage.message.trim(),
        });
      }

      // 새 메시지 시작
      currentMessage = {
        username: parsed.username.trim(),
        message: parsed.message.trim(),
      };
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

  // 형식 1 이름이 확정된 경우, 다시 파싱하여 정확한 이름 적용
  if (format1NameCandidate && format1NameCandidate.length > 0) {
    refineFormat1Names(format1NameCandidate);
  }

  // 캐릭터 이름 추출 및 매핑 생성
  finalizeCharacters();

  alert(
    `TXT 파일을 불러왔습니다. ${AppState.txtData.length}개의 대화가 있습니다.`
  );
}

// 시스템 메시지 및 날짜 구분선 확인
function isSystemMessage(line) {
  // 날짜 구분선: 2024년 12월 9일 오전 12:39 (메시지 없음)
  if (/^\d+년 \d+월 \d+일\s+(오전|오후)\s+\d+:\d+$/.test(line)) {
    return true;
  }

  // 시스템 메시지
  const systemPatterns = [
    "채팅방 관리자가",
    "님이 들어왔습니다",
    "님이 나갔습니다",
    "내보냈습니다",
    "초대했습니다",
    "삭제된 메시지입니다",
  ];

  return systemPatterns.some((pattern) => line.includes(pattern));
}

// 형식 3: [제니엘] [오전 9:00] 내용
function tryParseFormat3(line) {
  const match = line.match(/^\[(.+?)\]\s*\[(오전|오후)\s+\d+:\d+\]\s*(.*)$/);
  if (match) {
    return {
      username: match[1].trim(),
      message: match[3].trim(),
    };
  }
  return null;
}

// 형식 2: 2025. 7. 18. 오후 9:07, 이름 : 내용
function tryParseFormat2(line) {
  const match = line.match(
    /^\d+\.\s*\d+\.\s*\d+\.\s+(오전|오후)\s+\d+:\d+,\s*(.+?)\s*:\s*(.*)$/
  );
  if (match) {
    return {
      username: match[2].trim(),
      message: match[3].trim(),
    };
  }
  return null;
}

// 새 형식: 2024년 8월 28일 오전 12:06, 릴 : 좋은 저녁이에요
function tryParseNewFormat(line) {
  const match = line.match(
    /^\d+년 \d+월 \d+일\s+(오전|오후)\s+\d+:\d+,\s*(.+?)\s*:\s*(.*)$/
  );
  if (match) {
    return {
      username: match[2].trim(),
      message: match[3].trim(),
    };
  }
  return null;
}

// 기존 형식: 2025년 3월 25일 오전 9:09:닉네임:내용
function tryParseOldFormat(line) {
  const match = line.match(/^\d+년 \d+월 \d+일\s+(오전|오후)\s+\d+:\d+:(.*)$/);
  if (match) {
    const rest = match[2];
    const colonIndex = rest.indexOf(":");

    if (colonIndex !== -1) {
      return {
        username: rest.substring(0, colonIndex).trim(),
        message: rest.substring(colonIndex + 1).trim(),
      };
    }
  }
  return null;
}

// 형식 1: 2025년 8월 14일 오전 9:35 이름 내용
function tryParseFormat1(line, nameCandidate, sampleCount) {
  const match = line.match(
    /^(\d+년 \d+월 \d+일\s+(?:오전|오후)\s+\d+:\d+)\s+(.*)$/
  );
  if (match) {
    const restAfterDate = match[2].trim();
    const words = restAfterDate.split(/\s+/);

    if (words.length === 0) {
      return null;
    }

    // 임시 파싱 (나중에 수정될 수 있음)
    return {
      isFormat1: true,
      restAfterDate: restAfterDate,
      username: words[0],
      message: words.slice(1).join(" "),
    };
  }
  return null;
}

// 형식 1 이름 후보 업데이트
function updateFormat1NameCandidate(
  restAfterDate,
  currentCandidate,
  currentCount
) {
  const FORMAT1_SAMPLE_LIMIT = 5;

  if (currentCount >= FORMAT1_SAMPLE_LIMIT) {
    return { candidate: currentCandidate, count: currentCount };
  }

  const words = restAfterDate.split(/\s+/);
  const newSample = words.slice(0, Math.min(4, words.length));

  if (currentCandidate === null) {
    // 첫 번째 샘플
    return { candidate: newSample, count: 1 };
  }

  // 기존 후보와 비교하여 공통 부분만 남김
  const refinedCandidate = [];
  for (let i = 0; i < currentCandidate.length; i++) {
    if (i < newSample.length && currentCandidate[i] === newSample[i]) {
      refinedCandidate.push(currentCandidate[i]);
    } else {
      break;
    }
  }

  return { candidate: refinedCandidate, count: currentCount + 1 };
}

// 형식 1 이름 재정제
function refineFormat1Names(confirmedNameArray) {
  const confirmedName = confirmedNameArray.join(" ");
  const nameLength = confirmedNameArray.length;

  for (let i = 0; i < AppState.txtData.length; i++) {
    const data = AppState.txtData[i];

    // 임시로 첫 단어만 이름으로 저장된 경우 수정
    if (
      data.username !== confirmedName &&
      data.username === confirmedNameArray[0]
    ) {
      const fullText = data.username + " " + data.message;
      const words = fullText.split(/\s+/);

      if (words.length >= nameLength) {
        const possibleName = words.slice(0, nameLength).join(" ");
        if (possibleName === confirmedName) {
          AppState.txtData[i].username = confirmedName;
          AppState.txtData[i].message = words.slice(nameLength).join(" ");
        }
      }
    }
  }
}

// 캐릭터 정보 최종 처리
function finalizeCharacters() {
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
  if (typeof saveFileData === "function") {
    saveFileData();
  }
}
