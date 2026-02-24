import * as vscode from 'vscode';
import { AIAssistant } from './aiAssistant';

export function activate(context: vscode.ExtensionContext) {
    console.log('Amara Copilot activado');

    const aiAssistant = new AIAssistant();

    // Comando para abrir el panel (ya se abre automáticamente al hacer clic en el icono)
    const openPanelCommand = vscode.commands.registerCommand('amara-copilot.openPanel', () => {
        vscode.commands.executeCommand('amara-copilot.chatView.focus');
    });
    context.subscriptions.push(openPanelCommand);

    // Comando para abrir la configuración de VS Code directamente
    const openSettingsCommand = vscode.commands.registerCommand('amara-copilot.openSettings', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', 'amara-copilot');
    });
    context.subscriptions.push(openSettingsCommand);

    // Registrar el proveedor de la vista webview
    const provider = new AmaraCopilotViewProvider(context.extensionUri, aiAssistant);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('amara-copilot.chatView', provider, {
            webviewOptions: { retainContextWhenHidden: true }
        })
    );
}

class AmaraCopilotViewProvider implements vscode.WebviewViewProvider {
    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _aiAssistant: AIAssistant
    ) {}

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview();

        // Escuchar mensajes desde el webview
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'sendPrompt':
                    const prompt = message.prompt;
                    const selectedText = message.selectedText;
                    
                    // Obtener contexto del archivo activo
                    const contextInfo = await this._getCurrentFileContext();
                    
                    // Enviar a la IA
                    const response = await this._aiAssistant.sendPrompt(
                        prompt,
                        contextInfo,
                        selectedText
                    );
                    
                    webviewView.webview.postMessage({ command: 'receiveResponse', text: response });
                    break;

                case 'applyEdit':
                    await this._applyEdit(message.newCode);
                    webviewView.webview.postMessage({ command: 'editApplied' });
                    break;
            }
        });
    }

    private _getHtmlForWebview(): string {
        return `<!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    padding: 10px;
                    color: var(--vscode-editor-foreground);
                    background-color: var(--vscode-editor-background);
                }
                .chat-container {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                }
                #messages {
                    flex: 1;
                    overflow-y: auto;
                    margin-bottom: 10px;
                    border: 1px solid var(--vscode-panel-border);
                    padding: 8px;
                    border-radius: 4px;
                }
                .message {
                    margin-bottom: 8px;
                    padding: 8px;
                    border-radius: 4px;
                    white-space: pre-wrap;
                }
                .user {
                    background-color: var(--vscode-input-background);
                }
                .assistant {
                    background-color: var(--vscode-editor-inactiveSelectionBackground);
                }
                #prompt {
                    width: 100%;
                    min-height: 60px;
                    box-sizing: border-box;
                    margin-bottom: 5px;
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    padding: 4px;
                    font-family: inherit;
                }
                #send {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 6px 12px;
                    cursor: pointer;
                    font-family: inherit;
                }
                #send:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
            </style>
        </head>
        <body>
            <div class="chat-container">
                <div id="messages"></div>
                <textarea id="prompt" placeholder="Escribe tu pregunta o instrucción..."></textarea>
                <button id="send">Enviar</button>
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                const messagesDiv = document.getElementById('messages');
                const promptInput = document.getElementById('prompt');
                const sendButton = document.getElementById('send');

                let selectedText = '';

                // Obtener el texto seleccionado del editor activo (solicitar a la extensión)
                // Por ahora lo enviaremos vacío; en una versión avanzada podrías pedirlo al hacer clic.

                sendButton.addEventListener('click', () => {
                    const prompt = promptInput.value.trim();
                    if (!prompt) return;

                    // Mostrar mensaje del usuario
                    addMessage('user', prompt);

                    // Enviar a la extensión
                    vscode.postMessage({
                        command: 'sendPrompt',
                        prompt: prompt,
                        selectedText: selectedText
                    });

                    promptInput.value = '';
                    addMessage('assistant', 'Pensando...');
                });

                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.command) {
                        case 'receiveResponse':
                            updateLastMessage('assistant', message.text);
                            break;
                        case 'editApplied':
                            addMessage('assistant', '✅ Cambios aplicados.');
                            break;
                    }
                });

                function addMessage(role, text) {
                    const msgDiv = document.createElement('div');
                    msgDiv.className = 'message ' + role;
                    msgDiv.textContent = text;
                    messagesDiv.appendChild(msgDiv);
                    messagesDiv.scrollTop = messagesDiv.scrollHeight;
                }

                function updateLastMessage(role, text) {
                    const lastMsg = messagesDiv.lastChild;
                    if (lastMsg && lastMsg.className.includes('assistant')) {
                        lastMsg.textContent = text;
                    } else {
                        addMessage(role, text);
                    }
                }

                // (Opcional) Podrías pedir el texto seleccionado a la extensión, 
                // pero por simplicidad lo dejamos así.
            </script>
        </body>
        </html>`;
    }

    private async _getCurrentFileContext(): Promise<{ fileName: string; content: string } | null> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return null;

        const document = editor.document;
        return {
            fileName: document.fileName,
            content: document.getText()
        };
    }

    private async _applyEdit(newCode: string) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No hay un archivo activo para aplicar la edición.');
            return;
        }

        const document = editor.document;
        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(document.getText().length)
        );

        await editor.edit(editBuilder => {
            editBuilder.replace(fullRange, newCode);
        });
    }
}

export function deactivate() {}