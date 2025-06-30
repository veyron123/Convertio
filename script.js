document.addEventListener('DOMContentLoaded', () => {
    const chooseFileBtn = document.getElementById('choose-file-btn');
    const fileInput = document.getElementById('file-input');
    const outputFormatSelect = document.getElementById('output-format');
    const statusContainer = document.getElementById('status-container');
    const converterTypesLinks = document.querySelectorAll('.converter-types a');

    const formats = {
        audio: ['MP3', 'WAV', 'FLAC', 'OGG'],
        video: ['MP4', 'AVI', 'MOV', 'WMV'],
        image: ['SVG', 'ICO', 'JPG', 'WEBP', 'JPEG', 'DDS', 'GIF', 'CUR', 'BMP', 'HDR', 'PSD', 'TIFF', 'TGA', 'AVIF', 'RGB'],
        document: ['PDF', 'DOC', 'DOCX', 'XLS', 'XLSX', 'PPT', 'PPTX'],
        archive: ['ZIP', 'RAR', '7Z', 'TAR.GZ'],
        presentation: ['PPT', 'PPTX', 'ODP'],
        font: ['TTF', 'OTF', 'WOFF'],
        ebook: ['EPUB', 'MOBI', 'AZW3']
    };

    const updateOutputFormats = (type) => {
        const selectedFormats = formats[type] || [];
        outputFormatSelect.innerHTML = '';
        selectedFormats.forEach(format => {
            const option = document.createElement('option');
            option.value = format.toLowerCase();
            option.textContent = format;
            outputFormatSelect.appendChild(option);
        });
    };

    converterTypesLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const type = event.target.dataset.type;
            updateOutputFormats(type);
        });
    });

    chooseFileBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        const outputFormat = outputFormatSelect.value;
        statusContainer.innerHTML = '<p>Загрузка файла...</p>';

        const formData = new FormData();
        formData.append('file', file);
        formData.append('outputformat', outputFormat);

        try {
            // Шаг 1: Начать конвертацию
            const startResponse = await fetch('http://localhost:8081/api/start-conversion', {
                method: 'POST',
                body: formData
            });

            if (!startResponse.ok) {
                throw new Error('Ошибка при запуске конвертации');
            }

            const startData = await startResponse.json();
            const conversionId = startData.id;
            statusContainer.innerHTML = `<p>Конвертация началась. ID: ${conversionId}</p><p>Проверка статуса...</p>`;

            // Шаг 2: Проверять статус конвертации
            const checkStatus = async () => {
                try {
                    const statusResponse = await fetch(`http://localhost:8081/api/conversion-status/${conversionId}`);
                    if (!statusResponse.ok) {
                        throw new Error('Ошибка при проверке статуса');
                    }
                    const statusData = await statusResponse.json();

                    if (statusData.step === 'finish') {
                        statusContainer.innerHTML = `<p>Конвертация завершена!</p><a href="${statusData.output.url}" target="_blank" download>Скачать результат</a>`;
                    } else {
                        statusContainer.innerHTML = `<p>Статус: ${statusData.step} (${statusData.step_percent}%)</p>`;
                        setTimeout(checkStatus, 2000); // Проверять каждые 2 секунды
                    }
                } catch (error) {
                    console.error('Ошибка при проверке статуса:', error);
                    statusContainer.innerHTML = `<p>Ошибка при проверке статуса. Попробуйте еще раз.</p>`;
                }
            };

            setTimeout(checkStatus, 2000);

        } catch (error) {
            console.error('Ошибка при запуске конвертации:', error);
            statusContainer.innerHTML = `<p>Ошибка при запуске конвертации. Пожалуйста, проверьте консоль.</p>`;
        }
    });
});