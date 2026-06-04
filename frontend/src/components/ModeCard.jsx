import React from 'react';
import { ModeIcon } from './Icons';
import useKeyboardSelect from '../hooks/useKeyboardSelect';

/**
 * ModeCard - Individual mode selection card
 */
const ModeCard = React.memo(({ mode, isSelected, onClick }) => {
  const handleKeyDown = useKeyboardSelect(onClick);

  return (
    <div
      id={`mode-card-${mode.id}`}
      className={`mode-card ${isSelected ? 'mode-card--selected' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onKeyDown={handleKeyDown}
    >
      <div className="mode-card__icon">
        <ModeIcon modeId={mode.id} size={36} />
      </div>
      <h3 className="mode-card__name">{mode.name}</h3>
      <p className="mode-card__desc">{mode.description}</p>
      <div className="mode-card__criteria">
        {mode.criteria.map((c, i) => (
          <span key={i} className="mode-card__criterion">{c}</span>
        ))}
      </div>
    </div>
  );
});

export default ModeCard;
