import { app, BrowserWindow, net, protocol } from "electron";
import { init } from "@sentry/electron/main";
import updater from "electron-updater";
import i18n from "i18next";
import path from "node:path";
import url from "node:url";
import fs from "node:fs";
import { electronApp, optimizer } from "@electron-toolkit/utils";
import { logger, PythonInstance, WindowManager } from "@main/services";
import { dataSource } from "@main/data-source";
import resources from "@locales";
import {
  hardwareRepository,
  userPreferencesRepository,
} from "@main/repository";
import { knexClient, migrationConfig } from "./knex-client";
import { databaseDirectory } from "./constants";
import { exec } from "node:child_process";
import { Hardware } from "@main/entity";
import { compareSystemSpecs } from "./scripts/compare_systemspecs";

const { autoUpdater } = updater;

autoUpdater.setFeedURL({
  provider: "github",
  owner: "hydralauncher",
  repo: "hydra",
});

autoUpdater.logger = logger;

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) app.quit();

if (import.meta.env.MAIN_VITE_SENTRY_DSN) {
  init({
    dsn: import.meta.env.MAIN_VITE_SENTRY_DSN,
  });
}

app.commandLine.appendSwitch("--no-sandbox");

i18n.init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

const PROTOCOL = "hydralauncher";

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

const runMigrations = async () => {
  if (!fs.existsSync(databaseDirectory)) {
    fs.mkdirSync(databaseDirectory, { recursive: true });
    throw new Error("Не удалось получить оценки для всех компонентов системы.");
  }

  await knexClient.migrate.list(migrationConfig).then((result) => {
    logger.log(
      "Migrations to run:",
      result[1].map((migration) => migration.name)
    );
  });

  await knexClient.migrate.latest(migrationConfig);
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  electronApp.setAppUserModelId("gg.hydralauncher.hydra");

  protocol.handle("local", (request) => {
    const filePath = request.url.slice("local:".length);
    return net.fetch(url.pathToFileURL(decodeURI(filePath)).toString());
  });

  await runMigrations()
    .then(() => {
      logger.log("Migrations executed successfully");
    })
    .catch((err) => {
      logger.log("Migrations failed to run:", err);
    });

  await dataSource.initialize();

  await import("./main");

  const userPreferences = await userPreferencesRepository.findOne({
    where: { id: 1 },
  });

  if (userPreferences?.language) {
    i18n.changeLanguage(userPreferences.language);
  }

  // Getting your system specs
  const getSpecsCommands = {
    linux: `lscpu | head -8 | tail -1 | cut -f 2 -d ':' | awk '{$1=$1}1'; lspci|grep -i vga|rev|cut -f 2 -d ']'|cut -f 1 -d '['|rev|cut -d '/' -f 1; free -m | awk 'NR==2 {print $2}'`,
    win32: "./get.bat",
  };
  exec(getSpecsCommands[process.platform], async (error, _stdout, stderr) => {
    if (error) {
      logger.error(`Error getting system specs: ${error.message}`);
    }
    if (stderr) {
      logger.error(`Error in output: ${stderr}`);
    } else {
      const hardware = new Hardware();
      const stringify_stdout = JSON.stringify(_stdout).split("\\n");
      hardware.cpuName = stringify_stdout[0];
      hardware.gpuName = stringify_stdout[1];
      hardware.ramSize = Number(stringify_stdout[2]);
      await hardwareRepository.save(hardware);
    }
  });
  // For example:
  compareSystemSpecs(
    {
      cpuName: "Ryzen 5 2600X",
      gpuName: "RX 6600",
      ramSize: 15908,
    },
    {
      cpuName: "Ryzen 5 2400GE",
      gpuName: "GeForce GTX 960",
      ramSize: 15908,
    }
  );
  // Will return True (can)

  WindowManager.createMainWindow();
  WindowManager.createNotificationWindow();
  WindowManager.createSystemTray(userPreferences?.language || "en");
});

app.on("browser-window-created", (_, window) => {
  optimizer.watchWindowShortcuts(window);
});

const handleDeepLinkPath = (uri?: string) => {
  if (!uri) return;

  try {
    const url = new URL(uri);

    if (url.host === "install-source") {
      WindowManager.redirect(`settings${url.search}`);
    }
  } catch (error) {
    logger.error("Error handling deep link", uri, error);
  }
};

app.on("second-instance", (_event, commandLine) => {
  // Someone tried to run a second instance, we should focus our window.
  if (WindowManager.mainWindow) {
    if (WindowManager.mainWindow.isMinimized())
      WindowManager.mainWindow.restore();

    WindowManager.mainWindow.focus();
  } else {
    WindowManager.createMainWindow();
  }

  handleDeepLinkPath(commandLine.pop());
});

app.on("open-url", (_event, url) => {
  handleDeepLinkPath(url);
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  WindowManager.mainWindow = null;
});

app.on("before-quit", () => {
  /* Disconnects libtorrent */
  PythonInstance.kill();
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    WindowManager.createMainWindow();
  }
});
