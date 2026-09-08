import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { runInNewContext } from "node:vm";

const nativeRequire = createRequire(path.join(process.cwd(), "package.json"));
const ts = nativeRequire("typescript");
const babel = nativeRequire("@babel/core");
const expoRequire = createRequire(nativeRequire.resolve("expo/package.json"));
const presetDirectory = path.dirname(expoRequire.resolve("babel-preset-expo"));
const { expoInlineEnvVars } = nativeRequire(path.join(presetDirectory, "plugins/inline-env-vars"));

test("production Expo transform embeds configured origins without runtime process env", () => {
  const previous = process.env.EXPO_PUBLIC_API_BASE_URL;
  process.env.EXPO_PUBLIC_API_BASE_URL = "https://build.example.test";
  try {
    const source = readFileSync(path.join(process.cwd(), "src/data/api.ts"), "utf8");
    const js = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const result = babel.transformSync(js, {
      babelrc: false, configFile: false, caller: { name: "metro", isDev: false },
      plugins: [expoInlineEnvVars],
    });
    const runtime = {
      exports: {} as { resolveApiBaseUrl: (platform: string) => string },
      require: () => ({ Platform: { OS: "ios" } }),
      process: { env: {} }, __DEV__: false, URL,
    };
    runInNewContext(result.code, runtime);
    expect(runtime.exports.resolveApiBaseUrl("ios")).toBe("https://build.example.test");
    expect(runtime.exports.resolveApiBaseUrl("android")).toBe("https://build.example.test");
  } finally {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL;
    else process.env.EXPO_PUBLIC_API_BASE_URL = previous;
  }
});
