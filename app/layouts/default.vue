<template>
<div class="min-h-screen flex flex-col">
    <NuxtRouteAnnouncer />
    <div class="flex-1">
      <slot />
    </div>
    <footer class="text-center text-xs text-muted-foreground py-4 space-x-3">
      <span>made with <Icon name="solar:heart-bold-duotone" class="size-3 inline text-rose-500 align-baseline" /> {{ useRuntimeConfig().public.brandYear }}</span>
    </footer>
</div>
</template>
