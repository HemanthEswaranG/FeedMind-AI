import re

filepath = r"D:\FeedMind AI\frontend\src\App.css"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# remove all font-family definitions
# this regex will match 'font-family: anything;' including optional newlines
content = re.sub(r'font-family\s*:[^;]+;', '', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Font family rules removed completely.")
