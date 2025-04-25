import { readFile, readFileSync, writeFileSync } from "node:fs"

const MAIN_PACKAGES = [
    "cbor",
    "codec-utils",
    "compiler",
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

// TODO: turn this into a docusaurus plugin so it can operate during hot-reloads
/**
 * @import { Comment, CommentDisplayPart, DeclarationReflection, ParameterReflection, ProjectReflection, SignatureReflection, SomeType, SourceReference } from "typedoc"
 */

async function main() {
    for (let pkg of ALL_PACKAGES) {
        writePackageDocs(pkg)
    }
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
 * @param {string} pkgName 
 */
function writePackageDocs(pkgName) {
    const basePath = `.${getPackageDocPath(pkgName)}`

    /**
     * @type {ProjectReflection}
     */
    const pkgDoc = JSON.parse(readFileSync(`${basePath}/_typedoc_.json`).toString())

    const pkgVersion = getHeliosPackageVersion(pkgName)

    const readme = stringifyCommentDisplayParts(pkgName, pkgDoc.readme)
    writeFileSync(`${basePath}/index.md`, [
        "---",
        `sidebar_label: '${pkgName} v${pkgVersion}'`,
        "sidebar_position: 1",
        `custom_edit_url: https://github.com/HeliosLang/${pkgName}/blob/main/README.md`,
        `pagination_prev: ${getPaginationPrev(pkgName)}`,
        `pagination_next: ${getPaginationNext(pkgName)}`,
        "---",
        readme
    ].join("\n"))

    for (let child of pkgDoc.children) {
        writeSymbolDoc(pkgName, child)
    }
}

/**
 * @param {string} pkgName
 * @param {DeclarationReflection} child
 */
function writeSymbolDoc(pkgName, child) {
    switch (child.variant) {
        case "declaration":
            switch(child.kind) {
                case 4:
                    writeNamespaceDoc(pkgName, child)
                    return
                case 32:
                    writeConstantDoc(pkgName, child)
                    return
                case 64:
                    writeFunctionDoc(pkgName, child)
                    return
                case 128:
                    writeClassDoc(pkgName, child)
                    return
                case 256:
                    writeInterfaceDoc(pkgName, child)
                    return
                case 2097152:
                    writeTypeAliasDoc(pkgName, child)
                    return
            }
    }

    writeGenericSymbolDoc(pkgName, child)
}

/**
 * @param {string} pkgName 
 * @param {DeclarationReflection} child 
 * @returns {{name: string, path: string, site: SourceReference}}
 */
function getCommonSymbolInfo(pkgName, child) {
    const name = child.name

    const symbolPath = getSymbolDocPath(pkgName, name)

    if (!child.sources || child.sources.length == 0) {
        throw new Error("sources not set for " + name)
    }

    const site = child.sources[0]

    return {name, path: symbolPath, site}
}

/**
 * @param {string} pkgName 
 * @param {DeclarationReflection} child 
 */
function writeConstantDoc(pkgName, child) {
    const {name, path, site} = getCommonSymbolInfo(pkgName, child)

    const comment = stringifyComment(pkgName, child.comment)
    const typeSnippet = `<CodeBlock className="language-ts">export const ${name}${child.defaultValue == "..." ? ": " + stringifyType(pkgName, child.type) : " = " + child.defaultValue}</CodeBlock>` 

    const content = [
        `# <span className="constant_badge">${name}</span>`,
        comment,
        typeSnippet
    ]

    writeFileSync(`.${path}.md`, [
        
        "---",
        `title: ${name}`,
        `sidebar_label: ${name}`,
        `sidebar_class_name: constant_badge`,
        `custom_edit_url: ${getSymbolEditLink(pkgName, site)}`,
        "---",
        "",
        "import CodeBlock from '@theme/CodeBlock'",
        "",
        content.join("\n")
    ].join("\n"))
}

/**
 * @param {string} pkgName 
 * @param {DeclarationReflection} child 
 */
function writeFunctionDoc(pkgName, child) {
    const {name, path, site} = getCommonSymbolInfo(pkgName, child)

    const content = [
        `# <span className="function_badge">${name}</span>`,
    ]

    const overloads = child.signatures ?? []

    for (let i = 0; i < overloads.length; i++) {
        const overload = overloads[i]

        if (overloads.length > 1) {
            content.push(`\n## Overload ${i+1}`)
        }

        const comment = stringifyComment(pkgName, overload.comment)
        content.push(comment)

        const returnType = stringifyType(pkgName, overload.type)
        const parameters = overload.parameters ?? []
        const typeSnippet = `<CodeBlock className="language-ts">export function ${name}(${stringifyFunctionParams(pkgName, parameters)}): ${returnType}</CodeBlock>`
        content.push(typeSnippet)


        if (parameters.length > 0) {
            content.push("\n### Arguments\n")

            const tableParts = ["<table className=\"fn-arguments\"><thead><tr><th>Name</th><th>Type</th><th>Description</th></tr></thead><tbody>"]

            for (let p of parameters) {
                const pName = p.name
                const pType = stringifyType(pkgName, p.type)
                //const pTypeLines = pType.split("\n")
                const pDescription = stringifyComment(pkgName, p.comment)
                //const pDescriptionLines = pDescription.split("\n")

                tableParts.push(`<tr><td>${pName}</td><td>${pType}</td><td>${pDescription}</td></tr>`)

                //for (let i = 1; i < Math.max(pTypeLines.length, pDescriptionLines.length); i++) {
                //    content.push(`| | ${i < pTypeLines.length ? `<CodeBlock>${pTypeLines[i]}</CodeBlock>` : ""} | ${i < pDescriptionLines.length ? pDescriptionLines[i] : ""} |`)
                //}
            }

            tableParts.push("</tbody></table>")

            content.push(tableParts.join(""))
        }
        
        content.push("\n### Return value\n")
        const returnValueComment = stringifyCommentDisplayParts(pkgName, overload.comment?.blockTags?.find(bt => bt.tag == "@returns")?.content)
        if (returnValueComment != "") {
            content.push(returnValueComment + "\n")
        }
        content.push(`<CodeBlock className="language-ts">${returnType}</CodeBlock>\n`)
    }

    writeFileSync(`.${path}.md`, [
        
        "---",
        `title: ${name}`,
        `sidebar_label: ${name}`,
        `sidebar_class_name: function_badge`,
        `custom_edit_url: ${getSymbolEditLink(pkgName, site)}`,
        "---",
        "",
        "import CodeBlock from '@theme/CodeBlock'",
        "",
        content.join("\n")
    ].join("\n"))
}

/**
 * @param {string} pkgName 
 * @param {DeclarationReflection} decl 
 */
function writeInterfaceDoc(pkgName, decl) {
    const {name, path, site} = getCommonSymbolInfo(pkgName, decl)

    const comment = stringifyComment(pkgName, decl.comment)

    // generate the typeSnippet
    /**
     * @type {string[]}
     */
    const typeSnippet = [
        `<CodeBlock className="language-ts">export interface ${name} \\{`
    ]

    const typeSnippetIndent = "&nbsp;&nbsp;"

    for (let attr of decl.children) {
        const name = attr.name

        typeSnippet.push(`${typeSnippetIndent}[${name}](#${name.toLowerCase()})${stringifyMaybeFunctionProperty(pkgName, attr, typeSnippetIndent)}`)
    }

    typeSnippet.push('\\}</CodeBlock>')

    const content = [
        `# <span className="interface_badge">${name}</span>`,
        "",
        ...(comment != "" ? [comment, ""] : []),
        typeSnippet.join("\n"),
        ""
    ]

    const instanceName = name[0].toLowerCase() + name.slice(1)

    content.push("## Properties\n")

    // write a snippet each attribute
    for (let attr of decl.children) {
        const name = attr.name
        const attrComment = stringifyComment(pkgName, attr.comment)
        const attrType = stringifyType(pkgName, attr.type)

        content.push([
            `### \`${name}\``,
            "",
            ...(attrComment != "" ? [attrComment, ""] : []),
            `<CodeBlock className="language-ts">${instanceName}.${name} satisfies ${attrType}</CodeBlock>`,
            ""
        ].join("\n"))
    }

    writeFileSync(`.${path}.md`, [
        
        "---",
        `title: ${name}`,
        `sidebar_label: ${name}`,
        `sidebar_class_name: interface_badge`,
        `custom_edit_url: ${getSymbolEditLink(pkgName, site)}`,
        "---",
        "",
        "import CodeBlock from '@theme/CodeBlock'",
        "",
        content.join("\n")
    ].join("\n"))
}

/**
 * @param {string} pkgName 
 * @param {DeclarationReflection} child 
 */
function writeNamespaceDoc(pkgName, child) {
    const {name, path, site} = getCommonSymbolInfo(pkgName, child)

    const comment = stringifyComment(pkgName, child.comment)
    //const typeSnippet = `<CodeBlock className="language-ts">export const ${name}${child.defaultValue == "..." ? ": " + stringifyType(pkgName, child.type) : " = " + child.defaultValue}</CodeBlock>` 

    const content = [
        `# <span className="namespace_badge">${name}</span>`,
        comment,
      //  typeSnippet
    ]

    writeFileSync(`.${path}.md`, [
        
        "---",
        `title: ${name}`,
        `sidebar_label: ${name}`,
        `sidebar_class_name: namespace_badge`,
        `custom_edit_url: ${getSymbolEditLink(pkgName, site)}`,
        "---",
        "",
        "import CodeBlock from '@theme/CodeBlock'",
        "",
        content.join("\n")
    ].join("\n"))
}

/**
 * @param {string} pkgName 
 * @param {DeclarationReflection} child 
 */
function writeClassDoc(pkgName, child) {
    const {name, path, site} = getCommonSymbolInfo(pkgName, child)

    const comment = stringifyComment(pkgName, child.comment)
    //const typeSnippet = `<CodeBlock className="language-ts">export const ${name}${child.defaultValue == "..." ? ": " + stringifyType(pkgName, child.type) : " = " + child.defaultValue}</CodeBlock>` 

    const content = [
        `# <span className="class_badge">${name}</span>`,
        comment,
      //  typeSnippet
    ]

    writeFileSync(`.${path}.md`, [
        
        "---",
        `title: ${name}`,
        `sidebar_label: ${name}`,
        `sidebar_class_name: class_badge`,
        `custom_edit_url: ${getSymbolEditLink(pkgName, site)}`,
        "---",
        "",
        "import CodeBlock from '@theme/CodeBlock'",
        "",
        content.join("\n")
    ].join("\n"))
}

/**
 * @param {string} pkgName 
 * @param {DeclarationReflection} child 
 */
function writeTypeAliasDoc(pkgName, child) {
    const {name, path, site} = getCommonSymbolInfo(pkgName, child)

    const comment = stringifyComment(pkgName, child.comment)
    const beforeType = (child.type?.type == "union" && child.type?.types?.length > 2) ? "\n&nbsp;&nbsp;| " : ""
    const typeSnippet = `<CodeBlock className="language-ts">export type ${name} = ${beforeType}${stringifyType(pkgName, child.type)}</CodeBlock>` 

    const content = [
        `# <span className="type_badge">${name}</span>`,
        comment,
        typeSnippet
    ]

    writeFileSync(`.${path}.md`, [
        
        "---",
        `title: ${name}`,
        `sidebar_label: ${name}`,
        `sidebar_class_name: type_badge`,
        `custom_edit_url: ${getSymbolEditLink(pkgName, site)}`,
        "---",
        "",
        "import CodeBlock from '@theme/CodeBlock'",
        "",
        content.join("\n")
    ].join("\n"))
}

/**
 * @param {string} pkgName 
 * @param {ParameterReflection[]} params 
 * @param {string} indent
 * @returns {string}
 */
function stringifyFunctionParams(pkgName, params, indent = "") {
    if (params.length == 0) {
        return ""
    } else if (params.length == 1) {
        return `${params[0].name}: ${stringifyType(pkgName, params[0].type, indent)}`
    } else {
        const innerIndent = `${indent}&nbsp;&nbsp;`
        return "\n" + innerIndent + params.map(p => `${p.name}: ${stringifyType(pkgName, p.type, innerIndent)}`).join(",\n" + innerIndent) + "\n" + indent
    }
}

/**
 * @param {string} pkgName
 * @param {SomeType | undefined} t 
 * @param {string} indent
 * @returns {string}
 */
function stringifyType(pkgName, t, indent = "") {
    if (!t) {
        return "unknown"
    } else {
        switch(t.type) {
            case "array":
                return `${stringifyType(pkgName, t.elementType, indent)}[]`
            case "unknown":
            case "intrinsic":
                return t.name
            case "reference":
                const typeParams = t.typeArguments ? `&lt;${t.typeArguments.map(ta => stringifyType(pkgName, ta, indent)).join(", ")}>` : ""
                if (t.package == "typescript") {
                    switch(t.name) {
                        case "Uint8Array":
                            return `[Uint8Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array)`
                        default:
                            return t.name + typeParams
                    }
                } else {
                    const path = getSymbolDocPath(t.package ?? pkgName, t.name)
                    return `[${t.name}](${path})` + typeParams
                }
            case "reflection":
                if (t.declaration.children) {
                    const innerIndent = t.declaration.children?.length > 1 ? indent + "&nbsp;&nbsp;" : indent
                    const afterOpenBrace = t.declaration.children?.length > 1 ? "\n" + innerIndent : ""
                    const separator = t.declaration.children?.length > 1 ? afterOpenBrace : ", "
                    const beforeCloseBrace = t.declaration.children?.length > 1 ? "\n" + indent : ""

                    return `\\{${afterOpenBrace}${t.declaration.children.map(ct => {
                        const key = `${ct.name}${ct.flags.isOptional ? "?" : ""}`
                        return `${key}${stringifyMaybeFunctionProperty(pkgName, ct, innerIndent)}`
                    }).join(separator)}${beforeCloseBrace}\\}`
                } else {
                    return stringifyFunctionSignatures(pkgName, t.declaration.signatures, indent)
                }
            case "union":
                if (t.types.length <= 2) {
                    return t.types.map(ut => stringifyType(pkgName, ut, indent)).join(" | ")
                } else {
                    const innerIndent = indent + "&nbsp;&nbsp;"
                    return t.types.map(ut => stringifyType(pkgName, ut, innerIndent)).join(`\n${innerIndent}| `)
                }
            case "intersection":
                return t.types.map(it => stringifyType(pkgName, it, indent)).join(" & ")
            case "literal":
                if (typeof t.value == "string") {
                    return `"${t.value.replaceAll("{", "\\{")}"`
                } else {
                    return t.value
                }
            case "tuple":
                return `[${(t.elements ?? []).map(et => stringifyType(pkgName, et, indent)).join(", ")}]`
            default: 
                return "unknown"
        }
    }
}

/**
 * @param {string} pkgName 
 * @param {DeclarationReflection} decl 
 * @param {string} indent 
 * @returns {string}
 */
function stringifyMaybeFunctionProperty(pkgName, decl, indent = "") {
    const funcSignatures = decl.signatures && decl.signatures.length > 0 ? decl.signatures : (decl.type && decl.type.type == "reflection" && decl.type.declaration.signatures) ? decl.type.declaration.signatures : undefined
    const isFunction = !decl.flags.isOptional && (funcSignatures && funcSignatures.length > 0)
    const value =  isFunction ? 
        stringifyFunctionSignatures(pkgName, funcSignatures, indent, ": "): 
        decl.type ? 
            stringifyType(pkgName, decl.type, indent) : 
            "unknown"
    return `${isFunction ? "" : ": "}${value}`
}

/**
 * @param {string} pkgName 
 * @param {undefined | SignatureReflection[]} signatures 
 * @param {string} [indent]
 * @param {string} [arrow]
 * @returns {string}
 */
function stringifyFunctionSignatures(pkgName, signatures, indent = "", arrow = " => ") {
    if (signatures && signatures.length > 0) {
        const signature = signatures[0]

        return stringifyFunctionSignature(pkgName, signature, indent, arrow)
    } else {
        return "unknown"
    }
}

/**
 * @param {string} pkgName 
 * @param {SignatureReflection} signature 
 * @param {string} [indent]
 * @param {string} [arrow]
 * @returns {string}
 */
function stringifyFunctionSignature(pkgName, signature, indent = "", arrow = " => ") {
    return `(${stringifyFunctionParams(pkgName, signature.parameters ?? [], indent)})${arrow}${stringifyType(pkgName, signature.type, indent)}`
}
/**
 * @param {string} pkgName
 * @param {DeclarationReflection} child 
 */
function writeGenericSymbolDoc(pkgName, child) {
    const {name, path, site} = getCommonSymbolInfo(pkgName, child)

    let content = stringifyComment(pkgName, child.comment)

    writeFileSync(`.${path}.md`, [
        "---",
        `sidebar_label: ${name}`,
        `custom_edit_url: ${getSymbolEditLink(pkgName, site)}`,
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
 * @param {string} pkgName
 * @param {undefined | CommentDisplayPart[]} parts 
 * @returns {string}
 */
function stringifyCommentDisplayParts(pkgName, parts) {
    let s = (parts ?? []).map(p => {
        if (p.kind == "text") {
            // escape `<` to avoid problems with mdx format
            return p.text.replaceAll("<", "&lt;")
        } else if (p.kind == "code") {
            return p.text
        } else if (p.kind == "inline-tag") {
            return `[${p.text}](${getSymbolDocPath(pkgName, p.text)})`
        } else {
            throw new Error(`comment display kind ${p.kind} unhandled`)
        }
    }).join("")

    return s.trim()
}

/**
 * @param {string} pkgName
 * @param {undefined | Comment} comment 
 * @returns {string}
 */
function stringifyComment(pkgName, comment) {
    if (!comment) {
        return ""
    } else {
        return stringifyCommentDisplayParts(pkgName, comment.summary)
    }
}

main()