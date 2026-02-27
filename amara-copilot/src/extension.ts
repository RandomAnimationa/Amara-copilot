import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { AIAssistant } from './aiAssistant';
import { AIConfigPanel } from './aiConfigPanel';

export function activate(context: vscode.ExtensionContext) {
    console.log('✅ Amara Copilot activado');

    const aiAssistant = new AIAssistant();

    // Comando para abrir el panel de chat
    const openPanelCommand = vscode.commands.registerCommand('amara-copilot.openPanel', () => {
        vscode.commands.executeCommand('amara-copilot.chatView.focus');
    });
    context.subscriptions.push(openPanelCommand);

    // Comando para abrir la configuración de IA
    const openAIConfigCommand = vscode.commands.registerCommand('amara-copilot.openAIConfig', () => {
        AIConfigPanel.createOrShow(context.extensionUri);
    });
    context.subscriptions.push(openAIConfigCommand);

    // Proveedor de la vista webview (panel de chat)
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

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        console.log('✅ resolveWebviewView() llamado');

        // Configurar opciones del webview
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._extensionUri, 'media')
            ]
        };

        // Leer el archivo HTML
        const htmlPath = path.join(this._extensionUri.fsPath, 'media', 'chat.html');
        let htmlContent: string;

        try {
            htmlContent = fs.readFileSync(htmlPath, 'utf8');
            console.log('✅ HTML leído correctamente, tamaño:', htmlContent.length);
        } catch (err) {
            console.error('❌ Error al leer chat.html:', err);
            webviewView.webview.html = this._getErrorHtml(`Error al cargar el panel: ${err}`);
            return;
        }

        // Obtener URI del CSS y reemplazar el marcador
        try {
            const cssUri = webviewView.webview.asWebviewUri(
                vscode.Uri.joinPath(this._extensionUri, 'media', 'styles.css')
            );
            console.log('✅ CSS URI generada:', cssUri.toString());
            
            // Reemplazar el marcador {{cssUri}} en el HTML
            htmlContent = htmlContent.replace(/{{cssUri}}/g, cssUri.toString());
            
        } catch (err) {
            console.error('❌ Error al procesar URIs:', err);
            webviewView.webview.html = this._getErrorHtml(`Error al procesar recursos: ${err}`);
            return;
        }

        // Asignar el HTML al webview
        webviewView.webview.html = htmlContent;

        // Crear un array para los subscriptions del webview
        const disposables: vscode.Disposable[] = [];

        // Manejar mensajes desde el webview
        const messageListener = webviewView.webview.onDidReceiveMessage(async (message) => {
            console.log('📩 Mensaje recibido del webview:', message.command);
            
            try {
                switch (message.command) {
                    case 'sendPrompt':
                        await this._handleSendPrompt(webviewView, message);
                        break;

                    case 'getSelectedText':
                        await this._handleGetSelectedText(webviewView);
                        break;

                    case 'getContextInfo':
                        await this._handleGetContextInfo(webviewView);
                        break;

                    case 'openConfig':
                        vscode.commands.executeCommand('amara-copilot.openAIConfig');
                        break;

                    default:
                        console.warn('⚠️ Comando desconocido:', message.command);
                }
            } catch (err) {
                console.error('❌ Error procesando mensaje:', err);
                webviewView.webview.postMessage({ 
                    command: 'error', 
                    text: `Error: ${err instanceof Error ? err.message : String(err)}` 
                });
            }
        });

        // Añadir el listener a los disposables
        disposables.push(messageListener);

        // Añadir los disposables a la suscripción del contexto cuando la vista se cierre
        webviewView.onDidDispose(() => {
            console.log('Vista cerrada, limpiando recursos');
            while (disposables.length) {
                const disposable = disposables.pop();
                if (disposable) {
                    disposable.dispose();
                }
            }
        });

        // Notificar que el webview está listo
        webviewView.webview.postMessage({ command: 'ready' });
    }

    private async _handleSendPrompt(webviewView: vscode.WebviewView, message: any) {
        const prompt = message.prompt;
        const selectedText = message.selectedText || '';

        if (!prompt) {
            webviewView.webview.postMessage({ 
                command: 'error', 
                text: 'El mensaje no puede estar vacío' 
            });
            return;
        }

        // Obtener contexto del archivo actual
        const contextInfo = await this._getCurrentFileContext();

        // Enviar a la IA
        const response = await this._aiAssistant.sendPrompt(
            prompt,
            contextInfo,
            selectedText
        );

        webviewView.webview.postMessage({ 
            command: 'receiveResponse', 
            text: response 
        });
    }

    private async _handleGetSelectedText(webviewView: vscode.WebviewView) {
        const editor = vscode.window.activeTextEditor;
        let selectedText = '';

        if (editor && !editor.selection.isEmpty) {
            const selection = editor.selection;
            selectedText = editor.document.getText(selection);
        }

        webviewView.webview.postMessage({ 
            command: 'selectedText', 
            text: selectedText 
        });
    }

    private async _handleGetContextInfo(webviewView: vscode.WebviewView) {
        const fileContext = await this._getCurrentFileContext();
        
        webviewView.webview.postMessage({
            command: 'contextInfo',
            fileName: fileContext ? fileContext.fileName : null
        });
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

    private _getErrorHtml(errorMessage: string): string {
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-errorForeground);
        }
        .error {
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            padding: 10px;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="error">
        <h3>❌ Error en Amara Copilot</h3>
        <p>${errorMessage}</p>
    </div>
</body>
</html>`;
    }
}

export function deactivate() {
    console.log('👋 Amara Copilot desactivado');
}