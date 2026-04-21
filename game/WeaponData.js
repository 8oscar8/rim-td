// 무기와 재질의 상수 데이터
export const WEAPPON_CATEGORIES = ['blunt', 'sharp', 'ranged'];

export const WEAPON_DB = {
  // 둔기 (Blunt)
  '맨손/목재': { type: 'blunt', tech: 'primitive', grade: 'Common', dmg: 10, spd: 0.5, ap: 0, effect: null },
  '곤봉': { type: 'blunt', tech: 'primitive', grade: 'Common', dmg: 14, spd: 0.5, ap: 0, effect: null },
  '철퇴': { type: 'blunt', tech: 'primitive', grade: 'Uncommon', dmg: 35, spd: 0.5, ap: 0, effect: null },
  '전투망치': { type: 'blunt', tech: 'advanced', grade: 'Rare', dmg: 110, spd: 0.38, ap: 0.2, effect: 'melee_aoe', range: 60 },
  '제우스망치': { type: 'blunt', tech: 'advanced', grade: 'Legendary', dmg: 550, spd: 0.33, ap: 0.5, effect: 'stun', fixedMaterial: 'None' },
  '엘텍스 지팡이': { type: 'blunt', tech: 'advanced', grade: 'Mythic', dmg: 35, spd: 0.38, ap: 0, range: 150, effect: 'aura_cd', fixedMaterial: 'None' },
  '999강 나무몽둥이': { type: 'blunt', tech: 'primitive', grade: 'Hidden', dmg: 9999, spd: 2.0, ap: 1.0, range: 180, effect: 'knockback', fixedMaterial: 'Wood' },

  // 날붙이 (Sharp)
  '단검': { type: 'sharp', tech: 'primitive', grade: 'Common', dmg: 12, spd: 1.0, ap: 0, effect: null },
  '단창': { type: 'sharp', tech: 'primitive', grade: 'Common', dmg: 18, spd: 0.8, ap: 0.2, effect: null },
  '검': { type: 'sharp', tech: 'primitive', grade: 'Common', dmg: 16, spd: 0.8, ap: 0, effect: null, attackSound: 'assets/audio/weaponsound/칼소리.ogg' },
  '창': { type: 'sharp', tech: 'primitive', grade: 'Uncommon', dmg: 23, spd: 0.6, ap: 0.3, effect: null },
  '장검': { type: 'sharp', tech: 'primitive', grade: 'Rare', dmg: 40, spd: 0.7, ap: 0, effect: 'melee_aoe', range: 70, attackSound: 'assets/audio/weaponsound/칼소리.ogg' },
  '파괴용 도끼': { type: 'sharp', tech: 'advanced', grade: 'Rare', dmg: 85, spd: 0.45, ap: 0.5, effect: 'armor_break', shred: 6 },
  '트럼보 뿔': { type: 'sharp', tech: 'primitive', grade: 'Epic', dmg: 110, spd: 0.6, ap: 0.3, effect: 'knockback', fixedMaterial: 'None' },
  '플라즈마검': { type: 'sharp', tech: 'advanced', grade: 'Legendary', dmg: 95, spd: 0.7, ap: 0.3, effect: null, shred: 15, fixedMaterial: 'None' },
  '단분자검': { type: 'sharp', tech: 'advanced', grade: 'Mythic', dmg: 135, spd: 0.9, ap: 0.95, effect: null, fixedMaterial: 'None' },
  '알파 트럼보 뿔': { type: 'sharp', tech: 'primitive', grade: 'Hidden', dmg: 250, spd: 1.1, ap: 0.5, effect: 'instakill', fixedMaterial: 'None' },
  '결속 단분자검': { type: 'sharp', tech: 'advanced', grade: 'Hidden', dmg: 300, spd: 1.3, ap: 1.0, effect: 'max_hp_percent', fixedMaterial: 'None' },
  '전설의 꽁치검': { type: 'sharp', tech: 'advanced', grade: 'Hidden', dmg: 333, spd: 1.2, ap: 0.4, range: 200, effect: 'stun_long', fixedMaterial: 'None' },

  // 원거리 (Ranged)
  '단궁': { type: 'ranged', tech: 'primitive', grade: 'Common', dmg: 11, spd: 0.33, ap: 0.1, effect: 'arrow', range: 230, attackSound: 'assets/audio/weaponsound/BowA.ogg' },
  '곡궁': { type: 'ranged', tech: 'primitive', grade: 'Common', dmg: 14, spd: 0.32, ap: 0.1, effect: 'arrow', range: 260, attackSound: 'assets/audio/weaponsound/BowA.ogg' },
  '자동권총': { type: 'ranged', tech: 'advanced', grade: 'Common', dmg: 10, spd: 1.0, ap: 0.1, effect: null, range: 240 },
  '인공자아핵': { type: 'special', tech: 'ultra', grade: 'Mythic', dmg: 0, spd: 0, ap: 0, range: 200, effect: 'aura_persona', fixedMaterial: 'None' },
  '시원한 은행가는 길': { type: 'ranged', tech: 'advanced', grade: 'Hidden', dmg: 350, spd: 0.15, ap: 0.5, effect: 'capitalist_rocket', range: 280 },

  '장궁': { type: 'ranged', tech: 'primitive', grade: 'Uncommon', dmg: 17, spd: 0.28, ap: 0.2, effect: 'arrow', range: 300, attackSound: 'assets/audio/weaponsound/BowA.ogg' },
  '리볼버': { type: 'ranged', tech: 'advanced', grade: 'Uncommon', dmg: 18, spd: 0.5, ap: 0.2, effect: 'knockback', range: 260 },
  '볼트액션 소총': { type: 'ranged', tech: 'advanced', grade: 'Uncommon', dmg: 24, spd: 0.3, ap: 0.3, effect: null, range: 370 },
  '투창 다발': { type: 'ranged', tech: 'primitive', grade: 'Uncommon', dmg: 25, spd: 0.2, ap: 0.3, effect: 'arrow', range: 200, attackSound: 'assets/audio/weaponsound/BowA.ogg' },

  '기관단총(SMG)': { type: 'ranged', tech: 'advanced', grade: 'Rare', dmg: 20, burst: 3, spd: 0.45, ap: 0.15, range: 240 },
  '돌격소총(AR)': { type: 'ranged', tech: 'advanced', grade: 'Rare', dmg: 40, burst: 3, spd: 0.4, ap: 0.25, effect: null, range: 310 },
  '전투 산탄총': { type: 'ranged', tech: 'advanced', grade: 'Rare', dmg: 180, spd: 0.4, ap: 0.3, effect: 'aoe_knockback', range: 100 },

  '저격소총': { type: 'ranged', tech: 'advanced', grade: 'Epic', dmg: 350, spd: 0.18, ap: 0.8, effect: 'armor_break', shred: 20, range: 480 },
  '차지 라이플': { type: 'ranged', tech: 'advanced', grade: 'Epic', dmg: 75, burst: 3, spd: 0.4, ap: 0.5, effect: null, range: 280 },
  '차지 랜스': { type: 'ranged', tech: 'advanced', grade: 'Epic', dmg: 280, spd: 0.2, ap: 0.9, effect: 'armor_break', shred: 15, range: 340 },

  '미니건': { type: 'ranged', tech: 'advanced', grade: 'Legendary', dmg: 120, burst: 25, spd: 0.8, ap: 0.3, effect: null, range: 310 },
  '빔 그레이저': { type: 'ranged', tech: 'advanced', grade: 'Legendary', dmg: 30, spd: 0.25, ap: 0.6, effect: 'multi_bullet', isTrueDamage: true, range: 9999 },
  '빔 리피터': { type: 'ranged', tech: 'advanced', grade: 'Mythic', dmg: 55, burst: 1, spd: 0.5, ap: 1.0, effect: 'instant_multi', isTrueDamage: true, range: 9999 },
  '신경석궁': { type: 'ranged', tech: 'advanced', grade: 'Mythic', dmg: 120, spd: 0.4, ap: 0.4, effect: 'toxic_stun', range: 190, attackSound: 'assets/audio/weaponsound/BowA.ogg' }
};

// 소모성 아이템 DB (타워로 건설 불가, 인벤토리에서 사용)
export const ITEM_DB = {
  'frag_grenade': { 
    name: '파쇄 수류탄', type: 'item', grade: 'Common', dmg: 250, ap: 0.2, effect: 'frag_stun', shred: 0, radius: 100, cooldown: 10,
    desc: '강력한 폭발로 넓은 범위에 피해를 줍니다. 유기체 적에게 4초간 기절 효과를 부여합니다.'
  },
  'pulse_grenade': { 
    name: '펄스 수류탄', type: 'item', grade: 'Uncommon', dmg: 50, ap: 0.5, effect: 'emp', shred: 0, radius: 120, cooldown: 12,
    desc: '강력한 전자기 파동(EMP)을 방출합니다. 보호막을 즉시 제거하며 기계류 적에게 6초간 강력한 마비 효과를 부여합니다.'
  },
  'molotov': { 
    name: '화염병', type: 'item', grade: 'Rare', dmg: 20, ap: 0.1, effect: 'burn_fear', radius: 80, cooldown: 15,
    desc: '지면에 7초간 유지되는 화염을 생성합니다. 범위 내 유기체는 도트뎀과 함께 패닉(공포) 상태에 빠집니다.'
  },
  'smoke_launcher': { 
    name: '연막 발사기', type: 'item', grade: 'Rare', dmg: 0, ap: 0, effect: 'smoke', radius: 150, cooldown: 20,
    desc: '지면에 8초간 하얀 연막 영역을 생성합니다. 영역 내 모든 적은 이동 속도가 대폭 감소합니다.'
  },
  'toxin_grenade': { 
    name: '독소 수류탄', type: 'item', grade: 'Epic', dmg: 10, ap: 0.8, effect: 'toxin', shred: 50, radius: 120, cooldown: 25,
    desc: '지면에 6초간 독가스 구름을 형성합니다. 영역 내 적들은 방어력이 지속적으로 부식(최대 30%)됩니다.'
  },
  'orbital_strike': { 
    name: '궤도 폭격', type: 'item', grade: 'Legendary', dmg: 99999999, ap: 1.0, effect: 'orbital', radius: 0, cooldown: 60,
    desc: '위성에서 발사되는 파괴적인 광선입니다. 보스를 제외한 전장의 모든 적을 즉시 소멸시킵니다.'
  },
  'psychic_lance': { 
    name: '정신충격창', type: 'item', grade: 'Legendary', dmg: 0, ap: 0, effect: 'psychic_stun', radius: 40, cooldown: 90,
    desc: '강력한 정신 파동을 집중 사격합니다. 대상이 보스일 경우 15초간 스턴시키며, 스턴 동안 보스 타이머가 멈춥니다.'
  },
  'go_juice': { 
    name: '고주스', type: 'item', grade: 'Epic', dmg: 0, ap: 0, effect: 'buff_aura', radius: 120, cooldown: 80,
    desc: '강력한 전투 고양 약물입니다. 지면에 20초간 유지되는 자극 영역을 생성하여, 범위 내 모든 우군 타워의 공격력과 공격 속도를 50% 향상시킵니다.'
  }
};

export const SPECIAL_CRAFT_DB = {
    '파쇄 수류탄': { silver: 300, steel: 150, component: 5 },
    '펄스 수류탄': { silver: 500, steel: 250, plasteel: 20, component: 10 },
    '화염병': { silver: 350, wood: 100, component: 5 },
    '연막 발사기': { silver: 400, steel: 180, component: 5 },
    '독소 수류탄': { silver: 1000, steel: 400, jade: 5, component: 15 },
    '정신충격창': { silver: 1500, uranium: 100, plasteel: 50, jade: 10, component: 20 },
    '고주스': { food: 500, herbalMedicine: 50, uranium: 20, component: 10 },
    '인공자아핵': { 
        silver: 5000, 
        wood: 3000, 
        steel: 2000, 
        plasteel: 500, 
        uranium: 200, 
        jade: 50, 
        component: 50, 
        researchPoints: 3000 
    }
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
  Common: 53.45,
  Uncommon: 31.0,
  Rare: 13.0,
  Epic: 2.3,
  Legendary: 0.2,
  Mythic: 0.05 // 일반 뽑기에서 고등급 기대값을 낮춰 고급 상자의 메리트 강화
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
