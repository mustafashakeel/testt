cordova.define('cordova/plugin_list', function(require, exports, module) {
module.exports = [
    {
        "id": "cordova-plugin-console.logger",
        "file": "plugins/cordova-plugin-console/www/logger.js",
        "pluginId": "cordova-plugin-console",
        "clobbers": [
            "cordova.logger"
        ]
    },
    {
        "id": "cordova-plugin-console.console",
        "file": "plugins/cordova-plugin-console/www/console-via-logger.js",
        "pluginId": "cordova-plugin-console",
        "clobbers": [
            "console"
        ]
    },
    {
        "id": "cordova-plugin-device.device",
        "file": "plugins/cordova-plugin-device/www/device.js",
        "pluginId": "cordova-plugin-device",
        "clobbers": [
            "device"
        ]
    },
    {
        "id": "cordova-plugin-device.DeviceProxy",
        "file": "plugins/cordova-plugin-device/src/windows/DeviceProxy.js",
        "pluginId": "cordova-plugin-device",
        "merges": [
            ""
        ]
    },
    {
        "id": "cordova-plugin-splashscreen.SplashScreen",
        "file": "plugins/cordova-plugin-splashscreen/www/splashscreen.js",
        "pluginId": "cordova-plugin-splashscreen",
        "clobbers": [
            "navigator.splashscreen"
        ]
    },
    {
        "id": "cordova-plugin-splashscreen.SplashScreenProxy",
        "file": "plugins/cordova-plugin-splashscreen/www/windows/SplashScreenProxy.js",
        "pluginId": "cordova-plugin-splashscreen",
        "runs": true
    },
    {
        "id": "cordova-plugin-statusbar.statusbar",
        "file": "plugins/cordova-plugin-statusbar/www/statusbar.js",
        "pluginId": "cordova-plugin-statusbar",
        "clobbers": [
            "window.StatusBar"
        ]
    },
    {
        "id": "cordova-plugin-statusbar.StatusBarProxy",
        "file": "plugins/cordova-plugin-statusbar/src/windows/StatusBarProxy.js",
        "pluginId": "cordova-plugin-statusbar",
        "runs": true
    },
    {
        "id": "cordova-sqlite-storage.SQLitePlugin",
        "file": "plugins/cordova-sqlite-storage/www/SQLitePlugin.js",
        "pluginId": "cordova-sqlite-storage",
        "clobbers": [
            "SQLitePlugin"
        ]
    },
    {
        "id": "cordova-sqlite-storage.SQLiteProxy",
        "file": "plugins/cordova-sqlite-storage/src/windows/sqlite-proxy.js",
        "pluginId": "cordova-sqlite-storage",
        "runs": true
    },
    {
        "id": "cordova-sqlite-storage.SQLite3",
        "file": "plugins/cordova-sqlite-storage/src/windows/SQLite3-Win-RT/SQLite3JS/js/SQLite3.js",
        "pluginId": "cordova-sqlite-storage",
        "runs": true
    },
    {
        "id": "ionic-plugin-keyboard.KeyboardProxy",
        "file": "plugins/ionic-plugin-keyboard/src/windows/KeyboardProxy.js",
        "pluginId": "ionic-plugin-keyboard",
        "clobbers": [
            "cordova.plugins.Keyboard"
        ],
        "runs": true
    },
    {
        "id": "cordova-hot-code-push-plugin.chcp",
        "file": "plugins/cordova-hot-code-push-plugin/www/chcp.js",
        "pluginId": "cordova-hot-code-push-plugin",
        "clobbers": [
            "chcp"
        ]
    }
];
module.exports.metadata = 
// TOP OF METADATA
{
    "cordova-plugin-console": "1.0.5",
    "cordova-plugin-device": "1.1.4",
    "cordova-plugin-splashscreen": "4.0.3",
    "cordova-plugin-statusbar": "2.2.2",
    "cordova-plugin-whitelist": "1.3.1",
    "cordova-sqlite-storage": "2.0.4",
    "ionic-plugin-keyboard": "2.2.1",
    "cordova-hot-code-push-plugin": "1.5.3"
};
// BOTTOM OF METADATA
});