import React, { useState, useEffect } from 'react';
import { useStore } from './store';
import { getVehicleStatsForCharacter } from '../config/vehicleStats';

// A component to display the current vehicle stats for debugging
// This can be toggled with a key press (default: F2)
export const VehicleStatsDebug = () => {
  const [visible, setVisible] = useState(false);
  const { selectedCharacter } = useStore();
  const vehicleStats = getVehicleStatsForCharacter(selectedCharacter);
  
  // Toggle visibility with F2 key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        setVisible(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Don't render anything if not visible
  if (!visible) return null;
  
  return (
    <div className="vehicle-stats-debug">
      <h3>Vehicle Stats Debug (F2)</h3>
      <p><strong>Character:</strong> {selectedCharacter}</p>
      
      <table>
        <thead>
          <tr>
            <th>Stat</th>
            <th>Multiplier</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(vehicleStats).map(([key, value]) => {
            // Skip the description field
            if (key === 'description') return null;
            
            return (
              <tr key={key}>
                <td>{key}</td>
                <td>{value}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}; 