// localStorage 키 상수
const STORAGE_KEYS = {
  GLOBAL_STYLES: "chatBackup_globalStyles",
  ME_COLORS: "chatBackup_meColors",
  YOU_COLORS: "chatBackup_youColors",
  PREVIEW_HTML: "chatBackup_previewHTML",
  FILE_DATA: "chatBackup_fileData",
  PROFILE_IMAGES: "chatBackup_profileImages",
  PROFILE_COLORS: "chatBackup_profileColors",
};

// 전역 스타일 저장
function saveGlobalStyles() {
  try {
    const styles = {
      bgColor: AppState.globalStyles.bgColor,
      bgImage: AppState.globalStyles.bgImage,
      shadowBlur: AppState.globalStyles.shadowBlur,
      shadowColor: AppState.globalStyles.shadowColor,
      shadowOpacity: AppState.globalStyles.shadowOpacity,
      letterSpacing: AppState.globalStyles.letterSpacing,
      lineHeight: AppState.globalStyles.lineHeight,
      wordBreak: AppState.globalStyles.wordBreak,
      textAlign: AppState.globalStyles.textAlign,
    };
    localStorage.setItem(STORAGE_KEYS.GLOBAL_STYLES, JSON.stringify(styles));
  } catch (e) {
    console.error("전역 스타일 저장 실패:", e);
  }
}

// ME 색상 저장 (수동 입력용)
function saveMeColors() {
  try {
    const colors = {
      bg: document.getElementById("meBg")?.value || "#f0f0f0",
      color: document.getElementById("meColor")?.value || "#333333",
    };
    localStorage.setItem(STORAGE_KEYS.ME_COLORS, JSON.stringify(colors));
  } catch (e) {
    console.error("ME 색상 저장 실패:", e);
  }
}

// YOU 색상 저장 (수동 입력용)
function saveYouColors() {
  try {
    const colors = {
      bg: document.getElementById("youBg")?.value || "#292929",
      color: document.getElementById("youColor")?.value || "#ffffff",
    };
    localStorage.setItem(STORAGE_KEYS.YOU_COLORS, JSON.stringify(colors));
  } catch (e) {
    console.error("YOU 색상 저장 실패:", e);
  }
}

// 미리보기 HTML 저장
function savePreviewHTML() {
  try {
    const preview = document.getElementById("preview");
    if (preview) {
      const containers = Array.from(preview.children).map((container) => {
        // message-container인 경우
        if (container.classList.contains("message-container")) {
          const bubble = container.querySelector(".speech-bubble");
          const profileAndName = container.querySelector(".profile-and-name");

          return {
            type: "message-container",
            characterId: container.dataset.characterId,
            characterName: container.dataset.characterName,
            isMe: container.dataset.isMe === "true",
            showProfile: profileAndName
              ? profileAndName.style.visibility !== "hidden"
              : true,
            bubble: {
              className: bubble.className,
              text: bubble.innerText,
              bgColor: bubble.style.backgroundColor,
              color: bubble.style.color,
              source: bubble.dataset.source || "manual",
            },
          };
        } else {
          // 이전 버전 호환성 (말풍선만 있는 경우)
          return {
            type: "legacy",
            className: container.className,
            text: container.innerText,
            bgColor: container.style.backgroundColor,
            color: container.style.color,
            source: container.dataset.source || "manual",
          };
        }
      });
      localStorage.setItem(
        STORAGE_KEYS.PREVIEW_HTML,
        JSON.stringify(containers)
      );
    }
  } catch (e) {
    console.error("미리보기 HTML 저장 실패:", e);
  }
}

// 파일 데이터 저장 (CSV, XLSX, TXT)
function saveFileData() {
  try {
    // 선택된 ME 캐릭터
    const meSelect = document.getElementById("meCharacter");
    const selectedMe = meSelect ? meSelect.value : "";

    // 선택된 YOU 캐릭터들
    const selectedYous = {};
    if (typeof getAllYouCharacterIds === "function") {
      const youIds = getAllYouCharacterIds();
      youIds.forEach((youId) => {
        const select = document.getElementById(youId);
        if (select && select.value) {
          selectedYous[youId] = select.value;
        }
      });
    }

    // 자동 생성용 ME 색상
    const meBgAuto = document.getElementById("meBg_auto");
    const meColorAuto = document.getElementById("meColor_auto");
    const autoMeColors = {
      bg: meBgAuto ? meBgAuto.value : "#f0f0f0",
      color: meColorAuto ? meColorAuto.value : "#333333",
    };

    // 자동 생성용 YOU 색상들
    const autoYouColors = {};
    if (typeof getAllYouCharacterIds === "function") {
      const youIds = getAllYouCharacterIds();
      youIds.forEach((youId) => {
        const bgInput = document.getElementById(`youBg_${youId}`);
        const colorInput = document.getElementById(`youColor_${youId}`);
        if (bgInput && colorInput) {
          autoYouColors[youId] = {
            bg: bgInput.value,
            color: colorInput.value,
          };
        }
      });
    }

    const fileData = {
      currentFileType: AppState.currentFileType,
      csvData: AppState.csvData || [],
      xlsxData: AppState.xlsxData || [],
      txtData: AppState.txtData || [],
      conversationPairsMap: AppState.conversationPairsMap || {},
      youCount: AppState.youCount || 1,
      youColors: AppState.youColors || {},
      selectedMe: selectedMe,
      selectedYous: selectedYous,
      autoMeColors: autoMeColors,
      autoYouColors: autoYouColors,
    };
    localStorage.setItem(STORAGE_KEYS.FILE_DATA, JSON.stringify(fileData));

    // 프로필 사진 저장
    localStorage.setItem(
      STORAGE_KEYS.PROFILE_IMAGES,
      JSON.stringify(AppState.profileImages || {})
    );

    // 프로필 색상 저장
    localStorage.setItem(
      STORAGE_KEYS.PROFILE_COLORS,
      JSON.stringify(AppState.profileColors || {})
    );
  } catch (e) {
    console.error("파일 데이터 저장 실패:", e);
  }
}

// 모든 데이터 저장
function saveAllData() {
  saveGlobalStyles();
  saveMeColors();
  saveYouColors();
  savePreviewHTML();
  saveFileData();
}

// 전역 스타일 로드
function loadGlobalStyles() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.GLOBAL_STYLES);
    if (saved) {
      const styles = JSON.parse(saved);

      // AppState 업데이트
      AppState.globalStyles = { ...AppState.globalStyles, ...styles };

      // UI 요소에 값 적용
      const elements = getGlobalStyleElements();
      if (elements.bgColor) elements.bgColor.value = styles.bgColor;
      if (elements.bgImage) elements.bgImage.value = styles.bgImage;
      if (elements.shadowBlur) elements.shadowBlur.value = styles.shadowBlur;
      if (elements.shadowColor) elements.shadowColor.value = styles.shadowColor;
      if (elements.shadowOpacity)
        elements.shadowOpacity.value = styles.shadowOpacity;
      if (elements.letterSpacing)
        elements.letterSpacing.value = styles.letterSpacing;
      if (elements.lineHeight) elements.lineHeight.value = styles.lineHeight;
      if (elements.wordBreak) elements.wordBreak.value = styles.wordBreak;
      if (elements.textAlign) elements.textAlign.value = styles.textAlign;

      // 슬라이더 값 표시 업데이트
      updateSliderDisplays();

      return true;
    }
  } catch (e) {
    console.error("전역 스타일 로드 실패:", e);
  }
  return false;
}

// ME 색상 로드
function loadMeColors() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.ME_COLORS);
    if (saved) {
      const colors = JSON.parse(saved);
      const meBg = document.getElementById("meBg");
      const meColor = document.getElementById("meColor");

      if (meBg) meBg.value = colors.bg;
      if (meColor) meColor.value = colors.color;

      return true;
    }
  } catch (e) {
    console.error("ME 색상 로드 실패:", e);
  }
  return false;
}

// YOU 색상 로드
function loadYouColors() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.YOU_COLORS);
    if (saved) {
      const colors = JSON.parse(saved);
      const youBg = document.getElementById("youBg");
      const youColor = document.getElementById("youColor");

      if (youBg) youBg.value = colors.bg;
      if (youColor) youColor.value = colors.color;

      return true;
    }
  } catch (e) {
    console.error("YOU 색상 로드 실패:", e);
  }
  return false;
}

// 미리보기 HTML 로드
function loadPreviewHTML() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.PREVIEW_HTML);
    if (saved) {
      const containers = JSON.parse(saved);
      const preview = document.getElementById("preview");

      if (preview && containers.length > 0) {
        preview.innerHTML = "";

        console.log(
          "[loadPreviewHTML] 복원할 컨테이너 개수:",
          containers.length
        );

        containers.forEach((containerData, index) => {
          if (containerData.type === "message-container") {
            // 새로운 형식: message-container
            const bubble = document.createElement("div");
            bubble.className = containerData.bubble.className;
            bubble.innerText = containerData.bubble.text;
            bubble.contentEditable = true;
            bubble.style.backgroundColor = containerData.bubble.bgColor;
            bubble.style.color = containerData.bubble.color;
            bubble.dataset.source = containerData.bubble.source;
            bubble.addEventListener("input", updateOutputFromPreview);

            // 메시지 컨테이너 생성
            const container = createMessageContainer(
              bubble,
              containerData.characterName,
              containerData.characterId,
              containerData.isMe
            );

            preview.appendChild(container);

            console.log(`[loadPreviewHTML] 컨테이너 #${index}:`, {
              characterName: containerData.characterName,
              characterId: containerData.characterId,
              isMe: containerData.isMe,
            });
          } else {
            // 이전 버전 호환성 (말풍선만 있는 경우)
            const div = document.createElement("div");
            div.className = containerData.className;
            div.innerText = containerData.text;
            div.contentEditable = true;
            div.style.backgroundColor = containerData.bgColor;
            div.style.color = containerData.color;
            div.dataset.source = containerData.source;
            div.addEventListener("input", updateOutputFromPreview);

            // legacy 데이터를 새 형식으로 변환
            const characterId =
              containerData.source === "manual"
                ? containerData.className.includes("me")
                  ? "meCharacter_manual"
                  : "youCharacter_manual"
                : containerData.className.includes("me")
                ? "meCharacter_auto"
                : "youCharacter";
            const characterName = containerData.className.includes("me")
              ? "ME"
              : "YOU";
            const isMe = containerData.className.includes("me");

            const container = createMessageContainer(
              div,
              characterName,
              characterId,
              isMe
            );
            preview.appendChild(container);

            console.log(`[loadPreviewHTML] Legacy 말풍선 #${index}:`, {
              className: containerData.className,
            });
          }
        });

        // 연속 메시지 감지 및 프로필 표시 업데이트
        updateMessageContainers();

        // 말풍선이 복원되면 스타일 적용
        console.log("[loadPreviewHTML] updateAfterStyles 호출");
        updateAfterStyles();
        updateOutputFromPreview();

        return true;
      }
    }
  } catch (e) {
    console.error("미리보기 HTML 로드 실패:", e);
  }
  return false;
}

// 파일 데이터 로드
function loadFileData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.FILE_DATA);
    if (saved) {
      const fileData = JSON.parse(saved);

      // AppState 복원
      AppState.currentFileType = fileData.currentFileType || null;
      AppState.csvData = fileData.csvData || [];
      AppState.xlsxData = fileData.xlsxData || [];
      AppState.txtData = fileData.txtData || [];
      AppState.conversationPairsMap = fileData.conversationPairsMap || {};
      AppState.youCount = fileData.youCount || 1;
      AppState.youColors = fileData.youColors || {};

      // 파일 데이터가 있으면 캐릭터 드롭다운 복원
      if (
        AppState.currentFileType &&
        Object.keys(AppState.conversationPairsMap).length > 0
      ) {
        // youCount 백업 (populateInitialCharacterDropdowns가 1로 리셋하기 때문)
        const savedYouCount = fileData.youCount || 1;

        if (typeof populateInitialCharacterDropdowns === "function") {
          populateInitialCharacterDropdowns();
        }

        // youCount 복원
        AppState.youCount = savedYouCount;
        console.log(
          "[loadFileData] AppState.youCount 복원:",
          AppState.youCount
        );

        // YOU2, YOU3 등 추가 드롭다운 생성 (youCount > 1인 경우)
        if (fileData.youCount > 1) {
          console.log(
            "[loadFileData] YOU2+ 드롭다운 생성 시작, youCount:",
            fileData.youCount
          );
          const container = document.getElementById("youCharactersContainer");
          const allCharacters = Object.keys(
            AppState.conversationPairsMap
          ).sort();

          // 첫 번째 YOU를 YOU1로 변경
          const firstDiv = container.querySelector("div");
          if (firstDiv) {
            const firstLabel = firstDiv.querySelector("label");
            if (firstLabel) {
              firstLabel.childNodes[0].textContent = "YOU1: ";
            }
          }

          // YOU2부터 youCount까지 드롭다운 생성
          for (let i = 2; i <= fileData.youCount; i++) {
            const newDiv = document.createElement("div");
            newDiv.style.display = "flex";
            newDiv.style.alignItems = "center";
            newDiv.style.gap = "5px";
            newDiv.style.marginBottom = "5px";
            newDiv.dataset.youNumber = i;

            // 저장된 색상 또는 기본 색상 사용
            const savedColors =
              fileData.autoYouColors &&
              fileData.autoYouColors[`youCharacter${i}`];
            const defaultBg = savedColors ? savedColors.bg : "#4a5568";
            const defaultColor = savedColors ? savedColors.color : "#ffffff";

            // 프로필 사진 원형
            if (typeof createProfileCircle === "function") {
              const profileCircle = createProfileCircle(`youCharacter${i}`);
              newDiv.appendChild(profileCircle);
            }

            // YOU 드롭다운
            const youLabel = document.createElement("label");
            youLabel.style.margin = "0";
            youLabel.innerHTML = `YOU${i}: <select id="youCharacter${i}">
              <option value="">선택하세요</option>
              ${allCharacters
                .map((char) => `<option value="${char}">${char}</option>`)
                .join("")}
            </select>`;
            newDiv.appendChild(youLabel);

            // 배경 색상
            const bgLabel = document.createElement("label");
            bgLabel.style.margin = "0";
            bgLabel.style.fontSize = "12px";
            bgLabel.innerHTML = `배경<input type="color" id="youBg_youCharacter${i}" value="${defaultBg}" style="width: 40px; height: 25px;" />`;
            newDiv.appendChild(bgLabel);

            // 글자 색상
            const colorLabel = document.createElement("label");
            colorLabel.style.margin = "0";
            colorLabel.style.fontSize = "12px";
            colorLabel.innerHTML = `글자<input type="color" id="youColor_youCharacter${i}" value="${defaultColor}" style="width: 40px; height: 25px;" />`;
            newDiv.appendChild(colorLabel);

            // 삭제 버튼
            const deleteBtn = document.createElement("button");
            deleteBtn.style.marginTop = "22px";
            deleteBtn.style.marginLeft = "5px";
            deleteBtn.style.padding = "2px 9px 4px 9px";
            deleteBtn.textContent = "-";
            deleteBtn.onclick = function () {
              removeYouCharacter(i);
            };
            newDiv.appendChild(deleteBtn);

            const addBtn = document.getElementById("addYouBtn");
            if (addBtn) {
              container.insertBefore(newDiv, addBtn);
            }

            // 이벤트 리스너 추가
            const newSelect = document.getElementById(`youCharacter${i}`);
            if (newSelect) {
              newSelect.addEventListener("change", function () {
                if (typeof updatePartnerDropdown === "function") {
                  updatePartnerDropdown("you", this.value);
                }
                if (typeof updateAllDropdowns === "function") {
                  updateAllDropdowns();
                }
                if (typeof saveFileData === "function") {
                  saveFileData();
                }
              });
            }
          }

          // 색상 이벤트 리스너 추가
          if (typeof attachAutoColorListeners === "function") {
            attachAutoColorListeners();
          }
        }

        // 선택된 ME 캐릭터 복원
        if (fileData.selectedMe) {
          const meSelect = document.getElementById("meCharacter");
          if (meSelect) {
            meSelect.value = fileData.selectedMe;
          }
        }

        // 선택된 YOU 캐릭터들 복원
        if (fileData.selectedYous) {
          Object.keys(fileData.selectedYous).forEach((youId) => {
            const select = document.getElementById(youId);
            if (select) {
              select.value = fileData.selectedYous[youId];
            }
          });
        }

        // 자동 생성용 ME 색상 복원
        if (fileData.autoMeColors) {
          const meBgAuto = document.getElementById("meBg_auto");
          const meColorAuto = document.getElementById("meColor_auto");
          if (meBgAuto) meBgAuto.value = fileData.autoMeColors.bg;
          if (meColorAuto) meColorAuto.value = fileData.autoMeColors.color;
        }

        // 자동 생성용 YOU 색상들 복원
        if (fileData.autoYouColors) {
          console.log(
            "[loadFileData] YOU 색상 복원 시작:",
            fileData.autoYouColors
          );
          Object.keys(fileData.autoYouColors).forEach((youId) => {
            const bgInput = document.getElementById(`youBg_${youId}`);
            const colorInput = document.getElementById(`youColor_${youId}`);
            if (bgInput) {
              bgInput.value = fileData.autoYouColors[youId].bg;
              console.log(
                `[loadFileData] ${youId} 배경색 복원:`,
                fileData.autoYouColors[youId].bg
              );
            } else {
              console.warn(
                `[loadFileData] ${youId} 배경 input을 찾을 수 없음!`
              );
            }
            if (colorInput) {
              colorInput.value = fileData.autoYouColors[youId].color;
              console.log(
                `[loadFileData] ${youId} 글자색 복원:`,
                fileData.autoYouColors[youId].color
              );
            } else {
              console.warn(
                `[loadFileData] ${youId} 글자 input을 찾을 수 없음!`
              );
            }
          });
        }

        // 드롭다운 업데이트
        if (typeof updateAllDropdowns === "function") {
          updateAllDropdowns();
        }
        if (typeof updateAddYouButtonVisibility === "function") {
          updateAddYouButtonVisibility();
        }

        // 프로필 사진 복원
        const savedImages = localStorage.getItem(STORAGE_KEYS.PROFILE_IMAGES);
        if (savedImages) {
          try {
            AppState.profileImages = JSON.parse(savedImages);
            // UI 업데이트
            for (const targetId in AppState.profileImages) {
              if (typeof updateProfileImageUI === "function") {
                updateProfileImageUI(
                  targetId,
                  AppState.profileImages[targetId]
                );
              }
            }
          } catch (e) {
            console.error("프로필 사진 복원 실패:", e);
          }
        }

        // 프로필 색상 복원
        const savedColors = localStorage.getItem(STORAGE_KEYS.PROFILE_COLORS);
        if (savedColors) {
          try {
            AppState.profileColors = JSON.parse(savedColors);
            // UI 업데이트 (이미지가 없는 경우만)
            for (const targetId in AppState.profileColors) {
              if (!AppState.profileImages[targetId] && typeof updateProfileColorUI === "function") {
                updateProfileColorUI(
                  targetId,
                  AppState.profileColors[targetId]
                );
              }
            }
          } catch (e) {
            console.error("프로필 색상 복원 실패:", e);
          }
        }

        // preview의 모든 메시지에 프로필 정보 적용
        if (typeof applyProfileToAllMessages === "function") {
          applyProfileToAllMessages();
        }

        // 스타일 업데이트 (말풍선 꼬리 등) - 색상 복원 직후 바로 적용
        console.log("[loadFileData] updateAfterStyles 호출 (1차 - 즉시)");
        if (typeof updateAfterStyles === "function") {
          updateAfterStyles();
        }

        // DOM 렌더링 완료 후 재적용 (안전장치)
        requestAnimationFrame(() => {
          console.log(
            "[loadFileData] updateAfterStyles 호출 (2차 - requestAnimationFrame)"
          );
          if (typeof updateAfterStyles === "function") {
            updateAfterStyles();
          }
          // 추가 안전장치: 한 번 더 확인
          setTimeout(() => {
            console.log(
              "[loadFileData] updateAfterStyles 호출 (3차 - setTimeout 20ms)"
            );
            if (typeof updateAfterStyles === "function") {
              updateAfterStyles();
            }
          }, 20);
        });
      }

      return true;
    }
  } catch (e) {
    console.error("파일 데이터 로드 실패:", e);
  }
  return false;
}

// 모든 데이터 로드
function loadAllData() {
  loadGlobalStyles();
  loadMeColors();
  loadYouColors();
  loadFileData(); // 파일 데이터를 먼저 로드 (드롭다운 복원)
  loadPreviewHTML();

  // 전역 스타일 적용
  if (typeof applyGlobalStylesToPreview === "function") {
    applyGlobalStylesToPreview();
  }

  // DOM 렌더링 완료 후 스타일 재적용 (YOU2, YOU3 after 요소 최종 보장)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (typeof updateAfterStyles === "function") {
        updateAfterStyles();
      }
      if (typeof updateOutputFromPreview === "function") {
        updateOutputFromPreview();
      }
    });
  });
}

// 모든 데이터 초기화
function clearAllData() {
  try {
    // localStorage 초기화
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });

    // 페이지 새로고침
    location.reload();
  } catch (e) {
    console.error("데이터 초기화 실패:", e);
  }
}

// 페이지 로드 시 데이터 복원
document.addEventListener("DOMContentLoaded", function () {
  // 약간의 지연을 두고 로드 (다른 초기화 완료 후)
  setTimeout(() => {
    loadAllData();
  }, 100);

  // 초기화 버튼에 이벤트 리스너 추가
  const resetBtn = document.getElementById("reset");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (
        confirm("모든 데이터를 초기화하시겠습니까? 페이지가 새로고침됩니다.")
      ) {
        clearAllData();
      }
    });
  }

  // 설정 초기화 버튼에 이벤트 리스너 추가
  const settingResetBtn = document.getElementById("setting-reset");
  if (settingResetBtn) {
    settingResetBtn.addEventListener("click", () => {
      if (confirm("서식 설정을 초기화하시겠습니까?")) {
        if (typeof resetGlobalSettings === "function") {
          resetGlobalSettings();
        }
      }
    });
  }
});
