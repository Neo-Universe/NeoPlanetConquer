import * as vscode from 'vscode';
import * as xml2js from 'xml2js';

// 擴充功能激活時調用
export function activate(context: vscode.ExtensionContext) {
    // 註冊命令
    let openAsTableCommand = vscode.commands.registerCommand('neo-planet-conquer.openResxAsTable', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.languageId === 'xml') {
            const document = editor.document;
            const fileContent = document.getText();
            xml2js.parseString(fileContent, (err, result) => {
                if (err) {
                    vscode.window.showErrorMessage('Error parsing RESX file.');
                    return;
                }
                const data = parseResxToTable(result);
                const panel = vscode.window.createWebviewPanel(
                    'resxTable',
                    'RESX Table Editor',
                    vscode.ViewColumn.One,
                    {
                        enableScripts: true
                    }
                );
                panel.webview.html = getWebviewContent(data, panel.webview, context.extensionUri);
            });
        } else {
            vscode.window.showErrorMessage('Please open a RESX file to use this feature.');
        }
    });

    context.subscriptions.push(openAsTableCommand);
}

// 解析 resx 檔案為表格數據
function parseResxToTable(resxObj: any): any[] {
    if (!resxObj || !resxObj.root || !resxObj.root.data) {
        return [];
    }

    return resxObj.root.data.map((entry: any) => {
        return {
            name: entry.$.name,
            value: entry.value[0],
            comment: entry.comment ? entry.comment[0] : ''
        };
    });
}

// 生成 Webview 內容
function getWebviewContent(data: any[], webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'style.css'));

    let tableRows = data.map(d =>
        `<tr>
            <td>${escapeHtml(d.name)}</td>
            <td><input type="text" value="${escapeHtml(d.value)}" /></td>
            <td><input type="text" value="${escapeHtml(d.comment || '')}" /></td>
        </tr>`).join('');

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${styleUri}" rel="stylesheet" />
        <title>RESX Table Editor</title>
    </head>
    <body>
        <table>
            <tr><th>Name</th><th>Value</th><th>Comment</th></tr>
            ${tableRows}
        </table>
    </body>
    </html>`;
}

// 防止 HTML 注入的輔助函數
function escapeHtml(unsafe: string): string {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// 擴充功能停用時調用
export function deactivate() {}
