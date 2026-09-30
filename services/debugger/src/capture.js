import { validCompilationContext } from "./compilation.js"
const hex = (value) =>
    typeof value === "string" && /^(?:[0-9a-f]{2})+$/.test(value)
const object = (value) =>
    value !== null && typeof value === "object" && !Array.isArray(value)
export function validCapture(c) {
    if (
        !object(c) ||
        c.version !== 1 ||
        typeof c.captureId !== "string" ||
        !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(c.captureId) ||
        !["failed", "succeeded"].includes(c.status) ||
        !Array.isArray(c.evaluations)
    )
        return false
    if (
        c.sources !== undefined &&
        (!object(c.sources) ||
            !Object.values(c.sources).every((s) => typeof s === "string"))
    )
        return false
    if (c.transactionCbor !== undefined && !hex(c.transactionCbor)) return false
    return c.evaluations.every(
        (e) =>
            object(e) &&
            (e.compilation === undefined || validCompilationContext(e.compilation)) &&
            ["construction", "validation"].includes(e.phase) &&
            typeof e.scriptHash === "string" &&
            /^[a-f0-9]{56}$/.test(e.scriptHash) &&
            hex(e.programCbor) &&
            ["PlutusScriptV1", "PlutusScriptV2", "PlutusScriptV3"].includes(
                e.plutusVersion
            ) &&
            Array.isArray(e.arguments) &&
            e.arguments.every(hex) &&
            object(e.result) &&
            (typeof e.result.error === "string" ||
                typeof e.result.value === "string") &&
            object(e.budget) &&
            ["cpu", "mem"].every(
                (k) =>
                    typeof e.budget[k] === "string" && /^\d+$/.test(e.budget[k])
            ) &&
            object(e.evaluation) &&
            e.evaluation.costModel === "explicit" &&
            Array.isArray(e.evaluation.costModelParams) &&
            e.evaluation.costModelParams.every(Number.isSafeInteger) &&
            typeof e.evaluation.uplcVersion === "string" &&
            (!e.companion ||
                (object(e.companion) &&
                    hex(e.companion.programCbor) &&
                    object(e.companion.sourceMap)))
    )
}
