export async function register() {
  // Only run cron in Node.js runtime (not edge), and only in production or when explicitly enabled
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    (process.env.NODE_ENV === "production" || process.env.ENABLE_CRON === "true")
  ) {
    const cron = await import("node-cron");
    const { CRON_SECRET } = process.env;

    // Run SLA check every day at 07:00 server time
    cron.schedule("0 7 * * *", async () => {
      const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (CRON_SECRET) headers["Authorization"] = `Bearer ${CRON_SECRET}`;

      try {
        const res = await fetch(`${baseUrl}/api/cron/sla-check`, { headers });
        const data = await res.json();
        console.log("[cron] SLA check complete:", data);
      } catch (err) {
        console.error("[cron] SLA check failed:", err);
      }
    });

    console.log("[cron] Daily SLA check scheduled at 07:00");
  }
}
