// Workspace-aware Metro: the app imports @morrow/core and @morrow/ui straight
// from source, so a change in a package is picked up without a build step.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Append, never replace. Assigning over this dropped every folder Expo watches
// by default, which stops parts of the SDK being picked up by the bundler.
config.watchFolders = [...(config.watchFolders ?? []), workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = false;

/**
 * One copy of each native module, wherever the import comes from.
 *
 * pnpm gives every workspace package its own resolution of a peer dependency,
 * and the peer context of `packages/ui` is not identical to the app's, so the
 * two once resolved to physically different `react-native` trees at the same
 * version, and the bundle carried two React Natives. What actually keeps them
 * to one copy is `nodeLinker: hoisted` in pnpm-workspace.yaml: every package
 * lands once, at the workspace root, and `nodeModulesPaths` above reaches it.
 * An `extraNodeModules` pin used to sit here pointing at
 * apps/mobile/node_modules/<name> — paths that do not exist under the hoisted
 * layout, and which Metro consults only after every node_modules lookup has
 * failed — so it was inert, and is gone.
 * The check that would catch a second copy is `expo-doctor` (duplicate
 * native dependencies), which `pnpm verify` does not run but the README's
 * native steps do.
 */

/**
 * The web bundle without react-native-reanimated.
 *
 * Nothing in the app imports it. It arrived through gesture-handler's
 * optional wrapper (`require('react-native-reanimated')` in a try/catch,
 * which Metro cannot leave out) and was a tenth of the web bundle: two
 * hundred and eighty modules for a phone-only animation runtime a browser
 * never runs. On the web the require resolves to an empty module; the
 * wrapper sees no `useSharedValue` and falls back to its own implementation,
 * exactly as it does when the library is not installed. The phones keep it.
 */
const baseResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-reanimated') {
    return { type: 'sourceFile', filePath: path.resolve(projectRoot, 'src', 'stubs', 'empty.js') };
  }
  return baseResolveRequest ? baseResolveRequest(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
