"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const vscode = __importStar(require("vscode"));
const axios_1 = __importDefault(require("axios"));
function activate(context) {
    const provider = new AmaraChatViewProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider("amaraChat", provider));
    // Comando de sugerencia
    context.subscriptions.push(vscode.commands.registerCommand("cudium-amara-extension.suggest", async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const text = editor.document.getText(editor.selection);
            const suggestion = await provider.getCompletion(text);
            vscode.window.showInformationMessage("Sugerencia: " + suggestion);
        }
    }));
    // Comando de edición
    context.subscriptions.push(vscode.commands.registerCommand("cudium-amara-extension.edit", async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const text = editor.document.getText(editor.selection);
            const edit = await provider.getCompletion("Edita: " + text);
            vscode.window.showInformationMessage("Edición propuesta: " + edit);
        }
    }));
}
class AmaraChatViewProvider {
    constructor(extensionUri) {
        this.extensionUri = extensionUri;
    }
    resolveWebviewView(webviewView, context, token) {
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.html = this.getHtml();
        webviewView.webview.onDidReceiveMessage(async (message) => {
            if (message.type === "prompt") {
                const response = await this.getCompletion(message.value);
                webviewView.webview.postMessage({ type: "response", value: response });
            }
        });
    }
    getHtml() {
        return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: sans-serif; padding: 10px; }
          #chat { height: 300px; overflow-y: auto; border: 1px solid #ccc; padding: 5px; }
          input { width: 80%; }
          button { width: 18%; }
        </style>
      </head>
      <body>
        <h3>Chat con Amara</h3>
        <div id="chat"></div>
        <input id="prompt" placeholder="Escribe tu mensaje..." />
        <button onclick="send()">Enviar</button>
        <script>
          const vscode = acquireVsCodeApi();
          window.addEventListener('message', event => {
            const msg = event.data;
            if (msg.type === 'response') {
              const chat = document.getElementById('chat');
              chat.innerHTML += '<p><b>Amara:</b> ' + msg.value + '</p>';
            }
          });
          function send() {
            const prompt = document.getElementById('prompt').value;
            vscode.postMessage({ type: 'prompt', value: prompt });
          }
        </script>
      </body>
      </html>
    `;
    }
    async getCompletion(prompt) {
        try {
            const res = await axios_1.default.post("http://localhost:5000/completion", { prompt });
            return res.data.output || "Sin respuesta";
        }
        catch (err) {
            return "Error al conectar con Amara";
        }
    }
}
