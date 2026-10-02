// instrumentation.ts
export async function register() {
    if (process.env.NEXT_RUNTIME !== "nodejs") return;
    const { memoryUsage } = await import("process");
    const t0 = Date.now();
    setInterval(() => {
      const m = memoryUsage();
      const mb = (b: number) => (b / 1048576).toFixed(0);
      console.log(
        `[heartbeat] up ${Math.round((Date.now() - t0) / 1000)}s | heap ${mb(m.heapUsed)}/${mb(m.heapTotal)} MB | rss ${mb(m.rss)} MB`
      );
    }, 20000);
  }