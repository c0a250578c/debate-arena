import { useState } from 'react';
import CharacterCard from './CharacterCard';
import ModeCard from './ModeCard';
import Particles from './Particles';
import { CHARACTERS, MODES } from '../data/characters';
import { DIFFICULTIES } from '../data/difficulties';
import { ModeIcon, CharacterIcon, IconArrowLeft, IconArrowRight, IconSword } from './Icons';
import '../styles/characters.css';

const STEP = {
  CHARACTER: 'character',
  MODE: 'mode',
};

/**
 * CharacterSelect - Main character & mode selection screen
 * 3-step flow: Choose Character → Choose Mode → Enter Topic → Start Battle
 */
export default function CharacterSelect({ onStartBattle }) {
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [selectedMode, setSelectedMode] = useState(null);
  const [difficulty, setDifficulty] = useState('normal'); // デフォルトはノーマル
  const [topic, setTopic] = useState('');
  const [step, setStep] = useState(STEP.CHARACTER);

  const handleCharacterClick = (charId) => {
    setSelectedCharacter(charId);
  };

  const handleModeClick = (modeId) => {
    setSelectedMode(modeId);
  };

  const handleProceed = () => {
    if (step === STEP.CHARACTER && selectedCharacter) {
      setStep(STEP.MODE);
    }
  };

  const handleBack = () => {
    setStep(STEP.CHARACTER);
    setSelectedMode(null);
    setTopic('');
  };

  const isReadyToStart = () => {
    return selectedCharacter && selectedMode && topic.trim();
  };

  const handleStartBattle = () => {
    if (isReadyToStart()) {
      const character = CHARACTERS.find((c) => c.id === selectedCharacter);
      const mode = MODES.find((m) => m.id === selectedMode);
      onStartBattle({ character, mode, topic: topic.trim(), difficulty });
    }
  };

  const selectedChar = CHARACTERS.find((c) => c.id === selectedCharacter);

  return (
    <div className="character-select">
      <Particles count={25} />
      <div className="arena-bg" />

      {/* Step 1: Character Selection */}
      {step === STEP.CHARACTER && (
        <>
          <header className="character-select__header">
            <h1 className="character-select__title">DEBATE ARENA</h1>
            <p className="character-select__subtitle">対戦相手を選べ</p>
          </header>

          <div className="character-grid">
            {CHARACTERS.map((char) => (
              <CharacterCard
                key={char.id}
                character={char}
                isSelected={selectedCharacter === char.id}
                onClick={() => handleCharacterClick(char.id)}
              />
            ))}
          </div>

          <div className="character-select__actions">
            <button
              id="proceed-to-mode"
              className="btn btn-primary"
              disabled={!selectedCharacter}
              onClick={handleProceed}
            >
              モード選択へ進む <IconArrowRight size={18} />
            </button>
            {!selectedCharacter && (
              <span className="character-select__hint">
                対戦相手を選択してください
              </span>
            )}
          </div>
        </>
      )}

      {/* Step 2: Mode Selection + Topic Input */}
      {step === STEP.MODE && (
        <>
          <header className="mode-select__header">
            <h1 className="mode-select__title">SELECT MODE</h1>
            <p className="mode-select__subtitle">
              <span className="mode-select__char-icon">
                <CharacterIcon characterId={selectedChar?.id} size={20} />
              </span>
              {selectedChar?.name} と戦うモードを選べ
            </p>
          </header>

          <div className="mode-grid">
            {MODES.map((mode) => (
              <ModeCard
                key={mode.id}
                mode={mode}
                isSelected={selectedMode === mode.id}
                onClick={() => handleModeClick(mode.id)}
              />
            ))}
          </div>

          {/* Difficulty Selection */}
          <div className="topic-section" style={{ marginTop: '1.5rem' }}>
            <label className="topic-section__label">
              難易度を選択
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              {DIFFICULTIES.map(diff => (
                <button
                  key={diff.id}
                  className={`btn ${difficulty === diff.id ? 'btn-primary' : 'btn-outline'}`}
                  style={{ flex: 1, minWidth: '100px', fontSize: '0.9rem', padding: '0.5rem' }}
                  onClick={() => setDifficulty(diff.id)}
                  title={diff.description}
                >
                  {diff.name}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem', textAlign: 'center' }}>
              {DIFFICULTIES.find(d => d.id === difficulty)?.description}
            </p>
          </div>

          {/* Topic Input */}
          <div className="topic-section" style={{ marginTop: '1.5rem' }}>
            <label htmlFor="topic-input" className="topic-section__label">
              ディベートのお題を入力、または下から選ぶ
            </label>
            <input
              id="topic-input"
              type="text"
              className="topic-section__input"
              placeholder="例: AIは人間の仕事を奪うか？"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleStartBattle();
                }
              }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.8rem' }}>
              {[
                "AIは人間の仕事を奪うか？",
                "レジ袋を完全廃止し、マイバッグを義務化すべきか？",
                "学校の制服は廃止すべきか？",
                "きのこたけのこ論争（どちらが優れているか？）",
                "キャッシュレス決済を完全義務化すべきか？",
                "週休3日制を全国で導入すべきか？",
                "宇宙開発に税金を投入し続けるべきか？",
                "宿題は廃止すべきか？",
                "タイムマシンが完成したら過去と未来どちらに行くべきか？",
                "全国民にベーシックインカムを導入すべきか？"
              ].map((preset, idx) => (
                <button
                  key={idx}
                  className="btn btn-outline"
                  style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', borderRadius: '4px', opacity: 0.8 }}
                  onClick={() => setTopic(preset)}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="nav-actions">
            <button
              id="back-to-characters"
              className="btn btn-ghost"
              onClick={handleBack}
            >
              <IconArrowLeft size={16} /> 戻る
            </button>
            <button
              id="start-battle"
              className="btn btn-primary"
              disabled={!isReadyToStart()}
              onClick={handleStartBattle}
            >
              <IconSword size={18} /> バトル開始
            </button>
          </div>
        </>
      )}
    </div>
  );
}
