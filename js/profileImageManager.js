// 프로필 사진 업로드 처리

// 컨텍스트 메뉴 관련 변수
let currentContextMenu = null;

// 컨텍스트 메뉴 생성
function showProfileContextMenu(event, targetId) {
  event.preventDefault();
  event.stopPropagation();

  // 기존 메뉴 제거
  hideProfileContextMenu();

  // 메뉴 생성
  const menu = document.createElement("div");
  menu.className = "profile-context-menu";
  menu.style.left = event.pageX + "px";
  menu.style.top = event.pageY + "px";

  // 이미지 초기화 메뉴
  const resetItem = document.createElement("div");
  resetItem.className = "profile-context-menu-item";
  resetItem.textContent = "이미지 초기화";
  resetItem.onclick = function () {
    resetProfileImage(targetId);
    hideProfileContextMenu();
  };

  // 색상 설정 메뉴
  const colorItem = document.createElement("div");
  colorItem.className = "profile-context-menu-item";
  colorItem.textContent = "색상 설정";
  colorItem.onclick = function (e) {
    setProfileColor(targetId, e);
    hideProfileContextMenu();
  };

  menu.appendChild(resetItem);
  menu.appendChild(colorItem);

  document.body.appendChild(menu);
  currentContextMenu = menu;

  // 다른 곳 클릭하면 메뉴 숨기기
  setTimeout(() => {
    document.addEventListener("click", hideProfileContextMenu);
  }, 0);
}

// 컨텍스트 메뉴 숨기기
function hideProfileContextMenu() {
  if (currentContextMenu) {
    currentContextMenu.remove();
    currentContextMenu = null;
    document.removeEventListener("click", hideProfileContextMenu);
  }
}

// 프로필 이미지 초기화
function resetProfileImage(targetId) {
  // AppState에서 이미지와 색상 제거
  delete AppState.profileImages[targetId];
  if (AppState.profileColors) {
    delete AppState.profileColors[targetId];
  }

  // UI 초기화
  const profileCircle = document.getElementById(`profile_${targetId}`);
  if (profileCircle) {
    profileCircle.style.backgroundImage = "";
    profileCircle.style.backgroundColor = "#e0e0e0";
  }

  // 미리보기 초기화
  resetPreviewProfileImages(targetId);

  // localStorage에 저장
  if (typeof saveFileData === "function") {
    saveFileData();
  }
}

// 프로필 색상 설정
function setProfileColor(targetId, event) {
  // 색상 선택기 생성
  const input = document.createElement("input");
  input.type = "color";
  input.value =
    (AppState.profileColors && AppState.profileColors[targetId]) || "#e0e0e0";

  // 마우스 좌표 기준으로 input을 배치
  input.style.position = "absolute";
  input.style.left = event.pageX + "px";
  input.style.top = event.pageY + "px";
  input.style.visibility = "hidden";

  // DOM에 추가
  document.body.appendChild(input);

  // 브라우저가 위치 계산할 틈을 줘야 함
  requestAnimationFrame(() => {
    input.click();

    input.addEventListener("change", (e) => {
      const color = e.target.value;

      // AppState에 색상 저장 및 이미지 제거
      if (!AppState.profileColors) {
        AppState.profileColors = {};
      }
      AppState.profileColors[targetId] = color;
      delete AppState.profileImages[targetId];

      // UI 업데이트
      updateProfileColorUI(targetId, color);

      // localStorage에 저장
      if (typeof saveFileData === "function") {
        saveFileData();
      }

      // input 요소 제거
      input.remove();
    });

    // 취소 시에도 input 제거
    input.addEventListener("blur", () => {
      setTimeout(() => {
        input.remove();
      }, 100);
    });
  });
}

// 프로필 색상 UI 업데이트
function updateProfileColorUI(targetId, color) {
  const profileCircle = document.getElementById(`profile_${targetId}`);
  if (profileCircle) {
    profileCircle.style.backgroundImage = "";
    profileCircle.style.backgroundColor = color;
  }

  // 미리보기의 프로필도 업데이트
  updatePreviewProfileColors(targetId, color);
}

// 미리보기의 프로필 색상 업데이트
function updatePreviewProfileColors(targetId, color) {
  const preview = document.getElementById("preview");
  if (!preview) return;

  const containers = preview.querySelectorAll(".message-container");
  containers.forEach((container) => {
    if (container.dataset.characterId === targetId) {
      const profileImage = container.querySelector(".profile-image");
      if (profileImage) {
        if (profileImage.tagName === "IMG") {
          // img를 div로 교체
          const div = document.createElement("div");
          div.className = "profile-image";
          div.style.backgroundColor = color;
          profileImage.parentNode.replaceChild(div, profileImage);
        } else {
          // 이미 div인 경우
          profileImage.style.backgroundColor = color;
          profileImage.style.backgroundImage = "";
        }
      }
    }
  });

  // HTML 출력 업데이트
  if (typeof updateOutputFromPreview === "function") {
    updateOutputFromPreview();
  }
}

// 미리보기 프로필 초기화
function resetPreviewProfileImages(targetId) {
  const preview = document.getElementById("preview");
  if (!preview) return;

  const containers = preview.querySelectorAll(".message-container");
  containers.forEach((container) => {
    if (container.dataset.characterId === targetId) {
      const profileImage = container.querySelector(".profile-image");
      if (profileImage) {
        if (profileImage.tagName === "IMG") {
          // img를 div로 교체
          const div = document.createElement("div");
          div.className = "profile-image";
          div.style.backgroundColor = "#e0e0e0";
          profileImage.parentNode.replaceChild(div, profileImage);
        } else {
          // 이미 div인 경우
          profileImage.style.backgroundColor = "#e0e0e0";
          profileImage.style.backgroundImage = "";
        }
      }
    }
  });

  // HTML 출력 업데이트
  if (typeof updateOutputFromPreview === "function") {
    updateOutputFromPreview();
  }
}

// 프로필 사진 업로드 함수
async function uploadProfileImage(targetId) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";

  input.onchange = async function (e) {
    const file = e.target.files[0];
    if (!file) return;

    // 파일 크기 검증
    if (file.size > 10 * 1024 * 1024) {
      alert("파일 크기는 10MB 이하여야 합니다.");
      return;
    }

    // 프로필 서클에 업로드 중 표시
    const profileCircle = document.getElementById(`profile_${targetId}`);
    if (profileCircle) {
      profileCircle.style.opacity = "0.5";
      profileCircle.style.cursor = "wait";
    }

    // R2에 업로드
    const imageUrl = await uploadImageToR2(file, "profile");

    if (imageUrl) {
      // AppState에 URL 저장 (base64 대신)
      AppState.profileImages[targetId] = imageUrl;

      // 이미지 업로드 시 색상 설정 제거
      if (AppState.profileColors) {
        delete AppState.profileColors[targetId];
      }

      // UI 업데이트
      updateProfileImageUI(targetId, imageUrl);

      // localStorage에 저장
      if (typeof saveFileData === "function") {
        saveFileData();
      }
    }

    // 업로드 중 표시 해제
    if (profileCircle) {
      profileCircle.style.opacity = "1";
      profileCircle.style.cursor = "pointer";
    }
  };

  input.click();
}

// 프로필 사진 UI 업데이트
function updateProfileImageUI(targetId, imageUrl) {
  const profileCircle = document.getElementById(`profile_${targetId}`);
  if (profileCircle) {
    profileCircle.style.backgroundImage = `url(${imageUrl})`;
    profileCircle.style.backgroundSize = "cover";
    profileCircle.style.backgroundPosition = "center";
  }

  // 미리보기의 프로필 이미지도 업데이트
  updatePreviewProfileImages(targetId, imageUrl);
}

// 미리보기의 프로필 이미지 업데이트
function updatePreviewProfileImages(targetId, imageUrl) {
  const preview = document.getElementById("preview");
  if (!preview) return;

  const containers = preview.querySelectorAll(".message-container");
  containers.forEach((container) => {
    if (container.dataset.characterId === targetId) {
      const profileImage = container.querySelector(".profile-image");
      if (profileImage) {
        if (profileImage.tagName === "IMG") {
          profileImage.src = imageUrl;
        } else {
          // div를 img로 교체
          const img = document.createElement("img");
          img.className = "profile-image";
          img.src = imageUrl;
          img.alt = container.dataset.characterName;
          profileImage.parentNode.replaceChild(img, profileImage);
        }
      }
    }
  });

  // HTML 출력 업데이트
  if (typeof updateOutputFromPreview === "function") {
    updateOutputFromPreview();
  }
}

// 프로필 사진 원형 UI 생성
function createProfileCircle(targetId) {
  const circle = document.createElement("div");
  circle.id = `profile_${targetId}`;
  circle.className = "profile-circle";

  // 왼쪽 클릭: 이미지 업로드
  circle.onclick = function (e) {
    if (e.button === 0) {
      // 왼쪽 클릭만
      uploadProfileImage(targetId);
    }
  };

  // 우클릭: 컨텍스트 메뉴
  circle.oncontextmenu = function (e) {
    showProfileContextMenu(e, targetId);
  };

  // 기존에 저장된 이미지가 있으면 표시
  if (AppState.profileImages[targetId]) {
    updateProfileImageUI(targetId, AppState.profileImages[targetId]);
  } else if (AppState.profileColors && AppState.profileColors[targetId]) {
    // 기존에 저장된 색상이 있으면 표시
    updateProfileColorUI(targetId, AppState.profileColors[targetId]);
  }

  return circle;
}

// 프로필 사진 초기화
function initProfileImages() {
  // localStorage에서 이미지 불러오기
  const savedImages = localStorage.getItem("profileImages");
  if (savedImages) {
    try {
      AppState.profileImages = JSON.parse(savedImages);

      // UI 업데이트
      for (const targetId in AppState.profileImages) {
        updateProfileImageUI(targetId, AppState.profileImages[targetId]);
      }
    } catch (e) {
      console.error("프로필 사진 불러오기 실패:", e);
    }
  }

  // localStorage에서 색상 불러오기
  const savedColors = localStorage.getItem("profileColors");
  if (savedColors) {
    try {
      AppState.profileColors = JSON.parse(savedColors);

      // UI 업데이트 (이미지가 없는 경우만)
      for (const targetId in AppState.profileColors) {
        if (!AppState.profileImages[targetId]) {
          updateProfileColorUI(targetId, AppState.profileColors[targetId]);
        }
      }
    } catch (e) {
      console.error("프로필 색상 불러오기 실패:", e);
    }
  }
}
