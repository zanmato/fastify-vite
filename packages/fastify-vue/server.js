// Otherwise we get a ReferenceError, but since
// this function is only ran once, there's no overhead
class Routes extends Array {
  toJSON() {
    return this.map((route) => {
      return {
        id: route.id,
        path: route.path,
        name: route.name,
        layout: route.layout,
        getData: !!route.getData,
        getMeta: !!route.getMeta,
        onEnter: !!route.onEnter,
      };
    });
  }
}

export async function createRoutes(
  fromPromise,
  { param } = { param: /\[([\.\w]+\+?)\]/ }
) {
  const { default: from } = await fromPromise;
  const importPaths = Object.keys(from);
  const definedRoutes = {};
  const promises = [];
  if (Array.isArray(from)) {
    for (const routeDef of from) {
      promises.push(
        await getRouteModule(routeDef.path, routeDef.component).then(
          (routeModule) => {
            definedRoutes[routeDef.path] = 1;
            return {
              id: routeDef.path,
              name: routeDef.path ?? routeModule.path,
              path: routeDef.path ?? routeModule.path,
              ...routeModule,
            };
          }
        )
      );
    }
  } else {
    // Ensure that static routes have precedence over the dynamic ones
    for (const path of importPaths.sort((a, b) => (a > b ? -1 : 1))) {
      const rts = await getRouteModule(path, from[path]).then((routeModule) => {
        const ret = [];

        const baseRoute = {
          id: path,
          layout: routeModule.layout,
          name: path
            // Remove /pages and .jsx extension
            .slice(6, -4)
            // Remove params
            .replace(param, (_, m) => ``)
            .replace(/^\/*|\/*$/g, "")
            .replace("/", "_"),
          path:
            routeModule.path ??
            path
              // Remove /pages and .jsx extension
              .slice(6, -4)
              // Replace [id] with :id
              .replace(param, (_, m) => `:${m}`)
              // Replace '/index' with '/'
              .replace(/\/index$/, "/")
              // Remove trailing slashs
              .replace(/(.+)\/+$/, (...m) => m[1]),
          ...routeModule,
        };

        if (baseRoute.name === "") {
          baseRoute.name = "catch-all";
        }

        ret.push(baseRoute);
        definedRoutes[baseRoute.path] = 1;

        if (routeModule.i18n != null) {
          for (const [locale, localePath] of Object.entries(routeModule.i18n)) {
            if (definedRoutes[localePath]) {
              continue;
            }

            const localeRoute = Object.assign({}, baseRoute);
            localeRoute.name = `${locale}__${localeRoute.name}`;
            localeRoute.path = localePath;
            ret.push(localeRoute);

            definedRoutes[localePath] = 1;
          }
        }

        return ret;
      });

      promises.push(...rts);
    }
  }

  return new Routes(...promises);
}

function getRouteModuleExports(routeModule) {
  return {
    // The Route component (default export)
    component: routeModule.default,
    // The Layout Route component
    layout: routeModule.layout,
    // Route-level hooks
    getData: routeModule.getData,
    getMeta: routeModule.getMeta,
    onEnter: routeModule.onEnter,
    // Other Route-level settings
    i18n: routeModule.i18n,
    streaming: routeModule.streaming,
    clientOnly: routeModule.clientOnly,
    serverOnly: routeModule.serverOnly,
  };
}

async function getRouteModule(path, routeModuleInput) {
  // const isServer = typeof process !== 'undefined'
  if (typeof routeModuleInput === "function") {
    const routeModule = await routeModuleInput();
    return getRouteModuleExports(routeModule);
  }
  return getRouteModuleExports(routeModuleInput);
}
