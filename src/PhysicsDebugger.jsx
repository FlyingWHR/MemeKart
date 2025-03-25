import { Debug } from "@react-three/rapier";
import { useEffect, useState } from "react";

export const PhysicsDebugger = () => {
  const [showDebug, setShowDebug] = useState(false);
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "F3") {
        setShowDebug(prev => !prev);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  
  // Only show the physics debug in development mode
  if (process.env.NODE_ENV !== "development" || !showDebug) {
    return null;
  }
  
  return <Debug />;
}; 