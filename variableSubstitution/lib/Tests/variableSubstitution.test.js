"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const envVariableUtility_1 = require("../operations/envVariableUtility");
const jsonVariableSubstitutionUtility_1 = require("../operations/jsonVariableSubstitutionUtility");
const variableSubstitution_1 = require("../variableSubstitution");
const xmlDomUtility_1 = require("../operations/xmlDomUtility");
const xmlVariableSubstitution_1 = require("../operations/xmlVariableSubstitution");
const chai_1 = require("chai");
const path = require("path");
const sinon = require("sinon");
describe("Test variable substitution main", () => {
    let spy;
    let files = path.join(__dirname, "/Resources/Web.config") + "," + path.join(__dirname, "/Resources/Wrong_Web.config") + "," + path.join(__dirname, "/Resources/test.json") + "," + path.join(__dirname, "/Resources/Wrong_test.json") + "," + path.join(__dirname, "/Resources/test.yaml") + "," + path.join(__dirname, "/Resources/Wrong_test.yml");
    let filesArr = files.split(",");
    before(() => {
        spy = sinon.spy(console, "log");
        let EnvTreeUtilityStub = sinon.stub(envVariableUtility_1.EnvTreeUtility);
        let JsonSubstitutionStub = sinon.stub(jsonVariableSubstitutionUtility_1.JsonSubstitution);
        let XmlDomUtilityStub = sinon.stub(xmlDomUtility_1.XmlDomUtility);
        let XmlSubstitutionStub = sinon.stub(xmlVariableSubstitution_1.XmlSubstitution);
        let varSub = new variableSubstitution_1.VariableSubstitution();
        varSub.segregateFilesAndSubstitute(filesArr);
        EnvTreeUtilityStub.restore();
        JsonSubstitutionStub.restore();
        XmlDomUtilityStub.restore();
        XmlSubstitutionStub.restore();
        spy.restore();
    });
    it("Valid XML", () => {
        chai_1.expect(spy.calledWith("Applying variable substitution on XML file: " + filesArr[0])).to.be.true;
    });
    it("Invalid XML", () => {
        chai_1.expect(spy.calledWith("Applying variable substitution on XML file: " + filesArr[1])).to.be.false;
    });
    it("Valid JSON", () => {
        chai_1.expect(spy.calledWith("Applying variable substitution on JSON file: " + filesArr[2])).to.be.true;
    });
    it("Invalid JSON", () => {
        chai_1.expect(spy.calledWith("Applying variable substitution on JSON file: " + filesArr[3])).to.be.false;
    });
    it("Valid YAML", () => {
        chai_1.expect(spy.calledWith("Applying variable substitution on YAML file: " + filesArr[4])).to.be.true;
    });
    it("Invalid YAML", () => {
        chai_1.expect(spy.calledWith("Applying variable substitution on YAML file: " + filesArr[5])).to.be.false;
    });
});
