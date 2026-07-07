/* Local workout history: localStorage only, no accounts, no cloud. */

const HistoryStore = (() => {
  const KEY = 'hiit_history';

  function all() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch (e) { return []; }
  }

  function save(entry) {
    const list = all();
    list.push(entry);
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  function clear() {
    localStorage.removeItem(KEY);
  }

  function isoWeekKey(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = (d.getUTCDay() + 6) % 7; // Monday = 0
    d.setUTCDate(d.getUTCDate() - dayNum + 3);
    const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
    const weekNum = 1 + Math.round(((d - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
    return `${d.getUTCFullYear()}-W${weekNum}`;
  }

  function thisMonthCount() {
    const now = new Date();
    return all().filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
  }

  function currentStreakWeeks() {
    const weeks = new Set(all().map(e => isoWeekKey(new Date(e.date))));
    if (weeks.size === 0) return 0;
    let streak = 0;
    let cursor = new Date();
    while (true) {
      const key = isoWeekKey(cursor);
      if (weeks.has(key)) {
        streak++;
        cursor.setDate(cursor.getDate() - 7);
      } else {
        break;
      }
    }
    return streak;
  }

  return { all, save, clear, thisMonthCount, currentStreakWeeks };
})();
