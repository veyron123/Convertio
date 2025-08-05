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

  // Обработка выбора файла (БЕЗ автоконвертации)
  fileInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) {
      selectedFile = null;
      fileInfo.style.display = "none";
      convertButton.disabled = true;
      statusContainer.innerHTML = "";
      hideProgress();
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
    statusContainer.innerHTML = "";
    hideProgress();
  });

  // Обработка нажатия кнопки конвертации
  convertButton.addEventListener("click", async () => {
    if (!selectedFile) {
      statusContainer.innerHTML = "<p>Пожалуйста, выберите файл для конвертации</p>";
      return;
    }

    const outputFormat = outputFormatSelect.value;
    if (!outputFormat) {
      statusContainer.innerHTML = "<p>Пожалуйста, выберите формат для конвертации</p>";
      return;
    }

    // Отключаем кнопку во время конвертации
    convertButton.disabled = true;
    convertButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Конвертация...</span>';
    
    // Показываем прогресс бар загрузки
    updateProgress(10, 'Загрузка файла...', 'uploading');
    statusContainer.innerHTML = "";

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("outputformat", outputFormat);

    try {
      const startResponse = await fetch("/api/start-conversion", {
        method: "POST",
        body: formData,
      });

      if (!startResponse.ok) {
        const errorData = await startResponse.json();
        let errorMessage = errorData.error || "Не удалось начать конвертацию";
        
        // Более понятные сообщения об ошибках
        if (startResponse.status === 413) {
          errorMessage = "Файл слишком большой. Максимальный размер: 100MB";
        } else if (startResponse.status === 422) {
          errorMessage = "Неподдерживаемый формат файла или конвертации";
        } else if (startResponse.status === 402) {
          errorMessage = "Недостаточно минут для конвертации на вашем аккаунте";
        }
        
        throw new Error(errorMessage);
      }

      const startData = await startResponse.json();
      const conversionId = startData.id;
      
      // Обновляем прогресс бар
      updateProgress(25, 'Конвертация началась...', 'converting');
      
      pollConversionStatus(conversionId);

    } catch (error) {
      console.error("Ошибка при запуске конвертации:", error);
      statusContainer.innerHTML = `<p>Ошибка: ${error.message}</p>`;
      
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

  async function pollConversionStatus(id) {
    try {
        const response = await fetch(`/api/conversion-status/${id}`);
        if (!response.ok) {
            throw new Error('Ошибка сети при проверке статуса');
        }
        const data = await response.json();

        if (data.step === "finish") {
            // Показываем завершение
            updateProgress(100, 'Конвертация завершена!', 'completed');
            
            statusContainer.innerHTML = `<a href="${data.output.url}" target="_blank" rel="noopener noreferrer">Скачать результат</a>`;
            
            // Восстанавливаем кнопку конвертации через некоторое время
            setTimeout(() => {
                convertButton.disabled = false;
                convertButton.innerHTML = '<i class="fas fa-sync-alt"></i><span>Конвертировать</span>';
            }, 2000);
        } else {
            const progress = data.step_percent || 0;
            let statusText = data.step;
            
            // Переводим статусы на русский
            const statusTranslations = {
                'upload': 'Загрузка...',
                'wait': 'Ожидание...',
                'convert': 'Конвертация...',
                'finish': 'Завершение...'
            };
            
            statusText = statusTranslations[data.step] || statusText;
            
            // Обновляем прогресс бар
            updateProgress(progress, statusText, 'converting');
            
            setTimeout(() => pollConversionStatus(id), 3000); // Проверяем каждые 3 секунды
        }
    } catch (error) {
        console.error("Ошибка при проверке статуса:", error);
        statusContainer.innerHTML = "<p>Ошибка при проверке статуса. Попробуйте еще раз.</p>";
        
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
});