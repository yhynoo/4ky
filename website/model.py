import os
import json
import re
from flask import current_app
from collections import Counter
import pandas as pd

# Processing queries

def normalize_variants(input_string):
    return re.sub(r'~[a-z](\d)?', '', input_string).replace(',', '')

def dismantle_complex_signs(line):
    dismantling = lambda array: [re.sub(r'[.,&x+()]|(?<!\.)\.(?!\.)', ' ', element).split() for element in array]
    return [item for sublist in dismantling(line) for item in sublist]

def includes_term(term, line_word, distinguish_variants):
    normalized_term = normalize_variants(term) if distinguish_variants == 'False' else term
    normalized_line_word = normalize_variants(line_word) if distinguish_variants == 'False' else line_word
    return normalized_term == normalized_line_word

def is_array_subset(query, line, distinguish_variants, dismantle):
    line = dismantle_complex_signs(line) if dismantle == 'True' else line
    return all(any(includes_term(term, word, distinguish_variants) for word in line) for term in query)


# Collecting attestations

def filter_by_period(obj_period, period):
    return not period or obj_period in period

def filter_by_origin(obj_origin, origin, specific_origins):
    return not origin or ('other' in origin and obj_origin in specific_origins) or obj_origin in origin

def collect_attestations(query, period, origin, distinguish_variants, dismantle, atomize):
    if atomize == "True": file_path = os.path.join(current_app.root_path, 'data', 'atomized_source.json')
    else: file_path = os.path.join(current_app.root_path, 'data', 'CDLI_source.json')

    with open(file_path, 'r') as file:
        data = json.load(file)

    specific_origins = ["Uruk", "Tell Uqair", "Jemdet Nasr", "Umma", "Larsa", "uncertain"]
    attestations = []
    coattestations = []

    matched_tablets = set()
    tablet_coattestations = []

    for obj in data:
        columns = obj.get('columns', [])
        obj_title = obj.get('title', '')
        obj_link = obj.get('link', '')
        obj_period = obj.get('period', '')
        obj_origin = obj.get('origin', '')

        if not filter_by_period(obj_period, period) or not filter_by_origin(obj_origin, origin, specific_origins):
            continue

        for col_index, column in enumerate(columns):
            for line_index, inner_array in enumerate(column):
                if is_array_subset(query, inner_array, distinguish_variants, dismantle):
                    position = (col_index + 1, line_index + 1)
                    attestation = {
                        "title": obj_title,
                        "link": obj_link,
                        "period": obj_period,
                        "origin": obj_origin,
                        "current_line": ', '.join(inner_array),
                        "preceding_line": ', '.join(columns[col_index][line_index - 1]) if line_index > 0 else None,
                        "following_line": ', '.join(columns[col_index][line_index + 1]) if line_index < len(column) - 1 else None,
                        "position": position
                    }
                    attestations.append(attestation)
                    matched_tablets.add(obj_title)

                    if distinguish_variants == "False":
                        inner_array = dismantle_complex_signs(inner_array) if dismantle == 'True' else inner_array
                        inner_array = [normalize_variants(element) for element in inner_array]
                    
                    stop_words_pattern = re.compile(r'^N\d{2}[a-zA-Z]*$|^[a-z]$|^N$|^\d+|\?$|^$')
                    coattestations.extend([element for element in inner_array if element not in query and not stop_words_pattern.match(element)])

    tablet_coattestations = collect_tablet_coattestations(data, matched_tablets, query, distinguish_variants, dismantle)

    return attestations, coattestations, tablet_coattestations, matched_tablets

def collect_coordinated_attestations(query, period, origin, distinguish_variants, dismantle, atomize):
    if atomize == 'True': file_path = os.path.join(current_app.root_path, 'data', 'atomized_source.json')
    else: file_path = os.path.join(current_app.root_path, 'data', 'CDLI_source.json')

    with open(file_path, 'r') as file:
        data = json.load(file)

    specific_origins = ["Uruk", "Tell Uqair", "Jemdet Nasr", "Umma", "Larsa", "uncertain"]
    attestations = []
    matched_tablets = set()

    for obj in data:
        columns = obj.get('columns', [])
        obj_title = obj.get('title', '')
        obj_link = obj.get('link', '')
        obj_period = obj.get('period', '')
        obj_origin = obj.get('origin', '')

        if not filter_by_period(obj_period, period) or not filter_by_origin(obj_origin, origin, specific_origins):
            continue

        found_queries = []
        found_lines = []
        found_line_positions = set()

        for single_query in query:
            for col_index, column in enumerate(columns):

                for line_index, inner_array in enumerate(column):
                    if is_array_subset(single_query, inner_array, distinguish_variants, dismantle):
                        position = (col_index + 1, line_index + 1)
                        attestation = {
                            "title": obj_title,
                            "link": obj_link,
                            "period": obj_period,
                            "origin": obj_origin,
                        }

                        current_line = ', '.join(inner_array)
                        found_queries.append(single_query)

                        if position not in found_line_positions:
                            found_line_positions.add(position)
                            preceding_line = ', '.join(columns[col_index][line_index - 1]) if line_index > 0 else None
                            following_line = ', '.join(columns[col_index][line_index + 1]) if line_index < len(column) - 1 else None

                            found_lines.append({"preceding_line": preceding_line, 
                                                "current_line": current_line,
                                                "following_line": following_line,
                                                "position": position})

                        attestation['found_lines'] = sorted(found_lines, key=lambda x: x['position'])

        if all(elements in found_queries for elements in query):
            attestations.append(attestation)
            matched_tablets.add(obj_title)

    flat_query = [normalize_variants(term) for sublist in query for term in sublist]
    tablet_coattestations = collect_tablet_coattestations(data, matched_tablets, flat_query, distinguish_variants, dismantle)

    return attestations, tablet_coattestations

def collect_tablet_coattestations(data, matched_tablets, query, distinguish_variants, dismantle):
    tablet_coattestations = []
    seen_elements = set()  # track unique elements within each matched_tablet
    for obj in data:
        obj_title = obj.get('title', '')
        if obj_title in matched_tablets:
            seen_elements.clear()
            for column in obj.get('columns', []):
                for array in column:
                    if distinguish_variants == "False":
                        array = dismantle_complex_signs(array) if dismantle == 'True' else array
                        array = [normalize_variants(element) for element in array]
                    
                    stop_words_pattern = re.compile(r'^N\d{2}[a-zA-Z]*$|^[a-z]$|^N$|^\d+|\?$|^$')
                    for element in array:
                        if element not in query and not stop_words_pattern.match(element):
                            if element not in seen_elements:    # make sure we're not adding the same thing multiple times per tablet
                                seen_elements.add(element) 
                                tablet_coattestations.append(element)

    return tablet_coattestations


# Creating statistics

def create_attestations_table(attestations):
    periods = ["Uruk III", "Uruk IV", "Uruk V"]
    origins = ["Uruk", "Jemdet Nasr", "Tell Uqair", "Umma", "Larsa", "uncertain"]
    custom_index = {
        "Uruk III": "III",
        "Uruk IV": "IV",
        "Uruk V": "V"
    }
    custom_labels = {
        "Tell Uqair": "Uqair",
        "Umma": "Umma",
        "Larsa": "Larsa"
    }

    # Create an empty DataFrame to store the counts
    counts = pd.DataFrame(index=periods, columns=origins)

    # Initialize the "other" column as zeros
    counts["other"] = 0

    # Fill the counts DataFrame with the number of attestations per period and origin
    for attestation in attestations:
        period = attestation["period"]
        origin = attestation["origin"]

        if period in periods and origin in origins:
            counts.loc[period, origin] = counts.loc[period, origin] + 1 if not pd.isnull(counts.loc[period, origin]) else 1
        else:
            counts.loc[period, "other"] += 1

    counts["other"] = counts["other"].apply(lambda x: '' if x == 0 else str(x))
    counts = counts.fillna("")
    
    counts = counts.rename(index=custom_index, columns=custom_labels)

    html_table = counts.to_html(classes = 'styledTable')

    return html_table

def process_coattestations(coattestations, attestation_count):
    excluded_starting_strings = ['...', '?']  # Excludes '...' and '?'

    # Filter and normalize the coattestations
    normalized_coattestations = [normalize_variants(item) for item in coattestations if not re.match(r'^\d', item) and not any(item.startswith(s) for s in excluded_starting_strings)]

    counter = Counter(normalized_coattestations)
    
    percentages = {element: (count, count / attestation_count * 100) for element, count in counter.items()}
    sorted_percentages = sorted(percentages.items(), key=lambda x: x[1][1], reverse=True)[:3]  # include only the top 3 scores

    html_content = '<div class = "urukTranscription">'
   
    for element, (count, percent) in sorted_percentages:
        html_content += f'{element}: <span class = "urukLabel">{count} times, {percent:.1f}%</span><br>'

    html_content += '</div>'
    return html_content


# Processing attestations to display correctly

def normalize_line(line):
    return ' '.join(word.replace(',', '') for word in line.split())

def group_attestations(attestations):
    grouped = {}
    for att in attestations:
        title = att['title']
        if title not in grouped:
            grouped[title] = {
                'attestations': [],
                'link': att['link'],
                'period': att['period'],
                'origin': att['origin']
            }
        grouped[title]['attestations'].append(att)   
    return grouped

def generate_html_for_attestation(title, link, period, origin, attestation_list, normalized_terms, dismantle):
    attestation_html = f'''
        <div class="urukAttestation">
            <div class="urukLine">
                <b><a href="{link}" target="_blank">{title}</a> ({period}, {origin})</b>
                <label class="toggle">
                    <input type="checkbox" class="toggleTranscription">
                    <span class="urukLabel">Hide</span>
                </label>
            </div>
    '''

    for attestation in attestation_list:
        attestation_html += generate_html_for_transcription(attestation, normalized_terms, dismantle)

    attestation_html += '</div>'  # Close attestation block
    return attestation_html

def generate_html_for_transcription(attestation, normalized_terms, dismantle):
    preceding_line = attestation.get("preceding_line", "")
    highlighted_line = attestation["current_line"]
    following_line = attestation.get("following_line", "")
    position = attestation.get("position", "")

    words = dismantle_complex_signs(highlighted_line.split()) if dismantle == 'True' else highlighted_line.split()
    for word in words:
        if normalize_variants(word) in normalized_terms: 
            highlighted_line = highlighted_line.replace(word, f'<span class="urukHighlight">{word}</span>')

    lines = [normalize_line(line) for line in [preceding_line, highlighted_line, following_line] if line]
    html = f'''
        <div class="urukTranscription">
            {'<br>'.join(lines)}
        </div>
    '''
    return html

def process_attestations(terms, attestations, dismantle):
    list_of_attestations = ''
    normalized_terms = [normalize_variants(term) for term in terms]

    for title, data in sorted(group_attestations(attestations).items(), key=lambda x: x[0]):
        link = data['link']
        period = data['period']
        origin = data['origin']
        attestation_list = data['attestations']

        list_of_attestations += generate_html_for_attestation(title, link, period, origin, attestation_list, normalized_terms, dismantle)

    return list_of_attestations

def process_coordinated_attestations(terms, attestations, dismantle):
    list_of_attestations = ''
    normalized_terms = [normalize_variants(term) for sublist in terms for term in sublist]

    for item in attestations:
        html = f'''
            <div class="urukAttestation">
                <div class="urukLine">
                    <b><a href="{item['link']}" target="_blank">{item['title']}</a> ({item['period']}, {item['origin']})</b>
                    <label class="toggle">
                        <input type="checkbox" class="toggleTranscription">
                        <span class="urukLabel">Hide</span>
                    </label>
                </div>
        '''

        for group in item['found_lines']:
            html += generate_html_for_transcription(group, normalized_terms, dismantle)

        html += '</div>'
        list_of_attestations += html

    return list_of_attestations