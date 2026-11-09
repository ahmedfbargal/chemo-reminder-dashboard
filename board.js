'use strict';

const paths = {
  heart:'<path d="M21 8.5C21 13 12 19 12 19S3 13 3 8.5A4.5 4.5 0 0 1 12 8a4.5 4.5 0 0 1 9 .5Z"/><path d="M3 11h5l1.5-3 2.5 6 2-3h7"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4m8-4v4M3 10h18m-14 5h2m3 0h2"/>',
  history:'<path d="M3 11a9 9 0 1 1 2 7M3 5v6h6m3-4v5l3 2"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  left:'<path d="m15 18-6-6 6-6"/>',
  right:'<path d="m9 18 6-6-6-6"/>',
  search:'<circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/>',
  check:'<path d="m5 12 4 4 10-10"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>'
};
function icon(name) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths[name] + '</svg>';
}
document.querySelectorAll('[data-icon]').forEach(node => { node.innerHTML = icon(node.dataset.icon); });

const get = id => document.getElementById(id);
const shortDate = new Intl.DateTimeFormat('en', {month:'short', day:'numeric'});
const dayName = new Intl.DateTimeFormat('en', {weekday:'short'});
const clock = new Intl.DateTimeFormat('en', {hour:'numeric', minute:'2-digit'});
const logTime = new Intl.DateTimeFormat('en', {month:'short', day:'numeric', hour:'numeric', minute:'2-digit'});
const storageKey = 'careboard-preview-v1';
const form = get('form');
const fields = form.elements;
const editor = get('editor');

function dateKey(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}
function asDate(day) { return new Date(day + 'T12:00:00'); }
function offset(day, count) {
  const date = asDate(day);
  date.setDate(date.getDate() + count);
  return dateKey(date);
}
function readable(day) { return shortDate.format(asDate(day)); }
function timeAt(day, time) { return clock.format(new Date(day + 'T' + time)); }
function escapeHtml(value) {
  const replacements = {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'};
  return String(value).replace(/[&<>"']/g, char => replacements[char]);
}
function load(today) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(saved?.appointments) && Array.isArray(saved?.activity)) return saved;
  } catch {}
  const records = [
    [0,'09:00','A','Treatment visit','Completed','1'],
    [0,'14:00','B','Treatment visit','Scheduled','1'],
    [1,'10:30','C','Follow-up appointment','Scheduled','1'],
    [3,'11:15','D','Treatment visit','Rescheduled','2'],
    [5,'13:00','A','Follow-up appointment','Scheduled','0']
  ];
  return {
    appointments:records.map(([day,time,letter,title,status,reminder], index) => ({
      id:'demo-' + index, patient:'Demo patient ' + letter, title, date:offset(today, day), time, status, reminder
    })),
    activity:[{title:'Demo schedule created', detail:'Five fictional appointments loaded.', at:Date.now()}]
  };
}
let week = dateKey(new Date());
let selected = '';
let state = load(week);
let editing = null;
let timer;
function weekEntries() {
  const end = offset(week, 6);
  return state.appointments.filter(item => item.date >= week && item.date <= end);
}
function reminder(item) {
  if (item.status === 'Completed') return '—';
  if (item.reminder === '0') return 'No reminder';
  if (!item.date || !item.time) return 'Choose a date and time.';
  const date = offset(item.date, -Number(item.reminder));
  return readable(date) + ' · ' + timeAt(date, item.time);
}
function renderRows() {
  const query = get('search').value.trim().toLowerCase();
  const status = get('filter').value;
  const rows = weekEntries().filter(item =>
    (!selected || selected === item.date) && (!status || item.status === status) &&
    (item.patient + ' ' + item.title).toLowerCase().includes(query)
  ).sort((a,b) => (a.date + a.time).localeCompare(b.date + b.time));
  get('selection').innerHTML = selected ? readable(selected) + ' <button id="all-days">Show all days</button>' : 'All appointments';
  get('rows').innerHTML = rows.map(item => {
    const patient = escapeHtml(item.patient);
    const initials = escapeHtml(item.patient.split(/\s+/).slice(-2).map(word => word[0]).join('').toUpperCase());
    return '<tr><td><div class="person"><span class="avatar" aria-hidden="true">' + initials + '</span><div><strong>' + patient +
      '</strong><span class="muted">' + escapeHtml(item.title) + '</span></div></div></td><td><strong>' + readable(item.date) +
      '</strong><span class="muted">' + timeAt(item.date,item.time) + '</span></td><td><span class="badge ' + escapeHtml(item.status.toLowerCase()) +
      '">' + escapeHtml(item.status) + '</span></td><td>' + reminder(item) + '</td><td><button class="button edit" data-edit="' +
      escapeHtml(item.id) + '" aria-label="Edit ' + patient + ' on ' + readable(item.date) + '">Edit</button></td></tr>';
  }).join('');
  get('empty').hidden = rows.length > 0;
}
function render() {
  const entries = weekEntries();
  const today = dateKey(new Date());
  const end = offset(week, 6);
  const summary = [
    ['Appointments',entries.length,'In this 7-day period','calendar'],
    ['Rescheduled',entries.filter(item => item.status === 'Rescheduled').length,'Moved to a new date or time','history'],
    ['Completed',entries.filter(item => item.status === 'Completed').length,'Marked complete','check']
  ];
  get('metrics').innerHTML = summary.map(([title,count,detail,image]) =>
    '<article class="metric"><div><p>' + title + '</p><strong>' + count + '</strong><small>' + detail +
    '</small></div><span class="metric-icon">' + icon(image) + '</span></article>'
  ).join('');
  get('period').textContent = readable(week) + ' – ' + readable(end) + ', ' + asDate(end).getFullYear();
  get('days').innerHTML = Array.from({length:7}, (_,index) => {
    const key = offset(week,index);
    const date = asDate(key);
    const count = entries.filter(item => item.date === key).length;
    const label = dayName.format(date) + ', ' + readable(key) + ', ' + count + (count === 1 ? ' appointment' : ' appointments');
    return '<button class="day" data-day="' + key + '" aria-pressed="' + (key === selected) + '" aria-label="' + label + '"' +
      (key === today ? ' aria-current="date"' : '') + '><span>' + dayName.format(date) + '</span><strong>' +
      date.getDate() + '</strong><span class="count">' + (count ? count + (count === 1 ? ' visit' : ' visits') : '–') + '</span></button>';
  }).join('');
  renderRows();
}
function showView() {
  const activity = location.hash === '#activity';
  get('schedule').hidden = activity;
  get('activity').hidden = !activity;
  get('crumb').textContent = activity ? 'Activity log' : 'Schedule';
  get(activity ? 'activity-link' : 'schedule-link').setAttribute('aria-current','page');
  get(activity ? 'schedule-link' : 'activity-link').removeAttribute('aria-current');
  if (activity) get('history').innerHTML = state.activity.map(entry => '<article class="event"><strong>' +
    escapeHtml(entry.title) + '</strong><p>' + escapeHtml(entry.detail) + ' · ' + logTime.format(entry.at) + '</p></article>').join('');
}
function updateReminder() {
  const draft = Object.fromEntries(new FormData(form));
  get('hint').textContent = draft.status === 'Completed'
    ? 'Completed appointments have no pending reminder.'
    : 'Reminder preview · ' + reminder(draft);
}
function openEditor(item) {
  editing = item ?? null;
  get('editor-title').textContent = item ? 'Edit appointment' : 'Add appointment';
  get('complete').hidden = !item || item.status === 'Completed';
  const draft = item ?? {patient:'',title:'',date:selected || week,time:'09:00',status:'Scheduled',reminder:'1'};
  for (const field of fields) {
    if (!field.name) continue;
    field.value = draft[field.name];
    field.setCustomValidity('');
  }
  updateReminder();
  editor.showModal();
  fields.patient.focus();
}
function goTo(day) {
  week = day;
  selected = '';
  render();
}
function clearFilters() {
  selected = '';
  get('search').value = '';
  get('filter').value = '';
}
form.addEventListener('submit', event => {
  event.preventDefault();
  const draft = Object.fromEntries(new FormData(form));
  for (const key of ['patient','title']) {
    draft[key] = draft[key].trim();
    fields[key].setCustomValidity(draft[key] ? '' : 'Enter a value.');
  }
  if (!form.reportValidity()) return;
  const moved = editing && (editing.date !== draft.date || editing.time !== draft.time);
  if (moved && draft.status === 'Scheduled') draft.status = 'Rescheduled';
  draft.id = editing?.id ?? 'local-' + Array.from(
    crypto.getRandomValues(new Uint32Array(4)), part => part.toString(16).padStart(8, '0')
  ).join('');
  const title = !editing ? 'Appointment added' : editing.status !== 'Completed' && draft.status === 'Completed'
    ? 'Appointment completed' : moved ? 'Appointment rescheduled' : 'Appointment updated';
  const detail = draft.patient + ' · ' + readable(draft.date) + ' at ' + timeAt(draft.date,draft.time);
  state = {
    appointments: editing ? state.appointments.map(item => item.id === draft.id ? draft : item) : [...state.appointments,draft],
    activity:[{title, detail, at:Date.now()}, ...state.activity].slice(0,100)
  };
  let message = title;
  try {
    localStorage.setItem(storageKey,JSON.stringify(state));
  } catch {
    message += ' for this session';
    get('footer').textContent = 'Browser storage is unavailable. Changes last until you close or reload this page.';
  }
  if (draft.date < week || draft.date > offset(week,6)) week = draft.date;
  clearFilters();
  editor.close();
  render();
  [...get('rows').querySelectorAll('[data-edit]')].find(button => button.dataset.edit === draft.id)?.focus();
  get('toast').textContent = message;
  clearTimeout(timer);
  timer = setTimeout(() => { get('toast').textContent = ''; },3000);
});
get('add').addEventListener('click', () => openEditor());
get('close').addEventListener('click', () => editor.close());
get('cancel').addEventListener('click', () => editor.close());
get('complete').addEventListener('click', () => {
  fields.status.value = 'Completed';
  updateReminder();
  form.requestSubmit();
});
for (const name of ['patient','title']) fields[name].addEventListener('input', () => fields[name].setCustomValidity(''));
for (const name of ['date','time','status','reminder']) fields[name].addEventListener('change', updateReminder);
get('previous').addEventListener('click', () => goTo(offset(week,-7)));
get('next').addEventListener('click', () => goTo(offset(week,7)));
get('today').addEventListener('click', () => goTo(dateKey(new Date())));
get('search').addEventListener('input', renderRows);
get('filter').addEventListener('change', renderRows);
get('clear').addEventListener('click', () => { clearFilters(); render(); get('search').focus(); });
get('days').addEventListener('click', event => {
  const day = event.target.closest('[data-day]')?.dataset.day;
  if (!day) return;
  selected = selected === day ? '' : day;
  render();
  get('days').querySelector('[data-day="' + day + '"]').focus();
});
get('selection').addEventListener('click', event => {
  if (event.target.id !== 'all-days') return;
  selected = '';
  render();
  get('search').focus();
});
get('rows').addEventListener('click', event => {
  const id = event.target.closest('[data-edit]')?.dataset.edit;
  const item = state.appointments.find(row => row.id === id);
  if (item) openEditor(item);
});
window.addEventListener('hashchange',showView);
render();
showView();
