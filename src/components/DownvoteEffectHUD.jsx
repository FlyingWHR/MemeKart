import React from 'react';
import { useStore } from './store'; // Assuming store.jsx is in the same directory or adjust path
import { AnimatePresence, motion } from 'framer-motion';

export const DownvoteEffectHUD = () => {
  const ownPlayerId = useStore((state) => state.id);
  const playerEffects = useStore((state) => state.playerEffects);
  
  const isPlayerSlowedByItem = playerEffects[ownPlayerId]?.isSlowed || false;
  const downvoteIconSrc = "/images/downvote_icon.png"; // Path to your downvote icon

  return (
    <AnimatePresence>
      {isPlayerSlowedByItem && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.8 }}
          transition={{ duration: 0.3, ease: "circOut" }}
          style={{
            position: 'fixed',
            bottom: '120px', // Position above the item display / lap counter
            left: '20px',   // Typically where buffs/debuffs are shown
            zIndex: 1001, // Ensure it's above game elements but potentially below menus
            pointerEvents: 'none', // Non-interactive
            padding: '5px',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '5px',
          }}
        >
          <img
            src={downvoteIconSrc}
            alt="Slowed Down"
            style={{
              width: '48px', 
              height: '48px',
              objectFit: 'contain',
              filter: 'drop-shadow(0px 0px 3px rgba(255, 50, 50, 0.7))', // Reddish glow
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
