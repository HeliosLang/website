import siteConfig from '@generated/docusaurus.config';
export default function prismIncludeLanguages(PrismObject) {
  const {
    themeConfig: {prism},
  } = siteConfig;
  const {additionalLanguages} = prism;
  // Prism components work on the Prism instance on the window, while prism-
  // react-renderer uses its own Prism instance. We temporarily mount the
  // instance onto window, import components to enhance it, then remove it to
  // avoid polluting global namespace.
  // You can mutate PrismObject: registering plugins, deleting languages... As
  // long as you don't re-assign it
  const PrismBefore = globalThis.Prism;
  globalThis.Prism = PrismObject;

  if (!additionalLanguages.includes("helios")) {
    additionalLanguages.push("helios");
  }

  additionalLanguages.forEach((lang) => {
    if (lang === 'helios') {
      // eslint-disable-next-line global-require
      Prism.languages.helios = {
        'comment': {
          pattern: /\/\/(?:[^\r\n\\]|\\(?:\r\n?|\n|(?![\r\n])))*|\/\*[\s\S]*?(?:\*\/|$)/,
          greedy: true
        },
        'string': {
          // https://en.cppreference.com/w/c/language/string_literal
          pattern: /(?:(b)?"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|\#[\da-fA-F]*)/,
          greedy: true
        },
        'keyword': /\b(?:as|assert|const|copy|default|else|enum|error|extern|from|func|if|import|minting|module|print|spending|staking|struct|switch|testing)\b/,
        'boolean': /\b(?:false|true)\b/,
        'class-name': [
          {
            pattern: /\b(?:Bool|ByteArray|Data|Int|Map|Option|Real|String)\b/,
          },
          {
            pattern: /(\b(?:enum|struct)\s+)\w+|\b[a-z]\w*_t\b/,
            lookbehind: true
          },
        ],
        'function': /\b[a-z_]\w*(?=\s*\()/i,
        'number': /(?:\b0x(?:[\da-f]+)|\b0b[01]+|\b0o[0-7]+|(?:\b\d[\d_]*(?:\.[\d_]*)?|\B\.\d+))/i,
        'operator': />>=?|<<=?|->|([-+&|:])\1|[?:~]|[-+*/%&|^!=<>]=?/,
      };
    } else {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      require(`prismjs/components/prism-${lang}`);
    }
  });
  // Clean up and eventually restore former globalThis.Prism object (if any)
  delete globalThis.Prism;
  if (typeof PrismBefore !== 'undefined') {
    globalThis.Prism = PrismObject;
  }
}
