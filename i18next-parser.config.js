export default {
  contextSeparator: "_",
  createOldCatalogs: false,
  defaultNamespace: "common",
  defaultValue: "",
  indentation: 2,
  keepRemoved: false,
  keySeparator: ".",
  lexers: {
    ts: ["JavascriptLexer"],
    tsx: ["JsxLexer"],
    default: ["JavascriptLexer"],
  },
  locales: ["id", "en"],
  namespaceSeparator: ":",
  output: "src/locales/$LOCALE/$NAMESPACE.json",
  input: ["src/**/*.{ts,tsx}"],
  sort: true,
};
