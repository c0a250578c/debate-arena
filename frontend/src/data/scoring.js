/**
 * Scoring configuration — labels and max scores per mode.
 * Shared between JudgeResult UI and any future scoring logic.
 */

export function getLabels(modeId) {
  switch (modeId) {
    case 'rap':
      return {
        rhyme: '韻の固さ',
        flow: 'フロウ',
        punchline: 'パンチライン',
        entertainment: 'エンタメ性',
      };
    case 'persuade':
      return {
        persuasion: '説得力',
        empathy: '共感力',
        practicality: '実用性',
        logic: '論理性',
      };
    default: // debate
      return {
        logic: '論理性',
        evidence: '根拠の質',
        rebuttal: '反論力',
        structure: '構成力',
      };
  }
}

export function getMaxScore(modeId, key) {
  const maxScores = {
    debate: { logic: 35, evidence: 25, rebuttal: 25, structure: 15 },
    rap: { rhyme: 35, flow: 20, punchline: 25, entertainment: 20 },
    persuade: { persuasion: 30, empathy: 25, practicality: 25, logic: 20 },
  };
  return maxScores[modeId]?.[key] || 25;
}
