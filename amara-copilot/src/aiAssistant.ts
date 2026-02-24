import * as vscode from 'vscode';

// Define the shape of the expected API response
interface ChatCompletionResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
}

export class AIAssistant {
    async sendPrompt(
        userPrompt: string,
        contextInfo: { fileName: string; content: string } | null,
        selectedText?: string
    ): Promise<string> {
        const config = vscode.workspace.getConfiguration('amara-copilot');
        const endpoint = config.get<string>('apiEndpoint', 'http://localhost:1234/v1/chat/completions') || 'http://localhost:1234/v1/chat/completions';
        const model = config.get<string>('modelName', 'local-model') || 'local-model';
        const apiKey = config.get<string>('apiKey', 'not-needed') || 'not-needed';

        // Construir el mensaje con contexto
        let fullPrompt = userPrompt;
        if (contextInfo) {
            fullPrompt = `Contexto del archivo "${contextInfo.fileName}":\n\`\`\`\n${contextInfo.content}\n\`\`\`\n\nPregunta/Instrucción: ${userPrompt}`;
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
                    model: model,
                    messages: [
                        {
                            role: 'system',
                            content: 'Eres un asistente de programación útil. Puedes ayudar con código, explicaciones y ediciones. Si el usuario te pide que edites el archivo, debes responder ÚNICAMENTE con el código completo y nuevo, sin explicaciones adicionales, para que la extensión pueda aplicarlo automáticamente.'
                        },
                        { role: 'user', content: fullPrompt }
                    ],
                    temperature: 0.7,
                    stream: false
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error ${response.status}: ${errorText}`);
            }

            // Cast the JSON response to our interface
            const data = await response.json() as ChatCompletionResponse;
            
            // Now TypeScript knows 'data' has choices[0].message.content
            return data.choices[0]?.message?.content || 'No se recibió respuesta del modelo.';
            
        } catch (error) {
            vscode.window.showErrorMessage(`Error al contactar con la IA: ${error}`);
            return `Lo siento, ocurrió un error: ${error}`;
        }
    }
}