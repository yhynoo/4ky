def process_line(line):
    if line.startswith('$') or line.startswith('#'):
        return None  # Task 1: Remove lines starting with $ or #

    if line.startswith('@'):
        # Task 2: Keep lines starting with @column or delete other @ lines
        return line if line.startswith('@column') or line.startswith('@ ') else None

    if line.startswith('&'):
        # Task 3: Keep text until the first space
        index_space = line.find(' ')
        return line[:index_space] + '\n' if index_space != -1 else line[1:] + '\n'

    if line[0].isdigit():
        # Task 4: Delete everything until after the first space for lines starting with numbers
        index_space = line.find(' ')
        return line[index_space + 1:] if index_space != -1 else line

    return line

def process_file(input_file, output_file):
    with open(input_file, 'r') as infile:
        lines = infile.readlines()

    processed_lines = [process_line(line) for line in lines]

    # Task 5: Remove commas, question marks, square brackets, and hash signs
    processed_lines = [line.replace(',', '').replace('?', '').replace('[', '').replace(']', '').replace('#', '') for line in processed_lines if line is not None]
    # Task 6: Replace all "X" with "?"
    processed_lines = [line.replace('X', '?') for line in processed_lines]
    # Task 7: Replace all "[...]" with "..."
    processed_lines = [line.replace('[...]', '...') for line in processed_lines]
    # Task 8: Remove double spaces and spaces at the beginning of lines
    processed_lines = [' '.join(line.split()) + '\n' for line in processed_lines]

    with open(output_file, 'w') as outfile:
        outfile.writelines(processed_lines)

if __name__ == "__main__":
    input_file_path = "inscriptions-merged.txt"  # Replace with your input file path
    output_file_path = "inscriptions-output.txt"  # Replace with your desired output file path

    process_file(input_file_path, output_file_path)
