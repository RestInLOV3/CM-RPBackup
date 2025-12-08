// 프로필 사진 업로드 처리

// 프로필 사진 업로드 함수
function uploadProfileImage(targetId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';

  input.onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
      const base64Image = event.target.result;

      // AppState에 저장
      AppState.profileImages[targetId] = base64Image;

      // UI 업데이트
      updateProfileImageUI(targetId, base64Image);

      // localStorage에 저장
      if (typeof saveFileData === 'function') {
        saveFileData();
      }
    };

    reader.readAsDataURL(file);
  };

  input.click();
}

// 프로필 사진 UI 업데이트
function updateProfileImageUI(targetId, base64Image) {
  const profileCircle = document.getElementById(`profile_${targetId}`);
  if (profileCircle) {
    profileCircle.style.backgroundImage = `url(${base64Image})`;
    profileCircle.style.backgroundSize = 'cover';
    profileCircle.style.backgroundPosition = 'center';
  }

  // 미리보기의 프로필 이미지도 업데이트
  updatePreviewProfileImages(targetId, base64Image);
}

// 미리보기의 프로필 이미지 업데이트
function updatePreviewProfileImages(targetId, base64Image) {
  const preview = document.getElementById('preview');
  if (!preview) return;

  const containers = preview.querySelectorAll('.message-container');
  containers.forEach(container => {
    if (container.dataset.characterId === targetId) {
      const profileImage = container.querySelector('.profile-image');
      if (profileImage) {
        if (profileImage.tagName === 'IMG') {
          profileImage.src = base64Image;
        } else {
          // div를 img로 교체
          const img = document.createElement('img');
          img.className = 'profile-image';
          img.src = base64Image;
          img.alt = container.dataset.characterName;
          profileImage.parentNode.replaceChild(img, profileImage);
        }
      }
    }
  });

  // HTML 출력 업데이트
  if (typeof updateOutputFromPreview === 'function') {
    updateOutputFromPreview();
  }
}

// 프로필 사진 원형 UI 생성
function createProfileCircle(targetId) {
  const circle = document.createElement('div');
  circle.id = `profile_${targetId}`;
  circle.className = 'profile-circle';
  circle.onclick = function() {
    uploadProfileImage(targetId);
  };

  // 기존에 저장된 이미지가 있으면 표시
  if (AppState.profileImages[targetId]) {
    updateProfileImageUI(targetId, AppState.profileImages[targetId]);
  }

  return circle;
}

// 프로필 사진 초기화
function initProfileImages() {
  // localStorage에서 불러오기
  const savedImages = localStorage.getItem('profileImages');
  if (savedImages) {
    try {
      AppState.profileImages = JSON.parse(savedImages);

      // UI 업데이트
      for (const targetId in AppState.profileImages) {
        updateProfileImageUI(targetId, AppState.profileImages[targetId]);
      }
    } catch (e) {
      console.error('프로필 사진 불러오기 실패:', e);
    }
  }
}
