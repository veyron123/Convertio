# 🚨 Исправление ошибки 500 на Render

## 🔍 **Диагностика ошибки 500:**

Ошибка 500 в `/api/start-conversion` чаще всего возникает из-за:
1. **❌ CONVERTIO_KEY не настроен** (90% случаев)
2. **❌ Проблема с загрузкой файла**
3. **❌ Ошибка в коде**

---

## 🛠️ **РЕШЕНИЕ #1: Проверить Environment Variables**

### **1️⃣ Откройте Render Dashboard:**
https://dashboard.render.com → ваш сервис

### **2️⃣ Перейдите в Environment Variables:**
Dashboard → ваш сервис → **"Environment"** (левая панель)

### **3️⃣ Проверьте обязательные переменные:**

#### ✅ **Должны быть установлены:**
```
CONVERTIO_KEY = a8c68670670a6b841b530e797644980c
NODE_ENV = production  
PORT = 3000 (может быть установлен автоматически)
```

### **4️⃣ Если CONVERTIO_KEY отсутствует:**
- Нажмите **"Add Environment Variable"**
- **Key:** `CONVERTIO_KEY`
- **Value:** `a8c68670670a6b841b530e797644980c`
- Нажмите **"Save Changes"**
- ⚠️ **Важно:** После изменения ENV переменных произойдет автоматический redeploy!

---

## 🔍 **РЕШЕНИЕ #2: Проверить логи сервера**

### **1️⃣ Откройте Runtime Logs:**
Dashboard → ваш сервис → **"Logs"** → вкладка **"Runtime"**

### **2️⃣ Ищите диагностическую информацию:**
При старте сервера должны быть сообщения:
```
🔍 Environment Check:
Port: 3000
CONVERTIO_KEY: SET ✅    ← Должно быть SET ✅
NODE_ENV: production

🚀 Convertio Server is running on http://localhost:3000
```

### **3️⃣ Если CONVERTIO_KEY: MISSING ❌:**
```
🚨 CRITICAL: CONVERTIO_KEY environment variable is not set!
   Please set CONVERTIO_KEY in Render Dashboard Environment Variables
```
**→ Вернитесь к Решению #1 и настройте переменную**

### **4️⃣ При ошибке 500 ищите сообщения:**
```
🚨 CONVERTIO_KEY missing in request handler
🚨 Detailed error in conversion process:
🚨 Error during conversion process:
```

---

## 🧪 **РЕШЕНИЕ #3: Тестирование Health Check**

### **1️⃣ Откройте Health Check эндпоинт:**
В браузере перейдите: `https://ваш-сервис.onrender.com/api/health`

### **2️⃣ Ожидаемый ответ:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-XX...",
  "environment": {
    "port": 3000,
    "nodeEnv": "production", 
    "convertioKey": "SET ✅"    ← Должно быть SET ✅
  }
}
```

### **3️⃣ Если convertioKey: "MISSING ❌":**
**→ Проблема в Environment Variables, идите к Решению #1**

---

## 🔄 **РЕШЕНИЕ #4: Force Redeploy**

Если переменные настроены правильно, но ошибка остается:

### **1️⃣ Manual Redeploy:**
Dashboard → ваш сервис → **"Manual Deploy"** → **"Deploy Latest Commit"**

### **2️⃣ Или обновить код:**
```bash
# В локальной папке проекта
git add .
git commit -m "Fix: Add enhanced error diagnostics for 500 error"
git push origin main
```

---

## 📊 **Ожидаемые логи после исправления:**

### **✅ Успешный запуск сервера:**
```
🔍 Environment Check:
Port: 3000
CONVERTIO_KEY: SET ✅
NODE_ENV: production
🚀 Convertio Server is running on http://localhost:3000
```

### **✅ Успешная конвертация:**
```
File upload: 15.23MB from IP: xxx.xxx.xxx.xxx, useDirectUpload: false
✅ Conversion started successfully: conv_abc123def456
```

### **❌ Ошибки которые НЕ должны появляться:**
```
🚨 CRITICAL: CONVERTIO_KEY environment variable is not set!
🚨 CONVERTIO_KEY missing in request handler
```

---

## 🎯 **Быстрая проверка после исправления:**

### **1️⃣ Health Check:**
`https://ваш-сервис.onrender.com/api/health`  
→ `convertioKey: "SET ✅"`

### **2️⃣ Тест конвертации:**
- Загрузите небольшой файл (до 50MB)
- Выберите формат
- Нажмите "Конвертировать"
- ✅ Должен показать прогресс без ошибки 500

### **3️⃣ Проверка логов:**
Runtime Logs → не должно быть сообщений об отсутствии CONVERTIO_KEY

---

## 💡 **Дополнительные улучшения в коде:**

Обновленная версия сервера включает:
- ✅ **Диагностика ENV переменных** при запуске
- ✅ **Проверка CONVERTIO_KEY** в каждом запросе
- ✅ **Health check эндпоинт** для быстрой диагностики
- ✅ **Улучшенное логирование** ошибок
- ✅ **Более информативные сообщения** об ошибках

---

## 🆘 **Если проблема остается:**

### **📝 Соберите диагностическую информацию:**
1. **Health Check результат:** `/api/health`
2. **Runtime Logs:** последние 50 строк
3. **Environment Variables:** скриншот настроек
4. **Сообщение об ошибке:** полный текст из браузера

### **💬 Обратитесь за помощью:**
- **GitHub Issues:** https://github.com/veyron123/Convertio/issues
- **Render Support:** support@render.com

---

## 🎉 **После успешного исправления:**

Ваше приложение должно:
- ✅ Запускаться без ошибок CONVERTIO_KEY
- ✅ Обрабатывать файлы до 400MB
- ✅ Показывать детальную статистику времени
- ✅ Работать со всеми поддерживаемыми форматами
- ✅ Отображать реалистичный прогресс конвертации

**90% проблем решается настройкой CONVERTIO_KEY! 🎯**