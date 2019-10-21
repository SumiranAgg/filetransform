import * as core from '@actions/core';
import * as jsonSubstitutionUtility from "./operations/jsonVariableSubstitutionUtility";

async function run() {
    let folderPath = core.getInput("folder-path", { required: true });
    let jsonFilesInput = core.getInput("json-files");

    if(!!jsonFilesInput) {
        let jsonFiles = jsonFilesInput.split(",");
        if(jsonFiles.length > 0){
            let isSubstitutionApplied = jsonSubstitutionUtility.jsonVariableSubstitution(folderPath, jsonFiles);
            if(isSubstitutionApplied) {
                console.log('JSONvariablesubstitutionappliedsuccessfully'); 
            } 
            else {
                core.error('FailedToApplyJSONvariablesubstitutionReason1');
            }
        }
    }
}

run();