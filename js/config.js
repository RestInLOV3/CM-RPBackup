// 전역 상태 관리
const AppState = {
  csvData: [],
  xlsxData: [],
  txtData: [],
  conversationPairsMap: {}, // 캐릭터 이름 -> 대화 상대 목록
  currentFileType: null, // 'csv', 'xlsx', 'txt'
  youCount: 1, // YOU 캐릭터 개수 (1부터 시작)
  maxCharacters: 0, // 최대 캐릭터 수
  youColors: {}, // YOU별 색상 저장 { youCharacter: {bg: '#...', color: '#...'}, ... }
  profileImages: {}, // 프로필 사진 저장 { meCharacter_auto: 'base64...', youCharacter: 'base64...', ... }
  profileColors: {}, // 프로필 색상 저장 { meCharacter_auto: '#...', youCharacter: '#...', ... }
};

// 스타일 템플릿
const STYLE_BLOCK = `<style>
.speech-bubble { position: relative; padding: 15px 20px; box-shadow: 0 4px 8px rgba(0,0,0,0.2); line-height:1.5; display:block; width:fit-content; max-width:60%; word-wrap:break-word; white-space:normal; margin-bottom:5px; text-align:justify; font-family:kopub돋움L; }
.speech-bubble-you { background:#292929; border-radius: 0px 20px 20px 20px; color:#fff; margin-left:30px; }
.speech-bubble-you:after { content:""; position:absolute; left:-8px; top:0px; width:0; height:0; border:9px solid transparent; border-top-color:#292929; }
.speech-bubble-me { background:#f0f0f0; border-radius: 20px 0px 20px 20px; color:#333; margin-left:auto; margin-right:30px; }
.speech-bubble-me:after { content:""; position:absolute; right:-8px; top:0px; width:0; height:0; border:9px solid transparent; border-top-color:#f0f0f0; }
.speech-bubble-you + .speech-bubble-me, .speech-bubble-me + .speech-bubble-you { margin-top:20px; }
</style><br><br>`;

// 기본 색상 팔레트
const DEFAULT_YOU_COLORS = [
  { bg: "#292929", color: "#ffffff" }, // 검정
  { bg: "#4a5568", color: "#ffffff" }, // 진회색
  { bg: "#2d3748", color: "#ffffff" }, // 어두운 회색
  { bg: "#1a365d", color: "#ffffff" }, // 어두운 파랑
  { bg: "#22543d", color: "#ffffff" }, // 어두운 초록
];

// 기본 ME 색상
const DEFAULT_ME_COLORS = {
  bg: "#f0f0f0",
  color: "#333333",
};
