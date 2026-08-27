import os
import re
import sys

def clean_jsx_comments(text):
    return re.sub(r'\{\s*/\*.*?\*/\s*\}', '', text, flags=re.DOTALL)

def scan_files():
    src_dir = r"c:\Users\LENOVO\Desktop\AR model\src"
    layout_tags = {
        'View', 'ScrollView', 'SafeAreaView', 'TouchableOpacity', 'Pressable', 
        'Modal', 'Animated.View', 'KeyboardAvoidingView'
    }
    
    results = []
    
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith('.tsx'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                content_clean = clean_jsx_comments(content)
                
                # Check characters between tags > and <
                # We want to find text that is NOT wrapped in any braces {} and NOT wrapped in <Text>
                # E.g. <View>  hello <
                # Let's find any text block between > and <
                matches = re.finditer(r'>([^<]*[a-zA-Z0-9.,!?;:\-–—]+[^<]*)<', content_clean)
                for m in matches:
                    text_content = m.group(1)
                    stripped = text_content.strip()
                    
                    # If it's a JSX comment block or JS expression (starts with {), skip it
                    if stripped.startswith('{') or stripped.endswith('}'):
                        continue
                    
                    # Find the opening tag name preceding this '>'
                    pos = m.start()
                    tag_start = content_clean.rfind('<', 0, pos)
                    if tag_start != -1:
                        tag_str = content_clean[tag_start:pos]
                        tag_name_match = re.match(r'^<([\w.]+)', tag_str)
                        if tag_name_match:
                            tag_name = tag_name_match.group(1)
                            if tag_name in layout_tags:
                                line_num = content[:pos].count('\n') + 1
                                results.append(f"FILE: {file}:{line_num} | TAG: {tag_name} | TEXT: '{stripped}'")
    
    with open("raw_text_errors.txt", "w", encoding="utf-8") as out:
        for r in results:
            out.write(r + "\n")
            print(r)

scan_files()
