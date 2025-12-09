// 페이지 로드 시 초기화
document.addEventListener("DOMContentLoaded", function () {
  // 수동 입력 프로필 사진 복원
  const savedImages = localStorage.getItem('chatBackup_profileImages');
  if (savedImages) {
    try {
      const images = JSON.parse(savedImages);
      if (images.meCharacter_manual) {
        updateProfileImageUI('meCharacter_manual', images.meCharacter_manual);
      }
      if (images.youCharacter_manual) {
        updateProfileImageUI('youCharacter_manual', images.youCharacter_manual);
      }
    } catch (e) {
      console.error('수동 입력 프로필 사진 복원 실패:', e);
    }
  }

  // 수동 입력 프로필 색상 복원
  const savedColors = localStorage.getItem('chatBackup_profileColors');
  if (savedColors) {
    try {
      const colors = JSON.parse(savedColors);
      // 이미지가 없는 경우만 색상 적용
      const images = savedImages ? JSON.parse(savedImages) : {};
      if (colors.meCharacter_manual && !images.meCharacter_manual) {
        updateProfileColorUI('meCharacter_manual', colors.meCharacter_manual);
      }
      if (colors.youCharacter_manual && !images.youCharacter_manual) {
        updateProfileColorUI('youCharacter_manual', colors.youCharacter_manual);
      }
    } catch (e) {
      console.error('수동 입력 프로필 색상 복원 실패:', e);
    }
  }

  // Enter 키 처리 (수동 입력)
  ["me", "you"].forEach((who) => {
    const textElement = document.getElementById(who + "Text");
    if (textElement) {
      textElement.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          addBubble(who);
        }
      });
    }
  });

  // 이름 입력 실시간 업데이트
  ["me", "you"].forEach((who) => {
    const nameElement = document.getElementById(who + "Name");

    if (nameElement) {
      nameElement.addEventListener("input", () => {
        const name = nameElement.value.trim() || who.toUpperCase();

        // 미리보기의 모든 메시지 컨테이너 순회
        const preview = document.getElementById("preview");
        const containers = preview.querySelectorAll(".message-container");

        containers.forEach((container) => {
          // speech-bubble 찾기
          const bubble = container.querySelector(".speech-bubble");
          if (!bubble || bubble.dataset.source !== "manual") return;

          // ME/YOU 확인
          const isMe = container.dataset.isMe === "true";
          if ((who === "me" && isMe) || (who === "you" && !isMe)) {
            // character-name 업데이트
            const characterName = container.querySelector(".character-name");
            if (characterName) {
              characterName.textContent = name;
            }

            // 컨테이너의 dataset 업데이트
            container.dataset.characterName = name;
          }
        });

        // HTML 출력 업데이트
        updateOutputFromPreview();
      });
    }
  });

  // 색상 즉시 반영 (수동 입력용 - manual 소스만)
  ["meBg", "meColor", "youBg", "youColor"].forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener("input", () => {
        const preview = document.getElementById("preview");
        const containers = preview.querySelectorAll(".message-container");

        containers.forEach((container) => {
          const bubble = container.querySelector(".speech-bubble");
          if (!bubble || bubble.dataset.source !== "manual") return;

          if (bubble.classList.contains("speech-bubble-me")) {
            bubble.style.backgroundColor = document.getElementById("meBg").value;
            bubble.style.color = document.getElementById("meColor").value;
          } else if (bubble.classList.contains("speech-bubble-you")) {
            bubble.style.backgroundColor = document.getElementById("youBg").value;
            bubble.style.color = document.getElementById("youColor").value;
          }
        });

        updateAfterStyles();
        updateOutputFromPreview();

        // localStorage에 저장
        if (id === "meBg" || id === "meColor") {
          if (typeof saveMeColors === "function") {
            saveMeColors();
          }
        } else if (id === "youBg" || id === "youColor") {
          if (typeof saveYouColors === "function") {
            saveYouColors();
          }
        }
      });
    }
  });
});
