// DOM要素の取得
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const imageState = document.getElementById('imageState');
const errorMessage = document.getElementById('errorMessage');
const promptText = document.getElementById('promptText');
const generatedImage = document.getElementById('generatedImage');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const newBtn = document.getElementById('newBtn');
const copyMessage = document.getElementById('copyMessage');

let currentImageBlob = null;
let currentPrompt = '';

// URLパラメータからエラーメッセージを取得
const urlParams = new URLSearchParams(window.location.search);
const errorParam = urlParams.get('error');

if (errorParam) {
  showError(decodeURIComponent(errorParam));
}

// バックグラウンドスクリプトからのメッセージを受信
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'displayImage') {
    displayImage(message.imageData, message.mimeType, message.prompt);
  }
});

// 画像を表示
async function displayImage(base64Data, mimeType, prompt) {
  try {
    currentPrompt = prompt;
    
    // Base64データをBlobに変換
    const binaryData = atob(base64Data);
    const arrayBuffer = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      arrayBuffer[i] = binaryData.charCodeAt(i);
    }
    currentImageBlob = new Blob([arrayBuffer], { type: mimeType });
    
    // 画像URLを作成して表示
    const imageUrl = URL.createObjectURL(currentImageBlob);
    generatedImage.src = imageUrl;
    
    // プロンプトを表示
    promptText.textContent = prompt;
    
    // ローディングを非表示にして画像を表示
    loadingState.style.display = 'none';
    imageState.style.display = 'block';
    
    // 画像の右クリックメニューを有効化（コピー用）
    generatedImage.addEventListener('contextmenu', (e) => {
      // デフォルトの右クリックメニューを許可
      // Chromeのデフォルトメニューで「画像をコピー」が使用可能
    });
    
  } catch (error) {
    showError('画像の表示に失敗しました: ' + error.message);
  }
}

// エラーを表示
function showError(message) {
  loadingState.style.display = 'none';
  errorState.style.display = 'block';
  errorMessage.textContent = message;
}

// 画像をクリップボードにコピー
copyBtn.addEventListener('click', async () => {
  if (!currentImageBlob) {
    showCopyMessage('画像がありません', 'error');
    return;
  }

  try {
    // ClipboardItem APIを使用して画像をコピー
    const clipboardItem = new ClipboardItem({
      [currentImageBlob.type]: currentImageBlob
    });
    
    await navigator.clipboard.write([clipboardItem]);
    showCopyMessage('✓ 画像をクリップボードにコピーしました', 'success');
  } catch (error) {
    console.error('Copy error:', error);
    showCopyMessage('コピーに失敗しました: ' + error.message, 'error');
  }
});

// 画像をダウンロード
downloadBtn.addEventListener('click', () => {
  if (!currentImageBlob) {
    showCopyMessage('画像がありません', 'error');
    return;
  }

  try {
    const url = URL.createObjectURL(currentImageBlob);
    const a = document.createElement('a');
    a.href = url;
    
    // ファイル名を生成（プロンプトの最初の30文字 + タイムスタンプ）
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const safePrompt = currentPrompt
      .slice(0, 30)
      .replace(/[^a-zA-Z0-9ぁ-んァ-ヶー一-龠]/g, '_');
    a.download = `gemini_${safePrompt}_${timestamp}.png`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showCopyMessage('✓ 画像をダウンロードしました', 'success');
  } catch (error) {
    showCopyMessage('ダウンロードに失敗しました: ' + error.message, 'error');
  }
});

// 新しい画像を生成（タブを閉じる）
newBtn.addEventListener('click', () => {
  window.close();
});

// コピーメッセージを表示
function showCopyMessage(text, type) {
  copyMessage.textContent = text;
  copyMessage.className = 'message message-' + type;
  copyMessage.style.display = 'block';
  
  setTimeout(() => {
    copyMessage.style.display = 'none';
  }, 3000);
}
