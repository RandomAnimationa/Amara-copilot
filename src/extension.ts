import * as vscode from "vscode";
import axios from "axios";

export function activate(context: vscode.ExtensionContext) {
  const provider = new AmaraChatViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("amaraChat", provider)
  );
}

class AmaraChatViewProvider implements vscode.WebviewViewProvider {
  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ) {
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this.getHtml();

    webviewView.webview.onDidReceiveMessage(async (message: any) => {
      if (message.type === "prompt") {
        const response = await this.getCompletion(message.value);
        webviewView.webview.postMessage({ type: "response", value: response });
      }
    });
  }

  private getHtml(): string {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: sans-serif; padding: 10px; }
          #chat { height: 400px; overflow-y: auto; border: 1px solid #ccc; padding: 5px; }
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

  public async getCompletion(prompt: string): Promise<string> {
    try {
      const res = await axios.post("http://localhost:5000/completion", { prompt });
      return res.data.output || "Sin respuesta";
    } catch (err) {
      return "Error al conectar con Amara";
    }
  }
}
