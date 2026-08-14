import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://evchargingstationnepal.com",
  trailingSlash: "ignore",
  integrations: [
    react(),
    sitemap({
      filter: (page) => !page.includes("/404") && !page.includes("/500"),
      serialize(item) {
        const url = item.url;
        if (url.endsWith("evchargingstationnepal.com/") || url.endsWith("evchargingstationnepal.com")) {
          item.priority = 1.0;
          item.changefreq = "daily";
        } else if (url.includes("/faq") || url.includes("/about") || url.includes("/contact")) {
          item.priority = 0.7;
          item.changefreq = "monthly";
        } else if (url.includes("/privacy") || url.includes("/terms")) {
          item.priority = 0.3;
          item.changefreq = "yearly";
        } else if (url.includes("/cities/") && url.split("/").filter(Boolean).length <= 2) {
          item.priority = 0.8;
          item.changefreq = "weekly";
        } else if (url.includes("/stations/") && !url.match(/\/stations\/.+\/$/)) {
          item.priority = 0.8;
          item.changefreq = "weekly";
        } else if (url.includes("/stations/")) {
          item.priority = 0.6;
          item.changefreq = "weekly";
        } else if (url.includes("/cities/")) {
          item.priority = 0.7;
          item.changefreq = "weekly";
        }
        return item;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
