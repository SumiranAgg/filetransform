"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const envVariableUtility_1 = require("./operations/envVariableUtility");
const jsonVariableSubstitutionUtility_1 = require("./operations/jsonVariableSubstitutionUtility");
const ltxDomUtility_1 = require("./operations/ltxDomUtility");
const xmlVariableSubstitution_1 = require("./operations/xmlVariableSubstitution");
const utility_1 = require("./operations/utility");
const fs = require("fs");
var yaml = require('js-yaml');
var fileEncoding = require('./operations/fileEncodingUtility');
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        let filesInput = core.getInput("files", { required: true });
        let files = filesInput.split(",");
        if (files.length > 0) {
            segregateFilesAndSubstitute(files);
        }
        else {
            throw Error('File Tranformation is not enabled. Please provide JSON/XML or YAML target files for variable substitution.');
        }
    });
}
function segregateFilesAndSubstitute(files) {
    let isSubstitutionApplied = false;
    for (let file in files) {
        let matchedFiles = utility_1.findfiles(file);
        if (matchedFiles.length == 0) {
            core.error('No file matched with specific pattern: ' + file);
            continue;
        }
        for (let file of matchedFiles) {
            var fileBuffer = fs.readFileSync(file);
            var fileEncodeType = fileEncoding.detectFileEncoding(file, fileBuffer);
            var fileContent = fileBuffer.toString(fileEncodeType[0]);
            if (fileEncodeType[1]) {
                fileContent = fileContent.slice(1);
            }
            if (isJson(file, fileContent)) {
                console.log("Applying variable substitution on JSON file: " + file);
                let jsonSubsitution = new jsonVariableSubstitutionUtility_1.JsonSubstitution();
                let jsonObject = fileContentCache.get(file);
                let isJsonSubstitutionApplied = jsonSubsitution.substituteJsonVariable(jsonObject, envVariableUtility_1.EnvTreeUtility.getEnvVarTree());
                if (isJsonSubstitutionApplied) {
                    fs.writeFileSync(file, (fileEncodeType[1] ? '\uFEFF' : '') + JSON.stringify(jsonObject, null, 4), { encoding: fileEncodeType[0] });
                    console.log(`Successfully updated file: ${file}`);
                }
                else {
                    console.log('Skipped updating file: ' + file);
                }
                isSubstitutionApplied = isJsonSubstitutionApplied || isSubstitutionApplied;
            }
            else if (isYaml(file, fileContent)) {
                console.log("Applying variable substitution on YAML file: " + file);
                let jsonSubsitution = new jsonVariableSubstitutionUtility_1.JsonSubstitution();
                let yamlObject = fileContentCache.get(file);
                let isYamlSubstitutionApplied = jsonSubsitution.substituteJsonVariable(yamlObject, envVariableUtility_1.EnvTreeUtility.getEnvVarTree());
                if (isYamlSubstitutionApplied) {
                    fs.writeFileSync(file, (fileEncodeType[1] ? '\uFEFF' : '') + yaml.safeDump(yamlObject), { encoding: fileEncodeType[0] });
                    console.log(`Successfully updated config file: ${file}`);
                }
                else {
                    console.log('Skipped updating file: ' + file);
                }
                isSubstitutionApplied = isYamlSubstitutionApplied || isSubstitutionApplied;
            }
            else if (isXml(file, fileContent)) {
                console.log("Applying variable substitution on XML file: " + file);
                let ltxDomUtilityInstance = fileContentCache.get(file);
                let xmlSubstitution = new xmlVariableSubstitution_1.XmlSubstitution(ltxDomUtilityInstance);
                let isXmlSubstitutionApplied = xmlSubstitution.substituteXmlVariables();
                if (isXmlSubstitutionApplied) {
                    let xmlDocument = replaceEscapeXMLCharacters(ltxDomUtilityInstance.getXmlDom());
                    var domContent = (fileEncodeType[1] ? '\uFEFF' : '') + ltxDomUtilityInstance.getContentWithHeader(xmlDocument);
                    for (var replacableTokenValue in xmlSubstitution.replacableTokenValues) {
                        core.debug('Substituting original value in place of temp_name: ' + replacableTokenValue);
                        domContent = domContent.split(replacableTokenValue).join(xmlSubstitution.replacableTokenValues[replacableTokenValue]);
                    }
                    fs.writeFileSync(file, domContent, { encoding: fileEncodeType[0] });
                    console.log(`Successfully updated file: ${file}`);
                }
                else {
                    console.log('Skipped updating file: ' + file);
                }
                isSubstitutionApplied = isXmlSubstitutionApplied || isSubstitutionApplied;
            }
            else {
                throw new Error("Could not parse file: " + file + "\n" + parseException);
            }
        }
        if (!isSubstitutionApplied) {
            throw new Error("Failed to apply variable substitution");
        }
    }
}
var fileContentCache = new Map();
var parseException = "";
function isJson(file, content) {
    try {
        content = stripJsonComments(content);
        let jsonObject = JSON.parse(content);
        if (!fileContentCache.has(file)) {
            fileContentCache.set(file, jsonObject);
        }
        return true;
    }
    catch (exception) {
        parseException += "JSON parse error: " + exception + "\n";
        return false;
    }
}
function isYaml(file, content) {
    try {
        let yamlObject = yaml.safeLoad(content);
        if (!fileContentCache.has(file)) {
            fileContentCache.set(file, yamlObject);
        }
        return true;
    }
    catch (exception) {
        parseException += "YAML parse error: " + exception + "\n";
        return false;
    }
}
function isXml(file, content) {
    try {
        let ltxDomUtiltiyInstance = new ltxDomUtility_1.LtxDomUtility(content);
        if (!fileContentCache.has(file)) {
            fileContentCache.set(file, ltxDomUtiltiyInstance);
        }
        return true;
    }
    catch (exception) {
        parseException += "XML parse error: " + exception;
        return false;
    }
}
function stripJsonComments(content) {
    if (!content || (content.indexOf("//") < 0 && content.indexOf("/*") < 0)) {
        return content;
    }
    var currentChar;
    var nextChar;
    var insideQuotes = false;
    var contentWithoutComments = '';
    var insideComment = 0;
    var singlelineComment = 1;
    var multilineComment = 2;
    for (var i = 0; i < content.length; i++) {
        currentChar = content[i];
        nextChar = i + 1 < content.length ? content[i + 1] : "";
        if (insideComment) {
            if (insideComment == singlelineComment && (currentChar + nextChar === '\r\n' || currentChar === '\n')) {
                i--;
                insideComment = 0;
                continue;
            }
            if (insideComment == multilineComment && currentChar + nextChar === '*/') {
                i++;
                insideComment = 0;
                continue;
            }
        }
        else {
            if (insideQuotes && currentChar == "\\") {
                contentWithoutComments += currentChar + nextChar;
                i++; // Skipping checks for next char if escaped
                continue;
            }
            else {
                if (currentChar == '"') {
                    insideQuotes = !insideQuotes;
                }
                if (!insideQuotes) {
                    if (currentChar + nextChar === '//') {
                        insideComment = singlelineComment;
                        i++;
                    }
                    if (currentChar + nextChar === '/*') {
                        insideComment = multilineComment;
                        i++;
                    }
                }
            }
        }
        if (!insideComment) {
            contentWithoutComments += content[i];
        }
    }
    return contentWithoutComments;
}
function replaceEscapeXMLCharacters(xmlDOMNode) {
    if (!xmlDOMNode || typeof xmlDOMNode == 'string') {
        return;
    }
    for (var xmlAttribute in xmlDOMNode.attrs) {
        xmlDOMNode.attrs[xmlAttribute] = xmlDOMNode.attrs[xmlAttribute].replace(/'/g, "APOS_CHARACTER_TOKEN");
    }
    for (var xmlChild of xmlDOMNode.children) {
        replaceEscapeXMLCharacters(xmlChild);
    }
}
run().catch((error) => {
    core.setFailed(error);
});
