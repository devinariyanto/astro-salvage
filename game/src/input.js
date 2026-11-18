// Keyboard + mouse state, kept separate from the game rules so the
// loop can ask "what is the pilot doing right now?" without touching DOM
// events itself. One-shot actions (confirm, pause, restart, mute, draft
// picks) are queued and drained once per frame by main.js.
export const ACT_CONFIRM = 1;
export const ACT_PAUSE = 2;
export const ACT_RESTART = 4;
export const ACT_MUTE = 8;

export function createInput(canvas) {
  const keys = new Set();
  const state = {
    keys,
    mouseX: 640, mouseY: 360, mouseDown: false, mouseSeen: false,
    queued: 0, draftPick: -1,
  };

  const CODE_TO_ACTION = {
    Space: ACT_CONFIRM, Enter: ACT_CONFIRM,
    KeyP: ACT_PAUSE, Escape: ACT_PAUSE,
    KeyR: ACT_RESTART, KeyM: ACT_MUTE,
  };

  window.addEventListener('keydown', (ev) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(ev.code)) ev.preventDefault();
    if (ev.repeat) return;
    keys.add(ev.code);
    const act = CODE_TO_ACTION[ev.code];
    if (act) state.queued |= act;
    if (ev.code === 'Digit1') state.draftPick = 0;
    if (ev.code === 'Digit2') state.draftPick = 1;
    if (ev.code === 'Digit3') state.draftPick = 2;
  });
  window.addEventListener('keyup', (ev) => keys.delete(ev.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (ev) => {
    const r = canvas.getBoundingClientRect();
    state.mouseX = (ev.clientX - r.left) * (1280 / r.width);
    state.mouseY = (ev.clientY - r.top) * (720 / r.height);
    state.mouseSeen = true;
  });
  canvas.addEventListener('mousedown', (ev) => {
    state.mouseDown = true;
    if (ev.button === 0) state.queued |= ACT_CONFIRM;
  });
  window.addEventListener('mouseup', () => { state.mouseDown = false; });

  return state;
}

// -1/0/1 per axis from WASD or arrow keys.
export function moveAxis(input) {
  const k = input.keys;
  const x = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
  const y = (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0);
  return { x, y };
}

export function firing(input) {
  return input.keys.has('Space') || input.mouseDown;
}

export function dashing(input) {
  return input.keys.has('ShiftLeft') || input.keys.has('ShiftRight');
}

export function takeActions(input) {
  const a = input.queued;
  input.queued = 0;
  return a;
}

export function takeDraftPick(input) {
  const p = input.draftPick;
  input.draftPick = -1;
  return p;
}
