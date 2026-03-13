import { CategoryId } from "./categories";
import { Difficulty } from "./contracts";

export type BuiltinFact = {
  id: string;
  categoryId: CategoryId;
  prompt: string;
  answer: string;
  wrongPool: string[];
  difficulty: Difficulty;
};

export const BUILTIN_FACTS: BuiltinFact[] = [
  {
    id: "history-1",
    categoryId: "history",
    prompt: "훈민정음을 창제한 왕은 누구인가요?",
    answer: "세종대왕",
    wrongPool: ["태종", "영조", "정조", "광해군", "고종", "성종"],
    difficulty: 1
  },
  {
    id: "history-2",
    categoryId: "history",
    prompt: "1919년 3월 1일에 일어난 독립운동은 무엇인가요?",
    answer: "3.1 운동",
    wrongPool: ["광주학생운동", "동학농민운동", "갑신정변", "임오군란", "병인양요", "을미사변"],
    difficulty: 1
  },
  {
    id: "history-3",
    categoryId: "history",
    prompt: "고구려를 세운 인물은 누구인가요?",
    answer: "주몽",
    wrongPool: ["박혁거세", "김수로왕", "온조", "궁예", "왕건", "연개소문"],
    difficulty: 2
  },
  {
    id: "history-4",
    categoryId: "history",
    prompt: "조선의 수도였던 도시는 어디인가요?",
    answer: "한양",
    wrongPool: ["평양", "개경", "경주", "공주", "부여", "전주"],
    difficulty: 1
  },
  {
    id: "history-5",
    categoryId: "history",
    prompt: "신라의 삼국 통일을 이끈 장군은 누구인가요?",
    answer: "김유신",
    wrongPool: ["을지문덕", "이순신", "계백", "강감찬", "최영", "정몽주"],
    difficulty: 2
  },
  {
    id: "geography-1",
    categoryId: "geography",
    prompt: "대한민국의 수도는 어디인가요?",
    answer: "서울",
    wrongPool: ["부산", "인천", "대전", "광주", "대구", "수원"],
    difficulty: 1
  },
  {
    id: "geography-2",
    categoryId: "geography",
    prompt: "세계에서 가장 큰 대양은 무엇인가요?",
    answer: "태평양",
    wrongPool: ["대서양", "인도양", "북극해", "남극해", "지중해", "홍해"],
    difficulty: 1
  },
  {
    id: "geography-3",
    categoryId: "geography",
    prompt: "이집트를 흐르는 대표적인 강은 무엇인가요?",
    answer: "나일강",
    wrongPool: ["아마존강", "미시시피강", "양쯔강", "메콩강", "한강", "갠지스강"],
    difficulty: 1
  },
  {
    id: "geography-4",
    categoryId: "geography",
    prompt: "일본의 최고봉은 무엇인가요?",
    answer: "후지산",
    wrongPool: ["에베레스트", "백두산", "킬리만자로", "몽블랑", "아소산", "알프스산"],
    difficulty: 2
  },
  {
    id: "geography-5",
    categoryId: "geography",
    prompt: "호주의 수도는 어디인가요?",
    answer: "캔버라",
    wrongPool: ["시드니", "멜버른", "브리즈번", "퍼스", "애들레이드", "다윈"],
    difficulty: 2
  },
  {
    id: "science-1",
    categoryId: "science",
    prompt: "물이 얼어 고체가 되는 온도(섭씨)는 몇 도인가요?",
    answer: "0도",
    wrongPool: ["10도", "-10도", "32도", "100도", "4도", "1도"],
    difficulty: 1
  },
  {
    id: "science-2",
    categoryId: "science",
    prompt: "지구가 태양을 한 바퀴 도는 데 걸리는 시간은 약 얼마인가요?",
    answer: "365일",
    wrongPool: ["30일", "180일", "24시간", "48시간", "500일", "720일"],
    difficulty: 1
  },
  {
    id: "science-3",
    categoryId: "science",
    prompt: "사람이 숨을 쉴 때 가장 많이 들이마시는 기체는 무엇인가요?",
    answer: "질소",
    wrongPool: ["산소", "이산화탄소", "수소", "헬륨", "아르곤", "메탄"],
    difficulty: 2
  },
  {
    id: "science-4",
    categoryId: "science",
    prompt: "전류의 단위는 무엇인가요?",
    answer: "암페어",
    wrongPool: ["볼트", "와트", "줄", "뉴턴", "테슬라", "옴"],
    difficulty: 2
  },
  {
    id: "science-5",
    categoryId: "science",
    prompt: "광합성을 하는 식물의 기관은 주로 어디인가요?",
    answer: "잎",
    wrongPool: ["뿌리", "줄기", "꽃", "씨앗", "열매", "껍질"],
    difficulty: 1
  },
  {
    id: "culture-1",
    categoryId: "culture",
    prompt: "대한민국의 전통 명절로 설날 다음에 오는 큰 명절은 무엇인가요?",
    answer: "추석",
    wrongPool: ["단오", "정월대보름", "동지", "복날", "입춘", "한식"],
    difficulty: 1
  },
  {
    id: "culture-2",
    categoryId: "culture",
    prompt: "오케스트라에서 지휘를 담당하는 사람을 무엇이라 하나요?",
    answer: "지휘자",
    wrongPool: ["연출가", "작곡가", "프로듀서", "악장", "성악가", "평론가"],
    difficulty: 1
  },
  {
    id: "culture-3",
    categoryId: "culture",
    prompt: "한글날은 매년 몇 월 며칠인가요?",
    answer: "10월 9일",
    wrongPool: ["9월 10일", "10월 3일", "8월 15일", "12월 25일", "3월 1일", "6월 6일"],
    difficulty: 1
  },
  {
    id: "culture-4",
    categoryId: "culture",
    prompt: "한국 전통악기 중 줄을 뜯어 연주하는 악기는 무엇인가요?",
    answer: "가야금",
    wrongPool: ["장구", "징", "태평소", "꽹과리", "북", "피리"],
    difficulty: 2
  },
  {
    id: "culture-5",
    categoryId: "culture",
    prompt: "세계 4대 문명 중 메소포타미아 문명은 어느 강 유역에서 발달했나요?",
    answer: "티그리스-유프라테스강",
    wrongPool: ["나일강", "인더스강", "황허강", "한강", "아마존강", "도나우강"],
    difficulty: 3
  },
  {
    id: "sports-1",
    categoryId: "sports",
    prompt: "축구 경기에서 한 팀이 동시에 필드에 둘 수 있는 선수 수는 몇 명인가요?",
    answer: "11명",
    wrongPool: ["5명", "7명", "9명", "12명", "15명", "22명"],
    difficulty: 1
  },
  {
    id: "sports-2",
    categoryId: "sports",
    prompt: "올림픽이 일반적으로 몇 년마다 열리나요?",
    answer: "4년",
    wrongPool: ["1년", "2년", "3년", "5년", "6년", "8년"],
    difficulty: 1
  },
  {
    id: "sports-3",
    categoryId: "sports",
    prompt: "야구에서 투수가 던진 공 3개를 연속으로 스트라이크로 잡아내는 것을 무엇이라 하나요?",
    answer: "삼진",
    wrongPool: ["만루", "희생번트", "홈런", "도루", "볼넷", "병살"],
    difficulty: 1
  },
  {
    id: "sports-4",
    categoryId: "sports",
    prompt: "농구 한 쿼터는 FIBA 기준 몇 분인가요?",
    answer: "10분",
    wrongPool: ["8분", "12분", "15분", "20분", "24분", "30분"],
    difficulty: 2
  },
  {
    id: "sports-5",
    categoryId: "sports",
    prompt: "테니스 4대 메이저 대회를 묶어 부르는 말은 무엇인가요?",
    answer: "그랜드슬램",
    wrongPool: ["월드시리즈", "프리미어리그", "챔피언스리그", "월드컵", "마스터스", "슈퍼볼"],
    difficulty: 2
  },
  {
    id: "technology-1",
    categoryId: "technology",
    prompt: "웹 페이지의 구조를 정의하는 마크업 언어는 무엇인가요?",
    answer: "HTML",
    wrongPool: ["CSS", "JavaScript", "Python", "SQL", "C++", "Swift"],
    difficulty: 1
  },
  {
    id: "technology-2",
    categoryId: "technology",
    prompt: "인터넷에서 웹 페이지 주소를 나타내는 문자열을 무엇이라 하나요?",
    answer: "URL",
    wrongPool: ["IP", "USB", "CPU", "GPU", "DNS", "RAM"],
    difficulty: 1
  },
  {
    id: "technology-3",
    categoryId: "technology",
    prompt: "스마트폰 운영체제 중 구글이 개발한 것은 무엇인가요?",
    answer: "Android",
    wrongPool: ["iOS", "Windows", "HarmonyOS", "Ubuntu", "Tizen", "Symbian"],
    difficulty: 1
  },
  {
    id: "technology-4",
    categoryId: "technology",
    prompt: "데이터를 원격 서버에 저장하고 필요 시 인터넷으로 사용하는 컴퓨팅 방식을 무엇이라 하나요?",
    answer: "클라우드 컴퓨팅",
    wrongPool: ["온프레미스", "엣지 컴퓨팅", "가상현실", "블록체인", "사물인터넷", "멀티미디어"],
    difficulty: 2
  },
  {
    id: "technology-5",
    categoryId: "technology",
    prompt: "정보를 암호화해 위변조를 어렵게 만드는 분산 원장 기술은 무엇인가요?",
    answer: "블록체인",
    wrongPool: ["머신러닝", "가상메모리", "컴파일러", "데이터베이스", "인터럽트", "캐시"],
    difficulty: 3
  },
  {
    id: "history-6",
    categoryId: "history",
    prompt: "백제의 마지막 왕은 누구인가요?",
    answer: "의자왕",
    wrongPool: ["무왕", "근초고왕", "문무왕", "진흥왕", "태조왕", "동명왕"],
    difficulty: 3
  },
  {
    id: "geography-6",
    categoryId: "geography",
    prompt: "남아메리카 대륙에서 면적이 가장 큰 나라는 어디인가요?",
    answer: "브라질",
    wrongPool: ["아르헨티나", "칠레", "페루", "콜롬비아", "베네수엘라", "볼리비아"],
    difficulty: 2
  },
  {
    id: "science-6",
    categoryId: "science",
    prompt: "소리를 가장 빠르게 전달하는 매질은 무엇인가요?",
    answer: "고체",
    wrongPool: ["액체", "기체", "진공", "플라스마", "공기", "물"],
    difficulty: 2
  },
  {
    id: "culture-6",
    categoryId: "culture",
    prompt: "세계 책의 날은 일반적으로 몇 월 며칠로 알려져 있나요?",
    answer: "4월 23일",
    wrongPool: ["1월 1일", "3월 1일", "5월 5일", "6월 6일", "10월 9일", "12월 25일"],
    difficulty: 2
  },
  {
    id: "sports-6",
    categoryId: "sports",
    prompt: "마라톤의 공식 거리는 몇 km인가요?",
    answer: "42.195km",
    wrongPool: ["21.097km", "30km", "40km", "50km", "60km", "10km"],
    difficulty: 2
  },
  {
    id: "technology-6",
    categoryId: "technology",
    prompt: "CPU는 컴퓨터에서 주로 어떤 역할을 하나요?",
    answer: "연산과 제어",
    wrongPool: ["영구 저장", "화면 출력", "전원 공급", "냉각", "소리 입력", "네트워크 배선"],
    difficulty: 1
  }
];
