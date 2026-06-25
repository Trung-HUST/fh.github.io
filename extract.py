import json

log_file = r'C:\Users\PT\.gemini\antigravity\brain\47fa6049-7fd8-4d13-b6a6-7b23c71eb9aa\.system_generated\logs\transcript_full.jsonl'
with open(log_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for line in reversed(lines):
    try:
        data = json.loads(line)
        if 'tool_calls' in data:
            for tc in data['tool_calls']:
                if tc['name'] == 'replace_file_content' or tc['name'] == 'multi_replace_file_content':
                    if tc['args'].get('Instruction') == 'Update handleSubmit in RecordListPage':
                        with open('recovered.txt', 'w', encoding='utf-8') as out:
                            out.write(tc['args'].get('ReplacementContent'))
                        print("Saved to recovered.txt")
                        break
    except Exception as e:
        pass
