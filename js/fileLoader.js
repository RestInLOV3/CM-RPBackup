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
    AppState.currentFileType = "csv";
    loadCSV(file);
  } else if (fileName.endsWith(".xlsx")) {
    AppState.currentFileType = "xlsx";
    loadXLSX(file);
  } else if (fileName.endsWith(".txt") || fileName.endsWith(".eml")) {
    AppState.currentFileType = "txt";
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
