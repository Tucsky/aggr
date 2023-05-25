// worker instance
export const aggregatorWorkerInstance = new Worker(
    new URL("./aggregator.ts", import.meta.url), { type: "module" }
);