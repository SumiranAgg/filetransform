import * as core from '@actions/core';

import { JsonSubstitution } from './operations/jsonVariableSubstitutionUtility';
import { findfiles } from "./operations/utility";

import fs = require('fs');

var fileEncoding = require('./fileEncodingUtility');

async function run() {
    let filesInput = core.getInput("files", { required: true });
    let files = filesInput.split(",");

    if(files.length > 0){
        segregateFilesAndSubstitute(files);
    }
    else {
        throw Error('FileTranformationNotEnabled');
    }
}

function segregateFilesAndSubstitute(files: string[]) {
    let isSubstitutionApplied: boolean = false;
    for(let file in files){
        let matchedFiles = findfiles(file);
        if(matchedFiles.length === 0) {
            throw new Error('NOJSONfilematchedwithspecificpattern' + file);
        }
        for(let file of matchedFiles) {
            var fileBuffer: Buffer = fs.readFileSync(file);
            var fileEncodeType = fileEncoding.detectFileEncoding(file, fileBuffer);
            var fileContent: string = fileBuffer.toString(fileEncodeType[0]);
            if(fileEncodeType[1]) {
                fileContent = fileContent.slice(1);
            }
            try {
                let jsonSubsitution = new JsonSubstitution();
                fileContent = this.stripJsonComments(fileContent);
                var jsonObject = JSON.parse(fileContent);
                isSubstitutionApplied = jsonSubsitution.jsonVariableSubstitution(file, jsonObject) || isSubstitutionApplied;
                fs.writeFileSync(file, (fileEncodeType[1] ? '\uFEFF' : '') + JSON.stringify(jsonObject, null, 4), { encoding: fileEncodeType[0] });
            }
            catch(exception) {
                try {

                }
            }
        }
    }
}

run();