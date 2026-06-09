'use client';

import { useState } from 'react';
import './FlipCard.css';

export default function FlipCard({ frontContent, backContent, onFlip }) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    if (onFlip) onFlip(!isFlipped);
  };

  return (
    <div className={`flip-card-container ${isFlipped ? 'flipped' : ''}`} onClick={handleFlip}>
      <div className="flip-card-inner">
        <div className="flip-card-front glass-panel">
          {frontContent}
        </div>
        <div className="flip-card-back glass-panel">
          {backContent}
        </div>
      </div>
    </div>
  );
}
