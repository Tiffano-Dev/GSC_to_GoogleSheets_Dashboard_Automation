/**
 * GSC API認証モジュール
 * サービスアカウント認証を処理
 */

/**
 * サービスアカウント設定
 */
const SERVICE_ACCOUNT_CONFIG = {
  type: "service_account",
  project_id: "bespokediscovery",
  private_key_id: "42942d7dfbe3e36843e4a8d2e28567fcac140c0f",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC/7twSF3CWGVgR\nKhD2P3nyGP0v5Uh1Z/Mc2JnCF48hHaG5XVACHMGf+8o/FfpZo9e0h3VLsLi2MrO4\nVbcNqn8riiPNCOPif0bhnh0U/23IsqfFsSlE8c4ZwNRccvPsSKL5fPDP9Zx72INz\nx7KdsXB92Mzr0DK4lOY87uSJs4Xi22JG/0UXwWIc9INVtoWe5gTaq20XAO8DL3Uu\nltzX7hdY3qNtgGg3JC1B0gTs1aupVu9W7DVwOj4yTCD6jZuD0ViddMKtgjQqhGXQ\nCIIUDAI0sTS2fvjnMzRloajVTSpv28Tql/aN1ErCiZtV5H8d42cBtpWXVq/a8ACl\ndE0aOLW3AgMBAAECggEANoErZ8vWQhnSY5VxmaxvAexMwjQ3fnfVl0R/bZnpIHtc\nuNoh5WerKLaFOaMRJDGeCPtKuQLngX4mgVt+D1hyoreo8QnsRR7lzx5qndLnp03s\nzPxBfv24DKIw7EwMrvX1qinr7PKPzK+wrMlyFMwV6PcPQowuSzKlq3of1mbvx3sN\nTCgoRfimBD11L8UKwAsGGMosALsn7Pt3Hdja0kBUNBjImrumuJdO0rdXMYYYsi3V\nSwm5ZAzyzD496jv7Go9L7+iMFvmhSb1BeIWpK8gkm8b2dJYZaSX+EzgPQPMO2fXe\nEejD4CHTHK89igrFPnsoh1cFAC0/pGBvr+GRq24cuQKBgQDvJSf3U0KSpaDBkWtB\nQKZYMsjyUOw0FsHtsk+gKTDtt5qeicEpqpdFu6nQqutiF2LH7JXtP2b+R5NMgWPt\nnrNDuNBuvHGBx9L9MbdA54xr44S7cGlEPKnOmAAbSxdOmR8Fcrfze9A2IGeNaL+r\nBVIRl0Oj1SQZK+pg74QRxLul5QKBgQDNdd2uKbjC/dj4nquMC79c7r+SS/IHvroz\nMEtavIiOWqx0GBwnucOB27Z5/Ch1VfIgHPMPH4CqNxrLB9WTHqaDfymP0zhWA3im\nwRNDfgydbf86tQOB61+pNxBKVNJejiQCMsVJ1D63UvdlZ/z9PBCK50HRyd6g80ZT\n9LNJxurzawKBgCu3ExM2+RhthnFb78tB0iaVQf5ppIPxFQoqajvQy8zony8T52eC\nc5yfrW8jj1ujAr+hE9cGnAEnfFmj3Wx2cjaS9icH84fRy1PVXrZSnWyrbnwFFHkQ\nzcmiJ4LVuzD29KC+U7oCjBEY41UKLN9KXbIxgH/WWn7vdCy8G9xTpimxAoGACwXT\nytA6NVvhFBWPJohKz/WPGY4xgfDdlHl20Xtj6B89OU1B1W/F6WWcOJcqpIDj6I0l\nDR6njHpAWbwl3Sq7zDo6RJkUYKj3BBs/qVNN4fRQyRmFAqdaDn4BxbsfPitqCyQm\nKXvVkYhF9Y7Kp9tdF9aoVVT7OK9UipSKOd8OI9kCgYEA2c2NmWQxL5TGayPndNGX\ny8Rv7DeDkaLVtk39eZgGNZ/Cwuw3DlcOWrMQkdHPurvZVQjIOnrVtjBzTHNfJiyP\nwBM31n4JbcWLHs46EYeoYGtzqenBSXuVPSgZFYHdPkk0tbiD5Mk3X23bfUgwzmQ+\n4db48knv8ekJ2cBopWbl96U=\n-----END PRIVATE KEY-----\n",
  client_email: "gsc-automation-service@bespokediscovery.iam.gserviceaccount.com",
  client_id: "107182946116176410909",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/gsc-automation-service%40bespokediscovery.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

/**
 * サービスアカウントが設定されているかチェック
 * @return {boolean} サービスアカウントが設定されている場合true
 */
function isServiceAccountConfigured() {
  try {
    return SERVICE_ACCOUNT_CONFIG && 
           SERVICE_ACCOUNT_CONFIG.private_key && 
           SERVICE_ACCOUNT_CONFIG.client_email;
  } catch (error) {
    Logger.log(`サービスアカウント設定チェックに失敗: ${error.message}`);
    return false;
  }
}

/**
 * サービスアカウントアクセストークンを取得
 * @return {string} アクセストークン
 */
function getServiceAccountToken() {
  try {
    Logger.log("サービスアカウントアクセストークンを取得中...");
    
    if (!isServiceAccountConfigured()) {
      throw new Error("サービスアカウントが正しく設定されていません");
    }
    
    const token = getServiceAccountTokenFromKey();
    Logger.log("サービスアカウントアクセストークンの取得に成功");
    return token;
    
  } catch (error) {
    Logger.log(`サービスアカウントトークンの取得に失敗: ${error.message}`);
    throw error;
  }
}

/**
 * サービスアカウント秘密鍵からアクセストークンを取得
 * @return {string} アクセストークン
 */
function getServiceAccountTokenFromKey() {
  try {
    const now = Math.floor(Date.now() / 1000);
    const header = {
      "alg": "RS256",
      "typ": "JWT"
    };
    
    const payload = {
      "iss": SERVICE_ACCOUNT_CONFIG.client_email,
      "scope": "https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive",
      "aud": SERVICE_ACCOUNT_CONFIG.token_uri,
      "exp": now + 3600,
      "iat": now
    };
    
    const jwt = createJWT(header, payload, SERVICE_ACCOUNT_CONFIG.private_key);
    
    const response = UrlFetchApp.fetch(SERVICE_ACCOUNT_CONFIG.token_uri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      payload: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });
    
    const responseData = JSON.parse(response.getContentText());
    
    if (responseData.access_token) {
      return responseData.access_token;
    } else {
      throw new Error(`Token request failed: ${responseData.error || 'Unknown error'}`);
    }
    
  } catch (error) {
    Logger.log(`JWTトークン作成に失敗: ${error.message}`);
    throw error;
  }
}

/**
 * JWTトークンを作成
 * @param {Object} header - JWTヘッダー
 * @param {Object} payload - JWTペイロード
 * @param {string} privateKey - 秘密鍵
 * @return {string} JWTトークン
 */
function createJWT(header, payload, privateKey) {
  try {
    const headerBase64 = Utilities.base64EncodeWebSafe(JSON.stringify(header)).replace(/=+$/, '');
    const payloadBase64 = Utilities.base64EncodeWebSafe(JSON.stringify(payload)).replace(/=+$/, '');
    
    const signatureInput = `${headerBase64}.${payloadBase64}`;
    
    // 注意: これは簡略化されたJWT作成です。本番環境では適切なJWTライブラリを使用してください
    // Google Apps Scriptでは、ライブラリを使用するか適切なRSA署名を実装する必要があります
    const signature = Utilities.computeRsaSha256Signature(signatureInput, privateKey);
    const signatureBase64 = Utilities.base64EncodeWebSafe(signature).replace(/=+$/, '');
    
    return `${signatureInput}.${signatureBase64}`;
    
  } catch (error) {
    Logger.log(`JWT作成に失敗: ${error.message}`);
    throw error;
  }
}

/**
 * アクセストークンを取得（互換性のためのメイン関数）
 * @return {string} アクセストークン
 */
function getAccessToken() {
  try {
    Logger.log("サービスアカウント認証を使用中");
    return getServiceAccountToken();
  } catch (error) {
    Logger.log(`アクセストークンの取得に失敗: ${error.message}`);
    throw error;
  }
}

/**
 * ユーザーが認証されているかチェック
 * @return {boolean} 認証されている場合true
 */
function isAuthenticated() {
  try {
    return isServiceAccountConfigured();
  } catch (error) {
    Logger.log(`認証チェックに失敗: ${error.message}`);
    return false;
  }
}


/**
 * サービスアカウントのセットアップ手順を取得
 * @return {string} セットアップ手順
 */
function getSetupInstructions() {
  return `
サービスアカウントセットアップ手順:

1. サービスアカウント設定済み:
   - サービスアカウント: gsc-automation-service@bespokediscovery.iam.gserviceaccount.com
   - プロジェクト: bespokediscovery
   - 秘密鍵: コード内で既に設定済み

2. GSCアクセスが必要:
   - GSCプロパティにサービスアカウントメールを追加:
     * https://bespoke-discovery.com/ (メインサイト)
     * https://blog.bespoke-discovery.com/ (ブログサイト)
   - サービスアカウントに「完全」アクセスを付与

3. スプレッドシートアクセス:
   - スプレッドシートを以下と共有: gsc-automation-service@bespokediscovery.iam.gserviceaccount.com
   - 「編集者」アクセスを付与

4. 認証テスト:
   - testAuthentication()を実行してセットアップを確認
   - 成功した場合はtrueが返されます

5. メインスクリプト実行:
   - セットアップ後、main()を実行して自動化を開始
   - スクリプトは自動的にサービスアカウントを使用します

6. トラブルシューティング:
   - サービスアカウントがGSCプロパティにアクセスできることを確認
   - スプレッドシート共有権限を確認
   - GSCプロパティが検証済みであることを確認

サービスアカウントメール: gsc-automation-service@bespokediscovery.iam.gserviceaccount.com
スプレッドシートID: 1oIyrC36E2WCLA9Sys4X3EB8SKKIPnVccxRbgkKpuv7o
  `;
}

/**
 * 認証が準備できていることを確認
 * 必要に応じて認証を自動処理
 */
function ensureAuthentication() {
  Logger.log("サービスアカウント認証が準備できていることを確認中...");
  
  try {
    if (isAuthenticated()) {
      Logger.log("サービスアカウント認証は既にアクティブ");
      return;
    } else {
      Logger.log("サービスアカウント認証が必要");
      Logger.log("サービスアカウント設定とGSCアクセスを確認してください");
      throw new Error("サービスアカウント認証が必要です。設定を確認してください。");
    }
    
  } catch (error) {
    Logger.log(`サービスアカウント認証チェックに失敗: ${error.message}`);
    throw error;
  }
}