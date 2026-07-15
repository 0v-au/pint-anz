const IMPORT_META_URL = require("node:url").pathToFileURL(__filename).toString();
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../../node_modules/.pnpm/fast-xml-parser@4.5.7/node_modules/fast-xml-parser/src/util.js
var require_util = __commonJS({
  "../../node_modules/.pnpm/fast-xml-parser@4.5.7/node_modules/fast-xml-parser/src/util.js"(exports2) {
    "use strict";
    var nameStartChar = ":A-Za-z_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD";
    var nameChar = nameStartChar + "\\-.\\d\\u00B7\\u0300-\\u036F\\u203F-\\u2040";
    var nameRegexp = "[" + nameStartChar + "][" + nameChar + "]*";
    var regexName = new RegExp("^" + nameRegexp + "$");
    var getAllMatches = function(string, regex) {
      const matches = [];
      let match = regex.exec(string);
      while (match) {
        const allmatches = [];
        allmatches.startIndex = regex.lastIndex - match[0].length;
        const len = match.length;
        for (let index = 0; index < len; index++) {
          allmatches.push(match[index]);
        }
        matches.push(allmatches);
        match = regex.exec(string);
      }
      return matches;
    };
    var isName = function(string) {
      const match = regexName.exec(string);
      return !(match === null || typeof match === "undefined");
    };
    exports2.isExist = function(v) {
      return typeof v !== "undefined";
    };
    exports2.isEmptyObject = function(obj) {
      return Object.keys(obj).length === 0;
    };
    exports2.merge = function(target, a, arrayMode) {
      if (a) {
        const keys = Object.keys(a);
        const len = keys.length;
        for (let i = 0; i < len; i++) {
          if (arrayMode === "strict") {
            target[keys[i]] = [a[keys[i]]];
          } else {
            target[keys[i]] = a[keys[i]];
          }
        }
      }
    };
    exports2.getValue = function(v) {
      if (exports2.isExist(v)) {
        return v;
      } else {
        return "";
      }
    };
    var DANGEROUS_PROPERTY_NAMES = [
      // '__proto__',
      // 'constructor',
      // 'prototype',
      "hasOwnProperty",
      "toString",
      "valueOf",
      "__defineGetter__",
      "__defineSetter__",
      "__lookupGetter__",
      "__lookupSetter__"
    ];
    var criticalProperties = ["__proto__", "constructor", "prototype"];
    exports2.isName = isName;
    exports2.getAllMatches = getAllMatches;
    exports2.nameRegexp = nameRegexp;
    exports2.DANGEROUS_PROPERTY_NAMES = DANGEROUS_PROPERTY_NAMES;
    exports2.criticalProperties = criticalProperties;
  }
});

// ../../node_modules/.pnpm/fast-xml-parser@4.5.7/node_modules/fast-xml-parser/src/validator.js
var require_validator = __commonJS({
  "../../node_modules/.pnpm/fast-xml-parser@4.5.7/node_modules/fast-xml-parser/src/validator.js"(exports2) {
    "use strict";
    var util = require_util();
    var defaultOptions = {
      allowBooleanAttributes: false,
      //A tag can have attributes without any value
      unpairedTags: []
    };
    exports2.validate = function(xmlData, options) {
      options = Object.assign({}, defaultOptions, options);
      const tags = [];
      let tagFound = false;
      let reachedRoot = false;
      if (xmlData[0] === "\uFEFF") {
        xmlData = xmlData.substr(1);
      }
      for (let i = 0; i < xmlData.length; i++) {
        if (xmlData[i] === "<" && xmlData[i + 1] === "?") {
          i += 2;
          i = readPI(xmlData, i);
          if (i.err) return i;
        } else if (xmlData[i] === "<") {
          let tagStartPos = i;
          i++;
          if (xmlData[i] === "!") {
            i = readCommentAndCDATA(xmlData, i);
            continue;
          } else {
            let closingTag = false;
            if (xmlData[i] === "/") {
              closingTag = true;
              i++;
            }
            let tagName = "";
            for (; i < xmlData.length && xmlData[i] !== ">" && xmlData[i] !== " " && xmlData[i] !== "	" && xmlData[i] !== "\n" && xmlData[i] !== "\r"; i++) {
              tagName += xmlData[i];
            }
            tagName = tagName.trim();
            if (tagName[tagName.length - 1] === "/") {
              tagName = tagName.substring(0, tagName.length - 1);
              i--;
            }
            if (!validateTagName(tagName)) {
              let msg;
              if (tagName.trim().length === 0) {
                msg = "Invalid space after '<'.";
              } else {
                msg = "Tag '" + tagName + "' is an invalid name.";
              }
              return getErrorObject("InvalidTag", msg, getLineNumberForPosition(xmlData, i));
            }
            const result2 = readAttributeStr(xmlData, i);
            if (result2 === false) {
              return getErrorObject("InvalidAttr", "Attributes for '" + tagName + "' have open quote.", getLineNumberForPosition(xmlData, i));
            }
            let attrStr = result2.value;
            i = result2.index;
            if (attrStr[attrStr.length - 1] === "/") {
              const attrStrStart = i - attrStr.length;
              attrStr = attrStr.substring(0, attrStr.length - 1);
              const isValid = validateAttributeString(attrStr, options);
              if (isValid === true) {
                tagFound = true;
              } else {
                return getErrorObject(isValid.err.code, isValid.err.msg, getLineNumberForPosition(xmlData, attrStrStart + isValid.err.line));
              }
            } else if (closingTag) {
              if (!result2.tagClosed) {
                return getErrorObject("InvalidTag", "Closing tag '" + tagName + "' doesn't have proper closing.", getLineNumberForPosition(xmlData, i));
              } else if (attrStr.trim().length > 0) {
                return getErrorObject("InvalidTag", "Closing tag '" + tagName + "' can't have attributes or invalid starting.", getLineNumberForPosition(xmlData, tagStartPos));
              } else if (tags.length === 0) {
                return getErrorObject("InvalidTag", "Closing tag '" + tagName + "' has not been opened.", getLineNumberForPosition(xmlData, tagStartPos));
              } else {
                const otg = tags.pop();
                if (tagName !== otg.tagName) {
                  let openPos = getLineNumberForPosition(xmlData, otg.tagStartPos);
                  return getErrorObject(
                    "InvalidTag",
                    "Expected closing tag '" + otg.tagName + "' (opened in line " + openPos.line + ", col " + openPos.col + ") instead of closing tag '" + tagName + "'.",
                    getLineNumberForPosition(xmlData, tagStartPos)
                  );
                }
                if (tags.length == 0) {
                  reachedRoot = true;
                }
              }
            } else {
              const isValid = validateAttributeString(attrStr, options);
              if (isValid !== true) {
                return getErrorObject(isValid.err.code, isValid.err.msg, getLineNumberForPosition(xmlData, i - attrStr.length + isValid.err.line));
              }
              if (reachedRoot === true) {
                return getErrorObject("InvalidXml", "Multiple possible root nodes found.", getLineNumberForPosition(xmlData, i));
              } else if (options.unpairedTags.indexOf(tagName) !== -1) {
              } else {
                tags.push({ tagName, tagStartPos });
              }
              tagFound = true;
            }
            for (i++; i < xmlData.length; i++) {
              if (xmlData[i] === "<") {
                if (xmlData[i + 1] === "!") {
                  i++;
                  i = readCommentAndCDATA(xmlData, i);
                  continue;
                } else if (xmlData[i + 1] === "?") {
                  i = readPI(xmlData, ++i);
                  if (i.err) return i;
                } else {
                  break;
                }
              } else if (xmlData[i] === "&") {
                const afterAmp = validateAmpersand(xmlData, i);
                if (afterAmp == -1)
                  return getErrorObject("InvalidChar", "char '&' is not expected.", getLineNumberForPosition(xmlData, i));
                i = afterAmp;
              } else {
                if (reachedRoot === true && !isWhiteSpace(xmlData[i])) {
                  return getErrorObject("InvalidXml", "Extra text at the end", getLineNumberForPosition(xmlData, i));
                }
              }
            }
            if (xmlData[i] === "<") {
              i--;
            }
          }
        } else {
          if (isWhiteSpace(xmlData[i])) {
            continue;
          }
          return getErrorObject("InvalidChar", "char '" + xmlData[i] + "' is not expected.", getLineNumberForPosition(xmlData, i));
        }
      }
      if (!tagFound) {
        return getErrorObject("InvalidXml", "Start tag expected.", 1);
      } else if (tags.length == 1) {
        return getErrorObject("InvalidTag", "Unclosed tag '" + tags[0].tagName + "'.", getLineNumberForPosition(xmlData, tags[0].tagStartPos));
      } else if (tags.length > 0) {
        return getErrorObject("InvalidXml", "Invalid '" + JSON.stringify(tags.map((t) => t.tagName), null, 4).replace(/\r?\n/g, "") + "' found.", { line: 1, col: 1 });
      }
      return true;
    };
    function isWhiteSpace(char) {
      return char === " " || char === "	" || char === "\n" || char === "\r";
    }
    function readPI(xmlData, i) {
      const start = i;
      for (; i < xmlData.length; i++) {
        if (xmlData[i] == "?" || xmlData[i] == " ") {
          const tagname = xmlData.substr(start, i - start);
          if (i > 5 && tagname === "xml") {
            return getErrorObject("InvalidXml", "XML declaration allowed only at the start of the document.", getLineNumberForPosition(xmlData, i));
          } else if (xmlData[i] == "?" && xmlData[i + 1] == ">") {
            i++;
            break;
          } else {
            continue;
          }
        }
      }
      return i;
    }
    function readCommentAndCDATA(xmlData, i) {
      if (xmlData.length > i + 5 && xmlData[i + 1] === "-" && xmlData[i + 2] === "-") {
        for (i += 3; i < xmlData.length; i++) {
          if (xmlData[i] === "-" && xmlData[i + 1] === "-" && xmlData[i + 2] === ">") {
            i += 2;
            break;
          }
        }
      } else if (xmlData.length > i + 8 && xmlData[i + 1] === "D" && xmlData[i + 2] === "O" && xmlData[i + 3] === "C" && xmlData[i + 4] === "T" && xmlData[i + 5] === "Y" && xmlData[i + 6] === "P" && xmlData[i + 7] === "E") {
        let angleBracketsCount = 1;
        for (i += 8; i < xmlData.length; i++) {
          if (xmlData[i] === "<") {
            angleBracketsCount++;
          } else if (xmlData[i] === ">") {
            angleBracketsCount--;
            if (angleBracketsCount === 0) {
              break;
            }
          }
        }
      } else if (xmlData.length > i + 9 && xmlData[i + 1] === "[" && xmlData[i + 2] === "C" && xmlData[i + 3] === "D" && xmlData[i + 4] === "A" && xmlData[i + 5] === "T" && xmlData[i + 6] === "A" && xmlData[i + 7] === "[") {
        for (i += 8; i < xmlData.length; i++) {
          if (xmlData[i] === "]" && xmlData[i + 1] === "]" && xmlData[i + 2] === ">") {
            i += 2;
            break;
          }
        }
      }
      return i;
    }
    var doubleQuote = '"';
    var singleQuote = "'";
    function readAttributeStr(xmlData, i) {
      let attrStr = "";
      let startChar = "";
      let tagClosed = false;
      for (; i < xmlData.length; i++) {
        if (xmlData[i] === doubleQuote || xmlData[i] === singleQuote) {
          if (startChar === "") {
            startChar = xmlData[i];
          } else if (startChar !== xmlData[i]) {
          } else {
            startChar = "";
          }
        } else if (xmlData[i] === ">") {
          if (startChar === "") {
            tagClosed = true;
            break;
          }
        }
        attrStr += xmlData[i];
      }
      if (startChar !== "") {
        return false;
      }
      return {
        value: attrStr,
        index: i,
        tagClosed
      };
    }
    var validAttrStrRegxp = new RegExp(`(\\s*)([^\\s=]+)(\\s*=)?(\\s*(['"])(([\\s\\S])*?)\\5)?`, "g");
    function validateAttributeString(attrStr, options) {
      const matches = util.getAllMatches(attrStr, validAttrStrRegxp);
      const attrNames = {};
      for (let i = 0; i < matches.length; i++) {
        if (matches[i][1].length === 0) {
          return getErrorObject("InvalidAttr", "Attribute '" + matches[i][2] + "' has no space in starting.", getPositionFromMatch(matches[i]));
        } else if (matches[i][3] !== void 0 && matches[i][4] === void 0) {
          return getErrorObject("InvalidAttr", "Attribute '" + matches[i][2] + "' is without value.", getPositionFromMatch(matches[i]));
        } else if (matches[i][3] === void 0 && !options.allowBooleanAttributes) {
          return getErrorObject("InvalidAttr", "boolean attribute '" + matches[i][2] + "' is not allowed.", getPositionFromMatch(matches[i]));
        }
        const attrName = matches[i][2];
        if (!validateAttrName(attrName)) {
          return getErrorObject("InvalidAttr", "Attribute '" + attrName + "' is an invalid name.", getPositionFromMatch(matches[i]));
        }
        if (!attrNames.hasOwnProperty(attrName)) {
          attrNames[attrName] = 1;
        } else {
          return getErrorObject("InvalidAttr", "Attribute '" + attrName + "' is repeated.", getPositionFromMatch(matches[i]));
        }
      }
      return true;
    }
    function validateNumberAmpersand(xmlData, i) {
      let re = /\d/;
      if (xmlData[i] === "x") {
        i++;
        re = /[\da-fA-F]/;
      }
      for (; i < xmlData.length; i++) {
        if (xmlData[i] === ";")
          return i;
        if (!xmlData[i].match(re))
          break;
      }
      return -1;
    }
    function validateAmpersand(xmlData, i) {
      i++;
      if (xmlData[i] === ";")
        return -1;
      if (xmlData[i] === "#") {
        i++;
        return validateNumberAmpersand(xmlData, i);
      }
      let count = 0;
      for (; i < xmlData.length; i++, count++) {
        if (xmlData[i].match(/\w/) && count < 20)
          continue;
        if (xmlData[i] === ";")
          break;
        return -1;
      }
      return i;
    }
    function getErrorObject(code, message, lineNumber) {
      return {
        err: {
          code,
          msg: message,
          line: lineNumber.line || lineNumber,
          col: lineNumber.col
        }
      };
    }
    function validateAttrName(attrName) {
      return util.isName(attrName);
    }
    function validateTagName(tagname) {
      return util.isName(tagname);
    }
    function getLineNumberForPosition(xmlData, index) {
      const lines = xmlData.substring(0, index).split(/\r?\n/);
      return {
        line: lines.length,
        // column number is last line's length + 1, because column numbering starts at 1:
        col: lines[lines.length - 1].length + 1
      };
    }
    function getPositionFromMatch(match) {
      return match.startIndex + match[1].length;
    }
  }
});

// ../../node_modules/.pnpm/fast-xml-parser@4.5.7/node_modules/fast-xml-parser/src/xmlparser/OptionsBuilder.js
var require_OptionsBuilder = __commonJS({
  "../../node_modules/.pnpm/fast-xml-parser@4.5.7/node_modules/fast-xml-parser/src/xmlparser/OptionsBuilder.js"(exports2) {
    var { DANGEROUS_PROPERTY_NAMES, criticalProperties } = require_util();
    var defaultOnDangerousProperty = (name) => {
      if (DANGEROUS_PROPERTY_NAMES.includes(name)) {
        return "__" + name;
      }
      return name;
    };
    var defaultOptions = {
      preserveOrder: false,
      attributeNamePrefix: "@_",
      attributesGroupName: false,
      textNodeName: "#text",
      ignoreAttributes: true,
      removeNSPrefix: false,
      // remove NS from tag name or attribute name if true
      allowBooleanAttributes: false,
      //a tag can have attributes without any value
      //ignoreRootElement : false,
      parseTagValue: true,
      parseAttributeValue: false,
      trimValues: true,
      //Trim string values of tag and attributes
      cdataPropName: false,
      numberParseOptions: {
        hex: true,
        leadingZeros: true,
        eNotation: true
      },
      tagValueProcessor: function(tagName, val) {
        return val;
      },
      attributeValueProcessor: function(attrName, val) {
        return val;
      },
      stopNodes: [],
      //nested tags will not be parsed even for errors
      alwaysCreateTextNode: false,
      isArray: () => false,
      commentPropName: false,
      unpairedTags: [],
      processEntities: true,
      htmlEntities: false,
      ignoreDeclaration: false,
      ignorePiTags: false,
      transformTagName: false,
      transformAttributeName: false,
      updateTag: function(tagName, jPath, attrs) {
        return tagName;
      },
      // skipEmptyListItem: false
      captureMetaData: false,
      maxNestedTags: 100,
      strictReservedNames: true,
      onDangerousProperty: defaultOnDangerousProperty
    };
    function validatePropertyName(propertyName, optionName) {
      if (typeof propertyName !== "string") {
        return;
      }
      const normalized = propertyName.toLowerCase();
      if (DANGEROUS_PROPERTY_NAMES.some((dangerous) => normalized === dangerous.toLowerCase())) {
        throw new Error(
          `[SECURITY] Invalid ${optionName}: "${propertyName}" is a reserved JavaScript keyword that could cause prototype pollution`
        );
      }
      if (criticalProperties.some((dangerous) => normalized === dangerous.toLowerCase())) {
        throw new Error(
          `[SECURITY] Invalid ${optionName}: "${propertyName}" is a reserved JavaScript keyword that could cause prototype pollution`
        );
      }
    }
    function normalizeProcessEntities(value) {
      if (typeof value === "boolean") {
        return {
          enabled: value,
          // true or false
          maxEntitySize: 1e4,
          maxExpansionDepth: 10,
          maxTotalExpansions: 1e3,
          maxExpandedLength: 1e5,
          allowedTags: null,
          tagFilter: null
        };
      }
      if (typeof value === "object" && value !== null) {
        return {
          enabled: value.enabled !== false,
          maxEntitySize: Math.max(1, value.maxEntitySize ?? 1e4),
          maxExpansionDepth: Math.max(1, value.maxExpansionDepth ?? 1e4),
          maxTotalExpansions: Math.max(1, value.maxTotalExpansions ?? Infinity),
          maxExpandedLength: Math.max(1, value.maxExpandedLength ?? 1e5),
          maxEntityCount: Math.max(1, value.maxEntityCount ?? 1e3),
          allowedTags: value.allowedTags ?? null,
          tagFilter: value.tagFilter ?? null
        };
      }
      return normalizeProcessEntities(true);
    }
    var buildOptions = function(options) {
      const built = Object.assign({}, defaultOptions, options);
      const propertyNameOptions = [
        { value: built.attributeNamePrefix, name: "attributeNamePrefix" },
        { value: built.attributesGroupName, name: "attributesGroupName" },
        { value: built.textNodeName, name: "textNodeName" },
        { value: built.cdataPropName, name: "cdataPropName" },
        { value: built.commentPropName, name: "commentPropName" }
      ];
      for (const { value, name } of propertyNameOptions) {
        if (value) {
          validatePropertyName(value, name);
        }
      }
      if (built.onDangerousProperty === null) {
        built.onDangerousProperty = defaultOnDangerousProperty;
      }
      built.processEntities = normalizeProcessEntities(built.processEntities);
      return built;
    };
    exports2.buildOptions = buildOptions;
    exports2.defaultOptions = defaultOptions;
  }
});

// ../../node_modules/.pnpm/fast-xml-parser@4.5.7/node_modules/fast-xml-parser/src/xmlparser/xmlNode.js
var require_xmlNode = __commonJS({
  "../../node_modules/.pnpm/fast-xml-parser@4.5.7/node_modules/fast-xml-parser/src/xmlparser/xmlNode.js"(exports2, module2) {
    "use strict";
    var XmlNode = class {
      constructor(tagname) {
        this.tagname = tagname;
        this.child = [];
        this[":@"] = {};
      }
      add(key, val) {
        if (key === "__proto__") key = "#__proto__";
        this.child.push({ [key]: val });
      }
      addChild(node) {
        if (node.tagname === "__proto__") node.tagname = "#__proto__";
        if (node[":@"] && Object.keys(node[":@"]).length > 0) {
          this.child.push({ [node.tagname]: node.child, [":@"]: node[":@"] });
        } else {
          this.child.push({ [node.tagname]: node.child });
        }
      }
    };
    module2.exports = XmlNode;
  }
});

// ../../node_modules/.pnpm/fast-xml-parser@4.5.7/node_modules/fast-xml-parser/src/xmlparser/DocTypeReader.js
var require_DocTypeReader = __commonJS({
  "../../node_modules/.pnpm/fast-xml-parser@4.5.7/node_modules/fast-xml-parser/src/xmlparser/DocTypeReader.js"(exports2, module2) {
    var util = require_util();
    var DocTypeReader = class {
      constructor(options) {
        this.suppressValidationErr = !options;
        this.options = options || {};
      }
      readDocType(xmlData, i) {
        const entities = /* @__PURE__ */ Object.create(null);
        let entityCount = 0;
        if (xmlData[i + 3] === "O" && xmlData[i + 4] === "C" && xmlData[i + 5] === "T" && xmlData[i + 6] === "Y" && xmlData[i + 7] === "P" && xmlData[i + 8] === "E") {
          i = i + 9;
          let angleBracketsCount = 1;
          let hasBody = false, comment = false;
          let exp = "";
          for (; i < xmlData.length; i++) {
            if (xmlData[i] === "<" && !comment) {
              if (hasBody && hasSeq(xmlData, "!ENTITY", i)) {
                i += 7;
                let entityName, val;
                [entityName, val, i] = this.readEntityExp(xmlData, i + 1, this.suppressValidationErr);
                if (val.indexOf("&") === -1) {
                  if (this.options.enabled !== false && this.options.maxEntityCount != null && entityCount >= this.options.maxEntityCount) {
                    throw new Error(
                      `Entity count (${entityCount + 1}) exceeds maximum allowed (${this.options.maxEntityCount})`
                    );
                  }
                  const escaped = entityName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                  entities[entityName] = {
                    regx: RegExp(`&${escaped};`, "g"),
                    val
                  };
                  entityCount++;
                }
              } else if (hasBody && hasSeq(xmlData, "!ELEMENT", i)) {
                i += 8;
                const { index } = this.readElementExp(xmlData, i + 1);
                i = index;
              } else if (hasBody && hasSeq(xmlData, "!ATTLIST", i)) {
                i += 8;
              } else if (hasBody && hasSeq(xmlData, "!NOTATION", i)) {
                i += 9;
                const { index } = this.readNotationExp(xmlData, i + 1, this.suppressValidationErr);
                i = index;
              } else if (hasSeq(xmlData, "!--", i)) {
                comment = true;
              } else {
                throw new Error(`Invalid DOCTYPE`);
              }
              angleBracketsCount++;
              exp = "";
            } else if (xmlData[i] === ">") {
              if (comment) {
                if (xmlData[i - 1] === "-" && xmlData[i - 2] === "-") {
                  comment = false;
                  angleBracketsCount--;
                }
              } else {
                angleBracketsCount--;
              }
              if (angleBracketsCount === 0) {
                break;
              }
            } else if (xmlData[i] === "[") {
              hasBody = true;
            } else {
              exp += xmlData[i];
            }
          }
          if (angleBracketsCount !== 0) {
            throw new Error(`Unclosed DOCTYPE`);
          }
        } else {
          throw new Error(`Invalid Tag instead of DOCTYPE`);
        }
        return { entities, i };
      }
      readEntityExp(xmlData, i) {
        i = skipWhitespace(xmlData, i);
        let entityName = "";
        while (i < xmlData.length && !/\s/.test(xmlData[i]) && xmlData[i] !== '"' && xmlData[i] !== "'") {
          entityName += xmlData[i];
          i++;
        }
        validateEntityName(entityName);
        i = skipWhitespace(xmlData, i);
        if (!this.suppressValidationErr) {
          if (xmlData.substring(i, i + 6).toUpperCase() === "SYSTEM") {
            throw new Error("External entities are not supported");
          } else if (xmlData[i] === "%") {
            throw new Error("Parameter entities are not supported");
          }
        }
        let entityValue = "";
        [i, entityValue] = this.readIdentifierVal(xmlData, i, "entity");
        if (this.options.enabled !== false && this.options.maxEntitySize != null && entityValue.length > this.options.maxEntitySize) {
          throw new Error(
            `Entity "${entityName}" size (${entityValue.length}) exceeds maximum allowed size (${this.options.maxEntitySize})`
          );
        }
        i--;
        return [entityName, entityValue, i];
      }
      readNotationExp(xmlData, i) {
        i = skipWhitespace(xmlData, i);
        let notationName = "";
        while (i < xmlData.length && !/\s/.test(xmlData[i])) {
          notationName += xmlData[i];
          i++;
        }
        !this.suppressValidationErr && validateEntityName(notationName);
        i = skipWhitespace(xmlData, i);
        const identifierType = xmlData.substring(i, i + 6).toUpperCase();
        if (!this.suppressValidationErr && identifierType !== "SYSTEM" && identifierType !== "PUBLIC") {
          throw new Error(`Expected SYSTEM or PUBLIC, found "${identifierType}"`);
        }
        i += identifierType.length;
        i = skipWhitespace(xmlData, i);
        let publicIdentifier = null;
        let systemIdentifier = null;
        if (identifierType === "PUBLIC") {
          [i, publicIdentifier] = this.readIdentifierVal(xmlData, i, "publicIdentifier");
          i = skipWhitespace(xmlData, i);
          if (xmlData[i] === '"' || xmlData[i] === "'") {
            [i, systemIdentifier] = this.readIdentifierVal(xmlData, i, "systemIdentifier");
          }
        } else if (identifierType === "SYSTEM") {
          [i, systemIdentifier] = this.readIdentifierVal(xmlData, i, "systemIdentifier");
          if (!this.suppressValidationErr && !systemIdentifier) {
            throw new Error("Missing mandatory system identifier for SYSTEM notation");
          }
        }
        return { notationName, publicIdentifier, systemIdentifier, index: --i };
      }
      readIdentifierVal(xmlData, i, type) {
        let identifierVal = "";
        const startChar = xmlData[i];
        if (startChar !== '"' && startChar !== "'") {
          throw new Error(`Expected quoted string, found "${startChar}"`);
        }
        i++;
        while (i < xmlData.length && xmlData[i] !== startChar) {
          identifierVal += xmlData[i];
          i++;
        }
        if (xmlData[i] !== startChar) {
          throw new Error(`Unterminated ${type} value`);
        }
        i++;
        return [i, identifierVal];
      }
      readElementExp(xmlData, i) {
        i = skipWhitespace(xmlData, i);
        let elementName = "";
        while (i < xmlData.length && !/\s/.test(xmlData[i])) {
          elementName += xmlData[i];
          i++;
        }
        if (!this.suppressValidationErr && !util.isName(elementName)) {
          throw new Error(`Invalid element name: "${elementName}"`);
        }
        i = skipWhitespace(xmlData, i);
        let contentModel = "";
        if (xmlData[i] === "E" && hasSeq(xmlData, "MPTY", i)) {
          i += 4;
        } else if (xmlData[i] === "A" && hasSeq(xmlData, "NY", i)) {
          i += 2;
        } else if (xmlData[i] === "(") {
          i++;
          while (i < xmlData.length && xmlData[i] !== ")") {
            contentModel += xmlData[i];
            i++;
          }
          if (xmlData[i] !== ")") {
            throw new Error("Unterminated content model");
          }
        } else if (!this.suppressValidationErr) {
          throw new Error(`Invalid Element Expression, found "${xmlData[i]}"`);
        }
        return {
          elementName,
          contentModel: contentModel.trim(),
          index: i
        };
      }
      readAttlistExp(xmlData, i) {
        i = skipWhitespace(xmlData, i);
        let elementName = "";
        while (i < xmlData.length && !/\s/.test(xmlData[i])) {
          elementName += xmlData[i];
          i++;
        }
        validateEntityName(elementName);
        i = skipWhitespace(xmlData, i);
        let attributeName = "";
        while (i < xmlData.length && !/\s/.test(xmlData[i])) {
          attributeName += xmlData[i];
          i++;
        }
        if (!validateEntityName(attributeName)) {
          throw new Error(`Invalid attribute name: "${attributeName}"`);
        }
        i = skipWhitespace(xmlData, i);
        let attributeType = "";
        if (xmlData.substring(i, i + 8).toUpperCase() === "NOTATION") {
          attributeType = "NOTATION";
          i += 8;
          i = skipWhitespace(xmlData, i);
          if (xmlData[i] !== "(") {
            throw new Error(`Expected '(', found "${xmlData[i]}"`);
          }
          i++;
          let allowedNotations = [];
          while (i < xmlData.length && xmlData[i] !== ")") {
            let notation = "";
            while (i < xmlData.length && xmlData[i] !== "|" && xmlData[i] !== ")") {
              notation += xmlData[i];
              i++;
            }
            notation = notation.trim();
            if (!validateEntityName(notation)) {
              throw new Error(`Invalid notation name: "${notation}"`);
            }
            allowedNotations.push(notation);
            if (xmlData[i] === "|") {
              i++;
              i = skipWhitespace(xmlData, i);
            }
          }
          if (xmlData[i] !== ")") {
            throw new Error("Unterminated list of notations");
          }
          i++;
          attributeType += " (" + allowedNotations.join("|") + ")";
        } else {
          while (i < xmlData.length && !/\s/.test(xmlData[i])) {
            attributeType += xmlData[i];
            i++;
          }
          const validTypes = ["CDATA", "ID", "IDREF", "IDREFS", "ENTITY", "ENTITIES", "NMTOKEN", "NMTOKENS"];
          if (!this.suppressValidationErr && !validTypes.includes(attributeType.toUpperCase())) {
            throw new Error(`Invalid attribute type: "${attributeType}"`);
          }
        }
        i = skipWhitespace(xmlData, i);
        let defaultValue = "";
        if (xmlData.substring(i, i + 8).toUpperCase() === "#REQUIRED") {
          defaultValue = "#REQUIRED";
          i += 8;
        } else if (xmlData.substring(i, i + 7).toUpperCase() === "#IMPLIED") {
          defaultValue = "#IMPLIED";
          i += 7;
        } else {
          [i, defaultValue] = this.readIdentifierVal(xmlData, i, "ATTLIST");
        }
        return {
          elementName,
          attributeName,
          attributeType,
          defaultValue,
          index: i
        };
      }
    };
    var skipWhitespace = (data, index) => {
      while (index < data.length && /\s/.test(data[index])) {
        index++;
      }
      return index;
    };
    function hasSeq(data, seq, i) {
      for (let j = 0; j < seq.length; j++) {
        if (seq[j] !== data[i + j + 1]) return false;
      }
      return true;
    }
    function validateEntityName(name) {
      if (util.isName(name))
        return name;
      else
        throw new Error(`Invalid entity name ${name}`);
    }
    module2.exports = DocTypeReader;
  }
});

// ../../node_modules/.pnpm/strnum@1.1.2/node_modules/strnum/strnum.js
var require_strnum = __commonJS({
  "../../node_modules/.pnpm/strnum@1.1.2/node_modules/strnum/strnum.js"(exports2, module2) {
    var hexRegex = /^[-+]?0x[a-fA-F0-9]+$/;
    var numRegex = /^([\-\+])?(0*)([0-9]*(\.[0-9]*)?)$/;
    var consider = {
      hex: true,
      // oct: false,
      leadingZeros: true,
      decimalPoint: ".",
      eNotation: true
      //skipLike: /regex/
    };
    function toNumber(str, options = {}) {
      options = Object.assign({}, consider, options);
      if (!str || typeof str !== "string") return str;
      let trimmedStr = str.trim();
      if (options.skipLike !== void 0 && options.skipLike.test(trimmedStr)) return str;
      else if (str === "0") return 0;
      else if (options.hex && hexRegex.test(trimmedStr)) {
        return parse_int(trimmedStr, 16);
      } else if (trimmedStr.search(/[eE]/) !== -1) {
        const notation = trimmedStr.match(/^([-\+])?(0*)([0-9]*(\.[0-9]*)?[eE][-\+]?[0-9]+)$/);
        if (notation) {
          if (options.leadingZeros) {
            trimmedStr = (notation[1] || "") + notation[3];
          } else {
            if (notation[2] === "0" && notation[3][0] === ".") {
            } else {
              return str;
            }
          }
          return options.eNotation ? Number(trimmedStr) : str;
        } else {
          return str;
        }
      } else {
        const match = numRegex.exec(trimmedStr);
        if (match) {
          const sign = match[1];
          const leadingZeros = match[2];
          let numTrimmedByZeros = trimZeros(match[3]);
          if (!options.leadingZeros && leadingZeros.length > 0 && sign && trimmedStr[2] !== ".") return str;
          else if (!options.leadingZeros && leadingZeros.length > 0 && !sign && trimmedStr[1] !== ".") return str;
          else if (options.leadingZeros && leadingZeros === str) return 0;
          else {
            const num = Number(trimmedStr);
            const numStr = "" + num;
            if (numStr.search(/[eE]/) !== -1) {
              if (options.eNotation) return num;
              else return str;
            } else if (trimmedStr.indexOf(".") !== -1) {
              if (numStr === "0" && numTrimmedByZeros === "") return num;
              else if (numStr === numTrimmedByZeros) return num;
              else if (sign && numStr === "-" + numTrimmedByZeros) return num;
              else return str;
            }
            if (leadingZeros) {
              return numTrimmedByZeros === numStr || sign + numTrimmedByZeros === numStr ? num : str;
            } else {
              return trimmedStr === numStr || trimmedStr === sign + numStr ? num : str;
            }
          }
        } else {
          return str;
        }
      }
    }
    function trimZeros(numStr) {
      if (numStr && numStr.indexOf(".") !== -1) {
        numStr = numStr.replace(/0+$/, "");
        if (numStr === ".") numStr = "0";
        else if (numStr[0] === ".") numStr = "0" + numStr;
        else if (numStr[numStr.length - 1] === ".") numStr = numStr.substr(0, numStr.length - 1);
        return numStr;
      }
      return numStr;
    }
    function parse_int(numStr, base) {
      if (parseInt) return parseInt(numStr, base);
      else if (Number.parseInt) return Number.parseInt(numStr, base);
      else if (window && window.parseInt) return window.parseInt(numStr, base);
      else throw new Error("parseInt, Number.parseInt, window.parseInt are not supported");
    }
    module2.exports = toNumber;
  }
});

// ../../node_modules/.pnpm/fast-xml-parser@4.5.7/node_modules/fast-xml-parser/src/ignoreAttributes.js
var require_ignoreAttributes = __commonJS({
  "../../node_modules/.pnpm/fast-xml-parser@4.5.7/node_modules/fast-xml-parser/src/ignoreAttributes.js"(exports2, module2) {
    function getIgnoreAttributesFn(ignoreAttributes) {
      if (typeof ignoreAttributes === "function") {
        return ignoreAttributes;
      }
      if (Array.isArray(ignoreAttributes)) {
        return (attrName) => {
          for (const pattern of ignoreAttributes) {
            if (typeof pattern === "string" && attrName === pattern) {
              return true;
            }
            if (pattern instanceof RegExp && pattern.test(attrName)) {
              return true;
            }
          }
        };
      }
      return () => false;
    }
    module2.exports = getIgnoreAttributesFn;
  }
});

// ../../node_modules/.pnpm/fast-xml-parser@4.5.7/node_modules/fast-xml-parser/src/xmlparser/OrderedObjParser.js
var require_OrderedObjParser = __commonJS({
  "../../node_modules/.pnpm/fast-xml-parser@4.5.7/node_modules/fast-xml-parser/src/xmlparser/OrderedObjParser.js"(exports2, module2) {
    "use strict";
    var util = require_util();
    var xmlNode = require_xmlNode();
    var DocTypeReader = require_DocTypeReader();
    var toNumber = require_strnum();
    var getIgnoreAttributesFn = require_ignoreAttributes();
    var OrderedObjParser = class {
      constructor(options) {
        this.options = options;
        this.currentNode = null;
        this.tagsNodeStack = [];
        this.docTypeEntities = {};
        this.lastEntities = {
          "apos": { regex: /&(apos|#39|#x27);/g, val: "'" },
          "gt": { regex: /&(gt|#62|#x3E);/g, val: ">" },
          "lt": { regex: /&(lt|#60|#x3C);/g, val: "<" },
          "quot": { regex: /&(quot|#34|#x22);/g, val: '"' }
        };
        this.ampEntity = { regex: /&(amp|#38|#x26);/g, val: "&" };
        this.htmlEntities = {
          "space": { regex: /&(nbsp|#160);/g, val: " " },
          // "lt" : { regex: /&(lt|#60);/g, val: "<" },
          // "gt" : { regex: /&(gt|#62);/g, val: ">" },
          // "amp" : { regex: /&(amp|#38);/g, val: "&" },
          // "quot" : { regex: /&(quot|#34);/g, val: "\"" },
          // "apos" : { regex: /&(apos|#39);/g, val: "'" },
          "cent": { regex: /&(cent|#162);/g, val: "\xA2" },
          "pound": { regex: /&(pound|#163);/g, val: "\xA3" },
          "yen": { regex: /&(yen|#165);/g, val: "\xA5" },
          "euro": { regex: /&(euro|#8364);/g, val: "\u20AC" },
          "copyright": { regex: /&(copy|#169);/g, val: "\xA9" },
          "reg": { regex: /&(reg|#174);/g, val: "\xAE" },
          "inr": { regex: /&(inr|#8377);/g, val: "\u20B9" },
          "num_dec": { regex: /&#([0-9]{1,7});/g, val: (_, str) => fromCodePoint(str, 10, "&#") },
          "num_hex": { regex: /&#x([0-9a-fA-F]{1,6});/g, val: (_, str) => fromCodePoint(str, 16, "&#x") }
        };
        this.addExternalEntities = addExternalEntities;
        this.parseXml = parseXml;
        this.parseTextData = parseTextData;
        this.resolveNameSpace = resolveNameSpace;
        this.buildAttributesMap = buildAttributesMap;
        this.isItStopNode = isItStopNode;
        this.replaceEntitiesValue = replaceEntitiesValue;
        this.readStopNodeData = readStopNodeData;
        this.saveTextToParentTag = saveTextToParentTag;
        this.addChild = addChild;
        this.ignoreAttributesFn = getIgnoreAttributesFn(this.options.ignoreAttributes);
        this.entityExpansionCount = 0;
        this.currentExpandedLength = 0;
        if (this.options.stopNodes && this.options.stopNodes.length > 0) {
          this.stopNodesExact = /* @__PURE__ */ new Set();
          this.stopNodesWildcard = /* @__PURE__ */ new Set();
          for (let i = 0; i < this.options.stopNodes.length; i++) {
            const stopNodeExp = this.options.stopNodes[i];
            if (typeof stopNodeExp !== "string") continue;
            if (stopNodeExp.startsWith("*.")) {
              this.stopNodesWildcard.add(stopNodeExp.substring(2));
            } else {
              this.stopNodesExact.add(stopNodeExp);
            }
          }
        }
      }
    };
    function addExternalEntities(externalEntities) {
      const entKeys = Object.keys(externalEntities);
      for (let i = 0; i < entKeys.length; i++) {
        const ent = entKeys[i];
        const escaped = ent.replace(/[.\-+*:]/g, "\\.");
        this.lastEntities[ent] = {
          regex: new RegExp("&" + escaped + ";", "g"),
          val: externalEntities[ent]
        };
      }
    }
    function parseTextData(val, tagName, jPath, dontTrim, hasAttributes, isLeafNode, escapeEntities) {
      if (val !== void 0) {
        if (this.options.trimValues && !dontTrim) {
          val = val.trim();
        }
        if (val.length > 0) {
          if (!escapeEntities) val = this.replaceEntitiesValue(val, tagName, jPath);
          const newval = this.options.tagValueProcessor(tagName, val, jPath, hasAttributes, isLeafNode);
          if (newval === null || newval === void 0) {
            return val;
          } else if (typeof newval !== typeof val || newval !== val) {
            return newval;
          } else if (this.options.trimValues) {
            return parseValue(val, this.options.parseTagValue, this.options.numberParseOptions);
          } else {
            const trimmedVal = val.trim();
            if (trimmedVal === val) {
              return parseValue(val, this.options.parseTagValue, this.options.numberParseOptions);
            } else {
              return val;
            }
          }
        }
      }
    }
    function resolveNameSpace(tagname) {
      if (this.options.removeNSPrefix) {
        const tags = tagname.split(":");
        const prefix = tagname.charAt(0) === "/" ? "/" : "";
        if (tags[0] === "xmlns") {
          return "";
        }
        if (tags.length === 2) {
          tagname = prefix + tags[1];
        }
      }
      return tagname;
    }
    var attrsRegx = new RegExp(`([^\\s=]+)\\s*(=\\s*(['"])([\\s\\S]*?)\\3)?`, "gm");
    function buildAttributesMap(attrStr, jPath, tagName) {
      if (this.options.ignoreAttributes !== true && typeof attrStr === "string") {
        const matches = util.getAllMatches(attrStr, attrsRegx);
        const len = matches.length;
        const attrs = {};
        for (let i = 0; i < len; i++) {
          const attrName = this.resolveNameSpace(matches[i][1]);
          if (this.ignoreAttributesFn(attrName, jPath)) {
            continue;
          }
          let oldVal = matches[i][4];
          let aName = this.options.attributeNamePrefix + attrName;
          if (attrName.length) {
            if (this.options.transformAttributeName) {
              aName = this.options.transformAttributeName(aName);
            }
            aName = sanitizeName(aName, this.options);
            if (oldVal !== void 0) {
              if (this.options.trimValues) {
                oldVal = oldVal.trim();
              }
              oldVal = this.replaceEntitiesValue(oldVal, tagName, jPath);
              const newVal = this.options.attributeValueProcessor(attrName, oldVal, jPath);
              if (newVal === null || newVal === void 0) {
                attrs[aName] = oldVal;
              } else if (typeof newVal !== typeof oldVal || newVal !== oldVal) {
                attrs[aName] = newVal;
              } else {
                attrs[aName] = parseValue(
                  oldVal,
                  this.options.parseAttributeValue,
                  this.options.numberParseOptions
                );
              }
            } else if (this.options.allowBooleanAttributes) {
              attrs[aName] = true;
            }
          }
        }
        if (!Object.keys(attrs).length) {
          return;
        }
        if (this.options.attributesGroupName) {
          const attrCollection = {};
          attrCollection[this.options.attributesGroupName] = attrs;
          return attrCollection;
        }
        return attrs;
      }
    }
    var parseXml = function(xmlData) {
      xmlData = xmlData.replace(/\r\n?/g, "\n");
      const xmlObj = new xmlNode("!xml");
      let currentNode = xmlObj;
      let textData = "";
      let jPath = "";
      this.entityExpansionCount = 0;
      this.currentExpandedLength = 0;
      const docTypeReader = new DocTypeReader(this.options.processEntities);
      for (let i = 0; i < xmlData.length; i++) {
        const ch = xmlData[i];
        if (ch === "<") {
          if (xmlData[i + 1] === "/") {
            const closeIndex = findClosingIndex(xmlData, ">", i, "Closing Tag is not closed.");
            let tagName = xmlData.substring(i + 2, closeIndex).trim();
            if (this.options.removeNSPrefix) {
              const colonIndex = tagName.indexOf(":");
              if (colonIndex !== -1) {
                tagName = tagName.substr(colonIndex + 1);
              }
            }
            if (this.options.transformTagName) {
              tagName = this.options.transformTagName(tagName);
            }
            if (currentNode) {
              textData = this.saveTextToParentTag(textData, currentNode, jPath);
            }
            const lastTagName = jPath.substring(jPath.lastIndexOf(".") + 1);
            if (tagName && this.options.unpairedTags.indexOf(tagName) !== -1) {
              throw new Error(`Unpaired tag can not be used as closing tag: </${tagName}>`);
            }
            let propIndex = 0;
            if (lastTagName && this.options.unpairedTags.indexOf(lastTagName) !== -1) {
              propIndex = jPath.lastIndexOf(".", jPath.lastIndexOf(".") - 1);
              this.tagsNodeStack.pop();
            } else {
              propIndex = jPath.lastIndexOf(".");
            }
            jPath = jPath.substring(0, propIndex);
            currentNode = this.tagsNodeStack.pop();
            textData = "";
            i = closeIndex;
          } else if (xmlData[i + 1] === "?") {
            let tagData = readTagExp(xmlData, i, false, "?>");
            if (!tagData) throw new Error("Pi Tag is not closed.");
            textData = this.saveTextToParentTag(textData, currentNode, jPath);
            if (this.options.ignoreDeclaration && tagData.tagName === "?xml" || this.options.ignorePiTags) {
            } else {
              const childNode = new xmlNode(tagData.tagName);
              childNode.add(this.options.textNodeName, "");
              if (tagData.tagName !== tagData.tagExp && tagData.attrExpPresent) {
                childNode[":@"] = this.buildAttributesMap(tagData.tagExp, jPath, tagData.tagName);
              }
              this.addChild(currentNode, childNode, jPath, i);
            }
            i = tagData.closeIndex + 1;
          } else if (xmlData.substr(i + 1, 3) === "!--") {
            const endIndex = findClosingIndex(xmlData, "-->", i + 4, "Comment is not closed.");
            if (this.options.commentPropName) {
              const comment = xmlData.substring(i + 4, endIndex - 2);
              textData = this.saveTextToParentTag(textData, currentNode, jPath);
              currentNode.add(this.options.commentPropName, [{ [this.options.textNodeName]: comment }]);
            }
            i = endIndex;
          } else if (xmlData.substr(i + 1, 2) === "!D") {
            const result2 = docTypeReader.readDocType(xmlData, i);
            this.docTypeEntities = result2.entities;
            i = result2.i;
          } else if (xmlData.substr(i + 1, 2) === "![") {
            const closeIndex = findClosingIndex(xmlData, "]]>", i, "CDATA is not closed.") - 2;
            const tagExp = xmlData.substring(i + 9, closeIndex);
            textData = this.saveTextToParentTag(textData, currentNode, jPath);
            let val = this.parseTextData(tagExp, currentNode.tagname, jPath, true, false, true, true);
            if (val == void 0) val = "";
            if (this.options.cdataPropName) {
              currentNode.add(this.options.cdataPropName, [{ [this.options.textNodeName]: tagExp }]);
            } else {
              currentNode.add(this.options.textNodeName, val);
            }
            i = closeIndex + 2;
          } else {
            let result2 = readTagExp(xmlData, i, this.options.removeNSPrefix);
            let tagName = result2.tagName;
            const rawTagName = result2.rawTagName;
            let tagExp = result2.tagExp;
            let attrExpPresent = result2.attrExpPresent;
            let closeIndex = result2.closeIndex;
            if (this.options.transformTagName) {
              const newTagName = this.options.transformTagName(tagName);
              if (tagExp === tagName) {
                tagExp = newTagName;
              }
              tagName = newTagName;
            }
            if (this.options.strictReservedNames && (tagName === this.options.commentPropName || tagName === this.options.cdataPropName || tagName === this.options.textNodeName || tagName === this.options.attributesGroupName)) {
              throw new Error(`Invalid tag name: ${tagName}`);
            }
            if (currentNode && textData) {
              if (currentNode.tagname !== "!xml") {
                textData = this.saveTextToParentTag(textData, currentNode, jPath, false);
              }
            }
            const lastTag = currentNode;
            if (lastTag && this.options.unpairedTags.indexOf(lastTag.tagname) !== -1) {
              currentNode = this.tagsNodeStack.pop();
              jPath = jPath.substring(0, jPath.lastIndexOf("."));
            }
            if (tagName !== xmlObj.tagname) {
              jPath += jPath ? "." + tagName : tagName;
            }
            const startIndex = i;
            if (this.isItStopNode(this.stopNodesExact, this.stopNodesWildcard, jPath, tagName)) {
              let tagContent = "";
              if (tagExp.length > 0 && tagExp.lastIndexOf("/") === tagExp.length - 1) {
                if (tagName[tagName.length - 1] === "/") {
                  tagName = tagName.substr(0, tagName.length - 1);
                  jPath = jPath.substr(0, jPath.length - 1);
                  tagExp = tagName;
                } else {
                  tagExp = tagExp.substr(0, tagExp.length - 1);
                }
                i = result2.closeIndex;
              } else if (this.options.unpairedTags.indexOf(tagName) !== -1) {
                i = result2.closeIndex;
              } else {
                const result3 = this.readStopNodeData(xmlData, rawTagName, closeIndex + 1);
                if (!result3) throw new Error(`Unexpected end of ${rawTagName}`);
                i = result3.i;
                tagContent = result3.tagContent;
              }
              const childNode = new xmlNode(tagName);
              if (tagName !== tagExp && attrExpPresent) {
                childNode[":@"] = this.buildAttributesMap(tagExp, jPath, tagName);
              }
              if (tagContent) {
                tagContent = this.parseTextData(tagContent, tagName, jPath, true, attrExpPresent, true, true);
              }
              jPath = jPath.substr(0, jPath.lastIndexOf("."));
              childNode.add(this.options.textNodeName, tagContent);
              this.addChild(currentNode, childNode, jPath, startIndex);
            } else {
              if (tagExp.length > 0 && tagExp.lastIndexOf("/") === tagExp.length - 1) {
                if (tagName[tagName.length - 1] === "/") {
                  tagName = tagName.substr(0, tagName.length - 1);
                  jPath = jPath.substr(0, jPath.length - 1);
                  tagExp = tagName;
                } else {
                  tagExp = tagExp.substr(0, tagExp.length - 1);
                }
                if (this.options.transformTagName) {
                  const newTagName = this.options.transformTagName(tagName);
                  if (tagExp === tagName) {
                    tagExp = newTagName;
                  }
                  tagName = newTagName;
                }
                const childNode = new xmlNode(tagName);
                if (tagName !== tagExp && attrExpPresent) {
                  childNode[":@"] = this.buildAttributesMap(tagExp, jPath, tagName);
                }
                this.addChild(currentNode, childNode, jPath, startIndex);
                jPath = jPath.substr(0, jPath.lastIndexOf("."));
              } else if (this.options.unpairedTags.indexOf(tagName) !== -1) {
                const childNode = new xmlNode(tagName);
                if (tagName !== tagExp && attrExpPresent) {
                  childNode[":@"] = this.buildAttributesMap(tagExp, jPath);
                }
                this.addChild(currentNode, childNode, jPath, startIndex);
                jPath = jPath.substr(0, jPath.lastIndexOf("."));
                i = result2.closeIndex;
                continue;
              } else {
                const childNode = new xmlNode(tagName);
                if (this.tagsNodeStack.length > this.options.maxNestedTags) {
                  throw new Error("Maximum nested tags exceeded");
                }
                this.tagsNodeStack.push(currentNode);
                if (tagName !== tagExp && attrExpPresent) {
                  childNode[":@"] = this.buildAttributesMap(tagExp, jPath, tagName);
                }
                this.addChild(currentNode, childNode, jPath);
                currentNode = childNode;
              }
              textData = "";
              i = closeIndex;
            }
          }
        } else {
          textData += xmlData[i];
        }
      }
      return xmlObj.child;
    };
    function addChild(currentNode, childNode, jPath, startIndex) {
      if (!this.options.captureMetaData) startIndex = void 0;
      const result2 = this.options.updateTag(childNode.tagname, jPath, childNode[":@"]);
      if (result2 === false) {
      } else if (typeof result2 === "string") {
        childNode.tagname = result2;
        currentNode.addChild(childNode, startIndex);
      } else {
        currentNode.addChild(childNode, startIndex);
      }
    }
    var replaceEntitiesValue = function(val, tagName, jPath) {
      if (val.indexOf("&") === -1) {
        return val;
      }
      const entityConfig = this.options.processEntities;
      if (!entityConfig.enabled) {
        return val;
      }
      if (entityConfig.allowedTags) {
        if (!entityConfig.allowedTags.includes(tagName)) {
          return val;
        }
      }
      if (entityConfig.tagFilter) {
        if (!entityConfig.tagFilter(tagName, jPath)) {
          return val;
        }
      }
      for (let entityName in this.docTypeEntities) {
        const entity = this.docTypeEntities[entityName];
        const matches = val.match(entity.regx);
        if (matches) {
          this.entityExpansionCount += matches.length;
          if (entityConfig.maxTotalExpansions && this.entityExpansionCount > entityConfig.maxTotalExpansions) {
            throw new Error(
              `Entity expansion limit exceeded: ${this.entityExpansionCount} > ${entityConfig.maxTotalExpansions}`
            );
          }
          const lengthBefore = val.length;
          val = val.replace(entity.regx, entity.val);
          if (entityConfig.maxExpandedLength) {
            this.currentExpandedLength += val.length - lengthBefore;
            if (this.currentExpandedLength > entityConfig.maxExpandedLength) {
              throw new Error(
                `Total expanded content size exceeded: ${this.currentExpandedLength} > ${entityConfig.maxExpandedLength}`
              );
            }
          }
        }
      }
      if (val.indexOf("&") === -1) return val;
      for (const entityName of Object.keys(this.lastEntities)) {
        const entity = this.lastEntities[entityName];
        const matches = val.match(entity.regex);
        if (matches) {
          this.entityExpansionCount += matches.length;
          if (entityConfig.maxTotalExpansions && this.entityExpansionCount > entityConfig.maxTotalExpansions) {
            throw new Error(
              `Entity expansion limit exceeded: ${this.entityExpansionCount} > ${entityConfig.maxTotalExpansions}`
            );
          }
        }
        val = val.replace(entity.regex, entity.val);
      }
      if (val.indexOf("&") === -1) return val;
      if (this.options.htmlEntities) {
        for (const entityName of Object.keys(this.htmlEntities)) {
          const entity = this.htmlEntities[entityName];
          const matches = val.match(entity.regex);
          if (matches) {
            this.entityExpansionCount += matches.length;
            if (entityConfig.maxTotalExpansions && this.entityExpansionCount > entityConfig.maxTotalExpansions) {
              throw new Error(
                `Entity expansion limit exceeded: ${this.entityExpansionCount} > ${entityConfig.maxTotalExpansions}`
              );
            }
          }
          val = val.replace(entity.regex, entity.val);
        }
      }
      val = val.replace(this.ampEntity.regex, this.ampEntity.val);
      return val;
    };
    function saveTextToParentTag(textData, parentNode, jPath, isLeafNode) {
      if (textData) {
        if (isLeafNode === void 0) isLeafNode = parentNode.child.length === 0;
        textData = this.parseTextData(
          textData,
          parentNode.tagname,
          jPath,
          false,
          parentNode[":@"] ? Object.keys(parentNode[":@"]).length !== 0 : false,
          isLeafNode
        );
        if (textData !== void 0 && textData !== "")
          parentNode.add(this.options.textNodeName, textData);
        textData = "";
      }
      return textData;
    }
    function isItStopNode(stopNodesExact, stopNodesWildcard, jPath, currentTagName) {
      if (stopNodesWildcard && stopNodesWildcard.has(currentTagName)) return true;
      if (stopNodesExact && stopNodesExact.has(jPath)) return true;
      return false;
    }
    function tagExpWithClosingIndex(xmlData, i, closingChar = ">") {
      let attrBoundary;
      let tagExp = "";
      for (let index = i; index < xmlData.length; index++) {
        let ch = xmlData[index];
        if (attrBoundary) {
          if (ch === attrBoundary) attrBoundary = "";
        } else if (ch === '"' || ch === "'") {
          attrBoundary = ch;
        } else if (ch === closingChar[0]) {
          if (closingChar[1]) {
            if (xmlData[index + 1] === closingChar[1]) {
              return {
                data: tagExp,
                index
              };
            }
          } else {
            return {
              data: tagExp,
              index
            };
          }
        } else if (ch === "	") {
          ch = " ";
        }
        tagExp += ch;
      }
    }
    function findClosingIndex(xmlData, str, i, errMsg) {
      const closingIndex = xmlData.indexOf(str, i);
      if (closingIndex === -1) {
        throw new Error(errMsg);
      } else {
        return closingIndex + str.length - 1;
      }
    }
    function readTagExp(xmlData, i, removeNSPrefix, closingChar = ">") {
      const result2 = tagExpWithClosingIndex(xmlData, i + 1, closingChar);
      if (!result2) return;
      let tagExp = result2.data;
      const closeIndex = result2.index;
      const separatorIndex = tagExp.search(/\s/);
      let tagName = tagExp;
      let attrExpPresent = true;
      if (separatorIndex !== -1) {
        tagName = tagExp.substring(0, separatorIndex);
        tagExp = tagExp.substring(separatorIndex + 1).trimStart();
      }
      const rawTagName = tagName;
      if (removeNSPrefix) {
        const colonIndex = tagName.indexOf(":");
        if (colonIndex !== -1) {
          tagName = tagName.substr(colonIndex + 1);
          attrExpPresent = tagName !== result2.data.substr(colonIndex + 1);
        }
      }
      return {
        tagName,
        tagExp,
        closeIndex,
        attrExpPresent,
        rawTagName
      };
    }
    function readStopNodeData(xmlData, tagName, i) {
      const startIndex = i;
      let openTagCount = 1;
      for (; i < xmlData.length; i++) {
        if (xmlData[i] === "<") {
          if (xmlData[i + 1] === "/") {
            const closeIndex = findClosingIndex(xmlData, ">", i, `${tagName} is not closed`);
            let closeTagName = xmlData.substring(i + 2, closeIndex).trim();
            if (closeTagName === tagName) {
              openTagCount--;
              if (openTagCount === 0) {
                return {
                  tagContent: xmlData.substring(startIndex, i),
                  i: closeIndex
                };
              }
            }
            i = closeIndex;
          } else if (xmlData[i + 1] === "?") {
            const closeIndex = findClosingIndex(xmlData, "?>", i + 1, "StopNode is not closed.");
            i = closeIndex;
          } else if (xmlData.substr(i + 1, 3) === "!--") {
            const closeIndex = findClosingIndex(xmlData, "-->", i + 3, "StopNode is not closed.");
            i = closeIndex;
          } else if (xmlData.substr(i + 1, 2) === "![") {
            const closeIndex = findClosingIndex(xmlData, "]]>", i, "StopNode is not closed.") - 2;
            i = closeIndex;
          } else {
            const tagData = readTagExp(xmlData, i, ">");
            if (tagData) {
              const openTagName = tagData && tagData.tagName;
              if (openTagName === tagName && tagData.tagExp[tagData.tagExp.length - 1] !== "/") {
                openTagCount++;
              }
              i = tagData.closeIndex;
            }
          }
        }
      }
    }
    function parseValue(val, shouldParse, options) {
      if (shouldParse && typeof val === "string") {
        const newval = val.trim();
        if (newval === "true") return true;
        else if (newval === "false") return false;
        else return toNumber(val, options);
      } else {
        if (util.isExist(val)) {
          return val;
        } else {
          return "";
        }
      }
    }
    function fromCodePoint(str, base, prefix) {
      const codePoint = Number.parseInt(str, base);
      if (codePoint >= 0 && codePoint <= 1114111) {
        return String.fromCodePoint(codePoint);
      } else {
        return prefix + str + ";";
      }
    }
    function sanitizeName(name, options) {
      if (util.criticalProperties.includes(name)) {
        throw new Error(`[SECURITY] Invalid name: "${name}" is a reserved JavaScript keyword that could cause prototype pollution`);
      } else if (util.DANGEROUS_PROPERTY_NAMES.includes(name)) {
        return options.onDangerousProperty(name);
      }
      return name;
    }
    module2.exports = OrderedObjParser;
  }
});

// ../../node_modules/.pnpm/fast-xml-parser@4.5.7/node_modules/fast-xml-parser/src/xmlparser/node2json.js
var require_node2json = __commonJS({
  "../../node_modules/.pnpm/fast-xml-parser@4.5.7/node_modules/fast-xml-parser/src/xmlparser/node2json.js"(exports2) {
    "use strict";
    function prettify(node, options) {
      return compress(node, options);
    }
    function compress(arr, options, jPath) {
      let text;
      const compressedObj = {};
      for (let i = 0; i < arr.length; i++) {
        const tagObj = arr[i];
        const property = propName(tagObj);
        let newJpath = "";
        if (jPath === void 0) newJpath = property;
        else newJpath = jPath + "." + property;
        if (property === options.textNodeName) {
          if (text === void 0) text = tagObj[property];
          else text += "" + tagObj[property];
        } else if (property === void 0) {
          continue;
        } else if (tagObj[property]) {
          let val = compress(tagObj[property], options, newJpath);
          const isLeaf = isLeafTag(val, options);
          if (tagObj[":@"]) {
            assignAttributes(val, tagObj[":@"], newJpath, options);
          } else if (Object.keys(val).length === 1 && val[options.textNodeName] !== void 0 && !options.alwaysCreateTextNode) {
            val = val[options.textNodeName];
          } else if (Object.keys(val).length === 0) {
            if (options.alwaysCreateTextNode) val[options.textNodeName] = "";
            else val = "";
          }
          if (compressedObj[property] !== void 0 && compressedObj.hasOwnProperty(property)) {
            if (!Array.isArray(compressedObj[property])) {
              compressedObj[property] = [compressedObj[property]];
            }
            compressedObj[property].push(val);
          } else {
            if (options.isArray(property, newJpath, isLeaf)) {
              compressedObj[property] = [val];
            } else {
              compressedObj[property] = val;
            }
          }
        }
      }
      if (typeof text === "string") {
        if (text.length > 0) compressedObj[options.textNodeName] = text;
      } else if (text !== void 0) compressedObj[options.textNodeName] = text;
      return compressedObj;
    }
    function propName(obj) {
      const keys = Object.keys(obj);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (key !== ":@") return key;
      }
    }
    function assignAttributes(obj, attrMap, jpath, options) {
      if (attrMap) {
        const keys = Object.keys(attrMap);
        const len = keys.length;
        for (let i = 0; i < len; i++) {
          const atrrName = keys[i];
          if (options.isArray(atrrName, jpath + "." + atrrName, true, true)) {
            obj[atrrName] = [attrMap[atrrName]];
          } else {
            obj[atrrName] = attrMap[atrrName];
          }
        }
      }
    }
    function isLeafTag(obj, options) {
      const { textNodeName } = options;
      const propCount = Object.keys(obj).length;
      if (propCount === 0) {
        return true;
      }
      if (propCount === 1 && (obj[textNodeName] || typeof obj[textNodeName] === "boolean" || obj[textNodeName] === 0)) {
        return true;
      }
      return false;
    }
    exports2.prettify = prettify;
  }
});

// ../../node_modules/.pnpm/fast-xml-parser@4.5.7/node_modules/fast-xml-parser/src/xmlparser/XMLParser.js
var require_XMLParser = __commonJS({
  "../../node_modules/.pnpm/fast-xml-parser@4.5.7/node_modules/fast-xml-parser/src/xmlparser/XMLParser.js"(exports2, module2) {
    var { buildOptions } = require_OptionsBuilder();
    var OrderedObjParser = require_OrderedObjParser();
    var { prettify } = require_node2json();
    var validator = require_validator();
    var XMLParser2 = class {
      constructor(options) {
        this.externalEntities = {};
        this.options = buildOptions(options);
      }
      /**
       * Parse XML dats to JS object 
       * @param {string|Buffer} xmlData 
       * @param {boolean|Object} validationOption 
       */
      parse(xmlData, validationOption) {
        if (typeof xmlData === "string") {
        } else if (xmlData.toString) {
          xmlData = xmlData.toString();
        } else {
          throw new Error("XML data is accepted in String or Bytes[] form.");
        }
        if (validationOption) {
          if (validationOption === true) validationOption = {};
          const result2 = validator.validate(xmlData, validationOption);
          if (result2 !== true) {
            throw Error(`${result2.err.msg}:${result2.err.line}:${result2.err.col}`);
          }
        }
        const orderedObjParser = new OrderedObjParser(this.options);
        orderedObjParser.addExternalEntities(this.externalEntities);
        const orderedResult = orderedObjParser.parseXml(xmlData);
        if (this.options.preserveOrder || orderedResult === void 0) return orderedResult;
        else return prettify(orderedResult, this.options);
      }
      /**
       * Add Entity which is not by default supported by this library
       * @param {string} key 
       * @param {string} value 
       */
      addEntity(key, value) {
        if (value.indexOf("&") !== -1) {
          throw new Error("Entity value can't have '&'");
        } else if (key.indexOf("&") !== -1 || key.indexOf(";") !== -1) {
          throw new Error("An entity must be set without '&' and ';'. Eg. use '#xD' for '&#xD;'");
        } else if (value === "&") {
          throw new Error("An entity with value '&' is not permitted");
        } else {
          this.externalEntities[key] = value;
        }
      }
    };
    module2.exports = XMLParser2;
  }
});

// ../../node_modules/.pnpm/fast-xml-parser@4.5.7/node_modules/fast-xml-parser/src/xmlbuilder/orderedJs2Xml.js
var require_orderedJs2Xml = __commonJS({
  "../../node_modules/.pnpm/fast-xml-parser@4.5.7/node_modules/fast-xml-parser/src/xmlbuilder/orderedJs2Xml.js"(exports2, module2) {
    var EOL = "\n";
    function toXml(jArray, options) {
      let indentation = "";
      if (options.format && options.indentBy.length > 0) {
        indentation = EOL;
      }
      return arrToStr(jArray, options, "", indentation);
    }
    function arrToStr(arr, options, jPath, indentation) {
      let xmlStr = "";
      let isPreviousElementTag = false;
      if (!Array.isArray(arr)) {
        if (arr !== void 0 && arr !== null) {
          let text = arr.toString();
          text = replaceEntitiesValue(text, options);
          return text;
        }
        return "";
      }
      for (let i = 0; i < arr.length; i++) {
        const tagObj = arr[i];
        const tagName = propName(tagObj);
        if (tagName === void 0) continue;
        let newJPath = "";
        if (jPath.length === 0) newJPath = tagName;
        else newJPath = `${jPath}.${tagName}`;
        if (tagName === options.textNodeName) {
          let tagText = tagObj[tagName];
          if (!isStopNode(newJPath, options)) {
            tagText = options.tagValueProcessor(tagName, tagText);
            tagText = replaceEntitiesValue(tagText, options);
          }
          if (isPreviousElementTag) {
            xmlStr += indentation;
          }
          xmlStr += tagText;
          isPreviousElementTag = false;
          continue;
        } else if (tagName === options.cdataPropName) {
          if (isPreviousElementTag) {
            xmlStr += indentation;
          }
          const cdataVal = String(tagObj[tagName][0][options.textNodeName]).replace(/\]\]>/g, "]]]]><![CDATA[>");
          xmlStr += `<![CDATA[${cdataVal}]]>`;
          isPreviousElementTag = false;
          continue;
        } else if (tagName === options.commentPropName) {
          const commentVal = String(tagObj[tagName][0][options.textNodeName]).replace(/--/g, "- -").replace(/-$/, "- ");
          xmlStr += indentation + `<!--${commentVal}-->`;
          isPreviousElementTag = true;
          continue;
        } else if (tagName[0] === "?") {
          const attStr2 = attr_to_str(tagObj[":@"], options);
          const tempInd = tagName === "?xml" ? "" : indentation;
          let piTextNodeName = tagObj[tagName][0][options.textNodeName];
          piTextNodeName = piTextNodeName.length !== 0 ? " " + piTextNodeName : "";
          xmlStr += tempInd + `<${tagName}${piTextNodeName}${attStr2}?>`;
          isPreviousElementTag = true;
          continue;
        }
        let newIdentation = indentation;
        if (newIdentation !== "") {
          newIdentation += options.indentBy;
        }
        const attStr = attr_to_str(tagObj[":@"], options);
        const tagStart = indentation + `<${tagName}${attStr}`;
        const tagValue = arrToStr(tagObj[tagName], options, newJPath, newIdentation);
        if (options.unpairedTags.indexOf(tagName) !== -1) {
          if (options.suppressUnpairedNode) xmlStr += tagStart + ">";
          else xmlStr += tagStart + "/>";
        } else if ((!tagValue || tagValue.length === 0) && options.suppressEmptyNode) {
          xmlStr += tagStart + "/>";
        } else if (tagValue && tagValue.endsWith(">")) {
          xmlStr += tagStart + `>${tagValue}${indentation}</${tagName}>`;
        } else {
          xmlStr += tagStart + ">";
          if (tagValue && indentation !== "" && (tagValue.includes("/>") || tagValue.includes("</"))) {
            xmlStr += indentation + options.indentBy + tagValue + indentation;
          } else {
            xmlStr += tagValue;
          }
          xmlStr += `</${tagName}>`;
        }
        isPreviousElementTag = true;
      }
      return xmlStr;
    }
    function propName(obj) {
      const keys = Object.keys(obj);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
        if (key !== ":@") return key;
      }
    }
    function attr_to_str(attrMap, options) {
      let attrStr = "";
      if (attrMap && !options.ignoreAttributes) {
        for (let attr in attrMap) {
          if (!Object.prototype.hasOwnProperty.call(attrMap, attr)) continue;
          let attrVal = options.attributeValueProcessor(attr, attrMap[attr]);
          attrVal = replaceEntitiesValue(attrVal, options);
          if (attrVal === true && options.suppressBooleanAttributes) {
            attrStr += ` ${attr.substr(options.attributeNamePrefix.length)}`;
          } else {
            attrStr += ` ${attr.substr(options.attributeNamePrefix.length)}="${attrVal}"`;
          }
        }
      }
      return attrStr;
    }
    function isStopNode(jPath, options) {
      jPath = jPath.substr(0, jPath.length - options.textNodeName.length - 1);
      let tagName = jPath.substr(jPath.lastIndexOf(".") + 1);
      for (let index in options.stopNodes) {
        if (options.stopNodes[index] === jPath || options.stopNodes[index] === "*." + tagName) return true;
      }
      return false;
    }
    function replaceEntitiesValue(textValue, options) {
      if (textValue && textValue.length > 0 && options.processEntities) {
        for (let i = 0; i < options.entities.length; i++) {
          const entity = options.entities[i];
          textValue = textValue.replace(entity.regex, entity.val);
        }
      }
      return textValue;
    }
    module2.exports = toXml;
  }
});

// ../../node_modules/.pnpm/fast-xml-parser@4.5.7/node_modules/fast-xml-parser/src/xmlbuilder/json2xml.js
var require_json2xml = __commonJS({
  "../../node_modules/.pnpm/fast-xml-parser@4.5.7/node_modules/fast-xml-parser/src/xmlbuilder/json2xml.js"(exports2, module2) {
    "use strict";
    var buildFromOrderedJs = require_orderedJs2Xml();
    var getIgnoreAttributesFn = require_ignoreAttributes();
    var defaultOptions = {
      attributeNamePrefix: "@_",
      attributesGroupName: false,
      textNodeName: "#text",
      ignoreAttributes: true,
      cdataPropName: false,
      format: false,
      indentBy: "  ",
      suppressEmptyNode: false,
      suppressUnpairedNode: true,
      suppressBooleanAttributes: true,
      tagValueProcessor: function(key, a) {
        return a;
      },
      attributeValueProcessor: function(attrName, a) {
        return a;
      },
      preserveOrder: false,
      commentPropName: false,
      unpairedTags: [],
      entities: [
        { regex: new RegExp("&", "g"), val: "&amp;" },
        //it must be on top
        { regex: new RegExp(">", "g"), val: "&gt;" },
        { regex: new RegExp("<", "g"), val: "&lt;" },
        { regex: new RegExp("'", "g"), val: "&apos;" },
        { regex: new RegExp('"', "g"), val: "&quot;" }
      ],
      processEntities: true,
      stopNodes: [],
      // transformTagName: false,
      // transformAttributeName: false,
      oneListGroup: false
    };
    function Builder(options) {
      this.options = Object.assign({}, defaultOptions, options);
      if (this.options.ignoreAttributes === true || this.options.attributesGroupName) {
        this.isAttribute = function() {
          return false;
        };
      } else {
        this.ignoreAttributesFn = getIgnoreAttributesFn(this.options.ignoreAttributes);
        this.attrPrefixLen = this.options.attributeNamePrefix.length;
        this.isAttribute = isAttribute;
      }
      this.processTextOrObjNode = processTextOrObjNode;
      if (this.options.format) {
        this.indentate = indentate;
        this.tagEndChar = ">\n";
        this.newLine = "\n";
      } else {
        this.indentate = function() {
          return "";
        };
        this.tagEndChar = ">";
        this.newLine = "";
      }
    }
    Builder.prototype.build = function(jObj) {
      if (this.options.preserveOrder) {
        return buildFromOrderedJs(jObj, this.options);
      } else {
        if (Array.isArray(jObj) && this.options.arrayNodeName && this.options.arrayNodeName.length > 1) {
          jObj = {
            [this.options.arrayNodeName]: jObj
          };
        }
        return this.j2x(jObj, 0, []).val;
      }
    };
    Builder.prototype.j2x = function(jObj, level, ajPath) {
      let attrStr = "";
      let val = "";
      const jPath = ajPath.join(".");
      for (let key in jObj) {
        if (!Object.prototype.hasOwnProperty.call(jObj, key)) continue;
        if (typeof jObj[key] === "undefined") {
          if (this.isAttribute(key)) {
            val += "";
          }
        } else if (jObj[key] === null) {
          if (this.isAttribute(key)) {
            val += "";
          } else if (key === this.options.cdataPropName) {
            val += "";
          } else if (key[0] === "?") {
            val += this.indentate(level) + "<" + key + "?" + this.tagEndChar;
          } else {
            val += this.indentate(level) + "<" + key + "/" + this.tagEndChar;
          }
        } else if (jObj[key] instanceof Date) {
          val += this.buildTextValNode(jObj[key], key, "", level);
        } else if (typeof jObj[key] !== "object") {
          const attr = this.isAttribute(key);
          if (attr && !this.ignoreAttributesFn(attr, jPath)) {
            attrStr += this.buildAttrPairStr(attr, "" + jObj[key]);
          } else if (!attr) {
            if (key === this.options.textNodeName) {
              let newval = this.options.tagValueProcessor(key, "" + jObj[key]);
              val += this.replaceEntitiesValue(newval);
            } else {
              val += this.buildTextValNode(jObj[key], key, "", level);
            }
          }
        } else if (Array.isArray(jObj[key])) {
          const arrLen = jObj[key].length;
          let listTagVal = "";
          let listTagAttr = "";
          for (let j = 0; j < arrLen; j++) {
            const item = jObj[key][j];
            if (typeof item === "undefined") {
            } else if (item === null) {
              if (key[0] === "?") val += this.indentate(level) + "<" + key + "?" + this.tagEndChar;
              else val += this.indentate(level) + "<" + key + "/" + this.tagEndChar;
            } else if (typeof item === "object") {
              if (this.options.oneListGroup) {
                const result2 = this.j2x(item, level + 1, ajPath.concat(key));
                listTagVal += result2.val;
                if (this.options.attributesGroupName && item.hasOwnProperty(this.options.attributesGroupName)) {
                  listTagAttr += result2.attrStr;
                }
              } else {
                listTagVal += this.processTextOrObjNode(item, key, level, ajPath);
              }
            } else {
              if (this.options.oneListGroup) {
                let textValue = this.options.tagValueProcessor(key, item);
                textValue = this.replaceEntitiesValue(textValue);
                listTagVal += textValue;
              } else {
                listTagVal += this.buildTextValNode(item, key, "", level);
              }
            }
          }
          if (this.options.oneListGroup) {
            listTagVal = this.buildObjectNode(listTagVal, key, listTagAttr, level);
          }
          val += listTagVal;
        } else {
          if (this.options.attributesGroupName && key === this.options.attributesGroupName) {
            const Ks = Object.keys(jObj[key]);
            const L = Ks.length;
            for (let j = 0; j < L; j++) {
              attrStr += this.buildAttrPairStr(Ks[j], "" + jObj[key][Ks[j]]);
            }
          } else {
            val += this.processTextOrObjNode(jObj[key], key, level, ajPath);
          }
        }
      }
      return { attrStr, val };
    };
    Builder.prototype.buildAttrPairStr = function(attrName, val) {
      val = this.options.attributeValueProcessor(attrName, "" + val);
      val = this.replaceEntitiesValue(val);
      if (this.options.suppressBooleanAttributes && val === "true") {
        return " " + attrName;
      } else return " " + attrName + '="' + val + '"';
    };
    function processTextOrObjNode(object, key, level, ajPath) {
      const result2 = this.j2x(object, level + 1, ajPath.concat(key));
      if (object[this.options.textNodeName] !== void 0 && Object.keys(object).length === 1) {
        return this.buildTextValNode(object[this.options.textNodeName], key, result2.attrStr, level);
      } else {
        return this.buildObjectNode(result2.val, key, result2.attrStr, level);
      }
    }
    Builder.prototype.buildObjectNode = function(val, key, attrStr, level) {
      if (val === "") {
        if (key[0] === "?") return this.indentate(level) + "<" + key + attrStr + "?" + this.tagEndChar;
        else {
          return this.indentate(level) + "<" + key + attrStr + this.closeTag(key) + this.tagEndChar;
        }
      } else {
        let tagEndExp = "</" + key + this.tagEndChar;
        let piClosingChar = "";
        if (key[0] === "?") {
          piClosingChar = "?";
          tagEndExp = "";
        }
        if ((attrStr || attrStr === "") && val.indexOf("<") === -1) {
          return this.indentate(level) + "<" + key + attrStr + piClosingChar + ">" + val + tagEndExp;
        } else if (this.options.commentPropName !== false && key === this.options.commentPropName && piClosingChar.length === 0) {
          const safeVal = String(val).replace(/--/g, "- -").replace(/-$/, "- ");
          return this.indentate(level) + `<!--${safeVal}-->` + this.newLine;
        } else {
          return this.indentate(level) + "<" + key + attrStr + piClosingChar + this.tagEndChar + val + this.indentate(level) + tagEndExp;
        }
      }
    };
    Builder.prototype.closeTag = function(key) {
      let closeTag = "";
      if (this.options.unpairedTags.indexOf(key) !== -1) {
        if (!this.options.suppressUnpairedNode) closeTag = "/";
      } else if (this.options.suppressEmptyNode) {
        closeTag = "/";
      } else {
        closeTag = `></${key}`;
      }
      return closeTag;
    };
    Builder.prototype.buildTextValNode = function(val, key, attrStr, level) {
      if (this.options.cdataPropName !== false && key === this.options.cdataPropName) {
        const safeVal = String(val).replace(/\]\]>/g, "]]]]><![CDATA[>");
        return this.indentate(level) + `<![CDATA[${safeVal}]]>` + this.newLine;
      } else if (this.options.commentPropName !== false && key === this.options.commentPropName) {
        const safeVal = String(val).replace(/--/g, "- -").replace(/-$/, "- ");
        return this.indentate(level) + `<!--${safeVal}-->` + this.newLine;
      } else if (key[0] === "?") {
        return this.indentate(level) + "<" + key + attrStr + "?" + this.tagEndChar;
      } else {
        let textValue = this.options.tagValueProcessor(key, val);
        textValue = this.replaceEntitiesValue(textValue);
        if (textValue === "") {
          return this.indentate(level) + "<" + key + attrStr + this.closeTag(key) + this.tagEndChar;
        } else {
          return this.indentate(level) + "<" + key + attrStr + ">" + textValue + "</" + key + this.tagEndChar;
        }
      }
    };
    Builder.prototype.replaceEntitiesValue = function(textValue) {
      if (textValue && textValue.length > 0 && this.options.processEntities) {
        for (let i = 0; i < this.options.entities.length; i++) {
          const entity = this.options.entities[i];
          textValue = textValue.replace(entity.regex, entity.val);
        }
      }
      return textValue;
    };
    function indentate(level) {
      return this.options.indentBy.repeat(level);
    }
    function isAttribute(name) {
      if (name.startsWith(this.options.attributeNamePrefix) && name !== this.options.textNodeName) {
        return name.substr(this.attrPrefixLen);
      } else {
        return false;
      }
    }
    module2.exports = Builder;
  }
});

// ../../node_modules/.pnpm/fast-xml-parser@4.5.7/node_modules/fast-xml-parser/src/fxp.js
var require_fxp = __commonJS({
  "../../node_modules/.pnpm/fast-xml-parser@4.5.7/node_modules/fast-xml-parser/src/fxp.js"(exports2, module2) {
    "use strict";
    var validator = require_validator();
    var XMLParser2 = require_XMLParser();
    var XMLBuilder = require_json2xml();
    module2.exports = {
      XMLParser: XMLParser2,
      XMLValidator: validator,
      XMLBuilder
    };
  }
});

// src/action.ts
var import_promises4 = require("node:fs/promises");
var import_node_path4 = require("node:path");

// ../lint/dist/globs.js
var import_promises = require("node:fs/promises");
var import_node_path = require("node:path");
var MAGIC = /[*?[\]]/;
function slash(path) {
  return path.split(import_node_path.sep).join("/");
}
function globRegex(pattern) {
  let expression = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === "*" && pattern[index + 1] === "*") {
      index += 1;
      if (pattern[index + 1] === "/") {
        index += 1;
        expression += "(?:.*/)?";
      } else
        expression += ".*";
    } else if (character === "*")
      expression += "[^/]*";
    else if (character === "?")
      expression += "[^/]";
    else if (character === "[") {
      const end = pattern.indexOf("]", index + 1);
      if (end < 0)
        expression += "\\[";
      else {
        const body = pattern.slice(index + 1, end).replace(/^!/, "^");
        expression += `[${body}]`;
        index = end;
      }
    } else
      expression += character.replace(/[\\^$+?.()|{}]/g, "\\$&");
  }
  return new RegExp(`${expression}$`);
}
async function walk(directory) {
  const found = [];
  for (const entry of await (0, import_promises.readdir)(directory, { withFileTypes: true })) {
    const path = (0, import_node_path.join)(directory, entry.name);
    if (entry.isDirectory())
      found.push(...await walk(path));
    else if (entry.isFile())
      found.push(path);
  }
  return found;
}
async function expandPatterns(patterns, cwd = process.cwd()) {
  const expanded = /* @__PURE__ */ new Set();
  for (const pattern of patterns) {
    if (!MAGIC.test(pattern)) {
      expanded.add(pattern);
      continue;
    }
    const normalized = slash(pattern);
    const magicIndex = normalized.search(MAGIC);
    const slashIndex = normalized.lastIndexOf("/", magicIndex);
    const baseText = slashIndex < 0 ? "." : normalized.slice(0, slashIndex) || "/";
    const base = (0, import_node_path.resolve)(cwd, baseText);
    const matcher = globRegex(normalized);
    let files;
    try {
      files = await walk(base);
    } catch {
      files = [];
    }
    for (const file of files) {
      const candidate = (0, import_node_path.isAbsolute)(pattern) ? slash(file) : slash((0, import_node_path.relative)(cwd, file));
      if (matcher.test(candidate))
        expanded.add((0, import_node_path.isAbsolute)(pattern) ? file : candidate);
    }
  }
  return [...expanded].sort((left, right) => left.localeCompare(right, "en"));
}

// ../lint/dist/validate.js
var import_promises3 = require("node:fs/promises");
var import_node_module2 = require("node:module");
var import_node_path3 = require("node:path");
var import_fast_xml_parser = __toESM(require_fxp(), 1);
var import_xmllint_wasm = require("xmllint-wasm");

// ../lint/dist/types.js
var RULESET_VERSION = "1.1.2";
var RULESET_NAME = "PINT A-NZ Billing";
var RULESET_DIGEST = "5750a93fe98c4e1bad1d1030f749a473d4b2c3afc5bdeb5372889804b4273d1a";

// ../lint/dist/rulesets.js
var import_node_child_process = require("node:child_process");
var import_node_crypto = require("node:crypto");
var import_node_os = require("node:os");
var import_promises2 = require("node:fs/promises");
var import_node_module = require("node:module");
var import_node_path2 = require("node:path");
var import_node_util = require("node:util");
var import_node_zlib = require("node:zlib");
var require2 = (0, import_node_module.createRequire)(IMPORT_META_URL);
var execFileAsync = (0, import_node_util.promisify)(import_node_child_process.execFile);
var RULESET_PROVENANCE = {
  version: RULESET_VERSION,
  specification: "https://docs.peppol.eu/poac/aunz/pint-aunz/",
  resources: {
    url: "https://docs.peppol.eu/poac/aunz/pint-aunz/resources.zip",
    sha256: RULESET_DIGEST
  },
  ubl: {
    url: "https://docs.oasis-open.org/ubl/os-UBL-2.1/UBL-2.1.zip",
    sha256: "60b80d76394a8a2add90723ecb8e0e2e9d826775de9749df37a72d60703f86ed"
  },
  files: {
    "resources/trn-invoice/schematron/PINT-UBL-validation-preprocessed.xslt": "14da33f835748e8c23bf14ae15a4e80bf3134033fe7e35c5dec43c560831c9d1",
    "resources/trn-invoice/schematron/PINT-jurisdiction-aligned-rules.xslt": "109989ddd7ffcf5ee230496633aa3f0918de5fa0283fb2476c5e0afb282818e7"
  }
};
var MANIFEST = "ruleset.json";
var MAX_ARCHIVE_BYTES = 128 * 1024 * 1024;
var MAX_EXTRACTED_BYTES = 256 * 1024 * 1024;
var resolvedRulesetCache = /* @__PURE__ */ new Map();
function defaultCacheDirectory() {
  return process.env.PINT_ANZ_CACHE_DIR ? (0, import_node_path2.resolve)(process.env.PINT_ANZ_CACHE_DIR) : (0, import_node_path2.join)((0, import_node_os.homedir)(), ".cache", "pint-anz", "rulesets");
}
function sha256(bytes) {
  return (0, import_node_crypto.createHash)("sha256").update(bytes).digest("hex");
}
function versionDirectory(cacheDirectory = defaultCacheDirectory()) {
  return (0, import_node_path2.join)(cacheDirectory, RULESET_VERSION);
}
async function archiveBytes(localPath, url, expected, offline) {
  let bytes;
  if (localPath) {
    bytes = await (0, import_promises2.readFile)(localPath);
  } else {
    if (offline)
      throw new Error(`Offline installation requires a local archive for ${url}.`);
    const response = await fetch(url, { redirect: "follow" });
    if (!response.ok)
      throw new Error(`Cannot download ${url}: HTTP ${response.status}.`);
    const length = Number(response.headers.get("content-length") ?? 0);
    if (length > MAX_ARCHIVE_BYTES)
      throw new Error(`${url} exceeds the archive size limit.`);
    bytes = Buffer.from(await response.arrayBuffer());
  }
  if (bytes.length > MAX_ARCHIVE_BYTES)
    throw new Error(`Archive exceeds ${MAX_ARCHIVE_BYTES} bytes.`);
  const actual = sha256(bytes);
  if (actual !== expected) {
    throw new Error(`Archive checksum mismatch: expected ${expected}, received ${actual}.`);
  }
  return bytes;
}
function zipEntries(archive) {
  const minimum = Math.max(0, archive.length - 65557);
  let eocd = -1;
  for (let offset2 = archive.length - 22; offset2 >= minimum; offset2 -= 1) {
    if (archive.readUInt32LE(offset2) === 101010256) {
      eocd = offset2;
      break;
    }
  }
  if (eocd < 0)
    throw new Error("Archive has no ZIP end-of-directory record.");
  const count = archive.readUInt16LE(eocd + 10);
  let offset = archive.readUInt32LE(eocd + 16);
  const entries = [];
  for (let index = 0; index < count; index += 1) {
    if (archive.readUInt32LE(offset) !== 33639248)
      throw new Error("Invalid ZIP directory entry.");
    const flags = archive.readUInt16LE(offset + 8);
    const method = archive.readUInt16LE(offset + 10);
    const compressedSize = archive.readUInt32LE(offset + 20);
    const size = archive.readUInt32LE(offset + 24);
    const nameLength = archive.readUInt16LE(offset + 28);
    const extraLength = archive.readUInt16LE(offset + 30);
    const commentLength = archive.readUInt16LE(offset + 32);
    const mode = archive.readUInt32LE(offset + 38) >>> 16;
    const localOffset = archive.readUInt32LE(offset + 42);
    const nameBytes = archive.subarray(offset + 46, offset + 46 + nameLength);
    const name = nameBytes.toString((flags & 2048) !== 0 ? "utf8" : "latin1");
    if (!name || name.includes("\0") || name.includes("\\") || (0, import_node_path2.isAbsolute)(name)) {
      throw new Error(`Unsafe ZIP entry: ${JSON.stringify(name)}.`);
    }
    const parts = name.split("/");
    if (parts.some((part) => part === ".." || part === ".") || /^[A-Za-z]:/.test(name)) {
      throw new Error(`Unsafe ZIP entry: ${JSON.stringify(name)}.`);
    }
    if ((flags & 1) !== 0)
      throw new Error(`Encrypted ZIP entry is unsupported: ${name}.`);
    if (![0, 8].includes(method))
      throw new Error(`Unsupported ZIP compression method ${method}: ${name}.`);
    if ((mode & 61440) === 40960)
      throw new Error(`Symbolic links are forbidden in archives: ${name}.`);
    entries.push({ name, flags, method, compressedSize, size, localOffset, mode });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}
async function extractZip(archive, destination, include = () => true) {
  const destinationRoot = `${(0, import_node_path2.resolve)(destination)}${import_node_path2.sep}`;
  let extractedBytes = 0;
  for (const entry of zipEntries(archive)) {
    if (!include(entry.name))
      continue;
    extractedBytes += entry.size;
    if (extractedBytes > MAX_EXTRACTED_BYTES) {
      throw new Error("Archive exceeds the extracted size limit.");
    }
    const target = (0, import_node_path2.resolve)(destination, entry.name);
    if (!`${target}${entry.name.endsWith("/") ? import_node_path2.sep : ""}`.startsWith(destinationRoot)) {
      throw new Error(`ZIP entry escapes its destination: ${entry.name}.`);
    }
    if (entry.name.endsWith("/")) {
      await (0, import_promises2.mkdir)(target, { recursive: true });
      continue;
    }
    if (archive.readUInt32LE(entry.localOffset) !== 67324752) {
      throw new Error(`Invalid local ZIP header: ${entry.name}.`);
    }
    const nameLength = archive.readUInt16LE(entry.localOffset + 26);
    const extraLength = archive.readUInt16LE(entry.localOffset + 28);
    const start = entry.localOffset + 30 + nameLength + extraLength;
    const compressed = archive.subarray(start, start + entry.compressedSize);
    const bytes = entry.method === 0 ? compressed : (0, import_node_zlib.inflateRawSync)(compressed);
    if (bytes.length !== entry.size)
      throw new Error(`ZIP size mismatch: ${entry.name}.`);
    await (0, import_promises2.mkdir)((0, import_node_path2.dirname)(target), { recursive: true });
    await (0, import_promises2.writeFile)(target, bytes, { mode: 420, flag: "wx" });
  }
}
async function hashFile(path) {
  return sha256(await (0, import_promises2.readFile)(path));
}
async function installedFileHashes(directory) {
  const hashes = {};
  async function visit(path, relativePath) {
    for (const entry of await (0, import_promises2.readdir)(path, { withFileTypes: true })) {
      const child = (0, import_node_path2.join)(path, entry.name);
      const relativeChild = (0, import_node_path2.join)(relativePath, entry.name).split(import_node_path2.sep).join("/");
      if (entry.isDirectory())
        await visit(child, relativeChild);
      else if (entry.isFile())
        hashes[relativeChild] = await hashFile(child);
    }
  }
  await visit((0, import_node_path2.join)(directory, "ubl-2.1", "xsd"), "ubl-2.1/xsd");
  for (const relative3 of Object.keys(RULESET_PROVENANCE.files)) {
    hashes[relative3] = await hashFile((0, import_node_path2.join)(directory, relative3));
  }
  await visit((0, import_node_path2.join)(directory, "sef"), "sef");
  return Object.fromEntries(Object.entries(hashes).sort(([left], [right]) => left.localeCompare(right, "en")));
}
async function compileRules(directory) {
  const sources = {
    pint: (0, import_node_path2.join)(directory, "resources", "trn-invoice", "schematron", "PINT-UBL-validation-preprocessed.xslt"),
    aligned: (0, import_node_path2.join)(directory, "resources", "trn-invoice", "schematron", "PINT-jurisdiction-aligned-rules.xslt")
  };
  await (0, import_promises2.mkdir)((0, import_node_path2.join)(directory, "sef"), { recursive: true });
  for (const [name, source] of Object.entries(sources)) {
    await execFileAsync(process.execPath, [
      require2.resolve("xslt3"),
      `-xsl:${source}`,
      `-export:${(0, import_node_path2.join)(directory, "sef", `${name}.sef.json`)}`,
      "-nogo",
      "-relocate:on"
    ]);
  }
}
async function resolveRulesetDirectory(explicitDirectory, cacheDirectory) {
  const directory = explicitDirectory ? (0, import_node_path2.resolve)(explicitDirectory) : versionDirectory(cacheDirectory);
  let verified = resolvedRulesetCache.get(directory);
  if (!verified) {
    verified = verifyRuleset(directory, { allowLegacyDirectory: Boolean(explicitDirectory) }).then(() => directory).catch((error) => {
      resolvedRulesetCache.delete(directory);
      throw error;
    });
    resolvedRulesetCache.set(directory, verified);
  }
  return verified;
}
async function verifyRuleset(directory = versionDirectory(), options = {}) {
  const resolved = (0, import_node_path2.resolve)(directory);
  const required = [
    (0, import_node_path2.join)(resolved, "ubl-2.1", "xsd", "maindoc", "UBL-Invoice-2.1.xsd"),
    (0, import_node_path2.join)(resolved, "ubl-2.1", "xsd", "maindoc", "UBL-CreditNote-2.1.xsd"),
    (0, import_node_path2.join)(resolved, "sef", "pint.sef.json"),
    (0, import_node_path2.join)(resolved, "sef", "aligned.sef.json")
  ];
  await Promise.all(required.map((path) => (0, import_promises2.access)(path)));
  for (const [relative3, expected] of Object.entries(RULESET_PROVENANCE.files)) {
    const actual = await hashFile((0, import_node_path2.join)(resolved, relative3));
    if (actual !== expected)
      throw new Error(`${relative3} failed checksum verification.`);
  }
  try {
    const manifest = JSON.parse(await (0, import_promises2.readFile)((0, import_node_path2.join)(resolved, MANIFEST), "utf8"));
    if (manifest.version !== RULESET_VERSION)
      throw new Error(`Expected ${RULESET_VERSION}, found ${manifest.version}.`);
    if (manifest.resourcesSha256 !== RULESET_PROVENANCE.resources.sha256 || manifest.ublSha256 !== RULESET_PROVENANCE.ubl.sha256) {
      throw new Error("Ruleset manifest provenance does not match the pinned archives.");
    }
    if (!manifest.files || Object.keys(manifest.files).length === 0) {
      throw new Error("Ruleset manifest has no extracted-file inventory.");
    }
    for (const [relative3, expected] of Object.entries(manifest.files)) {
      const path = (0, import_node_path2.resolve)(resolved, relative3);
      if (!path.startsWith(`${resolved}${import_node_path2.sep}`))
        throw new Error(`Unsafe manifest path: ${relative3}.`);
      const actual = await hashFile(path);
      if (actual !== expected)
        throw new Error(`${relative3} failed installed-file verification.`);
    }
    return { ...manifest, directory: resolved };
  } catch (error) {
    if (!options.allowLegacyDirectory || error.code !== "ENOENT")
      throw error;
    return {
      name: RULESET_NAME,
      version: RULESET_VERSION,
      directory: resolved,
      resourcesSha256: RULESET_PROVENANCE.resources.sha256,
      ublSha256: RULESET_PROVENANCE.ubl.sha256,
      installedAt: "unknown",
      files: {}
    };
  }
}
async function installRuleset(options = {}) {
  const cache = (0, import_node_path2.resolve)(options.cacheDirectory ?? defaultCacheDirectory());
  const finalDirectory = versionDirectory(cache);
  try {
    return await verifyRuleset(finalDirectory);
  } catch {
  }
  await (0, import_promises2.mkdir)(cache, { recursive: true });
  const temporary = (0, import_node_path2.join)(cache, `.install-${RULESET_VERSION}-${(0, import_node_crypto.randomUUID)()}`);
  const backup = (0, import_node_path2.join)(cache, `.backup-${RULESET_VERSION}-${(0, import_node_crypto.randomUUID)()}`);
  try {
    const [resources, ubl] = await Promise.all([
      archiveBytes(options.resourcesArchive, RULESET_PROVENANCE.resources.url, RULESET_PROVENANCE.resources.sha256, options.offline ?? false),
      archiveBytes(options.ublArchive, RULESET_PROVENANCE.ubl.url, RULESET_PROVENANCE.ubl.sha256, options.offline ?? false)
    ]);
    await (0, import_promises2.mkdir)(temporary, { recursive: true });
    await extractZip(resources, (0, import_node_path2.join)(temporary, "resources"));
    await extractZip(ubl, (0, import_node_path2.join)(temporary, "ubl-2.1"), (name) => name.startsWith("xsd/"));
    for (const [relative3, expected] of Object.entries(RULESET_PROVENANCE.files)) {
      const actual = await hashFile((0, import_node_path2.join)(temporary, relative3));
      if (actual !== expected)
        throw new Error(`${relative3} failed checksum verification.`);
    }
    await compileRules(temporary);
    const installed = {
      name: RULESET_NAME,
      version: RULESET_VERSION,
      directory: finalDirectory,
      resourcesSha256: RULESET_PROVENANCE.resources.sha256,
      ublSha256: RULESET_PROVENANCE.ubl.sha256,
      installedAt: (/* @__PURE__ */ new Date()).toISOString(),
      files: await installedFileHashes(temporary)
    };
    await (0, import_promises2.writeFile)((0, import_node_path2.join)(temporary, MANIFEST), `${JSON.stringify(installed, null, 2)}
`, "utf8");
    try {
      await (0, import_promises2.rename)(finalDirectory, backup);
    } catch {
    }
    await (0, import_promises2.rename)(temporary, finalDirectory);
    await (0, import_promises2.rm)(backup, { recursive: true, force: true });
    return installed;
  } catch (error) {
    await (0, import_promises2.rm)(temporary, { recursive: true, force: true });
    try {
      await (0, import_promises2.rename)(backup, finalDirectory);
    } catch {
    }
    throw error;
  }
}

// ../lint/dist/validate.js
var require3 = (0, import_node_module2.createRequire)(IMPORT_META_URL);
var SaxonJS = require3("saxon-js");
var DEFAULT_MAX_DOCUMENT_BYTES = 100 * 1024;
var ROOTS = {
  Invoice: {
    namespace: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
    type: "invoice",
    schema: "UBL-Invoice-2.1.xsd"
  },
  CreditNote: {
    namespace: "urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2",
    type: "credit-note",
    schema: "UBL-CreditNote-2.1.xsd"
  }
};
var svrlParser = new import_fast_xml_parser.XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) => name === "svrl:failed-assert" || name === "svrl:successful-report"
});
var stylesheetCache = /* @__PURE__ */ new Map();
var schemaCache = /* @__PURE__ */ new Map();
function loadStylesheet(path) {
  let loaded = stylesheetCache.get(path);
  if (!loaded) {
    loaded = (0, import_promises3.readFile)(path, "utf8").then((source) => JSON.parse(source));
    stylesheetCache.set(path, loaded);
  }
  return loaded;
}
async function schemaFiles(rulesetDirectory) {
  let loaded = schemaCache.get(rulesetDirectory);
  if (!loaded) {
    loaded = (async () => {
      const root = (0, import_node_path3.join)(rulesetDirectory, "ubl-2.1");
      const files = /* @__PURE__ */ new Map();
      async function visit(directory, relativeDirectory) {
        for (const entry of await (0, import_promises3.readdir)(directory, { withFileTypes: true })) {
          const relativePath = (0, import_node_path3.join)(relativeDirectory, entry.name).split("\\").join("/");
          const path = (0, import_node_path3.join)(directory, entry.name);
          if (entry.isDirectory())
            await visit(path, relativePath);
          else if (entry.isFile() && entry.name.endsWith(".xsd")) {
            const contents = (await (0, import_promises3.readFile)(path, "utf8")).replace(/(schemaLocation\s*=\s*["'])[^"']*\/([^/"']+)(["'])/g, "$1$2$3");
            files.set(relativePath, { fileName: (0, import_node_path3.basename)(relativePath), contents });
          }
        }
      }
      await visit((0, import_node_path3.join)(root, "xsd"), "xsd");
      return files;
    })();
    schemaCache.set(rulesetDirectory, loaded);
  }
  return loaded;
}
async function xsdValidate(bytes, schemaRelativePath, rulesetDirectory) {
  const files = await schemaFiles(rulesetDirectory);
  const schema = files.get(schemaRelativePath);
  if (!schema)
    throw new Error(`Missing UBL schema ${schemaRelativePath}.`);
  return (0, import_xmllint_wasm.validateXML)({
    xml: { fileName: "document.xml", contents: bytes },
    schema,
    preload: [...files.values()].filter((file) => file.fileName !== schema.fileName),
    initialMemoryPages: 512,
    maxMemoryPages: 2 * import_xmllint_wasm.memoryPages.GiB
  });
}
function diagnostic(document, stage, message, overrides = {}) {
  return {
    severity: overrides.severity ?? "error",
    ruleId: overrides.ruleId ?? null,
    message,
    location: overrides.location ?? null,
    document,
    rulesetVersion: RULESET_VERSION,
    rulesetDigest: RULESET_DIGEST,
    stage
  };
}
function result(document, documentType, complete, diagnostics) {
  return {
    document,
    documentType,
    rulesetVersion: RULESET_VERSION,
    rulesetDigest: RULESET_DIGEST,
    complete,
    valid: complete && diagnostics.every((item) => item.severity !== "error"),
    diagnostics
  };
}
function detectRoot(bytes) {
  const text = bytes.toString("utf8");
  let offset = text.charCodeAt(0) === 65279 ? 1 : 0;
  while (offset < text.length) {
    if (/\s/.test(text[offset]))
      offset += 1;
    else if (text.startsWith("<?", offset)) {
      const end = text.indexOf("?>", offset);
      if (end < 0)
        return null;
      offset = end + 2;
    } else if (text.startsWith("<!--", offset)) {
      const end = text.indexOf("-->", offset);
      if (end < 0)
        return null;
      offset = end + 3;
    } else if (text[offset] === "<" && !text.startsWith("<!", offset)) {
      const match = /^<(?:([A-Za-z_][\w.-]*):)?([A-Za-z_][\w.-]*)([^>]*)/.exec(text.slice(offset));
      if (!match)
        return null;
      const [, prefix, localName, attributes] = match;
      const namespaceAttribute = prefix ? `xmlns:${prefix}` : "xmlns";
      const escaped = namespaceAttribute.replace(":", "\\:");
      const namespaceMatch = new RegExp(`${escaped}\\s*=\\s*["']([^"']*)["']`).exec(attributes);
      return { localName, namespace: namespaceMatch?.[1] ?? "" };
    } else
      return null;
  }
  return null;
}
function severity(flag) {
  return /^(warning|warn)$/i.test(String(flag ?? "")) ? "warning" : "error";
}
async function runSchematron(stylesheetPath, sourcePath, document) {
  const stylesheet = await loadStylesheet(stylesheetPath);
  const transformed = await SaxonJS.transform({ stylesheetInternal: stylesheet, sourceFileName: sourcePath, destination: "serialized" }, "async");
  const parsed = svrlParser.parse(transformed.principalResult);
  const output = parsed["svrl:schematron-output"] ?? {};
  const diagnostics = [];
  for (const kind of ["svrl:failed-assert", "svrl:successful-report"]) {
    for (const entry of output[kind] ?? []) {
      diagnostics.push(diagnostic(document, "business-rule", String(entry["svrl:text"] ?? "").trim(), {
        severity: severity(entry["@_flag"]),
        ruleId: typeof entry["@_id"] === "string" ? entry["@_id"] : null,
        location: typeof entry["@_location"] === "string" ? entry["@_location"] : null
      }));
    }
  }
  return diagnostics;
}
async function validateBytes(bytes, sourcePath, document, options) {
  const maximum = options.maxDocumentBytes ?? DEFAULT_MAX_DOCUMENT_BYTES;
  if (bytes.length === 0) {
    return result(document, "unknown", false, [
      diagnostic(document, "preflight", "Document contains no bytes.")
    ]);
  }
  if (bytes.length > maximum) {
    return result(document, "unknown", false, [
      diagnostic(document, "preflight", `Document is ${bytes.length} bytes; the configured limit is ${maximum} bytes.`)
    ]);
  }
  if (/<!DOCTYPE/i.test(bytes.toString("latin1"))) {
    return result(document, "unknown", false, [
      diagnostic(document, "preflight", "DOCTYPE declarations are forbidden.")
    ]);
  }
  const encoding = /^<\?xml[^>]*encoding\s*=\s*["']([^"']+)["']/i.exec(bytes.toString("latin1"));
  if (encoding && !/^utf-8$/i.test(encoding[1])) {
    return result(document, "unknown", false, [
      diagnostic(document, "preflight", `Declared encoding ${encoding[1]} is not UTF-8.`)
    ]);
  }
  const root = detectRoot(bytes);
  const rootDefinition = root ? ROOTS[root.localName] : void 0;
  if (!root || !rootDefinition || root.namespace !== rootDefinition.namespace) {
    return result(document, "unknown", false, [
      diagnostic(document, "preflight", "Expected a UBL 2.1 Invoice or CreditNote root element.")
    ]);
  }
  let rulesetDirectory;
  try {
    rulesetDirectory = await resolveRulesetDirectory(options.rulesetDirectory);
  } catch (error) {
    return result(document, rootDefinition.type, false, [
      diagnostic(document, "tool", `PINT A-NZ ${RULESET_VERSION} is not installed or failed verification: ${error.message}`)
    ]);
  }
  const schemaPath = (0, import_node_path3.join)(rulesetDirectory, "ubl-2.1", "xsd", "maindoc", rootDefinition.schema);
  const sefDirectory = (0, import_node_path3.join)(rulesetDirectory, "sef");
  const requiredArtefacts = [
    schemaPath,
    (0, import_node_path3.join)(sefDirectory, "pint.sef.json"),
    (0, import_node_path3.join)(sefDirectory, "aligned.sef.json")
  ];
  try {
    await Promise.all(requiredArtefacts.map((path) => (0, import_promises3.access)(path)));
  } catch {
    return result(document, rootDefinition.type, false, [
      diagnostic(document, "tool", `The prepared PINT A-NZ ${RULESET_VERSION} ruleset is incomplete at ${rulesetDirectory}.`)
    ]);
  }
  try {
    const schemaValidation = await xsdValidate(bytes, `xsd/maindoc/${rootDefinition.schema}`, rulesetDirectory);
    if (!schemaValidation.valid) {
      return result(document, rootDefinition.type, true, schemaValidation.errors.map((error) => diagnostic(document, "schema", error.message, {
        location: error.loc ? `line ${error.loc.lineNumber}` : null
      })));
    }
  } catch (error) {
    return result(document, rootDefinition.type, false, [
      diagnostic(document, "tool", `UBL schema validation could not run: ${error.message}`)
    ]);
  }
  try {
    const diagnostics = [
      ...await runSchematron((0, import_node_path3.join)(sefDirectory, "pint.sef.json"), sourcePath, document),
      ...await runSchematron((0, import_node_path3.join)(sefDirectory, "aligned.sef.json"), sourcePath, document)
    ];
    return result(document, rootDefinition.type, true, diagnostics);
  } catch (error) {
    return result(document, rootDefinition.type, false, [
      diagnostic(document, "tool", `Cannot run the prepared ruleset: ${error.message}`)
    ]);
  }
}
async function validateFile(documentPath, options = {}) {
  let bytes;
  try {
    bytes = await (0, import_promises3.readFile)(documentPath);
  } catch (error) {
    return result(documentPath, "unknown", false, [
      diagnostic(documentPath, "input", `Cannot read document: ${error.message}`)
    ]);
  }
  return validateBytes(bytes, documentPath, documentPath, options);
}

// src/workflow.ts
var import_node_fs = require("node:fs");
function getInput(name) {
  const normalized = name.replace(/ /g, "_").toUpperCase();
  const underscored = normalized.replace(/-/g, "_");
  const envNames = [`INPUT_${normalized}`, `INPUT_${underscored}`];
  for (const envName of envNames) {
    const value = process.env[envName];
    if (value !== void 0) return value.trim();
  }
  return "";
}
function escapeData(value) {
  return value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}
function escapeProperty(value) {
  return escapeData(value).replace(/:/g, "%3A").replace(/,/g, "%2C");
}
function annotate(kind, message, properties = {}) {
  const rendered = Object.entries(properties).filter((entry) => Boolean(entry[1])).map(([key, value]) => `${key}=${escapeProperty(value)}`).join(",");
  process.stdout.write(`::${kind}${rendered ? ` ${rendered}` : ""}::${escapeData(message)}
`);
}
function setOutput(name, value) {
  const path = process.env.GITHUB_OUTPUT;
  if (path) (0, import_node_fs.appendFileSync)(path, `${name}=${value}
`, "utf8");
}
function appendSummary(markdown) {
  const path = process.env.GITHUB_STEP_SUMMARY;
  if (path) (0, import_node_fs.appendFileSync)(path, markdown, "utf8");
}

// src/action.ts
var EXIT_VALID = 0;
var EXIT_INVALID = 1;
var EXIT_CONFIGURATION = 2;
var EXIT_INTERNAL = 3;
var FORMATS = ["human", "json"];
var NO_MATCH_BEHAVIOURS = ["error", "warn", "ignore"];
var SUMMARY_DOCUMENT_LIMIT = 100;
var SUMMARY_DIAGNOSTIC_LIMIT = 100;
function writeOutputs(checkedFiles, errorCount, warningCount) {
  setOutput("checked-files", checkedFiles);
  setOutput("error-count", errorCount);
  setOutput("warning-count", warningCount);
  setOutput("ruleset-version", RULESET_VERSION);
}
function configurationFailure(message) {
  annotate("error", message, { title: "PINT A-NZ lint configuration" });
  return EXIT_CONFIGURATION;
}
function escapesWorkspace(workspace, path) {
  const outside = (0, import_node_path4.relative)(workspace, path);
  return outside.startsWith("..") || (0, import_node_path4.isAbsolute)(outside);
}
function countBySeverity(results, severity2) {
  return results.reduce(
    (total, result2) => total + result2.diagnostics.filter((item) => item.severity === severity2).length,
    0
  );
}
function renderHuman(result2) {
  if (result2.valid) return `PASS ${result2.document} (PINT A-NZ ${result2.rulesetVersion})`;
  const heading = result2.complete ? "FAIL" : "ERROR";
  const lines = [`${heading} ${result2.document} (PINT A-NZ ${result2.rulesetVersion})`];
  for (const item of result2.diagnostics) {
    const rule = item.ruleId ? ` ${item.ruleId}` : "";
    const location = item.location ? ` at ${item.location}` : "";
    lines.push(`  ${item.severity.toUpperCase()}${rule} [${item.stage}]${location}`);
    lines.push(`    ${item.message}`);
  }
  return lines.join("\n");
}
function markdownCell(value) {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}
function renderSummary(report, reportFile) {
  const errorCount = countBySeverity(report.results, "error");
  const warningCount = countBySeverity(report.results, "warning");
  const lines = [
    "## PINT A-NZ lint",
    "",
    `Ruleset ${report.rulesetVersion} (resources SHA-256 \`${report.rulesetDigest}\`)`,
    "",
    "| Documents | Passed | Errors | Warnings |",
    "|---:|---:|---:|---:|",
    `| ${report.results.length} | ${report.results.filter((item) => item.valid).length} | ${errorCount} | ${warningCount} |`,
    "",
    "| Document | Result | Errors | Warnings |",
    "|---|---|---:|---:|"
  ];
  for (const result2 of report.results.slice(0, SUMMARY_DOCUMENT_LIMIT)) {
    const outcome = result2.valid ? "\u2705 pass" : result2.complete ? "\u274C fail" : "\u26A0\uFE0F incomplete";
    lines.push(
      `| ${markdownCell(result2.document)} | ${outcome} | ${result2.diagnostics.filter((item) => item.severity === "error").length} | ${result2.diagnostics.filter((item) => item.severity === "warning").length} |`
    );
  }
  if (report.results.length > SUMMARY_DOCUMENT_LIMIT) {
    lines.push("", `${report.results.length - SUMMARY_DOCUMENT_LIMIT} further documents are not listed here.`);
  }
  lines.push("");
  const diagnostics = report.results.flatMap(
    (result2) => result2.diagnostics.map((item) => ({ result: result2, item }))
  );
  if (diagnostics.length > 0) {
    lines.push("| Document | Severity | Rule | Stage | Message |", "|---|---|---|---|---|");
    for (const { result: result2, item } of diagnostics.slice(0, SUMMARY_DIAGNOSTIC_LIMIT)) {
      lines.push(
        `| ${markdownCell(result2.document)} | ${item.severity} | ${item.ruleId ?? "\u2014"} | ${item.stage} | ${markdownCell(item.message)}${item.location ? ` at \`${markdownCell(item.location)}\`` : ""} |`
      );
    }
    if (diagnostics.length > SUMMARY_DIAGNOSTIC_LIMIT) {
      lines.push(
        "",
        `${diagnostics.length - SUMMARY_DIAGNOSTIC_LIMIT} further diagnostics are not listed here${reportFile ? `; the complete report is at \`${reportFile}\`` : "; set the report-file input for the complete report"}.`
      );
    }
  }
  lines.push("");
  return lines.join("\n");
}
function annotateDiagnostics(report, maxAnnotations, reportFile) {
  let emitted = 0;
  let omitted = 0;
  for (const result2 of report.results) {
    for (const item of result2.diagnostics) {
      if (emitted >= maxAnnotations) {
        omitted += 1;
        continue;
      }
      emitted += 1;
      const line = item.location ? /^line (\d+)$/.exec(item.location)?.[1] : void 0;
      const location = item.location && !line ? ` at ${item.location}` : "";
      annotate(item.severity, `${item.message}${location} [${item.stage}]`, {
        file: result2.document,
        line,
        title: item.ruleId ? `PINT A-NZ ${report.rulesetVersion} rule ${item.ruleId}` : `PINT A-NZ ${report.rulesetVersion} ${item.stage} check`
      });
    }
  }
  if (omitted > 0) {
    annotate(
      "notice",
      `${omitted} further diagnostics were not annotated (max-annotations: ${maxAnnotations}). The job summary${reportFile ? ` and ${reportFile}` : ""} hold the complete list.`
    );
  }
}
async function runAction() {
  const failEarly = (message) => {
    writeOutputs(0, 0, 0);
    return configurationFailure(message);
  };
  const workspace = process.env.GITHUB_WORKSPACE && (0, import_node_path4.resolve)(process.env.GITHUB_WORKSPACE);
  if (!workspace) {
    return failEarly("GITHUB_WORKSPACE is not set; run this action on a runner after actions/checkout.");
  }
  const patterns = getInput("files").split(/\r?\n/).map((pattern) => pattern.trim()).filter(Boolean);
  const format = getInput("format") || "human";
  const reportFile = getInput("report-file");
  const rulesetDirInput = getInput("ruleset-dir");
  const maxAnnotationsInput = getInput("max-annotations") || "10";
  const maxDocumentBytesInput = getInput("max-document-bytes");
  const ifNoFilesFound = getInput("if-no-files-found") || "error";
  if (patterns.length === 0) {
    return failEarly("The files input is required: one workspace-relative path or glob pattern per line.");
  }
  if (!FORMATS.includes(format)) {
    return failEarly(`Unsupported format: ${format}. Supported: ${FORMATS.join(", ")}.`);
  }
  if (!NO_MATCH_BEHAVIOURS.includes(ifNoFilesFound)) {
    return failEarly(
      `Unsupported if-no-files-found value: ${ifNoFilesFound}. Supported: ${NO_MATCH_BEHAVIOURS.join(", ")}.`
    );
  }
  const maxAnnotations = Number(maxAnnotationsInput);
  if (!Number.isInteger(maxAnnotations) || maxAnnotations < 0) {
    return failEarly(`max-annotations must be a non-negative integer, not ${maxAnnotationsInput}.`);
  }
  const maxDocumentBytes = maxDocumentBytesInput ? Number(maxDocumentBytesInput) : void 0;
  if (maxDocumentBytes !== void 0 && (!Number.isInteger(maxDocumentBytes) || maxDocumentBytes <= 0)) {
    return failEarly(`max-document-bytes must be a positive integer, not ${maxDocumentBytesInput}.`);
  }
  const escaping = patterns.find(
    (pattern) => (0, import_node_path4.isAbsolute)(pattern) || /^[A-Za-z]:/.test(pattern) || pattern.split(/[\\/]/).includes("..")
  );
  if (escaping) {
    return failEarly(
      `File patterns must stay inside the workspace: ${escaping} is absolute or contains "..".`
    );
  }
  const reportTarget = reportFile && (0, import_node_path4.resolve)(workspace, reportFile);
  if (reportTarget && escapesWorkspace(workspace, reportTarget)) {
    return failEarly(`report-file must stay inside the workspace: ${reportFile}.`);
  }
  let rulesetDirectory;
  if (rulesetDirInput) {
    try {
      rulesetDirectory = await resolveRulesetDirectory((0, import_node_path4.resolve)(workspace, rulesetDirInput));
    } catch (error) {
      return failEarly(
        `ruleset-dir does not hold a verified PINT A-NZ ${RULESET_VERSION} ruleset: ${error.message}`
      );
    }
  } else {
    try {
      const installed = await installRuleset();
      rulesetDirectory = installed.directory;
      process.stdout.write(
        `Using PINT A-NZ ${installed.version} at ${installed.directory} (resources SHA-256 ${installed.resourcesSha256}).
`
      );
    } catch (error) {
      return failEarly(
        `Cannot install the pinned PINT A-NZ ${RULESET_VERSION} ruleset: ${error.message} Provide a prepared ruleset via the ruleset-dir input, or allow the runner to download the pinned official archives.`
      );
    }
  }
  const files = /* @__PURE__ */ new Map();
  for (const match of await expandPatterns(patterns, workspace)) {
    const absolute = (0, import_node_path4.resolve)(workspace, match);
    if (escapesWorkspace(workspace, absolute)) {
      return failEarly(`Matched file is outside the workspace: ${match}.`);
    }
    files.set(absolute, (0, import_node_path4.relative)(workspace, absolute).split(import_node_path4.sep).join("/"));
  }
  if (files.size === 0) {
    writeOutputs(0, 0, 0);
    const message = `No files matched: ${patterns.join(", ")}`;
    if (ifNoFilesFound === "error") return configurationFailure(message);
    if (ifNoFilesFound === "warn") annotate("warning", message, { title: "PINT A-NZ lint" });
    else process.stdout.write(`${message}
`);
    return EXIT_VALID;
  }
  const results = [];
  for (const [absolute, relativePath] of files) {
    const validated = await validateFile(absolute, { rulesetDirectory, maxDocumentBytes });
    results.push({
      ...validated,
      document: relativePath,
      diagnostics: validated.diagnostics.map((item) => ({ ...item, document: relativePath }))
    });
  }
  const report = {
    rulesetVersion: RULESET_VERSION,
    rulesetDigest: RULESET_DIGEST,
    complete: results.every((item) => item.complete),
    valid: results.every((item) => item.valid),
    results
  };
  writeOutputs(results.length, countBySeverity(results, "error"), countBySeverity(results, "warning"));
  if (format === "json") process.stdout.write(`${JSON.stringify(report)}
`);
  else process.stdout.write(`${results.map(renderHuman).join("\n")}
`);
  if (reportTarget) {
    await (0, import_promises4.mkdir)((0, import_node_path4.dirname)(reportTarget), { recursive: true });
    await (0, import_promises4.writeFile)(reportTarget, `${JSON.stringify(report, null, 2)}
`, "utf8");
    process.stdout.write(`Report written to ${reportFile}.
`);
  }
  annotateDiagnostics(report, maxAnnotations, reportFile);
  appendSummary(renderSummary(report, reportFile));
  if (!report.complete) {
    const incomplete = results.filter((item) => !item.complete).length;
    annotate(
      "error",
      `${incomplete} of ${results.length} document(s) could not be completely validated; see the diagnostics above.`,
      { title: "PINT A-NZ lint" }
    );
    return EXIT_CONFIGURATION;
  }
  if (!report.valid) {
    const failing = results.filter((item) => !item.valid).length;
    annotate(
      "error",
      `${failing} of ${results.length} document(s) failed PINT A-NZ ${RULESET_VERSION} validation.`,
      { title: "PINT A-NZ lint" }
    );
    return EXIT_INVALID;
  }
  process.stdout.write(`All ${results.length} document(s) pass PINT A-NZ ${RULESET_VERSION}.
`);
  return EXIT_VALID;
}

// src/main.ts
runAction().then(
  (code) => {
    process.exitCode = code;
  },
  (error) => {
    const detail = error instanceof Error ? error.stack ?? error.message : String(error);
    annotate("error", `Internal pint-anz lint-action failure, please report it: ${detail}`, {
      title: "PINT A-NZ lint internal error"
    });
    process.exitCode = EXIT_INTERNAL;
  }
);
