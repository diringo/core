<script setup lang="ts">
useColorMode()

const config = useRuntimeConfig()
</script>

<template>
  <main class="max-w-2xl mx-auto px-4 py-4">
    <NuxtLink to="/"
      class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6">
      <Icon name="solar:arrow-left-bold" class="size-3" />
      Back to {{ config.public.brandName }}
    </NuxtLink>

    <h1 class="text-lg font-semibold mb-4">Privacy Policy</h1>

    <div class="text-sm text-muted-foreground space-y-4 leading-relaxed">
      <p>
        {{ config.public.brandName }} is designed to be privacy-first. This page explains
        what data we collect and how it is used.
      </p>

      <section>
        <h2 class="text-foreground font-medium mb-1">Analytics</h2>
        <p>
          We collect anonymous, aggregated usage data (e.g. page views, file transfers).
          <strong>No personal data is collected.</strong> We do not use cookies, visitor IDs,
          session IDs, localStorage, or any other mechanism to identify individual users.
          All analytics are stored as aggregate counters only and cannot be linked to any person.
        </p>
      </section>

      <section>
        <h2 class="text-foreground font-medium mb-1">Feedback</h2>
        <p>
          If you submit feedback via the feedback form, we collect your email address
          (required) and name (optional) solely to respond to your message.
          This data is stored securely and is not used for any other purpose.
          You may request deletion of your feedback at any time.
        </p>
      </section>

      <section>
        <h2 class="text-foreground font-medium mb-1">WebRTC & Signaling</h2>
        <p>
          All file transfers are peer-to-peer via WebRTC. Signaling is relayed through
          our server but no file content passes through it. We do not log IP addresses,
          file contents, or any connection metadata beyond what is necessary to establish
          the connection.
        </p>
      </section>

      <section>
        <h2 class="text-foreground font-medium mb-1">Third Parties</h2>
        <p>
          We use Google's free STUN servers and metered.ca's free TURN servers for
          WebRTC connectivity. These services see your IP address during connection
          setup, as required by the WebRTC protocol. We do not control their data practices.
          No other third-party services are used.
        </p>
      </section>

      <section>
        <h2 class="text-foreground font-medium mb-1">Data Retention</h2>
        <p>
          Analytics aggregate counters are retained indefinitely. No individual-level data
          exists to delete. Feedback submissions are retained until deletion is requested.
        </p>
      </section>

      <section>
        <h2 class="text-foreground font-medium mb-1">Your Rights</h2>
        <p>
          Since we collect no personal data for analytics, there is nothing to access,
          rectify, or erase. For feedback data, you may request deletion by contacting us.
        </p>
      </section>

      <section>
        <h2 class="text-foreground font-medium mb-1">Contact</h2>
        <p>
          For privacy-related inquiries, please open an issue on our
          <a href="https://github.com/anomalyco/diringo.com" class="underline hover:text-foreground">GitHub repository</a>.
        </p>
      </section>
    </div>
  </main>
</template>
