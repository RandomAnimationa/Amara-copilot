"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCompletion = getCompletion;
exports.getEdit = getEdit;
const axios_1 = __importDefault(require("axios"));
const AMARA_URL = "http://amara-core.taileb58f5.ts.net"; // Ajusta al endpoint real
async function getCompletion(prompt) {
    const response = await axios_1.default.post(`${AMARA_URL}/completion`, {
        prompt,
        max_tokens: 200,
        temperature: 0.7
    });
    return response.data.text || "";
}
async function getEdit(code, instruction) {
    const response = await axios_1.default.post(`${AMARA_URL}/edit`, {
        code,
        instruction
    });
    return response.data.diff || "";
}
