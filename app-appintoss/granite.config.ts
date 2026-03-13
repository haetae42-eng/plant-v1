import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "aquarellegarden",
  brand: {
    displayName: "해태 나만의 정원",
    primaryColor: "#5B8A62",
    icon: ""
  },
  web: {
    host: "localhost",
    port: 5175,
    commands: {
      dev: "npm run dev:web",
      build: "npm run build:web"
    }
  },
  permissions: [],
  outdir: "dist",
  webViewProps: {
    type: "game"
  }
});
