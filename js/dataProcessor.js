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
