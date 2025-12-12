import { readFile, readFileSync, writeFileSync } from "node:fs"

const MAIN_PACKAGES = [
    "cbor",
    "codec-utils",
    "compiler",
    "contract-utils",
    "crypto",
    "ledger",
    "tx-utils",
    "uplc"
]

const PLUMBING_PACKAGES = [
    "compiler-utils",
    "era",
    "ir",
    "type-utils"
]

const ALL_PACKAGES = MAIN_PACKAGES.concat(PLUMBING_PACKAGES)

const TAB = "&nbsp;&nbsp;"

// TODO: turn this into a docusaurus plugin so it can operate during hot-reloads
/**
 * @import { Comment, CommentDisplayPart, DeclarationReflection, InlineTagDisplayPart, ParameterReflection, ProjectReflection, SignatureReflection, SomeType, SourceReference, TypeParameterReflection } from "typedoc"
 */

/**
 * @typedef {object} Context
 * @prop {string} currentPkgName
 * @prop {Record<string, string>} topLevelSymbolsPkgs
 * A map from top-level symbol name to pkg name
 * This is needed so that `@link` comments can optimistically link to symbols in downstream packages. 
 */

async function main() {
    /**
     * @type {Context}
     */
    const context = {topLevelSymbolsPkgs: {}, currentPkgName: ""}

    for (let pkgName of ALL_PACKAGES) {
        buildContext({...context, currentPkgName: pkgName})
    }

    // TODO: collect top-level symbols before, 
    for (let pkgName of ALL_PACKAGES) {
        writePackageDocs({...context, currentPkgName: pkgName})
    }
}

/**
 * @param {Context} context
 */
function buildContext(context) {
    const pkgDoc = readPkgDoc(context.currentPkgName)

    for (let child of pkgDoc.children) {
        context.topLevelSymbolsPkgs[child.name] = pkgDoc.name
    }
}

/**
 * @param {Context} context
 */
function writePackageDocs(context) {
    /**
     * @type {ProjectReflection}
     */
    const pkgDoc = readPkgDoc(context.currentPkgName)

    const pkgVersion = getHeliosPackageVersion(context.currentPkgName)

    const readme = stringifyCommentDisplayParts(context, pkgDoc.readme)

    const basePath = `.${getPackageDocPath(context.currentPkgName)}`

    writeFileSync(`${basePath}/index.md`, [
        "---",
        `sidebar_label: '${context.currentPkgName} v${pkgVersion}'`,
        "sidebar_position: 1",
        `custom_edit_url: https://github.com/HeliosLang/${context.currentPkgName}/blob/main/README.md`,
        `pagination_prev: ${getPaginationPrev(context.currentPkgName)}`,
        `pagination_next: ${getPaginationNext(context.currentPkgName)}`,
        "---",
        readme
    ].join("\n"))

    for (let child of pkgDoc.children) {
        writeSymbolDoc(context, child)
    }
}

/**
 * @param {string} pkgName 
 * @returns {ProjectReflection}
 */
function readPkgDoc(pkgName) {
    const basePath = `.${getPackageDocPath(pkgName)}`

    /**
     * @type {ProjectReflection}
     */
    const pkgDoc = JSON.parse(readFileSync(`${basePath}/_typedoc_.json`).toString())

    return pkgDoc
}

/** 
 * @param {string} pkgName 
 * @returns {string}
 */
function getPackageDocPath(pkgName) {
    const isPlumbing = PLUMBING_PACKAGES.includes(pkgName)

    return `/docs/sdk/${isPlumbing ? "plumbing/" : ""}${pkgName}`
}

/**
 * @param {string} pkgName 
 * @param {string} symbolName 
 */
function getSymbolDocPath(pkgName, symbolName) {
    if (pkgName.startsWith("@helios-lang/")) {
        pkgName = pkgName.slice(("@helios-lang/").length)
    }

    const isSame = symbolName.toLowerCase() == pkgName.toLowerCase()

    const name = isSame ? `${symbolName}_` : symbolName
    
    const basePath = getPackageDocPath(pkgName)

    return `${basePath}/${name}`
}

/**
 * @param {string} pkgName 
 * @returns {string}
 */
function getPaginationPrev(pkgName) {
    const i = ALL_PACKAGES.indexOf(pkgName)

    if (i == 0) {
        return `sdk/intro`
    } else {
        return getPackageDocPath(ALL_PACKAGES[i-1]).slice(("/docs/").length) + "/index"
    }
}

/**
 * @param {string} pkgName 
 * @returns {string}
 */
function getPaginationNext(pkgName) {
    const i = ALL_PACKAGES.indexOf(pkgName)

    if (i == ALL_PACKAGES.length - 1) {
        return "null"
    } else {
        return getPackageDocPath(ALL_PACKAGES[i+1]).slice(("/docs/").length) + "/index"
    }
}


/**
 * @param {Context} context 
 * @param {DeclarationReflection} child
 */
function writeSymbolDoc(context, child) {
    switch (child.variant) {
        case "declaration":
            switch(child.kind) {
                case 4:
                    writeNamespaceDoc(context, child)
                    return
                case 32:
                    writeConstantDoc(context, child)
                    return
                case 64:
                    writeFunctionDoc(context, child)
                    return
                case 128:
                    writeClassDoc(context, child)
                    return
                case 256:
                    writeInterfaceDoc(context, child)
                    return
                case 2097152:
                    writeTypeAliasDoc(context, child)
                    return
            }
    }

    writeGenericSymbolDoc(context, child)
}

/**
 * @param {string} pkgName 
 * @param {DeclarationReflection} child 
 * @returns {{name: string, path: string, site: SourceReference}}
 */
function getCommonSymbolInfo(pkgName, child) {
    const name = child.name

    if (name.includes("buildUnsafe")) {
        console.log(child);
    }

    const symbolPath = getSymbolDocPath(pkgName, name)

    if (!child.sources || child.sources.length == 0) {
        throw new Error("sources not set for " + name)
    }

    const site = child.sources[0]

    return {name, path: symbolPath, site}
}

/**
 * @param {Context} context
 * @param {DeclarationReflection} child 
 */
function writeConstantDoc(context, child) {
    const {name, path, site} = getCommonSymbolInfo(context.currentPkgName, child)

    const comment = stringifyComment(context, child.comment)
    const typeSnippet = `<CodeBlock className="language-ts">export const ${name}${child.defaultValue == "..." ? ": " + stringifyType(context, child.type) : " = " + child.defaultValue}</CodeBlock>` 

    const content = [
        `# <span className="constant_badge">${name}</span>`,
        "",
        typeSnippet,
        "",
        comment
    ]

    writeFileSync(`.${path}.md`, [
        
        "---",
        `title: ${name}`,
        `sidebar_label: ${name}`,
        `sidebar_class_name: constant_badge`,
        `custom_edit_url: ${getSymbolEditLink(context.currentPkgName, site)}`,
        "---",
        "",
        "import CodeBlock from '@theme/CodeBlock'",
        "",
        content.join("\n")
    ].join("\n"))
}

/**
 * @param {Context} context
 * @param {DeclarationReflection} child 
 */
function writeFunctionDoc(context, child) {
    const {name, path, site} = getCommonSymbolInfo(context.currentPkgName, child)

    const content = [
        `# <span className="function_badge">${name}</span>`,
    ]

    const overloads = child.signatures ?? []
    const hasOverloads = overloads.length > 1
    const sectionPrefix = `##${hasOverloads ? "#" : ""}`

    for (let i = 0; i < overloads.length; i++) {
        const overload = overloads[i]

        if (hasOverloads) {
            content.push(`\n## Overload ${i+1}`)
        }

        const returnType = stringifyType(context, overload.type)
        const parameters = overload.parameters ?? []
        const typeParams = overload.typeParameters ?? []
        const typeSnippet = `\n<CodeBlock className="language-ts">export function ${name}${stringifyTypeParams(context, overload.typeParameters)}(${stringifyFunctionParams(context, parameters)}): ${returnType}</CodeBlock>`
        content.push(typeSnippet)

        const comment = stringifyComment(context, overload.comment)
        content.push("\n" + comment)

        if (typeParams.length > 0) {
            content.push(`\n${sectionPrefix} Type parameters`)

            for (let p of typeParams) {
                content.push(`\n${sectionPrefix}# \`${p.name}\``)

                const typeSnippet = stringifyTypeParam(context, p, true)
                content.push(`\n<CodeBlock className="language-ts">${typeSnippet}</CodeBlock>`)

                const comment = stringifyComment(context, p.comment)
                if (comment != "")
                content.push("\n" + comment)
            }
        }

        if (parameters.length > 0) {
            content.push(`\n${sectionPrefix} Arguments`)

            //const tableParts = ["<table className=\"fn-arguments\"><thead><tr><th>Name</th><th>Type</th><th>Description</th></tr></thead><tbody>"]

            for (let i = 0; i < parameters.length; i++) {
                const p = parameters[i]
                const pName = p.name
                const pType = stringifyType(context, p.type)

                content.push(`\n#${sectionPrefix} ${i+1}. \`${pName}\``)
                //const pTypeLines = pType.split("\n")
                content.push(`\n<CodeBlock className="language-ts">${pName}${p.flags.isOptional ? "?" : ""}: ${pType}</CodeBlock>`)
                const pDescription = stringifyComment(context, p.comment)
                content.push(pDescription)
                //const pDescriptionLines = pDescription.split("\n")

                //tableParts.push(`<tr><td>${pName}</td><td>${pType}</td><td>${pDescription}</td></tr>`)

                //for (let i = 1; i < Math.max(pTypeLines.length, pDescriptionLines.length); i++) {
                //    content.push(`| | ${i < pTypeLines.length ? `<CodeBlock>${pTypeLines[i]}</CodeBlock>` : ""} | ${i < pDescriptionLines.length ? pDescriptionLines[i] : ""} |`)
                //}
            }

            //tableParts.push("</tbody></table>")

            //content.push(tableParts.join(""))
        }
        
        content.push(`\n${sectionPrefix} Returns\n`)
        content.push(`<CodeBlock className="language-ts">${returnType}</CodeBlock>\n`)
        const returnValueComment = stringifyCommentDisplayParts(context, overload.comment?.blockTags?.find(bt => bt.tag == "@returns")?.content)
        if (returnValueComment != "") {
            content.push(returnValueComment + "\n")
        }
    }

    writeFileSync(`.${path}.md`, [
        
        "---",
        `title: ${name}`,
        `sidebar_label: ${name}`,
        `sidebar_class_name: function_badge`,
        `custom_edit_url: ${getSymbolEditLink(context.currentPkgName, site)}`,
        "---",
        "",
        "import CodeBlock from '@theme/CodeBlock'",
        "",
        content.join("\n")
    ].join("\n"))
}

/**
 * @param {Context} context
 * @param {DeclarationReflection} decl 
 */
function writeInterfaceDoc(context, decl) {
    const {name, path, site} = getCommonSymbolInfo(context.currentPkgName, decl)

    // generate the typeSnippet
    /**
     * @type {string[]}
     */
    const typeSnippet = [
        `<CodeBlock className="language-ts">export interface ${name}${stringifyTypeParams(context, decl.typeParameters)} \\{`
    ]

    const typeSnippetIndent = TAB

    for (let attr of decl.children) {
        const name = attr.name

        typeSnippet.push(`${typeSnippetIndent}[${name}](#${name.toLowerCase()})${stringifyMaybeFunctionTypeProperty(context, attr, typeSnippetIndent)}`)
    }

    typeSnippet.push('\\}</CodeBlock>')

    const comment = stringifyComment(context, decl.comment)

    const content = [
        `# <span className="interface_badge">${name}</span>`,
        "",
        typeSnippet.join("\n"),
        ...(comment != "" ? [comment, ""] : []),
        ""
    ]

    content.push("## Properties\n")

    // write a snippet each attribute
    for (let attr of decl.children) {
        const name = attr.name
        const attrType = stringifyMaybeFunctionInterfaceProperty(context, attr)
        const attrComment = stringifyComment(context, attr.comment)

        content.push([
            `### \`${name}\``,
            "",
            `<CodeBlock className="language-ts">${name}${attrType}</CodeBlock>`,
            ...(attrComment != "" ? [attrComment, ""] : []),
            ""
        ].join("\n"))
    }

    writeFileSync(`.${path}.md`, [
        
        "---",
        `title: ${name}`,
        `sidebar_label: ${name}`,
        `sidebar_class_name: interface_badge`,
        `custom_edit_url: ${getSymbolEditLink(context.currentPkgName, site)}`,
        "---",
        "",
        "import CodeBlock from '@theme/CodeBlock'",
        "",
        content.join("\n")
    ].join("\n"))
}

/**
 * @param {Context} context
 * @param {DeclarationReflection} child 
 */
function writeNamespaceDoc(context, child) {
    const {name, path, site} = getCommonSymbolInfo(context.currentPkgName, child)

    //const typeSnippet = `<CodeBlock className="language-ts">export const ${name}${child.defaultValue == "..." ? ": " + stringifyType(context, child.type) : " = " + child.defaultValue}</CodeBlock>` 
    const comment = stringifyComment(context, child.comment)

    const content = [
        `# <span className="namespace_badge">${name}</span>`,
        //  typeSnippet,
        comment,
    ]

    writeFileSync(`.${path}.md`, [
        
        "---",
        `title: ${name}`,
        `sidebar_label: ${name}`,
        `sidebar_class_name: namespace_badge`,
        `custom_edit_url: ${getSymbolEditLink(context.currentPkgName, site)}`,
        "---",
        "",
        "import CodeBlock from '@theme/CodeBlock'",
        "",
        content.join("\n")
    ].join("\n"))
}

/**
 * @param {Context} context
 * @param {DeclarationReflection} child 
 */
function writeClassDoc(context, child) {
    const {name, path, site} = getCommonSymbolInfo(context.currentPkgName, child)

    //const typeSnippet = `<CodeBlock className="language-ts">export const ${name}${child.defaultValue == "..." ? ": " + stringifyType(context, child.type) : " = " + child.defaultValue}</CodeBlock>` 
    const comment = stringifyComment(context, child.comment)

    const content = [
        `# <span className="class_badge">${name}</span>`,
        //  typeSnippet,
        comment,
    ]

    writeFileSync(`.${path}.md`, [
        
        "---",
        `title: ${name}`,
        `sidebar_label: ${name}`,
        `sidebar_class_name: class_badge`,
        `custom_edit_url: ${getSymbolEditLink(context.currentPkgName, site)}`,
        "---",
        "",
        "import CodeBlock from '@theme/CodeBlock'",
        "",
        content.join("\n")
    ].join("\n"))
}

/**
 * @param {Context} context
 * @param {DeclarationReflection} decl 
 */
function writeTypeAliasDoc(context, decl) {
    const {name, path, site} = getCommonSymbolInfo(context.currentPkgName, decl)

    const beforeType = (decl.type?.type == "union" && decl.type?.types?.length > 2) ? `\n${TAB}| ` : ""
    const typeSnippet = `<CodeBlock className="language-ts">export type ${name}${stringifyTypeParams(context, decl.typeParameters)} = ${beforeType}${stringifyType(context, decl.type)}</CodeBlock>` 
    const comment = stringifyComment(context, decl.comment)

    const content = [
        `# <span className="type_badge">${name}</span>`,
        "",
        typeSnippet,
        "",
        comment,
        ""
    ]

    writeFileSync(`.${path}.md`, [
        
        "---",
        `title: ${name}`,
        `sidebar_label: ${name}`,
        `sidebar_class_name: type_badge`,
        `custom_edit_url: ${getSymbolEditLink(context.currentPkgName, site)}`,
        "---",
        "",
        "import CodeBlock from '@theme/CodeBlock'",
        "",
        content.join("\n")
    ].join("\n"))
}

/**
 * @param {Context} context 
 * @param {ParameterReflection[]} params 
 * @param {string} indent
 * @returns {string}
 */
function stringifyFunctionParams(context, params, indent = "") {
    if (params.length == 0) {
        return ""
    } else if (params.length == 1) {
        return `${params[0].name}${params[0].flags?.isOptional ? "?" : ""}: ${stringifyType(context, params[0].type, indent)}`
    } else {
        const innerIndent = `${indent}${TAB}`
        return "\n" + innerIndent + params.map(p => `${p.name}${p.flags?.isOptional ? "?" : ""}: ${stringifyType(context, p.type, innerIndent)}`).join(",\n" + innerIndent) + "\n" + indent
    }
}

/**
 * @param {Context} context 
 * @param {DeclarationReflection} decl
 * @param {string} indent 
 * @returns {string}
 */
function stringifyMaybeFunctionInterfaceProperty(context, decl, indent = "") {
    const t = decl.type
    const isOptional = decl.flags.isOptional

    if (t && t.type == "reflection" && !isOptional) {
        return stringifyMaybeFunctionTypeProperty(context, t.declaration, indent)
    } else {
        return `${isOptional ? "?" : ""}: ${stringifyType(context, t, indent)}`
    }
}

/**
 * @param {Context} context
 * @param {SomeType | undefined} t 
 * @param {string} indent
 * @returns {string}
 */
function stringifyType(context, t, indent = "") {
    if (!t) {
        return "unknown"
    } else {
        switch(t.type) {
            case "array":
                return `${stringifyType(context, t.elementType, indent)}[]`
            case "unknown":
            case "intrinsic":
                return t.name
            case "predicate":
                return `${t.asserts ? "asserts " : ""}${t.name} is ${stringifyType(context, t.targetType, indent)}`
            case "rest":
                return `...${stringifyType(context, t.elementType, indent)}`
            case "conditional":
                const innerIndent = indent + TAB
                return `${stringifyType(context, t.checkType, indent)} extends ${stringifyType(context, t.extendsType, indent)} \n${innerIndent}? ${stringifyType(context, t.trueType, innerIndent)} \n${innerIndent}: ${stringifyType(context, t.falseType, innerIndent)}`
            case "reference":
                const typeParams = t.typeArguments ? `&lt;${t.typeArguments.map(ta => stringifyType(context, ta, indent)).join(", ")}>` : ""
                if (t.package == "typescript") {
                    switch(t.name) {
                        case "Uint8Array":
                            return `[Uint8Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array)`
                        default:
                            return t.name + typeParams
                    }
                } else if (!t.refersToTypeParameter) {
                    const path = getSymbolDocPath(t.package ?? context.currentPkgName, t.name)
                    return `[${t.name}](${path})` + typeParams
                } else {
                    return t.name + typeParams
                }
            case "reflection":
                if (t.declaration.children || t.declaration.indexSignatures) {
                    const nEntries = (t.declaration.children?.length ?? 0) + (t.declaration.indexSignatures?.length ?? 0)
                    const nlBetweenEntries = nEntries > 1

                    const innerIndent = nlBetweenEntries ? indent + TAB : indent
                    const afterOpenBrace = nlBetweenEntries ? "\n" + innerIndent : ""
                    const separator = nlBetweenEntries ? afterOpenBrace : ", "
                    const beforeCloseBrace = nlBetweenEntries ? "\n" + indent : ""

                    const children = t.declaration.children ?? []
                    const indexSignatures = t.declaration.indexSignatures ?? []

                    return `\\{${afterOpenBrace}${children.map(ct => {
                        const key = `${ct.name}${ct.flags.isOptional ? "?" : ""}`
                        return `${key}${stringifyMaybeFunctionTypeProperty(context, ct, innerIndent)}`
                    }).concat(indexSignatures.map(is => {
                        const params = is.parameters ?? []
                        const key = `&lsqb;${params.map(p => `${p.name}: ${stringifyType(context, p.type, indent)}`).join(", ")}&rsqb;`
                        return `${key}: ${stringifyType(context, is.type, indent)}`
                    })).join(separator)}${beforeCloseBrace}\\}`
                } else if (t.declaration.signatures && t.declaration.signatures.length == 1 && t.declaration.signatures[0].kind == 16384) {
                    return stringifyConstructorSignature(context, t.declaration.signatures[0], indent)
                 } else {
                    return stringifyFunctionSignatures(context, t.declaration.signatures, indent)
                }
            case "union":
                if (t.types.length <= 2) {
                    return t.types.map(ut => stringifyType(context, ut, indent)).join(" | ")
                } else {
                    const innerIndent = indent + TAB
                    return t.types.map(ut => stringifyType(context, ut, innerIndent)).join(`\n${innerIndent}| `)
                }
            case "intersection":
                return t.types.map(it => stringifyType(context, it, indent)).join(" & ")
            case "typeOperator":
                return `${t.operator} ${stringifyType(context, t.target, indent)}`
            case "mapped": 
                return `\\{&lsqb;${t.parameter} in ${stringifyType(context, t.parameterType, indent)}&rsqb;: ${stringifyType(context, t.templateType, indent)}\\}`
            case "indexedAccess":
                return `${stringifyType(context, t.objectType, indent)}&lsqb;${stringifyType(context, t.indexType, indent)}&rsqb;`
            case "literal":
                if (typeof t.value == "string") {
                    return `"${t.value.replaceAll("{", "\\{")}"`
                } else {
                    return t.value
                }
            case "tuple":
                const parts = (t.elements ?? []).map(et => stringifyType(context, et, indent))

                return joinGroup("&lsqb;", parts, "&rsqb;", indent)
            default: 
                return "unknown"
        }
    }
}

/**
 * @param {Context} context 
 * @param {DeclarationReflection} decl 
 * @param {string} indent 
 * @returns {string}
 */
function stringifyMaybeFunctionTypeProperty(context, decl, indent = "") {
    const funcSignatures = decl.signatures && decl.signatures.length > 0 ? decl.signatures : (decl.type && decl.type.type == "reflection" && decl.type.declaration.signatures) ? decl.type.declaration.signatures : undefined
    const isOptional = decl.flags.isOptional
    const isFunction = !isOptional && (funcSignatures && funcSignatures.length > 0)
    const value =  isFunction ? 
        stringifyFunctionSignatures(context, funcSignatures, indent, ": "): 
        decl.type ? 
            stringifyType(context, decl.type, indent) : 
            "unknown"
    return `${isFunction ? "" : (isOptional ? "?: " : ": ")}${value}`
}

/**
 * @param {Context} context 
 * @param {undefined | SignatureReflection[]} signatures 
 * @param {string} [indent]
 * @param {string} [arrow]
 * @returns {string}
 */
function stringifyFunctionSignatures(context, signatures, indent = "", arrow = " => ") {
    if (signatures && signatures.length > 0) {
        const signature = signatures[0]

        return stringifyFunctionSignature(context, signature, indent, arrow)
    } else {
        return "unknown"
    }
}

/**
 * @param {Context} context 
 * @param {SignatureReflection} signature 
 * @param {string} [indent]
 * @returns {string}
 */
function stringifyConstructorSignature(context, signature, indent = "") {
    const innerIndent = indent + TAB
    return `${indent}\\{\n${innerIndent}new${stringifyFunctionSignature(context, signature, innerIndent, " => ")}\n${indent}\\}`
}

/**
 * @param {Context} context 
 * @param {SignatureReflection} signature 
 * @param {string} [indent]
 * @param {string} [arrow]
 * @returns {string}
 */
function stringifyFunctionSignature(context, signature, indent = "", arrow = " => ") {
    return `${stringifyTypeParams(context, signature.typeParameters, indent)}(${stringifyFunctionParams(context, signature.parameters ?? [], indent)})${arrow}${stringifyType(context, signature.type, indent)}`
}

/**
 * @param {Context} context 
 * @param {TypeParameterReflection[] | undefined} typeParams 
 * @param {string} [indent]
 * @returns {string}
 */
function stringifyTypeParams(context, typeParams, indent = "") {
    if (typeParams && typeParams.length > 0) {
        const parts = typeParams.map(tp => stringifyTypeParam(context, tp, false, indent))

        return joinGroup("&lt;", parts, "&gt;", indent)
    } else {
        return ""
    }
}

/**
 * @param {string} open 
 * @param {string[]} parts 
 * @param {string} close
 * @param {string} [indent]
 * @param {string} [separator]
 * @returns {string}
 */
function joinGroup(open, parts, close, indent = "", separator = ",") {
    if (parts.some(p => p.includes("\n"))) {
        return `${open}\n${indent + TAB}${parts.map(p => p.split("\n").join("\n" + TAB)).join(separator + "\n" + indent + TAB)}\n${indent}${close}`
    } else {
        return `${open}${parts.join(separator + " ")}${close}`
    }
}

/**
 * @param {Context} context 
 * @param {TypeParameterReflection} typeParam 
 * @param {boolean} [extendsAny]
 * @param {string} indent
 * @returns {string} 
 */
function stringifyTypeParam(context, typeParam, extendsAny = false, indent = "") {
    const ext = typeParam.type ? ` extends ${stringifyType(context, typeParam.type, indent)}` : extendsAny ? " extends any" : ""
    const def = typeParam.default ? `${(ext == "" ? "=" : " = ")}${stringifyType(context, typeParam.default, indent)}` : ""

    return `${typeParam.name}${ext}${def}`
}

/**
 * @param {Context} context
 * @param {DeclarationReflection} child 
 */
function writeGenericSymbolDoc(context, child) {
    const {name, path, site} = getCommonSymbolInfo(context.currentPkgName, child)

    let content = stringifyComment(context, child.comment)

    writeFileSync(`.${path}.md`, [
        "---",
        `sidebar_label: ${name}`,
        `custom_edit_url: ${getSymbolEditLink(context.currentPkgName, site)}`,
        "---",
        `# ${name}`,
        content
    ].join("\n"))
}

/**
 * @param {string} pkgName 
 * @param {SourceReference} site 
 * @returns {string}
 */
function getSymbolEditLink(pkgName, site) {
    let fileName = site.fileName

    if (fileName.startsWith("@helios-lang/")) {
        const parts = fileName.split("/")
        pkgName = parts[1]
        fileName = parts.slice(2).join("/")
    }

    if (fileName.startsWith("src/")) {
        fileName = fileName.slice(("src/").length)
    }

    return `https://github.com/HeliosLang/${pkgName}/blob/main/src/${fileName}#L${site.line}`
}

/**
 * @param {string} pkgName 
 * @returns {string}
 */
function getHeliosPackageVersion(pkgName) {
    const pkgJson = JSON.parse(readFileSync(`./node_modules/@helios-lang/${pkgName}/package.json`).toString())

    return pkgJson.version
}

/**
 * @param {Context} context
 * @param {undefined | Comment} comment 
 * @returns {string}
 */
function stringifyComment(context, comment) {
    if (!comment) {
        return ""
    } else {
        return stringifyCommentDisplayParts(context, comment.summary)
    }
}

/**
 * @param {Context} context
 * @param {undefined | CommentDisplayPart[]} parts 
 * @returns {string}
 */
function stringifyCommentDisplayParts(context, parts) {
    let s = (parts ?? []).map(p => {
        if (p.kind == "text") {
            // escape `<` to avoid problems with mdx format
            return p.text.replaceAll("<", "&lt;")
        } else if (p.kind == "code") {
            return p.text
        } else if (p.kind == "inline-tag") {
            return stringifyInlineTag(context, p)
        } else {
            throw new Error(`comment display kind ${p.kind} unhandled`)
        }
    }).join("")

    return s.trim()
}

/**
 * @param {Context} context 
 * @param {InlineTagDisplayPart} part 
 * @returns {string}
 */
function stringifyInlineTag(context, part) {
    if (part.tag != "@link") {
        throw new Error(`${part.tag} inline-tag unhandled`)
    }

    let [href, text] = part.text.split("|")
    text = text ?? href

    let pkgName = context.currentPkgName;

    if (!href.startsWith("http") && !href.includes("://")) {
        const [topLevelName, member] = href.split(".")

        if (topLevelName in context.topLevelSymbolsPkgs) {
            pkgName = context.topLevelSymbolsPkgs[topLevelName]
        }

        href = getSymbolDocPath(pkgName, topLevelName)

        if (member) {
            href = `${href}#${member.toLowerCase()}`
        }
    }

    return `[${text}](${href})`
}

main()