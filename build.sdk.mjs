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
 * @import { Comment, CommentDisplayPart, ProjectReflection, SourceReference } from "typedoc"
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
        const name = child.name

        if (!child.sources || child.sources.length == 0) {
            throw new Error("sources not set for " + name)
        }

        const site = child.sources[0]

        let content = ""
        if (child.comment) {
            content = stringifyComment(pkgName, child.comment)
        }

        const symbolPath = getSymbolDocPath(pkgName, name)

        writeFileSync(`.${symbolPath}.md`, [
            "---",
            `sidebar_label: ${name}`,
            `custom_edit_url: ${getSymbolEditLink(pkgName, site)}`,
            "---",
            `# ${name}`,
            content
        ].join("\n"))
    }
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
 * @param {CommentDisplayPart[]} parts 
 * @returns {string}
 */
function stringifyCommentDisplayParts(pkgName, parts) {
    let s = parts.map(p => {
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

    return s
}

/**
 * @param {string} pkgName
 * @param {Comment} comment 
 * @returns {string}
 */
function stringifyComment(pkgName, comment) {
    return stringifyCommentDisplayParts(pkgName, comment.summary)
}

main()