"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onEditorTyping = onEditorTyping;
exports.onRequestEdit = onRequestEdit;
const api_1 = require("./api");
const ui_1 = require("./ui");
async function onEditorTyping(context) {
    const suggestion = await (0, api_1.getCompletion)(context);
    (0, ui_1.showSuggestion)(suggestion);
}
async function onRequestEdit(fullCode, instruction) {
    const diff = await (0, api_1.getEdit)(fullCode, instruction);
    (0, ui_1.showDiff)(diff);
}
