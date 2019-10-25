import core = require('@actions/core');

import { EnvTreeUtility } from "./operations/envVariableUtility";
import { JsonSubstitution } from './operations/jsonVariableSubstitutionUtility';
import { LtxDomUtility } from "./operations/ltxDomUtility";
import { XmlSubstitution } from './operations/xmlVariableSubstitution';
import { findfiles } from "./operations/utility";

import fs = require('fs');
import yaml = require('js-yaml');
import fileEncoding = require('./operations/fileEncodingUtility');

async function run() {
    let filesInput = core.getInput("files", { required: true });
    let files = filesInput.split(",");
console.log(files);
    if(files.length > 0){
        segregateFilesAndSubstitute(files);
    }
    else {
        throw Error('File Tranformation is not enabled. Please provide JSON/XML or YAML target files for variable substitution.');
    }
}

function segregateFilesAndSubstitute(files: string[]) {
    let isSubstitutionApplied: boolean = false;
    for(let file in files){
        let matchedFiles = findfiles(file);
        if(matchedFiles.length == 0) {
            core.error('No file matched with specific pattern: ' + file);
            continue;
        }
        for(let file of matchedFiles) {
            var fileBuffer: Buffer = fs.readFileSync(file);
            var fileEncodeType = fileEncoding.detectFileEncoding(file, fileBuffer);
            var fileContent: string = fileBuffer.toString(fileEncodeType.encoding);
            if(fileEncodeType.withBOM) {
                fileContent = fileContent.slice(1);
            }
            if(isJson(file, fileContent)) {
                console.log("Applying variable substitution on JSON file: " + file);
                let jsonSubsitution =  new JsonSubstitution();
                let jsonObject = fileContentCache.get(file);
                let isJsonSubstitutionApplied = jsonSubsitution.substituteJsonVariable(jsonObject, EnvTreeUtility.getEnvVarTree());
                if(isJsonSubstitutionApplied) {
                    fs.writeFileSync(file, (fileEncodeType.withBOM ? '\uFEFF' : '') + JSON.stringify(jsonObject, null, 4), { encoding: fileEncodeType.encoding });
                    console.log(`Successfully updated file: ${file}`);
                }
                else {
                    console.log('Skipped updating file: ' + file);
                }
                isSubstitutionApplied = isJsonSubstitutionApplied || isSubstitutionApplied;
            }                
            else if(isYaml(file, fileContent)) {
                console.log("Applying variable substitution on YAML file: " + file);
                let jsonSubsitution =  new JsonSubstitution();
                let yamlObject = fileContentCache.get(file);
                let isYamlSubstitutionApplied = jsonSubsitution.substituteJsonVariable(yamlObject, EnvTreeUtility.getEnvVarTree());
                if(isYamlSubstitutionApplied) {
                    fs.writeFileSync(file, (fileEncodeType.withBOM ? '\uFEFF' : '') + yaml.safeDump(yamlObject), { encoding: fileEncodeType.encoding });
                    console.log(`Successfully updated config file: ${file}`);
                }
                else {
                    console.log('Skipped updating file: ' + file);
                }
                isSubstitutionApplied = isYamlSubstitutionApplied || isSubstitutionApplied;
            }
            else if(isXml(file, fileContent)) {
                console.log("Applying variable substitution on XML file: " + file);   
                let ltxDomUtilityInstance: LtxDomUtility = fileContentCache.get(file);
                let xmlSubstitution = new XmlSubstitution(ltxDomUtilityInstance);
                let isXmlSubstitutionApplied = xmlSubstitution.substituteXmlVariables();
                if(isXmlSubstitutionApplied) {
                    let xmlDocument = replaceEscapeXMLCharacters(ltxDomUtilityInstance.getXmlDom());
                    var domContent = ( fileEncodeType.withBOM? '\uFEFF' : '' ) + ltxDomUtilityInstance.getContentWithHeader(xmlDocument);
                    for(var replacableTokenValue in xmlSubstitution.replacableTokenValues) {
                        core.debug('Substituting original value in place of temp_name: ' + replacableTokenValue);
                        domContent = domContent.split(replacableTokenValue).join(xmlSubstitution.replacableTokenValues[replacableTokenValue]);
                    }
                    fs.writeFileSync(file, domContent, { encoding: fileEncodeType.encoding });
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

        if(!isSubstitutionApplied) {
            throw new Error("Failed to apply variable substitution");
        }
    }
}

var fileContentCache = new Map<String, any>();
var parseException: string = "";

function isJson(file: string, content: string): boolean {
    try {
        content = stripJsonComments(content);
        let jsonObject = JSON.parse(content);
        if(!fileContentCache.has(file)) {
            fileContentCache.set(file, jsonObject);
        }
        return true;
    }
    catch(exception) {
        parseException += "JSON parse error: " + exception + "\n";
        return false;
    }
}

function isYaml(file: string, content: string) : boolean {
    try {
        let yamlObject = yaml.safeLoad(content);
        if(!fileContentCache.has(file)) {
            fileContentCache.set(file, yamlObject);
        }
        return true;
    }
    catch(exception) {
        parseException += "YAML parse error: " + exception + "\n";
        return false;
    }
}

function isXml(file: string, content: string): boolean {
    try{
        let ltxDomUtiltiyInstance = new LtxDomUtility(content);
        if(!fileContentCache.has(file)) {
            fileContentCache.set(file, ltxDomUtiltiyInstance);
        }
        return true;
    }
    catch(exception) {
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

        } else {
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
    if(!xmlDOMNode || typeof xmlDOMNode == 'string') {
        return;
    }

    for(var xmlAttribute in xmlDOMNode.attrs) {
        xmlDOMNode.attrs[xmlAttribute] = xmlDOMNode.attrs[xmlAttribute].replace(/'/g, "APOS_CHARACTER_TOKEN");
    }

    for(var xmlChild of xmlDOMNode.children) {
        replaceEscapeXMLCharacters(xmlChild);
    }
}

run().catch((error) => {
	core.setFailed(error);
});