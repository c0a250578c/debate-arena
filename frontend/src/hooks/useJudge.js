/**
 * useJudge - Custom hook for AI judge evaluation
 */
import { useState, useCallback } from 'react';
import { apiClient } from '../api/client';

export default function useJudge() {
  const [judgeData, setJudgeData] = useState(null);
  const [judgeLoading, setJudgeLoading] = useState(false);
  const [showJudge, setShowJudge] = useState(false);
  const [rewardTickets, setRewardTickets] = useState(0);

  const requestJudge = useCallback(async ({ topic, characterId, modeId, difficulty, history }) => {
    if (history.length < 2) return;
    setJudgeLoading(true);
    setRewardTickets(0);

    try {
      const data = await apiClient.requestJudge({
        topic,
        character_id: characterId,
        mode_id: modeId,
        difficulty,
        history,
      });

      setJudgeData(data);
      setShowJudge(true);

      // Successfully judged -> Save history & collect reward
      try {
        const winner = data.user_total > data.ai_total ? 'win' : (data.user_total < data.ai_total ? 'lose' : 'draw');
        const saveRes = await apiClient.saveBattle({
          character_id: characterId,
          topic,
          result: winner,
          score: data.user_total || null,
          turns: history.map(m => ({ role: m.role, content: m.content }))
        });
        if (saveRes && saveRes.reward_tickets) {
          setRewardTickets(saveRes.reward_tickets);
        }
      } catch (saveErr) {
        console.error('Failed to save battle history:', saveErr);
      }

    } catch (error) {
      console.error('Judge error:', error);
      // Return error for caller to handle
      return { error: 'ジャッジの評価に失敗しました。バックエンドを確認してください。' };
    } finally {
      setJudgeLoading(false);
    }
    return null;
  }, []);

  const closeJudge = useCallback(() => {
    setShowJudge(false);
  }, []);

  return { judgeData, judgeLoading, showJudge, requestJudge, closeJudge, rewardTickets };
}
