
import {
    PageConfig
} from '@jupyterlab/coreutils';

import 'font-awesome/css/font-awesome.min.css';
import '@jupyterlab/theming/style/index.css';

import {
    ElectronJupyterLab as app
} from './electron-extension';

import {
    JupyterAppChannels as Channels
} from '../ipc';

let ipcRenderer = (window as any).require('electron').ipcRenderer;
import extensions from './extensions'

function main() : void {
    let version : string = PageConfig.getOption('appVersion') || 'unknown';
    let name : string = PageConfig.getOption('appName') || 'JupyterLab';
    let namespace : string = PageConfig.getOption('appNamespace') || 'jupyterlab';
    let devMode : string  = PageConfig.getOption('devMode') || 'false';
    let settingsDir : string = PageConfig.getOption('settingsDir') || '';
    let assetsDir : string = PageConfig.getOption('assetsDir') || '';
    let moon = document.getElementById('moon1');
    let splash = document.getElementById('universe');
    let platformSet : Promise<string>;

    // Get platform information from main process
    ipcRenderer.send(Channels.GET_PLATFORM);
    platformSet = new Promise( (resolve, reject) => {
        ipcRenderer.on(Channels.SEND_PLATFORM, (event: any, args: string) => {
            resolve(args);
        });
    });
    
    if (version[0] === 'v') {
        version = version.slice(1);
    }

    // The splash screen roation animation is infinite
    // When the "fade" animation is triggererd and ends
    // the splash screen is set to hidden
    splash.addEventListener('animationend', function fade() {
        splash.style.visibility = 'hidden';
        splash.removeEventListener('animationend', fade);
    });

    let lab = new app({
        namespace: namespace,
        name: name,
        version: version,
        devMode: devMode.toLowerCase() === 'true',
        settingsDir: settingsDir,
        assetsDir: assetsDir,
        mimeExtensions: extensions.mime
    });

    try {
        lab.registerPluginModules(extensions.jupyterlab);
    } catch (e) {
        console.error(e);
    }
    
    // Ignore Plugins
    let ignorePlugins : string[] = [];
    try {
        let option = PageConfig.getOption('ignorePlugins');
        ignorePlugins = JSON.parse(option);
    } catch (e) {
        // No-op
    }

    // Get token from server
    platformSet.then( (platform) => {
        ipcRenderer.on(Channels.SERVER_DATA, function startlab(event: any, data: any) {
            // Set token
            PageConfig.setOption("token", data.token);
            // Set baseUrl
            PageConfig.setOption("baseUrl", data.baseUrl);
            // Disable terminals if Windows
            if (platform === "win32") {
                PageConfig.setOption('terminalsAvailable', 'false');
            }

            // Start lab and fade splash
            lab.start({ "ignorePlugins": ignorePlugins })
            .then( () => {
                moon.addEventListener('animationiteration', function fade() {
                    splash.style.animation = "fade .4s linear 0s forwards";
                    moon.removeEventListener('animationiteration', fade);
                });
            });
            ipcRenderer.removeListener(Channels.SERVER_DATA, startlab);
        });
    });

    ipcRenderer.send(Channels.RENDER_PROCESS_READY);
}

window.onload = main;
