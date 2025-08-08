#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import requests
import time
import os
import json

def test_conversion():
    # Путь к файлу для конвертации
    input_file = r"C:\Users\Denis\Desktop\Convertio\video for test\Screenshot (19).png"
    output_dir = r"C:\Users\Denis\Desktop\Convertio\video for test"
    
    print(f"Тестирование конвертации: {input_file}")
    print(f"Результат будет сохранен в: {output_dir}")
    
    # Проверяем существование файла
    if not os.path.exists(input_file):
        print(f"Файл не найден: {input_file}")
        return
    
    # Получаем размер файла
    file_size = os.path.getsize(input_file)
    print(f"Размер файла: {file_size / 1024:.2f} KB")
    
    try:
        # Шаг 1: Запускаем конвертацию
        print("\n🚀 Шаг 1: Запуск конвертации...")
        
        with open(input_file, 'rb') as f:
            files = {'file': f}
            data = {'outputformat': 'jpg'}
            
            response = requests.post(
                'http://localhost:3002/api/start-conversion',
                files=files,
                data=data,
                timeout=30
            )
        
        if response.status_code != 200:
            print(f"❌ Ошибка запуска конвертации: {response.status_code}")
            print(f"Response: {response.text}")
            return
        
        result = response.json()
        job_id = result['id']
        print(f"✅ Конвертация запущена! Job ID: {job_id}")
        
        # Шаг 2: Отслеживаем статус
        print("\n⏳ Шаг 2: Отслеживание статуса...")
        
        max_attempts = 30
        for attempt in range(max_attempts):
            print(f"📊 Попытка {attempt + 1}/{max_attempts}...")
            
            status_response = requests.get(
                f'http://localhost:3002/api/conversion-status/{job_id}',
                timeout=10
            )
            
            if status_response.status_code != 200:
                print(f"⚠️ Ошибка получения статуса: {status_response.status_code}")
                time.sleep(2)
                continue
            
            status_data = status_response.json()
            print(f"Status: {status_data.get('status')}, Step: {status_data.get('step')}")
            
            if status_data.get('status') == 'finished' and status_data.get('output'):
                # Шаг 3: Скачиваем результат
                download_url = status_data['output']['url']
                print(f"\n✅ Конвертация завершена! Скачиваем файл...")
                print(f"🔗 URL: {download_url}")
                
                # Скачиваем конвертированный файл
                download_response = requests.get(download_url, timeout=30)
                if download_response.status_code == 200:
                    output_file = os.path.join(output_dir, "Screenshot_19_converted.jpg")
                    
                    with open(output_file, 'wb') as f:
                        f.write(download_response.content)
                    
                    print(f"💾 Файл сохранен: {output_file}")
                    print(f"📊 Размер результата: {len(download_response.content) / 1024:.2f} KB")
                    print("🎉 Конвертация успешно завершена!")
                    return
                else:
                    print(f"❌ Ошибка скачивания: {download_response.status_code}")
                    return
            
            elif status_data.get('status') == 'error':
                print(f"❌ Ошибка конвертации: {status_data}")
                return
            
            # Ждем перед следующей проверкой
            time.sleep(3)
        
        print("⏰ Превышен лимит времени ожидания")
        
    except requests.exceptions.RequestException as e:
        print(f"🌐 Ошибка сети: {e}")
    except Exception as e:
        print(f"💥 Неожиданная ошибка: {e}")

if __name__ == "__main__":
    test_conversion()