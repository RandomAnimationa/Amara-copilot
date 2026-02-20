import { getCompletion, getEdit } from "./api";
import { showSuggestion, showDiff } from "./ui";

export async function onEditorTyping(context: string) {
  const suggestion = await getCompletion(context);
  showSuggestion(suggestion);
}

export async function onRequestEdit(fullCode: string, instruction: string) {
  const diff = await getEdit(fullCode, instruction);
  showDiff(diff);
}
