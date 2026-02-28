import * as vscode from 'vscode';
import axios from 'axios';

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
  console.log('AI DevStudio extension activated');

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = "$(robot) AI DevStudio";
  statusBarItem.tooltip = "Click to open AI Chat";
  statusBarItem.command = 'ai-devstudio.openChat';
  statusBarItem.show();

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('ai-devstudio.openChat', openChat),
    vscode.commands.registerCommand('ai-devstudio.explainCode', explainCode),
    vscode.commands.registerCommand('ai-devstudio.generateTests', generateTests),
    vscode.commands.registerCommand('ai-devstudio.refactor', refactorCode),
    vscode.commands.registerCommand('ai-devstudio.fixErrors', fixErrors),
    vscode.commands.registerCommand('ai-devstudio.generateDocs', generateDocs)
  );

  // Inline completion provider
  const completionProvider = vscode.languages.registerInlineCompletionItemProvider(
    { pattern: '**' },
    new AIInlineCompletionProvider()
  );
  
  context.subscriptions.push(completionProvider);
}

async function openChat() {
  const panel = vscode.window.createWebviewPanel(
    'aiDevStudioChat',
    'AI DevStudio Chat',
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );

  panel.webview.html = getChatWebviewContent();
}

async function explainCode() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const selection = editor.selection;
  const code = editor.document.getText(selection);

  if (!code) {
    vscode.window.showWarningMessage('Please select some code first');
    return;
  }

  const config = vscode.workspace.getConfiguration('ai-devstudio');
  const apiUrl = config.get('apiUrl') as string;

  try {
    statusBarItem.text = "$(sync~spin) Analyzing...";
    
    const response = await axios.post(`${apiUrl}/api/agents/secretary-agent/command`, {
      action: 'explain-code',
      code: code,
      language: editor.document.languageId
    });

    const explanation = response.data.result?.explanation || 'No explanation available';
    
    // Show in output channel
    const outputChannel = vscode.window.createOutputChannel('AI DevStudio');
    outputChannel.appendLine('=== Code Explanation ===');
    outputChannel.appendLine(explanation);
    outputChannel.show();

  } catch (error) {
    vscode.window.showErrorMessage('Failed to explain code: ' + (error as Error).message);
  } finally {
    statusBarItem.text = "$(robot) AI DevStudio";
  }
}

async function generateTests() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const selection = editor.selection;
  const code = editor.document.getText(selection);

  if (!code) {
    vscode.window.showWarningMessage('Please select code to generate tests');
    return;
  }

  const config = vscode.workspace.getConfiguration('ai-devstudio');
  const apiUrl = config.get('apiUrl') as string;

  try {
    statusBarItem.text = "$(sync~spin) Generating tests...";

    const response = await axios.post(`${apiUrl}/api/agents/qa-agent/command`, {
      action: 'create-tests',
      code: code,
      language: editor.document.languageId
    });

    const testCode = response.data.result?.testCode;
    
    if (testCode) {
      // Create new file with tests
      const document = await vscode.workspace.openTextDocument({
        content: testCode,
        language: editor.document.languageId
      });
      
      await vscode.window.showTextDocument(document);
      vscode.window.showInformationMessage('Tests generated successfully!');
    }

  } catch (error) {
    vscode.window.showErrorMessage('Failed to generate tests: ' + (error as Error).message);
  } finally {
    statusBarItem.text = "$(robot) AI DevStudio";
  }
}

async function refactorCode() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const selection = editor.selection;
  const code = editor.document.getText(selection);

  if (!code) {
    vscode.window.showWarningMessage('Please select code to refactor');
    return;
  }

  // Show options
  const options = ['Improve readability', 'Optimize performance', 'Add error handling', 'Convert to async/await'];
  const selected = await vscode.window.showQuickPick(options, { placeHolder: 'Select refactoring type' });
  
  if (!selected) return;

  const config = vscode.workspace.getConfiguration('ai-devstudio');
  const apiUrl = config.get('apiUrl') as string;

  try {
    statusBarItem.text = "$(sync~spin) Refactoring...";

    const response = await axios.post(`${apiUrl}/api/agents/frontend-agent/command`, {
      action: 'refactor',
      code: code,
      type: selected
    });

    const refactoredCode = response.data.result?.code;
    
    if (refactoredCode) {
      // Apply edit
      editor.edit(editBuilder => {
        editBuilder.replace(selection, refactoredCode);
      });
    }

  } catch (error) {
    vscode.window.showErrorMessage('Failed to refactor: ' + (error as Error).message);
  } finally {
    statusBarItem.text = "$(robot) AI DevStudio";
  }
}

async function fixErrors() {
  const diagnostics = vscode.languages.getDiagnostics();
  
  if (diagnostics.length === 0) {
    vscode.window.showInformationMessage('No errors found!');
    return;
  }

  vscode.window.showInformationMessage(`Found ${diagnostics.length} errors. Fixing...`);
  
  // TODO: Implement auto-fix
}

async function generateDocs() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const selection = editor.selection;
  const code = editor.document.getText(selection);

  if (!code) {
    vscode.window.showWarningMessage('Please select code to document');
    return;
  }

  // TODO: Generate JSDoc/docstrings
}

class AIInlineCompletionProvider implements vscode.InlineCompletionItemProvider {
  async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.InlineCompletionItem[] | undefined> {
    
    const config = vscode.workspace.getConfiguration('ai-devstudio');
    if (!config.get('inlineCompletion')) return;

    const linePrefix = document.lineAt(position).text.substr(0, position.character);
    
    // Only trigger on specific patterns
    if (!this.shouldTrigger(linePrefix)) return;

    try {
      const apiUrl = config.get('apiUrl') as string;
      
      const response = await axios.post(`${apiUrl}/api/complete`, {
        code: document.getText(),
        language: document.languageId,
        position: { line: position.line, character: position.character }
      }, { timeout: 1000 });

      const completion = response.data.completion;
      
      if (completion) {
        return [new vscode.InlineCompletionItem(completion)];
      }
    } catch {
      // Silent fail for inline completion
    }
  }

  shouldTrigger(linePrefix: string): boolean {
    // Trigger on comments, function definitions, etc.
    const triggers = ['// ', '/* ', 'function ', 'def ', 'class ', 'const ', 'let '];
    return triggers.some(t => linePrefix.includes(t));
  }
}

function getChatWebviewContent(): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: sans-serif; padding: 10px; background: #1e1e1e; color: #d4d4d4; }
        .message { margin: 10px 0; padding: 10px; border-radius: 5px; }
        .user { background: #094771; }
        .assistant { background: #2d2d2d; }
        input { width: 100%; padding: 10px; border: none; background: #3c3c3c; color: white; }
      </style>
    </head>
    <body>
      <div id="chat">
        <div class="message assistant">👋 สวัสดี! ฉันพร้อมช่วยคุณเขียนโค้ด</div>
      </div>
      <input type="text" id="input" placeholder="พิมพ์ข้อความ..." />
      
      <script>
        const vscode = acquireVsCodeApi();
        const input = document.getElementById('input');
        const chat = document.getElementById('chat');
        
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter' && input.value) {
            // Add user message
            const userMsg = document.createElement('div');
            userMsg.className = 'message user';
            userMsg.textContent = input.value;
            chat.appendChild(userMsg);
            
            // TODO: Send to API
            
            input.value = '';
          }
        });
      </script>
    </body>
    </html>
  `;
}

export function deactivate() {
  console.log('AI DevStudio extension deactivated');
}
