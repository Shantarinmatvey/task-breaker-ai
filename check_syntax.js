var fso = new ActiveXObject("Scripting.FileSystemObject");
var text = fso.OpenTextFile("app.js", 1).ReadAll();
var ob = text.split("{").length - 1;
var cb = text.split("}").length - 1;
WScript.Echo("Braces: " + ob + " vs " + cb);

var op = text.split("(").length - 1;
var cp = text.split(")").length - 1;
WScript.Echo("Parens: " + op + " vs " + cp);

var oc = text.split("[").length - 1;
var cc = text.split("]").length - 1;
WScript.Echo("Brackets: " + oc + " vs " + cc);
