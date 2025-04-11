import { readFileSync, writeFileSync } from "node:fs"

// TODO: turn this into a docusaurus plugin so it can operate during hot-reloads
/**
 * @import { Comment, CommentDisplayPart, ProjectReflection } from "typedoc"
 */

async function main() {
    for (let pkg of ["cbor", "crypto"]) {
        writePackageDocs(pkg)
    }
}

/**
 * @param {string} pkgName 
 */
function writePackageDocs(pkgName) {
 /**
     * @type {ProjectReflection}
     */
    const pkgDoc = JSON.parse(readFileSync(`./docs/sdk/${pkgName}/_typedoc_.json`).toString())

    writeFileSync(`./docs/sdk/${pkgName}/index.md`, `---\ncustom_edit_url: https://github.com/HeliosLang/${pkgName}/blob/main/README.md\n---\n${stringifyCommentDisplayParts(pkgDoc.readme)}`)

    for (let child of pkgDoc.children) {
        const name = child.name

        if (!child.sources || child.sources.length == 0) {
            throw new Error("sources not set for " + name)
        }

        const site = child.sources[0]

        let content = ""
        if (child.comment) {
            content = stringifyComment(child.comment)
        }

        writeFileSync(`./docs/sdk/${pkgName}/${name}.md`, `---\ncustom_edit_url: https://github.com/HeliosLang/${pkgName}/blob/main/src/${site.fileName}#L${site.line}\n---\n# ${name}\n${content}`)
    }
}

/**
 * @param {CommentDisplayPart[]} parts 
 * @returns {string}
 */
function stringifyCommentDisplayParts(parts) {
    return parts.map(p => {
        if (p.kind == "text") {
            return p.text
        } else if (p.kind == "code") {
            return p.text
        } else {
            throw new Error(`comment display kind ${p.kind} unhandled`)
        }
    }).join("")
}

/**
 * @param {Comment} comment 
 * @returns {string}
 */
function stringifyComment(comment) {
    return stringifyCommentDisplayParts(comment.summary)
}

main()