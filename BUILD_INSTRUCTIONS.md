# 📱 Инструкция по сборке PollSocial Pro Android APK

## Вариант 1: Сборка через GitHub Actions (Рекомендуется)

1. Создайте репозиторий на GitHub
2. Загрузите весь проект `pollsocial/` в репозиторий
3. Создайте файл `.github/workflows/build.yml` с следующим содержимым:

```yaml
name: Build Android APK

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          distribution: 'temurin'
          java-version: '17'
      
      - name: Setup Android SDK
        uses: android-actions/setup-android@v2
      
      - name: Install Cordova
        run: npm install -g cordova
      
      - name: Build APK
        run: |
          cordova platform add android
          cordova build android --release
      
      - name: Upload APK
        uses: actions/upload-artifact@v3
        with:
          name: PollSocial-Pro
          path: platforms/android/app/build/outputs/apk/debug/app-debug.apk
```

4. После push на GitHub, APK будет автоматически собран
5. Скачайте его из раздела Actions -> Artifacts

## Вариант 2: Локальная сборка на Windows/Mac/Linux

### Требования:
- Node.js 14+ и npm
- Java JDK 17
- Android SDK (через Android Studio)
- Cordova CLI

### Шаги установки:

1. **Установите Node.js** с https://nodejs.org/

2. **Установите Java JDK 17**:
   - Windows: https://adoptium.net/
   - Linux: `sudo apt install openjdk-17-jdk`
   - Mac: `brew install openjdk@17`

3. **Установите Android Studio** с https://developer.android.com/studio
   - Откройте Android Studio
   - Tools -> SDK Manager
   - Установите Android SDK Platform 34
   - Установите Android SDK Build-Tools 34.0.0

4. **Настройте переменные окружения**:
   
   Windows (PowerShell):
   ```powershell
   $env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.xx-hotspot"
   $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
   $env:PATH += ";$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\tools"
   ```
   
   Linux/Mac:
   ```bash
   export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools
   ```

5. **Установите Cordova**:
   ```bash
   npm install -g cordova
   ```

6. **Перейдите в папку проекта**:
   ```bash
   cd pollsocial
   ```

7. **Соберите APK**:
   ```bash
   # Для debug версии (быстро, без подписи)
   cordova build android
   
   # Для release версии (требуется keystore)
   cordova build android --release
   ```

8. **Найдите APK**:
   - Debug: `platforms/android/app/build/outputs/apk/debug/app-debug.apk`
   - Release: `platforms/android/app/build/outputs/apk/release/app-release-unsigned.apk`

## Вариант 3: Онлайн сборка через PhoneGap Build

1. Зарегистрируйтесь на https://build.phonegap.com/
2. Загрузите проект (только папку www и config.xml)
3. Нажмите "Build"
4. Скачайте готовый APK

## Установка APK на телефон

1. Включите "Установка из неизвестных источников":
   - Настройки -> Безопасность -> Неизвестные источники
   
2. Скопируйте APK на телефон

3. Откройте APK файл и установите

4. При первом запуске укажите адрес вашего сервера:
   - Например: `http://192.168.1.100:3000`
   - Или: `https://your-domain.com`

## Настройка перед сборкой

### Изменение иконки приложения:

Замените файлы в `www/res/icon/android/` на свои PNG изображения:
- ldpi.png (36x36)
- mdpi.png (48x48)
- hdpi.png (72x72)
- xhdpi.png (96x96)
- xxhdpi.png (144x144)
- xxxhdpi.png (192x192)

### Изменение package name:

В файле `config.xml` измените:
```xml
<widget id="com.pollsocial.app" version="3.0.0" ...>
```

### Подпись APK для публикации в Google Play:

1. Создайте keystore:
```bash
keytool -genkey -v -keystore my-release-key.keystore \
  -alias alias_name -keyalg RSA -keysize 2048 -validity 10000
```

2. Создайте файл `build.json`:
```json
{
  "android": {
    "release": {
      "keystore": "my-release-key.keystore",
      "storePassword": "password",
      "alias": "alias_name",
      "password": "password"
    }
  }
}
```

3. Соберите:
```bash
cordova build android --release --buildConfig=build.json
```

## Решение проблем

### Ошибка: "JAVA_HOME is invalid"
Проверьте путь к JDK и переустановите переменную окружения

### Ошибка: "ANDROID_HOME not found"
Установите Android SDK через Android Studio и настройте ANDROID_HOME

### Ошибка: "SDK Platform not installed"
Откройте Android Studio -> SDK Manager и установите нужную версию

### APK не устанавливается на телефон
1. Проверьте что включена установка из неизвестных источников
2. Убедитесь что версия Android >= 5.0 (API 22+)

## Дополнительные ресурсы

- Документация Cordova: https://cordova.apache.org/docs/en/latest/
- Android SDK Setup: https://cordova.apache.org/docs/en/latest/guide/platforms/android/
- PhoneGap Build: https://build.phonegap.com/

## Техническая поддержка

Если возникли проблемы со сборкой, создайте Issue в репозитории проекта.
