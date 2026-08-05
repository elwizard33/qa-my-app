// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// Project GitHub Pages site: https://elwizard33.github.io/qa-my-app/
// `base` must match the repo name for project pages to resolve assets/links.
export default defineConfig({
  site: 'https://elwizard33.github.io',
  base: '/qa-my-app',
  integrations: [
    starlight({
      title: 'QA My App',
      description:
        'End-to-end QA testing as a Claude Code plugin. Auto-discovers your stack and routes, drives every page in a real browser, runs the whole platform in parallel, and files defects.',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/elwizard33/qa-my-app',
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/elwizard33/qa-my-app/edit/main/site/',
      },
      lastUpdated: true,
      sidebar: [
        {
          label: 'Start here',
          items: [
            { label: 'Install', slug: 'start/install' },
            { label: 'Quickstart', slug: 'start/quickstart' },
            { label: 'When to use it', slug: 'start/when-to-use' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'How it works (task catalog)', slug: 'guides/how-it-works' },
            { label: 'What /qa-my-app:init does', slug: 'guides/init' },
            { label: 'Authenticating protected routes', slug: 'guides/authentication' },
            { label: 'Connecting issue trackers', slug: 'guides/issue-trackers' },
            { label: 'Generated layout', slug: 'guides/generated-layout' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Commands', slug: 'reference/commands' },
            { label: 'Subagents', slug: 'reference/subagents' },
            { label: 'Settings', slug: 'reference/settings' },
            { label: 'Supported frameworks', slug: 'reference/frameworks' },
            { label: 'Architecture', slug: 'reference/architecture' },
          ],
        },
        {
          label: 'Browser engines',
          items: [
            { label: 'Overview', slug: 'browsers' },
            { label: 'Playwright (default)', slug: 'browsers/playwright' },
            { label: 'Chrome DevTools', slug: 'browsers/chrome-devtools' },
            { label: 'Stagehand / Browserbase', slug: 'browsers/stagehand' },
          ],
        },
      ],
    }),
  ],
});
