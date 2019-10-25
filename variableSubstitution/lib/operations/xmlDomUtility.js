"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var envVarUtility = require("./envVariableUtility");
var DOMParser = require('xmldom').DOMParser;
class XmlDomUtility {
    constructor(xmlContent) {
        this.xmlDomLookUpTable = {};
        this.xmlDomLookUpTable = {};
        this.xmlDom = new DOMParser().parseFromString(xmlContent, "text/xml");
        this.buildLookUpTable(this.xmlDom);
    }
    getXmlDom() {
        return this.xmlDom;
    }
    getContentWithHeader(xmlDom) {
        return xmlDom ? xmlDom.toString() : "";
    }
    /**
     * Define method to create a lookup for DOM
     */
    buildLookUpTable(node) {
        if (node) {
            let nodeName = node.nodeName;
            if (nodeName) {
                nodeName = nodeName.toLowerCase();
                let listOfNodes = this.xmlDomLookUpTable[nodeName];
                if (listOfNodes == null || !(Array.isArray(listOfNodes))) {
                    this.xmlDomLookUpTable[nodeName] = [];
                }
                (this.xmlDomLookUpTable[nodeName]).push(node);
                if (node.hasChildNodes()) {
                    let children = node.childNodes;
                    for (let i = 0; i < children.length; i++) {
                        this.buildLookUpTable(children[i]);
                    }
                }
            }
        }
    }
    /**
     *  Returns array of nodes which match with the tag name.
     */
    getElementsByTagName(nodeName) {
        if (envVarUtility.isEmpty(nodeName))
            return [];
        let selectedElements = this.xmlDomLookUpTable[nodeName.toLowerCase()];
        if (!selectedElements) {
            selectedElements = [];
        }
        return selectedElements;
    }
    /**
     *  Search in subtree with provided node name
     */
    getChildElementsByTagName(node, tagName) {
        if (!envVarUtility.isObject(node))
            return [];
        let liveNodes = [];
        if (node.hasChildNodes()) {
            let children = node.childNodes;
            for (let i = 0; i < children.length; i++) {
                let childName = children[i].nodeName;
                if (!envVarUtility.isEmpty(childName) && tagName == childName) {
                    liveNodes.push(children[i]);
                }
                let liveChildNodes = this.getChildElementsByTagName(children[i], tagName);
                if (liveChildNodes && liveChildNodes.length > 0) {
                    liveNodes = liveNodes.concat(liveChildNodes);
                }
            }
        }
        return liveNodes;
    }
}
exports.XmlDomUtility = XmlDomUtility;
