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
  let format1Samples = []; // 샘플들을 저장
  const FORMAT1_SAMPLE_LIMIT = 10; // 샘플 수 증가
  let format1Messages = []; // 형식 1 메시지 임시 저장

  // 카카오톡 형식 감지: '운영정책 보기'가 있으면 해당 라인 이후부터 파싱
  const hasOperationPolicy = lines.some((line) =>
    line.includes("운영정책 보기")
  );

  for (const line of lines) {
    const trimmedLine = line.trim();

    // 빈 줄, URL 등 스킵
    if (trimmedLine === "") continue;
    if (trimmedLine.startsWith("http://") || trimmedLine.startsWith("https://"))
      continue;

    // 카카오톡 형식, 시스템 메시지 처리
    if (hasOperationPolicy && !startParsing) {
      if (trimmedLine.includes("운영정책 보기")) startParsing = true;
      continue;
    }
    if (isSystemMessage(trimmedLine)) continue;

    // 각 형식 매칭 시도
    const parsed =
      tryParseFormat3(trimmedLine) ||
      tryParseFormat2(trimmedLine) ||
      tryParseNewFormat(trimmedLine) ||
      tryParseOldFormat(trimmedLine) ||
      tryParseFormat1(trimmedLine);

    if (parsed) {
      // 이전 메시지 저장
      if (currentMessage && currentMessage.username && currentMessage.message) {
        const pushIndex = AppState.txtData.length; // push 전 길이 = push될 인덱스
        AppState.txtData.push({
          username: currentMessage.username,
          message: currentMessage.message.trim(),
        });

        console.log(
          `[DEBUG] 메시지 push: 인덱스=${pushIndex}, 이름="${currentMessage.username}", 형식1=${currentMessage.isFormat1}`
        );

        // ✅ 이전 메시지가 형식1이었다면 인덱스 저장
        if (currentMessage.isFormat1) {
          const lastFormat1Index = format1Messages.length - 1;
          if (lastFormat1Index >= 0 && format1Messages[lastFormat1Index]) {
            format1Messages[lastFormat1Index].dataIndex = pushIndex;
            console.log(
              `[DEBUG] 인덱스 설정: format1Messages[${lastFormat1Index}].dataIndex = ${pushIndex}`
            );
          } else {
            console.log(
              `[DEBUG] 인덱스 설정 실패: format1Messages[${lastFormat1Index}]가 없음`
            );
          }
        }
      }

      // 새 메시지 시작
      currentMessage = {
        username: parsed.username.trim(),
        message: parsed.message.trim(),
        isFormat1: parsed.isFormat1, // 형식1 플래그 보존
      };

      // 형식 1의 경우 샘플 수집 및 임시 저장
      if (parsed.isFormat1) {
        if (format1Samples.length < FORMAT1_SAMPLE_LIMIT) {
          format1Samples.push(parsed.restAfterDate);
        }

        // ✅ 정보만 저장
        const newIndex = format1Messages.length;
        format1Messages.push({
          restAfterDate: parsed.restAfterDate,
          dataIndex: null,
        });
        console.log(
          `[DEBUG] 형식1 메시지 추가: format1Messages[${newIndex}], 첫 단어="${
            parsed.restAfterDate.split(/\s+/)[0]
          }"`
        );
      }
    } else {
      // 줄바꿈 처리
      if (currentMessage && trimmedLine !== "") {
        currentMessage.message += "\n" + trimmedLine;
      }
    }
  }

  // 마지막 메시지 저장
  if (currentMessage && currentMessage.username && currentMessage.message) {
    const pushIndex = AppState.txtData.length;
    AppState.txtData.push({
      username: currentMessage.username,
      message: currentMessage.message.trim(),
    });

    console.log(
      `[DEBUG] 마지막 메시지 push: 인덱스=${pushIndex}, 이름="${currentMessage.username}", 형식1=${currentMessage.isFormat1}`
    );

    // ✅ 마지막 메시지가 형식1이었다면 인덱스 저장
    if (currentMessage.isFormat1) {
      const lastFormat1Index = format1Messages.length - 1;
      if (lastFormat1Index >= 0 && format1Messages[lastFormat1Index]) {
        format1Messages[lastFormat1Index].dataIndex = pushIndex;
        console.log(
          `[DEBUG] 마지막 인덱스 설정: format1Messages[${lastFormat1Index}].dataIndex = ${pushIndex}`
        );
      } else {
        console.log(
          `[DEBUG] 마지막 인덱스 설정 실패: format1Messages[${lastFormat1Index}]가 없음`
        );
      }
    }
  }

  // 형식 1 이름 패턴 분석
  if (format1Samples.length > 0) {
    console.log(`[DEBUG] format1Messages 개수: ${format1Messages.length}`);
    format1Messages.forEach((msg, idx) => {
      console.log(
        `[DEBUG] format1Messages[${idx}].dataIndex = ${msg.dataIndex}`
      );
    });

    const namePatterns = analyzeFormat1NamePatterns(format1Samples);
    console.log("[Format1] 확정된 이름 패턴들:", namePatterns);

    if (namePatterns.length > 0) {
      refineFormat1MessagesWithPatterns(namePatterns, format1Messages);
    }
  }

  // 마지막 메시지 저장
  if (currentMessage && currentMessage.username && currentMessage.message) {
    const messageObj = {
      username: currentMessage.username,
      message: currentMessage.message.trim(),
    };
    AppState.txtData.push(messageObj);

    // 마지막 메시지가 형식1이었다면 참조 업데이트
    if (currentMessage.isFormat1) {
      const lastFormat1 = format1Messages[format1Messages.length - 1];
      if (lastFormat1) {
        lastFormat1.dataIndex = AppState.txtData.length - 1; // 방금 push된 인덱스
      }
    }
  }

  // 형식 1 이름 패턴 분석
  if (format1Samples.length > 0) {
    const namePatterns = analyzeFormat1NamePatterns(format1Samples);
    console.log("[Format1] 확정된 이름 패턴들:", namePatterns);

    if (namePatterns.length > 0) {
      refineFormat1MessagesWithPatterns(namePatterns, format1Messages);
    }
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

// 형식 3: [이름] [오전 9:00] 내용
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
// 날짜 직후에 콤마나 콜론이 바로 오는 경우만 다른 형식으로 간주
function tryParseFormat1(line) {
  const match = line.match(
    /^(\d+년 \d+월 \d+일\s+(?:오전|오후)\s+\d+:\d+)\s+(.*)$/
  );

  if (!match) {
    return null;
  }

  const dateTimePart = match[1];
  const restAfterDate = match[2].trim();

  // 날짜 바로 뒤에 콤마가 오는 경우 (형식 2, 새 형식)
  // 예: "2024년 8월 28일 오전 12:06, 릴 : 내용"
  if (/^,/.test(restAfterDate)) {
    return null;
  }

  // 날짜 바로 뒤에 콜론이 오는 경우 (기존 형식)
  // 예: "2025년 3월 25일 오전 9:09:닉네임:내용"
  if (/^:/.test(restAfterDate)) {
    return null;
  }

  // 이름 부분에 콜론이 포함되어 있고, 그 앞부분이 짧은 경우 (다른 형식일 가능성)
  // 예: "2024년 8월 28일 오전 12:06, 릴 : 내용" (이미 위에서 걸러지지만 추가 안전장치)
  const firstColonIndex = restAfterDate.indexOf(":");
  if (firstColonIndex !== -1 && firstColonIndex < 20) {
    // 콜론이 앞쪽(20자 이내)에 있으면 "이름 : 내용" 형식일 가능성
    const beforeColon = restAfterDate.substring(0, firstColonIndex).trim();
    const afterColon = restAfterDate.substring(firstColonIndex + 1).trim();

    // 콜론 앞부분에 공백이 없거나 1-2단어 정도면 다른 형식
    const wordsBeforeColon = beforeColon.split(/\s+/);
    if (wordsBeforeColon.length <= 2) {
      return null;
    }
  }

  const words = restAfterDate.split(/\s+/);

  if (words.length === 0) {
    return null;
  }

  // 임시 파싱 (첫 단어를 이름으로)
  return {
    isFormat1: true,
    restAfterDate: restAfterDate,
    username: words[0],
    message: words.slice(1).join(" "),
  };
}

// 형식 1 이름 패턴 분석 (빈도 기반)
function analyzeFormat1NamePatterns(samples) {
  const patternFrequency = new Map();

  // 각 샘플에서 가능한 이름 길이를 1~4단어로 시도
  for (const sample of samples) {
    const words = sample.split(/\s+/);

    // 1단어부터 4단어까지 모두 시도
    for (let len = 1; len <= Math.min(4, words.length); len++) {
      const pattern = words.slice(0, len).join(" ");

      // 빈도 증가
      patternFrequency.set(pattern, (patternFrequency.get(pattern) || 0) + 1);
    }
  }

  // 빈도순 정렬
  const sortedPatterns = Array.from(patternFrequency.entries()).sort(
    (a, b) => b[1] - a[1]
  );

  console.log("[Format1] 패턴 빈도:", sortedPatterns);

  // 최소 2회 이상 등장하고, 상위 빈도를 가진 패턴 선택
  const validPatterns = [];
  const minFrequency = Math.max(2, Math.floor(samples.length * 0.3)); // 샘플의 30% 이상

  for (const [pattern, freq] of sortedPatterns) {
    if (freq >= minFrequency) {
      // 이미 선택된 패턴의 부분 문자열이 아닌 경우만 추가
      const words = pattern.split(/\s+/);
      const isSubset = validPatterns.some((existing) => {
        const existingWords = existing.split(/\s+/);
        // 더 긴 패턴이 이미 있는지 확인
        if (existingWords.length > words.length) {
          return existingWords.slice(0, words.length).join(" ") === pattern;
        }
        return false;
      });

      if (!isSubset) {
        validPatterns.push(pattern);
      }
    }
  }

  // 가장 긴 것부터 반환 (긴 이름을 우선 매칭하기 위해)
  return validPatterns.sort(
    (a, b) => b.split(/\s+/).length - a.split(/\s+/).length
  );
}

// 형식 1 메시지들을 확정된 패턴들로 재파싱
function refineFormat1MessagesWithPatterns(namePatterns, format1Messages) {
  if (!namePatterns || namePatterns.length === 0) {
    console.log("[Format1] 확정된 패턴이 없습니다.");
    return;
  }

  let refinedCount = 0;

  for (const msgInfo of format1Messages) {
    if (msgInfo.dataIndex === null || msgInfo.dataIndex === undefined) {
      console.log("[Format1] 인덱스가 설정되지 않았습니다.");
      continue;
    }

    // ✅ AppState.txtData에서 직접 가져오기
    const messageObj = AppState.txtData[msgInfo.dataIndex];
    if (!messageObj) {
      console.log("[Format1] 메시지를 찾을 수 없습니다:", msgInfo.dataIndex);
      continue;
    }

    const words = msgInfo.restAfterDate.split(/\s+/);
    let matched = false;

    // 가장 긴 패턴부터 시도 (이미 정렬되어 있음)
    for (const pattern of namePatterns) {
      const patternWords = pattern.split(/\s+/);

      if (words.length >= patternWords.length) {
        const possibleName = words.slice(0, patternWords.length).join(" ");

        if (possibleName === pattern) {
          // 메시지 객체 직접 수정
          messageObj.username = pattern;
          messageObj.message = words
            .slice(patternWords.length)
            .join(" ")
            .trim();
          refinedCount++;
          matched = true;
          console.log(
            `[Format1] 수정 ${refinedCount}:`,
            words[0],
            "→",
            pattern,
            "(인덱스:",
            msgInfo.dataIndex + ")"
          );
          break;
        }
      }
    }

    if (!matched) {
      console.log(`[Format1] 매칭 실패:`, words.slice(0, 3).join(" ") + "...");
    }
  }

  console.log(`[Format1] 총 ${refinedCount}개 메시지 이름 수정 완료`);
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
