# 📱 Mobile Authentication & Secure Token Storage Architecture (#229 / BC-204, #230 / BC-205)

Dieses Dokument spezifiziert das Authentifizierungs- und Token-Storage-Konzept für native Mobile Clients (Android / iOS) von BabyCharts.

---

## 🔑 1. Dual-Authentifizierungs-Strategie

| Client-Typ                  | Transport-Mechanismus                       | Storage-Ort                                     | CSRF / XSS Schutz                       |
| :-------------------------- | :------------------------------------------ | :---------------------------------------------- | :-------------------------------------- |
| **Web App (PWA / Browser)** | `HttpOnly`, `Secure`, `SameSite=Lax` Cookie | Browser Cookie Jar                              | Immun gegen JavaScript XSS Exfiltration |
| **Native Android App**      | `Authorization: Bearer <JWT>` Header        | Android Keystore / `EncryptedSharedPreferences` | OS-Level Hardware-Backed Encryption     |
| **Native iOS App**          | `Authorization: Bearer <JWT>` Header        | iOS Keychain Services                           | Secure Enclave Hardware-Schutz          |

---

## 🛡️ 2. Secure Token Storage auf Android (#230 / BC-205)

Native Android-Apps dürfen Tokens **niemals** in Standard-`SharedPreferences` oder Klartext-Dateien speichern.

### Empfohlene Android-Implementierung:

```kotlin
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys

// 1. MasterKey im Android Keystore Hardware-Modul erzeugen (AES-256-GCM)
val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)

// 2. EncryptedSharedPreferences instanziieren
val securePreferences = EncryptedSharedPreferences.create(
    "babycharts_secure_prefs",
    masterKeyAlias,
    context,
    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
)

// 3. Token sicher ablegen
fun saveAuthToken(token: String) {
    securePreferences.edit().putString("auth_token", token).apply()
}

fun getAuthToken(): String? {
    return securePreferences.getString("auth_token", null)
}

fun clearAuthToken() {
    securePreferences.edit().remove("auth_token").apply()
}
```

---

## 🔄 3. Token-Lebenszyklus & Invalidierung

1. **Login:** `POST /api/v1/auth/login` liefert im Response Body:
   ```json
   {
     "ok": true,
     "token": "eyJhbGciOi...",
     "user": { "id": "...", "name": "...", "email": "..." }
   }
   ```
2. **Autorisierung bei API-Calls:** Bei jedem HTTP Request an `/api/v1/*` hängt der Android OkHttp Interceptor den Header `Authorization: Bearer <token>` an.
3. **Invalidierung & Logout:**
   - Bei Status `401 Unauthorized` oder `tokenVersion` Mismatch leitet die App sofort auf den Login-Screen und leert den Secure Storage.
   - Beim Logout ruft die App `POST /api/v1/auth/logout` auf und löscht den Token aus `EncryptedSharedPreferences`.
