// server/utils/timeControl.js

/**
 * Parses, validates, and categorizes a time control string.
 * @param {string} timeControl - e.g., "10+5"
 * @returns {{minutes: number, increment: number, category: string, timeControl: string}}
 */
export const getTimeControlInfo = (timeControl) => {
  if (typeof timeControl !== 'string' || !timeControl.includes('+')) {
    return { minutes: 10, increment: 0, category: 'Rapid', timeControl: '10+0' }; // Safe default
  }

  let [minutes, increment] = timeControl.split('+').map(Number);

  if (isNaN(minutes) || isNaN(increment)) {
    return { minutes: 10, increment: 0, category: 'Rapid', timeControl: '10+0' }; // Safe default
  }

  // Sanitize initial values to reasonable limits
  minutes = Math.max(1, Math.min(minutes, 1440)); // 1 minute to 1 day
  increment = Math.max(0, Math.min(increment, 180)); // 0 to 3 minutes

  let category = 'Daily';
  // FIDE time controls are based on total time: minutes * 60 + increment * 60
  // For simplicity, we'll categorize based on base time + a bonus for increment
  const estimatedTotalSeconds = (minutes * 60) + (increment * 40);

  if (estimatedTotalSeconds < 180) { // Under 3 mins
    category = 'Bullet';
    increment = Math.min(increment, 2); // Max 2s increment for Bullet
  } else if (estimatedTotalSeconds < 600) { // Under 10 mins
    category = 'Blitz';
    increment = Math.min(increment, 5); // Max 5s increment for Blitz
  } else if (estimatedTotalSeconds <= 3600) { // 10 to 60 mins
    category = 'Rapid';
    increment = Math.min(increment, 60); // Max 60s increment for Rapid
  }
  
  if (category === 'Daily') {
      increment = 0; // Daily games have no increment
  }

  return { minutes, increment, category, timeControl: `${minutes}+${increment}` };
};