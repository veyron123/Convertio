document.addEventListener("DOMContentLoaded", () => {
  // Объявляем ВСЕ нужные элементы с правильными ID
  const chooseFileBtn = document.getElementById("choose-file-btn");
  const fileInput = document.getElementById("file-input");
  const outputFormatSelect = document.getElementById("output-format");
  const statusContainer = document.getElementById("status-container");

  // Проверяем, что все нужные элементы существуют
  if (!chooseFileBtn || !fileInput || !outputFormatSelect || !statusContainer) {
    console.error("Один или несколько элементов интерфейса не найдены. Проверьте ID в HTML.");
    return;
  }

  // Связываем кнопку с скрытым инпутом
  chooseFileBtn.addEventListener("click", () => {
    fileInput.click();
  });

  // Группы форматов для каждого типа конвертера
  const formatGroups = {
    'audio': {
      title: 'Аудио Конвертер',
      formats: [
        { value: 'mp3', text: 'MP3' },
        { value: 'wav', text: 'WAV' },
        { value: 'flac', text: 'FLAC' },
        { value: 'aac', text: 'AAC' },
        { value: 'ogg', text: 'OGG' },
        { value: 'm4a', text: 'M4A' },
        { value: 'wma', text: 'WMA' },
        { value: 'aiff', text: 'AIFF' }
      ]
    },
    'video': {
      title: 'Видео Конвертер',
      formats: [
        { value: 'mp4', text: 'MP4' },
        { value: 'avi', text: 'AVI' },
        { value: 'mov', text: 'MOV' },
        { value: 'mkv', text: 'MKV' },
        { value: 'wmv', text: 'WMV' },
        { value: 'flv', text: 'FLV' },
        { value: 'webm', text: 'WEBM' },
        { value: '3gp', text: '3GP' },
        { value: 'm4v', text: 'M4V' }
      ]
    },
    'image': {
      title: 'Конвертер Изображений',
      formats: [
        { value: 'png', text: 'PNG' },
        { value: 'jpg', text: 'JPG' },
        { value: 'jpeg', text: 'JPEG' },
        { value: 'gif', text: 'GIF' },
        { value: 'bmp', text: 'BMP' },
        { value: 'webp', text: 'WEBP' },
        { value: 'svg', text: 'SVG' },
        { value: 'ico', text: 'ICO' },
        { value: 'tiff', text: 'TIFF' },
        { value: 'psd', text: 'PSD' },
        { value: 'avif', text: 'AVIF' }
      ]
    },
    'document': {
      title: 'Конвертер Документов',
      formats: [
        { value: 'pdf', text: 'PDF' },
        { value: 'docx', text: 'DOCX' },
        { value: 'doc', text: 'DOC' },
        { value: 'txt', text: 'TXT' },
        { value: 'rtf', text: 'RTF' },
        { value: 'odt', text: 'ODT' },
        { value: 'xlsx', text: 'XLSX' },
        { value: 'xls', text: 'XLS' },
        { value: 'pptx', text: 'PPTX' },
        { value: 'ppt', text: 'PPT' }
      ]
    },
    'archive': {
      title: 'Конвертер Архивов',
      formats: [
        { value: 'zip', text: 'ZIP' },
        { value: 'rar', text: 'RAR' },
        { value: '7z', text: '7Z' },
        { value: 'tar', text: 'TAR' },
        { value: 'gz', text: 'GZ' },
        { value: 'bz2', text: 'BZ2' }
      ]
    },
    'presentation': {
      title: 'Конвертер Презентаций',
      formats: [
        { value: 'pptx', text: 'PPTX' },
        { value: 'ppt', text: 'PPT' },
        { value: 'odp', text: 'ODP' },
        { value: 'pdf', text: 'PDF' },
        { value: 'jpg', text: 'JPG' },
        { value: 'png', text: 'PNG' }
      ]
    },
    'font': {
      title: 'Конвертер Шрифтов',
      formats: [
        { value: 'ttf', text: 'TTF' },
        { value: 'otf', text: 'OTF' },
        { value: 'woff', text: 'WOFF' },
        { value: 'woff2', text: 'WOFF2' },
        { value: 'eot', text: 'EOT' }
      ]
    },
    'ebook': {
      title: 'Конвертер Электронных Книг',
      formats: [
        { value: 'epub', text: 'EPUB' },
        { value: 'mobi', text: 'MOBI' },
        { value: 'pdf', text: 'PDF' },
        { value: 'txt', text: 'TXT' },
        { value: 'fb2', text: 'FB2' }
      ]
    },
    'default': {
      title: 'Конвертер Файлов',
      formats: [
        { value: 'png', text: 'PNG' },
        { value: 'jpg', text: 'JPG' },
        { value: 'pdf', text: 'PDF' },
        { value: 'mp4', text: 'MP4' },
        { value: 'mp3', text: 'MP3' },
        { value: 'docx', text: 'DOCX' },
        { value: 'zip', text: 'ZIP' }
      ]
    }
  };

  // Функция обновления списка форматов
  const updateFormatOptions = (converterType) => {
    const group = formatGroups[converterType] || formatGroups['default'];
    
    // Очищаем текущие опции
    outputFormatSelect.innerHTML = '';
    
    // Добавляем новые опции
    group.formats.forEach(format => {
      const option = document.createElement('option');
      option.value = format.value;
      option.textContent = format.text;
      outputFormatSelect.appendChild(option);
    });
  };

  // Функции для управления видимостью статус-контейнера
  const showStatus = (content) => {
    statusContainer.innerHTML = content;
    statusContainer.style.display = 'block';
  };

  const hideStatus = () => {
    statusContainer.innerHTML = '';
    statusContainer.style.display = 'none';
  };

  // --- Client-side Routing ---
  const handleRouteChange = () => {
    const path = window.location.pathname;
    const converterTitle = document.querySelector('.converter-title');
    if (!converterTitle) return;

    // Определяем тип конвертера из URL
    let converterType = 'default';
    
    if (path.includes('/audio-converter')) {
      converterType = 'audio';
    } else if (path.includes('/video-converter')) {
      converterType = 'video';
    } else if (path.includes('/image-converter')) {
      converterType = 'image';
    } else if (path.includes('/document-converter')) {
      converterType = 'document';
    } else if (path.includes('/archive-converter')) {
      converterType = 'archive';
    } else if (path.includes('/presentation-converter')) {
      converterType = 'presentation';
    } else if (path.includes('/font-converter')) {
      converterType = 'font';
    } else if (path.includes('/ebook-converter')) {
      converterType = 'ebook';
    }

    const group = formatGroups[converterType];
    converterTitle.textContent = group.title;
    
    // Обновляем список форматов
    updateFormatOptions(converterType);
  };

  // Обработка кликов по типам конвертеров
  document.querySelectorAll('.converter-type').forEach(type => {
    type.addEventListener('click', (e) => {
      e.preventDefault();
      const converterType = type.dataset.type;
      
      // Обновляем визуальное состояние
      document.querySelectorAll('.converter-type').forEach(t => t.classList.remove('active'));
      type.classList.add('active');
      
      // Обновляем заголовок и форматы
      const group = formatGroups[converterType];
      const mainTitle = document.querySelector('.main-title');
      if (mainTitle && group) {
        mainTitle.textContent = group.title;
      }
      
      // Обновляем список форматов
      updateFormatOptions(converterType);
    });
  });

  // Обработка кнопок "назад/вперед" в браузере
  window.addEventListener('popstate', handleRouteChange);

  // Первоначальная обработка маршрута при загрузке
  handleRouteChange();
  // --- End Client-side Routing ---


  // Переменная для хранения выбранного файла
  let selectedFile = null;
  
  // Переменные для отслеживания времени
  let uploadStartTime = null;
  let conversionStartTime = null;
  let totalStartTime = null;
  
  // Функция обновления прогресс бара
  function updateProgress(percent, status, state = 'converting') {
    if (!progressContainer || !progressStatus || !progressPercent || !progressFill) return;
    
    progressContainer.style.display = 'block';
    progressContainer.className = `progress-container ${state}`;
    progressPercent.textContent = `${percent}%`;
    progressStatus.textContent = status;
    progressFill.style.width = `${percent}%`;
  }
  
  // Функция скрытия прогресс бара
  function hideProgress() {
    if (progressContainer) {
      progressContainer.style.display = 'none';
    }
  }
  
  // Получаем элементы для новой логики
  const convertButton = document.getElementById("convert-button");
  const fileInfo = document.getElementById("file-info");
  const fileName = document.getElementById("file-name");
  const fileSize = document.getElementById("file-size");
  
  // Прогресс бар элементы
  const progressContainer = document.getElementById("progress-container");
  const progressStatus = document.getElementById("progress-status");
  const progressPercent = document.getElementById("progress-percent");
  const progressFill = document.getElementById("progress-fill");

  // Проверяем, что все элементы существуют
  if (!convertButton || !fileInfo || !fileName || !progressContainer) {
    console.error("Некоторые элементы интерфейса не найдены");
    return;
  }

  // Максимальный размер файла для Render Free (400MB)
  const MAX_FILE_SIZE = 400 * 1024 * 1024; // 400MB в байтах

  // Обработка выбора файла (БЕЗ автоконвертации)
  fileInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) {
      selectedFile = null;
      fileInfo.style.display = "none";
      convertButton.disabled = true;
      hideStatus();
      hideProgress();
      return;
    }

    // Проверка размера файла для Render Free
    if (file.size > MAX_FILE_SIZE) {
      showStatus(`❌ Файл слишком большой! Максимальный размер: 400MB (ваш файл: ${formatFileSize(file.size)})`, 'error');
      selectedFile = null;
      fileInfo.style.display = "none";
      convertButton.disabled = true;
      return;
    }

    selectedFile = file;
    
    // Показываем информацию о файле
    fileName.textContent = file.name;
    if (fileSize) {
      fileSize.textContent = formatFileSize(file.size);
    }
    fileInfo.style.display = "block";
    
    // Активируем кнопку конвертации
    convertButton.disabled = false;
    
    // Очищаем предыдущие сообщения
    hideStatus();
    hideProgress();
  });

  // Обработка нажатия кнопки конвертации
  convertButton.addEventListener("click", async () => {
    if (!selectedFile) {
      showStatus("<p>Пожалуйста, выберите файл для конвертации</p>");
      return;
    }

    const outputFormat = outputFormatSelect.value;
    if (!outputFormat) {
      showStatus("<p>Пожалуйста, выберите формат для конвертации</p>");
      return;
    }

    // Отключаем кнопку во время конвертации
    convertButton.disabled = true;
    convertButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Конвертация...</span>';
    
    // Запускаем отсчет времени
    totalStartTime = Date.now();
    uploadStartTime = Date.now();
    
    // Показываем прогресс бар загрузки с симуляцией прогресса
    updateProgress(0, 'Подготовка к загрузке...', 'uploading');
    hideStatus();
    
    // Симулируем прогресс загрузки
    let uploadProgress = 0;
    const uploadProgressInterval = setInterval(() => {
      uploadProgress += Math.random() * 15 + 5; // 5-20% за раз
      if (uploadProgress > 85) {
        clearInterval(uploadProgressInterval);
        updateProgress(85, 'Завершение загрузки...', 'uploading');
      } else {
        updateProgress(Math.floor(uploadProgress), 'Загрузка файла...', 'uploading');
      }
    }, 500);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("outputformat", outputFormat);

    try {
      const startResponse = await fetch("/api/start-conversion", {
        method: "POST",
        body: formData,
      });
  
      if (!startResponse.ok) {
        let errorMessage = "Не удалось начать конвертацию";
        try {
          // Читаем как текст, затем пытаемся парсить как JSON
          const responseText = await startResponse.text();
          try {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.error || errorMessage;
          } catch (jsonError) {
            // Если не JSON, используем как обычный текст
            if (responseText) {
              errorMessage = responseText;
            }
          }
        } catch (readError) {
          console.error('Error reading response:', readError);
        }
  
        // Более понятные сообщения об ошибках
        if (startResponse.status === 413) {
          errorMessage = "Файл слишком большой. Максимальный размер: 1GB";
        } else if (startResponse.status === 422) {
          errorMessage = "Неподдерживаемый формат файла или конвертации";
        } else if (startResponse.status === 402) {
          errorMessage = "Недостаточно минут для конвертации на вашем аккаунте";
        } else if (startResponse.status >= 500) {
          errorMessage = "Внутренняя ошибка сервера. Попробуйте позже.";
        }
  
        throw new Error(errorMessage);
      }

      const startData = await startResponse.json();
      const conversionId = startData.id;
      
      // Загрузка завершена
      const uploadTime = Date.now() - uploadStartTime;
      conversionStartTime = Date.now();
      
      // Обновляем прогресс бар
      updateProgress(100, `Загрузка завершена (${formatTime(uploadTime)})`, 'uploading');
      
      // Небольшая пауза перед началом отслеживания конвертации
      setTimeout(() => {
        updateProgress(0, 'Начинаем конвертацию...', 'converting');
        pollConversionStatus(conversionId);
      }, 1000);

    } catch (error) {
      console.error("Ошибка при запуске конвертации:", error);
      showStatus(`<p>Ошибка: ${error.message}</p>`);
      
      // Показываем ошибку в прогресс баре
      updateProgress(0, 'Ошибка конвертации', 'error');
      
      // Возвращаем кнопку в исходное состояние
      setTimeout(() => {
        convertButton.disabled = false;
        convertButton.innerHTML = '<i class="fas fa-sync-alt"></i><span>Конвертировать</span>';
        hideProgress();
      }, 3000);
    }
  });

  // Функция для форматирования размера файла
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  // Функция для форматирования времени в читаемый вид
  function formatTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}м ${remainingSeconds}с`;
    } else {
      return `${remainingSeconds}с`;
    }
  }

  async function pollConversionStatus(id) {
    try {
        const response = await fetch(`/api/conversion-status/${id}`);
        if (!response.ok) {
            throw new Error('Ошибка сети при проверке статуса');
        }
        const data = await response.json();

        if (data.step === "finish") {
            // Подсчитываем время
            const conversionTime = Date.now() - conversionStartTime;
            const totalTime = Date.now() - totalStartTime;
            const uploadTime = conversionStartTime - uploadStartTime;
            
            // Показываем завершение
            updateProgress(100, 'Конвертация завершена!', 'completed');
            
            // Показываем детальную статистику времени
            const timeStats = `
              <div class="time-stats">
                <h4>📊 Статистика времени:</h4>
                <p><strong>⬆️ Загрузка файла:</strong> ${formatTime(uploadTime)}</p>
                <p><strong>🔄 Конвертация:</strong> ${formatTime(conversionTime)}</p>
                <p><strong>⏱️ Общее время:</strong> ${formatTime(totalTime)}</p>
                <p><strong>📁 Размер результата:</strong> ${formatFileSize(data.output.size)}</p>
              </div>
              <div class="download-section">
                <a href="${data.output.url}" target="_blank" rel="noopener noreferrer" class="download-link">📥 Скачать результат</a>
              </div>
            `;
            
            showStatus(timeStats);
            
            // Восстанавливаем кнопку конвертации через некоторое время
            setTimeout(() => {
                convertButton.disabled = false;
                convertButton.innerHTML = '<i class="fas fa-sync-alt"></i><span>Конвертировать</span>';
            }, 2000);
        } else {
            let progress = data.step_percent || 0;
            let statusText = data.step;
            
            // Переводим статусы на русский
            const statusTranslations = {
                'upload': 'Загрузка на сервер...',
                'wait': 'Ожидание в очереди...',
                'convert': 'Конвертация в процессе...',
                'finish': 'Завершение конвертации...'
            };
            
            statusText = statusTranslations[data.step] || statusText;
            
            // Если прогресс не указан, симулируем его на основе времени
            if (!progress || progress === 0) {
                const elapsedTime = Date.now() - conversionStartTime;
                if (data.step === 'wait') {
                    progress = Math.min(20, Math.floor(elapsedTime / 1000) * 2); // 2% в секунду до 20%
                } else if (data.step === 'convert') {
                    progress = Math.min(95, 20 + Math.floor(elapsedTime / 3000) * 5); // 5% каждые 3 секунды после 20%
                } else if (data.step === 'finish') {
                    progress = Math.min(99, 90 + Math.floor(elapsedTime / 1000) * 2); // Быстрое завершение
                }
            }
            
            // Добавляем время к статусу
            const elapsedTime = Date.now() - conversionStartTime;
            statusText += ` (${formatTime(elapsedTime)})`;
            
            // Обновляем прогресс бар
            updateProgress(progress, statusText, 'converting');
            
            setTimeout(() => pollConversionStatus(id), 3000); // Проверяем каждые 3 секунды
        }
    } catch (error) {
        console.error("Ошибка при проверке статуса:", error);
        showStatus("<p>Ошибка при проверке статуса. Попробуйте еще раз.</p>");
        
        // Показываем ошибку в прогресс баре
        updateProgress(0, 'Ошибка проверки статуса', 'error');
        
        // Восстанавливаем кнопку при ошибке
        setTimeout(() => {
            convertButton.disabled = false;
            convertButton.innerHTML = '<i class="fas fa-sync-alt"></i><span>Конвертировать</span>';
            hideProgress();
        }, 3000);
    }
  }
  
  // Инициализация форматов по умолчанию при загрузке страницы
  updateFormatOptions('default');
});