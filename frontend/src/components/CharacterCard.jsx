import React from 'react';
import { CharacterIcon, IconCheck } from './Icons';
import useKeyboardSelect from '../hooks/useKeyboardSelect';

/**
 * CharacterCard - Individual character selection card
 * Uses SVG icons for consistent cross-platform rendering.
 */
const CharacterCard = React.memo(({ character, isSelected, onClick }) => {
  const handleKeyDown = useKeyboardSelect(onClick);

  return (
    <div
      id={`character-card-${character.id}`}
      className={`character-card ${isSelected ? 'character-card--selected' : ''}`}
      data-character={character.id}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`${character.name}を選択`}
      onKeyDown={handleKeyDown}
    >
      {/* Selection check badge */}
      <div className="character-card__check" aria-hidden="true">
        <IconCheck size={14} />
      </div>

      {/* Avatar */}
      <div className="character-card__avatar">
        <CharacterIcon characterId={character.id} size={40} />
      </div>

      {/* Info */}
      <h3 className="character-card__name">{character.name}</h3>
      <span className="character-card__inspire">
        {character.inspire}
      </span>
      <p className="character-card__desc">{character.description}</p>

      {/* Tags */}
      <div className="character-card__tags">
        {character.tags.map((tag, i) => (
          <span key={i} className="character-card__tag">{tag}</span>
        ))}
      </div>
    </div>
  );
});

export default CharacterCard;
