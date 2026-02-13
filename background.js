// 右クリックメニューの作成
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'generateImage',
    title: '選択テキストから画像を生成',
    contexts: ['selection']
  });
});

// 右クリックメニューがクリックされた時の処理
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'generateImage') {
    const selectedText = info.selectionText;
    generateImage(selectedText);
  }
});

// Gemini APIを使用して画像を生成（Nano Banana Pro）
async function generateImage(text) {
  try {
    // ストレージからAPIキーと設定を取得
    const result = await chrome.storage.sync.get({
      geminiApiKey: '',
      promptPrefix: '次の説明を一番わかりやすくするシンプルな画像を生成してください',
      aspectRatio: '16:9'
    });

    const apiKey = result.geminiApiKey;

    if (!apiKey) {
      chrome.tabs.create({
        url: chrome.runtime.getURL('options.html')
      });
      return;
    }

    // プロンプトを作成
    const prompt = `${result.promptPrefix}: ${text}`;

    // Gemini API (Nano Banana Pro) を使用して画像を生成
    // gemini-3-pro-image-preview: 高品質で正確なテキストレンダリング
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            responseModalities: ['IMAGE'],
            imageConfig: {
              aspectRatio: result.aspectRatio
            }
          }
        })
      }
    );

    // レスポンスのテキストを取得
    const responseText = await response.text();
    console.log('API Response Status:', response.status);

    if (!response.ok) {
      let errorMessage = `API Error (${response.status}): ${response.statusText}`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = `API Error: ${errorData.error?.message || errorMessage}`;
      } catch (e) {
        errorMessage = `API Error: ${responseText || response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    // JSONをパース
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`JSONパースエラー: ${responseText.substring(0, 200)}`);
    }

    console.log('Parsed data:', data);
    
    // Gemini APIのレスポンス構造から画像を抽出
    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      if (candidate.content && candidate.content.parts) {
        // 画像データを含むパートを探す
        const imagePart = candidate.content.parts.find(part => part.inlineData);
        
        if (imagePart && imagePart.inlineData) {
          // 結果画面を新しいタブで開く
          chrome.tabs.create({
            url: chrome.runtime.getURL('result.html')
          }, (tab) => {
            // タブが完全に読み込まれるまで待つ
            chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
              if (tabId === tab.id && info.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                // 画像データを送信
                chrome.tabs.sendMessage(tab.id, {
                  type: 'displayImage',
                  imageData: imagePart.inlineData.data,
                  mimeType: imagePart.inlineData.mimeType || 'image/png',
                  prompt: text
                });
              }
            });
          });
        } else {
          throw new Error('レスポンスに画像データが含まれていません');
        }
      } else {
        throw new Error('レスポンスの形式が不正です');
      }
    } else {
      throw new Error('画像が生成されませんでした');
    }
  } catch (error) {
    console.error('Image generation error:', error);
    // エラー画面を表示
    chrome.tabs.create({
      url: chrome.runtime.getURL(`result.html?error=${encodeURIComponent(error.message)}`)
    });
  }
}
