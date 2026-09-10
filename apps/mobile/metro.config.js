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
 * two resolved to physically different `react-native` trees at the same
 * version. Left alone, an import inside `@morrow/ui` picks up the second copy
 * and the bundle carries two React Natives — the same class of bug as two
 * copies of React, and a native build may only contain one of any native
 * module. `expo-doctor` reports it as duplicate native dependencies.
 *
 * Pinning them here is the resolver-level fix: `@morrow/ui` and the app end up
 * on the same instance no matter which node_modules is nearer.
 */
const SINGLETONS = ['react', 'react-dom', 'react-native', 'react-native-svg'];
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  ...Object.fromEntries(
    SINGLETONS.map((name) => [name, path.resolve(projectRoot, 'node_modules', name)]),
  ),
};

module.exports = config;
