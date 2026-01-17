declare module "greenlock-express" {
  import type { Application } from "express";

  interface GreenlockOptions {
    packageRoot: string;
    configDir: string;
    maintainerEmail: string;
    cluster: boolean;
    staging: boolean;
    notify: (event: string, details: { subject?: string }) => void;
  }

  interface GreenlockServer {
    httpsServer: (
      opts: null,
      app: Application
    ) => { listen: (port: number, callback?: () => void) => void };
    httpServer: () => { listen: (port: number, callback?: () => void) => void };
  }

  interface Greenlock {
    ready: (callback: (glx: GreenlockServer) => void) => void;
  }

  const greenlock: {
    init: (options: GreenlockOptions) => Greenlock;
  };

  export default greenlock;
}
