var ltx = require("ltx");
var envVarUtility = require("./envVariableUtility");

export class LtxDomUtility  {

    private xmlDomLookUpTable = {};
    private headerContent;
    private xmlDom;

    public constructor(xmlContent) {
        this.xmlDomLookUpTable = {};
        this.headerContent = null;
        this.xmlDom = ltx.parse(xmlContent);
        this.readHeader(xmlContent);
        this.buildLookUpTable(this.xmlDom);
    }

    public getXmlDom() {
        return this.xmlDom;
    }

    private readHeader(xmlContent) {
        var index = xmlContent.indexOf('\n');
        if(index > -1) {
            var firstLine = xmlContent.substring(0,index).trim();
            if(firstLine.startsWith("<?") && firstLine.endsWith("?>")) {
                this.headerContent = firstLine;
            }
        }
    }

    public getContentWithHeader(xmlDom) {
        return xmlDom ? (this.headerContent ? this.headerContent + "\n" : "") + xmlDom.root().toString() : "";
    }

    /**
     * Define method to create a lookup for DOM 
     */
    private buildLookUpTable(node) {
        if(node){
            var nodeName = node.name;
            if(nodeName){
                nodeName = nodeName.toLowerCase();
                var listOfNodes = this.xmlDomLookUpTable[nodeName];
                if(listOfNodes == null || !(Array.isArray(listOfNodes))) {
                    listOfNodes = [];
                    this.xmlDomLookUpTable[nodeName] = listOfNodes;
                }
                listOfNodes.push(node);
                var childNodes = node.children;
                for(var i=0 ; i < childNodes.length; i++){
                    var childNodeName = childNodes[i].name;
                    if(childNodeName) {
                        this.buildLookUpTable(childNodes[i]);
                    }
                }
            }
        }
    }

    /**
     *  Returns array of nodes which match with the tag name.
     */
    public getElementsByTagName(nodeName) {
        if(envVarUtility.isEmpty(nodeName))
            return [];
        var selectedElements = this.xmlDomLookUpTable[nodeName.toLowerCase()];
        if(!selectedElements){
            selectedElements = [];
        }
        return selectedElements;
    }

    /**
     *  Search in subtree with provided node name
     */
    public getChildElementsByTagName(node, tagName) {
        if(!envVarUtility.isObject(node) )
            return [];
        var children = node.children;
        var liveNodes = [];
        if(children){
            for( var i=0; i < children.length; i++ ){
                var childName = children[i].name;
                if( !envVarUtility.isEmpty(childName) && tagName == childName){
                    liveNodes.push(children[i]);
                }
                var liveChildNodes = this.getChildElementsByTagName(children[i], tagName);
                if(liveChildNodes && liveChildNodes.length > 0){
                    liveNodes = liveNodes.concat(liveChildNodes);
                }
            }
        }
        return liveNodes;
    }
}
