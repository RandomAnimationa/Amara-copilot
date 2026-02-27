import * as vscode from 'vscode';

// Definir la interfaz para la respuesta de la API
interface APIResponse {
    choices: {
        message: {
            content: string;
        };
    }[];
}

export class AIAssistant {
    async sendPrompt(userPrompt: string, context: any, selectedText?: string): Promise<string> {
        const config = vscode.workspace.getConfiguration('amara-copilot');
        const endpoint = config.get<string>('apiEndpoint', 'http://localhost:1234/v1/chat/completions');
        const model = config.get<string>('modelName', 'local-model');
        const apiKey = config.get<string>('apiKey', 'not-needed');

        let fullPrompt = userPrompt;
        if (context) {
            fullPrompt = `Contexto del archivo "${context.fileName}":\n\`\`\`\n${context.content}\n\`\`\`\n\nPregunta: ${userPrompt}`;
        }
        if (selectedText) {
            fullPrompt = `Sobre el texto seleccionado:\n\`\`\`\n${selectedText}\n\`\`\`\n\n${fullPrompt}`;
        }

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${apiKey}` 
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: 'system', content: 'Eres un asistente de programación útil.' },
                        { role: 'user', content: fullPrompt }
                    ],
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error ${response.status}: ${errorText}`);
            }

            const data = await response.json() as APIResponse;
            
            if (data.choices && data.choices.length > 0 && data.choices[0].message) {
                return data.choices[0].message.content;
            } else {
                throw new Error('Formato de respuesta inesperado');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            vscode.window.showErrorMessage(`Error con la IA: ${errorMessage}`);
            return `Error: ${errorMessage}`;
        }
    }
}