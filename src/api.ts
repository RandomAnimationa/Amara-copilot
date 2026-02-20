import axios from "axios";

const AMARA_URL = "http://amara-core.taileb58f5.ts.net"; // Ajusta al endpoint real

export async function getCompletion(prompt: string): Promise<string> {
  const response = await axios.post(`${AMARA_URL}/completion`, {
    prompt,
    max_tokens: 200,
    temperature: 0.7
  });
  return response.data.text || "";
}

export async function getEdit(code: string, instruction: string): Promise<string> {
  const response = await axios.post(`${AMARA_URL}/edit`, {
    code,
    instruction
  });
  return response.data.diff || "";
}
