---
sidebar_label: How to install
sidebar_position: 1
---

# Installing Iris

When building from source you need `git`, `nodejs`, `npm`, `bash` and `go` v1.24 or later.

```sh
git clone https://github.com/HeliosLang/iris iris
cd iris
npm install
npm run build
```

Copy the generated `cardano-iris-0.1.0.deb` package to the server and run:

```sh
sudo dpkg -i cardano-iris-0.1.0.deb
```

During installation you will be asked if you want to configure `cardano-node` for preprod or mainnet.

