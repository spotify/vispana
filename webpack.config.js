var path = require('path');

module.exports = {
    entry: './src/main/js/app.js',
    devtool: 'inline-source-map',
    cache: true,
    mode: 'development',
    output: {
        path: __dirname,
        filename: './src/main/resources/static/built/bundle.js'
    },
    devServer: {
        historyApiFallback: true
    },
    module: {
        rules: [
            {
                test: path.join(__dirname, '.'),
                exclude: /(node_modules)/,
                use: [{
                    loader: 'babel-loader',
                    options: {
                        presets: ["@babel/preset-env", "@babel/preset-react"]
                    }
                }]
            },
            {
                test: /\.css$/,
                include: path.resolve(__dirname, './src/main/'),
                use: ['style-loader', 'css-loader', 'postcss-loader'],
            },
        ]
    }
};
