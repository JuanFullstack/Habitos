import React from 'react';
import { HabitCard } from '../UIComponents';
import { HABITOS_LIST, HABITOS_TRACKING } from '../../constants';
import { getHabitStats } from '../../utils/calculations';
import { Database, TimeRange } from '../../types';

interface HabitsViewProps {
  db: Database;
  timeRange: TimeRange;
}

export const HabitsView: React.FC<HabitsViewProps> = ({ db, timeRange }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fadeIn">
      {HABITOS_LIST.map(habito => {
          const definition = HABITOS_TRACKING.find(h => h.id.toLowerCase() === habito.toLowerCase());
          if (!definition) return null;
          return (
            <HabitCard 
              key={habito} 
              name={habito} 
              stats={getHabitStats(db, habito, definition, timeRange)} 
            />
          );
      })}
    </div>
  );
};