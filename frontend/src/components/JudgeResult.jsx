import { useEffect, useState } from 'react';
import { CharacterIcon, IconUser, IconTrophy, IconBulb, IconCross } from './Icons';
import { getLabels, getMaxScore } from '../data/scoring';
import '../styles/judge.css';

/**
 * JudgeResult - Displays AI judge evaluation with score visualization.
 * Scoring logic externalized to data/scoring.js.
 */
export default function JudgeResult({ data, modeId, characterName, characterId, onClose, rewardTickets = 0 }) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // 短い遅延を入れてマウント後に幅を0から変化させる
    const timer = setTimeout(() => setAnimate(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const userTotal = data.user_total || 0;
  const aiTotal = data.ai_total || 0;
  const userWin = userTotal >= aiTotal;
  const userScore = data.user_score || {};
  const aiScore = data.ai_score || {};

  const labelMap = getLabels(modeId);
  const keys = Object.keys(labelMap);

  return (
    <div className="judge-overlay" onClick={onClose}>
      <div className="judge-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="judge-modal__header">
          <h2 className="judge-modal__title">
            <IconTrophy size={22} className="judge-modal__title-icon" />
            AIジャッジ判定
          </h2>
          <button
            id="close-judge"
            className="judge-modal__close"
            onClick={onClose}
            aria-label="閉じる"
          >
            <IconCross size={16} />
          </button>
        </div>

        {/* Winner Banner */}
        <div className={`judge-modal__winner ${userWin ? 'judge-modal__winner--user' : 'judge-modal__winner--ai'}`}>
          <span className="judge-modal__winner-icon">
            {userWin
              ? <IconTrophy size={28} />
              : <CharacterIcon characterId={characterId} size={28} />
            }
          </span>
          <span className="judge-modal__winner-text">
            {userWin ? 'あなたの勝利！' : `${characterName} の勝利！`}
          </span>
        </div>

        {rewardTickets > 0 && (
          <div className="judge-modal__reward">
            🎟️ 勝利ボーナス： チケット +{rewardTickets} を獲得！
          </div>
        )}

        {/* Total Scores */}
        <div className="judge-modal__totals">
          <div className="judge-modal__total-card">
            <span className="judge-modal__total-label">
              <IconUser size={14} /> あなた
            </span>
            <span className="judge-modal__total-score">{userTotal}</span>
            <span className="judge-modal__total-unit">/ 100</span>
          </div>
          <div className="judge-modal__total-vs">VS</div>
          <div className="judge-modal__total-card">
            <span className="judge-modal__total-label">
              <CharacterIcon characterId={characterId} size={14} /> {characterName}
            </span>
            <span className="judge-modal__total-score">{aiTotal}</span>
            <span className="judge-modal__total-unit">/ 100</span>
          </div>
        </div>

        {/* Score Breakdown Bars */}
        <div className="judge-modal__breakdown">
          <h3 className="judge-modal__section-title">スコア内訳</h3>
          {keys.map((key) => {
            const userVal = userScore[key] || 0;
            const aiVal = aiScore[key] || 0;
            const maxVal = getMaxScore(modeId, key);
            return (
              <div key={key} className="score-bar-row">
                <div className="score-bar-row__label">{labelMap[key]}</div>
                <div className="score-bar-row__bars">
                  <div className="score-bar-row__bar-container score-bar-row__bar-container--user">
                    <div
                      className="score-bar-row__bar score-bar-row__bar--user"
                      style={{ width: animate ? `${(userVal / maxVal) * 100}%` : '0%' }}
                    >
                      <span className="score-bar-row__value">{userVal}</span>
                    </div>
                  </div>
                  <div className="score-bar-row__bar-container score-bar-row__bar-container--ai">
                    <div
                      className="score-bar-row__bar score-bar-row__bar--ai"
                      style={{ width: animate ? `${(aiVal / maxVal) * 100}%` : '0%' }}
                    >
                      <span className="score-bar-row__value">{aiVal}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div className="score-bar-row__legend">
            <span className="score-bar-row__legend-user">-- あなた</span>
            <span className="score-bar-row__legend-ai">-- {characterName}</span>
          </div>
        </div>

        {/* Feedback */}
        <div className="judge-modal__feedback">
          <h3 className="judge-modal__section-title">フィードバック</h3>
          <p className="judge-modal__feedback-text">{data.feedback}</p>
          
          {data.title && (
            <div className="judge-modal__highlight" style={{ marginTop: '1rem', borderLeftColor: '#f1c40f', backgroundColor: 'rgba(241, 196, 15, 0.1)' }}>
              <span className="judge-modal__highlight-label" style={{ color: '#f1c40f' }}>
                <IconTrophy size={14} /> 獲得称号：{data.title}
              </span>
              <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>{data.title_reason}</p>
            </div>
          )}

          {data.mission_result && (
            <div className="judge-modal__highlight" style={{ marginTop: '1rem', borderLeftColor: data.mission_result === 'クリア' ? '#2ecc71' : '#e74c3c', backgroundColor: data.mission_result === 'クリア' ? 'rgba(46, 204, 113, 0.1)' : 'rgba(231, 76, 60, 0.1)' }}>
              <span className="judge-modal__highlight-label" style={{ color: data.mission_result === 'クリア' ? '#2ecc71' : '#e74c3c' }}>
                デイリーミッション：{data.mission_result}
              </span>
              <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>{data.mission_reason}</p>
            </div>
          )}

          {data.highlight && (
            <div className="judge-modal__highlight" style={{ marginTop: '1rem' }}>
              <span className="judge-modal__highlight-label">
                <IconBulb size={14} /> ハイライト
              </span>
              <p>{data.highlight}</p>
            </div>
          )}
        </div>

        <button
          id="close-judge-bottom"
          className="btn btn-primary judge-modal__close-btn"
          onClick={onClose}
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
