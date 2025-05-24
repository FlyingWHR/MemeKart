import React from 'react';
import { useStore } from './store';
import { AnimatePresence, motion } from 'framer-motion';

export const MemeStickerHUD = () => {
  const isStickerActive = useStore((state) => state.isStickerActive);
  const stickerImage = useStore((state) => state.stickerImage);

  return (
    <AnimatePresence>
      {isStickerActive && stickerImage && (
        <motion.div
          initial={{ opacity: 0, scale: 0.3, rotate: -20 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.5, rotate: 20 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1500, // Ensure it's above game, below critical HUD like countdown/menu
            pointerEvents: 'none', 
          }}
        >
          <img
            src={stickerImage}
            alt="Meme Sticker"
            style={{
              maxWidth: '35vw', 
              maxHeight: '45vh',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              userSelect: 'none',
              opacity: 0.85, // Slightly transparent
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
