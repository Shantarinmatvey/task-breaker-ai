import re
import os

with open('styles.css', 'r', encoding='utf-8') as f:
    content = f.read()

# Define patterns to split the CSS.
sections = re.split(r'/\* =========================================\n\s*([^\n]+)\s*\n\s*========================================= \*/', content)

os.makedirs('css/components', exist_ok=True)

file_mapping = {
    'Variables & Design Tokens': 'css/variables.css',
    'Base Layout': 'css/base.css',
    'Utilities': 'css/base.css',
    'Authentication': 'css/components/auth.css',
    'Main Layout': 'css/layout.css',
    'Kanban': 'css/components/kanban.css',
    'Task Cards': 'css/components/kanban.css',
    'Modals': 'css/components/modals.css',
    'Contextual': 'css/components/features.css'
}

files_content = {}
for i in range(1, len(sections), 2):
    header = sections[i].strip()
    data = sections[i+1].strip()
    
    filename = 'css/other.css'
    for key in file_mapping:
        if key in header:
            filename = file_mapping[key]
            break
            
    if filename not in files_content:
        files_content[filename] = []
        
    files_content[filename].append(f"/* === {header} === */\n{data}")

for filename, contents in files_content.items():
    with open(filename, 'w', encoding='utf-8') as f:
        f.write('\n\n'.join(contents) + '\n')
        print(f"Wrote {filename}")
