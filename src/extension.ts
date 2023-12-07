import * as vscode from 'vscode';
import * as xml2js from 'xml2js';

// 擴充功能激活時調用
export function activate(context: vscode.ExtensionContext) {
    let openAsTableCommand = vscode.commands.registerCommand('neo-planet-conquer.openResxAsTable', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'xml') {
            vscode.window.showErrorMessage('Please open a RESX file to use this feature.');
            return;
        }

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
                { enableScripts: true }
            );

            panel.webview.html = getWebviewContent(data, panel.webview, context.extensionUri);

            // 處理從 Webview 接收到的消息
            panel.webview.onDidReceiveMessage(
                message => {
                    switch (message.command) {
                        case 'updateResx':
                            updateResxFile(editor.document, message.key, message.field, message.value);
                            vscode.window.showInformationMessage(message);
                            break;
                    }
                },
                undefined,
                context.subscriptions
            );

            // 當 panel 被關閉時，清除參考
            // panel.onDidDispose(
            //     () => { panel = undefined; },
            //     null,
            //     context.subscriptions
            // );
        });
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
    }).sort((a: any, b: any) => a.name.localeCompare(b.name));
}
function updateResxFile(document: vscode.TextDocument, key: string, field: string, newValue: string) {
    const fileContent = document.getText();
    xml2js.parseString(fileContent, (err, result) => {
        if (err) {
            vscode.window.showErrorMessage('Error parsing RESX file.');
            return;
        }

        const dataEntries = result.root.data;
        if (dataEntries) {
            if (field === 'name') {
                // 生成一個唯一的 name 值
                newValue = generateUniqueName(dataEntries, newValue);
            }

            dataEntries.forEach((entry: any) => {
                if (entry['$'].name === key) {
                    switch (field) {
                        case 'name':
                            entry['$'].name = newValue;
                            break;
                        case 'value':
                            entry.value[0] = newValue;
                            break;
                        case 'comment':
                            if (!entry.comment) {
                                entry.comment = [];
                            }
                            entry.comment[0] = newValue;
                            break;
                        // 可以根據需要添加更多字段的處理
                    }
                }
            });
        }

        // 將更新後的對象轉換回 XML 字串
        const builder = new xml2js.Builder();
        const updatedContent = builder.buildObject(result);

        // 寫回文件
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), updatedContent);
        vscode.workspace.applyEdit(edit);
    });
}
// 生成一個唯一的 name
function generateUniqueName(dataEntries: any[], baseName: string): string {
    let counter = 1;
    let newName = baseName;
    while (dataEntries.some(entry => entry['$'].name === newName)) {
        newName = `${baseName}_${counter}`;
        counter++;
    }
    return newName;
}

// 生成 Webview 內容
function getWebviewContent(data: any[], webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'style.css'));
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'index.js'));

    let tableRows = data.map(d =>
        `<tr>
            <td><input type="text" value="${escapeHtml(d.name)}"  data-field="name" data-key="${escapeHtml(d.name)}"/></td>
            <td><input type="text" value="${escapeHtml(d.value)}" data-field="value" data-key="${escapeHtml(d.name)}"/></td>
            <td><input type="text" value="${escapeHtml(d.comment || '')}" data-field="comment" data-key="${escapeHtml(d.name)}"/></td>
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
            <tr><th>Key</th><th>值</th><th>備註</th></tr>
            ${tableRows}
        </table>
    </body>
    <script src="${scriptUri}"></script>
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
export function deactivate() { }
