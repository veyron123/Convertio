#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import requests
import time
import os

def test_conversion():
    input_file = r"C:\Users\Denis\Desktop\Convertio\video for test\Screenshot (19).png"
    output_dir = r"C:\Users\Denis\Desktop\Convertio\video for test"
    
    print("=== ТЕСТ КОНВЕРТАЦИИ PNG -> JPG ===")
    print(f"Входной файл: {input_file}")
    print(f"Папка результата: {output_dir}")
    
    if not os.path.exists(input_file):
        print("ОШИБКА: Файл не найден")
        return
    
    file_size = os.path.getsize(input_file)
    print(f"Размер файла: {file_size / 1024:.2f} KB")
    
    try:
        print("\nШаг 1: Запуск конвертации...")
        
        with open(input_file, 'rb') as f:
            files = {'file': f}
            data = {'outputformat': 'jpg'}
            
            response = requests.post(
                'http://localhost:3002/api/start-conversion',
                files=files,
                data=data,
                timeout=60
            )
        
        if response.status_code != 200:
            print(f"ОШИБКА запуска: {response.status_code}")
            print(f"Ответ: {response.text}")
            return
        
        result = response.json()
        job_id = result['id']
        print(f"Конвертация запущена! Job ID: {job_id}")
        
        print("\nШаг 2: Ожидание результата...")
        
        for attempt in range(20):
            print(f"Проверка {attempt + 1}/20...")
            
            status_response = requests.get(
                f'http://localhost:3002/api/conversion-status/{job_id}',
                timeout=10
            )
            
            if status_response.status_code != 200:
                print(f"Ошибка статуса: {status_response.status_code}")
                time.sleep(3)
                continue
            
            status_data = status_response.json()
            status = status_data.get('status', 'unknown')
            step = status_data.get('step', 'unknown')
            
            print(f"  Статус: {status}, Шаг: {step}")
            
            if status == 'finished' and status_data.get('output'):
                download_url = status_data['output']['url']
                print(f"\nУСПЕХ! Скачиваем результат...")
                print(f"URL: {download_url}")
                
                download_response = requests.get(download_url, timeout=30)
                if download_response.status_code == 200:
                    output_file = os.path.join(output_dir, "Screenshot_19_converted.jpg")
                    
                    with open(output_file, 'wb') as f:
                        f.write(download_response.content)
                    
                    print(f"ГОТОВО! Файл сохранен: {output_file}")
                    print(f"Размер результата: {len(download_response.content) / 1024:.2f} KB")
                    
                    # Проверяем что файл создался
                    if os.path.exists(output_file):
                        print("ТЕСТ УСПЕШНО ЗАВЕРШЕН!")
                    else:
                        print("ОШИБКА: Файл не был создан")
                    return
                else:
                    print(f"Ошибка скачивания: {download_response.status_code}")
                    return
            
            elif status == 'error':
                print(f"ОШИБКА конвертации: {status_data}")
                return
            
            time.sleep(5)
        
        print("ТАЙМАУТ: Превышено время ожидания")
        
    except Exception as e:
        print(f"ОШИБКА: {e}")

if __name__ == "__main__":
    test_conversion()