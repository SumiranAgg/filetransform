export function isPredefinedVariable(variable: string): boolean {
    var predefinedVarPrefix = ['runner.', 'azure_http_user_agent', 'common.', 'system.'];
    for(let varPrefix of predefinedVarPrefix) {
        if(variable.toLowerCase().startsWith(varPrefix)) {
            return true;
        }
    }
    return false;
}

export function getVariableMap() {
    var variableMap = {};
    var variables = process.env;
    Object.keys(variables).forEach(key => {
        if(!isPredefinedVariable(key)) {
            variableMap[key] = variables[key];
        }
    });
    return variableMap;
}