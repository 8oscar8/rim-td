// 무기와 재질의 상수 데이터
export const WEAPPON_CATEGORIES = ['blunt', 'sharp', 'ranged'];

export const WEAPON_DB = {
  // 둔기
  '맨손/목재': { type: 'blunt', tech: 'primitive', grade: 'Common', dmg: 10, spd: 0.5, ap: 0, effect: null },
  '곤봉': { type: 'blunt', tech: 'primitive', grade: 'Common', dmg: 14, spd: 0.5, ap: 0, effect: null },
  '철퇴': { type: 'blunt', tech: 'primitive', grade: 'Uncommon', dmg: 35, spd: 0.5, ap: 0, effect: null },
  '전투망치': { type: 'blunt', tech: 'advanced', grade: 'Rare', dmg: 110, spd: 0.38, ap: 0.2, effect: 'armor_break', shred: 8 },
  '제우스망치': { type: 'blunt', tech: 'advanced', grade: 'Legendary', dmg: 550, spd: 0.33, ap: 0.5, effect: 'stun', fixedMaterial: 'None' },
  '엘텍스 지팡이': { type: 'blunt', tech: 'advanced', grade: 'Special', dmg: 35, spd: 0.38, ap: 0, range: 150, effect: 'aura_cd', fixedMaterial: 'None' },

  // 날붙이
  '단검': { type: 'sharp', tech: 'primitive', grade: 'Common', dmg: 12, spd: 1.0, ap: 0, effect: null },
  '단창': { type: 'sharp', tech: 'primitive', grade: 'Common', dmg: 18, spd: 0.8, ap: 0.2, effect: null },
  '검': { type: 'sharp', tech: 'primitive', grade: 'Common', dmg: 16, spd: 0.8, ap: 0, effect: null },
  '창': { type: 'sharp', tech: 'primitive', grade: 'Uncommon', dmg: 23, spd: 0.6, ap: 0.3, effect: null },
  '장검': { type: 'sharp', tech: 'primitive', grade: 'Rare', dmg: 40, spd: 0.7, ap: 0, effect: null },
  '파괴용 도끼': { type: 'sharp', tech: 'advanced', grade: 'Rare', dmg: 85, spd: 0.45, ap: 0.5, effect: 'armor_break', shred: 6 },
  '트럼보 뿔': { type: 'sharp', tech: 'primitive', grade: 'Epic', dmg: 110, spd: 0.6, ap: 0.3, effect: 'knockback', fixedMaterial: 'None' },
  '플라즈마검': { type: 'sharp', tech: 'advanced', grade: 'Legendary', dmg: 95, spd: 0.7, ap: 0.3, effect: null, shred: 15, fixedMaterial: 'None' },
  '단분자검': { type: 'sharp', tech: 'advanced', grade: 'Mythic', dmg: 135, spd: 0.9, ap: 0.95, effect: null, fixedMaterial: 'None' },
  '알파 트럼보 뿔': { type: 'sharp', tech: 'primitive', grade: 'Hidden', dmg: 250, spd: 1.1, ap: 0.5, effect: 'instakill', fixedMaterial: 'None' },
  '결속 단분자검': { type: 'sharp', tech: 'advanced', grade: 'Hidden', dmg: 300, spd: 1.3, ap: 1.0, effect: 'max_hp_percent', fixedMaterial: 'None' },
  '999강 나무몽둥이': { type: 'blunt', tech: 'primitive', grade: 'Hidden', dmg: 9999, spd: 2.0, ap: 1.0, range: 180, effect: 'knockback', fixedMaterial: 'Wood' },
  '전설의 꽁치검': { type: 'sharp', tech: 'advanced', grade: 'Hidden', dmg: 333, spd: 1.2, ap: 0.4, range: 200, effect: 'stun_long', fixedMaterial: 'None' },

  // 원거리 (Ranged)
  '단궁': { type: 'ranged', tech: 'primitive', grade: 'Common', dmg: 11, spd: 0.33, ap: 0.1, effect: 'arrow', range: 230 },
  '곡궁': { type: 'ranged', tech: 'primitive', grade: 'Common', dmg: 14, spd: 0.32, ap: 0.1, effect: 'arrow', range: 260 },
  '자동권총': { type: 'ranged', tech: 'advanced', grade: 'Common', dmg: 10, spd: 1.0, ap: 0.1, effect: null, range: 240 },

  '장궁': { type: 'ranged', tech: 'primitive', grade: 'Uncommon', dmg: 17, spd: 0.28, ap: 0.2, effect: 'arrow', range: 300 },
  '리볼버': { type: 'ranged', tech: 'advanced', grade: 'Uncommon', dmg: 18, spd: 0.5, ap: 0.2, effect: 'knockback', range: 260 },
  '볼트액션 소총': { type: 'ranged', tech: 'advanced', grade: 'Uncommon', dmg: 24, spd: 0.3, ap: 0.3, effect: null, range: 370 },
  '투창 다발': { type: 'ranged', tech: 'primitive', grade: 'Uncommon', dmg: 25, spd: 0.2, ap: 0.3, effect: 'arrow', range: 200 },

  '기관단총(SMG)': { type: 'ranged', tech: 'advanced', grade: 'Rare', dmg: 20, burst: 3, spd: 0.45, ap: 0.15, range: 240 },
  '돌격소총(AR)': { type: 'ranged', tech: 'advanced', grade: 'Rare', dmg: 40, burst: 3, spd: 0.4, ap: 0.25, effect: null, range: 310 },
  '전투 산탄총': { type: 'ranged', tech: 'advanced', grade: 'Rare', dmg: 60, burst: 3, spd: 0.4, ap: 0.3, effect: 'aoe_dmg', range: 140 },

  '저격소총': { type: 'ranged', tech: 'advanced', grade: 'Epic', dmg: 350, spd: 0.18, ap: 0.8, effect: 'armor_break', shred: 20, range: 480 },
  '차지 라이플': { type: 'ranged', tech: 'advanced', grade: 'Epic', dmg: 75, burst: 3, spd: 0.4, ap: 0.5, effect: null, range: 280 },
  '차지 랜스': { type: 'ranged', tech: 'advanced', grade: 'Epic', dmg: 280, spd: 0.2, ap: 0.9, effect: 'armor_break', shred: 15, range: 340 },

  '미니건': { type: 'ranged', tech: 'advanced', grade: 'Legendary', dmg: 120, burst: 25, spd: 0.25, ap: 0.3, effect: null, range: 310 },
  '빔 그레이저': { type: 'ranged', tech: 'advanced', grade: 'Legendary', dmg: 30, spd: 0.25, ap: 0.6, effect: 'multi_bullet', isTrueDamage: true, range: 9999 },

  '빔 리피터': { type: 'ranged', tech: 'advanced', grade: 'Mythic', dmg: 55, burst: 1, spd: 0.5, ap: 1.0, effect: 'multi_bullet', isTrueDamage: true, range: 9999 },

  // 투척류 및 특수 무기
  '파쇄 수류탄': { type: 'ranged', tech: 'advanced', grade: 'Common', dmg: 50, spd: 0.2, ap: 0.2, effect: 'aoe_dmg', shred: 10, range: 150 },
  '펄스 수류탄': { type: 'ranged', tech: 'advanced', grade: 'Uncommon', dmg: 5, spd: 0.15, ap: 0.5, effect: 'armor_break', shred: 12, range: 150 },
  '연막 발사기': { type: 'ranged', tech: 'advanced', grade: 'Rare', dmg: 0, spd: 0.1, ap: 0, effect: 'smoke', range: 250 },
  '화염병': { type: 'ranged', tech: 'advanced', grade: 'Rare', dmg: 10, spd: 0.2, ap: 0.1, effect: 'burn_fear', range: 150 },
  '독소 수류탄': { type: 'ranged', tech: 'advanced', grade: 'Epic', dmg: 5, spd: 0.1, ap: 0.8, effect: 'toxin', range: 180 }
};

export const MATERIAL_DB = {
  '나무': { matMul: 1.5, spdMul: 1.2, apMul: 0.1 },
  '강철': { matMul: 1.0, spdMul: 1.0, apMul: 1.0 },
  '플라스틸': { matMul: 1.1, spdMul: 1.4, apMul: 1.2 },
  '우라늄': { matMul: 1.8, spdMul: 0.6, apMul: 2.0 },
  '비취옥': { matMul: 0.4, spdMul: 0.4, apMul: 0.05 },
  'Slate': { matMul: 1.1, spdMul: 0.9, apMul: 0.2 },
  'None': { matMul: 1.0, spdMul: 1.0, apMul: 1.0 }
};

export const QUALITY_COEFFS = {
  awful: 0.4,
  normal: 1.0,
  excellent: 1.35,
  legendary: 1.55
};

export const GRADE_PROBABILITIES = {
  Common: 50.9,
  Uncommon: 30.0,
  Rare: 13.0,
  Epic: 5.0,
  Special: 0.1,
  Legendary: 0.8,
  Mythic: 0.19,
  Hidden: 0.01
};

export const QUALITY_PROBABILITIES = {
  awful: 10,
  normal: 70,
  excellent: 18,
  legendary: 2
};

export const MATERIAL_PROBABILITIES = {
  '나무': 40,
  '강철': 30,
  '플라스틸': 15,
  '우라늄': 10,
  '비취옥': 5
};
