import json
import os

def add_question_image_field(file_path):
    """Add question_image field to all questions that don't have it"""
    print(f"Processing file: {file_path}")
    
    # Read the JSON file
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Keep track of changes
    changes_made = 0
    
    # Process each question
    for i, question in enumerate(data):
        # Check if question_image field exists
        if 'question_image' not in question:
            # Add empty question_image field after question_text
            # Create a new ordered dictionary to maintain field order
            new_question = {}
            
            for key, value in question.items():
                new_question[key] = value
                # Add question_image field after question_text
                if key == 'question_text':
                    new_question['question_image'] = ""
            
            data[i] = new_question
            changes_made += 1
    
    # Write back to file if changes were made
    if changes_made > 0:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Added question_image field to {changes_made} questions in {os.path.basename(file_path)}")
    else:
        print(f"No changes needed for {os.path.basename(file_path)}")
    
    return changes_made

def main():
    # Get the directory where the script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    json_dir = os.path.join(script_dir, 'json_Q_A')
    
    # Process all JSON files in the json_Q_A directory
    json_files = [
        'ITASTQB-QTEST-FL-2023-A-QA.json',
        'ITASTQB-QTEST-FL-2023-B-QA.json',
        'ITASTQB-QTEST-FL-2023-C-QA.json',
        'ITASTQB-QTEST-FL-2023-D-QA.json'
    ]
    
    total_changes = 0
    
    for filename in json_files:
        file_path = os.path.join(json_dir, filename)
        if os.path.exists(file_path):
            changes = add_question_image_field(file_path)
            total_changes += changes
        else:
            print(f"File not found: {file_path}")
    
    print(f"\nTotal changes made: {total_changes}")

if __name__ == "__main__":
    main()
