import core =require('@actions/core');

import { XmlDomUtility } from "./xmlDomUtility";

let envVarUtility = require ('./envVariableUtility');

const tags = ["applicationSettings", "appSettings", "connectionStrings", "configSections"];

export class XmlSubstitution {

    constructor(xmlDomUtilityInstance: XmlDomUtility) {
        this.variableMap = envVarUtility.getVariableMap();
        this.xmlDomUtility = xmlDomUtilityInstance;
    }
    
    substituteXmlVariables() {
        let isSubstitutionApplied: boolean = false;
        for(let tag of tags) {
            let nodes = this.xmlDomUtility.getElementsByTagName(tag); 
            if(nodes.length == 0) {
                core.debug("Unable to find node with tag '" + tag + "' in provided xml file.");
                continue;
            }
            for(let xmlNode of nodes) {
                if(envVarUtility.isObject(xmlNode)){
                    console.log('Processing substitution for xml node: ' , xmlNode.nodeName);
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
                        core.debug("Error occurred while processing xml node : " + xmlNode.nodeName);
                        core.debug(error);
                    }
                }  
            }
        }        
        return isSubstitutionApplied;
    }

    private updateXmlConfigNodeAttribute(xmlNode): boolean {
        let isSubstitutionApplied: boolean = false;
        let sections = this.xmlDomUtility.getChildElementsByTagName(xmlNode, "section");
        for(let section of sections) {
            if(envVarUtility.isObject(section)) {
                let sectionName = section.attr('name');
                if(!envVarUtility.isEmpty(sectionName)) {
                    let customSectionNodes = this.xmlDomUtility.getElementsByTagName(sectionName);
                    if( customSectionNodes.length != 0) {
                        let customNode = customSectionNodes[0];
                        isSubstitutionApplied = this.updateXmlNodeAttribute(customNode) || isSubstitutionApplied;
                    }
                }
            }
        }
        return isSubstitutionApplied;
    }
    
    private updateXmlNodeAttribute(xmlDomNode): boolean {
    
        let isSubstitutionApplied: boolean = false;
        if (envVarUtility.isEmpty(xmlDomNode) || !envVarUtility.isObject(xmlDomNode) || xmlDomNode.name == "#comment") {
            core.debug("Provided node is empty or a comment.");
            return isSubstitutionApplied;
        }
    
        const ConfigFileAppSettingsToken = 'CONFIG_FILE_SETTINGS_TOKEN';
    
        if(xmlDomNode.attributes) {
            let xmlDomNodeAttributes = xmlDomNode.attributes;
            for (let i = 0; i < xmlDomNodeAttributes.length; i ++) {
                let attribute = xmlDomNodeAttributes[i];
                let attributeNameValue = (attribute.nodeName === "key" || attribute.nodeName == "name") ? attribute.nodeValue : attribute.nodeName;
                let attributeName = (attribute.nodeName === "key" || attribute.nodeName == "name") ? "value" : attribute.nodeName;
    
                if(this.variableMap[attributeNameValue] != undefined) {
                    let ConfigFileAppSettingsTokenName = ConfigFileAppSettingsToken + '(' + attributeNameValue + ')';
                    let isValueReplaced: boolean = false;
                    if (xmlDomNode.hasAttribute(attributeName)) {
                        console.log(`Updating value for key: ${attributeNameValue} with token value: ${ConfigFileAppSettingsTokenName}`);
                        xmlDomNode.setAttribute(attributeName, ConfigFileAppSettingsTokenName);
                        isValueReplaced = true;
                    }
                    else if(xmlDomNode.hasChildNodes()) {
                        let children = xmlDomNode.childNodes;
                        for (let childs = 0; childs < children.length; childs ++) {
                            let childNode = children[childs];
                            if(envVarUtility.isObject(childNode) && childNode.nodeName == attributeName) {
                                if (childNode.childNodes.length === 1) {
                                    console.log(`Updating value for key: ${attributeNameValue} with token value: ${ConfigFileAppSettingsTokenName}`);
                                    childNode.childNodes[0].nodeValue = ConfigFileAppSettingsTokenName;
                                    childNode.childNodes[0].data = ConfigFileAppSettingsTokenName;
                                    isValueReplaced = true;
                                }
                            }
                        }
                    }
    
                    if(isValueReplaced) {
                        this.replacableTokenValues[ConfigFileAppSettingsTokenName] =  this.variableMap[attributeNameValue].replace(/"/g, "'");
                        isSubstitutionApplied = true;
                    }
                }
            }
        }
        if(xmlDomNode.hasChildNodes()) {
            let children = xmlDomNode.childNodes;
            for (let childs = 0; childs < children.length; childs ++) {
                let childNode = children[childs];
                if(envVarUtility.isObject(childNode)) {
                    isSubstitutionApplied = this.updateXmlNodeAttribute(childNode) || isSubstitutionApplied;
                }
            }
        }
        return isSubstitutionApplied;
    }
    
    private updateXmlConnectionStringsNodeAttribute(xmlDomNode): boolean {    
        let isSubstitutionApplied: boolean = false;
        const ConfigFileConnStringToken = 'CONFIG_FILE_CONN_STRING_TOKEN';
        if (envVarUtility.isEmpty(xmlDomNode) || !envVarUtility.isObject(xmlDomNode) || xmlDomNode.name == "#comment") {
            core.debug("Provided node is empty or a comment.");
            return isSubstitutionApplied;
        }
        let xmlDomNodeAttributes = xmlDomNode.attrs;
    
        if(xmlDomNodeAttributes.hasOwnProperty("connectionString")) {
            if(xmlDomNodeAttributes.hasOwnProperty("name") && this.variableMap[xmlDomNodeAttributes.name]) {
                let ConfigFileConnStringTokenName = ConfigFileConnStringToken + '(' + xmlDomNodeAttributes.name + ')';
                core.debug(`Substituting connectionString value for connectionString= ${xmlDomNodeAttributes.name} with token value: ${ConfigFileConnStringTokenName}`);
                xmlDomNode.attr("connectionString", ConfigFileConnStringTokenName);
                this.replacableTokenValues[ConfigFileConnStringTokenName] = this.variableMap[xmlDomNodeAttributes.name].replace(/"/g, "'");
                isSubstitutionApplied = true;
            }
            else if(this.variableMap["connectionString"] != undefined) {
                let ConfigFileConnStringTokenName = ConfigFileConnStringToken + '(connectionString)';
                core.debug(`Substituting connectionString value for connectionString= ${xmlDomNodeAttributes.name} with token value: ${ConfigFileConnStringTokenName}`);
                xmlDomNode.attr("connectionString", ConfigFileConnStringTokenName);
                this.replacableTokenValues[ConfigFileConnStringTokenName] = this.variableMap["connectionString"].replace(/"/g, "'");
                isSubstitutionApplied = true
            }
        }
    
        if(xmlDomNode.hasChildNodes()) {
            let children = xmlDomNode.childNodes;
            for (let childs = 0; childs < children.length; childs ++) {
                let childNode = children[childs];
                if(envVarUtility.isObject(childNode)) {
                    isSubstitutionApplied =  this.updateXmlConnectionStringsNodeAttribute(childNode) || isSubstitutionApplied;
                }
            }
        }
        return isSubstitutionApplied;
    }
    
    private variableMap: Map<any, any>;
    private xmlDomUtility: XmlDomUtility;
    public replacableTokenValues = { "APOS_CHARACTER_TOKEN": "'" };
}