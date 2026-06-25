import re

with open('apps-script/Code.gs', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r'"Email",\s*"Quantity",\s*"CurrentValue",\s*"DepreciationRate",\s*"LinkedCategory"',
    r'"Email", "Goal", "Quantity", "CurrentValue", "DepreciationRate", "LinkedCategory"',
    content
)

with open('apps-script/Code.gs', 'w', encoding='utf-8') as f:
    f.write(content)
