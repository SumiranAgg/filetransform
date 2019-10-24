import fs = require('fs');

import * as core from '@actions/core';

import { EnvTreeUtility } from "./envVariableUtility";

export class JsonSubstitution {
    constructor() {
        this.envTreeUtil = new EnvTreeUtility();
    }
    
    private substituteJsonVariable(jsonObject, envObject) {
        let isValueChanged: boolean = false;
        for(var jsonChild in jsonObject) {
            var jsonChildArray = jsonChild.split('.');
            var resultNode = this.envTreeUtil.checkEnvTreePath(jsonChildArray, 0, jsonChildArray.length, envObject);
            if(resultNode != undefined) {
                if(resultNode.isEnd) {
                    switch(typeof(jsonObject[jsonChild])) {
                        case 'number':
                            console.log('SubstitutingValueonKeyWithNumber', jsonChild , resultNode.value);
                            jsonObject[jsonChild] = !isNaN(resultNode.value) ? Number(resultNode.value): resultNode.value;
                            break;
                        case 'boolean':
                            console.log('SubstitutingValueonKeyWithBoolean' , jsonChild , resultNode.value);
                            jsonObject[jsonChild] = (
                                resultNode.value == 'true' ? true : (resultNode.value == 'false' ? false : resultNode.value)
                            )
                            break;
                        case 'object':
                        case null:
                            try {
                                console.log('SubstitutingValueonKeyWithObject' , jsonChild , resultNode.value);
                                jsonObject[jsonChild] = JSON.parse(resultNode.value);
                            }
                            catch(exception) {
                                core.debug('unable to substitute the value. falling back to string value');
                                jsonObject[jsonChild] = resultNode.value;
                            }
                            break;
                        case 'string':
                            console.log('SubstitutingValueonKeyWithString' , jsonChild , resultNode.value);
                            jsonObject[jsonChild] = resultNode.value;
                    }
                    isValueChanged = true;
                }
                else {
                    isValueChanged = this.substituteJsonVariable(jsonObject[jsonChild], resultNode) || isValueChanged;
                }
            }
        }
        return isValueChanged;
    }
    
    stripJsonComments(content) {
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
    
    jsonVariableSubstitution(file: string, jsonObject) {
        console.log('JSONvariableSubstitution' , file);
        return this.substituteJsonVariable(jsonObject, EnvTreeUtility.getEnvVarTree());   
    }

    private envTreeUtil: EnvTreeUtility;
}