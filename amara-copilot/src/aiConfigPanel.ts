import * as vscode from 'vscode';

export class AIConfigPanel {
    public static currentPanel: AIConfigPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._panel.webview.html = this._getHtmlForWebview();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        
        this._panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'saveConfig':
                    await this._saveConfig(message.config);
                    break;
                case 'loadConfig':
                    this._sendConfig();
                    break;
                case 'close':
                    this._panel.dispose();
                    break;
            }
        }, null, this._disposables);
    }

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor 
            ? vscode.window.activeTextEditor.viewColumn 
            : undefined;

        if (AIConfigPanel.currentPanel) {
            AIConfigPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'amaraCopilotConfig',
            'Configuración de Amara Copilot',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri]
            }
        );

        AIConfigPanel.currentPanel = new AIConfigPanel(panel, extensionUri);
    }

    private async _saveConfig(config: any) {
        try {
            const workspaceConfig = vscode.workspace.getConfiguration('amara-copilot');
            await workspaceConfig.update('apiEndpoint', config.apiEndpoint, vscode.ConfigurationTarget.Global);
            await workspaceConfig.update('modelName', config.modelName, vscode.ConfigurationTarget.Global);
            await workspaceConfig.update('apiKey', config.apiKey, vscode.ConfigurationTarget.Global);
            
            vscode.window.showInformationMessage('Configuración guardada correctamente');
            this._panel.webview.postMessage({ command: 'configSaved', success: true });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Error al guardar: ${errorMessage}`);
            this._panel.webview.postMessage({ command: 'configSaved', success: false, error: errorMessage });
        }
    }

    private async _sendConfig() {
        const workspaceConfig = vscode.workspace.getConfiguration('amara-copilot');
        const config = {
            apiEndpoint: workspaceConfig.get<string>('apiEndpoint', 'http://localhost:1234/v1/chat/completions'),
            modelName: workspaceConfig.get<string>('modelName', 'local-model'),
            apiKey: workspaceConfig.get<string>('apiKey', 'not-needed')
        };
        this._panel.webview.postMessage({ command: 'configLoaded', config });
    }

    private _getHtmlForWebview(): string {
        return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
        }
        h1 {
            font-size: 1.5em;
            margin-bottom: 20px;
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 10px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        input {
            width: 100%;
            padding: 8px 10px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            font-family: inherit;
            font-size: 13px;
            box-sizing: border-box;
        }
        input:focus {
            outline: 1px solid var(--vscode-focusBorder);
        }
        .button-group {
            display: flex;
            gap: 10px;
            margin-top: 30px;
        }
        button {
            padding: 8px 16px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        button.secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .status {
            margin-top: 20px;
            padding: 10px;
            border-radius: 4px;
            display: none;
        }
        .status.success {
            background-color: var(--vscode-testing-iconPassed);
            color: var(--vscode-editor-background);
            display: block;
        }
        .status.error {
            background-color: var(--vscode-testing-iconFailed);
            color: white;
            display: block;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>⚙️ Configuración de Amara Copilot</h1>
        <div class="form-group">
            <label for="apiEndpoint">Endpoint de la API:</label>
            <input type="url" id="apiEndpoint" placeholder="http://localhost:1234/v1/chat/completions">
        </div>
        <div class="form-group">
            <label for="modelName">Nombre del modelo:</label>
            <input type="text" id="modelName" placeholder="local-model">
        </div>
        <div class="form-group">
            <label for="apiKey">API Key (opcional):</label>
            <input type="password" id="apiKey" placeholder="not-needed">
        </div>
        <div class="button-group">
            <button id="saveBtn">Guardar configuración</button>
            <button id="cancelBtn" class="secondary">Cancelar</button>
        </div>
        <div id="statusMessage" class="status"></div>
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        const apiEndpointInput = document.getElementById('apiEndpoint');
        const modelNameInput = document.getElementById('modelName');
        const apiKeyInput = document.getElementById('apiKey');
        const saveBtn = document.getElementById('saveBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        const statusDiv = document.getElementById('statusMessage');

        vscode.postMessage({ command: 'loadConfig' });

        saveBtn.addEventListener('click', () => {
            const config = {
                apiEndpoint: apiEndpointInput.value.trim(),
                modelName: modelNameInput.value.trim(),
                apiKey: apiKeyInput.value.trim()
            };
            vscode.postMessage({ command: 'saveConfig', config });
            statusDiv.className = 'status';
            statusDiv.textContent = 'Guardando...';
        });

        cancelBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'close' });
        });

        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'configLoaded':
                    apiEndpointInput.value = message.config.apiEndpoint;
                    modelNameInput.value = message.config.modelName;
                    apiKeyInput.value = message.config.apiKey;
                    break;
                case 'configSaved':
                    if (message.success) {
                        statusDiv.className = 'status success';
                        statusDiv.textContent = '✅ Configuración guardada.';
                        setTimeout(() => { statusDiv.className = 'status'; }, 3000);
                    } else {
                        statusDiv.className = 'status error';
                        statusDiv.textContent = '❌ Error: ' + message.error;
                    }
                    break;
            }
        });
    </script>
</body>
</html>`;
    }

    public dispose() {
        AIConfigPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
}