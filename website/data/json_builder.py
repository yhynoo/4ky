import json
import csv

def transform_period(value):
    period_map = {
        'Uruk III (ca. 3200-3000 BC)': 'Uruk III',
        'Uruk IV (ca. 3350-3200 BC)': 'Uruk IV',
        'Uruk V (ca. 3500-3350 BC)': 'Uruk V'
    }

    return period_map.get(value, '')

def transform_origin(value):
    origin_map = {
        'E\u0161nunna (mod. Tell Asmar)': 'Eshnunna',
        'Kish (mod. Tell Uhaimir)': 'Kish',
        'Larsa (mod. Tell as-Senkereh)': 'Larsa',
        'Mari (mod. Tell Hariri)': 'Mari',
        'Nagar (mod. Tell Brak)': 'Nagar',
        'Nineveh (mod. Kuyunjik)': 'Nineveh',
        'Susa (mod. Shush)': 'Susa',
        'Tutub (mod. Khafaje)': 'Tutub',
        'uncertain (mod. Chogha Mish)': 'Chogha Mish',
        'uncertain (mod. Godin Tepe)': 'Godin Tepe',
        'uncertain (mod. Habuba Kabira)': 'Habuba Kabira',
        'uncertain (mod. Jebel Aruda)': 'Jebel Aruda',
        'uncertain (mod. Jemdet Nasr)': 'Jemdet Nasr',
        'uncertain (mod. Tell Uqair)': 'Tell Uqair',
        'uncertain (mod. uncertain)': 'uncertain',
        'Umma (mod. Tell Jokha)': 'Umma',
        'Uruk (mod. Warka)': 'Uruk'
    }

    return origin_map.get(value, '')

def parse_text_to_json(text, artifacts_csv):
    objects = []
    current_object = None
    current_id = None
    current_column = []

    artifacts_dict = {}
    with open(artifacts_csv, 'r', encoding='utf-8') as csv_file:
        csv_reader = csv.DictReader(csv_file)
        for row in csv_reader:
            artifacts_dict[row['artifact_id']] = row

    for line in text.split('\n'):
        if line.startswith('&'):
            if current_column:
                current_object["columns"].append(current_column)
            if current_object:
                objects.append(current_object)

            current_column = []
            current_id = str(int(line[2:]))
            current_object = {"id": current_id,
                              "title": artifacts_dict.get(current_id, {}).get('designation', ''),
                              "link": f"https://cdli.mpiwg-berlin.mpg.de/artifacts/{current_id}",
                              "period": transform_period(artifacts_dict.get(current_id, {}).get('period', '')),
                              "origin": transform_origin(artifacts_dict.get(current_id, {}).get('provenience', '')),
                              "type": "",
                              "columns": []}

        elif line.startswith('@column'):
            if current_column:
                current_object["columns"].append(current_column)
            current_column = []

        elif line.strip():
            current_column.append(line.strip().split())

    if current_column:
        current_object["columns"].append(current_column)
    if current_object:
        objects.append(current_object)

    return objects

def read_text_from_file(file_path):
    with open(file_path, 'r') as file:
        return file.read()

def save_json_to_file(json_data, output_file_path):
    with open(output_file_path, 'w') as json_file:
        json.dump(json_data, json_file, indent=2)

# run
input_file_path = 'inscriptions-output.txt'
output_file_path = 'CDLI_source.json'
artifacts_csv_path = 'artifacts-merged.csv'

txt_fragment = read_text_from_file(input_file_path)
result_json = parse_text_to_json(txt_fragment, artifacts_csv_path)

save_json_to_file(result_json, output_file_path)
