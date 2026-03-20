import nextCoreWebVitals from "eslint-config-next/core-web-vitals"
import nextTypeScript from "eslint-config-next/typescript"

const config = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    ignores: [
      "AetherScan/**",
      ".tmp-dev-*.log",
      "tsconfig.tsbuildinfo",
    ],
  },
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
    },
  },
]

export default config
