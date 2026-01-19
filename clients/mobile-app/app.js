const status = document.getElementById('status');
const toggleShift = document.getElementById('toggleShift');
let onDuty = true;

toggleShift.onclick = () => {
  onDuty = !onDuty;
  status.textContent = onDuty ? 'On Duty' : 'Off Duty';
  status.style.background = onDuty ? '#10b981' : '#6b7280';
  toggleShift.textContent = onDuty ? 'Check-out' : 'Check-in';
};
