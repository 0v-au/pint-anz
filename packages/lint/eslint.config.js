import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  {
    files: ["src/**/*.ts"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },
  {
    files: ["bin/**/*.js"],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: {
        process: "readonly",
      },
    },
  },
);
