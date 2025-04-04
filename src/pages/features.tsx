import { ReactNode } from "react"

export type FeatureItem = {
    title: string
    description: ReactNode
}

export const features: FeatureItem[] = [
  {
    title: 'Designed for audits',
    description: (
      <>
        The Helios Domain Specific Language (DSL) is a simple C-like language, designed for readability and auditable.
      </>
    ),
  },
  {
    title: 'Optimal UPLC',
    description: (
      <>
        Helios has one of the most advanced compilers in Cardano, producing compact and efficient on-chain bytecode.
      </>
    ),
  },
  {
    title: 'No external dependencies',
    description: (
      <>
        The Helios compiler and tx-building SDK don't have external dependencies, minimizing supply chain risks.
      </>
    ),
  },
  /*{
    title: 'No WASM',
    description: (
      <>
        Helios doesn't use WASM, ensuring DApps built with Helios run anywhere.
      </>
    ),
  },*/
]