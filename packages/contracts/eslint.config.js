import eslint from "@eslint/js";

export default [
  eslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: await import("typescript-eslint").then((m) => m.parser),
    },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@prisma/client", "@prisma/*"],
              message: "Contracts package must not import Prisma or database types",
            },
          ],
        },
      ],
    },
  },
];