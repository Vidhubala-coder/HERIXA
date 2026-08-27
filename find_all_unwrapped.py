import os

def check_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        code = f.read()
    
    # We will trace character by character
    length = len(code)
    i = 0
    line_num = 1
    
    # Parser states
    in_tag = False          # inside <... tag definition ...>
    in_brace_level = 0      # depth of curly braces (inside JSX or typescript expressions)
    tag_stack = []          # stack of open tag names (e.g. ['SafeAreaView', 'View'])
    
    current_text = []       # text accumulated between > and <
    text_line = 1
    
    in_string = None        # inside string: '"', "'", or '`'
    in_comment = None       # '//' or '/*' or 'JSX'
    
    # Standard text tags that can hold raw text safely
    TEXT_TAGS = {'Text', 'TextInput', 'Animated.Text'}
    
    while i < length:
        ch = code[i]
        
        # Track line numbers
        if ch == '\n':
            line_num += 1
            
        # Handle single line comments outside of strings
        if not in_string and not in_comment:
            if i + 1 < length and code[i] == '/' and code[i+1] == '/':
                in_comment = '//'
                i += 2
                continue
            elif i + 1 < length and code[i] == '/' and code[i+1] == '*':
                in_comment = '/*'
                i += 2
                continue
                
        if in_comment == '//':
            if ch == '\n':
                in_comment = None
            i += 1
            continue
            
        if in_comment == '/*':
            if i + 1 < length and code[i] == '*' and code[i+1] == '/':
                in_comment = None
                i += 2
            else:
                i += 1
            continue
            
        # Handle string literals inside tag definition or expression
        if in_string:
            if ch == in_string and code[i-1] != '\\':
                in_string = None
            i += 1
            continue
            
        if (in_tag or in_brace_level > 0) and ch in ('"', "'", '`'):
            in_string = ch
            i += 1
            continue
            
        # Handle braces inside tags
        if ch == '{' and not in_tag:
            # We are entering a JSX expression block (e.g. <View>{variable}</View>)
            # Check if there was any text before the brace
            if current_text and tag_stack:
                parent = tag_stack[-1]
                t_str = "".join(current_text).strip()
                if t_str and parent not in TEXT_TAGS:
                    # Ignore comment blocks in JSX: {/* ... */}
                    # Note: since we are entering '{', if this is a comment block, it will start with '/*'
                    if not (t_str.startswith('/*') and t_str.endswith('*/')):
                        # Let's check if the text contains any letters or numbers or signs
                        if any(c.isalnum() or c in '.-_=+*&^%$#@!~/\\|:;' for c in t_str):
                            print(f"FOUND: {os.path.basename(path)}:{text_line} | Inside <{parent}> | Text: '{t_str}'")
            
            in_brace_level += 1
            current_text = []
            i += 1
            continue
            
        if ch == '}' and not in_tag:
            if in_brace_level > 0:
                in_brace_level -= 1
            i += 1
            continue
            
        # If we are inside braces, skip tracking text nodes
        if in_brace_level > 0:
            i += 1
            continue
            
        # Handle Tag Open
        if ch == '<' and not in_tag:
            # Check if there was text accumulated before this tag opens
            if current_text and tag_stack:
                parent = tag_stack[-1]
                t_str = "".join(current_text).strip()
                if t_str and parent not in TEXT_TAGS:
                    if any(c.isalnum() or c in '.-_=+*&^%$#@!~/\\|:;' for c in t_str):
                        print(f"FOUND: {os.path.basename(path)}:{text_line} | Inside <{parent}> | Text: '{t_str}'")
            
            current_text = []
            
            # Check if it is a closing tag: </Tag>
            if i + 1 < length and code[i+1] == '/':
                # Pop from stack when we close the tag
                end_pos = code.find('>', i)
                if end_pos != -1:
                    tag_name = code[i+2:end_pos].strip().split()[0] # get first word e.g. "View"
                    if tag_stack and tag_stack[-1] == tag_name:
                        tag_stack.pop()
                    i = end_pos + 1
                    continue
            
            # Check if it's an opening tag
            # We want to match a tag name like <View style={...}>
            # A valid XML tag name starts with a letter, underscore, or colon
            # Followed by letters, digits, hyphens, underscores, colons, or periods
            import re
            m = re.match(r'^<([A-Za-z_][A-Za-z0-9_\-.:]*)', code[i:])
            if m:
                tag_name = m.group(1)
                in_tag = True
                i += len(tag_name) + 1
                continue
                
        # Handle Tag Close (end of tag definition)
        if ch == '>' and in_tag:
            in_tag = False
            # Check if it was self-closing, e.g. <Image />
            if code[i-1] == '/':
                # It is self-closing, so we don't push it to the stack
                pass
            else:
                # Push opening tag to stack
                tag_stack.append(tag_name)
            
            text_line = line_num
            i += 1
            continue
            
        # If we are inside tag description (e.g. attributes), skip accumulation
        if in_tag:
            i += 1
            continue
            
        # If tag stack is not empty, accumulate text
        if tag_stack and in_brace_level == 0:
            if not current_text:
                text_line = line_num
            current_text.append(ch)
            
        i += 1

def scan_all():
    src_dir = r"c:\Users\LENOVO\Desktop\AR model\src"
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith('.tsx'):
                try:
                    check_file(os.path.join(root, file))
                except Exception as e:
                    print(f"Error in {file}: {e}")

if __name__ == '__main__':
    scan_all()
