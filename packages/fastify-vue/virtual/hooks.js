import { useRouteContext } from "@zanmato/fastify-vue/client";

export function useState() {
  return useRouteContext().state;
}

export function useData() {
  return useRouteContext().data;
}

export function useHead() {
  return useRouteContext().head;
}
