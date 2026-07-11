import re
text = open("app.js", encoding="utf-8").read()
print("Braces:", text.count("{"), text.count("}"))
print("Parens:", text.count("("), text.count(")"))
