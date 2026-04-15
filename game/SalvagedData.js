/**
 * SalvagedData.js
 * 기존 프로젝트에서 추출한 메운디 핵심 데이터 패키지
 */

// 1. 무기 등급별 소환 확률
export const GRADE_PROBABILITIES = {
  Common: 50.0,
  Uncommon: 30.0,
  Rare: 13.0,
  Epic: 5.0,
  Special: 1.0,
  Legendary: 0.8,
  Mythic: 0.19,
  Hidden: 0.01
};

// 2. 품질(Quality) 보정치
export const QUALITY_COEFFS = {
  awful: 0.4,
  normal: 1.0,
  excellent: 1.35,
  legendary: 1.55
};

// 3. 재질(Material) 보정치
export const MATERIAL_DATA = {
  '나무': { matMul: 1.5, spdMul: 1.2, apMul: 0.1 },
  '강철': { matMul: 1.0, spdMul: 1.0, apMul: 1.0 },
  '플라스틸': { matMul: 1.1, spdMul: 1.4, apMul: 1.2 },
  '우라늄': { matMul: 1.8, spdMul: 0.6, apMul: 2.0 },
  '비취옥': { matMul: 0.4, spdMul: 0.4, apMul: 0.05 }
};

// 4. 업그레이드(훈련) 초기 데이터
export const UPGRADE_CONFIG = {
  melee: { baseCost: 34, growth: 5, label: '날붙이' },
  blunt: { baseCost: 32, growth: 5, label: '둔기' },
  ranged: { baseCost: 45, growth: 8, label: '원거리' }
};

/**
 * 최종 데미지 계산기 (복구된 공식)
 * @param {number} baseDmg - 무기 기본 데미지
 * @param {string} quality - 품질 (awful, normal...)
 * @param {string} material - 재질 (나무, 강철...)
 * @param {number} upgradeLevel - 현재 강화 단계
 */
export function calculateFinalDamage(baseDmg, quality, material, upgradeLevel = 0) {
  const qMul = QUALITY_COEFFS[quality] || 1.0;
  const mMul = (MATERIAL_DATA[material] ? MATERIAL_DATA[material].matMul : 1.0);
  const uMul = 1 + (upgradeLevel * 0.1); // 레벨당 10% 단리 증가
  
  return baseDmg * qMul * mMul * uMul;
}
