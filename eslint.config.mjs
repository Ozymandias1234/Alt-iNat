import { Linter } from "eslint";

/** @type {Linter.Config} */
export default {
  extends: ["next", "next/core-web-vitals"],
  rules: {
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "react-hooks/exhaustive-deps": "off",
    "@next/next/no-img-element": "off"
  }
};
