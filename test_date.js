const getDiffDays = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr + 'T12:00:00');
    if (isNaN(d.getTime())) return null;
    const today = new Date();
    return Math.floor((today.getTime() - d.getTime()) / (1000 * 3600 * 24));
  };
console.log(getDiffDays('2026-06-01'));
