import os
import re

LAYOUT_TAGS = {
    'View', 'ScrollView', 'SafeAreaView', 'TouchableOpacity', 'Pressable',
    'Modal', 'Animated.View', 'KeyboardAvoidingView'
}

def analyze_tsx_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        code = f.read()

    # Let's strip standard multiline comments outside JSX first to avoid issues
    # but keep JSX comments {/* ... */} for checking.
    # Actually, we can parse char by char.
    
    length = len(code)
    i = 0
    
    # Simple stack: stores (tag_name, line_num)
    stack = []
    
    # We want to trace:
    # - Whether we are inside a JSX tag definition, e.g. <View style={...}>
    # - Whether we are inside a JSX expression, e.g. { ... }
    # - Whether we are inside a string literal, e.g. "..." or '...'
    
    in_tag_definition = False
    in_expression = 0  # nested level of curly braces
    in_string = None  # None, '"', "'", '`'
    
    current_text = []
    text_line = 1
    
    # Heuristic check for JSX block: we assume JSX starts when we see a return or assignment with '<'
    # To keep it simple and robust, let's parse the whole file. Since TSX uses '<' for generics too, 
    # we can identify JSX tags by seeing if they match standard tag name patterns.
    
    # Standard JSX tag start pattern: <[A-Za-z_][A-Za-z0-9_.]*
    # Closing tag pattern: </[A-Za-z_][A-Za-z0-9_.]*>
    
    line_num = 1
    
    while i < length:
        ch = code[i]
        
        if ch == '\n':
            line_num += 1
            
        # Handle string literals inside tag definitions or expressions
        if in_string:
            if ch == in_string and code[i-1] != '\\':
                in_string = None
            i += 1
            continue
            
        if ch in ('"', "'", '`') and (in_tag_definition or in_expression > 0):
            in_string = ch
            i += 1
            continue
            
        # Handle expressions { ... }
        if ch == '{' and not in_tag_definition:
            in_expression += 1
            # Check accumulated text before entering expression
            if current_text and stack:
                check_accumulated_text(stack, current_text, text_line, filepath)
            current_text = []
            i += 1
            continue
            
        if ch == '}' and not in_tag_definition:
            if in_expression > 0:
                in_expression -= 1
            i += 1
            continue
            
        if in_expression > 0:
            i += 1
            continue
            
        # Handle tag definition start/end
        if ch == '<' and not in_tag_definition:
            # Check if it's a comment, opening tag, closing tag, or just '<' operator/generic
            # Check closing tag first: </Name>
            if i + 1 < length and code[i+1] == '/':
                # It's a closing tag
                end_pos = code.find('>', i)
                if end_pos != -1:
                    tag_name = code[i+2:end_pos].strip()
                    # Check text before closing tag
                    if current_text and stack:
                        check_accumulated_text(stack, current_text, text_line, filepath)
                    current_text = []
                    
                    if stack and stack[-1][0] == tag_name:
                        stack.pop()
                    i = end_pos + 1
                    continue
            
            # Check opening tag: <Name ...> or <Name />
            # Make sure it's followed by a valid tag identifier (and not space, number, or <= operator)
            match = re.match(r'^<([A-Za-z_][A-Za-z0-9_.]*)', code[i:])
            if match:
                tag_name = match.group(1)
                # Check text before opening this new tag
                if current_text and stack:
                    check_accumulated_text(stack, current_text, text_line, filepath)
                current_text = []
                
                # Check if it's self-closing right away, e.g. <View />
                end_pos = code.find('>', i)
                if end_pos != -1:
                    is_self_closing = code[end_pos-1] == '/'
                    if not is_self_closing:
                        stack.append((tag_name, line_num))
                    i = end_pos + 1
                    continue
                    
        # Accumulate text when inside a tag and not in tag definition or expression
        if stack and not in_tag_definition and in_expression == 0:
            if not current_text:
                text_line = line_num
            current_text.append(ch)
            
        i += 1

def check_accumulated_text(stack, current_text, line_num, filepath):
    text_str = "".join(current_text)
    # Check if the text contains any non-whitespace characters
    stripped = text_str.strip()
    if not stripped:
        return
        
    # Ignore JSX comments if they survived, or common JS characters
    # If the text has letters, numbers, or punctuation (like dots/dashes)
    if any(c.isalnum() or c in '.-_=+*&^%$#@!~/\\|:;' for c in stripped):
        # Find the parent tag
        parent_tag, parent_line = stack[-1]
        if parent_tag in LAYOUT_TAGS:
            print(f"ERROR: Unwrapped text in {os.path.basename(filepath)} at line {line_num} (inside <{parent_tag}> at line {parent_line}): '{stripped}'")

def scan_all():
    src_dir = r"c:\Users\LENOVO\Desktop\AR model\src"
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith('.tsx'):
                analyze_tsx_file(os.path.join(root, file))

if __name__ == '__main__':
    scan_all()
