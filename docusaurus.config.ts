import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Helios',
  tagline: 'Cardano smart contract DSL and JS/TS SDK',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://helios-lang.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'HeliosLang', // Usually your GitHub org/user name.
  projectName: 'docs', // Usually your repo name.

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  plugins: [],
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/HeliosLang/website/blob/main',
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],
  stylesheets: [
    {
      href: 'https://cdn.jsdelivr.net/npm/katex@0.13.24/dist/katex.min.css',
      type: 'text/css',
      integrity:
        'sha384-odtC+0UGzzFL/6PNoE8rX/SPcQDXBJ+uRepguP4QkPCm2LBxH3FA3y+fKSiJ+AmM',
      crossorigin: 'anonymous',
    },
  ],
  themeConfig: {
    // Replace with your project's social card
    image: 'img/logo.png',
    navbar: {
      title: 'Helios',
      logo: {
        alt: 'Helios',
        src: 'img/logo.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'learnSidebar',
          position: 'left',
          label: 'Learn'
        },
        {
          type: 'docSidebar',
          sidebarId: 'languageSidebar',
          position: 'left',
          label: 'Language guide',
        },
        {
          type: 'docSidebar',
          sidebarId: 'sdkSidebar',
          position: 'left',
          label: 'SDK reference'
        },
        {
          type: 'docSidebar',
          sidebarId: 'irisSidebar',
          position: 'left',
          label: 'Iris API'
        },
        {
          href: 'https://github.com/orgs/HeliosLang/repositories?q=visibility%3Apublic+archived%3Afalse+sort%3Aname-asc',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    docs: {
      sidebar: {
        hideable: true,
        autoCollapseCategories: true,
      },
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Learn',
              to: '/docs/learn/intro',
            },
            {
              label: 'Language guide',
              to: '/docs/lang/intro',
            },
            {
              label: 'SDK reference',
              to: '/docs/sdk/intro',
            },
            {
              label: 'Iris API',
              to: '/docs/iris/intro',
            }
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Discord',
              href: 'https://discord.gg/XTwPrvB25q',
            },
            {
              label: 'X',
              href: 'https://x.com/helios_lang',
            },
            {
              label: 'Stack Exchange',
              href: 'https://cardano.stackexchange.com/questions/tagged/helios',
            },
          ],
        }
      ],
      copyright: `© ${new Date().getFullYear()} Helios Lang`,
    },
    prism: {
      theme: prismThemes.vsLight,
      darkTheme: prismThemes.vsDark,
    },
    
  } satisfies Preset.ThemeConfig,
};

export default config;
