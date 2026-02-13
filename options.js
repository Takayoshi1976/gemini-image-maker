// DOM要素の取得
const apiKeyInput = document.getElementById('apiKey');
const toggleApiKeyBtn = document.getElementById('toggleApiKey');
const promptPrefixInput = document.getElementById('promptPrefix');
const aspectRatioSelect = document.getElementById('aspectRatio');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const messageDiv = document.getElementById('message');

// デフォルト値
const DEFAULT_SETTINGS = {
  geminiApiKey: '',
  promptPrefix: '次の説明を一番わかりやすくするシンプルな画像を生成してください',
  aspectRatio: '16:9'
};

// 保存された設定を読み込む
chrome.storage.sync.get(DEFAULT_SETTINGS, (result) => {
  if (result.geminiApiKey) {
    apiKeyInput.value = result.geminiApiKey;
  }
  promptPrefixInput.value = result.promptPrefix;
  aspectRatioSelect.value = result.aspectRatio;
});

// APIキーの表示/非表示切り替え
toggleApiKeyBtn.addEventListener('click', () => {
  if (apiKeyInput.type === 'password') {
    apiKeyInput.type = 'text';
    toggleApiKeyBtn.textContent = '非表示';
  } else {
    apiKeyInput.type = 'password';
    toggleApiKeyBtn.textContent = '表示';
  }
});

// 設定を保存
saveBtn.addEventListener('click', async () => {
  const apiKey = apiKeyInput.value.trim();
  const promptPrefix = promptPrefixInput.value.trim();
  const aspectRatio = aspectRatioSelect.value;
  
  if (!apiKey) {
    showMessage('APIキーを入力してください', 'error');
    return;
  }

  if (!promptPrefix) {
    showMessage('プロンプトのプレフィックスを入力してください', 'error');
    return;
  }

  try {
    await chrome.storage.sync.set({ 
      geminiApiKey: apiKey,
      promptPrefix: promptPrefix,
      aspectRatio: aspectRatio
    });
    showMessage('✓ 設定を保存しました', 'success');
  } catch (error) {
    showMessage('保存に失敗しました: ' + error.message, 'error');
  }
});

// デフォルトに戻す
resetBtn.addEventListener('click', async () => {
  const confirmed = confirm('APIキー以外の設定をデフォルトに戻します。よろしいですか?');
  if (!confirmed) return;

  promptPrefixInput.value = DEFAULT_SETTINGS.promptPrefix;
  aspectRatioSelect.value = DEFAULT_SETTINGS.aspectRatio;
  
  try {
    const currentApiKey = apiKeyInput.value.trim();
    await chrome.storage.sync.set({
      geminiApiKey: currentApiKey,
      promptPrefix: DEFAULT_SETTINGS.promptPrefix,
      aspectRatio: DEFAULT_SETTINGS.aspectRatio
    });
    showMessage('✓ デフォルト設定に戻しました', 'success');
  } catch (error) {
    showMessage('リセットに失敗しました: ' + error.message, 'error');
  }
});

// メッセージ表示
function showMessage(text, type) {
  messageDiv.textContent = text;
  messageDiv.className = 'message message-' + type;
  messageDiv.style.display = 'block';
  
  if (type === 'success') {
    setTimeout(() => {
      messageDiv.style.display = 'none';
    }, 3000);
  }
}
