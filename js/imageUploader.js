// R2 이미지 업로드 기능

// 이미지 업로드 함수
async function uploadImageToR2(file) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    console.log("Response status:", response.status);
    console.log("Response headers:", response.headers.get("content-type"));

    // 응답이 비어있는지 확인
    const text = await response.text();
    console.log("Response text:", text);

    if (!text) {
      throw new Error(
        "서버에서 빈 응답을 받았습니다. R2 바인딩이 설정되었는지 확인하세요."
      );
    }

    // JSON 파싱
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("JSON 파싱 실패:", text);
      throw new Error(
        "서버 응답을 파싱할 수 없습니다: " + text.substring(0, 100)
      );
    }

    if (!response.ok) {
      throw new Error(
        data.error || `업로드 실패 (상태 코드: ${response.status})`
      );
    }

    return data.url; // 업로드된 이미지 URL
  } catch (error) {
    console.error("Upload error:", error);
    alert("이미지 업로드 실패: " + error.message);
    return null;
  }
}

function initImageUploader() {
  const bgImageInput = document.getElementById("globalBgImage");
  if (!bgImageInput) return;

  const container = bgImageInput.parentNode;
  const resetBtn = document.getElementById("bgimg-reset");

  // 새로운 요소들 생성
  const uploadBtn = document.createElement("button");
  uploadBtn.textContent = "파일 선택";
  uploadBtn.type = "button";
  uploadBtn.style.marginLeft = "5px";
  uploadBtn.style.padding = "6px 12px";
  uploadBtn.style.fontSize = "13px";

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.style.display = "none";

  uploadBtn.onclick = () => fileInput.click();

  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("파일 크기는 10MB 이하여야 합니다.");
      return;
    }

    uploadBtn.textContent = "업로드 중...";
    uploadBtn.disabled = true;

    const url = await uploadImageToR2(file);

    if (url) {
      bgImageInput.value = url;
      bgImageInput.dispatchEvent(new Event("input"));
      alert("이미지가 성공적으로 업로드되었습니다!");
    }

    uploadBtn.textContent = "파일 선택";
    uploadBtn.disabled = false;
    fileInput.value = "";
  };

  // 핵심: reset 버튼 앞에 삽입
  container.insertBefore(fileInput, resetBtn);
  container.insertBefore(uploadBtn, resetBtn);
}

// 페이지 로드 시 초기화
document.addEventListener("DOMContentLoaded", function () {
  // globalStyleManager보다 나중에 실행되도록 약간의 지연
  setTimeout(initImageUploader, 100);
});
