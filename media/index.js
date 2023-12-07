(async (window, document) => {
    const vscode = acquireVsCodeApi();

    document.addEventListener('DOMContentLoaded', (event) => {
        document.querySelectorAll('input').forEach(inputElement => {
            inputElement.addEventListener('change', () => {             
               //把資料透過vscode webview的postMessage傳給vscode
               vscode.postMessage({
                command: 'updateResx',
                key: inputElement.getAttribute('data-key'),
                field: inputElement.getAttribute('data-field'),
                value: inputElement.value
            });

            });
        });
    });
})(window, document);