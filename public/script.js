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

  // --- Client-side Routing ---
  const handleRouteChange = () => {
    const path = window.location.pathname;
    const converterTitle = document.querySelector('.converter h2');
    if (!converterTitle) return;

    switch (path) {
      case '/audio-converter':
        converterTitle.textContent = 'Аудио Конвертер';
        break;
      case '/video-converter':
        converterTitle.textContent = 'Видео Конвертер';
        break;
      case '/image-converter':
        converterTitle.textContent = 'Конвертер Изображений';
        break;
      // Добавьте другие маршруты по аналогии
      default:
        converterTitle.textContent = 'Конвертер Файлов';
    }
  };

  // Обработка кликов по ссылкам
  document.querySelectorAll('a[data-type]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const href = link.getAttribute('href');
      history.pushState({}, '', href);
      handleRouteChange();
    });
  });

  // Обработка кнопок "назад/вперед" в браузере
  window.addEventListener('popstate', handleRouteChange);

  // Первоначальная обработка маршрута при загрузке
  handleRouteChange();
  // --- End Client-side Routing ---


  // Запускаем конвертацию при выборе файла
  fileInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    const outputFormat = outputFormatSelect.value;
    statusContainer.innerHTML = "<p>Загрузка файла...</p>";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("outputformat", outputFormat);

    try {
      const startResponse = await fetch("/api/start-conversion", {
        method: "POST",
        body: formData,
      });

      if (!startResponse.ok) {
        const errorData = await startResponse.json();
        throw new Error(errorData.error || "Не удалось начать конвертацию");
      }

      const startData = await startResponse.json();
      const conversionId = startData.id;
      statusContainer.innerHTML = `<p>Конвертация началась. ID: ${conversionId}</p><p>Проверка статуса...</p>`;
      
      pollConversionStatus(conversionId);

    } catch (error) {
      console.error("Ошибка при запуске конвертации:", error);
      statusContainer.innerHTML = `<p>Ошибка: ${error.message}</p>`;
    }
  });

  async function pollConversionStatus(id) {
    try {
        const response = await fetch(`/api/conversion-status/${id}`);
        if (!response.ok) {
            throw new Error('Ошибка сети при проверке статуса');
        }
        const data = await response.json();

        if (data.step === "finish") {
            statusContainer.innerHTML = `<p>Конвертация завершена!</p><a href="${data.output.url}" target="_blank" rel="noopener noreferrer">Скачать результат</a>`;
        } else {
            const progress = data.step_percent || 0;
            statusContainer.innerHTML = `<p>Статус: ${data.step} (${progress}%)</p>`;
            setTimeout(() => pollConversionStatus(id), 3000); // Проверяем каждые 3 секунды
        }
    } catch (error) {
        console.error("Ошибка при проверке статуса:", error);
        statusContainer.innerHTML = "<p>Ошибка при проверке статуса. Попробуйте еще раз.</p>";
    }
  }
});