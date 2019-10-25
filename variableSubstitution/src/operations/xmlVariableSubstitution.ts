import core =require('@actions/core');

import { LtxDomUtility } from "./ltxDomUtility";

var envVarUtility = require ('./envVariableUtility');

const tags = ["applicationSettings", "appSettings", "connectionStrings", "configSections"];

export class XmlSubstitution {

    constructor(ltxDomUtilityInstance: LtxDomUtility) {
        this.variableMap = envVarUtility.getVariableMap();
        this.ltxDomUtility = ltxDomUtilityInstance;
    }
    
    substituteXmlVariables() {
        var isSubstitutionApplied: boolean = false;
        for(var tag of tags) {
            var nodes = this.ltxDomUtility.getElementsByTagName(tag); 
            if(nodes.length == 0) {
                core.debug("Unable to find node with tag '" + tag + "' in provided xml file.");
                continue;
            }
            for(var xmlNode of nodes) {
                if(envVarUtility.isObject(xmlNode)){
                    console.log('Processing substitution for xml node: ' , xmlNode.name);
                    try {
                        if(xmlNode.name == "configSections") {
                            isSubstitutionApplied = this.updateXmlConfigNodeAttribute(xmlNode) || isSubstitutionApplied;
                        }
                        else if(xmlNode.name == "connectionStrings") {
                            isSubstitutionApplied = this.updateXmlConnectionStringsNodeAttribute(xmlNode) || isSubstitutionApplied;
                        }
                        else {
                            isSubstitutionApplied = this.updateXmlNodeAttribute(xmlNode) || isSubstitutionApplied;
                        }
                    } catch (error){
                        core.debug("Error occurred while processing xml node : " + xmlNode.name);
                        core.debug(error);
                    }
                }  
            }
        }        
        return isSubstitutionApplied;
    }

    private updateXmlConfigNodeAttribute(xmlNode): boolean {
        var isSubstitutionApplied: boolean = false;
        var sections = this.ltxDomUtility.getChildElementsByTagName(xmlNode, "section");
        for(var section of sections) {
            if(envVarUtility.isObject(section)) {
                var sectionName = section.attr('name');
                if(!envVarUtility.isEmpty(sectionName)) {
                    var customSectionNodes = this.ltxDomUtility.getElementsByTagName(sectionName);
                    if( customSectionNodes.length != 0) {
                        var customNode = customSectionNodes[0];
                        isSubstitutionApplied = this.updateXmlNodeAttribute(customNode) || isSubstitutionApplied;
                    }
                }
            }
        }
        return isSubstitutionApplied;
    }
    
    private updateXmlNodeAttribute(xmlDomNode): boolean {
    
        var isSubstitutionApplied: boolean = false;
        if (envVarUtility.isEmpty(xmlDomNode) || !envVarUtility.isObject(xmlDomNode) || xmlDomNode.name == "#comment") {
            core.debug("Provided node is empty or a comment.");
            return isSubstitutionApplied;
        }
    
        var xmlDomNodeAttributes = xmlDomNode.attrs;
        const ConfigFileAppSettingsToken = 'CONFIG_FILE_SETTINGS_TOKEN';
    
        for(var attributeName in xmlDomNodeAttributes) {
            var attributeNameValue = (attributeName === "key" || attributeName == "name") ? xmlDomNodeAttributes[attributeName] : attributeName;
            var attributeName = (attributeName === "key" || attributeName == "name") ? "value" : attributeName;
    
            if(this.variableMap[attributeNameValue] != undefined) {
                var ConfigFileAppSettingsTokenName = ConfigFileAppSettingsToken + '(' + attributeNameValue + ')';
                let isValueReplaced: boolean = false;
                if(xmlDomNode.getAttr(attributeName) != undefined) {
                    console.log(`Updating value for key: ${attributeNameValue} with token value: ${ConfigFileAppSettingsTokenName}`);
                    xmlDomNode.attr(attributeName, ConfigFileAppSettingsTokenName);
                    isValueReplaced = true;
                } else {
                    var children = xmlDomNode.children;
                    for(var childNode of children) {
                        if(envVarUtility.isObject(childNode) && childNode.name == attributeName) {
                            if (childNode.children.length === 1) {
                                console.log(`Updating value for key: ${attributeNameValue} with token value: ${ConfigFileAppSettingsTokenName}`);
                                childNode.children[0] = ConfigFileAppSettingsTokenName;
                                isValueReplaced = true;
                            }
                        }
                    }
                }
    
                if(isValueReplaced) {
                    this.replacableTokenValues[ConfigFileAppSettingsTokenName] = this.variableMap[attributeNameValue].replace(/"/g, "'");
                    isSubstitutionApplied = true;
                }
            }
        }
        var children = xmlDomNode.children;
        for(var childNode of children) {
            if(envVarUtility.isObject(childNode)) {
                isSubstitutionApplied = this.updateXmlNodeAttribute(childNode) || isSubstitutionApplied;
            }
        }
        return isSubstitutionApplied;
    }
    
    private updateXmlConnectionStringsNodeAttribute(xmlDomNode): boolean {    
        var isSubstitutionApplied: boolean = false;
        const ConfigFileConnStringToken = 'CONFIG_FILE_CONN_STRING_TOKEN';
        if (envVarUtility.isEmpty(xmlDomNode) || !envVarUtility.isObject(xmlDomNode) || xmlDomNode.name == "#comment") {
            core.debug("Provided node is empty or a comment.");
            return isSubstitutionApplied;
        }
        var xmlDomNodeAttributes = xmlDomNode.attrs;
    
        if(xmlDomNodeAttributes.hasOwnProperty("connectionString")) {
            if(xmlDomNodeAttributes.hasOwnProperty("name") && this.variableMap[xmlDomNodeAttributes.name]) {
                var ConfigFileConnStringTokenName = ConfigFileConnStringToken + '(' + xmlDomNodeAttributes.name + ')';
                core.debug(`Substituting connectionString value for connectionString= ${xmlDomNodeAttributes.name} with token value: ${ConfigFileConnStringTokenName}`);
                xmlDomNode.attr("connectionString", ConfigFileConnStringTokenName);
                this.replacableTokenValues[ConfigFileConnStringTokenName] = this.variableMap[xmlDomNodeAttributes.name].replace(/"/g, "'");
                isSubstitutionApplied = true;
            }
            else if(this.variableMap["connectionString"] != undefined) {
                var ConfigFileConnStringTokenName = ConfigFileConnStringToken + '(connectionString)';
                core.debug(`Substituting connectionString value for connectionString= ${xmlDomNodeAttributes.name} with token value: ${ConfigFileConnStringTokenName}`);
                xmlDomNode.attr("connectionString", ConfigFileConnStringTokenName);
                this.replacableTokenValues[ConfigFileConnStringTokenName] = this.variableMap["connectionString"].replace(/"/g, "'");
                isSubstitutionApplied = true
            }
        }
    
        var children = xmlDomNode.children;
        for(var childNode of children) {
            if(envVarUtility.isObject(childNode)) {
                isSubstitutionApplied = this.updateXmlConnectionStringsNodeAttribute(childNode) || isSubstitutionApplied;
            }
        }
    
        return isSubstitutionApplied;
    }
    
    private variableMap: Map<any, any>;
    private ltxDomUtility: LtxDomUtility;
    public replacableTokenValues = { "APOS_CHARACTER_TOKEN": "'" };
}