import url from '@rollup/plugin-url'
import svgr from '@svgr/rollup'
import babel from 'rollup-plugin-babel'
import commonjs from 'rollup-plugin-commonjs'
import json from 'rollup-plugin-json'
import resolve from 'rollup-plugin-node-resolve'
import replace from 'rollup-plugin-replace'
import { sizeSnapshot } from 'rollup-plugin-size-snapshot'
import { terser } from 'rollup-plugin-terser'

import pkg from './package.json'

const input = pkg.source
const { peerDependencies } = pkg
const external = Object.keys(peerDependencies)
external.push('@ufx-ui/utils')

const globals = {
  react: 'React',
  'react-dom': 'ReactDOM',
  '@ufx-ui/utils': 'UfxUIUtils',
}

const commonjsArgs = {
  include: /node_modules\/*/,
}

// Treat as externals all not relative and not absolute paths
// e.g. 'react'
const excludeAllExternals = (id) => !id.startsWith('.') && !id.startsWith('/')

const getBabelOptions = () => ({
  exclude: /node_modules/,
  runtimeHelpers: true,
  plugins: ['@babel/transform-runtime'],
})

const snapshotArgs = process.env.SNAPSHOT === 'match'
  ? {
    matchSnapshot: true,
    threshold: 1000,
  }
  : {}

const baseConfig = () => ({
  input,
  plugins: [
    json(),
    url(),
    svgr(),
    resolve({ preferBuiltins: true }),
    babel(getBabelOptions()),
    sizeSnapshot(snapshotArgs),
  ],
})

const baseUmdConfig = (minified) => {
  const config = Object.assign(baseConfig(), {
    external,
  })
  config.plugins.push(
    commonjs(commonjsArgs),
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
  )

  if (minified) {
    config.plugins.push(terser())
  }

  return config
}

/*
  COMMONJS / MODULE CONFIG
  ------------------------
  Goal of this configuration is to generate bundles to be consumed by bundlers.
  This configuration is not minimized and will exclude all dependencies.
*/
const libConfig = baseConfig()
// Do not include any of the dependencies
libConfig.external = excludeAllExternals
libConfig.output = [
  {
    name: 'UfxCore',
    file: pkg.main,
    format: 'cjs',
  },
  {
    name: 'UfxCore',
    file: pkg.module,
    format: 'es',
  },
]

/*
  UMD CONFIG
  ----------
  Goal of this configuration is to be directly included on web pages.
  This configuration will include dependencies that are not
  marked as peer dependencies.
*/
const umdConfig = baseUmdConfig(false)
umdConfig.external = external
umdConfig.output = [
  {
    globals,
    name: 'UfxCore',
    file: 'dist/ufx-core.umd.js',
    format: 'umd',
  },
]

const umdConfigMin = baseUmdConfig(true)
umdConfigMin.external = external
umdConfigMin.output = [
  {
    globals,
    name: 'UfxCore',
    file: 'dist/ufx-core.umd.min.js',
    format: 'umd',
  },
]

export default [
  libConfig,
  umdConfig,
  umdConfigMin,
]
