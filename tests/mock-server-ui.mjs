// Stand-in for @minecraft/server-ui: records each form and answers it with ui.respond(form) (a test-provided function).
export const FormCancelationReason = { UserBusy: "UserBusy", UserClosed: "UserClosed" };
export const ui = { shown: [], respond: () => ({ canceled: true }) };
class Base {
  constructor(kind) { this.kind = kind; this.controls = []; this._title = ""; this._body = ""; }
  title(t) { this._title = t; return this; }
  body(b) { this._body = b; return this; }
  async show(player) { this.player = player; ui.shown.push(this); return ui.respond(this); }
}
export class ActionFormData extends Base {
  constructor() { super("action"); }
  button(text) { this.controls.push({ type: "button", text }); return this; }
  label() { return this; } header() { return this; } divider() { return this; }
}
export class ModalFormData extends Base {
  constructor() { super("modal"); }
  toggle(label, o) { this.controls.push({ type: "toggle", label, ...o }); return this; }
  slider(label, min, max, o) { this.controls.push({ type: "slider", label, min, max, ...o }); return this; }
  dropdown(label, items, o) { this.controls.push({ type: "dropdown", label, items, ...o }); return this; }
  submitButton() { return this; }
}
export class MessageFormData extends Base { constructor() { super("message"); } }
