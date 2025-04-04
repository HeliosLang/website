import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

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

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './src/sidebars.ts',
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/HeliosLang/website',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
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
          sidebarId: 'documentationSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'https://github.com/orgs/HeliosLang/repositories?q=visibility%3Apublic+archived%3Afalse+sort%3Aname-asc',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Language guide',
              to: '/docs/category/language-guide',
            },
          ],
        },
        {
          title: 'Support',
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
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
