# Talk track — PF Agent Client Sync LAB

1. **The problem.** AI agents show up in PingFederate as OAuth clients — service accounts with credentials and grants. But they are not just applications: they have owners, they need lifecycle, they get revoked.
2. **What PF 13.1 gives us.** A built-in "AI Agent" system tag. Administrators tag agent clients — including through the Admin API with `_pf_system_tag_ai_agent` — and can filter them and generate inventory reports.
3. **What the PM team is proposing.** Treat the explicitly identified agent as a first-class citizen: keep registration, credentials and grants in PingFederate, and give each agent a managed identity record in PingIDM.
4. **The first step.** A supported connector that synchronizes OAuth clients tagged as AI agents from PingFederate into PingIDM — one-way, requires PF 13.1 or later.
5. **Run the sync.** Press the button. Three tagged clients become three managed records. Untagged clients are untouched — this is filter-only, one-way.
6. **Why it matters.** Once agents are identities, they can enter identity processes: ownership, privileges, lifecycle. Governance and policy-based authorization can extend to agents later — this connector is the foundation, not a complete agent governance solution.
7. **What is simulated.** PingIDM is simulated here end to end; in mock mode so is PingFederate. Real mode reads a real PF 13.1 read-only.
8. **Honesty.** Release timing, supported IDM version, packaging and licensing are subject to Product confirmation — say so if asked.
