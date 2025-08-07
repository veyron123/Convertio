# Dockerfile для Convertio приложения
FROM node:18-alpine

# Установка рабочей директории
WORKDIR /app

# Установка системных зависимостей
RUN apk add --no-cache curl

# Копирование package.json и package-lock.json
COPY package*.json ./

# Установка зависимостей
RUN npm ci --only=production && npm cache clean --force

# Копирование исходного кода
COPY . .

# Создание директории для временных файлов
RUN mkdir -p /tmp/uploads && chmod 755 /tmp/uploads

# Создание пользователя без root прав
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
RUN chown -R nextjs:nodejs /app /tmp/uploads
USER nextjs

# Открытие порта
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

# Запуск приложения
CMD ["npm", "start"]