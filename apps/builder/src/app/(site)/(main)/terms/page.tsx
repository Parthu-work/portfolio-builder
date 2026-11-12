import type { Metadata } from "next";
import Link from "next/link";
import { Legal } from "@/components/site/Legal";

export const metadata: Metadata = { title: "Terms", description: "The short version: your content is yours, the templates are MIT licensed, and Persona is provided free of charge without warranty." };

export default function Terms() {
  return (
    <Legal title="Terms" updated="11 November 2026">
      <p>Persona is a free, open-source, non-commercial tool for building personal portfolio sites. By using it you agree to these terms.</p>

      <h2>You own your content</h2>
      <p>Everything you write and upload stays yours. You grant Persona only the permission needed to operate the service for you: to store your content, show you previews, and serve the version you publish to your deployed site and to anyone you share a preview link with.</p>

      <h2>You own your site</h2>
      <p>
        The site you deploy lives in your own GitHub repository and your own Vercel account. The template and runtime code is released under the <strong>MIT License</strong>: you may use, modify, self-host and redistribute it, including commercially, as long as the licence notice stays with the code. Your site continues to work if you stop using Persona.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Only publish content you have the right to publish.</li>
        <li>Do not use Persona to impersonate others, to distribute malware, or for anything unlawful.</li>
        <li>Do not attempt to disrupt the service or access other people’s data. Automated abuse is rate limited and may be blocked.</li>
      </ul>
      <p>We may remove content or suspend accounts that break these rules.</p>

      <h2>Free, and without warranty</h2>
      <p>Persona costs nothing and is provided “as is”, without warranties of any kind. We do our best to keep it running and your data safe, but we cannot promise uninterrupted availability, and to the extent permitted by law we are not liable for losses arising from your use of it. Keep your own backup: “Export JSON” and “Download code” are there for exactly that.</p>

      <h2>Third-party services</h2>
      <p>Deploying uses Vercel and GitHub, and signing in may use GitHub or Google. Your use of those services is governed by their own terms.</p>

      <h2>Changes</h2>
      <p>
        If these terms change, the date above changes with them. How we handle data is described in the <Link href="/privacy">privacy note</Link>.
      </p>
    </Legal>
  );
}
