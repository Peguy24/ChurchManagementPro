import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMembersTool from "./tools/list_members";
import listEventsTool from "./tools/list_events";
import listDonationsTool from "./tools/list_donations";

// Build the OAuth issuer from the project ref so the value is inlined at build
// time and stays import-safe (no runtime env reads at module top level).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "church-management-pro-mcp",
  title: "Church Management Pro",
  version: "0.1.0",
  instructions:
    "Read-only tools that let an assistant look up members, events, and donations for the signed-in user's church. All calls run under Supabase RLS as the authenticated user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listMembersTool, listEventsTool, listDonationsTool],
});
