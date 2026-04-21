/**
 * MonsterData.js
 * 라운드별 고정 몬스터 명단 데이터 (1~50라운드)
 */
export const FIXED_MONSTER_LIST = [
    { name: "쥐", type: "organic", img: "1쥐.webp" },            // 1
    { name: "다람쥐", type: "organic", img: "2.다람쥐.webp" },         // 2
    { name: "멧토끼", type: "organic", img: "3.멧토끼.webp" },         // 3
    { name: "눈토끼", type: "organic", img: "4.눈토끼.webp" },         // 4
    { name: "기니피그", type: "organic", img: "5.기니피그.webp" },       // 5
    { name: "폭탄쥐", type: "organic", img: "6.폭탄쥐.webp" },         // 6
    { name: "털실쥐", type: "organic", img: "7.털실쥐.webp" },         // 7
    { name: "요크셔테리어", type: "organic", img: "8.요크셔테리어.webp" },   // 8
    { name: "리트리버", type: "organic", img: "9.리트리버.webp" },       // 9
    { name: "멧돼지", type: "organic", boss: true, img: "10.멧돼지.webp" }, // 10
    { name: "카피바라", type: "organic", img: "11.카피바라.webp" },       // 11
    { name: "비버", type: "organic", img: "12.비버.webp" },           // 12
    { name: "사슴", type: "organic", img: "13.사슴.webp" },           // 13
    { name: "가젤", type: "organic", img: "14.가젤.webp" },           // 14
    { name: "폭탄사슴", type: "organic", img: "15.폭탄사슴.webp" },       // 15
    { name: "알파카", type: "organic", img: "16.알파카.webp" },         // 16
    { name: "당나귀", type: "organic", img: "17.당나귀.webp" },         // 17
    { name: "말", type: "organic", img: "18.말.webp" },             // 18
    { name: "말코손바닥사슴", type: "organic", img: "19.말코손바닥사슴.webp" },  // 19
    { name: "거대늘보", type: "organic", boss: true, img: "20.거대늘보.webp" }, // 20
    { name: "머팔로", type: "organic", img: "21.머팔로.webp" },         // 21
    { name: "들소", type: "organic", img: "22.들소.webp" },           // 22
    { name: "코끼리", type: "organic", img: "23.코끼리.webp" },         // 23
    { name: "늑대", type: "organic", img: "24.늑대.webp" },           // 24
    { name: "울버린", type: "organic", img: "25.울버린.webp" },         // 25
    { name: "호랑이", type: "organic", img: "26.호랑이.webp" },         // 26
    { name: "곰", type: "organic", img: "27.곰.webp" },             // 27
    { name: "검치호", type: "organic", img: "28.검치호.webp" },         // 28
    { name: "와르그", type: "organic", img: "29.와르그.webp" },         // 29
    { name: "트럼보", type: "organic", boss: true, img: "30.트럼보.webp" }, // 30
    { name: "총알받이", type: "organic", img: "31.화살받이.webp" },       // 31 (화살받이 매칭)
    { name: "궁수", type: "organic", img: "32.궁수.webp" },           // 32
    { name: "전사", type: "organic", img: "33.전사.webp" },           // 33
    { name: "사냥꾼", type: "organic", img: "34.사냥꾼.webp" },         // 34
    { name: "광전사", type: "organic", img: "35.광전사.webp" },         // 35
    { name: "대궁수", type: "organic", img: "36.대궁수.webp" },         // 36
    { name: "광전사대장", type: "organic", img: "37.광전사대장.webp" },     // 37
    { name: "궁수대장", type: "organic", img: "38.궁수대장.webp" },       // 38
    { name: "노예상", type: "organic", img: "39.노예상.webp" },         // 39
    { name: "고대인", type: "organic", boss: true, img: "40.고대인.webp" }, // 40
    { name: "방랑자", type: "organic", img: "41.방랑자.webp" },         // 41
    { name: "스케빈저", type: "organic", img: "42.스케빈저.webp" },       // 42
    { name: "척탄병", type: "organic", img: "43.척탄병.webp" },         // 43
    { name: "용병사수", type: "organic", img: "44.용병사수.webp" },       // 44
    { name: "용병저격수", type: "organic", img: "45.용병저격수.webp" },     // 45
    { name: "용병슬래셔", type: "organic", img: "46.용병슬래셔.webp" },     // 46
    { name: "중무장용병", type: "organic", img: "47.중무장용병.webp" },     // 47
    { name: "엘리트용병", type: "organic", img: "48.엘리트용병.webp" },     // 48
    { name: "정예용병", type: "organic", img: "49.정예용병.webp" },       // 49
    { name: "용병대장", type: "organic", boss: true, img: "50.용병대장.webp" }, // 50
    { name: "밀리터", type: "mech", img: "51.밀리터.webp" },            // 51
    { name: "리저너리", type: "mech", img: "52.리저너리.webp" },         // 52
    { name: "테서론", type: "mech", img: "53.테서론.webp" },           // 53
    { name: "스코처", type: "mech", img: "54.스코처.webp" },           // 54
    { name: "사이더", type: "mech", img: "55.사이더.webp" },           // 55
    { name: "랜서", type: "mech", img: "56.랜서.webp" },             // 56
    { name: "파이크맨", type: "mech", img: "57.파이크맨.webp" },           // 57
    { name: "센티피드", type: "mech", img: "58.센티피드.webp" },         // 58
    { name: "터마이트", type: "mech", img: "59.터마이트.webp" },         // 59
    { name: "워퀸", type: "mech", boss: true, img: "60.워퀸.webp" },    // 60
    { name: "터널러", type: "mech", img: "61.터널러.webp" },           // 61
    { name: "센츄리온", type: "mech", img: "62.센츄리온.webp" },         // 62
    { name: "사이클롭스", type: "mech", img: "63.사이클롭스.webp" },         // 63
    { name: "디아볼루스", type: "mech", img: "64.디아볼루스.webp" },         // 64
    { name: "아포크리톤", type: "mech", img: "65.아포크리톤.webp" },         // 65
    { name: "돌격병", type: "organic", img: "66.돌격병.webp" },         // 66
    { name: "제국척탄병", type: "organic", img: "67.제국척탄병.webp" },       // 67
    { name: "제국친위대", type: "organic", img: "68.제국친위대.webp" },       // 68
    { name: "용사", type: "organic", img: "69.용사.webp" },            // 69
    { name: "수여자", type: "organic", boss: true, img: "70.수여자.webp" }, // 70
    { name: "중무장병", type: "organic", img: "71.중무장병.webp" },         // 71
    { name: "종사", type: "organic", img: "72.종사.webp" },            // 72
    { name: "수련생", type: "organic", img: "73.수련생.webp" },           // 73
    { name: "기사", type: "organic", img: "74.기사.webp" },            // 74
    { name: "법무관", type: "organic", img: "75.법무관.webp" },           // 75
    { name: "남작", type: "organic", img: "76.남작.webp" },            // 76
    { name: "공작", type: "organic", img: "77.공작.webp" },            // 77
    { name: "별의감시자", type: "organic", img: "78.별의감시자.webp" },       // 78
    { name: "별의수호자", type: "organic", img: "79.별의수호자.webp" },       // 79
    { name: "항성군주", type: "organic", boss: true, img: "80.항성군주.webp" }, // 80
    { name: "상급하수인", type: "organic", img: "81.상급하수인.webp" },       // 81
    { name: "쐐기촉수", type: "organic", img: "82.쐐기촉수.webp" },         // 82
    { name: "삼발촉수", type: "organic", img: "83.삼발촉수.webp" },         // 83
    { name: "갑옷촉수", type: "organic", img: "84.갑옷촉수.webp" },         // 84
    { name: "살종양", type: "organic", img: "85.살종양.webp" },          // 85
    { name: "살덩이심장", type: "organic", img: "86.살덩이심장.webp" },       // 86
    { name: "암귀", type: "organic", img: "87.암귀.webp" },            // 87
    { name: "구울", type: "organic", img: "88.구울.webp" },            // 88
    { name: "휘청이는자", type: "organic", img: "89.휘청이는자.webp" },       // 89
    { name: "고통구체", type: "organic", boss: true, img: "90.고통구체.webp" }, // 90
    { name: "키메라", type: "organic", img: "91.키메라.webp" },           // 91
    { name: "걸신", type: "organic", img: "92.걸신.webp" },            // 92
    { name: "가시괴인", type: "organic", img: "93.가시괴인.webp" },         // 93
    { name: "메탈호러", type: "organic", img: "94.메탈호러.webp" },         // 94
    { name: "죽음안개", type: "organic", img: "95.죽음안개.webp" },         // 95
    { name: "피의비", type: "organic", img: "96.피의비.webp" },           // 96
    { name: "뒤틀린오벨리스크", type: "organic", img: "97.뒤틀린오벨리스크.webp" }, // 97
    { name: "타락한오벨리스크", type: "organic", img: "98.타락한오벨리스크.webp" }, // 98
    { name: "비뚤어진오벨리스크", type: "organic", img: "99.비뚤어진오벨리스크.webp" }, // 99
    { name: "타이난", type: "organic", boss: true, img: "100.타이난.webp" } // 100
];
