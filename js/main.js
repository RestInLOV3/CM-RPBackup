// 페이지 로드 시 초기화
document.addEventListener("DOMContentLoaded", function () {
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

  // 색상 즉시 반영 (수동 입력용 - manual 소스만)
  ["meBg", "meColor", "youBg", "youColor"].forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener("input", () => {
        Array.from(document.getElementById("preview").children).forEach(
          (div) => {
            // 수동 입력 말풍선만 업데이트
            if (div.dataset.source !== "manual") return;

            if (div.classList.contains("speech-bubble-me")) {
              div.style.backgroundColor = document.getElementById("meBg").value;
              div.style.color = document.getElementById("meColor").value;
            } else if (div.classList.contains("speech-bubble-you")) {
              div.style.backgroundColor =
                document.getElementById("youBg").value;
              div.style.color = document.getElementById("youColor").value;
            }
          }
        );
        updateAfterStyles();
        updateOutputFromPreview();
      });
    }
  });
});
