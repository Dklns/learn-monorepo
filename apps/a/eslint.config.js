import importPlugin from "eslint-plugin-import";
import tseslint from "typescript-eslint";

export default tseslint.config({
  files: ["src/**/*.{ts,tsx}"],
  extends: [tseslint.configs.base],
  plugins: { import: importPlugin },
  rules: {
    "import/no-relative-packages": "error",
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          { group: ["../../b/**", "../../b/*"], message: "禁止跨应用引用" },
        ],
      },
    ],
  },
  settings: {
    "import/resolver": {
      typescript: { alwaysTryTypes: true },
    },
  },
});
