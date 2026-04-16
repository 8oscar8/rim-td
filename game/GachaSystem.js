import { WEAPON_DB, MATERIAL_DB, GRADE_PROBABILITIES, QUALITY_PROBABILITIES, MATERIAL_PROBABILITIES } from './WeaponData.js';

export class GachaSystem {
  static draw(artisanLevel = 0) {
    // 1. 뽑기 등급(Grade) 결정
    const gradeRand = Math.random() * 100;
    let selectedGrade = 'Common';
    let cumulative = 0;
    for (const [grade, prob] of Object.entries(GRADE_PROBABILITIES)) {
      cumulative += prob;
      if (gradeRand <= cumulative) {
        selectedGrade = grade;
        break;
      }
    }

    // 2. 해당 등급에 맞는 무기들 추출 (수류탄/투여류 등 특수 효과 무기 제외)
    const excludeEffects = ['aoe_dmg', 'emp', 'smoke', 'burn_fear', 'toxin'];
    const availableWeapons = Object.entries(WEAPON_DB)
      .filter(([name, data]) => data.grade === selectedGrade && !excludeEffects.includes(data.effect))
      .map(([name, data]) => ({ name, ...data }));
    
    // 해당 등급 무기가 없으면 폴백 (기본 무기도 투척류가 아니어야 함)
    let weapon = availableWeapons.length > 0 
      ? availableWeapons[Math.floor(Math.random() * availableWeapons.length)] 
      : { name: '맨손/목재', ...WEAPON_DB['맨손/목재'] };

    // 3. 품질 결정 (장인 레벨 반영)
    let probs = { ...QUALITY_PROBABILITIES };
    if (artisanLevel > 0) {
      // 레벨당 Awful -2%, Normal -3%, Excellent +4%, Legendary +1%
      probs.awful = Math.max(0, probs.awful - (artisanLevel * 2));
      probs.normal = Math.max(0, probs.normal - (artisanLevel * 3));
      probs.excellent += (artisanLevel * 4);
      probs.legendary += (artisanLevel * 1);
    }

    const qualRand = Math.random() * 100;
    let selectedQuality = 'awful';
    let cumulativeQual = 0;
    for (const [qual, prob] of Object.entries(probs)) {
      cumulativeQual += prob;
      if (qualRand <= cumulativeQual) {
        selectedQuality = qual;
        break;
      }
    }

    // 4. 재질 결정 (가중치 적용: 나무 > 강철 > 플라스틸 > 우라늄 > 비취옥)
    let selectedMaterial = '강철'; 
    if (weapon.fixedMaterial) {
      selectedMaterial = weapon.fixedMaterial;
    } else {
      const matRand = Math.random() * 100;
      let cumulativeMat = 0;
      for (const [mat, prob] of Object.entries(MATERIAL_PROBABILITIES)) {
        cumulativeMat += prob;
        if (matRand <= cumulativeMat) {
          selectedMaterial = mat;
          break;
        }
      }
    }

    return { 
      weaponName: weapon.name, 
      weaponData: weapon, 
      quality: selectedQuality, 
      material: selectedMaterial 
    };
  }

  static drawSpecificGrade(targetGrade, artisanLevel = 0) {
    // 해당 등급에 맞는 무기들 번출 (투척류 제외)
    const excludeEffects = ['aoe_dmg', 'emp', 'smoke', 'burn_fear', 'toxin'];
    const availableWeapons = Object.entries(WEAPON_DB)
      .filter(([name, data]) => data.grade === targetGrade && !excludeEffects.includes(data.effect))
      .map(([name, data]) => ({ name, ...data }));
    
    if (availableWeapons.length === 0) return null;
    const weapon = availableWeapons[Math.floor(Math.random() * availableWeapons.length)];
    
    // 품질 결정 (장인 레벨 반영)
    let probs = { ...QUALITY_PROBABILITIES };
    if (artisanLevel > 0) {
      probs.awful = Math.max(0, probs.awful - (artisanLevel * 2));
      probs.normal = Math.max(0, probs.normal - (artisanLevel * 3));
      probs.excellent += (artisanLevel * 4);
      probs.legendary += (artisanLevel * 1);
    }

    const qualRand = Math.random() * 100;
    let selectedQuality = 'awful';
    let cumulativeQual = 0;
    for (const [qual, prob] of Object.entries(probs)) {
      cumulativeQual += prob;
      if (qualRand <= cumulativeQual) {
        selectedQuality = qual;
        break;
      }
    }

    // 재질 결정 (가중치 적용)
    let selectedMaterial = '강철'; 
    if (weapon.fixedMaterial) {
      selectedMaterial = weapon.fixedMaterial;
    } else {
      const matRand = Math.random() * 100;
      let cumulativeMat = 0;
      for (const [mat, prob] of Object.entries(MATERIAL_PROBABILITIES)) {
        cumulativeMat += prob;
        if (matRand <= cumulativeMat) {
          selectedMaterial = mat;
          break;
        }
      }
    }

    return { 
      weaponName: weapon.name, 
      weaponData: weapon, 
      quality: selectedQuality, 
      material: selectedMaterial 
    };
  }



  static drawAdvanced(artisanLevel = 0) {
    // 1. 희귀(Rare) 이상 등급만 필터링 및 확률 정규화
    const advancedGrades = ['Rare', 'Epic', 'Special', 'Legendary', 'Mythic', 'Hidden'];
    let totalAdvancedProb = 0;
    advancedGrades.forEach(g => totalAdvancedProb += GRADE_PROBABILITIES[g]);

    const gradeRand = Math.random() * totalAdvancedProb;
    let selectedGrade = 'Rare';
    let cumulative = 0;
    for (const grade of advancedGrades) {
      cumulative += GRADE_PROBABILITIES[grade];
      if (gradeRand <= cumulative) {
        selectedGrade = grade;
        break;
      }
    }

    // 2. 해당 등급 무기 추출 (뽑기 전용 로직 재사용)
    const excludeEffects = ['aoe_dmg', 'emp', 'smoke', 'burn_fear', 'toxin'];
    const availableWeapons = Object.entries(WEAPON_DB)
      .filter(([name, data]) => data.grade === selectedGrade && !excludeEffects.includes(data.effect))
      .map(([name, data]) => ({ name, ...data }));
    
    let weapon = availableWeapons.length > 0 
      ? availableWeapons[Math.floor(Math.random() * availableWeapons.length)] 
      : { name: '전투망치', ...WEAPON_DB['전투망치'] }; // 폴백 (Rare 기초 무기)

    // 3. 품질 결정 (고급 뽑기는 더 높은 기본 보너스 부여)
    let probs = { ...QUALITY_PROBABILITIES };
    const bonus = 10 + (artisanLevel * 5); // 기본 고급 보너스 + 장인 레벨
    
    probs.awful = Math.max(0, probs.awful - bonus);
    probs.normal = Math.max(0, probs.normal - bonus);
    probs.excellent += (bonus * 1.5);
    probs.legendary += (bonus * 0.5);

    const totalQ = Object.values(probs).reduce((a, b) => a + b, 0);
    const qualRand = Math.random() * totalQ;
    let selectedQuality = 'normal';
    let cumulativeQual = 0;
    for (const [qual, prob] of Object.entries(probs)) {
      cumulativeQual += prob;
      if (qualRand <= cumulativeQual) {
        selectedQuality = qual;
        break;
      }
    }

    // 4. 재질 결정 (고급 뽑기는 '나무' 확률을 대폭 낮춤)
    let selectedMaterial = '강철'; 
    if (weapon.fixedMaterial) {
      selectedMaterial = weapon.fixedMaterial;
    } else {
      let mProbs = { ...MATERIAL_PROBABILITIES };
      mProbs['나무'] = 5; // 나무 확률 최소화
      const totalM = Object.values(mProbs).reduce((a, b) => a + b, 0);
      
      const matRand = Math.random() * totalM;
      let cumulativeMat = 0;
      for (const [mat, prob] of Object.entries(mProbs)) {
        cumulativeMat += prob;
        if (matRand <= cumulativeMat) {
          selectedMaterial = mat;
          break;
        }
      }
    }

    return { 
      weaponName: weapon.name, 
      weaponData: weapon, 
      quality: selectedQuality, 
      material: selectedMaterial 
    };
  }

  // [추가] 현재 등급 확률 정보를 문자열로 반환
  static getGradeProbabilitiesString() {
    const korGrades = {
      Common: '일', Uncommon: '우', Rare: '희', Epic: '에',
      Special: '특', Legendary: '전', Mythic: '신', Hidden: '숨'
    };
    return Object.entries(GRADE_PROBABILITIES)
      .map(([grade, prob]) => `${korGrades[grade] || grade}(${prob}%)`)
      .join(', ');
  }

  /**
   * 조합 성공 시 상위 등급 중 하나를 무작위로 리롤하여 반환
   */
  static drawForCombination(currentGrade, artisanLevel = 0) {
    const grades = ['Common', 'Uncommon', 'Rare', 'Epic', 'Special', 'Legendary', 'Mythic', 'Hidden'];
    const curIdx = grades.indexOf(currentGrade);
    if (curIdx === -1 || curIdx >= grades.length - 1) return null;

    // 1. 상위 등급들에 대한 새로운 확률 분포 설정 (계획서 기준)
    let dist = {};
    if (currentGrade === 'Common') {
      dist = { Uncommon: 70, Rare: 20, Epic: 7, Legendary: 2, Mythic: 1 };
    } else if (currentGrade === 'Uncommon') {
      dist = { Rare: 65, Epic: 25, Legendary: 8, Mythic: 2 };
    } else {
      // 그 이상 등급 조합 (필요시) - 단순히 한 등급 위 확률 높게 설정
      const nextGrade = grades[curIdx + 1];
      dist[nextGrade] = 100;
    }

    const rand = Math.random() * 100;
    let targetGrade = grades[curIdx + 1]; // 기본값
    let cumulative = 0;
    for (const [grade, prob] of Object.entries(dist)) {
      cumulative += prob;
      if (rand <= cumulative) {
        targetGrade = grade;
        break;
      }
    }

    return this.drawSpecificGrade(targetGrade, artisanLevel);
  }

  // [복구] 특정 무기를 강제로 생성하여 반환 (시나리오 지급 전용)
  static createSpecificWeapon(name, quality = 'normal', material = '강철') {
    const weapon = WEAPON_DB[name];
    if (!weapon) {
      console.warn(`Weapon ${name} not found in DB!`);
      return { 
        weaponName: '맨손/목재', 
        weaponData: WEAPON_DB['맨손/목재'], 
        quality: 'normal', 
        material: '나무' 
      };
    }
    return {
      weaponName: name,
      weaponData: weapon,
      quality: quality,
      material: material
    };
  }
}
