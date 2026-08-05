#!/usr/bin/env node
// Detects the web framework + broader tech stack in the current project and prints a JSON descriptor to stdout.
// Used by /qa-my-app:init and /qa-my-app:sync as dynamic context and persisted into QA-tests/catalog.json.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const has = (p) => existsSync(join(cwd, p));
const readJson = (p) => { try { return JSON.parse(readFileSync(join(cwd, p), "utf8")); } catch { return null; } };
const readText = (p) => { try { return readFileSync(join(cwd, p), "utf8"); } catch { return ""; } };

// ---- Stack detection ---------------------------------------------------------
// Returns a rich descriptor of the project's tech stack independent of framework.
// The init skill persists this in QA-tests/catalog.json so the runner can reason
// about validators, state stores, and pre-existing test infra.
function detectStack() {
  const pkg = readJson("package.json") || {};
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const has1 = (k) => Boolean(deps[k]);
  const stack = {
    languages: [],
    runtime: null,
    packageManager: null,
    buildTool: null,
    repoType: "single",
    uiLibraries: [],
    stateManagement: [],
    forms: [],
    validation: [],
    httpClient: [],
    styling: [],
    testFrameworks: [],
    e2eFrameworks: [],
    nodeVersion: pkg.engines?.node || null,
  };

  // Languages
  if (has1("typescript") || has("tsconfig.json")) stack.languages.push("typescript");
  if (has("package.json")) stack.languages.push("javascript");
  if (has("pubspec.yaml")) stack.languages.push("dart");
  if (walkFirst(".", (p) => p.endsWith(".csproj"))) { stack.languages.push("csharp"); stack.runtime = stack.runtime || "dotnet"; }
  if (has("pyproject.toml") || has("requirements.txt")) stack.languages.push("python");
  if (has("go.mod")) stack.languages.push("go");

  // Runtime
  if (has("package.json")) stack.runtime = stack.runtime || "node";
  if (has("deno.json") || has("deno.jsonc")) stack.runtime = "deno";
  if (has("bun.lockb") || has("bunfig.toml")) stack.runtime = "bun";

  // Package manager
  if (has("pnpm-lock.yaml")) stack.packageManager = "pnpm";
  else if (has("yarn.lock")) stack.packageManager = "yarn";
  else if (has("bun.lockb")) stack.packageManager = "bun";
  else if (has("package-lock.json")) stack.packageManager = "npm";

  // Monorepo
  if (has("nx.json")) stack.repoType = "monorepo-nx";
  else if (has("turbo.json")) stack.repoType = "monorepo-turborepo";
  else if (has("lerna.json")) stack.repoType = "monorepo-lerna";
  else if (has("pnpm-workspace.yaml")) stack.repoType = "monorepo-pnpm";
  else if (Array.isArray(pkg.workspaces) || pkg.workspaces?.packages) stack.repoType = "monorepo-npm-workspaces";

  // Build tool
  if (has1("vite")) stack.buildTool = "vite";
  else if (has1("webpack")) stack.buildTool = "webpack";
  else if (has1("rollup")) stack.buildTool = "rollup";
  else if (has1("esbuild")) stack.buildTool = "esbuild";
  else if (has1("parcel")) stack.buildTool = "parcel";
  else if (has1("@angular/cli")) stack.buildTool = "angular-cli";
  else if (has1("next")) stack.buildTool = "next";
  else if (has1("@remix-run/dev")) stack.buildTool = "remix";

  // UI libraries
  const ui = [
    ["@mui/material", "mui"],
    ["@mantine/core", "mantine"],
    ["@chakra-ui/react", "chakra"],
    ["antd", "ant-design"],
    ["@radix-ui/react-dialog", "radix"],
    ["@headlessui/react", "headless-ui"],
    ["@nextui-org/react", "nextui"],
    ["react-bootstrap", "react-bootstrap"],
    ["vuetify", "vuetify"],
    ["primevue", "primevue"],
    ["primeng", "primeng"],
    ["@angular/material", "angular-material"],
    ["@ionic/angular", "ionic"],
  ];
  for (const [d, n] of ui) if (has1(d)) stack.uiLibraries.push(n);
  if (has1("shadcn-ui") || has("components.json")) stack.uiLibraries.push("shadcn-ui");

  // Styling
  if (has1("tailwindcss")) stack.styling.push("tailwind");
  if (has1("styled-components")) stack.styling.push("styled-components");
  if (has1("@emotion/react")) stack.styling.push("emotion");
  if (has1("sass")) stack.styling.push("sass");

  // State management
  if (has1("redux") || has1("@reduxjs/toolkit")) stack.stateManagement.push("redux");
  if (has1("zustand")) stack.stateManagement.push("zustand");
  if (has1("jotai")) stack.stateManagement.push("jotai");
  if (has1("mobx")) stack.stateManagement.push("mobx");
  if (has1("pinia")) stack.stateManagement.push("pinia");
  if (has1("@ngrx/store")) stack.stateManagement.push("ngrx");

  // Forms
  if (has1("react-hook-form")) stack.forms.push("react-hook-form");
  if (has1("formik")) stack.forms.push("formik");
  if (has1("@tanstack/react-form")) stack.forms.push("tanstack-form");
  if (has1("@angular/forms")) stack.forms.push("angular-reactive-forms");
  if (has1("vee-validate")) stack.forms.push("vee-validate");

  // Validation
  if (has1("zod")) stack.validation.push("zod");
  if (has1("yup")) stack.validation.push("yup");
  if (has1("valibot")) stack.validation.push("valibot");
  if (has1("joi")) stack.validation.push("joi");
  if (has1("class-validator")) stack.validation.push("class-validator");

  // HTTP / data layer
  if (has1("axios")) stack.httpClient.push("axios");
  if (has1("ky")) stack.httpClient.push("ky");
  if (has1("@tanstack/react-query") || has1("@tanstack/query-core")) stack.httpClient.push("tanstack-query");
  if (has1("swr")) stack.httpClient.push("swr");
  if (has1("@apollo/client")) stack.httpClient.push("apollo");
  if (has1("urql")) stack.httpClient.push("urql");

  // Existing test stacks (informational — the runner does NOT re-use these)
  if (has1("jest")) stack.testFrameworks.push("jest");
  if (has1("vitest")) stack.testFrameworks.push("vitest");
  if (has1("mocha")) stack.testFrameworks.push("mocha");
  if (has1("@testing-library/react")) stack.testFrameworks.push("testing-library-react");
  if (has1("karma")) stack.testFrameworks.push("karma");
  if (has1("@playwright/test")) stack.e2eFrameworks.push("playwright");
  if (has1("cypress")) stack.e2eFrameworks.push("cypress");
  if (has1("@web/test-runner")) stack.e2eFrameworks.push("web-test-runner");

  return stack;
}

function walkFirst(dir, predicate, max = 2000) {
  if (!has(dir)) return null;
  const stack = [dir];
  let count = 0;
  while (stack.length && count++ < max) {
    const cur = stack.pop();
    let entries;
    try { entries = readdirSync(join(cwd, cur), { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (e.name.startsWith(".") || e.name === "node_modules" || e.name === "dist" || e.name === "build") continue;
      const p = join(cur, e.name).replace(/\\/g, "/");
      if (e.isDirectory()) stack.push(p);
      else if (predicate(p, e.name)) return p;
    }
  }
  return null;
}

function detect() {
  const pkg = readJson("package.json") || {};
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  // Next.js
  if (deps.next) {
    const appRouter = has("app") || has("src/app");
    const pagesRouter = has("pages") || has("src/pages");
    return {
      framework: appRouter ? "next-app" : "next-pages",
      routeGlobs: appRouter
        ? ["app/**/page.{ts,tsx,js,jsx}", "src/app/**/page.{ts,tsx,js,jsx}"]
        : ["pages/**/*.{ts,tsx,js,jsx}", "src/pages/**/*.{ts,tsx,js,jsx}"],
      componentGlobs: ["components/**/*.{ts,tsx,js,jsx}", "src/components/**/*.{ts,tsx,js,jsx}"],
      devUrl: "http://localhost:3000",
      runDev: pkg.scripts?.dev ? "npm run dev" : null,
      hasPagesRouter: pagesRouter && appRouter,
    };
  }

  // Remix
  if (deps["@remix-run/react"] || deps["@remix-run/node"]) {
    return {
      framework: "remix",
      routeGlobs: ["app/routes/**/*.{ts,tsx,js,jsx}"],
      componentGlobs: ["app/components/**/*.{ts,tsx,js,jsx}"],
      devUrl: "http://localhost:3000",
      runDev: pkg.scripts?.dev ? "npm run dev" : null,
    };
  }

  // SvelteKit
  if (deps["@sveltejs/kit"]) {
    return {
      framework: "sveltekit",
      routeGlobs: ["src/routes/**/+page.svelte"],
      componentGlobs: ["src/lib/**/*.svelte"],
      devUrl: "http://localhost:5173",
      runDev: pkg.scripts?.dev ? "npm run dev" : null,
    };
  }

  // Angular
  if (deps["@angular/core"]) {
    return {
      framework: "angular",
      routeGlobs: ["src/**/*-routing.module.ts", "src/**/*.routes.ts", "src/app/app.routes.ts"],
      componentGlobs: ["src/app/**/*.component.{ts,html}"],
      devUrl: "http://localhost:4200",
      runDev: pkg.scripts?.start ? "npm start" : null,
    };
  }

  // Vue 3
  if (deps.vue && deps["vue-router"]) {
    return {
      framework: "vue-router",
      routeGlobs: ["src/router/**/*.{ts,js}", "src/routes/**/*.{ts,js}"],
      componentGlobs: ["src/views/**/*.vue", "src/components/**/*.vue", "src/pages/**/*.vue"],
      devUrl: "http://localhost:5173",
      runDev: pkg.scripts?.dev ? "npm run dev" : null,
    };
  }

  // Vite + React Router
  if (deps.vite && (deps["react-router-dom"] || deps["react-router"])) {
    return {
      framework: "vite-react",
      routeGlobs: ["src/**/{router,routes,App}.{ts,tsx,js,jsx}"],
      componentGlobs: ["src/**/*.{ts,tsx,js,jsx}"],
      devUrl: "http://localhost:5173",
      runDev: pkg.scripts?.dev ? "npm run dev" : null,
    };
  }

  // Generic Vite + React (no router lib) — fall back to looking for Routes JSX
  if (deps.vite && deps.react) {
    return {
      framework: "vite-react",
      routeGlobs: ["src/**/*.{ts,tsx,js,jsx}"],
      componentGlobs: ["src/**/*.{ts,tsx,js,jsx}"],
      devUrl: "http://localhost:5173",
      runDev: pkg.scripts?.dev ? "npm run dev" : null,
    };
  }

  // Blazor (.NET)
  const csproj = walkFirst(".", (p) => p.endsWith(".csproj"));
  if (csproj && readText(csproj).match(/Microsoft\.AspNetCore\.Components/)) {
    return {
      framework: "blazor",
      routeGlobs: ["**/*.razor"],
      componentGlobs: ["**/*.razor"],
      devUrl: "http://localhost:5000",
      runDev: "dotnet run",
    };
  }

  // Flutter
  if (has("pubspec.yaml")) {
    return {
      framework: "flutter-web",
      routeGlobs: ["lib/**/*.dart"],
      componentGlobs: ["lib/**/*.dart"],
      devUrl: "http://localhost:8080",
      runDev: "flutter run -d chrome",
    };
  }

  // Plain HTML
  const html = walkFirst(".", (p, n) => n.endsWith(".html") && !p.includes("node_modules"));
  if (html) {
    return {
      framework: "plain",
      routeGlobs: ["**/*.html"],
      componentGlobs: [],
      devUrl: "http://localhost:8080",
      runDev: "npx http-server -p 8080",
    };
  }

  return { framework: "unknown", routeGlobs: [], componentGlobs: [], devUrl: null, runDev: null };
}

const frameworkInfo = detect();
const stack = detectStack();
process.stdout.write(JSON.stringify({ ...frameworkInfo, stack }, null, 2));
