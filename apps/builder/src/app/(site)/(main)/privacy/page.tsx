import type { Metadata } from "next";
import { Legal } from "@/components/site/Legal";

export const metadata: Metadata = { title: "Privacy", description: "What Persona collects (very little), what it never collects, and exactly what the deploy confirmation ping contains." };

export default function Privacy() {
  return (
    <Legal title="Privacy" updated="11 November 2026">
      <p>Persona is a free, non-commercial tool. We collect as little as we can, we do not sell or share data, and there are no advertising or third-party trackers anywhere in the builder or in the sites you deploy.</p>

      <h2>Your account and content</h2>
      <ul>
        <li>
          <strong>Account:</strong> your email address and display name, provided when you sign in (GitHub, Google or an email link). Authentication is handled by Supabase.
        </li>
        <li>
          <strong>Portfolios:</strong> the drafts, published versions, up to 20 recent snapshots, and images you upload. Drafts are private to you. Only the version you explicitly publish is readable by others.
        </li>
        <li>You can delete a portfolio at any time from your dashboard. To delete your account and everything in it, email the operator of this instance.</li>
      </ul>

      <h2 id="analytics">First-party analytics on this builder</h2>
      <p>To understand whether the product works, the builder records a small set of events on its own server. There are no cookies, no fingerprinting scripts and no third parties involved.</p>
      <ul>
        <li>
          <strong>Events:</strong> page views, sign-up and sign-in, portfolio created, template selected or switched, section added, custom section added (including the name you gave it), custom field added, published, deploy clicked, deploy confirmed, zip downloaded and JSON exported.
        </li>
        <li>
          <strong>With each event:</strong> the page path, the domain of the referring site (never the full URL), country (from the hosting provider’s geolocation header), device class (mobile, tablet or desktop), and your account id if you are signed in.
        </li>
        <li>
          <strong>Unique visitors</strong> are counted with a hash: <code>sha256(daily salt + IP address + browser user agent)</code>. The salt changes every day, so the hash cannot be used to follow anyone from one day to the next, and it cannot be reversed. <strong>Raw IP addresses are never stored.</strong>
        </li>
        <li>
          <strong>Do Not Track</strong> and <strong>Global Privacy Control</strong> are honoured: if your browser sends either signal, no analytics events are recorded for you.
        </li>
      </ul>

      <h2 id="deploy-ping">The deploy confirmation ping</h2>
      <p>When you deploy your portfolio, the build of your site sends this builder exactly one small request so that your “Deploy” screen can switch from “waiting” to “live”. It contains only:</p>
      <ul>
        <li>your portfolio’s id,</li>
        <li>the address of the deployed site (for example <code>your-name-portfolio.vercel.app</code>),</li>
        <li>the template id, and</li>
        <li>the version of the site runtime.</li>
      </ul>
      <p>
        Nothing about your visitors is ever sent. The ping happens at build time, not when someone views your site. Because the site code is yours, you can remove it: delete the ping from <code>scripts/prebuild.mjs</code> in your repository, or unset the <code>BUILDER_URL</code> variable in Vercel.
      </p>

      <h2>Your deployed site</h2>
      <p>Sites created with Persona contain no analytics, cookies or trackers. Fonts are self-hosted. At build time, and about once an hour afterwards, your site’s server fetches the published version of your portfolio from this builder; your visitors’ browsers never contact us.</p>

      <h2>Security log</h2>
      <p>For security and abuse prevention we keep an audit log of sign-ins, portfolio creation, publishing and deletion, deploy confirmations and administrator actions. Entries contain a salted hash of the IP address, never the address itself.</p>

      <h2>Where data lives</h2>
      <p>Account data, portfolios, analytics events and the audit log are stored in a Supabase (Postgres) project controlled by the operator of this instance. Your deployed site is stored in your own GitHub and Vercel accounts, under their terms and privacy policies.</p>
    </Legal>
  );
}
