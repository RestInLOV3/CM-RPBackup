// R2 이미지 업로드 기능

// 이미지 업로드 함수
async function uploadImageToR2(file) {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.get('content-type'));

    // 응답이 비어있는지 확인
    const text = await response.text();
    console.log('Response text:', text);

    if (!text) {
      throw new Error('서버에서 빈 응답을 받았습니다. R2 바인딩이 설정되었는지 확인하세요.');
    }

    // JSON 파싱
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('JSON 파싱 실패:', text);
      throw new Error('서버 응답을 파싱할 수 없습니다: ' + text.substring(0, 100));
    }

    if (!response.ok) {
      throw new Error(data.error || `업로드 실패 (상태 코드: ${response.status})`);
    }

    return data.url; // 업로드된 이미지 URL
  } catch (error) {
    console.error('Upload error:', error);
    alert('이미지 업로드 실패: ' + error.message);
    return null;
  }
}

// 이미지 업로더 UI 초기화
function initImageUploader() {
  const bgImageInput = document.getElementById('globalBgImage');

  if (!bgImageInput) return;

  // 파일 선택 버튼 생성
  const uploadBtn = document.createElement('button');
  uploadBtn.textContent = '파일 선택';
  uploadBtn.type = 'button';
  uploadBtn.style.marginLeft = '5px';
  uploadBtn.style.padding = '6px 12px';
  uploadBtn.style.fontSize = '13px';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';

  // 업로드 버튼 클릭 시 파일 선택창 열기
  uploadBtn.onclick = () => fileInput.click();

  // 파일 선택 시 업로드 실행
  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 파일 크기 체크 (10MB 제한)
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB 이하여야 합니다.');
      return;
    }

    // 업로드 진행 중 표시
    uploadBtn.textContent = '업로드 중...';
    uploadBtn.disabled = true;

    const url = await uploadImageToR2(file);

    if (url) {
      bgImageInput.value = url;
      // 스타일 업데이트 트리거
      bgImageInput.dispatchEvent(new Event('input'));
      alert('이미지가 성공적으로 업로드되었습니다!');
    }

    // 버튼 상태 복원
    uploadBtn.textContent = '파일 선택';
    uploadBtn.disabled = false;

    // 파일 입력 초기화
    fileInput.value = '';
  };

  // DOM에 추가
  const container = bgImageInput.parentNode;
  container.appendChild(fileInput);
  container.appendChild(uploadBtn);
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
  // globalStyleManager보다 나중에 실행되도록 약간의 지연
  setTimeout(initImageUploader, 100);
});
