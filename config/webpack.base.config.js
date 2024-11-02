const path = require('path')
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin")
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const VueLoaderPlugin = require('vue-loader/lib/plugin')
const webpack = require('webpack')
const TerserPlugin = require("terser-webpack-plugin")
const CopyPlugin = require("copy-webpack-plugin")

module.exports = {
  entry: {
    index: path.join(__dirname, '../web/src/index.js'),
    'efss/index': path.join(__dirname, '../web/src/efss/index.js')
  },
  output: {
    filename: '[name].[contenthash].js',
    path: path.join(__dirname, '../web/dist')
  },
  module: {
    rules: [
      {
        test: /\.(png|jpe?g|gif)$/i,
        use: [
          {
            loader: 'file-loader',
          },
        ],
      }, {
        test: /\.(sa|sc|c)ss$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
          },
          {
            loader: 'css-loader',
          },
        ],
      }, {
        test: /\.vue$/,
        loader: 'vue-loader'
      },
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      VERSION: JSON.stringify(require('../package.json').version),
    }),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, '../web/src', 'index.html'),
      favicon: path.join(__dirname, '../web/src', 'favicon.ico'),
      inject: false,
      chunks: ['index'],
      minify: {
        minifyCSS: true
      }
    }),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, '../web/src/efss', 'index.html'),
      filename: 'efss/index.html',
      inject: false,
      publicPath: '/',
      chunks: ['efss/index'],
      minify: {
        minifyCSS: true
      }
    }),
    new CleanWebpackPlugin(),
    new VueLoaderPlugin(),
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css'
    }),
    new CopyPlugin({
      patterns: [
        { from: path.join(__dirname, '../web/src', 'manifest.json') },
        { from: path.join(__dirname, '../web/src', 'sw.js') },
      ],
    }),
  ],
  performance: {
    maxAssetSize: 1000000,
    maxEntrypointSize: 1000000,
  },
  optimization: {
    minimize: true,
    minimizer: [
      new CssMinimizerPlugin({
        minify: CssMinimizerPlugin.cleanCssMinify,
      }),
      new TerserPlugin({
        test: /\.js(\?.*)?$/i,
        extractComments: false,
        parallel: true,
      }),
    ],
  }
}